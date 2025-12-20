import { z } from "zod";
import { 
  DraftState, 
  DraftStateSchema, 
  LineItem,
  LaborLineItem,
  EquipmentLineItem,
  MaterialLineItem,
} from "@shared/types";

export interface ValidationError {
  field: string;
  message: string;
  severity: "error" | "warning";
  suggestion?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  shouldRetry: boolean;
  retryPrompt?: string;
}

export interface ProjectMarkups {
  labor: number;
  materials: number;
  equipmentOwned: number;
  equipmentRented: number;
  disposal: number;
  import: number;
  subcontractors: number;
}

const ZERO_RATE_THRESHOLD = 0.01;
const MAX_RETRY_ATTEMPTS = 2;

export function validateConstructionLogic(
  draftState: unknown,
  projectMarkups?: ProjectMarkups
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  const parsed = DraftStateSchema.safeParse(draftState);
  if (!parsed.success) {
    return {
      isValid: false,
      errors: [{
        field: "draftState",
        message: "Invalid draft state structure",
        severity: "error",
        suggestion: "Reconstruct the draft state using createEmptyDraftState()",
      }],
      warnings: [],
      shouldRetry: true,
      retryPrompt: `The draft state is malformed: ${parsed.error.message}. Please reconstruct it properly.`,
    };
  }

  const draft = parsed.data;

  validateLaborItems(draft.lineItems.labor, errors, warnings);
  validateEquipmentItems(draft.lineItems.equipment, errors, warnings);
  validateMaterialItems(draft.lineItems.materials, errors, warnings);
  validateGeneralItems(draft.lineItems.disposal, "disposal", errors, warnings);
  validateGeneralItems(draft.lineItems.import, "import", errors, warnings);
  validateSubcontractorItems(draft.lineItems.subcontractors, errors, warnings);

  if (projectMarkups) {
    validateMarkupApplication(draft, projectMarkups, errors, warnings);
  }

  validateTotalsConsistency(draft, errors, warnings);

  const criticalErrors = errors.filter(e => e.severity === "error");
  const shouldRetry = criticalErrors.length > 0;

  let retryPrompt: string | undefined;
  if (shouldRetry) {
    retryPrompt = buildRetryPrompt(criticalErrors);
  }

  return {
    isValid: criticalErrors.length === 0,
    errors,
    warnings,
    shouldRetry,
    retryPrompt,
  };
}

function validateLaborItems(
  items: LaborLineItem[],
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  for (const item of items) {
    if (item.unitRate < ZERO_RATE_THRESHOLD) {
      errors.push({
        field: `labor.${item.id}.unitRate`,
        message: `Labor item "${item.description}" has $0.00 rate`,
        severity: "error",
        suggestion: "Use search_rate_table to find the correct rate for this labor classification",
      });
    }

    if (item.hours > 0 && item.unitRate < ZERO_RATE_THRESHOLD) {
      errors.push({
        field: `labor.${item.id}`,
        message: `Labor item "${item.description}" has ${item.hours} hours but no rate`,
        severity: "error",
        suggestion: "Query rate table for the classification and apply the correct hourly rate",
      });
    }

    if (!item.classification || item.classification.trim() === "") {
      warnings.push({
        field: `labor.${item.id}.classification`,
        message: `Labor item "${item.description}" is missing classification`,
        severity: "warning",
        suggestion: "Add labor classification (e.g., 'Journeyman Electrician', 'Laborer Group 1')",
      });
    }

    const calculatedAmount = item.hours * item.unitRate;
    const overtimeAmount = (item.overtimeHours || 0) * (item.overtimeRate || item.unitRate * 1.5);
    const expectedAmount = calculatedAmount + overtimeAmount;
    
    if (Math.abs(item.amount - expectedAmount) > 0.01) {
      warnings.push({
        field: `labor.${item.id}.amount`,
        message: `Labor amount mismatch: ${item.amount} vs calculated ${expectedAmount.toFixed(2)}`,
        severity: "warning",
        suggestion: "Recalculate: amount = (hours × rate) + (OT hours × OT rate)",
      });
    }
  }
}

