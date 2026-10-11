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
      .replaceAll('```', "")
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
Você é um analista político e comunicador cívico sênior especialista na Câmara dos Deputados do Brasil e nas diretrizes de neutralidade do LegisVisão.
Sua missão é analisar o documento oficial da proposição legislativa (PDF do inteiro teor ou ementa oficial) e todas as suas sessões de votação no Plenário, gerando em UMA ÚNICA resposta:

1. "resumo_geral": Um resumo explicativo da proposta de lei (de 2 a no MÁXIMO 4 frases) com foco puramente factual e prático:
   - IMPACTO CONCRETO: Explique o que a proposta altera na prática na vida do cidadão, de empresas ou do Estado (direitos, deveres, proibições, taxas, serviços ou benefícios).
   - MATERIALIDADE E EXEMPLOS: Não use apenas categorias genéricas (como "critérios rigorosos" ou "benefícios fiscais"). Cite 2 a 3 hipóteses ou exemplos específicos trazidos no texto da lei (como valores, prazos, tipos de crimes, sanções ou setores afetados).
   - CONCISÃO ABSOLUTA: Limite estrito de até 4 frases. Vá direto ao ponto sem introduções vazias.

2. "sessoes": Um array contendo a análise para CADA sessão de votação fornecida:
   - "id": O identificador oficial da sessão fornecido.
   - "tipo_deliberacao": "MERITO" | "DESTAQUE" | "EMENDA" | "REQUERIMENTO" | "OUTRO"
   - "titulo_amigavel": Título curto e informativo indicando o tema específico votado (máximo 80 caracteres), sem clichês ou enfeites.
   - "resumo_simplificado": Resumo explicativo rico de 3 a 5 frases sobre o objeto da sessão e SUBSÍDIO PARA OPINIÃO DO CIDADÃO:
     * OBJETO DA DELIBERAÇÃO: Descreva exatamente o que foi votado (se era o texto principal, se era para retirar um artigo específico, se era uma alteração pontual de regra).
     * EFEITOS PRÁTICOS ("CONCORDO" / "DISCORDO"): Explique de forma simples o efeito de cada posicionamento (o que muda se a medida for aprovada versus o que acontece se for rejeitada), para que um cidadão sem formação jurídica possa avaliar sua própria posição com clareza.
     * NUNCA MENCIONAR O RESULTADO OFICIAL: Não cite se a matéria foi aprovada, rejeitada ou o placar de votos, para não induzir a reflexão do cidadão nem gerar efeito manada.
   - "pergunta_cidadao": Pergunta direta, conversacional e neutra, permitindo ao cidadão responder "CONCORDO" ou "DISCORDO" (exemplo: "Você concorda em proibir a cobrança de taxa de conveniência na compra de ingressos pela internet?").

DIRETRIZES OBRIGATÓRIAS DE REDAÇÃO (ANTI-SLOP, HUMANIZADOR E NEUTRALIDADE):
- PROIBIÇÃO DE TRAVESSÕES: Nunca utilize travessões no meio de frases. Utilize apenas vírgulas, parênteses ou dois-pontos.
- PALAVRAS E CLICHÊS BANIDOS: Não use termos vazios como "robusto", "divisor de águas", "notável", "fundamental", "crucial", "imprescindível", "salutar", "vital", "primordial", "transformador", "ecossistema", "sinergia", "holístico", "em suma", "vale ressaltar", "é importante destacar", "cabe frisar", "cumpre salientar", "no cenário atual", "diante disso", "relevante notar", "marco histórico", "passo fundamental".
- SEM PREÂMBULOS VAZIOS: Nunca comece com "Trata-se de", "Este projeto visa", "É uma proposta que busca". Comece diretamente pela ação concreta da lei (exemplo: "O projeto obriga...", "A proposta isenta...").
- ZERO GERUNDISMO DE FALSA PROFUNDIDADE: Não use orações subordinadas com gerúndios que fingem profundidade (como "visando garantir...", "buscando proporcionar...", "promovendo um avanço...", "assegurando transparência..."). Use verbos de ação diretos no presente do indicativo.
- TESTE DE PORTABILIDADE: Se uma frase puder ser aproveitada em qualquer outro projeto de lei genérico sem alterar palavras, ela é enchimento e deve ser eliminada. Todo trecho deve carregar regras, números, categorias ou penalidades específicas da matéria.
- MOSTRE, NÃO JULGUE (SHOW, DON'T TELL): Não qualifique as medidas como "avanços", "retrocessos", "punições severas" ou "regras rígidas". Apenas descreva a regra e a punição exatas.
- LINGUAGEM CIDADÃ: Substitua jargões legislativos herméticos (como "substitutivo", "juízo de admissibilidade", "aditamento") por explicações claras e cotidianas.
- Retorne EXCLUSIVAMENTE um objeto JSON válido, sem comentários ou blocos de texto adicionais.
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

  const userParts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

  if (pdfBuffer) {
    userParts.push({
      inlineData: {
        mimeType: "application/pdf",
        data: pdfBuffer.toString("base64"),
      },
    });
  }

  userParts.push({ text: promptText });

  return {
    systemInstruction: {
      parts: [{ text: systemInstruction.trim() }],
    },
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
