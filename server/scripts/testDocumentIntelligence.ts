import { extractTextFromDocument } from '../services/azureDocumentIntelligence';
import { db } from '../db';
import { documents } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function testSingleDocument() {
  try {
    // Get one failed document
    const [doc] = await db.select()
      .from(documents)
      .where(eq(documents.status, 'failed'))
      .limit(1);
    
    if (!doc) {
      console.log('No failed documents to test');
      return;
    }
    
    console.log(`Testing document: ${doc.filename}`);
    console.log(`Type: ${doc.type}`);
    console.log(`Original name: ${doc.originalName}`);
    
    const filePath = `/home/runner/workspace/server/uploads/${doc.filename}`;
    
    console.log('\nStarting Azure Document Intelligence extraction...');
    const startTime = Date.now();
    
    try {
      const result = await extractTextFromDocument(filePath, doc.mimeType);
      const endTime = Date.now();
      
      console.log(`\n✓ Extraction completed in ${((endTime - startTime) / 1000).toFixed(2)} seconds`);
      console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      console.log(`Total pages: ${result.pages.length}`);
      console.log(`Text length: ${result.text.length} characters`);
      
      if (result.keyValuePairs && result.keyValuePairs.length > 0) {
        console.log(`\nKey-Value Pairs found: ${result.keyValuePairs.length}`);
        result.keyValuePairs.slice(0, 5).forEach(kvp => {
          console.log(`  - ${kvp.key}: ${kvp.value} (${(kvp.confidence * 100).toFixed(1)}%)`);
        });
      }
      
      if (result.pages[0]?.tables) {
        console.log(`\nTables found: ${result.pages[0].tables.length}`);
      }
      
      console.log('\nFirst 500 characters of extracted text:');
      console.log(result.text.substring(0, 500) + '...');
      
    } catch (error) {
      console.error('\n✗ Extraction failed:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
      }
    }
    
  } catch (error) {
    console.error('Script error:', error);
  }
}

// Run the test
testSingleDocument()
  .then(() => {
    console.log('\nTest complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });