// ====================================================================
// LegisVisão - Sincronização de Partidos Políticos (Câmara dos Deputados)
// ====================================================================
import { sql, CAMARA_API_BASE, fetchWithRetry } from "./client";

interface CamaraPartyItem {
  id: number;
  sigla: string;
  nome: string;
  uri: string;
}

export interface SyncPartiesResult {
  total: number;
  inserted: number;
  updated: number;
  partyMap: Map<string, number>;
}

export async function syncParties(): Promise<SyncPartiesResult> {
  console.log("🚩 [Partidos] Sincronizando catálogo de partidos da Câmara...");

  const res = await fetchWithRetry(`${CAMARA_API_BASE}/partidos?itens=100&ordem=ASC&ordenarPor=sigla`);
  if (!res.ok) {
    throw new Error(`Erro ao consultar API de partidos: HTTP ${res.status}`);
  }

  const json = await res.json();
  const parties: CamaraPartyItem[] = json.dados || [];

  let inserted = 0;
  let updated = 0;
  const partyMap = new Map<string, number>();

  for (const party of parties) {
    const sigla = party.sigla.trim().toUpperCase();
    partyMap.set(sigla, party.id);

    const result = await sql`
      INSERT INTO parties (id, sigla, nome, logo_url, total_membros)
      VALUES (
        ${party.id},
        ${sigla},
        ${party.nome.trim()},
        ${null},
        0
      )
      ON CONFLICT (id) DO UPDATE SET
        sigla = EXCLUDED.sigla,
        nome = EXCLUDED.nome
      RETURNING (xmax = 0) AS is_insert;
    `;

    if (result.length > 0) {
      if (result[0].is_insert) inserted++;
      else updated++;
    }
  }

  console.log(`✅ [Partidos] ${parties.length} partidos sincronizados (${inserted} novos, ${updated} atualizados).`);

  return {
    total: parties.length,
    inserted,
    updated,
    partyMap,
  };
}
