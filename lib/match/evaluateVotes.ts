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
 * Extrai a opinião do usuário para um voto nominal do deputado,
 * priorizando o código da seção (granular) com fallback para o ID do projeto (legado).
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
