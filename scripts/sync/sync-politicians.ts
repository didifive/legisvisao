import { sql, CAMARA_API_BASE, SENADO_API_BASE, fetchWithRetry } from "./client";

export interface SyncPoliticiansResult {
  inserted: number;
  updated: number;
  total: number;
  politicianMap: Map<string, { id: number; source: string; external_id: string; name: string; type: string; state: string }>;
}

interface LegislatureInfo {
  id: number;
  startDate: string | null;
  endDate: string | null;
}

interface DeputyApiItem {
  id: number;
  nome?: string;
  siglaUf?: string;
  siglaPartido?: string;
  urlFoto?: string;
  email?: string;
  idLegislatura?: number;
}

interface SenatorApiItem {
  IdentificacaoParlamentar?: {
    CodigoParlamentar?: string;
    NomeParlamentar?: string;
    UfParlamentar?: string;
    UrlFotoParlamentar?: string;
    EmailParlamentar?: string;
    SiglaPartidoParlamentar?: string;
  };
  Mandato?: {
    PrimeiraLegislaturaDoMandato?: {
      NumeroLegislatura?: string;
      DataInicio?: string;
      DataFim?: string;
    };
    SegundaLegislaturaDoMandato?: {
      NumeroLegislatura?: string;
      DataFim?: string;
    };
    Exercicios?: {
      Exercicio?: Array<{ DataInicio?: string; DataFim?: string }>;
    };
  };
}

/**
 * 1. Carrega dados existentes do banco (parlamentares, mandatos e histórico partidário).
 */
async function loadExistingPoliticiansData() {
  const existingRows = await sql`
    SELECT id, source, external_id, name, type, state, photo_url, email, is_active
    FROM politicians
  `;
  const politicianMap = new Map<string, any>();
  for (const row of existingRows) {
    politicianMap.set(`${row.source}_${row.external_id}`, row);
  }

  const existingMandates = await sql`
    SELECT id, politician_id, office, house, start_date, end_date, legislature_id
    FROM mandates
  `;
  const mandateSet = new Set<string>();
  for (const m of existingMandates) {
    mandateSet.add(`${m.politician_id}_${m.house}_${m.legislature_id || '0'}`);
  }

  const activePartyHistories = await sql`
    SELECT politician_id, party_id
    FROM politician_party_history
    WHERE end_date IS NULL
  `;
  const activePartyHistorySet = new Set<string>();
  for (const h of activePartyHistories) {
    activePartyHistorySet.add(`${h.politician_id}_${h.party_id}`);
  }

  return { politicianMap, mandateSet, activePartyHistorySet };
}

/**
 * 2. Consulta dinamicamente a legislatura mais recente da Câmara dos Deputados.
 */
async function fetchCurrentCamaraLegislature(): Promise<LegislatureInfo | null> {
  try {
    const res = await fetchWithRetry(`${CAMARA_API_BASE}/legislaturas?ordem=DESC&ordenarPor=id&itens=1`, 2, 500);
    if (!res.ok) return null;
    const data = await res.json();
    const latest = data.dados?.[0];
    if (!latest?.id) return null;

    return {
      id: Number(latest.id),
      startDate: latest.dataInicio || null,
      endDate: latest.dataFim || null,
    };
  } catch (err) {
    console.warn("-> [Parlamentares] Aviso ao consultar legislatura atual na Câmara:", err);
    return null;
  }
}

/**
 * 3. Busca lista completa de deputados da legislatura atual na API da Câmara.
 */
async function fetchDeputiesFromApi(legislatureId?: number): Promise<DeputyApiItem[]> {
  const url = legislatureId
    ? `${CAMARA_API_BASE}/deputados?idLegislatura=${legislatureId}&ordem=ASC&ordenarPor=nome&itens=1000`
    : `${CAMARA_API_BASE}/deputados?ordem=ASC&ordenarPor=nome&itens=1000`;

  const res = await fetchWithRetry(url);
  if (!res.ok) {
    throw new Error(`Falha ao buscar deputados: ${res.statusText}`);
  }

  const data = await res.json();
  return data.dados || [];
}

/**
 * 4. Busca lista de senadores em exercício no Senado Federal.
 */
