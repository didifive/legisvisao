// ====================================================================
// LegisVisão - Cálculo de Afinidade Partidária (Média dos Parlamentares)
// ====================================================================
import { normalizeVote } from "./normalizeVotes";
import type { UserVotes, PartyMatchResult, VoteDetailWithProject } from "./types";

/**
 * Calcula a afinidade de um partido político com base estritamente na média
 * dos posicionamentos nominais individuais de seus parlamentares filiados.
 * 
 * Regra Oficial:
 * - Não utiliza orientação formal de liderança.
 * - Cada voto de um parlamentar é vinculado ao partido ao qual pertencia na data da votação (cruzamento temporal).
 * - Cada voto nominal em uma sessão de deliberação válida gera uma comparação.
 * - Índice de Afinidade = Total de Concordâncias dos Filiados / Total de Votos Comparáveis dos Filiados.
 *
 * @param userVotes - Mapa { [projectId]: "CONCORDO" | "DISCORDO" }
 * @param politicianVotesForParty - Lista de votos nominais de parlamentares filiados a este partido na data da votação
 */
export function calculatePartyMatch(
  userVotes: UserVotes,
  politicianVotesForParty: VoteDetailWithProject[]
): PartyMatchResult {
  let matches = 0;
  let comparable = 0;

  for (const pv of politicianVotesForParty) {
    const projectId = pv.project_id;
    if (typeof projectId !== "number") continue;

    const userRaw = userVotes[projectId];
    const userVote = normalizeVote(userRaw);
    const polRaw = pv.vote_original;
    const politicianVote = normalizeVote(polRaw);

    if (!userVote || !politicianVote) continue;

    if (politicianVote === "SIM" || politicianVote === "NÃO") {
      comparable++;
      if (politicianVote === userVote) {
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
