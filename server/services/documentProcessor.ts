import { extractTextFromDocument, DocumentExtractionResult } from './azureDocumentIntelligence';
import { db } from '../db';
import { documents, rateItems } from '@shared/schema';
import { eq, and, or, sql, ilike } from 'drizzle-orm';
import {
  ProcessedDocument,
  ProcessedDocumentSchema,
  ExtractedLineItem,
} from '@shared/types';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const AUTO_MATCH_THRESHOLD = 90;
const REVIEW_THRESHOLD = 90;

interface RawExtractedItem {
  description: string;
  quantity: string | number;
  unit: string;
  rate?: string | number;
  category: "labor" | "equipment" | "material" | "disposal" | "subcontractor";
  classification?: string;
  date?: string;
  notes?: string;
}

interface RateMatch {
  rateId: number;
  rate: number;
  description: string;
  confidenceScore: number;
}

function normalizeQuantity(value: string | number): number {
  if (typeof value === 'number') return value;
  
  const cleaned = value
    .replace(/,/g, '')
    .replace(/\s/g, '')
    .replace(/[^\d.-]/g, '');
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : Math.round(parsed * 100) / 100;
}

function normalizeRate(value: string | number | undefined): number | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number') return value;
  
  const cleaned = value
    .replace(/[$,]/g, '')
    .replace(/\s/g, '')
    .replace(/[^\d.-]/g, '');
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : Math.round(parsed * 100) / 100;
}

function normalizeDescription(description: string): string {
  return description
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s-]/g, '');
}

function calculateTrigramSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  if (s1 === s2) return 100;
  if (s1.length < 3 || s2.length < 3) {
    return s1.includes(s2) || s2.includes(s1) ? 70 : 0;
  }
  
  const getTrigrams = (s: string): Set<string> => {
    const trigrams = new Set<string>();
    const padded = `  ${s}  `;
    for (let i = 0; i < padded.length - 2; i++) {
      trigrams.add(padded.slice(i, i + 3));
    }
    return trigrams;
  };
  
  const trigrams1 = getTrigrams(s1);
  const trigrams2 = getTrigrams(s2);
  
  let intersection = 0;
  trigrams1.forEach(t => {
    if (trigrams2.has(t)) intersection++;
  });
  
  const similarity = (2 * intersection) / (trigrams1.size + trigrams2.size);
  return Math.round(similarity * 100);
}

