import { describe, it, expect, beforeEach } from "vitest";
import {
  recordModelFailure,
  recordModelSuccess,
  getModelStatus,
  filterActiveCandidates,
  resetModelStatusMap,
  resolveCandidateModels,
  resolveApiKey,
  isPaidTier,
  isModelAllowedForCurrentTier,
  isModelSuitable,
  FREE_TIER_QUOTAS,
  DEFAULT_PRIORITY_MODELS,
} from "../modelRegistry";

describe("lib/ai/modelRegistry.ts - Gestão de Status e Cooldown de Modelos", () => {
  beforeEach(() => {
    resetModelStatusMap();
    delete process.env.GEMINI_TIER;
    delete process.env.GOOGLE_AI_TIER;
    delete process.env.GEMINI_MODEL;
    delete process.env.GEMINI_SYNTHESIZER_MODEL;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
  });

  it("registra HTTP 404 colocando o modelo em blacklist permanente", () => {
    recordModelFailure("gemini-inexistente", 404);
    const status = getModelStatus("gemini-inexistente");

    expect(status?.isBlacklisted).toBe(true);
    expect(filterActiveCandidates(["gemini-inexistente", "gemini-3.1-flash-lite"])).toEqual([
      "gemini-3.1-flash-lite",
    ]);
  });

  it("registra HTTP 429 aplicando cooldown de 60 segundos", () => {
    recordModelFailure("gemini-3.5-flash-lite", 429);
    const status = getModelStatus("gemini-3.5-flash-lite");

    expect(status?.isBlacklisted).toBe(false);
    expect(status?.cooldownUntil).toBeGreaterThan(Date.now() + 50_000);

    // Modelo em cooldown é filtrado
    expect(filterActiveCandidates(["gemini-3.5-flash-lite", "gemma-4-31b"])).toEqual([
      "gemma-4-31b",
    ]);
  });

  it("limpa o status do modelo ao registrar sucesso", () => {
    recordModelFailure("gemini-3.1-flash-lite", 503);
    expect(getModelStatus("gemini-3.1-flash-lite")).toBeDefined();

    recordModelSuccess("gemini-3.1-flash-lite");
    expect(getModelStatus("gemini-3.1-flash-lite")).toBeUndefined();
  });

  it("bloqueia modelos pro por padrão quando GEMINI_TIER for free", async () => {
    process.env.GEMINI_TIER = "free";
    const models = await resolveCandidateModels("fake-key");

    expect(models.some((m) => m.includes("-pro"))).toBe(false);
  });

  it("detecta tier pago via GEMINI_TIER ou GOOGLE_AI_TIER", () => {
    expect(isPaidTier()).toBe(false);

    process.env.GEMINI_TIER = "paid";
    expect(isPaidTier()).toBe(true);

    process.env.GEMINI_TIER = "pay-as-you-go";
    expect(isPaidTier()).toBe(true);

    delete process.env.GEMINI_TIER;
    process.env.GOOGLE_AI_TIER = "tier1";
    expect(isPaidTier()).toBe(true);
  });

  it("valida isModelAllowedForCurrentTier respeitando cotas do Free Tier", () => {
    process.env.GEMINI_TIER = "free";
    expect(isModelAllowedForCurrentTier("gemini-3.5-flash-lite")).toBe(true);
    expect(isModelAllowedForCurrentTier("gemini-2.5-pro")).toBe(false);
    expect(isModelAllowedForCurrentTier("gemini-3.1-pro")).toBe(false);

    process.env.GEMINI_TIER = "paid";
    expect(isModelAllowedForCurrentTier("gemini-2.5-pro")).toBe(true);
  });

  it("filtra modelos inadequados em isModelSuitable", () => {
    process.env.GEMINI_TIER = "free";
    expect(isModelSuitable("gemini-3.5-flash-lite", ["generateContent"])).toBe(true);
    expect(isModelSuitable("gemini-3.5-flash-lite-tts", ["generateContent"])).toBe(false);
    expect(isModelSuitable("gemini-embedding-001", ["embedContent"])).toBe(false);
    expect(isModelSuitable("gemini-thinking-experimental", ["generateContent"])).toBe(false);
    expect(isModelSuitable("bison-001", ["generateContent"])).toBe(false);
  });

  it("resolve apiKey a partir de diferentes variáveis de ambiente suportadas", () => {
    expect(resolveApiKey("param-key")).toBe("param-key");

    process.env.GEMINI_API_KEY = "key-1";
    expect(resolveApiKey()).toBe("key-1");

    delete process.env.GEMINI_API_KEY;
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "key-2";
    expect(resolveApiKey()).toBe("key-2");

    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    process.env.GOOGLE_API_KEY = "key-3";
    expect(resolveApiKey()).toBe("key-3");
  });

  it("possui catálogo FREE_TIER_QUOTAS configurado com RPM, TPM e RPD", () => {
    expect(FREE_TIER_QUOTAS["gemini-3.5-flash-lite"].rpd).toBe(500);
    expect(FREE_TIER_QUOTAS["gemini-3.5-flash-lite"].rpm).toBe(15);
    expect(FREE_TIER_QUOTAS["gemma-4-31b"].rpd).toBe(14400);
    expect(DEFAULT_PRIORITY_MODELS[0]).toBe("gemini-3.5-flash-lite");
  });
});
