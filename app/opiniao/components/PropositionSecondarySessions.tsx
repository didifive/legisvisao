"use client";

import { useState, useEffect, useMemo } from "react";
import { cachedFetch } from "@/lib/cache";
import type { VoteSession } from "@/types/db";
import {
  FaChevronDown,
  FaVoteYea,
  FaCheck,
  FaTimes,
  FaQuestionCircle,
  FaTag,
  FaTrashAlt,
} from "react-icons/fa";
import { Skeleton } from "@/app/components/ui/Skeleton";

interface PropositionSecondarySessionsProps {
  propositionId: number;
  primarySessionId?: string | number | null;
  totalNominalSessions?: number;
  nominalSessionIds?: string[];
  isReviewMode?: boolean;
  granularAnswers: Record<string, "CONCORDO" | "DISCORDO">;
  onVote: (sessionId: string, opinion: "CONCORDO" | "DISCORDO") => void;
  onRemoveVote?: (sessionId: string) => void;
}

export function formatSecondarySessionsButtonText(
  isExpanded: boolean,
  secondaryCount: number | undefined,
  answeredCount: number,
  isReviewMode?: boolean
): string {
  if (isExpanded) {
    return isReviewMode ? "Ocultar outras seções" : "Ocultar outras seções votadas";
  }

  const count = secondaryCount ?? 0;
  if (!isReviewMode) {
    if (count > 0) {
      return `Ver outras seções votadas (${count})`;
    }
    return "Ver outras seções votadas";
  }

  if (count <= 0) {
    return "Ver outras seções";
  }

  if (answeredCount === 0) {
    return `Ver outras seções (${count})`;
  }

  if (answeredCount >= count) {
    return `Ver outras seções (${count} • todas opinadas)`;
  }

  const opinadasSuffix = answeredCount === 1 ? "1 opinada" : `${answeredCount} opinadas`;
  return `Ver outras seções (${count} • ${opinadasSuffix})`;
}

