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
  FaCheck,
  FaTimes,
  FaExternalLinkAlt,
  FaEnvelope,
  FaMapMarkerAlt,
  FaQuestionCircle,
  FaBolt,
  FaChevronDown,
  FaChevronUp,
  FaLayerGroup,
  FaSearch,
} from "react-icons/fa";
import { Button } from "@/app/components/ui/Button";
import type { Deputy, DeputyVoteDetail } from "@/types/db";
import { normalizeVote } from "@/lib/match/normalizeVotes";

import {
  classifyVoteSession,
  sortVoteSessionsDeterministic,
  SessionClassification,
} from "@/lib/match/classifyVoteSession";

interface ClassifiedVote extends DeputyVoteDetail {
  classification: SessionClassification;
}

interface GroupedProposition {
  proposicao_id: number;
  titulo: string;
  ementa: string;
  tema?: string | null;
  url_camara?: string | null;
  primaryVote: ClassifiedVote;
  otherVotes: ClassifiedVote[];
}

interface PropositionVoteCardProps {
  item: GroupedProposition;
}

function PropositionVoteCard({ item }: PropositionVoteCardProps) {
  const [expanded, setExpanded] = useState(false);
  const primary = item.primaryVote;
  const normPrimary = normalizeVote(primary.voto_original);
  const isSimPrimary = normPrimary === "SIM";
  const isNaoPrimary = normPrimary === "NÃO";
  const dateFormatted = primary.data_hora
    ? new Date(primary.data_hora).toLocaleDateString("pt-BR")
    : null;

  const hasMultiple = item.otherVotes.length > 0;

  return (
    <div className="rounded-2xl bg-card border border-border shadow-soft overflow-hidden transition-smooth hover:border-border/80">
      {/* Header do Card com Informações da Proposição */}
      <div className="p-5 sm:p-6 border-b border-border/60 bg-muted/20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/projetos/${item.proposicao_id}`}
              className="text-base sm:text-lg font-extrabold text-foreground hover:text-primary transition-smooth flex items-center gap-1.5"
            >
              <span>{item.titulo}</span>
              <FaExternalLinkAlt className="w-2.5 h-2.5 text-muted-foreground" />
            </Link>

            {item.tema && (
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/50">
                {item.tema}
              </span>
            )}
          </div>

          {hasMultiple && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5">
              <FaLayerGroup className="w-3 h-3" />
              <span>{item.otherVotes.length + 1} deliberações nominais</span>
            </span>
          )}
        </div>

        <p className="text-xs sm:text-sm text-muted-foreground mt-2.5 line-clamp-2 leading-relaxed">
          {item.ementa}
        </p>
      </div>

      {/* Bloco 1: Votação Principal (Utilizada no Cálculo de Afinidade) */}
      <div className="p-5 sm:p-6 bg-card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              <FaBolt className="w-3 h-3" />
              <span>Votação Principal • Utilizada no Cálculo de Afinidade</span>
            </span>

            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${primary.classification.badgeClass}`}>
              {primary.classification.label}
            </span>

            <Link
              href="/faq#multiplas-votacoes"
              title="Clique para entender por que esta votação é utilizada no cálculo de afinidade"
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary transition-smooth text-xs"
            >
              <FaQuestionCircle className="w-3.5 h-3.5" />
              <span className="sr-only">Explicação sobre múltiplas votações</span>
            </Link>
          </div>

          {/* Voto Registrado na Votação Principal */}
          <div className="shrink-0">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs sm:text-sm font-black border ${
                isSimPrimary
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                  : isNaoPrimary
                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                  : "bg-muted text-foreground border-border"
              }`}
            >
              {isSimPrimary && <FaCheck className="w-3.5 h-3.5" />}
              {isNaoPrimary && <FaTimes className="w-3.5 h-3.5" />}
              <span>Votou: {primary.voto_original}</span>
            </span>
          </div>
        </div>

        {/* Detalhe descritivo da deliberação principal */}
        <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 text-xs sm:text-sm space-y-1.5">
          <p className="text-foreground font-medium leading-relaxed">
            {primary.vote_description || "Deliberação em Plenário"}
          </p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-0.5">
            {dateFormatted && (
              <span>Votado em: <strong>{dateFormatted}</strong></span>
            )}
            {primary.resultado && (
              <span>Resultado geral: <strong>{primary.resultado}</strong></span>
            )}
          </div>
        </div>
      </div>

      {/* Bloco 2: Outros Momentos de Deliberação (Destaques, Emendas, Requerimentos) */}
      {hasMultiple && (
        <div className="border-t border-border/60 bg-muted/10">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="w-full px-5 py-3 flex items-center justify-between text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-smooth"
          >
            <div className="flex items-center gap-2">
              <FaLayerGroup className="w-3.5 h-3.5 text-primary" />
              <span>
                {expanded
                  ? "Ocultar outros momentos de deliberação desta proposta"
                  : `Ver outros momentos de deliberação desta proposta (${item.otherVotes.length})`}
              </span>
            </div>
            {expanded ? <FaChevronUp className="w-3 h-3" /> : <FaChevronDown className="w-3 h-3" />}
          </button>

          {expanded && (
            <div className="px-5 pb-5 pt-1 space-y-3">
              {item.otherVotes.map((other, idx) => {
                const normOther = normalizeVote(other.voto_original);
                const isSimOther = normOther === "SIM";
                const isNaoOther = normOther === "NÃO";
                const otherDate = other.data_hora
                  ? new Date(other.data_hora).toLocaleDateString("pt-BR")
                  : null;

                return (
                  <div
                    key={other.vote_id || idx}
                    className="p-3.5 rounded-xl bg-card border border-border/80 text-xs space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${other.classification.badgeClass}`}>
                          {other.classification.label}
                        </span>
                        {otherDate && (
                          <span className="text-muted-foreground text-[11px]">
                            {otherDate}
                          </span>
                        )}
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold border ${
                          isSimOther
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                            : isNaoOther
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                            : "bg-muted text-foreground border-border"
                        }`}
                      >
                        {isSimOther && <FaCheck className="w-3 h-3" />}
                        {isNaoOther && <FaTimes className="w-3 h-3" />}
                        <span>Votou: {other.voto_original}</span>
                      </span>
                    </div>

                    <p className="text-muted-foreground leading-relaxed text-xs">
                      {other.vote_description || "Deliberação em Plenário"}
                    </p>

                    {other.resultado && (
                      <span className="text-[11px] text-muted-foreground block">
                        Resultado: <strong>{other.resultado}</strong>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface PoliticianDetailsClientProps {
  deputy: Deputy & { party_name?: string | null };
  votes: DeputyVoteDetail[];
}

export default function PoliticianDetailsClient({
  deputy,
  votes,
}: PoliticianDetailsClientProps) {
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
