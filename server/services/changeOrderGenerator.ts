import { db } from '../db';
import { rateTables, changeOrders } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { ExtractedTMData } from './openai';

export interface ChangeOrderData {
  projectName: string;
  projectNumber: string;
  clientContact: string;
  clientCompany: string;
  clientEmail: string;
  reiPM: string;
  reiPMEmail: string;
  changeOrderNumber: string;
  description: string;
  laborEntries: Array<{
    description: string;
    rate: number;
    amount: number;
  }>;
  materialEntries: Array<{
    description: string;
    unit: string;
    qty: number;
    rate: number;
    amount: number;
  }>;
  equipmentOwnedEntries: Array<{
    description: string;
    unit: string;
    qty: number;
    rate: number;
    amount: number;
  }>;
  equipmentRentedEntries: Array<{
    description: string;
    unit: string;
    qty: number;
    rate: number;
    amount: number;
  }>;
  disposalEntries: Array<{
    description: string;
    unit: string;
    qty: number;
    rate: number;
    amount: number;
  }>;
  importEntries: Array<{
    description: string;
    unit: string;
    qty: number;
    rate: number;
    amount: number;
  }>;
  subcontractorEntries: Array<{
    description: string;
    unit: string;
    qty: number;
    rate: number;
    amount: number;
  }>;
  markups: {
    labor: number;
    materials: number;
    equipmentOwned: number;
    equipmentRented: number;
    disposal: number;
    import: number;
    subcontractors: number;
  };
  subtotal: number;
  grandTotal: number;
  previousChangeOrders: number;
  originalContract: number;
  revisedContract: number;
}

export async function generateChangeOrderFromTMData(tmData: ExtractedTMData, projectInfo: any): Promise<ChangeOrderData> {
  try {
    // Get all approved rates
    const approvedRates = await db.select().from(rateTables).where(eq(rateTables.isApproved, true));
    
    // Build rate lookup maps
    const rateMap = new Map<string, number>();
    approvedRates.forEach(rateTable => {
      if (Array.isArray(rateTable.data)) {
        rateTable.data.forEach((rate: any) => {
          rateMap.set(rate.description.toLowerCase(), rate.rate);
        });
      }
    });
    
    // Process labor entries
    const laborEntries = tmData.laborEntries.map(entry => {
      const rate = entry.rate || findRateMatch(entry.role, rateMap) || 45.00; // Default to base laborer rate
      return {
        description: `${entry.name} - ${entry.role}`,
        rate: rate,
        amount: rate * entry.hours
      };
    });
    
    // Process material entries
    const materialEntries = tmData.materialEntries.map(entry => {
      const rate = entry.rate || findRateMatch(entry.description, rateMap) || 0;
      return {
        description: entry.description,
        unit: entry.unit,
        qty: entry.quantity,
        rate: rate,
        amount: rate * entry.quantity
      };
    });
    
    // Process equipment entries (split owned vs rented based on type)
    const equipmentOwnedEntries: any[] = [];
    const equipmentRentedEntries: any[] = [];
    
    tmData.equipmentEntries.forEach(entry => {
      const rate = entry.rate || findRateMatch(entry.description, rateMap) || 0;
      const equipmentEntry = {
        description: entry.description,
        unit: 'hour',
        qty: entry.hours,
        rate: rate,
        amount: rate * entry.hours
      };
      
      // Simple heuristic: larger equipment is typically rented
      if (rate > 500 || entry.description.toLowerCase().includes('excavator') || 
          entry.description.toLowerCase().includes('loader') || 
          entry.description.toLowerCase().includes('generator')) {
        equipmentRentedEntries.push(equipmentEntry);
      } else {
        equipmentOwnedEntries.push(equipmentEntry);
      }
    });
    
    // Calculate subtotal
    const laborTotal = laborEntries.reduce((sum, entry) => sum + entry.amount, 0);
    const materialTotal = materialEntries.reduce((sum, entry) => sum + entry.amount, 0);
    const equipmentOwnedTotal = equipmentOwnedEntries.reduce((sum, entry) => sum + entry.amount, 0);
    const equipmentRentedTotal = equipmentRentedEntries.reduce((sum, entry) => sum + entry.amount, 0);
    
    const subtotal = laborTotal + materialTotal + equipmentOwnedTotal + equipmentRentedTotal;
    
    // Apply standard markups
    const markups = {
      labor: 0.15, // 15%
      materials: 0.10, // 10%
      equipmentOwned: 0.12, // 12%
      equipmentRented: 0.08, // 8%
      disposal: 0.10, // 10%
      import: 0.10, // 10%
      subcontractors: 0.05 // 5%
    };
    
    const markupTotal = (laborTotal * markups.labor) + 
                      (materialTotal * markups.materials) + 
                      (equipmentOwnedTotal * markups.equipmentOwned) + 
                      (equipmentRentedTotal * markups.equipmentRented);
    
    const grandTotal = subtotal + markupTotal;
    
    return {
      projectName: projectInfo.projectName || tmData.projectInfo.name || 'INSERT PROJECT NAME',
      projectNumber: projectInfo.projectNumber || 'INSERT REI PROJECT #',
      clientContact: projectInfo.clientContact || 'INSERT CLIENT CONTACT',
      clientCompany: projectInfo.clientCompany || 'INSERT CLIENT/AGENCY',
      clientEmail: projectInfo.clientEmail || 'INSERT CLIENT EMAIL',
      reiPM: projectInfo.reiPM || 'INSERT REI PM NAME',
      reiPMEmail: projectInfo.reiPMEmail || 'INSERT REI PM EMAIL',
      changeOrderNumber: projectInfo.changeOrderNumber || '#',
      description: projectInfo.description || 'INSERT CHANGE ORDER REQUEST NAME HERE AND DESCRIPTION/EXPLANATION BELOW',
      laborEntries,
      materialEntries,
      equipmentOwnedEntries,
      equipmentRentedEntries,
      disposalEntries: [],
      importEntries: [],
      subcontractorEntries: [],
      markups,
      subtotal,
      grandTotal,
      previousChangeOrders: projectInfo.previousChangeOrders || 0,
      originalContract: projectInfo.originalContract || 0,
      revisedContract: (projectInfo.originalContract || 0) + grandTotal
    };
  } catch (error) {
    console.error('Change order generation error:', error);
    throw error;
  }
}

function findRateMatch(searchTerm: string, rateMap: Map<string, number>): number | null {
  const term = searchTerm.toLowerCase();
  
  // Exact match
  if (rateMap.has(term)) {
    return rateMap.get(term)!;
  }
  
  // Partial match
  for (const [key, rate] of rateMap.entries()) {
    if (key.includes(term) || term.includes(key)) {
      return rate;
    }
  }
  
  return null;
}