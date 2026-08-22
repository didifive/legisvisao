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
  FaBolt,
  FaQuestionCircle,
  FaLayerGroup,
  FaUserTie,
  FaChevronDown,
  FaChevronUp,
  FaRobot,
  FaFlag,
} from "react-icons/fa";
import { AiFeedbackModal } from "@/app/components/AiFeedbackModal";
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
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackSession, setFeedbackSession] = useState<VoteSession | null>(null);

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

  // Classifica e ordena todas as sessões de votação por ordem cronológica decrescente
  const classifiedSessions = useMemo(() => {
    const list = sessions.map((s) => {
      const sessionVotes = votesBySession.get(s.id) || [];
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
    const deterministicList = sortVoteSessionsDeterministic(
      sessions.map((s) => ({
        ...s,
        votesCount: (votesBySession.get(s.id) || []).length,
        votes: votesBySession.get(s.id) || [],
      }))
    );
    const candidate = deterministicList[0];
    if (
      candidate &&
      candidate.classification.type === "MERITO" &&
      candidate.classification.priority === 1 &&
      (candidate.votesCount || 0) > 0
    ) {
      return candidate;
    }
    return null;
  }, [sessions, votesBySession]);

  const hasMeritNominalVote = primarySession !== null;

  // Inicializa selectedSessionId com a sessão principal (ou a primeira com votos)
  useEffect(() => {
    if (!selectedSessionId) {
      if (primarySession) {
        setSelectedSessionId(primarySession.id);
      } else if (classifiedSessions.length > 0) {
        const firstWithVotes = classifiedSessions.find((s) => s.votesCount > 0);
        setSelectedSessionId((firstWithVotes || classifiedSessions[0]).id);
      }
    }
  }, [primarySession, selectedSessionId, classifiedSessions]);

  // Sessão atualmente ativa para inspeção
  const activeSession = useMemo(() => {
    return (
      classifiedSessions.find((s) => s.id === selectedSessionId) ||
      primarySession ||
      classifiedSessions[0] ||
      null
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
  const symbolicSessions = classifiedSessions.filter((s) => s.votesCount === 0);
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
              proposition.tema
                .split(/[•,]/)
                .map((t) => t.trim())
                .filter(Boolean)
                .map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 rounded-full bg-secondary/10 text-secondary border border-secondary/20 text-xs font-bold"
                  >
                    {tag}
                  </span>
                ))
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

        <div className="space-y-4">
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

          {/* 1. Quadro Unificado de Análise por Inteligência Artificial ou Ementa Oficial Direta */}
          {proposition.resumo_geral || (primarySession && (primarySession.resumo_simplificado || primarySession.titulo_amigavel)) ? (
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
                    onClick={() => {
                      setFeedbackSession(null);
                      setIsFeedbackOpen(true);
                    }}
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
                    <p className="text-sm sm:text-base text-foreground leading-relaxed font-normal">
                      {proposition.resumo_geral}
                    </p>
                  </div>
                )}

                {/* Deliberação Principal Integrada da Sessão de Votação */}
                {primarySession && primarySession.classification.type === "MERITO" && (primarySession.votesCount ?? 0) > 0 ? (
                  <div className="pt-3 border-t border-primary/15 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                        <FaBolt className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>
                          {primarySession.titulo_amigavel || "Deliberação de Mérito Principal"}
                        </span>
                      </div>
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                        Sessão Oficial: {primarySession.id}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed font-normal">
                      {primarySession.resumo_simplificado || primarySession.descricao || "Votação do texto-base/mérito principal da proposição."}
                    </p>

                    {/* Pergunta Direta para Reflexão do Cidadão */}
                    {primarySession.pergunta_cidadao && (
                      <div className="mt-2.5 p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs sm:text-sm font-semibold text-primary flex items-start gap-2">
                        <FaQuestionCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{primarySession.pergunta_cidadao}</span>
                      </div>
                    )}
                  </div>
                ) : !primarySession || (primarySession.votesCount ?? 0) === 0 ? (
                  <div className="pt-3 border-t border-primary/15 space-y-1.5">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-xs">
                      <FaInfoCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Texto-Base Deliberado por Votação Simbólica</span>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      O texto principal desta matéria foi aprovado ou rejeitado por <strong>votação simbólica</strong> em Plenário (sem registro nominal individual de votos no painel eletrônico).
                    </p>
                  </div>
                ) : null}
              </div>

              {/* Expansor das Ementas e Textos Oficiais da Câmara */}
              <details className="group pt-0.5">
                <summary className="text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer flex items-center gap-1.5 select-none list-none">
                  <FaInfoCircle className="w-3.5 h-3.5 text-primary" />
                  <span>Ver ementa do projeto e descrição oficial da votação da Câmara</span>
                  <FaChevronDown className="w-2.5 h-2.5 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="mt-2 p-3.5 sm:p-4 rounded-xl bg-muted/40 border border-border/80 text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-2.5">
                  <div>
                    <strong className="text-foreground block mb-0.5">Ementa Oficial da Proposição na Câmara:</strong>
                    <p>{proposition.ementa_detalhada || proposition.ementa}</p>
                  </div>
                  {primarySession?.descricao && (
                    <div className="pt-2 border-t border-border/40">
                      <strong className="text-foreground block mb-0.5">Descrição Oficial da Deliberação Principal:</strong>
                      <p>{primarySession.descricao}</p>
                    </div>
                  )}
                </div>
              </details>
            </>
          ) : (
            /* Exibição direta das Ementas Oficiais */
            <div className="p-4 sm:p-5 rounded-2xl bg-muted/30 border border-border/60 space-y-2">
              <div>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <FaInfoCircle className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>Ementa Oficial do Projeto:</span>
                </span>
                <p className="text-sm sm:text-base text-foreground leading-relaxed font-normal mt-1">
                  {proposition.ementa_detalhada || proposition.ementa}
                </p>
              </div>
              {primarySession?.descricao && (
                <div className="pt-2 border-t border-border/40">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <FaVoteYea className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>Descrição da Votação no Plenário:</span>
                  </span>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-1">
                    {primarySession.descricao}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Links Oficiais da Câmara dos Deputados */}
        <div className="pt-3 border-t border-border flex flex-wrap items-center justify-between gap-3 text-xs">
          <a
            href={`https://www.camara.leg.br/propostas-legislativas/${proposition.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-primary hover:underline font-bold"
          >
            <FaLandmark className="w-3.5 h-3.5" />
            <span>Ficha de Tramitação no Portal da Câmara</span>
            <FaExternalLinkAlt className="w-2.5 h-2.5" />
          </a>

          {proposition.url_inteiro_teor && (
            <a
              href={proposition.url_inteiro_teor}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-smooth font-medium"
            >
              <FaFileAlt className="w-3.5 h-3.5" />
              <span>Acessar Inteiro Teor (Documento Oficial)</span>
              <FaExternalLinkAlt className="w-2.5 h-2.5" />
            </a>
          )}
        </div>

        {/* Painel de Opinião do Cidadão */}
        {hasMeritNominalVote ? (
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
        ) : (
          <div className="pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20 -mx-6 -mb-6 sm:-mx-8 sm:-mb-8 p-5 sm:p-6 rounded-b-2xl">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FaInfoCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                <strong>Votação de Opinião Desativada</strong>: Esta matéria foi deliberada por <em>votação simbólica</em> no Plenário e não integra o simulador de afinidade com os parlamentares.
              </span>
            </div>
          </div>
        )}
      </div>

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
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <FaLayerGroup className="w-3 h-3 text-primary" />
                  <span>Selecione a deliberação para inspecionar os detalhes:</span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {classifiedSessions.map((s) => {
                  const isSelected = s.id === activeSession?.id;
                  const isMain = s.id === primarySession?.id;
                  const sDate = s.data_hora
                    ? new Date(s.data_hora).toLocaleDateString("pt-BR")
                    : "";
                  const isNominal = s.votesCount > 0;

                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedSessionId(s.id)}
                      className={`p-3.5 sm:p-4 rounded-xl border text-left transition-smooth flex flex-col justify-between gap-2.5 cursor-pointer ${
                        isSelected
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

                      <div className="space-y-1.5 w-full">
                        <h4 className="text-xs sm:text-sm font-bold text-foreground line-clamp-2 leading-snug">
                          {s.titulo_amigavel || s.descricao || "Deliberação em Plenário"}
                        </h4>

                        {s.resumo_simplificado && (
                          <p className="text-[11px] text-muted-foreground line-clamp-3 leading-relaxed">
                            {s.resumo_simplificado}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1.5 border-t border-border/40 w-full">
                        <span>{sDate}</span>
                        {isNominal ? (
                          <span><strong>{s.votesCount}</strong> votos nominais</span>
                        ) : (
                          <span className="italic text-muted-foreground font-medium">Votação Simbólica</span>
                        )}
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

                    {activeSession.votesCount === 0 && (
                      <span className="text-[11px] font-semibold text-muted-foreground px-2.5 py-1 rounded-lg bg-muted border border-border">
                        Votação Simbólica
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
                      <span className={`px-2.5 py-0.5 rounded-full font-bold border ${
                        activeSession.resultado.toLowerCase().includes("aprovad")
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                          : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30"
                      }`}>
                        Resultado: {activeSession.resultado}
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
                      {activeSession.resumo_simplificado && (
                        <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed font-normal">
                          {activeSession.resumo_simplificado}
                        </p>
                      )}

                      {activeSession.pergunta_cidadao && (
                        <div className="mt-2 p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-xs sm:text-sm font-semibold text-primary flex items-start gap-2">
                          <FaQuestionCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>{activeSession.pergunta_cidadao}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground pt-1">
                      <div className="flex items-center gap-1.5">
                        <FaRobot className="w-3 h-3 text-primary shrink-0" />
                        <span>Resumo simplificado gerado por Inteligência Artificial a partir dos registros oficiais da Câmara.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFeedbackSession(activeSession);
                          setIsFeedbackOpen(true);
                        }}
                        title="Relatar inconsistência ou viés no resumo desta deliberação"
                        className="text-[11px] text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 transition-smooth flex items-center gap-1 cursor-pointer shrink-0 font-medium"
                      >
                        <FaFlag className="w-2.5 h-2.5" />
                        <span>Relatar problema</span>
                      </button>
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

              {/* Se a sessão tiver votos nominais, exibe o Placar e a Lista de Deputados */}
              {activeSession.votesCount > 0 ? (
                <>
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
                      className="w-full py-3 px-4 rounded-xl bg-muted/50 hover:bg-muted border border-border font-bold text-xs sm:text-sm text-foreground flex items-center justify-between transition-smooth cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <FaUserTie className="w-4 h-4 text-primary" />
                        <span>
                          {showVotesList
                            ? "Ocultar votos individuais dos deputados"
                            : `Ver como cada um dos ${activeVoteStats.total} deputados votou nesta deliberação`}
                        </span>
                      </div>
                      {showVotesList ? <FaChevronUp className="w-3.5 h-3.5" /> : <FaChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Lista de Votos Expandida com Filtros e Busca */}
                  {showVotesList && (
                    <div className="space-y-4 pt-4 border-t border-border animate-fade-in">
                      {/* Barra de Filtros e Busca */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                        {/* Busca por Nome */}
                        <div className="relative">
                          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
                          <input
                            type="text"
                            placeholder="Buscar parlamentar..."
                            value={voteSearch}
                            onChange={(e) => setVoteSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-smooth"
                          />
                        </div>

                        {/* Filtro de Partido */}
                        <div>
                          <select
                            value={filterParty}
                            onChange={(e) => setFilterParty(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-smooth cursor-pointer"
                          >
                            <option value="ALL">Todos os Partidos ({availableParties.length})</option>
                            {availableParties.map((p) => (
                              <option key={p} value={p}>
                                {p}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Filtro de Estado */}
                        <div>
                          <select
                            value={filterState}
                            onChange={(e) => setFilterState(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-smooth cursor-pointer"
                          >
                            <option value="ALL">Todos os Estados ({availableStates.length})</option>
                            {availableStates.map((uf) => (
                              <option key={uf} value={uf}>
                                {uf}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Filtro por Tipo de Voto */}
                        <div>
                          <select
                            value={filterVoteType}
                            onChange={(e) => setFilterVoteType(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-smooth cursor-pointer"
                          >
                            <option value="ALL">Todos os Votos</option>
                            <option value="SIM">Apenas SIM ({activeVoteStats.sim})</option>
                            <option value="NAO">Apenas NÃO ({activeVoteStats.nao})</option>
                            <option value="OUTROS">Outros / Abstenção ({activeVoteStats.outros})</option>
                          </select>
                        </div>
                      </div>

                      {/* Contador de Registros Filtrados */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                        <span>
                          Exibindo <strong>{filteredVotes.length}</strong> de <strong>{activeSessionVotes.length}</strong> deputados votantes
                        </span>
                        {(voteSearch || filterParty !== "ALL" || filterState !== "ALL" || filterVoteType !== "ALL") && (
                          <button
                            type="button"
                            onClick={() => {
                              setVoteSearch("");
                              setFilterParty("ALL");
                              setFilterState("ALL");
                              setFilterVoteType("ALL");
                            }}
                            className="text-primary hover:underline font-bold cursor-pointer"
                          >
                            Limpar Filtros
                          </button>
                        )}
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
                                  className={`px-2.5 py-0.5 rounded-lg text-[11px] font-black shrink-0 ${
                                    isSim
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
                </>
              ) : (
                /* Nota explicativa para deliberação simbólica selecionada */
                <div className="p-4 sm:p-5 rounded-xl bg-muted/20 border border-border/60 text-center space-y-2 pt-4 border-t border-border">
                  <div className="flex items-center justify-center gap-2 text-sm font-bold text-foreground">
                    <FaLayerGroup className="w-4 h-4 text-primary" />
                    <span>Deliberação realizada por Votação Simbólica</span>
                  </div>
                  <p className="text-xs text-muted-foreground max-w-lg mx-auto leading-relaxed">
                    Nesta deliberação, as lideranças partidárias firmaram acordo no Plenário e a matéria foi {activeSession.resultado ? activeSession.resultado.toLowerCase() : "deliberada"} por aclamação, dispensando o registro individual no painel eletrônico de votação.
                  </p>
                </div>
              )}
            </div>
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
        sessionId={feedbackSession?.id || primarySession?.id}
        sessionTitle={feedbackSession?.titulo_amigavel || feedbackSession?.descricao || primarySession?.titulo_amigavel || primarySession?.descricao}
        reportedSummary={
          feedbackSession?.resumo_simplificado ||
          proposition.resumo_geral ||
          primarySession?.resumo_simplificado ||
          proposition.ementa
        }
      />
    </main>
  );
}
