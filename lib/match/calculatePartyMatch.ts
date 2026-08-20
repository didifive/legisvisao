// ====================================================================
// LegisVisão - Cálculo de Afinidade Partidária (Média dos Deputados)
// ====================================================================
import { normalizeVote } from "./normalizeVotes";
import type { UserVotes, PartyMatchResult, VoteDetailWithProposition } from "./types";

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
  userVotes: UserVotes,
  deputyVotesForParty: VoteDetailWithProposition[]
): PartyMatchResult {
  let matches = 0;
  let comparable = 0;

  for (const pv of deputyVotesForParty) {
    const propId = pv.proposicao_id;
    if (typeof propId !== "number") continue;

    const userRaw = userVotes[propId];
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
    matches_count: matches,
    comparable_count: comparable,
    adherence,
  };
}
