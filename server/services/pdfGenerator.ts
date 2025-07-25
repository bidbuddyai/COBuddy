import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { ChangeOrder, Project } from '@shared/schema';
import { storage } from '../storage.js';

export async function generateChangeOrderPDF(changeOrder: ChangeOrder): Promise<Buffer> {
  try {
    // Get project details
    const project = changeOrder.projectId ? await storage.getProject(changeOrder.projectId) : null;
    
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
      color: blackColor,
    });
    
    yPosition -= 30;
    
    // Project info row
    page.drawText('Project Name', {
      x: 350,
      y: yPosition,
      size: 10,
      font: font,
      color: blackColor,
    });
    page.drawText(project?.name || 'INSERT PROJECT NAME', {
      x: 450,
      y: yPosition,
      size: 10,
      font: font,
      color: blackColor,
    });
    
    yPosition -= 20;
    
    page.drawText('Date', {
      x: 50,
      y: yPosition,
      size: 10,
      font: font,
      color: blackColor,
    });
    page.drawText(new Date().toLocaleDateString(), {
      x: 100,
      y: yPosition,
      size: 10,
      font: font,
      color: blackColor,
    });
    
    page.drawText('RE Project No.', {
      x: 350,
      y: yPosition,
      size: 10,
      font: font,
      color: blackColor,
    });
    page.drawText(project?.number || 'INSERT REI PROJECT #', {
      x: 450,
      y: yPosition,
      size: 10,
      font: font,
      color: blackColor,
    });
    
    yPosition -= 30;
    
    // TO/FROM Section
    page.drawText('To', {
      x: 50,
      y: yPosition,
      size: 10,
      font: font,
      color: blackColor,
    });
    page.drawText(project?.clientName || 'INSERT CLIENT CONTACT', {
      x: 100,
      y: yPosition,
      size: 10,
      font: font,
      color: blackColor,
    });
    
    page.drawText('Email', {
      x: 350,
      y: yPosition,
      size: 10,
      font: font,
      color: blackColor,
    });
    page.drawText('INSERT CLIENT EMAIL', {
      x: 400,
      y: yPosition,
      size: 10,
      font: font,
      color: blackColor,
    });
    
    yPosition -= 15;
    
    page.drawText('Company', {
      x: 50,
      y: yPosition,
      size: 10,
      font: font,
      color: blackColor,
    });
    page.drawText('INSERT CLIENT/AGENCY', {
      x: 100,
      y: yPosition,
      size: 10,
      font: font,
      color: blackColor,
    });
    
    yPosition -= 20;
    
    page.drawText('From', {
      x: 50,
      y: yPosition,
      size: 10,
      font: font,
      color: blackColor,
    });
    page.drawText('INSERT REI PM NAME', {
      x: 100,
      y: yPosition,
      size: 10,
      font: font,
      color: blackColor,
    });
    
    page.drawText('Email', {
      x: 350,
      y: yPosition,
      size: 10,
      font: font,
      color: blackColor,
    });
    page.drawText('INSERT REI PM EMAIL', {
      x: 400,
      y: yPosition,
      size: 10,
      font: font,
      color: blackColor,
    });
    
    yPosition -= 15;
    
    page.drawText('Company', {
      x: 50,
      y: yPosition,
      size: 10,
      font: font,
      color: blackColor,
    });
    page.drawText('Resource Environmental, Inc.', {
      x: 100,
      y: yPosition,
      size: 10,
      font: font,
      color: blackColor,
    });
    
    yPosition -= 15;
    
    page.drawText('Subject:', {
      x: 50,
      y: yPosition,
      size: 10,
      font: font,
      color: blackColor,
    });
    page.drawText('Request for Change to Contract', {
      x: 100,
      y: yPosition,
      size: 10,
      font: font,
      color: blackColor,
    });
    
    page.drawText('Change Order No.', {
      x: 350,
      y: yPosition,
      size: 10,
      font: font,
      color: blackColor,
    });
    page.drawText(changeOrder.number, {
      x: 450,
      y: yPosition,
      size: 10,
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
      size: 12,
      font: boldFont,
      color: blackColor,
    });
    
    yPosition -= 25;
    
    // Draw table structure for cost breakdown
    const drawCostSection = (title: string, yPos: number): number => {
      page.drawText(title, {
        x: 50,
        y: yPos,
        size: 9,
        font: font,
        color: blackColor,
      });
      
      // Headers for columns
      if (title.includes('Labor')) {
        page.drawText('RATE', {
          x: 450,
          y: yPos,
          size: 9,
          font: font,
          color: blackColor,
        });
        page.drawText('AMOUNT', {
          x: 520,
          y: yPos,
          size: 9,
          font: font,
          color: blackColor,
        });
      } else {
        page.drawText('UNIT', {
          x: 380,
          y: yPos,
          size: 9,
          font: font,
          color: blackColor,
        });
        page.drawText('QTY', {
          x: 420,
          y: yPos,
          size: 9,
          font: font,
          color: blackColor,
        });
        page.drawText('RATE', {
          x: 450,
          y: yPos,
          size: 9,
          font: font,
          color: blackColor,
        });
        page.drawText('AMOUNT', {
          x: 520,
          y: yPos,
          size: 9,
          font: font,
          color: blackColor,
        });
      }
      
      return yPos - 15;
    };
    
    // Labor section
    yPosition = drawCostSection('Labor [Backup: REI Wage Breakdown & DIR/WD Rates, if applicable]', yPosition);
    const laborData = (changeOrder.data as any)?.laborEntries || [];
    let laborTotal = 0;
    
    for (const labor of laborData.slice(0, 3)) {
      const amount = (labor.rate || 0) * labor.hours;
      laborTotal += amount;
      
      page.drawText(`${labor.name} - ${labor.role} (${labor.hours} hrs)`, {
        x: 60,
        y: yPosition,
        size: 8,
        font: font,
        color: blackColor,
      });
      
      page.drawText(`$${(labor.rate || 0).toFixed(2)}`, {
        x: 450,
        y: yPosition,
        size: 8,
        font: font,
        color: blackColor,
      });
      
      page.drawText(`$${amount.toFixed(2)}`, {
        x: 520,
        y: yPosition,
        size: 8,
        font: font,
        color: blackColor,
      });
      
      yPosition -= 12;
    }
    
    // Add empty rows if needed
    if (laborData.length < 3) {
      for (let i = laborData.length; i < 3; i++) {
        page.drawText('$0.00', {
          x: 520,
          y: yPosition,
          size: 8,
          font: font,
          color: blackColor,
        });
        yPosition -= 12;
      }
    }
    
    yPosition -= 15;
    
    // Material section
    yPosition = drawCostSection('Material [Backup: Daily rate VE explanation, itemized summary, or bid sheet, as applicable]', yPosition);
    const materialData = (changeOrder.data as any)?.materialEntries || [];
    let materialTotal = 0;
    
    for (const material of materialData.slice(0, 3)) {
      const amount = (material.rate || 0) * material.quantity;
      materialTotal += amount;
      
      page.drawText(`${material.type} - ${material.description}`, {
        x: 60,
        y: yPosition,
        size: 8,
        font: font,
        color: blackColor,
      });
      
      page.drawText(material.unit || '', {
        x: 380,
        y: yPosition,
        size: 8,
        font: font,
        color: blackColor,
      });
      
      page.drawText(material.quantity?.toString() || '0', {
        x: 420,
        y: yPosition,
        size: 8,
        font: font,
        color: blackColor,
      });
      
      page.drawText(`$${(material.rate || 0).toFixed(2)}`, {
        x: 450,
        y: yPosition,
        size: 8,
        font: font,
        color: blackColor,
      });
      
      page.drawText(`$${amount.toFixed(2)}`, {
        x: 520,
        y: yPosition,
        size: 8,
        font: font,
        color: blackColor,
      });
      
      yPosition -= 12;
    }
    
    // Add empty rows if needed
    if (materialData.length < 3) {
      for (let i = materialData.length; i < 3; i++) {
        page.drawText('$0.00', {
          x: 520,
          y: yPosition,
          size: 8,
          font: font,
          color: blackColor,
        });
        yPosition -= 12;
      }
    }
    
    yPosition -= 15;
    
    // Equipment (Owned) section
    yPosition = drawCostSection('Equipment (Owned) [Backup: CalTrans Standard Rates, or bid sheet, as applicable]', yPosition);
    const equipmentData = (changeOrder.data as any)?.equipmentEntries || [];
    const ownedEquipment = equipmentData.filter((e: any) => !e.isRented);
    let equipmentOwnedTotal = 0;
    
    for (const equipment of ownedEquipment.slice(0, 3)) {
      const amount = (equipment.rate || 0) * equipment.hours;
      equipmentOwnedTotal += amount;
      
      page.drawText(`${equipment.type} - ${equipment.description}`, {
        x: 60,
        y: yPosition,
        size: 8,
        font: font,
        color: blackColor,
      });
      
      page.drawText('HR', {
        x: 380,
        y: yPosition,
        size: 8,
        font: font,
        color: blackColor,
      });
      
      page.drawText(equipment.hours?.toString() || '0', {
        x: 420,
        y: yPosition,
        size: 8,
        font: font,
        color: blackColor,
      });
      
      page.drawText(`$${(equipment.rate || 0).toFixed(2)}`, {
        x: 450,
        y: yPosition,
        size: 8,
        font: font,
        color: blackColor,
      });
      
      page.drawText(`$${amount.toFixed(2)}`, {
        x: 520,
        y: yPosition,
        size: 8,
        font: font,
        color: blackColor,
      });
      
      yPosition -= 12;
    }
    
    // Add empty rows if needed
    if (ownedEquipment.length < 3) {
      for (let i = ownedEquipment.length; i < 3; i++) {
        page.drawText('$0.00', {
          x: 520,
          y: yPosition,
          size: 8,
          font: font,
          color: blackColor,
        });
        yPosition -= 12;
      }
    }
    
    yPosition -= 15;
    
    // Equipment (Rented) section
    yPosition = drawCostSection('Equipment (Rented) [Backup: Quote or Invoice, or bid sheet, as applicable]', yPosition);
    const rentedEquipment = equipmentData.filter((e: any) => e.isRented);
    let equipmentRentedTotal = 0;
    
    for (const equipment of rentedEquipment.slice(0, 3)) {
      const amount = (equipment.rate || 0) * equipment.hours;
      equipmentRentedTotal += amount;
      
      page.drawText(`${equipment.type} - ${equipment.description}`, {
        x: 60,
        y: yPosition,
        size: 8,
        font: font,
        color: blackColor,
      });
      
      page.drawText('HR', {
        x: 380,
        y: yPosition,
        size: 8,
        font: font,
        color: blackColor,
      });
      
      page.drawText(equipment.hours?.toString() || '0', {
        x: 420,
        y: yPosition,
        size: 8,
        font: font,
        color: blackColor,
      });
      
      page.drawText(`$${(equipment.rate || 0).toFixed(2)}`, {
        x: 450,
        y: yPosition,
        size: 8,
        font: font,
        color: blackColor,
      });
      
      page.drawText(`$${amount.toFixed(2)}`, {
        x: 520,
        y: yPosition,
        size: 8,
        font: font,
        color: blackColor,
      });
      
      yPosition -= 12;
    }
    
    // Add empty rows if needed
    if (rentedEquipment.length < 3) {
      for (let i = rentedEquipment.length; i < 3; i++) {
        page.drawText('$0.00', {
          x: 520,
          y: yPosition,
          size: 8,
          font: font,
          color: blackColor,
        });
        yPosition -= 12;
      }
    }
    
    yPosition -= 15;
    
    // Disposal section
    yPosition = drawCostSection('Disposal [Backup: Quote or invoice, or bid sheet, as applicable]', yPosition);
    const disposalData = (changeOrder.data as any)?.disposalEntries || [];
    let disposalTotal = 0;
    
    for (const disposal of disposalData.slice(0, 3)) {
      const amount = (disposal.rate || 0) * disposal.quantity;
      disposalTotal += amount;
      
      page.drawText(`${disposal.type} - ${disposal.description}`, {
        x: 60,
        y: yPosition,
        size: 8,
        font: font,
        color: blackColor,
      });
      
      page.drawText(disposal.unit || '', {
        x: 380,
        y: yPosition,
        size: 8,
        font: font,
        color: blackColor,
      });
      
      page.drawText(disposal.quantity?.toString() || '0', {
        x: 420,
        y: yPosition,
        size: 8,
        font: font,
        color: blackColor,
      });
      
      page.drawText(`$${(disposal.rate || 0).toFixed(2)}`, {
        x: 450,
        y: yPosition,
        size: 8,
        font: font,
        color: blackColor,
      });
      
      page.drawText(`$${amount.toFixed(2)}`, {
        x: 520,
        y: yPosition,
        size: 8,
        font: font,
        color: blackColor,
      });
      
      yPosition -= 12;
    }
    
    // Add empty rows if needed
    if (disposalData.length < 3) {
      for (let i = disposalData.length; i < 3; i++) {
        page.drawText('$0.00', {
          x: 520,
          y: yPosition,
          size: 8,
          font: font,
          color: blackColor,
        });
        yPosition -= 12;
      }
    }
    
    yPosition -= 15;
    
    // Import section
    yPosition = drawCostSection('Import [Backup: Quote or invoice, or bid sheet, as applicable]', yPosition);
    const importData = (changeOrder.data as any)?.importEntries || [];
    let importTotal = 0;
    
    for (const importItem of importData.slice(0, 3)) {
      const amount = (importItem.rate || 0) * importItem.quantity;
      importTotal += amount;
      
      page.drawText(`${importItem.type} - ${importItem.description}`, {
        x: 60,
        y: yPosition,
        size: 8,
        font: font,
        color: blackColor,
      });
      
      page.drawText(importItem.unit || '', {
        x: 380,
        y: yPosition,
        size: 8,
        font: font,
        color: blackColor,
      });
      
      page.drawText(importItem.quantity?.toString() || '0', {
        x: 420,
        y: yPosition,
        size: 8,
        font: font,
        color: blackColor,
      });
      
      page.drawText(`$${(importItem.rate || 0).toFixed(2)}`, {
        x: 450,
        y: yPosition,
        size: 8,
        font: font,
        color: blackColor,
      });
      
      page.drawText(`$${amount.toFixed(2)}`, {
        x: 520,
        y: yPosition,
        size: 8,
        font: font,
        color: blackColor,
      });
      
      yPosition -= 12;
    }
    
    // Add empty rows if needed
    if (importData.length < 3) {
      for (let i = importData.length; i < 3; i++) {
        page.drawText('$0.00', {
          x: 520,
          y: yPosition,
          size: 8,
          font: font,
          color: blackColor,
        });
        yPosition -= 12;
      }
    }
    
    yPosition -= 15;
    
    // Subcontractor Work section
    yPosition = drawCostSection('Subcontractor Work [Backup: Subcontractor Quote, RFC/T&M, or Invoice]', yPosition);
    const subcontractorData = (changeOrder.data as any)?.subcontractorEntries || [];
    let subcontractorTotal = 0;
    
    for (const sub of subcontractorData.slice(0, 3)) {
      const amount = sub.amount || 0;
      subcontractorTotal += amount;
      
      page.drawText(`${sub.vendor} - ${sub.description}`, {
        x: 60,
        y: yPosition,
        size: 8,
        font: font,
        color: blackColor,
      });
      
      page.drawText('LS', {  // Lump Sum
        x: 380,
        y: yPosition,
        size: 8,
        font: font,
        color: blackColor,
      });
      
      page.drawText('1', {
        x: 420,
        y: yPosition,
        size: 8,
        font: font,
        color: blackColor,
      });
      
      page.drawText(`$${amount.toFixed(2)}`, {
        x: 450,
        y: yPosition,
        size: 8,
        font: font,
        color: blackColor,
      });
      
      page.drawText(`$${amount.toFixed(2)}`, {
        x: 520,
        y: yPosition,
        size: 8,
        font: font,
        color: blackColor,
      });
      
      yPosition -= 12;
    }
    
    // Add empty rows if needed
    if (subcontractorData.length < 3) {
      for (let i = subcontractorData.length; i < 3; i++) {
        page.drawText('$0.00', {
          x: 520,
          y: yPosition,
          size: 8,
          font: font,
          color: blackColor,
        });
        yPosition -= 12;
      }
    }
    
    yPosition -= 20;
    
    // Calculate subtotal
    const subtotal = laborTotal + materialTotal + equipmentOwnedTotal + equipmentRentedTotal + 
                    disposalTotal + importTotal + subcontractorTotal;
    
    // Draw subtotal line
    page.drawText('Change Order & Other Charges Subtotal', {
      x: 300,
      y: yPosition,
      size: 9,
      font: boldFont,
      color: blackColor,
    });
    
    page.drawText(`$${subtotal.toFixed(2)}`, {
      x: 520,
      y: yPosition,
      size: 9,
      font: boldFont,
      color: blackColor,
    });
    
    yPosition -= 25;
    
    // MARKUPS section
    page.drawText('MARKUPS', {
      x: 250,
      y: yPosition,
      size: 10,
      font: boldFont,
      color: blackColor,
    });
    
    yPosition -= 15;
    
    // Get project markups
    const markupLabor = parseFloat(project?.markupLabor || '20') / 100;
    const markupMaterials = parseFloat(project?.markupMaterials || '20') / 100;
    const markupEquipmentOwned = parseFloat(project?.markupEquipmentOwned || '20') / 100;
    const markupEquipmentRented = parseFloat(project?.markupEquipmentRented || '20') / 100;
    const markupDisposal = parseFloat(project?.markupDisposal || '15') / 100;
    const markupImport = parseFloat(project?.markupImport || '15') / 100;
    const markupSubcontractors = parseFloat(project?.markupSubcontractors || '5') / 100;
    
    // Calculate markup amounts
    const laborMarkupAmount = laborTotal * markupLabor;
    const materialsMarkupAmount = materialTotal * markupMaterials;
    const equipmentOwnedMarkupAmount = equipmentOwnedTotal * markupEquipmentOwned;
    const equipmentRentedMarkupAmount = equipmentRentedTotal * markupEquipmentRented;
    const disposalMarkupAmount = disposalTotal * markupDisposal;
    const importMarkupAmount = importTotal * markupImport;
    const subcontractorsMarkupAmount = subcontractorTotal * markupSubcontractors;
    
    const markupItems = [
      { label: 'LABOR', percent: markupLabor * 100, amount: laborMarkupAmount },
      { label: 'MATERIALS', percent: markupMaterials * 100, amount: materialsMarkupAmount },
      { label: 'EQUIPMENT (Owned)', percent: markupEquipmentOwned * 100, amount: equipmentOwnedMarkupAmount },
      { label: 'EQUIPMENT (Rented)', percent: markupEquipmentRented * 100, amount: equipmentRentedMarkupAmount },
      { label: 'DISPOSAL', percent: markupDisposal * 100, amount: disposalMarkupAmount },
      { label: 'IMPORT', percent: markupImport * 100, amount: importMarkupAmount },
      { label: 'SUBCONTRACTORS', percent: markupSubcontractors * 100, amount: subcontractorsMarkupAmount }
    ];
    
    for (const item of markupItems) {
      page.drawText(item.label, {
        x: 300,
        y: yPosition,
        size: 8,
        font: font,
        color: blackColor,
      });
      
      page.drawText(`${item.percent}%`, {
        x: 450,
        y: yPosition,
        size: 8,
        font: font,
        color: blackColor,
      });
      
      page.drawText(`$${item.amount.toFixed(2)}`, {
        x: 520,
        y: yPosition,
        size: 8,
        font: font,
        color: blackColor,
      });
      
      yPosition -= 12;
    }
    
    yPosition -= 15;
    
    // Grand total
    const totalMarkup = laborMarkupAmount + materialsMarkupAmount + equipmentOwnedMarkupAmount + 
                       equipmentRentedMarkupAmount + disposalMarkupAmount + importMarkupAmount + 
                       subcontractorsMarkupAmount;
    const grandTotal = subtotal + totalMarkup;
    
    page.drawText('GRAND TOTAL FOR THIS CHANGE ORDER', {
      x: 250,
      y: yPosition,
      size: 10,
      font: boldFont,
      color: blackColor,
    });
    
    page.drawText(`$${grandTotal.toFixed(2)}`, {
      x: 520,
      y: yPosition,
      size: 10,
      font: boldFont,
      color: blackColor,
    });
    
    // Contract tracking
    yPosition -= 25;
    
    page.drawText('Previous Change Orders', {
      x: 350,
      y: yPosition,
      size: 9,
      font: font,
      color: blackColor,
    });
    
    yPosition -= 12;
    
    page.drawText('Original Contract', {
      x: 350,
      y: yPosition,
      size: 9,
      font: font,
      color: blackColor,
    });
    
    yPosition -= 12;
    
    page.drawText('Revised Contract', {
      x: 350,
      y: yPosition,
      size: 9,
      font: boldFont,
      color: blackColor,
    });
    
    page.drawText(`$${grandTotal.toFixed(2)}`, {
      x: 520,
      y: yPosition,
      size: 9,
      font: boldFont,
      color: blackColor,
    });
    
    // CHANGE TO CONTRACT SCHEDULE section
    yPosition -= 30;
    
    page.drawText('CHANGE TO CONTRACT SCHEDULE', {
      x: width / 2 - 100,
      y: yPosition,
      size: 10,
      font: boldFont,
      color: blackColor,
    });
    
    yPosition -= 20;
    
    // Legal text
    const legalText = "This Change Order, once signed, constitutes an accepted modification to the applicable sections of the main contract. By signing, all parties " +
                     "acknowledge and agree that this Change Order is deemed compliant with the intent and scope of the contract's terms and conditions, whether or " +
                     "not explicitly stated. All other terms and conditions of the original contract remain in full force and effect, except as expressly amended herein or " +
                     "by any prior executed change orders.";
    
    const legalWords = legalText.split(' ');
    let legalLine = '';
    const maxLegalWidth = width - 100;
    
    for (const word of legalWords) {
      const testLine = legalLine + word + ' ';
      const testWidth = font.widthOfTextAtSize(testLine, 8);
      
      if (testWidth > maxLegalWidth && legalLine !== '') {
        page.drawText(legalLine.trim(), {
          x: 50,
          y: yPosition,
          size: 8,
          font: font,
          color: blackColor,
        });
        yPosition -= 10;
        legalLine = word + ' ';
      } else {
        legalLine = testLine;
      }
    }
    
    if (legalLine.trim() !== '') {
      page.drawText(legalLine.trim(), {
        x: 50,
        y: yPosition,
        size: 8,
        font: font,
        color: blackColor,
      });
    }
    
    // Signature section
    yPosition -= 30;
    
    page.drawText('APPROVED AND ACCEPTED:', {
      x: 50,
      y: yPosition,
      size: 10,
      font: boldFont,
      color: blackColor,
    });
    
    yPosition -= 30;
    
    // Signature line
    page.drawLine({
      start: { x: 50, y: yPosition },
      end: { x: 250, y: yPosition },
      thickness: 1,
      color: blackColor,
    });
    
    page.drawText('Signature', {
      x: 50,
      y: yPosition - 15,
      size: 8,
      font: font,
      color: blackColor,
    });
    
    // Name/Title line
    page.drawLine({
      start: { x: 270, y: yPosition },
      end: { x: 400, y: yPosition },
      thickness: 1,
      color: blackColor,
    });
    
    page.drawText('Name/Title', {
      x: 270,
      y: yPosition - 15,
      size: 8,
      font: font,
      color: blackColor,
    });
    
    // Date line
    page.drawLine({
      start: { x: 420, y: yPosition },
      end: { x: 520, y: yPosition },
      thickness: 1,
      color: blackColor,
    });
    
    page.drawText('Date', {
      x: 420,
      y: yPosition - 15,
      size: 8,
      font: font,
      color: blackColor,
    });
    
    // Company footer
    yPosition = 50;
    
    page.drawText('Resource Environmental Inc.', {
      x: width / 2 - 80,
      y: yPosition,
      size: 10,
      font: boldFont,
      color: blackColor,
    });
    
    page.drawText('Office: 562.468.7000 Email: info@resource-env.com', {
      x: width / 2 - 120,
      y: yPosition - 15,
      size: 9,
      font: font,
      color: blackColor,
    });
    
    // Save the PDF
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
    
  } catch (error) {
    console.error('PDF generation error:', error);
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function generateChangeOrderLogPDF(changeOrders: ChangeOrder[], project: Project): Promise<Buffer> {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([792, 612]); // Landscape orientation
    
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    const blackColor = rgb(0, 0, 0);
    const grayColor = rgb(0.5, 0.5, 0.5);
    
    const { width, height } = page.getSize();
    let yPosition = height - 30;
    
    // Header
    page.drawText('Request for Change (RFC) Log', {
      x: width / 2 - 100,
      y: yPosition,
      size: 16,
      font: boldFont,
      color: blackColor,
    });
    
    yPosition -= 30;
    
    // Project information
    page.drawText('Project Name:', {
      x: 30,
      y: yPosition,
      size: 10,
      font: boldFont,
      color: blackColor,
    });
    
    page.drawText(project.name || 'Enter Project Name Here', {
      x: 120,
      y: yPosition,
      size: 10,
      font: font,
      color: blackColor,
    });
    
    page.drawText('RE Project #:', {
      x: 500,
      y: yPosition,
      size: 10,
      font: boldFont,
      color: blackColor,
    });
    
    page.drawText(project.number || 'Enter Project Number Here', {
      x: 580,
      y: yPosition,
      size: 10,
      font: font,
      color: blackColor,
    });
    
    yPosition -= 30;
    
    // Table headers
    const headers = [
      { text: 'REI RFC #', x: 30, width: 60 },
      { text: 'Date\nSubmitted', x: 95, width: 60 },
      { text: 'CCO\n#', x: 160, width: 30 },
      { text: 'PCO\n#', x: 195, width: 30 },
      { text: 'RFI #', x: 230, width: 40 },
      { text: 'Description', x: 275, width: 150 },
      { text: 'Status', x: 430, width: 50 },
      { text: 'Ball in\nCourt', x: 485, width: 50 },
      { text: 'Assigned\nPM', x: 540, width: 50 },
      { text: 'Amount\nSubmitted', x: 595, width: 70 },
      { text: 'Time\nRequested', x: 670, width: 50 },
      { text: 'Amount\nApproved', x: 725, width: 70 }
    ];
    
    // Draw header row background
    page.drawRectangle({
      x: 25,
      y: yPosition - 15,
      width: width - 50,
      height: 25,
      color: rgb(0.9, 0.9, 0.9),
    });
    
    // Draw headers
    headers.forEach(header => {
      const lines = header.text.split('\n');
      lines.forEach((line, index) => {
        page.drawText(line, {
          x: header.x,
          y: yPosition - (index * 10),
          size: 8,
          font: boldFont,
          color: blackColor,
        });
      });
    });
    
    yPosition -= 30;
    
    // Draw change order rows
    changeOrders.forEach((co, index) => {
      if (yPosition < 100) return; // Stop if we're too close to bottom
      
      // Alternate row colors
      if (index % 2 === 0) {
        page.drawRectangle({
          x: 25,
          y: yPosition - 15,
          width: width - 50,
          height: 20,
          color: rgb(0.97, 0.97, 0.97),
        });
      }
      
      page.drawText(co.number, {
        x: 30,
        y: yPosition,
        size: 8,
        font: font,
        color: blackColor,
      });
      
      page.drawText(new Date(co.createdAt || '').toLocaleDateString(), {
        x: 95,
        y: yPosition,
        size: 8,
        font: font,
        color: blackColor,
      });
      
      page.drawText(co.ccoNumber || '', {
        x: 160,
        y: yPosition,
        size: 8,
        font: font,
        color: blackColor,
      });
      
      page.drawText(co.pcoNumber || '', {
        x: 195,
        y: yPosition,
        size: 8,
        font: font,
        color: blackColor,
      });
      
      page.drawText(co.rfiNumber || '', {
        x: 230,
        y: yPosition,
        size: 8,
        font: font,
        color: blackColor,
      });
      
      // Truncate description if too long
      const desc = co.title.length > 25 ? co.title.substring(0, 25) + '...' : co.title;
      page.drawText(desc, {
        x: 275,
        y: yPosition,
        size: 8,
        font: font,
        color: blackColor,
      });
      
      page.drawText(co.status, {
        x: 430,
        y: yPosition,
        size: 8,
        font: font,
        color: blackColor,
      });
      
      page.drawText(co.ballInCourt || '', {
        x: 485,
        y: yPosition,
        size: 8,
        font: font,
        color: blackColor,
      });
      
      page.drawText(co.assignedPm || '', {
        x: 540,
        y: yPosition,
        size: 8,
        font: font,
        color: blackColor,
      });
      
      page.drawText(`$${parseFloat(co.totalAmount?.toString() || '0').toFixed(2)}`, {
        x: 595,
        y: yPosition,
        size: 8,
        font: font,
        color: blackColor,
      });
      
      page.drawText(co.timeRequested?.toString() || '0', {
        x: 670,
        y: yPosition,
        size: 8,
        font: font,
        color: blackColor,
      });
      
      page.drawText(co.status === 'approved' ? `$${parseFloat(co.totalAmount?.toString() || '0').toFixed(2)}` : '$0.00', {
        x: 725,
        y: yPosition,
        size: 8,
        font: font,
        color: blackColor,
      });
      
      yPosition -= 20;
    });
    
    // Summary section at bottom
    yPosition = 80;
    
    // Calculate totals
    const approvedCOs = changeOrders.filter(co => co.status === 'approved');
    const totalApproved = approvedCOs.reduce((sum, co) => sum + parseFloat(co.totalAmount?.toString() || '0'), 0);
    const totalOutstanding = changeOrders
      .filter(co => co.status !== 'approved')
      .reduce((sum, co) => sum + parseFloat(co.totalAmount?.toString() || '0'), 0);
    
    // Summary box
    page.drawRectangle({
      x: 400,
      y: 30,
      width: 350,
      height: 50,
      borderColor: blackColor,
      borderWidth: 1,
    });
    
    page.drawText('Original Contract Value', {
      x: 410,
      y: 65,
      size: 8,
      font: font,
      color: blackColor,
    });
    
    page.drawText(`Total APPROVED CO Amount: $${totalApproved.toFixed(2)}`, {
      x: 410,
      y: 50,
      size: 8,
      font: font,
      color: blackColor,
    });
    
    page.drawText(`Total OUTSTANDING CO Amount: $${totalOutstanding.toFixed(2)}`, {
      x: 410,
      y: 35,
      size: 8,
      font: font,
      color: blackColor,
    });
    
    // Date generated
    page.drawText(`Date Generated: ${new Date().toLocaleDateString()}`, {
      x: 30,
      y: 20,
      size: 8,
      font: font,
      color: grayColor,
    });
    
    page.drawText('Page 1 of 1', {
      x: width - 80,
      y: 20,
      size: 8,
      font: font,
      color: grayColor,
    });
    
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
    
  } catch (error) {
    console.error('CO Log PDF generation error:', error);
    throw new Error(`Failed to generate CO Log PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
