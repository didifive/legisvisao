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
const MIGRATION_V3_KEY = "legisvisao_migration_v3_done";

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

export function removeStoredGranularAnswer(sessionId: string): void {
  const current = getStoredGranularAnswers();
  if (sessionId in current) {
    const { [sessionId]: _, ...rest } = current;
    saveStoredGranularAnswers(rest);
  }
}

// --------------------------------------------------------------------
// Contadores e Limpeza
// --------------------------------------------------------------------

export function getStoredAnswersCount(): number {
  const generalCount = Object.keys(getStoredAnswers()).length;
  const granularCount = Object.keys(getStoredGranularAnswers()).length;
  return generalCount + granularCount;
}

export function getStoredGeneralAnswersCount(): number {
  return Object.keys(getStoredAnswers()).length;
}

export function getStoredGranularAnswersCount(): number {
  return Object.keys(getStoredGranularAnswers()).length;
}

export function clearStoredAnswers(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(GRANULAR_STORAGE_KEY);
  window.dispatchEvent(new Event("storage-answers-updated"));
}

// --------------------------------------------------------------------
// Migração v3: Opiniões por proposicao_id → votacao_id (Seção)
// --------------------------------------------------------------------

/**
 * Verifica se a migração automática de opiniões v2 → v3 já foi executada.
 */
export function isMigrationV3Done(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(MIGRATION_V3_KEY) === "true";
}

/**
 * Reseta o flag de migração v3 para forçar re-execução.
 * Utilizado quando o usuário importa um arquivo v1/v2 que contém
 * opiniões no formato antigo (por proposicao_id) que precisam ser
 * convertidas para o formato granular (por votacao_id).
 */
export function resetMigrationV3Flag(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(MIGRATION_V3_KEY);
}

/**
 * Migra opiniões armazenadas no formato legado (por proposicao_id)
 * para o formato granular (por votacao_id da seção de votação).
 *
 * Requer um mapeamento proposicao_id → votacao_id fornecido pelo
 * componente que possui os dados das proposições carregadas da API.
 *
 * A migração é idempotente: não sobrescreve opiniões granulares
 * já existentes e marca-se como concluída após a primeira execução.
 *
 * @param propositionToSessionMap Mapa { proposicao_id: votacao_id }
 * @returns Contagem de opiniões migradas e ignoradas
 */
export function migrateStoredAnswersToGranular(
  propositionToSessionMap: Record<number, string>
): { migrated: number; skipped: number } {
  if (typeof window === "undefined") return { migrated: 0, skipped: 0 };

  if (isMigrationV3Done()) {
    return { migrated: 0, skipped: 0 };
  }

  const oldAnswers = getStoredAnswers();
  const existingGranular = getStoredGranularAnswers();
  let migrated = 0;
  let skipped = 0;

  for (const [propIdStr, opinion] of Object.entries(oldAnswers)) {
    const propId = Number(propIdStr);
    const sessionId = propositionToSessionMap[propId];

    if (sessionId && !(sessionId in existingGranular)) {
      existingGranular[sessionId] = opinion;
      migrated++;
    } else if (!sessionId) {
      skipped++;
    }
    // Se já existe em granular, não sobrescreve (preserva opinião mais recente)
  }

  if (migrated > 0) {
    saveStoredGranularAnswers(existingGranular);
  }

  // Marca migração como concluída mesmo se houve skipped
  // (proposições sem sessão mapeada não devem bloquear a migração)
  localStorage.setItem(MIGRATION_V3_KEY, "true");

  return { migrated, skipped };
}

// --------------------------------------------------------------------
// Exportação para Arquivo JSON (Formato v2)
// --------------------------------------------------------------------

export function exportAnswersToJson(): void {
  if (typeof window === "undefined") return;
  const answers = getStoredAnswers();
  const granularAnswers = getStoredGranularAnswers();
  const generalCount = Object.keys(answers).length;
  const granularCount = Object.keys(granularAnswers).length;
  const total = generalCount + granularCount;

  if (total === 0) {
    alert("Você ainda não registrou nenhuma opinião para exportar.");
    return;
  }

  const exportData: StoredOpinionsExport = {
    app: "LegisVisão",
    version: 2,
    exportedAt: new Date().toISOString(),
    totalOpinions: total,
    answers,
    granularAnswers,
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

  const total =
    Object.keys(normalizedAnswers).length +
    Object.keys(normalizedGranular).length;

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

    // Salvar respostas gerais legadas (v1/v2) para migração posterior
    if (Object.keys(answers).length > 0) {
      saveStoredAnswers(answers);
      // Resetar flag de migração para que as opiniões legadas importadas
      // sejam convertidas para o formato granular na próxima carga de dados
      resetMigrationV3Flag();
    }

    // Salvar respostas granulares diretamente (v2/v3)
    if (Object.keys(granularAnswers).length > 0) {
      const existingGranular = getStoredGranularAnswers();
      const merged = { ...existingGranular, ...granularAnswers };
      saveStoredGranularAnswers(merged);
    }

    if (onSuccess) onSuccess(total);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Erro ao importar arquivo de opiniões.";
    if (onError) onError(message);
    else alert(`Erro: ${message}`);
  }
}
