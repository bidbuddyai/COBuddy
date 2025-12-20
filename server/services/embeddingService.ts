import OpenAI from "openai";
import { db } from "../db";
import { rateItems, rateTables } from "@shared/schema";
import { eq, sql, and, isNull, or } from "drizzle-orm";

const openai = new OpenAI();

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;
const SIMILARITY_THRESHOLD = 0.3; // Lowered threshold for better recall

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  tokensUsed: number;
}

export interface SemanticSearchResult {
  id: number;
  rateTableId: number;
  description: string;
  classification: string | null;
  unit: string;
  rate: string;
  overtimeRate: string | null;
  type: string;
  effectiveDate: Date | null;
  region: string | null;
  companyId: number | null;
  similarity: number;
  source: "company" | "public";
}

export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  const cleanedText = text.trim().toLowerCase();
  
  if (!cleanedText) {
    throw new Error("Cannot generate embedding for empty text");
  }

  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: cleanedText,
    dimensions: EMBEDDING_DIMENSIONS,
  });

  return {
    embedding: response.data[0].embedding,
    model: EMBEDDING_MODEL,
    tokensUsed: response.usage?.total_tokens ?? 0,
  };
}

export async function generateBatchEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
  if (texts.length === 0) return [];
  
  const cleanedTexts = texts.map(t => t.trim().toLowerCase()).filter(t => t.length > 0);
  
  if (cleanedTexts.length === 0) {
    throw new Error("No valid texts to generate embeddings for");
  }

  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: cleanedTexts,
    dimensions: EMBEDDING_DIMENSIONS,
  });

  const totalTokens = response.usage?.total_tokens ?? 0;
  return response.data.map((item, index) => ({
    embedding: item.embedding,
    model: EMBEDDING_MODEL,
    tokensUsed: totalTokens > 0 ? Math.floor(totalTokens / texts.length) : 0,
  }));
}

export async function semanticSearchRates(
  query: string,
  type: "labor" | "equipment" | "material" | "disposal" | "import",
  companyId?: number,
  limit: number = 5
): Promise<SemanticSearchResult[]> {
  const hasEmbeddings = await checkEmbeddingsExist(type);
  
  if (!hasEmbeddings) {
    return textOnlySearchRates(query, type, companyId, limit);
  }

  try {
    const { embedding } = await generateEmbedding(query);
    const vectorString = `[${embedding.join(",")}]`;

    const results = await db.execute(sql`
      SELECT 
        ri.id,
        ri.rate_table_id as "rateTableId",
        ri.description,
        ri.classification,
        ri.unit,
        ri.rate,
        ri.overtime_rate as "overtimeRate",
        ri.type,
        ri.effective_date as "effectiveDate",
        ri.region,
        ri.company_id as "companyId",
        1 - (ri.embedding <=> ${vectorString}::vector) as similarity
      FROM rate_items ri
      WHERE 
        ri.type = ${type}
        AND ri.is_active = true
        AND ri.embedding IS NOT NULL
        AND (
          ri.company_id = ${companyId ?? null}
          OR ri.company_id IS NULL
        )
        AND (1 - (ri.embedding <=> ${vectorString}::vector)) > ${SIMILARITY_THRESHOLD}
      ORDER BY ri.embedding <=> ${vectorString}::vector
      LIMIT ${limit}
    `);

    const rows = (results as any).rows || results;
    return (rows as any[]).map(row => ({
      ...row,
      similarity: parseFloat(row.similarity),
      source: row.companyId ? "company" : "public",
    }));
  } catch (error) {
    console.warn("Semantic search failed, falling back to text search:", error);
    return textOnlySearchRates(query, type, companyId, limit);
  }
}

