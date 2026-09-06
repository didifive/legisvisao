// ====================================================================
// LegisVisão - Utilidade para Comparação de Votos (Deputados e Partidos)
// ====================================================================
import { normalizeVote } from "./normalizeVotes";
import type { UserVotes, GranularUserVotes, VoteDetailWithProposition } from "./types";

export interface MatchEvaluation {
  matches: number;
  comparable: number;
}

/**
 * Extrai a opinião do usuário para um voto nominal do deputado.
 * Prioriza o código da seção (granular). Caso a proposição possua votos
 * granulares registrados, restringe a avaliação estritamente às sessões
 * votadas pelo usuário, sem aplicar o voto geral legado como curinga.
 */
export function resolveUserVoteForDetail(
  userVotes: GranularUserVotes | UserVotes,
  pv: VoteDetailWithProposition
): string | undefined {
  const sessionId = pv.votacao_id ? String(pv.votacao_id) : undefined;
  if (sessionId && sessionId in userVotes) {
    return userVotes[sessionId];
  }

  const propId = pv.proposicao_id;
  if (propId !== undefined && propId in userVotes) {
    const hasGranularForProp = Object.keys(userVotes).some(
      (k) => k.startsWith(`${propId}-`)
    );
    if (hasGranularForProp) {
      return undefined;
    }

    return userVotes[propId];
  }

  return undefined;
}

/**
 * Avalia se o voto do deputado coincide com a opinião do visitante
 * e se é comparável (SIM ou NÃO).
 */
export function evaluateVotePair(
  userRaw: string | undefined,
  deputyRaw: string | undefined
): { isComparable: boolean; isMatch: boolean } {
  if (!userRaw || !deputyRaw) {
    return { isComparable: false, isMatch: false };
  }

  const userVote = normalizeVote(userRaw);
  const deputyVote = normalizeVote(deputyRaw);

  if (!userVote || !deputyVote) {
    return { isComparable: false, isMatch: false };
  }

  const isComparable = deputyVote === "SIM" || deputyVote === "NÃO";
  const isMatch = isComparable && deputyVote === userVote;

  return { isComparable, isMatch };
}

/**
 * Itera uma lista de votos e calcula o acumulado de comparações e concordâncias.
 */
export function evaluateVotesList(
  userVotes: GranularUserVotes | UserVotes,
  votes: VoteDetailWithProposition[]
): MatchEvaluation {
  let matches = 0;
  let comparable = 0;

  for (const pv of votes) {
    const userRaw = resolveUserVoteForDetail(userVotes, pv);
    const { isComparable, isMatch } = evaluateVotePair(userRaw, pv.voto_original);

    if (isComparable) {
      comparable++;
      if (isMatch) {
        matches++;
      }
    }
  }

  return { matches, comparable };
}

/**
 * Calcula o percentual de adesão arredondado para 2 casas decimais.
 */
export function calculateAdherencePercent(matches: number, comparable: number): number | null {
  return comparable > 0 ? Number(((matches / comparable) * 100).toFixed(2)) : null;
}

/**
 * Normaliza valores de adesão para a escala decimal [0, 1].
 * Suporta entradas nulas, percentuais [0, 100] ou decimais [0, 1].
 */
export function normalizeAdherence(raw?: number | null): number | null {
  if (raw === null || raw === undefined) return null;
  const v = Number(raw);
  if (Number.isNaN(v)) return null;
  if (v >= 0 && v <= 1) return v;
  if (v > 1 && v <= 100) return Math.min(1, v / 100);
  if (v > 100) return Math.min(1, v / 10000);
  return Math.max(0, Math.min(1, v));
}

/**
 * Calcula o score bayesiano de ordenação para classificação justa de afinidade.
 * Protege contra distorções onde parlamentares com apenas 1 voto comparável
 * superariam parlamentares com dezenas de votos consistentes.
 */
export function calculateBayesianScore(
  matches: number,
  comparable: number,
  prior = 0.5,
  weight = 2
): number {
  if (comparable <= 0) return -1;
  return (matches + prior * weight) / (comparable + weight);
}

