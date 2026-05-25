import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key",
});

export interface ExtractedTMData {
  laborEntries: {
    name: string;
    role: string;
    hours: number;
    rate?: number;
    confidence: number;
  }[];
  equipmentEntries: {
    type: string;
    description: string;
    hours: number;
    rate?: number;
    confidence: number;
  }[];
  materialEntries: {
    type: string;
    description: string;
    quantity: number;
    unit: string;
    rate?: number;
    confidence: number;
  }[];
  subcontractorEntries: {
    company: string;
    description: string;
    amount: number;
    invoiceNumber?: string;
    confidence: number;
  }[];
  disposalEntries: {
    type: string;
    description: string;
    quantity: number;
    unit: string;
    rate?: number;
    confidence: number;
  }[];
  date: string;
  projectInfo: {
    name?: string;
    location?: string;
    confidence: number;
  };
  totalConfidence: number;
}

export interface ExtractedRateData {
  type: 'labor' | 'equipment' | 'material' | 'disposal' | 'import';
  entries: Array<{
    code?: string;
    description: string;
    rate: number;
    unit: string;
    effectiveDate?: string;
    region?: string;
    category?: string;
    confidence: number;
  }>;
  metadata: {
    source: string;
    extractedAt: string;
    confidence: number;
  };
}

