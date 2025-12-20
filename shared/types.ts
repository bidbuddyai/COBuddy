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
// CHANGE ORDER MANIFEST - Strict typing for Excel/PDF exports
// =============================================================================

export const ChangeOrderManifestHeaderSchema = z.object({
  coNumber: z.string(),
  projectNumber: z.string(),
  projectName: z.string(),
  clientName: z.string().nullable(),
  preparedBy: z.string().nullable(),
  preparedDate: z.string(), // ISO date
  submittedDate: z.string().nullable(),
  status: z.string(),
  description: z.string().nullable(),
  scope: z.string().nullable(),
});

export const ManifestLineItemSchema = z.object({
  lineNumber: z.number(),
  description: z.string(),
  classification: z.string().nullable(),
  quantity: z.number(),
  unit: z.string(),
  unitRate: z.number(),
  amount: z.number(),
  source: z.string(), // "rate_table", "document", "manual"
  notes: z.string().nullable(),
});

export const ManifestCategorySummarySchema = z.object({
  category: z.string(),
  items: z.array(ManifestLineItemSchema),
  subtotal: z.number(),
  markupPercent: z.number(),
  markupAmount: z.number(),
  categoryTotal: z.number(),
});

export const ManifestTotalsSchema = z.object({
  laborSubtotal: z.number(),
  laborMarkup: z.number(),
  laborTotal: z.number(),
  
  equipmentSubtotal: z.number(),
  equipmentMarkup: z.number(),
  equipmentTotal: z.number(),
  
  materialsSubtotal: z.number(),
  materialsMarkup: z.number(),
  materialsTotal: z.number(),
  
  subcontractorsSubtotal: z.number(),
  subcontractorsMarkup: z.number(),
  subcontractorsTotal: z.number(),
  
  disposalSubtotal: z.number(),
  disposalMarkup: z.number(),
  disposalTotal: z.number(),
  
  importSubtotal: z.number(),
  importMarkup: z.number(),
  importTotal: z.number(),
  
  grandSubtotal: z.number(),
  grandMarkup: z.number(),
  grandTotal: z.number(),
});

export const SignatureBlockSchema = z.object({
  preparedByName: z.string().nullable(),
  preparedByTitle: z.string().nullable(),
  preparedByDate: z.string().nullable(),
  approvedByName: z.string().nullable(),
  approvedByTitle: z.string().nullable(),
  approvedByDate: z.string().nullable(),
  clientApprovedByName: z.string().nullable(),
  clientApprovedByTitle: z.string().nullable(),
  clientApprovedByDate: z.string().nullable(),
});

export const ChangeOrderManifestSchema = z.object({
  version: z.number().default(1),
  generatedAt: z.string(), // ISO timestamp
  
  header: ChangeOrderManifestHeaderSchema,
  
  categories: z.object({
    labor: ManifestCategorySummarySchema,
    equipment: ManifestCategorySummarySchema,
    materials: ManifestCategorySummarySchema,
    subcontractors: ManifestCategorySummarySchema,
    disposal: ManifestCategorySummarySchema,
    import: ManifestCategorySummarySchema,
  }),
  
  totals: ManifestTotalsSchema,
  
  signatureBlock: SignatureBlockSchema,
  
  backupDocuments: z.array(z.object({
    id: z.number(),
    filename: z.string(),
    type: z.string(),
    uploadedAt: z.string(),
  })).default([]),
  
  notes: z.string().nullable(),
  termsAndConditions: z.string().nullable(),
});

export type ChangeOrderManifest = z.infer<typeof ChangeOrderManifestSchema>;
export type ManifestHeader = z.infer<typeof ChangeOrderManifestHeaderSchema>;
export type ManifestLineItem = z.infer<typeof ManifestLineItemSchema>;
export type ManifestCategorySummary = z.infer<typeof ManifestCategorySummarySchema>;
export type ManifestTotals = z.infer<typeof ManifestTotalsSchema>;
export type SignatureBlock = z.infer<typeof SignatureBlockSchema>;

export function createEmptyManifestCategorySummary(category: string): ManifestCategorySummary {
  return {
    category,
    items: [],
    subtotal: 0,
    markupPercent: 0,
    markupAmount: 0,
    categoryTotal: 0,
  };
}

