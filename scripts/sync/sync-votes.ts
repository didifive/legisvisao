// ====================================================================
// LegisVisão - Sincronização de Votos Nominais (Câmara & Senado)
// ====================================================================
import { sql, mapConcurrent } from "./client";
import type { SessionToSyncVotes } from "./sync-vote-sessions";
import {
  fetchCamaraNominalVotes,
  type CamaraRawVoteNominalItem,
} from "./adapters/camara";
import {
  fetchSenadoNominalVotes,
  type RawSenadoVoteItem,
} from "./adapters/senado";

export interface SyncVotesResult {
  insertedVotes: number;
  totalVotes: number;
  existingVotesCount: number;
  camaraVotesInserted: number;
  senadoVotesInserted: number;
}

export interface PoliticianSummary {
  id: number;
  name: string;
}

interface PoliticianVoteToInsert {
  vote_session_id: number;
  politician_id: number;
  party_id: number | null;
  vote_original: string;
  house?: string;
}

/**
 * 1. Carrega o conjunto de votos já existentes (chave composta vote_session_id + politician_id).
 */
async function loadExistingVoteKeys(): Promise<Set<string>> {
  const existingVotes = await sql`
    SELECT vote_session_id, politician_id FROM politician_votes
  `;
  const existingVoteSet = new Set<string>();
  for (const v of existingVotes) {
    existingVoteSet.add(`${v.vote_session_id}_${v.politician_id}`);
  }
  return existingVoteSet;
}

/**
 * 2. Resolve o partido do parlamentar diretamente a partir da sigla carimbada na folha de votação da API.
 */
function resolvePartyForVote(
  rawPartySigla: string | null,
  partyMap: Map<string, number>
): number | null {
  if (!rawPartySigla) return null;
  const s = rawPartySigla.trim().toUpperCase();
  if (!s || s === "S/PARTIDO" || s === "SEM PARTIDO") return null;
  return partyMap.get(s) || null;
}

/**
 * 3. Mapeia e filtra votos nominais da Câmara.
 */
function buildCamaraVotesToInsert(
  sessionId: number,
  rawVotes: CamaraRawVoteNominalItem[],
  politicianMap: Map<string, PoliticianSummary>,
  partyMap: Map<string, number>,
  existingVoteSet: Set<string>
): PoliticianVoteToInsert[] {
  const rows: PoliticianVoteToInsert[] = [];

  for (const item of rawVotes) {
    const extDepId = String(item.deputado_?.id || item.deputado?.id || "");
    if (!extDepId) continue;

    const polKey = `CAMARA_${extDepId}`;
    const pol = politicianMap.get(polKey);
    if (!pol?.id) continue;

    const voteKey = `${sessionId}_${pol.id}`;
    if (existingVoteSet.has(voteKey)) continue;

    const rawVote = (item.tipoVoto || item.voto || "Outros").trim();
    const rawPartySigla = (item.deputado_?.siglaPartido || item.deputado?.siglaPartido || "").trim().toUpperCase() || null;
    const partyId = resolvePartyForVote(rawPartySigla, partyMap);

    rows.push({
      vote_session_id: sessionId,
      politician_id: pol.id,
      party_id: partyId,
      vote_original: rawVote,
      house: "CAMARA",
    });
    existingVoteSet.add(voteKey);
  }

  return rows;
}

/**
 * 4. Mapeia e filtra votos nominais do Senado Federal.
 */
function buildSenadoVotesToInsert(
  sessionId: number,
  rawVotes: RawSenadoVoteItem[],
  politicianMap: Map<string, PoliticianSummary>,
  partyMap: Map<string, number>,
  existingVoteSet: Set<string>
): PoliticianVoteToInsert[] {
  const rows: PoliticianVoteToInsert[] = [];

  for (const item of rawVotes) {
    const extSenId = String(item.IdentificacaoParlamentar?.CodigoParlamentar || "");
    if (!extSenId) continue;

    const polKey = `SENADO_${extSenId}`;
    const pol = politicianMap.get(polKey);
    if (!pol?.id) continue;

    const voteKey = `${sessionId}_${pol.id}`;
    if (existingVoteSet.has(voteKey)) continue;

    const rawVote = String(item.SiglaVoto || "Outros").trim();
    const rawPartySigla = String(item.IdentificacaoParlamentar?.SiglaPartidoParlamentar || "").trim().toUpperCase() || null;
    const partyId = resolvePartyForVote(rawPartySigla, partyMap);

    rows.push({
      vote_session_id: sessionId,
      politician_id: pol.id,
      party_id: partyId,
      vote_original: rawVote,
      house: "SENADO",
    });
    existingVoteSet.add(voteKey);
  }

  return rows;
}

/**
 * 5. Insere votos em lotes (batch) de 500 no banco de dados.
 */
