// ====================================================================
// LegisVisão - Adaptador de Conexão com API do Senado Federal
// ====================================================================
import { SENADO_API_BASE, fetchWithRetry, mapConcurrent } from "../client";

export interface SenatorApiItem {
  IdentificacaoParlamentar?: {
    CodigoParlamentar?: string;
    NomeParlamentar?: string;
    NomeCompletoParlamentar?: string;
    SexoParlamentar?: string;
    FormaTratamento?: string;
    UrlFotoParlamentar?: string;
    UrlPaginaParlamentar?: string;
    EmailParlamentar?: string;
    SiglaPartidoParlamentar?: string;
    UfParlamentar?: string;
  };
  Mandato?: {
    CodigoMandato?: string;
    UfParlamentar?: string;
    PrimeiraLegislaturaDoMandato?: {
      NumeroLegislatura?: string;
      DataInicio?: string;
      DataFim?: string;
    };
    SegundaLegislaturaDoMandato?: {
      NumeroLegislatura?: string;
      DataInicio?: string;
      DataFim?: string;
    };
  };
}

export interface RawSenadoMateriaItem {
  Codigo: string;
  Sigla: string;
  Numero: string;
  Ano: string;
  Ementa?: string;
  Autor?: string;
  Data?: string;
  UrlDetalheMateria?: string;
}

export interface RawSenadoVotacaoItem {
  CodigoSessaoVotacao?: string;
  SessaoPlenaria?: {
    DataSessao?: string;
    HoraInicioSessao?: string;
  };
  DescricaoVotacao?: string;
  DescricaoResultado?: string;
  Resultado?: string;
  Votos?: {
    VotoParlamentar?: Array<{
      IdentificacaoParlamentar?: {
        CodigoParlamentar?: string;
        NomeParlamentar?: string;
        SiglaPartidoParlamentar?: string;
        UfParlamentar?: string;
      };
      SiglaVoto?: string;
    }> | {
      IdentificacaoParlamentar?: {
        CodigoParlamentar?: string;
        NomeParlamentar?: string;
        SiglaPartidoParlamentar?: string;
        UfParlamentar?: string;
      };
      SiglaVoto?: string;
    };
  };
}

export interface RawSenadoVoteItem {
  IdentificacaoParlamentar?: {
    CodigoParlamentar?: string;
    NomeParlamentar?: string;
    SiglaPartidoParlamentar?: string;
    UfParlamentar?: string;
  };
  SiglaVoto?: string;
}

/**
 * 1. Busca lista de senadores em exercício no Senado Federal.
 */
export async function fetchSenatorsFromApi(): Promise<SenatorApiItem[]> {
  const res = await fetchWithRetry(`${SENADO_API_BASE}/senador/lista/atual`);
  if (!res.ok) {
    throw new Error(`Falha ao buscar senadores: ${res.statusText}`);
  }

  const data = await res.json();
  const rawList = data?.ListaParlamentarEmExercicio?.Parlamentares?.Parlamentar;
  return Array.isArray(rawList) ? rawList : rawList ? [rawList] : [];
}

/**
 * 2. Consulta e processa o histórico de filiações de um senador.
 */
