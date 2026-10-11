// ====================================================================
// LegisVisão - Construção de Prompts e Normalização de Respostas
// ====================================================================

import type {
  PropositionWithSessionsContext,
  EnrichedSessionItem,
  DeliberationType,
} from "./types";

export function parseSafeJson<T>(rawText: string, fallback: T): T {
  try {
    const clean = rawText
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    return JSON.parse(clean) as T;
  } catch {
    return fallback;
  }
}

export function normalizeEnrichedSessions(
  rawSessoes: Array<{
    id?: string;
    tipo_deliberacao?: string;
    titulo_amigavel?: string;
    resumo_simplificado?: string;
    pergunta_cidadao?: string;
  }> | undefined,
  context: PropositionWithSessionsContext
): EnrichedSessionItem[] {
  const sessoesMap = new Map<string, EnrichedSessionItem>();

  if (Array.isArray(rawSessoes)) {
    for (const s of rawSessoes) {
      if (!s?.id) continue;
      sessoesMap.set(String(s.id), {
        id: String(s.id),
        tipo_deliberacao: (s.tipo_deliberacao as DeliberationType) || "OUTRO",
        titulo_amigavel: s.titulo_amigavel || "Deliberação em Plenário",
        resumo_simplificado: s.resumo_simplificado || "",
        pergunta_cidadao: s.pergunta_cidadao || `Você concorda com esta deliberação sobre ${context.titulo}?`,
      });
    }
  }

  return context.sessoes.map((s) => {
    const found = sessoesMap.get(s.id);
    if (found) return found;
    return {
      id: s.id,
      tipo_deliberacao: "OUTRO" as const,
      titulo_amigavel: s.descricao.slice(0, 80),
      resumo_simplificado: s.descricao,
      pergunta_cidadao: `Você concorda com esta deliberação sobre ${context.titulo}?`,
    };
  });
}

export function buildEnrichmentRequestBody(
  context: PropositionWithSessionsContext,
  pdfBuffer: Buffer | null
) {
  const systemInstruction = `
Você é um cientista político e comunicador cívico sênior especialista na Câmara dos Deputados do Brasil e nas diretrizes de neutralidade do LegisVisão.
Sua missão é ler o documento oficial da proposição (PDF do inteiro teor ou ementa oficial) e todas as suas sessões de votação no Plenário, gerando em UMA ÚNICA resposta:

1. "resumo_geral": Um Resumo Geral explicativo da proposta de lei (de 2 a no MÁXIMO 4 frases completas) com foco puramente informativo e factual:
   - FOCO PRÁTICO E CONCRETO: Explique o que a proposta de lei visa criar, alterar ou revogar no ordenamento jurídico, no cotidiano e nos direitos e deveres dos cidadãos e instituições.
   - MATERIALIDADE E EXEMPLOS DA LEI: Quando a proposta mencionar critérios, vedações, benefícios, requisitos ou categorias (ex: "critérios de relevância", "isenções", "punições"), NÃO use apenas termos abstratos. Especifique os pontos centrais e cite 2 a 3 hipóteses ou exemplos concretos trazidos no texto da lei (como valores mínimos, tipos de ações, crimes, temas ou áreas afetadas), utilizando expressões como "tais como...", "como nos casos de...", "incluindo...".
   - CONCISÃO: Extensão máxima estrita de até 4 frases. Seja objetivo e não inclua orientações ou subsídios de voto neste campo.

2. "sessoes": Um array contendo a análise para CADA sessão de votação fornecida:
   - "id": O mesmo identificador oficial da sessão fornecido.
   - "tipo_deliberacao": "MERITO" | "DESTAQUE" | "EMENDA" | "REQUERIMENTO" | "OUTRO"
   - "titulo_amigavel": Título curto e informativo indicando o tema específico votado (máximo 80 caracteres).
   - "resumo_simplificado": Resumo explicativo rico de 3 a 5 frases sobre o que a sessão estava deliberando e SUBSÍDIO PARA OPINIÃO DO CIDADÃO:
     * OBJETO DA DELIBERAÇÃO: Descreva exatamente do que a sessão se tratava (ex: "Sessão que trata da votação do texto-base geral da proposta em 1º turno...", "Votação de destaque que buscava suprimir o artigo que prevê...", "Deliberação de emenda que altera a regra de...").
     * NÃO DESTACAR O RESULTADO/PLACAR: Não fundamente a explicação no fato de a matéria ter sido aprovada ou rejeitada, para não gerar viés na reflexão do cidadão; concentre-se no conteúdo e na controvérsia votada.
     * SUBSÍDIO PARA OPINIÃO ("CONCORDO" / "DISCORDO"): Estruture a explicação para que um cidadão comum sem conhecimento jurídico compreenda claramente o mérito, os pontos de debate e o impacto prático da medida, permitindo-lhe avaliar conscientemente se votaria a favor ou contra aquela deliberação com base nos efeitos de cada posicionamento.
   - "pergunta_cidadao": Pergunta direta, neutra e compreensível para o cidadão opinar sobre a matéria (ex: "Você concorda com a aprovação do texto-base que institui novas diretrizes para...?").

DIRETRIZES DE ESTILO E NEUTRALIDADE:
- Imparcialidade absoluta: tom puramente informativo e descritivo, sem adjetivos valorativos (ex: "importante", "nocivo", "avanço", "retrocesso").
- Linguagem cidadã: evite jargões processuais herméticos sem traduzi-los para o português cotidiano.
- Não utilize travessão (-) ou (—) no meio de frases; utilize vírgulas, parênteses ou dois-pontos.
- Retorne EXCLUSIVAMENTE um objeto JSON válido.
`;

  const sessoesText = context.sessoes.length > 0
    ? context.sessoes
        .map(
          (s, idx) => `
[Sessão ${idx + 1}]
- ID Oficial: ${s.id}
- Descrição da Mesa: ${s.descricao}
- Resultado Oficial: ${s.resultado || "Não informado"}
- Data/Hora: ${s.data_hora || "Não informada"}
`
        )
        .join("\n")
    : "Nenhuma sessão de votação nominal registrada até o momento.";

  const promptText = `
DADOS DA PROPOSIÇÃO:
- Identificação: ${context.titulo} (ID: ${context.proposicaoId})
- Ementa Oficial: ${context.ementa}
${context.ementaDetalhada ? `- Ementa Detalhada: ${context.ementaDetalhada}` : ""}
${context.tema ? `- Área Temática: ${context.tema}` : ""}
${pdfBuffer ? "- Documento Oficial: PDF do inteiro teor anexado." : "- Documento: Baseado na ementa e dados oficiais registrados na Câmara."}

LISTA DE SESSÕES DELIBERADAS NO PLENÁRIO:
${sessoesText}

Gere o JSON completo contendo "resumo_geral" e o array "sessoes" para todas as sessões listadas.
`;

  const userParts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
    { text: `${systemInstruction}\n\n${promptText}` },
  ];

  if (pdfBuffer) {
    userParts.push({
      inlineData: {
        mimeType: "application/pdf",
        data: pdfBuffer.toString("base64"),
      },
    });
  }

  return {
    contents: [
      {
        role: "user",
        parts: userParts,
      },
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
    },
  };
}
