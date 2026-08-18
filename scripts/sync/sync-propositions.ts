import { CAMARA_API_BASE, fetchWithRetry, sql, mapConcurrent, chunkArray } from "./client";
import type {
  CamaraVoteSessionListItem,
  CamaraPropositionSummary,
} from "../../types/db";

/**
 * Gera as janelas trimestrais da 57ª Legislatura (2023 até 2026)
 */
function generateQuarters(): Array<{ start: string; end: string }> {
  const quarters: Array<{ start: string; end: string }> = [];
  const years = [2023, 2024, 2025, 2026];

  for (const year of years) {
    quarters.push({ start: `${year}-01-01`, end: `${year}-03-31` });
    quarters.push({ start: `${year}-04-01`, end: `${year}-06-30` });
    quarters.push({ start: `${year}-07-01`, end: `${year}-09-30` });
    quarters.push({ start: `${year}-10-01`, end: `${year}-12-31` });
  }

  return quarters;
}

/**
 * Sincroniza Proposições e Sessões de Votação do Plenário da Câmara dos Deputados.
 * 
 * Otimizações de Alta Performance:
 * 1. Coleta e desduplicação paralela de sessões por janela trimestral com paginação até 40 páginas.
 * 2. Extração determinística do ID da proposição a partir do prefixo da sessão (ex: 2618177-71 -> 2618177).
 * 3. Enriquecimento paralelo apenas das proposições únicas (reduzindo de 18.000 chamadas para ~1.000).
 * 4. Inserção em lotes de 100 proposições e 200 sessões com ON CONFLICT DO UPDATE.
 */
