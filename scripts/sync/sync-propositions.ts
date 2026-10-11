import { CAMARA_API_BASE, fetchWithRetry, sql, mapConcurrent, chunkArray } from "./client";
import type {
  CamaraVoteSessionListItem,
  CamaraPropositionSummary,
} from "../../types/db";

interface ParsedPropositionToInsert {
  id: number;
  sigla_tipo: string;
  numero: number;
  ano: number;
  titulo: string;
  ementa: string;
  ementa_detalhada: string;
  tema: string | null;
  url_inteiro_teor: string | null;
  url_camara: string;
  data_apresentacao: string | null;
  ultimo_status: string | null;
}

interface ParsedSessionToInsert {
  id: string;
  proposicao_id: number;
  data_hora: string;
  descricao: string;
  resultado: string;
  sigla_orgao: string;
}

/**
 * Gera as janelas trimestrais da 57ª Legislatura (2023 até 2026)
 */
function generateQuarters(): Array<{ start: string; end: string }> {
  const quarters: Array<{ start: string; end: string }> = [];
  const years = [2023, 2024, 2025, 2026];

  for (const year of years) {
    quarters.push(
      { start: `${year}-01-01`, end: `${year}-03-31` },
      { start: `${year}-04-01`, end: `${year}-06-30` },
      { start: `${year}-07-01`, end: `${year}-09-30` },
      { start: `${year}-10-01`, end: `${year}-12-31` }
    );
  }

  return quarters;
}

function getSessionResult(aprovacao?: number | null): string {
  if (aprovacao === 1) return "Aprovado";
  if (aprovacao === 0) return "Rejeitado";
  return "Deliberado";
}

function extractPropositionId(
  sessionId: string,
  uriProposicaoObjeto?: string | null,
  cachedId?: number
): number | null {
  if (cachedId) return cachedId;

  if (sessionId.includes("-")) {
    const prefix = Number(sessionId.split("-")[0]);
    if (!Number.isNaN(prefix) && prefix > 0) {
      return prefix;
    }
  }

  if (uriProposicaoObjeto) {
    const parts = uriProposicaoObjeto.split("/");
    const last = Number(parts.at(-1));
    if (!Number.isNaN(last) && last > 0) {
      return last;
    }
  }

  return null;
}

async function fetchPropositionDetails(propId: number): Promise<ParsedPropositionToInsert | null> {
  const [propRes, temasRes] = await Promise.all([
    fetchWithRetry(`${CAMARA_API_BASE}/proposicoes/${propId}`, 2, 200),
    fetchWithRetry(`${CAMARA_API_BASE}/proposicoes/${propId}/temas`, 2, 200).catch(() => null),
  ]);

  if (!propRes.ok) return null;

  const pJson = await propRes.json();
  const pd: CamaraPropositionSummary | undefined = pJson.dados;
  if (!pd) return null;

  const siglaTipo = pd.siglaTipo ? pd.siglaTipo.trim().toUpperCase() : "PROP";
  const numero = pd.numero ? Number(pd.numero) : 0;
  const ano = pd.ano ? Number(pd.ano) : 2024;
  const titulo = numero > 0 ? `${siglaTipo} ${numero}/${ano}` : `Proposição ${propId}`;
  const ementa = pd.ementa || pd.ementaDetalhada || `Deliberação legislativa sobre ${titulo}`;
  const urlInteiroTeor = pd.urlInteiroTeor || null;
  const urlCamara = `https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=${propId}`;
  const dataApresentacao = pd.dataApresentacao ? pd.dataApresentacao.substring(0, 10) : null;
  const ultimoStatus = pd.statusProposicao?.descricaoSituacao || pd.statusProposicao?.descricaoTramitacao || null;

  let tema: string | null = null;
  if (temasRes?.ok) {
    const tJson = await temasRes.json();
    const tList: Array<{ tema: string }> = tJson.dados || [];
    if (tList.length > 0) {
      tema = Array.from(new Set(tList.map((t) => t.tema.trim()))).join(", ");
    }
  }

  return {
    id: propId,
    sigla_tipo: siglaTipo,
    numero,
    ano,
    titulo,
    ementa,
    ementa_detalhada: ementa,
    tema,
    url_inteiro_teor: urlInteiroTeor,
    url_camara: urlCamara,
    data_apresentacao: dataApresentacao,
    ultimo_status: ultimoStatus,
  };
}

