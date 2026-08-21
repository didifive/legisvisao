import { describe, it, expect } from "vitest";
import {
  classifyVoteSession,
  sortVoteSessionsDeterministic,
  sortPropositionsByRelevance,
  hasMeritVoteSession,
} from "../match/classifyVoteSession";

describe("classifyVoteSession - Classificação Determinística Regimental", () => {
  it("classifica corretamente o caso real do PLP 114/2026", () => {
    // 1. Aprovação do Substitutivo (Mérito real)
    const meritoPLP114 = classifyVoteSession(
      "Aprovado o Substitutivo Reformulado ao Projeto de Lei Complementar nº 114, de 2026, com parecer pela aprovação, ressalvados os destaques."
    );
    expect(meritoPLP114.type).toBe("MERITO");
    expect(meritoPLP114.priority).toBe(1);

    // 2. Votação das Emendas de Plenário ao Substitutivo (Emendas, não é mérito)
    const emendasPLP114 = classifyVoteSession(
      "Votação das Emendas de Plenário ao Substitutivo, com parecer pela rejeição. Rejeitadas as Emendas de Plenário."
    );
    expect(emendasPLP114.type).toBe("EMENDA");
    expect(emendasPLP114.priority).toBe(2);

    // 3. Votação de DTQ
    const dtqPLP114 = classifyVoteSession(
      "Votação do DTQ 1 (NOVO) - Emenda nº 1 ao Substitutivo oferecido pelo Relator. Rejeitada a Emenda de Plenário nº 1."
    );
    expect(dtqPLP114.type).toBe("DESTAQUE");
    expect(dtqPLP114.priority).toBe(3);
  });

  it("elege a aprovação do substitutivo como deliberação principal mesmo quando a votação das emendas ocorreu depois", () => {
    const sessionsPLP114 = [
      {
        id: "sess-emendas-rejeitadas",
        descricao: "Votação das Emendas de Plenário ao Substitutivo, com parecer pela rejeição. Rejeitadas as Emendas de Plenário.",
        data_hora: "2026-03-10T16:30:00Z", // Votada 30 minutos depois
        total_votos: 383,
        total_sim: 108,
        total_nao: 275,
      },
      {
        id: "sess-substitutivo-aprovado",
        descricao: "Aprovado o Substitutivo Reformulado ao Projeto de Lei Complementar nº 114, de 2026, com parecer pela aprovação.",
        data_hora: "2026-03-10T16:00:00Z", // Votada antes
        total_votos: 432,
        total_sim: 318,
        total_nao: 113,
      },
      {
        id: "sess-dtq-1",
        descricao: "Votação do DTQ 1 (NOVO) - Emenda nº 1 ao Substitutivo.",
        data_hora: "2026-03-10T17:00:00Z",
        total_votos: 350,
        total_sim: 90,
        total_nao: 260,
      },
    ];

    const sorted = sortVoteSessionsDeterministic(sessionsPLP114);

    // A sessão principal (índice 0) DEVE ser a aprovação do substitutivo (Mérito, Priority 1)
    expect(sorted[0].id).toBe("sess-substitutivo-aprovado");
    expect(sorted[0].classification.type).toBe("MERITO");
    expect(sorted[1].id).toBe("sess-emendas-rejeitadas");
    expect(sorted[1].classification.type).toBe("EMENDA");
    expect(sorted[2].id).toBe("sess-dtq-1");
    expect(sorted[2].classification.type).toBe("DESTAQUE");
  });

  it("classifica turnos de PEC, redação final e projetos de lei de conversão como Mérito", () => {
    expect(classifyVoteSession("Votação em 1º Turno da Proposta de Emenda à Constituição nº 45/2019").type).toBe("MERITO");
    expect(classifyVoteSession("Votação em 2º Turno da Proposta de Emenda à Constituição nº 45/2019").type).toBe("MERITO");
    expect(classifyVoteSession("Aprovado o Projeto de Lei de Conversão nº 12/2023").type).toBe("MERITO");
    expect(classifyVoteSession("Aprovada a Redação Final do PL 2630/2020").type).toBe("MERITO");
    expect(classifyVoteSession("Aprovada a Subemenda Substitutiva Global ao Projeto de Lei nº 123/2024").type).toBe("MERITO");
  });

  it("classifica emendas específicas a PECs como Emenda (Prioridade 2)", () => {
    expect(classifyVoteSession("Votação da Emenda de Plenário nº 1 à Proposta de Emenda à Constituição nº 45/2019").type).toBe("EMENDA");
  });

  it("classifica requerimentos procedimentais com Prioridade 4", () => {
    expect(classifyVoteSession("Requerimento de Retirada de Pauta do PL 1000").type).toBe("REQUERIMENTO");
    expect(classifyVoteSession("Requerimento de Adiamento da Votação").type).toBe("REQUERIMENTO");
    expect(classifyVoteSession("Votação do Requerimento de Urgência").type).toBe("REQUERIMENTO");
    expect(classifyVoteSession("Requerimento de Preferência").type).toBe("REQUERIMENTO");
  });

  it("classifica destaques e votações em separado com Prioridade 3", () => {
    expect(classifyVoteSession("Destaque para votação em separado do art. 5º").type).toBe("DESTAQUE");
    expect(classifyVoteSession("Votação do DVS da bancada do PL").type).toBe("DESTAQUE");
    expect(classifyVoteSession("Mantido o texto do inciso II").type).toBe("DESTAQUE");
    expect(classifyVoteSession("Suprimido o texto do parágrafo único").type).toBe("DESTAQUE");
  });

  it("classifica emendas individuais, de plenário e de relator com Prioridade 2", () => {
    expect(classifyVoteSession("Emenda de Plenário nº 5 com parecer favorável").type).toBe("EMENDA");
    expect(classifyVoteSession("Rejeitada a Emenda de Relator nº 3").type).toBe("EMENDA");
    expect(classifyVoteSession("Emendas com parecer pela rejeição").type).toBe("EMENDA");
    expect(classifyVoteSession("Subemenda à Emenda nº 1").type).toBe("EMENDA");
  });

  it("identifica corretamente quando um projeto só tem emenda e o texto-base foi simbólico (Caso PL 3085/2026)", () => {
    const pl3085Sessions = [
      {
        descricao: "Votação da Emenda de Plenário nº 2, com parecer pela rejeição.",
        tipo_deliberacao: "EMENDA",
      },
    ];

    expect(hasMeritVoteSession(pl3085Sessions)).toBe(false);
    expect(classifyVoteSession(pl3085Sessions[0].descricao).type).toBe("EMENDA");
  });

  it("identifica corretamente quando um projeto possui deliberação de mérito (hasMeritVoteSession = true)", () => {
    const plp114Sessions = [
      {
        descricao: "Votação das Emendas de Plenário ao Substitutivo.",
        tipo_deliberacao: "EMENDA",
      },
      {
        descricao: "Aprovado o Substitutivo Reformulado ao Projeto de Lei Complementar nº 114, de 2026.",
        tipo_deliberacao: null,
      },
    ];

    expect(hasMeritVoteSession(plp114Sessions)).toBe(true);
  });
});

describe("sortPropositionsByRelevance - Ordenação Cívica", () => {
  it("prioriza maior quórum e menor margem de diferença entre Sim e Não", () => {
    const props = [
      { id: 1, total_sim: 200, total_nao: 200, total_outros: 0 }, // Quórum 400, Diff 0
      { id: 2, total_sim: 350, total_nao: 50, total_outros: 0 },  // Quórum 400, Diff 300
      { id: 3, total_sim: 100, total_nao: 100, total_outros: 0 }, // Quórum 200, Diff 0
    ];

    const sorted = sortPropositionsByRelevance(props);
    expect(sorted[0].id).toBe(1); // Maior quórum e mais disputado (diff 0)
    expect(sorted[1].id).toBe(2); // Maior quórum mas menos disputado (diff 300)
    expect(sorted[2].id).toBe(3); // Menor quórum
  });
});
