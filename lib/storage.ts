// ====================================================================
// LegisVisão - Armazenamento de Opiniões do Visitante (localStorage)
// Suporte a Opiniões Gerais (Projetos) e Granulares (Destaques e Emendas)
// Retrocompatibilidade Estrita com Versão 1
// ====================================================================

export interface StoredAnswers {
  [projectId: number]: "CONCORDO" | "DISCORDO";
}

export interface StoredGranularAnswers {
  [sessionId: string]: "CONCORDO" | "DISCORDO";
}

export interface StoredOpinionsExport {
  app: "LegisVisão";
  version: 1 | 2;
  exportedAt: string;
  totalOpinions: number;
  answers: StoredAnswers;
  granularAnswers?: StoredGranularAnswers;
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
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// --------------------------------------------------------------------
// Validação e Importação Retrocompatível (v1 e v2)
// --------------------------------------------------------------------

export async function parseAndValidateAnswersFile(
  file: File
): Promise<{
  answers: StoredAnswers;
  granularAnswers: StoredGranularAnswers;
  total: number;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        let parsed: unknown;
        try {
          parsed = JSON.parse(content);
        } catch {
          throw new Error("O arquivo selecionado não é um JSON válido.");
        }

        const obj = parsed as Record<string, unknown>;
        if (
          !obj ||
          obj.app !== "LegisVisão" ||
          (obj.version !== 1 && obj.version !== 2) ||
          typeof obj.answers !== "object" ||
          obj.answers === null ||
          Array.isArray(obj.answers)
        ) {
          throw new Error(
            "Arquivo inválido. O arquivo deve ser um JSON compatível exportado pelo LegisVisão."
          );
        }

        // 1. Normalizar Respostas Gerais (answers)
        const rawAnswers = obj.answers as Record<string, unknown>;
        const normalizedAnswers: StoredAnswers = {};

        for (const [key, val] of Object.entries(rawAnswers)) {
          const id = Number(key);
          if (!Number.isNaN(id) && typeof val === "string") {
            const vUpper = val.toUpperCase();
            if (vUpper === "CONCORDO" || vUpper === "SIM") {
              normalizedAnswers[id] = "CONCORDO";
            } else if (vUpper === "DISCORDO" || vUpper === "NAO" || vUpper === "NÃO") {
              normalizedAnswers[id] = "DISCORDO";
            }
          }
        }

        // 2. Normalizar Respostas Granulares (granularAnswers se v2)
        const normalizedGranular: StoredGranularAnswers = {};
        if (
          obj.version === 2 &&
          typeof obj.granularAnswers === "object" &&
          obj.granularAnswers !== null &&
          !Array.isArray(obj.granularAnswers)
        ) {
          const rawGranular = obj.granularAnswers as Record<string, unknown>;
          for (const [key, val] of Object.entries(rawGranular)) {
            if (typeof key === "string" && typeof val === "string") {
              const vUpper = val.toUpperCase();
              if (vUpper === "CONCORDO" || vUpper === "SIM") {
                normalizedGranular[key] = "CONCORDO";
              } else if (vUpper === "DISCORDO" || vUpper === "NAO" || vUpper === "NÃO") {
                normalizedGranular[key] = "DISCORDO";
              }
            }
          }
        }

        const total =
          Object.keys(normalizedAnswers).length +
          Object.keys(normalizedGranular).length;

        if (total === 0) {
          throw new Error("O arquivo não contém nenhuma opinião válida para importar.");
        }

        resolve({
          answers: normalizedAnswers,
          granularAnswers: normalizedGranular,
          total,
        });
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Erro ao validar o arquivo de opiniões.";
        reject(new Error(message));
      }
    };

    reader.onerror = () => reject(new Error("Erro ao ler o arquivo no dispositivo."));
    reader.readAsText(file);
  });
}

export async function importAnswersFromJson(
  file: File,
  onSuccess?: (total: number) => void,
  onError?: (msg: string) => void
): Promise<void> {
  try {
    const { answers, granularAnswers, total } = await parseAndValidateAnswersFile(file);
    saveStoredAnswers(answers);
    saveStoredGranularAnswers(granularAnswers);
    if (onSuccess) onSuccess(total);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Erro ao importar arquivo de opiniões.";
    if (onError) onError(message);
    else alert(`Erro: ${message}`);
  }
}
