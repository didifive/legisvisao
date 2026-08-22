"use client";

import { useEffect, useState } from "react";
import MatchResults from "@/app/afinidade/components/MatchResults";
import { Button } from "@/app/components/ui/Button";
import { FaExclamationTriangle, FaSyncAlt } from "react-icons/fa";
import { useSystemStatus } from "@/app/components/SystemStatusProvider";
import type {
  Party,
  DeputySearchResult,
} from "@/types/db";
import type {
  DeputyMatch,
  PartyMatchResult,
  UserVotes,
  VoteDetailWithProposition,
} from "@/lib/match/types";
import {
  attachPropositionIdToVotes,
  calculatePoliticianMatch,
  calculatePartyMatch,
  sortVoteSessionsDeterministic,
} from "@/lib/match";
import { getStoredAnswers } from "@/lib/storage";

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
      const [deputiesRes, partiesRes, statesRes] = await Promise.all([
        fetch("/api/deputies"),
        fetch("/api/parties"),
        fetch("/api/states").catch(() => null),
      ]);

      const deputiesJson = await deputiesRes.json();
      const fetchedDeputies: DeputySearchResult[] = Array.isArray(deputiesJson)
        ? deputiesJson
        : deputiesJson?.results ?? [];

      const partiesJson = await partiesRes.json();
      const fetchedParties: Party[] = Array.isArray(partiesJson)
        ? partiesJson
        : partiesJson?.results ?? [];

      if (statesRes && statesRes.ok) {
        const statesData = await statesRes.json();
        if (Array.isArray(statesData)) {
          setAvailableStates(statesData);
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
        await calculateAllMatches(stored, fetchedDeputies, fetchedParties);
      }
    } catch (err) {
      console.error("Erro ao carregar dados iniciais:", err);
    } finally {
      setLoading(false);
    }
  }

  // Calcula os índices de afinidade
  async function calculateAllMatches(
    votes: UserVotes,
    currentDeputies: DeputySearchResult[],
    currentParties: Party[]
  ) {
    try {
      function normalizeAdherence(raw?: number | null): number | null {
        if (raw === null || raw === undefined) return null;
        const v = Number(raw);
        if (Number.isNaN(v)) return null;
        if (v >= 0 && v <= 1) return v;
        if (v > 1 && v <= 100) return Math.min(1, v / 100);
        if (v > 100) return Math.min(1, v / 10000);
        return Math.max(0, Math.min(1, v));
      }

      const propIds = Object.keys(votes).map((k) => Number(k)).filter((n) => !Number.isNaN(n));
      if (propIds.length === 0) {
        setCalculatedParties([]);
        setAllCalculatedDeputies([]);
        return;
      }

      const propPromises = propIds.map((id) =>
        fetch(`/api/propositions/${id}`).then((r) => r.json()).catch((e) => {
          console.error("Erro no fetch da proposição", id, e);
          return null;
        })
      );
      const propsData = await Promise.all(propPromises);

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

        // Contabiliza votos nominais por sessão para permitir desempate correto na classificação
        const votesBySessionId = new Map<string, number>();
        if (Array.isArray(pd.votes)) {
          for (const v of pd.votes) {
            const sId = String(v.votacao_id || v.vote_session_id || "");
            if (sId) {
              votesBySessionId.set(sId, (votesBySessionId.get(sId) || 0) + 1);
            }
          }
        }

        // Identifica a sessão principal de deliberação (mérito / texto-base com votos nominais)
        let primarySessionId: string | null = null;
        if (Array.isArray(pd.sessions) && pd.sessions.length > 0) {
          const sessionsWithVotes = pd.sessions
            .map((s: { id: string | number; data_hora?: string; descricao?: string; tipo_deliberacao?: string }) => ({
              ...s,
              total_votos: votesBySessionId.get(String(s.id)) || 0,
            }))
            .filter((s: { total_votos: number }) => s.total_votos > 0);

          const sortedSessions = sortVoteSessionsDeterministic(
            sessionsWithVotes.length > 0 ? sessionsWithVotes : pd.sessions
          );

          // CRÍTICO: Só usa para o cálculo de afinidade se a sessão eleita for genuinamente de MÉRITO (Prioridade 1)
          const elected = sortedSessions[0];
          if (
            elected &&
            elected.classification.type === "MERITO" &&
            elected.classification.priority === 1 &&
            (votesBySessionId.get(String(elected.id)) || 0) > 0
          ) {
            primarySessionId = String(elected.id);
          }
        }

        // Se uma sessão de mérito nominal foi identificada, vincula para comparação
        if (primarySessionId) {
          voteSessionToProposition[primarySessionId] = pId;
        }

        if (pd.votes && Array.isArray(pd.votes)) {
          for (const v of pd.votes) {
            const vSessionId = String(v.votacao_id || v.vote_session_id || "");
            // Filtra exclusivamente os votos da sessão de mérito principal para não inflar múltiplos turnos/emendas
            if (primarySessionId && vSessionId !== primarySessionId) {
              continue;
            }

            rawVotes.push({
              deputado_id: v.deputado_id || v.politician_id,
              votacao_id: vSessionId,
              voto_original: v.voto_original,
              sigla_partido: v.sigla_partido || v.party_sigla,
            });
          }
        }
      }

      const allVotesWithProp: VoteDetailWithProposition[] = attachPropositionIdToVotes(rawVotes, voteSessionToProposition);

      // 1. Afinidade dos Partidos (Média dos Deputados)
      const partyMatches = currentParties.map((party) => {
        const votesForParty = allVotesWithProp.filter(
          (v) => (v.sigla_partido ?? "").toUpperCase() === (party.sigla ?? "").toUpperCase()
        );
        const rawMatch = calculatePartyMatch(votes, votesForParty);
        const normalizedMatch = rawMatch
          ? { ...rawMatch, adherence: normalizeAdherence(rawMatch.adherence) }
          : { adherence: null, matches_count: 0, comparable_count: 0 };
        return { ...party, match: normalizedMatch };
      });

      // 2. Afinidade Individual dos Deputados
      const deputyMatches: DeputyMatch[] = currentDeputies.map((dep) => {
        const votesOfDep = allVotesWithProp.filter((v) => v.deputado_id === dep.id);
        const raw = calculatePoliticianMatch(votes, votesOfDep, dep);
        const normalized = raw ? { ...raw, adherence: normalizeAdherence(raw.adherence) } : raw;
        return normalized;
      });

      const sortedDeputies = deputyMatches.slice().sort((a, b) => {
        const adhA = a.adherence ?? -1;
        const adhB = b.adherence ?? -1;
        if (adhB !== adhA) return adhB - adhA;

        const matchesA = a.matches_count ?? 0;
        const matchesB = b.matches_count ?? 0;
        if (matchesB !== matchesA) return matchesB - matchesA;

        const compA = a.comparable_count ?? 0;
        const compB = b.comparable_count ?? 0;
        if (compB !== compA) return compB - compA;

        return a.nome_eleitoral.localeCompare(b.nome_eleitoral);
      });

      setCalculatedParties(partyMatches);
      setAllCalculatedDeputies(sortedDeputies);
    } catch (err) {
      console.error("Erro ao calcular afinidade:", err);
    }
  }

  useEffect(() => {
    loadInitialData();

    const handleStorageUpdate = () => {
      const stored: UserVotes = getStoredAnswers();
      const votesCount = Object.keys(stored).length;
      setHasVotes(votesCount > 0);
      loadInitialData();
    };

    window.addEventListener("storage-answers-updated", handleStorageUpdate);
    window.addEventListener("storage", handleStorageUpdate);

    return () => {
      window.removeEventListener("storage-answers-updated", handleStorageUpdate);
      window.removeEventListener("storage", handleStorageUpdate);
    };
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-8 animate-fade-in">
      {/* Alerta de sincronização */}
      {!isReady && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/30 text-amber-900 dark:text-amber-300 text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-between gap-4 text-left shadow-soft animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
              <FaExclamationTriangle className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <span className="font-bold text-sm block text-amber-950 dark:text-amber-200">
                Base de dados da Câmara dos Deputados em atualização
              </span>
              <span className="text-muted-foreground text-xs leading-relaxed block">
                Os dados oficiais de votações e parlamentares estão sendo sincronizados.
              </span>
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
          Índice de convergência calculado comparando suas opiniões com os votos nominais registrados pelos 
          <strong> Deputados Federais</strong> no Plenário da Câmara dos Deputados.
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
