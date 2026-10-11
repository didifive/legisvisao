// ====================================================================
// LegisVisão - Script de Enriquecimento Semântico por IA (Google AI Studio)
// Pipeline Unificado: 1 Projeto + Todas as Sessões por Requisição Multimodal
// ====================================================================

import { sql } from "./client";
import {
  listAvailableGeminiModels,
  enrichPropositionAndSessionsWithGemini,
  PropositionWithSessionsContext,
} from "../../lib/ai/gemini";
import * as dotenv from "dotenv";
import * as path from "node:path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

interface PropositionHeader {
  id: number;
  titulo: string;
  ementa: string;
  ementa_detalhada: string | null;
  tema: string | null;
  url_inteiro_teor: string | null;
}

interface RawSessionRow {
  id: string;
  proposicao_id: number;
  descricao: string;
  resultado: string | null;
  data_hora: string | null;
}

interface CliConfig {
  limit: number;
  concurrency: number;
  dryRun: boolean;
  propositionId: number | null;
  sessionId: string | null;
  force: boolean;
  showModels: boolean;
}

function parseNumericOption(valueStr: string): number | null {
  const val = Number.parseInt(valueStr, 10);
  if (!Number.isNaN(val) && val > 0) return val;
  return null;
}

function parseCliOption(arg: string, config: CliConfig): void {
  if (arg === "--models" || arg === "--list-models") {
    config.showModels = true;
    return;
  }
  if (arg === "--dry-run") {
    config.dryRun = true;
    return;
  }
  if (arg === "--force") {
    config.force = true;
    return;
  }

  const [key, ...rest] = arg.split("=");
  const value = rest.join("=");
  if (!value) return;

  if (key === "--limit") {
    config.limit = parseNumericOption(value) ?? config.limit;
    return;
  }
  if (key === "--concurrency") {
    config.concurrency = parseNumericOption(value) ?? config.concurrency;
    return;
  }
  if (key === "--proposicao" || key === "--proposition" || key === "--id") {
    config.propositionId = parseNumericOption(value) ?? config.propositionId;
    return;
  }
  if (key === "--session") {
    config.sessionId = value.trim();
  }
}

function parseArgs(): CliConfig {
  const args = process.argv.slice(2);
  const isFreeTier = (process.env.GEMINI_TIER || "free").toLowerCase().trim() !== "paid";
  const defaultConcurrency = isFreeTier ? 1 : 2;

  const config: CliConfig = {
    limit: 500,
    concurrency: defaultConcurrency,
    dryRun: false,
    propositionId: null,
    sessionId: null,
    force: false,
    showModels: false,
  };

  for (const arg of args) {
    parseCliOption(arg, config);
  }

  if (process.env.AI_LIMIT) {
    const envLimit = Number.parseInt(process.env.AI_LIMIT, 10);
    if (!Number.isNaN(envLimit) && envLimit > 0) config.limit = envLimit;
  }

  return config;
}

async function displayAvailableModels(apiKey: string): Promise<boolean> {
  console.log("🔍 Verificando modelos ativos no Google AI Studio...");
  const models = await listAvailableGeminiModels(apiKey);

  if (models.length > 0) {
    console.log(`📦 Modelos disponíveis para geração de conteúdo (${models.length}):`);
    for (const m of models.slice(0, 8)) {
      console.log(`   • ${m.name.padEnd(26)} | In: ${String(m.inputTokenLimit).padEnd(8)} tokens | Out: ${m.outputTokenLimit} tokens`);
    }
    if (models.length > 8) {
      console.log(`   • ... e mais ${models.length - 8} modelos disponíveis.`);
    }
  } else {
    console.log("ℹ️ Nenhum modelo retornado ou chave ausente.");
  }

  return models.length > 0;
}

async function resolveTargetPropositionId(
  sessionId: string | null,
  propositionId: number | null
): Promise<number | null> {
  if (propositionId) return propositionId;
  if (!sessionId) return null;

  const sessionOwner = await sql<Array<{ proposicao_id: number }>>`
    SELECT proposicao_id FROM vote_sessions WHERE id = ${sessionId} LIMIT 1;
  `;
  if (sessionOwner.length > 0) {
    const foundId = sessionOwner[0].proposicao_id;
    console.log(`🎯 Sessão ${sessionId} pertence à Proposição ID = ${foundId}`);
    return foundId;
  }

  console.warn(`⚠️ Sessão ${sessionId} não encontrada na base de dados.`);
  return null;
}

