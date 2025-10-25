import { Client } from 'pg';
import { readFileSync } from 'fs';

/**
 * Migration script to copy all data from Supabase to Replit PostgreSQL
 * Keeps Supabase as backup, makes Replit the primary database
 */

// Read Supabase URL from backup file
const supabaseUrl = readFileSync('/tmp/supabase_url_backup.txt', 'utf-8').trim();
const replitUrl = process.env.DATABASE_URL!;

console.log('🔄 Database Migration: Supabase → Replit PostgreSQL');
console.log('=' .repeat(60));
console.log(`Source (Supabase): ${supabaseUrl.replace(/:[^:@]*@/, ':***@')}`);
console.log(`Destination (Replit): ${replitUrl.replace(/:[^:@]*@/, ':***@')}`);
console.log('=' .repeat(60));

const tables = [
  'sessions',
  'companies',
  'users',
  'rate_tables',
  'projects',
  'change_orders',
  'subcontractors',
  'subcontractor_change_orders',
  'numbering_sequences',
  'documents',
  'audit_logs',
  'change_order_logs',
  'chat_conversations'
];

async function migrate() {
  const source = new Client({ connectionString: supabaseUrl });
  const dest = new Client({ connectionString: replitUrl });

  try {
    console.log('\n📡 Connecting to databases...');
    await source.connect();
    await dest.connect();
    console.log('✅ Connected to both databases\n');

    // Get row counts from source
    console.log('📊 Source Database Summary:');
    for (const table of tables) {
      try {
        const result = await source.query(`SELECT COUNT(*) FROM ${table}`);
        const count = parseInt(result.rows[0].count);
        console.log(`  ${table}: ${count} rows`);
      } catch (err) {
        console.log(`  ${table}: table not found (skipping)`);
      }
    }

    console.log('\n🔄 Starting data migration...\n');

    for (const table of tables) {
      try {
        // Check if table exists in source
        const checkSource = await source.query(
          `SELECT COUNT(*) FROM information_schema.tables WHERE table_name = $1`,
          [table]
        );
        
        if (parseInt(checkSource.rows[0].count) === 0) {
          console.log(`⏭️  Skipping ${table} (not in source)`);
          continue;
        }

        // Get data from source
        const data = await source.query(`SELECT * FROM ${table}`);
        const rowCount = data.rows.length;

        if (rowCount === 0) {
          console.log(`⏭️  Skipping ${table} (no data)`);
          continue;
        }

        console.log(`📦 Copying ${table}: ${rowCount} rows...`);

        // Clear destination table
        await dest.query(`TRUNCATE TABLE ${table} CASCADE`);

        // Get column names
        const columns = data.fields.map(f => f.name);

        // Insert data in batches
        const batchSize = 100;
        for (let i = 0; i < data.rows.length; i += batchSize) {
          const batch = data.rows.slice(i, i + batchSize);
          
          for (const row of batch) {
            const values = columns.map(col => row[col]);
            const placeholders = values.map((_, idx) => `$${idx + 1}`).join(', ');
            const columnNames = columns.join(', ');
            
            await dest.query(
              `INSERT INTO ${table} (${columnNames}) VALUES (${placeholders})`,
              values
            );
          }
        }

        console.log(`✅ Completed ${table}: ${rowCount} rows copied`);
      } catch (err: any) {
        console.error(`❌ Error migrating ${table}:`, err.message);
      }
    }

    console.log('\n📊 Verifying migration...\n');

    // Verify row counts match
    let allMatch = true;
    for (const table of tables) {
      try {
        const sourceCount = await source.query(`SELECT COUNT(*) FROM ${table}`);
        const destCount = await dest.query(`SELECT COUNT(*) FROM ${table}`);
        
        const srcRows = parseInt(sourceCount.rows[0].count);
        const dstRows = parseInt(destCount.rows[0].count);

        if (srcRows === dstRows) {
          console.log(`✅ ${table}: ${srcRows} rows (verified)`);
        } else {
          console.log(`⚠️  ${table}: Source=${srcRows}, Dest=${dstRows} (MISMATCH!)`);
          allMatch = false;
        }
      } catch (err) {
        // Table doesn't exist, skip
      }
    }

    if (allMatch) {
      console.log('\n🎉 Migration completed successfully!');
      console.log('✅ All data verified and copied');
      console.log('📌 Supabase remains as backup (not deleted)');
      console.log('🚀 Replit PostgreSQL is now your primary database');
    } else {
      console.log('\n⚠️  Migration completed with warnings');
      console.log('Please review mismatched tables above');
    }

  } catch (err: any) {
    console.error('\n❌ Migration failed:', err.message);
    throw err;
  } finally {
    await source.end();
    await dest.end();
    console.log('\n🔌 Database connections closed');
  }
}

migrate().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
