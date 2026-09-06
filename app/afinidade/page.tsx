"use client";

import { useEffect, useState } from "react";
import MatchResults from "@/app/afinidade/components/MatchResults";
import { Button } from "@/app/components/ui/Button";
import { FaExclamationTriangle, FaSyncAlt } from "react-icons/fa";
import { useSystemStatus } from "@/app/components/SystemStatusProvider";
import type {
  Party,
  DeputySearchResult,
  PropositionDetailResponse,
} from "@/types/db";
import type {
  DeputyMatch,
  PartyMatchResult,
  GranularUserVotes,
  VoteDetailWithProposition,
} from "@/lib/match/types";
import {
  attachPropositionIdToVotes,
  calculatePoliticianMatch,
  calculatePartyMatch,
  normalizeAdherence,
  calculateBayesianScore,
} from "@/lib/match";
import {
  getStoredGranularAnswers,
  sanitizeStoredAnswers,
} from "@/lib/storage";
import { buildPropositionSessionMapping } from "@/lib/propositionSessionMap";

function extractPropIdsToFetch(
  votes: GranularUserVotes,
  sessionToPropMap?: Map<string, number>
): number[] {
  const propIdsSet = new Set<number>();

  for (const key of Object.keys(votes)) {
    if (sessionToPropMap?.has(key)) {
      propIdsSet.add(sessionToPropMap.get(key)!);
      continue;
    }
    const prefix = Number(key.split("-")[0]);
    if (!Number.isNaN(prefix)) {
      propIdsSet.add(prefix);
    }
  }

  return Array.from(propIdsSet);
}

function aggregatePropositionVotes(propsData: PropositionDetailResponse[]) {
  const rawVotes: Array<{
    deputado_id: number;
    votacao_id: string;
    voto_original: string;
    sigla_partido?: string | null;
  }> = [];
  const voteSessionToProposition: Record<string, number> = {};

  for (const pd of propsData) {
    if (!pd) continue;
    const pId = pd.proposition?.id || pd.project?.id;
    if (typeof pId !== "number") continue;

    if (Array.isArray(pd.sessions)) {
      for (const s of pd.sessions) {
        voteSessionToProposition[String(s.id)] = pId;
      }
    }

    if (pd.votes && Array.isArray(pd.votes)) {
      for (const v of pd.votes) {
        const vSessionId = String(v.votacao_id || v.vote_session_id || "");
        rawVotes.push({
          deputado_id: Number(v.deputado_id || v.politician_id),
          votacao_id: vSessionId,
          voto_original: v.voto_original,
          sigla_partido: v.sigla_partido || v.party_sigla,
        });
      }
    }
  }

  return { rawVotes, voteSessionToProposition };
}

function sortDeputyMatches(deputyMatches: DeputyMatch[]): DeputyMatch[] {
  return deputyMatches.slice().sort((a, b) => {
    const scoreA = calculateBayesianScore(a.matches_count ?? 0, a.comparable_count ?? 0);
    const scoreB = calculateBayesianScore(b.matches_count ?? 0, b.comparable_count ?? 0);
    if (Math.abs(scoreB - scoreA) > 0.0001) return scoreB - scoreA;

    const adhA = a.adherence ?? -1;
    const adhB = b.adherence ?? -1;
    if (adhB !== adhA) return adhB - adhA;

    const matchesA = a.matches_count ?? 0;
    const matchesB = b.matches_count ?? 0;
    if (matchesB !== matchesA) return matchesB - matchesA;

    const compA = a.comparable_count ?? 0;
    const compB = b.comparable_count ?? 0;
    if (compB !== compA) return compB - compA;

    return a.nome_eleitoral.localeCompare(b.nome_eleitoral, "pt-BR");
  });
}

