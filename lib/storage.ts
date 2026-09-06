// ====================================================================
// LegisVisão - Armazenamento de Opiniões do Visitante (localStorage)
// Suporte a Opiniões Gerais (Projetos) e Granulares (Seções de Votação)
// Retrocompatibilidade Estrita com Versões 1, 2 e 3
// ====================================================================

export type UserVote = "CONCORDO" | "DISCORDO";

export interface StoredAnswers {
  [projectId: number | string]: UserVote;
}

export interface StoredGranularAnswers {
  [sessionId: string]: UserVote;
}

export interface StoredOpinionsExport {
  app: "LegisVisão";
  version: 1 | 2 | 3;
  exportedAt: string;
  totalOpinions: number;
  answers?: StoredAnswers;
  granularAnswers?: StoredGranularAnswers;
  sessionToProposition?: Record<string, number>;
}

const STORAGE_KEY = "legisvisao_user_opinions";
const GRANULAR_STORAGE_KEY = "legisvisao_user_granular_opinions";

// --------------------------------------------------------------------
// Opiniões Gerais sobre Projetos de Lei
// --------------------------------------------------------------------

export function getStoredAnswers(): StoredAnswers {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.error("Erro ao ler opiniões do localStorage:", error);
    return {};
  }
}

export function saveStoredAnswers(answers: StoredAnswers): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
  window.dispatchEvent(new Event("storage-answers-updated"));
}

// --------------------------------------------------------------------
// Opiniões Granulares sobre Destaques e Emendas Específicas
// --------------------------------------------------------------------

export function getStoredGranularAnswers(): StoredGranularAnswers {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(GRANULAR_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.error("Erro ao ler opiniões granulares do localStorage:", error);
    return {};
  }
}

export function saveStoredGranularAnswers(granular: StoredGranularAnswers): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(GRANULAR_STORAGE_KEY, JSON.stringify(granular));
  window.dispatchEvent(new Event("storage-answers-updated"));
}

export function saveStoredGranularAnswer(
  sessionId: string,
  opinion: "CONCORDO" | "DISCORDO"
): void {
  const current = getStoredGranularAnswers();
  const updated = { ...current, [sessionId]: opinion };
  saveStoredGranularAnswers(updated);
}

export function removeStoredAnswer(projectId: number | string): void {
  const current = getStoredAnswers();
  const idNum = Number(projectId);
  const idStr = String(projectId);
  if (idNum in current || idStr in current) {
    const copy = { ...current };
    delete copy[idNum];
    delete copy[idStr];
    saveStoredAnswers(copy);
  }
}

export function removeStoredGranularAnswer(sessionId: string, propositionId?: number | string): void {
  const currentGranular = getStoredGranularAnswers();
  let hasGranularChanges = false;
  const nextGranular = { ...currentGranular };

  if (sessionId in nextGranular) {
    delete nextGranular[sessionId];
    hasGranularChanges = true;
  }

  if (propositionId !== undefined) {
    const propKey = String(propositionId);
    if (propKey in nextGranular) {
      delete nextGranular[propKey];
      hasGranularChanges = true;
    }
  }

  if (hasGranularChanges) {
    saveStoredGranularAnswers(nextGranular);
  }

  // Limpa também do armazenamento legado se presente
  if (propositionId !== undefined) {
    removeStoredAnswer(propositionId);
  }
  const currentLegacy = getStoredAnswers();
  if (sessionId in currentLegacy || Number(sessionId) in currentLegacy) {
    removeStoredAnswer(sessionId);
  }
}

// --------------------------------------------------------------------
// Contadores e Limpeza
// --------------------------------------------------------------------

/**
 * Calcula a contagem de opiniões únicas e válidas, impedindo que propostas
 * registradas no formato legado sejam somadas em duplicidade com sessões granulares.
 */
export function calculateUniqueOpinionsCount(
  answers: StoredAnswers,
  granular: StoredGranularAnswers,
  validSessionIds?: Set<string>
): number {
  const representedPropIds = new Set<string>();
  let granularCount = 0;

  for (const key of Object.keys(granular)) {
    if (validSessionIds && !validSessionIds.has(key)) {
      continue;
    }
    granularCount++;
    const prefix = key.split("-")[0];
    representedPropIds.add(prefix);
    representedPropIds.add(key);
  }

  let generalCount = 0;
  for (const propId of Object.keys(answers)) {
    if (!representedPropIds.has(String(propId))) {
      generalCount++;
    }
  }

  return granularCount + generalCount;
}

export function getStoredAnswersCount(validSessionIds?: Set<string>): number {
  return calculateUniqueOpinionsCount(
    getStoredAnswers(),
    getStoredGranularAnswers(),
    validSessionIds
  );
}