async function insertVotesBatches(allRows: PoliticianVoteToInsert[]): Promise<void> {
  if (allRows.length === 0) return;

  const BATCH_SIZE = 500;
  for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
    const chunk = allRows.slice(i, i + BATCH_SIZE);
    await sql`
      INSERT INTO politician_votes ${sql(chunk, 'vote_session_id', 'politician_id', 'party_id', 'vote_original')}
      ON CONFLICT (vote_session_id, politician_id) DO UPDATE SET
        party_id = EXCLUDED.party_id,
        vote_original = EXCLUDED.vote_original;
    `;
  }
}

/**
 * Orquestrador da sincronização de votos nominais parlamentares Bicamerais (Concorrente em Lote).
 */
export async function syncVotes(
  sessions: SessionToSyncVotes[],
  politicianMap: Map<string, PoliticianSummary>,
  partyMap: Map<string, number>
): Promise<SyncVotesResult> {
  console.log("-> [Votos Nominais] Sincronizando votos parlamentares nominais (Câmara & Senado)...");

  const existingVoteSet = await loadExistingVoteKeys();
  const initialVotesCount = existingVoteSet.size;

  const camaraSessions = sessions.filter((s) => s.house === "CAMARA");
  const senadoSessions = sessions.filter((s) => s.house === "SENADO");
  const allRowsToInsert: PoliticianVoteToInsert[] = [];

  let camaraVotesCount = 0;
  let senadoVotesCount = 0;
  let camaraProcessed = 0;
  let senadoProcessed = 0;

  // 1. Processa Votos Nominais da Câmara dos Deputados
  console.log(`   • Processando votos nominais de ${camaraSessions.length} sessões da Câmara...`);
  await mapConcurrent(camaraSessions, 8, async (session) => {
    try {
      const rawVotes = await fetchCamaraNominalVotes(session.external_vote_id);
      const rows = buildCamaraVotesToInsert(
        session.id,
        rawVotes,
        politicianMap,
        partyMap,
        existingVoteSet
      );
      if (rows.length > 0) {
        allRowsToInsert.push(...rows);
        camaraVotesCount += rows.length;
      }
    } catch (err) {
      console.warn(`[Votos] Erro ao sincronizar votos da Câmara na sessão ${session.external_vote_id}:`, err);
    } finally {
      camaraProcessed++;
      if (camaraProcessed % 50 === 0 || camaraProcessed === camaraSessions.length) {
        console.log(`     -> [Votos Câmara] ${camaraProcessed}/${camaraSessions.length} sessões processadas (${camaraVotesCount} novos votos coletados)...`);
      }
    }
  });

  // 2. Processa Votos Nominais do Senado Federal (reaproveitando o payload obtido na Fase 2)
  console.log(`   • Processando votos nominais de ${senadoSessions.length} sessões do Senado...`);
  await mapConcurrent(senadoSessions, 8, async (session) => {
    try {
      const rawVotes =
        session.senado_raw_votes && session.senado_raw_votes.length > 0
          ? session.senado_raw_votes
          : await fetchSenadoNominalVotes(session.materia_external_id, session.external_vote_id);

      const rows = buildSenadoVotesToInsert(
        session.id,
        rawVotes,
        politicianMap,
        partyMap,
        existingVoteSet
      );
      if (rows.length > 0) {
        allRowsToInsert.push(...rows);
        senadoVotesCount += rows.length;
      }
    } catch (err) {
      console.warn(`[Votos] Erro ao sincronizar votos do Senado na sessão ${session.external_vote_id}:`, err);
    } finally {
      senadoProcessed++;
      if (senadoProcessed % 50 === 0 || senadoProcessed === senadoSessions.length) {
        console.log(`     -> [Votos Senado] ${senadoProcessed}/${senadoSessions.length} sessões processadas (${senadoVotesCount} novos votos coletados)...`);
      }
    }
  });

  if (allRowsToInsert.length > 0) {
    console.log(`   • Gravando ${allRowsToInsert.length} novos votos nominais em lote no banco...`);
    await insertVotesBatches(allRowsToInsert);
  }

  // Relatório Analítico
  console.log(`-> [Votos Nominais] Análise Detalhada:`);
  console.log(`   • Votos da Câmara dos Deputados: ${camaraVotesCount} novos inseridos`);
  console.log(`   • Votos do Senado Federal: ${senadoVotesCount} novos inseridos`);
  console.log(`   • Votos já persistidos anteriormente (preservados): ${initialVotesCount}`);
  console.log(`   • Total consolidado no banco: ${existingVoteSet.size} votos nominais.`);

  return {
    insertedVotes: allRowsToInsert.length,
    totalVotes: existingVoteSet.size,
    existingVotesCount: initialVotesCount,
    camaraVotesInserted: camaraVotesCount,
    senadoVotesInserted: senadoVotesCount,
  };
}
