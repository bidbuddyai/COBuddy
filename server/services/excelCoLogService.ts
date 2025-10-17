import * as ExcelJS from 'exceljs';
import { storage } from '../storage';
import { numberingService } from './numberingService';
import type { 
  ChangeOrder, 
  SubcontractorChangeOrder, 
  Subcontractor,
  Project,
  InsertChangeOrder,
  InsertSubcontractorChangeOrder
} from '@shared/schema';

interface GcCoLogRow {
  projectId: number;
  gcRfcNumber?: string;
  gcCoNumber?: string;
  title: string;
  description?: string;
  status: string;
  dateSubmitted?: Date;
  amountSubmitted?: number;
  amountApproved?: number;
  dateApproved?: Date;
  ccoNumber?: string;
  pcoNumber?: string;
  fundingSource?: string;
  notes?: string;
}

interface SubCoLogRow {
  gcRfcNumber?: string;
  gcCoNumber?: string;
  subcontractorName: string;
  subRfcNumber?: string;
  scoNumber?: string;
  amountSubmitted?: number;
  dateSubmitted?: Date;
  amountApproved?: number;
  dateApproved?: Date;
  scoIssued?: boolean;
  scoType?: string;
  ccoNumber?: string;
  notes?: string;
}

export class ExcelCoLogService {
  /**
   * Export CO Log to Excel
   */
  async exportCoLog(projectId: number): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CO Buddy';
    workbook.lastModifiedBy = 'CO Buddy';
    workbook.created = new Date();
    workbook.modified = new Date();
    
    // Get project data
    const project = await storage.getProject(projectId);
    if (!project) throw new Error('Project not found');
    
    // Get all GC Change Orders for the project
    const changeOrders = await storage.getChangeOrders({ projectId });
    
    // Create GC CO Log sheet
    const gcSheet = workbook.addWorksheet('GC_CO_Log');
    this.setupGcCoLogSheet(gcSheet, changeOrders.data, project);
    
    // Create Sub CO Log sheet
    const subSheet = workbook.addWorksheet('Sub_CO_Log');
    await this.setupSubCoLogSheet(subSheet, changeOrders.data);
    
    // Apply styling
    this.applyWorkbookStyles(workbook);
    
