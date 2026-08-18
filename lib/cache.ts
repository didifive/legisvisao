// ====================================================================
// LegisVisão - Cache do Cliente (SessionStorage + TTL de 3 Minutos)
// ====================================================================

const CACHE_VERSION_KEY = "legisvisao_dataset_version";
const CACHE_TIMESTAMP_KEY = "legisvisao_version_check_ts";

// TTL do cache no frontend: 3 minutos (180.000 ms)
export const CLIENT_CACHE_TTL_MS = 3 * 60 * 1000;

interface CachedSessionItem<T> {
  data: T;
  cachedAt: number;
}

/**
 * Obtém a versão do dataset gravada na sessão do navegador
 */
export function getLocalDatasetVersion(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(CACHE_VERSION_KEY);
  } catch {
    return null;
  }
}

/**
 * Grava a versão do dataset na sessão do navegador
 */
export function setLocalDatasetVersion(version: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(CACHE_VERSION_KEY, version);
    sessionStorage.setItem(CACHE_TIMESTAMP_KEY, String(Date.now()));
  } catch {
    // quota de sessionStorage
  }
}

/**
 * Valida a versão remota do dataset via /api/metadata com intervalo de 3 minutos.
 * Se a versão mudou, limpa todo o sessionStorage de dados de consulta.
 */
export async function validateDatasetVersion(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  try {
    const lastCheck = Number(sessionStorage.getItem(CACHE_TIMESTAMP_KEY) || 0);
    const now = Date.now();

    // Se checou há menos de 3 minutos, usa a versão local em cache
    if (now - lastCheck < CLIENT_CACHE_TTL_MS) {
      return getLocalDatasetVersion();
    }

    const res = await fetch("/api/metadata");
    if (!res.ok) return null;
    const metadata = await res.json();
    const remoteVersion = metadata?.datasetVersion;

    if (remoteVersion) {
      const localVersion = getLocalDatasetVersion();
      if (localVersion && localVersion !== remoteVersion) {
        console.log("[ClientCache] Nova versão do dataset detectada:", remoteVersion, "(anterior:", localVersion, "). Limpando sessionStorage...");
        sessionStorage.clear();
      }
      setLocalDatasetVersion(remoteVersion);
    }

    return remoteVersion || null;
  } catch (err) {
    console.warn("[ClientCache] Não foi possível validar versão remota do dataset:", err);
    return null;
  }
}

/**
 * Cache de consulta em SessionStorage para chamadas públicas com TTL de 3 minutos:
 * - SessionStorage isola dados de consulta e não polui o localStorage.
 * - localStorage é reservado EXCLUSIVAMENTE para as respostas e opiniões do usuário.
 */
export async function cachedSessionFetch<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  if (typeof window === "undefined") {
    return await fetcher();
  }

  const sessionKey = `lv_cache_${key}`;
  const now = Date.now();

  // 1. Tenta recuperar do sessionStorage e validar o TTL de 3 minutos
  try {
    const raw = sessionStorage.getItem(sessionKey);
    if (raw) {
      const parsed = JSON.parse(raw) as CachedSessionItem<T>;
      if (parsed && typeof parsed.cachedAt === "number") {
        if (now - parsed.cachedAt < CLIENT_CACHE_TTL_MS) {
          return parsed.data;
        }
      } else {
        // Formato legado sem timestamp
        return raw as unknown as T;
      }
    }
  } catch {
    // sessionStorage indisponível ou corrompido
  }

  // 2. Busca dados frescos
  const data = await fetcher();

  // 3. Grava no sessionStorage com timestamp de expiração
  try {
    const itemToStore: CachedSessionItem<T> = {
      data,
      cachedAt: now,
    };
    sessionStorage.setItem(sessionKey, JSON.stringify(itemToStore));
  } catch {
    // Ignora quota de sessionStorage
  }

  return data;
}

export const cachedFetch = cachedSessionFetch;
