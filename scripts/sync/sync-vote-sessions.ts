// ====================================================================
// LegisVisão - Sincronização de Sessões de Votação (Câmara & Senado)
// ====================================================================
import { sql, mapConcurrent } from "./client";
import type { HouseRecordToSync } from "./sync-projects";
import {
  fetchCamaraVoteSessions,
  type CamaraVoteSessionApiItem,
} from "./adapters/camara";
import {
  fetchSenadoVoteSessions,
  type RawSenadoVoteItem,
} from "./adapters/senado";

export interface SessionToSyncVotes {
  id: number;
  house_record_id: number;
  external_vote_id: string;
  house: string;
  date?: string | null;
  materia_external_id?: string;
  senado_raw_votes?: RawSenadoVoteItem[];
}

export interface SyncVoteSessionsResult {
  insertedSessions: number;
  totalSessions: number;
  existingSessionsCount: number;
  camaraSessionsTotal: number;
  camaraSessionsInserted: number;
  senadoSessionsTotal: number;
  senadoSessionsInserted: number;
  sessionsToSyncVotes: SessionToSyncVotes[];
}

interface RawSessionCollected {
  house_record_id: number;
  phase_id: number | null;
  external_vote_id: string;
  date: string | null;
  description: string;
  result: string;
  house: "CAMARA" | "SENADO";
  materia_external_id?: string;
  senado_raw_votes?: RawSenadoVoteItem[];
}

/**
 * 1. Carrega todas as sessões de votação já persistidas no banco.
 */
async function loadExistingSessions(): Promise<Map<string, number>> {
  const existingSessions = await sql<Array<{ id: number; house_record_id: number; external_vote_id: string }>>`
    SELECT id, house_record_id, external_vote_id
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
 * 2. Carrega as fases legislativas padrão em memória.
 */
async function loadDefaultPhases(): Promise<Map<number, number>> {
  const phases = await sql<Array<{ id: number; house_record_id: number }>>`
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
 * 3. Formata o resultado oficial da deliberação da Câmara.
 */
function deriveCamaraSessionResult(vr: CamaraVoteSessionApiItem): string {
  if (vr.aprovacao === 1) return "APROVADO";
  if (vr.aprovacao === 0) return "REJEITADO";
  return vr.siglaOrgaoPolitico || "ENCERRADO";
}

/**
 * 4. Insere sessões coletadas em lotes de 500.
 */
async function batchUpsertSessions(
  collected: RawSessionCollected[],
  sessionMap: Map<string, number>
): Promise<{
  insertedCount: number;
  camaraInserted: number;
  senadoInserted: number;
  sessionsToSyncVotes: SessionToSyncVotes[];
}> {
  if (collected.length === 0) {
    return { insertedCount: 0, camaraInserted: 0, senadoInserted: 0, sessionsToSyncVotes: [] };
  }

  // Filtra itens já presentes e deduplica
  const uniqueItemsMap = new Map<string, RawSessionCollected>();
  for (const item of collected) {
    const key = `${item.house_record_id}_${item.external_vote_id}`;
    if (!uniqueItemsMap.has(key)) {
      uniqueItemsMap.set(key, item);
    }
  }

  const allItems = Array.from(uniqueItemsMap.values());
  const toInsert = allItems.filter((it) => !sessionMap.has(`${it.house_record_id}_${it.external_vote_id}`));
  let insertedCount = 0;
  let camaraInserted = 0;
  let senadoInserted = 0;
  const BATCH_SIZE = 500;

  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const chunk = toInsert.slice(i, i + BATCH_SIZE);
    const results = (await sql`
      INSERT INTO vote_sessions ${sql(
        chunk,
        'house_record_id', 'phase_id', 'external_vote_id', 'date', 'description', 'result'
      )}
      ON CONFLICT (house_record_id, external_vote_id) DO UPDATE SET
        date = EXCLUDED.date,
        description = EXCLUDED.description,
        result = EXCLUDED.result
      RETURNING id, house_record_id, external_vote_id;
    `) as unknown as Array<{ id: number; house_record_id: number; external_vote_id: string }>;

    for (const r of results) {
      insertedCount++;
      sessionMap.set(`${r.house_record_id}_${r.external_vote_id}`, r.id);
    }
  }

  // Contabiliza inserções por casa
  for (const it of toInsert) {
    if (it.house === "CAMARA") camaraInserted++;
    if (it.house === "SENADO") senadoInserted++;
  }

  const sessionsToSyncVotes: SessionToSyncVotes[] = [];
  for (const item of allItems) {
    const sessionId = sessionMap.get(`${item.house_record_id}_${item.external_vote_id}`);
    if (sessionId) {
      sessionsToSyncVotes.push({
        id: sessionId,
        house_record_id: item.house_record_id,
        external_vote_id: item.external_vote_id,
        house: item.house,
        date: item.date,
        materia_external_id: item.materia_external_id,
        senado_raw_votes: item.senado_raw_votes,
      });
    }
  }

  return { insertedCount, camaraInserted, senadoInserted, sessionsToSyncVotes };
}

/**
 * Orquestrador da sincronização de sessões oficiais de deliberação Bicamerais (Concorrente em Lote).
 */
