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

// Checa o banco com intervalo de 10 minutos em produção (ou 10s em desenvolvimento)
const VERSION_CHECK_INTERVAL_MS = isDev ? 10 * 1000 : 10 * 60 * 1000;
// Em memória os dados persistem enquanto a versão for válida (sem expiração por tempo forçada em produção)
const CACHE_TTL_MS = isDev ? 60 * 1000 : Number.POSITIVE_INFINITY;

/**
 * Obtém a versão ativa do dataset na tabela sync_control com intervalo de 10 minutos
 */
export async function getActiveDatasetVersion(): Promise<string | null> {
  const now = Date.now();
  if (cachedDatasetVersion && now - lastVersionCheck < VERSION_CHECK_INTERVAL_MS) {
    return cachedDatasetVersion;
  }

  try {
    const result = await db`
      SELECT dataset_version
      FROM sync_control
      WHERE dataset_version IS NOT NULL
      ORDER BY last_sync DESC
      LIMIT 1;
    `;
    if (result && result.length > 0 && result[0].dataset_version) {
      cachedDatasetVersion = result[0].dataset_version;
    } else {
      cachedDatasetVersion = "v1";
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

  // Se expirou ou não existe no cache, tenta buscar dados atualizados
  try {
    const freshData = await fetcher();

    memoryCache.set(cacheKey, {
      data: freshData,
      cachedAt: now,
      datasetVersion: currentVersion,
    });

    return freshData;
  } catch (fetchError) {
    // Se o banco estiver fora do ar ou a consulta falhar, usa o cache existente (stale-if-error)
    if (entry) {
      console.warn(`[ServerCache] Banco indisponível ao atualizar "${cacheKey}". Servindo dados em cache.`);
      return entry.data;
    }
    throw fetchError;
  }
}
