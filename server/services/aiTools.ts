import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { db } from "../db";
import { changeOrders, projects, rateItems } from "@shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { 
  DraftState, 
  DraftStateSchema, 
  LineItem,
  LineItemSchema,
  SearchRateTableInputSchema,
  SearchRateTableOutputSchema,
  UpdateDraftLineItemsInputSchema,
  CalculateTotalsInputSchema,
  GetProjectContextInputSchema,
  createEmptyDraftState,
  validateDraftState,
} from "@shared/types";
import { semanticSearchRates, hybridSearchRates } from "./embeddingService";

export const AI_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "search_rate_table",
      description: "Search the rate tables for matching rates. Uses semantic search to find rates even when terminology differs (e.g., 'mudding' finds 'drywall finishing'). ALWAYS use this to find rates - never guess or make up rates.",
      parameters: zodToJsonSchema(SearchRateTableInputSchema),
      strict: true,
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_draft_line_items",
      description: "Add, update, or remove line items from the change order draft. Each item must have a valid rate from search_rate_table. Returns the updated draft state.",
      parameters: zodToJsonSchema(UpdateDraftLineItemsInputSchema),
      strict: true,
    },
  },
  {
    type: "function" as const,
    function: {
      name: "calculate_totals",
      description: "Calculate all totals for a change order draft, applying project-specific markup percentages. Call this after adding/updating line items.",
      parameters: zodToJsonSchema(CalculateTotalsInputSchema),
      strict: true,
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_project_context",
      description: "Get project details including markup percentages, existing change orders, and recent CO history. Call this when starting a new CO or when user references a project.",
      parameters: zodToJsonSchema(GetProjectContextInputSchema),
      strict: true,
    },
  },
];

