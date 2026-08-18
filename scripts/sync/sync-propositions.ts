// ====================================================================
// LegisVisão - Sincronização de Votações e Proposições da Câmara (Otimizado)
// ====================================================================
import { sql, CAMARA_API_BASE, fetchWithRetry, mapConcurrent, chunkArray } from "./client";

interface CamaraVoteSessionListItem {
  id: string;
  data: string;
  dataHoraRegistro?: string;
  siglaOrgao?: string;
  descricao?: string;
  aprovacao?: number;
  proposicaoObjeto?: string | null;
  uriProposicaoObjeto?: string | null;
}

interface CamaraPropositionSummary {
  id: number;
  siglaTipo: string;
  numero: number;
  ano: number;
  ementa?: string;
  ementaDetalhada?: string;
  titulo?: string;
}

interface CamaraVoteSessionDetail {
  id: string;
  dataHoraRegistro?: string;
  descricao?: string;
  aprovacao?: number;
  siglaOrgao?: string;
  proposicoesAfetadas?: CamaraPropositionSummary[];
  objetosPossiveis?: CamaraPropositionSummary[];
}

export interface SyncPropositionsResult {
  totalPropositions: number;
  insertedPropositions: number;
  updatedPropositions: number;
  totalSessions: number;
  insertedSessions: number;
  sessionsToSyncVotes: Array<{ sessionId: string; propositionId: number }>;
}

/**
 * Gera janelas trimestrais de 3 meses de 2023 até o ano corrente para respeitar o limite da API.
 */
function generateQuarters(): Array<{ start: string; end: string }> {
  const currentYear = new Date().getFullYear();
  const quarters: Array<{ start: string; end: string }> = [];

  for (let year = 2023; year <= currentYear; year++) {
    quarters.push({ start: `${year}-01-01`, end: `${year}-03-31` });
    quarters.push({ start: `${year}-04-01`, end: `${year}-06-30` });
    quarters.push({ start: `${year}-07-01`, end: `${year}-09-30` });
    quarters.push({ start: `${year}-10-01`, end: `${year}-12-31` });
  }

  return quarters;
}

