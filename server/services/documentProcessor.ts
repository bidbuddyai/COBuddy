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
import { extractTextFromDocument } from './azureVision';
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
    
    progressCallback?.(20, 'Processing document with Azure Computer Vision...');
    
    // Extract text using Azure Computer Vision
    let documentText: string;
    let ocrConfidence: number = 0.8; // Default confidence
    
    try {
      const ocrResult = await extractTextFromDocument(filePath, document.mimeType);
      documentText = ocrResult.text;
      ocrConfidence = ocrResult.confidence;
      
      progressCallback?.(35, `Text extracted successfully (${Math.round(ocrConfidence * 100)}% confidence)...`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Check if it's an Azure credentials issue
      if (errorMessage.includes('401') || errorMessage.includes('invalid subscription key')) {
        progressCallback?.(25, 'Azure Computer Vision not configured. Using basic text extraction...');
        
        // Fallback: For now, we'll create a basic message
        documentText = `[Document requires Azure Computer Vision for processing]
        
Please ensure your Azure Computer Vision credentials are correctly configured:
1. Check that AZURE_COMPUTER_VISION_KEY is correct
2. Verify AZURE_COMPUTER_VISION_ENDPOINT matches your resource region
3. Ensure your Azure subscription is active

Document: ${document.originalName}
Type: ${document.type}
Uploaded: ${new Date(document.uploadedAt).toLocaleString()}`;
        
        // Continue processing with limited data
      } else {
        progressCallback?.(0, `Failed to extract text: ${errorMessage}`);
        throw error;
      }
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