export async function executeToolCall(
  toolName: string,
  args: unknown,
  userId: string,
  companyId?: number
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    switch (toolName) {
      case "search_rate_table":
        return await executeSearchRateTable(args, companyId);
      case "update_draft_line_items":
        return await executeUpdateDraftLineItems(args, userId);
      case "calculate_totals":
        return await executeCalculateTotals(args);
      case "get_project_context":
        return await executeGetProjectContext(args);
      default:
        return { success: false, error: `Unknown tool: ${toolName}` };
    }
  } catch (error) {
    console.error(`Tool execution error for ${toolName}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Tool execution failed" 
    };
  }
}

async function executeSearchRateTable(
  args: unknown,
  companyId?: number
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const parsed = SearchRateTableInputSchema.safeParse(args);
  if (!parsed.success) {
    return { success: false, error: `Invalid arguments: ${parsed.error.message}` };
  }

  const { query, type, limit } = parsed.data;
  
  const results = await hybridSearchRates(
    query,
    type,
    companyId ?? parsed.data.companyId,
    limit
  );

  return {
    success: true,
    data: {
      results: results.map(r => ({
        id: r.id,
        rateTableId: r.rateTableId,
        description: r.description,
        unit: r.unit,
        rate: parseFloat(r.rate),
        classification: r.classification,
        effectiveDate: r.effectiveDate?.toISOString(),
        source: r.source,
        matchScore: r.similarity,
      })),
      totalFound: results.length,
    },
  };
}

async function executeUpdateDraftLineItems(
  args: unknown,
  userId: string
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const parsed = UpdateDraftLineItemsInputSchema.safeParse(args);
  if (!parsed.success) {
    return { success: false, error: `Invalid arguments: ${parsed.error.message}` };
  }

  const { draftId, operation, items } = parsed.data;

  const [co] = await db
    .select()
    .from(changeOrders)
    .where(eq(changeOrders.id, draftId))
    .limit(1);

  if (!co) {
    return { success: false, error: `Change order ${draftId} not found` };
  }

  let draftState: DraftState;
  if (co.draftState) {
    const validation = validateDraftState(co.draftState);
    if (!validation.success) {
      draftState = createEmptyDraftState("DATA_CONFIRMATION");
    } else {
      draftState = validation.data;
    }
  } else {
    draftState = createEmptyDraftState("DATA_CONFIRMATION");
  }

  const errors: { itemId: string; error: string }[] = [];

  for (const item of items) {
    const category = getCategoryForType(item.type);
    
    if (operation === "add") {
      (draftState.lineItems[category] as LineItem[]).push(item);
    } else if (operation === "update") {
      const index = (draftState.lineItems[category] as LineItem[]).findIndex(
        i => i.id === item.id
      );
      if (index >= 0) {
        (draftState.lineItems[category] as LineItem[])[index] = item;
      } else {
        errors.push({ itemId: item.id, error: "Item not found for update" });
      }
    } else if (operation === "remove") {
      const index = (draftState.lineItems[category] as LineItem[]).findIndex(
        i => i.id === item.id
      );
      if (index >= 0) {
        (draftState.lineItems[category] as LineItem[]).splice(index, 1);
      }
    }
  }

  draftState.lastUpdatedAt = new Date().toISOString();
  draftState.lastUpdatedBy = userId;

  await db
    .update(changeOrders)
    .set({
      draftState: draftState,
      updatedAt: new Date(),
    })
    .where(eq(changeOrders.id, draftId));

  return {
    success: true,
    data: {
      updatedDraft: draftState,
      errors: errors.length > 0 ? errors : undefined,
    },
  };
}

async function executeCalculateTotals(
  args: unknown
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const parsed = CalculateTotalsInputSchema.safeParse(args);
  if (!parsed.success) {
    return { success: false, error: `Invalid arguments: ${parsed.error.message}` };
  }

  const { draftId, applyMarkups } = parsed.data;

  const [co] = await db
    .select()
    .from(changeOrders)
    .where(eq(changeOrders.id, draftId))
    .limit(1);

  if (!co) {
    return { success: false, error: `Change order ${draftId} not found` };
  }

  const validation = validateDraftState(co.draftState);
  if (!validation.success) {
    return { success: false, error: "Invalid draft state" };
  }

  const draftState = validation.data;

  let project = null;
  if (co.projectId) {
    [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, co.projectId))
      .limit(1);
  }

  const markups = {
    laborPercent: parseFloat(project?.markupLabor ?? "15"),
    materialsPercent: parseFloat(project?.markupMaterials ?? "25"),
    equipmentOwnedPercent: parseFloat(project?.markupEquipmentOwned ?? "20"),
    equipmentRentedPercent: parseFloat(project?.markupEquipmentRented ?? "15"),
    disposalPercent: parseFloat(project?.markupDisposal ?? "15"),
    importPercent: parseFloat(project?.markupImport ?? "15"),
    subcontractorsPercent: parseFloat(project?.markupSubcontractors ?? "10"),
  };

  const laborTotal = sumLineItems(draftState.lineItems.labor);
  const materialsTotal = sumLineItems(draftState.lineItems.materials);
  const equipmentTotal = sumLineItems(draftState.lineItems.equipment);
  const disposalTotal = sumLineItems(draftState.lineItems.disposal);
  const importTotal = sumLineItems(draftState.lineItems.import);
  const subcontractorsTotal = sumLineItems(draftState.lineItems.subcontractors);

  const subtotal = laborTotal + materialsTotal + equipmentTotal + 
                   disposalTotal + importTotal + subcontractorsTotal;

  let markup = 0;
  if (applyMarkups) {
    markup = 
      (laborTotal * markups.laborPercent / 100) +
      (materialsTotal * markups.materialsPercent / 100) +
      (equipmentTotal * markups.equipmentOwnedPercent / 100) +
      (disposalTotal * markups.disposalPercent / 100) +
      (importTotal * markups.importPercent / 100) +
      (subcontractorsTotal * markups.subcontractorsPercent / 100);
  }

  const totals = {
    labor: laborTotal,
    equipment: equipmentTotal,
    materials: materialsTotal,
    subcontractors: subcontractorsTotal,
    disposal: disposalTotal,
    import: importTotal,
    subtotal,
    markup,
    total: subtotal + markup,
  };

  draftState.totals = totals;
  draftState.lastUpdatedAt = new Date().toISOString();

  await db
    .update(changeOrders)
    .set({
      draftState: draftState,
      totalAmount: String(totals.total),
      laborAmount: String(totals.labor),
      materialAmount: String(totals.materials),
      equipmentAmount: String(totals.equipment),
      disposalAmount: String(totals.disposal),
      importAmount: String(totals.import),
      subcontractorAmount: String(totals.subcontractors),
      updatedAt: new Date(),
    })
    .where(eq(changeOrders.id, draftId));

  return {
    success: true,
    data: {
      totals,
      markupsApplied: applyMarkups ? markups : undefined,
    },
  };
}

async function executeGetProjectContext(
  args: unknown
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const parsed = GetProjectContextInputSchema.safeParse(args);
  if (!parsed.success) {
    return { success: false, error: `Invalid arguments: ${parsed.error.message}` };
  }

  const { projectId } = parsed.data;

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) {
    return { success: false, error: `Project ${projectId} not found` };
  }

  const existingCOs = await db
    .select()
    .from(changeOrders)
    .where(eq(changeOrders.projectId, projectId))
    .orderBy(desc(changeOrders.createdAt))
    .limit(5);

  return {
    success: true,
    data: {
      project: {
        id: project.id,
        number: project.number,
        name: project.name,
        clientName: project.clientName,
        status: project.status,
      },
      markups: {
        labor: parseFloat(project.markupLabor ?? "15"),
        materials: parseFloat(project.markupMaterials ?? "25"),
        equipmentOwned: parseFloat(project.markupEquipmentOwned ?? "20"),
        equipmentRented: parseFloat(project.markupEquipmentRented ?? "15"),
        disposal: parseFloat(project.markupDisposal ?? "15"),
        import: parseFloat(project.markupImport ?? "15"),
        subcontractors: parseFloat(project.markupSubcontractors ?? "10"),
      },
      existingCOCount: existingCOs.length,
      recentCOs: existingCOs.map(co => ({
        id: co.id,
        number: co.number,
        title: co.title,
        totalAmount: co.totalAmount ? parseFloat(co.totalAmount) : null,
        status: co.status,
      })),
    },
  };
}

function getCategoryForType(type: string): keyof DraftState["lineItems"] {
  switch (type) {
    case "labor": return "labor";
    case "equipment": return "equipment";
    case "material": return "materials";
    case "subcontractor": return "subcontractors";
    case "disposal": return "disposal";
    case "import": return "import";
    default: return "materials";
  }
}

function sumLineItems(items: { amount: number }[]): number {
  return items.reduce((sum, item) => sum + item.amount, 0);
}