export async function syncPropositions(): Promise<SyncPropositionsResult> {
  console.log("🚩 [Proposições] Verificando dados existentes no banco e consultando API da Câmara...");

  // 0. Verificação ativa no banco de dados para evitar requisições redundantes
  const existingPropsRows = await sql<Array<{ id: number }>>`
    SELECT id FROM propositions
  `;
  const existingPropsSet = new Set<number>(existingPropsRows.map((r) => r.id));

  const existingSessionsRows = await sql<Array<{ id: string; proposicao_id: number }>>`
    SELECT id, proposicao_id FROM vote_sessions
  `;
  const existingSessionsMap = new Map<string, number>();
  for (const s of existingSessionsRows) {
    existingSessionsMap.set(s.id, s.proposicao_id);
  }

  console.log(`📊 [Proposições] Cache do banco: ${existingPropsSet.size} proposições e ${existingSessionsMap.size} sessões já registradas.`);

  const quarters = generateQuarters();
  const rawSessionsMap = new Map<string, CamaraVoteSessionListItem>();

  // 1. Coleta todas as sessões das janelas trimestrais em paralelo
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

  // Filtra primariamente sessões do Plenário ou com proposição associada
  const rawSessions = Array.from(rawSessionsMap.values());
  const plenSessions = rawSessions.filter(
    (s) => !s.siglaOrgao || s.siglaOrgao === "PLEN" || Boolean(s.uriProposicaoObjeto)
  );

  const validSessions: Array<{
    sessionId: string;
    dataHora: string;
    descricao: string;
    resultado: string;
    propId: number;
    siglaTipo: string;
    numero: number;
    ano: number;
    titulo: string;
    ementa: string;
  }> = [];

  const uniqueProps = new Map<number, { siglaTipo: string; numero: number; ano: number; titulo: string; ementa: string }>();

  // 2. Processa detalhes das sessões com concorrência otimizada
  console.log(`🔍 [Proposições] Processando vínculos para ${plenSessions.length} sessões relevantes...`);

  await mapConcurrent(plenSessions, 10, async (s) => {
    try {
      // Se a sessão já existe no banco e já tem proposição vinculada, reaproveita dados básicos
      const cachedPropId = existingSessionsMap.get(s.id);

      let det: CamaraVoteSessionDetail | null = null;
      let targetProp: CamaraPropositionSummary | null = null;

      // Se não temos a proposição mapeada, busca o detalhe da sessão na API
      if (!cachedPropId) {
        const detailRes = await fetchWithRetry(`${CAMARA_API_BASE}/votacoes/${s.id}`, 2, 300);
        if (!detailRes.ok) return;

        const detailJson = await detailRes.json();
        det = detailJson.dados;
        if (!det) return;

        const candidates = [
          ...(det.proposicoesAfetadas || []),
          ...(det.objetosPossiveis || []),
        ];

        const priorityTypes = ["PL", "PEC", "PLP", "MPV", "PLV", "PDC", "PDL"];
        for (const cand of candidates) {
          if (cand && cand.id && cand.siglaTipo && priorityTypes.includes(cand.siglaTipo.toUpperCase())) {
            targetProp = cand;
            break;
          }
        }

        if (!targetProp && candidates.length > 0) {
          const first = candidates.find((c) => c && c.id && c.siglaTipo && c.numero && c.ano);
          if (first) targetProp = first;
        }
      }

      let propId = targetProp?.id || cachedPropId;
      let siglaTipo = targetProp?.siglaTipo;
      let numero = targetProp?.numero;
      let ano = targetProp?.ano;
      let ementa = targetProp?.ementa || targetProp?.ementaDetalhada || det?.descricao || "";

      if (!propId && s.id.includes("-")) {
        const prefixId = Number(s.id.split("-")[0]);
        if (!isNaN(prefixId) && prefixId > 0) {
          propId = prefixId;
        }
      }

      if (!propId) return;

      // Se faltam dados e a proposição não é conhecida, busca o detalhe da proposição
      if ((!siglaTipo || !numero || !ano) && !existingPropsSet.has(propId)) {
        try {
          const propRes = await fetchWithRetry(`${CAMARA_API_BASE}/proposicoes/${propId}`, 2, 300);
          if (propRes.ok) {
            const pJson = await propRes.json();
            const pd = pJson.dados;
            if (pd) {
              siglaTipo = pd.siglaTipo;
              numero = pd.numero;
              ano = pd.ano;
              ementa = pd.ementa || pd.ementaDetalhada || ementa;
            }
          }
        } catch {
          // Ignora
        }
      }

      const typeClean = siglaTipo ? siglaTipo.trim().toUpperCase() : "PROP";
      const numClean = numero ? Number(numero) : 0;
      const anoClean = ano ? Number(ano) : 2024;
      const titulo = numClean > 0 ? `${typeClean} ${numClean}/${anoClean}` : `Proposição ${propId}`;
      const resultado = det?.aprovacao === 1 ? "Aprovado" : det?.aprovacao === 0 ? "Rejeitado" : "Deliberado";

      validSessions.push({
        sessionId: s.id,
        dataHora: det?.dataHoraRegistro || s.dataHoraRegistro || s.data || new Date().toISOString(),
        descricao: det?.descricao || s.descricao || `Votação de ${titulo}`,
        resultado,
        propId,
        siglaTipo: typeClean,
        numero: numClean,
        ano: anoClean,
        titulo,
        ementa: ementa || `Deliberação legislativa sobre ${titulo}`,
      });

      if (!uniqueProps.has(propId) && (!existingPropsSet.has(propId) || numClean > 0)) {
        uniqueProps.set(propId, {
          siglaTipo: typeClean,
          numero: numClean,
          ano: anoClean,
          titulo,
          ementa,
        });
      }
    } catch {
      // Ignora erro pontual de sessão
    }
  });

  console.log(`🎯 [Proposições] ${uniqueProps.size} proposições pendentes/atualizadas e ${validSessions.length} sessões identificadas.`);

  // 3. Enriquecer e salvar Proposições em Lotes (Batch Insert)
  let insertedProps = 0;
  let updatedProps = 0;

  const propEntries = Array.from(uniqueProps.entries());
  const propsMapToInsert = new Map<number, {
    id: number;
    sigla_tipo: string;
    numero: number;
    ano: number;
    titulo: string;
    ementa: string;
    ementa_detalhada: string;
    url_inteiro_teor: string | null;
    url_camara: string;
    data_apresentacao: string | null;
    ultimo_status: string | null;
  }>();

  // Enriquecer apenas proposições que precisam de dados completos
  await mapConcurrent(propEntries, 10, async ([propId, info]) => {
    let ementaCompleta = info.ementa;
    let urlInteiroTeor: string | null = null;
    let urlCamara = `https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=${propId}`;
    let dataApresentacao: string | null = null;
    let ultimoStatus: string | null = null;

    if (!existingPropsSet.has(propId)) {
      try {
        const detailRes = await fetchWithRetry(`${CAMARA_API_BASE}/proposicoes/${propId}`, 2, 300);
        if (detailRes.ok) {
          const detailJson = await detailRes.json();
          const d = detailJson.dados;
          if (d) {
            ementaCompleta = d.ementa || d.ementaDetalhada || ementaCompleta;
            urlInteiroTeor = d.urlInteiroTeor || null;
            dataApresentacao = d.dataApresentacao ? d.dataApresentacao.substring(0, 10) : null;
            ultimoStatus = d.statusProposicao?.descricaoSituacao || d.statusProposicao?.descricaoTramitacao || null;
          }
        }
      } catch {
        // Usa dados básicos
      }
    }

    propsMapToInsert.set(propId, {
      id: propId,
      sigla_tipo: info.siglaTipo,
      numero: info.numero,
      ano: info.ano,
      titulo: info.titulo,
      ementa: ementaCompleta,
      ementa_detalhada: ementaCompleta,
      url_inteiro_teor: urlInteiroTeor,
      url_camara: urlCamara,
      data_apresentacao: dataApresentacao,
      ultimo_status: ultimoStatus,
    });
  });

  const propsToInsert = Array.from(propsMapToInsert.values());

  // Envio de proposições em lote de 100 para o Postgres
  for (const chunk of chunkArray(propsToInsert, 100)) {
    const res = await sql`
      INSERT INTO propositions ${sql(
        chunk,
        "id",
        "sigla_tipo",
        "numero",
        "ano",
        "titulo",
        "ementa",
        "ementa_detalhada",
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
        url_inteiro_teor = COALESCE(EXCLUDED.url_inteiro_teor, propositions.url_inteiro_teor),
        url_camara = EXCLUDED.url_camara,
        data_apresentacao = COALESCE(EXCLUDED.data_apresentacao, propositions.data_apresentacao),
        ultimo_status = COALESCE(EXCLUDED.ultimo_status, propositions.ultimo_status),
        last_updated_at = NOW()
      RETURNING (xmax = 0) AS is_insert;
    `;

    const inserted = res.filter((r) => r.is_insert).length;
    insertedProps += inserted;
    updatedProps += res.length - inserted;
  }

  // 4. Salvar Sessões de Votação em Lotes (Batch Insert)
  let insertedSessions = 0;
  const sessionsToSyncVotes: Array<{ sessionId: string; propositionId: number }> = [];
  const sessionsMapToInsert = new Map<string, {
    id: string;
    proposicao_id: number;
    data_hora: string;
    descricao: string;
    resultado: string;
    sigla_orgao: string;
  }>();

  for (const s of validSessions) {
    if (!sessionsMapToInsert.has(s.sessionId)) {
      sessionsToSyncVotes.push({
        sessionId: s.sessionId,
        propositionId: s.propId,
      });

      sessionsMapToInsert.set(s.sessionId, {
        id: s.sessionId,
        proposicao_id: s.propId,
        data_hora: s.dataHora,
        descricao: s.descricao,
        resultado: s.resultado,
        sigla_orgao: "PLEN",
      });
    }
  }

  const sessionsToInsert = Array.from(sessionsMapToInsert.values());

  for (const chunk of chunkArray(sessionsToInsert, 200)) {
    const res = await sql`
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
        resultado = EXCLUDED.resultado
      RETURNING (xmax = 0) AS is_insert;
    `;

    insertedSessions += res.filter((r) => r.is_insert).length;
  }

  console.log(`✅ [Proposições] Sincronização concluída em lote: ${propsToInsert.length} proposições (${insertedProps} novas) e ${validSessions.length} sessões de votação (${insertedSessions} novas).`);

  return {
    totalPropositions: propsToInsert.length,
    insertedPropositions: insertedProps,
    updatedPropositions: updatedProps,
    totalSessions: validSessions.length,
    insertedSessions,
    sessionsToSyncVotes,
  };
}
