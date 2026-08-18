// ====================================================================
// LegisVisão - Tipos para Cálculo de Afinidade
// ====================================================================
import type { DeputySearchResult } from "@/types/db";

export type UserVotes = Record<number, string>;

export interface VoteDetailWithProposition {
  deputado_id: number;
  proposicao_id: number;
  voto_original: string;
  sigla_partido?: string | null;
}

export type DeputyMatch = DeputySearchResult & {
  matches_count: number;
  comparable_count: number;
  adherence: number | null;
};

export interface PartyMatchResult {
  matches_count: number;
  comparable_count: number;
  adherence: number | null;
}