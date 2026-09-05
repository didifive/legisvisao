import { describe, it, expect } from "vitest";
import { calculatePoliticianMatch } from "../match/calculatePoliticianMatch";
import type { DeputySearchResult } from "@/types/db";
import type { VoteDetailWithProposition, GranularUserVotes } from "../match/types";

const mockDeputy: DeputySearchResult = {
  id: 100,
  nome: "Fulano de Tal",
  nome_eleitoral: "Deputado Fulano",
  sigla_partido: "PARTIDO_A",
  sigla_uf: "SP",
  url_foto: null,
  email: "deputado@camara.leg.br",
  situacao: "Exercício",
  matches_count: 0,
  comparable_count: 0,
  adherence: null,
};

describe("lib/match/calculatePoliticianMatch.ts - Afinidade Individual Granular", () => {
  it("calcula afinidade com 100% quando usuário e deputado concordam em mérito e destaque", () => {
    const userVotes: GranularUserVotes = {
      "sess-merito-1": "CONCORDO",
      "sess-destaque-1": "DISCORDO",
    };

    const votesOfDeputy: VoteDetailWithProposition[] = [
      {
        deputado_id: 100,
        proposicao_id: 1,
        votacao_id: "sess-merito-1",
        voto_original: "Sim",
        sigla_partido: "PARTIDO_A",
      },
      {
        deputado_id: 100,
        proposicao_id: 1,
        votacao_id: "sess-destaque-1",
        voto_original: "Não",
        sigla_partido: "PARTIDO_A",
      },
    ];

    const result = calculatePoliticianMatch(userVotes, votesOfDeputy, mockDeputy);

    expect(result.matches_count).toBe(2);
    expect(result.comparable_count).toBe(2);
    expect(result.adherence).toBe(100);
  });

  it("calcula 50% de afinidade quando deputado vota diferente em mérito vs destaque", () => {
    const userVotes: GranularUserVotes = {
      "sess-merito-1": "CONCORDO",
      "sess-destaque-1": "CONCORDO",
    };

    const votesOfDeputy: VoteDetailWithProposition[] = [
      {
        deputado_id: 100,
        proposicao_id: 1,
        votacao_id: "sess-merito-1",
        voto_original: "Sim", // Concorda
        sigla_partido: "PARTIDO_A",
      },
      {
        deputado_id: 100,
        proposicao_id: 1,
        votacao_id: "sess-destaque-1",
        voto_original: "Não", // Discorda
        sigla_partido: "PARTIDO_A",
      },
    ];

    const result = calculatePoliticianMatch(userVotes, votesOfDeputy, mockDeputy);

    expect(result.matches_count).toBe(1);
    expect(result.comparable_count).toBe(2);
    expect(result.adherence).toBe(50);
  });

  it("calcula afinidade quando usuário opina apenas em destaques ou emendas sem opinar no mérito", () => {
    const userVotes: GranularUserVotes = {
      "sess-destaque-99": "DISCORDO",
    };

    const votesOfDeputy: VoteDetailWithProposition[] = [
      {
        deputado_id: 100,
        proposicao_id: 50,
        votacao_id: "sess-merito-50",
        voto_original: "Sim",
        sigla_partido: "PARTIDO_A",
      },
      {
        deputado_id: 100,
        proposicao_id: 50,
        votacao_id: "sess-destaque-99",
        voto_original: "Não", // Match: usuário DISCORDO ("NÃO") == deputado "Não"
        sigla_partido: "PARTIDO_A",
      },
    ];

    const result = calculatePoliticianMatch(userVotes, votesOfDeputy, mockDeputy);

    expect(result.matches_count).toBe(1);
    expect(result.comparable_count).toBe(1);
    expect(result.adherence).toBe(100);
  });

  it("desconsidera abstenções, obstruções e ausências do deputado", () => {
    const userVotes: GranularUserVotes = {
      "sess-1": "CONCORDO",
      "sess-2": "CONCORDO",
      "sess-3": "CONCORDO",
    };

    const votesOfDeputy: VoteDetailWithProposition[] = [
      {
        deputado_id: 100,
        proposicao_id: 1,
        votacao_id: "sess-1",
        voto_original: "Abstenção",
        sigla_partido: "PARTIDO_A",
      },
      {
        deputado_id: 100,
        proposicao_id: 2,
        votacao_id: "sess-2",
        voto_original: "Obstrução",
        sigla_partido: "PARTIDO_A",
      },
      {
        deputado_id: 100,
        proposicao_id: 3,
        votacao_id: "sess-3",
        voto_original: "Sim",
        sigla_partido: "PARTIDO_A",
      },
    ];

    const result = calculatePoliticianMatch(userVotes, votesOfDeputy, mockDeputy);

    expect(result.matches_count).toBe(1);
    expect(result.comparable_count).toBe(1);
    expect(result.adherence).toBe(100);
  });

  it("retorna adherence null quando não há votos comparáveis", () => {
    const userVotes: GranularUserVotes = {
      "sess-outra": "CONCORDO",
    };

    const votesOfDeputy: VoteDetailWithProposition[] = [
      {
        deputado_id: 100,
        proposicao_id: 1,
        votacao_id: "sess-1",
        voto_original: "Sim",
        sigla_partido: "PARTIDO_A",
      },
    ];

    const result = calculatePoliticianMatch(userVotes, votesOfDeputy, mockDeputy);

    expect(result.matches_count).toBe(0);
    expect(result.comparable_count).toBe(0);
    expect(result.adherence).toBeNull();
  });

  it("mantém retrocompatibilidade com opiniões legadas indexadas por proposicao_id", () => {
    const legacyUserVotes = {
      10: "CONCORDO",
      20: "DISCORDO",
    };

    const votesOfDeputy: VoteDetailWithProposition[] = [
      {
        deputado_id: 100,
        proposicao_id: 10,
        votacao_id: "sess-10",
        voto_original: "Sim",
        sigla_partido: "PARTIDO_A",
      },
      {
        deputado_id: 100,
        proposicao_id: 20,
        votacao_id: "sess-20",
        voto_original: "Não",
        sigla_partido: "PARTIDO_A",
      },
    ];

    const result = calculatePoliticianMatch(legacyUserVotes, votesOfDeputy, mockDeputy);

    expect(result.matches_count).toBe(2);
    expect(result.comparable_count).toBe(2);
    expect(result.adherence).toBe(100);
  });
});
