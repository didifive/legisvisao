// ====================================================================
// LegisVisão - Script de Enriquecimento Semântico com Google AI Studio (Gemini)
// Execução em Lotes Idempotentes com Limite Configurável (ex: até 1.000 requisições)
// ====================================================================

import { sql } from "./client";
import { enrichSessionWithGemini, SessionContextData } from "../../lib/ai/gemini";
import * as dotenv from "dotenv";
import * as path from "node:path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

interface RawSessionToEnrich {
  session_id: string;
  proposicao_id: number;
  proposicao_titulo: string;
  proposicao_ementa: string;
  session_descricao: string;
  session_resultado: string | null;
  total_votes: string;
}

// Configurações de Execução
function parseArgs() {
  const args = process.argv.slice(2);
  let limit = 1000;
  let concurrency = 3;
  let dryRun = false;

  for (const arg of args) {
    if (arg.startsWith("--limit=")) {
      const val = Number.parseInt(arg.replace("--limit=", ""), 10);
      if (!Number.isNaN(val) && val > 0) limit = val;
    } else if (arg.startsWith("--concurrency=")) {
      const val = Number.parseInt(arg.replace("--concurrency=", ""), 10);
      if (!Number.isNaN(val) && val > 0) concurrency = val;
    } else if (arg === "--dry-run") {
      dryRun = true;
    }
  }

  if (process.env.AI_LIMIT) {
    const envLimit = Number.parseInt(process.env.AI_LIMIT, 10);
    if (!Number.isNaN(envLimit) && envLimit > 0) limit = envLimit;
  }

  return { limit, concurrency, dryRun };
}

async function main() {
  const { limit, concurrency, dryRun } = parseArgs();

  console.log("====================================================================");
  console.log("🤖 LegisVisão: Enriquecimento Semântico de Deliberações por IA");
  console.log("====================================================================");
  console.log(`⚙️ Configuração: Limite máx = ${limit} requisições | Concorrência = ${concurrency} workers | Dry Run = ${dryRun ? "SIM" : "NÃO"}`);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey && !dryRun) {
    console.error("❌ ERRO: GEMINI_API_KEY não configurada no arquivo .env.local.");
    console.error("👉 Crie sua chave no Google AI Studio (https://aistudio.google.com) e adicione no .env.local.");
    process.exit(1);
  }

  // 1. Identificar total de sessões pendentes no banco
  const countPending = await sql<Array<{ count: string }>>`
    SELECT COUNT(*) as count
    FROM vote_sessions
    WHERE ai_processed = FALSE OR ai_processed IS NULL;
  `;
  const totalPendingInDb = Number.parseInt(countPending[0]?.count || "0", 10);

  const countTotal = await sql<Array<{ count: string }>>`
    SELECT COUNT(*) as count FROM vote_sessions;
  `;
  const totalInDb = Number.parseInt(countTotal[0]?.count || "0", 10);
  const alreadyProcessed = totalInDb - totalPendingInDb;

  console.log(`📊 Status da Base: ${alreadyProcessed} sessões já enriquecidas | ${totalPendingInDb} pendentes de análise.`);

  if (totalPendingInDb === 0) {
    console.log("✅ Todas as sessões de votação já foram enriquecidas com sucesso pela IA!");
    process.exit(0);
  }

  // 2. Buscar lote priorizado de sessões para enriquecer nesta execução
  // Prioridade:
  // 1) Sessões que possuem votos nominais registrados no plenário (deputy_votes)
  // 2) Destaques (DVS/DTQ) e Emendas
  // 3) Proposições com maior quórum
  const sessionsToProcess = await sql<RawSessionToEnrich[]>`
    SELECT 
      vs.id AS session_id,
      vs.proposicao_id,
      COALESCE(p.titulo, 'Proposição ' || vs.proposicao_id) AS proposicao_titulo,
      COALESCE(p.ementa, vs.descricao) AS proposicao_ementa,
      vs.descricao AS session_descricao,
      vs.resultado AS session_resultado
    FROM vote_sessions vs
    LEFT JOIN propositions p ON p.id = vs.proposicao_id
    WHERE vs.ai_processed = FALSE OR vs.ai_processed IS NULL
    ORDER BY 
      vs.data_hora DESC NULLS LAST
    LIMIT ${limit};
  `;

  const targetCount = sessionsToProcess.length;
  console.log(`🚀 Iniciando lote de ${targetCount} sessões prioritárias para processamento...`);

  let successCount = 0;
  let errorCount = 0;
  let quotaReached = false;
  const startTime = Date.now();

  let currentIndex = 0;

  async function worker(workerId: number) {
    while (currentIndex < sessionsToProcess.length && !quotaReached) {
      const idx = currentIndex++;
      if (idx >= sessionsToProcess.length) break;
      const item = sessionsToProcess[idx];

      const context: SessionContextData = {
        sessionId: item.session_id,
        proposicaoId: item.proposicao_id,
        proposicaoTitulo: item.proposicao_titulo,
        proposicaoEmenta: item.proposicao_ementa,
        sessionDescricao: item.session_descricao,
        sessionResultado: item.session_resultado,
      };

      try {
        if (dryRun) {
          console.log(`[Worker ${workerId}] [DRY-RUN] Processaria sessão ${item.session_id} (${item.proposicao_titulo})`);
          await new Promise((r) => setTimeout(r, 100));
          successCount++;
        } else {
          const enrichment = await enrichSessionWithGemini(context, apiKey);

          // Salvar resultado imediatamente no PostgreSQL
          await sql`
            UPDATE vote_sessions
            SET 
              tipo_deliberacao = ${enrichment.tipo_deliberacao},
              titulo_amigavel = ${enrichment.titulo_amigavel},
              resumo_simplificado = ${enrichment.resumo_simplificado},
              pergunta_cidadao = ${enrichment.pergunta_cidadao},
              ai_processed = TRUE,
              ai_processed_at = NOW(),
              ai_error = NULL
            WHERE id = ${item.session_id};
          `;

          successCount++;
        }

        // Delay suave de 250ms entre chamadas por worker para evitar 429
        await new Promise((r) => setTimeout(r, 250));
      } catch (err) {
        const errorMsg = (err as Error).message;

        if (errorMsg.includes("429") || errorMsg.includes("ResourceExhausted") || errorMsg.includes("Quota")) {
          console.warn(`⚠️ [Worker ${workerId}] Limite de cota/rate-limit atingido no Google AI Studio. Pausando execução com segurança.`);
          quotaReached = true;
          break;
        }

        errorCount++;
        console.warn(`⚠️ [Worker ${workerId}] Erro na sessão ${item.session_id}: ${errorMsg.slice(0, 120)}`);

        // Registrar falha pontual no banco para não travar
        if (!dryRun) {
          try {
            await sql`
              UPDATE vote_sessions
              SET 
                ai_error = ${errorMsg.slice(0, 500)},
                ai_processed_at = NOW()
              WHERE id = ${item.session_id};
            `;
          } catch {
            // Ignora erro de gravação do log
          }
        }
      }

      // Log de Progresso Periódico
      const processedSoFar = successCount + errorCount;
      if (processedSoFar % 20 === 0 || processedSoFar === targetCount) {
        const elapsedSec = Math.max(1, Math.round((Date.now() - startTime) / 1000));
        const rate = (processedSoFar / elapsedSec).toFixed(1);
        const pct = ((processedSoFar / targetCount) * 100).toFixed(1);
        console.log(`⏳ Progresso: ${processedSoFar}/${targetCount} (${pct}%) | ✅ ${successCount} salvos | ❌ ${errorCount} erros | ${rate} req/s`);
      }
    }
  }

  // Executa workers paralelos
  const actualWorkers = Math.min(concurrency, sessionsToProcess.length);
  const workers = Array.from({ length: actualWorkers }, (_, i) => worker(i + 1));
  await Promise.all(workers);

  const totalTimeSec = Math.max(1, Math.round((Date.now() - startTime) / 1000));

  console.log("\n====================================================================");
  console.log("🏁 Resumo da Execução do Enriquecimento por IA:");
  console.log(`- Sessões processadas com sucesso: ${successCount}`);
  console.log(`- Sessões com erro: ${errorCount}`);
  console.log(`- Tempo total: ${totalTimeSec} segundos`);
  if (quotaReached) {
    console.log("ℹ️ Execução finalizada após atingir o limite de requisições da cota atual.");
  }
  console.log("====================================================================");

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Erro fatal durante a execução do script:", err);
  process.exit(1);
});
