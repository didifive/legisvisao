// ====================================================================
// LegisVisão - Módulo de Integração com Google AI Studio (Gemini API)
// Suporte a Modelos Dinâmicos, Quotas, Envio Multimodal de PDFs e Resumos Ricos
// ====================================================================

export interface GeminiModelInfo {
  name: string;
  displayName: string;
  inputTokenLimit: number;
  outputTokenLimit: number;
  supportedMethods: string[];
}

export interface PropositionSummaryContext {
  proposicaoId: number;
  titulo: string;
  ementa: string;
  ementaDetalhada?: string | null;
  tema?: string | null;
  urlInteiroTeor?: string | null;
}

export interface PropositionSummaryResult {
  resumo_geral: string;
}

export interface GeminiSessionEnrichment {
  tipo_deliberacao: "MERITO" | "DESTAQUE" | "EMENDA" | "REQUERIMENTO" | "OUTRO";
  titulo_amigavel: string;
  resumo_simplificado: string;
  pergunta_cidadao: string;
}

export interface SessionContextData {
  sessionId: string;
  proposicaoId: number;
  proposicaoTitulo: string;
  proposicaoEmenta: string;
  sessionDescricao: string;
  sessionResultado?: string | null;
}

const DEFAULT_PRIORITY_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-3.5-flash",
  "gemini-3.7-flash",
  "gemini-flash-latest",
  "gemini-2.5-pro",
];

/**
 * Consulta a lista oficial de modelos ativos disponíveis para a chave no Google AI Studio.
 */
export async function listAvailableGeminiModels(apiKey?: string): Promise<GeminiModelInfo[]> {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY não encontrada nas variáveis de ambiente. Configure no arquivo .env.local."
    );
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });

    if (!res.ok) {
      const errTxt = await res.text();
      throw new Error(`Falha ao consultar modelos no Google AI Studio (${res.status}): ${errTxt.slice(0, 150)}`);
    }

    const data = await res.json();
    const rawModels: Array<{
      name?: string;
      displayName?: string;
      inputTokenLimit?: number;
      outputTokenLimit?: number;
      supportedGenerationMethods?: string[];
    }> = data.models || [];

    const contentModels = rawModels.filter((m) =>
      m.supportedGenerationMethods?.includes("generateContent")
    );

    return contentModels.map((m) => ({
      name: (m.name || "").replace("models/", ""),
      displayName: m.displayName || m.name || "",
      inputTokenLimit: m.inputTokenLimit || 0,
      outputTokenLimit: m.outputTokenLimit || 0,
      supportedMethods: m.supportedGenerationMethods || [],
    }));
  } catch (err) {
    console.warn("⚠️ Aviso ao listar modelos do Google AI Studio:", (err as Error).message);
    return [];
  }
}

/**
 * Seleciona a lista ordenada de modelos para tentativa com base na configuração e disponibilidade.
 */
async function resolveCandidateModels(apiKey?: string): Promise<string[]> {
  const customModel = process.env.GEMINI_MODEL;
  if (customModel) {
    return [customModel, ...DEFAULT_PRIORITY_MODELS.filter((m) => m !== customModel)];
  }

  const activeModels = await listAvailableGeminiModels(apiKey);
  if (activeModels.length > 0) {
    // Apenas modelos Gemini suportam envio de documentos/PDF multimodal
    const multimodalActive = activeModels.filter(
      (m) =>
        m.name.startsWith("gemini-") &&
        !m.name.includes("-tts") &&
        !m.name.includes("embedding") &&
        !m.name.includes("imagen")
    );
    const activeNames = new Set(multimodalActive.map((m) => m.name));
    const prioritized = DEFAULT_PRIORITY_MODELS.filter((m) => activeNames.has(m));
    const others = multimodalActive.map((m) => m.name).filter((m) => !DEFAULT_PRIORITY_MODELS.includes(m));
    return [...prioritized, ...others];
  }

  return DEFAULT_PRIORITY_MODELS;
}

/**
 * Baixa o PDF do inteiro teor oficial da Câmara dos Deputados em memória.
 */
