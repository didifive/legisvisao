// ====================================================================
// LegisVisão - Cache do Cliente (SessionStorage + Validação de Versão)
// ====================================================================

const CACHE_VERSION_KEY = "legisvisao_dataset_version";

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
  } catch {
    // quota de sessionStorage
  }
}

/**
 * Valida a versão remota do dataset via /api/metadata.
 * Se a versão mudou, limpa todo o sessionStorage de dados de consulta.
 */
export async function validateDatasetVersion(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  try {
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
 * Cache de consulta em SessionStorage para chamadas públicas:
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

  // 1. Tenta recuperar do sessionStorage
  try {
    const raw = sessionStorage.getItem(sessionKey);
    if (raw) {
      return JSON.parse(raw) as T;
    }
  } catch {
    // sessionStorage indisponível ou corrompido
  }

  // 2. Busca dados frescos
  const data = await fetcher();

  // 3. Grava no sessionStorage
  try {
    sessionStorage.setItem(sessionKey, JSON.stringify(data));
  } catch {
    // Ignora quota de sessionStorage
  }

  return data;
}

// Alias de retrocompatibilidade
export const cachedFetch = cachedSessionFetch;
