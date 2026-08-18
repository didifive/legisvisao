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
} from "react-icons/fa";
import type { Proposition, VoteSession } from "@/types/db";
import { normalizeVote } from "@/lib/match/normalizeVotes";
import { getStoredAnswers, saveStoredAnswers } from "@/lib/storage";

interface ProjectDetailsClientProps {
  proposition: Proposition;
  sessions: VoteSession[];
  votes: Array<{
    id: number;
    votacao_id: string;
    deputado_id: number;
    sigla_partido: string;
    voto_original: string;
    deputado_nome: string;
    deputado_uf: string;
    deputado_foto: string | null;
  }>;
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

  useEffect(() => {
    const stored = getStoredAnswers();
    if (stored[proposition.id]) {
      setUserOpinion(stored[proposition.id]);
    }
  }, [proposition.id]);

  function handleVote(opinion: "CONCORDO" | "DISCORDO") {
    const stored = getStoredAnswers();
    const updated = { ...stored, [proposition.id]: opinion };
    saveStoredAnswers(updated);
    setUserOpinion(opinion);
  }

  // Lista de Partidos e Estados disponíveis nos votos
  const availableParties = useMemo(() => {
    const pSet = new Set<string>();
    for (const v of votes) {
      if (v.sigla_partido) pSet.add(v.sigla_partido.toUpperCase());
    }
    return Array.from(pSet).sort();
  }, [votes]);

  const availableStates = useMemo(() => {
    const sSet = new Set<string>();
    for (const v of votes) {
      if (v.deputado_uf) sSet.add(v.deputado_uf.toUpperCase());
    }
    return Array.from(sSet).sort();
  }, [votes]);

  // Estatísticas de Votação
  const voteStats = useMemo(() => {
    let sim = 0;
    let nao = 0;
    let outros = 0;

    for (const v of votes) {
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
  }, [votes]);

  // Votos filtrados
  const filteredVotes = useMemo(() => {
    return votes.filter((v) => {
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
  }, [votes, voteSearch, filterParty, filterState, filterVoteType]);

  const latestSession = sessions[0] || null;
  const lastVoteDate = latestSession?.data_hora
    ? new Date(latestSession.data_hora).toLocaleDateString("pt-BR")
    : null;

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

      {/* Header do Projeto */}
      <div className="p-6 sm:p-8 rounded-2xl bg-card border border-border shadow-soft space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold">
                <FaLandmark className="w-3 h-3" />
                Câmara dos Deputados (Plenário)
              </span>

              {proposition.tema && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                  {proposition.tema}
                </span>
              )}

              {proposition.ultimo_status && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-secondary/10 text-secondary border border-secondary/20">
                  {proposition.ultimo_status}
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

        {/* Ementa */}
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
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-smooth cursor-pointer shadow-soft ${
                userOpinion === "CONCORDO"
                  ? "bg-emerald-600 text-white ring-2 ring-emerald-600/40"
                  : "bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white"
              }`}
            >
              <FaCheck className="w-3.5 h-3.5" />
              <span>CONCORDO</span>
            </button>

            <button
              onClick={() => handleVote("DISCORDO")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-smooth cursor-pointer shadow-soft ${
                userOpinion === "DISCORDO"
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

      {/* Placar e Painel de Votação */}
      {votes.length > 0 && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <FaVoteYea className="text-primary w-5 h-5" />
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Placar de Deliberação no Plenário
              </h2>
            </div>
            {lastVoteDate && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <FaHistory className="w-3 h-3 text-primary" />
                <span>Votação realizada em: {lastVoteDate}</span>
              </span>
            )}
          </div>

          {/* Barra de Progresso Visual do Placar */}
          <div className="p-6 rounded-2xl bg-card border border-border shadow-soft space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="space-y-1">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                  SIM (A favor)
                </span>
                <p className="text-2xl sm:text-3xl font-black text-foreground">{voteStats.sim}</p>
                <span className="text-xs text-muted-foreground">{voteStats.simPct}% dos votos</span>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase">
                  NÃO (Contra)
                </span>
                <p className="text-2xl sm:text-3xl font-black text-foreground">{voteStats.nao}</p>
                <span className="text-xs text-muted-foreground">{voteStats.naoPct}% dos votos</span>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold text-muted-foreground uppercase">
                  Outros / Abstenções
                </span>
                <p className="text-2xl sm:text-3xl font-black text-foreground">{voteStats.outros}</p>
                <span className="text-xs text-muted-foreground">{voteStats.outrosPct}%</span>
              </div>
            </div>

            {/* Barra empilhada */}
            <div className="w-full bg-muted h-3.5 rounded-full overflow-hidden flex border border-border/50">
              <div
                style={{ width: `${voteStats.simPct}%` }}
                className="bg-emerald-500 transition-all duration-500"
                title={`Sim: ${voteStats.sim}`}
              />
              <div
                style={{ width: `${voteStats.naoPct}%` }}
                className="bg-rose-500 transition-all duration-500"
                title={`Não: ${voteStats.nao}`}
              />
              <div
                style={{ width: `${voteStats.outrosPct}%` }}
                className="bg-slate-400 transition-all duration-500"
                title={`Outros: ${voteStats.outros}`}
              />
            </div>
          </div>

          {/* Filtros da Tabela de Votos Nominais */}
          <div className="p-4 rounded-xl bg-card border border-border shadow-soft flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-1.5 focus-within:ring-2 focus-within:ring-primary/20 flex-1 min-w-[200px]">
              <FaSearch className="text-muted-foreground w-3.5 h-3.5" />
              <input
                type="text"
                placeholder="Buscar parlamentar..."
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

          {/* Grid de Votos Nominais */}
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
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black shrink-0 border ${
                      isSim
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
      )}
    </main>
  );
}