function filterValidGranularAnswers(
  currentGranular: StoredGranularAnswers,
  validSessionIds: Set<string>
): { nextGranular: StoredGranularAnswers; removed: string[] } {
  const nextGranular: StoredGranularAnswers = {};
  const removed: string[] = [];

  for (const [sId, opinion] of Object.entries(currentGranular)) {
    if (validSessionIds.has(sId)) {
      nextGranular[sId] = opinion;
    } else {
      removed.push(sId);
    }
  }

  return { nextGranular, removed };
}

function migrateLegacyToGranular(
  currentLegacy: StoredAnswers,
  validSessionIds: Set<string>,
  nextGranular: StoredGranularAnswers,
  propositionToSessionMap?: Record<number, string>
): { migrated: number; remainingLegacy: StoredAnswers } {
  let migrated = 0;
  const remainingLegacy: StoredAnswers = {};

  for (const [propIdStr, opinion] of Object.entries(currentLegacy)) {
    const propId = Number(propIdStr);
    const targetSessionId =
      propositionToSessionMap?.[propId] ?? (validSessionIds.has(propIdStr) ? propIdStr : undefined);

    if (targetSessionId && validSessionIds.has(targetSessionId)) {
      if (!nextGranular[targetSessionId]) {
        nextGranular[targetSessionId] = opinion;
        migrated++;
      }
    } else if (!targetSessionId) {
      remainingLegacy[propIdStr] = opinion;
    }
  }

  return { migrated, remainingLegacy };
}

function persistSanitizationChanges(
  nextGranular: StoredGranularAnswers,
  remainingLegacy: StoredAnswers,
  currentGranular: StoredGranularAnswers,
  currentLegacy: StoredAnswers,
  hasRemovalsOrMigrations: boolean
): void {
  const hasGranularChanged =
    hasRemovalsOrMigrations ||
    Object.keys(nextGranular).length !== Object.keys(currentGranular).length;

  const hasLegacyChanged = Object.keys(remainingLegacy).length !== Object.keys(currentLegacy).length;

  if (hasGranularChanged) {
    localStorage.setItem(GRANULAR_STORAGE_KEY, JSON.stringify(nextGranular));
  }

  if (hasLegacyChanged) {
    if (Object.keys(remainingLegacy).length === 0) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(remainingLegacy));
    }
  }

  if (hasGranularChanged || hasLegacyChanged) {
    window.dispatchEvent(new Event("storage-answers-updated"));
  }
}

/**
 * Higieniza, converte e consolida o armazenamento local:
 * 1. Converte automaticamente quaisquer opiniões legadas de 'answers' (por proposicao_id)
 *    para o formato canônico 'granularAnswers' (por votacao_id da sessão nominal),
 *    eliminando duplicatas e débitos técnicos de versões legadas.
 * 2. Expulga do 'granularAnswers' votos em sessões simbólicas que não possuem votação nominal.
 * 3. Remove de 'answers' as opiniões que já foram migradas ou que sejam conhecidas,
 *    garantindo que o sistema passe a rodar 100% sobre o formato canônico.
 *
 * @param validSessionIds Conjunto de IDs de sessões de votação nominais válidas
 * @param propositionToSessionMap Mapeamento opcional proposicao_id -> votacao_id (sessão principal)
 */
export function sanitizeStoredAnswers(
  validSessionIds: Set<string>,
  propositionToSessionMap?: Record<number, string>
): { removed: string[]; migrated: number } {
  if (typeof window === "undefined" || !validSessionIds || validSessionIds.size === 0) {
    return { removed: [], migrated: 0 };
  }

  const currentGranular = getStoredGranularAnswers();
  const currentLegacy = getStoredAnswers();

  const { nextGranular, removed } = filterValidGranularAnswers(currentGranular, validSessionIds);
  const { migrated, remainingLegacy } = migrateLegacyToGranular(
    currentLegacy,
    validSessionIds,
    nextGranular,
    propositionToSessionMap
  );

  persistSanitizationChanges(
    nextGranular,
    remainingLegacy,
    currentGranular,
    currentLegacy,
    removed.length > 0 || migrated > 0
  );

  return { removed, migrated };
}

export function clearStoredAnswers(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(GRANULAR_STORAGE_KEY);
  window.dispatchEvent(new Event("storage-answers-updated"));
}

/**
 * Aplica respostas importadas (legadas e/ou granulares) ao armazenamento local.
 * Suporta modo 'replace' (padrão) e 'merge'.
 */
export function applyImportedAnswers(
  answers?: StoredAnswers,
  granularAnswers?: StoredGranularAnswers,
  mode: "replace" | "merge" = "replace"
): void {
  if (typeof window === "undefined") return;

  if (granularAnswers && Object.keys(granularAnswers).length > 0) {
    if (mode === "merge") {
      const existing = getStoredGranularAnswers();
      saveStoredGranularAnswers({ ...existing, ...granularAnswers });
    } else {
      saveStoredGranularAnswers(granularAnswers);
    }
  }

  if (answers && Object.keys(answers).length > 0) {
    if (mode === "merge") {
      const existing = getStoredAnswers();
      saveStoredAnswers({ ...existing, ...answers });
    } else {
      saveStoredAnswers(answers);
    }
  }
}

