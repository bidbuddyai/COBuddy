import OpenAI from "openai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { db } from "../db";
import { changeOrders, projects, rateTables, rateItems } from "@shared/schema";
import { eq, sql, and, or, desc, ilike } from "drizzle-orm";
import { storage } from "../storage";
import {
  DraftState,
  DraftStateSchema,
  LineItem,
  createEmptyDraftState,
  validateDraftState,
  ChangeOrderManifest,
  createManifestFromDraft,
} from "@shared/types";
import { semanticSearchRates, hybridSearchRates } from "./embeddingService";
import { 
  validateConstructionLogic, 
  ValidationResult,
  ProjectMarkups,
  formatValidationForUser 
} from "./supervisorAgent";

const openai = new OpenAI();

const FindBestRateMatchInputSchema = z.object({
  rawDescription: z
    .string()
    .describe("The raw string from an invoice or user input, e.g., 'Laborer Group 3' or 'foreman time'"),
  rateType: z
    .enum(["labor", "equipment", "material", "disposal", "import"])
    .describe("The category of rate to search for"),
  limit: z.number().optional().default(3).describe("Number of top matches to return (default 3)"),
});

const FindBestRateMatchOutputSchema = z.object({
  matches: z.array(
    z.object({
      id: z.number(),
      rateTableId: z.number(),
      description: z.string(),
      classification: z.string().nullable(),
      unit: z.string(),
      rate: z.number(),
      overtimeRate: z.number().nullable(),
      confidenceScore: z.number().describe("Confidence score 0-100 based on trigram similarity"),
      source: z.enum(["company", "public"]),
    })
  ),
  needsUserConfirmation: z
    .boolean()
    .describe("True if highest confidence < 80%, meaning AI should present options to user"),
  recommendedMatchId: z.number().nullable().describe("ID of the best match if confidence >= 80%"),
});

const UpdateDraftStateInputSchema = z.object({
  changeOrderId: z.number().describe("The change order ID to update"),
  action: z
    .enum(["add_line_item", "update_line_item", "remove_line_item", "set_scope", "set_title"])
    .describe("The action to perform on the draft"),
  lineItem: z
    .object({
      id: z.string().optional().describe("Required for update/remove operations"),
      type: z.enum(["labor", "equipment", "material", "subcontractor", "disposal", "import"]),
      description: z.string(),
      quantity: z.number().describe("Hours for labor/equipment, quantity for materials"),
      unit: z.string(),
      rate: z.number(),
      amount: z.number().describe("quantity * rate"),
      rateItemId: z.number().optional().describe("ID from rate_items table if matched"),
      classification: z.string().optional(),
      notes: z.string().optional(),
    })
    .optional()
    .describe("Required for add/update/remove line item operations"),
  scope: z.string().optional().describe("Required for set_scope action"),
  title: z.string().optional().describe("Required for set_title action"),
});

const UpdateDraftStateOutputSchema = z.object({
  success: z.boolean(),
  updatedDraft: DraftStateSchema.optional(),
  changeOrderId: z.number(),
  error: z.string().optional(),
  summary: z.string().describe("Human-readable summary of what was changed"),
});

const GetProjectContextInputSchema = z.object({
  projectId: z.number().describe("The project ID to get context for"),
});

const CalculateTotalsInputSchema = z.object({
  changeOrderId: z.number().describe("The change order ID to calculate totals for"),
  applyMarkups: z.boolean().default(true).describe("Whether to apply project markup percentages"),
});

const GUIDED_CO_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "find_best_rate_match",
      description:
        "Search the rate tables for matching rates using trigram similarity. Returns top 3 matches with confidence scores. If the highest confidence is below 80%, the AI MUST present all options to the user for selection rather than picking blindly.",
      parameters: zodToJsonSchema(FindBestRateMatchInputSchema) as Record<string, unknown>,
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "update_draft_state",
      description:
        "Add, update, or remove items from the change order draft. This tool performs the actual database write. The AI must call this tool BEFORE confirming any changes to the user. Never just reply textually - always write to DB first, then confirm.",
      parameters: zodToJsonSchema(UpdateDraftStateInputSchema) as Record<string, unknown>,
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "get_project_context",
      description:
        "Get project details including markup percentages, rate table info, and recent change orders. Call this when starting work on a project.",
      parameters: zodToJsonSchema(GetProjectContextInputSchema) as Record<string, unknown>,
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "calculate_totals",
      description:
        "Calculate all totals for a change order draft, applying project-specific markup percentages. Call after adding/updating line items to get accurate totals.",
      parameters: zodToJsonSchema(CalculateTotalsInputSchema) as Record<string, unknown>,
      strict: true,
    },
  },
];

