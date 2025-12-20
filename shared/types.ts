import { z } from "zod";

// =============================================================================
// LINE ITEM SCHEMAS - Single Source of Truth for AI Tool Outputs
// =============================================================================

export const LineItemSourceSchema = z.enum([
  "rate_table",      // Matched from company/public rate table
  "document_ocr",    // Extracted from uploaded document via Azure
  "ai_estimate",     // AI-suggested estimate (requires user confirmation)
  "user_input",      // Manually entered by user
]);

export const LineItemConfidenceSchema = z.object({
  score: z.number().min(0).max(1),
  source: LineItemSourceSchema,
  rateTableId: z.number().optional(),      // If source is rate_table
  documentId: z.number().optional(),       // If source is document_ocr
  matchedDescription: z.string().optional(), // What it matched against
});

// Base line item fields shared across all types
const BaseLineItemSchema = z.object({
  id: z.string().uuid(),
  description: z.string().min(1, "Description is required"),
  quantity: z.number().positive("Quantity must be positive"),
  unit: z.string().min(1, "Unit is required"),
  unitRate: z.number().nonnegative("Rate must be non-negative"),
  amount: z.number().nonnegative(),
  confidence: LineItemConfidenceSchema.optional(),
  notes: z.string().optional(),
  isConfirmed: z.boolean().default(false), // User has verified this item
});

// Labor-specific line item
export const LaborLineItemSchema = BaseLineItemSchema.extend({
  type: z.literal("labor"),
  classification: z.string().min(1, "Labor classification required"), // e.g., "Journeyman Electrician"
  hours: z.number().positive("Hours must be positive"),
  overtimeHours: z.number().nonnegative().default(0),
  overtimeRate: z.number().nonnegative().optional(),
  date: z.string().optional(), // ISO date when work was performed
});

// Equipment-specific line item
export const EquipmentLineItemSchema = BaseLineItemSchema.extend({
  type: z.literal("equipment"),
  equipmentType: z.string().min(1, "Equipment type required"),
  isOperated: z.boolean().default(false), // Includes operator
  isRented: z.boolean().default(false),   // Rented vs owned
  hours: z.number().positive().optional(),
  days: z.number().positive().optional(),
  standbyHours: z.number().nonnegative().default(0),
});

// Material-specific line item
export const MaterialLineItemSchema = BaseLineItemSchema.extend({
  type: z.literal("material"),
  materialType: z.string().optional(),
  vendor: z.string().optional(),
  invoiceNumber: z.string().optional(),
  invoiceDate: z.string().optional(), // ISO date
});

// Subcontractor-specific line item
export const SubcontractorLineItemSchema = BaseLineItemSchema.extend({
  type: z.literal("subcontractor"),
  subcontractorId: z.number().optional(), // Reference to subcontractors table
  subcontractorName: z.string().min(1, "Subcontractor name required"),
  scope: z.string().min(1, "Scope of work required"),
  invoiceNumber: z.string().optional(),
});

// Disposal-specific line item
export const DisposalLineItemSchema = BaseLineItemSchema.extend({
  type: z.literal("disposal"),
  disposalType: z.string().min(1, "Disposal type required"), // e.g., "Hazardous", "Non-hazardous"
  facilityName: z.string().optional(),
  ticketNumber: z.string().optional(),
  weight: z.number().positive().optional(), // Tons
});

// Import (trucking/hauling) line item
export const ImportLineItemSchema = BaseLineItemSchema.extend({
  type: z.literal("import"),
  materialType: z.string().min(1, "Material type required"), // e.g., "Class 2 AB"
  source: z.string().optional(), // Where material came from
  loads: z.number().positive().optional(),
  ticketNumbers: z.array(z.string()).optional(),
});

// Union of all line item types
export const LineItemSchema = z.discriminatedUnion("type", [
  LaborLineItemSchema,
  EquipmentLineItemSchema,
  MaterialLineItemSchema,
  SubcontractorLineItemSchema,
  DisposalLineItemSchema,
  ImportLineItemSchema,
]);

