// ====================================================================
// LegisVisão - Sincronização de Votos Nominais dos Deputados (Alta Performance em Lotes)
// ====================================================================
import { sql, CAMARA_API_BASE, fetchWithRetry, mapConcurrent, chunkArray } from "./client";

interface CamaraIndividualVote {
  tipoVoto: string;
  dataRegistroVoto?: string;
  deputado_?: {
    id: number;
    uri: string;
    nome: string;
    siglaPartido: string;
    siglaUf: string;
    urlFoto: string;
  } | null;
}

export interface SyncVotesResult {
  totalVotes: number;
  insertedVotes: number;
  processedSessions: number;
  skippedSessions: number;
}

interface PendingPartyItem {
  id: number;
  sigla: string;
  nome: string;
}

interface PendingDeputyItem {
  id: number;
  nome: string;
  nome_eleitoral: string;
  sigla_partido: string;
  sigla_uf: string;
  url_foto: string | null;
  situacao: string;
  legislatura: number;
  is_active: boolean;
}

interface VoteRecord {
  votacao_id: string;
  deputado_id: number;
  sigla_partido: string;
  voto_original: string;
}

async function insertPendingParties(partiesList: PendingPartyItem[]): Promise<void> {
  if (partiesList.length === 0) return;
  const chunks = chunkArray(partiesList, 50);
  await Promise.all(
    chunks.map((chunk) =>
      sql`
        INSERT INTO parties ${sql(chunk, "id", "sigla", "nome")}
        ON CONFLICT (sigla) DO NOTHING;
      `
    )
  );
}

async function insertPendingDeputies(depList: PendingDeputyItem[]): Promise<void> {
  if (depList.length === 0) return;
  const chunks = chunkArray(depList, 100);
  await Promise.all(
    chunks.map((chunk) =>
      sql`
        INSERT INTO deputies ${sql(
          chunk,
          "id",
          "nome",
          "nome_eleitoral",
          "sigla_partido",
          "sigla_uf",
          "url_foto",
          "situacao",
          "legislatura",
          "is_active"
        )}
        ON CONFLICT (id) DO UPDATE SET
          sigla_partido = EXCLUDED.sigla_partido;
      `
    )
  );
}

async function insertDeputyVotes(votesList: VoteRecord[]): Promise<number> {
  if (votesList.length === 0) return 0;

  const deduplicatedVotesMap = new Map<string, VoteRecord>();
  for (const v of votesList) {
    deduplicatedVotesMap.set(`${v.votacao_id}_${v.deputado_id}`, v);
  }
  const deduplicatedVotes = Array.from(deduplicatedVotesMap.values());

  const chunks = chunkArray(deduplicatedVotes, 1000);
  const results = await Promise.all(
    chunks.map((chunk) =>
      sql`
        INSERT INTO deputy_votes ${sql(
          chunk,
          "votacao_id",
          "deputado_id",
          "sigla_partido",
          "voto_original"
        )}
        ON CONFLICT (votacao_id, deputado_id) DO UPDATE SET
          sigla_partido = EXCLUDED.sigla_partido,
          voto_original = EXCLUDED.voto_original
        RETURNING (xmax = 0) AS is_insert;
      `
    )
  );

  let newInserts = 0;
  for (const res of results) {
    newInserts += res.filter((r) => r.is_insert).length;
  }
  return newInserts;
}

async function flushLoteWithRetry(
  partiesList: PendingPartyItem[],
  depList: PendingDeputyItem[],
  currentVotes: VoteRecord[],
  attempt = 1
): Promise<number> {
  try {
    await insertPendingParties(partiesList);
    await insertPendingDeputies(depList);
    return await insertDeputyVotes(currentVotes);
  } catch (err) {
    if (attempt >= 3) {
      console.error("❌ [Votos] Falha persistente ao descarregar lote no banco:", err);
      throw err;
    }
    console.warn(
      `⚠️ [Votos] Conexão com banco oscilou (${(err as Error).message}). Reconectando (tentativa ${attempt}/3 em ${attempt * 1000}ms)...`
    );
    await new Promise((r) => setTimeout(r, attempt * 1000));
    return flushLoteWithRetry(partiesList, depList, currentVotes, attempt + 1);
  }
}

function parseIndividualVotes(
  votes: CamaraIndividualVote[],
  sessionId: string,
  deputyMap: Map<number, { nome: string; partido: string; uf: string }>,
  knownParties: Set<string>,
  pendingParties: Map<string, PendingPartyItem>,
  pendingDeputies: Map<number, PendingDeputyItem>
): VoteRecord[] {
  const result: VoteRecord[] = [];

  for (const v of votes) {
    const dep = v.deputado_;
    if (!dep?.id) continue;

    const siglaPart = dep.siglaPartido ? dep.siglaPartido.trim().toUpperCase() : "S.PART.";
    const siglaUf = dep.siglaUf ? dep.siglaUf.trim().toUpperCase() : "BR";

    if (!knownParties.has(siglaPart)) {
      knownParties.add(siglaPart);
      pendingParties.set(siglaPart, {
        id: Math.abs(dep.id * 1000),
        sigla: siglaPart,
        nome: siglaPart,
      });
    }

    if (!deputyMap.has(dep.id)) {
      deputyMap.set(dep.id, { nome: dep.nome || "Deputado", partido: siglaPart, uf: siglaUf });
      pendingDeputies.set(dep.id, {
        id: dep.id,
        nome: dep.nome || "Deputado",
        nome_eleitoral: dep.nome || "Deputado",
        sigla_partido: siglaPart,
        sigla_uf: siglaUf,
        url_foto: dep.urlFoto || null,
        situacao: "Exercício",
        legislatura: 57,
        is_active: true,
      });
    }

    const finalParty = dep.siglaPartido
      ? dep.siglaPartido.trim().toUpperCase()
      : deputyMap.get(dep.id)?.partido || siglaPart;

    result.push({
      votacao_id: sessionId,
      deputado_id: dep.id,
      sigla_partido: finalParty,
      voto_original: v.tipoVoto ? v.tipoVoto.trim() : "Outros",
    });
  }

  return result;
}

