import { describe, it, expect } from "vitest";
import {
  resolveUserVoteForDetail,
  evaluateVotePair,
  evaluateVotesList,
  calculateAdherencePercent,
  normalizeAdherence,
  calculateBayesianScore,
} from "../match/evaluateVotes";

describe("evaluateVotes - Avaliação e Normalização de Votos", () => {
  describe("normalizeAdherence", () => {
    it("retorna null para valores nulos, indefinidos ou NaN", () => {
      expect(normalizeAdherence(null)).toBeNull();
      expect(normalizeAdherence(undefined)).toBeNull();
      expect(normalizeAdherence(Number.NaN)).toBeNull();
    });

    it("mantém valores decimais entre 0 e 1", () => {
      expect(normalizeAdherence(0.75)).toBe(0.75);
      expect(normalizeAdherence(0)).toBe(0);
      expect(normalizeAdherence(1)).toBe(1);
    });

    it("converte percentuais de 1 a 100 para decimais de 0 a 1", () => {
      expect(normalizeAdherence(75)).toBe(0.75);
      expect(normalizeAdherence(100)).toBe(1);
      expect(normalizeAdherence(50)).toBe(0.5);
    });

    it("trata valores anômalos maiores que 100", () => {
      expect(normalizeAdherence(7500)).toBe(0.75);
    });
  });

  describe("resolveUserVoteForDetail", () => {
    it("prioriza sessionId quando presente em granularUserVotes", () => {
      const votes = { "100-1": "CONCORDO", "100": "DISCORDO" };
      const detail = { deputado_id: 1, proposicao_id: 100, votacao_id: "100-1", voto_original: "Sim" };

      expect(resolveUserVoteForDetail(votes, detail)).toBe("CONCORDO");
    });

    it("restringe à sessão votada e não aplica voto legado como curinga quando há granulares para a proposta", () => {
      const votes = { "100-1": "CONCORDO", "100": "DISCORDO" };
      // O detalhe é para a sessão 100-2 (não votada pelo usuário)
      const detail = { deputado_id: 1, proposicao_id: 100, votacao_id: "100-2", voto_original: "Sim" };

      expect(resolveUserVoteForDetail(votes, detail)).toBeUndefined();
    });

    it("retorna o voto legado quando não há nenhum voto granular para a proposição", () => {
      const votes = { 100: "CONCORDO" };
      const detail = { deputado_id: 1, proposicao_id: 100, votacao_id: "100-1", voto_original: "Sim" };

      expect(resolveUserVoteForDetail(votes, detail)).toBe("CONCORDO");
    });
  });

  describe("evaluateVotePair", () => {
    it("identifica match quando ambos concordam (SIM / SIM)", () => {
      const result = evaluateVotePair("CONCORDO", "Sim");
      expect(result).toEqual({ isComparable: true, isMatch: true });
    });

    it("identifica divergência quando discordam (SIM / NÃO)", () => {
      const result = evaluateVotePair("CONCORDO", "Não");
      expect(result).toEqual({ isComparable: true, isMatch: false });
    });

    it("marca como não comparável para abstenções ou ausências", () => {
      const result = evaluateVotePair("CONCORDO", "Abstenção");
      expect(result).toEqual({ isComparable: false, isMatch: false });
    });
  });

  describe("calculateAdherencePercent", () => {
    it("calcula percentual com 2 casas decimais", () => {
      expect(calculateAdherencePercent(3, 4)).toBe(75);
      expect(calculateAdherencePercent(1, 3)).toBe(33.33);
      expect(calculateAdherencePercent(0, 0)).toBeNull();
    });
  });

  describe("calculateBayesianScore", () => {
    it("retorna -1 quando não há votos comparáveis", () => {
      expect(calculateBayesianScore(0, 0)).toBe(-1);
    });

    it("regulariza amostras pequenas para que 19 de 20 fique acima de 1 de 1", () => {
      const score19de20 = calculateBayesianScore(19, 20); // (19 + 1) / (20 + 2) = 20 / 22 ~= 0.909
      const score1de1 = calculateBayesianScore(1, 1);     // (1 + 1) / (1 + 2) = 2 / 3 ~= 0.667

      expect(score19de20).toBeGreaterThan(score1de1);
    });

    it("garante que 20 de 20 supera 19 de 20 e 1 de 1", () => {
      const score20de20 = calculateBayesianScore(20, 20); // (20 + 1) / (20 + 2) = 21 / 22 ~= 0.955
      const score19de20 = calculateBayesianScore(19, 20);
      const score1de1 = calculateBayesianScore(1, 1);

      expect(score20de20).toBeGreaterThan(score19de20);
      expect(score20de20).toBeGreaterThan(score1de1);
    });

    it("penaliza amostras com 0 concordâncias de forma proporcional ao volume", () => {
      const score0de1 = calculateBayesianScore(0, 1);   // (0 + 1) / (1 + 2) = 1 / 3 ~= 0.333
      const score0de20 = calculateBayesianScore(0, 20); // (0 + 1) / (20 + 2) = 1 / 22 ~= 0.045

      expect(score0de1).toBeGreaterThan(score0de20);
    });
  });
});
