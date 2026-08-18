import { sql, CAMARA_API_BASE, fetchWithRetry, mapConcurrent } from "./client";

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

interface DetailedPartyInfo {
  id?: number;
  sigla: string;
  nome: string;
  uri: string | null;
  situacao: string;
  totalMembros: number;
  totalPosse: number;
  numeroEleitoral: number | null;
  logoUrl: string | null;
}

interface ExistingPartyRow {
  id: number;
  sigla: string;
  nome: string;
  uri: string | null;
  situacao: string | null;
  total_membros: number | null;
  total_posse: number | null;
  numero_eleitoral: number | null;
  logo_url: string | null;
}

/**
 * 1. Carrega todos os partidos já persistidos no banco de dados.
 */
async function loadExistingParties(): Promise<{
  partyMap: Map<string, number>;
  existingMap: Map<string, ExistingPartyRow>;
}> {
  const existingRows = await sql<ExistingPartyRow[]>`
    SELECT id, sigla, nome, uri, situacao, total_membros, total_posse, numero_eleitoral, logo_url 
    FROM political_parties
  `;
  const partyMap = new Map<string, number>();
  const existingMap = new Map<string, ExistingPartyRow>();

  for (const row of existingRows) {
    const siglaUpper = row.sigla.toUpperCase();
    partyMap.set(siglaUpper, row.id);
    existingMap.set(siglaUpper, row);
  }

  return { partyMap, existingMap };
}

/**
 * 2. Consulta a API oficial da Câmara dos Deputados para obter a lista básica de partidos.
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
 * 3. Consulta detalhes oficiais do partido (situação ativa/inativa, bancada, número eleitoral, logo).
 */
async function fetchPartyDetails(rawParty: RawPartyApiItem): Promise<DetailedPartyInfo | null> {
  if (!rawParty.sigla) return null;
  const sigla = rawParty.sigla.trim();
  const nome = rawParty.nome?.trim() || sigla;
  const uri = rawParty.uri?.trim() || null;

  let situacao = "Ativo";
  let totalMembros = 0;
  let totalPosse = 0;
  let numeroEleitoral: number | null = null;
  let logoUrl: string | null = null;

  if (rawParty.id) {
    try {
      const res = await fetchWithRetry(`${CAMARA_API_BASE}/partidos/${rawParty.id}`, 2, 500);
      if (res.ok) {
        const json = await res.json();
        const d = json.dados;
        if (d) {
          situacao = d.status?.situacao || "Ativo";
          totalMembros = d.status?.totalMembros ? Number(d.status.totalMembros) : 0;
          totalPosse = d.status?.totalPosse ? Number(d.status.totalPosse) : 0;
          numeroEleitoral = d.numeroEleitoral ? Number(d.numeroEleitoral) : null;
          logoUrl = d.urlLogo || null;
        }
      }
    } catch {
      // Usa valores padrão em caso de timeout
    }
  }

  return {
    id: rawParty.id,
    sigla,
    nome,
    uri,
    situacao,
    totalMembros,
    totalPosse,
    numeroEleitoral,
    logoUrl,
  };
}

/**
 * 4. Persiste ou atualiza os dados oficiais do partido no banco de dados.
 */
async function saveOrUpdateDetailedParty(
  party: DetailedPartyInfo,
  partyMap: Map<string, number>,
  existingMap: Map<string, ExistingPartyRow>
): Promise<{ wasInserted: boolean; wasUpdated: boolean }> {
  const siglaUpper = party.sigla.toUpperCase();
  const existing = existingMap.get(siglaUpper);

  if (!existing) {
    const [insertedRow] = await sql`
      INSERT INTO political_parties (
        sigla, nome, uri, situacao, total_membros, total_posse, numero_eleitoral, logo_url
      ) VALUES (
        ${party.sigla}, ${party.nome}, ${party.uri}, ${party.situacao}, 
        ${party.totalMembros}, ${party.totalPosse}, ${party.numeroEleitoral}, ${party.logoUrl}
      )
      ON CONFLICT (sigla) DO UPDATE SET
        nome = EXCLUDED.nome,
        uri = EXCLUDED.uri,
        situacao = EXCLUDED.situacao,
        total_membros = EXCLUDED.total_membros,
        total_posse = EXCLUDED.total_posse,
        numero_eleitoral = EXCLUDED.numero_eleitoral,
        logo_url = EXCLUDED.logo_url
      RETURNING id;
    `;
    if (insertedRow) {
      partyMap.set(siglaUpper, insertedRow.id);
      existingMap.set(siglaUpper, {
        id: insertedRow.id,
        sigla: party.sigla,
        nome: party.nome,
        uri: party.uri,
        situacao: party.situacao,
        total_membros: party.totalMembros,
        total_posse: party.totalPosse,
        numero_eleitoral: party.numeroEleitoral,
        logo_url: party.logoUrl,
      });
      return { wasInserted: true, wasUpdated: false };
    }
  } else {
    const hasChanged =
      existing.nome !== party.nome ||
      existing.situacao !== party.situacao ||
      existing.total_membros !== party.totalMembros ||
      existing.numero_eleitoral !== party.numeroEleitoral ||
      existing.logo_url !== party.logoUrl;

    if (hasChanged) {
      await sql`
        UPDATE political_parties SET
          nome = ${party.nome},
          uri = ${party.uri},
          situacao = ${party.situacao},
          total_membros = ${party.totalMembros},
          total_posse = ${party.totalPosse},
          numero_eleitoral = ${party.numeroEleitoral},
          logo_url = ${party.logoUrl}
        WHERE id = ${existing.id};
      `;
      existingMap.set(siglaUpper, {
        ...existing,
        nome: party.nome,
        uri: party.uri,
        situacao: party.situacao,
        total_membros: party.totalMembros,
        total_posse: party.totalPosse,
        numero_eleitoral: party.numeroEleitoral,
        logo_url: party.logoUrl,
      });
      return { wasInserted: false, wasUpdated: true };
    }
  }

  return { wasInserted: false, wasUpdated: false };
}

/**
 * Orquestrador da sincronização de partidos políticos oficiais da Câmara.
 */
export async function syncParties(): Promise<SyncPartiesResult> {
  console.log("-> [Partidos] Sincronizando partidos políticos oficiais e metadados da Câmara...");
  let inserted = 0;
  let updated = 0;

  try {
    const { partyMap, existingMap } = await loadExistingParties();
    const rawParties = await fetchPartiesFromApi();

    // Consulta detalhes oficiais com 8 workers concorrentes
    const detailedList: DetailedPartyInfo[] = [];
    await mapConcurrent(rawParties, 8, async (raw) => {
      const detailed = await fetchPartyDetails(raw);
      if (detailed) {
        detailedList.push(detailed);
      }
    });

    for (const detailedParty of detailedList) {
      const { wasInserted, wasUpdated } = await saveOrUpdateDetailedParty(detailedParty, partyMap, existingMap);
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
