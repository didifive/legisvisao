import { describe, it, expect } from "vitest";
import { comparePartyRanking, compareDeputyRanking, type SortableParty, type SortableDeputy } from "../match/rankingSort";

describe("lib/match/rankingSort.ts - Ordenação de Partidos e Deputados", () => {
  describe("comparePartyRanking - Ordenação Primária por Taxa Real com Desempate por Volume", () => {
    it("ordena partidos estritamente em ordem decrescente de taxa real (adherence)", () => {
      const parties: SortableParty[] = [
        { sigla: "PL", adherence: 0.91, matches_count: 74, comparable_count: 81 },
        { sigla: "PSOL", adherence: 1.0, matches_count: 12, comparable_count: 12 },
        { sigla: "PP", adherence: 0.21, matches_count: 10, comparable_count: 48 },
        { sigla: "PSDB", adherence: 0.22, matches_count: 2, comparable_count: 9 },
        { sigla: "REDE", adherence: 0.0, matches_count: 0, comparable_count: 1 },
      ];

      const sorted = [...parties].sort(comparePartyRanking);

      expect(sorted.map((p) => p.sigla)).toEqual(["PSOL", "PL", "PSDB", "PP", "REDE"]);
    });

    it("desempata partidos com 100% dando prioridade ao maior número de votos/concordâncias", () => {
      const parties: SortableParty[] = [
        { sigla: "NOVO", adherence: 1.0, matches_count: 4, comparable_count: 4 },
        { sigla: "PSOL", adherence: 1.0, matches_count: 12, comparable_count: 12 },
      ];

      const sorted = [...parties].sort(comparePartyRanking);

      expect(sorted[0].sigla).toBe("PSOL");
      expect(sorted[1].sigla).toBe("NOVO");
    });

    it("desempata partidos com 0% dando prioridade ao maior volume de comparações e depois alfabético", () => {
      const parties: SortableParty[] = [
        { sigla: "REDE", adherence: 0.0, matches_count: 0, comparable_count: 1 },
        { sigla: "AVANTE", adherence: 0.0, matches_count: 0, comparable_count: 4 },
        { sigla: "PCDOB", adherence: 0.0, matches_count: 0, comparable_count: 7 },
      ];

      const sorted = [...parties].sort(comparePartyRanking);

      // Maior volume de comparações no desempate de 0%
      expect(sorted.map((p) => p.sigla)).toEqual(["PCDOB", "AVANTE", "REDE"]);
    });

    it("mantém partidos com taxas reais positivas estritamente à frente de 0%", () => {
      const parties: SortableParty[] = [
        { sigla: "REDE", adherence: 0.0, matches_count: 0, comparable_count: 1 },
        { sigla: "MDB", adherence: 0.13, matches_count: 4, comparable_count: 32 },
        { sigla: "PSDB", adherence: 0.22, matches_count: 2, comparable_count: 9 },
      ];

      const sorted = [...parties].sort(comparePartyRanking);

      expect(sorted.map((p) => p.sigla)).toEqual(["PSDB", "MDB", "REDE"]);
    });
  });

  describe("compareDeputyRanking - Wilson Score para Parlamentares Individuais", () => {
    it("prioriza parlamentar consistente com dezenas de votos sobre suplente de voto único", () => {
      const deputies: SortableDeputy[] = [
        { nome_eleitoral: "Suplente Isolado", matches_count: 1, comparable_count: 1, adherence: 1.0 },
        { nome_eleitoral: "Titular Ativo", matches_count: 28, comparable_count: 30, adherence: 0.9333 },
      ];

      const sorted = [...deputies].sort(compareDeputyRanking);

      // Titular ativo com 28 de 30 deve prevalecer sobre 1 de 1
      expect(sorted[0].nome_eleitoral).toBe("Titular Ativo");
      expect(sorted[1].nome_eleitoral).toBe("Suplente Isolado");
    });

    it("assegura que concordâncias reais superam ausência de concordância", () => {
      const deputies: SortableDeputy[] = [
        { nome_eleitoral: "Deputado Zero", matches_count: 0, comparable_count: 1, adherence: 0.0 },
        { nome_eleitoral: "Deputado Parcial", matches_count: 2, comparable_count: 9, adherence: 0.2222 },
      ];

      const sorted = [...deputies].sort(compareDeputyRanking);

      expect(sorted[0].nome_eleitoral).toBe("Deputado Parcial");
      expect(sorted[1].nome_eleitoral).toBe("Deputado Zero");
    });

    it("desempata por taxa real e volume quando scores de Wilson forem numericamente idênticos", () => {
      const deputies: SortableDeputy[] = [
        { nome_eleitoral: "Deputado B", matches_count: 0, comparable_count: 0, adherence: null },
        { nome_eleitoral: "Deputado A", matches_count: 0, comparable_count: 0, adherence: null },
      ];

      const sorted = [...deputies].sort(compareDeputyRanking);

      expect(sorted[0].nome_eleitoral).toBe("Deputado A");
      expect(sorted[1].nome_eleitoral).toBe("Deputado B");
    });
  });
});
