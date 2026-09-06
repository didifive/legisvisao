import { describe, it, expect, beforeEach } from "vitest";
import {
  getStoredAnswers,
  saveStoredAnswers,
  getStoredGranularAnswers,
  saveStoredGranularAnswers,
  getStoredAnswersCount,
  clearStoredAnswers,
  parseAndValidateAnswersFile,
  importAnswersFromJson,
  calculateUniqueOpinionsCount,
  sanitizeStoredAnswers,
  applyImportedAnswers,
  removeStoredAnswer,
  removeStoredGranularAnswer,
} from "../storage";

// ====================================================================
// Testes de Armazenamento e Retrocompatibilidade (v1, v2 e v3)
// ====================================================================

describe("lib/storage.ts - Armazenamento e Retrocompatibilidade", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ----------------------------------------------------------------
  // 1. Operações Básicas de Leitura e Escrita
  // ----------------------------------------------------------------

  it("salva e recupera respostas de projetos gerais", () => {
    saveStoredAnswers({ 1: "CONCORDO", 2: "DISCORDO" });
    const answers = getStoredAnswers();
    expect(answers).toEqual({ 1: "CONCORDO", 2: "DISCORDO" });
    expect(getStoredAnswersCount()).toBe(2);
  });

  it("salva e recupera respostas granulares", () => {
    saveStoredGranularAnswers({ "sess-101": "CONCORDO", "sess-102": "DISCORDO" });
    const granular = getStoredGranularAnswers();
    expect(granular).toEqual({ "sess-101": "CONCORDO", "sess-102": "DISCORDO" });
  });

  it("remove resposta pontual de projeto geral", () => {
    saveStoredAnswers({ 1: "CONCORDO", 2: "DISCORDO" });
    removeStoredAnswer(1);
    expect(getStoredAnswers()).toEqual({ 2: "DISCORDO" });
  });

  it("remove resposta granular e limpa chave de proposicao e legada se fornecida", () => {
    saveStoredGranularAnswers({ "sess-101": "CONCORDO", "2500080": "CONCORDO", "sess-102": "DISCORDO" });
    saveStoredAnswers({ 2500080: "CONCORDO" });

    removeStoredGranularAnswer("sess-101", 2500080);

    const granular = getStoredGranularAnswers();
    expect(granular).toEqual({ "sess-102": "DISCORDO" });
    expect(getStoredAnswers()).toEqual({});
  });

  it("limpa respostas corretamente", () => {
    saveStoredAnswers({ 1: "CONCORDO" });
    saveStoredGranularAnswers({ "sess-101": "DISCORDO" });
    expect(getStoredAnswersCount()).toBe(2);

    clearStoredAnswers();
    expect(getStoredAnswers()).toEqual({});
    expect(getStoredGranularAnswers()).toEqual({});
    expect(getStoredAnswersCount()).toBe(0);
  });

  // ----------------------------------------------------------------
  // 2. Importação e Parse de Arquivos Exportados (v1, v2 e v3)
  // ----------------------------------------------------------------

  it("importa formato exportado v2 com respostas gerais e granulares", async () => {
    const v2Data = {
      app: "LegisVisão",
      version: 2,
      exportedAt: new Date().toISOString(),
      totalOpinions: 3,
      answers: {
        "10": "CONCORDO",
        "20": "DISCORDO",
      },
      granularAnswers: {
        "sess-1": "CONCORDO",
      },
    };

    const file = new File([JSON.stringify(v2Data)], "legisvisao-backup.json", {
      type: "application/json",
    });

    const parsed = await parseAndValidateAnswersFile(file);
    expect(parsed.total).toBe(3);
    expect(parsed.answers).toEqual({
      10: "CONCORDO",
      20: "DISCORDO",
    });
    expect(parsed.granularAnswers).toEqual({
      "sess-1": "CONCORDO",
    });
  });

  it("converte formato legado v1 (SIM/NAO -> CONCORDO/DISCORDO)", async () => {
    const v1Data = {
      app: "LegisVisão",
      version: 1,
      exportedAt: new Date().toISOString(),
      totalOpinions: 2,
      answers: {
        "100": "SIM",
        "200": "NAO",
        "300": "NÃO",
      },
    };

    const file = new File([JSON.stringify(v1Data)], "v1.json", {
      type: "application/json",
    });

    const parsed = await parseAndValidateAnswersFile(file);
    expect(parsed.answers).toEqual({
      100: "CONCORDO",
      200: "DISCORDO",
      300: "DISCORDO",
    });
  });

  it("importa formato v3 exclusivo com apenas granularAnswers", async () => {
    const v3Data = {
      app: "LegisVisão",
      version: 3,
      exportedAt: new Date().toISOString(),
      totalOpinions: 2,
      granularAnswers: {
        "sess-aaa": "CONCORDO",
        "sess-bbb": "DISCORDO",
      },
    };

    const file = new File([JSON.stringify(v3Data)], "v3.json", {
      type: "application/json",
    });

    const parsed = await parseAndValidateAnswersFile(file);
    expect(parsed.total).toBe(2);
    expect(parsed.granularAnswers).toEqual({
      "sess-aaa": "CONCORDO",
      "sess-bbb": "DISCORDO",
    });
    expect(parsed.answers).toEqual({});
  });

  it("rejeita arquivo com app incompatível", async () => {
    const badApp = {
      app: "OutroApp",
      version: 2,
      exportedAt: new Date().toISOString(),
      totalOpinions: 1,
      answers: { "1": "CONCORDO" },
    };

    const file = new File([JSON.stringify(badApp)], "bad.json", {
      type: "application/json",
    });

    await expect(parseAndValidateAnswersFile(file)).rejects.toThrow(
      "Arquivo inválido"
    );
  });

  it("rejeita arquivo sem respostas válidas", async () => {
    const emptyData = {
      app: "LegisVisão",
      version: 2,
      exportedAt: new Date().toISOString(),
      totalOpinions: 0,
      answers: {},
      granularAnswers: {},
    };

    const file = new File([JSON.stringify(emptyData)], "empty.json", {
      type: "application/json",
    });

    await expect(parseAndValidateAnswersFile(file)).rejects.toThrow(
      "não contém nenhuma opinião válida"
    );
  });

  it("rejeita arquivo com JSON corrompido", async () => {
    const file = new File(["{ invalid json"], "corrupt.json", {
      type: "application/json",
    });

    await expect(parseAndValidateAnswersFile(file)).rejects.toThrow(
      "não é um JSON válido"
    );
  });

  it("rejeita arquivo v3 sem answers nem granularAnswers", async () => {
    const emptyV3 = {
      app: "LegisVisão",
      version: 3,
      exportedAt: new Date().toISOString(),
      totalOpinions: 0,
    };

    const file = new File([JSON.stringify(emptyV3)], "empty-v3.json", {
      type: "application/json",
    });

    await expect(parseAndValidateAnswersFile(file)).rejects.toThrow(
      "opiniões em formato compatível"
    );
  });

  // ----------------------------------------------------------------
  // 3. Aplicação de Respostas Importadas (applyImportedAnswers)
  // ----------------------------------------------------------------

  describe("applyImportedAnswers", () => {
    it("aplica respostas em modo replace (padrão)", () => {
      saveStoredGranularAnswers({ "sess-old": "CONCORDO" });
      saveStoredAnswers({ 999: "DISCORDO" });

      applyImportedAnswers(
        { 100: "CONCORDO" },
        { "sess-new": "DISCORDO" },
        "replace"
      );

      expect(getStoredGranularAnswers()).toEqual({ "sess-new": "DISCORDO" });
      expect(getStoredAnswers()).toEqual({ 100: "CONCORDO" });
    });

    it("mescla respostas em modo merge", () => {
      saveStoredGranularAnswers({ "sess-old": "CONCORDO" });
      saveStoredAnswers({ 999: "DISCORDO" });

      applyImportedAnswers(
        { 100: "CONCORDO" },
        { "sess-new": "DISCORDO" },
        "merge"
      );

      expect(getStoredGranularAnswers()).toEqual({
        "sess-old": "CONCORDO",
        "sess-new": "DISCORDO",
      });
      expect(getStoredAnswers()).toEqual({
        999: "DISCORDO",
        100: "CONCORDO",
      });
    });
  });

  it("importação v3 faz merge com opiniões granulares existentes via importAnswersFromJson", async () => {
    saveStoredGranularAnswers({ "votacao-existente": "CONCORDO" });

    const v3Data = {
      app: "LegisVisão",
      version: 3,
      exportedAt: new Date().toISOString(),
      totalOpinions: 1,
      granularAnswers: {
        "votacao-nova": "DISCORDO",
      },
    };

    const file = new File([JSON.stringify(v3Data)], "v3-merge.json", {
      type: "application/json",
    });

    await importAnswersFromJson(file, () => {});

    const granular = getStoredGranularAnswers();
    expect(granular["votacao-existente"]).toBe("CONCORDO");
    expect(granular["votacao-nova"]).toBe("DISCORDO");
  });

  // ----------------------------------------------------------------
  // 4. Blindagem de Sessões Simbólicas e Contagem Precisa de Opiniões
  // ----------------------------------------------------------------

  describe("calculateUniqueOpinionsCount", () => {
    it("não duplica votos espelhados entre answers e granularAnswers", () => {
      const answers = { 2579832: "CONCORDO" as const };
      const granular = { "2579832-41": "CONCORDO" as const };

      // Ambos representam a mesma proposição 2579832
      const count = calculateUniqueOpinionsCount(answers, granular);
      expect(count).toBe(1);
    });

    it("filtra sessões simbólicas quando fornecido validSessionIds", () => {
      const answers = {};
      const granular = {
        "2500080-293": "CONCORDO" as const, // Simbólica
        "2500080-320": "CONCORDO" as const, // Nominal
        "2500080-327": "CONCORDO" as const, // Simbólica
        "2500080-330": "CONCORDO" as const, // Nominal
      };

      const validSessions = new Set(["2500080-320", "2500080-330"]);
      const count = calculateUniqueOpinionsCount(answers, granular, validSessions);
      expect(count).toBe(2);
    });

    it("avalia com precisão o cenário real do usuário resultando em 4 opiniões válidas", () => {
      // JSON do usuário com 6 granulares (2 simbólicas) + 1 legado espelhado
      const answers = { 2579832: "CONCORDO" as const };
      const granular = {
        "2579832-41": "CONCORDO" as const,  // Válida (prop 2579832)
        "2445100-34": "DISCORDO" as const,  // Válida (prop 2445100)
        "2500080-293": "CONCORDO" as const, // Simbólica da PEC 18/2025
        "2500080-320": "CONCORDO" as const, // Válida da PEC 18/2025
        "2500080-327": "CONCORDO" as const, // Simbólica da PEC 18/2025
        "2500080-330": "CONCORDO" as const, // Válida da PEC 18/2025
      };

      const validSessions = new Set([
        "2579832-41",
        "2445100-34",
        "2500080-320",
        "2500080-330",
      ]);

      const count = calculateUniqueOpinionsCount(answers, granular, validSessions);
      expect(count).toBe(4);
    });
  });

  describe("sanitizeStoredAnswers", () => {
    it("remove sessões simbólicas do localStorage e preserva apenas as nominais válidas", () => {
      saveStoredGranularAnswers({
        "2500080-293": "CONCORDO",
        "2500080-320": "CONCORDO",
        "2500080-327": "CONCORDO",
        "2500080-330": "CONCORDO",
      });

      const validSessions = new Set(["2500080-320", "2500080-330"]);
      const res = sanitizeStoredAnswers(validSessions);

      expect(res.removed).toEqual(["2500080-293", "2500080-327"]);
      const sanitized = getStoredGranularAnswers();
      expect(sanitized).toEqual({
        "2500080-320": "CONCORDO",
        "2500080-330": "CONCORDO",
      });
      expect(getStoredAnswersCount(validSessions)).toBe(2);
    });

    it("preserva o estado quando validSessionIds estiver vazio por segurança", () => {
      saveStoredGranularAnswers({
        "sess-1": "CONCORDO",
        "sess-2": "DISCORDO",
      });

      const res = sanitizeStoredAnswers(new Set());
      expect(res.removed.length).toBe(0);
      expect(res.migrated).toBe(0);

      const granular = getStoredGranularAnswers();
      expect(Object.keys(granular).length).toBe(2);
    });

    it("converte respostas legadas de answers para granularAnswers e limpa answers legado", () => {
      saveStoredAnswers({ 2579832: "CONCORDO", 12345: "DISCORDO" });
      saveStoredGranularAnswers({ "2500080-320": "CONCORDO", "2500080-293": "CONCORDO" });

      const validSessions = new Set(["2579832-41", "2500080-320"]);
      const sessionMap = { 2579832: "2579832-41" };

      const { removed, migrated } = sanitizeStoredAnswers(validSessions, sessionMap);

      expect(migrated).toBe(1); // 2579832 migrou para 2579832-41
      expect(removed).toContain("2500080-293"); // 2500080-293 (simbólica) foi expurgada

      const granular = getStoredGranularAnswers();
      expect(granular).toEqual({
        "2500080-320": "CONCORDO",
        "2579832-41": "CONCORDO",
      });

      // answers legado foi higienizado (2579832 não existe mais no legado)
      const legacy = getStoredAnswers();
      expect(legacy[2579832]).toBeUndefined();
    });
  });
});
