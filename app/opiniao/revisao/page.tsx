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
  FaFilter,
  FaSearch,
  FaLandmark,
  FaExclamationTriangle,
  FaSyncAlt,
} from "react-icons/fa";
import {
  getStoredAnswers,
  saveStoredAnswers,
  StoredAnswers,
} from "@/lib/storage";

export default function RevisaoPage() {
  const [propositions, setPropositions] = useState<PropositionWithVoteSession[]>([]);
  const [answers, setAnswers] = useState<StoredAnswers>({});
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const propsData = await cachedFetch("propositions", () =>
          fetch("/api/propositions").then((r) => r.json())
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

  function toggleStatus(st: string) {
    setSelectedStatus((prev) =>
      prev.includes(st) ? prev.filter((e) => e !== st) : [...prev, st]
    );
  }

  function toggleYear(year: number) {
    setSelectedYears((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year]
    );
  }

  function resetAllFilters() {
    setSelectedStatus([]);
    setSelectedYears([]);
    setSearch("");
  }

  // Filtragem das proposições respondidas
  const filteredList = useMemo(() => {
    let list = [...answeredPropositions];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (item) =>
          item.proposition.titulo.toLowerCase().includes(q) ||
          (item.proposition.ementa && item.proposition.ementa.toLowerCase().includes(q)) ||
          (item.proposition.tema && item.proposition.tema.toLowerCase().includes(q))
      );
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
  }, [answeredPropositions, search, selectedStatus, selectedYears]);

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
  const activeFiltersCount = selectedStatus.length + selectedYears.length;

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
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-background border border-border rounded-xl pl-10 pr-10 py-2.5 text-sm sm:text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-smooth"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 p-1 rounded-md text-muted-foreground hover:text-foreground text-xs hover:bg-muted transition-smooth"
                  title="Limpar busca"
                >
                  <FaTimes className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* 2. Controles de Filtragem */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/40">
              <button
                onClick={() => setShowFilterDrawer(!showFilterDrawer)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-smooth cursor-pointer font-bold ${
                  activeFiltersCount > 0 || showFilterDrawer
                    ? "bg-primary text-white border-primary shadow-soft"
                    : "bg-background border-border text-foreground hover:bg-muted"
                }`}
              >
                <FaFilter className="w-3 h-3" />
                <span>Filtros {activeFiltersCount > 0 ? `(${activeFiltersCount})` : "Avançados"}</span>
              </button>

              <Button variant="hero" size="sm" href="/afinidade" className="gap-1.5 text-xs font-bold shrink-0">
                <FaChartPie className="w-3.5 h-3.5" />
                <span>Ver Afinidade com Parlamentares</span>
              </Button>
            </div>

            {/* Painel Avançado: Filtros por Ano e Situação */}
            {showFilterDrawer && (
              <div className="pt-4 border-t border-border/60 space-y-4">
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
              </div>
            )}
          </div>

          {/* Lista de Proposições Respondidas */}
          {filteredList.length === 0 ? (
            <div className="p-8 rounded-xl bg-card border border-border text-center space-y-3 shadow-soft">
              <p className="text-muted-foreground text-sm">
                Nenhuma resposta corresponde aos filtros de busca atuais.
              </p>
              <Button variant="outline" size="sm" onClick={resetAllFilters}>
                Limpar Filtros
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredList.map(({ proposition, answer }) => {
                const isConcordo = answer === "CONCORDO";
                const situacaoAtual = proposition.ultimo_status || "Em Tramitação";
                const lastVoteDate = proposition.vote_session_date
                  ? new Date(proposition.vote_session_date).toLocaleDateString("pt-BR")
                  : null;
                const isAprovado = situacaoAtual.toLowerCase().includes("aprovad") || situacaoAtual.toLowerCase().includes("lei") || situacaoAtual.toLowerCase().includes("norma");
                const isEncerrado = situacaoAtual.toLowerCase().includes("arquivad") || situacaoAtual.toLowerCase().includes("rejeitad") || situacaoAtual.toLowerCase().includes("encerrad");

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
                          <span className="text-xs text-muted-foreground">
                            {proposition.sigla_tipo} nº {proposition.numero}/{proposition.ano}
                          </span>
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
                      </div>
                    </div>

                    {/* Descrição */}
                    <p className="text-sm text-foreground/90 leading-relaxed font-normal">
                      {proposition.ementa_detalhada || proposition.ementa}
                    </p>

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
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </main>
  );
}
