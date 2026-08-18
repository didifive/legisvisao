import { sql, CAMARA_API_BASE, fetchWithRetry, mapConcurrent } from "./client";
import { generateCanonicalId } from "@/lib/match/attachProjectId";

export interface HouseRecordToSync {
  id: number;
  project_id: number;
  house: string;
  external_id: string;
  ano: number;
  siglaTipo: string;
  numero: string;
  isTerminalStatus?: boolean;
}

export interface SyncProjectsResult {
  insertedProjects: number;
  updatedProjects: number;
  insertedRecords: number;
  updatedRecords: number;
  houseRecordsToSyncVotes: HouseRecordToSync[];
}

interface RawPropositionListItem {
  id: number;
  siglaTipo?: string;
  numero?: number;
  ano?: number;
  ementa?: string;
}

interface PropositionDetail {
  id: number;
  siglaTipo?: string;
  numero?: number;
  ano?: number;
  ementa?: string;
  ementaDetalhada?: string;
  urlInteiroTeor?: string;
  dataApresentacao?: string;
  uriAutores?: string;
  statusProposicao?: {
    descricaoTramitacao?: string;
    descricaoSituacao?: string;
    despacho?: string;
    dataHora?: string;
    uriUltimoRelator?: string;
  };
}

/**
 * 1. Carrega dados existentes do banco de dados (projetos canônicos e registros de casa).
 */
async function loadExistingProjectsData() {
  const existingProjects = await sql`
    SELECT id, canonical_id, type, number, year, title, description, current_status
    FROM legislative_projects
  `;
  const projectMap = new Map<string, any>();
  for (const p of existingProjects) {
    projectMap.set(p.canonical_id, p);
  }

  const existingRecords = await sql`
    SELECT id, project_id, house, external_id
    FROM project_house_records
  `;
  const recordMap = new Map<string, any>();
  for (const r of existingRecords) {
    recordMap.set(`${r.house}_${r.external_id}`, r);
  }

  return { projectMap, recordMap };
}

/**
 * 2. Consulta catálogo da Câmara dos Deputados em paralelo com concorrência controlada.
 */
async function fetchCamaraPropositionsList(): Promise<RawPropositionListItem[]> {
  const currentYear = new Date().getFullYear();
  const anos = Array.from({ length: currentYear - 2018 + 1 }, (_, i) => 2018 + i);
  const tipos = ["PL", "PEC", "PLP", "MPV"];

  const queries: Array<{ yr: number; tp: string }> = [];
  for (const yr of anos) {
    for (const tp of tipos) {
      queries.push({ yr, tp });
    }
  }

  const propsMap = new Map<string, RawPropositionListItem>();

  await mapConcurrent(queries, 6, async ({ yr, tp }) => {
    try {
      const url = `${CAMARA_API_BASE}/proposicoes?siglaTipo=${tp}&ano=${yr}&itens=15&ordem=DESC&ordenarPor=id`;
      const res = await fetchWithRetry(url, 2, 500);
      if (res.ok) {
        const data = await res.json();
        for (const item of data.dados || []) {
          propsMap.set(String(item.id), item);
        }
      }
    } catch (err) {
      console.warn(`[Projetos] Aviso ao consultar proposições da Câmara (${tp}/${yr}):`, err);
    }
  });

  return Array.from(propsMap.values());
}

/**
 * 3. Busca detalhes completos de uma proposição na API.
 */
async function fetchPropositionDetail(propId: number): Promise<PropositionDetail | null> {
  const detRes = await fetchWithRetry(`${CAMARA_API_BASE}/proposicoes/${propId}`, 2, 500);
  if (!detRes.ok) return null;
  const detData = await detRes.json();
  return detData.dados || null;
}

/**
 * 4. Busca o nome do primeiro autor da proposição.
 */
async function fetchFirstAuthorName(uriAutores?: string): Promise<string | null> {
  if (!uriAutores) return null;
  try {
    const autRes = await fetchWithRetry(uriAutores, 2, 500);
    if (!autRes.ok) return null;
    const autData = await autRes.json();
    return autData.dados?.[0]?.nome || null;
  } catch {
    return null;
  }
}

/**
 * 5. Determina a situação simplificada para exibição.
 */
