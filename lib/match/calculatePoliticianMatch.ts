// ====================================================================
// LegisVisão - Cálculo de Afinidade de Deputado Federal Individual
// Suporte a Opiniões Gerais e Destaques Granulares
// ====================================================================
import { normalizeVote } from "./normalizeVotes";
import type { UserVotes, GranularUserVotes, VoteDetailWithProposition, DeputyMatch } from "./types";
import type { DeputySearchResult } from "@/types/db";

/**
 * Calcula a afinidade individual de um Deputado Federal com base nos posicionamentos do visitante.
 * 
 * Regra Oficial:
 * - Cada votação nominal em que o deputado votou gera uma comparação independente.
 * - Se o usuário votou especificamente na sessão/destaque (granularVotes), essa opinião é priorizada.
 * - Caso contrário, utiliza a opinião sobre o projeto geral (userVotes).
 * - São comparáveis apenas votos que normalizem para "SIM" ou "NÃO".
 * - Abstenções, obstruções e ausências não entram no cálculo.
 * - Fórmula: Índice = Concordâncias / Total de Comparações Válidas * 100.
 */
export function calculatePoliticianMatch(
  userVotes: UserVotes,
  votesOfDeputy: VoteDetailWithProposition[],
  deputy: DeputySearchResult,
  granularVotes?: GranularUserVotes
): DeputyMatch {
  let matches = 0;
  let comparable = 0;

  for (const pv of votesOfDeputy) {
    const propId = pv.proposicao_id;
    const sessionId = pv.votacao_id;

    let userRaw: string | undefined;
    if (sessionId && granularVotes && granularVotes[sessionId]) {
      userRaw = granularVotes[sessionId];
    } else if (typeof propId === "number" && userVotes[propId]) {
      userRaw = userVotes[propId];
    }

    if (!userRaw) continue;

    const userVote = normalizeVote(userRaw);
    const polRaw = pv.voto_original;
    const deputyVote = normalizeVote(polRaw);

    if (!userVote || !deputyVote) continue;

    if (deputyVote === "SIM" || deputyVote === "NÃO") {
      comparable++;
      if (deputyVote === userVote) {
        matches++;
      }
    }
  }

  const adherence = comparable > 0 ? Number(((matches / comparable) * 100).toFixed(2)) : null;

  return {
    ...deputy,
    matches_count: matches,
    comparable_count: comparable,
    adherence,
  };
}
