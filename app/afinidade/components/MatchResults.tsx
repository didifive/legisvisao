"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  FaChevronRight,
  FaVoteYea,
  FaLandmark,
  FaUserTie,
  FaMapMarkerAlt,
  FaInfoCircle,
  FaGlobeAmericas,
  FaBalanceScale,
  FaFilter,
} from "react-icons/fa";
import type { Party } from "@/types/db";
import type { DeputyMatch, PartyMatchResult } from "@/lib/match/types";

export type ResultsShape = {
  deputies: DeputyMatch[];
  parties: Array<Party & { match: PartyMatchResult }>;
} | null;

export interface MatchResultsProps {
  results: ResultsShape;
  loading: boolean;
  stateFilter: string | null;
  availableStates: string[];
  onStateChange: (state: string | null) => void;
  partyFilter?: string | null;
  onPartyChange?: (party: string | null) => void;
}

interface NormalizedParty extends Party {
  match: PartyMatchResult;
  adherence: number | null;
}

function clamp01(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  if (Number.isNaN(num)) return null;
  if (num > 1 && num <= 100) return num / 100;
  return Math.max(0, Math.min(1, num));
}

function getProgressGradientClass(pct: number | null): string {
  if (pct === null) return "bg-slate-400";
  if (pct >= 70) return "bg-gradient-to-r from-emerald-500 to-emerald-400";
  if (pct >= 40) return "bg-gradient-to-r from-blue-600 to-teal-400";
  return "bg-gradient-to-r from-slate-500 to-slate-400";
}

function sortRankingEntities<T extends {
  nome?: string;
  nome_eleitoral?: string;
  sigla?: string;
  adherence: number | null;
  matches_count?: number;
  comparable_count?: number;
  match?: PartyMatchResult;
}>(a: T, b: T): number {
  const adhA = a.adherence ?? a.match?.adherence ?? -1;
  const adhB = b.adherence ?? b.match?.adherence ?? -1;
  if (adhB !== adhA) return adhB - adhA;

  const compA = a.comparable_count ?? a.match?.comparable_count ?? 0;
  const compB = b.comparable_count ?? b.match?.comparable_count ?? 0;
  if (compB !== compA) return compB - compA;

  const matchesA = a.matches_count ?? a.match?.matches_count ?? 0;
  const matchesB = b.matches_count ?? b.match?.matches_count ?? 0;
  if (matchesB !== matchesA) return matchesB - matchesA;

  const labelA = (a.sigla || a.nome_eleitoral || a.nome || "").toString();
  const labelB = (b.sigla || b.nome_eleitoral || b.nome || "").toString();
  return labelA.localeCompare(labelB);
}

function LoadingState() {
  return (
    <div className="py-16 text-center text-muted-foreground flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      <span>Calculando sua afinidade com os Deputados Federais...</span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="p-8 rounded-xl bg-card border border-border text-center space-y-4 shadow-soft">
      <p className="text-muted-foreground text-sm">
        Você ainda não respondeu a nenhuma proposta para calcular seu índice de afinidade.
      </p>
      <div className="flex justify-center gap-3">
        <Link
          href="/opiniao"
          className="px-4 py-2 rounded-md bg-primary text-white font-semibold text-sm shadow-soft hover:bg-primary/90 transition-smooth"
        >
          Começar Análise de Propostas
        </Link>
      </div>
    </div>
  );
}

interface PartyCardProps {
  party: NormalizedParty;
  rank: number;
}