async function savePropositionsBatch(
  propsToInsert: ParsedPropositionToInsert[]
): Promise<{ inserted: number; updated: number }> {
  let inserted = 0;
  let updated = 0;

  const chunks = chunkArray(propsToInsert, 100);
  const results = await Promise.all(
    chunks.map((chunk) =>
      sql`
        INSERT INTO propositions ${sql(
          chunk,
          "id",
          "sigla_tipo",
          "numero",
          "ano",
          "titulo",
          "ementa",
          "ementa_detalhada",
          "tema",
          "url_inteiro_teor",
          "url_camara",
          "data_apresentacao",
          "ultimo_status"
        )}
        ON CONFLICT (id) DO UPDATE SET
          sigla_tipo = EXCLUDED.sigla_tipo,
          numero = EXCLUDED.numero,
          ano = EXCLUDED.ano,
          titulo = EXCLUDED.titulo,
          ementa = EXCLUDED.ementa,
          tema = COALESCE(EXCLUDED.tema, propositions.tema),
          url_inteiro_teor = COALESCE(EXCLUDED.url_inteiro_teor, propositions.url_inteiro_teor),
          url_camara = EXCLUDED.url_camara,
          data_apresentacao = COALESCE(EXCLUDED.data_apresentacao, propositions.data_apresentacao),
          ultimo_status = COALESCE(EXCLUDED.ultimo_status, propositions.ultimo_status),
          last_updated_at = NOW()
        RETURNING (xmax = 0) AS is_insert;
      `
    )
  );

  for (const res of results) {
    const chunkInserted = res.filter((r) => r.is_insert).length;
    inserted += chunkInserted;
    updated += res.length - chunkInserted;
  }

  return { inserted, updated };
}

async function saveSessionsBatch(
  sessionsToInsert: ParsedSessionToInsert[]
): Promise<{ inserted: number; updated: number }> {
  let inserted = 0;
  let updated = 0;

  const chunks = chunkArray(sessionsToInsert, 200);
  const results = await Promise.all(
    chunks.map((chunk) =>
      sql`
        INSERT INTO vote_sessions ${sql(
          chunk,
          "id",
          "proposicao_id",
          "data_hora",
          "descricao",
          "resultado",
          "sigla_orgao"
        )}
        ON CONFLICT (id) DO UPDATE SET
          proposicao_id = EXCLUDED.proposicao_id,
          data_hora = EXCLUDED.data_hora,
          descricao = EXCLUDED.descricao,
          resultado = EXCLUDED.resultado,
          sigla_orgao = EXCLUDED.sigla_orgao
        RETURNING (xmax = 0) AS is_insert;
      `
    )
  );

  for (const res of results) {
    const chunkInserted = res.filter((r) => r.is_insert).length;
    inserted += chunkInserted;
    updated += res.length - chunkInserted;
  }

  return { inserted, updated };
}

/**
 * Sincroniza Proposições e Sessões de Votação do Plenário da Câmara dos Deputados.
 */