async function fetchSenatorsFromApi(): Promise<SenatorApiItem[]> {
  const res = await fetchWithRetry(`${SENADO_API_BASE}/senador/lista/atual`);
  if (!res.ok) {
    throw new Error(`Falha ao buscar senadores: ${res.statusText}`);
  }

  const data = await res.json();
  const rawList = data?.ListaParlamentarEmExercicio?.Parlamentares?.Parlamentar;
  return Array.isArray(rawList) ? rawList : rawList ? [rawList] : [];
}

/**
 * 5. Cria ou atualiza o registro cadastral do parlamentar.
 */
async function upsertPoliticianRecord(
  source: "CAMARA" | "SENADO",
  extId: string,
  name: string,
  type: "DEPUTY" | "SENATOR",
  state: string,
  photoUrl: string | null,
  email: string | null,
  politicianMap: Map<string, any>
): Promise<{ polDbId: number; wasInserted: boolean; wasUpdated: boolean }> {
  const key = `${source}_${extId}`;
  const existing = politicianMap.get(key);

  if (!existing) {
    const [insertedRow] = await sql`
      INSERT INTO politicians (
        source, external_id, name, type, state, photo_url, email, is_active
      ) VALUES (
        ${source}, ${extId}, ${name}, ${type}, ${state}, ${photoUrl}, ${email}, TRUE
      )
      ON CONFLICT (source, external_id) DO UPDATE SET
        name = EXCLUDED.name,
        state = EXCLUDED.state,
        photo_url = EXCLUDED.photo_url,
        email = EXCLUDED.email,
        is_active = TRUE
      RETURNING id;
    `;
    const polDbId = insertedRow.id;
    politicianMap.set(key, { id: polDbId, source, external_id: extId, name, type, state, photo_url: photoUrl, email, is_active: true });
    return { polDbId, wasInserted: true, wasUpdated: false };
  }

  const polDbId = existing.id;
  const hasChanged =
    existing.name !== name ||
    existing.state !== state ||
    existing.photo_url !== photoUrl ||
    existing.email !== email ||
    existing.is_active !== true;

  if (hasChanged) {
    await sql`
      UPDATE politicians SET
        name = ${name},
        state = ${state},
        photo_url = ${photoUrl},
        email = ${email},
        is_active = TRUE
      WHERE id = ${polDbId};
    `;
    politicianMap.set(key, { ...existing, name, state, photo_url: photoUrl, email, is_active: true });
    return { polDbId, wasInserted: false, wasUpdated: true };
  }

  return { polDbId, wasInserted: false, wasUpdated: false };
}

/**
 * 6. Registra o mandato se ainda não existir.
 */
async function registerMandateIfMissing(
  polDbId: number,
  office: string,
  house: "CAMARA" | "SENADO",
  startDate: string | null,
  endDate: string | null,
  legislatureId: number | null,
  mandateSet: Set<string>
): Promise<void> {
  if (!startDate) return;
  const mandateKey = `${polDbId}_${house}_${legislatureId || '0'}`;
  if (mandateSet.has(mandateKey)) return;

  await sql`
    INSERT INTO mandates (politician_id, office, house, start_date, end_date, legislature_id)
    VALUES (${polDbId}, ${office}, ${house}, ${startDate}, ${endDate}, ${legislatureId});
  `;
  mandateSet.add(mandateKey);
}

/**
 * 7. Registra histórico partidário ativo se ainda não existir.
 */
async function registerActivePartyHistory(
  polDbId: number,
  partySigla: string | undefined,
  startDate: string | null,
  partyMap: Map<string, number>,
  activePartyHistorySet: Set<string>
): Promise<void> {
  if (!partySigla || !polDbId || !startDate) return;
  const partyId = partyMap.get(partySigla.trim().toUpperCase());
  if (!partyId) return;

  const histKey = `${polDbId}_${partyId}`;
  if (activePartyHistorySet.has(histKey)) return;

  await sql`
    INSERT INTO politician_party_history (politician_id, party_id, start_date)
    VALUES (${polDbId}, ${partyId}, ${startDate});
  `;
  activePartyHistorySet.add(histKey);
}