export async function fetchSenatorPartyHistory(
  extId: string,
  currentPartySigla?: string,
  defaultStartDate?: string | null
): Promise<Array<{ partySigla: string; startDate: string; endDate: string | null }>> {
  try {
    const res = await fetchWithRetry(`${SENADO_API_BASE}/senador/${extId}/filiacoes`, 2, 500);
    if (res.ok) {
      const json = await res.json();
      const rawList =
        json?.FiliacaoParlamentar?.Parlamentar?.Filiacoes?.Filiacao ||
        json?.Parlamentar?.Filiacoes?.Filiacao ||
        json?.Filiacoes?.Filiacao;

      const filiacoes = Array.isArray(rawList) ? rawList : rawList ? [rawList] : [];

      if (filiacoes.length > 0) {
        const intervals: Array<{ partySigla: string; startDate: string; endDate: string | null }> = [];
        for (const f of filiacoes) {
          const sigla = (f.Partido?.SiglaPartido || f.SiglaPartido || "").trim().toUpperCase();
          if (!sigla || sigla === "S/PARTIDO" || sigla === "SEM PARTIDO") continue;
          const start = f.DataFiliacao ? String(f.DataFiliacao).slice(0, 10) : (defaultStartDate || "2023-02-01").slice(0, 10);
          const end = f.DataDesfiliacao ? String(f.DataDesfiliacao).slice(0, 10) : null;
          intervals.push({ partySigla: sigla, startDate: start, endDate: end });
        }
        if (intervals.length > 0) {
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
 * 3. Consulta catálogo de matérias do Senado Federal (2018 em diante).
 */
export async function fetchSenadoPropositionsList(): Promise<RawSenadoMateriaItem[]> {
  const currentYear = new Date().getFullYear();
  const anos = Array.from({ length: currentYear - 2018 + 1 }, (_, i) => 2018 + i);
  const tipos = ["PL", "PEC", "PLP"];

  const queries: Array<{ yr: number; tp: string }> = [];
  for (const yr of anos) {
    for (const tp of tipos) {
      queries.push({ yr, tp });
    }
  }

  const matMap = new Map<string, RawSenadoMateriaItem>();

  await mapConcurrent(queries, 6, async ({ yr, tp }) => {
    try {
      const url = `${SENADO_API_BASE}/materia/pesquisa/lista?ano=${yr}&sigla=${tp}`;
      const res = await fetchWithRetry(url, 2, 500);
      if (!res.ok) return;
      const json = await res.json();
      const rawList = json?.PesquisaBasicaMateria?.Materias?.Materia;
      const list: RawSenadoMateriaItem[] = Array.isArray(rawList) ? rawList : rawList ? [rawList] : [];
      for (const item of list) {
        if (item.Codigo) {
          matMap.set(String(item.Codigo), item);
        }
      }
    } catch (err) {
      console.warn(`[Senado] Aviso ao consultar matérias (${tp}/${yr}):`, err);
    }
  });

  return Array.from(matMap.values());
}

/**
 * 4. Consulta sessões de votação oficiais de uma matéria no Senado.
 */
export async function fetchSenadoVoteSessions(materiaExternalId: string): Promise<RawSenadoVotacaoItem[]> {
  try {
    const url = `${SENADO_API_BASE}/materia/votacoes/${materiaExternalId}.json`;
    const res = await fetchWithRetry(url, 2, 500);
    if (!res.ok) return [];

    const json = await res.json();
    const rawList = json?.VotacaoMateria?.Materia?.Votacoes?.Votacao;
    return Array.isArray(rawList) ? rawList : rawList ? [rawList] : [];
  } catch {
    return [];
  }
}

/**
 * 5. Consulta os votos nominais de uma sessão no Senado.
 */
export async function fetchSenadoNominalVotes(
  materiaExternalId?: string,
  externalVoteId?: string
): Promise<RawSenadoVoteItem[]> {
  if (!materiaExternalId) return [];
  try {
    const url = `${SENADO_API_BASE}/materia/votacoes/${materiaExternalId}.json`;
    const res = await fetchWithRetry(url, 2, 500);
    if (!res.ok) return [];

    const json = await res.json();
    const rawList = json?.VotacaoMateria?.Materia?.Votacoes?.Votacao;
    const votacoes: RawSenadoVotacaoItem[] = Array.isArray(rawList) ? rawList : rawList ? [rawList] : [];

    const targetVotacao = votacoes.find(
      (v) => String(v.CodigoSessaoVotacao || "") === String(externalVoteId || "")
    );

    if (!targetVotacao) return [];

    const rawVotes = targetVotacao.Votos?.VotoParlamentar;
    return Array.isArray(rawVotes) ? rawVotes : rawVotes ? [rawVotes] : [];
  } catch {
    return [];
  }
}
