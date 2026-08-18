// ====================================================================
// LegisVisão - Sincronização de Votos Nominais dos Deputados
// ====================================================================
import { sql, CAMARA_API_BASE, fetchWithRetry, mapConcurrent } from "./client";

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
}

export async function syncVotes(
  sessions: Array<{ sessionId: string; propositionId: number }>,
  deputyMap: Map<number, { nome: string; partido: string; uf: string }>
): Promise<SyncVotesResult> {
  console.log(`🚩 [Votos] Sincronizando votos nominais para ${sessions.length} sessões de deliberação...`);

  let totalVotes = 0;
  let insertedVotes = 0;
  let processedSessions = 0;

  await mapConcurrent(sessions, 6, async ({ sessionId }) => {
    try {
      const url = `${CAMARA_API_BASE}/votacoes/${sessionId}/votos`;
      const res = await fetchWithRetry(url, 2, 400);
      if (!res.ok) return;

      const json = await res.json();
      const votes: CamaraIndividualVote[] = json.dados || [];
      if (votes.length === 0) return;

      processedSessions++;
      totalVotes += votes.length;

      // Monta lote de inserção
      const valuesToInsert: Array<{
        votacao_id: string;
        deputado_id: number;
        sigla_partido: string;
        voto_original: string;
      }> = [];

      for (const v of votes) {
        const dep = v.deputado_;
        if (!dep?.id) continue;

        const siglaPart = dep.siglaPartido ? dep.siglaPartido.trim().toUpperCase() : "S.PART.";
        const siglaUf = dep.siglaUf ? dep.siglaUf.trim().toUpperCase() : "BR";

        // Garante que o partido existe para respeitar foreign key
        await sql`
          INSERT INTO parties (id, sigla, nome)
          VALUES (ABS(HASHTEXT(${siglaPart})), ${siglaPart}, ${siglaPart})
          ON CONFLICT (sigla) DO NOTHING;
        `;

        // Se o deputado ainda não estiver no mapa cadastral, insere dados mínimos
        if (!deputyMap.has(dep.id)) {
          await sql`
            INSERT INTO deputies (id, nome, nome_eleitoral, sigla_partido, sigla_uf, url_foto, situacao, legislatura, is_active)
            VALUES (${dep.id}, ${dep.nome}, ${dep.nome}, ${siglaPart}, ${siglaUf}, ${dep.urlFoto || null}, 'Exercício', 57, TRUE)
            ON CONFLICT (id) DO UPDATE SET
              sigla_partido = EXCLUDED.sigla_partido;
          `;

          deputyMap.set(dep.id, { nome: dep.nome, partido: siglaPart, uf: siglaUf });
        }

        const finalParty = dep.siglaPartido ? dep.siglaPartido.trim().toUpperCase() : deputyMap.get(dep.id)?.partido || siglaPart;

        valuesToInsert.push({
          votacao_id: sessionId,
          deputado_id: dep.id,
          sigla_partido: finalParty,
          voto_original: v.tipoVoto ? v.tipoVoto.trim() : "Outros",
        });
      }

      if (valuesToInsert.length > 0) {
        const result = await sql`
          INSERT INTO deputy_votes ${sql(valuesToInsert, "votacao_id", "deputado_id", "sigla_partido", "voto_original")}
          ON CONFLICT (votacao_id, deputado_id) DO UPDATE SET
            sigla_partido = EXCLUDED.sigla_partido,
            voto_original = EXCLUDED.voto_original
          RETURNING (xmax = 0) AS is_insert;
        `;

        const newlyInserted = result.filter((r) => r.is_insert).length;
        insertedVotes += newlyInserted;
      }
    } catch (err) {
      console.warn(`⚠️ [Votos] Erro na sessão ${sessionId}:`, err);
    }
  });

  console.log(`✅ [Votos] Sincronização concluída: ${totalVotes} votos processados em ${processedSessions} sessões (${insertedVotes} novos).`);

  return {
    totalVotes,
    insertedVotes,
    processedSessions,
  };
}
