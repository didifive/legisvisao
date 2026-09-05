// ====================================================================
// LegisVisão - Cálculo de Afinidade Partidária (Média dos Deputados)
// ====================================================================
import { evaluateVotesList, calculateAdherencePercent } from "./evaluateVotes";
import type { UserVotes, GranularUserVotes, PartyMatchResult, VoteDetailWithProposition } from "./types";

/**
 * Calcula a afinidade de um partido político com base estritamente na média
 * dos posicionamentos nominais individuais de seus deputados federais filiados.
 * 
 * Regra Oficial:
 * - Não utiliza orientação formal de liderança.
 * - Cada voto de um deputado é vinculado ao seu partido.
 * - Índice de Afinidade = Total de Concordâncias dos Deputados / Total de Votos Comparáveis dos Deputados * 100.
 */
export function calculatePartyMatch(
  userVotes: GranularUserVotes | UserVotes,
  deputyVotesForParty: VoteDetailWithProposition[]
): PartyMatchResult {
  const { matches, comparable } = evaluateVotesList(userVotes, deputyVotesForParty);
  const adherence = calculateAdherencePercent(matches, comparable);

  return {
    matches_count: matches,
    comparable_count: comparable,
    adherence,
  };
}
