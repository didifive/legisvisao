"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  FaUserTie,
  FaLandmark,
  FaVoteYea,
  FaHistory,
  FaArrowLeft,
  FaExternalLinkAlt,
  FaEnvelope,
  FaMapMarkerAlt,
  FaSearch,
  FaTimes,
} from "react-icons/fa";
import { Button } from "@/app/components/ui/Button";
import {
  classifyVoteSession,
  sortVoteSessionsDeterministic,
} from "@/lib/match/classifyVoteSession";
import { PropositionVoteCard } from "../components/PropositionVoteCard";
import type { ClassifiedVote, PoliticianDetailsClientProps } from "../types";

export default function PoliticianDetailsClient({
  deputy,
  votes,
}: Readonly<PoliticianDetailsClientProps>) {
  const officialProfileUrl = `https://www.camara.leg.br/deputados/${deputy.id}`;
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(10);
  const PAGE_SIZE = 10;

  const groupedPropositions = useMemo(() => {
    const map = new Map<number, {
      proposicao_id: number;
      titulo: string;
      ementa: string;
      tema?: string | null;
      url_camara?: string | null;
      allVotes: ClassifiedVote[];
    }>();

    for (const v of votes) {
      const classification = classifyVoteSession(v.vote_description || "");
      const existing = map.get(v.proposicao_id);
      if (!existing) {
        map.set(v.proposicao_id, {
          proposicao_id: v.proposicao_id,
          titulo: v.titulo,
          ementa: v.ementa,
          tema: v.tema ?? null,
          url_camara: v.url_camara ?? null,
          allVotes: [{ ...v, classification }],
        });
      } else {
        existing.allVotes.push({ ...v, classification });
      }
    }

    return Array.from(map.values())
      .map((item) => {
        const sorted = sortVoteSessionsDeterministic(item.allVotes);

        return {
          proposicao_id: item.proposicao_id,
          titulo: item.titulo,
          ementa: item.ementa,
          tema: item.tema,
          url_camara: item.url_camara,
          primaryVote: sorted[0],
          otherVotes: sorted.slice(1),
        };
      })
      .sort((a, b) => {
        const timeA = a.primaryVote?.data_hora ? new Date(a.primaryVote.data_hora).getTime() : 0;
        const timeB = b.primaryVote?.data_hora ? new Date(b.primaryVote.data_hora).getTime() : 0;
        return timeB - timeA || b.proposicao_id - a.proposicao_id;
      });
  }, [votes]);

  const filteredPropositions = useMemo(() => {
    if (!searchQuery.trim()) return groupedPropositions;
    const q = searchQuery.toLowerCase().trim();
    return groupedPropositions.filter((item) => {
      const matchTitulo = (item.titulo || "").toLowerCase().includes(q);
      const matchEmenta = (item.ementa || "").toLowerCase().includes(q);
      const matchTema = (item.tema || "").toLowerCase().includes(q);
      return matchTitulo || matchEmenta || matchTema;
    });
  }, [groupedPropositions, searchQuery]);

  const displayedPropositions = useMemo(() => {
    return filteredPropositions.slice(0, visibleCount);
  }, [filteredPropositions, visibleCount]);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearchQuery(e.target.value);
    setVisibleCount(PAGE_SIZE);
  }

  function handleClearSearch() {
    setSearchQuery("");
    setVisibleCount(PAGE_SIZE);
  }

  function handleLoadMore() {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  }

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
      {/* Breadcrumb e Ação de Retorno */}
      <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
        <Link href="/afinidade" className="hover:text-primary transition-smooth flex items-center gap-1">
          <FaArrowLeft className="w-3 h-3" />
          <span>Afinidade</span>
        </Link>
        <span>/</span>
        <span className="text-foreground font-semibold">{deputy.nome_eleitoral || deputy.nome}</span>
      </div>

      {/* Header do Deputado */}
      <div className="p-6 sm:p-8 rounded-2xl bg-card border border-border shadow-soft flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Foto Oficial */}
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-muted border border-border shrink-0 flex items-center justify-center">
            {deputy.url_foto ? (
              <Image
                src={deputy.url_foto}
                alt={deputy.nome_eleitoral || deputy.nome}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <FaUserTie className="w-10 h-10 text-muted-foreground/50" />
            )}
          </div>

          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold">
              <FaLandmark className="w-3 h-3" />
              Deputado Federal (Câmara dos Deputados)
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              {deputy.nome_eleitoral || deputy.nome}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-muted-foreground">
              {deputy.sigla_partido && (
                <span className="font-semibold text-foreground bg-muted px-2.5 py-0.5 rounded">
                  {deputy.sigla_partido}
                </span>
              )}
              <span className="flex items-center gap-1">
                <FaMapMarkerAlt className="w-3 h-3 text-primary" />
                {deputy.sigla_uf}
              </span>
              {deputy.email && (
                <a
                  href={`mailto:${deputy.email}`}
                  className="flex items-center gap-1 hover:text-primary transition-smooth"
                >
                  <FaEnvelope className="w-3 h-3" />
                  <span>{deputy.email}</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Link Oficial da Câmara */}
        <Button
          variant="outline"
          size="sm"
          href={officialProfileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="gap-2 shrink-0 w-full sm:w-auto"
        >
          <FaExternalLinkAlt className="w-3 h-3 text-primary" />
          <span>Perfil na Câmara</span>
        </Button>
      </div>

      {/* Histórico Oficial de Votos Nominais */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <FaVoteYea className="text-primary w-5 h-5" />
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Votações Nominais Registradas
            </h2>
          </div>
          <span className="text-xs text-muted-foreground">
            {groupedPropositions.length} {groupedPropositions.length === 1 ? "proposição avaliada" : "proposições avaliadas"} ({votes.length} {votes.length === 1 ? "votação nominal" : "votações nominais"})
          </span>
        </div>

        {groupedPropositions.length === 0 ? (
          <div className="p-8 rounded-2xl bg-card border border-border text-center space-y-2">
            <FaHistory className="w-8 h-8 text-muted-foreground mx-auto" />
            <p className="text-sm font-semibold text-foreground">
              Nenhum voto nominal registrado para este parlamentar nas propostas catalogadas.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Barra de Busca Rápida */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-xl bg-card border border-border shadow-soft">
              <div className="relative flex-1">
                <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
                <input
                  type="text"
                  placeholder="Buscar por título (ex: PL 2630), ementa ou tema..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full pl-9 pr-8 py-2 rounded-lg bg-background border border-border text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-smooth"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded transition-smooth"
                    title="Limpar busca"
                  >
                    <FaTimes className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="text-xs text-muted-foreground shrink-0 font-medium">
                Exibindo <strong>{displayedPropositions.length}</strong> de <strong>{filteredPropositions.length}</strong> {filteredPropositions.length === 1 ? "proposta" : "propostas"}
              </div>
            </div>

            {/* Lista Filtrada de Proposições */}
            {filteredPropositions.length === 0 ? (
              <div className="p-8 rounded-xl bg-card border border-border text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Nenhuma proposição encontrada para o termo de busca &ldquo;{searchQuery}&rdquo;.
                </p>
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="text-xs text-primary hover:underline font-bold"
                >
                  Limpar busca
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {displayedPropositions.map((item) => (
                    <PropositionVoteCard key={item.proposicao_id} item={item} />
                  ))}
                </div>

                {/* Botão de Paginação Incremental */}
                {visibleCount < filteredPropositions.length && (
                  <div className="pt-2 text-center">
                    <Button
                      variant="outline"
                      size="default"
                      onClick={handleLoadMore}
                      className="w-full sm:w-auto font-bold shadow-soft"
                    >
                      Ver mais 10 propostas ({filteredPropositions.length - visibleCount} restantes)
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
