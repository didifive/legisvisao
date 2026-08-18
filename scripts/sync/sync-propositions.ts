// ====================================================================
// LegisVisão - Sincronização de Votações e Proposições da Câmara
// ====================================================================
import { sql, CAMARA_API_BASE, fetchWithRetry, mapConcurrent } from "./client";

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
  console.log("🚩 [Proposições] Consultando sessões de votação nominal do Plenário (57ª Legislatura)...");

  const quarters = generateQuarters();
  const rawSessionsMap = new Map<string, CamaraVoteSessionListItem>();

  // 1. Coleta todas as sessões das janelas trimestrais
  for (const q of quarters) {
    try {
      let page = 1;
      let hasMore = true;

      while (hasMore && page <= 5) {
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
  }

  console.log(`📦 [Proposições] ${rawSessionsMap.size} sessões brutas identificadas na API da Câmara.`);

  // Filtra primariamente sessões com vínculo de proposição ou do Plenário
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

  // 2. Processa detalhes das sessões com concorrência
  console.log(`🔍 [Proposições] Processando vínculos de proposições para ${plenSessions.length} sessões relevantes...`);

  await mapConcurrent(plenSessions, 8, async (s) => {
    try {
      const detailRes = await fetchWithRetry(`${CAMARA_API_BASE}/votacoes/${s.id}`, 2, 300);
      if (!detailRes.ok) return;

      const detailJson = await detailRes.json();
      const det: CamaraVoteSessionDetail = detailJson.dados;
      if (!det) return;

      // Seleciona a melhor proposição associada
      const candidates = [
        ...(det.proposicoesAfetadas || []),
        ...(det.objetosPossiveis || []),
      ];

      let targetProp: CamaraPropositionSummary | null = null;

      // Prioriza matérias legislativas principais (PL, PEC, PLP, MPV, PLV, PDC, PDL)
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

      // Se não encontrou no array mas o ID da sessão tem formato "2345468-38", tenta pegar pelo prefixo
      let propId = targetProp?.id;
      let siglaTipo = targetProp?.siglaTipo;
      let numero = targetProp?.numero;
      let ano = targetProp?.ano;
      let ementa = targetProp?.ementa || targetProp?.ementaDetalhada || det.descricao || "";

      if (!propId && s.id.includes("-")) {
        const prefixId = Number(s.id.split("-")[0]);
        if (!isNaN(prefixId) && prefixId > 0) {
          propId = prefixId;
        }
      }

      if (!propId) return;

      // Se faltam dados como siglaTipo ou ano, busca o detalhe da proposição
      if (!siglaTipo || !numero || !ano) {
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

      if (!siglaTipo || !numero || !ano) return;

      const typeClean = siglaTipo.trim().toUpperCase();
      const numClean = Number(numero);
      const anoClean = Number(ano);
      const titulo = `${typeClean} ${numClean}/${anoClean}`;
      const resultado = det.aprovacao === 1 ? "Aprovado" : det.aprovacao === 0 ? "Rejeitado" : "Deliberado";

      validSessions.push({
        sessionId: s.id,
        dataHora: det.dataHoraRegistro || s.dataHoraRegistro || s.data || new Date().toISOString(),
        descricao: det.descricao || s.descricao || `Votação de ${titulo}`,
        resultado,
        propId,
        siglaTipo: typeClean,
        numero: numClean,
        ano: anoClean,
        titulo,
        ementa: ementa || `Deliberação legislativa sobre ${titulo}`,
      });

      if (!uniqueProps.has(propId)) {
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

  console.log(`🎯 [Proposições] ${uniqueProps.size} proposições únicas e ${validSessions.length} sessões identificadas.`);

  // 3. Enriquecer e salvar Proposições
  let insertedProps = 0;
  let updatedProps = 0;

  const propEntries = Array.from(uniqueProps.entries());

  await mapConcurrent(propEntries, 6, async ([propId, info]) => {
    let ementaCompleta = info.ementa;
    let urlInteiroTeor: string | null = null;
    let urlCamara = `https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=${propId}`;
    let dataApresentacao: string | null = null;
    let ultimoStatus: string | null = null;

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

    const res = await sql`
      INSERT INTO propositions (
        id, sigla_tipo, numero, ano, titulo, ementa, ementa_detalhada,
        url_inteiro_teor, url_camara, data_apresentacao, ultimo_status
      )
      VALUES (
        ${propId},
        ${info.siglaTipo},
        ${info.numero},
        ${info.ano},
        ${info.titulo},
        ${ementaCompleta},
        ${ementaCompleta},
        ${urlInteiroTeor},
        ${urlCamara},
        ${dataApresentacao},
        ${ultimoStatus}
      )
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

    if (res.length > 0) {
      if (res[0].is_insert) insertedProps++;
      else updatedProps++;
    }
  });

  // 4. Salvar Sessões de Votação
  let insertedSessions = 0;
  const sessionsToSyncVotes: Array<{ sessionId: string; propositionId: number }> = [];

  for (const s of validSessions) {
    const res = await sql`
      INSERT INTO vote_sessions (
        id, proposicao_id, data_hora, descricao, resultado, sigla_orgao
      )
      VALUES (
        ${s.sessionId},
        ${s.propId},
        ${s.dataHora}::timestamptz,
        ${s.descricao},
        ${s.resultado},
        'PLEN'
      )
      ON CONFLICT (id) DO UPDATE SET
        proposicao_id = EXCLUDED.proposicao_id,
        data_hora = EXCLUDED.data_hora,
        descricao = EXCLUDED.descricao,
        resultado = EXCLUDED.resultado
      RETURNING (xmax = 0) AS is_insert;
    `;

    if (res.length > 0 && res[0].is_insert) {
      insertedSessions++;
    }

    sessionsToSyncVotes.push({
      sessionId: s.sessionId,
      propositionId: s.propId,
    });
  }

  console.log(`✅ [Proposições] Sincronização concluída: ${uniqueProps.size} proposições (${insertedProps} novas) e ${validSessions.length} sessões de votação.`);

  return {
    totalPropositions: uniqueProps.size,
    insertedPropositions: insertedProps,
    updatedPropositions: updatedProps,
    totalSessions: validSessions.length,
    insertedSessions,
    sessionsToSyncVotes,
  };
}
