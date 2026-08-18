// ====================================================================
// LegisVisão - Vinculação de Sessões a Projetos Canônicos
// ====================================================================
import type { VoteDetailRow } from "@/types/db";
import type { VoteDetailWithProject } from "./types";

/**
 * Gera o ID canônico unificado no formato {TIPO}-{NUMERO}-{ANO}
 * Exemplo: "PL-2630-2020", "PEC-45-2019"
 */
export function generateCanonicalId(
  type: string,
  number: string | number,
  year: string | number
): string {
  const t = (type || "PL").trim().toUpperCase();
  const n = String(number || "0").trim();
  const y = String(year || "").trim();
  return `${t}-${n}-${y}`;
}

/**
 * Anexa project_id a cada VoteDetailRow usando o mapa voteSessionToProject.
 * Filtra registros sem mapeamento válido.
 */
export function attachProjectIdToVotes(
  votes: VoteDetailRow[],
  voteSessionToProject: Record<number, number>
): VoteDetailWithProject[] {
  return votes
    .map((v) => {
      const projectId = voteSessionToProject[v.vote_session_id];
      if (typeof projectId !== "number") return null;
      return { ...v, project_id: projectId };
    })
    .filter((x): x is VoteDetailWithProject => x !== null);
}