export async function syncVotes(
  sessions: Array<{ sessionId: string; propositionId: number }>,
  deputyMap: Map<number, { nome: string; partido: string; uf: string }>
): Promise<SyncVotesResult> {
  console.log(`🚩 [Votos] Analisando ${sessions.length} sessões de votação...`);

  const existingVoteCounts = await sql<Array<{ votacao_id: string; total: string }>>`
    SELECT votacao_id, COUNT(*) as total
    FROM deputy_votes
    GROUP BY votacao_id
  `;

  const votesPerSessionMap = new Map<string, number>();
  let alreadyRecordedVotes = 0;
  for (const r of existingVoteCounts) {
    const count = Number(r.total);
    votesPerSessionMap.set(r.votacao_id, count);
    alreadyRecordedVotes += count;
  }

  const sessionsToProcess = sessions.filter((s) => {
    const count = votesPerSessionMap.get(s.sessionId) || 0;
    return count < 100;
  });

  const skippedSessions = sessions.length - sessionsToProcess.length;
  console.log(
    `📊 [Votos] ${skippedSessions} sessões já consolidadas (${alreadyRecordedVotes.toLocaleString(
      "pt-BR"
    )} votos em cache). ${sessionsToProcess.length} sessões pendentes para ingestão.`
  );

  if (sessionsToProcess.length === 0) {
    console.log("✅ [Votos] Todas as sessões já estão totalmente sincronizadas no banco!");
    return {
      totalVotes: alreadyRecordedVotes,
      insertedVotes: 0,
      processedSessions: 0,
      skippedSessions,
    };
  }

  const existingParties = await sql<Array<{ sigla: string }>>`SELECT sigla FROM parties`;
  const knownParties = new Set<string>(existingParties.map((p) => p.sigla.toUpperCase()));

  let totalNewVotesCollected = 0;
  let insertedVotes = 0;
  let processedSessions = 0;

  let voteBuffer: VoteRecord[] = [];
  const pendingParties = new Map<string, PendingPartyItem>();
  const pendingDeputies = new Map<number, PendingDeputyItem>();

  let flushQueue: Promise<void> = Promise.resolve();

  async function flushBuffer(): Promise<void> {
    flushQueue = flushQueue.then(async () => {
      if (voteBuffer.length === 0 && pendingParties.size === 0 && pendingDeputies.size === 0) return;

      const currentVotes = [...voteBuffer];
      voteBuffer = [];

      const partiesList = Array.from(pendingParties.values());
      pendingParties.clear();

      const depList = Array.from(pendingDeputies.values());
      pendingDeputies.clear();

      try {
        const newInserts = await flushLoteWithRetry(partiesList, depList, currentVotes);
        insertedVotes += newInserts;
      } catch (err) {
        voteBuffer.push(...currentVotes);
        throw err;
      }
    });

    return flushQueue;
  }

  console.log(`⚡ [Votos] Coletando votos de ${sessionsToProcess.length} sessões...`);

  await mapConcurrent(sessionsToProcess, 10, async ({ sessionId }, idx) => {
    try {
      const url = `${CAMARA_API_BASE}/votacoes/${sessionId}/votos`;
      const res = await fetchWithRetry(url, 2, 400);
      if (!res.ok) return;

      const json = await res.json();
      const votes: CamaraIndividualVote[] = json.dados || [];
      if (votes.length === 0) return;

      processedSessions++;
      totalNewVotesCollected += votes.length;

      const parsedVotes = parseIndividualVotes(
        votes,
        sessionId,
        deputyMap,
        knownParties,
        pendingParties,
        pendingDeputies
      );
      voteBuffer.push(...parsedVotes);

      if (voteBuffer.length >= 2000) {
        await flushBuffer();
      }

      if ((idx + 1) % 10 === 0 || idx + 1 === sessionsToProcess.length) {
        const pct = (((idx + 1) / sessionsToProcess.length) * 100).toFixed(1);
        console.log(
          `  🗳️ [Votos] Progresso: ${idx + 1}/${sessionsToProcess.length} (${pct}%) | ${totalNewVotesCollected.toLocaleString(
            "pt-BR"
          )} votos coletados`
        );
      }
    } catch (err) {
      console.warn(`⚠️ [Votos] Erro na sessão ${sessionId}:`, err);
    }
  });

  await flushBuffer();

  console.log(
    `✅ [Votos] Sincronização concluída: ${totalNewVotesCollected} votos processados em ${processedSessions} sessões pendentes (${insertedVotes} novos inseridos).`
  );

  return {
    totalVotes: alreadyRecordedVotes + totalNewVotesCollected,
    insertedVotes,
    processedSessions,
    skippedSessions,
  };
}
