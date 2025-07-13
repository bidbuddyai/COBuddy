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

export async function processDocument(documentId: number, progressCallback?: (progress: number, message: string) => void): Promise<void> {
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
    
    progressCallback?.(10, 'Document found, starting processing...');

    // Read file and convert to base64
    const filePath = path.join(__dirname, '../uploads', document.filename);
    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = fileBuffer.toString('base64');
    
    progressCallback?.(25, 'File loaded, analyzing content...');

    let extractedData: ExtractedTMData | ExtractedRateData | ExtractedQuoteData | ExtractedInvoiceData;
    let confidence: number;

    // Process based on document type
    if (document.type === 'tm_sheet') {
      progressCallback?.(40, 'Extracting T&M data using AI vision...');
      extractedData = await extractTMData(base64Data);
      confidence = (extractedData as ExtractedTMData).totalConfidence;
      progressCallback?.(70, 'T&M data extracted successfully!');
    } else if (document.type === 'rate_table') {
      progressCallback?.(40, 'Extracting rate table data...');
      extractedData = await extractRateTableData(base64Data);
      confidence = (extractedData as ExtractedRateData).metadata.confidence;
      
      progressCallback?.(60, 'Storing rate table entries...');
      // Store rate table data separately
      await db.insert(rateTables).values({
        name: document.originalName,
        type: (extractedData as ExtractedRateData).type,
        effectiveDate: new Date(),
        data: extractedData,
        sourceFile: document.filename,
        isApproved: false,
      });
      progressCallback?.(70, 'Rate table stored successfully!');
    } else if (document.type === 'quote') {
      progressCallback?.(40, 'Extracting quote data...');
      extractedData = await extractQuoteData(base64Data);
      confidence = (extractedData as ExtractedQuoteData).totalConfidence;
      progressCallback?.(70, 'Quote data extracted successfully!');
    } else if (document.type === 'invoice') {
      progressCallback?.(40, 'Extracting invoice data...');
      extractedData = await extractInvoiceData(base64Data);
      confidence = (extractedData as ExtractedInvoiceData).totalConfidence;
      progressCallback?.(70, 'Invoice data extracted successfully!');
    } else {
      // For other document types, use general extraction
      progressCallback?.(40, 'Extracting document data...');
      extractedData = await extractTMData(base64Data);
      confidence = (extractedData as ExtractedTMData).totalConfidence;
      progressCallback?.(70, 'Data extracted successfully!');
    }

    progressCallback?.(85, 'Saving extracted data...');
    
    // Update document with extracted data
    await db.update(documents)
      .set({
        status: 'processed',
        extractedData: extractedData,
        confidence: confidence.toString(),
        processedAt: new Date(),
      })
      .where(eq(documents.id, documentId));
      
    progressCallback?.(100, 'Processing completed successfully!');

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