interface SessionContext {
  userId: string;
  userName: string;
  companyId: number;
  companyName: string;
  projectId?: number;
  projectName?: string;
  changeOrderId?: number;
}

interface ConversationMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[];
}

interface RateSelectionOption {
  id: number;
  description: string;
  rate: number;
  unit: string;
  confidence: number;
}

interface UserSelection {
  type: "rate_selection";
  options: RateSelectionOption[];
  originalQuery: string;
}

interface ProcessMessageResult {
  response: string;
  toolsUsed: string[];
  draftUpdated: boolean;
  needsUserSelection?: UserSelection;
  validation?: ValidationResult;
  retryCount?: number;
  manifest?: ChangeOrderManifest;
}

const MAX_VALIDATION_RETRIES = 2;

function buildSystemPrompt(context: SessionContext): string {
  const projectInfo = context.projectId && context.projectName
    ? `\n- Current Project: ${context.projectName} (ID: ${context.projectId})`
    : "";
  
  const coInfo = context.changeOrderId
    ? `\n- Active Change Order Draft: CO #${context.changeOrderId}`
    : "";

  return `You are CO Buddy AI, a specialized assistant for creating and managing construction change orders.

## Session Context
- User: ${context.userName}
- Company: ${context.companyName} (ID: ${context.companyId})${projectInfo}${coInfo}

## Your Core Responsibilities
1. Help users create accurate change orders by matching their descriptions to actual rate table entries
2. ALWAYS use tools to perform actions - never just describe what you would do
3. When adding line items, ALWAYS call find_best_rate_match first to get real rates from the database
4. After finding rates, call update_draft_state to actually write changes to the database
5. Only confirm changes AFTER the database write succeeds

## Rate Matching Rules
- When a user mentions labor (e.g., "5 hours of foreman time"), call find_best_rate_match with rateType="labor"
- When confidence is < 80%, you MUST present all 3 options to the user and ask them to choose
- When confidence is >= 80%, you may proceed with the recommended match but should mention what rate you're using
- NEVER make up rates or guess - always use find_best_rate_match to get actual database rates

## Workflow Pattern
User says: "Add 5 hours of foreman time"
1. Call find_best_rate_match(rawDescription="foreman", rateType="labor")
2. If confidence >= 80%: Call update_draft_state with the matched rate
3. If confidence < 80%: Present options to user, wait for selection
4. After update_draft_state succeeds: Confirm the addition with specifics

## Response Style
- Be direct and professional
- Use specific numbers and rates from the database
- After making changes, summarize what was added/changed with exact amounts
- Keep responses concise but informative

## Available Rate Types
- labor: Worker classifications (foreman, laborer, journeyman, etc.)
- equipment: Equipment rentals and usage (excavator, loader, crane, etc.)
- material: Construction materials (concrete, pipe, lumber, etc.)
- disposal: Waste disposal and hauling
- import: Imported materials

Remember: You are working with ${context.companyName}'s actual rate tables. Always verify rates against the database.`;
}

export class GuidedCOAssistant {
  private conversationHistory: ConversationMessage[] = [];
  private context: SessionContext;

  constructor(context: SessionContext) {
    this.context = context;
    this.conversationHistory = [
      {
        role: "system",
        content: buildSystemPrompt(context),
      },
    ];
  }

  updateContext(updates: Partial<SessionContext>): void {
    this.context = { ...this.context, ...updates };
    this.conversationHistory[0] = {
      role: "system",
      content: buildSystemPrompt(this.context),
    };
  }

  async processMessage(userMessage: string): Promise<ProcessMessageResult> {
    this.conversationHistory.push({
      role: "user",
      content: userMessage,
    });

    const toolsUsed: string[] = [];
    let draftUpdated = false;
    let needsUserSelection: UserSelection | undefined = undefined;
    let validationRetryCount = 0;
    let lastValidation: ValidationResult | undefined = undefined;
    let lastChangeOrderId: number | undefined = undefined;

    while (validationRetryCount <= MAX_VALIDATION_RETRIES) {
      let response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: this.conversationHistory as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        tools: GUIDED_CO_TOOLS,
        tool_choice: "auto",
        temperature: 0.3,
      });

