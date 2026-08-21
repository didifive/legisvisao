import { sql, CAMARA_API_BASE, fetchWithRetry, mapConcurrent } from "./client";

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

function getPartyLogoUrlFallback(sigla: string): string {
  const clean = sigla
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
  return `https://www.camara.leg.br/internet/Deputado/img/partidos/${clean}.gif`;
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

  // Consultar detalhes individuais de cada partido em paralelo para obter o urlLogo oficial
  const detailedParties = await mapConcurrent(parties, 6, async (party) => {
    let officialLogoUrl: string | null = null;
    try {
      const detailRes = await fetchWithRetry(`${CAMARA_API_BASE}/partidos/${party.id}`);
      if (detailRes.ok) {
        const detailJson = await detailRes.json();
        officialLogoUrl = detailJson.dados?.urlLogo || null;
      }
    } catch {
      // Usa fallback caso a consulta do detalhe falhe
    }

    const sigla = party.sigla.trim().toUpperCase();
    return {
      id: party.id,
      sigla,
      nome: party.nome.trim(),
      logo_url: officialLogoUrl || getPartyLogoUrlFallback(sigla),
      total_membros: 0,
    };
  });

  const partiesMapToInsert = new Map<number, {
    id: number;
    sigla: string;
    nome: string;
    logo_url: string | null;
    total_membros: number;
  }>();

  for (const item of detailedParties) {
    partyMap.set(item.sigla, item.id);
    partiesMapToInsert.set(item.id, item);
  }

  const valuesToInsert = Array.from(partiesMapToInsert.values());

  let inserted = 0;
  let updated = 0;

  if (valuesToInsert.length > 0) {
    const result = await sql`
      INSERT INTO parties ${sql(valuesToInsert, "id", "sigla", "nome", "logo_url", "total_membros")}
      ON CONFLICT (id) DO UPDATE SET
        sigla = EXCLUDED.sigla,
        nome = EXCLUDED.nome,
        logo_url = EXCLUDED.logo_url
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
