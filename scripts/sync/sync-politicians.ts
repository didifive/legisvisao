// ====================================================================
// LegisVisão - Sincronização de Políticos (Deputados e Senadores)
// ====================================================================
import { sql, mapConcurrent } from "./client";
import {
  fetchCurrentCamaraLegislature,
  fetchDeputiesFromApi,
  fetchDeputyPartyHistory,
} from "./adapters/camara";
import {
  fetchSenatorsFromApi,
  fetchSenatorPartyHistory,
} from "./adapters/senado";

export interface SyncPoliticiansResult {
  inserted: number;
  updated: number;
  total: number;
  politicianMap: Map<string, { id: number; source: string; external_id: string; name: string; type: string; state: string }>;
}

interface ExistingPoliticianRow {
  id: number;
  source: string;
  external_id: string;
  name: string;
  type: "DEPUTY" | "SENATOR";
  state: string;
  photo_url: string | null;
  email: string | null;
  is_active: boolean;
}

interface PartyHistoryInterval {
  partySigla: string;
  startDate: string;
  endDate: string | null;
}

/**
 * 1. Carrega dados existentes do banco (parlamentares e mandatos).
 */
async function loadExistingPoliticiansData(): Promise<{
  politicianMap: Map<string, ExistingPoliticianRow>;
  mandateSet: Set<string>;
}> {
  const existingRows = await sql<ExistingPoliticianRow[]>`
    SELECT id, source, external_id, name, type, state, photo_url, email, is_active
    FROM politicians
  `;
  const politicianMap = new Map<string, ExistingPoliticianRow>();
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

  return { politicianMap, mandateSet };
}

/**
 * 2. Cria ou atualiza o registro cadastral do parlamentar.
 */
