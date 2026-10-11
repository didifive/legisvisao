import { describe, it, expect } from "vitest";
import { parseSafeJson, normalizeEnrichedSessions } from "../promptBuilder";
import type { PropositionWithSessionsContext } from "../types";

describe("lib/ai/promptBuilder.ts - Sanitização de JSON e Normalização", () => {
  it("sanitiza blocos de markdown em respostas JSON", () => {
    const raw = "```json\n{\"resumo_geral\": \"Texto de teste\"}\n```";
    const parsed = parseSafeJson(raw, { resumo_geral: "" });

    expect(parsed.resumo_geral).toBe("Texto de teste");
  });

  it("retorna fallback gracioso quando o JSON for malformado", () => {
    const raw = "Conteúdo quebrado { sem json válido";
    const fallback = { fallback: true };
    const parsed = parseSafeJson(raw, fallback);

    expect(parsed).toEqual(fallback);
  });

  it("normaliza sessões enriquecidas aplicando valores padrão caso faltem propriedades", () => {
    const context: PropositionWithSessionsContext = {
      proposicaoId: 100,
      titulo: "PL 100/2026",
      ementa: "Ementa oficial",
      sessoes: [
        { id: "sess-1", descricao: "Votação do mérito" },
        { id: "sess-2", descricao: "Votação de destaque" },
      ],
    };

    const rawSessoes = [
      {
        id: "sess-1",
        tipo_deliberacao: "MERITO",
        titulo_amigavel: "Aprovação do mérito",
        resumo_simplificado: "Resumo explicativo",
        pergunta_cidadao: "Você concorda?",
      },
    ];

    const normalized = normalizeEnrichedSessions(rawSessoes, context);

    expect(normalized).toHaveLength(2);
    expect(normalized[0].titulo_amigavel).toBe("Aprovação do mérito");
    // sess-2 não veio no retorno da IA, deve receber fallback seguro
    expect(normalized[1].id).toBe("sess-2");
    expect(normalized[1].tipo_deliberacao).toBe("OUTRO");
  });
});
