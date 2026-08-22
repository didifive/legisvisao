import { db } from "@/lib/db";

interface ServerCacheEntry<T> {
  data: T;
  cachedAt: number;
  datasetVersion: string | null;
}

// Armazenamento em memória no servidor (BFF)
const memoryCache = new Map<string, ServerCacheEntry<unknown>>();

let lastVersionCheck = 0;
let cachedDatasetVersion: string | null = null;

const isDev = process.env.NODE_ENV === "development";

// Checa o banco com intervalo ágil: 10s em dev ou 30s em produção (<1ms de query)
const VERSION_CHECK_INTERVAL_MS = isDev ? 10 * 1000 : 30 * 1000;
// TTL máximo para expiração em memória
const CACHE_TTL_MS = isDev ? 60 * 1000 : 5 * 60 * 1000;

/**
 * Obtém a versão ativa do dataset na tabela sync_control com intervalo de 15 minutos
 */
export async function getActiveDatasetVersion(): Promise<string | null> {
  const now = Date.now();
  if (cachedDatasetVersion && now - lastVersionCheck < VERSION_CHECK_INTERVAL_MS) {
    return cachedDatasetVersion;
  }

  try {
    const result = await db`
      SELECT dataset_version, MAX(last_sync) as latest
      FROM sync_control
      WHERE dataset_version IS NOT NULL
      GROUP BY dataset_version
      ORDER BY MAX(last_sync) DESC
      LIMIT 1;
    `;
    if (result && result.length > 0 && result[0].dataset_version) {
      cachedDatasetVersion = result[0].dataset_version;
    } else {
      const fallbackRes = await db`SELECT MAX(last_sync) as latest FROM sync_control;`;
      cachedDatasetVersion = fallbackRes[0]?.latest ? new Date(fallbackRes[0].latest).toISOString() : "v1";
    }
    lastVersionCheck = now;
    return cachedDatasetVersion;
  } catch (error) {
    console.error("[ServerCache] Erro ao consultar dataset_version:", error);
    return cachedDatasetVersion || "fallback";
  }
}

/**
 * Invalida todo o cache em memória do servidor
 */
export function clearServerCache(): void {
  memoryCache.clear();
  cachedDatasetVersion = null;
  lastVersionCheck = 0;
}

/**
 * Cache Inteligente no Servidor/BFF (Intervalo de 15 minutos)
 */
export async function withServerCache<T>(
  cacheKey: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const currentVersion = await getActiveDatasetVersion();
  const entry = memoryCache.get(cacheKey) as ServerCacheEntry<T> | undefined;

  // Se o cache existir, pertencer à versão atual e não tiver expirado pelo TTL de 15 min
  if (
    entry &&
    entry.datasetVersion === currentVersion &&
    now - entry.cachedAt < CACHE_TTL_MS
  ) {
    return entry.data;
  }

  // Se expirou ou não existe no cache, executa fetcher
  const freshData = await fetcher();

  memoryCache.set(cacheKey, {
    data: freshData,
    cachedAt: now,
    datasetVersion: currentVersion,
  });

  return freshData;
}
