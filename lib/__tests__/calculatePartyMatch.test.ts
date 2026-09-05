import { describe, it, expect } from "vitest";
import { calculatePartyMatch } from "../match/calculatePartyMatch";
import type { VoteDetailWithProposition, GranularUserVotes } from "../match/types";

describe("lib/match/calculatePartyMatch.ts - Afinidade Partidária Granular", () => {
  it("calcula afinidade partidária com base na média dos votos granulares dos deputados", () => {
    const userVotes: GranularUserVotes = {
      "sess-merito-1": "CONCORDO",
      "sess-destaque-1": "DISCORDO",
    };

    // 2 deputados do PARTIDO_X votando
    const votesForParty: VoteDetailWithProposition[] = [
      // Deputado 1: concorda com ambos
      {
        deputado_id: 1,
        proposicao_id: 10,
        votacao_id: "sess-merito-1",
        voto_original: "Sim",
        sigla_partido: "PARTIDO_X",
      },
      {
        deputado_id: 1,
        proposicao_id: 10,
        votacao_id: "sess-destaque-1",
        voto_original: "Não",
        sigla_partido: "PARTIDO_X",
      },
      // Deputado 2: concorda no mérito, diverge no destaque
      {
        deputado_id: 2,
        proposicao_id: 10,
        votacao_id: "sess-merito-1",
        voto_original: "Sim",
        sigla_partido: "PARTIDO_X",
      },
      {
        deputado_id: 2,
        proposicao_id: 10,
        votacao_id: "sess-destaque-1",
        voto_original: "Sim", // Votou diferente da opinião do usuário
        sigla_partido: "PARTIDO_X",
      },
    ];

    const result = calculatePartyMatch(userVotes, votesForParty);

    // Total de comparações = 4 votos
    // Concordâncias: Deputado 1 (2) + Deputado 2 (1) = 3
    // Adesão: (3 / 4) * 100 = 75%
    expect(result.matches_count).toBe(3);
    expect(result.comparable_count).toBe(4);
    expect(result.adherence).toBe(75);
  });

  it("calcula afinidade quando usuário opina apenas em seções de emendas ou destaques", () => {
    const userVotes: GranularUserVotes = {
      "sess-emenda-5": "CONCORDO",
    };

    const votesForParty: VoteDetailWithProposition[] = [
      {
        deputado_id: 1,
        proposicao_id: 20,
        votacao_id: "sess-emenda-5",
        voto_original: "Sim",
        sigla_partido: "PARTIDO_Y",
      },
      {
        deputado_id: 2,
        proposicao_id: 20,
        votacao_id: "sess-emenda-5",
        voto_original: "Sim",
        sigla_partido: "PARTIDO_Y",
      },
    ];

    const result = calculatePartyMatch(userVotes, votesForParty);

    expect(result.matches_count).toBe(2);
    expect(result.comparable_count).toBe(2);
    expect(result.adherence).toBe(100);
  });

  it("desconsidera abstenções e ausências nos votos dos deputados do partido", () => {
    const userVotes: GranularUserVotes = {
      "sess-1": "CONCORDO",
    };

    const votesForParty: VoteDetailWithProposition[] = [
      {
        deputado_id: 1,
        proposicao_id: 1,
        votacao_id: "sess-1",
        voto_original: "Sim",
        sigla_partido: "PARTIDO_Z",
      },
      {
        deputado_id: 2,
        proposicao_id: 1,
        votacao_id: "sess-1",
        voto_original: "Abstenção",
        sigla_partido: "PARTIDO_Z",
      },
      {
        deputado_id: 3,
        proposicao_id: 1,
        votacao_id: "sess-1",
        voto_original: "Ausente",
        sigla_partido: "PARTIDO_Z",
      },
    ];

    const result = calculatePartyMatch(userVotes, votesForParty);

    expect(result.matches_count).toBe(1);
    expect(result.comparable_count).toBe(1);
    expect(result.adherence).toBe(100);
  });

  it("retorna adherence null quando nenhum deputado do partido teve voto comparável", () => {
    const userVotes: GranularUserVotes = {
      "sess-sem-votos": "CONCORDO",
    };

    const votesForParty: VoteDetailWithProposition[] = [
      {
        deputado_id: 1,
        proposicao_id: 1,
        votacao_id: "sess-outra",
        voto_original: "Sim",
        sigla_partido: "PARTIDO_W",
      },
    ];

    const result = calculatePartyMatch(userVotes, votesForParty);

    expect(result.matches_count).toBe(0);
    expect(result.comparable_count).toBe(0);
    expect(result.adherence).toBeNull();
  });

  it("mantém retrocompatibilidade partidária com formato legado de opiniões por proposicao_id", () => {
    const legacyUserVotes = {
      500: "DISCORDO",
    };

    const votesForParty: VoteDetailWithProposition[] = [
      {
        deputado_id: 1,
        proposicao_id: 500,
        votacao_id: "sess-500",
        voto_original: "Não",
        sigla_partido: "PARTIDO_L",
      },
    ];

    const result = calculatePartyMatch(legacyUserVotes, votesForParty);

    expect(result.matches_count).toBe(1);
    expect(result.comparable_count).toBe(1);
    expect(result.adherence).toBe(100);
  });
});