    // Generate buffer
    return await workbook.xlsx.writeBuffer() as Buffer;
  }
  
  /**
   * Import CO Log from Excel
   */
  async importCoLog(
    projectId: number,
    fileBuffer: Buffer,
    userId: string
  ): Promise<{
    gcCosImported: number;
    subCosImported: number;
    errors: string[];
  }> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer);
    
    const errors: string[] = [];
    let gcCosImported = 0;
    let subCosImported = 0;
    
    // Process GC CO Log sheet
    const gcSheet = workbook.getWorksheet('GC_CO_Log') || workbook.getWorksheet(1);
    if (gcSheet) {
      const gcResult = await this.importGcCoLogSheet(gcSheet, projectId, userId);
      gcCosImported = gcResult.imported;
      errors.push(...gcResult.errors);
    }
    
    // Process Sub CO Log sheet
    const subSheet = workbook.getWorksheet('Sub_CO_Log') || workbook.getWorksheet(2);
    if (subSheet) {
      const subResult = await this.importSubCoLogSheet(subSheet, projectId, userId);
      subCosImported = subResult.imported;
      errors.push(...subResult.errors);
    }
    
    return {
      gcCosImported,
      subCosImported,
      errors
    };
  }
  
  /**
   * Setup GC CO Log sheet
   */
  private setupGcCoLogSheet(
    sheet: ExcelJS.Worksheet,
    changeOrders: ChangeOrder[],
    project: Project
  ): void {
    // Add header row
    sheet.columns = [
      { header: 'Project Number', key: 'projectNumber', width: 15 },
      { header: 'Project Name', key: 'projectName', width: 25 },
      { header: 'GC RFC#', key: 'gcRfcNumber', width: 12 },
      { header: 'GC CO#', key: 'gcCoNumber', width: 12 },
      { header: 'Title', key: 'title', width: 30 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Date Submitted', key: 'dateSubmitted', width: 15 },
      { header: 'Amount Submitted', key: 'amountSubmitted', width: 18, style: { numFmt: '$#,##0.00' } },
      { header: 'Amount Approved', key: 'amountApproved', width: 18, style: { numFmt: '$#,##0.00' } },
      { header: 'Date Approved', key: 'dateApproved', width: 15 },
      { header: 'CCO#', key: 'ccoNumber', width: 12 },
      { header: 'PCO#', key: 'pcoNumber', width: 12 },
      { header: 'Funding Source', key: 'fundingSource', width: 20 },
      { header: 'Sub Amount Submitted', key: 'subAmountSubmitted', width: 20, style: { numFmt: '$#,##0.00' } },
      { header: 'Sub Amount Approved', key: 'subAmountApproved', width: 20, style: { numFmt: '$#,##0.00' } },
      { header: 'Variance', key: 'variance', width: 18, style: { numFmt: '$#,##0.00' } },
      { header: 'Notes', key: 'notes', width: 40 },
    ];
    
    // Add data rows
    changeOrders.forEach(co => {
      const variance = (Number(co.amountSubmitted) || 0) - (Number(co.subAmountSubmitted) || 0);
      
      sheet.addRow({
        projectNumber: project.number,
        projectName: project.name,
        gcRfcNumber: co.gcRfcNumber,
        gcCoNumber: co.gcCoNumber,
        title: co.title,
        description: co.description,
        status: co.status,
        dateSubmitted: co.dateSubmitted,
        amountSubmitted: Number(co.amountSubmitted) || 0,
        amountApproved: Number(co.amountApproved) || 0,
        dateApproved: co.dateApproved,
        ccoNumber: co.ccoNumber,
        pcoNumber: co.pcoNumber,
        fundingSource: co.fundingSource,
        subAmountSubmitted: Number(co.subAmountSubmitted) || 0,
        subAmountApproved: Number(co.subAmountApproved) || 0,
        variance: variance,
        notes: co.notes,
      });
    });
  }
  
  /**
   * Setup Sub CO Log sheet
   */
  private async setupSubCoLogSheet(
    sheet: ExcelJS.Worksheet,
    changeOrders: ChangeOrder[]
  ): Promise<void> {
    // Add header row
    sheet.columns = [
      { header: 'GC RFC#', key: 'gcRfcNumber', width: 12 },
      { header: 'GC CO#', key: 'gcCoNumber', width: 12 },
      { header: 'Subcontractor', key: 'subcontractorName', width: 25 },
      { header: 'Sub RFC#', key: 'subRfcNumber', width: 12 },
      { header: 'SCO#', key: 'scoNumber', width: 12 },
      { header: 'Amount Submitted', key: 'amountSubmitted', width: 18, style: { numFmt: '$#,##0.00' } },
      { header: 'Date Submitted', key: 'dateSubmitted', width: 15 },
      { header: 'Amount Approved', key: 'amountApproved', width: 18, style: { numFmt: '$#,##0.00' } },
      { header: 'Date Approved', key: 'dateApproved', width: 15 },
      { header: 'SCO Issued?', key: 'scoIssued', width: 12 },
      { header: 'SCO Type', key: 'scoType', width: 20 },
      { header: 'CCO#', key: 'ccoNumber', width: 12 },
      { header: 'Notes', key: 'notes', width: 40 },
    ];
    
    // Get all sub COs for each GC CO
    for (const co of changeOrders) {
      const subCos = await storage.getSubcontractorChangeOrdersByGcCo(co.id);
      
      for (const subCo of subCos) {
        const subcontractor = await storage.getSubcontractor(subCo.subcontractorId);
        
        sheet.addRow({
          gcRfcNumber: co.gcRfcNumber,
          gcCoNumber: co.gcCoNumber,
          subcontractorName: subcontractor?.name || 'Unknown',
          subRfcNumber: subCo.subRfcNumber,
          scoNumber: subCo.scoNumber,
          amountSubmitted: Number(subCo.amountSubmitted) || 0,
          dateSubmitted: subCo.dateSubmitted,
          amountApproved: Number(subCo.amountApproved) || 0,
          dateApproved: subCo.dateApproved,
          scoIssued: subCo.scoIssued ? 'Y' : 'N',
          scoType: subCo.scoType,
          ccoNumber: subCo.ccoNumber,
          notes: subCo.notes,
        });
      }
    }
  }
  
  /**
   * Import GC CO Log sheet
   */
  private async importGcCoLogSheet(
    sheet: ExcelJS.Worksheet,
    projectId: number,
    userId: string
  ): Promise<{ imported: number; errors: string[] }> {
    const errors: string[] = [];
    let imported = 0;
    
    // Extract RFC and CO numbers for numbering initialization
    const rfcNumbers: string[] = [];
    const coNumbers: string[] = [];
    
    // Process each row (skip header)
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header
      
      const gcRfcNumber = row.getCell('gcRfcNumber')?.value?.toString();
      const gcCoNumber = row.getCell('gcCoNumber')?.value?.toString();
      
      if (gcRfcNumber) rfcNumbers.push(gcRfcNumber);
      if (gcCoNumber) coNumbers.push(gcCoNumber);
    });
    
    // Initialize numbering sequences
    await numberingService.initializeFromImport(projectId, rfcNumbers, coNumbers);
    
    // Import each row
    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
      const row = sheet.getRow(rowNumber);
      
      try {
        const title = row.getCell('title')?.value?.toString();
        if (!title) continue; // Skip empty rows
        
        const amountSubmitted = this.parseCurrency(row.getCell('amountSubmitted')?.value);
        const amountApproved = this.parseCurrency(row.getCell('amountApproved')?.value);
        
        const changeOrderData: Partial<ChangeOrder> & Pick<InsertChangeOrder, 'projectId' | 'title' | 'createdBy'> = {
          projectId,
          title,
          description: row.getCell('description')?.value?.toString(),
          status: row.getCell('status')?.value?.toString() || 'draft',
          gcRfcNumber: row.getCell('gcRfcNumber')?.value?.toString(),
          gcCoNumber: row.getCell('gcCoNumber')?.value?.toString(),
          amountSubmitted: amountSubmitted?.toString(),
          amountApproved: amountApproved?.toString(),
          dateSubmitted: this.parseDate(row.getCell('dateSubmitted')?.value),
          dateApproved: this.parseDate(row.getCell('dateApproved')?.value),
          ccoNumber: row.getCell('ccoNumber')?.value?.toString(),
          pcoNumber: row.getCell('pcoNumber')?.value?.toString(),
          fundingSource: row.getCell('fundingSource')?.value?.toString(),
          notes: row.getCell('notes')?.value?.toString(),
          createdBy: userId,
        };
        
        // Check if CO already exists (by RFC/CO number)
        const existingCos = await storage.getChangeOrders({ projectId });
        const existing = existingCos.data.find(co => 
          (changeOrderData.gcRfcNumber && co.gcRfcNumber === changeOrderData.gcRfcNumber) ||
          (changeOrderData.gcCoNumber && co.gcCoNumber === changeOrderData.gcCoNumber)
        );
        
        if (existing) {
          // Update existing - omit fields that shouldn't be updated
          const { projectId, createdBy, ...updateData } = changeOrderData;
          await storage.updateChangeOrder(existing.id, updateData);
        } else {
          // Create new (storage will generate CO number automatically)
          // Cast to InsertChangeOrder type for creation
          await storage.createChangeOrder(changeOrderData as InsertChangeOrder);
        }
        
        imported++;
      } catch (error) {
        errors.push(`Row ${rowNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    return { imported, errors };
  }
  
  /**
   * Import Sub CO Log sheet
   */
  private async importSubCoLogSheet(
    sheet: ExcelJS.Worksheet,
    projectId: number,
    userId: string
  ): Promise<{ imported: number; errors: string[] }> {
    const errors: string[] = [];
    let imported = 0;
    
    // Get company ID for subcontractor creation
    const project = await storage.getProject(projectId);
    if (!project) {
      errors.push('Project not found');
      return { imported, errors };
    }
    
    // Extract SCO numbers for initialization
    const scoNumbers: string[] = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const scoNumber = row.getCell('scoNumber')?.value?.toString();
      if (scoNumber) scoNumbers.push(scoNumber);
    });
    
    await numberingService.initializeFromImport(projectId, undefined, undefined, scoNumbers);
    
    // Process each row
    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
      const row = sheet.getRow(rowNumber);
      
      try {
        const subcontractorName = row.getCell('subcontractorName')?.value?.toString();
        if (!subcontractorName) continue;
        
        // Find parent GC CO
        const gcRfcNumber = row.getCell('gcRfcNumber')?.value?.toString();
        const gcCoNumber = row.getCell('gcCoNumber')?.value?.toString();
        
        const changeOrders = await storage.getChangeOrders({ projectId });
        const parentCo = changeOrders.data.find(co => 
          (gcRfcNumber && co.gcRfcNumber === gcRfcNumber) ||
          (gcCoNumber && co.gcCoNumber === gcCoNumber)
        );
        
        if (!parentCo) {
          errors.push(`Row ${rowNumber}: Parent GC CO not found (RFC: ${gcRfcNumber}, CO: ${gcCoNumber})`);
          continue;
        }
        
        // Find or create subcontractor
        let subcontractor = (await storage.getSubcontractors(project.companyId))
          .find(sub => sub.name === subcontractorName);
        
        if (!subcontractor) {
          subcontractor = await storage.createSubcontractor({
            name: subcontractorName,
            companyId: project.companyId
          });
        }
        
        const scoData = {
          projectId,
          gcChangeOrderId: parentCo.id,
          subcontractorId: subcontractor.id,
          subRfcNumber: row.getCell('subRfcNumber')?.value?.toString(),
          scoNumber: row.getCell('scoNumber')?.value?.toString(),
          amountSubmitted: this.parseCurrency(row.getCell('amountSubmitted')?.value)?.toString(),
          amountApproved: this.parseCurrency(row.getCell('amountApproved')?.value)?.toString(),
          dateSubmitted: this.parseDate(row.getCell('dateSubmitted')?.value),
          dateApproved: this.parseDate(row.getCell('dateApproved')?.value),
          scoIssued: row.getCell('scoIssued')?.value?.toString()?.toUpperCase() === 'Y',
          scoType: row.getCell('scoType')?.value?.toString(),
          ccoNumber: row.getCell('ccoNumber')?.value?.toString(),
          notes: row.getCell('notes')?.value?.toString(),
          status: 'draft',
          createdBy: userId,
        };
        
        await storage.createSubcontractorChangeOrder(scoData);
        imported++;
      } catch (error) {
        errors.push(`Row ${rowNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    return { imported, errors };
  }
  
  /**
   * Apply workbook styling
   */
  private applyWorkbookStyles(workbook: ExcelJS.Workbook): void {
    workbook.eachSheet(sheet => {
      // Style header row
      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF03512A' } // Brand green
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 25;
      
      // Add borders
      sheet.eachRow((row, rowNumber) => {
        row.eachCell(cell => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      });
      
      // Freeze header row
      sheet.views = [{ state: 'frozen', ySplit: 1 }];
      
      // Add auto-filter
      sheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: sheet.columnCount }
      };
    });
  }
  
  /**
   * Parse currency value
   */
  private parseCurrency(value: any): number | undefined {
    if (!value) return undefined;
    
    if (typeof value === 'number') return value;
    
    const str = value.toString().replace(/[$,]/g, '');
    const num = parseFloat(str);
    
    return isNaN(num) ? undefined : num;
  }
  
  /**
   * Parse date value
   */
  private parseDate(value: any): Date | undefined {
    if (!value) return undefined;
    
    if (value instanceof Date) return value;
    
    // Excel serial date number
    if (typeof value === 'number') {
      const excelDate = new Date((value - 25569) * 86400 * 1000);
      return excelDate;
    }
    
    // String date
    const date = new Date(value.toString());
    return isNaN(date.getTime()) ? undefined : date;
  }
  
  /**
   * Get sample Excel template
   */
  async getSampleTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CO Buddy';
    workbook.lastModifiedBy = 'CO Buddy';
    workbook.created = new Date();
    workbook.modified = new Date();
    
    // Create GC CO Log sheet with sample data
    const gcSheet = workbook.addWorksheet('GC_CO_Log');
    gcSheet.columns = [
      { header: 'Project Number', key: 'projectNumber', width: 15 },
      { header: 'Project Name', key: 'projectName', width: 25 },
      { header: 'GC RFC#', key: 'gcRfcNumber', width: 12 },
      { header: 'GC CO#', key: 'gcCoNumber', width: 12 },
      { header: 'Title', key: 'title', width: 30 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Date Submitted', key: 'dateSubmitted', width: 15 },
      { header: 'Amount Submitted', key: 'amountSubmitted', width: 18 },
      { header: 'Amount Approved', key: 'amountApproved', width: 18 },
      { header: 'Date Approved', key: 'dateApproved', width: 15 },
      { header: 'CCO#', key: 'ccoNumber', width: 12 },
      { header: 'PCO#', key: 'pcoNumber', width: 12 },
      { header: 'Funding Source', key: 'fundingSource', width: 20 },
      { header: 'Notes', key: 'notes', width: 40 },
    ];
    
    // Add sample row
    gcSheet.addRow({
      projectNumber: 'P-2024-001',
      projectName: 'Highway 101 Expansion',
      gcRfcNumber: 'RFC-001',
      gcCoNumber: '',
      title: 'Additional Excavation',
      description: 'Unforeseen rock layer requiring additional excavation',
      status: 'pending',
      dateSubmitted: new Date('2024-01-15'),
      amountSubmitted: 125000,
      amountApproved: 0,
      dateApproved: null,
      ccoNumber: '',
      pcoNumber: 'PCO-001',
      fundingSource: 'Contingency',
      notes: 'Awaiting geological report',
    });
    
    // Create Sub CO Log sheet
    const subSheet = workbook.addWorksheet('Sub_CO_Log');
    subSheet.columns = [
      { header: 'GC RFC#', key: 'gcRfcNumber', width: 12 },
      { header: 'GC CO#', key: 'gcCoNumber', width: 12 },
      { header: 'Subcontractor', key: 'subcontractorName', width: 25 },
      { header: 'Sub RFC#', key: 'subRfcNumber', width: 12 },
      { header: 'SCO#', key: 'scoNumber', width: 12 },
      { header: 'Amount Submitted', key: 'amountSubmitted', width: 18 },
      { header: 'Date Submitted', key: 'dateSubmitted', width: 15 },
      { header: 'Amount Approved', key: 'amountApproved', width: 18 },
      { header: 'Date Approved', key: 'dateApproved', width: 15 },
      { header: 'SCO Issued?', key: 'scoIssued', width: 12 },
      { header: 'SCO Type', key: 'scoType', width: 20 },
      { header: 'CCO#', key: 'ccoNumber', width: 12 },
      { header: 'Notes', key: 'notes', width: 40 },
    ];
    
    // Add sample row
    subSheet.addRow({
      gcRfcNumber: 'RFC-001',
      gcCoNumber: '',
      subcontractorName: 'ABC Excavation Co.',
      subRfcNumber: 'SUB-RFC-001',
      scoNumber: 'SCO-001',
      amountSubmitted: 75000,
      dateSubmitted: new Date('2024-01-10'),
      amountApproved: 0,
      dateApproved: null,
      scoIssued: 'N',
      scoType: 'T&M',
      ccoNumber: '',
      notes: 'Equipment and labor for rock excavation',
    });
    
    // Apply styling
    this.applyWorkbookStyles(workbook);
    
    // Generate buffer
    return await workbook.xlsx.writeBuffer() as Buffer;
  }
}

export const excelCoLogService = new ExcelCoLogService();