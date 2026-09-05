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
  migrateStoredAnswersToGranular,
  isMigrationV3Done,
  resetMigrationV3Flag,
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

  it("importa formato v3 contendo apenas opiniões granulares", async () => {
    const v3Data = {
      app: "LegisVisão",
      version: 3,
      exportedAt: new Date().toISOString(),
      totalOpinions: 2,
      granularAnswers: {
        "votacao-abc-123": "CONCORDO",
        "votacao-def-456": "DISCORDO",
      },
    };

    const file = new File([JSON.stringify(v3Data)], "legisvisao-v3.json", {
      type: "application/json",
    });

    const parsed = await parseAndValidateAnswersFile(file);
    expect(parsed.total).toBe(2);
    expect(parsed.answers).toEqual({});
    expect(parsed.granularAnswers).toEqual({
      "votacao-abc-123": "CONCORDO",
      "votacao-def-456": "DISCORDO",
    });
  });

  it("importa formato v3 contendo answers legados e granulares", async () => {
    const v3Data = {
      app: "LegisVisão",
      version: 3,
      exportedAt: new Date().toISOString(),
      totalOpinions: 3,
      answers: { "50": "CONCORDO" },
      granularAnswers: {
        "votacao-xyz": "DISCORDO",
        "votacao-abc": "CONCORDO",
      },
    };

    const file = new File([JSON.stringify(v3Data)], "legisvisao-v3-mixed.json", {
      type: "application/json",
    });

    const parsed = await parseAndValidateAnswersFile(file);
    expect(parsed.total).toBe(3);
    expect(parsed.answers).toEqual({ 50: "CONCORDO" });
    expect(parsed.granularAnswers).toEqual({
      "votacao-xyz": "DISCORDO",
      "votacao-abc": "CONCORDO",
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
  // 3. Migração v3: proposicao_id → votacao_id
  // ----------------------------------------------------------------

  it("migra opiniões legadas para formato granular usando mapeamento", () => {
    // Simula estado legado: opiniões por proposicao_id
    saveStoredAnswers({ 100: "CONCORDO", 200: "DISCORDO", 300: "CONCORDO" });

    // Mapeamento: proposicao_id → votacao_id da sessão de mérito
    const mapping: Record<number, string> = {
      100: "votacao-aaa",
      200: "votacao-bbb",
      300: "votacao-ccc",
    };

    const result = migrateStoredAnswersToGranular(mapping);
    expect(result.migrated).toBe(3);
    expect(result.skipped).toBe(0);

    const granular = getStoredGranularAnswers();
    expect(granular).toEqual({
      "votacao-aaa": "CONCORDO",
      "votacao-bbb": "DISCORDO",
      "votacao-ccc": "CONCORDO",
    });
  });

  it("migração é idempotente (não reexecuta após primeira vez)", () => {
    saveStoredAnswers({ 100: "CONCORDO" });
    const mapping: Record<number, string> = { 100: "votacao-aaa" };

    const first = migrateStoredAnswersToGranular(mapping);
    expect(first.migrated).toBe(1);
    expect(isMigrationV3Done()).toBe(true);

    // Adicionar nova opinião legada (simula cenário improvável)
    saveStoredAnswers({ 100: "CONCORDO", 999: "DISCORDO" });

    // Segunda chamada não migra nada porque flag está setado
    const second = migrateStoredAnswersToGranular({ ...mapping, 999: "votacao-zzz" });
    expect(second.migrated).toBe(0);
    expect(second.skipped).toBe(0);

    // Opinião 999 NÃO aparece em granular
    const granular = getStoredGranularAnswers();
    expect(granular["votacao-zzz"]).toBeUndefined();
  });

  it("migração preserva opiniões granulares já existentes", () => {
    // Opinião legada
    saveStoredAnswers({ 100: "CONCORDO" });
    // Opinião granular pré-existente (inserida manualmente pelo usuário)
    saveStoredGranularAnswers({ "votacao-manual": "DISCORDO" });

    const mapping: Record<number, string> = { 100: "votacao-aaa" };
    const result = migrateStoredAnswersToGranular(mapping);
    expect(result.migrated).toBe(1);

    const granular = getStoredGranularAnswers();
    expect(granular).toEqual({
      "votacao-manual": "DISCORDO",
      "votacao-aaa": "CONCORDO",
    });
  });

  it("migração não sobrescreve opinião granular existente com opinião legada", () => {
    // Opinião legada para proposição 100
    saveStoredAnswers({ 100: "CONCORDO" });
    // Opinião granular já existente para a MESMA sessão (ex: usuário já opinou no modo granular)
    saveStoredGranularAnswers({ "votacao-aaa": "DISCORDO" });

    const mapping: Record<number, string> = { 100: "votacao-aaa" };
    const result = migrateStoredAnswersToGranular(mapping);
    expect(result.migrated).toBe(0); // Não migra porque já existe
    expect(result.skipped).toBe(0);

    // Preserva a opinião granular original (DISCORDO), não sobrescreve com a legada (CONCORDO)
    const granular = getStoredGranularAnswers();
    expect(granular["votacao-aaa"]).toBe("DISCORDO");
  });

  it("migração contabiliza proposições sem sessão mapeada como skipped", () => {
    // 3 opiniões legadas, mas só 2 têm mapeamento
    saveStoredAnswers({ 100: "CONCORDO", 200: "DISCORDO", 999: "CONCORDO" });

    const mapping: Record<number, string> = {
      100: "votacao-aaa",
      200: "votacao-bbb",
      // 999 não tem mapeamento (proposição sem sessão nominal, ou dados não carregados)
    };

    const result = migrateStoredAnswersToGranular(mapping);
    expect(result.migrated).toBe(2);
    expect(result.skipped).toBe(1);

    const granular = getStoredGranularAnswers();
    expect(Object.keys(granular)).toHaveLength(2);
    expect(granular["votacao-aaa"]).toBe("CONCORDO");
    expect(granular["votacao-bbb"]).toBe("DISCORDO");
  });

  it("migração com mapa vazio marca flag mas não altera granular", () => {
    saveStoredAnswers({ 100: "CONCORDO" });

    const result = migrateStoredAnswersToGranular({});
    expect(result.migrated).toBe(0);
    expect(result.skipped).toBe(1);
    expect(isMigrationV3Done()).toBe(true);

    expect(getStoredGranularAnswers()).toEqual({});
  });

  it("reset de flag permite re-migração após importação de arquivo v1/v2", () => {
    saveStoredAnswers({ 100: "CONCORDO" });
    const mapping: Record<number, string> = { 100: "votacao-aaa" };

    migrateStoredAnswersToGranular(mapping);
    expect(isMigrationV3Done()).toBe(true);

    // Simula importação de arquivo v1 que reseta o flag
    resetMigrationV3Flag();
    expect(isMigrationV3Done()).toBe(false);

    // Agora pode migrar novas opiniões importadas
    saveStoredAnswers({ 100: "CONCORDO", 500: "DISCORDO" });
    const result2 = migrateStoredAnswersToGranular({
      ...mapping,
      500: "votacao-eee",
    });
    // 100 já existe em granular, então não migra; 500 é novo
    expect(result2.migrated).toBe(1);
    expect(result2.skipped).toBe(0);
  });

  // ----------------------------------------------------------------
  // 4. Importação com migração v3
  // ----------------------------------------------------------------

  it("importação de arquivo v1/v2 reseta flag de migração v3", async () => {
    // Marca migração como feita
    localStorage.setItem("legisvisao_migration_v3_done", "true");
    expect(isMigrationV3Done()).toBe(true);

    const v1Data = {
      app: "LegisVisão",
      version: 1,
      exportedAt: new Date().toISOString(),
      totalOpinions: 1,
      answers: { "100": "SIM" },
    };

    const file = new File([JSON.stringify(v1Data)], "v1.json", {
      type: "application/json",
    });

    let successTotal = 0;
    await importAnswersFromJson(file, (total) => { successTotal = total; });

    // Opiniões legadas salvas
    expect(getStoredAnswers()[100]).toBe("CONCORDO");
    // Flag resetado para permitir migração futura
    expect(isMigrationV3Done()).toBe(false);
    expect(successTotal).toBe(1);
  });

  it("importação de arquivo v3 salva granulares diretamente sem resetar flag", async () => {
    localStorage.setItem("legisvisao_migration_v3_done", "true");

    const v3Data = {
      app: "LegisVisão",
      version: 3,
      exportedAt: new Date().toISOString(),
      totalOpinions: 2,
      granularAnswers: {
        "votacao-xxx": "CONCORDO",
        "votacao-yyy": "DISCORDO",
      },
    };

    const file = new File([JSON.stringify(v3Data)], "v3.json", {
      type: "application/json",
    });

    await importAnswersFromJson(file, () => {});

    const granular = getStoredGranularAnswers();
    expect(granular["votacao-xxx"]).toBe("CONCORDO");
    expect(granular["votacao-yyy"]).toBe("DISCORDO");
    // Flag NÃO foi resetado (não há answers legados)
    expect(isMigrationV3Done()).toBe(true);
  });

  it("importação v3 faz merge com opiniões granulares existentes", async () => {
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
});
