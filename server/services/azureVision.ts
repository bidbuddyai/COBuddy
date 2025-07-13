import { ComputerVisionClient } from '@azure/cognitiveservices-computervision';
import { ApiKeyCredentials } from '@azure/ms-rest-js';
import fs from 'fs';
import path from 'path';

// Initialize Azure Computer Vision client
const key = process.env.AZURE_COMPUTER_VISION_KEY;
const endpoint = process.env.AZURE_COMPUTER_VISION_ENDPOINT;

if (!key || !endpoint) {
  console.error('Azure Computer Vision credentials not configured');
}

const computerVisionClient = key && endpoint ? 
  new ComputerVisionClient(
    new ApiKeyCredentials({ inHeader: { 'Ocp-Apim-Subscription-Key': key } }),
    endpoint
  ) : null;

export interface OCRResult {
  text: string;
  confidence: number;
  pages: Array<{
    pageNumber: number;
    text: string;
    lines: Array<{
      text: string;
      boundingBox: number[];
    }>;
  }>;
}

export async function extractTextFromDocument(filePath: string, mimeType: string): Promise<OCRResult> {
  if (!computerVisionClient) {
    throw new Error('Azure Computer Vision is not configured. Please provide AZURE_COMPUTER_VISION_KEY and AZURE_COMPUTER_VISION_ENDPOINT.');
  }

  try {
    console.log(`Processing document with Azure Computer Vision: ${filePath}`);
    
    // Read file as buffer first
    const fileBuffer = fs.readFileSync(filePath);
    
    // Use Read API for documents (supports PDFs, images, etc.)
    const operation = await computerVisionClient.readInStream(() => fs.createReadStream(filePath));
    const operationId = operation.operationLocation.split('/').pop()!;
    
    // Wait for the operation to complete
    let result;
    let status = 'running';
    
    while (status === 'running' || status === 'notStarted') {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      result = await computerVisionClient.getReadResult(operationId);
      status = result.status;
    }
    
    if (status !== 'succeeded') {
      throw new Error(`Azure Computer Vision processing failed with status: ${status}`);
    }
    
    // Extract text from results
    const pages: OCRResult['pages'] = [];
    let fullText = '';
    let totalConfidence = 0;
    let lineCount = 0;
    
    for (const page of result.analyzeResult!.readResults) {
      const pageLines: Array<{ text: string; boundingBox: number[] }> = [];
      let pageText = '';
      
      for (const line of page.lines) {
        pageLines.push({
          text: line.text,
          boundingBox: line.boundingBox
        });
        pageText += line.text + '\n';
        fullText += line.text + '\n';
        
        // Calculate average confidence
        if (line.appearance?.style?.confidence) {
          totalConfidence += line.appearance.style.confidence;
          lineCount++;
        }
      }
      
      pages.push({
        pageNumber: page.page,
        text: pageText,
        lines: pageLines
      });
    }
    
    const avgConfidence = lineCount > 0 ? totalConfidence / lineCount : 0.9;
    
    return {
      text: fullText.trim(),
      confidence: avgConfidence,
      pages
    };
  } catch (error) {
    console.error('Azure Computer Vision error:', error);
    throw new Error(`Failed to extract text from document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function extractTablesFromDocument(filePath: string): Promise<any[]> {
  if (!computerVisionClient) {
    throw new Error('Azure Computer Vision is not configured');
  }

  try {
    // For advanced table extraction, we can use Form Recognizer
    // For now, we'll return structured data from the OCR result
    const ocrResult = await extractTextFromDocument(filePath, 'application/pdf');
    
    // Basic table detection from text
    const tables: any[] = [];
    const lines = ocrResult.text.split('\n');
    
    // Simple heuristic: look for lines with consistent delimiter patterns
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Check if line contains table-like delimiters
      if (line.includes('\t') || line.split(/\s{2,}/).length > 2) {
        // Potential table row
        const cells = line.split(/\t|\s{2,}/);
        if (cells.length > 1) {
          tables.push({
            row: i,
            cells: cells.map(c => c.trim()).filter(c => c.length > 0)
          });
        }
      }
    }
    
    return tables;
  } catch (error) {
    console.error('Table extraction error:', error);
    return [];
  }
}