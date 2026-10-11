import { describe, it, expect } from "vitest";
import {
  parseSafeJson,
  normalizeEnrichedSessions,
  buildEnrichmentRequestBody,
} from "../promptBuilder";
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

  it("constrói request body com systemInstruction anti-slop e geração de JSON", () => {
    const context: PropositionWithSessionsContext = {
      proposicaoId: 101,
      titulo: "PL 101/2026",
      ementa: "Dispõe sobre regras de trânsito",
      sessoes: [
        { id: "s-1", descricao: "Votação do texto-base" },
      ],
    };

    const body = buildEnrichmentRequestBody(context, null);

    expect(body.generationConfig.responseMimeType).toBe("application/json");
    expect(body.generationConfig.temperature).toBe(0.1);
    expect(body.systemInstruction.parts[0].text).toContain("ANTI-SLOP");
    expect(body.systemInstruction.parts[0].text).toContain("PALAVRAS E CLICHÊS BANIDOS");
    expect(body.systemInstruction.parts[0].text).toContain("PROIBIÇÃO DE TRAVESSÕES");
    expect(body.contents[0].parts[0].text).toContain("PL 101/2026");
  });

  it("anexa inlineData em Base64 quando pdfBuffer é fornecido", () => {
    const context: PropositionWithSessionsContext = {
      proposicaoId: 102,
      titulo: "PL 102/2026",
      ementa: "Ementa",
      sessoes: [],
    };

    const mockBuffer = Buffer.from("%PDF-1.4 mock content");
    const body = buildEnrichmentRequestBody(context, mockBuffer);

    expect(body.contents[0].parts).toHaveLength(2);
    expect(body.contents[0].parts[0].inlineData).toEqual({
      mimeType: "application/pdf",
      data: mockBuffer.toString("base64"),
    });
    expect(body.contents[0].parts[1].text).toContain("PL 102/2026");
  });
});
