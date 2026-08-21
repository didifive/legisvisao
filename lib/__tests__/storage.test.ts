import { describe, it, expect, beforeEach } from "vitest";
import {
  getStoredAnswers,
  saveStoredAnswers,
  getStoredGranularAnswers,
  saveStoredGranularAnswers,
  getStoredAnswersCount,
  clearStoredAnswers,
  parseAndValidateAnswersFile,
} from "../storage";

describe("lib/storage.ts - Armazenamento e Retrocompatibilidade", () => {
  beforeEach(() => {
    localStorage.clear();
  });

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

  it("limpa respostas corretamente", () => {
    saveStoredAnswers({ 1: "CONCORDO" });
    saveStoredGranularAnswers({ "sess-101": "DISCORDO" });
    expect(getStoredAnswersCount()).toBe(2);

    clearStoredAnswers();
    expect(getStoredAnswers()).toEqual({});
    expect(getStoredGranularAnswers()).toEqual({});
    expect(getStoredAnswersCount()).toBe(0);
  });

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

    const file = new File([JSON.stringify(v1Data)], "legisvisao-v1.json", {
      type: "application/json",
    });

    const parsed = await parseAndValidateAnswersFile(file);
    expect(parsed.total).toBe(3);
    expect(parsed.answers).toEqual({
      100: "CONCORDO",
      200: "DISCORDO",
      300: "DISCORDO",
    });
  });

  it("rejeita arquivos JSON com formato incompatível", async () => {
    const invalidData = {
      app: "OutroApp",
      version: 99,
      answers: {},
    };

    const file = new File([JSON.stringify(invalidData)], "invalido.json", {
      type: "application/json",
    });

    await expect(parseAndValidateAnswersFile(file)).rejects.toThrow();
  });
});
