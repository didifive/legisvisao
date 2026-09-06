import type { VoteSession } from "@/types/db";
import { normalizeVote } from "@/lib/match/normalizeVotes";
import { sortVoteSessionsDeterministic } from "@/lib/match/classifyVoteSession";
import type {
  RawVote,
  ClassifiedVoteSession,
  VoteStats,
  AvailableFilters,
  PropositionStatusInfo,
} from "../types";

export function matchesVoteType(votoOriginal: string, voteType: string): boolean {
  if (voteType === "ALL") return true;
  const norm = normalizeVote(votoOriginal);
  if (voteType === "SIM") return norm === "SIM";
  if (voteType === "NAO") return norm === "NÃO";
  if (voteType === "OUTROS") return norm === null;
  return true;
}

export function matchesVoteFilter(
  v: RawVote,
  search: string,
  party: string,
  state: string,
  voteType: string
): boolean {
  if (search && !v.deputado_nome?.toLowerCase().includes(search.toLowerCase())) {
    return false;
  }
  if (party !== "ALL" && v.sigla_partido?.toUpperCase() !== party) {
    return false;
  }
  if (state !== "ALL" && v.deputado_uf?.toUpperCase() !== state) {
    return false;
  }
  return matchesVoteType(v.voto_original, voteType);
}

export function getHeaderStatusBadgeClass(isAprovado: boolean, isArquivado: boolean): string {
  if (isAprovado) {
    return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
  }
  if (isArquivado) {
    return "bg-rose-500/10 text-rose-600 border-rose-500/20";
  }
  return "bg-amber-500/10 text-amber-600 border-amber-500/20";
}

export function getVoteBadgeClass(isSim: boolean, isNao: boolean): string {
  if (isSim) {
    return "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30";
  }
  if (isNao) {
    return "bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30";
  }
  return "bg-muted text-muted-foreground border border-border";
}

export function getSessionResultadoBadgeClass(resultado: string | null | undefined): string {
  if (resultado?.toLowerCase().includes("aprovad")) {
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
  }
  return "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30";
}

export function getUserVoteBadgeClass(opinion: "CONCORDO" | "DISCORDO" | undefined): string {
  if (opinion === "CONCORDO") {
    return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
  }
  return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30";
}

export function getVoteButtonClass(
  userChoice: "CONCORDO" | "DISCORDO" | undefined,
  target: "CONCORDO" | "DISCORDO"
): string {
  const isSelected = userChoice === target;
  if (target === "CONCORDO") {
    return isSelected
      ? "bg-emerald-600 text-white ring-2 ring-emerald-600/40"
      : "bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white";
  }
  return isSelected
    ? "bg-rose-600 text-white ring-2 ring-rose-600/40"
    : "bg-rose-600/20 text-rose-700 dark:text-rose-300 hover:bg-rose-600 hover:text-white";
}

export function getPrimarySession(
  sessions: VoteSession[],
  votesBySession: Map<string, RawVote[]>
): ClassifiedVoteSession | null {
  const deterministicList = sortVoteSessionsDeterministic(
    sessions.map((s) => ({
      ...s,
      votesCount: (votesBySession.get(s.id) ?? []).length,
      votes: votesBySession.get(s.id) ?? [],
    }))
  );
  const candidate = deterministicList[0];
  if (
    candidate?.classification.type === "MERITO" &&
    candidate.classification.priority === 1 &&
    (candidate.votesCount ?? 0) > 0
  ) {
    return candidate;
  }
  return null;
}

export function calculateActiveVoteStats(activeSessionVotes: RawVote[]): VoteStats {
  let sim = 0;
  let nao = 0;
  let outros = 0;

  for (const v of activeSessionVotes) {
    const norm = normalizeVote(v.voto_original);
    if (norm === "SIM") sim++;
    else if (norm === "NÃO") nao++;
    else outros++;
  }

  const total = sim + nao + outros;
  const simPct = total > 0 ? Math.round((sim / total) * 100) : 0;
  const naoPct = total > 0 ? Math.round((nao / total) * 100) : 0;
  const outrosPct = total > 0 ? Math.round((outros / total) * 100) : 0;

  return { sim, nao, outros, total, simPct, naoPct, outrosPct };
}

export function getAvailableFilters(activeSessionVotes: RawVote[]): AvailableFilters {
  const pSet = new Set<string>();
  const sSet = new Set<string>();
  for (const v of activeSessionVotes) {
    if (v.sigla_partido) pSet.add(v.sigla_partido.toUpperCase());
    if (v.deputado_uf) sSet.add(v.deputado_uf.toUpperCase());
  }
  return {
    availableParties: Array.from(pSet).sort((a, b) => a.localeCompare(b, "pt-BR")),
    availableStates: Array.from(sSet).sort((a, b) => a.localeCompare(b, "pt-BR")),
  };
}

export function getPropositionStatusInfo(
  ultimoStatus: string | null = "Em Tramitação"
): PropositionStatusInfo {
  const situacaoAtual = ultimoStatus ?? "Em Tramitação";
  const lower = situacaoAtual.toLowerCase();
  const isAprovado =
    lower.includes("aprovad") ||
    lower.includes("transformad") ||
    lower.includes("norma");
  const isArquivado =
    lower.includes("arquivad") ||
    lower.includes("rejeitad") ||
    lower.includes("encerrad");
  return { situacaoAtual, isAprovado, isArquivado };
}