async function checkEmbeddingsExist(type: string): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT COUNT(*) as count 
    FROM rate_items 
    WHERE type = ${type} AND embedding IS NOT NULL
    LIMIT 1
  `);
  const rows = (result as any).rows || result;
  return rows.length > 0 && parseInt(rows[0].count) > 0;
}

async function textOnlySearchRates(
  query: string,
  type: "labor" | "equipment" | "material" | "disposal" | "import",
  companyId?: number,
  limit: number = 5
): Promise<SemanticSearchResult[]> {
  const searchPattern = `%${query.toLowerCase()}%`;
  const synonyms = getConstructionSynonyms(query);
  
  const allPatterns = [searchPattern, ...synonyms.map(s => `%${s.toLowerCase()}%`)];
  
  const results = await db.execute(sql`
    SELECT 
      ri.id,
      ri.rate_table_id as "rateTableId",
      ri.description,
      ri.classification,
      ri.unit,
      ri.rate,
      ri.overtime_rate as "overtimeRate",
      ri.type,
      ri.effective_date as "effectiveDate",
      ri.region,
      ri.company_id as "companyId",
      CASE 
        WHEN LOWER(ri.description) LIKE ${searchPattern} THEN 0.9
        WHEN LOWER(ri.classification) LIKE ${searchPattern} THEN 0.8
        ELSE 0.7
      END as similarity
    FROM rate_items ri
    WHERE 
      ri.type = ${type}
      AND ri.is_active = true
      AND (ri.company_id = ${companyId ?? null} OR ri.company_id IS NULL)
      AND (
        LOWER(ri.description) LIKE ANY(${allPatterns})
        OR LOWER(ri.classification) LIKE ANY(${allPatterns})
        OR LOWER(ri.searchable_text) LIKE ANY(${allPatterns})
      )
    ORDER BY 
      CASE 
        WHEN LOWER(ri.description) LIKE ${searchPattern} THEN 1
        WHEN LOWER(ri.classification) LIKE ${searchPattern} THEN 2
        ELSE 3
      END
    LIMIT ${limit}
  `);

  const rows = (results as any).rows || results;
  return (rows as any[]).map(row => ({
    ...row,
    similarity: parseFloat(row.similarity) || 0.7,
    source: row.companyId ? "company" : "public",
  }));
}

export async function hybridSearchRates(
  query: string,
  type: "labor" | "equipment" | "material" | "disposal" | "import",
  companyId?: number,
  limit: number = 10
): Promise<SemanticSearchResult[]> {
  const hasEmbeddings = await checkEmbeddingsExist(type);
  
  if (!hasEmbeddings) {
    return textOnlySearchRates(query, type, companyId, limit);
  }

  try {
    const { embedding } = await generateEmbedding(query);
    const vectorString = `[${embedding.join(",")}]`;
    const searchPattern = `%${query.toLowerCase()}%`;

    const results = await db.execute(sql`
      WITH semantic_results AS (
        SELECT 
          ri.id,
          ri.rate_table_id as "rateTableId",
          ri.description,
          ri.classification,
          ri.unit,
          ri.rate,
          ri.overtime_rate as "overtimeRate",
          ri.type,
          ri.effective_date as "effectiveDate",
          ri.region,
          ri.company_id as "companyId",
          1 - (ri.embedding <=> ${vectorString}::vector) as similarity,
          'semantic' as match_type
        FROM rate_items ri
        WHERE 
          ri.type = ${type}
          AND ri.is_active = true
          AND ri.embedding IS NOT NULL
          AND (ri.company_id = ${companyId ?? null} OR ri.company_id IS NULL)
          AND (1 - (ri.embedding <=> ${vectorString}::vector)) > ${SIMILARITY_THRESHOLD}
      ),
      text_results AS (
        SELECT 
          ri.id,
          ri.rate_table_id as "rateTableId",
          ri.description,
          ri.classification,
          ri.unit,
          ri.rate,
          ri.overtime_rate as "overtimeRate",
          ri.type,
          ri.effective_date as "effectiveDate",
          ri.region,
          ri.company_id as "companyId",
          0.7 as similarity,
          'text' as match_type
        FROM rate_items ri
        WHERE 
          ri.type = ${type}
          AND ri.is_active = true
          AND (ri.company_id = ${companyId ?? null} OR ri.company_id IS NULL)
          AND (
            LOWER(ri.description) LIKE ${searchPattern}
            OR LOWER(ri.classification) LIKE ${searchPattern}
            OR LOWER(ri.searchable_text) LIKE ${searchPattern}
          )
      ),
      combined AS (
        SELECT * FROM semantic_results
        UNION ALL
        SELECT * FROM text_results
      )
      SELECT DISTINCT ON (id) *
      FROM combined
      ORDER BY id, similarity DESC
      LIMIT ${limit}
    `);

    const rows = (results as any).rows || results;
    return (rows as any[])
      .map(row => ({
        ...row,
        similarity: parseFloat(row.similarity),
        source: row.companyId ? "company" : "public",
      }))
      .sort((a, b) => b.similarity - a.similarity);
  } catch (error) {
    console.warn("Hybrid search failed, falling back to text search:", error);
    return textOnlySearchRates(query, type, companyId, limit);
  }
}

export async function updateRateItemEmbedding(rateItemId: number): Promise<void> {
  const [item] = await db
    .select()
    .from(rateItems)
    .where(eq(rateItems.id, rateItemId))
    .limit(1);

  if (!item) {
    throw new Error(`Rate item ${rateItemId} not found`);
  }

  const searchableText = buildSearchableText(
    item.description,
    item.classification,
    item.type
  );

  const { embedding } = await generateEmbedding(searchableText);

  await db
    .update(rateItems)
    .set({
      searchableText,
      embedding,
      embeddingUpdatedAt: new Date(),
    })
    .where(eq(rateItems.id, rateItemId));
}

export async function updateAllRateItemEmbeddings(
  batchSize: number = 50,
  onProgress?: (processed: number, total: number) => void
): Promise<{ processed: number; errors: string[] }> {
  const items = await db
    .select()
    .from(rateItems)
    .where(
      or(
        isNull(rateItems.embedding),
        sql`${rateItems.embeddingUpdatedAt} < ${rateItems.updatedAt}`
      )
    );

  const errors: string[] = [];
  let processed = 0;

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    const textsToEmbed = batch.map(item => 
      buildSearchableText(item.description, item.classification, item.type)
    );

    try {
      const embeddings = await generateBatchEmbeddings(textsToEmbed);

      for (let j = 0; j < batch.length; j++) {
        await db
          .update(rateItems)
          .set({
            searchableText: textsToEmbed[j],
            embedding: embeddings[j].embedding,
            embeddingUpdatedAt: new Date(),
          })
          .where(eq(rateItems.id, batch[j].id));
        
        processed++;
      }
    } catch (error) {
      errors.push(`Batch ${i}-${i + batchSize}: ${error}`);
    }

    if (onProgress) {
      onProgress(processed, items.length);
    }
  }

  return { processed, errors };
}

function buildSearchableText(
  description: string,
  classification: string | null,
  type: string
): string {
  const parts = [description];
  
  if (classification) {
    parts.push(classification);
  }
  
  parts.push(type);

  const synonyms = getConstructionSynonyms(description);
  if (synonyms.length > 0) {
    parts.push(...synonyms);
  }

  return parts.join(" | ");
}

function getConstructionSynonyms(term: string): string[] {
  const synonymMap: Record<string, string[]> = {
    "drywall": ["sheetrock", "gypsum board", "wallboard", "gypboard"],
    "sheetrock": ["drywall", "gypsum board", "wallboard"],
    "electrician": ["electrical worker", "wireman"],
    "plumber": ["pipefitter", "plumbing mechanic"],
    "carpenter": ["framer", "finish carpenter", "woodworker"],
    "laborer": ["general labor", "helper", "construction worker"],
    "foreman": ["supervisor", "lead", "crew lead"],
    "superintendent": ["super", "site supervisor", "project superintendent"],
    "excavator": ["backhoe", "trackhoe", "digger"],
    "loader": ["front loader", "wheel loader", "bucket loader"],
    "bobcat": ["skid steer", "skid loader"],
    "concrete": ["cement", "ready mix"],
    "rebar": ["reinforcing steel", "reinforcement bar"],
    "aggregate": ["gravel", "crushed rock", "base material"],
    "asphalt": ["AC", "hot mix", "blacktop"],
    "demo": ["demolition", "tearout", "removal"],
    "haul": ["trucking", "hauling", "transport"],
    "mudding": ["drywall finishing", "taping", "joint compound"],
    "framing": ["wood framing", "metal framing", "stud work"],
  };

  const lowerTerm = term.toLowerCase();
  const foundSynonyms: string[] = [];

  for (const [key, synonyms] of Object.entries(synonymMap)) {
    if (lowerTerm.includes(key)) {
      foundSynonyms.push(...synonyms);
    }
    for (const synonym of synonyms) {
      if (lowerTerm.includes(synonym)) {
        foundSynonyms.push(key);
        break;
      }
    }
  }

  return Array.from(new Set(foundSynonyms));
}

export async function migrateRateTableDataToItems(rateTableId?: number): Promise<{
  created: number;
  errors: string[];
}> {
  const tables = rateTableId 
    ? await db.select().from(rateTables).where(eq(rateTables.id, rateTableId))
    : await db.select().from(rateTables);

  let created = 0;
  const errors: string[] = [];

  for (const table of tables) {
    try {
      const data = table.data as any;
      if (!data || !Array.isArray(data.items || data.rates || data)) {
        continue;
      }

      const items = data.items || data.rates || data;

      for (const item of items) {
        if (!item.description || !item.rate) continue;

        await db.insert(rateItems).values({
          rateTableId: table.id,
          type: table.type,
          description: item.description || item.name || "",
          classification: item.classification || item.category || null,
          unit: item.unit || "hour",
          rate: String(item.rate),
          overtimeRate: item.overtimeRate ? String(item.overtimeRate) : null,
          effectiveDate: table.effectiveDate,
          region: table.region,
          companyId: table.companyId,
          isActive: true,
        });

        created++;
      }
    } catch (error) {
      errors.push(`Table ${table.id}: ${error}`);
    }
  }

  return { created, errors };
}
