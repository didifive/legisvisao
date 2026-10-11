// ====================================================================
// LegisVisão - Módulo de Integração com Google AI Studio (Gemini API)
// Suporte a Modelos Dinâmicos, Cotas, Cooldown, Multimodal e JSON Estruturado
// ====================================================================

import {
  recordModelFailure,
  recordModelSuccess,
  resolveCandidateModels,
  resolveApiKey,
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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function getSecureJitterMs(attempt: number): number {
  if (typeof globalThis !== "undefined" && globalThis.crypto?.getRandomValues) {
    const array = new Uint32Array(1);
    globalThis.crypto.getRandomValues(array);
    return attempt * 2000 + (array[0] % 600);
  }
  return attempt * 2000 + 350;
}

async function executeHttpCall(
  model: string,
  key: string,
  requestBody: unknown
): Promise<{ status: number; text?: string; errorText?: string }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35_000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return { status: response.status, errorText };
    }

    const data = (await response.json()) as RawModelResponse;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    return { status: 200, text };
  } catch (err) {
    clearTimeout(timeoutId);
    const isAbort = (err as Error)?.name === "AbortError";
    return { status: isAbort ? 408 : 500, errorText: (err as Error).message };
  }
}

async function requestModelGeneration(
  model: string,
  key: string,
  requestBody: unknown
): Promise<string | null> {
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    const outcome = await executeHttpCall(model, key, requestBody);

    if (outcome.status === 200 && outcome.text !== undefined) {
      recordModelSuccess(model);
      return outcome.text;
    }

    if (outcome.status === 404) {
      recordModelFailure(model, 404);
      return null;
    }

    if (outcome.status === 429) {
      if (attempt < maxRetries) {
        await sleep(getSecureJitterMs(attempt));
        continue;
      }
      recordModelFailure(model, 429);
      return null;
    }

    if (outcome.status === 503) {
      recordModelFailure(model, 503);
      return null;
    }

    recordModelFailure(model, outcome.status);
    throw new Error(
      `Falha na chamada ao Google AI Studio (${outcome.status}): ${(outcome.errorText || "").slice(0, 200)}`
    );
  }

  return null;
}

/**
 * Enriquecimento Unificado com Gemini:
 * Envia o PDF/texto da proposição legislativa e todas as suas sessões de votação em uma ÚNICA chamada multimodal.
 * Utiliza cascata com cooldown inteligente, retentativas com jitter e failover automático de modelos.
 */
export async function enrichPropositionAndSessionsWithGemini(
  context: PropositionWithSessionsContext,
  apiKey?: string
): Promise<UnifiedPropositionEnrichmentResult> {
  const key = resolveApiKey(apiKey);
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
        lastError.message.includes("429") ||
        lastError.message.includes("408")
      ) {
        continue;
      }
      throw lastError;
    }
  }

  throw lastError || new Error("Nenhum modelo da lista de fallback pôde responder à requisição.");
}