export async function extractTMData(documentText: string): Promise<ExtractedTMData> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Using the more cost-effective model as requested
      messages: [
        {
          role: "system",
          content: `You are an expert at extracting Time and Material (T&M) data from construction documents, invoices, and quotes. 

          CRITICAL INVOICE DETECTION RULES:
          - Company invoices with labor services (like Incompli) = SUBCONTRACTOR ENTRIES
          - Service provider invoices = SUBCONTRACTOR ENTRIES
          - Equipment rental invoices = EQUIPMENT ENTRIES (rental company as description, not subcontractor)
          - Material supplier invoices = MATERIAL ENTRIES (if materials are itemized)
          - Only extract as LABOR if it's direct employee timesheets with individual worker names and hours
          
          EQUIPMENT RENTAL DETECTION:
          - Look for rental terms: "rent", "rental", "lease", "hire"
          - Equipment names: excavator, bulldozer, crane, generator, compressor, etc.
          - Daily/weekly/monthly rates rather than lump sums
          - Rental companies: United Rentals, Home Depot Tool Rental, etc.
          
          CATEGORY PRIORITY (in order):
          1. EQUIPMENT ENTRIES - Equipment rentals with daily/weekly rates
          2. MATERIAL ENTRIES - Supplier invoices with itemized materials
          3. SUBCONTRACTOR ENTRIES - Labor services, general contractors
          4. LABOR ENTRIES - Only direct employee timesheets
          
          Extract all data with confidence scores (0-1). Default to SUBCONTRACTOR only when category is unclear.`
        },
        {
          role: "user",
          content: `Please extract all T&M data from this document text. PRIORITY CLASSIFICATION:

              1. EQUIPMENT ENTRIES - Equipment rentals:
                 - Rental companies: United Rentals, Sunbelt, Home Depot Tool Rental
                 - Equipment: excavators, bulldozers, generators, compressors, tools
                 - Rental terms: daily/weekly/monthly rates, "rent", "rental", "lease"
                 - Convert to equipment entries (type: equipment name, description: rental company)
              
              2. MATERIAL ENTRIES - Material suppliers:
                 - Itemized materials: concrete, steel, lumber, chemicals
                 - Supplier invoices with quantities and units
                 - Convert to material entries (type: material, description: supplier)
              
              3. SUBCONTRACTOR ENTRIES - Labor services:
                 - Service companies (Incompli, cleaning, specialized services)
                 - General contractors providing labor
                 - Lump sum service amounts
              
              4. LABOR ENTRIES - Only direct employees:
                 - Individual worker names with hourly rates
                 - Direct employee timesheets
              
              4. PROJECT INFO and confidence scores
              
              Document text:
              ${documentText}
              
              Return as JSON with this exact structure:
              {
                "laborEntries": [{"name": "string", "role": "string", "hours": number, "rate": number, "confidence": number}],
                "equipmentEntries": [{"type": "string", "description": "string", "hours": number, "rate": number, "confidence": number}],
                "materialEntries": [{"type": "string", "description": "string", "quantity": number, "unit": "string", "rate": number, "confidence": number}],
                "subcontractorEntries": [{"company": "string", "description": "string", "amount": number, "invoiceNumber": "string", "confidence": number}],
                "disposalEntries": [{"type": "string", "description": "string", "quantity": number, "unit": "string", "rate": number, "confidence": number}],
                "date": "string",
                "projectInfo": {"name": "string", "location": "string", "confidence": number},
                "totalConfidence": number
              }`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000,
      temperature: 0.1 // Lower temperature for more consistent extraction
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result as ExtractedTMData;
  } catch (error) {
    console.error('OpenAI extraction error:', error);
    throw new Error(`Failed to extract T&M data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function extractRateTableData(documentText: string): Promise<ExtractedRateData> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Using cost-effective model
      messages: [
        {
          role: "system",
          content: `You are an expert at extracting rate table data from construction documents and PDFs.
          Extract all rate information including labor rates, equipment rates, material costs, etc.
          Pay attention to effective dates, regions, and rate categories.
          Return structured data with confidence scores.`
        },
        {
          role: "user",
          content: `Extract all rate table data from this document text. Include:
              - Rate type (labor, equipment, material, disposal, import)
              - Individual rate entries with codes, descriptions, rates, units
              - Effective dates and regions if available
              - Confidence scores for accuracy
              
              Document text:
              ${documentText}
              
              Return as JSON:
              {
                "type": "labor|equipment|material|disposal|import",
                "entries": [{"code": "string", "description": "string", "rate": number, "unit": "string", "effectiveDate": "string", "region": "string", "category": "string", "confidence": number}],
                "metadata": {"source": "string", "extractedAt": "string", "confidence": number}
              }`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 3000,
      temperature: 0.1
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result as ExtractedRateData;
  } catch (error) {
    console.error('OpenAI rate extraction error:', error);
    throw new Error(`Failed to extract rate data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export interface ExtractedQuoteData {
  quoteNumber: string;
  date: string;
  vendor: {
    name: string;
    contact?: string;
    email?: string;
    phone?: string;
  };
  client: {
    name: string;
    contact?: string;
    projectName?: string;
  };
  lineItems: Array<{
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
    confidence: number;
  }>;
  subtotal: number;
  tax?: number;
  total: number;
  terms?: string;
  validUntil?: string;
  totalConfidence: number;
}

export interface ExtractedInvoiceData {
  invoiceNumber: string;
  date: string;
  dueDate?: string;
  vendor: {
    name: string;
    contact?: string;
    email?: string;
    phone?: string;
  };
  billTo: {
    name: string;
    contact?: string;
    projectName?: string;
  };
  lineItems: Array<{
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
    confidence: number;
  }>;
  subtotal: number;
  tax?: number;
  total: number;
  paymentTerms?: string;
  paidAmount?: number;
  balanceDue?: number;
  totalConfidence: number;
}

export async function extractQuoteData(documentText: string): Promise<ExtractedQuoteData> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert at extracting quote data from construction documents. 
          Extract all quote information including vendor details, line items, pricing, and terms.
          Pay special attention to quantities, unit prices, and totals.
          Return the data in the specified JSON format with confidence scores (0-1) for each entry.`
        },
        {
          role: "user",
          content: `Please extract all quote data from this document text. Include:
              - Quote number and date
              - Vendor information (name, contact details)
              - Client/project information
              - Line items with descriptions, quantities, units, and prices
              - Subtotal, tax, and total amounts
              - Terms and validity period
              - Confidence scores for each extraction
              
              Document text:
              ${documentText}
              
              Return as JSON with this exact structure:
              {
                "quoteNumber": "string",
                "date": "string",
                "vendor": {"name": "string", "contact": "string", "email": "string", "phone": "string"},
                "client": {"name": "string", "contact": "string", "projectName": "string"},
                "lineItems": [{"description": "string", "quantity": number, "unit": "string", "unitPrice": number, "totalPrice": number, "confidence": number}],
                "subtotal": number,
                "tax": number,
                "total": number,
                "terms": "string",
                "validUntil": "string",
                "totalConfidence": number
              }`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000,
      temperature: 0.1
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result as ExtractedQuoteData;
  } catch (error) {
    console.error('OpenAI quote extraction error:', error);
    throw new Error(`Failed to extract quote data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function extractInvoiceData(documentText: string): Promise<ExtractedTMData> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert at extracting invoice data from construction documents and converting it to T&M format.
          CRITICAL: Invoices from companies like Incompli, subcontractors, equipment rental companies, and service providers should ALWAYS be categorized as SUBCONTRACTOR ENTRIES, not labor or other categories.
          
          For construction invoices, focus on:
          - Company invoices = subcontractor entries (with company name, description, total amount)
          - Equipment rental invoices = subcontractor entries (rental company as subcontractor)
          - Service provider invoices = subcontractor entries
          - Only extract as labor if it's direct employee timesheets
          
          Return data in T&M format with confidence scores (0-1) for each entry.`
        },
        {
          role: "user",
          content: `Please extract invoice data and convert it to T&M format. Focus on:
              - Converting vendor/company invoices to SUBCONTRACTOR ENTRIES
              - Extract invoice number, date, vendor name, total amount
              - Categorize all invoice content as subcontractor work
              - Only use labor/equipment/materials if explicitly direct employee work
              - Include confidence scores for each extraction
              
              Document text:
              ${documentText}
              
              Return as JSON with this T&M structure:
              {
                "laborEntries": [{"name": "string", "role": "string", "hours": number, "rate": number, "confidence": number}],
                "equipmentEntries": [{"type": "string", "description": "string", "hours": number, "rate": number, "confidence": number}],
                "materialEntries": [{"type": "string", "description": "string", "quantity": number, "unit": "string", "rate": number, "confidence": number}],
                "subcontractorEntries": [{"company": "string", "description": "string", "amount": number, "invoiceNumber": "string", "confidence": number}],
                "disposalEntries": [{"type": "string", "description": "string", "quantity": number, "unit": "string", "rate": number, "confidence": number}],
                "date": "string",
                "projectInfo": {"name": "string", "location": "string", "confidence": number},
                "totalConfidence": number
              }`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000,
      temperature: 0.1
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result as ExtractedTMData;
  } catch (error) {
    console.error('OpenAI invoice extraction error:', error);
    throw new Error(`Failed to extract invoice data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function processAIChat(message: string, context?: any): Promise<{ message: string; actions?: any[] }> {
  try {
    const systemPrompt = `You are an AI assistant for ProjectCommand, a powerful construction project management and operations platform. You have integrated access to CO Buddy AI, our specialized change order and T&M processing assistant.

CONTEXT AWARENESS:
- Current page: ${context?.pageContext?.currentPage || 'unknown'}
- User role: ${context?.user?.role || 'unknown'}
- Company ID: ${context?.user?.companyId || 'unknown'}
- Available rates: ${context?.rateContext?.totalRates || 0} total (${context?.rateContext?.companyRates?.length || 0} company, ${context?.rateContext?.publicRates?.length || 0} public Caltrans)
- Projects: ${context?.projectContext?.projects?.length || 0}
- Recent change orders: ${context?.projectContext?.recentChangeOrders?.length || 0}
- Pending documents: ${context?.projectContext?.pendingDocuments || 0}

YOUR CAPABILITIES:
1. CREATE & EDIT DATA:
   - Create projects: "I'll create a new project called [name]"
   - Create change orders: "I'll create a change order for [project]"
   - Edit rates: "I'll update the rate for [item] to [value]"
   - Process documents: "I'll analyze this T&M sheet"

2. NAVIGATION & SUGGESTIONS:
   - Based on current page, offer contextual help
   - Suggest next steps: "Since you're on the rates page, would you like to edit rates or import new ones?"
   - Guide through workflows: "To create a change order, first select a project..."

3. VALIDATION & VERIFICATION:
   - Check imported data: "Let me verify your imported rates match the expected format"
   - Validate T&M sheets: "I'll check if all labor rates match your approved rate tables"
   - Compare rates: "The imported rate of $X differs from your standard rate of $Y"

4. INTELLIGENT ASSISTANCE:
   - Remember context from previous messages
   - Understand T&M parsing needs
   - Match extracted data to rates
   - Calculate totals and markups
   - Generate professional outputs

RESPONSE FORMAT:
When actions are requested (${context?.requestActions}), you can return actions in this format:
{
  "message": "Your response text",
  "actions": [
    {
      "type": "navigate|create|update|refresh",
      "endpoint": "/api/endpoint",
      "data": {},
      "url": "/page-to-navigate",
      "successMessage": "Success message"
    }
  ]
}

CURRENT PAGE GUIDANCE:
${context?.pageContext?.currentPage === '/rate-tables' ? 
  "User is viewing rate tables. Offer to: edit rates, import new rates, search specific rates, or explain rate types." : 
  context?.pageContext?.currentPage === '/projects' ?
  "User is managing projects. Offer to: create new project, update project details, or view project analytics." :
  context?.pageContext?.currentPage === '/change-orders' ?
  "User is working with change orders. Offer to: create new CO, edit existing CO, or process T&M sheets." :
  context?.pageContext?.currentPage === '/documents' ?
  "User is managing documents. Offer to: process uploaded files, check extraction status, or re-process failed documents." :
  context?.pageContext?.currentPage === '/analytics' ?
  "User is viewing analytics. Offer to: explain trends, identify anomalies, or generate reports." :
  "Offer general assistance based on user needs."
}

Remember: Everything is editable. You can help create, update, and manage all data in the system.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: message
        }
      ],
      max_tokens: 2000,
      response_format: context?.requestActions ? { type: "json_object" } : undefined
    });

    const content = response.choices[0].message.content || "I'm sorry, I couldn't process your request. Please try again.";
    
    // If actions were requested, parse the JSON response
    if (context?.requestActions) {
      try {
        const parsed = JSON.parse(content);
        return {
          message: parsed.message || content,
          actions: parsed.actions || []
        };
      } catch (e) {
        // If parsing fails, just return the message
        return { message: content };
      }
    }

    return { message: content };
  } catch (error) {
    console.error('OpenAI chat error:', error);
    throw new Error(`AI chat failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
