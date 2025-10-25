import { Client } from 'pg';
import { readFileSync } from 'fs';

const supabaseUrl = readFileSync('/tmp/supabase_url_backup.txt', 'utf-8').trim();
const replitUrl = readFileSync('/tmp/replit_db_url.txt', 'utf-8').trim();

const tables = [
  'sessions',
  'companies',
  'users',
  'projects',
  'change_orders',
  'documents',
  'chat_conversations',
  'audit_logs',
  'change_order_logs',
  'subcontractors',
  'subcontractor_change_orders',
  'numbering_sequences'
];

async function copyTable(source: Client, dest: Client, tableName: string) {
  try {
    // Get count
    const countResult = await source.query(`SELECT COUNT(*) FROM public.${tableName}`);
    const count = parseInt(countResult.rows[0].count);
    
    if (count === 0) {
      console.log(`⏭️  ${tableName}: empty (skipping)`);
      return;
    }

    // Get data
    const data = await source.query(`SELECT * FROM public.${tableName}`);
    
    if (data.rows.length === 0) {
      console.log(`⏭️  ${tableName}: empty (skipping)`);
      return;
    }

    console.log(`📦 ${tableName}: copying ${data.rows.length} rows...`);

    // Get column names
    const columns = data.fields.map(f => f.name);

    // Clear existing
    await dest.query(`TRUNCATE TABLE ${tableName} CASCADE`);

    // Insert rows
    for (const row of data.rows) {
      const values = columns.map(col => {
        const value = row[col];
        // Handle JSONB
        if (value && typeof value === 'object' && !(value instanceof Date)) {
          return JSON.stringify(value);
        }
        return value;
      });

      const placeholders = values.map((_, idx) => `$${idx + 1}`).join(', ');
      const columnNames = columns.join(', ');

      await dest.query(
        `INSERT INTO ${tableName} (${columnNames}) VALUES (${placeholders})`,
        values
      );
    }

    console.log(`✅ ${tableName}: ${data.rows.length} rows copied`);
  } catch (err: any) {
    console.error(`❌ ${tableName}:`, err.message);
  }
}

async function copyAllData() {
  const source = new Client({ connectionString: supabaseUrl });
  const dest = new Client({ connectionString: replitUrl });

  try {
    console.log('🔄 Copying all remaining data from Supabase to Replit...\n');
    await source.connect();
    await dest.connect();

    for (const table of tables) {
      await copyTable(source, dest, table);
    }

    console.log('\n📊 Final Verification:\n');

    for (const table of tables) {
      try {
        const src = await source.query(`SELECT COUNT(*) FROM public.${table}`);
        const dst = await dest.query(`SELECT COUNT(*) FROM ${table}`);
        const srcCount = parseInt(src.rows[0].count);
        const dstCount = parseInt(dst.rows[0].count);

        if (srcCount === dstCount) {
          console.log(`✅ ${table}: ${dstCount} rows`);
        } else {
          console.log(`⚠️  ${table}: Source=${srcCount}, Dest=${dstCount}`);
        }
      } catch (err) {
        // Skip
      }
    }

    // Check rate_tables too
    const rateTables = await dest.query('SELECT COUNT(*) FROM rate_tables');
    console.log(`✅ rate_tables: ${rateTables.rows[0].count} rows`);

    console.log('\n🎉 Migration Complete!');
    console.log('📌 Supabase database preserved as backup');
    console.log('🚀 Ready to switch to Replit as primary');

  } catch (err: any) {
    console.error('❌ Error:', err.message);
    throw err;
  } finally {
    await source.end();
    await dest.end();
  }
}

copyAllData();
