import { db } from "../db";
import { eq } from "drizzle-orm";
import fs from "fs/promises";
import path from "path";

async function exportDataForDeployment() {
  console.log("📦 Exporting database data for deployment...");
  
  try {
    // Get all tables data using raw SQL since schema might be different
    const companiesData = await db.execute(`SELECT * FROM companies`);
    const usersData = await db.execute(`SELECT * FROM users`);
    const rateTablesData = await db.execute(`SELECT * FROM rate_tables WHERE is_approved = true`);
    
    console.log(`Found ${companiesData.rows.length} companies`);
    console.log(`Found ${usersData.rows.length} users`);
    console.log(`Found ${rateTablesData.rows.length} approved rate tables`);
    
    // Create SQL import file
    let sqlStatements = [];
    
    // First, ensure tables exist
    sqlStatements.push(`-- Ensure database schema exists
-- Run 'npm run db:push' first in deployment if tables don't exist

-- Companies data`);
    
    // Companies
    for (const company of companiesData.rows) {
      sqlStatements.push(
        `INSERT INTO companies (id, name, domain, logo_url, created_at, updated_at) 
         VALUES (${company.id}, '${company.name}', '${company.domain}', ${company.logo_url ? `'${company.logo_url}'` : 'NULL'}, NOW(), NOW()) 
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, domain = EXCLUDED.domain;`
      );
    }
    
    // Users
    sqlStatements.push(`\n-- Users data`);
    for (const user of usersData.rows) {
      sqlStatements.push(
        `INSERT INTO users (id, email, first_name, last_name, role, company_id, created_at, updated_at) 
         VALUES ('${user.id}', '${user.email}', ${user.first_name ? `'${user.first_name}'` : 'NULL'}, ${user.last_name ? `'${user.last_name}'` : 'NULL'}, '${user.role}', ${user.company_id}, NOW(), NOW()) 
         ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, role = EXCLUDED.role, company_id = EXCLUDED.company_id;`
      );
    }
    
    // Rate Tables
    sqlStatements.push(`\n-- Rate Tables data (approved only)`);
    for (const table of rateTablesData.rows) {
      const dataJson = table.data ? JSON.stringify(table.data).replace(/'/g, "''") : '[]';
      sqlStatements.push(
        `INSERT INTO rate_tables (id, name, type, effective_date, region, data, source_file, extracted_at, reviewed_by, reviewed_at, is_approved, company_id) 
         VALUES (${table.id}, '${table.name}', '${table.type}', ${table.effective_date ? `'${table.effective_date}'` : 'NULL'}, ${table.region ? `'${table.region}'` : 'NULL'}, '${dataJson}'::jsonb, ${table.source_file ? `'${table.source_file}'` : 'NULL'}, ${table.extracted_at ? `'${table.extracted_at}'` : 'NOW()'}, ${table.reviewed_by ? `'${table.reviewed_by}'` : 'NULL'}, ${table.reviewed_at ? `'${table.reviewed_at}'` : 'NOW()'}, true, ${table.company_id || 'NULL'}) 
         ON CONFLICT (id) DO UPDATE SET 
           name = EXCLUDED.name,
           type = EXCLUDED.type,
           data = EXCLUDED.data,
           is_approved = EXCLUDED.is_approved;`
      );
    }
    
    // Projects (if they exist)
    try {
      const projectsData = await db.execute(`SELECT * FROM projects`);
      if (projectsData.rows.length > 0) {
        sqlStatements.push(`\n-- Projects data`);
        for (const project of projectsData.rows) {
          sqlStatements.push(
            `INSERT INTO projects (id, number, name, client_name, budget, status, company_id, created_at, updated_at, labor_markup, materials_markup, equipment_owned_markup, equipment_rented_markup, disposal_markup, import_markup, subcontractors_markup) 
             VALUES (${project.id}, '${project.number}', '${project.name}', ${project.client_name ? `'${project.client_name}'` : 'NULL'}, ${project.budget || 0}, '${project.status || 'active'}', ${project.company_id}, NOW(), NOW(), ${project.labor_markup || 20}, ${project.materials_markup || 20}, ${project.equipment_owned_markup || 20}, ${project.equipment_rented_markup || 20}, ${project.disposal_markup || 15}, ${project.import_markup || 15}, ${project.subcontractors_markup || 5}) 
             ON CONFLICT (id) DO NOTHING;`
          );
        }
      }
    } catch (e) {
      console.log("Projects table might not exist yet");
    }
    
    const sqlPath = path.join(process.cwd(), "deployment-data.sql");
    await fs.writeFile(sqlPath, sqlStatements.join("\n\n"));
    
    console.log(`\n✅ SQL import file created: deployment-data.sql`);
    console.log(`\n📋 To import in deployment:`);
    console.log(`1. First run: npm run db:push`);
    console.log(`2. Then import the SQL file through Replit's Database tab`);
    console.log(`   OR run in deployment shell: psql $DATABASE_URL < deployment-data.sql`);
    
  } catch (error) {
    console.error("❌ Error exporting data:", error);
    throw error;
  }
}

// Run export
exportDataForDeployment().then(() => process.exit(0));