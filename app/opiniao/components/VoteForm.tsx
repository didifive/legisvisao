"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { cachedFetch } from "@/lib/cache";
import type { PropositionWithVoteSession } from "@/types/db";
import { Button } from "@/app/components/ui/Button";
import {
  FaCheck,
  FaTimes,
  FaSearch,
  FaRandom,
  FaCalendarAlt,
  FaFileAlt,
  FaCheckCircle,
  FaExternalLinkAlt,
  FaHistory,
  FaInfoCircle,
  FaFilter,
  FaLandmark,
  FaVoteYea,
  FaRobot,
  FaChevronDown,
  FaFlag,
  FaExclamationTriangle,
  FaSyncAlt,
} from "react-icons/fa";
import { AiFeedbackModal } from "@/app/components/AiFeedbackModal";
import { saveStoredAnswers, getStoredAnswers, StoredAnswers } from "@/lib/storage";
import { sortPropositionsByRelevance } from "@/lib/match/classifyVoteSession";

function mulberry32(seed: number) {
  return function () {
    seed = Math.trunc(seed);
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleDeterministic<T>(array: T[], seed: number): T[] {
  const rand = mulberry32(seed);
  const arr = [...array];

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}

export default function VoteForm() {
  const [propositions, setPropositions] = useState<PropositionWithVoteSession[]>([]);
  const [answers, setAnswers] = useState<StoredAnswers>({});
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState<"relevance" | "recent" | "oldest">("relevance");
  const [shuffle, setShuffle] = useState(false);
  const [seed, setSeed] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [includeNonMerit, setIncludeNonMerit] = useState(false);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [feedbackTarget, setFeedbackTarget] = useState<PropositionWithVoteSession | null>(null);

  // Carregar proposições + opiniões existentes
  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        const cacheKey = includeNonMerit ? "propositions_all" : "propositions_merit";
        const url = includeNonMerit ? "/api/propositions?include_all=true" : "/api/propositions?only_merit=true";

        const propsData = await cachedFetch(cacheKey, () =>
          fetch(url).then((r) => r.json())
        );

        const savedAnswers = getStoredAnswers();

        if (!mounted) return;

        setPropositions(propsData.propositions || propsData.projects || []);
        setAnswers(savedAnswers);
      } catch (err) {
        console.error("Erro ao carregar proposições:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    const handleStorage = () => {
      setAnswers(getStoredAnswers());
    };

    window.addEventListener("storage-answers-updated", handleStorage);
    window.addEventListener("storage", handleStorage);

    return () => {
      mounted = false;
      window.removeEventListener("storage-answers-updated", handleStorage);
      window.removeEventListener("storage", handleStorage);
    };
  }, [includeNonMerit]);

  function toggleShuffle(value: boolean) {
    setShuffle(value);
    if (value) {
      setSeed(Date.now());
    } else {
      setSeed(null);
    }
  }

  // Lista dinâmica de situações disponíveis nas proposições
  const availableStatus = useMemo(() => {
    const statusSet = new Set<string>();
    for (const p of propositions) {
      const st = p.ultimo_status || "Em Tramitação";
      if (st) statusSet.add(st);
    }
    return Array.from(statusSet).sort();
  }, [propositions]);

  // Lista de anos disponíveis
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    for (const p of propositions) {
      const year = p.ano;
      if (year && !Number.isNaN(year)) yearsSet.add(year);
    }
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [propositions]);

  function toggleStatus(st: string) {
    setSelectedStatus((prev) =>
      prev.includes(st) ? prev.filter((e) => e !== st) : [...prev, st]
    );
    setLimit(10);
  }

  function toggleYear(year: number) {
    setSelectedYears((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year]
    );
    setLimit(10);
  }

  function resetAllFilters() {
    setSelectedStatus([]);
    setSelectedYears([]);
    setIncludeNonMerit(false);
    setSearch("");
    setLimit(10);
  }

  function handleSearchChange(val: string) {
    setSearch(val);
    setLimit(10);
  }

  const shuffledPropositions = useMemo(() => {
    if (!shuffle || seed === null) return propositions;
    return shuffleDeterministic(propositions, seed);
  }, [shuffle, seed, propositions]);

  const unvotedPropositions = useMemo(() => {
    return shuffledPropositions.filter((p) => !answers[p.id]);
  }, [shuffledPropositions, answers]);

  const allFiltered = useMemo(() => {
    let list = [...unvotedPropositions];

    // Filtro por busca de texto (título, resumo simplificado por IA, ementa técnica e tema)
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.titulo.toLowerCase().includes(q) ||
          (p.titulo_amigavel?.toLowerCase().includes(q)) ||
          (p.resumo_geral?.toLowerCase().includes(q)) ||
          (p.ementa?.toLowerCase().includes(q)) ||
          (p.tema?.toLowerCase().includes(q))
      );
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
      if (sortBy === "relevance") {
        list = sortPropositionsByRelevance(list);
      } else if (sortBy === "recent") {
        list.sort((a, b) => {
          const timeA = a.vote_session_date ? new Date(a.vote_session_date).getTime() : 0;
          const timeB = b.vote_session_date ? new Date(b.vote_session_date).getTime() : 0;
          return timeB - timeA || b.id - a.id;
        });
      } else if (sortBy === "oldest") {
        list.sort((a, b) => {
          const timeA = a.vote_session_date ? new Date(a.vote_session_date).getTime() : 0;
          const timeB = b.vote_session_date ? new Date(b.vote_session_date).getTime() : 0;
          return timeA - timeB || a.id - b.id;
        });
      }
    }

    return list;
  }, [unvotedPropositions, search, sortBy, shuffle, selectedStatus, selectedYears]);

  const filtered = useMemo(() => {
    return allFiltered.slice(0, limit);
  }, [allFiltered, limit]);

  function handleVote(propId: number, opinion: "CONCORDO" | "DISCORDO") {
    const newAnswers = { ...answers, [propId]: opinion };
    setAnswers(newAnswers);
    saveStoredAnswers(newAnswers);
  }

  const opinionsCount = Object.keys(answers).length;
  const activeFiltersCount = selectedStatus.length + selectedYears.length + (includeNonMerit ? 1 : 0);

  if (loading) {
    return (
      <div className="py-12 text-center text-muted-foreground flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        <span>Carregando propostas legislativas da Câmara dos Deputados...</span>
      </div>
    );
  }

  if (propositions.length === 0) {
    return (
      <div className="p-8 sm:p-10 rounded-2xl bg-card border border-border text-center space-y-5 shadow-soft max-w-2xl mx-auto my-6 animate-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
          <FaExclamationTriangle className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-foreground">
            Nenhuma proposta de lei disponível no momento
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
            Os dados oficiais de proposições e votações da Câmara dos Deputados ainda não foram sincronizados.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button variant="hero" href="/faq">
            <FaSyncAlt className="w-3.5 h-3.5 mr-1.5" />
            Consultar Fontes & FAQ
          </Button>
          <Button variant="outline" href="/">
            Voltar ao Início
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Barra de Filtros & Controles */}
      <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-soft space-y-4">
        {/* 1. Barra de Busca Principal (Ampla, destacada e confortável) */}
        <div className="relative flex items-center w-full">
          <FaSearch className="absolute left-3.5 text-muted-foreground w-4 h-4 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar proposta por tema, palavra-chave, sigla ou número (ex: PL 2630)..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full bg-background border border-border rounded-xl pl-10 pr-10 py-2.5 text-sm sm:text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-smooth"
          />
          {search && (
            <button
              onClick={() => handleSearchChange("")}
              className="absolute right-3 p-1 rounded-md text-muted-foreground hover:text-foreground text-xs hover:bg-muted transition-smooth"
              title="Limpar busca"
            >
              <FaTimes className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* 2. Controles de Filtragem e Ordenação */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/40">
          <div className="flex flex-wrap items-center gap-2.5 text-xs sm:text-sm">
            {/* Ordenação */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground font-medium">Ordem:</span>
              <select
                value={sortBy}
                disabled={shuffle}
                onChange={(e) => setSortBy(e.target.value as "relevance" | "recent" | "oldest")}
                className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground cursor-pointer disabled:opacity-50 font-medium"
                title="Critério de ordenação das propostas de lei"
              >
                <option value="relevance">Mais Relevantes (Quórum e Disputa)</option>
                <option value="recent">Mais Recentes</option>
                <option value="oldest">Mais Antigas</option>
              </select>
            </div>

            {/* Botão de Toggle do Painel de Filtros */}
            <button
              onClick={() => setShowFilterDrawer(!showFilterDrawer)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-smooth cursor-pointer font-bold ${activeFiltersCount > 0 || showFilterDrawer
                  ? "bg-primary text-white border-primary shadow-soft"
                  : "bg-background border-border text-foreground hover:bg-muted"
                }`}
            >
              <FaFilter className="w-3 h-3" />
              <span>Filtros {activeFiltersCount > 0 ? `(${activeFiltersCount})` : "Avançados"}</span>
            </button>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground font-medium">Exibir:</span>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="bg-background border border-border rounded-lg px-2 py-1.5 text-xs text-foreground cursor-pointer font-medium"
              >
                <option value={5}>5 propostas</option>
                <option value={10}>10 propostas</option>
                <option value={20}>20 propostas</option>
                <option value={50}>50 propostas</option>
              </select>
            </div>

            <label className="flex items-center gap-1.5 text-xs text-foreground cursor-pointer bg-background border border-border px-2.5 py-1.5 rounded-lg hover:bg-muted transition-smooth font-medium">
              <input
                type="checkbox"
                checked={shuffle}
                onChange={(e) => toggleShuffle(e.target.checked)}
                className="accent-primary rounded"
              />
              <FaRandom className="w-3 h-3 text-secondary" />
              <span>Ordem aleatória</span>
            </label>
          </div>

          {opinionsCount > 0 && (
            <Link
              href="/opiniao/revisao"
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 transition-smooth"
            >
              <FaCheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              <span>{opinionsCount} {opinionsCount === 1 ? "analisada" : "analisadas"}</span>
            </Link>
          )}
        </div>

        {/* Painel Avançado: Filtros por Ano e Situação */}
        {showFilterDrawer && (
          <div className="pt-4 border-t border-border/60 space-y-4">
            {/* 1. Filtro por Ano */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <FaCalendarAlt className="text-primary w-3.5 h-3.5" />
                  <span>Ano da Proposição:</span>
                </span>

                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedYears([])}
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded transition-smooth ${selectedYears.length === 0
                        ? "bg-primary/20 text-primary"
                        : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    Todos os Anos
                  </button>
                  {selectedYears.length > 0 && (
                    <button
                      onClick={() => setSelectedYears([])}
                      className="text-[11px] text-destructive hover:underline"
                    >
                      Limpar anos
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {availableYears.map((yr) => {
                  const isChecked = selectedYears.includes(yr);

                  return (
                    <button
                      key={yr}
                      onClick={() => toggleYear(yr)}
                      className={`px-3 py-1 rounded-lg border text-xs font-bold transition-smooth cursor-pointer ${isChecked
                          ? "bg-primary text-white border-primary shadow-soft"
                          : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                    >
                      {yr}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Filtro por Situação */}
            <div className="space-y-2 pt-2 border-t border-border/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <FaInfoCircle className="text-secondary w-3.5 h-3.5" />
                  <span>Situação Legislativa:</span>
                </span>

                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedStatus([])}
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded transition-smooth ${selectedStatus.length === 0
                        ? "bg-primary/20 text-primary"
                        : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    Todas as Situações
                  </button>
                  {selectedStatus.length > 0 && (
                    <button
                      onClick={() => setSelectedStatus([])}
                      className="text-[11px] text-destructive hover:underline"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {availableStatus.map((st) => {
                  const isChecked = selectedStatus.includes(st);

                  return (
                    <label
                      key={st}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-smooth ${isChecked
                          ? "bg-primary/10 border-primary text-foreground font-semibold"
                          : "bg-background border-border/70 text-muted-foreground hover:bg-muted"
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleStatus(st)}
                        className="accent-primary rounded"
                      />
                      <span className="truncate" title={st}>
                        {st}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 3. Modo de Consulta: Propostas Simbólicas */}
            <div className="pt-2 border-t border-border/40 space-y-2">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <FaLandmark className="text-amber-500 w-3.5 h-3.5" />
                <span>Escopo de Deliberações:</span>
              </span>

              <label className="flex items-start gap-3 p-3 rounded-xl bg-background border border-border cursor-pointer hover:border-primary/50 transition-smooth">
                <input
                  type="checkbox"
                  checked={includeNonMerit}
                  onChange={(e) => setIncludeNonMerit(e.target.checked)}
                  className="mt-0.5 accent-primary rounded cursor-pointer"
                />
                <div className="text-xs space-y-0.5">
                  <span className="font-bold text-foreground block">
                    Incluir propostas com deliberação simbólica (modo consulta)
                  </span>
                  <span className="text-muted-foreground block text-[11px] leading-relaxed">
                    Exibe matérias aprovadas ou rejeitadas por aclamação ou acordo de bancada (sem votação nominal eletrônica de deputados). Estas matérias aparecem apenas para leitura e consulta.
                  </span>
                </div>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Lista de Propostas Pendentes */}
      {allFiltered.length === 0 ? (
        <div className="p-8 rounded-xl bg-card border border-border text-center space-y-4 shadow-soft">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <FaCheckCircle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-foreground">
            {search.trim() || activeFiltersCount > 0
              ? "Nenhuma proposta encontrada para os filtros selecionados."
              : "Você já expressou sua opinião sobre todas as propostas listadas!"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {activeFiltersCount > 0
              ? "Experimente selecionar outros anos, situações ou limpar os filtros de busca."
              : "Você pode revisar suas opiniões registradas ou conferir o ranking de afinidade com os deputados e partidos."}
          </p>
          <div className="flex justify-center gap-3 pt-2">
            {activeFiltersCount > 0 && (
              <Button variant="outline" onClick={resetAllFilters}>
                Limpar Todos os Filtros
              </Button>
            )}
            <Button variant="hero" href="/afinidade">
              Ver Afinidade
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1 font-medium">
            <span>
              Exibindo <strong>{filtered.length}</strong> de <strong>{allFiltered.length}</strong> {allFiltered.length === 1 ? "proposta pendente" : "propostas pendentes"}
            </span>
            {(search || activeFiltersCount > 0) && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="text-primary hover:underline font-bold"
              >
                Limpar Filtros
              </button>
            )}
          </div>

          {filtered.map((p) => {
            const situacaoAtual = p.ultimo_status || "Em Tramitação";
            const lastVoteDate = p.vote_session_date
              ? new Date(p.vote_session_date).toLocaleDateString("pt-BR")
              : null;
            const isAprovado = situacaoAtual.toLowerCase().includes("aprovad") || situacaoAtual.toLowerCase().includes("lei") || situacaoAtual.toLowerCase().includes("norma");
            const isEncerrado = situacaoAtual.toLowerCase().includes("arquivad") || situacaoAtual.toLowerCase().includes("rejeitad") || situacaoAtual.toLowerCase().includes("encerrad");

            return (
              <div
                key={p.id}
                className="p-5 sm:p-6 rounded-2xl bg-card border border-border shadow-soft hover:shadow-medium transition-smooth space-y-4"
              >
                {/* Header do Card */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-lg bg-primary/10 text-primary">
                      <FaFileAlt className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="font-extrabold text-foreground text-base sm:text-lg">
                        {p.titulo}
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        {p.sigla_tipo} nº {p.numero}/{p.ano}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {/* Badge de Casa Legislativa */}
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold">
                      <FaLandmark className="w-3 h-3" />
                      <span>Câmara dos Deputados</span>
                    </span>

                    {/* Badge de Situação */}
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border font-bold ${isAprovado
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : isEncerrado
                            ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                            : "bg-secondary/10 text-secondary border-secondary/20"
                        }`}
                    >
                      <FaInfoCircle className="w-3 h-3" />
                      <span>{situacaoAtual}</span>
                    </span>

                    {/* Última Deliberação */}
                    {lastVoteDate && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-muted-foreground font-medium">
                        <FaHistory className="w-3 h-3 text-primary" />
                        <span>Deliberado em: {lastVoteDate}</span>
                      </span>
                    )}

                    {/* Badge de Deliberação Simbólica / Modo Consulta */}
                    {!p.is_merit && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold">
                        <FaInfoCircle className="w-3 h-3" />
                        <span>Deliberação Simbólica (Consulta)</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* 1. Resumo Geral do Projeto de Lei (Linguagem Cidadã por IA) ou Ementa Oficial Direta */}
                {p.resumo_geral ? (
                  <>
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5">
                          <FaRobot className="w-3.5 h-3.5 shrink-0" />
                          <span>Sobre o Projeto de Lei (Resumo Geral):</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setFeedbackTarget(p)}
                          title="Relatar inconsistência ou viés no resumo"
                          className="text-[11px] text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 transition-smooth flex items-center gap-1 cursor-pointer font-medium"
                        >
                          <FaFlag className="w-2.5 h-2.5" />
                          <span className="hidden sm:inline">Relatar problema</span>
                        </button>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed font-normal">
                        {p.resumo_geral}
                      </p>
                    </div>

                    {/* Expansor da Ementa Jurídica Oficial */}
                    <details className="group pt-0.5">
                      <summary className="text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer flex items-center gap-1.5 select-none list-none">
                        <FaInfoCircle className="w-3 h-3 text-primary" />
                        <span>Ver ementa jurídica oficial da Câmara</span>
                        <FaChevronDown className="w-2.5 h-2.5 group-open:rotate-180 transition-transform" />
                      </summary>
                      <div className="mt-2 p-3.5 rounded-xl bg-muted/30 border border-border/60 text-xs text-muted-foreground leading-relaxed">
                        {p.ementa_detalhada || p.ementa}
                      </div>
                    </details>
                  </>
                ) : (
                  /* Exibição direta da Ementa Oficial */
                  <div className="p-4 rounded-xl bg-muted/30 border border-border/60 space-y-1.5">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <FaInfoCircle className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>Ementa Oficial:</span>
                    </span>
                    <p className="text-sm text-foreground leading-relaxed font-normal">
                      {p.ementa_detalhada || p.ementa}
                    </p>
                  </div>
                )}

                {/* 2. Deliberação de Mérito Votada no Plenário */}
                {p.resumo_simplificado && (
                  <div className="p-4 rounded-xl bg-muted/40 border border-border/80 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                        <FaVoteYea className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>Deliberação de Mérito Votada no Plenário:</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFeedbackTarget(p)}
                        title="Relatar inconsistência ou viés no resumo desta deliberação"
                        className="text-[11px] text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 transition-smooth flex items-center gap-1 cursor-pointer font-medium"
                      >
                        <FaFlag className="w-2.5 h-2.5" />
                        <span className="hidden sm:inline">Relatar problema</span>
                      </button>
                    </div>
                    {p.titulo_amigavel && (
                      <p className="text-xs font-semibold text-primary">
                        {p.titulo_amigavel}
                      </p>
                    )}
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {p.resumo_simplificado}
                    </p>
                  </div>
                )}

                {/* Quórum de Votação Nominal (Sem antecipar o resultado/placar para não enviesar a resposta) */}
                {(() => {
                  const quorum = Number(p.total_sim || 0) + Number(p.total_nao || 0) + Number(p.total_outros || 0);
                  if (quorum <= 0) return null;
                  return (
                    <div className="flex items-center gap-2 text-xs py-1.5 px-3 rounded-xl bg-muted/40 border border-border/60 text-muted-foreground">
                      <FaVoteYea className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>
                        Quórum de Deliberação Nominal: <strong>{quorum}</strong> deputados votaram no Plenário
                      </span>
                    </div>
                  );
                })()}

                {/* Acesso a Detalhes e Fontes Oficiais */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                  <Link
                    href={`/projetos/${p.id}`}
                    className="inline-flex items-center gap-1 text-primary hover:underline font-bold"
                  >
                    <span>Ver detalhes da tramitação e votos nominais</span>
                    <FaExternalLinkAlt className="w-2.5 h-2.5" />
                  </Link>
                </div>

                {/* Área de Posicionamento ou Modo Consulta */}
                {p.is_merit ? (
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-border/60">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Qual é o seu posicionamento sobre esta proposta?
                    </span>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleVote(p.id, "CONCORDO")}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-soft transition-smooth cursor-pointer active:scale-95"
                      >
                        <FaCheck className="w-3.5 h-3.5" />
                        <span>CONCORDO</span>
                      </button>

                      <button
                        onClick={() => handleVote(p.id, "DISCORDO")}
                        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-soft transition-smooth cursor-pointer active:scale-95"
                      >
                        <FaTimes className="w-3.5 h-3.5" />
                        <span>DISCORDO</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-border/60">
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <FaInfoCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>Matéria deliberada por votação simbólica no Plenário (disponível para leitura e consulta).</span>
                    </div>

                    <Link
                      href={`/projetos/${p.id}`}
                      className="px-3.5 py-1.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-bold flex items-center gap-1.5 transition-smooth border border-border shrink-0 self-end sm:self-auto"
                    >
                      <span>Ver Ficha e Tramitação</span>
                      <FaExternalLinkAlt className="w-2.5 h-2.5" />
                    </Link>
                  </div>
                )}
              </div>
            );
          })}

          {/* Botão de Paginação Incremental */}
          {limit < allFiltered.length && (
            <div className="pt-2 text-center">
              <Button
                variant="outline"
                size="default"
                onClick={() => setLimit((prev) => prev + 10)}
                className="w-full sm:w-auto font-bold shadow-soft"
              >
                Carregar mais 10 propostas ({allFiltered.length - limit} restantes)
              </Button>
            </div>
          )}
        </div>
      )}

      {/* CTA Final para Afinidade */}
      {opinionsCount > 0 && (
        <div className="p-4 rounded-xl bg-gradient-subtle border border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-soft">
          <div className="text-sm text-foreground text-center sm:text-left">
            <strong>{opinionsCount}</strong> proposta(s) analisada(s). Deseja calcular seu índice de afinidade?
          </div>
          <Button variant="hero" size="lg" href="/afinidade" className="w-full sm:w-auto">
            Ver Índice de Afinidade &rarr;
          </Button>
        </div>
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
    </div>
  );
}