// --------------------------------------------------------------------
// Exportação para Arquivo JSON (Formato v3)
// --------------------------------------------------------------------

export function exportAnswersToJson(validSessionIds?: Set<string>): void {
  if (typeof window === "undefined") return;
  const answers = getStoredAnswers();
  const granularAnswers = getStoredGranularAnswers();

  let filteredGranular = granularAnswers;
  if (validSessionIds && validSessionIds.size > 0) {
    filteredGranular = {};
    for (const [key, val] of Object.entries(granularAnswers)) {
      if (validSessionIds.has(key)) {
        filteredGranular[key] = val;
      }
    }
  }

  const total = calculateUniqueOpinionsCount(answers, filteredGranular, validSessionIds);

  if (total === 0) {
    alert("Você ainda não registrou nenhuma opinião para exportar.");
    return;
  }

  const exportData: StoredOpinionsExport = {
    app: "LegisVisão",
    version: 3,
    exportedAt: new Date().toISOString(),
    totalOpinions: total,
    answers,
    granularAnswers: filteredGranular,
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `legisvisao-opinioes-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// --------------------------------------------------------------------
// Validação e Importação Retrocompatível (v1, v2 e v3)
// --------------------------------------------------------------------

function normalizeVoteValue(val: unknown): UserVote | null {
  if (typeof val !== "string") return null;
  const vUpper = val.toUpperCase();
  if (vUpper === "CONCORDO" || vUpper === "SIM") return "CONCORDO";
  if (vUpper === "DISCORDO" || vUpper === "NAO" || vUpper === "NÃO") return "DISCORDO";
  return null;
}

function extractNormalizedAnswers(rawAnswers: unknown): StoredAnswers {
  const normalized: StoredAnswers = {};
  if (typeof rawAnswers !== "object" || rawAnswers === null || Array.isArray(rawAnswers)) {
    return normalized;
  }
  for (const [key, val] of Object.entries(rawAnswers as Record<string, unknown>)) {
    const id = Number(key);
    const vote = normalizeVoteValue(val);
    if (!Number.isNaN(id) && vote) {
      normalized[id] = vote;
    }
  }
  return normalized;
}

function extractNormalizedGranular(rawGranular: unknown): StoredGranularAnswers {
  const normalized: StoredGranularAnswers = {};
  if (typeof rawGranular !== "object" || rawGranular === null || Array.isArray(rawGranular)) {
    return normalized;
  }
  for (const [key, val] of Object.entries(rawGranular as Record<string, unknown>)) {
    const vote = normalizeVoteValue(val);
    if (typeof key === "string" && vote) {
      normalized[key] = vote;
    }
  }
  return normalized;
}

export async function parseAndValidateAnswersFile(
  file: File
): Promise<{
  answers: StoredAnswers;
  granularAnswers: StoredGranularAnswers;
  total: number;
}> {
  let content: string;
  try {
    content = await file.text();
  } catch {
    throw new Error("Erro ao ler o arquivo no dispositivo.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("O arquivo selecionado não é um JSON válido.");
  }

  const obj = (parsed && typeof parsed === "object") ? (parsed as Record<string, unknown>) : null;
  if (
    !obj ||
    obj?.app !== "LegisVisão" ||
    (obj?.version !== 1 && obj?.version !== 2 && obj?.version !== 3)
  ) {
    throw new Error(
      "Arquivo inválido. O arquivo deve ser um JSON compatível exportado pelo LegisVisão."
    );
  }

  const hasAnswers = typeof obj.answers === "object" && obj.answers !== null && !Array.isArray(obj.answers);
  const hasGranular = typeof obj.granularAnswers === "object" && obj.granularAnswers !== null && !Array.isArray(obj.granularAnswers);

  if (!hasAnswers && !hasGranular) {
    throw new Error(
      "Arquivo inválido. O arquivo deve conter opiniões em formato compatível com o LegisVisão."
    );
  }

  const normalizedAnswers = extractNormalizedAnswers(obj.answers);
  const normalizedGranular = extractNormalizedGranular(obj.granularAnswers);

  const total = calculateUniqueOpinionsCount(normalizedAnswers, normalizedGranular);

  if (total === 0) {
    throw new Error("O arquivo não contém nenhuma opinião válida para importar.");
  }

  return {
    answers: normalizedAnswers,
    granularAnswers: normalizedGranular,
    total,
  };
}

export async function importAnswersFromJson(
  file: File,
  onSuccess?: (total: number) => void,
  onError?: (msg: string) => void
): Promise<void> {
  try {
    const { answers, granularAnswers, total } = await parseAndValidateAnswersFile(file);

    applyImportedAnswers(answers, granularAnswers, "merge");

    if (onSuccess) onSuccess(total);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Erro ao importar arquivo de opiniões.";
    if (onError) onError(message);
    else alert(`Erro: ${message}`);
  }
}
