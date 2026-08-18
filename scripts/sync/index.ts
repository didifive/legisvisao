// ====================================================================
// LegisVisão - Orquestrador Geral de Sincronização Bicameral
// ====================================================================
import { sql, updateSyncStatus, getCurrentDatasetVersion } from "./client";
import { syncParties } from "./sync-parties";
import { syncPoliticians } from "./sync-politicians";
import { syncProjects } from "./sync-projects";
import { syncVoteSessions } from "./sync-vote-sessions";
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
  console.log("🏛️  LEGISVISÃO - ORQUESTRADOR DE SINCRONIZAÇÃO BICAMERAL (CÂMARA & SENADO)");
  console.log("================================================================================");
  const startTime = Date.now();

  try {
    // Fase 1: Sincronização paralela de Partidos e Proposições Canônicas
    console.log("\n⚡ [Fase 1] Sincronizando Catálogo de Partidos e Proposições...");
    const [partiesResult, projectsResult] = await Promise.all([
      syncParties(),
      syncProjects(),
    ]);

    // Fase 2: Sincronização paralela de Parlamentares e Sessões de Votação
    console.log("\n⚡ [Fase 2] Sincronizando Parlamentares, Mandatos e Sessões de Votação...");
    const [politiciansResult, sessionsResult] = await Promise.all([
      syncPoliticians(partiesResult.partyMap),
      syncVoteSessions(projectsResult.houseRecordsToSyncVotes),
    ]);

    // Fase 3: Sincronização dos Votos Nominais Concorrentes
    console.log("\n⚡ [Fase 3] Sincronizando Votos Nominais Parlamentares...");
    const votesResult = await syncVotes(
      sessionsResult.sessionsToSyncVotes,
      politiciansResult.politicianMap,
      partiesResult.partyMap
    );

    // Controle Inteligente de dataset_version
    const totalInserted =
      partiesResult.inserted +
      politiciansResult.inserted +
      projectsResult.insertedProjects +
      projectsResult.insertedRecords +
      sessionsResult.insertedSessions +
      votesResult.insertedVotes;

    const totalUpdated =
      partiesResult.updated +
      politiciansResult.updated +
      projectsResult.updatedProjects +
      projectsResult.updatedRecords;

    const totalChanges = totalInserted + totalUpdated;
    let currentVersion = await getCurrentDatasetVersion();

    if (totalChanges > 0 || !currentVersion) {
      currentVersion = new Date().toISOString();
      console.log(`\n📦 Alterações detectadas (${formatNum(totalInserted)} inserções, ${formatNum(totalUpdated)} atualizações). Novo dataset_version: ${currentVersion}`);
    } else {
      console.log(`\n🔒 Nenhuma alteração estrutural detectada. dataset_version mantido: ${currentVersion}`);
    }

    const totalRecords =
      partiesResult.total +
      politiciansResult.total +
      projectsResult.houseRecordsToSyncVotes.length +
      sessionsResult.totalSessions +
      votesResult.totalVotes;

    // Atualizar status de sincronização no sync_control
    await updateSyncStatus({
      source: "CAMARA",
      name: "Câmara dos Deputados (Dados Abertos)",
      officialUrl: "https://dadosabertos.camara.leg.br",
      recordsCount: totalRecords,
      recordsUpdated: totalUpdated,
      recordsInserted: totalInserted,
      datasetVersion: currentVersion,
      status: "SUCCESS",
    });

    await updateSyncStatus({
      source: "SENADO",
      name: "Senado Federal (Dados Abertos)",
      officialUrl: "https://legis.senado.leg.br/dadosabertos",
      recordsCount: politiciansResult.total,
      recordsUpdated: politiciansResult.updated,
      recordsInserted: politiciansResult.inserted,
      datasetVersion: currentVersion,
      status: "SUCCESS",
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    // Painel Analítico de Execução
    console.log("\n================================================================================");
    console.log("📊 PAINEL ANALÍTICO DE EXECUÇÃO - LEGISVISÃO");
    console.log("================================================================================");
    console.log(`${pad("Entidade / Camada", 30)} | ${padLeft("Existentes", 10)} | ${padLeft("Novos", 9)} | ${padLeft("Atualizados", 11)} | ${padLeft("Total Final", 11)}`);
    console.log("-------------------------------+------------+-----------+-------------+------------");
    console.log(`${pad("Partidos Políticos", 30)} | ${padLeft(formatNum(partiesResult.existingCount), 10)} | ${padLeft(formatNum(partiesResult.inserted), 9)} | ${padLeft(formatNum(partiesResult.updated), 11)} | ${padLeft(formatNum(partiesResult.total), 11)}`);
    console.log(`${pad("Deputados Federais (Câmara)", 30)} | ${padLeft(formatNum(politiciansResult.deputiesTotal - politiciansResult.deputiesInserted), 10)} | ${padLeft(formatNum(politiciansResult.deputiesInserted), 9)} | ${padLeft(formatNum(politiciansResult.deputiesUpdated), 11)} | ${padLeft(formatNum(politiciansResult.deputiesTotal), 11)}`);
    console.log(`${pad("Senadores da República (Senado)", 30)} | ${padLeft(formatNum(politiciansResult.senatorsTotal - politiciansResult.senatorsInserted), 10)} | ${padLeft(formatNum(politiciansResult.senatorsInserted), 9)} | ${padLeft(formatNum(politiciansResult.senatorsUpdated), 11)} | ${padLeft(formatNum(politiciansResult.senatorsTotal), 11)}`);
    console.log(`${pad("Projetos Canônicos", 30)} | ${padLeft(formatNum(projectsResult.existingProjectsCount), 10)} | ${padLeft(formatNum(projectsResult.insertedProjects), 9)} | ${padLeft(formatNum(projectsResult.updatedProjects), 11)} | ${padLeft(formatNum(projectsResult.totalProjects), 11)}`);
    console.log(`${pad("Registros Tramitação (Câmara)", 30)} | ${padLeft("-", 10)} | ${padLeft("-", 9)} | ${padLeft("-", 11)} | ${padLeft(formatNum(projectsResult.camaraRecordsCount), 11)}`);
    console.log(`${pad("Registros Tramitação (Senado)", 30)} | ${padLeft("-", 10)} | ${padLeft("-", 9)} | ${padLeft("-", 11)} | ${padLeft(formatNum(projectsResult.senadoRecordsCount), 11)}`);
    console.log(`${pad("Proposições Bicamerais", 30)} | ${padLeft("-", 10)} | ${padLeft("-", 9)} | ${padLeft("-", 11)} | ${padLeft(formatNum(projectsResult.bicameralProjectsCount), 11)}`);
    console.log(`${pad("Sessões de Votação (Câmara)", 30)} | ${padLeft(formatNum(sessionsResult.camaraSessionsTotal - sessionsResult.camaraSessionsInserted), 10)} | ${padLeft(formatNum(sessionsResult.camaraSessionsInserted), 9)} | ${padLeft("-", 11)} | ${padLeft(formatNum(sessionsResult.camaraSessionsTotal), 11)}`);
    console.log(`${pad("Sessões de Votação (Senado)", 30)} | ${padLeft(formatNum(sessionsResult.senadoSessionsTotal - sessionsResult.senadoSessionsInserted), 10)} | ${padLeft(formatNum(sessionsResult.senadoSessionsInserted), 9)} | ${padLeft("-", 11)} | ${padLeft(formatNum(sessionsResult.senadoSessionsTotal), 11)}`);
    console.log(`${pad("Votos Nominais (Câmara)", 30)} | ${padLeft("-", 10)} | ${padLeft(formatNum(votesResult.camaraVotesInserted), 9)} | ${padLeft("-", 11)} | ${padLeft("-", 11)}`);
    console.log(`${pad("Votos Nominais (Senado)", 30)} | ${padLeft("-", 10)} | ${padLeft(formatNum(votesResult.senadoVotesInserted), 9)} | ${padLeft("-", 11)} | ${padLeft("-", 11)}`);
    console.log(`${pad("Votos Nominais (Consolidado)", 30)} | ${padLeft(formatNum(votesResult.existingVotesCount), 10)} | ${padLeft(formatNum(votesResult.insertedVotes), 9)} | ${padLeft("-", 11)} | ${padLeft(formatNum(votesResult.totalVotes), 11)}`);
    console.log("================================================================================");
    console.log(`⏱️  Tempo total de execução: ${elapsed}s | Dataset: ${currentVersion}`);
    console.log("================================================================================\n");
  } catch (err) {
    console.error("❌ Falha fatal no orquestrador de sincronização:", err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
