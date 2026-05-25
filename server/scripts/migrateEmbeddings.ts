import { db } from "../db";
import { rateItems, rateTables } from "@shared/schema";
import { sql, isNull, or } from "drizzle-orm";
import { generateBatchEmbeddings } from "../services/embeddingService";

const BATCH_SIZE = 50;

async function enablePgVector(): Promise<boolean> {
  console.log("[Migration] Checking pgvector extension...");
  
  try {
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector`);
    console.log("[Migration] pgvector extension enabled");
    return true;
  } catch (error) {
    console.error("[Migration] Failed to enable pgvector:", error);
    return false;
  }
}

async function enablePgTrgm(): Promise<boolean> {
  console.log("[Migration] Checking pg_trgm extension...");
  
  try {
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
    console.log("[Migration] pg_trgm extension enabled");
    return true;
  } catch (error) {
    console.error("[Migration] Failed to enable pg_trgm:", error);
    return false;
  }
}

function buildSearchableText(
  description: string,
  classification: string | null,
  type: string
): string {
  const synonymMap: Record<string, string[]> = {
    drywall: ["sheetrock", "gypsum board", "wallboard", "gypboard"],
    sheetrock: ["drywall", "gypsum board", "wallboard"],
    electrician: ["electrical worker", "wireman"],
    plumber: ["pipefitter", "plumbing mechanic"],
    carpenter: ["framer", "finish carpenter", "woodworker"],
    laborer: ["general labor", "helper", "construction worker"],
    foreman: ["supervisor", "lead", "crew lead"],
    superintendent: ["super", "site supervisor", "project superintendent"],
    excavator: ["backhoe", "trackhoe", "digger"],
    loader: ["front loader", "wheel loader", "bucket loader"],
    bobcat: ["skid steer", "skid loader"],
    concrete: ["cement", "ready mix"],
    rebar: ["reinforcing steel", "reinforcement bar"],
    aggregate: ["gravel", "crushed rock", "base material"],
    asphalt: ["AC", "hot mix", "blacktop"],
    demo: ["demolition", "tearout", "removal"],
    haul: ["trucking", "hauling", "transport"],
    mudding: ["drywall finishing", "taping", "joint compound", "drywall finisher"],
    taping: ["drywall finishing", "mudding", "joint compound"],
    framing: ["wood framing", "metal framing", "stud work"],
    journeyman: ["skilled worker", "tradesman"],
    apprentice: ["trainee", "helper"],
    operator: ["equipment operator", "machine operator"],
    crane: ["hoist", "lifting equipment"],
    grader: ["motor grader", "road grader"],
    roller: ["compactor", "packer"],
    pipe: ["piping", "conduit", "tubing"],
    hvac: ["heating", "cooling", "air conditioning", "mechanical"],
  };

  const parts = [description];

  if (classification) {
    parts.push(classification);
  }

  parts.push(type);

  const lowerDesc = description.toLowerCase();
  for (const [key, synonyms] of Object.entries(synonymMap)) {
    if (lowerDesc.includes(key)) {
      parts.push(...synonyms);
    }
    for (const synonym of synonyms) {
      if (lowerDesc.includes(synonym.toLowerCase())) {
        parts.push(key);
        break;
      }
    }
  }

  return Array.from(new Set(parts)).join(" | ");
}

async function generateRateItemEmbeddings(): Promise<{
  processed: number;
  errors: string[];
}> {
  console.log("[Migration] Fetching rate items without embeddings...");

  const itemsToProcess = await db
    .select()
    .from(rateItems)
    .where(
      or(
        isNull(rateItems.embedding),
        sql`${rateItems.embeddingUpdatedAt} < ${rateItems.updatedAt}`
      )
    );

  console.log(`[Migration] Found ${itemsToProcess.length} items to process`);

  if (itemsToProcess.length === 0) {
    return { processed: 0, errors: [] };
  }

  const errors: string[] = [];
  let processed = 0;

  for (let i = 0; i < itemsToProcess.length; i += BATCH_SIZE) {
    const batch = itemsToProcess.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(itemsToProcess.length / BATCH_SIZE);

    console.log(`[Migration] Processing batch ${batchNum}/${totalBatches} (${batch.length} items)...`);

    const textsToEmbed = batch.map((item) =>
      buildSearchableText(item.description, item.classification, item.type)
    );

    try {
      const embeddings = await generateBatchEmbeddings(textsToEmbed);

      for (let j = 0; j < batch.length; j++) {
        const item = batch[j];
        const embedding = embeddings[j];

        const embeddingVector = `[${embedding.embedding.join(",")}]`;

        await db.execute(sql`
          UPDATE rate_items 
          SET 
            searchable_text = ${textsToEmbed[j]},
            embedding = ${embeddingVector}::vector,
            embedding_updated_at = NOW()
          WHERE id = ${item.id}
        `);

        processed++;
      }

      console.log(`[Migration] Batch ${batchNum} complete. Total processed: ${processed}/${itemsToProcess.length}`);
    } catch (error) {
      const errorMsg = `Batch ${batchNum} failed: ${error instanceof Error ? error.message : String(error)}`;
      console.error(`[Migration] ${errorMsg}`);
      errors.push(errorMsg);
    }

    if (i + BATCH_SIZE < itemsToProcess.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return { processed, errors };
}

async function createVectorIndex(): Promise<boolean> {
  console.log("[Migration] Creating vector similarity index...");

  try {
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_rate_items_embedding 
      ON rate_items 
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100)
    `);
    console.log("[Migration] Vector index created successfully");
    return true;
  } catch (error) {
    console.warn("[Migration] Could not create IVFFlat index (may need more data):", error);

    try {
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_rate_items_embedding_hnsw
        ON rate_items 
        USING hnsw (embedding vector_cosine_ops)
      `);
      console.log("[Migration] HNSW index created as fallback");
      return true;
    } catch (hnswError) {
      console.warn("[Migration] Could not create HNSW index either:", hnswError);
      return false;
    }
  }
}

export async function runEmbeddingMigration(): Promise<{
  success: boolean;
  processed: number;
  errors: string[];
}> {
  console.log("=".repeat(60));
  console.log("[Migration] Starting embedding migration...");
  console.log("=".repeat(60));

  const pgvectorEnabled = await enablePgVector();
  if (!pgvectorEnabled) {
    return {
      success: false,
      processed: 0,
      errors: ["Failed to enable pgvector extension"],
    };
  }

  await enablePgTrgm();

  const { processed, errors } = await generateRateItemEmbeddings();

  if (processed > 100) {
    await createVectorIndex();
  }

  console.log("=".repeat(60));
  console.log(`[Migration] Complete!`);
  console.log(`[Migration] Processed: ${processed} items`);
  console.log(`[Migration] Errors: ${errors.length}`);
  console.log("=".repeat(60));

  return {
    success: errors.length === 0,
    processed,
    errors,
  };
}

if (process.argv[1] && (process.argv[1].endsWith("migrateEmbeddings.ts") || process.argv[1].endsWith("migrateEmbeddings.js") || process.argv[1].endsWith("migrateEmbeddings"))) {
  runEmbeddingMigration()
    .then((result) => {
      console.log("Migration result:", result);
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}
