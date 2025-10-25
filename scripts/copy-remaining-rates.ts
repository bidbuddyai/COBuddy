import { Client } from 'pg';
import { readFileSync } from 'fs';

const supabaseUrl = readFileSync('/tmp/supabase_url_backup.txt', 'utf-8').trim();
const replitUrl = readFileSync('/tmp/replit_db_url.txt', 'utf-8').trim();

async function copyRemainingRates() {
  const source = new Client({ connectionString: supabaseUrl });
  const dest = new Client({ connectionString: replitUrl });

  try {
    await source.connect();
    await dest.connect();

    console.log('📦 Copying remaining 17 REI rate tables...\n');

    // Get REI rate tables (the ones that failed)
    const result = await source.query(`
      SELECT id, name, type, effective_date, region, data::text as data, source_file, 
             extracted_at, reviewed_by, reviewed_at, is_approved, company_id
      FROM public.rate_tables
      WHERE company_id IS NOT NULL
      ORDER BY id
    `);

    console.log(`Found ${result.rows.length} REI rate tables\n`);

    let copied = 0;
    for (const row of result.rows) {
      try {
        await dest.query(`
          INSERT INTO rate_tables (
            id, name, type, effective_date, region, data, source_file,
            extracted_at, reviewed_by, reviewed_at, is_approved, company_id
          ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            data = EXCLUDED.data
        `, [
          row.id,
          row.name,
          row.type,
          row.effective_date,
          row.region,
          row.data, // Already cast to text, will be cast to jsonb in query
          row.source_file,
          row.extracted_at,
          row.reviewed_by,
          row.reviewed_at,
          row.is_approved,
          row.company_id
        ]);
        copied++;
        console.log(`✅ ${row.name}`);
      } catch (err: any) {
        console.error(`❌ ${row.name}:`, err.message);
      }
    }

    console.log(`\n✅ Completed: ${copied}/${result.rows.length} REI rate tables copied`);

    // Final verification
    const verify = await dest.query('SELECT COUNT(*) FROM rate_tables');
    console.log(`✅ Total in Replit database: ${verify.rows[0].count} rate tables`);

  } catch (err: any) {
    console.error('❌ Error:', err.message);
    throw err;
  } finally {
    await source.end();
    await dest.end();
  }
}

copyRemainingRates();