export function createManifestFromDraft(
  draft: DraftState,
  header: ManifestHeader,
  markups: {
    labor: number;
    materials: number;
    equipment: number;
    subcontractors: number;
    disposal: number;
    import: number;
  }
): ChangeOrderManifest {
  const mapItemsToManifest = (items: any[], category: string): ManifestLineItem[] => {
    return items.map((item, index) => ({
      lineNumber: index + 1,
      description: item.description,
      classification: item.classification || null,
      quantity: item.quantity || item.hours || 1,
      unit: item.unit,
      unitRate: item.unitRate,
      amount: item.amount,
      source: item.confidence?.source || "manual",
      notes: item.notes || null,
    }));
  };

  const calculateCategorySummary = (
    items: any[],
    category: string,
    markupPercent: number
  ): ManifestCategorySummary => {
    const manifestItems = mapItemsToManifest(items, category);
    const subtotal = manifestItems.reduce((sum, item) => sum + item.amount, 0);
    const markupAmount = subtotal * (markupPercent / 100);
    
    return {
      category,
      items: manifestItems,
      subtotal,
      markupPercent,
      markupAmount,
      categoryTotal: subtotal + markupAmount,
    };
  };

  const labor = calculateCategorySummary(draft.lineItems.labor, "Labor", markups.labor);
  const equipment = calculateCategorySummary(draft.lineItems.equipment, "Equipment", markups.equipment);
  const materials = calculateCategorySummary(draft.lineItems.materials, "Materials", markups.materials);
  const subcontractors = calculateCategorySummary(draft.lineItems.subcontractors, "Subcontractors", markups.subcontractors);
  const disposal = calculateCategorySummary(draft.lineItems.disposal, "Disposal", markups.disposal);
  const importCat = calculateCategorySummary(draft.lineItems.import, "Import/Trucking", markups.import);

  const grandSubtotal = labor.subtotal + equipment.subtotal + materials.subtotal + 
                        subcontractors.subtotal + disposal.subtotal + importCat.subtotal;
  const grandMarkup = labor.markupAmount + equipment.markupAmount + materials.markupAmount +
                      subcontractors.markupAmount + disposal.markupAmount + importCat.markupAmount;

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    header,
    categories: {
      labor,
      equipment,
      materials,
      subcontractors,
      disposal,
      import: importCat,
    },
    totals: {
      laborSubtotal: labor.subtotal,
      laborMarkup: labor.markupAmount,
      laborTotal: labor.categoryTotal,
      equipmentSubtotal: equipment.subtotal,
      equipmentMarkup: equipment.markupAmount,
      equipmentTotal: equipment.categoryTotal,
      materialsSubtotal: materials.subtotal,
      materialsMarkup: materials.markupAmount,
      materialsTotal: materials.categoryTotal,
      subcontractorsSubtotal: subcontractors.subtotal,
      subcontractorsMarkup: subcontractors.markupAmount,
      subcontractorsTotal: subcontractors.categoryTotal,
      disposalSubtotal: disposal.subtotal,
      disposalMarkup: disposal.markupAmount,
      disposalTotal: disposal.categoryTotal,
      importSubtotal: importCat.subtotal,
      importMarkup: importCat.markupAmount,
      importTotal: importCat.categoryTotal,
      grandSubtotal,
      grandMarkup,
      grandTotal: grandSubtotal + grandMarkup,
    },
    signatureBlock: {
      preparedByName: null,
      preparedByTitle: null,
      preparedByDate: null,
      approvedByName: null,
      approvedByTitle: null,
      approvedByDate: null,
      clientApprovedByName: null,
      clientApprovedByTitle: null,
      clientApprovedByDate: null,
    },
    backupDocuments: [],
    notes: null,
    termsAndConditions: null,
  };
}

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

// =============================================================================
// PROCESSED DOCUMENT SCHEMA - T&M Document Processing Output
// =============================================================================

export const ExtractedLineItemSchema = z.object({
  id: z.string(),
  rawDescription: z.string(),
  normalizedDescription: z.string(),
  category: z.enum(["labor", "equipment", "material", "disposal", "subcontractor"]),
  quantity: z.number(),
  unit: z.string(),
  extractedRate: z.number().nullable(),
  matchedRateId: z.number().nullable(),
  matchedRate: z.number().nullable(),
  matchedDescription: z.string().nullable(),
  confidenceScore: z.number().min(0).max(100),
  requiresReview: z.boolean(),
  classification: z.string().nullable(),
  date: z.string().nullable(),
  notes: z.string().nullable(),
});

export type ExtractedLineItem = z.infer<typeof ExtractedLineItemSchema>;

export const ProcessedDocumentSchema = z.object({
  documentId: z.number(),
  filename: z.string(),
  documentType: z.enum(["tm_sheet", "invoice", "quote", "rate_table", "other"]),
  processedAt: z.string(),
  ocrConfidence: z.number().min(0).max(1),
  
  metadata: z.object({
    vendor: z.string().nullable(),
    invoiceNumber: z.string().nullable(),
    invoiceDate: z.string().nullable(),
    projectReference: z.string().nullable(),
    totalFromDocument: z.number().nullable(),
  }),
  
  laborItems: z.array(ExtractedLineItemSchema),
  equipmentItems: z.array(ExtractedLineItemSchema),
  materialItems: z.array(ExtractedLineItemSchema),
  disposalItems: z.array(ExtractedLineItemSchema),
  subcontractorItems: z.array(ExtractedLineItemSchema),
  
  summary: z.object({
    totalItems: z.number(),
    autoMatchedItems: z.number(),
    itemsRequiringReview: z.number(),
    laborSubtotal: z.number(),
    equipmentSubtotal: z.number(),
    materialSubtotal: z.number(),
    disposalSubtotal: z.number(),
    subcontractorSubtotal: z.number(),
    grandTotal: z.number(),
  }),
  
  errors: z.array(z.object({
    field: z.string(),
    message: z.string(),
    severity: z.enum(["warning", "error"]),
  })).default([]),
});

export type ProcessedDocument = z.infer<typeof ProcessedDocumentSchema>;
