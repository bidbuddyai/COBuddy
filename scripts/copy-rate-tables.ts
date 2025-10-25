import { Client } from 'pg';
import { readFileSync } from 'fs';

const supabaseUrl = readFileSync('/tmp/supabase_url_backup.txt', 'utf-8').trim();
const replitUrl = readFileSync('/tmp/replit_db_url.txt', 'utf-8').trim();

async function copyRateTables() {
  const source = new Client({ connectionString: supabaseUrl });
  const dest = new Client({ connectionString: replitUrl });

  try {
    await source.connect();
    await dest.connect();

    console.log('📦 Copying 77 rate tables from Supabase to Replit...\n');

    // Get all rate tables
    const result = await source.query(`
      SELECT id, name, type, effective_date, region, data, source_file, 
             extracted_at, reviewed_by, reviewed_at, is_approved, company_id
      FROM public.rate_tables
      ORDER BY id
    `);

    console.log(`Found ${result.rows.length} rate tables\n`);

    // Clear existing data
    await dest.query('TRUNCATE TABLE rate_tables CASCADE');

    // Copy each rate table
    let copied = 0;
    for (const row of result.rows) {
      try {
        await dest.query(`
          INSERT INTO rate_tables (
            id, name, type, effective_date, region, data, source_file,
            extracted_at, reviewed_by, reviewed_at, is_approved, company_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [
          row.id,
          row.name,
          row.type,
          row.effective_date,
          row.region,
          row.data, // pg handles JSONB automatically
          row.source_file,
          row.extracted_at,
          row.reviewed_by,
          row.reviewed_at,
          row.is_approved,
          row.company_id
        ]);
        copied++;
        if (copied % 10 === 0) {
          console.log(`  Copied ${copied}/${result.rows.length}...`);
        }
      } catch (err: any) {
        console.error(`Error copying ${row.name}:`, err.message);
      }
    }

    // Reset sequence
    await dest.query(`SELECT setval('rate_tables_id_seq', (SELECT MAX(id) FROM rate_tables))`);

    console.log(`\n✅ Completed: ${copied}/${result.rows.length} rate tables copied`);

    // Verify
    const verify = await dest.query('SELECT COUNT(*) FROM rate_tables');
    console.log(`✅ Verified: ${verify.rows[0].count} rate tables in Replit database`);

  } catch (err: any) {
    console.error('❌ Error:', err.message);
    throw err;
  } finally {
    await source.end();
    await dest.end();
  }
}

copyRateTables();
