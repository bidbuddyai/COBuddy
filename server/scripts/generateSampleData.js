const { db } = require('../db');
const { changeOrders, documents } = require('../../shared/schema');

async function generateSampleData() {
  console.log('Generating sample data for analytics...');
  
  // Sample change orders with realistic data
  const sampleChangeOrders = [
    {
      number: 'CO-2024-001',
      title: 'Asbestos Abatement - Building A',
      description: 'Additional asbestos removal required in basement area',
      status: 'approved',
      totalAmount: 28500.00,
      projectId: 1,
      requestedBy: 1,
      data: {
        laborTotal: 18500,
        materialsTotal: 6000,
        equipmentTotal: 3500,
        disposalTotal: 500,
        laborEntries: [
          { description: 'Asbestos Worker I', rate: 45.00, hours: 160, amount: 7200 },
          { description: 'Asbestos Worker II', rate: 52.00, hours: 120, amount: 6240 },
          { description: 'Project Supervisor', rate: 65.00, hours: 80, amount: 5200 }
        ],
        materialEntries: [
          { description: 'Containment Plastic', qty: 500, rate: 2.50, amount: 1250 },
          { description: 'HEPA Filters', qty: 12, rate: 125.00, amount: 1500 },
          { description: 'Disposal Bags', qty: 100, rate: 8.50, amount: 850 }
        ],
        equipmentEntries: [
          { description: 'Negative Air Machine', hours: 40, rate: 65.00, amount: 2600 },
          { description: 'HEPA Vacuum', hours: 30, rate: 30.00, amount: 900 }
        ]
      },
      createdAt: new Date('2024-01-15')
    },
    {
      number: 'CO-2024-002',
      title: 'Lead Paint Removal - Warehouse',
      description: 'Lead paint removal from structural steel',
      status: 'pending',
      totalAmount: 42300.00,
      projectId: 1,
      requestedBy: 1,
      data: {
        laborTotal: 28000,
        materialsTotal: 8500,
        equipmentTotal: 5200,
        disposalTotal: 600,
        laborEntries: [
          { description: 'Lead Worker', rate: 48.00, hours: 200, amount: 9600 },
          { description: 'Helper', rate: 35.00, hours: 240, amount: 8400 },
          { description: 'Site Safety Officer', rate: 70.00, hours: 80, amount: 5600 }
        ]
      },
      createdAt: new Date('2024-02-10')
    },
    {
      number: 'CO-2024-003',
      title: 'Mold Remediation - Office Complex',
      description: 'Emergency mold remediation after water damage',
      status: 'approved',
      totalAmount: 18750.00,
      projectId: 2,
      requestedBy: 1,
      data: {
        laborTotal: 12000,
        materialsTotal: 4500,
        equipmentTotal: 2000,
        disposalTotal: 250
      },
      createdAt: new Date('2024-03-05')
    },
    {
      number: 'CO-2024-004',
      title: 'Hazmat Cleanup - Chemical Spill',
      description: 'Emergency chemical spill response and cleanup',
      status: 'approved',
      totalAmount: 35600.00,
      projectId: 2,
      requestedBy: 1,
      data: {
        laborTotal: 22000,
        materialsTotal: 7800,
        equipmentTotal: 5200,
        disposalTotal: 600
      },
      createdAt: new Date('2024-04-20')
    },
    {
      number: 'CO-2024-005',
      title: 'Asbestos Survey - Multiple Buildings',
      description: 'Comprehensive asbestos survey for demolition project',
      status: 'draft',
      totalAmount: 15400.00,
      projectId: 3,
      requestedBy: 1,
      data: {
        laborTotal: 9800,
        materialsTotal: 2600,
        equipmentTotal: 2800,
        disposalTotal: 200
      },
      createdAt: new Date('2024-05-15')
    },
    {
      number: 'CO-2024-006',
      title: 'Lead Abatement - School Renovation',
      description: 'Lead paint abatement for school modernization',
      status: 'approved',
      totalAmount: 52000.00,
      projectId: 3,
      requestedBy: 1,
      data: {
        laborTotal: 32000,
        materialsTotal: 12000,
        equipmentTotal: 7200,
        disposalTotal: 800
      },
      createdAt: new Date('2024-06-10')
    }
  ];

  // Sample documents
  const sampleDocuments = [
    {
      filename: 'tm_sheet_001.pdf',
      originalName: 'T&M Sheet - Building A Asbestos.pdf',
      mimeType: 'application/pdf',
      size: 245760,
      type: 'tm_sheet',
      status: 'processed',
      confidence: '0.92',
      uploadedBy: 1,
      extractedData: {
        laborEntries: [
          { name: 'John Smith', role: 'Asbestos Worker I', hours: 8, rate: 45.00 },
          { name: 'Mike Johnson', role: 'Asbestos Worker II', hours: 8, rate: 52.00 }
        ],
        materialEntries: [
          { type: 'containment', description: 'Plastic Sheeting', quantity: 50, unit: 'sqft' },
          { type: 'ppe', description: 'Respirator Filters', quantity: 12, unit: 'ea' }
        ],
        equipmentEntries: [
          { type: 'vacuum', description: 'HEPA Vacuum', hours: 8 }
        ]
      },
      createdAt: new Date('2024-01-14'),
      processedAt: new Date('2024-01-14')
    },
    {
      filename: 'tm_sheet_002.pdf',
      originalName: 'T&M Sheet - Lead Paint Project.pdf',
      mimeType: 'application/pdf',
      size: 189340,
      type: 'tm_sheet',
      status: 'processed',
      confidence: '0.88',
      uploadedBy: 1,
      extractedData: {
        laborEntries: [
          { name: 'Sarah Wilson', role: 'Lead Worker', hours: 10, rate: 48.00 },
          { name: 'Tom Brown', role: 'Helper', hours: 10, rate: 35.00 }
        ],
        materialEntries: [
          { type: 'containment', description: 'Lead Barrier', quantity: 200, unit: 'sqft' }
        ],
        equipmentEntries: [
          { type: 'generator', description: 'Portable Generator', hours: 10 }
        ]
      },
      createdAt: new Date('2024-02-09'),
      processedAt: new Date('2024-02-09')
    }
  ];

  try {
    // Insert change orders
    for (const order of sampleChangeOrders) {
      await db.insert(changeOrders).values(order);
    }
    
    // Insert documents
    for (const doc of sampleDocuments) {
      await db.insert(documents).values(doc);
    }
    
    console.log('Sample data generated successfully!');
    console.log(`- Created ${sampleChangeOrders.length} change orders`);
    console.log(`- Created ${sampleDocuments.length} documents`);
    
  } catch (error) {
    console.error('Error generating sample data:', error);
  }
}

generateSampleData().catch(console.error);