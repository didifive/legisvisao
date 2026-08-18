"use client";

import Link from "next/link";
import {
  FaChevronRight,
  FaUsers,
  FaVoteYea,
  FaExternalLinkAlt,
  FaLandmark,
  FaUserTie,
  FaMapMarkerAlt,
} from "react-icons/fa";
import type { Party, Deputy } from "@/types/db";

interface Props {
  party: Party;
  deputies: Deputy[];
  deputyVotes: Array<{
    vote_id: number;
    deputado_id: number;
    sigla_partido: string;
    voto_original: string;
    deputado_nome: string;
    vote_session_id: string;
    session_date: string;
    proposicao_id: number;
    proposicao_titulo: string;
    proposicao_ementa: string;
    url_camara: string | null;
  }>;
}

export default function PartyDetailsClient({
  party,
  deputies,
  deputyVotes = [],
}: Props) {
  // Agrupar votos nominais por proposição
  const propMap = new Map<number, {
    proposicao_id: number;
    proposicao_titulo: string;
    proposicao_ementa: string;
    url_camara: string | null;
    votes: Array<{ deputado_nome: string; voto_original: string }>;
  }>();

  for (const pv of deputyVotes) {
    if (!propMap.has(pv.proposicao_id)) {
      propMap.set(pv.proposicao_id, {
        proposicao_id: pv.proposicao_id,
        proposicao_titulo: pv.proposicao_titulo ?? "Sem título",
        proposicao_ementa: pv.proposicao_ementa,
        url_camara: pv.url_camara,
        votes: [],
      });
    }
    propMap.get(pv.proposicao_id)!.votes.push({
      deputado_nome: pv.deputado_nome,
      voto_original: pv.voto_original,
    });
  }

  const propositionsWithVotes = Array.from(propMap.values());

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
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold">
              <FaLandmark className="w-3 h-3" />
              <span>Partido Político na Câmara</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5 flex-wrap">
              <span>{party.nome}</span>
              <span className="text-sm font-bold text-muted-foreground bg-muted px-2.5 py-0.5 rounded">
                {party.sigla}
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Bancada com <strong>{deputies.length}</strong> {deputies.length === 1 ? "deputado federal em exercício" : "deputados federais em exercício"}.
            </p>
          </div>
        </div>
      </div>

      {/* Lista de Deputados Federais */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <FaUsers className="text-primary w-5 h-5" />
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Deputados Federais da Bancada ({deputies.length})
            </h2>
          </div>
        </div>

        {deputies.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nenhum deputado federal cadastrado para esta legenda.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {deputies.map((d) => (
              <Link
                key={d.id}
                href={`/politicos/${d.id}`}
                className="p-3.5 rounded-xl bg-card border border-border shadow-soft hover:border-primary/50 transition-smooth flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
                    <FaUserTie className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-xs sm:text-sm text-foreground truncate group-hover:text-primary transition-smooth">
                      {d.nome_eleitoral || d.nome}
                    </h4>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <FaMapMarkerAlt className="w-2.5 h-2.5 text-primary" />
                      <span>{d.sigla_uf}</span>
                    </span>
                  </div>
                </div>
                <FaChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-smooth shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Histórico de Votos das Proposições */}
      {propositionsWithVotes.length > 0 && (
        <section className="space-y-4 pt-6">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <FaVoteYea className="text-primary w-5 h-5" />
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Posicionamentos Registrados nas Propostas de Lei
            </h2>
          </div>

          <div className="space-y-4">
            {propositionsWithVotes.map((p) => (
              <div
                key={p.proposicao_id}
                className="p-5 sm:p-6 rounded-2xl bg-card border border-border shadow-soft space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <Link
                    href={`/projetos/${p.proposicao_id}`}
                    className="text-base font-bold text-foreground hover:text-primary transition-smooth flex items-center gap-1.5"
                  >
                    <span>{p.proposicao_titulo}</span>
                    <FaExternalLinkAlt className="w-2.5 h-2.5 text-muted-foreground" />
                  </Link>
                </div>

                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {p.proposicao_ementa}
                </p>

                {/* Votos dos deputados nesta proposta */}
                <div className="pt-2 border-t border-border/50 flex flex-wrap gap-2">
                  {p.votes.map((v, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md bg-muted text-foreground"
                    >
                      <strong className="font-semibold">{v.deputado_nome}:</strong>
                      <span className="font-bold text-primary">{v.voto_original}</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
