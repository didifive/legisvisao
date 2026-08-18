"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { cachedFetch } from "@/lib/cache";
import type { ProjectWithLastVote } from "@/types/db";
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
  const [projects, setProjects] = useState<ProjectWithLastVote[]>([]);
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
        const projectsData = await cachedFetch("projects", () =>
          fetch("/api/projects").then((r) => r.json())
        );

        const savedAnswers = getStoredAnswers();

        if (!mounted) return;
        setAnswers(savedAnswers);
        setProjects(projectsData.projects || []);
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

  const projectsById = useMemo(() => {
    const map = new Map<number, ProjectWithLastVote>();
    for (const p of projects) {
      map.set(p.id, p);
    }
    return map;
  }, [projects]);

  // Lista apenas os projetos que o usuário já respondeu
  const answeredProjects = useMemo(() => {
    const list: Array<{ project: ProjectWithLastVote; answer: "CONCORDO" | "DISCORDO" }> = [];
    for (const [projectIdStr, answer] of Object.entries(answers)) {
      const pId = Number(projectIdStr);
      const project = projectsById.get(pId);
      if (project) {
        list.push({ project, answer });
      }
    }
    return list;
  }, [answers, projectsById]);

  // Situações presentes nos projetos respondidos
  const availableStatus = useMemo(() => {
    const statusSet = new Set<string>();
    for (const item of answeredProjects) {
      const st = item.project.current_status || "Em Tramitação";
      if (st) statusSet.add(st);
    }
    return Array.from(statusSet).sort();
  }, [answeredProjects]);

  // Anos presentes nos projetos respondidos
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    for (const item of answeredProjects) {
      const yr = item.project.year;
      if (yr && !Number.isNaN(yr)) yearsSet.add(yr);
    }
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [answeredProjects]);

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

  // Filtragem dos projetos respondidos
  const filteredList = useMemo(() => {
    let list = [...answeredProjects];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (item) =>
          item.project.title.toLowerCase().includes(q) ||
          (item.project.description && item.project.description.toLowerCase().includes(q)) ||
          (item.project.canonical_id && item.project.canonical_id.toLowerCase().includes(q))
      );
    }

    if (selectedStatus.length > 0) {
      list = list.filter((item) => {
        const st = item.project.current_status || "Em Tramitação";
        return selectedStatus.includes(st);
      });
    }

    if (selectedYears.length > 0) {
      list = list.filter((item) => selectedYears.includes(item.project.year));
    }

    // Ordenação mais recente primeiro
    list.sort((a, b) => {
      const da = (p: ProjectWithLastVote) => {
        const dateStr = p.last_vote_date || p.last_event_date || p.last_updated_at;
        return dateStr ? new Date(dateStr).getTime() : 0;
      };
      return da(b.project) - da(a.project);
    });

    return list;
  }, [answeredProjects, search, selectedStatus, selectedYears]);

  function handleVoteChange(projectId: number, opinion: "CONCORDO" | "DISCORDO") {
    const updated = { ...answers, [projectId]: opinion };
    setAnswers(updated);
    saveStoredAnswers(updated);
  }

  function handleRemoveOpinion(projectId: number) {
    const updated = { ...answers };
    delete updated[projectId];
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

  if (projects.length === 0) {
    return (
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        <div className="p-8 sm:p-10 rounded-2xl bg-card border border-border text-center space-y-5 shadow-soft max-w-2xl mx-auto my-6 animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
            <FaExclamationTriangle className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">
              Base de dados legislativos indisponível
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
              Nenhuma proposição oficial foi carregada no banco de dados. Os dados precisam ser sincronizados com as bases oficiais da Câmara dos Deputados e do Senado Federal.
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
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
      {/* Breadcrumb e Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link href="/opiniao" className="hover:text-primary transition-smooth flex items-center gap-1">
              <FaArrowLeft className="w-3 h-3" />
              <span>Análise de Propostas</span>
            </Link>
            <span>/</span>
            <span className="text-foreground font-semibold">Minhas Opiniões</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Revisão de Opiniões Registradas
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Veja e altere as suas respostas salvas localmente no seu dispositivo.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" href="/opiniao">
            Analisar Mais
          </Button>
          {totalCount > 0 && (
            <Button variant="hero" size="sm" href="/afinidade">
              Ver Afinidade &rarr;
            </Button>
          )}
        </div>
      </div>

      {/* Se não respondeu nenhuma */}
      {totalCount === 0 ? (
        <div className="p-10 rounded-2xl bg-card border border-border text-center space-y-4 shadow-soft">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <FaChartPie className="w-6 h-6" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-foreground">
            Você ainda não registrou opiniões sobre as propostas.
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
            Avalie os projetos de lei reais deliberados no Congresso Nacional para descobrir quais deputados, senadores e partidos pensam como você.
          </p>
          <div className="pt-2">
            <Button variant="hero" href="/opiniao">
              Começar a Avaliar Propostas
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Card Resumo de Posicionamentos */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-card border border-border shadow-soft flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground block">Total Analisadas</span>
                <span className="text-2xl font-black text-foreground">{totalCount}</span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <FaFileAlt className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border shadow-soft flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground block">Posicionamentos "Concordo"</span>
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{concordoCount}</span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <FaCheck className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border shadow-soft flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground block">Posicionamentos "Discordo"</span>
                <span className="text-2xl font-black text-rose-600 dark:text-rose-400">{discordoCount}</span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center">
                <FaTimes className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Filtros e Busca dentro das Respondidas */}
          <div className="p-4 rounded-xl bg-card border border-border shadow-soft space-y-3">
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
              <div className="flex flex-1 items-center gap-2 bg-background border border-border rounded-lg px-3 py-1.5 focus-within:ring-2 focus-within:ring-primary/20">
                <FaSearch className="text-muted-foreground w-4 h-4" />
                <input
                  type="text"
                  placeholder="Filtrar suas opiniões por palavra-chave ou número..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFilterDrawer(!showFilterDrawer)}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-smooth cursor-pointer ${
                    activeFiltersCount > 0 || showFilterDrawer
                      ? "bg-primary text-white border-primary shadow-soft"
                      : "bg-background border-border text-foreground hover:bg-muted"
                  }`}
                >
                  <FaFilter className="w-3 h-3" />
                  <span>Filtros {activeFiltersCount > 0 ? `(${activeFiltersCount})` : "Avançados"}</span>
                </button>
              </div>
            </div>

            {/* Painel Avançado de Filtros */}
            {showFilterDrawer && (
              <div className="pt-3 border-t border-border/60 space-y-3">
                {/* Por Ano */}
                {availableYears.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-foreground">
                      <span className="flex items-center gap-1">
                        <FaCalendarAlt className="text-primary w-3 h-3" />
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
                    <div className="flex flex-wrap gap-1.5">
                      {availableYears.map((yr) => {
                        const isChecked = selectedYears.includes(yr);
                        return (
                          <button
                            key={yr}
                            onClick={() => toggleYear(yr)}
                            className={`px-2.5 py-0.5 rounded-md border text-xs font-semibold transition-smooth cursor-pointer ${
                              isChecked
                                ? "bg-primary text-white border-primary"
                                : "bg-background border-border text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {yr}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Por Situação */}
                {availableStatus.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-border/40">
                    <div className="flex items-center justify-between text-xs font-bold text-foreground">
                      <span className="flex items-center gap-1">
                        <FaInfoCircle className="text-secondary w-3 h-3" />
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {availableStatus.map((st) => {
                        const isChecked = selectedStatus.includes(st);
                        return (
                          <label
                            key={st}
                            className={`flex items-center gap-2 p-1.5 rounded-md border text-xs cursor-pointer transition-smooth ${
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
                )}
              </div>
            )}
          </div>

          {/* Lista de Opiniões Registradas */}
          {filteredList.length === 0 ? (
            <div className="p-8 rounded-xl bg-card border border-border text-center space-y-3 shadow-soft">
              <p className="text-sm text-muted-foreground">
                Nenhuma opinião registrada encontrada para os filtros selecionados.
              </p>
              <Button variant="outline" size="sm" onClick={resetAllFilters}>
                Limpar Filtros
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredList.map(({ project, answer }) => {
                const isConcordo = answer === "CONCORDO";
                const situacaoAtual = project.current_status || "Em Tramitação";
                const lastVoteDate = project.last_vote_date
                  ? new Date(project.last_vote_date).toLocaleDateString("pt-BR")
                  : null;
                const houses = project.houses || "Congresso Nacional";
                const isAprovado = situacaoAtual.toLowerCase().includes("aprovad") || situacaoAtual.toLowerCase().includes("lei") || situacaoAtual.toLowerCase().includes("norma");
                const isEncerrado = situacaoAtual.toLowerCase().includes("arquivad") || situacaoAtual.toLowerCase().includes("rejeitad") || situacaoAtual.toLowerCase().includes("encerrad");

                return (
                  <div
                    key={project.id}
                    className="p-5 rounded-2xl bg-card border border-border shadow-soft hover:shadow-medium transition-smooth space-y-4"
                  >
                    {/* Header do Card */}
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="p-2 rounded-lg bg-primary/10 text-primary">
                          <FaFileAlt className="w-4 h-4" />
                        </span>
                        <div>
                          <h3 className="font-extrabold text-foreground text-base sm:text-lg">
                            {project.title}
                          </h3>
                          <span className="text-xs text-muted-foreground">
                            {project.canonical_id || `${project.type} nº ${project.number}/${project.year}`}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold">
                          <FaLandmark className="w-3 h-3" />
                          <span>{houses}</span>
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
                      {project.description}
                    </p>

                    {/* Link Oficial */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <Link
                        href={`/projetos/${project.id}`}
                        className="inline-flex items-center gap-1 text-primary hover:underline font-bold"
                      >
                        <span>Ver detalhes da tramitação e votos nominais</span>
                        <FaExternalLinkAlt className="w-2.5 h-2.5" />
                      </Link>
                    </div>

                    {/* Painel de Modificação de Resposta */}
                    <div className="pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-3 bg-muted/20 -mx-5 -mb-5 p-4 rounded-b-2xl">
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
                          onClick={() => handleVoteChange(project.id, "CONCORDO")}
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
                          onClick={() => handleVoteChange(project.id, "DISCORDO")}
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
                          onClick={() => handleRemoveOpinion(project.id)}
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

          {/* CTA para Calcular Afinidade */}
          <div className="pt-4 flex justify-center">
            <Button variant="hero" size="lg" href="/afinidade" className="w-full sm:w-auto px-10">
              Calcular e Ver Afinidade Política &rarr;
            </Button>
          </div>
        </>
      )}
    </main>
  );
}
