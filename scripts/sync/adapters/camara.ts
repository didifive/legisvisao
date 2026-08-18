// ====================================================================
// LegisVisão - Adaptador de Conexão com API da Câmara dos Deputados
// ====================================================================
import { CAMARA_API_BASE, fetchWithRetry, mapConcurrent, fetchCamaraPaginated } from "../client";

export interface CamaraDeputyApiItem {
  id: number;
  uri?: string;
  nome?: string;
  siglaPartido?: string;
  uriPartido?: string;
  siglaUf?: string;
  idLegislatura?: number;
  urlFoto?: string;
  email?: string;
}

export interface CamaraLegislatureInfo {
  id: number;
  startDate: string | null;
  endDate: string | null;
}

export interface CamaraHistoricoItem {
  dataHora?: string;
  siglaPartido?: string;
}

export interface CamaraPropositionListItem {
  id: number;
  siglaTipo?: string;
  numero?: number;
  ano?: number;
  ementa?: string;
}

export interface CamaraPropositionDetail {
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

export interface CamaraVoteSessionApiItem {
  id?: number | string;
  idVotacao?: number | string;
  dataHoraRegistro?: string;
  data?: string;
  descricao?: string;
  aprovacao?: number;
  siglaOrgaoPolitico?: string;
}

export interface CamaraRawVoteNominalItem {
  tipoVoto?: string;
  voto?: string;
  deputado_?: { id?: number | string; siglaPartido?: string };
  deputado?: { id?: number | string; siglaPartido?: string };
}

/**
 * 1. Consulta dinamicamente a legislatura mais recente da Câmara.
 */
export async function fetchCurrentCamaraLegislature(): Promise<CamaraLegislatureInfo | null> {
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
    console.warn("-> [Câmara] Aviso ao consultar legislatura atual:", err);
    return null;
  }
}

/**
 * 2. Busca lista completa de deputados da legislatura atual na Câmara.
 */
export async function fetchDeputiesFromApi(legislatureId?: number): Promise<CamaraDeputyApiItem[]> {
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
 * 3. Consulta e processa o histórico de filiações de um deputado.
 */
export async function fetchDeputyPartyHistory(
  extId: string,
  currentPartySigla?: string,
  defaultStartDate?: string | null
): Promise<Array<{ partySigla: string; startDate: string; endDate: string | null }>> {
  try {
    const res = await fetchWithRetry(`${CAMARA_API_BASE}/deputados/${extId}/historico`, 2, 500);
    if (res.ok) {
      const json = await res.json();
      const rawItems: CamaraHistoricoItem[] = json.dados || [];

      if (rawItems.length > 0) {
        const validItems = rawItems.filter(
          (item): item is CamaraHistoricoItem & { siglaPartido: string } =>
            Boolean(item.siglaPartido && item.siglaPartido.trim())
        );
        const sorted = validItems.sort((a, b) => (a.dataHora || "").localeCompare(b.dataHora || ""));

        const groups: Array<{ sigla: string; dataHora: string }> = [];
        for (const item of sorted) {
          const sigla = item.siglaPartido.trim().toUpperCase();
          if (groups.length === 0 || groups[groups.length - 1].sigla !== sigla) {
            groups.push({ sigla, dataHora: item.dataHora || defaultStartDate || "2023-02-01" });
          }
        }

        if (groups.length > 0) {
          const intervals: Array<{ partySigla: string; startDate: string; endDate: string | null }> = [];
          for (let i = 0; i < groups.length; i++) {
            const current = groups[i];
            const startDate = current.dataHora.slice(0, 10);
            const endDate = i === groups.length - 1 ? null : groups[i + 1].dataHora.slice(0, 10);
            intervals.push({ partySigla: current.sigla, startDate, endDate });
          }
          return intervals;
        }
      }
    }
  } catch {
    // Silencia e usa fallback
  }

  if (currentPartySigla) {
    return [
      {
        partySigla: currentPartySigla.trim().toUpperCase(),
        startDate: (defaultStartDate || "2023-02-01").slice(0, 10),
        endDate: null,
      },
    ];
  }

  return [];
}

/**
 * 4. Consulta catálogo de proposições da Câmara dos Deputados (2018 em diante).
 */
export async function fetchCamaraPropositionsList(): Promise<CamaraPropositionListItem[]> {
  const currentYear = new Date().getFullYear();
  const anos = Array.from({ length: currentYear - 2018 + 1 }, (_, i) => 2018 + i);
  const tipos = ["PL", "PEC", "PLP", "MPV"];

  const queries: Array<{ yr: number; tp: string }> = [];
  for (const yr of anos) {
    for (const tp of tipos) {
      queries.push({ yr, tp });
    }
  }

  const propsMap = new Map<string, CamaraPropositionListItem>();

  await mapConcurrent(queries, 6, async ({ yr, tp }) => {
    try {
      const url = `${CAMARA_API_BASE}/proposicoes?siglaTipo=${tp}&ano=${yr}&itens=100&ordem=DESC&ordenarPor=id`;
      const items = await fetchCamaraPaginated<CamaraPropositionListItem>(url, 2);
      for (const item of items) {
        if (item.id) {
          propsMap.set(String(item.id), item);
        }
      }
    } catch (err) {
      console.warn(`[Câmara] Aviso ao consultar proposições (${tp}/${yr}):`, err);
    }
  });

  return Array.from(propsMap.values());
}

/**
 * 5. Busca detalhes completos de uma proposição da Câmara.
 */
export async function fetchCamaraPropositionDetail(propId: number): Promise<CamaraPropositionDetail | null> {
  const detRes = await fetchWithRetry(`${CAMARA_API_BASE}/proposicoes/${propId}`, 2, 500);
  if (!detRes.ok) return null;
  const detData = await detRes.json();
  return detData.dados || null;
}

/**
 * 6. Busca o primeiro autor de uma proposição da Câmara.
 */
export async function fetchCamaraFirstAuthorName(uriAutores?: string): Promise<string | null> {
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
 * 7. Consulta sessões de votação oficiais de uma proposição na Câmara.
 */
export async function fetchCamaraVoteSessions(externalId: string): Promise<CamaraVoteSessionApiItem[]> {
  const votUrl = `${CAMARA_API_BASE}/proposicoes/${externalId}/votacoes`;
  const votRes = await fetchWithRetry(votUrl, 2, 500);
  if (!votRes.ok) return [];

  const votData = await votRes.json();
  return votData.dados || [];
}

/**
 * 8. Consulta os votos nominais de uma sessão na Câmara.
 */
export async function fetchCamaraNominalVotes(externalVoteId: string): Promise<CamaraRawVoteNominalItem[]> {
  const votosUrl = `${CAMARA_API_BASE}/votacoes/${externalVoteId}/votos`;
  const votosRes = await fetchWithRetry(votosUrl, 2, 500);
  if (!votosRes.ok) return [];

  const votosData = await votosRes.json();
  return votosData.dados || [];
}
