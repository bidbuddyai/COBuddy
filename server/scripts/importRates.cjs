const { Pool } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-serverless');

// Initialize database connection
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

// Parse the T&M Calculator PDF data
const tmRatesData = `
# MATERIAL (GENERAL)
1,AIR CASSETTES; ASBESTOS,EA,0.89
2,AIR CASSETTES; LEAD,EA,1.50
3,ALCOHOL WIPES,EA,0.15
4,BAGS; GLOVE (TSI BAGS),EA,8.70
5,BAGS; NO PRINT CLEAR 6 MIL 30X40,RL,102.00
6,BAGS; NON HAZ; SPECIAL PRINT 30X40,RL,102.00
7,BAGS; PRINTED; 6MIL 33X40,RL,105.65
8,BLADES; 4" RAZOR SCRAPER (10/PK),PK,2.84
9,BLADES; 8" RAZOR SCRAPER (10/PK),PK,10.79
10,BLADES; GRINDER METABO 7",EA,75.00
11,BLADES; 2" IDIOT STICK,EA,15.20
12,BLADES; 4" IDIOT STICK,EA,7.20
13,BLADES; KETSAW,EA,10.14
14,BLADES; SAWZALL; METAL 6",EA,1.82
15,BLADES; SAWZALL; METAL 9",EA,6.60
16,BLADES; SAWZALL; WOOD 6",EA,2.06
17,BLADES; SAWZALL; WOOD 9",EA,4.97
18,BLADES; SKILLSAW 71/4",EA,13.43
19,BLADES; TERMINATOR 6",EA,22.50
20,BLADES; TERMINATOR 12",EA,37.50
21,BOXER SHORTS,EA,1.13
22,BRUSH; WIRE CUP,EA,14.82
23,BRUSH; WIRE LONG HANDLE,EA,1.92
24,BRUSH; WIRE SMALL,EA,1.34
25,CHARCOAL FILTERS,EA,22.04
26,DRUM 55 GAL EMPTY,EA,75.00
27,EAR PLUGS,EA,0.75
28,FILTER; 1/2 FACE NORTH,EA,9.60
29,FILTER; 1/2 NORTH ORGANIC,EA,25.85
30,FILTER; DUST MASKS,EA,1.48
31,FILTER; PAPR ASBESTOS,EA,78.60
32,FILTER; PAPR LEAD,EA,90.00
33,GLOVES; LEATHER HEAVY DUTY,PR,37.31
34,GLOVES; LEATHER WORK,PR,4.24
35,GLOVES; RUBBER 15 MIL,PR,3.88
36,GLOVES; WORK - REGULAR DUTY,PR,9.50
37,GREASE; SPRAY,EA,8.27
38,GRINDER WHEEL; 41/2",EA,6.76
39,HARNESS; SAFETY 1 D RING,EA,59.40
40,NETTING - HERAS FENCE,RL,54.00
41,SHEETING; CLEAR 10 FT WIDTH 6 MIL,FT,1.30
42,SHEETING; CLEAR 20 FT WIDTH 6 MIL,FT,2.60
43,SHEETING; CLEAR 100 FT ROLL 6 MIL,RL,260.00
44,SHEETING; FLAME RETARDANT,FT,2.48

# EQUIPMENT - DISPOSAL
1,DISPOSAL ASBESTOS TRACKOUT,YD,120.00
2,DISPOSAL CLASS I DEBRIS,YD,175.00
3,DISPOSAL LEAD,YD,105.00
4,DISPOSAL SOIL ASBESTOS,YD,120.00
5,DISPOSAL SOIL LEAD,YD,105.00

# EQUIPMENT - OWNED
1,CADDY; GAS ENGINE,DA,170.00
2,CADDY; HYDRAULIC,DA,200.00
3,EQUIPMENT; FORKLIFT (PETTIBONE),DA,1700.00
4,EQUIPMENT; FORKLIFT (PETTIBONE),DA,1700.00
5,GENERATOR; 6500 WATT,DA,180.00
6,GENERATOR; 8500 WATT,DA,210.00
7,GRINDER; 7" ELECTRIC,DA,124.00
8,GRINDER; 9" ELECTRIC,DA,152.00
9,HEATER; 150K BTU; OIL/KEROSENE,DA,186.00
10,HEATER; 650K BTU; OIL/KEROSENE,DA,390.00
11,HEPA FILTER; 1000 CFM,DA,91.00
12,HEPA FILTER; 2000 CFM,DA,101.00

# LABOR - WAGES
1,ABATEMENT LABORERS,HR,73.83
2,LABORERS,HR,71.37
3,ASBESTOS WORKERS,HR,86.48
4,LEADMAN,HR,86.05
`;

