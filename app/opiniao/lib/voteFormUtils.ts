import type { PropositionWithVoteSession } from "@/types/db";
import type { StoredGranularAnswers } from "@/lib/storage";
import { sortPropositionsByRelevance } from "@/lib/match/classifyVoteSession";
import type { SortOption } from "../types";

export function mulberry32(seed: number) {
  return function () {
    let s = Math.trunc(seed);
    s = Math.trunc(s + 0x6d2b79f5);
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleDeterministic<T>(array: T[], seed: number): T[] {
  const rand = mulberry32(seed);
  const arr = [...array];

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}

export function matchesPropositionSearch(p: PropositionWithVoteSession, q: string): boolean {
  return (
    p.titulo.toLowerCase().includes(q) ||
    Boolean(p.titulo_amigavel?.toLowerCase().includes(q)) ||
    Boolean(p.resumo_geral?.toLowerCase().includes(q)) ||
    Boolean(p.ementa?.toLowerCase().includes(q)) ||
    Boolean(p.tema?.toLowerCase().includes(q))
  );
}

export function sortPropositionsList(
  list: PropositionWithVoteSession[],
  sortBy: SortOption
): PropositionWithVoteSession[] {
  if (sortBy === "relevance") {
    return sortPropositionsByRelevance(list);
  }
  const factor = sortBy === "recent" ? -1 : 1;
  return [...list].sort((a, b) => {
    const timeA = a.vote_session_date ? new Date(a.vote_session_date).getTime() : 0;
    const timeB = b.vote_session_date ? new Date(b.vote_session_date).getTime() : 0;
    return factor * (timeB - timeA) || factor * (b.id - a.id);
  });
}

export function getSituacaoBadgeClass(isAprovado: boolean, isEncerrado: boolean): string {
  if (isAprovado) {
    return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
  }
  if (isEncerrado) {
    return "bg-rose-500/10 text-rose-600 border-rose-500/20";
  }
  return "bg-secondary/10 text-secondary border-secondary/20";
}

export function getUnvotedCardStatus(status: string | null | undefined) {
  const situacaoAtual = status || "Em Tramitação";
  const lower = situacaoAtual.toLowerCase();
  const isAprovado =
    lower.includes("aprovad") ||
    lower.includes("lei") ||
    lower.includes("norma");
  const isEncerrado =
    lower.includes("arquivad") ||
    lower.includes("rejeitad") ||
    lower.includes("encerrad");

  return { situacaoAtual, isAprovado, isEncerrado };
}

export function getUnvotedCardVoteMeta(
  granularAnswers: StoredGranularAnswers,
  p: PropositionWithVoteSession
) {
  const primarySessionKey = p.vote_session_id ? String(p.vote_session_id) : String(p.id);
  const primaryVote = granularAnswers[primarySessionKey] ?? granularAnswers[String(p.id)];
  const isConcordo = primaryVote === "CONCORDO";
  const isDiscordo = primaryVote === "DISCORDO";
  const quorum = Number(p.total_sim || 0) + Number(p.total_nao || 0) + Number(p.total_outros || 0);
  const hasNominalPrimaryVotes = Boolean(
    p.is_merit && (Number(p.total_sim || 0) + Number(p.total_nao || 0) > 0)
  );

  return {
    primarySessionKey,
    primaryVote,
    isConcordo,
    isDiscordo,
    quorum,
    hasNominalPrimaryVotes,
  };
}

export function isPropositionUnvoted(
  p: PropositionWithVoteSession,
  answers: StoredGranularAnswers
): boolean {
  const hasNominalPrimary =
    p.is_merit && (Number(p.total_sim || 0) + Number(p.total_nao || 0) > 0);
  const primarySessionId = p.vote_session_id
    ? String(p.vote_session_id)
    : String(p.id);

  if (hasNominalPrimary) {
    return !answers[primarySessionId];
  }

  const nominalSessions = p.nominal_session_ids ?? [];
  if (nominalSessions.length > 0) {
    return !nominalSessions.every((id) => answers[id]);
  }

  return true;
}

export function filterPropositions(
  unvotedList: PropositionWithVoteSession[],
  search: string,
  selectedThemes: string[],
  selectedStatus: string[],
  selectedYears: number[],
  sortBy: SortOption,
  shuffle: boolean
): PropositionWithVoteSession[] {
  let list = [...unvotedList];

  // Filtro por busca de texto
  if (search.trim()) {
    const q = search.toLowerCase();
    list = list.filter((p) => matchesPropositionSearch(p, q));
  }

  // Filtro por temas oficiais
  if (selectedThemes.length > 0) {
    list = list.filter((p) => {
      if (!p.tema) return false;
      const pThemes = new Set(p.tema.split(/[•,]/).map((t) => t.trim()).filter(Boolean));
      return selectedThemes.some((th) => pThemes.has(th));
    });
  }

  // Filtro por situação
  if (selectedStatus.length > 0) {
    list = list.filter((p) => {
      const st = p.ultimo_status || "Em Tramitação";
      return selectedStatus.includes(st);
    });
  }

  // Filtro por anos
  if (selectedYears.length > 0) {
    list = list.filter((p) => selectedYears.includes(p.ano));
  }

  if (!shuffle) {
    list = sortPropositionsList(list, sortBy);
  }

  return list;
}
