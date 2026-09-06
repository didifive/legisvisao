"use client";

import { useEffect, useState, useMemo } from "react";
import { cachedFetch } from "@/lib/cache";
import type { PropositionWithVoteSession } from "@/types/db";
import {
  FaVoteYea,
} from "react-icons/fa";
import { AiFeedbackModal } from "@/app/components/AiFeedbackModal";
import {
  getStoredGranularAnswers,
  saveStoredGranularAnswer,
  removeStoredGranularAnswer,
  StoredGranularAnswers,
  sanitizeStoredAnswers,
  getStoredAnswersCount,
} from "@/lib/storage";
import { buildPropositionSessionMapping } from "@/lib/propositionSessionMap";

import type { SortOption } from "../types";
import {
  shuffleDeterministic,
  isPropositionUnvoted,
  filterPropositions,
} from "../lib/voteFormUtils";
import { VoteFormToast } from "./VoteFormToast";
import { VoteFormEmptyState } from "./VoteFormEmptyState";
import { VoteFormFilterPanel } from "./VoteFormFilterPanel";
import { UnvotedPropositionCard } from "./UnvotedPropositionCard";
import { VoteFormSkeleton } from "./VoteFormSkeleton";

export default function VoteForm() {
  const [propositions, setPropositions] = useState<PropositionWithVoteSession[]>([]);
  const [granularAnswers, setGranularAnswers] = useState<StoredGranularAnswers>({});
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState<SortOption>("relevance");
  const [shuffle, setShuffle] = useState(false);
  const [seed, setSeed] = useState<number | null>(null);
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [includeNonMerit, setIncludeNonMerit] = useState(false);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [feedbackTarget, setFeedbackTarget] = useState<PropositionWithVoteSession | null>(null);
  const [toast, setToast] = useState<{ propositionTitle: string } | null>(null);

  // Carregar proposições + opiniões existentes
  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        const data = await cachedFetch<{
          propositions?: PropositionWithVoteSession[];
          projects?: PropositionWithVoteSession[];
        }>("propositions_list", () =>
          fetch("/api/propositions").then((r) => r.json())
        );
        if (mounted) {
          const list: PropositionWithVoteSession[] = Array.isArray(data)
            ? data
            : data?.propositions || data?.projects || [];
          const { validSessionIds, propositionToSessionMap } = buildPropositionSessionMapping(list);
          sanitizeStoredAnswers(validSessionIds, propositionToSessionMap);
          setPropositions(list);
          setGranularAnswers(getStoredGranularAnswers());
        }
      } catch (err) {
        console.error("Erro ao carregar propostas:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();

    const handleStorageUpdate = () => {
      setGranularAnswers(getStoredGranularAnswers());
    };

    window.addEventListener("storage-answers-updated", handleStorageUpdate);
    window.addEventListener("storage", handleStorageUpdate);

    return () => {
      mounted = false;
      window.removeEventListener("storage-answers-updated", handleStorageUpdate);
      window.removeEventListener("storage", handleStorageUpdate);
    };
  }, []);

  // Opções únicas para filtros
  const availableThemes = useMemo(() => {
    const set = new Set<string>();
    for (const p of propositions) {
      if (p.tema) {
        p.tema.split(/[•,]/).forEach((t) => {
          const clean = t.trim();
          if (clean) set.add(clean);
        });
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [propositions]);

  const availableStatus = useMemo(() => {
    const set = new Set<string>();
    for (const p of propositions) {
      if (p.ultimo_status) set.add(p.ultimo_status);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [propositions]);

  const availableYears = useMemo(() => {
    const set = new Set<number>();
    for (const p of propositions) {
      if (p.ano) set.add(p.ano);
    }
    return Array.from(set).sort((a, b) => b - a);
  }, [propositions]);

  // Contagem de respostas armazenadas
  const opinionsCount = useMemo(() => {
    return getStoredAnswersCount();
  }, [granularAnswers]);

  // Filtra as matérias que ainda precisam de opinião do cidadão
  const unvotedPropositions = useMemo(() => {
    return propositions.filter((p) => {
      if (!includeNonMerit && !p.is_merit) {
        return false;
      }
      return isPropositionUnvoted(p, granularAnswers);
    });
  }, [propositions, granularAnswers, includeNonMerit]);

  // Aplica filtros de texto, ano, temas e ordenação
  const filteredPropositions = useMemo(() => {
    const list = filterPropositions(
      unvotedPropositions,
      search,
      selectedThemes,
      selectedStatus,
      selectedYears,
      sortBy,
      shuffle
    );

    if (shuffle && seed !== null) {
      return shuffleDeterministic(list, seed);
    }

    return list;
  }, [
    unvotedPropositions,
    search,
    selectedThemes,
    selectedStatus,
    selectedYears,
    sortBy,
    shuffle,
    seed,
  ]);

  const displayedPropositions = useMemo(() => {
    return filteredPropositions.slice(0, limit);
  }, [filteredPropositions, limit]);

  // Handlers de Voto
  const handleVote = (p: PropositionWithVoteSession, opinion: "CONCORDO" | "DISCORDO") => {
    const targetSessionId = p.vote_session_id
      ? String(p.vote_session_id)
      : String(p.id);

    saveStoredGranularAnswer(targetSessionId, opinion);
    setGranularAnswers(getStoredGranularAnswers());

    setToast({
      propositionTitle: p.titulo_amigavel || p.titulo,
    });
  };

  const handleSecondaryVote = (
    p: PropositionWithVoteSession,
    sessionId: string,
    opinion: "CONCORDO" | "DISCORDO"
  ) => {
    saveStoredGranularAnswer(sessionId, opinion);
    setGranularAnswers(getStoredGranularAnswers());

    setToast({
      propositionTitle: `${p.sigla_tipo} ${p.numero}/${p.ano} (Deliberação ${sessionId})`,
    });
  };

  const handleRemoveVote = (p: PropositionWithVoteSession) => {
    const targetSessionId = p.vote_session_id
      ? String(p.vote_session_id)
      : String(p.id);

    removeStoredGranularAnswer(targetSessionId, p.id);
    setGranularAnswers(getStoredGranularAnswers());
  };

  const handleRemoveSecondaryVote = (sessionId: string) => {
    removeStoredGranularAnswer(sessionId);
    setGranularAnswers(getStoredGranularAnswers());
  };

  const handleShuffleToggle = (val: boolean) => {
    setShuffle(val);
    if (val) {
      setSeed(Date.now());
    } else {
      setSeed(null);
    }
  };

  const toggleFilter = (item: string, list: string[], setList: (v: string[]) => void) => {
    if (list.includes(item)) {
      setList(list.filter((x) => x !== item));
    } else {
      setList([...list, item]);
    }
  };

  const toggleYearFilter = (year: number) => {
    if (selectedYears.includes(year)) {
      setSelectedYears(selectedYears.filter((y) => y !== year));
    } else {
      setSelectedYears([...selectedYears, year]);
    }
  };

  const activeFiltersCount =
    (search ? 1 : 0) +
    selectedThemes.length +
    selectedStatus.length +
    selectedYears.length +
    (includeNonMerit ? 1 : 0);

  const hasActiveFilters = activeFiltersCount > 0;

  const handleResetFilters = () => {
    setSearch("");
    setSelectedThemes([]);
    setSelectedStatus([]);
    setSelectedYears([]);
    setIncludeNonMerit(false);
  };

  if (loading) {
    return <VoteFormSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* 1. Barra de Filtros e Busca */}
      <VoteFormFilterPanel
        search={search}
        sortBy={sortBy}
        shuffle={shuffle}
        limit={limit}
        opinionsCount={opinionsCount}
        activeFiltersCount={activeFiltersCount}
        showFilterDrawer={showFilterDrawer}
        availableYears={availableYears}
        selectedYears={selectedYears}
        availableStatus={availableStatus}
        selectedStatus={selectedStatus}
        availableThemes={availableThemes}
        selectedThemes={selectedThemes}
        includeNonMerit={includeNonMerit}
        onSearchChange={setSearch}
        onSortChange={setSortBy}
        onShuffleToggle={handleShuffleToggle}
        onLimitChange={setLimit}
        onToggleDrawer={() => setShowFilterDrawer(!showFilterDrawer)}
        onToggleYear={toggleYearFilter}
        onClearYears={() => setSelectedYears([])}
        onToggleStatus={(st) => toggleFilter(st, selectedStatus, setSelectedStatus)}
        onClearStatus={() => setSelectedStatus([])}
        onToggleTheme={(th) => toggleFilter(th, selectedThemes, setSelectedThemes)}
        onClearThemes={() => setSelectedThemes([])}
        onToggleIncludeNonMerit={setIncludeNonMerit}
      />

      {/* 2. Indicador de Contagem de Propostas */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <div className="flex items-center gap-2">
          <FaVoteYea className="w-4 h-4 text-primary" />
          <span>
            Exibindo <strong>{displayedPropositions.length}</strong> de{" "}
            <strong>{filteredPropositions.length}</strong> matérias prontas para análise
          </span>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="text-primary hover:underline font-bold cursor-pointer"
          >
            Limpar Filtros
          </button>
        )}
      </div>

      {/* 3. Lista de Proposições Não Votadas */}
      {displayedPropositions.length === 0 ? (
        <VoteFormEmptyState
          hasActiveFilters={hasActiveFilters}
          opinionsCount={opinionsCount}
          onResetFilters={handleResetFilters}
        />
      ) : (
        <div className="space-y-6">
          {displayedPropositions.map((p) => (
            <UnvotedPropositionCard
              key={p.id}
              proposition={p}
              granularAnswers={granularAnswers}
              onVote={handleVote}
              onRemoveVote={handleRemoveVote}
              onSecondaryVote={handleSecondaryVote}
              onRemoveSecondaryVote={handleRemoveSecondaryVote}
              onOpenFeedback={setFeedbackTarget}
            />
          ))}
        </div>
      )}

      {/* 4. Modal de Relato de Inconsistência */}
      <AiFeedbackModal
        isOpen={Boolean(feedbackTarget)}
        onClose={() => setFeedbackTarget(null)}
        propositionId={feedbackTarget?.id}
        propositionTitle={feedbackTarget?.titulo}
        sessionId={feedbackTarget?.vote_session_id ? String(feedbackTarget.vote_session_id) : undefined}
        sessionTitle={feedbackTarget?.titulo_amigavel || feedbackTarget?.vote_session_description}
        reportedSummary={feedbackTarget?.resumo_geral || feedbackTarget?.resumo_simplificado || feedbackTarget?.ementa}
      />

      {/* 5. Notificação Flutuante de Opinião Registrada */}
      <VoteFormToast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
