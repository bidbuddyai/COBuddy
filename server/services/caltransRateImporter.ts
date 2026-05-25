import { parse } from 'csv-parse/sync';
import { storage } from '../storage.js';
import { InsertRateTable } from '@shared/schema';

interface CaltransRate {
  Class: string;
  Make: string;
  Model: string;
  Expire_Date: string;
  Rental_Rate: string;
  Rw_Delay: string;
  Overtime: string;
  Class_Desc: string;
  Make_Desc: string;
  Model_Desc: string;
}

export async function importCaltransRates(csvData: string, effectiveDate: Date) {
  try {
    // Parse CSV data
    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    }) as CaltransRate[];

    // Group rates by equipment class
    const ratesByClass = new Map<string, CaltransRate[]>();
    
    records.forEach(record => {
      const classDesc = record.Class_Desc;
      if (!ratesByClass.has(classDesc)) {
        ratesByClass.set(classDesc, []);
      }
      ratesByClass.get(classDesc)!.push(record);
    });

    // Create rate tables for each equipment class
    const rateTables: any[] = [];
    
    ratesByClass.forEach((classRates, className) => {
      const rateData = classRates.map((rate: CaltransRate) => ({
        code: `${rate.Class}-${rate.Model}`,
        description: `${rate.Make_Desc} ${rate.Model_Desc}`.trim(),
        rate: parseFloat(rate.Rental_Rate),
        unit: 'HR',
        category: rate.Class,
        rwDelay: parseFloat(rate.Rw_Delay),
        overtime: parseFloat(rate.Overtime),
        expireDate: rate.Expire_Date
      }));

      rateTables.push({
        name: `Caltrans 2025-2026 - ${className}`,
        type: 'equipment',
        effectiveDate,
        region: 'California',
        data: { entries: rateData },
        sourceFile: 'Caltrans_2025_2026.csv',
        companyId: null, // null indicates public/shared rate table
        isApproved: true,
        reviewedBy: null,
        reviewedAt: new Date()
      });
    });

    // Insert all rate tables
    const insertedTables = [];
    for (const rateTable of rateTables) {
      const inserted = await storage.createRateTable(rateTable);
      insertedTables.push(inserted);
    }

    return {
      success: true,
      tablesCreated: insertedTables.length,
      totalRates: records.length,
      message: `Successfully imported ${records.length} Caltrans rates into ${insertedTables.length} rate tables`
    };
  } catch (error) {
    console.error('Error importing Caltrans rates:', error);
    throw new Error(`Failed to import Caltrans rates: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function getCaltransRates() {
  // Get all Caltrans rate tables (companyId = null)
  const rateTables = await storage.getRateTables();
  return rateTables.filter(table => 
    table.companyId === null && 
    table.name.includes('Caltrans')
  );
}