export async function syncVoteSessions(
  houseRecords: HouseRecordToSync[]
): Promise<SyncVoteSessionsResult> {
  console.log("-> [Sessões de Votação] Sincronizando sessões oficiais de deliberação (Câmara & Senado)...");

  const [sessionMap, phaseMap] = await Promise.all([
    loadExistingSessions(),
    loadDefaultPhases(),
  ]);

  const initialSessionsCount = sessionMap.size;
  const camaraRecords = houseRecords.filter((hr) => hr.house === "CAMARA");
  const senadoRecords = houseRecords.filter((hr) => hr.house === "SENADO");
  const collectedSessions: RawSessionCollected[] = [];

  let camaraProcessed = 0;
  let senadoProcessed = 0;
  let camaraSessionsFound = 0;
  let senadoSessionsFound = 0;

  // 1. Coleta Sessões da Câmara dos Deputados
  await mapConcurrent(camaraRecords, 8, async (hr) => {
    try {
      const votacoes = await fetchCamaraVoteSessions(hr.external_id);
      const phaseId = phaseMap.get(hr.id) || null;

      for (const vr of votacoes) {
        const extVoteId = String(vr.id || vr.idVotacao || "");
        if (!extVoteId) continue;

        const dataHora = vr.dataHoraRegistro || vr.data || null;
        const descricao = vr.descricao || `Deliberação sobre ${hr.siglaTipo} ${hr.numero}/${hr.ano}`;
        const resultado = deriveCamaraSessionResult(vr);

        collectedSessions.push({
          house_record_id: hr.id,
          phase_id: phaseId,
          external_vote_id: extVoteId,
          date: dataHora,
          description: descricao,
          result: resultado,
          house: "CAMARA",
        });
        camaraSessionsFound++;
      }
    } catch (err) {
      console.warn(`[Sessões] Aviso ao consultar votações da Câmara na proposição ${hr.external_id}:`, err);
    } finally {
      camaraProcessed++;
      if (camaraProcessed % 500 === 0 || camaraProcessed === camaraRecords.length) {
        console.log(`   • [Câmara] ${camaraProcessed}/${camaraRecords.length} proposições consultadas (${camaraSessionsFound} sessões encontradas)...`);
      }
    }
  });

  // 2. Coleta Sessões do Senado Federal
  await mapConcurrent(senadoRecords, 8, async (hr) => {
    try {
      const votacoes = await fetchSenadoVoteSessions(hr.external_id);
      const phaseId = phaseMap.get(hr.id) || null;

      for (const vr of votacoes) {
        const extVoteId = String(vr.CodigoSessaoVotacao || "");
        if (!extVoteId) continue;

        const dataHora = vr.SessaoPlenaria?.DataSessao || null;
        const descricao = vr.DescricaoVotacao || `Deliberação no Plenário do Senado sobre ${hr.siglaTipo} ${hr.numero}/${hr.ano}`;
        const resultado = vr.DescricaoResultado || vr.Resultado || "CONCLUÍDO";

        const rawVotes = vr.Votos?.VotoParlamentar;
        const senadoVotes: RawSenadoVoteItem[] = Array.isArray(rawVotes) ? rawVotes : rawVotes ? [rawVotes] : [];

        collectedSessions.push({
          house_record_id: hr.id,
          phase_id: phaseId,
          external_vote_id: extVoteId,
          date: dataHora,
          description: descricao,
          result: resultado,
          house: "SENADO",
          materia_external_id: hr.external_id,
          senado_raw_votes: senadoVotes,
        });
        senadoSessionsFound++;
      }
    } catch (err) {
      console.warn(`[Sessões] Aviso ao consultar votações do Senado na matéria ${hr.external_id}:`, err);
    } finally {
      senadoProcessed++;
      if (senadoProcessed % 1000 === 0 || senadoProcessed === senadoRecords.length) {
        console.log(`   • [Senado] ${senadoProcessed}/${senadoRecords.length} matérias consultadas (${senadoSessionsFound} sessões encontradas)...`);
      }
    }
  });

  // 3. Persistência em Lote de Alta Performance
  console.log(`   • Gravando ${collectedSessions.length} sessões identificadas em lote no banco...`);
  const { insertedCount, camaraInserted, senadoInserted, sessionsToSyncVotes } = await batchUpsertSessions(collectedSessions, sessionMap);

  // Relatório Analítico
  console.log(`-> [Sessões de Votação] Análise Detalhada:`);
  console.log(`   • Câmara dos Deputados: ${camaraSessionsFound} sessões (${camaraInserted} novas, ${camaraSessionsFound - camaraInserted} já existentes)`);
  console.log(`   • Senado Federal: ${senadoSessionsFound} sessões (${senadoInserted} novas, ${senadoSessionsFound - senadoInserted} já existentes)`);
  console.log(`   • Total consolidado no banco: ${sessionMap.size} sessões oficiais.`);

  return {
    insertedSessions: insertedCount,
    totalSessions: sessionMap.size,
    existingSessionsCount: initialSessionsCount,
    camaraSessionsTotal: camaraSessionsFound,
    camaraSessionsInserted: camaraInserted,
    senadoSessionsTotal: senadoSessionsFound,
    senadoSessionsInserted: senadoInserted,
    sessionsToSyncVotes,
  };
}
