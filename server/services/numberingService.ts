import { storage } from "../storage";
import type { InsertChangeOrder, InsertSubcontractorChangeOrder } from "@shared/schema";

export interface NumberingOptions {
  projectId: number;
  sequenceType: 'GC_RFC' | 'GC_CO' | 'SCO' | 'SCO_PER_SUB';
  subcontractorId?: number;
  manualNumber?: string; // Allow manual override
}

export class NumberingService {
  /**
   * Get the next available number for a sequence
   */
  async getNextNumber(options: NumberingOptions): Promise<string> {
    const { projectId, sequenceType, subcontractorId, manualNumber } = options;
    
    // If manual number is provided, validate it's not a duplicate
    if (manualNumber) {
      const isValid = await this.validateUniqueNumber(projectId, sequenceType, manualNumber);
      if (!isValid) {
        throw new Error(`Number ${manualNumber} already exists for this project`);
      }
      
      // Update sequence to track this manual number
      await this.updateSequenceFromManual(projectId, sequenceType, manualNumber, subcontractorId);
      return manualNumber;
    }
    
    // Generate auto number
    return await storage.getNextNumber(projectId, sequenceType, subcontractorId);
  }
  
  /**
   * Validate that a number doesn't already exist
   */
  private async validateUniqueNumber(
    projectId: number,
    sequenceType: string,
    number: string
  ): Promise<boolean> {
    // Check in change orders or subcontractor change orders based on type
    const changeOrders = await storage.getChangeOrders({ projectId });
    
    if (sequenceType === 'GC_RFC') {
      return !changeOrders.data.some(co => co.gcRfcNumber === number);
    }
    
    if (sequenceType === 'GC_CO') {
      return !changeOrders.data.some(co => co.gcCoNumber === number);
    }
    
    if (sequenceType === 'SCO' || sequenceType === 'SCO_PER_SUB') {
      const scos = await storage.getSubcontractorChangeOrders({ projectId });
      return !scos.some(sco => sco.scoNumber === number);
    }
    
    return true;
  }
  
  /**
   * Update sequence tracker when manual number is used
   */
  private async updateSequenceFromManual(
    projectId: number,
    sequenceType: string,
    manualNumber: string,
    subcontractorId?: number
  ): Promise<void> {
    // Extract numeric portion
    const match = manualNumber.match(/(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      
      // Get current sequence value
      const currentNumber = await storage.getNextNumber(projectId, sequenceType, subcontractorId);
      const currentMatch = currentNumber.match(/(\d+)/);
      const currentNum = currentMatch ? parseInt(currentMatch[1], 10) : 0;
      
      // If manual number is higher, update the sequence
      if (num > currentNum) {
        await storage.updateNumberingSequence(projectId, sequenceType, num, subcontractorId);
      }
    }
  }
  
  /**
   * Initialize numbering from imported CO Log
   */
  async initializeFromImport(
    projectId: number,
    gcRfcNumbers?: string[],
    gcCoNumbers?: string[],
    scoNumbers?: string[]
  ): Promise<void> {
    if (gcRfcNumbers?.length) {
      await storage.initializeNumberingFromImport(projectId, 'GC_RFC', gcRfcNumbers);
    }
    
    if (gcCoNumbers?.length) {
      await storage.initializeNumberingFromImport(projectId, 'GC_CO', gcCoNumbers);
    }
    
    if (scoNumbers?.length) {
      await storage.initializeNumberingFromImport(projectId, 'SCO', scoNumbers);
    }
  }
  
  /**
   * Generate number for a new GC Change Order
   */
  async generateGcCoNumber(
    projectId: number,
    isRfc: boolean = false,
    manualNumber?: string
  ): Promise<{ rfcNumber?: string; coNumber?: string }> {
    if (isRfc) {
      const rfcNumber = await this.getNextNumber({
        projectId,
        sequenceType: 'GC_RFC',
        manualNumber
      });
      return { rfcNumber };
    } else {
      const coNumber = await this.getNextNumber({
        projectId,
        sequenceType: 'GC_CO',
        manualNumber
      });
      return { coNumber };
    }
  }
  
  /**
   * Generate number for a new Subcontractor Change Order
   */
  async generateScoNumber(
    projectId: number,
    subcontractorId: number,
    usePerSubNumbering: boolean = false,
    manualNumber?: string
  ): Promise<string> {
    return await this.getNextNumber({
      projectId,
      sequenceType: usePerSubNumbering ? 'SCO_PER_SUB' : 'SCO',
      subcontractorId: usePerSubNumbering ? subcontractorId : undefined,
      manualNumber
    });
  }
}

export const numberingService = new NumberingService();