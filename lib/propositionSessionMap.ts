// ====================================================================
// LegisVisão - Mapeamento e Normalização de Sessões de Votação
// ====================================================================

import type { PropositionWithVoteSession } from "@/types/db";

export interface PropositionSessionMapping {
  validSessionIds: Set<string>;
  propositionToSessionMap: Record<number, string>;
  sessionToPropMap: Map<string, number>;
}

/**
 * Constrói de forma padronizada os conjuntos e mapas de identificadores
 * de sessões nominais válidas a partir da lista de proposições.
 */
export function buildPropositionSessionMapping(
  propositions: PropositionWithVoteSession[]
): PropositionSessionMapping {
  const validSessionIds = new Set<string>();
  const propositionToSessionMap: Record<number, string> = {};
  const sessionToPropMap = new Map<string, number>();

  if (!Array.isArray(propositions)) {
    return {
      validSessionIds,
      propositionToSessionMap,
      sessionToPropMap,
    };
  }

  for (const p of propositions) {
    const sId = p.vote_session_id ? String(p.vote_session_id) : String(p.id);

    if (p.is_merit !== false) {
      validSessionIds.add(sId);
      propositionToSessionMap[p.id] = sId;
      sessionToPropMap.set(sId, p.id);
    }

    if (Array.isArray(p.nominal_session_ids)) {
      for (const nomId of p.nominal_session_ids) {
        if (nomId) {
          const s = String(nomId);
          validSessionIds.add(s);
          sessionToPropMap.set(s, p.id);
        }
      }
    }
  }

  return {
    validSessionIds,
    propositionToSessionMap,
    sessionToPropMap,
  };
}