export type LineItem = z.infer<typeof LineItemSchema>;
export type LaborLineItem = z.infer<typeof LaborLineItemSchema>;
export type EquipmentLineItem = z.infer<typeof EquipmentLineItemSchema>;
export type MaterialLineItem = z.infer<typeof MaterialLineItemSchema>;
export type SubcontractorLineItem = z.infer<typeof SubcontractorLineItemSchema>;
export type DisposalLineItem = z.infer<typeof DisposalLineItemSchema>;
export type ImportLineItem = z.infer<typeof ImportLineItemSchema>;

// =============================================================================
// DRAFT STATE SCHEMA - Persisted in changeOrders.draftState JSONB
// =============================================================================

export const WorkflowStepSchema = z.enum([
  "PROJECT_SELECTION",    // User selecting project
  "CO_TYPE_SELECTION",    // Estimation vs T&M
  "SCOPE_DEFINITION",     // Describing the work
  "DOCUMENT_UPLOAD",      // T&M: Upload backup docs
  "DOCUMENT_PARSING",     // T&M: Azure OCR processing
  "RATE_MATCHING",        // T&M: Match to rate tables
  "DATA_CONFIRMATION",    // User confirms/edits line items
  "MARKUP_APPLICATION",   // Apply project markups
  "REVIEW",               // Final review before save
  "COMPLETED",            // Draft finalized
]);

export const COTypeSchema = z.enum(["estimation", "t_and_m"]);

export const DraftTotalsSchema = z.object({
  labor: z.number().nonnegative().default(0),
  equipment: z.number().nonnegative().default(0),
  materials: z.number().nonnegative().default(0),
  subcontractors: z.number().nonnegative().default(0),
  disposal: z.number().nonnegative().default(0),
  import: z.number().nonnegative().default(0),
  subtotal: z.number().nonnegative().default(0),
  markup: z.number().nonnegative().default(0),
  total: z.number().nonnegative().default(0),
});

export const DraftStateSchema = z.object({
  version: z.number().default(1), // Schema version for migrations
  
  // Workflow tracking
  currentStep: WorkflowStepSchema,
  completedSteps: z.array(WorkflowStepSchema).default([]),
  
  // Core CO data
  coType: COTypeSchema.optional(),
  projectId: z.number().optional(),
  projectName: z.string().optional(),
  scope: z.string().optional(),
  title: z.string().optional(),
  
  // Line items by category
  lineItems: z.object({
    labor: z.array(LaborLineItemSchema).default([]),
    equipment: z.array(EquipmentLineItemSchema).default([]),
    materials: z.array(MaterialLineItemSchema).default([]),
    subcontractors: z.array(SubcontractorLineItemSchema).default([]),
    disposal: z.array(DisposalLineItemSchema).default([]),
    import: z.array(ImportLineItemSchema).default([]),
  }).default({
    labor: [],
    equipment: [],
    materials: [],
    subcontractors: [],
    disposal: [],
    import: [],
  }),
  
  // Calculated totals (recalculated on each update)
  totals: DraftTotalsSchema.default({
    labor: 0,
    equipment: 0,
    materials: 0,
    subcontractors: 0,
    disposal: 0,
    import: 0,
    subtotal: 0,
    markup: 0,
    total: 0,
  }),
  
  // Document tracking for T&M workflow
  uploadedDocumentIds: z.array(z.number()).default([]),
  parsedDocuments: z.array(z.object({
    documentId: z.number(),
    filename: z.string(),
    status: z.enum(["pending", "processing", "completed", "failed"]),
    error: z.string().optional(),
    extractedItemCount: z.number().optional(),
  })).default([]),
  
  // Audit trail
  lastUpdatedAt: z.string(), // ISO timestamp
  lastUpdatedBy: z.string().optional(), // User ID
  conversationId: z.number().optional(), // Link to chatConversations
});

export type DraftState = z.infer<typeof DraftStateSchema>;
export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;
export type COType = z.infer<typeof COTypeSchema>;
export type DraftTotals = z.infer<typeof DraftTotalsSchema>;

// =============================================================================
// AI TOOL SCHEMAS - For OpenAI Function Calling
// =============================================================================

// Tool: search_rate_table
export const SearchRateTableInputSchema = z.object({
  query: z.string().min(1, "Search query required"),
  type: z.enum(["labor", "equipment", "material", "disposal", "import"]),
  companyId: z.number().optional(), // If null, search public rates
  limit: z.number().min(1).max(20).default(5),
});

