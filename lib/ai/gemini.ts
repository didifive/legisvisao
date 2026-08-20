// ====================================================================
// LegisVisão - Módulo de Integração com Google AI Studio (Gemini API)
// Suporte a Fallback Automático e Alta Resiliência
// ====================================================================

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

const FALLBACK_MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-flash-latest",
  "gemini-3.7-flash",
];

/**
 * Consulta a API do Google AI Studio (Gemini) para gerar resumo amigável e pergunta contextualizada.
 */
export async function enrichSessionWithGemini(
  context: SessionContextData,
  apiKey?: string
): Promise<GeminiSessionEnrichment> {
  const key = apiKey || process.env.GEMINI_API_KEY;

  if (!key) {
    throw new Error(
      "GEMINI_API_KEY não encontrada nas variáveis de ambiente. Configure no arquivo .env.local."
    );
  }

  const customModel = process.env.GEMINI_MODEL;
  const modelsToTry = customModel
    ? [customModel, ...FALLBACK_MODELS.filter((m) => m !== customModel)]
    : FALLBACK_MODELS;

  const systemInstruction = `
Você é um especialista em direito parlamentar e comunicação cívica neutra do LegisVisão.
Sua missão é ler o objeto de uma votação nominal da Câmara dos Deputados (que pode ser Texto-Base, Destaque para Votação em Separado - DVS/DTQ, Emenda de Plenário ou Requerimento) e traduzi-la para uma linguagem cidadã clara, acessível, neutra e 100% apartidária.

DIRETRIZES RÍGIDAS DE ESTILO E NEUTRALIDADE:
1. Imparcialidade Absoluta: Não tome lado, não use adjetivos elogiosos ou pejorativos e não expresse juízo de valor.
2. Formato da Resposta: Retorne EXCLUSIVAMENTE um objeto JSON válido no formato especificado.
3. Não utilize travessão (-) ou (—) no meio de frases; utilize vírgulas, parênteses ou dois-pontos.
4. Tipo de Deliberação: Classifique estritamente entre:
   - "MERITO" (Texto-base, substitutivo geral, redação final)
   - "DESTAQUE" (Destaque para votação em separado, DVS, DTQ, supressão de artigo)
   - "EMENDA" (Emenda de plenário, emenda de relator, subemenda)
   - "REQUERIMENTO" (Retirada de pauta, adiamento, urgência)
   - "OUTRO" (Demais deliberações)

CAMPOS DO JSON:
{
  "tipo_deliberacao": "MERITO" | "DESTAQUE" | "EMENDA" | "REQUERIMENTO" | "OUTRO",
  "titulo_amigavel": "Título curto (máximo 70 caracteres) indicando o objeto do destaque ou votação",
  "resumo_simplificado": "Explicação concisa (2 a 3 frases) do que esta deliberação específica altera na prática no projeto de lei",
  "pergunta_cidadao": "Pergunta direta para o cidadão opinar (ex: 'Você concorda em retirar a isenção tributária para o setor X?')"
}
`;

  const userPrompt = `
DADOS DA PROPOSIÇÃO:
- Identificação: ${context.proposicaoTitulo} (ID: ${context.proposicaoId})
- Ementa Geral da Proposta: ${context.proposicaoEmenta}

DADOS DA DELIBERAÇÃO DA CÂMARA:
- Código da Sessão: ${context.sessionId}
- Descrição Oficial: ${context.sessionDescricao}
- Resultado Oficial: ${context.sessionResultado || "Não informado"}

Gere a análise neutra no formato JSON solicitado.
`;

  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `${systemInstruction}\n\n${userPrompt}`,
          },
        ],
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        // Se for 503 (indisponível momentaneamente) ou 404, tenta o próximo modelo da lista de fallback
        if (response.status === 503 || response.status === 404) {
          lastError = new Error(`Modelo ${model} retornou ${response.status}: ${errorText.slice(0, 100)}`);
          continue;
        }
        throw new Error(`Falha na chamada ao Google AI Studio (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

      const parsed = JSON.parse(rawText) as GeminiSessionEnrichment;

      return {
        tipo_deliberacao: parsed.tipo_deliberacao || "OUTRO",
        titulo_amigavel: parsed.titulo_amigavel || context.sessionDescricao.slice(0, 70),
        resumo_simplificado: parsed.resumo_simplificado || context.sessionDescricao,
        pergunta_cidadao:
          parsed.pergunta_cidadao ||
          `Você concorda com esta deliberação sobre ${context.proposicaoTitulo}?`,
      };
    } catch (err) {
      lastError = err as Error;
      if (lastError.message.includes("503") || lastError.message.includes("404")) {
        continue;
      }
      throw lastError;
    }
  }

  throw lastError || new Error("Nenhum modelo da lista de fallback pôde responder à requisição.");
}