async function fetchEligiblePropositions(
  targetPropId: number | null,
  limit: number,
  force: boolean
): Promise<PropositionHeader[]> {
  if (targetPropId) {
    return sql<PropositionHeader[]>`
      SELECT id, titulo, ementa, ementa_detalhada, tema, url_inteiro_teor
      FROM propositions
      WHERE id = ${targetPropId}
      LIMIT ${limit};
    `;
  }

  return sql<PropositionHeader[]>`
    SELECT 
      p.id, 
      p.titulo, 
      p.ementa, 
      p.ementa_detalhada, 
      p.tema, 
      p.url_inteiro_teor
    FROM propositions p
    LEFT JOIN (
      SELECT 
        vs.proposicao_id,
        COUNT(vs.id) as total_sessions,
        COUNT(dv.id) as total_nominal_votes,
        MAX(CASE 
          WHEN (
            vs.tipo_deliberacao = 'MERITO' 
            OR vs.descricao ILIKE '%substitutivo%' 
            OR vs.descricao ILIKE '%texto-base%' 
            OR vs.descricao ILIKE '%redação final%'
            OR vs.descricao ILIKE '%projeto de lei%'
            OR vs.descricao ILIKE '%proposta de emenda%'
          ) THEN 1 ELSE 0 
        END) as has_merit
      FROM vote_sessions vs
      LEFT JOIN deputy_votes dv ON dv.votacao_id = vs.id
      GROUP BY vs.proposicao_id
    ) stats ON stats.proposicao_id = p.id
    WHERE 
      (${force} = TRUE OR p.ai_processed = FALSE OR p.ai_processed IS NULL)
      AND COALESCE(stats.total_sessions, 0) > 0
    ORDER BY 
      COALESCE(stats.has_merit, 0) DESC,
      COALESCE(stats.total_nominal_votes, 0) DESC,
      COALESCE(stats.total_sessions, 0) DESC,
      p.ano DESC, 
      p.id DESC
    LIMIT ${limit};
  `;
}

async function updateSessionResults(
  sessoes: Array<{
    id: string;
    tipo_deliberacao: string;
    titulo_amigavel: string;
    resumo_simplificado: string;
    pergunta_cidadao: string;
  }>
): Promise<void> {
  await Promise.all(
    sessoes.map((s) =>
      sql`
        UPDATE vote_sessions
        SET 
          tipo_deliberacao = ${s.tipo_deliberacao},
          titulo_amigavel = ${s.titulo_amigavel},
          resumo_simplificado = ${s.resumo_simplificado},
          pergunta_cidadao = ${s.pergunta_cidadao},
          ai_processed = TRUE,
          ai_processed_at = NOW(),
          ai_error = NULL
        WHERE id = ${s.id};
      `
    )
  );
}

async function markPropositionError(propId: number, errorMsg: string): Promise<void> {
  try {
    await sql`
      UPDATE propositions
      SET 
        ai_processed = FALSE,
        ai_processed_at = NOW(),
        ai_error = ${errorMsg.slice(0, 500)}
      WHERE id = ${propId};
    `;
  } catch {
    // Silencia
  }
}

async function processSingleProposition(
  prop: PropositionHeader,
  workerId: number,
  apiKey: string,
  dryRun: boolean
): Promise<{ success: boolean; sessionCount: number; isQuotaError?: boolean }> {
  const sessions = await sql<RawSessionRow[]>`
    SELECT id, proposicao_id, descricao, resultado, data_hora
    FROM vote_sessions
    WHERE proposicao_id = ${prop.id}
    ORDER BY data_hora DESC NULLS LAST;
  `;

  if (dryRun) {
    console.log(`[Worker ${workerId}] [DRY-RUN] Enriqueceria ${prop.titulo} (ID ${prop.id}) com ${sessions.length} sessões.`);
    await new Promise((r) => setTimeout(r, 100));
    return { success: true, sessionCount: sessions.length };
  }

  const context: PropositionWithSessionsContext = {
    proposicaoId: prop.id,
    titulo: prop.titulo,
    ementa: prop.ementa,
    ementaDetalhada: prop.ementa_detalhada,
    tema: prop.tema,
    urlInteiroTeor: prop.url_inteiro_teor,
    sessoes: sessions.map((s) => ({
      id: s.id,
      descricao: s.descricao,
      resultado: s.resultado,
      data_hora: s.data_hora,
    })),
  };

  try {
    const result = await enrichPropositionAndSessionsWithGemini(context, apiKey);

    await sql`
      UPDATE propositions
      SET 
        resumo_geral = ${result.resumo_geral},
        ai_processed = TRUE,
        ai_processed_at = NOW(),
        ai_error = NULL
      WHERE id = ${prop.id};
    `;

    await updateSessionResults(result.sessoes);

    console.log(`✅ [Worker ${workerId}] ${prop.titulo} + ${result.sessoes.length} sessões enriquecidas com sucesso (Modelo: ${result.model_used}).`);
    await new Promise((r) => setTimeout(r, 250));
    return { success: true, sessionCount: result.sessoes.length };
  } catch (err) {
    const errorMsg = (err as Error).message;
    if (errorMsg.includes("429") || errorMsg.includes("ResourceExhausted") || errorMsg.includes("Quota")) {
      console.warn(`⚠️ [Worker ${workerId}] Limite de cota/rate-limit atingido no Google AI Studio.`);
      return { success: false, sessionCount: 0, isQuotaError: true };
    }

    console.error(`⚠️ [Worker ${workerId}] Erro no projeto ${prop.titulo} (ID ${prop.id}):`, errorMsg.slice(0, 140));
    await markPropositionError(prop.id, errorMsg);
    return { success: false, sessionCount: 0 };
  }
}