export function PropositionSecondarySessions({
  propositionId,
  primarySessionId,
  totalNominalSessions,
  nominalSessionIds,
  isReviewMode,
  granularAnswers,
  onVote,
  onRemoveVote,
}: Readonly<PropositionSecondarySessionsProps>) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [sessions, setSessions] = useState<VoteSession[]>([]);
  const [nominalVotesBySession, setNominalVotesBySession] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Se o total de sessões nominais for 1 ou menos, não existem sessões secundárias com votos nominais
  const hasMultipleNominalSessions =
    totalNominalSessions === undefined || totalNominalSessions > 1;

  useEffect(() => {
    if (!isExpanded || loaded || !hasMultipleNominalSessions) return;

    let mounted = true;
    async function loadSessions() {
      try {
        setLoading(true);
        const data = await cachedFetch(
          `proposition_detail_${propositionId}`,
          () => fetch(`/api/propositions/${propositionId}`).then((r) => r.json())
        );

        if (!mounted) return;
        const fetchedSessions: VoteSession[] = data?.sessions || [];
        const fetchedVotes: Array<{ votacao_id?: string; vote_session_id?: string }> = data?.votes || [];

        const votesMap = new Map<string, number>();
        for (const v of fetchedVotes) {
          const sId = String(v.votacao_id || v.vote_session_id || "");
          if (sId) {
            votesMap.set(sId, (votesMap.get(sId) || 0) + 1);
          }
        }

        setNominalVotesBySession(votesMap);
        setSessions(fetchedSessions);
        setLoaded(true);
      } catch (err) {
        console.error("Erro ao carregar sessões secundárias:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadSessions();

    return () => {
      mounted = false;
    };
  }, [isExpanded, loaded, propositionId, hasMultipleNominalSessions]);

  // Filtra ESTRITAMENTE apenas as sessões que possuem votação nominal (votos de deputados para comparar)
  const secondaryNominalSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (String(s.id) === String(primarySessionId)) return false;
      const votesInSession = nominalVotesBySession.get(String(s.id)) ?? 0;
      return votesInSession > 0;
    });
  }, [sessions, primarySessionId, nominalVotesBySession]);

  let estimatedCount: number | undefined;
  if (totalNominalSessions !== undefined) {
    estimatedCount = Math.max(0, totalNominalSessions - (primarySessionId ? 1 : 0));
  }
  const secondaryCount = loaded ? secondaryNominalSessions.length : estimatedCount;

  // Calcula quantas sessões secundárias o usuário opinou
  const answeredCount = useMemo(() => {
    if (loaded) {
      return secondaryNominalSessions.filter((s) => Boolean(granularAnswers[String(s.id)])).length;
    }
    if (nominalSessionIds && nominalSessionIds.length > 0) {
      return nominalSessionIds.filter((id) => {
        if (String(id) === String(primarySessionId)) return false;
        return Boolean(granularAnswers[String(id)]);
      }).length;
    }
    return 0;
  }, [loaded, secondaryNominalSessions, nominalSessionIds, primarySessionId, granularAnswers]);

  // Se já carregou e verificou que não há sessões secundárias, não exibe
  if (loaded && secondaryNominalSessions.length === 0) {
    return null;
  }

  // Se ainda não carregou mas sabemos que não há secundárias, não exibe
  if (!loaded && totalNominalSessions !== undefined) {
    const minRequired = primarySessionId ? 2 : 1;
    if (totalNominalSessions < minRequired) {
      return null;
    }
  }

  const buttonText = formatSecondarySessionsButtonText(
    isExpanded,
    secondaryCount,
    answeredCount,
    isReviewMode
  );

  return (
    <div className="pt-2 border-t border-border/40 space-y-3">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-xs font-bold text-primary hover:text-primary/80 transition-smooth flex items-center justify-between w-full py-1.5 px-3 rounded-xl bg-primary/5 hover:bg-primary/10 border border-primary/20 cursor-pointer select-none"
      >
        <span className="flex items-center gap-1.5">
          <FaVoteYea className="w-3.5 h-3.5 text-primary shrink-0" />
          <span>{buttonText}</span>
        </span>
        <FaChevronDown
          className={`w-3 h-3 text-primary transition-transform duration-200 ${isExpanded ? "rotate-180" : ""
            }`}
        />
      </button>

      {isExpanded && (
        <div className="space-y-3 pl-2 sm:pl-4 border-l-2 border-primary/20 pt-1 animate-fade-in">
          {loading && (
            <div className="space-y-3 py-2" aria-label="Carregando seções votadas">
              {[1, 2].map((i) => (
                <div key={i} className="p-4 rounded-xl bg-card border border-border/70 space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-28 rounded" />
                    <Skeleton className="h-4 w-16 rounded" />
                  </div>
                  <Skeleton className="h-4 w-4/5 rounded" />
                  <div className="flex gap-2 pt-1">
                    <Skeleton className="h-8 w-24 rounded-lg" />
                    <Skeleton className="h-8 w-24 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && secondaryNominalSessions.length === 0 && (
            <p className="text-xs text-muted-foreground py-2 italic">
              Nenhuma outra seção nominal encontrada para esta proposição.
            </p>
          )}

          {!loading &&
            secondaryNominalSessions.map((session) => {
              const sId = String(session.id);
              const currentVote = granularAnswers[sId];
              const isConcordo = currentVote === "CONCORDO";
              const isDiscordo = currentVote === "DISCORDO";
              const voteDate = session.data_hora
                ? new Date(session.data_hora).toLocaleDateString("pt-BR")
                : null;

              const sessionTitle =
                session.titulo_amigavel ||
                session.descricao ||
                `Votação ${session.id}`;

              return (
                <div
                  key={sId}
                  className="p-3.5 sm:p-4 rounded-xl bg-background border border-border/80 shadow-soft space-y-2.5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1 max-w-xl">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-muted text-foreground border border-border">
                          <FaTag className="w-2.5 h-2.5 text-primary" />
                          <span>{session.tipo_deliberacao || "Destaque / Emenda"}</span>
                        </span>
                        {voteDate && (
                          <span className="text-[11px] text-muted-foreground">
                            {voteDate}
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-foreground leading-snug">
                        {sessionTitle}
                      </h4>
                    </div>

                    {currentVote && (
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${isConcordo
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                          : "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30"
                          }`}
                      >
                        {isConcordo ? (
                          <FaCheck className="w-2.5 h-2.5" />
                        ) : (
                          <FaTimes className="w-2.5 h-2.5" />
                        )}
                        <span>Você opinou: {currentVote}</span>
                      </span>
                    )}
                  </div>

                  {session.resumo_simplificado && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {session.resumo_simplificado}
                    </p>
                  )}

                  {session.descricao && (
                    <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60 text-xs text-muted-foreground leading-relaxed space-y-1">
                      <span className="font-bold text-foreground text-[10px] uppercase tracking-wider block">
                        Texto Oficial da Deliberação:
                      </span>
                      <p>{session.descricao}</p>
                    </div>
                  )}

                  {session.pergunta_cidadao && (
                    <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 text-xs font-semibold text-primary flex items-start gap-1.5">
                      <FaQuestionCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{session.pergunta_cidadao}</span>
                    </div>
                  )}

                  <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border/40">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Sua opinião nesta deliberação:
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onVote(sId, "CONCORDO")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-smooth cursor-pointer ${isConcordo
                          ? "bg-emerald-600 text-white shadow-soft"
                          : "bg-background border border-border text-foreground hover:bg-emerald-600 hover:text-white"
                          }`}
                      >
                        <FaCheck className="w-3 h-3" />
                        <span>CONCORDO</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onVote(sId, "DISCORDO")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-smooth cursor-pointer ${isDiscordo
                          ? "bg-rose-600 text-white shadow-soft"
                          : "bg-background border border-border text-foreground hover:bg-rose-600 hover:text-white"
                          }`}
                      >
                        <FaTimes className="w-3 h-3" />
                        <span>DISCORDO</span>
                      </button>

                      {currentVote && onRemoveVote && (
                        <button
                          type="button"
                          onClick={() => onRemoveVote(sId)}
                          title="Excluir opinião nesta deliberação"
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/20 transition-smooth cursor-pointer ml-0.5"
                        >
                          <FaTrashAlt className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
