// ====================================================================
// LegisVisão - Registro e Resiliência de Modelos do Google AI Studio
// Gestão de Cotas, Cooldown em Memória, Fallback e Descoberta Dinâmica
// ====================================================================

import type { GeminiModelInfo, ModelStatus } from "./types";

export const DEFAULT_PRIORITY_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash-lite",
  "gemini-2.5-flash",
  "gemma-4-31b",
  "gemma-4-26b",
  "gemini-flash-latest",
];

const EXCLUDED_PATTERNS = ["-tts", "embedding", "imagen", "robotics"];

const modelStatusMap = new Map<string, ModelStatus>();

let cachedDiscoveredModels: GeminiModelInfo[] | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora de cache

export function recordModelFailure(model: string, status: number): void {
  const now = Date.now();
  const current = modelStatusMap.get(model) || { cooldownUntil: 0, isBlacklisted: false, failCount: 0 };
  current.failCount += 1;

  if (status === 404) {
    current.isBlacklisted = true;
  } else if (status === 429) {
    current.cooldownUntil = now + 60_000;
  } else if (status === 503) {
    current.cooldownUntil = now + 30_000;
  } else {
    current.cooldownUntil = now + 15_000;
  }

  modelStatusMap.set(model, current);
}

export function recordModelSuccess(model: string): void {
  modelStatusMap.delete(model);
}

export function getModelStatus(model: string): ModelStatus | undefined {
  return modelStatusMap.get(model);
}

export function resetModelStatusMap(): void {
  modelStatusMap.clear();
  cachedDiscoveredModels = null;
  lastFetchTime = 0;
}

export function filterActiveCandidates(models: string[]): string[] {
  const now = Date.now();
  return models.filter((model) => {
    const status = modelStatusMap.get(model);
    if (!status) return true;
    if (status.isBlacklisted) return false;
    return status.cooldownUntil <= now;
  });
}

function isModelPermittedForTier(modelName: string): boolean {
  const tier = (process.env.GEMINI_TIER || "free").toLowerCase().trim();
  if (tier !== "paid" && modelName.includes("-pro")) {
    return false;
  }
  return true;
}

/**
 * Consulta a lista de modelos suportados para a chave no Google AI Studio com cache TTL de 1 hora.
 */
export async function listAvailableGeminiModels(apiKey?: string): Promise<GeminiModelInfo[]> {
  const now = Date.now();
  if (cachedDiscoveredModels && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedDiscoveredModels;
  }

  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY não encontrada nas variáveis de ambiente. Configure no arquivo .env.local."
    );
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });

    if (!res.ok) {
      const errTxt = await res.text();
      throw new Error(`Falha ao consultar modelos no Google AI Studio (${res.status}): ${errTxt.slice(0, 150)}`);
    }

    const data = await res.json();
    const rawModels: Array<{
      name?: string;
      displayName?: string;
      inputTokenLimit?: number;
      outputTokenLimit?: number;
      supportedGenerationMethods?: string[];
    }> = data.models || [];

    const contentModels = rawModels.filter((m) => {
      const name = (m.name || "").replace("models/", "").toLowerCase();
      const methods = m.supportedGenerationMethods || [];
      if (!methods.includes("generateContent")) return false;
      if (EXCLUDED_PATTERNS.some((pat) => name.includes(pat))) return false;
      return isModelPermittedForTier(name);
    });

    const parsed: GeminiModelInfo[] = contentModels.map((m) => ({
      name: (m.name || "").replace("models/", ""),
      displayName: m.displayName || m.name || "",
      inputTokenLimit: m.inputTokenLimit || 0,
      outputTokenLimit: m.outputTokenLimit || 0,
      supportedMethods: m.supportedGenerationMethods || [],
    }));

    cachedDiscoveredModels = parsed;
    lastFetchTime = now;
    return parsed;
  } catch (err) {
    console.warn("Aviso ao listar modelos do Google AI Studio:", (err as Error).message);
    return [];
  }
}

/**
 * Resolve a lista de modelos candidatos em ordem de prioridade, aplicando filtro de tier e cooldown.
 */
export async function resolveCandidateModels(apiKey?: string): Promise<string[]> {
  const customModel = process.env.GEMINI_MODEL;
  if (customModel) {
    const filtered = [customModel, ...DEFAULT_PRIORITY_MODELS.filter((m) => m !== customModel)]
      .filter(isModelPermittedForTier);
    return filterActiveCandidates(filtered);
  }

  const activeModels = await listAvailableGeminiModels(apiKey);
  if (activeModels.length > 0) {
    const activeNames = new Set(activeModels.map((m) => m.name));
    const prioritized = DEFAULT_PRIORITY_MODELS.filter((m) => activeNames.has(m) && isModelPermittedForTier(m));
    const others = activeModels
      .map((m) => m.name)
      .filter((m) => !DEFAULT_PRIORITY_MODELS.includes(m) && isModelPermittedForTier(m));

    const combined = [...prioritized, ...others];
    const activeCandidates = filterActiveCandidates(combined);
    if (activeCandidates.length > 0) {
      return activeCandidates;
    }
  }

  const fallback = DEFAULT_PRIORITY_MODELS.filter(isModelPermittedForTier);
  const activeFallback = filterActiveCandidates(fallback);
  return activeFallback.length > 0 ? activeFallback : fallback;
}
