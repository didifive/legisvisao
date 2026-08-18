import { db } from "@/lib/db";

interface ServerCacheEntry<T> {
  data: T;
  cachedAt: number;
  datasetVersion: string | null;
}

// Armazenamento em memória no servidor (BFF)
// Pode permanecer em memória: Projetos, Representantes, Partidos, Metadados, Status
// Não deve permanecer em memória: Sessões de usuário, Opiniões de visitantes, Resultados personalizados
const memoryCache = new Map<string, ServerCacheEntry<unknown>>();

let lastVersionCheck = 0;
let cachedDatasetVersion: string | null = null;
const VERSION_CHECK_INTERVAL_MS = 10000; // Checa o DB a cada 10s no máximo

/**
 * Obtém a versão ativa do dataset na tabela sync_control
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
      // Fallback para timestamp mais recente se não houver version explícita
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
}

/**
 * Cache Inteligente no Servidor/BFF:
 * - Mantém dados públicos em memória.
 * - Invalida estritamente quando dataset_version mudar no banco (nunca invalida apenas por tempo).
 */
export async function withServerCache<T>(
  cacheKey: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const currentVersion = await getActiveDatasetVersion();
  const entry = memoryCache.get(cacheKey) as ServerCacheEntry<T> | undefined;

  // Se o cache existir e pertencer à versão atual do dataset, retorna imediatamente
  if (entry && entry.datasetVersion === currentVersion) {
    return entry.data;
  }

  // Se mudou a versão ou não existe no cache, executa fetcher
  const freshData = await fetcher();

  memoryCache.set(cacheKey, {
    data: freshData,
    cachedAt: Date.now(),
    datasetVersion: currentVersion,
  });

  return freshData;
}
