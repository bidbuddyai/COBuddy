import { DocumentAnalysisClient, AzureKeyCredential } from '@azure/ai-form-recognizer';
import fs from 'fs';
import path from 'path';

// Initialize Azure Document Intelligence client
const key = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;
const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;

if (!key || !endpoint) {
  console.error('Azure Document Intelligence credentials not configured');
}

const documentAnalysisClient = key && endpoint ? 
  new DocumentAnalysisClient(endpoint, new AzureKeyCredential(key)) : null;

export interface DocumentExtractionResult {
  text: string;
  confidence: number;
  pages: Array<{
    pageNumber: number;
    text: string;
    lines: Array<{
      text: string;
      confidence: number;
    }>;
    tables?: Array<{
      rowCount: number;
      columnCount: number;
      cells: Array<{
        rowIndex: number;
        columnIndex: number;
        content: string;
        confidence: number;
      }>;
    }>;
  }>;
  keyValuePairs?: Array<{
    key: string;
    value: string;
    confidence: number;
  }>;
}

export async function extractTextFromDocument(filePath: string, mimeType: string): Promise<DocumentExtractionResult> {
  if (!documentAnalysisClient) {
    throw new Error('Azure Document Intelligence is not configured. Please provide AZURE_DOCUMENT_INTELLIGENCE_KEY and AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT.');
  }

  try {
    console.log(`Processing document with Azure Document Intelligence: ${filePath}`);
    
    // Read file as stream
    const fileStream = fs.createReadStream(filePath);
    
    // Use prebuilt-document model for general document analysis
    // This model extracts text, tables, key-value pairs, and document structure
    const poller = await documentAnalysisClient.beginAnalyzeDocument(
      "prebuilt-document",
      fileStream,
      {
        contentType: mimeType || 'application/pdf'
      } as any
    );
    
    // Wait for the analysis to complete
    const result = await poller.pollUntilDone();
    
    if (!result.pages || result.pages.length === 0) {
      throw new Error('No pages found in document');
    }
    
    // Extract data from results
    const pages: DocumentExtractionResult['pages'] = [];
    let fullText = '';
    let totalConfidence = 0;
    let confidenceCount = 0;
    
    // Process each page
    for (const page of result.pages) {
      const pageLines: Array<{ text: string; confidence: number }> = [];
      let pageText = '';
      
      // Extract lines
      if (page.lines) {
        for (const line of page.lines) {
          const lineText = line.content || '';
          const lineConfidence = (line as any).confidence || 0.9;
          
          pageLines.push({
            text: lineText,
            confidence: lineConfidence
          });
          
          pageText += lineText + '\n';
          fullText += lineText + '\n';
          
          totalConfidence += lineConfidence;
          confidenceCount++;
        }
      }
      
      // Extract tables
      const tables: any[] = [];
      if (result.tables) {
        for (const table of result.tables) {
          // Check if table is on this page
          if (table.boundingRegions && table.boundingRegions[0]?.pageNumber === page.pageNumber) {
            tables.push({
              rowCount: table.rowCount,
              columnCount: table.columnCount,
              cells: table.cells.map((cell: any) => ({
                rowIndex: cell.rowIndex,
                columnIndex: cell.columnIndex,
                content: cell.content,
                confidence: cell.confidence || 0.9
              }))
            });
          }
        }
      }
      
      pages.push({
        pageNumber: page.pageNumber || 1,
        text: pageText.trim(),
        lines: pageLines,
        tables: tables.length > 0 ? tables : undefined
      });
    }
    
    // Extract key-value pairs
    const keyValuePairs: Array<{ key: string; value: string; confidence: number }> = [];
    if (result.keyValuePairs) {
      for (const kvp of result.keyValuePairs) {
        if (kvp.key && kvp.value) {
          keyValuePairs.push({
            key: kvp.key.content || '',
            value: kvp.value.content || '',
            confidence: kvp.confidence || 0.9
          });
          
          totalConfidence += kvp.confidence || 0.9;
          confidenceCount++;
        }
      }
    }
    
    const avgConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0.9;
    
    return {
      text: fullText.trim(),
      confidence: avgConfidence,
      pages,
      keyValuePairs: keyValuePairs.length > 0 ? keyValuePairs : undefined
    };
  } catch (error) {
    console.error('Azure Document Intelligence error:', error);
    throw new Error(`Failed to extract text from document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function extractInvoiceData(filePath: string): Promise<any> {
  if (!documentAnalysisClient) {
    throw new Error('Azure Document Intelligence is not configured');
  }

  try {
    const fileStream = fs.createReadStream(filePath);
    
    // Use prebuilt-invoice model for invoice-specific extraction
    const poller = await documentAnalysisClient.beginAnalyzeDocument(
      "prebuilt-invoice",
      fileStream
    );
    
    const result = await poller.pollUntilDone();
    
    if (!result.documents || result.documents.length === 0) {
      throw new Error('No invoice data found in document');
    }
    
    const invoice = result.documents[0] as any;
    return {
      invoiceNumber: invoice.fields?.InvoiceId?.value,
      date: invoice.fields?.InvoiceDate?.value,
      dueDate: invoice.fields?.DueDate?.value,
      vendorName: invoice.fields?.VendorName?.value,
      vendorAddress: invoice.fields?.VendorAddress?.value,
      customerName: invoice.fields?.CustomerName?.value,
      customerAddress: invoice.fields?.CustomerAddress?.value,
      subtotal: invoice.fields?.SubTotal?.value,
      tax: invoice.fields?.TotalTax?.value,
      total: invoice.fields?.InvoiceTotal?.value,
      items: (invoice.fields?.Items?.value || invoice.fields?.Items?.values)?.map((item: any) => ({
        description: item.fields?.Description?.value,
        quantity: item.fields?.Quantity?.value,
        unitPrice: item.fields?.UnitPrice?.value,
        amount: item.fields?.Amount?.value
      })),
      confidence: invoice.confidence || 0.9
    };
  } catch (error) {
    console.error('Invoice extraction error:', error);
    throw error;
  }
}

export async function extractReceiptData(filePath: string): Promise<any> {
  if (!documentAnalysisClient) {
    throw new Error('Azure Document Intelligence is not configured');
  }

  try {
    const fileStream = fs.createReadStream(filePath);
    
    // Use prebuilt-receipt model for receipt-specific extraction
    const poller = await documentAnalysisClient.beginAnalyzeDocument(
      "prebuilt-receipt",
      fileStream
    );
    
    const result = await poller.pollUntilDone();
    
    if (!result.documents || result.documents.length === 0) {
      throw new Error('No receipt data found in document');
    }
    
    const receipt = result.documents[0] as any;
    return {
      merchantName: receipt.fields?.MerchantName?.value,
      merchantAddress: receipt.fields?.MerchantAddress?.value,
      transactionDate: receipt.fields?.TransactionDate?.value,
      items: (receipt.fields?.Items?.value || receipt.fields?.Items?.values)?.map((item: any) => ({
        name: item.fields?.Name?.value,
        quantity: item.fields?.Quantity?.value,
        price: item.fields?.Price?.value,
        totalPrice: item.fields?.TotalPrice?.value
      })),
      subtotal: receipt.fields?.Subtotal?.value,
      tax: receipt.fields?.Tax?.value,
      total: receipt.fields?.Total?.value,
      confidence: receipt.confidence || 0.9
    };
  } catch (error) {
    console.error('Receipt extraction error:', error);
    throw error;
  }
}