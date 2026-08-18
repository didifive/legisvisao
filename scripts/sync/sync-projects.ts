// ====================================================================
// LegisVisão - Sincronização de Proposições e Matérias Bicamerais
// ====================================================================
import { sql, mapConcurrent } from "./client";
import { generateCanonicalId } from "@/lib/match/attachProjectId";
import {
  fetchCamaraPropositionsList,
  fetchCamaraPropositionDetail,
  fetchCamaraFirstAuthorName,
  type CamaraPropositionDetail,
} from "./adapters/camara";
import {
  fetchSenadoPropositionsList,
} from "./adapters/senado";

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

interface CanonicalProjectToUpsert {
  canonical_id: string;
  type: string;
  number: string;
  year: number;
  title: string;
  description: string;
  current_status: string;
  last_updated_at: Date;
}

interface HouseRecordToUpsert {
  project_canonical_id: string;
  house: "CAMARA" | "SENADO";
  external_id: string;
  official_url: string;
  full_text_url: string;
  presentation_date: string | null;
  author_name: string | null;
  author_party: string | null;
  author_state: string | null;
  rapporteur_name: string | null;
  tramitacao_etapa: string;
  despacho: string | null;
  last_event_date: string | null;
  source_updated_at: Date;
  source_read_at: Date;
  ano: number;
  siglaTipo: string;
  numero: string;
  isTerminalStatus?: boolean;
}

/**
 * 1. Carrega dados existentes do banco de dados (projetos canônicos e registros de casa).
 */
async function loadExistingProjectsData(): Promise<{
  projectMap: Map<string, number>;
  recordMap: Map<string, number>;
}> {
  const existingProjects = await sql<Array<{ id: number; canonical_id: string }>>`
    SELECT id, canonical_id FROM legislative_projects
  `;
  const projectMap = new Map<string, number>();
  for (const p of existingProjects) {
    projectMap.set(p.canonical_id, p.id);
  }

  const existingRecords = await sql<Array<{ id: number; house: string; external_id: string }>>`
    SELECT id, house, external_id FROM project_house_records
  `;
  const recordMap = new Map<string, number>();
  for (const r of existingRecords) {
    recordMap.set(`${r.house}_${r.external_id}`, r.id);
  }

  return { projectMap, recordMap };
}

/**
 * 2. Determina a situação simplificada para exibição.
 */
