import { importCaltransRates } from '../services/caltransRateImporter.ts';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function loadCaltransRates() {
  try {
    console.log('Loading Caltrans 2025-2026 rates...');
    
    // Read the CSV file
    const csvPath = path.join(__dirname, '../../attached_assets/2025_2026_1752368710802.csv');
    const csvData = fs.readFileSync(csvPath, 'utf-8');
    
    console.log('CSV file loaded, importing rates...');
    
    // Import the rates
    const result = await importCaltransRates(csvData, new Date('2025-04-01'));
    
    console.log('Import complete!');
    console.log(`- Tables created: ${result.tablesCreated}`);
    console.log(`- Total rates imported: ${result.totalRates}`);
    console.log(`- Message: ${result.message}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error importing Caltrans rates:', error);
    process.exit(1);
  }
}

loadCaltransRates();