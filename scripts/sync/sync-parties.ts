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

  const partyMap = new Map<string, number>();
  const partiesMapToInsert = new Map<number, {
    id: number;
    sigla: string;
    nome: string;
    logo_url: string | null;
    total_membros: number;
  }>();

  for (const party of parties) {
    const sigla = party.sigla.trim().toUpperCase();
    partyMap.set(sigla, party.id);
    partiesMapToInsert.set(party.id, {
      id: party.id,
      sigla,
      nome: party.nome.trim(),
      logo_url: null,
      total_membros: 0,
    });
  }

  const valuesToInsert = Array.from(partiesMapToInsert.values());

  let inserted = 0;
  let updated = 0;

  if (valuesToInsert.length > 0) {
    const result = await sql`
      INSERT INTO parties ${sql(valuesToInsert, "id", "sigla", "nome", "logo_url", "total_membros")}
      ON CONFLICT (id) DO UPDATE SET
        sigla = EXCLUDED.sigla,
        nome = EXCLUDED.nome
      RETURNING (xmax = 0) AS is_insert;
    `;

    inserted = result.filter((r) => r.is_insert).length;
    updated = result.length - inserted;
  }

  console.log(`✅ [Partidos] ${valuesToInsert.length} partidos sincronizados em lote (${inserted} novos, ${updated} atualizados).`);

  return {
    total: valuesToInsert.length,
    inserted,
    updated,
    partyMap,
  };
}