async function main() {
  const { limit, concurrency, dryRun, propositionId, sessionId, force, showModels } = parseArgs();

  console.log("====================================================================");
  console.log("🤖 LegisVisão: Pipeline Unificado de Enriquecimento por IA (Google AI Studio)");
  console.log("   (1 Projeto de Lei + Todas as suas Sessões por Requisição Multimodal)");
  console.log("====================================================================");

  const apiKey = process.env.GEMINI_API_KEY || "";
  if (!apiKey && !dryRun) {
    console.error("❌ ERRO: GEMINI_API_KEY não configurada no arquivo .env.local.");
    console.error("👉 Crie sua chave no Google AI Studio (https://aistudio.google.com) e adicione no .env.local.");
    process.exit(1);
  }

  await displayAvailableModels(apiKey);

  if (showModels) {
    console.log("====================================================================");
    console.log("🏁 Listagem de modelos concluída.");
    return;
  }

  const isFreeTier = (process.env.GEMINI_TIER || "free").toLowerCase().trim() !== "paid";
  console.log("--------------------------------------------------------------------");
  console.log(`⚙️ Execução: Limite = ${limit} | Concorrência = ${concurrency} | Tier = ${isFreeTier ? "Free (Custo Zero)" : "Paid"} | Dry Run = ${dryRun ? "SIM" : "NÃO"}`);

  const targetPropId = await resolveTargetPropositionId(sessionId, propositionId);
  if (targetPropId) console.log(`🎯 Filtro: Proposição ID = ${targetPropId}`);

  const propositionsToProcess = await fetchEligiblePropositions(targetPropId, limit, force);

  if (propositionsToProcess.length === 0) {
    console.log("✅ Nenhuma proposição pendente de enriquecimento encontrada.");
    return;
  }

  console.log(`🚀 Iniciando enriquecimento de ${propositionsToProcess.length} projetos de lei e suas respectivas deliberações...`);

  let propIndex = 0;
  let totalSuccessProps = 0;
  let totalSuccessSessions = 0;
  let totalErrors = 0;
  let quotaReached = false;
  const startTime = Date.now();

  async function runUnifiedWorker(workerId: number): Promise<void> {
    if (propIndex >= propositionsToProcess.length || quotaReached) return;
    const idx = propIndex++;
    if (idx >= propositionsToProcess.length) return;

    const prop = propositionsToProcess[idx];
    const outcome = await processSingleProposition(prop, workerId, apiKey, dryRun);

    if (outcome.isQuotaError) {
      quotaReached = true;
      return;
    }

    if (outcome.success) {
      totalSuccessProps++;
      totalSuccessSessions += outcome.sessionCount;
    } else {
      totalErrors++;
    }

    if (isFreeTier && !dryRun) {
      await new Promise((r) => setTimeout(r, 2000));
    }

    return runUnifiedWorker(workerId);
  }

  const workers = Array.from(
    { length: Math.min(concurrency, propositionsToProcess.length) },
    (_, i) => runUnifiedWorker(i + 1)
  );
  await Promise.all(workers);

  const durationSec = Math.round((Date.now() - startTime) / 1000);
  console.log("\n====================================================================");
  console.log("🏁 Resumo da Execução do Enriquecimento por IA:");
  console.log(`- Projetos processados com sucesso: ${totalSuccessProps}`);
  console.log(`- Sessões deliberadas enriquecidas: ${totalSuccessSessions}`);
  console.log(`- Projetos com erro: ${totalErrors}`);
  console.log(`- Tempo total: ${durationSec} segundos`);
  if (quotaReached) {
    console.log("⚠️ Execução interrompida preventivamente devido à cota da API.");
  }
  console.log("====================================================================");
}

main()
  .catch((err) => {
    console.error("❌ Falha fatal no script de enriquecimento:", err);
  })
  .finally(async () => {
    try {
      await sql.end({ timeout: 2 });
    } catch {
      // Silencia
    }
  });