function deriveCurrentStatus(det: PropositionDetail): string {
  const etapa = det.statusProposicao?.descricaoTramitacao || det.statusProposicao?.descricaoSituacao || "Em Tramitação";
  const despacho = det.statusProposicao?.despacho || "";
  const descUpper = `${det.statusProposicao?.descricaoSituacao || ''} ${etapa} ${despacho}`.toUpperCase();

  if (descUpper.includes("TRANSFORMAD") || descUpper.includes("PROMULGAD") || descUpper.includes("SANCIONAD") || descUpper.includes("LEI")) {
    return "Aprovado / Transformado em Norma Jurídica";
  }
  if (descUpper.includes("ARQUIVAD") || descUpper.includes("REJEITAD") || descUpper.includes("PREJUDICAD")) {
    return "Encerrado / Arquivado";
  }
  if (descUpper.includes("AUTÓGRAFO") || descUpper.includes("SENADO") || descUpper.includes("SANÇÃO")) {
    return "Aprovado na Câmara (Em Fase de Sanção/Senado)";
  }
  return "Em Tramitação";
}

/**
 * 6. Insere ou atualiza o Projeto Canônico unificado.
 */
async function upsertCanonicalProject(
  canonicalId: string,
  type: string,
  number: string,
  year: number,
  title: string,
  description: string,
  currentStatus: string,
  projectMap: Map<string, any>
): Promise<{ projectDbId: number; wasInserted: boolean; wasUpdated: boolean }> {
  const existing = projectMap.get(canonicalId);

  if (!existing) {
    const [insertedP] = await sql`
      INSERT INTO legislative_projects (
        canonical_id, type, number, year, title, description, current_status, last_updated_at
      ) VALUES (
        ${canonicalId}, ${type}, ${number}, ${year}, ${title}, ${description}, ${currentStatus}, NOW()
      )
      ON CONFLICT (canonical_id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        current_status = EXCLUDED.current_status,
        last_updated_at = NOW()
      RETURNING id;
    `;
    const projectDbId = insertedP.id;
    projectMap.set(canonicalId, { id: projectDbId, canonical_id: canonicalId, type, number, year, title, current_status: currentStatus });
    return { projectDbId, wasInserted: true, wasUpdated: false };
  }

  const projectDbId = existing.id;
  if (existing.current_status !== currentStatus || existing.description !== description) {
    await sql`
      UPDATE legislative_projects SET
        current_status = ${currentStatus},
        description = ${description},
        last_updated_at = NOW()
      WHERE id = ${projectDbId};
    `;
    return { projectDbId, wasInserted: false, wasUpdated: true };
  }

  return { projectDbId, wasInserted: false, wasUpdated: false };
}

/**
 * 7. Insere ou atualiza o registro específico da Casa Legislativa.
 */
async function upsertHouseRecord(
  projectDbId: number,
  extId: string,
  det: PropositionDetail,
  authorName: string | null,
  recordMap: Map<string, any>
): Promise<{ recordDbId: number; wasInserted: boolean; wasUpdated: boolean }> {
  const recordKey = `CAMARA_${extId}`;
  const existing = recordMap.get(recordKey);

  const officialUrl = `https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=${extId}`;
  const fullTextUrl = det.urlInteiroTeor || officialUrl;
  const etapa = det.statusProposicao?.descricaoTramitacao || det.statusProposicao?.descricaoSituacao || "Em Tramitação";
  const despacho = det.statusProposicao?.despacho || null;
  const dataApresentacao = det.dataApresentacao ? det.dataApresentacao.slice(0, 10) : null;
  const dataAtualizacao = det.statusProposicao?.dataHora ? det.statusProposicao.dataHora.slice(0, 10) : null;
  const relator = det.statusProposicao?.uriUltimoRelator ? "Relator Designado" : null;

  if (!existing) {
    const [insertedR] = await sql`
      INSERT INTO project_house_records (
        project_id, house, external_id, official_url, full_text_url,
        presentation_date, author_name, author_party, author_state,
        rapporteur_name, tramitacao_etapa, despacho, last_event_date,
        source_updated_at, source_read_at
      ) VALUES (
        ${projectDbId}, 'CAMARA', ${extId}, ${officialUrl}, ${fullTextUrl},
        ${dataApresentacao}, ${authorName}, NULL, NULL,
        ${relator}, ${etapa}, ${despacho}, ${dataAtualizacao},
        NOW(), NOW()
      )
      ON CONFLICT (house, external_id) DO UPDATE SET
        official_url = EXCLUDED.official_url,
        full_text_url = EXCLUDED.full_text_url,
        tramitacao_etapa = EXCLUDED.tramitacao_etapa,
        despacho = EXCLUDED.despacho,
        last_event_date = EXCLUDED.last_event_date,
        source_read_at = NOW()
      RETURNING id;
    `;
    const recordDbId = insertedR.id;
    recordMap.set(recordKey, { id: recordDbId, project_id: projectDbId, house: 'CAMARA', external_id: extId });
    return { recordDbId, wasInserted: true, wasUpdated: false };
  }

  const recordDbId = existing.id;
  await sql`
    UPDATE project_house_records SET
      tramitacao_etapa = ${etapa},
      despacho = ${despacho},
      last_event_date = ${dataAtualizacao},
      source_read_at = NOW()
    WHERE id = ${recordDbId};
  `;
  return { recordDbId, wasInserted: false, wasUpdated: true };
}

