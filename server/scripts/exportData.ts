import { db } from "../db";
import { rateTables, companies, users } from "@shared/schema";
import fs from "fs/promises";
import path from "path";

async function exportData() {
  console.log("📦 Exporting database data...");
  
  try {
    // Export companies
    const companiesData = await db.select().from(companies);
    console.log(`Found ${companiesData.length} companies`);
    
    // Export users
    const usersData = await db.select().from(users);
    console.log(`Found ${usersData.length} users`);
    
    // Export rate tables
    const rateTablesData = await db.select().from(rateTables);
    console.log(`Found ${rateTablesData.length} rate tables`);
    
    // Create export object
    const exportData = {
      timestamp: new Date().toISOString(),
      companies: companiesData,
      users: usersData,
      rateTables: rateTablesData
    };
    
    // Save to file
    const exportPath = path.join(process.cwd(), "database-export.json");
    await fs.writeFile(exportPath, JSON.stringify(exportData, null, 2));
    
    console.log(`\n✅ Data exported to: database-export.json`);
    console.log(`\n📊 Export summary:`);
    console.log(`   - Companies: ${companiesData.length}`);
    console.log(`   - Users: ${usersData.length}`);
    console.log(`   - Rate Tables: ${rateTablesData.length}`);
    
    // Also create SQL insert statements for easy import
    console.log("\n📝 Creating SQL import file...");
    
    let sqlStatements = [];
    
    // Companies SQL
    if (companiesData.length > 0) {
      sqlStatements.push("-- Companies");
      for (const company of companiesData) {
        sqlStatements.push(
          `INSERT INTO companies (id, name, domain, "logoUrl", "createdAt", "updatedAt") VALUES (${company.id}, '${company.name}', '${company.domain}', ${company.logoUrl ? `'${company.logoUrl}'` : 'NULL'}, '${company.createdAt}', '${company.updatedAt}') ON CONFLICT (id) DO NOTHING;`
        );
      }
    }
    
    // Users SQL
    if (usersData.length > 0) {
      sqlStatements.push("\n-- Users");
      for (const user of usersData) {
        sqlStatements.push(
          `INSERT INTO users (id, email, "firstName", "lastName", role, "companyId", "createdAt", "updatedAt") VALUES ('${user.id}', '${user.email}', ${user.firstName ? `'${user.firstName}'` : 'NULL'}, ${user.lastName ? `'${user.lastName}'` : 'NULL'}, '${user.role}', ${user.companyId}, '${user.createdAt}', '${user.updatedAt}') ON CONFLICT (id) DO NOTHING;`
        );
      }
    }
    
    // Rate Tables SQL
    if (rateTablesData.length > 0) {
      sqlStatements.push("\n-- Rate Tables");
      for (const table of rateTablesData) {
        const ratesJson = table.rates ? JSON.stringify(table.rates).replace(/'/g, "''") : '[]';
        sqlStatements.push(
          `INSERT INTO rate_tables (id, name, type, rates, "extractedFrom", "companyId", status, "approvedAt", "reviewedBy", "createdAt", "updatedAt") VALUES (${table.id}, '${table.name}', '${table.type}', '${ratesJson}'::jsonb, ${table.extractedFrom ? `'${table.extractedFrom}'` : 'NULL'}, ${table.companyId || 'NULL'}, '${table.status}', ${table.approvedAt ? `'${table.approvedAt}'` : 'NULL'}, ${table.reviewedBy ? `'${table.reviewedBy}'` : 'NULL'}, '${table.createdAt}', '${table.updatedAt}') ON CONFLICT (id) DO NOTHING;`
        );
      }
    }
    
    const sqlPath = path.join(process.cwd(), "database-import.sql");
    await fs.writeFile(sqlPath, sqlStatements.join("\n"));
    
    console.log(`✅ SQL import file created: database-import.sql`);
    
  } catch (error) {
    console.error("❌ Error exporting data:", error);
    throw error;
  }
}

// Run export
exportData().then(() => process.exit(0));