function validateEquipmentItems(
  items: EquipmentLineItem[],
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  for (const item of items) {
    if (item.unitRate < ZERO_RATE_THRESHOLD) {
      errors.push({
        field: `equipment.${item.id}.unitRate`,
        message: `Equipment "${item.description}" has $0.00 rate`,
        severity: "error",
        suggestion: "Use search_rate_table(type='equipment') to find the correct rate",
      });
    }

    if (!item.equipmentType || item.equipmentType.trim() === "") {
      warnings.push({
        field: `equipment.${item.id}.equipmentType`,
        message: `Equipment "${item.description}" is missing equipment type`,
        severity: "warning",
      });
    }

    if (!item.hours && !item.days) {
      warnings.push({
        field: `equipment.${item.id}`,
        message: `Equipment "${item.description}" has no hours or days specified`,
        severity: "warning",
      });
    }
  }
}

function validateMaterialItems(
  items: MaterialLineItem[],
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  for (const item of items) {
    if (item.unitRate < ZERO_RATE_THRESHOLD && item.amount < ZERO_RATE_THRESHOLD) {
      errors.push({
        field: `material.${item.id}`,
        message: `Material "${item.description}" has $0.00 rate and amount`,
        severity: "error",
        suggestion: "Materials must have either a unit rate or a total amount from an invoice",
      });
    }

    const calculatedAmount = item.quantity * item.unitRate;
    if (item.unitRate > 0 && Math.abs(item.amount - calculatedAmount) > 0.01) {
      warnings.push({
        field: `material.${item.id}.amount`,
        message: `Material amount mismatch: ${item.amount} vs calculated ${calculatedAmount.toFixed(2)}`,
        severity: "warning",
      });
    }
  }
}

function validateGeneralItems(
  items: LineItem[],
  category: string,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  for (const item of items) {
    if (item.unitRate < ZERO_RATE_THRESHOLD && item.amount < ZERO_RATE_THRESHOLD) {
      errors.push({
        field: `${category}.${item.id}`,
        message: `${category} item "${item.description}" has $0.00`,
        severity: "error",
      });
    }
  }
}

function validateSubcontractorItems(
  items: any[],
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  for (const item of items) {
    if (item.amount < ZERO_RATE_THRESHOLD) {
      errors.push({
        field: `subcontractor.${item.id}`,
        message: `Subcontractor "${item.subcontractorName}" has $0.00 amount`,
        severity: "error",
        suggestion: "Subcontractor amounts should come from their submitted invoice or quote",
      });
    }

    if (!item.scope || item.scope.trim() === "") {
      warnings.push({
        field: `subcontractor.${item.id}.scope`,
        message: `Subcontractor "${item.subcontractorName}" is missing scope of work`,
        severity: "warning",
      });
    }
  }
}

function validateMarkupApplication(
  draft: DraftState,
  markups: ProjectMarkups,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  const expectedMarkup = 
    (draft.totals.labor * markups.labor / 100) +
    (draft.totals.materials * markups.materials / 100) +
    (draft.totals.equipment * markups.equipmentOwned / 100) +
    (draft.totals.disposal * markups.disposal / 100) +
    (draft.totals.import * markups.import / 100) +
    (draft.totals.subcontractors * markups.subcontractors / 100);

  if (draft.totals.subtotal > 0 && Math.abs(draft.totals.markup - expectedMarkup) > 1) {
    warnings.push({
      field: "totals.markup",
      message: `Markup calculation mismatch: ${draft.totals.markup.toFixed(2)} vs expected ${expectedMarkup.toFixed(2)}`,
      severity: "warning",
      suggestion: "Use calculate_totals to recalculate with project-specific markups",
    });
  }
}

