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

export async function extractTMData(base64Image: string): Promise<ExtractedTMData> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert at extracting Time and Material (T&M) data from construction documents. 
          Extract all labor, equipment, and material entries with their quantities, hours, and rates.
          Pay special attention to handwritten entries and ensure accuracy.
          Return the data in the specified JSON format with confidence scores (0-1) for each entry.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Please extract all T&M data from this document. Include:
              - Labor entries (name, role, hours worked)
              - Equipment entries (type, description, hours used)
              - Material entries (type, description, quantity, unit)
              - Project information (name, location, date)
              - Confidence scores for each extraction
              
              Return as JSON with this exact structure:
              {
                "laborEntries": [{"name": "string", "role": "string", "hours": number, "rate": number, "confidence": number}],
                "equipmentEntries": [{"type": "string", "description": "string", "hours": number, "rate": number, "confidence": number}],
                "materialEntries": [{"type": "string", "description": "string", "quantity": number, "unit": "string", "rate": number, "confidence": number}],
                "date": "string",
                "projectInfo": {"name": "string", "location": "string", "confidence": number},
                "totalConfidence": number
              }`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result as ExtractedTMData;
  } catch (error) {
    console.error('OpenAI extraction error:', error);
    throw new Error(`Failed to extract T&M data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function extractRateTableData(base64Image: string): Promise<ExtractedRateData> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
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
          content: [
            {
              type: "text",
              text: `Extract all rate table data from this document. Include:
              - Rate type (labor, equipment, material, disposal, import)
              - Individual rate entries with codes, descriptions, rates, units
              - Effective dates and regions if available
              - Confidence scores for accuracy
              
              Return as JSON:
              {
                "type": "labor|equipment|material|disposal|import",
                "entries": [{"code": "string", "description": "string", "rate": number, "unit": "string", "effectiveDate": "string", "region": "string", "category": "string", "confidence": number}],
                "metadata": {"source": "string", "extractedAt": "string", "confidence": number}
              }`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 3000,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result as ExtractedRateData;
  } catch (error) {
    console.error('OpenAI rate extraction error:', error);
    throw new Error(`Failed to extract rate data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function processAIChat(message: string, context?: any): Promise<string> {
  try {
    // Get all available rates from database for context
    const { db } = await import('../db');
    const { rateTables } = await import('../../shared/schema');
    const { eq } = await import('drizzle-orm');
    
    const approvedRates = await db.select().from(rateTables).where(eq(rateTables.isApproved, true));
    
    // Build rate context for AI
    const rateContext = approvedRates.map(rt => ({
      name: rt.name,
      type: rt.type,
      entries: Array.isArray(rt.data) ? rt.data.length : 0,
      sampleRates: Array.isArray(rt.data) ? rt.data.slice(0, 3) : []
    }));

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an AI assistant for FieldFlo, a construction change order management system for Resource Environmental Inc.
          
          You have access to 333 approved rates across 4 rate tables:
          - Equipment: 190 rates (generators, excavators, compressors, tools)
          - General Materials: 109 rates (PPE, containment, filters, tools)
          - Chemicals: 22 rates (encapsulants, removers, cleaners)
          - Machinery Materials: 12 rates (oils, fluids, maintenance)
          
          Your capabilities:
          - Create change orders following REI's template format
          - Match T&M data to approved rate tables
          - Calculate costs for labor, equipment, materials, disposal
          - Generate professional change order requests
          - Provide rate lookup and pricing guidance
          - Assist with project analytics and insights
          
          When creating change orders, always use the REI format:
          - Project Name and RE Project No.
          - Client contact and REI PM details
          - Detailed cost breakdown by category
          - Labor backup with wage rates
          - Material itemization with quantities
          - Equipment owned vs rented
          - Disposal costs with backup
          - Markup percentages
          - Grand total calculations
          
          Available Rate Context: ${JSON.stringify(rateContext)}
          
          Always be professional, accurate, and construction industry-focused.`
        },
        {
          role: "user",
          content: context ? `Context: ${JSON.stringify(context)}\n\nUser message: ${message}` : message
        }
      ],
      max_tokens: 1500,
    });

    return response.choices[0].message.content || "I'm sorry, I couldn't process your request. Please try again.";
  } catch (error) {
    console.error('OpenAI chat error:', error);
    throw new Error(`AI chat failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
