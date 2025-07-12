import ExcelJS from 'exceljs';
import { ChangeOrder } from '@shared/schema';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function generateChangeOrderExcel(changeOrder: ChangeOrder): Promise<Buffer> {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Change Order');

    // Set page setup
    worksheet.pageSetup.paperSize = 9; // A4
    worksheet.pageSetup.orientation = 'portrait';
    worksheet.pageSetup.margins = {
      left: 0.7, right: 0.7, top: 0.75, bottom: 0.75,
      header: 0.3, footer: 0.3
    };

    // Header section
    worksheet.mergeCells('A1:H1');
    const headerCell = worksheet.getCell('A1');
    headerCell.value = 'REQUEST FOR CHANGE';
    headerCell.font = { size: 18, bold: true };
    headerCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Project information
    worksheet.mergeCells('A3:D3');
    worksheet.getCell('A3').value = 'Project Name';
    worksheet.getCell('A3').font = { bold: true };
    worksheet.mergeCells('E3:H3');
    worksheet.getCell('E3').value = changeOrder.projectId || 'INSERT PROJECT NAME';

    worksheet.mergeCells('A4:D4');
    worksheet.getCell('A4').value = 'Date';
    worksheet.getCell('A4').font = { bold: true };
    worksheet.mergeCells('E4:H4');
    worksheet.getCell('E4').value = new Date().toLocaleDateString();

    worksheet.mergeCells('A5:D5');
    worksheet.getCell('A5').value = 'Change Order No.';
    worksheet.getCell('A5').font = { bold: true };
    worksheet.mergeCells('E5:H5');
    worksheet.getCell('E5').value = changeOrder.number;

    // Description section
    worksheet.mergeCells('A7:H7');
    const descHeaderCell = worksheet.getCell('A7');
    descHeaderCell.value = 'DESCRIPTION OF CHANGE';
    descHeaderCell.font = { bold: true };
    descHeaderCell.alignment = { horizontal: 'center' };

    worksheet.mergeCells('A8:H10');
    worksheet.getCell('A8').value = changeOrder.description || changeOrder.title;
    worksheet.getCell('A8').alignment = { horizontal: 'left', vertical: 'top', wrapText: true };

    // Cost breakdown section
    worksheet.mergeCells('A12:H12');
    const costHeaderCell = worksheet.getCell('A12');
    costHeaderCell.value = 'CHANGE ORDER COST BREAKDOWN';
    costHeaderCell.font = { bold: true };
    costHeaderCell.alignment = { horizontal: 'center' };

    // Labor section
    let currentRow = 14;
    worksheet.mergeCells(`A${currentRow}:F${currentRow}`);
    worksheet.getCell(`A${currentRow}`).value = 'Labor [Backup: REI Wage Breakdown & DIR/WD Rates, if applicable]';
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    worksheet.getCell(`G${currentRow}`).value = 'RATE';
    worksheet.getCell(`G${currentRow}`).font = { bold: true };
    worksheet.getCell(`H${currentRow}`).value = 'AMOUNT';
    worksheet.getCell(`H${currentRow}`).font = { bold: true };

    // Add labor entries from extracted data
    const laborData = (changeOrder.data as any)?.laborEntries || [];
    currentRow++;
    for (const labor of laborData.slice(0, 3)) {
      worksheet.mergeCells(`A${currentRow}:F${currentRow}`);
      worksheet.getCell(`A${currentRow}`).value = `${labor.name} - ${labor.role} (${labor.hours} hrs)`;
      worksheet.getCell(`G${currentRow}`).value = labor.rate || 0;
      worksheet.getCell(`G${currentRow}`).numFmt = '$#,##0.00';
      worksheet.getCell(`H${currentRow}`).value = (labor.rate || 0) * labor.hours;
      worksheet.getCell(`H${currentRow}`).numFmt = '$#,##0.00';
      currentRow++;
    }

    // Add empty rows if needed
    while (currentRow < 18) {
      worksheet.getCell(`H${currentRow}`).value = '$0.00';
      worksheet.getCell(`H${currentRow}`).numFmt = '$#,##0.00';
      currentRow++;
    }

    // Material section
    currentRow = 18;
    worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
    worksheet.getCell(`A${currentRow}`).value = 'Material [Backup: Daily rate VE explanation, itemized summary, or bid sheet, as applicable]';
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    worksheet.getCell(`F${currentRow}`).value = 'UNIT';
    worksheet.getCell(`F${currentRow}`).font = { bold: true };
    worksheet.getCell(`G${currentRow}`).value = 'QTY';
    worksheet.getCell(`G${currentRow}`).font = { bold: true };
    worksheet.getCell(`H${currentRow}`).value = 'RATE';
    worksheet.getCell(`H${currentRow}`).font = { bold: true };

    // Add material entries
    const materialData = (changeOrder.data as any)?.materialEntries || [];
    currentRow++;
    for (const material of materialData.slice(0, 3)) {
      worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
      worksheet.getCell(`A${currentRow}`).value = `${material.type} - ${material.description}`;
      worksheet.getCell(`F${currentRow}`).value = material.unit;
      worksheet.getCell(`G${currentRow}`).value = material.quantity;
      worksheet.getCell(`H${currentRow}`).value = (material.rate || 0) * material.quantity;
      worksheet.getCell(`H${currentRow}`).numFmt = '$#,##0.00';
      currentRow++;
    }

    // Equipment section
    currentRow = 22;
    worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
    worksheet.getCell(`A${currentRow}`).value = 'Equipment (Owned) [Backup: CalTrans Standard Rates, or bid sheet, as applicable]';
    worksheet.getCell(`A${currentRow}`).font = { bold: true };

    // Add equipment entries
    const equipmentData = (changeOrder.data as any)?.equipmentEntries || [];
    currentRow++;
    for (const equipment of equipmentData.slice(0, 3)) {
      worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
      worksheet.getCell(`A${currentRow}`).value = `${equipment.type} - ${equipment.description} (${equipment.hours} hrs)`;
      worksheet.getCell(`H${currentRow}`).value = (equipment.rate || 0) * equipment.hours;
      worksheet.getCell(`H${currentRow}`).numFmt = '$#,##0.00';
      currentRow++;
    }

    // Totals section
    currentRow = 40;
    worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
    worksheet.getCell(`A${currentRow}`).value = 'GRAND TOTAL FOR THIS CHANGE ORDER';
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'right' };
    worksheet.getCell(`H${currentRow}`).value = parseFloat(changeOrder.totalAmount?.toString() || '0');
    worksheet.getCell(`H${currentRow}`).numFmt = '$#,##0.00';
    worksheet.getCell(`H${currentRow}`).font = { bold: true };

    // Company footer
    currentRow = 50;
    worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
    worksheet.getCell(`A${currentRow}`).value = 'Resource Environmental Inc.';
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'center' };

    worksheet.mergeCells(`A${currentRow + 1}:H${currentRow + 1}`);
    worksheet.getCell(`A${currentRow + 1}`).value = 'Office: 562.468.7000 Email: info@resource-env.com';
    worksheet.getCell(`A${currentRow + 1}`).alignment = { horizontal: 'center' };

    // Set column widths
    worksheet.getColumn('A').width = 15;
    worksheet.getColumn('B').width = 15;
    worksheet.getColumn('C').width = 15;
    worksheet.getColumn('D').width = 15;
    worksheet.getColumn('E').width = 15;
    worksheet.getColumn('F').width = 10;
    worksheet.getColumn('G').width = 12;
    worksheet.getColumn('H').width = 15;

    // Add borders to all cells
    worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      if (rowNumber <= 52) {
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          if (colNumber <= 8) {
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            };
          }
        });
      }
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as Buffer;

  } catch (error) {
    console.error('Excel generation error:', error);
    throw new Error(`Failed to generate Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
