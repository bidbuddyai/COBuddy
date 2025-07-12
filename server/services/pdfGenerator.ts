import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { ChangeOrder } from '@shared/schema';

export async function generateChangeOrderPDF(changeOrder: ChangeOrder): Promise<Buffer> {
  try {
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // Letter size
    
    // Get fonts
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    // Define colors
    const primaryColor = rgb(0.012, 0.318, 0.165); // #03512A
    const blackColor = rgb(0, 0, 0);
    const grayColor = rgb(0.5, 0.5, 0.5);
    
    // Page dimensions
    const { width, height } = page.getSize();
    let yPosition = height - 50;
    
    // Header
    page.drawText('REQUEST FOR CHANGE', {
      x: width / 2 - 100,
      y: yPosition,
      size: 18,
      font: boldFont,
      color: primaryColor,
    });
    
    yPosition -= 40;
    
    // Project information
    page.drawText('Project Name:', {
      x: 50,
      y: yPosition,
      size: 12,
      font: boldFont,
      color: blackColor,
    });
    
    page.drawText(changeOrder.projectId?.toString() || 'INSERT PROJECT NAME', {
      x: 200,
      y: yPosition,
      size: 12,
      font: font,
      color: blackColor,
    });
    
    yPosition -= 25;
    
    page.drawText('Date:', {
      x: 50,
      y: yPosition,
      size: 12,
      font: boldFont,
      color: blackColor,
    });
    
    page.drawText(new Date().toLocaleDateString(), {
      x: 200,
      y: yPosition,
      size: 12,
      font: font,
      color: blackColor,
    });
    
    yPosition -= 25;
    
    page.drawText('Change Order No.:', {
      x: 50,
      y: yPosition,
      size: 12,
      font: boldFont,
      color: blackColor,
    });
    
    page.drawText(changeOrder.number, {
      x: 200,
      y: yPosition,
      size: 12,
      font: font,
      color: blackColor,
    });
    
    yPosition -= 50;
    
    // Description section
    page.drawText('DESCRIPTION OF CHANGE', {
      x: width / 2 - 80,
      y: yPosition,
      size: 14,
      font: boldFont,
      color: primaryColor,
    });
    
    yPosition -= 30;
    
    // Split description into lines
    const description = changeOrder.description || changeOrder.title;
    const maxWidth = width - 100;
    const words = description.split(' ');
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine + word + ' ';
      const testWidth = font.widthOfTextAtSize(testLine, 12);
      
      if (testWidth > maxWidth && currentLine !== '') {
        page.drawText(currentLine.trim(), {
          x: 50,
          y: yPosition,
          size: 12,
          font: font,
          color: blackColor,
        });
        yPosition -= 20;
        currentLine = word + ' ';
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine.trim() !== '') {
      page.drawText(currentLine.trim(), {
        x: 50,
        y: yPosition,
        size: 12,
        font: font,
        color: blackColor,
      });
    }
    
    yPosition -= 50;
    
    // Cost breakdown section
    page.drawText('CHANGE ORDER COST BREAKDOWN', {
      x: width / 2 - 100,
      y: yPosition,
      size: 14,
      font: boldFont,
      color: primaryColor,
    });
    
    yPosition -= 30;
    
    // Labor section
    page.drawText('Labor', {
      x: 50,
      y: yPosition,
      size: 12,
      font: boldFont,
      color: blackColor,
    });
    
    page.drawText('Amount', {
      x: width - 100,
      y: yPosition,
      size: 12,
      font: boldFont,
      color: blackColor,
    });
    
    yPosition -= 20;
    
    const laborData = (changeOrder.data as any)?.laborEntries || [];
    let laborTotal = 0;
    
    for (const labor of laborData.slice(0, 3)) {
      const amount = (labor.rate || 0) * labor.hours;
      laborTotal += amount;
      
      page.drawText(`${labor.name} - ${labor.role} (${labor.hours} hrs)`, {
        x: 70,
        y: yPosition,
        size: 10,
        font: font,
        color: blackColor,
      });
      
      page.drawText(`$${amount.toFixed(2)}`, {
        x: width - 100,
        y: yPosition,
        size: 10,
        font: font,
        color: blackColor,
      });
      
      yPosition -= 15;
    }
    
    yPosition -= 20;
    
    // Material section
    page.drawText('Material', {
      x: 50,
      y: yPosition,
      size: 12,
      font: boldFont,
      color: blackColor,
    });
    
    yPosition -= 20;
    
    const materialData = (changeOrder.data as any)?.materialEntries || [];
    let materialTotal = 0;
    
    for (const material of materialData.slice(0, 3)) {
      const amount = (material.rate || 0) * material.quantity;
      materialTotal += amount;
      
      page.drawText(`${material.type} - ${material.description} (${material.quantity} ${material.unit})`, {
        x: 70,
        y: yPosition,
        size: 10,
        font: font,
        color: blackColor,
      });
      
      page.drawText(`$${amount.toFixed(2)}`, {
        x: width - 100,
        y: yPosition,
        size: 10,
        font: font,
        color: blackColor,
      });
      
      yPosition -= 15;
    }
    
    yPosition -= 20;
    
    // Equipment section
    page.drawText('Equipment', {
      x: 50,
      y: yPosition,
      size: 12,
      font: boldFont,
      color: blackColor,
    });
    
    yPosition -= 20;
    
    const equipmentData = (changeOrder.data as any)?.equipmentEntries || [];
    let equipmentTotal = 0;
    
    for (const equipment of equipmentData.slice(0, 3)) {
      const amount = (equipment.rate || 0) * equipment.hours;
      equipmentTotal += amount;
      
      page.drawText(`${equipment.type} - ${equipment.description} (${equipment.hours} hrs)`, {
        x: 70,
        y: yPosition,
        size: 10,
        font: font,
        color: blackColor,
      });
      
      page.drawText(`$${amount.toFixed(2)}`, {
        x: width - 100,
        y: yPosition,
        size: 10,
        font: font,
        color: blackColor,
      });
      
      yPosition -= 15;
    }
    
    yPosition -= 30;
    
    // Grand total
    const grandTotal = parseFloat(changeOrder.totalAmount?.toString() || '0');
    
    page.drawText('GRAND TOTAL FOR THIS CHANGE ORDER', {
      x: 50,
      y: yPosition,
      size: 12,
      font: boldFont,
      color: blackColor,
    });
    
    page.drawText(`$${grandTotal.toFixed(2)}`, {
      x: width - 100,
      y: yPosition,
      size: 12,
      font: boldFont,
      color: primaryColor,
    });
    
    // Company footer
    yPosition = 80;
    
    page.drawText('Resource Environmental Inc.', {
      x: width / 2 - 80,
      y: yPosition,
      size: 12,
      font: boldFont,
      color: primaryColor,
    });
    
    page.drawText('Office: 562.468.7000 Email: info@resource-env.com', {
      x: width / 2 - 120,
      y: yPosition - 20,
      size: 10,
      font: font,
      color: blackColor,
    });
    
    // Add REI logo placeholder (if logo file is available)
    page.drawRectangle({
      x: width - 150,
      y: height - 80,
      width: 100,
      height: 30,
      borderColor: primaryColor,
      borderWidth: 1,
    });
    
    page.drawText('REI LOGO', {
      x: width - 130,
      y: height - 70,
      size: 10,
      font: font,
      color: primaryColor,
    });
    
    // Save the PDF
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
    
  } catch (error) {
    console.error('PDF generation error:', error);
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
