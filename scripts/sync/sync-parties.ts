import { sql, CAMARA_API_BASE, fetchWithRetry } from "./client";

export interface SyncPartiesResult {
  inserted: number;
  updated: number;
  total: number;
  partyMap: Map<string, number>;
}

interface RawPartyApiItem {
  id?: number;
  sigla?: string;
  nome?: string;
  uri?: string;
}

/**
 * 1. Carrega todos os partidos já persistidos no banco de dados.
 */
async function loadExistingParties(): Promise<{
  partyMap: Map<string, number>;
  existingByName: Map<string, string>;
}> {
  const existingRows = await sql`SELECT id, sigla, nome FROM political_parties`;
  const partyMap = new Map<string, number>();
  const existingByName = new Map<string, string>();

  for (const row of existingRows) {
    const siglaUpper = row.sigla.toUpperCase();
    partyMap.set(siglaUpper, row.id);
    existingByName.set(siglaUpper, row.nome);
  }

  return { partyMap, existingByName };
}

/**
 * 2. Consulta a API oficial da Câmara dos Deputados para obter a lista de partidos.
 */
async function fetchPartiesFromApi(): Promise<RawPartyApiItem[]> {
  const res = await fetchWithRetry(`${CAMARA_API_BASE}/partidos?itens=1000&ordem=ASC&ordenarPor=sigla`);
  if (!res.ok) {
    throw new Error(`Falha ao buscar partidos: ${res.statusText}`);
  }
  const data = await res.json();
  return data.dados || [];
}

/**
 * 3. Persiste ou atualiza um partido no banco de dados.
 */
async function saveOrUpdateParty(
  party: RawPartyApiItem,
  partyMap: Map<string, number>,
  existingByName: Map<string, string>
): Promise<{ wasInserted: boolean; wasUpdated: boolean }> {
  if (!party.sigla) return { wasInserted: false, wasUpdated: false };

  const sigla = party.sigla.trim();
  const siglaUpper = sigla.toUpperCase();
  const nome = party.nome?.trim() || sigla;

  if (!partyMap.has(siglaUpper)) {
    const [insertedRow] = await sql`
      INSERT INTO political_parties (sigla, nome)
      VALUES (${sigla}, ${nome})
      ON CONFLICT (sigla) DO UPDATE SET nome = EXCLUDED.nome
      RETURNING id;
    `;
    if (insertedRow) {
      partyMap.set(siglaUpper, insertedRow.id);
      existingByName.set(siglaUpper, nome);
      return { wasInserted: true, wasUpdated: false };
    }
  } else {
    const currentName = existingByName.get(siglaUpper);
    if (currentName !== nome) {
      await sql`
        UPDATE political_parties
        SET nome = ${nome}
        WHERE sigla = ${sigla};
      `;
      existingByName.set(siglaUpper, nome);
      return { wasInserted: false, wasUpdated: true };
    }
  }

  return { wasInserted: false, wasUpdated: false };
}

/**
 * Orquestrador da sincronização de partidos políticos oficiais.
 */
export async function syncParties(): Promise<SyncPartiesResult> {
  console.log("-> [Partidos] Sincronizando partidos políticos oficiais...");
  let inserted = 0;
  let updated = 0;

  try {
    const { partyMap, existingByName } = await loadExistingParties();
    const rawParties = await fetchPartiesFromApi();

    for (const rawParty of rawParties) {
      const { wasInserted, wasUpdated } = await saveOrUpdateParty(rawParty, partyMap, existingByName);
      if (wasInserted) inserted++;
      if (wasUpdated) updated++;
    }

    console.log(`-> [Partidos] Concluído: ${partyMap.size} partidos no catálogo (${inserted} novos, ${updated} atualizados).`);

    return {
      inserted,
      updated,
      total: partyMap.size,
      partyMap,
    };
  } catch (err) {
    console.error("-> [Partidos] Erro ao sincronizar partidos:", err);
    throw err;
  }
}
