// Simple test script to verify PDF export functionality
import { generateChangeOrderPDF, generateChangeOrderLogPDF } from './server/services/pdfGenerator.ts';

// Mock data for testing
const mockChangeOrder = {
  id: 1,
  number: "CO-TEST-001",
  title: "Test Change Order",
  description: "Testing PDF export functionality",
  status: "draft",
  totalAmount: "5000.00",
  laborAmount: "2000.00", 
  materialAmount: "1500.00",
  equipmentAmount: "1000.00",
  disposalAmount: "300.00",
  importAmount: "100.00",
  subcontractorAmount: "100.00",
  projectId: 1,
  createdAt: new Date(),
  data: {
    laborEntries: [
      { name: "John Doe", role: "Foreman", hours: 8, rate: 50 },
      { name: "Jane Smith", role: "Operator", hours: 8, rate: 45 }
    ],
    materialEntries: [
      { type: "Concrete", description: "Ready Mix", quantity: 10, unit: "CY", rate: 150 }
    ],
    equipmentEntries: [
      { type: "Excavator", description: "320 Cat", hours: 8, rate: 125, isRented: false }
    ],
    disposalEntries: [
      { type: "Soil", description: "Contaminated soil", quantity: 5, unit: "CY", rate: 60 }
    ]
  }
};

const mockProject = {
  id: 1,
  number: "PROJ-001",
  name: "Test Project",
  description: "Test project for PDF export",
  clientName: "Test Client",
  clientContact: "client@test.com",
  companyId: 1,
  markupLabor: "20.00",
  markupMaterials: "20.00", 
  markupEquipmentOwned: "20.00",
  markupEquipmentRented: "20.00",
  markupDisposal: "15.00",
  markupImport: "15.00",
  markupSubcontractors: "5.00"
};

async function testPDFGeneration() {
  console.log('Testing PDF generation...');
  
  try {
    // Test individual change order PDF
    console.log('Generating individual change order PDF...');
    const changeOrderPDF = await generateChangeOrderPDF(mockChangeOrder);
    console.log(`✓ Change order PDF generated successfully (${changeOrderPDF.length} bytes)`);
    
    // Test change order log PDF
    console.log('Generating change order log PDF...');
    const logPDF = await generateChangeOrderLogPDF([mockChangeOrder], mockProject);
    console.log(`✓ Change order log PDF generated successfully (${logPDF.length} bytes)`);
    
    console.log('\n🎉 All PDF exports working correctly!');
    
  } catch (error) {
    console.error('❌ PDF generation failed:', error.message);
    console.error(error.stack);
  }
}

testPDFGeneration();