function deriveCurrentStatus(det: CamaraPropositionDetail): string {
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
 * 3. Executa upsert em lote de Projetos Canônicos (Chunks de 500).
 */
async function batchUpsertCanonicalProjects(
  projects: CanonicalProjectToUpsert[],
  projectMap: Map<string, number>
): Promise<{ insertedCount: number; updatedCount: number }> {
  if (projects.length === 0) return { insertedCount: 0, updatedCount: 0 };

  let insertedCount = 0;
  let updatedCount = 0;
  const BATCH_SIZE = 500;

  for (let i = 0; i < projects.length; i += BATCH_SIZE) {
    const chunk = projects.slice(i, i + BATCH_SIZE);
    const results = (await sql`
      INSERT INTO legislative_projects ${sql(
        chunk,
        'canonical_id', 'type', 'number', 'year', 'title', 'description', 'current_status', 'last_updated_at'
      )}
      ON CONFLICT (canonical_id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        current_status = EXCLUDED.current_status,
        last_updated_at = NOW()
      RETURNING id, canonical_id;
    `) as unknown as Array<{ id: number; canonical_id: string }>;

    for (const r of results) {
      if (!projectMap.has(r.canonical_id)) {
        insertedCount++;
      } else {
        updatedCount++;
      }
      projectMap.set(r.canonical_id, r.id);
    }
  }

  return { insertedCount, updatedCount };
}

/**
 * 4. Executa upsert em lote de Registros de Casa Legislativa (Chunks de 500).
 */
async function batchUpsertHouseRecords(
  records: HouseRecordToUpsert[],
  projectMap: Map<string, number>,
  recordMap: Map<string, number>
): Promise<{ insertedCount: number; updatedCount: number; houseRecordsToSyncVotes: HouseRecordToSync[] }> {
  if (records.length === 0) return { insertedCount: 0, updatedCount: 0, houseRecordsToSyncVotes: [] };

  let insertedCount = 0;
  let updatedCount = 0;
  const houseRecordsToSyncVotes: HouseRecordToSync[] = [];
  const BATCH_SIZE = 500;

  // Associa project_id aos records
  const readyRows = records.map((r) => {
    const project_id = projectMap.get(r.project_canonical_id);
    if (!project_id) {
      throw new Error(`Projeto canônico não encontrado no mapa: ${r.project_canonical_id}`);
    }
    return {
      project_id,
      house: r.house,
      external_id: r.external_id,
      official_url: r.official_url,
      full_text_url: r.full_text_url,
      presentation_date: r.presentation_date,
      author_name: r.author_name,
      author_party: r.author_party,
      author_state: r.author_state,
      rapporteur_name: r.rapporteur_name,
      tramitacao_etapa: r.tramitacao_etapa,
      despacho: r.despacho,
      last_event_date: r.last_event_date,
      source_updated_at: r.source_updated_at,
      source_read_at: r.source_read_at,
      ano: r.ano,
      siglaTipo: r.siglaTipo,
      numero: r.numero,
      isTerminalStatus: r.isTerminalStatus,
    };
  });

  for (let i = 0; i < readyRows.length; i += BATCH_SIZE) {
    const chunk = readyRows.slice(i, i + BATCH_SIZE);
    const results = (await sql`
      INSERT INTO project_house_records ${sql(
        chunk,
        'project_id', 'house', 'external_id', 'official_url', 'full_text_url',
        'presentation_date', 'author_name', 'author_party', 'author_state',
        'rapporteur_name', 'tramitacao_etapa', 'despacho', 'last_event_date',
        'source_updated_at', 'source_read_at'
      )}
      ON CONFLICT (house, external_id) DO UPDATE SET
        official_url = EXCLUDED.official_url,
        full_text_url = EXCLUDED.full_text_url,
        author_name = COALESCE(EXCLUDED.author_name, project_house_records.author_name),
        tramitacao_etapa = EXCLUDED.tramitacao_etapa,
        despacho = EXCLUDED.despacho,
        last_event_date = EXCLUDED.last_event_date,
        source_read_at = NOW()
      RETURNING id, project_id, house, external_id;
    `) as unknown as Array<{ id: number; project_id: number; house: string; external_id: string }>;

    // Mapeia metadados adicionais
    const chunkMetaMap = new Map<string, { ano: number; siglaTipo: string; numero: string; isTerminalStatus?: boolean }>();
    for (const c of chunk) {
      chunkMetaMap.set(`${c.house}_${c.external_id}`, {
        ano: c.ano,
        siglaTipo: c.siglaTipo,
        numero: c.numero,
        isTerminalStatus: c.isTerminalStatus,
      });
    }

    for (const r of results) {
      const key = `${r.house}_${r.external_id}`;
      if (!recordMap.has(key)) {
        insertedCount++;
      } else {
        updatedCount++;
      }
      recordMap.set(key, r.id);

      const meta = chunkMetaMap.get(key);
      houseRecordsToSyncVotes.push({
        id: r.id,
        project_id: r.project_id,
        house: r.house,
        external_id: r.external_id,
        ano: meta?.ano || 2024,
        siglaTipo: meta?.siglaTipo || "PL",
        numero: meta?.numero || "0",
        isTerminalStatus: meta?.isTerminalStatus,
      });
    }
  }

  return { insertedCount, updatedCount, houseRecordsToSyncVotes };
}

/**
 * 5. Garante as fases legislativas em lote.
 */
async function batchEnsurePhases(houseRecords: HouseRecordToSync[]): Promise<void> {
  if (houseRecords.length === 0) return;

  const phaseRows = houseRecords.map((hr) => ({
    house_record_id: hr.id,
    phase_name: "Plenário",
    phase_order: 1,
    started_at: new Date().toISOString(),
  }));

  const BATCH_SIZE = 500;
  for (let i = 0; i < phaseRows.length; i += BATCH_SIZE) {
    const chunk = phaseRows.slice(i, i + BATCH_SIZE);
    await sql`
      INSERT INTO legislative_phases ${sql(chunk, 'house_record_id', 'phase_name', 'phase_order', 'started_at')}
      ON CONFLICT DO NOTHING;
    `;
  }
}

/**
 * Orquestrador da sincronização de proposições legislativas Bicamerais em Lote de Alta Performance.
 */
export async function syncProjects(): Promise<SyncProjectsResult> {
  console.log("-> [Projetos] Sincronizando proposições deliberadas da Câmara e do Senado (2018 em diante)...");

  const { projectMap, recordMap } = await loadExistingProjectsData();

  // 1. Consulta catálogos em paralelo
  const [camaraProps, senadoProps] = await Promise.all([
    fetchCamaraPropositionsList(),
    fetchSenadoPropositionsList(),
  ]);

  console.log(`-> [Projetos] ${camaraProps.length} proposições da Câmara e ${senadoProps.length} matérias do Senado coletadas.`);

  const canonicalProjectsMap = new Map<string, CanonicalProjectToUpsert>();
  const houseRecordsToUpsert: HouseRecordToUpsert[] = [];

  // 2. Extrai dados da Câmara com workers paralelos
  await mapConcurrent(camaraProps, 8, async (p) => {
    try {
      const extId = String(p.id);
      const det = await fetchCamaraPropositionDetail(p.id);
      if (!det) return;

      const type = (det.siglaTipo || "PL").toUpperCase();
      const number = String(det.numero || "0");
      const year = Number(det.ano || 2024);
      const canonicalId = generateCanonicalId(type, number, year);
      const title = `${type} ${number}/${year}`;
      const description = det.ementa || det.ementaDetalhada || "Proposição legislativa do Congresso Nacional.";
      const situacao = deriveCurrentStatus(det);
      const isTerminalStatus =
        situacao.includes("Norma Jurídica") || situacao.includes("Arquivado") || situacao.includes("Encerrado");

      canonicalProjectsMap.set(canonicalId, {
        canonical_id: canonicalId,
        type,
        number,
        year,
        title,
        description,
        current_status: situacao,
        last_updated_at: new Date(),
      });

      const authorName = await fetchCamaraFirstAuthorName(det.uriAutores);
      const officialUrl = `https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=${extId}`;
      const fullTextUrl = det.urlInteiroTeor || officialUrl;
      const etapa = det.statusProposicao?.descricaoTramitacao || det.statusProposicao?.descricaoSituacao || "Em Tramitação";
      const despacho = det.statusProposicao?.despacho || null;
      const dataApresentacao = det.dataApresentacao ? det.dataApresentacao.slice(0, 10) : null;
      const dataAtualizacao = det.statusProposicao?.dataHora ? det.statusProposicao.dataHora.slice(0, 10) : null;
      const relator = det.statusProposicao?.uriUltimoRelator ? "Relator Designado" : null;

      houseRecordsToUpsert.push({
        project_canonical_id: canonicalId,
        house: "CAMARA",
        external_id: extId,
        official_url: officialUrl,
        full_text_url: fullTextUrl,
        presentation_date: dataApresentacao,
        author_name: authorName,
        author_party: null,
        author_state: null,
        rapporteur_name: relator,
        tramitacao_etapa: etapa,
        despacho,
        last_event_date: dataAtualizacao,
        source_updated_at: new Date(),
        source_read_at: new Date(),
        ano: year,
        siglaTipo: type,
        numero: number,
        isTerminalStatus,
      });
    } catch (err) {
      console.warn(`[Projetos] Aviso ao processar proposição da Câmara ${p.id}:`, err);
    }
  });

  // 3. Processa dados do Senado Federal
  for (const m of senadoProps) {
    const extId = String(m.Codigo);
    const type = (m.Sigla || "PL").toUpperCase();
    const parsedNum = parseInt(m.Numero, 10);
    const number = String(isNaN(parsedNum) ? m.Numero : parsedNum);
    const year = Number(m.Ano || 2024);
    const canonicalId = generateCanonicalId(type, number, year);
    const title = `${type} ${number}/${year}`;
    const description = m.Ementa || "Matéria legislativa em tramitação no Senado Federal.";
    const situacao = "Em Tramitação no Senado Federal";

    // Se ainda não foi cadastrado pela Câmara, adiciona ao mapa canônico
    if (!canonicalProjectsMap.has(canonicalId)) {
      canonicalProjectsMap.set(canonicalId, {
        canonical_id: canonicalId,
        type,
        number,
        year,
        title,
        description,
        current_status: situacao,
        last_updated_at: new Date(),
      });
    }

    const officialUrl = m.UrlDetalheMateria || `https://www25.senado.leg.br/web/atividade/materias/-/materia/${extId}`;
    const authorName = m.Autor || "Senado Federal";
    const presentationDate = m.Data ? m.Data.slice(0, 10) : null;

    houseRecordsToUpsert.push({
      project_canonical_id: canonicalId,
      house: "SENADO",
      external_id: extId,
      official_url: officialUrl,
      full_text_url: officialUrl,
      presentation_date: presentationDate,
      author_name: authorName,
      author_party: null,
      author_state: null,
      rapporteur_name: null,
      tramitacao_etapa: "Em Tramitação no Senado Federal",
      despacho: null,
      last_event_date: presentationDate,
      source_updated_at: new Date(),
      source_read_at: new Date(),
      ano: year,
      siglaTipo: type,
      numero: number,
    });
  }

  // 4. Gravação em Lote no Banco de Dados (Instantâneo e Livre de Timeouts)
  console.log(`-> [Projetos] Gravando ${canonicalProjectsMap.size} projetos canônicos em lote no banco...`);
  const { insertedCount: insProj, updatedCount: updProj } = await batchUpsertCanonicalProjects(
    Array.from(canonicalProjectsMap.values()),
    projectMap
  );

  console.log(`-> [Projetos] Gravando ${houseRecordsToUpsert.length} registros de Casa em lote no banco...`);
  const {
    insertedCount: insRec,
    updatedCount: updRec,
    houseRecordsToSyncVotes,
  } = await batchUpsertHouseRecords(houseRecordsToUpsert, projectMap, recordMap);

  await batchEnsurePhases(houseRecordsToSyncVotes);

  console.log(`-> [Projetos] Concluído: ${projectMap.size} projetos canônicos (${insProj} novos), ${recordMap.size} registros de casa (${insRec} novos).`);

  return {
    insertedProjects: insProj,
    updatedProjects: updProj,
    insertedRecords: insRec,
    updatedRecords: updRec,
    houseRecordsToSyncVotes,
  };
}
