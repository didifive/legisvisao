import { sql, CAMARA_API_BASE, fetchWithRetry, mapConcurrent } from "./client";
import type { SessionToSyncVotes } from "./sync-vote-sessions";

export interface SyncVotesResult {
  insertedVotes: number;
  totalVotes: number;
}

interface RawVoteNominalItem {
  tipoVoto?: string;
  voto?: string;
  deputado_?: { id?: number | string };
  deputado?: { id?: number | string };
}

interface PoliticianVoteToInsert {
  vote_session_id: number;
  politician_id: number;
  vote_original: string;
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
 * 2. Consulta os votos nominais de uma sessão de votação na API da Câmara.
 */
async function fetchNominalVotesFromCamara(externalVoteId: string): Promise<RawVoteNominalItem[]> {
  const votosUrl = `${CAMARA_API_BASE}/votacoes/${externalVoteId}/votos`;
  const votosRes = await fetchWithRetry(votosUrl, 2, 500);
  if (!votosRes.ok) return [];

  const votosData = await votosRes.json();
  return votosData.dados || [];
}

/**
 * 3. Mapeia e filtra votos válidos da sessão comparando com o catálogo de parlamentares.
 */
function buildVotesToInsert(
  sessionId: number,
  rawVotes: RawVoteNominalItem[],
  politicianMap: Map<string, any>,
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

    rows.push({
      vote_session_id: sessionId,
      politician_id: pol.id,
      vote_original: rawVote,
    });
    existingVoteSet.add(voteKey);
  }

  return rows;
}

/**
 * 4. Insere votos em lotes (batch) de 500 no banco de dados.
 */
async function insertVotesBatches(allRows: PoliticianVoteToInsert[]): Promise<void> {
  if (allRows.length === 0) return;

  const BATCH_SIZE = 500;
  for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
    const chunk = allRows.slice(i, i + BATCH_SIZE);
    await sql`
      INSERT INTO politician_votes ${sql(chunk as any, 'vote_session_id', 'politician_id', 'vote_original')}
      ON CONFLICT (vote_session_id, politician_id) DO UPDATE SET
        vote_original = EXCLUDED.vote_original;
    `;
  }
}

/**
 * Orquestrador da sincronização de votos nominais parlamentares (Concorrente em Lote).
 */
export async function syncVotes(
  sessions: SessionToSyncVotes[],
  politicianMap: Map<string, any>
): Promise<SyncVotesResult> {
  console.log("-> [Votos Nominais] Sincronizando votos parlamentares com valor original das APIs...");

  const existingVoteSet = await loadExistingVoteKeys();
  const camaraSessions = sessions.filter((s) => s.house === "CAMARA");
  const allRowsToInsert: PoliticianVoteToInsert[] = [];

  // Executa em paralelo com 8 workers concorrentes
  await mapConcurrent(camaraSessions, 8, async (session) => {
    try {
      const rawVotes = await fetchNominalVotesFromCamara(session.external_vote_id);
      const rows = buildVotesToInsert(session.id, rawVotes, politicianMap, existingVoteSet);
      if (rows.length > 0) {
        allRowsToInsert.push(...rows);
      }
    } catch (err) {
      console.warn(`[Votos] Erro ao sincronizar votos nominais da sessão ${session.external_vote_id}:`, err);
    }
  });

  if (allRowsToInsert.length > 0) {
    await insertVotesBatches(allRowsToInsert);
  }

  console.log(`-> [Votos Nominais] Concluído: ${existingVoteSet.size} votos registrados no total (${allRowsToInsert.length} novos inseridos).`);

  return {
    insertedVotes: allRowsToInsert.length,
    totalVotes: existingVoteSet.size,
  };
}
