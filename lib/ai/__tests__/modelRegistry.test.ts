import { describe, it, expect, beforeEach } from "vitest";
import {
  recordModelFailure,
  recordModelSuccess,
  getModelStatus,
  filterActiveCandidates,
  resetModelStatusMap,
  resolveCandidateModels,
} from "../modelRegistry";

describe("lib/ai/modelRegistry.ts - Gestão de Status e Cooldown de Modelos", () => {
  beforeEach(() => {
    resetModelStatusMap();
    delete process.env.GEMINI_TIER;
    delete process.env.GEMINI_MODEL;
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
});
