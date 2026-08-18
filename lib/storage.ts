// ====================================================================
// LegisVisão - Armazenamento de Opiniões do Visitante (localStorage)
// ====================================================================

export interface StoredAnswers {
  [projectId: number]: "CONCORDO" | "DISCORDO";
}

export interface StoredOpinionsExport {
  app: "LegisVisão";
  version: 1;
  exportedAt: string;
  totalOpinions: number;
  answers: StoredAnswers;
}

const STORAGE_KEY = "legisvisao_user_opinions";

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

export function getStoredAnswersCount(): number {
  return Object.keys(getStoredAnswers()).length;
}

export function saveStoredAnswers(answers: StoredAnswers): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
  window.dispatchEvent(new Event("storage-answers-updated"));
}

export function clearStoredAnswers(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event("storage-answers-updated"));
}

export function exportAnswersToJson(): void {
  if (typeof window === "undefined") return;
  const answers = getStoredAnswers();
  const count = Object.keys(answers).length;

  if (count === 0) {
    alert("Você ainda não registrou nenhuma opinião para exportar.");
    return;
  }

  const exportData: StoredOpinionsExport = {
    app: "LegisVisão",
    version: 1,
    exportedAt: new Date().toISOString(),
    totalOpinions: count,
    answers,
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

/**
 * Valida o arquivo JSON e extrai as respostas normalizadas sem gravar no localStorage.
 * Lança erro caso o formato seja inválido ou incompatível.
 */
export async function parseAndValidateAnswersFile(
  file: File
): Promise<{ answers: StoredAnswers; total: number }> {
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
          obj.version !== 1 ||
          typeof obj.answers !== "object" ||
          obj.answers === null ||
          Array.isArray(obj.answers)
        ) {
          throw new Error(
            "Arquivo inválido. O arquivo deve ser um JSON compatível exportado pelo LegisVisão (versão 1)."
          );
        }

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

        const total = Object.keys(normalizedAnswers).length;
        if (total === 0) {
          throw new Error("O arquivo não contém nenhuma opinião válida para importar.");
        }

        resolve({ answers: normalizedAnswers, total });
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

/**
 * Importação estrita aceitando exclusivamente o formato oficial LegisVisão v1:
 * { "app": "LegisVisão", "version": 1, "answers": { ... } }
 */
export async function importAnswersFromJson(
  file: File,
  onSuccess?: (total: number) => void,
  onError?: (msg: string) => void
): Promise<void> {
  try {
    const { answers, total } = await parseAndValidateAnswersFile(file);
    saveStoredAnswers(answers);
    if (onSuccess) onSuccess(total);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Erro ao importar arquivo de opiniões.";
    if (onError) onError(message);
    else alert(`Erro: ${message}`);
  }
}
