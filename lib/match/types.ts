// ====================================================================
// LegisVisão - Tipos para Cálculo de Afinidade
// ====================================================================
import type { VoteDetailRow, PoliticianSearchResult } from "@/types/db";

export type UserVotes = Record<number, string>;

export type PoliticianMatch = PoliticianSearchResult & {
  matches_count: number;
  comparable_count: number;
  adherence: number | null;
};

export type VoteDetailWithProject = VoteDetailRow & {
  project_id: number;
};

export interface PartyMatchResult {
  matches_count: number;
  comparable_count: number;
  adherence: number | null;
}