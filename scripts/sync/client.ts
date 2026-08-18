import postgres from "postgres";
import * as dotenv from "dotenv";
import * as path from "node:path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

export interface SyncResult {
  source: string;
  name: string;
  officialUrl: string;
  recordsCount: number;
  recordsUpdated?: number;
  recordsInserted?: number;
  datasetVersion?: string | null;
  status: "SUCCESS" | "FAILED" | "PENDING";
  error?: string;
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL não configurada no ambiente nem no arquivo .env.local.");
}

export const sql = postgres(connectionString, {
  prepare: false,
  max: 10,
  idle_timeout: 20,
  connect_timeout: 30,
});

export const CAMARA_API_BASE = "https://dadosabertos.camara.leg.br/api/v2";
export const SENADO_API_BASE = "https://legis.senado.leg.br/dadosabertos";

export const DEFAULT_HEADERS = {
  Accept: "application/json",
  "User-Agent": "LegisVisao/1.0 (https://legisvisao.com.br; luis@zancanela.dev.br)",
};

export async function fetchWithRetry(url: string, maxRetries = 3, delayMs = 1000): Promise<Response> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, { headers: DEFAULT_HEADERS, keepalive: true });
      if (res.ok) return res;
      if (attempt === maxRetries) return res;
    } catch (err) {
      if (attempt === maxRetries) throw err;
    }
    await new Promise((r) => setTimeout(r, delayMs * attempt));
  }
  throw new Error(`Falha de conexão com a API externa: ${url}`);
}

/**
 * Executa tarefas assíncronas com concorrência controlada para evitar sobrecarregar APIs públicas.
 */
export async function mapConcurrent<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) return [];
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < items.length) {
      const idx = currentIndex++;
      results[idx] = await fn(items[idx], idx);
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  const workers = Array.from({ length: workerCount }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * Consome múltiplos resultados paginados da API da Câmara seguindo links HATEOAS (rel: "next").
 */
export async function fetchCamaraPaginated<T>(
  initialUrl: string,
  maxPages = 2
): Promise<T[]> {
  const allItems: T[] = [];
  let nextUrl: string | null = initialUrl;
  let pageCount = 0;

  while (nextUrl && pageCount < maxPages) {
    pageCount++;
    try {
      const res = await fetchWithRetry(nextUrl, 2, 500);
      if (!res.ok) break;
      const data = await res.json();
      const items: T[] = data.dados || [];
      allItems.push(...items);

      const nextLink = Array.isArray(data.links)
        ? data.links.find((l: { rel?: string; href?: string }) => l.rel === "next")
        : null;

      nextUrl = nextLink?.href || null;
    } catch (err) {
      console.warn(`[API Câmara] Aviso na paginação HATEOAS (${nextUrl}):`, err);
      break;
    }
  }

  return allItems;
}

export async function updateSyncStatus(result: SyncResult): Promise<void> {
  await sql`
    INSERT INTO sync_control (
      source, name, official_url, last_sync, last_successful_sync,
      status, records_count, records_updated, records_inserted,
      dataset_version, last_error
    )
    VALUES (
      ${result.source},
      ${result.name},
      ${result.officialUrl},
      NOW(),
      ${result.status === "SUCCESS" ? sql`NOW()` : null},
      ${result.status},
      ${result.recordsCount},
      ${result.recordsUpdated || 0},
      ${result.recordsInserted || 0},
      ${result.datasetVersion || null},
      ${result.error || null}
    )
    ON CONFLICT (source) DO UPDATE SET
      name = EXCLUDED.name,
      official_url = EXCLUDED.official_url,
      last_sync = NOW(),
      last_successful_sync = CASE WHEN EXCLUDED.status = 'SUCCESS' THEN NOW() ELSE sync_control.last_successful_sync END,
      status = EXCLUDED.status,
      records_count = EXCLUDED.records_count,
      records_updated = EXCLUDED.records_updated,
      records_inserted = EXCLUDED.records_inserted,
      dataset_version = COALESCE(EXCLUDED.dataset_version, sync_control.dataset_version),
      last_error = EXCLUDED.last_error;
  `;
}

export async function getCurrentDatasetVersion(): Promise<string | null> {
  const rows = await sql`
    SELECT dataset_version FROM sync_control 
    WHERE dataset_version IS NOT NULL 
    ORDER BY last_sync DESC LIMIT 1
  `;
  return rows.length > 0 ? rows[0].dataset_version : null;
}
