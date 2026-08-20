"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  FaArrowLeft,
  FaFileAlt,
  FaLandmark,
  FaInfoCircle,
  FaCalendarAlt,
  FaExternalLinkAlt,
  FaVoteYea,
  FaCheck,
  FaTimes,
  FaSearch,
  FaHistory,
  FaBolt,
  FaQuestionCircle,
  FaLayerGroup,
  FaFilter,
  FaCheckCircle,
  FaUserTie,
  FaChevronDown,
  FaChevronUp,
  FaRobot,
} from "react-icons/fa";
import type { Proposition, VoteSession } from "@/types/db";
import { normalizeVote } from "@/lib/match/normalizeVotes";
import {
  getStoredAnswers,
  saveStoredAnswers,
} from "@/lib/storage";

import {
  sortVoteSessionsDeterministic,
} from "@/lib/match/classifyVoteSession";

interface RawVote {
  id: number;
  votacao_id: string;
  deputado_id: number;
  sigla_partido: string;
  voto_original: string;
  deputado_nome: string;
  deputado_uf: string;
  deputado_foto: string | null;
}

interface ProjectDetailsClientProps {
  proposition: Proposition;
  sessions: VoteSession[];
  votes: RawVote[];
}

export default function ProjectDetailsClient({
  proposition,
  sessions,
  votes,
}: Readonly<ProjectDetailsClientProps>) {
  const [userOpinion, setUserOpinion] = useState<"CONCORDO" | "DISCORDO" | null>(null);
  const [voteSearch, setVoteSearch] = useState("");
  const [filterParty, setFilterParty] = useState<string>("ALL");
  const [filterState, setFilterState] = useState<string>("ALL");
  const [filterVoteType, setFilterVoteType] = useState<string>("ALL");
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [showVotesList, setShowVotesList] = useState(false);

  useEffect(() => {
    const stored = getStoredAnswers();
    if (stored[proposition.id]) {
      setUserOpinion(stored[proposition.id]);
    }

    const handleStorageUpdate = () => {
      const updated = getStoredAnswers();
      setUserOpinion(updated[proposition.id] || null);
    };

    window.addEventListener("storage-answers-updated", handleStorageUpdate);
    window.addEventListener("storage", handleStorageUpdate);

    return () => {
      window.removeEventListener("storage-answers-updated", handleStorageUpdate);
      window.removeEventListener("storage", handleStorageUpdate);
    };
  }, [proposition.id]);

  function handleVote(opinion: "CONCORDO" | "DISCORDO") {
    const current = getStoredAnswers();
    const updated = { ...current, [proposition.id]: opinion };
    setUserOpinion(opinion);
    saveStoredAnswers(updated);
  }

  // Agrupa votos nominais por ID de sessão de votação
  const votesBySession = useMemo(() => {
    const map = new Map<string, RawVote[]>();
    for (const v of votes) {
      const arr = map.get(v.votacao_id) || [];
      arr.push(v);
      map.set(v.votacao_id, arr);
    }
    return map;
  }, [votes]);

  // Classifica e ordena sessões de votação com votos nominais determinísticos
  const classifiedSessions = useMemo(() => {
    const list = sessions.map((s) => {
      const sessionVotes = votesBySession.get(s.id) || [];
      return {
        ...s,
        votesCount: sessionVotes.length,
        votes: sessionVotes,
      };
    });

    // Ordenação determinística estrita:
    // 1. Sessões com votos nominais primeiro
    // 2. Prioridade de Mérito e desempate estrito por data e ID
    const sorted = sortVoteSessionsDeterministic(list);

    return sorted.sort((a, b) => {
      const hasVotesA = a.votesCount > 0 ? 1 : 0;
      const hasVotesB = b.votesCount > 0 ? 1 : 0;
      return hasVotesB - hasVotesA;
    });
  }, [sessions, votesBySession]);

  // Define a sessão principal (utilizada no cálculo de afinidade)
  const primarySession = useMemo(() => {
    const withVotes = classifiedSessions.filter((s) => s.votesCount > 0);
    return withVotes[0] || classifiedSessions[0] || null;
  }, [classifiedSessions]);

  // Inicializa selectedSessionId com a sessão principal
  useEffect(() => {
    if (!selectedSessionId && primarySession) {
      setSelectedSessionId(primarySession.id);
    }
  }, [primarySession, selectedSessionId]);

  // Sessão atualmente ativa para inspeção
  const activeSession = useMemo(() => {
    return (
      classifiedSessions.find((s) => s.id === selectedSessionId) ||
      primarySession
    );
  }, [classifiedSessions, selectedSessionId, primarySession]);

  // Votos pertencentes estritamente à sessão ativa
  const activeSessionVotes = useMemo(() => {
    if (!activeSession) return [];
    return votesBySession.get(activeSession.id) || [];
  }, [activeSession, votesBySession]);

  // Lista de Partidos e Estados disponíveis na sessão ativa
  const availableParties = useMemo(() => {
    const pSet = new Set<string>();
    for (const v of activeSessionVotes) {
      if (v.sigla_partido) pSet.add(v.sigla_partido.toUpperCase());
    }
    return Array.from(pSet).sort();
  }, [activeSessionVotes]);

  const availableStates = useMemo(() => {
    const sSet = new Set<string>();
    for (const v of activeSessionVotes) {
      if (v.deputado_uf) sSet.add(v.deputado_uf.toUpperCase());
    }
    return Array.from(sSet).sort();
  }, [activeSessionVotes]);

  // Estatísticas de Votação da Sessão Ativa
  const activeVoteStats = useMemo(() => {
    let sim = 0;
    let nao = 0;
    let outros = 0;

    for (const v of activeSessionVotes) {
      const norm = normalizeVote(v.voto_original);
      if (norm === "SIM") sim++;
      else if (norm === "NÃO") nao++;
      else outros++;
    }

    const total = sim + nao + outros;
    const simPct = total > 0 ? Math.round((sim / total) * 100) : 0;
    const naoPct = total > 0 ? Math.round((nao / total) * 100) : 0;
    const outrosPct = total > 0 ? Math.round((outros / total) * 100) : 0;

    return { sim, nao, outros, total, simPct, naoPct, outrosPct };
  }, [activeSessionVotes]);

  // Votos filtrados da sessão ativa
  const filteredVotes = useMemo(() => {
    return activeSessionVotes.filter((v) => {
      // Busca por nome
      if (voteSearch) {
        const q = voteSearch.toLowerCase();
        const matchesName = (v.deputado_nome || "").toLowerCase().includes(q);
        if (!matchesName) return false;
      }

      // Filtro de Partido
      if (filterParty !== "ALL" && (v.sigla_partido || "").toUpperCase() !== filterParty) {
        return false;
      }

      // Filtro de Estado
      if (filterState !== "ALL" && (v.deputado_uf || "").toUpperCase() !== filterState) {
        return false;
      }

      // Filtro de Tipo de Voto
      if (filterVoteType !== "ALL") {
        const norm = normalizeVote(v.voto_original);
        if (filterVoteType === "SIM" && norm !== "SIM") return false;
        if (filterVoteType === "NAO" && norm !== "NÃO") return false;
        if (filterVoteType === "OUTROS" && norm !== null) return false;
      }

      return true;
    });
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

  const situacaoAtual = proposition.ultimo_status || "Em Tramitação";
  const isAprovado =
    situacaoAtual.toLowerCase().includes("aprovad") ||
    situacaoAtual.toLowerCase().includes("transformad") ||
    situacaoAtual.toLowerCase().includes("norma");
  const isArquivado =
    situacaoAtual.toLowerCase().includes("arquivad") ||
    situacaoAtual.toLowerCase().includes("rejeitad") ||
    situacaoAtual.toLowerCase().includes("encerrad");

  const nominalSessions = classifiedSessions.filter((s) => s.votesCount > 0);
  const isPrimaryActive = activeSession?.id === primarySession?.id;

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
      <div className="p-6 sm:p-8 rounded-2xl bg-card border border-border shadow-soft space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold">
              <FaLandmark className="w-3 h-3" />
              <span>Câmara dos Deputados</span>
            </span>

            {proposition.tema && (
              <span className="px-3 py-1 rounded-full bg-secondary/10 text-secondary border border-secondary/20 text-xs font-bold">
                {proposition.tema}
              </span>
            )}

            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${isAprovado
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : isArquivado
                    ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                    : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                }`}
            >
              <FaInfoCircle className="w-3 h-3" />
              <span>{situacaoAtual}</span>
            </span>
          </div>

          {presentationDate && (
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <FaCalendarAlt className="w-3.5 h-3.5 text-primary" />
              <span>Apresentado em {presentationDate}</span>
            </span>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0 mt-1">
              <FaFileAlt className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground leading-tight">
                {proposition.titulo}
              </h1>
              <p className="text-sm font-semibold text-muted-foreground mt-0.5">
                {proposition.sigla_tipo} {proposition.numero}/{proposition.ano}
              </p>
            </div>
          </div>

          <p className="text-base text-foreground leading-relaxed font-normal pt-2">
            {proposition.ementa_detalhada || proposition.ementa}
          </p>
        </div>

        {/* Link Oficial da Câmara */}
        {proposition.url_inteiro_teor && (
          <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Documento Oficial:</span>
            <a
              href={proposition.url_inteiro_teor}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-primary hover:underline font-bold"
            >
              <span>Acessar Inteiro Teor na Câmara</span>
              <FaExternalLinkAlt className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Painel de Opinião do Cidadão */}
        <div className="pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/20 -mx-6 -mb-6 sm:-mx-8 sm:-mb-8 p-5 sm:p-6 rounded-b-2xl">
          <div className="space-y-1">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
              Sua Opinião sobre este Projeto:
            </span>
            <div className="flex items-center gap-2">
              {userOpinion ? (
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs sm:text-sm font-extrabold border ${userOpinion === "CONCORDO"
                      ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                      : "bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30"
                    }`}
                >
                  {userOpinion === "CONCORDO" ? (
                    <FaCheck className="w-3.5 h-3.5" />
                  ) : (
                    <FaTimes className="w-3.5 h-3.5" />
                  )}
                  <span>Você votou: {userOpinion}</span>
                </span>
              ) : (
                <span className="text-xs text-muted-foreground italic">
                  Você ainda não opinou nesta proposta no simulador.
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleVote("CONCORDO")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-smooth cursor-pointer shadow-soft ${userOpinion === "CONCORDO"
                  ? "bg-emerald-600 text-white ring-2 ring-emerald-600/40"
                  : "bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white"
                }`}
            >
              <FaCheck className="w-3.5 h-3.5" />
              <span>CONCORDO</span>
            </button>

            <button
              onClick={() => handleVote("DISCORDO")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-smooth cursor-pointer shadow-soft ${userOpinion === "DISCORDO"
                  ? "bg-rose-600 text-white ring-2 ring-rose-600/40"
                  : "bg-rose-600/20 text-rose-700 dark:text-rose-300 hover:bg-rose-600 hover:text-white"
                }`}
            >
              <FaTimes className="w-3.5 h-3.5" />
              <span>DISCORDO</span>
            </button>
          </div>
        </div>
      </div>

      {/* Painel de Deliberações e Votações Nominais */}
      {nominalSessions.length > 0 ? (
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <FaVoteYea className="text-primary w-5 h-5" />
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Deliberações Nominais no Plenário
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {nominalSessions.length} {nominalSessions.length === 1 ? "votação nominal registrada" : "votações nominais registradas"}
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

          {/* Seletor de Sessões de Votação (Abas / Botões de Seleção) */}
          {nominalSessions.length > 1 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <FaLayerGroup className="w-3 h-3 text-primary" />
                  <span>Selecione a deliberação para inspecionar os votos:</span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {nominalSessions.map((s) => {
                  const isSelected = s.id === activeSession?.id;
                  const isMain = s.id === primarySession?.id;
                  const sDate = s.data_hora
                    ? new Date(s.data_hora).toLocaleDateString("pt-BR")
                    : "";

                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedSessionId(s.id)}
                      className={`p-3 rounded-xl border text-left transition-smooth flex flex-col justify-between gap-2 cursor-pointer ${isSelected
                          ? "bg-primary/10 border-primary text-foreground shadow-soft ring-1 ring-primary/30"
                          : "bg-card border-border hover:border-border/80 text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      <div className="flex items-center justify-between gap-1.5 w-full flex-wrap">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${s.classification.badgeClass}`}>
                          {s.classification.label}
                        </span>
                        {isMain && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                            <FaBolt className="w-2.5 h-2.5" />
                            <span>Principal</span>
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-semibold text-foreground line-clamp-2 leading-snug">
                        {s.titulo_amigavel || s.descricao || "Deliberação em Plenário"}
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40 w-full">
                        <span>{sDate}</span>
                        <span><strong>{s.votesCount}</strong> votos</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Detalhe da Sessão Ativa & Placar */}
          {activeSession && (
            <div className="p-6 rounded-2xl bg-card border border-border shadow-soft space-y-6">
              {/* Header da Deliberação Selecionada */}
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {isPrimaryActive ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        <FaBolt className="w-3.5 h-3.5" />
                        <span>Votação Principal • Utilizada no Cálculo de Afinidade</span>
                      </span>
                    ) : (
                      <span className={`text-xs font-bold px-3 py-1 rounded-lg border ${activeSession.classification.badgeClass}`}>
                        {activeSession.classification.label}
                      </span>
                    )}

                    <Link
                      href="/faq#multiplas-votacoes"
                      title="Entenda por que a votação principal é a utilizada no cálculo"
                      className="text-muted-foreground hover:text-primary transition-smooth text-xs flex items-center gap-1"
                    >
                      <FaQuestionCircle className="w-3.5 h-3.5" />
                      <span className="sr-only">Como funciona</span>
                    </Link>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {activeDateFormatted && (
                      <span>Votado em: <strong>{activeDateFormatted}</strong></span>
                    )}
                    {activeSession.resultado && (
                      <span className="px-2.5 py-0.5 rounded-full bg-muted font-bold text-foreground">
                        {activeSession.resultado}
                      </span>
                    )}
                  </div>
                </div>

                {/* Apresentação Amigável com Nota de IA e Expansão do Original */}
                {activeSession.resumo_simplificado ? (
                  <div className="p-4 sm:p-5 rounded-2xl bg-primary/5 border border-primary/20 space-y-3 shadow-soft">
                    <div className="space-y-1.5">
                      <h4 className="text-base sm:text-lg font-extrabold text-foreground">
                        {activeSession.titulo_amigavel || activeSession.descricao}
                      </h4>
                      <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed font-normal">
                        {activeSession.resumo_simplificado}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1">
                      <FaRobot className="w-3 h-3 text-primary shrink-0" />
                      <span>Resumo simplificado gerado por Inteligência Artificial a partir dos registros oficiais da Câmara.</span>
                    </div>

                    {/* Detalhes para expandir a descrição original */}
                    <details className="group pt-2 border-t border-border/40">
                      <summary className="text-xs font-bold text-primary cursor-pointer hover:underline flex items-center gap-1.5 select-none list-none">
                        <FaInfoCircle className="w-3.5 h-3.5" />
                        <span>Ver descrição técnica oficial da Câmara</span>
                        <FaChevronDown className="w-2.5 h-2.5 group-open:rotate-180 transition-transform" />
                      </summary>
                      <div className="mt-2.5 p-3 rounded-xl bg-background border border-border text-xs text-muted-foreground leading-relaxed">
                        {activeSession.descricao}
                      </div>
                    </details>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground leading-relaxed pt-1">
                    <strong>Descrição Oficial da Câmara:</strong> {activeSession.descricao}
                  </p>
                )}
              </div>

              {/* Placar e Distribuição da Votação */}
              <div className="space-y-3 pt-4 border-t border-border">
                <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                  <span>Placar Nominal dos Deputados Federais ({activeVoteStats.total} votos)</span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase block">
                      SIM ({activeVoteStats.simPct}%)
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-300">
                      {activeVoteStats.sim}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
                    <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase block">
                      NÃO ({activeVoteStats.naoPct}%)
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-rose-700 dark:text-rose-300">
                      {activeVoteStats.nao}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-muted text-center border border-border">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                      Outros ({activeVoteStats.outrosPct}%)
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-foreground">
                      {activeVoteStats.outros}
                    </span>
                  </div>
                </div>

                {/* Barra Visual de Proporção */}
                {activeVoteStats.total > 0 && (
                  <div className="w-full h-3 rounded-full overflow-hidden flex bg-muted shadow-inner">
                    <div
                      style={{ width: `${activeVoteStats.simPct}%` }}
                      className="bg-emerald-500 h-full transition-all duration-500"
                      title={`SIM: ${activeVoteStats.sim} (${activeVoteStats.simPct}%)`}
                    />
                    <div
                      style={{ width: `${activeVoteStats.naoPct}%` }}
                      className="bg-rose-500 h-full transition-all duration-500"
                      title={`NÃO: ${activeVoteStats.nao} (${activeVoteStats.naoPct}%)`}
                    />
                    <div
                      style={{ width: `${activeVoteStats.outrosPct}%` }}
                      className="bg-muted-foreground/30 h-full transition-all duration-500"
                      title={`Outros: ${activeVoteStats.outros} (${activeVoteStats.outrosPct}%)`}
                    />
                  </div>
                )}
              </div>

              {/* Botão para Expandir Lista Nominal de Deputados */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowVotesList(!showVotesList)}
                  className="w-full py-3 px-4 rounded-xl border border-border bg-muted/30 hover:bg-muted/60 transition-smooth font-bold text-xs sm:text-sm text-foreground flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FaUserTie className="w-4 h-4 text-primary" />
                  <span>
                    {showVotesList
                      ? "Ocultar votos nominais dos deputados"
                      : `Ver como cada deputado votou nesta sessão (${activeSessionVotes.length} votos)`}
                  </span>
                  {showVotesList ? <FaChevronUp className="w-3 h-3" /> : <FaChevronDown className="w-3 h-3" />}
                </button>
              </div>

              {/* Tabela/Lista Nominal de Votos dos Deputados (Expandível) */}
              {showVotesList && (
                <div className="space-y-4 pt-2 border-t border-border animate-fade-in">
                  {/* Filtros de Votação Nominal */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
                    {/* Busca por Nome */}
                    <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-1.5 focus-within:ring-2 focus-within:ring-primary/20">
                      <FaSearch className="text-muted-foreground w-3.5 h-3.5" />
                      <input
                        type="text"
                        placeholder="Buscar deputado..."
                        value={voteSearch}
                        onChange={(e) => setVoteSearch(e.target.value)}
                        className="w-full bg-transparent border-none outline-none text-xs text-foreground placeholder:text-muted-foreground"
                      />
                    </div>

                    {/* Filtro por Partido */}
                    <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-2.5 py-1.5">
                      <span className="text-muted-foreground font-medium">Partido:</span>
                      <select
                        value={filterParty}
                        onChange={(e) => setFilterParty(e.target.value)}
                        className="bg-transparent border-none outline-none text-xs text-foreground w-full cursor-pointer font-bold"
                      >
                        <option value="ALL">Todos os Partidos</option>
                        {availableParties.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Filtro por Estado */}
                    <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-2.5 py-1.5">
                      <span className="text-muted-foreground font-medium">UF:</span>
                      <select
                        value={filterState}
                        onChange={(e) => setFilterState(e.target.value)}
                        className="bg-transparent border-none outline-none text-xs text-foreground w-full cursor-pointer font-bold"
                      >
                        <option value="ALL">Todos os Estados</option>
                        {availableStates.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Filtro por Voto */}
                    <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-2.5 py-1.5">
                      <span className="text-muted-foreground font-medium">Voto:</span>
                      <select
                        value={filterVoteType}
                        onChange={(e) => setFilterVoteType(e.target.value)}
                        className="bg-transparent border-none outline-none text-xs text-foreground w-full cursor-pointer font-bold"
                      >
                        <option value="ALL">Todos os Votos</option>
                        <option value="SIM">Apenas SIM</option>
                        <option value="NAO">Apenas NÃO</option>
                        <option value="OUTROS">Abstenções / Outros</option>
                      </select>
                    </div>
                  </div>

                  {/* Lista com Virtualização / Grid Responsivo */}
                  {filteredVotes.length === 0 ? (
                    <div className="p-8 rounded-xl bg-muted/20 text-center space-y-2 border border-border/60">
                      <p className="text-sm text-muted-foreground">
                        Nenhum voto de parlamentar encontrado com os filtros selecionados.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[420px] overflow-y-auto pr-1">
                      {filteredVotes.map((v) => {
                        const norm = normalizeVote(v.voto_original);
                        const isSim = norm === "SIM";
                        const isNao = norm === "NÃO";

                        return (
                          <div
                            key={v.id}
                            className="p-2.5 rounded-xl bg-background border border-border/80 flex items-center justify-between gap-2 shadow-soft hover:border-border transition-smooth"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {v.deputado_foto ? (
                                <img
                                  src={v.deputado_foto}
                                  alt={v.deputado_nome}
                                  className="w-8 h-8 rounded-full object-cover shrink-0 border border-border/60 bg-muted"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 border border-border/60 text-muted-foreground">
                                  <FaUserTie className="w-4 h-4" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <Link
                                  href={`/politicos/${v.deputado_id}`}
                                  className="text-xs font-bold text-foreground hover:text-primary transition-smooth truncate block"
                                  title={v.deputado_nome}
                                >
                                  {v.deputado_nome}
                                </Link>
                                <span className="text-[11px] text-muted-foreground">
                                  {v.sigla_partido} • {v.deputado_uf}
                                </span>
                              </div>
                            </div>

                            <span
                              className={`px-2.5 py-0.5 rounded-lg text-[11px] font-black shrink-0 ${isSim
                                  ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                                  : isNao
                                    ? "bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30"
                                    : "bg-muted text-muted-foreground border border-border"
                                }`}
                            >
                              {v.voto_original}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      ) : (
        <div className="p-8 rounded-2xl bg-card border border-border text-center space-y-3 shadow-soft">
          <FaVoteYea className="w-8 h-8 text-muted-foreground mx-auto" />
          <h3 className="text-base font-bold text-foreground">
            Sem votações nominais registradas
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Esta proposta foi aprovada por votação simbólica ou ainda aguarda deliberação nominal no Plenário da Câmara.
          </p>
        </div>
      )}
    </main>
  );
}