async function fetchPropositionPdfBuffer(url: string): Promise<Buffer | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "LegisVisao/1.0 (https://legisvisao.com.br; contato@legisvisao.com.br)",
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) return null;

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Limite de segurança de 20MB para inline data do Gemini
    if (buffer.length > 20 * 1024 * 1024) {
      return null;
    }

    return buffer;
  } catch {
    return null;
  }
}

export interface PropositionWithSessionsContext {
  proposicaoId: number;
  titulo: string;
  ementa: string;
  ementaDetalhada?: string | null;
  tema?: string | null;
  urlInteiroTeor?: string | null;
  sessoes: Array<{
    id: string;
    descricao: string;
    resultado?: string | null;
    data_hora?: string | null;
  }>;
}

export interface UnifiedPropositionEnrichmentResult {
  resumo_geral: string;
  sessoes: Array<{
    id: string;
    tipo_deliberacao: "MERITO" | "DESTAQUE" | "EMENDA" | "REQUERIMENTO" | "OUTRO";
    titulo_amigavel: string;
    resumo_simplificado: string;
    pergunta_cidadao: string;
  }>;
  model_used: string;
}

/**
 * Enriquecimento Unificado com Gemini:
 * Envia o PDF/texto da proposição legislativa e todas as suas sessões de votação em uma ÚNICA chamada multimodal.
 * Retorna o resumo geral da lei e os resumos específicos de cada deliberação (mérito, destaques, emendas).
 */
export async function enrichPropositionAndSessionsWithGemini(
  context: PropositionWithSessionsContext,
  apiKey?: string
): Promise<UnifiedPropositionEnrichmentResult> {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY não encontrada nas variáveis de ambiente. Configure no arquivo .env.local."
    );
  }

  const modelsToTry = await resolveCandidateModels(key);

  let pdfBuffer: Buffer | null = null;
  if (context.urlInteiroTeor) {
    pdfBuffer = await fetchPropositionPdfBuffer(context.urlInteiroTeor);
  }

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

  const requestBody = {
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

  let lastError: Error | null = null;

  for (const model of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 503 || response.status === 404 || response.status === 429) {
          lastError = new Error(`Modelo ${model} retornou ${response.status}: ${errorText.slice(0, 120)}`);
          continue;
        }
        throw new Error(`Falha na chamada ao Google AI Studio (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      const parsed = JSON.parse(rawText) as {
        resumo_geral?: string;
        sessoes?: Array<{
          id: string;
          tipo_deliberacao?: string;
          titulo_amigavel?: string;
          resumo_simplificado?: string;
          pergunta_cidadao?: string;
        }>;
      };

      const sessoesMap = new Map<string, {
        id: string;
        tipo_deliberacao: "MERITO" | "DESTAQUE" | "EMENDA" | "REQUERIMENTO" | "OUTRO";
        titulo_amigavel: string;
        resumo_simplificado: string;
        pergunta_cidadao: string;
      }>();

      if (Array.isArray(parsed.sessoes)) {
        for (const s of parsed.sessoes) {
          if (!s || !s.id) continue;
          sessoesMap.set(String(s.id), {
            id: String(s.id),
            tipo_deliberacao: (s.tipo_deliberacao as any) || "OUTRO",
            titulo_amigavel: s.titulo_amigavel || "Deliberação em Plenário",
            resumo_simplificado: s.resumo_simplificado || "",
            pergunta_cidadao: s.pergunta_cidadao || `Você concorda com esta deliberação sobre ${context.titulo}?`,
          });
        }
      }

      // Garante que todas as sessões do contexto tenham retorno mesmo com fallback
      const normalizedSessoes = context.sessoes.map((s) => {
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

      return {
        resumo_geral: parsed.resumo_geral || context.ementaDetalhada || context.ementa,
        sessoes: normalizedSessoes,
        model_used: model,
      };
    } catch (err) {
      lastError = err as Error;
      if (
        lastError.message.includes("503") ||
        lastError.message.includes("404") ||
        lastError.message.includes("429")
      ) {
        continue;
      }
      throw lastError;
    }
  }

  throw lastError || new Error("Nenhum modelo da lista de fallback pôde responder à requisição.");
}