/**
 * Orquestrador da sincronização de Deputados Federais e Senadores.
 */
export async function syncPoliticians(partyMap: Map<string, number>): Promise<SyncPoliticiansResult> {
  console.log("-> [Parlamentares] Sincronizando Deputados Federais e Senadores...");
  let inserted = 0;
  let updated = 0;

  const { politicianMap, mandateSet, activePartyHistorySet } = await loadExistingPoliticiansData();

  // 1. Sincronizar Deputados Federais (Câmara)
  try {
    const currentLeg = await fetchCurrentCamaraLegislature();
    const deputados = await fetchDeputiesFromApi(currentLeg?.id);
    console.log(`-> [Parlamentares] Consultando Câmara dos Deputados (${currentLeg?.id ? `Legislatura: ${currentLeg.id}` : 'Atual'})...`);

    for (const dep of deputados) {
      const extId = String(dep.id);
      const state = dep.siglaUf?.trim().toUpperCase() || "BR";
      const photoUrl = dep.urlFoto || null;
      const email = dep.email || null;
      const name = dep.nome?.trim() || "";
      const legId = dep.idLegislatura ? Number(dep.idLegislatura) : currentLeg?.id || null;

      const { polDbId, wasInserted, wasUpdated } = await upsertPoliticianRecord(
        "CAMARA", extId, name, "DEPUTY", state, photoUrl, email, politicianMap
      );
      if (wasInserted) inserted++;
      if (wasUpdated) updated++;

      await registerMandateIfMissing(
        polDbId, "Deputado Federal", "CAMARA", currentLeg?.startDate || null, currentLeg?.endDate || null, legId, mandateSet
      );

      await registerActivePartyHistory(
        polDbId, dep.siglaPartido, currentLeg?.startDate || null, partyMap, activePartyHistorySet
      );
    }
  } catch (depErr) {
    console.error("-> [Parlamentares] Erro ao sincronizar deputados:", depErr);
    throw depErr;
  }

  // 2. Sincronizar Senadores (Senado Federal)
  try {
    console.log("-> [Parlamentares] Consultando Senado Federal (em exercício)...");
    const senadores = await fetchSenatorsFromApi();

    for (const s of senadores) {
      const info = s.IdentificacaoParlamentar;
      if (!info?.CodigoParlamentar || !info?.NomeParlamentar) continue;

      const extId = String(info.CodigoParlamentar);
      const name = info.NomeParlamentar.trim();
      const state = info.UfParlamentar?.trim().toUpperCase() || "BR";
      const photoUrl = info.UrlFotoParlamentar || null;
      const email = info.EmailParlamentar || null;

      const mandatoInfo = s.Mandato;
      const primeiraLeg = mandatoInfo?.PrimeiraLegislaturaDoMandato;
      const segundaLeg = mandatoInfo?.SegundaLegislaturaDoMandato;
      const senMandateStart = primeiraLeg?.DataInicio || mandatoInfo?.Exercicios?.Exercicio?.[0]?.DataInicio || null;
      const senMandateEnd = segundaLeg?.DataFim || primeiraLeg?.DataFim || null;
      const senLegislatureId = primeiraLeg?.NumeroLegislatura ? Number(primeiraLeg.NumeroLegislatura) : null;

      const { polDbId, wasInserted, wasUpdated } = await upsertPoliticianRecord(
        "SENADO", extId, name, "SENATOR", state, photoUrl, email, politicianMap
      );
      if (wasInserted) inserted++;
      if (wasUpdated) updated++;

      await registerMandateIfMissing(
        polDbId, "Senador", "SENADO", senMandateStart, senMandateEnd, senLegislatureId, mandateSet
      );

      await registerActivePartyHistory(
        polDbId, info.SiglaPartidoParlamentar, senMandateStart, partyMap, activePartyHistorySet
      );
    }
  } catch (senErr) {
    console.error("-> [Parlamentares] Erro ao sincronizar senadores:", senErr);
    throw senErr;
  }

  console.log(`-> [Parlamentares] Concluído: ${politicianMap.size} parlamentares mapeados (${inserted} novos, ${updated} atualizados).`);
  return { inserted, updated, total: politicianMap.size, politicianMap };
}
