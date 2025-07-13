import { db } from '../db';
import { documents } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { processDocument } from '../services/documentProcessor';

async function reprocessFailedDocuments() {
  try {
    // Get all failed documents
    const failedDocs = await db.select()
      .from(documents)
      .where(eq(documents.status, 'failed'));
    
    console.log(`Found ${failedDocs.length} failed documents to reprocess`);
    
    for (const doc of failedDocs) {
      console.log(`\nReprocessing document ${doc.id}: ${doc.filename}`);
      
      try {
        await processDocument(doc.id, (progress, message) => {
          console.log(`[${progress}%] ${message}`);
        });
        
        console.log(`✓ Successfully processed document ${doc.id}`);
      } catch (error) {
        console.error(`✗ Failed to process document ${doc.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error reprocessing documents:', error);
  }
}

// Run the script
reprocessFailedDocuments()
  .then(() => {
    console.log('\nReprocessing complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });