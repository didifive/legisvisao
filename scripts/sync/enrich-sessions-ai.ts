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

function parseArgs() {
  const args = process.argv.slice(2);
  let limit = 500;
  let concurrency = 3;
  let dryRun = false;
  let propositionId: number | null = null;
  let sessionId: string | null = null;
  let force = false;
  let showModels = false;

  for (const arg of args) {
    if (arg.startsWith("--limit=")) {
      const val = Number.parseInt(arg.replace("--limit=", ""), 10);
      if (!Number.isNaN(val) && val > 0) limit = val;
    } else if (arg.startsWith("--concurrency=")) {
      const val = Number.parseInt(arg.replace("--concurrency=", ""), 10);
      if (!Number.isNaN(val) && val > 0) concurrency = val;
    } else if (arg.startsWith("--proposicao=") || arg.startsWith("--proposition=") || arg.startsWith("--id=")) {
      const val = Number.parseInt(arg.split("=")[1], 10);
      if (!Number.isNaN(val) && val > 0) propositionId = val;
    } else if (arg.startsWith("--session=")) {
      sessionId = arg.replace("--session=", "").trim();
    } else if (arg === "--models" || arg === "--list-models") {
      showModels = true;
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--force") {
      force = true;
    }
  }

  if (process.env.AI_LIMIT) {
    const envLimit = Number.parseInt(process.env.AI_LIMIT, 10);
    if (!Number.isNaN(envLimit) && envLimit > 0) limit = envLimit;
  }

  return { limit, concurrency, dryRun, propositionId, sessionId, force, showModels };
}

async function main() {
  const { limit, concurrency, dryRun, propositionId, sessionId, force, showModels } = parseArgs();

  console.log("====================================================================");
  console.log("🤖 LegisVisão: Pipeline Unificado de Enriquecimento por IA (Google AI Studio)");
  console.log("   (1 Projeto de Lei + Todas as suas Sessões por Requisição Multimodal)");
  console.log("====================================================================");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey && !dryRun) {
    console.error("❌ ERRO: GEMINI_API_KEY não configurada no arquivo .env.local.");
    console.error("👉 Crie sua chave no Google AI Studio (https://aistudio.google.com) e adicione no .env.local.");
    process.exit(1);
  }

  // 1. Listagem de Modelos Disponíveis e Quotas
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

  if (showModels) {
    console.log("====================================================================");
    console.log("🏁 Listagem de modelos concluída.");
    return;
  }

  console.log("--------------------------------------------------------------------");
  console.log(`⚙️ Execução: Limite = ${limit} projetos | Concorrência = ${concurrency} workers | Dry Run = ${dryRun ? "SIM" : "NÃO"} | Forçar = ${force ? "SIM" : "NÃO"}`);

  // Se o usuário passou um sessionId específico, resolve o proposicao_id associado
  let targetPropId = propositionId;
  if (sessionId && !targetPropId) {
    const sessionOwner = await sql<Array<{ proposicao_id: number }>>`
      SELECT proposicao_id FROM vote_sessions WHERE id = ${sessionId} LIMIT 1;
    `;
    if (sessionOwner.length > 0) {
      targetPropId = sessionOwner[0].proposicao_id;
      console.log(`🎯 Sessão ${sessionId} pertence à Proposição ID = ${targetPropId}`);
    } else {
      console.warn(`⚠️ Sessão ${sessionId} não encontrada na base de dados.`);
    }
  }

  if (targetPropId) console.log(`🎯 Filtro: Proposição ID = ${targetPropId}`);

  // 2. Consulta de Proposições Elegíveis
  let propositionsToProcess: PropositionHeader[] = [];

  if (targetPropId) {
    propositionsToProcess = await sql<PropositionHeader[]>`
      SELECT id, titulo, ementa, ementa_detalhada, tema, url_inteiro_teor
      FROM propositions
      WHERE id = ${targetPropId}
      LIMIT ${limit};
    `;
  } else {
    // Busca proposições pendentes de processamento de resumo geral ou com sessões pendentes
    propositionsToProcess = await sql<PropositionHeader[]>`
      SELECT p.id, p.titulo, p.ementa, p.ementa_detalhada, p.tema, p.url_inteiro_teor
      FROM propositions p
      WHERE ${
        force
          ? sql`TRUE`
          : sql`
            (p.ai_processed = FALSE OR p.ai_processed IS NULL)
            OR EXISTS (
              SELECT 1 FROM vote_sessions vs 
              WHERE vs.proposicao_id = p.id AND (vs.ai_processed = FALSE OR vs.ai_processed IS NULL)
            )
          `
      }
      ORDER BY p.ano DESC, p.id DESC
      LIMIT ${limit};
    `;
  }

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

  async function unifiedWorker(workerId: number) {
    while (propIndex < propositionsToProcess.length && !quotaReached) {
      const idx = propIndex++;
      if (idx >= propositionsToProcess.length) break;
      const prop = propositionsToProcess[idx];

      // Busca todas as sessões de votação vinculadas a esta proposição
      const sessions = await sql<RawSessionRow[]>`
        SELECT id, proposicao_id, descricao, resultado, data_hora
        FROM vote_sessions
        WHERE proposicao_id = ${prop.id}
        ORDER BY data_hora DESC NULLS LAST;
      `;

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
        if (dryRun) {
          console.log(`[Worker ${workerId}] [DRY-RUN] Enriqueceria ${prop.titulo} (ID ${prop.id}) com ${sessions.length} sessões.`);
          await new Promise((r) => setTimeout(r, 100));
          totalSuccessProps++;
          totalSuccessSessions += sessions.length;
        } else {
          const result = await enrichPropositionAndSessionsWithGemini(context, apiKey);

          // 1. Atualiza a Proposição
          await sql`
            UPDATE propositions
            SET 
              resumo_geral = ${result.resumo_geral},
              ai_processed = TRUE,
              ai_processed_at = NOW(),
              ai_error = NULL
            WHERE id = ${prop.id};
          `;

          // 2. Atualiza cada uma das sessões retornadas
          for (const s of result.sessoes) {
            await sql`
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
            `;
          }

          console.log(`✅ [Worker ${workerId}] ${prop.titulo} + ${result.sessoes.length} sessões enriquecidas com sucesso (Modelo: ${result.model_used}).`);
          totalSuccessProps++;
          totalSuccessSessions += result.sessoes.length;
        }

        await new Promise((r) => setTimeout(r, 250));
      } catch (err) {
        const errorMsg = (err as Error).message;
        if (errorMsg.includes("429") || errorMsg.includes("ResourceExhausted") || errorMsg.includes("Quota")) {
          console.warn(`⚠️ [Worker ${workerId}] Limite de cota/rate-limit atingido no Google AI Studio.`);
          quotaReached = true;
          break;
        }

        console.error(`⚠️ [Worker ${workerId}] Erro no projeto ${prop.titulo} (ID ${prop.id}):`, errorMsg.slice(0, 140));
        totalErrors++;

        if (!dryRun) {
          try {
            await sql`
              UPDATE propositions
              SET 
                ai_processed = FALSE,
                ai_processed_at = NOW(),
                ai_error = ${errorMsg.slice(0, 500)}
              WHERE id = ${prop.id};
            `;
          } catch {
            // Silencia
          }
        }
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, propositionsToProcess.length) },
    (_, i) => unifiedWorker(i + 1)
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
