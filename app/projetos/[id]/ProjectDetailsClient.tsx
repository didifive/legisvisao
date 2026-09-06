"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  FaArrowLeft,
  FaVoteYea,
  FaQuestionCircle,
} from "react-icons/fa";
import { AiFeedbackModal } from "@/app/components/AiFeedbackModal";
import type { VoteSession } from "@/types/db";
import {
  getStoredGranularAnswers,
  saveStoredGranularAnswer,
  removeStoredGranularAnswer,
  StoredGranularAnswers,
} from "@/lib/storage";
import { sortVoteSessionsDeterministic } from "@/lib/match/classifyVoteSession";

import type { RawVote, ProjectDetailsClientProps } from "../types";
import {
  getPrimarySession,
  calculateActiveVoteStats,
  getAvailableFilters,
  getPropositionStatusInfo,
  matchesVoteFilter,
} from "../lib/projectUtils";
import { ProjectOverviewCard } from "../components/ProjectOverviewCard";
import { SessionsSelectorGrid } from "../components/SessionsSelectorGrid";
import { ActiveSessionDetailCard } from "../components/ActiveSessionDetailCard";

export default function ProjectDetailsClient({
  proposition,
  sessions,
  votes,
}: Readonly<ProjectDetailsClientProps>) {
  const [granularAnswers, setGranularAnswers] = useState<StoredGranularAnswers>({});
  const [voteSearch, setVoteSearch] = useState("");
  const [filterParty, setFilterParty] = useState<string>("ALL");
  const [filterState, setFilterState] = useState<string>("ALL");
  const [filterVoteType, setFilterVoteType] = useState<string>("ALL");
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [showVotesList, setShowVotesList] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackSession, setFeedbackSession] = useState<VoteSession | null>(null);

  useEffect(() => {
    setGranularAnswers(getStoredGranularAnswers());

    const handleStorageUpdate = () => {
      setGranularAnswers(getStoredGranularAnswers());
    };

    window.addEventListener("storage-answers-updated", handleStorageUpdate);
    window.addEventListener("storage", handleStorageUpdate);

    return () => {
      window.removeEventListener("storage-answers-updated", handleStorageUpdate);
      window.removeEventListener("storage", handleStorageUpdate);
    };
  }, []);

  function handleSessionVote(sessionId: string, opinion: "CONCORDO" | "DISCORDO") {
    saveStoredGranularAnswer(sessionId, opinion);
    setGranularAnswers(getStoredGranularAnswers());
  }

  function handleRemoveSessionVote(sessionId: string) {
    removeStoredGranularAnswer(sessionId, proposition.id);
    setGranularAnswers(getStoredGranularAnswers());
  }

  // Agrupa votos nominais por ID de sessão de votação
  const votesBySession = useMemo(() => {
    const map = new Map<string, RawVote[]>();
    for (const v of votes) {
      const arr = map.get(v.votacao_id) ?? [];
      arr.push(v);
      map.set(v.votacao_id, arr);
    }
    return map;
  }, [votes]);

  // Classifica e ordena todas as sessões de votação por ordem cronológica decrescente
  const classifiedSessions = useMemo(() => {
    const list = sessions.map((s) => {
      const sessionVotes = votesBySession.get(s.id) ?? [];
      return {
        ...s,
        votesCount: sessionVotes.length,
        votes: sessionVotes,
      };
    });

    // Atribui as classificações oficiais (Mérito, Destaque, Emenda, etc.)
    const classified = sortVoteSessionsDeterministic(list);

    // Ordenação por tempo decrescente (deliberações mais recentes primeiro)
    return classified.sort((a, b) => {
      const dateA = a.data_hora ? new Date(a.data_hora).getTime() : 0;
      const dateB = b.data_hora ? new Date(b.data_hora).getTime() : 0;
      if (dateB !== dateA) return dateB - dateA;
      return b.id.localeCompare(a.id);
    });
  }, [sessions, votesBySession]);

  // Define a sessão principal de mérito (utilizada no cálculo de afinidade: eleita pelo classificador determinístico)
  const primarySession = useMemo(() => {
    return getPrimarySession(sessions, votesBySession);
  }, [sessions, votesBySession]);

  // Inicializa selectedSessionId com a sessão principal (ou a primeira com votos)
  useEffect(() => {
    if (!selectedSessionId) {
      if (primarySession) {
        setSelectedSessionId(primarySession.id);
      } else if (classifiedSessions.length > 0) {
        const firstWithVotes = classifiedSessions.find((s) => s.votesCount > 0);
        setSelectedSessionId((firstWithVotes ?? classifiedSessions[0]).id);
      }
    }
  }, [primarySession, selectedSessionId, classifiedSessions]);

  // Sessão atualmente ativa para inspeção
  const activeSession = useMemo(() => {
    return (
      classifiedSessions.find((s) => s.id === selectedSessionId) ??
      primarySession ??
      classifiedSessions[0] ??
      null
    );
  }, [classifiedSessions, selectedSessionId, primarySession]);

  // Votos pertencentes estritamente à sessão ativa
  const activeSessionVotes = useMemo(() => {
    if (!activeSession) return [];
    return votesBySession.get(activeSession.id) ?? [];
  }, [activeSession, votesBySession]);

  // Lista de Partidos e Estados disponíveis na sessão ativa
  const { availableParties, availableStates } = useMemo(() => {
    return getAvailableFilters(activeSessionVotes);
  }, [activeSessionVotes]);

  // Estatísticas de Votação da Sessão Ativa
  const activeVoteStats = useMemo(() => {
    return calculateActiveVoteStats(activeSessionVotes);
  }, [activeSessionVotes]);

  // Votos filtrados da sessão ativa com complexidade cognitiva reduzida
  const filteredVotes = useMemo(() => {
    return activeSessionVotes.filter((v) =>
      matchesVoteFilter(v, voteSearch, filterParty, filterState, filterVoteType)
    );
  }, [activeSessionVotes, voteSearch, filterParty, filterState, filterVoteType]);

  const presentationDate = proposition.data_apresentacao
    ? new Date(proposition.data_apresentacao).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
    : null;

  const activeDateFormatted = activeSession?.data_hora
    ? new Date(activeSession.data_hora).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
    : null;

  const { situacaoAtual, isAprovado, isArquivado } = getPropositionStatusInfo(proposition.ultimo_status);

  const isPrimaryActive = activeSession?.id === primarySession?.id;
  const hasAiOverview = Boolean(
    proposition.resumo_geral ??
    primarySession?.resumo_simplificado ??
    primarySession?.titulo_amigavel
  );

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-8 animate-fade-in">
      {/* Navegação de Retorno */}
      <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
        <Link
          href="/opiniao"
          className="hover:text-primary transition-smooth flex items-center gap-1.5"
        >
          <FaArrowLeft className="w-3 h-3" />
          <span>Voltar para Votação</span>
        </Link>
        <span>/</span>
        <span className="text-foreground font-semibold">Detalhes do Projeto</span>
      </div>

      {/* Cartão de Cabeçalho do Projeto */}
      <ProjectOverviewCard
        proposition={proposition}
        situacaoAtual={situacaoAtual}
        isAprovado={isAprovado}
        isArquivado={isArquivado}
        presentationDate={presentationDate}
        hasAiOverview={hasAiOverview}
        primarySession={primarySession}
        onOpenFeedback={() => {
          setFeedbackSession(null);
          setIsFeedbackOpen(true);
        }}
      />

      {/* Painel Unificado de Deliberações do Plenário (Ordem Cronológica Decrescente) */}
      {classifiedSessions.length > 0 ? (
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <FaVoteYea className="text-primary w-5 h-5" />
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Deliberações no Plenário
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {classifiedSessions.length} {classifiedSessions.length === 1 ? "deliberação registrada" : "deliberações registradas"}
              </span>
              <Link
                href="/faq#multiplas-votacoes"
                title="Entenda como funcionam as múltiplas votações e o que é usado no cálculo"
                className="text-muted-foreground hover:text-primary transition-smooth text-xs flex items-center gap-1"
              >
                <FaQuestionCircle className="w-3.5 h-3.5" />
                <span className="sr-only">Explicação sobre múltiplas votações</span>
              </Link>
            </div>
          </div>

          {/* Seletor de Sessões de Votação (Abas / Botões em Ordem Cronológica Decrescente) */}
          {classifiedSessions.length > 1 && (
            <SessionsSelectorGrid
              sessions={classifiedSessions}
              activeSessionId={activeSession?.id}
              primarySessionId={primarySession?.id}
              granularAnswers={granularAnswers}
              onSelectSession={setSelectedSessionId}
            />
          )}

          {/* Detalhe da Sessão Ativa & Placar */}
          {activeSession && (
            <ActiveSessionDetailCard
              activeSession={activeSession}
              isPrimaryActive={isPrimaryActive}
              activeDateFormatted={activeDateFormatted}
              granularAnswers={granularAnswers}
              activeVoteStats={activeVoteStats}
              showVotesList={showVotesList}
              filteredVotes={filteredVotes}
              activeSessionVotes={activeSessionVotes}
              voteSearch={voteSearch}
              filterParty={filterParty}
              filterState={filterState}
              filterVoteType={filterVoteType}
              availableParties={availableParties}
              availableStates={availableStates}
              onToggleShowVotesList={() => setShowVotesList(!showVotesList)}
              onSessionVote={handleSessionVote}
              onRemoveSessionVote={handleRemoveSessionVote}
              onOpenFeedback={(session) => {
                setFeedbackSession(session);
                setIsFeedbackOpen(true);
              }}
              onSearchChange={setVoteSearch}
              onPartyChange={setFilterParty}
              onStateChange={setFilterState}
              onVoteTypeChange={setFilterVoteType}
              onResetFilters={() => {
                setVoteSearch("");
                setFilterParty("ALL");
                setFilterState("ALL");
                setFilterVoteType("ALL");
              }}
            />
          )}
        </section>
      ) : (
        <div className="p-8 rounded-2xl bg-card border border-border text-center space-y-3 shadow-soft">
          <FaVoteYea className="w-8 h-8 text-muted-foreground mx-auto" />
          <h3 className="text-base font-bold text-foreground">
            Sem deliberações registradas
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Esta proposta ainda não possui registros de deliberação no Plenário da Câmara.
          </p>
        </div>
      )}

      {/* Modal de Relato de Inconsistência em IA */}
      <AiFeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => {
          setIsFeedbackOpen(false);
          setFeedbackSession(null);
        }}
        propositionId={proposition.id}
        propositionTitle={proposition.titulo}
        sessionId={feedbackSession?.id ?? primarySession?.id}
        sessionTitle={
          feedbackSession?.titulo_amigavel ??
          feedbackSession?.descricao ??
          primarySession?.titulo_amigavel ??
          primarySession?.descricao
        }
        reportedSummary={
          feedbackSession?.resumo_simplificado ??
          proposition.resumo_geral ??
          primarySession?.resumo_simplificado ??
          proposition.ementa
        }
      />
    </main>
  );
}
