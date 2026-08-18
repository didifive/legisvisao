// ====================================================================
// LegisVisão - Vinculação de Sessões a Proposições
// ====================================================================
import type { VoteDetailWithProposition } from "./types";

export interface RawDeputyVoteInput {
  deputado_id: number;
  votacao_id: string;
  voto_original: string;
  sigla_partido?: string | null;
}

/**
 * Anexa proposicao_id a cada voto usando o mapa voteSessionToProposition.
 */
export function attachPropositionIdToVotes(
  votes: RawDeputyVoteInput[],
  voteSessionToProposition: Record<string, number>
): VoteDetailWithProposition[] {
  const result: VoteDetailWithProposition[] = [];
  for (const v of votes) {
    const propId = voteSessionToProposition[v.votacao_id];
    if (typeof propId === "number") {
      result.push({
        deputado_id: v.deputado_id,
        proposicao_id: propId,
        voto_original: v.voto_original,
        sigla_partido: v.sigla_partido,
      });
    }
  }
  return result;
}
