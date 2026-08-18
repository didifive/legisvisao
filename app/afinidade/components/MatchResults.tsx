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
} from "react-icons/fa";
import type { PoliticalParty } from "@/types/db";
import type { PoliticianMatch, PartyMatchResult } from "@/lib/match/types";

export type ResultsShape = {
  politicians: PoliticianMatch[];
  parties: Array<PoliticalParty & { match: PartyMatchResult }>;
} | null;

export interface MatchResultsProps {
  results: ResultsShape;
  loading: boolean;
  stateFilter: string | null;
  availableStates: string[];
  onStateChange: (state: string | null) => void;
}

interface NormalizedParty extends PoliticalParty {
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

function normalizePoliticianType(type?: string | null): "DEPUTADO" | "SENADOR" | null {
  if (!type) return null;
  const upper = type.toString().toUpperCase();
  if (upper.includes("DEPUT")) return "DEPUTADO";
  if (upper.includes("SENAT") || upper.includes("SENAD")) return "SENADOR";
  return null;
}

function getProgressGradientClass(pct: number | null): string {
  if (pct === null) return "bg-slate-400";
  if (pct >= 70) return "bg-gradient-to-r from-emerald-500 to-emerald-400";
  if (pct >= 40) return "bg-gradient-to-r from-blue-600 to-teal-400";
  return "bg-gradient-to-r from-slate-500 to-slate-400";
}

function sortRankingEntities<T extends {
  name?: string;
  sigla?: string;
  adherence: number | null;
  matches_count?: number;
  comparable_count?: number;
  match?: PartyMatchResult;
}>(a: T, b: T): number {
  const adhA = a.adherence ?? a.match?.adherence ?? -1;
  const adhB = b.adherence ?? b.match?.adherence ?? -1;
  if (adhB !== adhA) return adhB - adhA;

  // Critério de desempate 1: Maior volume de votos considerados (maior amostragem/relevância estatística)
  const compA = a.comparable_count ?? a.match?.comparable_count ?? 0;
  const compB = b.comparable_count ?? b.match?.comparable_count ?? 0;
  if (compB !== compA) return compB - compA;

  // Critério de desempate 2: Maior número de concordâncias absolutas
  const matchesA = a.matches_count ?? a.match?.matches_count ?? 0;
  const matchesB = b.matches_count ?? b.match?.matches_count ?? 0;
  if (matchesB !== matchesA) return matchesB - matchesA;

  const labelA = (a.sigla || a.name || "").toString();
  const labelB = (b.sigla || b.name || "").toString();
  return labelA.localeCompare(labelB);
}

function LoadingState() {
  return (
    <div className="py-16 text-center text-muted-foreground flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      <span>Calculando sua afinidade política com dados oficiais...</span>
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
  const isInactive = (party.situacao || "").toUpperCase() === "INATIVO";
  const totalComp = party.match?.comparable_count ?? 0;
  const totalMatches = party.match?.matches_count ?? 0;

  return (
    <Link
      href={`/partidos/${party.id}`}
      className={`group block p-4 sm:p-5 rounded-xl bg-card border ${
        isInactive ? "border-border/60 opacity-90" : "border-border hover:border-primary/50"
      } shadow-soft hover:shadow-medium transition-smooth`}
    >
      <div className="flex items-center justify-between gap-4 mb-2.5">
        <div className="flex items-center gap-3">
          <span
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
              isTop3 && !isInactive
                ? "bg-primary text-white shadow-soft"
                : "bg-muted text-muted-foreground"
            }`}
          >
            #{rank}
          </span>
          <div>
            <h3 className="font-bold text-foreground text-base group-hover:text-primary transition-smooth flex items-center gap-2 flex-wrap">
              <span>{party.nome}</span>
              <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                {party.sigla}
              </span>
              {isInactive && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                  Legenda Inativa / Histórica
                </span>
              )}
            </h3>
            <span className="text-xs text-muted-foreground block mt-0.5">
              {totalComp > 0 ? (
                <>
                  Baseado em <strong>{totalComp}</strong> {totalComp === 1 ? "voto de filiado" : "votos de filiados"}{" "}
                  <span className="text-primary font-semibold">({totalMatches} {totalMatches === 1 ? "concordância" : "concordâncias"})</span>
                </>
              ) : (
                "Sem votos nominais registrados pelos filiados nestas propostas"
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

interface PoliticianCardProps {
  politician: PoliticianMatch;
  isSenator?: boolean;
}

function PoliticianCard({ politician, isSenator = false }: PoliticianCardProps) {
  const pct = politician.adherence === null ? null : Math.round(politician.adherence * 100);
  const progressBg = isSenator ? "bg-secondary" : "bg-primary";
  const compCount = politician.comparable_count ?? 0;
  const matchCount = politician.matches_count ?? 0;

  return (
    <Link
      href={`/politicos/${politician.id}`}
      className="p-4 rounded-xl bg-card border border-border shadow-soft flex items-center justify-between gap-4 transition-smooth hover:border-primary/50 group block"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-foreground text-sm truncate group-hover:text-primary transition-smooth" title={politician.name}>
            {politician.name}
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
          <span className="font-semibold text-primary">{politician.state}</span>
          <span>•</span>
          <span>{isSenator ? "Senador" : politician.party_sigla || "Dep. Federal"}</span>
          <span>•</span>
          <span className="text-[11px] text-muted-foreground">
            <strong>{compCount}</strong> {compCount === 1 ? "voto considerado" : "votos considerados"} ({matchCount} {matchCount === 1 ? "concordância" : "concordâncias"})
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="w-24 bg-muted h-2.5 rounded-full overflow-hidden border border-border/40">
          <div
            className={`${progressBg} h-full rounded-full transition-smooth`}
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

  const { deputies, senators } = useMemo(() => {
    const raw: PoliticianMatch[] = (results.politicians || []).map((pol) => {
      const normalizedType = normalizePoliticianType(pol.type ?? (pol as unknown as Record<string, string>)?.politician_type ?? null) ?? "DEPUTADO";
      return {
        ...pol,
        type: normalizedType,
        adherence: clamp01(pol.adherence ?? null),
      };
    });

    const validDeputies = raw
      .filter((p) => p.type === "DEPUTADO" && (p.comparable_count ?? 0) > 0 && p.adherence !== null)
      .sort(sortRankingEntities);

    const validSenators = raw
      .filter((p) => p.type === "SENADOR" && (p.comparable_count ?? 0) > 0 && p.adherence !== null)
      .sort(sortRankingEntities);

    return { deputies: validDeputies, senators: validSenators };
  }, [results.politicians]);

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
            <strong>Esta ferramenta não recomenda representantes. Apenas compara dados públicos.</strong> Os índices apresentados decorrem do cruzamento determinístico das suas opiniões com as votações nominais oficiais registradas na Câmara dos Deputados e no Senado Federal.
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
              <span>Média dos Parlamentares Filiados</span>
            </span>
          </div>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            A afinidade partidária reflete a média dos votos nominais individuais de todos os deputados federais e senadores filiados à legenda nas propostas avaliadas.
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

      {/* 2. SELETOR DE ESTADO (UF) */}
      <section className="p-6 rounded-2xl bg-card border border-border shadow-soft flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FaMapMarkerAlt className="text-primary w-4 h-4" />
            <h3 className="font-bold text-foreground text-base">
              Filtrar Parlamentares por Estado (UF)
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Selecione seu estado para ver a afinidade com os deputados federais e senadores da bancada estadual.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={stateFilter ?? ""}
            onChange={(e) => onStateChange(e.target.value || null)}
            className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground font-semibold focus:ring-2 focus:ring-primary/20 outline-none w-full sm:w-48 cursor-pointer shadow-soft"
          >
            <option value="">Selecione um Estado...</option>
            {availableStates.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* 3. PARLAMENTARES POR ESTADO */}
      {!stateFilter ? (
        <div className="p-8 rounded-2xl bg-muted/40 border border-dashed border-border text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <FaInfoCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-foreground">
            Escolha um estado acima para ver seus parlamentares
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
            Selecione uma UF para listar os deputados federais e senadores que registraram votos nominais nas matérias selecionadas.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {/* DEPUTADOS FEDERAIS */}
          <section className="space-y-4">
            <div className="border-b border-border pb-3">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <FaUserTie className="text-secondary w-5 h-5" />
                Deputados Federais ({stateFilter})
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Parlamentares da Câmara dos Deputados com votações nominais registradas nas propostas analisadas.
              </p>
            </div>

            {deputies.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Nenhum deputado com votações nominais comparáveis encontradas para {stateFilter}.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {deputies.map((deputy) => (
                  <PoliticianCard key={deputy.id} politician={deputy} isSenator={false} />
                ))}
              </div>
            )}
          </section>

          {/* SENADORES */}
          <section className="space-y-4">
            <div className="border-b border-border pb-3">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <FaVoteYea className="text-primary w-5 h-5" />
                Senadores ({stateFilter})
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Parlamentares do Senado Federal com votações nominais registradas nas matérias analisadas.
              </p>
            </div>

            {senators.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Nenhum senador com votações nominais comparáveis encontradas para {stateFilter}.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {senators.map((senator) => (
                  <PoliticianCard key={senator.id} politician={senator} isSenator={true} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