async function matchRateItem(
  description: string,
  category: "labor" | "equipment" | "material" | "disposal" | "subcontractor",
  companyId: number
): Promise<RateMatch | null> {
  const normalizedDesc = normalizeDescription(description);
  const searchPatterns = [
    `%${normalizedDesc}%`,
    ...normalizedDesc.split(' ').filter(w => w.length > 3).map(w => `%${w}%`)
  ];

  const typeMap: Record<string, string> = {
    labor: 'labor',
    equipment: 'equipment',
    material: 'material',
    disposal: 'disposal',
    subcontractor: 'material',
  };
  const dbType = typeMap[category] || 'material';

  try {
    const results = await db.execute(sql`
      SELECT 
        ri.id,
        ri.description,
        ri.classification,
        ri.rate,
        ri.searchable_text,
        GREATEST(
          COALESCE(similarity(LOWER(ri.description), ${normalizedDesc}), 0),
          COALESCE(similarity(LOWER(COALESCE(ri.classification, '')), ${normalizedDesc}), 0),
          COALESCE(similarity(LOWER(COALESCE(ri.searchable_text, '')), ${normalizedDesc}), 0)
        ) * 100 as confidence_score
      FROM rate_items ri
      WHERE 
        ri.type = ${dbType}
        AND ri.is_active = true
        AND (ri.company_id = ${companyId} OR ri.company_id IS NULL)
        AND (
          LOWER(ri.description) ILIKE ANY(${searchPatterns})
          OR LOWER(ri.classification) ILIKE ANY(${searchPatterns})
          OR LOWER(ri.searchable_text) ILIKE ANY(${searchPatterns})
          OR similarity(LOWER(ri.description), ${normalizedDesc}) > 0.2
        )
      ORDER BY confidence_score DESC
      LIMIT 1
    `);

    const rows = (results as any).rows || results;
    
    if (rows.length === 0) {
      const fallbackResults = await db
        .select()
        .from(rateItems)
        .where(
          and(
            eq(rateItems.type, dbType),
            eq(rateItems.isActive, true),
            or(
              eq(rateItems.companyId, companyId),
              sql`${rateItems.companyId} IS NULL`
            )
          )
        )
        .limit(10);

      let bestMatch: RateMatch | null = null;
      let bestScore = 0;

      for (const item of fallbackResults) {
        const score = Math.max(
          calculateTrigramSimilarity(normalizedDesc, item.description),
          item.classification ? calculateTrigramSimilarity(normalizedDesc, item.classification) : 0
        );
        
        if (score > bestScore && score > 30) {
          bestScore = score;
          bestMatch = {
            rateId: item.id,
            rate: parseFloat(item.rate),
            description: item.description,
            confidenceScore: score,
          };
        }
      }
      
      return bestMatch;
    }

    const row = rows[0];
    return {
      rateId: row.id,
      rate: parseFloat(row.rate),
      description: row.description,
      confidenceScore: Math.min(100, Math.round(parseFloat(row.confidence_score || '0'))),
    };
  } catch (error) {
    console.error(`[DocumentProcessor] Rate matching error for "${description}":`, error);
    return null;
  }
}

function categorizeLineItem(description: string, context?: { 
  isFromLaborTable?: boolean;
  isFromEquipmentTable?: boolean;
  isFromMaterialTable?: boolean;
}): "labor" | "equipment" | "material" | "disposal" | "subcontractor" {
  if (context?.isFromLaborTable) return 'labor';
  if (context?.isFromEquipmentTable) return 'equipment';
  if (context?.isFromMaterialTable) return 'material';
  
  const lower = description.toLowerCase();
  
  const laborKeywords = ['foreman', 'laborer', 'journeyman', 'apprentice', 'operator', 'crew', 'superintendent', 'worker', 'technician', 'helper', 'carpenter', 'electrician', 'plumber', 'welder'];
  const equipmentKeywords = ['excavator', 'loader', 'crane', 'truck', 'trailer', 'dozer', 'backhoe', 'compressor', 'generator', 'pump', 'grader', 'roller', 'skid steer', 'bobcat', 'forklift'];
  const disposalKeywords = ['disposal', 'dump', 'haul', 'waste', 'debris', 'landfill', 'recycling', 'hazardous', 'contaminated'];
  const subcontractorKeywords = ['subcontractor', 'sub ', 'contractor', 'vendor', 'supplier'];
  
  if (laborKeywords.some(k => lower.includes(k))) return 'labor';
  if (equipmentKeywords.some(k => lower.includes(k))) return 'equipment';
  if (disposalKeywords.some(k => lower.includes(k))) return 'disposal';
  if (subcontractorKeywords.some(k => lower.includes(k))) return 'subcontractor';
  
  return 'material';
}

