// ====================================================================
// LegisVisão - Orquestrador Central de Sincronização (Câmara dos Deputados)
// ====================================================================
import { sql, updateSyncStatus, getCurrentDatasetVersion } from "./client";
import { syncParties } from "./sync-parties";
import { syncDeputies } from "./sync-deputies";
import { syncPropositions } from "./sync-propositions";
import { syncVotes } from "./sync-votes";

function formatNum(n: number): string {
  return n.toLocaleString("pt-BR");
}

function pad(str: string, length: number): string {
  return str.padEnd(length, " ");
}

function padLeft(str: string, length: number): string {
  return str.padStart(length, " ");
}

async function main() {
  console.log("================================================================================");
  console.log("🏛️  LEGISVISÃO - SINCRONIZAÇÃO OFICIAL DA CÂMARA DOS DEPUTADOS");
  console.log("================================================================================");
  const startTime = Date.now();

  try {
    // 0. Registrar início da sincronização
    await updateSyncStatus({
      source: "CAMARA",
      name: "Câmara dos Deputados (Dados Abertos)",
      officialUrl: "https://dadosabertos.camara.leg.br",
      status: "RUNNING",
    });

    // 1. Sincronizar Catálogo de Partidos
    console.log("\n⚡ [1/4] Sincronizando Partidos Políticos...");
    const partiesResult = await syncParties();

    // 2. Sincronizar Deputados Federais da 57ª Legislatura
    console.log("\n⚡ [2/4] Sincronizando Deputados Federais em Exercício...");
    const deputiesResult = await syncDeputies(partiesResult.partyMap);

    // 3. Sincronizar Proposições e Sessões de Votação Nominal
    console.log("\n⚡ [3/4] Sincronizando Proposições e Sessões de Votação do Plenário...");
    const propsResult = await syncPropositions();

    // 4. Sincronizar Votos Nominais dos Deputados
    console.log("\n⚡ [4/4] Sincronizando Votos Nominais Individuais...");
    const votesResult = await syncVotes(
      propsResult.sessionsToSyncVotes,
      deputiesResult.deputyMap
    );

    // 5. Totais Consolidados no Banco de Dados
    const [dbParties] = await sql<Array<{ count: string }>>`SELECT COUNT(*) as count FROM parties`;
    const [dbDeputies] = await sql<Array<{ count: string }>>`SELECT COUNT(*) as count FROM deputies`;
    const [dbProps] = await sql<Array<{ count: string }>>`SELECT COUNT(*) as count FROM propositions`;
    const [dbSessions] = await sql<Array<{ count: string }>>`SELECT COUNT(*) as count FROM vote_sessions`;
    const [dbVotes] = await sql<Array<{ count: string }>>`SELECT COUNT(*) as count FROM deputy_votes`;

    const finalPartiesCount = Number(dbParties.count);
    const finalDeputiesCount = Number(dbDeputies.count);
    const finalPropsCount = Number(dbProps.count);
    const finalSessionsCount = Number(dbSessions.count);
    const finalVotesCount = Number(dbVotes.count);

    // Controle de Versão do Dataset
    const totalInserted =
      partiesResult.inserted +
      deputiesResult.inserted +
      propsResult.insertedPropositions +
      propsResult.insertedSessions +
      votesResult.insertedVotes;

    const totalUpdated =
      partiesResult.updated +
      deputiesResult.updated +
      propsResult.updatedPropositions;

    const totalChanges = totalInserted + totalUpdated;
    let currentVersion = await getCurrentDatasetVersion();

    if (totalChanges > 0 || !currentVersion) {
      currentVersion = new Date().toISOString();
      console.log(`\n📦 Alterações aplicadas (${formatNum(totalInserted)} novos, ${formatNum(totalUpdated)} atualizados). Versão do dataset: ${currentVersion}`);
    } else {
      console.log(`\n🔒 Nenhuma alteração estrutural detectada. Versão mantida: ${currentVersion}`);
    }

    // Atualização de Status no sync_control
    await updateSyncStatus({
      source: "CAMARA",
      name: "Câmara dos Deputados (Dados Abertos)",
      officialUrl: "https://dadosabertos.camara.leg.br",
      totalDeputies: finalDeputiesCount,
      totalPropositions: finalPropsCount,
      totalVoteSessions: finalSessionsCount,
      totalVotes: finalVotesCount,
      datasetVersion: currentVersion,
      status: "SUCCESS",
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    // Painel Analítico
    console.log("\n================================================================================");
    console.log("📊 PAINEL ANALÍTICO DE SINCRONIZAÇÃO - LEGISVISÃO");
    console.log("================================================================================");
    console.log(`${pad("Entidade", 30)} | ${padLeft("Novos", 10)} | ${padLeft("Atualizados", 12)} | ${padLeft("Total no Banco", 14)}`);
    console.log("-------------------------------+------------+--------------+---------------");
    console.log(`${pad("Partidos Políticos", 30)} | ${padLeft(formatNum(partiesResult.inserted), 10)} | ${padLeft(formatNum(partiesResult.updated), 12)} | ${padLeft(formatNum(finalPartiesCount), 14)}`);
    console.log(`${pad("Deputados Federais (57ª)", 30)} | ${padLeft(formatNum(deputiesResult.inserted), 10)} | ${padLeft(formatNum(deputiesResult.updated), 12)} | ${padLeft(formatNum(finalDeputiesCount), 14)}`);
    console.log(`${pad("Proposições Legislativas", 30)} | ${padLeft(formatNum(propsResult.insertedPropositions), 10)} | ${padLeft(formatNum(propsResult.updatedPropositions), 12)} | ${padLeft(formatNum(finalPropsCount), 14)}`);
    console.log(`${pad("Sessões de Votação (Plenário)", 30)} | ${padLeft(formatNum(propsResult.insertedSessions), 10)} | ${padLeft("-", 12)} | ${padLeft(formatNum(finalSessionsCount), 14)}`);
    console.log(`${pad("Votos Nominais Individuais", 30)} | ${padLeft(formatNum(votesResult.insertedVotes), 10)} | ${padLeft("-", 12)} | ${padLeft(formatNum(finalVotesCount), 14)}`);
    console.log("================================================================================");
    console.log(`⏱️  Tempo total de execução: ${elapsed}s | Dataset: ${currentVersion}`);
    console.log("================================================================================\n");

  } catch (err) {
    console.error("❌ Falha fatal no orquestrador de sincronização:", err);
    await updateSyncStatus({
      source: "CAMARA",
      status: "FAILED",
      error: String(err),
    });
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
