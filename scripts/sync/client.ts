import postgres from "postgres";
import * as dotenv from "dotenv";
import * as path from "node:path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

export interface SyncControlUpdate {
  source?: string;
  name?: string;
  officialUrl?: string;
  totalDeputies?: number;
  totalPropositions?: number;
  totalVoteSessions?: number;
  totalVotes?: number;
  datasetVersion?: string | null;
  status: "SUCCESS" | "FAILED" | "RUNNING" | "PENDING";
  error?: string | null;
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL não configurada no ambiente nem no arquivo .env.local.");
}

export const sql = postgres(connectionString, {
  prepare: false,
  max: 15,
  idle_timeout: 30,
  connect_timeout: 30,
  transform: {
    undefined: null,
  },
});

export const CAMARA_API_BASE = "https://dadosabertos.camara.leg.br/api/v2";

export const DEFAULT_HEADERS = {
  Accept: "application/json",
  "User-Agent": "LegisVisao/1.0 (https://legisvisao.com.br; contato@legisvisao.com.br)",
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
 * Executa tarefas assíncronas com concorrência controlada para respeitar o rate-limit da Câmara.
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
 * Divide um array em lotes (chunks) de tamanho fixo para inserções em massa.
 */
export function chunkArray<T>(items: T[], size: number): T[][] {
  if (items.length === 0) return [];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export async function updateSyncStatus(data: SyncControlUpdate): Promise<void> {
  const nowUtc = new Date().toISOString();
  const source = data.source || "CAMARA";
  const name = data.name || "Câmara dos Deputados (Dados Abertos)";
  const officialUrl = data.officialUrl || "https://dadosabertos.camara.leg.br";

  await sql`
    INSERT INTO sync_control (
      source, name, official_url, last_sync, last_successful_sync,
      status, total_deputies, total_propositions, total_vote_sessions,
      total_votes, dataset_version, last_error
    )
    VALUES (
      ${source},
      ${name},
      ${officialUrl},
      ${nowUtc}::timestamptz,
      ${data.status === "SUCCESS" ? nowUtc : null}::timestamptz,
      ${data.status},
      ${data.totalDeputies || 0},
      ${data.totalPropositions || 0},
      ${data.totalVoteSessions || 0},
      ${data.totalVotes || 0},
      ${data.datasetVersion || null},
      ${data.error || null}
    )
    ON CONFLICT (source) DO UPDATE SET
      name = EXCLUDED.name,
      official_url = EXCLUDED.official_url,
      last_sync = EXCLUDED.last_sync,
      last_successful_sync = CASE WHEN EXCLUDED.status = 'SUCCESS' THEN EXCLUDED.last_successful_sync ELSE sync_control.last_successful_sync END,
      status = EXCLUDED.status,
      total_deputies = EXCLUDED.total_deputies,
      total_propositions = EXCLUDED.total_propositions,
      total_vote_sessions = EXCLUDED.total_vote_sessions,
      total_votes = EXCLUDED.total_votes,
      dataset_version = COALESCE(EXCLUDED.dataset_version, sync_control.dataset_version),
      last_error = EXCLUDED.last_error;
  `;
}

export async function getCurrentDatasetVersion(): Promise<string | null> {
  const rows = await sql`
    SELECT dataset_version FROM sync_control 
    WHERE source = 'CAMARA' AND dataset_version IS NOT NULL 
    LIMIT 1
  `;
  return rows.length > 0 ? rows[0].dataset_version : null;
}
