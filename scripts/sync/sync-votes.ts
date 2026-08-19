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

export async function syncVotes(
  sessions: Array<{ sessionId: string; propositionId: number }>,
  deputyMap: Map<number, { nome: string; partido: string; uf: string }>
): Promise<SyncVotesResult> {
  console.log(`🚩 [Votos] Analisando ${sessions.length} sessões de votação...`);

  // 1. Verificação Ativa no Banco: Identificar quais sessões já têm votos nominais completos
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

  // Filtra sessões: se já tem >= 100 votos nominais salvos, a votação já está consolidada
  const sessionsToProcess = sessions.filter((s) => {
    const count = votesPerSessionMap.get(s.sessionId) || 0;
    return count < 100;
  });

  const skippedSessions = sessions.length - sessionsToProcess.length;
  console.log(`📊 [Votos] ${skippedSessions} sessões já consolidadas (${alreadyRecordedVotes.toLocaleString("pt-BR")} votos em cache). ${sessionsToProcess.length} sessões pendentes para ingestão.`);

  if (sessionsToProcess.length === 0) {
    console.log("✅ [Votos] Todas as sessões já estão totalmente sincronizadas no banco!");
    return {
      totalVotes: alreadyRecordedVotes,
      insertedVotes: 0,
      processedSessions: 0,
      skippedSessions,
    };
  }

  // Prepara conjunto de partidos conhecidos para evitar queries desnecessárias
  const existingParties = await sql<Array<{ sigla: string }>>`SELECT sigla FROM parties`;
  const knownParties = new Set<string>(existingParties.map((p) => p.sigla.toUpperCase()));

  let totalNewVotesCollected = 0;
  let insertedVotes = 0;
  let processedSessions = 0;

  // Buffer de votos acumulados para inserção em lote de alta performance
  let voteBuffer: Array<{
    votacao_id: string;
    deputado_id: number;
    sigla_partido: string;
    voto_original: string;
  }> = [];

  const pendingParties = new Map<string, { id: number; sigla: string; nome: string }>();
  const pendingDeputies = new Map<number, {
    id: number;
    nome: string;
    nome_eleitoral: string;
    sigla_partido: string;
    sigla_uf: string;
    url_foto: string | null;
    situacao: string;
    legislatura: number;
    is_active: boolean;
  }>();

  let flushQueue: Promise<void> = Promise.resolve();

  // Função auxiliar para descarregar o lote no PostgreSQL com fila sequencial e retry automático
  async function flushBuffer(): Promise<void> {
    flushQueue = flushQueue.then(async () => {
      if (voteBuffer.length === 0 && pendingParties.size === 0 && pendingDeputies.size === 0) return;

      const currentVotes = [...voteBuffer];
      voteBuffer = [];

      const partiesList = Array.from(pendingParties.values());
      pendingParties.clear();

      const depList = Array.from(pendingDeputies.values());
      pendingDeputies.clear();

      // Retry com backoff exponencial para lidar com ECONNRESET ou reinício de conexão do Supabase
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          // 1. Inserir partidos novos se houver
          if (partiesList.length > 0) {
            for (const chunk of chunkArray(partiesList, 50)) {
              await sql`
                INSERT INTO parties ${sql(chunk, "id", "sigla", "nome")}
                ON CONFLICT (sigla) DO NOTHING;
              `;
            }
          }

          // 2. Inserir deputados novos se houver
          if (depList.length > 0) {
            for (const chunk of chunkArray(depList, 100)) {
              await sql`
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
              `;
            }
          }

          // 3. Inserir votos em lotes de 1000 registros com deduplicação por chave composta
          if (currentVotes.length > 0) {
            const deduplicatedVotesMap = new Map<string, typeof currentVotes[0]>();
            for (const v of currentVotes) {
              deduplicatedVotesMap.set(`${v.votacao_id}_${v.deputado_id}`, v);
            }
            const deduplicatedVotes = Array.from(deduplicatedVotesMap.values());

            for (const chunk of chunkArray(deduplicatedVotes, 1000)) {
              const result = await sql`
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
              `;

              const newInserts = result.filter((r) => r.is_insert).length;
              insertedVotes += newInserts;
            }
          }

          return;
        } catch (err) {
          if (attempt === 3) {
            console.error("❌ [Votos] Falha persistente ao descarregar lote no banco:", err);
            voteBuffer.push(...currentVotes);
            throw err;
          }
          console.warn(`⚠️ [Votos] Conexão com banco oscilou (${(err as Error).message}). Reconectando (tentativa ${attempt}/3 em ${attempt * 1000}ms)...`);
          await new Promise((r) => setTimeout(r, attempt * 1000));
        }
      }
    });

    return flushQueue;
  }

  // 2. Processar sessões pendentes com concorrência e bufferização
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

      for (const v of votes) {
        const dep = v.deputado_;
        if (!dep?.id) continue;

        const siglaPart = dep.siglaPartido ? dep.siglaPartido.trim().toUpperCase() : "S.PART.";
        const siglaUf = dep.siglaUf ? dep.siglaUf.trim().toUpperCase() : "BR";

        // Registrar partido se desconhecido
        if (!knownParties.has(siglaPart)) {
          knownParties.add(siglaPart);
          pendingParties.set(siglaPart, {
            id: Math.abs(dep.id * 1000),
            sigla: siglaPart,
            nome: siglaPart,
          });
        }

        // Registrar deputado se desconhecido
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

        const finalParty = dep.siglaPartido ? dep.siglaPartido.trim().toUpperCase() : deputyMap.get(dep.id)?.partido || siglaPart;

        voteBuffer.push({
          votacao_id: sessionId,
          deputado_id: dep.id,
          sigla_partido: finalParty,
          voto_original: v.tipoVoto ? v.tipoVoto.trim() : "Outros",
        });
      }

      // Se acumulou mais de 2.000 votos no buffer, descarrega no banco
      if (voteBuffer.length >= 2000) {
        await flushBuffer();
      }

      if ((idx + 1) % 10 === 0 || idx + 1 === sessionsToProcess.length) {
        const pct = (((idx + 1) / sessionsToProcess.length) * 100).toFixed(1);
        console.log(`  🗳️ [Votos] Progresso: ${idx + 1}/${sessionsToProcess.length} (${pct}%) | ${totalNewVotesCollected.toLocaleString("pt-BR")} votos coletados`);
      }
    } catch (err) {
      console.warn(`⚠️ [Votos] Erro na sessão ${sessionId}:`, err);
    }
  });

  // Descarregar quaisquer votos restantes no buffer
  await flushBuffer();

  console.log(`✅ [Votos] Sincronização concluída: ${totalNewVotesCollected} votos processados em ${processedSessions} sessões pendentes (${insertedVotes} novos inseridos).`);

  return {
    totalVotes: alreadyRecordedVotes + totalNewVotesCollected,
    insertedVotes,
    processedSessions,
    skippedSessions,
  };
}
