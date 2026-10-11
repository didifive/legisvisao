// ====================================================================
// LegisVisão - Ordenação de Afinidade Partidária e Parlamentar
// ====================================================================
import { calculateWilsonScore } from "./evaluateVotes";
import type { PartyMatchResult } from "./types";

export interface SortableParty {
  sigla?: string;
  nome?: string;
  adherence?: number | null;
  matches_count?: number;
  comparable_count?: number;
  match?: PartyMatchResult;
}

export interface SortableDeputy {
  nome_eleitoral?: string;
  nome?: string;
  adherence?: number | null;
  matches_count?: number;
  comparable_count?: number;
}

/**
 * Ordena partidos primariamente pela taxa real de concordância (adherence decrescente).
 * Critérios de desempate:
 * 1. Maior número absoluto de concordâncias (matches_count).
 * 2. Maior volume de comparações válidas (comparable_count).
 * 3. Ordem alfabética determinística (sigla / nome).
 */
export function comparePartyRanking(a: SortableParty, b: SortableParty): number {
  const adhA = a.adherence ?? a.match?.adherence ?? -1;
  const adhB = b.adherence ?? b.match?.adherence ?? -1;
  if (adhB !== adhA) return adhB - adhA;

  const matchesA = a.match?.matches_count ?? a.matches_count ?? 0;
  const matchesB = b.match?.matches_count ?? b.matches_count ?? 0;
  if (matchesB !== matchesA) return matchesB - matchesA;

  const compA = a.match?.comparable_count ?? a.comparable_count ?? 0;
  const compB = b.match?.comparable_count ?? b.comparable_count ?? 0;
  if (compB !== compA) return compB - compA;

  const siglaA = (a.sigla || a.nome || "").toString();
  const siglaB = (b.sigla || b.nome || "").toString();
  return siglaA.localeCompare(siglaB, "pt-BR");
}

/**
 * Ordena deputados primariamente pelo limite inferior do Intervalo de Confiança de Wilson (95%).
 * Equilibra alta taxa com volume comprovado para priorizar mandatos consistentes sobre suplentes isolados.
 * Critérios de desempate:
 * 1. Taxa percentual real (adherence).
 * 2. Maior número absoluto de concordâncias (matches_count).
 * 3. Maior volume de comparações válidas (comparable_count).
 * 4. Ordem alfabética determinística (nome_eleitoral / nome).
 */
export function compareDeputyRanking(a: SortableDeputy, b: SortableDeputy): number {
  const matchesA = a.matches_count ?? 0;
  const compA = a.comparable_count ?? 0;
  const matchesB = b.matches_count ?? 0;
  const compB = b.comparable_count ?? 0;

  const scoreA = calculateWilsonScore(matchesA, compA);
  const scoreB = calculateWilsonScore(matchesB, compB);
  if (Math.abs(scoreB - scoreA) > 0.0001) return scoreB - scoreA;

  const adhA = a.adherence ?? -1;
  const adhB = b.adherence ?? -1;
  if (adhB !== adhA) return adhB - adhA;

  if (matchesB !== matchesA) return matchesB - matchesA;
  if (compB !== compA) return compB - compA;

  const nomeA = (a.nome_eleitoral || a.nome || "").toString();
  const nomeB = (b.nome_eleitoral || b.nome || "").toString();
  return nomeA.localeCompare(nomeB, "pt-BR");
}
