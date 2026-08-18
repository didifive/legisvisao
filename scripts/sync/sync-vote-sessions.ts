import { sql, CAMARA_API_BASE, fetchWithRetry, mapConcurrent } from "./client";
import type { HouseRecordToSync } from "./sync-projects";

export interface SessionToSyncVotes {
  id: number;
  house_record_id: number;
  external_vote_id: string;
  house: string;
}

export interface SyncVoteSessionsResult {
  insertedSessions: number;
  totalSessions: number;
  sessionsToSyncVotes: SessionToSyncVotes[];
}

interface RawVoteSessionApiItem {
  id?: number | string;
  idVotacao?: number | string;
  dataHoraRegistro?: string;
  data?: string;
  descricao?: string;
  aprovacao?: number;
  siglaOrgaoPolitico?: string;
}

/**
 * 1. Carrega todas as sessões de votação já persistidas no banco.
 */
async function loadExistingSessions(): Promise<Map<string, number>> {
  const existingSessions = await sql`
    SELECT id, house_record_id, external_vote_id, date, result
    FROM vote_sessions
  `;
  const sessionMap = new Map<string, number>();
  for (const s of existingSessions) {
    if (s.external_vote_id) {
      sessionMap.set(`${s.house_record_id}_${s.external_vote_id}`, s.id);
    }
  }
  return sessionMap;
}

/**
 * 2. Carrega as fases legislativas padrão em memória (elimina N+1 queries).
 */
async function loadDefaultPhases(): Promise<Map<number, number>> {
  const phases = await sql`
    SELECT DISTINCT ON (house_record_id) id, house_record_id
    FROM legislative_phases
    ORDER BY house_record_id, phase_order ASC
  `;
  const map = new Map<number, number>();
  for (const p of phases) {
    map.set(p.house_record_id, p.id);
  }
  return map;
}

/**
 * 3. Consulta sessões de votação oficiais de uma proposição na API da Câmara.
 */
async function fetchVoteSessionsFromCamara(externalId: string): Promise<RawVoteSessionApiItem[]> {
  const votUrl = `${CAMARA_API_BASE}/proposicoes/${externalId}/votacoes`;
  const votRes = await fetchWithRetry(votUrl, 2, 500);
  if (!votRes.ok) return [];

  const votData = await votRes.json();
  return votData.dados || [];
}

/**
 * 4. Formata o resultado oficial da deliberação.
 */
function deriveSessionResult(vr: RawVoteSessionApiItem): string {
  if (vr.aprovacao === 1) return "APROVADO";
  if (vr.aprovacao === 0) return "REJEITADO";
  return vr.siglaOrgaoPolitico || "ENCERRADO";
}

/**
 * 5. Insere ou recupera uma sessão de votação no banco.
 */
async function upsertVoteSession(
  houseRecordId: number,
  phaseId: number | null,
  extVoteId: string,
  date: string | null,
  description: string,
  result: string,
  sessionMap: Map<string, number>
): Promise<{ sessionId: number | null; wasInserted: boolean }> {
  const sessionKey = `${houseRecordId}_${extVoteId}`;
  let sessionId = sessionMap.get(sessionKey);

  if (!sessionId) {
    const [inserted] = await sql<Array<{ id: number }>>`
      INSERT INTO vote_sessions (
        house_record_id, phase_id, external_vote_id, date, description, result
      ) VALUES (
        ${houseRecordId}, ${phaseId}, ${extVoteId}, ${date}, ${description}, ${result}
      )
      ON CONFLICT (house_record_id, external_vote_id) DO UPDATE SET
        date = EXCLUDED.date,
        description = EXCLUDED.description,
        result = EXCLUDED.result
      RETURNING id;
    `;
    if (inserted && typeof inserted.id === "number") {
      sessionId = inserted.id;
      sessionMap.set(sessionKey, sessionId);
      return { sessionId, wasInserted: true };
    }
  }

  return { sessionId: sessionId || null, wasInserted: false };
}

/**
 * Orquestrador da sincronização de sessões oficiais de deliberação (Concorrente).
 */
export async function syncVoteSessions(
  houseRecords: HouseRecordToSync[]
): Promise<SyncVoteSessionsResult> {
  console.log("-> [Sessões de Votação] Sincronizando sessões oficiais de deliberação...");
  let insertedSessions = 0;

  const [sessionMap, phaseMap] = await Promise.all([
    loadExistingSessions(),
    loadDefaultPhases(),
  ]);

  const sessionsToSyncVotes: SessionToSyncVotes[] = [];
  const camaraRecords = houseRecords.filter((hr) => hr.house === "CAMARA");

  // Executa em paralelo com 8 workers concorrentes
  await mapConcurrent(camaraRecords, 8, async (hr) => {
    try {
      const votacoes = await fetchVoteSessionsFromCamara(hr.external_id);
      const phaseId = phaseMap.get(hr.id) || null;

      for (const vr of votacoes) {
        const extVoteId = String(vr.id || vr.idVotacao || "");
        if (!extVoteId) continue;

        const dataHora = vr.dataHoraRegistro || vr.data || null;
        const descricao = vr.descricao || `Deliberação sobre ${hr.siglaTipo} ${hr.numero}/${hr.ano}`;
        const resultado = deriveSessionResult(vr);

        const { sessionId, wasInserted } = await upsertVoteSession(
          hr.id, phaseId, extVoteId, dataHora, descricao, resultado, sessionMap
        );

        if (wasInserted) insertedSessions++;

        if (sessionId) {
          sessionsToSyncVotes.push({
            id: sessionId,
            house_record_id: hr.id,
            external_vote_id: extVoteId,
            house: "CAMARA",
          });
        }
      }
    } catch (err) {
      console.warn(`[Sessões] Erro ao sincronizar votações da proposição ${hr.external_id}:`, err);
    }
  });

  console.log(`-> [Sessões de Votação] Concluído: ${sessionMap.size} sessões no banco (${insertedSessions} novas inseridas).`);

  return {
    insertedSessions,
    totalSessions: sessionMap.size,
    sessionsToSyncVotes,
  };
}