function PartyCard({ party, rank }: PartyCardProps) {
  const pct = party.adherence === null ? null : Math.round(party.adherence * 100);
  const isTop3 = rank <= 3 && pct !== null && pct > 0;
  const totalComp = party.match?.comparable_count ?? 0;
  const totalMatches = party.match?.matches_count ?? 0;

  const partyLogoUrl =
    party.logo_url ||
    (() => {
      const cleanSigla = (party.sigla || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]/g, "")
        .toUpperCase();
      return cleanSigla ? `https://www.camara.leg.br/internet/Deputado/img/partidos/${cleanSigla}.gif` : null;
    })();

  return (
    <Link
      href={`/partidos/${party.id}`}
      className="group block p-4 sm:p-5 rounded-xl bg-card border border-border hover:border-primary/50 shadow-soft hover:shadow-medium transition-smooth"
    >
      <div className="flex items-center justify-between gap-4 mb-2.5">
        <div className="flex items-center gap-3">
          <span
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
              isTop3
                ? "bg-primary text-white shadow-soft"
                : "bg-muted text-muted-foreground"
            }`}
          >
            #{rank}
          </span>

          {/* Logo do Partido */}
          <div className="w-10 h-10 rounded-xl bg-white/90 dark:bg-muted border border-border shrink-0 flex items-center justify-center p-1 overflow-hidden shadow-soft">
            {partyLogoUrl ? (
              <img
                src={partyLogoUrl}
                alt={`Logo do ${party.sigla}`}
                className="max-w-full max-h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                  const fallback = (e.target as HTMLElement).nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = "flex";
                }}
              />
            ) : null}
            <span
              style={{ display: partyLogoUrl ? "none" : "flex" }}
              className="text-[11px] font-black text-primary"
            >
              {party.sigla.slice(0, 4)}
            </span>
          </div>

          <div>
            <h3 className="font-bold text-foreground text-base group-hover:text-primary transition-smooth flex items-center gap-2 flex-wrap">
              <span>{party.nome}</span>
              <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                {party.sigla}
              </span>
            </h3>
            <span className="text-xs text-muted-foreground block mt-0.5">
              {totalComp > 0 ? (
                <>
                  Baseado em <strong>{totalComp}</strong> {totalComp === 1 ? "voto de deputado filiado" : "votos de deputados filiados"}{" "}
                  <span className="text-primary font-semibold">({totalMatches} {totalMatches === 1 ? "concordância" : "concordâncias"})</span>
                </>
              ) : (
                "Sem votos nominais registrados pelos deputados filiados nestas propostas"
              )}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-lg sm:text-xl font-extrabold text-foreground">
            {pct !== null ? `${pct}%` : "—"}
          </span>
          <FaChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-smooth" />
        </div>
      </div>

      <div className="w-full bg-muted h-3 rounded-full overflow-hidden p-0.5 border border-border/50">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getProgressGradientClass(pct)}`}
          style={{ width: `${pct ?? 0}%` }}
        />
      </div>
    </Link>
  );
}

interface DeputyCardProps {
  deputy: DeputyMatch;
}

function DeputyCard({ deputy }: DeputyCardProps) {
  const pct = deputy.adherence === null ? null : Math.round(deputy.adherence * 100);
  const compCount = deputy.comparable_count ?? 0;
  const matchCount = deputy.matches_count ?? 0;

  return (
    <Link
      href={`/politicos/${deputy.id}`}
      className="p-4 rounded-xl bg-card border border-border shadow-soft flex items-center justify-between gap-4 transition-smooth hover:border-primary/50 group block"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-foreground text-sm truncate group-hover:text-primary transition-smooth" title={deputy.nome_eleitoral || deputy.nome}>
            {deputy.nome_eleitoral || deputy.nome}
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
          <span className="font-semibold text-primary">{deputy.sigla_uf}</span>
          <span>•</span>
          <span>{deputy.sigla_partido || "Dep. Federal"}</span>
          <span>•</span>
          <span className="text-[11px] text-muted-foreground">
            <strong>{compCount}</strong> {compCount === 1 ? "voto considerado" : "votos considerados"} ({matchCount} {matchCount === 1 ? "concordância" : "concordâncias"})
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="w-24 bg-muted h-2.5 rounded-full overflow-hidden border border-border/40">
          <div
            className="bg-primary h-full rounded-full transition-smooth"
            style={{ width: `${pct ?? 0}%` }}
          />
        </div>
        <span className="font-bold text-sm text-foreground w-10 text-right">
          {pct !== null ? `${pct}%` : "—"}
        </span>
      </div>
    </Link>
  );
}

