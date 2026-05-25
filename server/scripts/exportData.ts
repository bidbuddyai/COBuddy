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
        const c = company as any;
        sqlStatements.push(
          `INSERT INTO companies (id, name, domain, "logoUrl", "createdAt", "updatedAt") VALUES (${c.id}, '${c.name}', '${c.domain}', ${c.logoUrl ? `'${c.logoUrl}'` : 'NULL'}, '${c.createdAt}', '${c.updatedAt}') ON CONFLICT (id) DO NOTHING;`
        );
      }
    }
    
    // Users SQL
    if (usersData.length > 0) {
      sqlStatements.push("\n-- Users");
      for (const user of usersData) {
        const u = user as any;
        sqlStatements.push(
          `INSERT INTO users (id, email, "firstName", "lastName", role, "companyId", "createdAt", "updatedAt") VALUES ('${u.id}', '${u.email}', ${u.firstName ? `'${u.firstName}'` : 'NULL'}, ${u.lastName ? `'${u.lastName}'` : 'NULL'}, '${u.role}', ${u.companyId}, '${u.createdAt}', '${u.updatedAt}') ON CONFLICT (id) DO NOTHING;`
        );
      }
    }
    
    // Rate Tables SQL
    if (rateTablesData.length > 0) {
      sqlStatements.push("\n-- Rate Tables");
      for (const table of rateTablesData) {
        const t = table as any;
        const ratesJson = t.rates ? JSON.stringify(t.rates).replace(/'/g, "''") : '[]';
        sqlStatements.push(
          `INSERT INTO rate_tables (id, name, type, rates, "extractedFrom", "companyId", status, "approvedAt", "reviewedBy", "createdAt", "updatedAt") VALUES (${t.id}, '${t.name}', '${t.type}', '${ratesJson}'::jsonb, ${t.extractedFrom ? `'${t.extractedFrom}'` : 'NULL'}, ${t.companyId || 'NULL'}, '${t.status}', ${t.approvedAt ? `'${t.approvedAt}'` : 'NULL'}, ${t.reviewedBy ? `'${t.reviewedBy}'` : 'NULL'}, '${t.createdAt}', '${t.updatedAt}') ON CONFLICT (id) DO NOTHING;`
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