function sortPartyMatches(
  partyMatches: Array<Party & { match: PartyMatchResult }>
): Array<Party & { match: PartyMatchResult }> {
  return partyMatches.slice().sort((a, b) => {
    const matchesA = a.match?.matches_count ?? 0;
    const compA = a.match?.comparable_count ?? 0;
    const matchesB = b.match?.matches_count ?? 0;
    const compB = b.match?.comparable_count ?? 0;

    const scoreA = calculateBayesianScore(matchesA, compA);
    const scoreB = calculateBayesianScore(matchesB, compB);
    if (Math.abs(scoreB - scoreA) > 0.0001) return scoreB - scoreA;

    const adhA = a.match?.adherence ?? -1;
    const adhB = b.match?.adherence ?? -1;
    if (adhB !== adhA) return adhB - adhA;

    if (matchesB !== matchesA) return matchesB - matchesA;
    if (compB !== compA) return compB - compA;

    return a.sigla.localeCompare(b.sigla, "pt-BR");
  });
}

async function fetchInitialAppData() {
  const [deputiesRes, partiesRes, statesRes, propsRes] = await Promise.all([
    fetch("/api/deputies"),
    fetch("/api/parties"),
    fetch("/api/states").catch(() => null),
    fetch("/api/propositions?include_all=true").catch(() => null),
  ]);

  const deputiesJson = await deputiesRes.json();
  const fetchedDeputies: DeputySearchResult[] = Array.isArray(deputiesJson)
    ? deputiesJson
    : deputiesJson?.results ?? [];

  const partiesJson = await partiesRes.json();
  const fetchedParties: Party[] = Array.isArray(partiesJson)
    ? partiesJson
    : partiesJson?.results ?? [];

  let states: string[] = [];
  if (statesRes?.ok) {
    const statesData = await statesRes.json();
    if (Array.isArray(statesData)) {
      states = statesData;
    }
  }

  if (states.length === 0) {
    states = [
      "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA",
      "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN",
      "RO", "RR", "RS", "SC", "SE", "SP", "TO"
    ];
  }

  let sessionToPropMap = new Map<string, number>();

  if (propsRes?.ok) {
    const propsData = await propsRes.json();
    const rawList = propsData?.propositions || propsData?.projects || [];
    const { validSessionIds, propositionToSessionMap, sessionToPropMap: propMap } =
      buildPropositionSessionMapping(rawList);
    sessionToPropMap = propMap;

    sanitizeStoredAnswers(validSessionIds, propositionToSessionMap);
  }

  return {
    fetchedDeputies,
    fetchedParties,
    states,
    sessionToPropMap,
  };
}

