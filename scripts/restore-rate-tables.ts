import { Client } from 'pg';

const supabaseUrl = 'postgresql://postgres.zjpswiomhhpvfphrlshy:EasyPlant7424*!@aws-0-us-west-1.pooler.supabase.com:6543/postgres';
const replitUrl = process.env.DATABASE_URL!;

async function restoreRateTables() {
  const source = new Client({ connectionString: supabaseUrl });
  const dest = new Client({ connectionString: replitUrl });

  try {
    await source.connect();
    await dest.connect();

    console.log('📦 Restoring 77 rate tables from Supabase backup...\n');

    // Get all rate tables as text to avoid JSON parsing issues
    const result = await source.query(`
      SELECT id, name, type, effective_date, region, data::text as data, source_file, 
             extracted_at, reviewed_by, reviewed_at, is_approved, company_id
      FROM public.rate_tables
      ORDER BY id
    `);

    console.log(`Found ${result.rows.length} rate tables in Supabase backup\n`);

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
          row.data,
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

    console.log(`\n✅ Completed: ${copied}/${result.rows.length} rate tables restored`);

    // Verify
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

restoreRateTables();
