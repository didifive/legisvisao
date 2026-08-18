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
  FaBuilding,
} from "react-icons/fa";
import type {
  LegislativeProject,
  ProjectHouseRecord,
  LegislativePhase,
  ProjectVoteSessionRow,
  VoteDetailRow,
} from "@/types/db";
import { normalizeVote } from "@/lib/match/normalizeVotes";
import { getStoredAnswers, saveStoredAnswers } from "@/lib/storage";

interface ProjectDetailsClientProps {
  project: LegislativeProject;
  houseRecords: ProjectHouseRecord[];
  phases: LegislativePhase[];
  sessions: ProjectVoteSessionRow[];
  votes: VoteDetailRow[];
}

export default function ProjectDetailsClient({
  project,
  houseRecords,
  sessions,
  votes,
}: Readonly<ProjectDetailsClientProps>) {
  const [userOpinion, setUserOpinion] = useState<"CONCORDO" | "DISCORDO" | null>(null);
  const [activeTab, setActiveTab] = useState<"votos" | "tramitacao">("votos");
  const [voteSearch, setVoteSearch] = useState("");
  const [filterParty, setFilterParty] = useState<string>("ALL");
  const [filterState, setFilterState] = useState<string>("ALL");
  const [filterVoteType, setFilterVoteType] = useState<string>("ALL");
  const [filterHouse, setFilterHouse] = useState<string>("ALL");

  useEffect(() => {
    const stored = getStoredAnswers();
    if (stored[project.id]) {
      setUserOpinion(stored[project.id]);
    }
  }, [project.id]);

  function handleVote(opinion: "CONCORDO" | "DISCORDO") {
    const stored = getStoredAnswers();
    const updated = { ...stored, [project.id]: opinion };
    saveStoredAnswers(updated);
    setUserOpinion(opinion);
  }

  // Identificação Bicameral
  const housesPresent = useMemo(() => {
    const set = new Set(houseRecords.map((r) => r.house));
    if (set.has("CAMARA") && set.has("SENADO")) return "Bicameral (Câmara & Senado)";
    if (set.has("SENADO")) return "Senado Federal";
    if (set.has("CAMARA")) return "Câmara dos Deputados";
    return "Congresso Nacional";
  }, [houseRecords]);

  // Lista de Partidos e Estados disponíveis nos votos
  const availableParties = useMemo(() => {
    const pSet = new Set<string>();
    for (const v of votes) {
      if (v.party_sigla) pSet.add(v.party_sigla.toUpperCase());
    }
    return Array.from(pSet).sort();
  }, [votes]);

  const availableStates = useMemo(() => {
    const sSet = new Set<string>();
    for (const v of votes) {
      if (v.politician_state) sSet.add(v.politician_state.toUpperCase());
    }
    return Array.from(sSet).sort();
  }, [votes]);

  // Estatísticas de Votação
  const voteStats = useMemo(() => {
    let sim = 0;
    let nao = 0;
    let outros = 0;

    for (const v of votes) {
      const norm = normalizeVote(v.vote_original);
      if (norm === "SIM") sim++;
      else if (norm === "NÃO") nao++;
      else outros++;
    }

    const total = votes.length;
    const simPct = total > 0 ? Math.round((sim / total) * 100) : 0;
    const naoPct = total > 0 ? Math.round((nao / total) * 100) : 0;

    return { sim, nao, outros, total, simPct, naoPct };
  }, [votes]);

  // Votos filtrados
  const filteredVotes = useMemo(() => {
    return votes.filter((v) => {
      if (filterParty !== "ALL" && (v.party_sigla || "").toUpperCase() !== filterParty) {
        return false;
      }
      if (filterState !== "ALL" && (v.politician_state || "").toUpperCase() !== filterState) {
        return false;
      }
      if (filterHouse !== "ALL") {
        const isSen = (v.politician_type || "").toUpperCase().includes("SENAD");
        if (filterHouse === "SENADO" && !isSen) return false;
        if (filterHouse === "CAMARA" && isSen) return false;
      }
      if (filterVoteType !== "ALL") {
        const norm = normalizeVote(v.vote_original);
        if (filterVoteType === "SIM" && norm !== "SIM") return false;
        if (filterVoteType === "NAO" && norm !== "NÃO") return false;
        if (filterVoteType === "OUTROS" && norm !== null) return false;
      }
      if (voteSearch.trim()) {
        const q = voteSearch.toLowerCase();
        const nameMatch = (v.politician_name || "").toLowerCase().includes(q);
        const partyMatch = (v.party_sigla || "").toLowerCase().includes(q);
        if (!nameMatch && !partyMatch) return false;
      }
      return true;
    });
  }, [votes, filterParty, filterState, filterHouse, filterVoteType, voteSearch]);

  const situacao = project.current_status || "Em Tramitação";
  const isAprovado =
    situacao.toLowerCase().includes("aprovad") ||
    situacao.toLowerCase().includes("lei") ||
    situacao.toLowerCase().includes("promulgad") ||
    situacao.toLowerCase().includes("sancionad");
  const isEncerrado =
    situacao.toLowerCase().includes("arquivad") ||
    situacao.toLowerCase().includes("rejeitad") ||
    situacao.toLowerCase().includes("encerrad");

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Navegação e Breadcrumb */}
      <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
        <Link href="/opiniao" className="hover:text-primary transition-smooth flex items-center gap-1">
          <FaArrowLeft className="w-3 h-3" />
          <span>Proposições</span>
        </Link>
        <span>/</span>
        <span className="text-foreground font-semibold">{project.canonical_id || `${project.type} ${project.number}/${project.year}`}</span>
      </div>

      {/* Header Principal do Projeto */}
      <div className="p-6 sm:p-8 rounded-2xl bg-card border border-border shadow-soft space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold">
                <FaBuilding className="w-3 h-3" />
                <span>{housesPresent}</span>
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${isAprovado
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : isEncerrado
                    ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                    : "bg-secondary/10 text-secondary border-secondary/20"
                  }`}
              >
                <FaInfoCircle className="w-3 h-3" />
                <span>{situacao}</span>
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-muted text-muted-foreground">
                Ano: {project.year}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight leading-tight">
              {project.title}
            </h1>
            <span className="text-sm font-semibold text-primary block">
              Identificação Oficial: {project.canonical_id || `${project.type} nº ${project.number}/${project.year}`}
            </span>
          </div>

          {/* Widget de Voto / Opinião do Visitante */}
          <div className="w-full sm:w-auto p-4 rounded-xl bg-background border border-border shadow-inner text-center sm:text-right space-y-2">
            <span className="text-xs font-semibold text-muted-foreground block">
              Sua Opinião Cidadã
            </span>
            <div className="flex items-center justify-center sm:justify-end gap-2">
              <button
                onClick={() => handleVote("CONCORDO")}
                className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-smooth cursor-pointer ${userOpinion === "CONCORDO"
                  ? "bg-emerald-600 text-white shadow-soft"
                  : "bg-muted text-foreground hover:bg-emerald-500/20 hover:text-emerald-700"
                  }`}
              >
                <FaCheck className="w-3 h-3" />
                <span>Concordo</span>
              </button>
              <button
                onClick={() => handleVote("DISCORDO")}
                className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-smooth cursor-pointer ${userOpinion === "DISCORDO"
                  ? "bg-rose-600 text-white shadow-soft"
                  : "bg-muted text-foreground hover:bg-rose-500/20 hover:text-rose-700"
                  }`}
              >
                <FaTimes className="w-3 h-3" />
                <span>Discordo</span>
              </button>
            </div>
            {userOpinion && (
              <span className="text-[11px] text-muted-foreground block">
                Voto salvo localmente para cálculo de afinidade
              </span>
            )}
          </div>
        </div>

        {/* Ementa Completa */}
        {project.description && (
          <div className="p-4 rounded-xl bg-muted/50 border border-border/60">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Ementa e Objeto
            </h3>
            <p className="text-sm sm:text-base text-foreground leading-relaxed">
              {project.description}
            </p>
          </div>
        )}

        {/* Cards de Tramitação por Casa (Câmara / Senado) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {houseRecords.map((hr) => {
            const isSen = hr.house === "SENADO";
            return (
              <div
                key={hr.id}
                className="p-4 rounded-xl bg-background border border-border shadow-soft space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                    <FaLandmark className="w-3.5 h-3.5" />
                    <span>{isSen ? "Senado Federal" : "Câmara dos Deputados"}</span>
                  </span>
                  <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded font-mono">
                    ID: {hr.external_id}
                  </span>
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  {hr.author_name && (
                    <p>
                      <strong className="text-foreground">Autor:</strong> {hr.author_name}
                      {hr.author_party ? ` (${hr.author_party})` : ""}
                    </p>
                  )}
                  {hr.rapporteur_name && (
                    <p>
                      <strong className="text-foreground">Relatoria:</strong> {hr.rapporteur_name}
                    </p>
                  )}
                  {hr.presentation_date && (
                    <p>
                      <strong className="text-foreground">Apresentação:</strong>{" "}
                      {new Date(hr.presentation_date).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                  {hr.tramitacao_etapa && (
                    <p>
                      <strong className="text-foreground">Etapa:</strong> {hr.tramitacao_etapa}
                    </p>
                  )}
                </div>

                {/* Links Oficiais */}
                <div className="flex items-center gap-3 pt-2 text-xs">
                  {hr.official_url && (
                    <a
                      href={hr.official_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-semibold flex items-center gap-1"
                    >
                      <FaExternalLinkAlt className="w-3 h-3" />
                      <span>Ficha de Tramitação</span>
                    </a>
                  )}
                  {hr.full_text_url && hr.full_text_url !== hr.official_url && (
                    <a
                      href={hr.full_text_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground hover:underline flex items-center gap-1"
                    >
                      <FaFileAlt className="w-3 h-3" />
                      <span>Inteiro Teor (PDF)</span>
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs: Votos Nominais vs Histórico de Tramitação */}
      <div className="space-y-4">
        <div className="flex border-b border-border gap-6">
          <button
            onClick={() => setActiveTab("votos")}
            className={`pb-3 text-sm font-bold border-b-2 transition-smooth cursor-pointer flex items-center gap-2 ${activeTab === "votos"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
          >
            <FaVoteYea className="w-4 h-4" />
            <span>Votos Nominais ({votes.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("tramitacao")}
            className={`pb-3 text-sm font-bold border-b-2 transition-smooth cursor-pointer flex items-center gap-2 ${activeTab === "tramitacao"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
          >
            <FaHistory className="w-4 h-4" />
            <span>Sessões e Fases ({sessions.length})</span>
          </button>
        </div>

        {/* Tab 1: Votos Nominais dos Parlamentares */}
        {activeTab === "votos" && (
          <div className="space-y-6">
            {/* Placar de Votação Geral */}
            {voteStats.total > 0 && (
              <div className="p-4 sm:p-5 rounded-xl bg-card border border-border shadow-soft space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Posicionamento Parlamentar no Plenário
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Total: <strong>{voteStats.total}</strong> votos nominais registrados
                  </span>
                </div>

                {/* Barra de Progresso Comparativa */}
                <div className="w-full h-4 rounded-full bg-muted overflow-hidden flex shadow-inner">
                  <div
                    className="bg-emerald-500 h-full flex items-center justify-center text-[10px] font-extrabold text-white transition-all duration-500"
                    style={{ width: `${voteStats.simPct}%` }}
                    title={`Sim: ${voteStats.sim} (${voteStats.simPct}%)`}
                  >
                    {voteStats.simPct > 10 ? `${voteStats.simPct}% Sim` : ""}
                  </div>
                  <div
                    className="bg-rose-500 h-full flex items-center justify-center text-[10px] font-extrabold text-white transition-all duration-500"
                    style={{ width: `${voteStats.naoPct}%` }}
                    title={`Não: ${voteStats.nao} (${voteStats.naoPct}%)`}
                  >
                    {voteStats.naoPct > 10 ? `${voteStats.naoPct}% Não` : ""}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                    <span>Favoráveis (Sim): {voteStats.sim} ({voteStats.simPct}%)</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                    <span>Contrários (Não): {voteStats.nao} ({voteStats.naoPct}%)</span>
                  </span>
                  {voteStats.outros > 0 && (
                    <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" />
                      <span>Outros / Abstenção: {voteStats.outros}</span>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Barra de Filtros de Votos */}
            <div className="p-4 rounded-xl bg-card border border-border shadow-soft flex flex-wrap gap-3 items-center justify-between">
              <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-1.5 flex-1 min-w-[200px]">
                <FaSearch className="text-muted-foreground w-3.5 h-3.5" />
                <input
                  type="text"
                  placeholder="Buscar parlamentar ou partido..."
                  value={voteSearch}
                  onChange={(e) => setVoteSearch(e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-xs text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* Filtro de Casa */}
                <select
                  value={filterHouse}
                  onChange={(e) => setFilterHouse(e.target.value)}
                  className="bg-background border border-border rounded-md px-2 py-1 text-xs text-foreground"
                >
                  <option value="ALL">Todas as Casas</option>
                  <option value="CAMARA">Deputados Federais</option>
                  <option value="SENADO">Senadores</option>
                </select>

                {/* Filtro de Partido */}
                <select
                  value={filterParty}
                  onChange={(e) => setFilterParty(e.target.value)}
                  className="bg-background border border-border rounded-md px-2 py-1 text-xs text-foreground"
                >
                  <option value="ALL">Todos os Partidos</option>
                  {availableParties.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>

                {/* Filtro de Estado */}
                <select
                  value={filterState}
                  onChange={(e) => setFilterState(e.target.value)}
                  className="bg-background border border-border rounded-md px-2 py-1 text-xs text-foreground"
                >
                  <option value="ALL">Todos os Estados (UF)</option>
                  {availableStates.map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </select>

                {/* Filtro de Voto */}
                <select
                  value={filterVoteType}
                  onChange={(e) => setFilterVoteType(e.target.value)}
                  className="bg-background border border-border rounded-md px-2 py-1 text-xs text-foreground"
                >
                  <option value="ALL">Todos os Votos</option>
                  <option value="SIM">Votou Sim</option>
                  <option value="NAO">Votou Não</option>
                  <option value="OUTROS">Outros / Abstenção</option>
                </select>
              </div>
            </div>

            {/* Listagem dos Votos */}
            {filteredVotes.length === 0 ? (
              <div className="p-8 text-center bg-card border border-border rounded-xl text-muted-foreground text-sm">
                Nenhum voto parlamentar encontrado com os filtros selecionados.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredVotes.map((v) => {
                  const norm = normalizeVote(v.vote_original);
                  const isSim = norm === "SIM";
                  const isNao = norm === "NÃO";
                  const isSen = (v.politician_type || "").toUpperCase().includes("SENAD");

                  return (
                    <div
                      key={v.id}
                      className="p-3.5 rounded-xl bg-card border border-border shadow-soft flex items-center justify-between gap-3 hover:border-primary/40 transition-smooth"
                    >
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/politicos/${v.politician_id}`}
                          className="font-bold text-sm text-foreground hover:text-primary transition-smooth truncate block"
                          title={v.politician_name}
                        >
                          {v.politician_name}
                        </Link>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                          <span className="font-semibold text-primary">{v.politician_state}</span>
                          <span>•</span>
                          <span>{v.party_sigla || "Sem Partido"}</span>
                          <span>•</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted">
                            {isSen ? "Senador" : "Deputado"}
                          </span>
                        </div>
                      </div>

                      {/* Badge do Voto Nominal */}
                      <span
                        className={`px-3 py-1 rounded-lg text-xs font-extrabold shrink-0 border ${isSim
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                          : isNao
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                            : "bg-muted text-muted-foreground border-border"
                          }`}
                      >
                        {v.vote_original}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Sessões de Votação e Fases Legislativas */}
        {activeTab === "tramitacao" && (
          <div className="space-y-4">
            {sessions.length === 0 ? (
              <div className="p-8 text-center bg-card border border-border rounded-xl text-muted-foreground text-sm">
                Nenhuma sessão oficial de deliberação registrada para esta proposição.
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((s) => {
                  const sDate = s.date ? new Date(s.date).toLocaleDateString("pt-BR") : "Data não informada";
                  const isSen = s.house === "SENADO";

                  return (
                    <div
                      key={s.id}
                      className="p-4 rounded-xl bg-card border border-border shadow-soft space-y-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-primary flex items-center gap-1">
                            <FaLandmark className="w-3 h-3" />
                            <span>{isSen ? "Senado Federal" : "Câmara dos Deputados"}</span>
                          </span>
                          {s.phase_name && (
                            <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                              Fase: {s.phase_name}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground flex items-center gap-1 font-semibold">
                          <FaCalendarAlt className="w-3 h-3" />
                          <span>{sDate}</span>
                        </span>
                      </div>

                      {s.description && (
                        <p className="text-sm text-foreground font-medium leading-relaxed">
                          {s.description}
                        </p>
                      )}

                      {s.result && (
                        <div className="text-xs text-muted-foreground pt-1">
                          <strong>Resultado Oficial:</strong>{" "}
                          <span className="text-foreground font-semibold">{s.result}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
