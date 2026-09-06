"use client";

import { useEffect, useState, useMemo } from "react";
import { cachedFetch } from "@/lib/cache";
import type { PropositionWithVoteSession } from "@/types/db";
import { Button } from "@/app/components/ui/Button";
import {
  FaChartPie,
  FaSearch,
  FaExclamationTriangle,
  FaSyncAlt,
} from "react-icons/fa";
import { AiFeedbackModal } from "@/app/components/AiFeedbackModal";
import {
  getStoredGranularAnswers,
  saveStoredGranularAnswer,
  removeStoredGranularAnswer,
  StoredGranularAnswers,
  sanitizeStoredAnswers,
} from "@/lib/storage";
import { buildPropositionSessionMapping } from "@/lib/propositionSessionMap";

import { filterAnsweredPropositions } from "./lib/revisaoUtils";
import { AnsweredPropositionCard } from "./components/AnsweredPropositionCard";
import { RevisaoHeader } from "./components/RevisaoHeader";
import { RevisaoSearchBar } from "./components/RevisaoSearchBar";
import { RevisaoEmptyState } from "./components/RevisaoEmptyState";
import { RevisaoSkeleton } from "./components/RevisaoSkeleton";

const PAGE_SIZE = 10;

export default function RevisaoPage() {
  const [propositions, setPropositions] = useState<PropositionWithVoteSession[]>([]);
  const [granularAnswers, setGranularAnswers] = useState<StoredGranularAnswers>({});
  const [loading, setLoading] = useState(true);
  const [feedbackTarget, setFeedbackTarget] = useState<PropositionWithVoteSession | null>(null);

  // Estados de Busca e Filtros
  const [search, setSearch] = useState("");
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  // Estado de Paginação
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const propsData = await cachedFetch<{
          propositions?: PropositionWithVoteSession[];
          projects?: PropositionWithVoteSession[];
        }>("propositions_all", () =>
          fetch("/api/propositions").then((r) => r.json())
        );

        if (!mounted) return;
        const rawList: PropositionWithVoteSession[] = Array.isArray(propsData)
          ? propsData
          : propsData?.propositions || propsData?.projects || [];
        setPropositions(rawList);

        const { validSessionIds, propositionToSessionMap } = buildPropositionSessionMapping(rawList);

        // Sanitização central: converte respostas legadas, expurga simbólicas e limpa storage
        sanitizeStoredAnswers(validSessionIds, propositionToSessionMap);

        setGranularAnswers(getStoredGranularAnswers());
      } catch (err) {
        console.error("Erro ao carregar revisão:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    const handleStorage = () => {
      setGranularAnswers(getStoredGranularAnswers());
    };

    window.addEventListener("storage-answers-updated", handleStorage);
    window.addEventListener("storage", handleStorage);

    return () => {
      mounted = false;
      window.removeEventListener("storage-answers-updated", handleStorage);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const validSessionIds = useMemo(() => {
    return buildPropositionSessionMapping(propositions).validSessionIds;
  }, [propositions]);

  // Lista de proposições respondidas pelo usuário (sessão principal ou secundária)
  const answeredPropositions = useMemo(() => {
    const list: Array<{
      proposition: PropositionWithVoteSession;
      answer: "CONCORDO" | "DISCORDO";
      sessionId: string;
    }> = [];

    for (const p of propositions) {
      const sId = p.vote_session_id ? String(p.vote_session_id) : String(p.id);
      if (granularAnswers[sId]) {
        list.push({ proposition: p, answer: granularAnswers[sId], sessionId: sId });
      } else {
        const secondaryVotedId = p.nominal_session_ids?.find((id) => granularAnswers[id]);
        if (secondaryVotedId) {
          list.push({ proposition: p, answer: granularAnswers[secondaryVotedId], sessionId: secondaryVotedId });
        }
      }
    }

    return list;
  }, [propositions, granularAnswers]);

  // Temas presentes nas proposições respondidas
  const availableThemes = useMemo(() => {
    const themeSet = new Set<string>();
    for (const item of answeredPropositions) {
      if (item.proposition.tema) {
        const parts = item.proposition.tema.split(/[•,]/).map((t) => t.trim()).filter(Boolean);
        for (const part of parts) {
          themeSet.add(part);
        }
      }
    }
    return Array.from(themeSet).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [answeredPropositions]);

  // Situações presentes nas proposições respondidas
  const availableStatus = useMemo(() => {
    const statusSet = new Set<string>();
    for (const item of answeredPropositions) {
      const st = item.proposition.ultimo_status || "Em Tramitação";
      if (st) statusSet.add(st);
    }
    return Array.from(statusSet).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [answeredPropositions]);

  // Anos presentes nas proposições respondidas
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    for (const item of answeredPropositions) {
      const yr = item.proposition.ano;
      if (yr && !Number.isNaN(yr)) yearsSet.add(yr);
    }
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [answeredPropositions]);

  function toggleTheme(th: string) {
    setSelectedThemes((prev) =>
      prev.includes(th) ? prev.filter((e) => e !== th) : [...prev, th]
    );
    setVisibleCount(PAGE_SIZE);
  }

  function toggleStatus(st: string) {
    setSelectedStatus((prev) =>
      prev.includes(st) ? prev.filter((e) => e !== st) : [...prev, st]
    );
    setVisibleCount(PAGE_SIZE);
  }

  function toggleYear(year: number) {
    setSelectedYears((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year]
    );
    setVisibleCount(PAGE_SIZE);
  }

  function resetAllFilters() {
    setSelectedThemes([]);
    setSelectedStatus([]);
    setSelectedYears([]);
    setSearch("");
    setVisibleCount(PAGE_SIZE);
  }

  function handleSearchChange(val: string) {
    setSearch(val);
    setVisibleCount(PAGE_SIZE);
  }

  function handleLoadMore() {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  }

  // Filtragem das proposições respondidas
  const filteredList = useMemo(() => {
    return filterAnsweredPropositions(
      answeredPropositions,
      search,
      selectedThemes,
      selectedStatus,
      selectedYears
    );
  }, [answeredPropositions, search, selectedThemes, selectedStatus, selectedYears]);

  const displayedList = useMemo(() => {
    return filteredList.slice(0, visibleCount);
  }, [filteredList, visibleCount]);

  function handleVoteChange(sessionId: string, opinion: "CONCORDO" | "DISCORDO") {
    saveStoredGranularAnswer(sessionId, opinion);
    setGranularAnswers((prev) => ({ ...prev, [sessionId]: opinion }));
  }

  function handleSecondaryVote(sessionId: string, opinion: "CONCORDO" | "DISCORDO") {
    saveStoredGranularAnswer(sessionId, opinion);
    setGranularAnswers((prev) => ({ ...prev, [sessionId]: opinion }));
  }

  function handleRemoveOpinion(sessionId: string, propositionId?: number) {
    removeStoredGranularAnswer(sessionId, propositionId);
    setGranularAnswers((prev) => {
      const copy = { ...prev };
      delete copy[sessionId];
      if (propositionId) {
        delete copy[String(propositionId)];
      }
      return copy;
    });
  }

  const concordoCount = useMemo(() => {
    return Object.values(granularAnswers).filter((a) => a === "CONCORDO").length;
  }, [granularAnswers]);

  const discordoCount = useMemo(() => {
    return Object.values(granularAnswers).filter((a) => a === "DISCORDO").length;
  }, [granularAnswers]);

  const totalCount = Object.keys(granularAnswers).length;

  const activeFiltersCount = selectedThemes.length + selectedStatus.length + selectedYears.length;

  const nonMeritAnsweredCount = useMemo(() => {
    return answeredPropositions.filter((item) => !item.proposition.is_merit).length;
  }, [answeredPropositions]);

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              Revisão de Opiniões
            </h1>
            <p className="text-muted-foreground text-sm">
              Carregando suas opiniões salvas...
            </p>
          </div>
        </div>
        <RevisaoSkeleton />
      </main>
    );
  }

  if (propositions.length === 0) {
    return (
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <div className="p-8 sm:p-10 rounded-2xl bg-card border border-border text-center space-y-5 shadow-soft max-w-2xl mx-auto animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
            <FaExclamationTriangle className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-foreground">
              Base de proposições em atualização
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
              Os dados oficiais da Câmara dos Deputados estão sendo sincronizados.
            </p>
          </div>
          <div className="flex justify-center pt-2">
            <Button variant="hero" href="/faq">
              <FaSyncAlt className="w-3.5 h-3.5 mr-1.5" />
              Consultar Status & FAQ
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 space-y-8 animate-fade-in">
      <RevisaoHeader
        concordoCount={concordoCount}
        discordoCount={discordoCount}
        totalCount={totalCount}
        nonMeritAnsweredCount={nonMeritAnsweredCount}
      />

      {totalCount === 0 ? (
        <RevisaoEmptyState />
      ) : (
        <>
          <RevisaoSearchBar
            search={search}
            onSearchChange={handleSearchChange}
            showFilterDrawer={showFilterDrawer}
            onToggleFilterDrawer={() => setShowFilterDrawer(!showFilterDrawer)}
            activeFiltersCount={activeFiltersCount}
            availableStatus={availableStatus}
            selectedStatus={selectedStatus}
            onToggleStatus={toggleStatus}
            onResetAllFilters={resetAllFilters}
            availableYears={availableYears}
            selectedYears={selectedYears}
            onToggleYear={toggleYear}
            onClearYears={() => {
              setSelectedYears([]);
              setVisibleCount(PAGE_SIZE);
            }}
            onClearStatus={() => {
              setSelectedStatus([]);
              setVisibleCount(PAGE_SIZE);
            }}
            availableThemes={availableThemes}
            selectedThemes={selectedThemes}
            onToggleTheme={toggleTheme}
            onClearThemes={() => {
              setSelectedThemes([]);
              setVisibleCount(PAGE_SIZE);
            }}
          />

          {/* Indicador de Contagem de Resultados e Botão de Afinidade */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground px-1">
            <span>
              Exibindo{" "}
              <strong className="text-foreground">
                {Math.min(visibleCount, filteredList.length)}
              </strong>{" "}
              de <strong className="text-foreground">{filteredList.length}</strong>{" "}
              {filteredList.length === 1 ? "opinião registrada" : "opiniões registradas"}
            </span>

            <Button
              variant="default"
              size="sm"
              href="/afinidade"
              className="font-bold shadow-soft"
            >
              <FaChartPie className="w-3.5 h-3.5 mr-1.5" />
              Ver Afinidade com Parlamentares
            </Button>
          </div>

          {/* Lista de Cards de Proposições Respondidas */}
          {filteredList.length === 0 ? (
            <div className="p-8 rounded-2xl bg-card border border-border text-center space-y-3">
              <FaSearch className="w-6 h-6 text-muted-foreground mx-auto" />
              <p className="text-sm font-semibold text-foreground">
                Nenhuma resposta encontrada para os filtros aplicados
              </p>
              <button
                type="button"
                onClick={resetAllFilters}
                className="text-xs text-primary hover:underline font-bold cursor-pointer"
              >
                Limpar todos os filtros
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {displayedList.map(({ proposition, answer, sessionId }) => (
                <AnsweredPropositionCard
                  key={proposition.id}
                  proposition={proposition}
                  answer={answer}
                  sessionId={sessionId}
                  validSessionIds={validSessionIds}
                  granularAnswers={granularAnswers}
                  onVoteChange={handleVoteChange}
                  onRemoveOpinion={handleRemoveOpinion}
                  onSecondaryVote={handleSecondaryVote}
                  onRemoveSecondaryVote={handleRemoveOpinion}
                  onOpenFeedback={setFeedbackTarget}
                />
              ))}
            </div>
          )}

          {/* Botão de Paginação Incremental */}
          {visibleCount < filteredList.length && (
            <div className="pt-2 text-center">
              <Button
                variant="outline"
                size="default"
                onClick={handleLoadMore}
                className="w-full sm:w-auto font-bold shadow-soft"
              >
                Ver mais 10 opiniões ({filteredList.length - visibleCount} restantes)
              </Button>
            </div>
          )}
        </>
      )}

      {/* Modal de Relato de Inconsistência em IA */}
      <AiFeedbackModal
        isOpen={Boolean(feedbackTarget)}
        onClose={() => setFeedbackTarget(null)}
        propositionId={feedbackTarget?.id}
        propositionTitle={feedbackTarget?.titulo}
        sessionId={feedbackTarget?.vote_session_id}
        sessionTitle={feedbackTarget?.titulo_amigavel || feedbackTarget?.vote_session_description || undefined}
        reportedSummary={feedbackTarget?.resumo_geral || feedbackTarget?.resumo_simplificado || feedbackTarget?.ementa || undefined}
      />
    </main>
  );
}