export default function MatchResults({
  results,
  loading,
  stateFilter,
  availableStates,
  onStateChange,
  partyFilter,
  onPartyChange,
}: MatchResultsProps) {
  if (loading) return <LoadingState />;
  if (!results) return <EmptyState />;

  const sortedParties: NormalizedParty[] = useMemo(() => {
    return (results.parties || [])
      .map((party) => ({
        ...party,
        adherence: clamp01(party.match?.adherence ?? null),
      }))
      .sort(sortRankingEntities);
  }, [results.parties]);

  const availableParties = useMemo(() => {
    const partiesSet = new Set<string>();
    for (const d of results.deputies || []) {
      if (d.sigla_partido) partiesSet.add(d.sigla_partido.toUpperCase().trim());
    }
    for (const p of results.parties || []) {
      if (p.sigla) partiesSet.add(p.sigla.toUpperCase().trim());
    }
    return Array.from(partiesSet).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [results.deputies, results.parties]);

  const validDeputies: DeputyMatch[] = useMemo(() => {
    const raw: DeputyMatch[] = (results.deputies || []).map((dep) => ({
      ...dep,
      adherence: clamp01(dep.adherence ?? null),
    }));

    let filtered = raw;

    if (stateFilter) {
      filtered = filtered.filter((d) => (d.sigla_uf || "").toUpperCase() === stateFilter.toUpperCase());
    }

    if (partyFilter) {
      filtered = filtered.filter((d) => (d.sigla_partido || "").toUpperCase() === partyFilter.toUpperCase());
    }

    return filtered
      .filter((p) => (p.comparable_count ?? 0) > 0 && p.adherence !== null)
      .sort(sortRankingEntities);
  }, [results.deputies, stateFilter, partyFilter]);

  const hasActiveDeputyFilters = Boolean(stateFilter || partyFilter);

  return (
    <div className="space-y-12">
      {/* Banner de Neutralidade */}
      <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 dark:bg-amber-950/20 border border-amber-500/30 text-xs sm:text-sm text-foreground flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-soft">
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-300">
            <FaBalanceScale className="text-amber-600 dark:text-amber-400 w-4 h-4 shrink-0" />
            <span>Aviso de Transparência Legislativa:</span>
          </div>
          <p className="text-muted-foreground text-xs leading-relaxed">
            <strong>Esta ferramenta não recomenda votos nem candidatos. Apenas compara dados públicos.</strong> Os índices apresentados decorrem do cruzamento determinístico das suas opiniões com as votações nominais oficiais registradas pelos Deputados Federais na Câmara dos Deputados.
          </p>
        </div>
      </div>

      {/* 1. AFINIDADE PARTIDÁRIA */}
      <section className="space-y-4">
        <div className="flex flex-col gap-2 border-b border-border pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <FaLandmark className="text-primary w-5 h-5" />
              Afinidade com Partidos Políticos
            </h2>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold">
              <FaGlobeAmericas className="w-3 h-3" />
              <span>Média dos Deputados Federais Filiados</span>
            </span>
          </div>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            A afinidade partidária reflete a média dos votos nominais individuais de todos os deputados federais filiados à legenda nas propostas avaliadas.
          </p>
        </div>

        {sortedParties.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nenhum partido encontrado para suas opiniões registradas.
          </p>
        ) : (
          <div className="space-y-3">
            {sortedParties.map((party, index) => (
              <PartyCard key={party.id} party={party} rank={index + 1} />
            ))}
          </div>
        )}
      </section>

      {/* 2. SELETOR DE ESTADO (UF) E PARTIDO */}
      <section className="p-6 rounded-2xl bg-card border border-border shadow-soft flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FaFilter className="text-primary w-4 h-4" />
            <h3 className="font-bold text-foreground text-base">
              Filtrar Deputados Federais por Estado e Partido
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Filtre os deputados pela bancada do seu estado (UF) e/ou por legenda partidária.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Seletor de Estado */}
          <div className="flex-1 sm:flex-initial">
            <select
              value={stateFilter ?? ""}
              onChange={(e) => onStateChange(e.target.value || null)}
              className="bg-background border border-border rounded-lg px-3 py-2 text-xs sm:text-sm text-foreground font-semibold focus:ring-2 focus:ring-primary/20 outline-none w-full sm:w-44 cursor-pointer shadow-soft"
              aria-label="Filtrar por estado"
            >
              <option value="">Todos os Estados</option>
              {availableStates.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </div>

          {/* Seletor de Partido */}
          <div className="flex-1 sm:flex-initial">
            <select
              value={partyFilter ?? ""}
              onChange={(e) => onPartyChange ? onPartyChange(e.target.value || null) : undefined}
              className="bg-background border border-border rounded-lg px-3 py-2 text-xs sm:text-sm text-foreground font-semibold focus:ring-2 focus:ring-primary/20 outline-none w-full sm:w-44 cursor-pointer shadow-soft"
              aria-label="Filtrar por partido"
            >
              <option value="">Todos os Partidos</option>
              {availableParties.map((sigla) => (
                <option key={sigla} value={sigla}>
                  {sigla}
                </option>
              ))}
            </select>
          </div>

          {/* Botão Limpar Filtros */}
          {hasActiveDeputyFilters && (
            <button
              type="button"
              onClick={() => {
                onStateChange(null);
                if (onPartyChange) onPartyChange(null);
              }}
              className="text-xs text-destructive hover:underline font-bold px-2 py-1 transition-smooth cursor-pointer"
            >
              Limpar
            </button>
          )}
        </div>
      </section>

      {/* 3. DEPUTADOS FEDERAIS */}
      <section className="space-y-4">
        <div className="border-b border-border pb-3">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FaUserTie className="text-secondary w-5 h-5" />
            Deputados Federais {stateFilter ? `(${stateFilter})` : ""} {partyFilter ? `• ${partyFilter}` : ""}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Parlamentares da Câmara dos Deputados com votações nominais registradas nas propostas analisadas.
          </p>
        </div>

        {validDeputies.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nenhum deputado com votações nominais comparáveis encontrado para os filtros atuais.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {validDeputies.map((deputy) => (
              <DeputyCard key={deputy.id} deputy={deputy} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
