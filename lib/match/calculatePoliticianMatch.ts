// ====================================================================
// LegisVisão - Cálculo de Afinidade de Deputado Federal Individual
// ====================================================================
import { evaluateVotesList, calculateAdherencePercent } from "./evaluateVotes";
import type { UserVotes, GranularUserVotes, VoteDetailWithProposition, DeputyMatch } from "./types";
import type { DeputySearchResult } from "@/types/db";

/**
 * Calcula a afinidade individual de um Deputado Federal com base nos posicionamentos do visitante.
 * 
 * Regra Oficial:
 * - Cada votação nominal em que o deputado votou gera uma comparação independente.
 * - São comparáveis apenas votos que normalizem para "SIM" ou "NÃO".
 * - Abstenções, obstruções e ausências não entram no cálculo.
 * - Fórmula: Índice = Concordâncias / Total de Comparações Válidas * 100.
 */
export function calculatePoliticianMatch(
  userVotes: GranularUserVotes | UserVotes,
  votesOfDeputy: VoteDetailWithProposition[],
  deputy: DeputySearchResult
): DeputyMatch {
  const { matches, comparable } = evaluateVotesList(userVotes, votesOfDeputy);
  const adherence = calculateAdherencePercent(matches, comparable);

  return {
    ...deputy,
    matches_count: matches,
    comparable_count: comparable,
    adherence,
  };
}
