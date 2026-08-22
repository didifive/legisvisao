"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { cachedFetch } from "@/lib/cache";
import type { PropositionWithVoteSession } from "@/types/db";
import { Button } from "@/app/components/ui/Button";
import {
  FaCheck,
  FaTimes,
  FaTrashAlt,
  FaFileAlt,
  FaChartPie,
  FaArrowLeft,
  FaInfoCircle,
  FaCalendarAlt,
  FaExternalLinkAlt,
  FaHistory,
  FaTag,
  FaFilter,
  FaSearch,
  FaLandmark,
  FaRobot,
  FaChevronDown,
  FaVoteYea,
  FaFlag,
  FaQuestionCircle,
  FaExclamationTriangle,
  FaSyncAlt,
} from "react-icons/fa";
import { AiFeedbackModal } from "@/app/components/AiFeedbackModal";
import {
  getStoredAnswers,
  saveStoredAnswers,
  StoredAnswers,
} from "@/lib/storage";

export default function RevisaoPage() {
  const [propositions, setPropositions] = useState<PropositionWithVoteSession[]>([]);
  const [answers, setAnswers] = useState<StoredAnswers>({});
  const [search, setSearch] = useState("");
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [feedbackTarget, setFeedbackTarget] = useState<PropositionWithVoteSession | null>(null);
  const [visibleCount, setVisibleCount] = useState(10);
  const PAGE_SIZE = 10;

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const propsData = await cachedFetch("propositions_all", () =>
          fetch("/api/propositions?include_all=true").then((r) => r.json())
        );

        const savedAnswers = getStoredAnswers();

        if (!mounted) return;
        setAnswers(savedAnswers);
        setPropositions(propsData.propositions || propsData.projects || []);
      } catch (err) {
        console.error("Erro ao carregar revisão:", err);
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
  }, []);

  const propsById = useMemo(() => {
    const map = new Map<number, PropositionWithVoteSession>();
    for (const p of propositions) {
      map.set(p.id, p);
    }
    return map;
  }, [propositions]);

  // Lista de proposições respondidas pelo usuário
  const answeredPropositions = useMemo(() => {
    const list: Array<{
      proposition: PropositionWithVoteSession;
      answer: "CONCORDO" | "DISCORDO";
    }> = [];

    for (const [propIdStr, opinion] of Object.entries(answers)) {
      const pId = Number(propIdStr);
      if (!Number.isNaN(pId)) {
        const proposition = propsById.get(pId);
        if (proposition) {
          list.push({ proposition, answer: opinion });
        }
      }
    }

    return list;
  }, [answers, propsById]);

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
    return Array.from(statusSet).sort();
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
    let list = [...answeredPropositions];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (item) =>
          item.proposition.titulo.toLowerCase().includes(q) ||
          (item.proposition.titulo_amigavel && item.proposition.titulo_amigavel.toLowerCase().includes(q)) ||
          (item.proposition.resumo_geral && item.proposition.resumo_geral.toLowerCase().includes(q)) ||
          (item.proposition.ementa && item.proposition.ementa.toLowerCase().includes(q)) ||
          (item.proposition.tema && item.proposition.tema.toLowerCase().includes(q))
      );
    }

    if (selectedThemes.length > 0) {
      list = list.filter((item) => {
        if (!item.proposition.tema) return false;
        const pThemes = item.proposition.tema.split(/[•,]/).map((t) => t.trim()).filter(Boolean);
        return selectedThemes.some((th) => pThemes.includes(th));
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

    // Ordenação mais recente primeiro
    list.sort((a, b) => {
      const da = (p: PropositionWithVoteSession) => {
        const dateStr = p.vote_session_date || p.data_apresentacao;
        return dateStr ? new Date(dateStr).getTime() : 0;
      };
      return da(b.proposition) - da(a.proposition);
    });

    return list;
  }, [answeredPropositions, search, selectedThemes, selectedStatus, selectedYears]);

  const displayedList = useMemo(() => {
    return filteredList.slice(0, visibleCount);
  }, [filteredList, visibleCount]);

  function handleVoteChange(propId: number, opinion: "CONCORDO" | "DISCORDO") {
    const updated = { ...answers, [propId]: opinion };
    setAnswers(updated);
    saveStoredAnswers(updated);
  }

  function handleRemoveOpinion(propId: number) {
    const updated = { ...answers };
    delete updated[propId];
    setAnswers(updated);
    saveStoredAnswers(updated);
  }

  const concordoCount = Object.values(answers).filter((a) => a === "CONCORDO").length;
  const discordoCount = Object.values(answers).filter((a) => a === "DISCORDO").length;
  const totalCount = Object.keys(answers).length;
  const activeFiltersCount = selectedThemes.length + selectedStatus.length + selectedYears.length;

  const nonMeritAnsweredCount = useMemo(() => {
    return answeredPropositions.filter((item) => !item.proposition.is_merit).length;
  }, [answeredPropositions]);

  if (loading) {
    return (
      <div className="py-16 text-center text-muted-foreground flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        <span>Carregando suas opiniões salvas...</span>
      </div>
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
      {/* Navegação Breadcrumb */}
      <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
        <Link href="/opiniao" className="hover:text-primary transition-smooth flex items-center gap-1">
          <FaArrowLeft className="w-3 h-3" />
          <span>Opinar em Propostas</span>
        </Link>
        <span>/</span>
        <span className="text-foreground font-semibold">Minhas Opiniões</span>
      </div>

      {/* Header com Resumo Estatístico */}
      <div className="p-6 sm:p-8 rounded-2xl bg-card border border-border shadow-soft flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Minhas Opiniões Registradas
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl leading-relaxed">
            Consulte ou altere suas respostas salvas localmente neste dispositivo. Suas opiniões determinam o índice de afinidade com os Deputados Federais.
          </p>
        </div>

        {/* Resumo visual dos votos */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center min-w-[90px]">
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase block">
              Concordo
            </span>
            <span className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-300">
              {concordoCount}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center min-w-[90px]">
            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase block">
              Discordo
            </span>
            <span className="text-xl sm:text-2xl font-black text-rose-700 dark:text-rose-300">
              {discordoCount}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-center min-w-[90px]">
            <span className="text-[10px] font-bold text-primary uppercase block">
              Total
            </span>
            <span className="text-xl sm:text-2xl font-black text-foreground">
              {totalCount}
            </span>
          </div>
        </div>
      </div>

      {/* Banner de Proposições Não-Mérito (se houver matérias simbólicas salvas) */}
      {nonMeritAnsweredCount > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs sm:text-sm text-amber-800 dark:text-amber-300 shadow-soft animate-fade-in">
          <FaInfoCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div className="space-y-1">
            <p className="font-extrabold text-foreground">
              {nonMeritAnsweredCount === 1
                ? "1 proposição sem votação nominal de mérito identificada"
                : `${nonMeritAnsweredCount} proposições sem votação nominal de mérito identificadas`}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Matérias deliberadas simbolicamente ou que possuem apenas votações nominais de emendas/destaques não possuem votação de mérito no Plenário e <strong>são automaticamente desconsideradas no cálculo de afinidade</strong>.
            </p>
          </div>
        </div>
      )}

      {totalCount === 0 ? (
        <div className="p-8 sm:p-10 rounded-2xl bg-card border border-border text-center space-y-4 shadow-soft">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <FaFileAlt className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-foreground">
            Você ainda não registrou nenhuma opinião
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Analise as propostas de lei deliberadas na Câmara dos Deputados e descubra sua afinidade legislativa.
          </p>
          <div className="pt-2">
            <Button variant="hero" href="/opiniao">
              Começar a Analisar Propostas
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Barra de Busca & Filtros (Ampla e com layout destacado) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-soft space-y-4">
            {/* 1. Busca ampla */}
            <div className="relative flex items-center w-full">
              <FaSearch className="absolute left-3.5 text-muted-foreground w-4 h-4 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar em minhas respostas por tema, palavra-chave, sigla ou número..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-background border border-border text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-smooth"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => handleSearchChange("")}
                  className="absolute right-3 text-muted-foreground hover:text-foreground text-xs p-1"
                >
                  <FaTimes className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* 2. Botão Expansor de Filtros Avançados */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-border/40">
              <button
                type="button"
                onClick={() => setShowFilterDrawer(!showFilterDrawer)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-smooth cursor-pointer border ${
                  activeFiltersCount > 0 || showFilterDrawer
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-muted/40 text-muted-foreground hover:text-foreground border-border"
                }`}
              >
                <FaFilter className="w-3 h-3" />
                <span>Filtros Avançados</span>
                {activeFiltersCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-primary text-white text-[10px] font-black">
                    {activeFiltersCount}
                  </span>
                )}
                <FaChevronDown
                  className={`w-2.5 h-2.5 transition-transform ${
                    showFilterDrawer ? "rotate-180" : ""
                  }`}
                />
              </button>

              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="text-xs text-destructive hover:underline font-bold transition-smooth"
                >
                  Limpar todos os filtros
                </button>
              )}
            </div>

            {/* Painel Expansível de Filtros */}
            {showFilterDrawer && (
              <div className="pt-3 border-t border-border/40 space-y-4 animate-fade-in">
                {/* Filtro por Ano */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <FaCalendarAlt className="text-primary w-3.5 h-3.5" />
                      <span>Ano da Proposição:</span>
                    </span>
                    {selectedYears.length > 0 && (
                      <button
                        onClick={() => setSelectedYears([])}
                        className="text-[11px] text-destructive hover:underline"
                      >
                        Limpar anos
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {availableYears.map((yr) => {
                      const isChecked = selectedYears.includes(yr);
                      return (
                        <button
                          key={yr}
                          onClick={() => toggleYear(yr)}
                          className={`px-3 py-1 rounded-lg border text-xs font-bold transition-smooth cursor-pointer ${
                            isChecked
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

                {/* Filtro por Situação */}
                <div className="space-y-2 pt-2 border-t border-border/40">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <FaInfoCircle className="text-secondary w-3.5 h-3.5" />
                      <span>Situação Legislativa:</span>
                    </span>
                    {selectedStatus.length > 0 && (
                      <button
                        onClick={() => setSelectedStatus([])}
                        className="text-[11px] text-destructive hover:underline"
                      >
                        Limpar situações
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {availableStatus.map((st) => {
                      const isChecked = selectedStatus.includes(st);
                      return (
                        <label
                          key={st}
                          className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-smooth ${
                            isChecked
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

                {/* Filtro por Tema Oficial */}
                {availableThemes.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-border/40">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <FaTag className="text-primary w-3.5 h-3.5" />
                        <span>Área Temática Oficial:</span>
                      </span>
                      {selectedThemes.length > 0 && (
                        <button
                          onClick={() => setSelectedThemes([])}
                          className="text-[11px] text-destructive hover:underline"
                        >
                          Limpar temas
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                      {availableThemes.map((th) => {
                        const isChecked = selectedThemes.includes(th);
                        return (
                          <button
                            key={th}
                            onClick={() => toggleTheme(th)}
                            className={`px-2.5 py-1 rounded-lg border text-xs transition-smooth cursor-pointer ${
                              isChecked
                                ? "bg-primary text-white border-primary shadow-soft font-bold"
                                : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted font-medium"
                            }`}
                          >
                            {th}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

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
                className="text-xs text-primary hover:underline font-bold"
              >
                Limpar todos os filtros
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {displayedList.map(({ proposition, answer }) => {
                const isConcordo = answer === "CONCORDO";
                const situacaoAtual = proposition.ultimo_status || "Em Tramitação";
                const isAprovado =
                  situacaoAtual.toLowerCase().includes("aprovad") ||
                  situacaoAtual.toLowerCase().includes("transformad") ||
                  situacaoAtual.toLowerCase().includes("norma");
                const isEncerrado =
                  situacaoAtual.toLowerCase().includes("arquivad") ||
                  situacaoAtual.toLowerCase().includes("rejeitad") ||
                  situacaoAtual.toLowerCase().includes("encerrad");

                const lastVoteDate = proposition.vote_session_date
                  ? new Date(proposition.vote_session_date).toLocaleDateString("pt-BR")
                  : null;

                const isMerit = proposition.is_merit !== false;

                return (
                  <div
                    key={proposition.id}
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
                            {proposition.titulo}
                          </h3>
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            {proposition.tema ? (
                              proposition.tema
                                .split(/[•,]/)
                                .map((t) => t.trim())
                                .filter(Boolean)
                                .map((tag) => (
                                  <span
                                    key={tag}
                                    className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-muted/80 text-muted-foreground border border-border"
                                  >
                                    {tag}
                                  </span>
                                ))
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {proposition.sigla_tipo} nº {proposition.numero}/{proposition.ano}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold">
                          <FaLandmark className="w-3 h-3" />
                          <span>Câmara dos Deputados</span>
                        </span>

                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border font-bold ${
                            isAprovado
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : isEncerrado
                              ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                              : "bg-secondary/10 text-secondary border-secondary/20"
                          }`}
                        >
                          <FaInfoCircle className="w-3 h-3" />
                          <span>{situacaoAtual}</span>
                        </span>

                        {lastVoteDate && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-muted-foreground font-medium">
                            <FaHistory className="w-3 h-3 text-primary" />
                            <span>Deliberado em: {lastVoteDate}</span>
                          </span>
                        )}

                        {!isMerit && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold">
                            <FaInfoCircle className="w-3 h-3" />
                            <span>Deliberação Simbólica (Sem Mérito Nominal)</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 1. Quadro Unificado de Análise por Inteligência Artificial ou Ementa Oficial Direta */}
                    {proposition.resumo_geral || (isMerit && proposition.resumo_simplificado) ? (
                      <>
                        <div className="p-4 sm:p-5 rounded-2xl bg-primary/5 border border-primary/20 space-y-3.5 shadow-soft">
                          {/* Cabeçalho do Quadro de IA */}
                          <div className="flex items-center justify-between gap-2 border-b border-primary/15 pb-2">
                            <span className="text-xs font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5">
                              <FaRobot className="w-3.5 h-3.5 shrink-0" />
                              <span>Análise e Resumo Cidadão por IA</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => setFeedbackTarget(proposition)}
                              title="Relatar inconsistência ou viés no resumo"
                              className="text-[11px] text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 transition-smooth flex items-center gap-1 cursor-pointer font-medium"
                            >
                              <FaFlag className="w-2.5 h-2.5" />
                              <span className="hidden sm:inline">Relatar problema</span>
                            </button>
                          </div>

                          {/* Resumo Geral da Proposição de Lei (até 4 frases) */}
                          {proposition.resumo_geral && (
                            <div className="space-y-1">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                                Sobre o Projeto de Lei:
                              </span>
                              <p className="text-sm text-foreground leading-relaxed font-normal">
                                {proposition.resumo_geral}
                              </p>
                            </div>
                          )}

                          {/* Deliberação Principal Integrada da Sessão de Votação */}
                          {isMerit ? (
                            (proposition.titulo_amigavel || proposition.resumo_simplificado || proposition.pergunta_cidadao) && (
                              <div className="pt-3 border-t border-primary/15 space-y-2">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                                  <FaVoteYea className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                  <span>
                                    {proposition.titulo_amigavel || "Deliberação Principal Votada no Plenário"}
                                  </span>
                                </div>

                                {proposition.resumo_simplificado && (
                                  <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed font-normal">
                                    {proposition.resumo_simplificado}
                                  </p>
                                )}

                                {/* Pergunta Direta para Reflexão do Cidadão */}
                                {proposition.pergunta_cidadao && (
                                  <div className="mt-2.5 p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs sm:text-sm font-semibold text-primary flex items-start gap-2">
                                    <FaQuestionCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                    <span>{proposition.pergunta_cidadao}</span>
                                  </div>
                                )}
                              </div>
                            )
                          ) : (
                            <div className="pt-3 border-t border-primary/15 space-y-1.5">
                              <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400">
                                <FaInfoCircle className="w-3.5 h-3.5 shrink-0" />
                                <span>Deliberação Simbólica (Desconsiderada no Cálculo de Afinidade)</span>
                              </div>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                O texto principal desta matéria foi aprovado ou rejeitado por <strong>votação simbólica</strong> em Plenário (sem registro nominal individual de votos no painel eletrônico). Esta proposição não possui votação de mérito e <strong>não pontua no cálculo de afinidade</strong>.
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Expansor das Ementas e Textos Oficiais da Câmara */}
                        <details className="group pt-0.5">
                          <summary className="text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer flex items-center gap-1.5 select-none list-none">
                            <FaInfoCircle className="w-3 h-3 text-primary" />
                            <span>Ver ementa do projeto e descrição oficial da votação da Câmara</span>
                            <FaChevronDown className="w-2.5 h-2.5 group-open:rotate-180 transition-transform" />
                          </summary>
                          <div className="mt-2 p-3.5 sm:p-4 rounded-xl bg-muted/30 border border-border/60 text-xs text-muted-foreground leading-relaxed space-y-2.5">
                            <div>
                              <strong className="text-foreground block mb-0.5">Ementa Oficial do Projeto:</strong>
                              <p>{proposition.ementa_detalhada || proposition.ementa}</p>
                            </div>
                            {proposition.vote_session_description && (
                              <div className="pt-2 border-t border-border/40">
                                <strong className="text-foreground block mb-0.5">Descrição Oficial da Votação no Plenário:</strong>
                                <p>{proposition.vote_session_description}</p>
                              </div>
                            )}
                          </div>
                        </details>
                      </>
                    ) : (
                      /* Exibição direta das Ementas Oficiais caso não haja IA processada */
                      <div className="p-4 rounded-xl bg-muted/30 border border-border/60 space-y-2">
                        <div>
                          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <FaInfoCircle className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span>Ementa Oficial do Projeto:</span>
                          </span>
                          <p className="text-sm text-foreground leading-relaxed font-normal mt-1">
                            {proposition.ementa_detalhada || proposition.ementa}
                          </p>
                        </div>
                        {proposition.vote_session_description && (
                          <div className="pt-2 border-t border-border/40">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                              <FaVoteYea className="w-3.5 h-3.5 text-primary shrink-0" />
                              <span>Descrição da Votação no Plenário:</span>
                            </span>
                            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-1">
                              {proposition.vote_session_description}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Link Oficial */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <Link
                        href={`/projetos/${proposition.id}`}
                        className="inline-flex items-center gap-1 text-primary hover:underline font-bold"
                      >
                        <span>Ver detalhes da tramitação e votos nominais</span>
                        <FaExternalLinkAlt className="w-2.5 h-2.5" />
                      </Link>
                    </div>

                    {/* Painel de Modificação de Resposta */}
                    {isMerit ? (
                      <div className="pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-3 bg-muted/20 -mx-5 -mb-5 sm:-mx-6 sm:-mb-6 p-4 sm:p-5 rounded-b-2xl">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-muted-foreground">
                            Sua Opinião Registrada:
                          </span>
                          <span
                            className={`px-3 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1 ${
                              isConcordo
                                ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                                : "bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30"
                            }`}
                          >
                            {isConcordo ? <FaCheck className="w-3 h-3" /> : <FaTimes className="w-3 h-3" />}
                            <span>{answer}</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleVoteChange(proposition.id, "CONCORDO")}
                            disabled={isConcordo}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-smooth cursor-pointer ${
                              isConcordo
                                ? "opacity-40 cursor-not-allowed bg-emerald-600 text-white"
                                : "bg-background border border-border text-foreground hover:bg-emerald-600 hover:text-white"
                            }`}
                          >
                            <FaCheck className="w-3 h-3" />
                            <span>Mudar para Concordo</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleVoteChange(proposition.id, "DISCORDO")}
                            disabled={!isConcordo}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-smooth cursor-pointer ${
                              !isConcordo
                                ? "opacity-40 cursor-not-allowed bg-rose-600 text-white"
                                : "bg-background border border-border text-foreground hover:bg-rose-600 hover:text-white"
                            }`}
                          >
                            <FaTimes className="w-3 h-3" />
                            <span>Mudar para Discordo</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemoveOpinion(proposition.id)}
                            title="Remover minha resposta desta proposta"
                            className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/20 transition-smooth cursor-pointer ml-1"
                          >
                            <FaTrashAlt className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-3 bg-muted/20 -mx-5 -mb-5 sm:-mx-6 sm:-mb-6 p-4 sm:p-5 rounded-b-2xl">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-muted-foreground">
                            Opinião Importada (Inativa no Cálculo):
                          </span>
                          <span
                            className={`px-3 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1 opacity-75 ${
                              isConcordo
                                ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                                : "bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30"
                            }`}
                          >
                            {isConcordo ? <FaCheck className="w-3 h-3" /> : <FaTimes className="w-3 h-3" />}
                            <span>{answer}</span>
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveOpinion(proposition.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 text-destructive bg-destructive/10 hover:bg-destructive/20 border border-destructive/30 transition-smooth cursor-pointer"
                        >
                          <FaTrashAlt className="w-3.5 h-3.5" />
                          <span>Remover desta Lista</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

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
