"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import MatchResults from "@/app/afinidade/components/MatchResults";
import type {
  VoteDetailRow,
  PoliticalParty,
  PoliticianSearchResult,
} from "@/types/db";
import type {
  VoteDetailWithProject,
  PoliticianMatch,
  PartyMatchResult,
  UserVotes,
} from "@/lib/match/types";
import {
  attachProjectIdToVotes,
  calculatePoliticianMatch,
  calculatePartyMatch,
} from "@/lib/match";
import { getStoredAnswers } from "@/lib/storage";

type MatchResultsShape = {
  politicians: PoliticianMatch[];
  parties: Array<PoliticalParty & { match: PartyMatchResult }>;
} | null;

export default function AfinidadePage() {
  const [loading, setLoading] = useState(false);
  const [stateFilter, setStateFilter] = useState<string | null>(null);
  const [calculatedParties, setCalculatedParties] = useState<Array<PoliticalParty & { match: PartyMatchResult }>>([]);
  const [allCalculatedPoliticians, setAllCalculatedPoliticians] = useState<PoliticianMatch[]>([]);
  const [availableStates, setAvailableStates] = useState<string[]>([]);
  const [hasVotes, setHasVotes] = useState(false);

  // Carrega a base de dados completa uma única vez
  async function loadInitialData() {
    setLoading(true);
    try {
      const [pRes, partiesRes, projectsRes] = await Promise.all([
        fetch("/api/politicians"),
        fetch("/api/parties"),
        fetch("/api/projects").catch(() => null),
      ]);

      const politiciansJson = await pRes.json();
      const fetchedPoliticians: PoliticianSearchResult[] = Array.isArray(politiciansJson)
        ? politiciansJson
        : politiciansJson?.results ?? [];

      const partiesJson = await partiesRes.json();
      const fetchedParties: PoliticalParty[] = Array.isArray(partiesJson)
        ? partiesJson
        : partiesJson?.results ?? [];

      if (projectsRes && projectsRes.ok) {
        const projectsData = await projectsRes.json();
        if (projectsData.states && Array.isArray(projectsData.states)) {
          setAvailableStates(projectsData.states);
        }
      }

      if (availableStates.length === 0) {
        const fallbackStates = [
          "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA",
          "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN",
          "RO", "RR", "RS", "SC", "SE", "SP", "TO"
        ];
        setAvailableStates(fallbackStates);
      }

      const stored: UserVotes = getStoredAnswers();
      const votesCount = Object.keys(stored).length;
      setHasVotes(votesCount > 0);

      if (votesCount > 0) {
        await calculateAllMatches(stored, fetchedPoliticians, fetchedParties);
      }
    } catch (err) {
      console.error("Erro ao carregar dados iniciais:", err);
    } finally {
      setLoading(false);
    }
  }

  // Calcula os índices de afinidade a nível nacional
  async function calculateAllMatches(
    votes: UserVotes,
    currentPoliticians: PoliticianSearchResult[],
    currentParties: PoliticalParty[]
  ) {
    try {
      function normalizePoliticianType(
        t?: string | null,
        defaultType: "DEPUTADO" | "SENADOR" = "DEPUTADO"
      ): "DEPUTADO" | "SENADOR" {
        if (!t) return defaultType;
        const up = t.toString().toUpperCase();
        if (up.includes("SENAT") || up.includes("SENAD")) return "SENADOR";
        if (up.includes("DEPUT") || up.includes("DEPUTADO")) return "DEPUTADO";
        return defaultType;
      }

      function normalizeAdherence(raw?: number | null): number | null {
        if (raw === null || raw === undefined) return null;
        const v = Number(raw);
        if (Number.isNaN(v)) return null;
        if (v >= 0 && v <= 1) return v;
        if (v > 1 && v <= 100) return Math.min(1, v / 100);
        if (v > 100) return Math.min(1, v / 10000);
        return Math.max(0, Math.min(1, v));
      }

      const projectIds = Object.keys(votes).map((k) => Number(k)).filter((n) => !Number.isNaN(n));
      if (projectIds.length === 0) {
        setCalculatedParties([]);
        setAllCalculatedPoliticians([]);
        return;
      }

      const projectPromises = projectIds.map((id) =>
        fetch(`/api/projects/${id}`).then((r) => r.json()).catch((e) => {
          console.error("Erro no fetch do projeto", id, e);
          return null;
        })
      );
      const projectsData = await Promise.all(projectPromises);

      const allVotes: VoteDetailRow[] = [];
      const voteSessionToProject: Record<number, number> = {};

      for (const pd of projectsData) {
        if (!pd) continue;
        const pId = pd.project?.id;
        if (typeof pId === "number" && Array.isArray(pd.sessions)) {
          for (const s of pd.sessions) {
            if (typeof s.id === "number") {
              voteSessionToProject[s.id] = pId;
            }
          }
        }
        if (pd.votes && Array.isArray(pd.votes)) {
          allVotes.push(...pd.votes);
        }
      }

      const allVotesWithProject: VoteDetailWithProject[] = attachProjectIdToVotes(allVotes, voteSessionToProject);

      const polsById: Record<number, PoliticianSearchResult & { type?: string | null }> = {};
      for (const p of currentPoliticians) {
        polsById[p.id] = {
          ...p,
          type: normalizePoliticianType(p.type, "DEPUTADO"),
        };
      }

      const pols = Object.values(polsById);

      // 1. Afinidade dos Partidos (Média dos Posicionamentos dos Parlamentares Filiados)
      const partyMatches = currentParties.map((party) => {
        const polVotesForParty = allVotesWithProject.filter(
          (v) => (v.party_sigla ?? "").toUpperCase() === (party.sigla ?? "").toUpperCase()
        );
        const rawMatch = calculatePartyMatch(votes, polVotesForParty);
        const normalizedMatch = rawMatch
          ? { ...rawMatch, adherence: normalizeAdherence(rawMatch.adherence) }
          : { adherence: null, matches_count: 0, comparable_count: 0 };
        return { ...party, match: normalizedMatch };
      });

      // 2. Afinidade Individual dos Parlamentares
      const politicianMatches: PoliticianMatch[] = pols.map((pol) => {
        const votesOfPol = allVotesWithProject.filter((v) => v.politician_id === pol.id);
        const polForCalc = { ...pol, type: pol.type ?? null };
        const raw = calculatePoliticianMatch(votes, votesOfPol, polForCalc);
        const normalized = raw ? { ...raw, adherence: normalizeAdherence(raw.adherence) } : raw;
        return normalized;
      });

      const sortedPoliticians = politicianMatches.slice().sort((a, b) => {
        const adhA = a.adherence ?? -1;
        const adhB = b.adherence ?? -1;
        if (adhB !== adhA) return adhB - adhA;

        const matchesA = a.matches_count ?? 0;
        const matchesB = b.matches_count ?? 0;
        if (matchesB !== matchesA) return matchesB - matchesA;

        const compA = a.comparable_count ?? 0;
        const compB = b.comparable_count ?? 0;
        if (compB !== compA) return compB - compA;

        return a.name.localeCompare(b.name);
      });

      setCalculatedParties(partyMatches);
      setAllCalculatedPoliticians(sortedPoliticians);
    } catch (err) {
      console.error("Erro no cálculo da afinidade:", err);
    }
  }

  // Filtragem no client-side por estado
  const filteredPoliticians = useMemo(() => {
    if (!stateFilter) return allCalculatedPoliticians;
    return allCalculatedPoliticians.filter(
      (p) => (p.state || "").toUpperCase() === stateFilter.toUpperCase()
    );
  }, [allCalculatedPoliticians, stateFilter]);

  const results: MatchResultsShape = useMemo(() => {
    if (!hasVotes) return null;
    return {
      parties: calculatedParties,
      politicians: filteredPoliticians,
    };
  }, [hasVotes, calculatedParties, filteredPoliticians]);

  useEffect(() => {
    loadInitialData();
  }, []);

  function handleStateChange(state: string | null) {
    setStateFilter(state);
  }

  return (
    <main className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Sua Afinidade Legislativa
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Cruzamento determinístico das suas opiniões com as votações nominais dos parlamentares e bancadas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/opiniao"
            className="text-xs sm:text-sm font-semibold text-foreground hover:text-primary transition-smooth"
          >
            Analisar mais propostas
          </Link>
          <Link
            href="/opiniao/revisao"
            className="text-xs sm:text-sm font-semibold text-primary hover:underline"
          >
            Revisar minhas opiniões &rarr;
          </Link>
        </div>
      </div>

      <section>
        <MatchResults
          results={results}
          loading={loading}
          stateFilter={stateFilter}
          availableStates={availableStates}
          onStateChange={handleStateChange}
        />
      </section>
    </main>
  );
}
