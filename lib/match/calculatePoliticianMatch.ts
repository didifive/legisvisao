// ====================================================================
// LegisVisão - Cálculo de Afinidade de Deputado Federal Individual
// ====================================================================
import { normalizeVote } from "./normalizeVotes";
import type { UserVotes, VoteDetailWithProposition, DeputyMatch } from "./types";
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
  userVotes: UserVotes,
  votesOfDeputy: VoteDetailWithProposition[],
  deputy: DeputySearchResult
): DeputyMatch {
  let matches = 0;
  let comparable = 0;

  for (const pv of votesOfDeputy) {
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
    ...deputy,
    matches_count: matches,
    comparable_count: comparable,
    adherence,
  };
}
