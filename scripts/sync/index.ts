import { sql, updateSyncStatus, getCurrentDatasetVersion } from "./client";
import { syncParties } from "./sync-parties";
import { syncPoliticians } from "./sync-politicians";
import { syncProjects } from "./sync-projects";
import { syncVoteSessions } from "./sync-vote-sessions";
import { syncVotes } from "./sync-votes";

async function main() {
  console.log("=================================================");
  console.log("🏛️ LegisVisão - Orquestrador de Sincronização");
  console.log("=================================================");
  const startTime = Date.now();

  try {
    // Fase 1: Sincronização paralela de Partidos e Proposições Canônicas
    console.log("⚡ [Fase 1] Sincronizando Partidos e Proposições em paralelo...");
    const [partiesResult, projectsResult] = await Promise.all([
      syncParties(),
      syncProjects(),
    ]);

    // Fase 2: Sincronização paralela de Parlamentares e Sessões de Votação
    console.log("\n⚡ [Fase 2] Sincronizando Parlamentares e Sessões de Voto em paralelo...");
    const [politiciansResult, sessionsResult] = await Promise.all([
      syncPoliticians(partiesResult.partyMap),
      syncVoteSessions(projectsResult.houseRecordsToSyncVotes),
    ]);

    // Fase 3: Sincronização dos Votos Nominais Concorrentes
    console.log("\n⚡ [Fase 3] Sincronizando Votos Nominais...");
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
      console.log(`\n📦 Alterações detectadas (${totalInserted} inserções, ${totalUpdated} atualizações). Novo dataset_version: ${currentVersion}`);
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
    console.log("\n=================================================");
    console.log("📊 Resumo da Sincronização LegisVisão:");
    console.log(`• Partidos: ${partiesResult.total} (${partiesResult.inserted} novos, ${partiesResult.updated} atualizados)`);
    console.log(`• Parlamentares: ${politiciansResult.total} (${politiciansResult.inserted} novos, ${politiciansResult.updated} atualizados)`);
    console.log(`• Projetos Canônicos: ${projectsResult.insertedProjects} novos, ${projectsResult.updatedProjects} atualizados`);
    console.log(`• Registros de Casa: ${projectsResult.insertedRecords} novos, ${projectsResult.updatedRecords} atualizados`);
    console.log(`• Sessões de Votação: ${sessionsResult.totalSessions} (${sessionsResult.insertedSessions} novas)`);
    console.log(`• Votos Nominais: ${votesResult.totalVotes} (${votesResult.insertedVotes} novos)`);
    console.log(`• Dataset Version: ${currentVersion}`);
    console.log(`⏱️ Tempo total: ${elapsed}s`);
    console.log("=================================================");
  } catch (err) {
    console.error("❌ Falha fatal no orquestrador de sincronização:", err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
