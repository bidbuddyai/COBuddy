import { db } from "../db";
import { rateTables, companies, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import fs from "fs/promises";
import path from "path";
import { parse } from "csv-parse/sync";

async function initializeDeployment() {
  console.log("🚀 Initializing deployment database...");
  
  try {
    // Step 1: Check if database is already initialized
    const existingCompanies = await db.select().from(companies).limit(1);
    if (existingCompanies.length > 0) {
      console.log("✅ Database already initialized, skipping...");
      return;
    }

    console.log("📊 Setting up initial data...");

    // Step 2: Create Resource Environmental company
    const [resourceEnv] = await db.insert(companies).values({
      name: "Resource Environmental, Inc.",
      domain: "resource-env.com",
      logoUrl: "/assets/rei-block-logo-green-header-fotor-20241008204618_1752299722927.png"
    }).returning();

    console.log("✅ Created Resource Environmental company");

    // Step 3: Import Resource Environmental rate tables
    console.log("📥 Importing Resource Environmental rate tables...");
    
    // Import all the rate tables that were previously imported
    const rateTablesData = [
      // Labor rates
      {
        name: "REI Wage Calculator",
        type: "labor",
        rates: [
          { code: "LAB001", description: "Labor OT (Over Time)", rate: 47.40, unit: "hr" },
          { code: "LAB002", description: "Labor ST (Straight Time)", rate: 31.60, unit: "hr" },
          { code: "LAB003", description: "Labor DT (Double Time)", rate: 63.20, unit: "hr" },
          { code: "LAB004", description: "Labor Saturday", rate: 47.40, unit: "hr" },
          { code: "LAB005", description: "Labor Sunday", rate: 63.20, unit: "hr" }
        ]
      },
      {
        name: "Operating Engineers",
        type: "labor",
        rates: [
          { code: "OE001", description: "OE Local Union 3 Class 1 Straight Time", rate: 31.60, unit: "hr" },
          { code: "OE002", description: "OE Local Union 3 Class 1 Over Time", rate: 47.40, unit: "hr" },
          { code: "OE003", description: "OE Local Union 3 Class 1 Double Time", rate: 63.20, unit: "hr" }
        ]
      },
      // Equipment rates (sample - add more as needed)
      {
        name: "Tools & Equipment",
        type: "equipment",
        rates: [
          { code: "EQT001", description: "10K Pressure Washer 4.2GPM@10000PSI Diesel", rate: 875.00, unit: "day" },
          { code: "EQT002", description: "40K Pressure Washer 5GPM@40000PSI Trailer Mtd", rate: 3625.00, unit: "day" },
          { code: "EQT003", description: "Air Compressor 185 CFM", rate: 170.00, unit: "day" },
          { code: "EQT004", description: "Air Compressor 375 CFM", rate: 295.00, unit: "day" }
        ]
      },
      // Material rates
      {
        name: "Chemicals",
        type: "material",
        rates: [
          { code: "CHM001", description: "6% Sodium Hypochlorite (55 gallon drum)", rate: 175.00, unit: "drum" },
          { code: "CHM002", description: "Activated Carbon (55 lb bag)", rate: 95.00, unit: "bag" },
          { code: "CHM003", description: "Alum (50 lb bag)", rate: 85.00, unit: "bag" }
        ]
      },
      // Disposal rates
      {
        name: "Hazardous Waste Disposal",
        type: "disposal",
        rates: [
          { code: "HWD001", description: "CA Haz Waste Disposal", rate: 330.00, unit: "drum" },
          { code: "HWD002", description: "CA Non-Haz Waste Disposal", rate: 115.00, unit: "drum" },
          { code: "HWD003", description: "CA Haz Waste Disposal Bulk", rate: 215.00, unit: "ton" },
          { code: "HWD004", description: "CA Non-Haz Waste Disposal Bulk", rate: 85.00, unit: "ton" },
          { code: "HWD005", description: "CA Haz/Non-Haz Profile", rate: 950.00, unit: "ea" }
        ]
      }
    ];

    // Insert rate tables
    for (const tableData of rateTablesData) {
      await db.insert(rateTables).values({
        name: tableData.name,
        type: tableData.type,
        rates: tableData.rates,
        extractedFrom: "T&M Calculator PDF",
        companyId: resourceEnv.id,
        status: "approved",
        approvedAt: new Date(),
        reviewedBy: "System Import"
      });
    }

    console.log("✅ Imported Resource Environmental rate tables");

    // Step 4: Import Caltrans public rates
    console.log("📥 Importing Caltrans public rate tables...");
    
    // Check if we have the Caltrans CSV file
    const caltransPath = path.join(process.cwd(), "attached_assets", "2025_2026_1752368710802.csv");
    
    try {
      const caltransData = await fs.readFile(caltransPath, "utf-8");
      const records = parse(caltransData, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });

      // Group rates by category
      const ratesByCategory = new Map<string, any[]>();
      
      for (const record of records) {
        const category = record["Category"] || "Uncategorized";
        if (!ratesByCategory.has(category)) {
          ratesByCategory.set(category, []);
        }
        
        ratesByCategory.get(category)!.push({
          code: record["#"] || "",
          description: record["Description"] || "",
          rate: parseFloat(record["Hourly Rate"]?.replace(/[$,]/g, "") || "0"),
          unit: "hr"
        });
      }

      // Create rate tables for each category
      for (const [category, rates] of ratesByCategory) {
        if (rates.length > 0) {
          await db.insert(rateTables).values({
            name: `Caltrans - ${category}`,
            type: "equipment",
            rates: rates,
            extractedFrom: "Caltrans Rate Book 2025-2026",
            companyId: null, // Public rates
            status: "approved",
            approvedAt: new Date(),
            reviewedBy: "System Import"
          });
        }
      }

      console.log("✅ Imported Caltrans public rate tables");
    } catch (error) {
      console.log("⚠️  Could not import Caltrans rates (file may not exist in deployment)");
    }

    // Step 5: Create default admin user for Resource Environmental
    const adminEmail = "admin@resource-env.com";
    await db.insert(users).values({
      id: "admin-rei-deployment",
      email: adminEmail,
      firstName: "Admin",
      lastName: "User",
      role: "admin",
      companyId: resourceEnv.id
    });

    console.log("✅ Created default admin user:", adminEmail);
    console.log("\n🎉 Deployment initialization complete!");
    console.log("\n📌 You can now log in with:");
    console.log("   Email: admin@resource-env.com");
    console.log("   (Use Replit Auth or set up password)");
    
  } catch (error) {
    console.error("❌ Error initializing deployment:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

// Run initialization
initializeDeployment();