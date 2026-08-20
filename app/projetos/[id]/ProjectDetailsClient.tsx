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
  FaTrashAlt,
} from "react-icons/fa";
import type { Proposition, VoteSession } from "@/types/db";
import { normalizeVote } from "@/lib/match/normalizeVotes";
import {
  getStoredAnswers,
  saveStoredAnswers,
  getStoredGranularAnswers,
  saveStoredGranularAnswer,
  removeStoredGranularAnswer,
  StoredGranularAnswers,
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
  const [granularAnswers, setGranularAnswers] = useState<StoredGranularAnswers>({});
  const [voteSearch, setVoteSearch] = useState("");
  const [filterParty, setFilterParty] = useState<string>("ALL");
  const [filterState, setFilterState] = useState<string>("ALL");
  const [filterVoteType, setFilterVoteType] = useState<string>("ALL");
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [showVotesList, setShowVotesList] = useState(false);

  useEffect(() => {
    const stored = getStoredAnswers();
    const storedGranular = getStoredGranularAnswers();
    if (stored[proposition.id]) {
      setUserOpinion(stored[proposition.id]);
    }
    setGranularAnswers(storedGranular);

    const handleStorageUpdate = () => {
      const updated = getStoredAnswers();
      const updatedGranular = getStoredGranularAnswers();
      setUserOpinion(updated[proposition.id] || null);
      setGranularAnswers(updatedGranular);
    };

    window.addEventListener("storage-answers-updated", handleStorageUpdate);
    window.addEventListener("storage", handleStorageUpdate);

    return () => {
      window.removeEventListener("storage-answers-updated", handleStorageUpdate);
      window.removeEventListener("storage", handleStorageUpdate);
    };
  }, [proposition.id]);

  function handleVote(opinion: "CONCORDO" | "DISCORDO") {
    const stored = getStoredAnswers();
    const updated = { ...stored, [proposition.id]: opinion };
    saveStoredAnswers(updated);
    setUserOpinion(opinion);
  }

  function handleGranularVote(sessionId: string, opinion: "CONCORDO" | "DISCORDO") {
    saveStoredGranularAnswer(sessionId, opinion);
    setGranularAnswers((prev) => ({ ...prev, [sessionId]: opinion }));
  }

  function handleRemoveGranularVote(sessionId: string) {
    removeStoredGranularAnswer(sessionId);
    setGranularAnswers((prev) => {
      const { [sessionId]: _, ...rest } = prev;
      return rest;
    });
  }

  // Agrupa votos por votacao_id
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

  const nominalSessions = classifiedSessions.filter((s) => s.votesCount > 0);
  const isPrimaryActive = activeSession?.id === primarySession?.id;

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
        <Link href="/opiniao" className="hover:text-primary transition-smooth flex items-center gap-1">
          <FaArrowLeft className="w-3 h-3" />
          <span>Propostas</span>
        </Link>
        <span>/</span>
        <span className="text-foreground font-semibold">{proposition.titulo}</span>
      </div>

      {/* Header e Metadados Detalhados da Proposição */}
      <div className="p-6 sm:p-8 rounded-2xl bg-card border border-border shadow-soft space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold">
                <FaLandmark className="w-3 h-3" />
                Câmara dos Deputados (Plenário)
              </span>

              {proposition.tema && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border/50">
                  {proposition.tema}
                </span>
              )}

              {proposition.ultimo_status && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-secondary/10 text-secondary border border-secondary/20">
                  {proposition.ultimo_status}
                </span>
              )}

              {presentationDate && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <FaCalendarAlt className="w-3 h-3 text-muted-foreground/70" />
                  <span>Apresentado em {presentationDate}</span>
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              {proposition.titulo}
            </h1>
          </div>

          {/* Links Oficiais da Câmara */}
          <div className="flex flex-wrap gap-2 shrink-0">
            {proposition.url_camara && (
              <a
                href={proposition.url_camara}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-background hover:bg-muted text-xs font-bold transition-smooth shadow-soft"
              >
                <FaExternalLinkAlt className="w-3 h-3 text-primary" />
                <span>Página Oficial na Câmara</span>
              </a>
            )}

            {proposition.url_inteiro_teor && (
              <a
                href={proposition.url_inteiro_teor}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-bold transition-smooth"
              >
                <FaFileAlt className="w-3 h-3" />
                <span>Texto Integral (PDF)</span>
              </a>
            )}
          </div>
        </div>

        {/* Ementa Oficial */}
        <div className="p-4 sm:p-5 rounded-xl bg-muted/40 border border-border/70 space-y-2">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
            Ementa Oficial
          </span>
          <p className="text-sm sm:text-base text-foreground leading-relaxed">
            {proposition.ementa_detalhada || proposition.ementa}
          </p>
        </div>

        {/* Área de Posicionamento do Visitante */}
        <div className="p-5 rounded-xl bg-gradient-subtle border border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-soft">
          <div className="space-y-0.5 text-center sm:text-left">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Sua Opinião Cívica
            </span>
            <p className="text-sm font-semibold text-foreground">
              {userOpinion
                ? `Você registrou: ${userOpinion}`
                : "Qual é o seu posicionamento sobre esta proposta de lei?"}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
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

          {/* Seletor de Sessões de Votação (Abas / Botoes de Seleção) */}
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
                  const granularVote = granularAnswers[s.id];
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
                        <div className="flex items-center gap-1">
                          {granularVote && (
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${
                              granularVote === "CONCORDO"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                            }`}>
                              Voto: {granularVote}
                            </span>
                          )}
                          {isMain && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                              <FaBolt className="w-2.5 h-2.5" />
                              <span>Principal</span>
                            </span>
                          )}
                        </div>
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
              <div className="space-y-2">
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

                <p className="text-sm text-muted-foreground leading-relaxed pt-1">
                  <strong>Descrição Oficial da Câmara:</strong> {activeSession.descricao}
                </p>
              </div>

              {/* Card de Enriquecimento Cívico (IA) e Votação Granular */}
              <div className="p-5 rounded-2xl bg-primary/5 border border-primary/20 space-y-4 shadow-soft">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[11px] font-bold">
                    <FaRobot className="w-3 h-3" />
                    <span>{activeSession.resumo_simplificado ? "Tradução Cívica Neutra (IA)" : "Deliberação em Plenário"}</span>
                  </span>
                  {granularAnswers[activeSession.id] && (
                    <span className="text-xs font-bold text-muted-foreground">
                      Sua opinião nesta deliberação:{" "}
                      <strong className={granularAnswers[activeSession.id] === "CONCORDO" ? "text-emerald-600 dark:text-emerald-400 font-black" : "text-rose-600 font-black"}>
                        {granularAnswers[activeSession.id]}
                      </strong>
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <h4 className="text-base sm:text-lg font-extrabold text-foreground">
                    {activeSession.titulo_amigavel || activeSession.descricao}
                  </h4>
                  {activeSession.resumo_simplificado && (
                    <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                      {activeSession.resumo_simplificado}
                    </p>
                  )}
                </div>

                {/* Pergunta e Ações de Votação Granular */}
                <div className="pt-3 border-t border-border/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <p className="text-xs sm:text-sm font-bold text-foreground">
                    {activeSession.pergunta_cidadao || "Qual é o seu posicionamento sobre esta deliberação específica?"}
                  </p>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleGranularVote(activeSession.id, "CONCORDO")}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-smooth cursor-pointer shadow-soft ${
                        granularAnswers[activeSession.id] === "CONCORDO"
                          ? "bg-emerald-600 text-white ring-2 ring-emerald-600/40"
                          : "bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white"
                      }`}
                    >
                      <FaCheck className="w-3 h-3" />
                      <span>CONCORDO</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleGranularVote(activeSession.id, "DISCORDO")}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-smooth cursor-pointer shadow-soft ${
                        granularAnswers[activeSession.id] === "DISCORDO"
                          ? "bg-rose-600 text-white ring-2 ring-rose-600/40"
                          : "bg-rose-600/20 text-rose-700 dark:text-rose-300 hover:bg-rose-600 hover:text-white"
                      }`}
                    >
                      <FaTimes className="w-3 h-3" />
                      <span>DISCORDO</span>
                    </button>

                    {granularAnswers[activeSession.id] && (
                      <button
                        type="button"
                        onClick={() => handleRemoveGranularVote(activeSession.id)}
                        title="Limpar minha opinião nesta deliberação"
                        className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-smooth cursor-pointer ml-1"
                      >
                        <FaTrashAlt className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Placar Numérico e Barra Empilhada da Deliberação Selecionada */}
              <div className="space-y-4 pt-2 border-t border-border/60">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                      SIM (A favor)
                    </span>
                    <p className="text-2xl sm:text-3xl font-black text-foreground">{activeVoteStats.sim}</p>
                    <span className="text-xs text-muted-foreground">{activeVoteStats.simPct}% dos votos</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase">
                      NÃO (Contra)
                    </span>
                    <p className="text-2xl sm:text-3xl font-black text-foreground">{activeVoteStats.nao}</p>
                    <span className="text-xs text-muted-foreground">{activeVoteStats.naoPct}% dos votos</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-bold text-muted-foreground uppercase">
                      Outros / Abstenções
                    </span>
                    <p className="text-2xl sm:text-3xl font-black text-foreground">{activeVoteStats.outros}</p>
                    <span className="text-xs text-muted-foreground">{activeVoteStats.outrosPct}%</span>
                  </div>
                </div>

                {/* Barra empilhada */}
                <div className="w-full bg-muted h-3.5 rounded-full overflow-hidden flex border border-border/50">
                  <div
                    style={{ width: `${activeVoteStats.simPct}%` }}
                    className="bg-emerald-500 transition-all duration-500"
                    title={`Sim: ${activeVoteStats.sim}`}
                  />
                  <div
                    style={{ width: `${activeVoteStats.naoPct}%` }}
                    className="bg-rose-500 transition-all duration-500"
                    title={`Não: ${activeVoteStats.nao}`}
                  />
                  <div
                    style={{ width: `${activeVoteStats.outrosPct}%` }}
                    className="bg-slate-400 transition-all duration-500"
                    title={`Outros: ${activeVoteStats.outros}`}
                  />
                </div>
              </div>

              {/* Botão para Expandir / Recolher Lista Detalhada de Deputados */}
              <div className="space-y-4 pt-2">
                <button
                  type="button"
                  onClick={() => setShowVotesList(!showVotesList)}
                  className="w-full p-4 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 hover:border-primary/40 flex items-center justify-between transition-smooth font-bold text-sm text-foreground cursor-pointer shadow-soft group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <FaUserTie className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <span>{showVotesList ? "Ocultar lista de votos dos deputados" : "Ver lista detalhada de votos dos deputados"}</span>
                      <span className="text-xs text-muted-foreground block font-normal">
                        {activeSessionVotes.length} {activeSessionVotes.length === 1 ? "parlamentar registrou voto" : "parlamentares registraram voto"} nesta deliberação
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-primary font-bold text-xs group-hover:translate-x-0.5 transition-smooth shrink-0">
                    <span>{showVotesList ? "Recolher" : "Expandir"}</span>
                    {showVotesList ? <FaChevronUp className="w-3.5 h-3.5" /> : <FaChevronDown className="w-3.5 h-3.5" />}
                  </div>
                </button>

                {/* Filtros e Grid de Votos Nominais (Exibidos apenas quando expandido) */}
                {showVotesList && (
                  <div className="space-y-4 pt-2 animate-fade-in">
                    {/* Filtros da Tabela de Votos Nominais */}
                    <div className="p-4 rounded-xl bg-muted/30 border border-border/80 flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-1.5 focus-within:ring-2 focus-within:ring-primary/20 flex-1 min-w-[200px]">
                        <FaSearch className="text-muted-foreground w-3.5 h-3.5" />
                        <input
                          type="text"
                          placeholder="Buscar parlamentar nesta deliberação..."
                          value={voteSearch}
                          onChange={(e) => setVoteSearch(e.target.value)}
                          className="w-full bg-transparent border-none outline-none text-xs sm:text-sm text-foreground"
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <select
                          value={filterParty}
                          onChange={(e) => setFilterParty(e.target.value)}
                          className="bg-background border border-border rounded-md px-2.5 py-1 text-foreground"
                        >
                          <option value="ALL">Todos os Partidos</option>
                          {availableParties.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>

                        <select
                          value={filterState}
                          onChange={(e) => setFilterState(e.target.value)}
                          className="bg-background border border-border rounded-md px-2.5 py-1 text-foreground"
                        >
                          <option value="ALL">Todos os Estados</option>
                          {availableStates.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>

                        <select
                          value={filterVoteType}
                          onChange={(e) => setFilterVoteType(e.target.value)}
                          className="bg-background border border-border rounded-md px-2.5 py-1 text-foreground"
                        >
                          <option value="ALL">Todos os Votos</option>
                          <option value="SIM">Apenas SIM</option>
                          <option value="NAO">Apenas NÃO</option>
                          <option value="OUTROS">Outros / Abstenção</option>
                        </select>
                      </div>
                    </div>

                    {/* Grid de Votos Nominais da Sessão Ativa */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                        <span>Exibindo <strong>{filteredVotes.length}</strong> parlamentares nesta votação</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {filteredVotes.map((v) => {
                          const norm = normalizeVote(v.voto_original);
                          const isSim = norm === "SIM";
                          const isNao = norm === "NÃO";

                          return (
                            <Link
                              key={`${v.votacao_id}-${v.deputado_id}`}
                              href={`/politicos/${v.deputado_id}`}
                              className="p-3.5 rounded-xl bg-card border border-border shadow-soft hover:border-primary/50 transition-smooth flex items-center justify-between gap-3 group"
                            >
                              <div className="min-w-0 flex-1">
                                <h4 className="font-bold text-xs sm:text-sm text-foreground truncate group-hover:text-primary transition-smooth">
                                  {v.deputado_nome}
                                </h4>
                                <span className="text-[11px] text-muted-foreground block">
                                  {v.sigla_partido} • {v.deputado_uf}
                                </span>
                              </div>

                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black shrink-0 border ${isSim
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                    : isNao
                                      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                                      : "bg-muted text-muted-foreground border-border"
                                  }`}
                              >
                                {isSim && <FaCheck className="w-2.5 h-2.5" />}
                                {isNao && <FaTimes className="w-2.5 h-2.5" />}
                                <span>{v.voto_original}</span>
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      ) : (
        <div className="p-8 rounded-2xl bg-card border border-border text-center space-y-3 shadow-soft">
          <FaHistory className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="text-sm font-semibold text-foreground">
            Esta proposição foi deliberada por votação simbólica ou por acordo de líderes, sem registro nominal individual de votos no painel eletrônico.
          </p>
          <Link
            href="/faq#multiplas-votacoes"
            className="text-xs text-primary font-semibold hover:underline inline-flex items-center gap-1"
          >
            <FaQuestionCircle className="w-3 h-3" />
            <span>Entenda como a Câmara registra votações simbólicas e nominais</span>
          </Link>
        </div>
      )}
    </main>
  );
}