export const RateTableResultSchema = z.object({
  id: z.number(),
  rateTableId: z.number(),
  description: z.string(),
  unit: z.string(),
  rate: z.number(),
  classification: z.string().optional(),
  effectiveDate: z.string(),
  source: z.string(), // "company" or "public"
  matchScore: z.number().min(0).max(1),
});

export const SearchRateTableOutputSchema = z.object({
  results: z.array(RateTableResultSchema),
  totalFound: z.number(),
});

// Tool: update_draft_line_items
export const UpdateDraftLineItemsInputSchema = z.object({
  draftId: z.number(), // changeOrders.id
  operation: z.enum(["add", "update", "remove"]),
  items: z.array(LineItemSchema),
});

export const UpdateDraftLineItemsOutputSchema = z.object({
  success: z.boolean(),
  updatedDraft: DraftStateSchema.optional(),
  errors: z.array(z.object({
    itemId: z.string(),
    error: z.string(),
  })).optional(),
});

// Tool: calculate_totals
export const CalculateTotalsInputSchema = z.object({
  draftId: z.number(),
  applyMarkups: z.boolean().default(true),
});

export const CalculateTotalsOutputSchema = z.object({
  totals: DraftTotalsSchema,
  markupsApplied: z.object({
    laborPercent: z.number(),
    materialsPercent: z.number(),
    equipmentOwnedPercent: z.number(),
    equipmentRentedPercent: z.number(),
    disposalPercent: z.number(),
    importPercent: z.number(),
    subcontractorsPercent: z.number(),
  }).optional(),
});

// Tool: get_project_context
export const GetProjectContextInputSchema = z.object({
  projectId: z.number(),
});

export const GetProjectContextOutputSchema = z.object({
  project: z.object({
    id: z.number(),
    number: z.string(),
    name: z.string(),
    clientName: z.string().nullable(),
    status: z.string(),
  }),
  markups: z.object({
    labor: z.number(),
    materials: z.number(),
    equipmentOwned: z.number(),
    equipmentRented: z.number(),
    disposal: z.number(),
    import: z.number(),
    subcontractors: z.number(),
  }),
  existingCOCount: z.number(),
  recentCOs: z.array(z.object({
    id: z.number(),
    number: z.string(),
    title: z.string(),
    totalAmount: z.number().nullable(),
    status: z.string(),
  })),
});

// Type exports for tool inputs/outputs
export type SearchRateTableInput = z.infer<typeof SearchRateTableInputSchema>;
export type SearchRateTableOutput = z.infer<typeof SearchRateTableOutputSchema>;
export type UpdateDraftLineItemsInput = z.infer<typeof UpdateDraftLineItemsInputSchema>;
export type UpdateDraftLineItemsOutput = z.infer<typeof UpdateDraftLineItemsOutputSchema>;
export type CalculateTotalsInput = z.infer<typeof CalculateTotalsInputSchema>;
export type CalculateTotalsOutput = z.infer<typeof CalculateTotalsOutputSchema>;
export type GetProjectContextInput = z.infer<typeof GetProjectContextInputSchema>;
export type GetProjectContextOutput = z.infer<typeof GetProjectContextOutputSchema>;

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

export function validateLineItem(data: unknown): { success: true; data: LineItem } | { success: false; error: string } {
  const result = LineItemSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error.message };
}

export function validateDraftState(data: unknown): { success: true; data: DraftState } | { success: false; error: string } {
  const result = DraftStateSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error.message };
}

export function createEmptyDraftState(step: WorkflowStep = "PROJECT_SELECTION"): DraftState {
  return {
    version: 1,
    currentStep: step,
    completedSteps: [],
    lineItems: {
      labor: [],
      equipment: [],
      materials: [],
      subcontractors: [],
      disposal: [],
      import: [],
    },
    totals: {
      labor: 0,
      equipment: 0,
      materials: 0,
      subcontractors: 0,
      disposal: 0,
      import: 0,
      subtotal: 0,
      markup: 0,
      total: 0,
    },
    uploadedDocumentIds: [],
    parsedDocuments: [],
    lastUpdatedAt: new Date().toISOString(),
  };
}