function extractItemsFromTables(ocrResult: DocumentExtractionResult): RawExtractedItem[] {
  const items: RawExtractedItem[] = [];
  
  for (const page of ocrResult.pages) {
    if (!page.tables) continue;
    
    for (const table of page.tables) {
      const headers: string[] = [];
      const dataRows: Record<string, string>[] = [];
      
      for (const cell of table.cells) {
        if (cell.rowIndex === 0) {
          headers[cell.columnIndex] = cell.content.toLowerCase().trim();
        } else {
          if (!dataRows[cell.rowIndex - 1]) {
            dataRows[cell.rowIndex - 1] = {};
          }
          dataRows[cell.rowIndex - 1][headers[cell.columnIndex] || `col${cell.columnIndex}`] = cell.content;
        }
      }
      
      const isLaborTable = headers.some(h => 
        h.includes('classification') || h.includes('labor') || h.includes('crew') || h.includes('hours')
      );
      const isEquipmentTable = headers.some(h => 
        h.includes('equipment') || h.includes('machine') || h.includes('rental')
      );
      const isMaterialTable = headers.some(h => 
        h.includes('material') || h.includes('item') || h.includes('product')
      );
      
      for (const row of dataRows) {
        const descKey = Object.keys(row).find(k => 
          k.includes('description') || k.includes('item') || k.includes('name') || k.includes('type') || k.includes('classification')
        ) || Object.keys(row)[0];
        
        const qtyKey = Object.keys(row).find(k => 
          k.includes('quantity') || k.includes('qty') || k.includes('hours') || k.includes('amount')
        );
        
        const unitKey = Object.keys(row).find(k => 
          k.includes('unit') || k.includes('uom')
        );
        
        const rateKey = Object.keys(row).find(k => 
          k.includes('rate') || k.includes('price') || k.includes('cost') || k.includes('$/hr')
        );
        
        const description = row[descKey || ''];
        if (!description || description.trim().length < 2) continue;
        
        const category = categorizeLineItem(description, {
          isFromLaborTable: isLaborTable,
          isFromEquipmentTable: isEquipmentTable,
          isFromMaterialTable: isMaterialTable,
        });
        
        items.push({
          description: description.trim(),
          quantity: row[qtyKey || ''] || '1',
          unit: row[unitKey || ''] || (category === 'labor' ? 'hour' : 'each'),
          rate: rateKey ? row[rateKey] : undefined,
          category,
        });
      }
    }
  }
  
  return items;
}

function extractItemsFromText(text: string): RawExtractedItem[] {
  const items: RawExtractedItem[] = [];
  const lines = text.split('\n');
  
  const lineItemPattern = /^(.+?)\s+(\d+(?:,\d{3})*(?:\.\d+)?)\s*(hours?|hrs?|days?|each|ea|tons?|loads?|lf|sf|cy|sy|gal)?\s*(?:@\s*\$?([\d,.]+))?/i;
  
  for (const line of lines) {
    const match = line.match(lineItemPattern);
    if (match) {
      const [, description, quantity, unit, rate] = match;
      if (description && description.trim().length > 3) {
        items.push({
          description: description.trim(),
          quantity: quantity,
          unit: unit || 'each',
          rate: rate,
          category: categorizeLineItem(description),
        });
      }
    }
  }
  
  return items;
}

function extractMetadata(ocrResult: DocumentExtractionResult): ProcessedDocument['metadata'] {
  let vendor: string | null = null;
  let invoiceNumber: string | null = null;
  let invoiceDate: string | null = null;
  let projectReference: string | null = null;
  let totalFromDocument: number | null = null;
  
  if (ocrResult.keyValuePairs) {
    for (const kvp of ocrResult.keyValuePairs) {
      const key = kvp.key.toLowerCase();
      const value = kvp.value;
      
      if (key.includes('vendor') || key.includes('from') || key.includes('company')) {
        vendor = value;
      } else if (key.includes('invoice') && key.includes('no')) {
        invoiceNumber = value;
      } else if (key.includes('date')) {
        invoiceDate = value;
      } else if (key.includes('project') || key.includes('job')) {
        projectReference = value;
      } else if (key.includes('total') && !key.includes('sub')) {
        totalFromDocument = normalizeRate(value);
      }
    }
  }
  
  return {
    vendor,
    invoiceNumber,
    invoiceDate,
    projectReference,
    totalFromDocument,
  };
}