// Operating Engineers rates
const oeRatesData = `
# OPERATING ENGINEERS
1,FORKLIFT - 6K/8K LBS,HR,99.48
2,FORKLIFT - 10K LBS,HR,101.48
3,FORKLIFT - 12K LBS,HR,103.33
4,FORKLIFT - PETTIBONE,HR,107.75
`;

// Parse data function
function parseTMData(data, type, category) {
  const lines = data.trim().split('\n');
  const rates = [];
  let currentCategory = category;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Check if it's a category header
    if (trimmed.startsWith('#')) {
      currentCategory = trimmed.substring(1).trim();
      continue;
    }
    
    // Parse rate line: "number,description,unit,rate"
    const match = trimmed.match(/^\d+,(.+),([^,]+),([0-9.]+)$/);
    if (match) {
      const [, description, unit, rate] = match;
      rates.push({
        description: description.trim(),
        unit: unit.trim(),
        rate: parseFloat(rate),
        category: currentCategory
      });
    }
  }
  
  return rates;
}

async function importRates() {
  try {
    console.log('Starting rate import to Replit database...');
    
    // Insert T&M rates (Materials, Disposal, Equipment)
    const tmData = parseTMData(tmRatesData, 'tm', 'MATERIAL');
    if (tmData.length > 0) {
      await db.execute(`
        INSERT INTO rate_tables (name, type, effective_date, data, company_id, is_approved)
        VALUES ('FieldFlo T&M Calculator', 'material', NOW(), $1::jsonb, 1, true)
      `, [JSON.stringify(tmData)]);
      console.log(`Inserted T&M rates: ${tmData.length} entries`);
    }
    
    // Insert Operating Engineer rates
    const oeData = parseTMData(oeRatesData, 'labor', 'OPERATING ENGINEERS');
    if (oeData.length > 0) {
      await db.execute(`
        INSERT INTO rate_tables (name, type, effective_date, data, company_id, is_approved)
        VALUES ('Operating Engineers', 'labor', NOW(), $1::jsonb, 1, true)
      `, [JSON.stringify(oeData)]);
      console.log(`Inserted Operating Engineer rates: ${oeData.length} entries`);
    }
    
    // Insert Wage Calculator rates
    const wageData = [
      { description: 'ABATEMENT LABORERS', unit: 'HR', rate: 73.83, category: 'LABOR' },
      { description: 'LABORERS', unit: 'HR', rate: 71.37, category: 'LABOR' },
      { description: 'ASBESTOS WORKERS', unit: 'HR', rate: 86.48, category: 'LABOR' },
      { description: 'LEADMAN', unit: 'HR', rate: 86.05, category: 'LABOR' }
    ];
    
    await db.execute(`
      INSERT INTO rate_tables (name, type, effective_date, data, company_id, is_approved)
      VALUES ('REI Wage Calculator', 'labor', NOW(), $1::jsonb, 1, true)
    `, [JSON.stringify(wageData)]);
    console.log(`Inserted Wage Calculator rates: ${wageData.length} entries`);
    
    console.log('Rate import completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error importing rates:', error);
    process.exit(1);
  }
}

// Run the import
importRates();