export default function AfinidadePage() {
  const { isReady } = useSystemStatus();
  const [loading, setLoading] = useState(false);
  const [stateFilter, setStateFilter] = useState<string | null>(null);
  const [partyFilter, setPartyFilter] = useState<string | null>(null);
  const [calculatedParties, setCalculatedParties] = useState<Array<Party & { match: PartyMatchResult }>>([]);
  const [allCalculatedDeputies, setAllCalculatedDeputies] = useState<DeputyMatch[]>([]);
  const [availableStates, setAvailableStates] = useState<string[]>([]);
  const [hasVotes, setHasVotes] = useState(false);

  // Carrega a base de dados completa uma única vez
  async function loadInitialData() {
    setLoading(true);
    try {
      const { fetchedDeputies, fetchedParties, states, sessionToPropMap } =
        await fetchInitialAppData();
      setAvailableStates(states);

      const activeVotes: GranularUserVotes = getStoredGranularAnswers();
      const votesCount = Object.keys(activeVotes).length;
      setHasVotes(votesCount > 0);

      if (votesCount > 0) {
        await calculateAllMatches(activeVotes, fetchedDeputies, fetchedParties, sessionToPropMap);
      }
    } catch (err) {
      console.error("Erro ao carregar dados iniciais:", err);
    } finally {
      setLoading(false);
    }
  }

  // Calcula os índices de afinidade
  async function calculateAllMatches(
    votes: GranularUserVotes,
    currentDeputies: DeputySearchResult[],
    currentParties: Party[],
    sessionToPropMap?: Map<string, number>
  ) {
    try {
      const propIds = extractPropIdsToFetch(votes, sessionToPropMap);
      if (propIds.length === 0) return;

      const propPromises = propIds.map((id) =>
        fetch(`/api/propositions/${id}`).then((r) => r.json()).catch((e) => {
          console.error("Erro no fetch da proposição", id, e);
          return null;
        })
      );
      const propsData: PropositionDetailResponse[] = (await Promise.all(propPromises)).filter(Boolean);

      const { rawVotes, voteSessionToProposition } = aggregatePropositionVotes(propsData);

      const allVotesWithProp: VoteDetailWithProposition[] = attachPropositionIdToVotes(rawVotes, voteSessionToProposition);

      // 1. Afinidade dos Partidos (Média dos Deputados)
      const partyMatches = currentParties.map((party) => {
        const votesForParty = allVotesWithProp.filter(
          (v) => (v.sigla_partido ?? "").toUpperCase() === (party.sigla ?? "").toUpperCase()
        );
        const rawMatch = calculatePartyMatch(votes, votesForParty);
        const normalizedMatch = rawMatch
          ? { ...rawMatch, adherence: normalizeAdherence(rawMatch.adherence) }
          : { adherence: null, matches_count: 0, disposable_count: 0, comparable_count: 0 };
        return { ...party, match: normalizedMatch };
      });

      // 2. Afinidade Individual dos Deputados
      const deputyMatches: DeputyMatch[] = currentDeputies.map((dep) => {
        const votesOfDep = allVotesWithProp.filter((v) => v.deputado_id === dep.id);
        const raw = calculatePoliticianMatch(votes, votesOfDep, dep);
        const normalized = raw ? { ...raw, adherence: normalizeAdherence(raw.adherence) } : raw;
        return normalized;
      });

      const sortedParties = sortPartyMatches(partyMatches);
      const sortedDeputies = sortDeputyMatches(deputyMatches);

      setCalculatedParties(sortedParties);
      setAllCalculatedDeputies(sortedDeputies);
    } catch (err) {
      console.error("Erro ao calcular afinidade:", err);
    }
  }

  useEffect(() => {
    loadInitialData();

    const handleStorage = () => {
      const currentVotes = getStoredGranularAnswers();
      const currentCount = Object.keys(currentVotes).length;
      setHasVotes(currentCount > 0);
      if (currentCount > 0) {
        loadInitialData();
      } else {
        setCalculatedParties([]);
        setAllCalculatedDeputies([]);
      }
    };

    window.addEventListener("storage-answers-updated", handleStorage);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage-answers-updated", handleStorage);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Banner de Sincronização / Base em Atualização */}
      {!isReady && !loading && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs sm:text-sm text-amber-900 dark:text-amber-300 shadow-soft">
          <div className="flex items-start gap-3">
            <FaExclamationTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <strong className="text-foreground block">
                Base Legislativa em Sincronização
              </strong>
              <p className="text-muted-foreground leading-relaxed">
                Os dados das votações nominais da Câmara dos Deputados estão sendo processados em segundo plano. Os índices de afinidade serão atualizados automaticamente.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            href="/faq"
            className="shrink-0 border-amber-500/40 text-amber-900 dark:text-amber-300 hover:bg-amber-500/20 text-xs font-bold gap-1.5"
          >
            <FaSyncAlt className="w-3 h-3" />
            <span>Ver Fontes & FAQ</span>
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="space-y-3">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          Afinidade com <span className="text-gradient">Deputados Federais e Partidos</span>
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground max-w-3xl leading-relaxed">
          Índice de convergência calculado comparando suas opiniões com os votos nominais registrados pelos{" "}
          <strong>Deputados Federais</strong> no Plenário da Câmara dos Deputados.
        </p>
      </div>

      {/* Resultados */}
      <MatchResults
        results={
          hasVotes
            ? {
                deputies: allCalculatedDeputies,
                parties: calculatedParties,
              }
            : null
        }
        loading={loading}
        stateFilter={stateFilter}
        availableStates={availableStates}
        onStateChange={setStateFilter}
        partyFilter={partyFilter}
        onPartyChange={setPartyFilter}
      />
    </div>
  );
}