/**
 * 8. Garante a fase legislativa padrão da proposição.
 */
async function ensureLegislativePhase(recordDbId: number, det: PropositionDetail): Promise<void> {
  const descUpper = `${det.statusProposicao?.descricaoSituacao || ''} ${det.statusProposicao?.descricaoTramitacao || ''}`.toUpperCase();
  const phaseName = descUpper.includes("PLENÁRIO") ? "Plenário" : descUpper.includes("COMISSÃO") ? "Comissão" : "Tramitação Geral";
  const dataAtualizacao = det.statusProposicao?.dataHora ? det.statusProposicao.dataHora.slice(0, 10) : null;

  const [existingPhase] = await sql`
    SELECT id FROM legislative_phases 
    WHERE house_record_id = ${recordDbId} AND phase_name = ${phaseName}
    LIMIT 1
  `;
  if (!existingPhase) {
    await sql`
      INSERT INTO legislative_phases (house_record_id, phase_name, phase_order, started_at)
      VALUES (${recordDbId}, ${phaseName}, 1, ${dataAtualizacao});
    `;
  }
}

/**
 * Orquestrador da sincronização de proposições legislativas (Concorrente de Alta Performance).
 */
export async function syncProjects(): Promise<SyncProjectsResult> {
  console.log("-> [Projetos] Sincronizando proposições deliberadas (2018 em diante)...");
  let insertedProjects = 0;
  let updatedProjects = 0;
  let insertedRecords = 0;
  let updatedRecords = 0;

  const { projectMap, recordMap } = await loadExistingProjectsData();
  const camaraProps = await fetchCamaraPropositionsList();
  console.log(`-> [Projetos] ${camaraProps.length} proposições identificadas na Câmara para processamento concorrente.`);

  const houseRecordsToSyncVotes: HouseRecordToSync[] = [];

  // Processa as proposições com pool concorrente de 8 workers
  await mapConcurrent(camaraProps, 8, async (p) => {
    try {
      const extId = String(p.id);
      const det = await fetchPropositionDetail(p.id);
      if (!det) return;

      const type = det.siglaTipo || "PL";
      const number = String(det.numero || "0");
      const year = Number(det.ano || 2024);
      const canonicalId = generateCanonicalId(type, number, year);
      const title = `${type} ${number}/${year}`;
      const description = det.ementa || det.ementaDetalhada || "Proposição legislativa do Congresso Nacional.";
      const situacao = deriveCurrentStatus(det);
      const isTerminalStatus =
        situacao.includes("Norma Jurídica") || situacao.includes("Arquivado") || situacao.includes("Encerrado");

      // 1. Projeto Canônico
      const pRes = await upsertCanonicalProject(
        canonicalId, type, number, year, title, description, situacao, projectMap
      );
      if (pRes.wasInserted) insertedProjects++;
      if (pRes.wasUpdated) updatedProjects++;

      // 2. Autor
      const authorName = await fetchFirstAuthorName(det.uriAutores);

      // 3. Registro de Casa
      const rRes = await upsertHouseRecord(pRes.projectDbId, extId, det, authorName, recordMap);
      if (rRes.wasInserted) insertedRecords++;
      if (rRes.wasUpdated) updatedRecords++;

      // 4. Fase Legislativa
      await ensureLegislativePhase(rRes.recordDbId, det);

      houseRecordsToSyncVotes.push({
        id: rRes.recordDbId,
        project_id: pRes.projectDbId,
        house: "CAMARA",
        external_id: extId,
        ano: year,
        siglaTipo: type,
        numero: number,
        isTerminalStatus,
      });
    } catch (err) {
      console.warn(`[Projetos] Erro ao sincronizar proposição da Câmara ${p.id}:`, err);
    }
  });

  console.log(`-> [Projetos] Concluído: ${projectMap.size} projetos canônicos, ${recordMap.size} registros de casa.`);

  return {
    insertedProjects,
    updatedProjects,
    insertedRecords,
    updatedRecords,
    houseRecordsToSyncVotes,
  };
}
