// ====================================================================
// LegisVisão - Módulo de Integração com Google AI Studio (Gemini API)
// Suporte a Modelos Dinâmicos, Cotas, Cooldown, Multimodal e JSON Estruturado
// ====================================================================

import {
  recordModelFailure,
  recordModelSuccess,
  resolveCandidateModels,
} from "./modelRegistry";
import { fetchPropositionPdfBuffer } from "./pdfFetcher";
import {
  buildEnrichmentRequestBody,
  normalizeEnrichedSessions,
  parseSafeJson,
} from "./promptBuilder";
import type {
  PropositionWithSessionsContext,
  UnifiedPropositionEnrichmentResult,
} from "./types";

export * from "./types";
export * from "./modelRegistry";
export * from "./promptBuilder";
export * from "./pdfFetcher";

interface RawModelResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

interface ParsedEnrichmentPayload {
  resumo_geral?: string;
  sessoes?: Array<{
    id: string;
    tipo_deliberacao?: string;
    titulo_amigavel?: string;
    resumo_simplificado?: string;
    pergunta_cidadao?: string;
  }>;
}

async function requestModelGeneration(
  model: string,
  key: string,
  requestBody: unknown
): Promise<string | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      recordModelFailure(model, response.status);
      const errorText = await response.text();
      if (response.status === 503 || response.status === 404 || response.status === 429) {
        return null;
      }
      throw new Error(`Falha na chamada ao Google AI Studio (${response.status}): ${errorText.slice(0, 200)}`);
    }

    recordModelSuccess(model);
    const data = (await response.json()) as RawModelResponse;
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  } catch (err) {
    recordModelFailure(model, 500);
    throw err;
  }
}

/**
 * Enriquecimento Unificado com Gemini:
 * Envia o PDF/texto da proposição legislativa e todas as suas sessões de votação em uma ÚNICA chamada multimodal.
 * Utiliza cascata com cooldown inteligente e failover automático de modelos.
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

  const requestBody = buildEnrichmentRequestBody(context, pdfBuffer);
  let lastError: Error | null = null;

  for (const model of modelsToTry) {
    try {
      const rawText = await requestModelGeneration(model, key, requestBody);
      if (rawText === null) {
        lastError = new Error(`Modelo ${model} retornou indisponibilidade ou rate limit temporário`);
        continue;
      }

      const parsed = parseSafeJson<ParsedEnrichmentPayload>(rawText, {});
      const normalizedSessoes = normalizeEnrichedSessions(parsed.sessoes, context);

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