export async function syncPropositions(): Promise<{
  insertedPropositions: number;
  updatedPropositions: number;
  insertedSessions: number;
  updatedSessions: number;
  sessionsToSyncVotes: Array<{ sessionId: string; propositionId: number }>;
}> {
  console.log("🚩 [Proposições] Verificando dados existentes no banco e consultando API da Câmara...");

  // Cache existente no banco
  const [existingPropsRows, existingSessionsRows] = await Promise.all([
    sql<{ id: number }[]>`SELECT id FROM propositions`,
    sql<{ id: string; proposicao_id: number }[]>`SELECT id, proposicao_id FROM vote_sessions`,
  ]);

  const existingPropsSet = new Set(existingPropsRows.map((r) => r.id));
  const existingSessionsMap = new Map(existingSessionsRows.map((r) => [r.id, r.proposicao_id]));

  console.log(`📊 [Proposições] Cache do banco: ${existingPropsSet.size} proposições e ${existingSessionsMap.size} sessões já registradas.`);

  const quarters = generateQuarters();
  const rawSessionsMap = new Map<string, CamaraVoteSessionListItem>();

  // 1. Coleta todas as sessões das janelas trimestrais em paralelo
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

  // 2. Extrai e mapeia sessões e proposições únicas em memória instantaneamente
  const rawSessions = Array.from(rawSessionsMap.values());
  const plenSessions = rawSessions.filter(
    (s) => !s.siglaOrgao || s.siglaOrgao === "PLEN" || Boolean(s.uriProposicaoObjeto)
  );

  const validSessionsMap = new Map<string, {
    id: string;
    proposicao_id: number;
    data_hora: string;
    descricao: string;
    resultado: string;
    sigla_orgao: string;
  }>();

  const uniquePropIds = new Set<number>();

  for (const s of plenSessions) {
    let propId = existingSessionsMap.get(s.id);

    if (!propId && s.id.includes("-")) {
      const prefix = Number(s.id.split("-")[0]);
      if (!isNaN(prefix) && prefix > 0) {
        propId = prefix;
      }
    }

    if (!propId && s.uriProposicaoObjeto) {
      const parts = s.uriProposicaoObjeto.split("/");
      const last = Number(parts[parts.length - 1]);
      if (!isNaN(last) && last > 0) {
        propId = last;
      }
    }

    if (!propId) continue;

    uniquePropIds.add(propId);

    const dataHora = s.dataHoraRegistro || s.data || new Date().toISOString();
    const descricao = s.descricao || `Deliberação legislativa sobre proposição ${propId}`;
    const resultado = s.aprovacao === 1 ? "Aprovado" : s.aprovacao === 0 ? "Rejeitado" : "Deliberado";

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

  // 3. Enriquecer apenas proposições pendentes de cadastro ou atualização
  const propIdsToEnrich = Array.from(uniquePropIds);
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

  let enrichedCount = 0;
  console.log(`📝 [Proposições] Consultando detalhes de ${propIdsToEnrich.length} proposições na API da Câmara...`);

  await mapConcurrent(propIdsToEnrich, 15, async (propId) => {
    try {
      const propRes = await fetchWithRetry(`${CAMARA_API_BASE}/proposicoes/${propId}`, 2, 250);
      if (propRes.ok) {
        const pJson = await propRes.json();
        const pd: CamaraPropositionSummary | undefined = pJson.dados;

        if (pd) {
          const siglaTipo = pd.siglaTipo ? pd.siglaTipo.trim().toUpperCase() : "PROP";
          const numero = pd.numero ? Number(pd.numero) : 0;
          const ano = pd.ano ? Number(pd.ano) : 2024;
          const titulo = numero > 0 ? `${siglaTipo} ${numero}/${ano}` : `Proposição ${propId}`;
          const ementa = pd.ementa || pd.ementaDetalhada || `Deliberação legislativa sobre ${titulo}`;
          const urlInteiroTeor = pd.urlInteiroTeor || null;
          const urlCamara = `https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=${propId}`;
          const dataApresentacao = pd.dataApresentacao ? pd.dataApresentacao.substring(0, 10) : null;
          const ultimoStatus = pd.statusProposicao?.descricaoSituacao || pd.statusProposicao?.descricaoTramitacao || null;

          propsMapToInsert.set(propId, {
            id: propId,
            sigla_tipo: siglaTipo,
            numero,
            ano,
            titulo,
            ementa,
            ementa_detalhada: ementa,
            url_inteiro_teor: urlInteiroTeor,
            url_camara: urlCamara,
            data_apresentacao: dataApresentacao,
            ultimo_status: ultimoStatus,
          });
        }
      }
    } catch {
      // Ignora erro pontual
    } finally {
      enrichedCount++;
      if (enrichedCount % 100 === 0 || enrichedCount === propIdsToEnrich.length) {
        const pct = ((enrichedCount / propIdsToEnrich.length) * 100).toFixed(1);
        console.log(`⏳ [Proposições] ${enrichedCount}/${propIdsToEnrich.length} proposições enriquecidas (${pct}%).`);
      }
    }
  });

  // 4. Salvar Proposições em Lotes (Batch Insert)
  let insertedProps = 0;
  let updatedProps = 0;

  const propsToInsert = Array.from(propsMapToInsert.values());
  console.log(`💾 [Proposições] Gravando ${propsToInsert.length} proposições no banco de dados...`);

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

  // 5. Salvar Sessões de Votação em Lotes (Batch Insert)
  let insertedSessions = 0;
  let updatedSessions = 0;

  // Filtra apenas sessões cujas proposições foram efetivamente salvas
  const savedPropIds = new Set(propsToInsert.map((p) => p.id));
  const sessionsToInsert = Array.from(validSessionsMap.values()).filter(
    (s) => savedPropIds.has(s.proposicao_id) || existingPropsSet.has(s.proposicao_id)
  );

  console.log(`💾 [Proposições] Gravando ${sessionsToInsert.length} sessões de votação vinculadas no banco de dados...`);

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
        resultado = EXCLUDED.resultado,
        sigla_orgao = EXCLUDED.sigla_orgao,
        last_updated_at = NOW()
      RETURNING (xmax = 0) AS is_insert;
    `;

    const inserted = res.filter((r) => r.is_insert).length;
    insertedSessions += inserted;
    updatedSessions += res.length - inserted;
  }

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
