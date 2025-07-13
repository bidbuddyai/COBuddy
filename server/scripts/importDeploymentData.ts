
import { db } from "../db";
import fs from "fs/promises";
import path from "path";

async function importDeploymentData() {
  console.log("📦 Importing deployment data...");
  
  try {
    // Read the SQL file
    const sqlPath = path.join(process.cwd(), "complete-deployment-data.sql");
    const sqlContent = await fs.readFile(sqlPath, "utf-8");
    
    // Split by lines and filter out comments and empty lines
    const statements = sqlContent
      .split(";")
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith("--"));
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        try {
          await db.execute(statement + ";");
          console.log(`✅ Executed statement ${i + 1}/${statements.length}`);
        } catch (error) {
          console.log(`⚠️  Statement ${i + 1} failed (might already exist):`, error.message);
        }
      }
    }
    
    console.log("🎉 Import completed!");
    
  } catch (error) {
    console.error("❌ Error importing data:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

// Run the import
importDeploymentData();
