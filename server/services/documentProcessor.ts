import { 
  extractTMData, 
  extractRateTableData, 
  extractQuoteData,
  extractInvoiceData,
  ExtractedTMData, 
  ExtractedRateData,
  ExtractedQuoteData,
  ExtractedInvoiceData
} from './openai';
import { db } from '../db';
import { documents, rateTables } from '@shared/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function processDocument(documentId: number): Promise<void> {
  try {
    // Get document from database
    const [document] = await db.select().from(documents).where(eq(documents.id, documentId));
    
    if (!document) {
      throw new Error(`Document with ID ${documentId} not found`);
    }

    // Update status to processing
    await db.update(documents)
      .set({ status: 'processing' })
      .where(eq(documents.id, documentId));

    // Read file and convert to base64
    const filePath = path.join(__dirname, '../uploads', document.filename);
    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = fileBuffer.toString('base64');

    let extractedData: ExtractedTMData | ExtractedRateData | ExtractedQuoteData | ExtractedInvoiceData;
    let confidence: number;

    // Process based on document type
    if (document.type === 'tm_sheet') {
      extractedData = await extractTMData(base64Data);
      confidence = (extractedData as ExtractedTMData).totalConfidence;
    } else if (document.type === 'rate_table') {
      extractedData = await extractRateTableData(base64Data);
      confidence = (extractedData as ExtractedRateData).metadata.confidence;
      
      // Store rate table data separately
      await db.insert(rateTables).values({
        name: document.originalName,
        type: (extractedData as ExtractedRateData).type,
        effectiveDate: new Date(),
        data: extractedData,
        sourceFile: document.filename,
        isApproved: false,
      });
    } else if (document.type === 'quote') {
      extractedData = await extractQuoteData(base64Data);
      confidence = (extractedData as ExtractedQuoteData).totalConfidence;
    } else if (document.type === 'invoice') {
      extractedData = await extractInvoiceData(base64Data);
      confidence = (extractedData as ExtractedInvoiceData).totalConfidence;
    } else {
      // For other document types, use general extraction
      extractedData = await extractTMData(base64Data);
      confidence = (extractedData as ExtractedTMData).totalConfidence;
    }

    // Update document with extracted data
    await db.update(documents)
      .set({
        status: 'processed',
        extractedData: extractedData,
        confidence: confidence.toString(),
        processedAt: new Date(),
      })
      .where(eq(documents.id, documentId));

  } catch (error) {
    console.error('Document processing error:', error);
    
    // Update document status to failed
    await db.update(documents)
      .set({ status: 'failed' })
      .where(eq(documents.id, documentId));
    
    throw error;
  }
}

export async function matchRatesToExtractedData(extractedData: ExtractedTMData): Promise<ExtractedTMData> {
  try {
    // Get all approved rate tables
    const rateTablesData = await db.select().from(rateTables).where(eq(rateTables.isApproved, true));
    
    // Match labor entries
    for (const laborEntry of extractedData.laborEntries) {
      const laborRates = rateTablesData.filter(rt => rt.type === 'labor');
      
      for (const rateTable of laborRates) {
        const rates = (rateTable.data as any).entries || [];
        const matchedRate = rates.find((rate: any) => 
          rate.description.toLowerCase().includes(laborEntry.role.toLowerCase()) ||
          laborEntry.role.toLowerCase().includes(rate.description.toLowerCase())
        );
        
        if (matchedRate) {
          laborEntry.rate = matchedRate.rate;
          break;
        }
      }
    }

    // Match equipment entries
    for (const equipmentEntry of extractedData.equipmentEntries) {
      const equipmentRates = rateTablesData.filter(rt => rt.type === 'equipment');
      
      for (const rateTable of equipmentRates) {
        const rates = (rateTable.data as any).entries || [];
        const matchedRate = rates.find((rate: any) => 
          rate.description.toLowerCase().includes(equipmentEntry.type.toLowerCase()) ||
          equipmentEntry.type.toLowerCase().includes(rate.description.toLowerCase())
        );
        
        if (matchedRate) {
          equipmentEntry.rate = matchedRate.rate;
          break;
        }
      }
    }

    // Match material entries
    for (const materialEntry of extractedData.materialEntries) {
      const materialRates = rateTablesData.filter(rt => rt.type === 'material');
      
      for (const rateTable of materialRates) {
        const rates = (rateTable.data as any).entries || [];
        const matchedRate = rates.find((rate: any) => 
          rate.description.toLowerCase().includes(materialEntry.type.toLowerCase()) ||
          materialEntry.type.toLowerCase().includes(rate.description.toLowerCase())
        );
        
        if (matchedRate) {
          materialEntry.rate = matchedRate.rate;
          break;
        }
      }
    }

    return extractedData;
  } catch (error) {
    console.error('Rate matching error:', error);
    return extractedData; // Return original data if matching fails
  }
}
