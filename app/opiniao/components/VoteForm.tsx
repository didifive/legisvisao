"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { cachedFetch } from "@/lib/cache";
import type { ProjectWithLastVote } from "@/types/db";
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
  FaExclamationTriangle,
  FaSyncAlt,
} from "react-icons/fa";
import { saveStoredAnswers, getStoredAnswers, StoredAnswers } from "@/lib/storage";

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
  const [projects, setProjects] = useState<ProjectWithLastVote[]>([]);
  const [answers, setAnswers] = useState<StoredAnswers>({});
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(10);
  const [shuffle, setShuffle] = useState(false);
  const [seed, setSeed] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [loading, setLoading] = useState(true);

  // Carregar projetos + opiniões existentes
  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const projectsData = await cachedFetch("projects", () =>
          fetch("/api/projects").then((r) => r.json())
        );

        const savedAnswers = getStoredAnswers();

        if (!mounted) return;

        setProjects(projectsData.projects || []);
        setAnswers(savedAnswers);
      } catch (err) {
        console.error("Erro ao carregar projetos:", err);
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

  function toggleShuffle(value: boolean) {
    setShuffle(value);
    if (value) {
      setSeed(Date.now());
    } else {
      setSeed(null);
    }
  }

  // Lista dinâmica de situações disponíveis nos projetos
  const availableStatus = useMemo(() => {
    const statusSet = new Set<string>();
    for (const p of projects) {
      const st = p.current_status || "Em Tramitação";
      if (st) statusSet.add(st);
    }
    return Array.from(statusSet).sort();
  }, [projects]);

  // Lista de anos disponíveis
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    for (const p of projects) {
      const year = p.year;
      if (year && !Number.isNaN(year)) yearsSet.add(year);
    }
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [projects]);

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

  const shuffledProjects = useMemo(() => {
    if (!shuffle || seed === null) return projects;
    return shuffleDeterministic(projects, seed);
  }, [shuffle, seed, projects]);

  const unvotedProjects = useMemo(() => {
    return shuffledProjects.filter((p) => !answers[p.id]);
  }, [shuffledProjects, answers]);

  const filtered = useMemo(() => {
    let list = [...unvotedProjects];

    // Filtro por busca de texto
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q)) ||
          (p.canonical_id && p.canonical_id.toLowerCase().includes(q))
      );
    }

    // Filtro por situação
    if (selectedStatus.length > 0) {
      list = list.filter((p) => {
        const st = p.current_status || "Em Tramitação";
        return selectedStatus.includes(st);
      });
    }

    // Filtro por anos
    if (selectedYears.length > 0) {
      list = list.filter((p) => selectedYears.includes(p.year));
    }

    if (!shuffle) {
      list.sort((a, b) => {
        const da = (p: ProjectWithLastVote) => {
          const dateStr = p.last_vote_date || p.last_event_date || p.last_updated_at;
          return dateStr ? new Date(dateStr).getTime() : 0;
        };
        return da(b) - da(a);
      });
    }

    return list.slice(0, limit);
  }, [unvotedProjects, search, limit, shuffle, selectedStatus, selectedYears]);

  function handleVote(projectId: number, opinion: "CONCORDO" | "DISCORDO") {
    const newAnswers = { ...answers, [projectId]: opinion };
    setAnswers(newAnswers);
    saveStoredAnswers(newAnswers);
  }

  const opinionsCount = Object.keys(answers).length;
  const activeFiltersCount = selectedStatus.length + selectedYears.length;

  if (loading) {
    return (
      <div className="py-12 text-center text-muted-foreground flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        <span>Carregando propostas legislativas com deliberação oficial...</span>
      </div>
    );
  }

  if (projects.length === 0) {
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
            Os dados oficiais de proposições legislativas e votações nominais não foram carregados ou ainda não foram sincronizados neste ambiente.
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
      <div className="p-4 rounded-xl bg-card border border-border shadow-soft space-y-3">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
          <div className="flex flex-1 items-center gap-2 bg-background border border-border rounded-lg px-3 py-1.5 focus-within:ring-2 focus-within:ring-primary/20">
            <FaSearch className="text-muted-foreground w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar proposta por tema, sigla ou número (ex: PL 2630)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            {/* Botão de Toggle do Painel de Filtros */}
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

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Exibir:</span>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="bg-background border border-border rounded-md px-2 py-1 text-xs text-foreground cursor-pointer"
              >
                <option value={5}>5 propostas</option>
                <option value={10}>10 propostas</option>
                <option value={20}>20 propostas</option>
                <option value={50}>50 propostas</option>
              </select>
            </div>

            <label className="flex items-center gap-1.5 text-xs text-foreground cursor-pointer bg-background border border-border px-2.5 py-1 rounded-md hover:bg-muted transition-smooth">
              <input
                type="checkbox"
                checked={shuffle}
                onChange={(e) => toggleShuffle(e.target.checked)}
                className="accent-primary"
              />
              <FaRandom className="w-3 h-3 text-secondary" />
              <span>Ordem aleatória</span>
            </label>

            {opinionsCount > 0 && (
              <Link
                href="/opiniao/revisao"
                className="text-xs font-semibold text-primary hover:underline ml-auto flex items-center gap-1"
              >
                <FaCheckCircle className="w-3.5 h-3.5" />
                <span>{opinionsCount} analisada(s)</span>
              </Link>
            )}
          </div>
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
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded transition-smooth ${
                      selectedYears.length === 0
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
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded transition-smooth ${
                      selectedStatus.length === 0
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

      {/* Lista de Propostas Pendentes */}
      {filtered.length === 0 ? (
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
              : "Você pode revisar suas opiniões registradas ou conferir o ranking de afinidade com os parlamentares e partidos."}
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
          {filtered.map((p) => {
            const situacaoAtual = p.current_status || "Em Tramitação";
            const lastVoteDate = p.last_vote_date
              ? new Date(p.last_vote_date).toLocaleDateString("pt-BR")
              : null;
            const houses = p.houses || "Congresso Nacional";
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
                        {p.title}
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        {p.canonical_id || `${p.type} nº ${p.number}/${p.year}`}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {/* Badge de Casa Legislativa */}
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold">
                      <FaLandmark className="w-3 h-3" />
                      <span>{houses}</span>
                    </span>

                    {/* Badge de Situação */}
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

                    {/* Última Deliberação */}
                    {lastVoteDate && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-muted-foreground font-medium">
                        <FaHistory className="w-3 h-3 text-primary" />
                        <span>Deliberado em: {lastVoteDate}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Ementa / Descrição */}
                <p className="text-sm text-foreground/90 leading-relaxed font-normal">
                  {p.description}
                </p>

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

                {/* Área de Posicionamento */}
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
              </div>
            );
          })}
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
    </div>
  );
}
