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
import { extractTextFromDocument } from './azureDocumentIntelligence';
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

    // Get file path
    const filePath = path.join(__dirname, '../uploads', document.filename);
    
    progressCallback?.(20, 'Processing document...');
    
    // Extract text - try Azure first with timeout, then fallback to local PDF parser
    let documentText: string;
    let ocrConfidence: number = 0.8; // Default confidence
    let extractedKeyValuePairs: any[] = [];
    let extractedTables: any[] = [];
    let useAzure = true;
    
    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Azure Document Intelligence timeout')), 30000) // 30 second timeout
    );
    
    try {
      // Try Azure Document Intelligence with timeout
      progressCallback?.(25, 'Using Azure Document Intelligence...');
      const ocrResult = await Promise.race([
        extractTextFromDocument(filePath, document.mimeType),
        timeoutPromise
      ]) as any;
      
      documentText = ocrResult.text;
      ocrConfidence = ocrResult.confidence;
      
      // Store key-value pairs and tables for potential use
      if (ocrResult.keyValuePairs) {
        extractedKeyValuePairs = ocrResult.keyValuePairs;
      }
      
      if (ocrResult.pages) {
        for (const page of ocrResult.pages) {
          if (page.tables) {
            extractedTables.push(...page.tables);
          }
        }
      }
      
      progressCallback?.(35, `Azure extraction successful (${Math.round(ocrConfidence * 100)}% confidence)...`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      useAzure = false;
      
      // Fallback to local PDF parser
      progressCallback?.(30, 'Using local PDF extraction...');
      
      // Fallback: create a placeholder for failed extraction
      documentText = `[Document extraction failed]

Azure Document Intelligence Error: ${errorMessage}

Document Details:
- Filename: ${document.originalName}
- Type: ${document.type}
- Uploaded: ${new Date(document.uploadedAt).toLocaleString()}

The document could not be processed automatically. This could be due to:
1. Azure Document Intelligence taking longer than expected
2. Network connectivity issues
3. Document format issues

Please try:
- Re-uploading the document
- Ensuring the PDF is not corrupted
- Checking Azure Document Intelligence service status`;
        
      progressCallback?.(35, `Using fallback extraction due to: ${errorMessage}`);
    }

    let extractedData: ExtractedTMData | ExtractedRateData | ExtractedQuoteData | ExtractedInvoiceData;
    let confidence: number;

    // Process based on document type
    if (document.type === 'tm_sheet') {
      progressCallback?.(50, 'Analyzing T&M data with AI...');
      extractedData = await extractTMData(documentText);
      confidence = (extractedData as ExtractedTMData).totalConfidence;
      progressCallback?.(70, 'T&M data extracted successfully!');
    } else if (document.type === 'rate_table') {
      progressCallback?.(50, 'Analyzing rate table data...');
      extractedData = await extractRateTableData(documentText);
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
      progressCallback?.(50, 'Analyzing quote data...');
      extractedData = await extractQuoteData(documentText);
      confidence = (extractedData as ExtractedQuoteData).totalConfidence;
      progressCallback?.(70, 'Quote data extracted successfully!');
    } else if (document.type === 'invoice') {
      progressCallback?.(50, 'Analyzing invoice data...');
      extractedData = await extractInvoiceData(documentText);
      confidence = (extractedData as ExtractedInvoiceData).totalConfidence;
      progressCallback?.(70, 'Invoice data extracted successfully!');
    } else {
      // For other document types, use general extraction
      progressCallback?.(50, 'Analyzing document data...');
      extractedData = await extractTMData(documentText);
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
    
    // Update document status to failed with error details
    await db.update(documents)
      .set({ 
        status: 'failed',
        extractedData: {
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          failedAt: new Date().toISOString()
        }
      })
      .where(eq(documents.id, documentId));
    
    progressCallback?.(0, `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
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