      let assistantMessage = response.choices[0].message;
      const maxToolIterations = 10;
      let toolIterations = 0;

      while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0 && toolIterations < maxToolIterations) {
        toolIterations++;

        this.conversationHistory.push({
          role: "assistant",
          content: assistantMessage.content || "",
          tool_calls: assistantMessage.tool_calls,
        });

        for (const toolCall of assistantMessage.tool_calls) {
          const toolName = toolCall.function.name;
          const toolArgs = JSON.parse(toolCall.function.arguments);
          
          toolsUsed.push(toolName);
          console.log(`[GuidedCOAssistant] Executing tool: ${toolName}`, toolArgs);

          let toolResult: unknown;

          try {
            switch (toolName) {
              case "find_best_rate_match":
                toolResult = await this.executeFindBestRateMatch(toolArgs);
                const matchResult = toolResult as z.infer<typeof FindBestRateMatchOutputSchema>;
                if (matchResult.needsUserConfirmation) {
                  needsUserSelection = {
                    type: "rate_selection",
                    options: matchResult.matches.map((m) => ({
                      id: m.id,
                      description: m.description,
                      rate: m.rate,
                      unit: m.unit,
                      confidence: m.confidenceScore,
                    })),
                    originalQuery: toolArgs.rawDescription,
                  };
                }
                break;

              case "update_draft_state":
                toolResult = await this.executeUpdateDraftState(toolArgs);
                const updateResult = toolResult as z.infer<typeof UpdateDraftStateOutputSchema>;
                if (updateResult.success) {
                  draftUpdated = true;
                  lastChangeOrderId = updateResult.changeOrderId;
                }
                break;

              case "get_project_context":
                toolResult = await this.executeGetProjectContext(toolArgs);
                break;

              case "calculate_totals":
                toolResult = await this.executeCalculateTotals(toolArgs);
                break;

              default:
                toolResult = { error: `Unknown tool: ${toolName}` };
            }
          } catch (error) {
            console.error(`[GuidedCOAssistant] Tool error:`, error);
            toolResult = {
              error: error instanceof Error ? error.message : "Tool execution failed",
            };
          }

          this.conversationHistory.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResult),
          });
        }

        response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: this.conversationHistory as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
          tools: GUIDED_CO_TOOLS,
          tool_choice: "auto",
          temperature: 0.3,
        });

        assistantMessage = response.choices[0].message;
      }

      const finalContent = assistantMessage.content || "I've completed the requested actions.";

      if (draftUpdated && lastChangeOrderId) {
        const validation = await this.validateDraftBeforeResponse(lastChangeOrderId);
        lastValidation = validation;

        if (!validation.isValid && validation.shouldRetry && validationRetryCount < MAX_VALIDATION_RETRIES) {
          validationRetryCount++;
          console.warn(`[Supervisor] Validation failed (attempt ${validationRetryCount}/${MAX_VALIDATION_RETRIES}):`, 
            validation.errors.map(e => e.message));

          this.conversationHistory.push({
            role: "user",
            content: `SYSTEM VALIDATION ERROR - You violated a validation rule. Fix it before proceeding.\n\n${validation.retryPrompt}`,
          });

          continue;
        }
      }

      this.conversationHistory.push({
        role: "assistant",
        content: finalContent,
      });

      let manifest: ChangeOrderManifest | undefined;
      if (draftUpdated && lastChangeOrderId) {
        manifest = await this.generateManifest(lastChangeOrderId);
      }

      return {
        response: finalContent,
        toolsUsed,
        draftUpdated,
        needsUserSelection,
        validation: lastValidation,
        retryCount: validationRetryCount,
        manifest,
      };
    }

    const fallbackContent = "I've made some changes but there may be issues that need manual review.";
    this.conversationHistory.push({
      role: "assistant",
      content: fallbackContent,
    });

    let manifest: ChangeOrderManifest | undefined;
    if (draftUpdated && lastChangeOrderId) {
      manifest = await this.generateManifest(lastChangeOrderId);
    }

    return {
      response: fallbackContent,
      toolsUsed,
      draftUpdated,
      needsUserSelection,
      validation: lastValidation,
      retryCount: validationRetryCount,
      manifest,
    };
  }

  private async generateManifest(changeOrderId: number): Promise<ChangeOrderManifest | undefined> {
    try {
      const [co] = await db
        .select()
        .from(changeOrders)
        .where(eq(changeOrders.id, changeOrderId))
        .limit(1);

      if (!co || !co.draftState) {
        return undefined;
      }

      const draft = co.draftState as any;

      let project: any = null;
      if (co.projectId) {
        const [p] = await db
          .select()
          .from(projects)
          .where(eq(projects.id, co.projectId))
          .limit(1);
        project = p;
      }

      const markupPercentages = {
        labor: parseFloat(project?.markupLabor || '0'),
        materials: parseFloat(project?.markupMaterials || '0'),
        equipment: parseFloat(project?.markupEquipmentOwned || project?.markupEquipmentRented || '0'),
        subcontractors: parseFloat(project?.markupSubcontractors || '0'),
        disposal: parseFloat(project?.markupDisposal || '0'),
        import: parseFloat(project?.markupImport || '0'),
      };

      const header = {
        coNumber: co.number || `DRAFT-${co.id}`,
        projectNumber: project?.number || '',
        projectName: project?.name || '',
        clientName: project?.clientName || null,
        preparedBy: this.context.userName,
        preparedDate: new Date().toISOString().split('T')[0],
        submittedDate: null,
        status: co.status || 'draft',
        description: draft.description || co.description || null,
        scope: draft.scope || null,
      };

      return createManifestFromDraft(draft, header, markupPercentages);
    } catch (error) {
      console.error('[GuidedCOAssistant] Error generating manifest:', error);
      return undefined;
    }
  }

  private async validateDraftBeforeResponse(changeOrderId: number): Promise<ValidationResult> {
    try {
      const [co] = await db
        .select()
        .from(changeOrders)
        .where(eq(changeOrders.id, changeOrderId))
        .limit(1);

      if (!co || !co.draftState) {
        return {
          isValid: true,
          errors: [],
          warnings: [],
          shouldRetry: false,
        };
      }

      let projectMarkups: ProjectMarkups | undefined;
      if (co.projectId) {
        const [project] = await db
          .select()
          .from(projects)
          .where(eq(projects.id, co.projectId))
          .limit(1);

        if (project) {
          projectMarkups = {
            labor: parseFloat(project.markupLabor || '0'),
            materials: parseFloat(project.markupMaterials || '0'),
            equipmentOwned: parseFloat(project.markupEquipmentOwned || '0'),
            equipmentRented: parseFloat(project.markupEquipmentRented || '0'),
            disposal: parseFloat(project.markupDisposal || '0'),
            import: parseFloat(project.markupImport || '0'),
            subcontractors: parseFloat(project.markupSubcontractors || '0'),
          };
        }
      }

      const validation = validateConstructionLogic(co.draftState as any, projectMarkups);

      console.log(`[Supervisor] Validation result: isValid=${validation.isValid}, errors=${validation.errors.length}, warnings=${validation.warnings.length}`);

      return validation;
    } catch (error) {
      console.error(`[Supervisor] Validation error:`, error);
      return {
        isValid: true,
        errors: [],
        warnings: [],
        shouldRetry: false,
      };
    }
  }

  private async executeFindBestRateMatch(
    args: z.infer<typeof FindBestRateMatchInputSchema>
  ): Promise<z.infer<typeof FindBestRateMatchOutputSchema>> {
    const { rawDescription, rateType, limit = 3 } = args;

    console.log(`[GuidedCOAssistant] Semantic search for: "${rawDescription}" (type: ${rateType})`);

    try {
      const searchResults = await hybridSearchRates(
        rawDescription,
        rateType,
        this.context.companyId,
        limit
      );

      if (searchResults.length === 0) {
        console.log(`[GuidedCOAssistant] No semantic matches found, trying fallback...`);
        
        const fallbackResults = await db.execute(sql`
          SELECT 
            ri.id,
            ri.rate_table_id as "rateTableId",
            ri.description,
            ri.classification,
            ri.unit,
            ri.rate,
            ri.overtime_rate as "overtimeRate",
            ri.company_id as "companyId"
          FROM rate_items ri
          WHERE 
            ri.type = ${rateType}
            AND ri.is_active = true
            AND (ri.company_id = ${this.context.companyId} OR ri.company_id IS NULL)
          ORDER BY 
            CASE WHEN ri.company_id IS NOT NULL THEN 0 ELSE 1 END,
            ri.description
          LIMIT ${limit}
        `);

        const fallbackRows = (fallbackResults as any).rows || fallbackResults;
        const fallbackMatches = (fallbackRows as any[]).map((row) => ({
          id: row.id,
          rateTableId: row.rateTableId,
          description: row.description,
          classification: row.classification,
          unit: row.unit,
          rate: parseFloat(row.rate),
          overtimeRate: row.overtimeRate ? parseFloat(row.overtimeRate) : null,
          confidenceScore: 30,
          source: row.companyId ? ("company" as const) : ("public" as const),
        }));

        return {
          matches: fallbackMatches,
          needsUserConfirmation: true,
          recommendedMatchId: null,
        };
      }

      const matches = searchResults.map((result) => ({
        id: result.id,
        rateTableId: result.rateTableId,
        description: result.description,
        classification: result.classification,
        unit: result.unit,
        rate: parseFloat(result.rate),
        overtimeRate: result.overtimeRate ? parseFloat(result.overtimeRate) : null,
        confidenceScore: Math.min(100, Math.round(result.similarity * 100)),
        source: result.source,
      }));

      const highestConfidence = matches[0]?.confidenceScore ?? 0;
      const needsUserConfirmation = highestConfidence < 80;

      console.log(`[GuidedCOAssistant] Found ${matches.length} matches. Top confidence: ${highestConfidence}%`);

      return {
        matches,
        needsUserConfirmation,
        recommendedMatchId: needsUserConfirmation ? null : matches[0]?.id ?? null,
      };
    } catch (error) {
      console.error(`[GuidedCOAssistant] Semantic search error, falling back to text:`, error);
      
      const searchTerm = rawDescription.toLowerCase().trim();
      const results = await db.execute(sql`
        SELECT 
          ri.id,
          ri.rate_table_id as "rateTableId",
          ri.description,
          ri.classification,
          ri.unit,
          ri.rate,
          ri.overtime_rate as "overtimeRate",
          ri.company_id as "companyId",
          GREATEST(
            COALESCE(similarity(LOWER(ri.description), ${searchTerm}), 0),
            COALESCE(similarity(LOWER(COALESCE(ri.classification, '')), ${searchTerm}), 0)
          ) * 100 as confidence_score
        FROM rate_items ri
        WHERE 
          ri.type = ${rateType}
          AND ri.is_active = true
          AND (ri.company_id = ${this.context.companyId} OR ri.company_id IS NULL)
          AND (
            LOWER(ri.description) ILIKE ${"%" + searchTerm + "%"}
            OR LOWER(ri.classification) ILIKE ${"%" + searchTerm + "%"}
            OR similarity(LOWER(ri.description), ${searchTerm}) > 0.2
          )
        ORDER BY confidence_score DESC
        LIMIT ${limit}
      `);

      const rows = (results as any).rows || results;
      
      const matches = (rows as any[]).map((row) => ({
        id: row.id,
        rateTableId: row.rateTableId,
        description: row.description,
        classification: row.classification,
        unit: row.unit,
        rate: parseFloat(row.rate),
        overtimeRate: row.overtimeRate ? parseFloat(row.overtimeRate) : null,
        confidenceScore: Math.min(100, Math.round(parseFloat(row.confidence_score || "0"))),
        source: row.companyId ? ("company" as const) : ("public" as const),
      }));

      const highestConfidence = matches[0]?.confidenceScore ?? 0;
      const needsUserConfirmation = highestConfidence < 80 || matches.length === 0;

      return {
        matches,
        needsUserConfirmation,
        recommendedMatchId: needsUserConfirmation ? null : matches[0]?.id ?? null,
      };
    }
  }

  private async executeUpdateDraftState(
    args: z.infer<typeof UpdateDraftStateInputSchema>
  ): Promise<z.infer<typeof UpdateDraftStateOutputSchema>> {
    const { changeOrderId, action, lineItem, scope, title } = args;

    const [co] = await db
      .select()
      .from(changeOrders)
      .where(eq(changeOrders.id, changeOrderId))
      .limit(1);

    if (!co) {
      return {
        success: false,
        changeOrderId,
        error: `Change order ${changeOrderId} not found`,
        summary: "Failed to find change order",
      };
    }

    let draftState: DraftState;
    if (co.draftState) {
      const validation = validateDraftState(co.draftState);
      draftState = validation.success ? validation.data : createEmptyDraftState("DATA_CONFIRMATION");
    } else {
      draftState = createEmptyDraftState("DATA_CONFIRMATION");
    }

    let summary = "";

    switch (action) {
      case "add_line_item": {
        if (!lineItem) {
          return {
            success: false,
            changeOrderId,
            error: "lineItem is required for add_line_item action",
            summary: "Missing line item data",
          };
        }

        const itemId = lineItem.id || crypto.randomUUID();
        const amount = lineItem.quantity * lineItem.rate;
        const category = this.getCategoryForType(lineItem.type);

        const baseItem = {
          id: itemId,
          description: lineItem.description,
          quantity: lineItem.quantity,
          unit: lineItem.unit,
          unitRate: lineItem.rate,
          amount,
          notes: lineItem.notes,
          isConfirmed: true,
        };

        switch (lineItem.type) {
          case "labor":
            draftState.lineItems.labor.push({
              ...baseItem,
              type: "labor",
              classification: lineItem.classification || "General Labor",
              hours: lineItem.quantity,
              overtimeHours: 0,
            });
            break;
          case "equipment":
            draftState.lineItems.equipment.push({
              ...baseItem,
              type: "equipment",
              equipmentType: lineItem.classification || "General Equipment",
              hours: lineItem.quantity,
              isOperated: false,
              isRented: false,
              standbyHours: 0,
            });
            break;
          case "material":
            draftState.lineItems.materials.push({
              ...baseItem,
              type: "material",
            });
            break;
          case "subcontractor":
            draftState.lineItems.subcontractors.push({
              ...baseItem,
              type: "subcontractor",
              subcontractorName: lineItem.classification || "Unknown Subcontractor",
              scope: lineItem.description,
            });
            break;
          case "disposal":
            draftState.lineItems.disposal.push({
              ...baseItem,
              type: "disposal",
              disposalType: lineItem.classification || "General Disposal",
            });
            break;
          case "import":
            draftState.lineItems.import.push({
              ...baseItem,
              type: "import",
              materialType: lineItem.classification || "Unknown Material",
            });
            break;
        }

        summary = `Added ${lineItem.type}: ${lineItem.description} - ${lineItem.quantity} ${lineItem.unit} @ $${lineItem.rate}/${lineItem.unit} = $${amount.toFixed(2)}`;
        break;
      }

      case "update_line_item": {
        if (!lineItem || !lineItem.id) {
          return {
            success: false,
            changeOrderId,
            error: "lineItem with id is required for update_line_item action",
            summary: "Missing line item ID",
          };
        }

        let found = false;
        const amount = lineItem.quantity * lineItem.rate;

        for (const categoryKey of Object.keys(draftState.lineItems) as Array<keyof typeof draftState.lineItems>) {
          const items = draftState.lineItems[categoryKey];
          const index = items.findIndex((i: { id: string }) => i.id === lineItem.id);
          if (index !== -1) {
            const existingItem = items[index];
            (items as any)[index] = {
              ...existingItem,
              description: lineItem.description,
              quantity: lineItem.quantity,
              unit: lineItem.unit,
              unitRate: lineItem.rate,
              amount,
              notes: lineItem.notes,
            };
            found = true;
            break;
          }
        }

        if (!found) {
          return {
            success: false,
            changeOrderId,
            error: `Line item ${lineItem.id} not found`,
            summary: "Line item not found",
          };
        }

        summary = `Updated ${lineItem.type}: ${lineItem.description} to ${lineItem.quantity} ${lineItem.unit} @ $${lineItem.rate}/${lineItem.unit}`;
        break;
      }

      case "remove_line_item": {
        if (!lineItem || !lineItem.id) {
          return {
            success: false,
            changeOrderId,
            error: "lineItem with id is required for remove_line_item action",
            summary: "Missing line item ID",
          };
        }

        let removed = false;
        for (const category of Object.keys(draftState.lineItems) as Array<keyof typeof draftState.lineItems>) {
          const items = draftState.lineItems[category] as LineItem[];
          const index = items.findIndex((i) => i.id === lineItem.id);
          if (index !== -1) {
            const removedItem = items.splice(index, 1)[0];
            summary = `Removed: ${removedItem.description}`;
            removed = true;
            break;
          }
        }

        if (!removed) {
          return {
            success: false,
            changeOrderId,
            error: `Line item ${lineItem.id} not found`,
            summary: "Line item not found",
          };
        }
        break;
      }

      case "set_scope": {
        if (!scope) {
          return {
            success: false,
            changeOrderId,
            error: "scope is required for set_scope action",
            summary: "Missing scope",
          };
        }
        draftState.scope = scope;
        summary = `Set scope: ${scope.substring(0, 100)}${scope.length > 100 ? "..." : ""}`;
        break;
      }

      case "set_title": {
        if (!title) {
          return {
            success: false,
            changeOrderId,
            error: "title is required for set_title action",
            summary: "Missing title",
          };
        }
        summary = `Set title: ${title}`;
        break;
      }
    }

    draftState.lastUpdatedAt = new Date().toISOString();
    draftState.lastUpdatedBy = this.context.userId;

    const laborTotal = this.sumLineItems(draftState.lineItems.labor);
    const materialsTotal = this.sumLineItems(draftState.lineItems.materials);
    const equipmentTotal = this.sumLineItems(draftState.lineItems.equipment);
    const disposalTotal = this.sumLineItems(draftState.lineItems.disposal);
    const importTotal = this.sumLineItems(draftState.lineItems.import);
    const subcontractorsTotal = this.sumLineItems(draftState.lineItems.subcontractors);
    const subtotal = laborTotal + materialsTotal + equipmentTotal + disposalTotal + importTotal + subcontractorsTotal;

    draftState.totals = {
      labor: laborTotal,
      materials: materialsTotal,
      equipment: equipmentTotal,
      disposal: disposalTotal,
      import: importTotal,
      subcontractors: subcontractorsTotal,
      subtotal,
      markup: 0,
      total: subtotal,
    };

    await db
      .update(changeOrders)
      .set({
        draftState: draftState,
        title: action === "set_title" ? title : co.title,
        totalAmount: String(subtotal),
        laborAmount: String(laborTotal),
        materialAmount: String(materialsTotal),
        equipmentAmount: String(equipmentTotal),
        disposalAmount: String(disposalTotal),
        importAmount: String(importTotal),
        subcontractorAmount: String(subcontractorsTotal),
        updatedAt: new Date(),
      })
      .where(eq(changeOrders.id, changeOrderId));

    return {
      success: true,
      updatedDraft: draftState,
      changeOrderId,
      summary,
    };
  }

  private async executeGetProjectContext(args: z.infer<typeof GetProjectContextInputSchema>) {
    const { projectId } = args;

    const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);

    if (!project) {
      return { error: `Project ${projectId} not found` };
    }

    const existingCOs = await db
      .select()
      .from(changeOrders)
      .where(eq(changeOrders.projectId, projectId))
      .orderBy(desc(changeOrders.createdAt))
      .limit(5);

    const rateTableCount = await db
      .select({ count: sql`count(*)` })
      .from(rateTables)
      .where(or(eq(rateTables.companyId, this.context.companyId), sql`${rateTables.companyId} IS NULL`));

    return {
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
      recentCOs: existingCOs.map((co) => ({
        id: co.id,
        number: co.number,
        title: co.title,
        totalAmount: co.totalAmount ? parseFloat(co.totalAmount) : null,
        status: co.status,
      })),
      rateTablesAvailable: parseInt((rateTableCount as any)[0]?.count || "0"),
    };
  }

  private async executeCalculateTotals(args: z.infer<typeof CalculateTotalsInputSchema>) {
    const { changeOrderId, applyMarkups } = args;

    const [co] = await db.select().from(changeOrders).where(eq(changeOrders.id, changeOrderId)).limit(1);

    if (!co) {
      return { error: `Change order ${changeOrderId} not found` };
    }

    const validation = validateDraftState(co.draftState);
    if (!validation.success) {
      return { error: "Invalid draft state" };
    }

    const draftState = validation.data;

    let project = null;
    if (co.projectId) {
      [project] = await db.select().from(projects).where(eq(projects.id, co.projectId)).limit(1);
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

    const laborTotal = this.sumLineItems(draftState.lineItems.labor);
    const materialsTotal = this.sumLineItems(draftState.lineItems.materials);
    const equipmentTotal = this.sumLineItems(draftState.lineItems.equipment);
    const disposalTotal = this.sumLineItems(draftState.lineItems.disposal);
    const importTotal = this.sumLineItems(draftState.lineItems.import);
    const subcontractorsTotal = this.sumLineItems(draftState.lineItems.subcontractors);

    const subtotal = laborTotal + materialsTotal + equipmentTotal + disposalTotal + importTotal + subcontractorsTotal;

    let markup = 0;
    if (applyMarkups) {
      markup =
        (laborTotal * markups.laborPercent) / 100 +
        (materialsTotal * markups.materialsPercent) / 100 +
        (equipmentTotal * markups.equipmentOwnedPercent) / 100 +
        (disposalTotal * markups.disposalPercent) / 100 +
        (importTotal * markups.importPercent) / 100 +
        (subcontractorsTotal * markups.subcontractorsPercent) / 100;
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
      .where(eq(changeOrders.id, changeOrderId));

    return {
      totals,
      markupsApplied: applyMarkups ? markups : undefined,
      summary: `Subtotal: $${subtotal.toFixed(2)}, Markup: $${markup.toFixed(2)}, Total: $${totals.total.toFixed(2)}`,
    };
  }

  private getCategoryForType(type: string): keyof DraftState["lineItems"] {
    switch (type) {
      case "labor":
        return "labor";
      case "equipment":
        return "equipment";
      case "material":
        return "materials";
      case "subcontractor":
        return "subcontractors";
      case "disposal":
        return "disposal";
      case "import":
        return "import";
      default:
        return "materials";
    }
  }

  private sumLineItems(items: { amount: number }[]): number {
    return items.reduce((sum, item) => sum + item.amount, 0);
  }

  getConversationHistory(): ConversationMessage[] {
    return [...this.conversationHistory];
  }

  clearHistory(): void {
    this.conversationHistory = [
      {
        role: "system",
        content: buildSystemPrompt(this.context),
      },
    ];
  }
}

export async function createGuidedCOSession(
  userId: string,
  userName: string,
  companyId: number,
  companyName: string,
  projectId?: number
): Promise<GuidedCOAssistant> {
  let projectName: string | undefined;

  if (projectId) {
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    projectName = project?.name;
  }

  return new GuidedCOAssistant({
    userId,
    userName,
    companyId,
    companyName,
    projectId,
    projectName,
  });
}

const sessionCache = new Map<string, GuidedCOAssistant>();

async function processGuidedMessage(
  message: string,
  workflowState: any | null,
  context: any
): Promise<{
  response: { message: string; data?: any };
  updatedState: any | null;
  draft?: any;
}> {
  const userId = context?.user?.id || context?.userId || "system";
  const userName = context?.user?.name || context?.userName || "Chase Tinsley";
  const companyId = context?.user?.companyId || context?.companyId || 1;
  const companyName = context?.user?.companyName || context?.companyName || "Resource Environmental";
  const projectId = context?.projectId || workflowState?.draft?.projectId;
  const changeOrderId = context?.changeOrderId || workflowState?.draft?.changeOrderId;

  const sessionKey = `${userId}-${projectId || "no-project"}`;

  let session = sessionCache.get(sessionKey);
  if (!session) {
    session = await createGuidedCOSession(userId, userName, companyId, companyName, projectId);
    sessionCache.set(sessionKey, session);
  }

  if (changeOrderId) {
    session.updateContext({ changeOrderId });
  }

  const result = await session.processMessage(message);

  const updatedState = {
    currentState: "DATA_CONFIRMATION",
    draft: {
      projectId,
      changeOrderId,
      coType: context?.coType || "estimation",
    },
    lastUpdated: new Date(),
  };

  return {
    response: {
      message: result.response,
      data: {
        toolsUsed: result.toolsUsed,
        draftUpdated: result.draftUpdated,
        needsUserSelection: result.needsUserSelection,
      },
    },
    updatedState: result.draftUpdated ? updatedState : workflowState,
    draft: updatedState.draft,
  };
}

export const guidedCOAssistant = {
  createSession: createGuidedCOSession,
  GuidedCOAssistant,
  processGuidedMessage,
};
