// ====================================================================
// LegisVisão - Registro e Resiliência de Modelos do Google AI Studio
// Gestão de Cotas, Cooldown em Memória, Fallback e Descoberta Dinâmica
// ====================================================================

import type { GeminiModelInfo, ModelQuotaInfo, ModelStatus } from "./types";

/**
 * Catálogo oficial com limites e cotas do Free Tier do Google AI Studio.
 */
export const FREE_TIER_QUOTAS: Record<string, ModelQuotaInfo> = {
  "gemini-3.5-flash-lite": {
    nome: "Gemini 3.5 Flash Lite",
    rpm: 15,
    tpm: "250K",
    rpd: 500,
    isFreeTier: true,
    categoria: "texto",
  },
  "gemini-3.1-flash-lite": {
    nome: "Gemini 3.1 Flash Lite",
    rpm: 15,
    tpm: "250K",
    rpd: 500,
    isFreeTier: true,
    categoria: "texto",
  },
  "gemma-4-31b": {
    nome: "Gemma 4 31B",
    rpm: 30,
    tpm: "16K",
    rpd: 14400,
    isFreeTier: true,
    categoria: "outros",
  },
  "gemma-4-26b": {
    nome: "Gemma 4 26B",
    rpm: 30,
    tpm: "16K",
    rpd: 14400,
    isFreeTier: true,
    categoria: "outros",
  },
  "gemini-2.5-flash": {
    nome: "Gemini 2.5 Flash",
    rpm: 5,
    tpm: "250K",
    rpd: 20,
    isFreeTier: true,
    categoria: "texto",
  },
  "gemini-2.5-flash-lite": {
    nome: "Gemini 2.5 Flash Lite",
    rpm: 10,
    tpm: "250K",
    rpd: 20,
    isFreeTier: true,
    categoria: "texto",
  },
  "gemini-3.5-flash": {
    nome: "Gemini 3.5 Flash",
    rpm: 5,
    tpm: "250K",
    rpd: 20,
    isFreeTier: true,
    categoria: "texto",
  },
  "gemini-3-flash": {
    nome: "Gemini 3 Flash",
    rpm: 5,
    tpm: "250K",
    rpd: 20,
    isFreeTier: true,
    categoria: "texto",
  },
  "gemini-2.5-pro": {
    nome: "Gemini 2.5 Pro",
    rpm: 0,
    tpm: "0",
    rpd: 0,
    isFreeTier: false,
    categoria: "texto",
  },
  "gemini-3.1-pro": {
    nome: "Gemini 3.1 Pro",
    rpm: 0,
    tpm: "0",
    rpd: 0,
    isFreeTier: false,
    categoria: "texto",
  },
};

/**
 * Modelos curados por prioridade para tarefas analíticas e de síntese legislativa.
 */
export const DEFAULT_PRIORITY_MODELS = [
  "gemini-3.5-flash-lite", // 500 RPD, 15 RPM
  "gemini-3.1-flash-lite", // 500 RPD, 15 RPM
  "gemma-4-31b",          // 14.4K RPD, 30 RPM
  "gemma-4-26b",          // 14.4K RPD, 30 RPM
  "gemini-2.5-flash",      // 20 RPD, 5 RPM
  "gemini-2.5-flash-lite", // 20 RPD, 10 RPM
  "gemini-3.5-flash",      // 20 RPD, 5 RPM
];

/**
 * Padrões de nomes de modelos incompatíveis com geração de texto/análise estruturada.
 */
export const EXCLUDED_PATTERNS = [
  "-tts",
  "embedding",
  "imagen",
  "aqa",
  "whisper",
  "bison",
  "vision",
  "thinking",
  "nano",
  "preview-image",
  "computer-use",
];

const modelStatusMap = new Map<string, ModelStatus>();

let cachedDiscoveredModels: GeminiModelInfo[] | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora de cache

export function resolveApiKey(apiKey?: string): string {
  if (apiKey?.trim()) return apiKey.trim();
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    ""
  ).trim();
}

export function isPaidTier(): boolean {
  const tier = (process.env.GEMINI_TIER || process.env.GOOGLE_AI_TIER || "free").toLowerCase().trim();
  return tier === "paid" || tier === "pay-as-you-go" || tier === "tier1" || tier === "tier2";
}

export function isModelAllowedForCurrentTier(modelName: string): boolean {
  if (isPaidTier()) return true;

  const clean = modelName.replace("models/", "").toLowerCase();
  const quota = FREE_TIER_QUOTAS[clean];
  if (quota) {
    return quota.isFreeTier && quota.rpd > 0;
  }

  if (clean.includes("-pro") && !clean.includes("flash")) {
    return false;
  }
  return true;
}

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

export function isModelSuitable(name: string, supportedMethods: string[] = []): boolean {
  const clean = name.replace("models/", "").toLowerCase();
  if (!clean.startsWith("gemini-") && !clean.startsWith("gemma-")) return false;
  if (supportedMethods.length > 0 && !supportedMethods.includes("generateContent")) return false;
  if (EXCLUDED_PATTERNS.some((pat) => clean.includes(pat))) return false;
  return isModelAllowedForCurrentTier(clean);
}

/**
 * Consulta a lista de modelos suportados para a chave no Google AI Studio com cache TTL de 1 hora.
 */
export async function listAvailableGeminiModels(apiKey?: string): Promise<GeminiModelInfo[]> {
  const now = Date.now();
  if (cachedDiscoveredModels && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedDiscoveredModels;
  }

  const key = resolveApiKey(apiKey);
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
      const name = m.name || "";
      return isModelSuitable(name, m.supportedGenerationMethods);
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
  const customModel = (
    process.env.GEMINI_MODEL ||
    process.env.GEMINI_SYNTHESIZER_MODEL ||
    ""
  ).trim();

  if (customModel) {
    const filtered = [customModel, ...DEFAULT_PRIORITY_MODELS.filter((m) => m !== customModel)]
      .filter(isModelAllowedForCurrentTier);
    return filterActiveCandidates(filtered);
  }

  const activeModels = await listAvailableGeminiModels(apiKey);
  if (activeModels.length > 0) {
    const activeNames = new Set(activeModels.map((m) => m.name));
    const prioritized = DEFAULT_PRIORITY_MODELS.filter(
      (m) => activeNames.has(m) && isModelAllowedForCurrentTier(m)
    );
    const others = activeModels
      .map((m) => m.name)
      .filter((m) => !DEFAULT_PRIORITY_MODELS.includes(m) && isModelAllowedForCurrentTier(m));

    const combined = [...prioritized, ...others];
    const activeCandidates = filterActiveCandidates(combined);
    if (activeCandidates.length > 0) {
      return activeCandidates;
    }
  }

  const fallback = DEFAULT_PRIORITY_MODELS.filter(isModelAllowedForCurrentTier);
  const activeFallback = filterActiveCandidates(fallback);
  return activeFallback.length > 0 ? activeFallback : fallback;
}
