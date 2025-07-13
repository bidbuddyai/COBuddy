const { db } = require('./db.js');
const { rateTables } = require('../shared/schema.js');

async function checkRates() {
  try {
    const tables = await db.select().from(rateTables).limit(3);
    console.log('Sample rate tables:');
    tables.forEach(table => {
      console.log(`\nTable: ${table.name} (${table.type})`);
      console.log('Data structure:', JSON.stringify(table.data, null, 2).substring(0, 500));
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

checkRates();