async function upsertPoliticianRecord(
  source: "CAMARA" | "SENADO",
  extId: string,
  name: string,
  type: "DEPUTY" | "SENATOR",
  state: string,
  photoUrl: string | null,
  email: string | null,
  politicianMap: Map<string, ExistingPoliticianRow>
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
 * 3. Registra o mandato se ainda não existir.
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
 * 4. Resolve ou cria dinamicamente o ID do partido.
 */
async function resolvePartyId(sigla: string, partyMap: Map<string, number>): Promise<number | null> {
  const s = sigla.trim().toUpperCase();
  if (!s || s === "S/PARTIDO" || s === "SEM PARTIDO") return null;
  const pId = partyMap.get(s);
  if (pId) return pId;

  const [existing] = await sql`SELECT id FROM political_parties WHERE UPPER(sigla) = ${s} LIMIT 1`;
  if (existing?.id) {
    partyMap.set(s, existing.id);
    return existing.id;
  }

  const [inserted] = await sql`
    INSERT INTO political_parties (sigla, nome)
    VALUES (${s}, ${s})
    ON CONFLICT (sigla) DO UPDATE SET sigla = EXCLUDED.sigla
    RETURNING id;
  `;
  if (inserted?.id) {
    partyMap.set(s, inserted.id);
    return inserted.id;
  }
  return null;
}

/**
 * 5. Persiste os intervalos de histórico partidário de um parlamentar.
 */
async function savePoliticianPartyHistory(
  polDbId: number,
  intervals: PartyHistoryInterval[],
  partyMap: Map<string, number>
): Promise<void> {
  if (intervals.length === 0) return;

  const validRows: Array<{ politician_id: number; party_id: number; start_date: string; end_date: string | null }> = [];
  for (const interval of intervals) {
    const partyId = await resolvePartyId(interval.partySigla, partyMap);
    if (partyId) {
      validRows.push({
        politician_id: polDbId,
        party_id: partyId,
        start_date: interval.startDate,
        end_date: interval.endDate,
      });
    }
  }

  if (validRows.length > 0) {
    await sql`DELETE FROM politician_party_history WHERE politician_id = ${polDbId};`;
    for (const r of validRows) {
      await sql`
        INSERT INTO politician_party_history (politician_id, party_id, start_date, end_date)
        VALUES (${r.politician_id}, ${r.party_id}, ${r.start_date}, ${r.end_date});
      `;
    }
  }
}

/**
 * Orquestrador da sincronização de Deputados Federais e Senadores com histórico partidário completo.
 */
export async function syncPoliticians(partyMap: Map<string, number>): Promise<SyncPoliticiansResult> {
  console.log("-> [Parlamentares] Sincronizando Deputados Federais e Senadores...");
  let inserted = 0;
  let updated = 0;

  const { politicianMap, mandateSet } = await loadExistingPoliticiansData();
  const deputyHistoryTasks: Array<{ polDbId: number; extId: string; currentPartySigla?: string; startDate: string | null }> = [];
  const senatorHistoryTasks: Array<{ polDbId: number; extId: string; currentPartySigla?: string; startDate: string | null }> = [];

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

      deputyHistoryTasks.push({
        polDbId,
        extId,
        currentPartySigla: dep.siglaPartido,
        startDate: currentLeg?.startDate || null,
      });
    }
  } catch (depErr) {
    console.error("-> [Parlamentares] Erro ao sincronizar deputados:", depErr);
    throw depErr;
  }

  // 2. Sincronizar Senadores da República (Senado)
  try {
    const senadores = await fetchSenatorsFromApi();
    console.log(`-> [Parlamentares] Consultando Senado Federal (${senadores.length} senadores em exercício)...`);

    for (const sen of senadores) {
      const info = sen.IdentificacaoParlamentar;
      if (!info?.CodigoParlamentar) continue;

      const extId = String(info.CodigoParlamentar);
      const name = info.NomeParlamentar?.trim() || info.NomeCompletoParlamentar?.trim() || "Senador";
      const state = info.UfParlamentar?.trim().toUpperCase() || "BR";
      const photoUrl = info.UrlFotoParlamentar || null;
      const email = info.EmailParlamentar || null;

      const { polDbId, wasInserted, wasUpdated } = await upsertPoliticianRecord(
        "SENADO", extId, name, "SENATOR", state, photoUrl, email, politicianMap
      );
      if (wasInserted) inserted++;
      if (wasUpdated) updated++;

      const mandate = sen.Mandato;
      const firstLeg = mandate?.PrimeiraLegislaturaDoMandato;
      const secondLeg = mandate?.SegundaLegislaturaDoMandato;
      const senMandateStart = firstLeg?.DataInicio ? String(firstLeg.DataInicio).slice(0, 10) : "2019-02-01";
      const senMandateEnd = secondLeg?.DataFim ? String(secondLeg.DataFim).slice(0, 10) : firstLeg?.DataFim ? String(firstLeg.DataFim).slice(0, 10) : null;
      const senLegislatureId = firstLeg?.NumeroLegislatura ? Number(firstLeg.NumeroLegislatura) : null;

      await registerMandateIfMissing(
        polDbId, "Senador", "SENADO", senMandateStart, senMandateEnd, senLegislatureId, mandateSet
      );

      senatorHistoryTasks.push({
        polDbId,
        extId,
        currentPartySigla: info.SiglaPartidoParlamentar,
        startDate: senMandateStart,
      });
    }
  } catch (senErr) {
    console.error("-> [Parlamentares] Erro ao sincronizar senadores:", senErr);
    throw senErr;
  }

  // 3. Sincronizar Histórico Completo de Filiações Partidárias em Paralelo
  console.log("-> [Parlamentares] Sincronizando histórico oficial de filiações partidárias...");
  await mapConcurrent(deputyHistoryTasks, 10, async (task) => {
    try {
      const intervals = await fetchDeputyPartyHistory(task.extId, task.currentPartySigla, task.startDate);
      await savePoliticianPartyHistory(task.polDbId, intervals, partyMap);
    } catch (err) {
      console.warn(`[Histórico] Aviso ao sincronizar filiações do deputado ${task.extId}:`, err);
    }
  });

  await mapConcurrent(senatorHistoryTasks, 10, async (task) => {
    try {
      const intervals = await fetchSenatorPartyHistory(task.extId, task.currentPartySigla, task.startDate);
      await savePoliticianPartyHistory(task.polDbId, intervals, partyMap);
    } catch (err) {
      console.warn(`[Histórico] Aviso ao sincronizar filiações do senador ${task.extId}:`, err);
    }
  });

  console.log(`-> [Parlamentares] Concluído: ${politicianMap.size} parlamentares e históricos mapeados (${inserted} novos, ${updated} atualizados).`);
  return { inserted, updated, total: politicianMap.size, politicianMap };
}