function validateTotalsConsistency(
  draft: DraftState,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  const laborSum = draft.lineItems.labor.reduce((s, i) => s + i.amount, 0);
  const materialsSum = draft.lineItems.materials.reduce((s, i) => s + i.amount, 0);
  const equipmentSum = draft.lineItems.equipment.reduce((s, i) => s + i.amount, 0);
  const disposalSum = draft.lineItems.disposal.reduce((s, i) => s + i.amount, 0);
  const importSum = draft.lineItems.import.reduce((s, i) => s + i.amount, 0);
  const subcontractorsSum = draft.lineItems.subcontractors.reduce((s, i) => s + i.amount, 0);

  if (Math.abs(laborSum - draft.totals.labor) > 0.01) {
    warnings.push({
      field: "totals.labor",
      message: `Labor total mismatch: stored ${draft.totals.labor} vs sum ${laborSum.toFixed(2)}`,
      severity: "warning",
    });
  }

  if (Math.abs(materialsSum - draft.totals.materials) > 0.01) {
    warnings.push({
      field: "totals.materials",
      message: `Materials total mismatch: stored ${draft.totals.materials} vs sum ${materialsSum.toFixed(2)}`,
      severity: "warning",
    });
  }

  const calculatedSubtotal = laborSum + materialsSum + equipmentSum + 
                             disposalSum + importSum + subcontractorsSum;
  
  if (Math.abs(calculatedSubtotal - draft.totals.subtotal) > 0.01) {
    warnings.push({
      field: "totals.subtotal",
      message: `Subtotal mismatch: stored ${draft.totals.subtotal} vs calculated ${calculatedSubtotal.toFixed(2)}`,
      severity: "warning",
    });
  }

  const calculatedTotal = draft.totals.subtotal + draft.totals.markup;
  if (Math.abs(calculatedTotal - draft.totals.total) > 0.01) {
    warnings.push({
      field: "totals.total",
      message: `Total mismatch: stored ${draft.totals.total} vs calculated ${calculatedTotal.toFixed(2)}`,
      severity: "warning",
    });
  }
}

function buildRetryPrompt(errors: ValidationError[]): string {
  const errorMessages = errors.map(e => 
    `- ${e.message}${e.suggestion ? `. FIX: ${e.suggestion}` : ""}`
  ).join("\n");

  return `
VALIDATION FAILED - You must fix these errors before proceeding:

${errorMessages}

IMPORTANT RULES:
1. NEVER guess or make up rates. Always use search_rate_table to find valid rates.
2. All amounts must be calculated correctly: amount = quantity × rate
3. Labor items must have valid classification and hourly rate.
4. Every line item must have a non-zero amount.

Please fix these issues and try again.
`;
}

export async function runWithValidation<T>(
  operation: () => Promise<{ draftState: DraftState; response: T }>,
  projectMarkups?: ProjectMarkups,
  maxRetries: number = MAX_RETRY_ATTEMPTS
): Promise<{ result: T; validation: ValidationResult; retryCount: number }> {
  let retryCount = 0;
  let lastValidation: ValidationResult | null = null;

  while (retryCount <= maxRetries) {
    const { draftState, response } = await operation();
    
    const validation = validateConstructionLogic(draftState, projectMarkups);
    lastValidation = validation;

    if (validation.isValid || !validation.shouldRetry) {
      return { result: response, validation, retryCount };
    }

    retryCount++;
    
    if (retryCount > maxRetries) {
      break;
    }

    console.warn(`Validation failed (attempt ${retryCount}/${maxRetries}):`, 
      validation.errors.map(e => e.message));
  }

  throw new Error(
    `Validation failed after ${maxRetries} retries: ${
      lastValidation?.errors.map(e => e.message).join("; ") ?? "Unknown error"
    }`
  );
}

export function formatValidationForUser(validation: ValidationResult): string {
  const parts: string[] = [];

  if (validation.warnings.length > 0) {
    parts.push("⚠️ **Warnings:**");
    for (const warning of validation.warnings) {
      parts.push(`- ${warning.message}`);
    }
  }

  if (validation.errors.length > 0) {
    parts.push("\n❌ **Errors that need attention:**");
    for (const error of validation.errors) {
      parts.push(`- ${error.message}`);
    }
  }

  return parts.join("\n");
}
