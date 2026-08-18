// ====================================================================
// LegisVisão - Cálculo de Afinidade de Parlamentar Individual
// ====================================================================
import { normalizeVote } from "./normalizeVotes";
import type { UserVotes, VoteDetailWithProject, PoliticianMatch } from "./types";
import type { PoliticianSearchResult } from "@/types/db";

/**
 * Calcula a afinidade individual de um parlamentar com base nos posicionamentos do usuário.
 * 
 * Regra Oficial:
 * - Cada sessão de deliberação nominal em que o parlamentar votou gera uma comparação independente.
 * - São comparáveis apenas votos que normalizem para "SIM" ou "NÃO".
 * - Abstenções, obstruções e ausências não entram no cálculo.
 * - Fórmula: Índice = Concordâncias / Total de Comparações Válidas.
 *
 * @param userVotes - Mapa { [projectId]: "CONCORDO" | "DISCORDO" }
 * @param votesOfPolitician - Lista de votos do parlamentar contendo project_id
 * @param politician - Dados cadastrais do parlamentar
 */
export function calculatePoliticianMatch(
  userVotes: UserVotes,
  votesOfPolitician: VoteDetailWithProject[],
  politician: PoliticianSearchResult
): PoliticianMatch {
  let matches = 0;
  let comparable = 0;

  for (const pv of votesOfPolitician) {
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
    ...politician,
    matches_count: matches,
    comparable_count: comparable,
    adherence,
  };
}