export async function syncPropositions(): Promise<{
  insertedPropositions: number;
  updatedPropositions: number;
  insertedSessions: number;
  updatedSessions: number;
  sessionsToSyncVotes: Array<{ sessionId: string; propositionId: number }>;
}> {
  console.log("🚩 [Proposições] Verificando dados existentes no banco e consultando API da Câmara...");

  const [existingPropsRows, existingSessionsRows] = await Promise.all([
    sql<{ id: number }[]>`SELECT id FROM propositions`,
    sql<{ id: string; proposicao_id: number }[]>`SELECT id, proposicao_id FROM vote_sessions`,
  ]);

  const existingPropsSet = new Set(existingPropsRows.map((r) => r.id));
  const existingSessionsMap = new Map(existingSessionsRows.map((r) => [r.id, r.proposicao_id]));

  console.log(`📊 [Proposições] Cache do banco: ${existingPropsSet.size} proposições e ${existingSessionsMap.size} sessões já registradas.`);

  const quarters = generateQuarters();
  const rawSessionsMap = new Map<string, CamaraVoteSessionListItem>();

  console.log("🌐 [Proposições] Consultando janelas trimestrais de votações da 57ª Legislatura...");
  await mapConcurrent(quarters, 4, async (q) => {
    try {
      let page = 1;
      let hasMore = true;

      while (hasMore && page <= 40) {
        const url = `${CAMARA_API_BASE}/votacoes?dataInicio=${q.start}&dataFim=${q.end}&ordem=DESC&ordenarPor=dataHoraRegistro&itens=100&pagina=${page}`;
        const res = await fetchWithRetry(url, 2, 400);
        if (!res.ok) break;

        const json = await res.json();
        const items: CamaraVoteSessionListItem[] = json.dados || [];
        if (items.length === 0) break;

        for (const item of items) {
          if (item.id) {
            rawSessionsMap.set(item.id, item);
          }
        }

        if (items.length < 100) hasMore = false;
        else page++;
      }
    } catch (err) {
      console.warn(`[Proposições] Aviso ao consultar período ${q.start} a ${q.end}:`, err);
    }
  });

  console.log(`📦 [Proposições] ${rawSessionsMap.size} sessões brutas identificadas na API da Câmara.`);

  const rawSessions = Array.from(rawSessionsMap.values());
  const plenSessions = rawSessions.filter(
    (s) => !s.siglaOrgao || s.siglaOrgao === "PLEN" || Boolean(s.uriProposicaoObjeto)
  );

  const validSessionsMap = new Map<string, ParsedSessionToInsert>();
  const uniquePropIds = new Set<number>();

  for (const s of plenSessions) {
    const propId = extractPropositionId(s.id, s.uriProposicaoObjeto, existingSessionsMap.get(s.id));
    if (!propId) continue;

    uniquePropIds.add(propId);

    const dataHora = s.dataHoraRegistro || s.data || new Date().toISOString();
    const descricao = s.descricao || `Deliberação legislativa sobre proposição ${propId}`;
    const resultado = getSessionResult(s.aprovacao);

    validSessionsMap.set(s.id, {
      id: s.id,
      proposicao_id: propId,
      data_hora: dataHora,
      descricao,
      resultado,
      sigla_orgao: s.siglaOrgao || "PLEN",
    });
  }

  console.log(`🎯 [Proposições] ${uniquePropIds.size} proposições únicas identificadas a partir de ${validSessionsMap.size} sessões de plenário.`);

  const propIdsToEnrich = Array.from(uniquePropIds).filter((id) => !existingPropsSet.has(id));
  const propsMapToInsert = new Map<number, ParsedPropositionToInsert>();

  const totalToEnrich = propIdsToEnrich.length;
  let enrichedCount = 0;
  const enrichStartTime = Date.now();

  if (totalToEnrich === 0) {
    console.log(`⚡ [Proposições] Todas as ${uniquePropIds.size} proposições já estão com dados completos em cache no banco!`);
  } else {
    console.log(`📝 [Proposições] Consultando detalhes de ${totalToEnrich} novas proposições na API da Câmara (concorrência: 25 workers)...`);

    await mapConcurrent(propIdsToEnrich, 25, async (propId) => {
      try {
        const parsed = await fetchPropositionDetails(propId);
        if (parsed) {
          propsMapToInsert.set(propId, parsed);
        }
      } catch {
        // Ignora erro pontual
      } finally {
        enrichedCount++;
        if (enrichedCount % 500 === 0 || enrichedCount === totalToEnrich) {
          const pct = ((enrichedCount / totalToEnrich) * 100).toFixed(1);
          const elapsedSec = Math.max(1, Math.round((Date.now() - enrichStartTime) / 1000));
          const rate = Math.round(enrichedCount / elapsedSec);
          console.log(`⏳ [Proposições] ${enrichedCount}/${totalToEnrich} enriquecidas (${pct}%) - ${rate} req/s`);
        }
      }
    });
  }

  const propsToInsert = Array.from(propsMapToInsert.values());
  console.log(`💾 [Proposições] Gravando ${propsToInsert.length} proposições no banco de dados...`);

  const { inserted: insertedProps, updated: updatedProps } = await savePropositionsBatch(propsToInsert);

  const savedPropIds = new Set(propsToInsert.map((p) => p.id));
  const sessionsToInsert = Array.from(validSessionsMap.values()).filter(
    (s) => savedPropIds.has(s.proposicao_id) || existingPropsSet.has(s.proposicao_id)
  );

  console.log(`💾 [Proposições] Gravando ${sessionsToInsert.length} sessões de votação vinculadas no banco de dados...`);

  const { inserted: insertedSessions, updated: updatedSessions } = await saveSessionsBatch(sessionsToInsert);

  console.log(
    `✅ [Proposições] Sincronização concluída: ${insertedProps} novas proposições (${updatedProps} atualizadas), ${insertedSessions} novas sessões (${updatedSessions} atualizadas).`
  );

  return {
    insertedPropositions: insertedProps,
    updatedPropositions: updatedProps,
    insertedSessions,
    updatedSessions,
    sessionsToSyncVotes: sessionsToInsert.map((s) => ({
      sessionId: s.id,
      propositionId: s.proposicao_id,
    })),
  };
}
