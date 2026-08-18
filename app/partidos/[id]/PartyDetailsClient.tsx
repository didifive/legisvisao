"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FaChevronRight,
  FaUsers,
  FaVoteYea,
  FaFileAlt,
  FaExternalLinkAlt,
  FaCheck,
  FaTimes,
  FaLandmark,
  FaCheckCircle,
  FaInfoCircle,
} from "react-icons/fa";
import { Button } from "@/app/components/ui/Button";
import type { PoliticalParty, PartyPoliticianMember, PartyPoliticianVoteDetail } from "@/types/db";

interface Props {
  party: PoliticalParty;
  politicians: PartyPoliticianMember[];
  politicianVotes: PartyPoliticianVoteDetail[];
}

export default function PartyDetailsClient({
  party,
  politicians,
  politicianVotes = [],
}: Props) {
  const [activeTab, setActiveTab] = useState<"all" | "deputies" | "senators">("all");
  const isInactive = (party.situacao || "").toUpperCase() === "INATIVO";

  const deputies = politicians.filter((p) =>
    (p.type || p.mandate_office || "").toUpperCase().includes("DEPUT")
  );
  const senators = politicians.filter((p) =>
    (p.type || p.mandate_office || "").toUpperCase().includes("SENAT")
  );

  const displayedPoliticians =
    activeTab === "deputies"
      ? deputies
      : activeTab === "senators"
      ? senators
      : politicians;

  // Agrupar votos nominais por projeto
  const projectMap = new Map<number, {
    project_id: number;
    project_title: string;
    project_description: string | null;
    house: string;
    official_url: string | null;
    votes: Array<{ politician_name: string; vote_original: string }>;
  }>();

  for (const pv of politicianVotes) {
    if (!projectMap.has(pv.project_id)) {
      projectMap.set(pv.project_id, {
        project_id: pv.project_id,
        project_title: pv.project_title ?? "Sem título",
        project_description: pv.project_description,
        house: pv.house,
        official_url: pv.official_url,
        votes: [],
      });
    }
    projectMap.get(pv.project_id)!.votes.push({
      politician_name: pv.politician_name,
      vote_original: pv.vote_original,
    });
  }

  const projectsWithVotes = Array.from(projectMap.values());

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Navegação Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-primary transition-smooth">
          Início
        </Link>
        <FaChevronRight className="w-2.5 h-2.5" />
        <Link href="/afinidade" className="hover:text-primary transition-smooth">
          Afinidade
        </Link>
        <FaChevronRight className="w-2.5 h-2.5" />
        <span className="text-foreground font-semibold">{party.sigla}</span>
      </div>

      {/* Header do Partido */}
      <div className="p-6 sm:p-8 rounded-2xl bg-card border border-border shadow-soft flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {party.logo_url && (
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white p-2 border border-border shrink-0 flex items-center justify-center shadow-soft">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={party.logo_url}
                alt={party.sigla}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              {isInactive ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-muted text-muted-foreground border border-border text-xs font-bold">
                  <FaInfoCircle className="w-3 h-3" />
                  Legenda Inativa / Histórica na Câmara
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold">
                  <FaCheckCircle className="w-3 h-3" />
                  Partido Ativo no Congresso Nacional
                </span>
              )}

              {party.numero_eleitoral && (
                <span className="px-2.5 py-0.5 rounded bg-muted text-foreground text-xs font-bold">
                  Nº {party.numero_eleitoral}
                </span>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              {party.nome}{" "}
              <span className="text-gradient">({party.sigla})</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Bancada com <strong>{deputies.length}</strong> deputados federais e{" "}
              <strong>{senators.length}</strong> senadores com mandatos ativos.
            </p>
          </div>
        </div>

        <div className="flex gap-3 shrink-0">
          <Button variant="outline" size="sm" href="/afinidade">
            Voltar à Afinidade
          </Button>
          <Button variant="hero" size="sm" href="/opiniao">
            Analisar Propostas
          </Button>
        </div>
      </div>

      {/* Alerta de Contexto para Partido Inativo */}
      {isInactive && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 dark:bg-amber-950/20 border border-amber-500/30 text-xs text-foreground space-y-1.5 shadow-soft">
          <div className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-2">
            <FaInfoCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Registro de Legenda Inativa / Extinta:</span>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Este partido consta como <strong>inativo</strong> na Câmara dos Deputados (tendo sido extinto, incorporado ou fundido a outra agremiação). As votações nominais e dados aqui apresentados refletem fielmente as deliberações registradas pelos parlamentares durante o período oficial de exercício da legenda.
          </p>
        </div>
      )}

      {/* 1. SEÇÃO DE PROPOSTAS E VOTOS DA BANCADA */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <FaVoteYea className="text-primary w-5 h-5" />
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">
            Posicionamentos dos Filiados nas Propostas ({projectsWithVotes.length})
          </h2>
        </div>

        {projectsWithVotes.length === 0 ? (
          <div className="p-6 rounded-xl bg-card border border-border text-center text-sm text-muted-foreground">
            Nenhuma votação nominal de filiados registrada para este partido nas propostas catalogadas.
          </div>
        ) : (
          <div className="space-y-3">
            {projectsWithVotes.map((proj) => {
              const simCount = proj.votes.filter((v) => v.vote_original.toUpperCase().includes("SIM")).length;
              const naoCount = proj.votes.filter((v) => v.vote_original.toUpperCase().includes("NÃO") || v.vote_original.toUpperCase().includes("NAO")).length;

              return (
                <details
                  key={proj.project_id}
                  className="group rounded-xl bg-card border border-border p-4 shadow-soft transition-smooth open:shadow-medium"
                >
                  <summary className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer list-none select-none font-semibold text-foreground">
                    <div className="flex items-center gap-3">
                      <span className="p-2 rounded-lg bg-primary/10 text-primary group-open:bg-primary group-open:text-white transition-smooth">
                        <FaFileAlt className="w-3.5 h-3.5" />
                      </span>
                      <div>
                        <span className="text-base font-bold">{proj.project_title}</span>
                        <span className="block text-xs font-normal text-muted-foreground">
                          {proj.house} • {proj.votes.length} voto(s) registrado(s)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-xs font-bold">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1">
                          <FaCheck className="w-2.5 h-2.5" /> {simCount} Sim
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/20 flex items-center gap-1">
                          <FaTimes className="w-2.5 h-2.5" /> {naoCount} Não
                        </span>
                      </div>

                      <span className="text-muted-foreground text-xs group-open:rotate-90 transition-transform duration-200">
                        ▶
                      </span>
                    </div>
                  </summary>

                  <div className="mt-4 pt-4 border-t border-border/70 space-y-3 text-sm text-muted-foreground leading-relaxed pl-2">
                    <p>{proj.project_description}</p>

                    <div className="pt-2">
                      <span className="text-xs font-bold text-foreground block mb-2">
                        Votos individuais dos parlamentares filiados:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {proj.votes.map((v, vIdx) => (
                          <div key={vIdx} className="p-2 rounded-lg bg-muted/40 border border-border/50 text-xs flex items-center justify-between">
                            <span className="truncate font-medium text-foreground">{v.politician_name}</span>
                            <span className={`font-bold ${v.vote_original.toUpperCase().includes("SIM") ? "text-emerald-600" : "text-rose-600"}`}>
                              {v.vote_original}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {proj.official_url && (
                      <div className="pt-2">
                        <a
                          href={proj.official_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-semibold"
                        >
                          <span>Ver proposta na íntegra no portal oficial</span>
                          <FaExternalLinkAlt className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </section>

      {/* 2. SEÇÃO DE PARLAMENTARES DO PARTIDO */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <FaUsers className="text-secondary w-5 h-5" />
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">
              Parlamentares Integrantes ({politicians.length})
            </h2>
          </div>

          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg text-xs">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1 rounded-md font-medium transition-smooth ${
                activeTab === "all"
                  ? "bg-background text-foreground shadow-soft"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Todos ({politicians.length})
            </button>
            <button
              onClick={() => setActiveTab("deputies")}
              className={`px-3 py-1 rounded-md font-medium transition-smooth ${
                activeTab === "deputies"
                  ? "bg-background text-foreground shadow-soft"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Deputados ({deputies.length})
            </button>
            <button
              onClick={() => setActiveTab("senators")}
              className={`px-3 py-1 rounded-md font-medium transition-smooth ${
                activeTab === "senators"
                  ? "bg-background text-foreground shadow-soft"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Senadores ({senators.length})
            </button>
          </div>
        </div>

        {displayedPoliticians.length === 0 ? (
          <div className="p-6 rounded-xl bg-card border border-border text-center text-sm text-muted-foreground">
            Nenhum parlamentar encontrado para esta categoria.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedPoliticians.map((pol) => {
              const isDeputy = (pol.type || pol.mandate_office || pol.source || "").toUpperCase().includes("DEPUT");

              return (
                <Link
                  key={pol.id}
                  href={`/politicos/${pol.id}`}
                  className="p-4 rounded-xl bg-card border border-border shadow-soft flex items-center gap-3.5 hover:border-primary/50 hover:shadow-medium transition-smooth group cursor-pointer"
                >
                  {pol.photo_url ? (
                    <img
                      src={pol.photo_url}
                      alt={pol.name}
                      className="w-12 h-12 rounded-full object-cover border border-border shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold shrink-0">
                      {pol.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground text-sm truncate group-hover:text-primary transition-smooth" title={pol.name}>
                      {pol.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span className="font-semibold text-primary">{pol.state}</span>
                      <span>•</span>
                      <span>{isDeputy ? "Dep. Federal" : "Senador"}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
