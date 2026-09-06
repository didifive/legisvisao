import type { PropositionWithVoteSession } from "@/types/db";
import type { StoredGranularAnswers } from "@/lib/storage";
import type { CardStatusBooleans, CardPrimaryVoteMeta } from "../types";

export function getRevisaoStatusBadgeClass(isAprovado: boolean, isEncerrado: boolean): string {
  if (isAprovado) {
    return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
  }
  if (isEncerrado) {
    return "bg-rose-500/10 text-rose-600 border-rose-500/20";
  }
  return "bg-secondary/10 text-secondary border-secondary/20";
}

export function getCardStatusBooleans(status: string | null = "Em Tramitação"): CardStatusBooleans {
  const situacaoAtual = status ?? "Em Tramitação";
  const sLower = situacaoAtual.toLowerCase();
  const isAprovado =
    sLower.includes("aprovad") ||
    sLower.includes("transformad") ||
    sLower.includes("norma");
  const isEncerrado =
    sLower.includes("arquivad") ||
    sLower.includes("rejeitad") ||
    sLower.includes("encerrad");
  return { situacaoAtual, isAprovado, isEncerrado };
}

export function getCardPrimaryVoteMeta(
  proposition: PropositionWithVoteSession,
  _answer: "CONCORDO" | "DISCORDO" | undefined,
  validSessionIds: Set<string>,
  granularAnswers: StoredGranularAnswers,
  sessionId: string
): CardPrimaryVoteMeta {
  const primarySessionIdStr = proposition.vote_session_id ? String(proposition.vote_session_id) : null;
  const isPrimaryNominal =
    proposition.is_merit !== false &&
    (!primarySessionIdStr || !validSessionIds.size || validSessionIds.has(primarySessionIdStr));

  // A deliberação principal só possui voto se o usuário tiver opinado especificamente nela
  // ou no identificador da proposição (formato legado), nunca herdando de sessões secundárias
  const primaryOpinion =
    (primarySessionIdStr ? granularAnswers[primarySessionIdStr] : null) ??
    granularAnswers[String(proposition.id)];

  const hasPrimaryVote = Boolean(primaryOpinion);
  const isPrimaryConcordo = primaryOpinion === "CONCORDO";
  const primaryTargetSessionId = primarySessionIdStr || sessionId;

  return {
    isPrimaryNominal,
    hasPrimaryVote,
    primaryOpinion,
    isPrimaryConcordo,
    primaryTargetSessionId,
  };
}

export function filterAnsweredPropositions(
  answeredPropositions: Array<{
    proposition: PropositionWithVoteSession;
    answer: "CONCORDO" | "DISCORDO";
    sessionId: string;
  }>,
  search: string,
  selectedThemes: string[],
  selectedStatus: string[],
  selectedYears: number[]
): Array<{
  proposition: PropositionWithVoteSession;
  answer: "CONCORDO" | "DISCORDO";
  sessionId: string;
}> {
  let list = [...answeredPropositions];

  if (search.trim()) {
    const q = search.toLowerCase();
    list = list.filter(
      (item) =>
        item.proposition.titulo.toLowerCase().includes(q) ||
        item.proposition.titulo_amigavel?.toLowerCase().includes(q) ||
        item.proposition.resumo_geral?.toLowerCase().includes(q) ||
        item.proposition.ementa?.toLowerCase().includes(q) ||
        item.proposition.tema?.toLowerCase().includes(q)
    );
  }

  if (selectedThemes.length > 0) {
    list = list.filter((item) => {
      if (!item.proposition.tema) return false;
      const pThemes = new Set(
        item.proposition.tema.split(/[•,]/).map((t) => t.trim()).filter(Boolean)
      );
      return selectedThemes.some((th) => pThemes.has(th));
    });
  }

  if (selectedStatus.length > 0) {
    list = list.filter((item) => {
      const st = item.proposition.ultimo_status || "Em Tramitação";
      return selectedStatus.includes(st);
    });
  }

  if (selectedYears.length > 0) {
    list = list.filter((item) => selectedYears.includes(item.proposition.ano));
  }

  list.sort((a, b) => {
    const da = (p: PropositionWithVoteSession) => {
      const dateStr = p.vote_session_date || p.data_apresentacao;
      return dateStr ? new Date(dateStr).getTime() : 0;
    };
    return da(b.proposition) - da(a.proposition);
  });

  return list;
}