export async function processAndMatchDocument(
  documentId: number,
  companyId: number,
  progressCallback?: (progress: number, message: string) => void
): Promise<ProcessedDocument> {
  progressCallback?.(5, 'Starting document processing...');
  
  const [document] = await db.select().from(documents).where(eq(documents.id, documentId));
  
  if (!document) {
    throw new Error(`Document with ID ${documentId} not found`);
  }
  
  await db.update(documents)
    .set({ status: 'processing' })
    .where(eq(documents.id, documentId));
  
  progressCallback?.(10, 'Extracting text with Azure Document Intelligence...');
  
  const filePath = path.join(__dirname, '../uploads', document.filename);
  
  let ocrResult: DocumentExtractionResult;
  try {
    ocrResult = await extractTextFromDocument(filePath, document.mimeType);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown OCR error';
    throw new Error(`OCR extraction failed: ${errorMessage}`);
  }
  
  progressCallback?.(30, `OCR complete (${Math.round(ocrResult.confidence * 100)}% confidence). Extracting line items...`);
  
  let rawItems = extractItemsFromTables(ocrResult);
  
  if (rawItems.length === 0) {
    progressCallback?.(35, 'No tables found, extracting from text...');
    rawItems = extractItemsFromText(ocrResult.text);
  }
  
  progressCallback?.(40, `Found ${rawItems.length} line items. Normalizing data...`);
  
  const normalizedItems: Array<RawExtractedItem & { normalizedQty: number; normalizedRate: number | null }> = 
    rawItems.map(item => ({
      ...item,
      normalizedQty: normalizeQuantity(item.quantity),
      normalizedRate: normalizeRate(item.rate),
    }));
  
  progressCallback?.(50, 'Matching against rate tables...');
  
  const laborItems: ExtractedLineItem[] = [];
  const equipmentItems: ExtractedLineItem[] = [];
  const materialItems: ExtractedLineItem[] = [];
  const disposalItems: ExtractedLineItem[] = [];
  const subcontractorItems: ExtractedLineItem[] = [];
  
  let autoMatchedCount = 0;
  let reviewCount = 0;
  let itemIndex = 0;
  
  for (const item of normalizedItems) {
    itemIndex++;
    const progress = 50 + Math.floor((itemIndex / normalizedItems.length) * 35);
    progressCallback?.(progress, `Matching item ${itemIndex}/${normalizedItems.length}: ${item.description.substring(0, 30)}...`);
    
    const match = await matchRateItem(item.description, item.category, companyId);
    
    const isAutoMatched = match && match.confidenceScore >= AUTO_MATCH_THRESHOLD;
    const requiresReview = !match || match.confidenceScore < REVIEW_THRESHOLD;
    
    if (isAutoMatched) autoMatchedCount++;
    if (requiresReview) reviewCount++;
    
    const effectiveRate = isAutoMatched && match ? match.rate : (item.normalizedRate || 0);
    const amount = item.normalizedQty * effectiveRate;
    
    const extractedItem: ExtractedLineItem = {
      id: `item_${documentId}_${itemIndex}_${Date.now()}`,
      rawDescription: item.description,
      normalizedDescription: normalizeDescription(item.description),
      category: item.category,
      quantity: item.normalizedQty,
      unit: item.unit,
      extractedRate: item.normalizedRate,
      matchedRateId: isAutoMatched && match ? match.rateId : null,
      matchedRate: match?.rate || null,
      matchedDescription: match?.description || null,
      confidenceScore: match?.confidenceScore || 0,
      requiresReview,
      classification: item.classification || null,
      date: item.date || null,
      notes: requiresReview && !isAutoMatched ? 'Low confidence match - requires manual review' : null,
    };
    
    switch (item.category) {
      case 'labor':
        laborItems.push(extractedItem);
        break;
      case 'equipment':
        equipmentItems.push(extractedItem);
        break;
      case 'material':
        materialItems.push(extractedItem);
        break;
      case 'disposal':
        disposalItems.push(extractedItem);
        break;
      case 'subcontractor':
        subcontractorItems.push(extractedItem);
        break;
    }
  }
  
  progressCallback?.(90, 'Calculating totals...');
  
  const calculateSubtotal = (items: ExtractedLineItem[]): number => {
    return items.reduce((sum, item) => {
      const rate = item.matchedRateId ? (item.matchedRate || 0) : (item.extractedRate || 0);
      return sum + (item.quantity * rate);
    }, 0);
  };
  
  const laborSubtotal = calculateSubtotal(laborItems);
  const equipmentSubtotal = calculateSubtotal(equipmentItems);
  const materialSubtotal = calculateSubtotal(materialItems);
  const disposalSubtotal = calculateSubtotal(disposalItems);
  const subcontractorSubtotal = calculateSubtotal(subcontractorItems);
  const grandTotal = laborSubtotal + equipmentSubtotal + materialSubtotal + disposalSubtotal + subcontractorSubtotal;
  
  const metadata = extractMetadata(ocrResult);
  
  const errors: ProcessedDocument['errors'] = [];
  
  if (rawItems.length === 0) {
    errors.push({
      field: 'lineItems',
      message: 'No line items could be extracted from the document',
      severity: 'warning',
    });
  }
  
  if (reviewCount > normalizedItems.length * 0.5) {
    errors.push({
      field: 'matching',
      message: `${reviewCount} of ${normalizedItems.length} items require manual review due to low confidence matches`,
      severity: 'warning',
    });
  }
  
  if (metadata.totalFromDocument && Math.abs(metadata.totalFromDocument - grandTotal) > grandTotal * 0.1) {
    errors.push({
      field: 'totals',
      message: `Document total ($${metadata.totalFromDocument.toFixed(2)}) differs from calculated total ($${grandTotal.toFixed(2)}) by more than 10%`,
      severity: 'warning',
    });
  }
  
  const processedDocument: ProcessedDocument = {
    documentId,
    filename: document.originalName,
    documentType: document.type as ProcessedDocument['documentType'],
    processedAt: new Date().toISOString(),
    ocrConfidence: ocrResult.confidence,
    metadata,
    laborItems,
    equipmentItems,
    materialItems,
    disposalItems,
    subcontractorItems,
    summary: {
      totalItems: normalizedItems.length,
      autoMatchedItems: autoMatchedCount,
      itemsRequiringReview: reviewCount,
      laborSubtotal,
      equipmentSubtotal,
      materialSubtotal,
      disposalSubtotal,
      subcontractorSubtotal,
      grandTotal,
    },
    errors,
  };
  
  const validated = ProcessedDocumentSchema.safeParse(processedDocument);
  if (!validated.success) {
    console.error('[DocumentProcessor] Schema validation failed:', validated.error);
    throw new Error(`Output validation failed: ${validated.error.message}`);
  }
  
  progressCallback?.(95, 'Saving processed data...');
  
  await db.update(documents)
    .set({
      status: 'processed',
      extractedData: processedDocument,
      confidence: ocrResult.confidence.toString(),
      processedAt: new Date(),
    })
    .where(eq(documents.id, documentId));
  
  progressCallback?.(100, `Processing complete! ${autoMatchedCount} auto-matched, ${reviewCount} require review.`);
  
  return processedDocument;
}

export async function processDocument(documentId: number, progressCallback?: (progress: number, message: string) => void): Promise<void> {
  const [document] = await db.select().from(documents).where(eq(documents.id, documentId));
  
  if (!document) {
    throw new Error(`Document with ID ${documentId} not found`);
  }
  
  const companyId = 1;
  
  try {
    await processAndMatchDocument(documentId, companyId, progressCallback);
  } catch (error) {
    console.error('Document processing error:', error);
    
    await db.update(documents)
      .set({ 
        status: 'failed',
        extractedData: {
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          failedAt: new Date().toISOString()
        }
      })
      .where(eq(documents.id, documentId));
    
    throw error;
  }
}
