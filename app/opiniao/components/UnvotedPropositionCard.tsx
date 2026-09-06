import Link from "next/link";
import {
  FaInfoCircle,
  FaChevronDown,
  FaRobot,
  FaFlag,
  FaExternalLinkAlt,
} from "react-icons/fa";
import { PropositionSecondarySessions } from "./PropositionSecondarySessions";
import { UnvotedCardHeader } from "./UnvotedCardHeader";
import { PrimaryDeliberationCard } from "./PrimaryDeliberationCard";
import {
  getUnvotedCardStatus,
  getUnvotedCardVoteMeta,
} from "../lib/voteFormUtils";
import type { UnvotedPropositionCardProps } from "../types";

export function UnvotedPropositionCard({
  proposition: p,
  granularAnswers,
  onVote,
  onRemoveVote,
  onSecondaryVote,
  onRemoveSecondaryVote,
  onOpenFeedback,
}: Readonly<UnvotedPropositionCardProps>) {
  const { situacaoAtual, isAprovado, isEncerrado } = getUnvotedCardStatus(p.ultimo_status);
  const lastVoteDate = p.vote_session_date
    ? new Date(p.vote_session_date).toLocaleDateString("pt-BR")
    : null;

  const temaTags = p.tema
    ? p.tema.split(/[•,]/).map((t) => t.trim()).filter(Boolean)
    : [];

  const {
    primaryVote,
    isConcordo,
    isDiscordo,
    quorum,
    hasNominalPrimaryVotes,
  } = getUnvotedCardVoteMeta(granularAnswers, p);

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border shadow-soft hover:shadow-medium transition-smooth space-y-4">
      {/* Header do Card */}
      <UnvotedCardHeader
        proposition={p}
        situacaoAtual={situacaoAtual}
        isAprovado={isAprovado}
        isEncerrado={isEncerrado}
        lastVoteDate={lastVoteDate}
        temaTags={temaTags}
      />

      {/* 1. Quadro de Análise Geral por Inteligência Artificial (Neutro & Factual) */}
      {p.resumo_geral ? (
        <>
          <div className="p-4 sm:p-5 rounded-2xl bg-primary/5 border border-primary/20 space-y-3.5 shadow-soft">
            <div className="flex items-center justify-between gap-2 border-b border-primary/15 pb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <FaRobot className="w-3.5 h-3.5 shrink-0" />
                <span>Análise e Resumo por IA</span>
              </span>
              <button
                type="button"
                onClick={() => onOpenFeedback(p)}
                title="Relatar inconsistência ou viés no resumo"
                className="text-[11px] text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 transition-smooth flex items-center gap-1 cursor-pointer font-medium"
              >
                <FaFlag className="w-2.5 h-2.5" />
                <span className="hidden sm:inline">Relatar problema</span>
              </button>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                Sobre o Projeto de Lei:
              </span>
              <p className="text-sm text-foreground leading-relaxed font-normal">
                {p.resumo_geral}
              </p>
            </div>
          </div>

          <details className="group pt-0.5">
            <summary className="text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer flex items-center gap-1.5 select-none list-none">
              <FaInfoCircle className="w-3.5 h-3.5 text-primary" />
              <span>Ver ementa oficial do projeto</span>
              <FaChevronDown className="w-2.5 h-2.5 group-open:rotate-180 transition-transform" />
            </summary>
            <div className="mt-2 p-3.5 sm:p-4 rounded-xl bg-muted/30 border border-border/60 text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground block mb-0.5">Ementa Oficial do Projeto:</strong>
              <p>{p.ementa_detalhada || p.ementa}</p>
            </div>
          </details>
        </>
      ) : (
        <div className="p-4 rounded-xl bg-muted/30 border border-border/60">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <FaInfoCircle className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>Ementa Oficial do Projeto:</span>
          </span>
          <p className="text-sm text-foreground leading-relaxed font-normal mt-1">
            {p.ementa_detalhada || p.ementa}
          </p>
        </div>
      )}

      {/* 2. Card de Deliberação do Mérito Principal */}
      {hasNominalPrimaryVotes ? (
        <PrimaryDeliberationCard
          proposition={p}
          primaryVote={primaryVote}
          isConcordo={isConcordo}
          isDiscordo={isDiscordo}
          onVote={onVote}
          onRemoveVote={onRemoveVote}
          onOpenFeedback={onOpenFeedback}
        />
      ) : (
        <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60 text-xs text-muted-foreground flex items-center gap-2">
          <FaInfoCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>Matéria com texto-base deliberado por votação simbólica no Plenário (sem votação nominal eletrônica no mérito).</span>
        </div>
      )}

      {/* 3. Outras Seções Votadas à Parte (Destaques, Emendas e Artigos Específicos) */}
      <PropositionSecondarySessions
        propositionId={p.id}
        primarySessionId={p.vote_session_id ? String(p.vote_session_id) : undefined}
        totalNominalSessions={p.total_nominal_sessions}
        onVote={(sessionId, opinion) => onSecondaryVote(p, sessionId, opinion)}
        onRemoveVote={onRemoveSecondaryVote}
        granularAnswers={granularAnswers}
      />

      {/* Footer do Card com Links Oficiais */}
      <div className="pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-3 text-xs">
        <Link
          href={`/projetos/${p.id}`}
          className="text-primary hover:underline font-bold inline-flex items-center gap-1"
        >
          <span>Ver histórico e detalhes da proposição</span>
          <FaExternalLinkAlt className="w-2.5 h-2.5" />
        </Link>

        <div className="flex items-center gap-3 text-muted-foreground">
          {quorum > 0 && (
            <span>Quórum total: <strong>{quorum}</strong> deputados</span>
          )}
          {p.url_inteiro_teor && (
            <a
              href={p.url_inteiro_teor}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-smooth inline-flex items-center gap-1 font-medium"
            >
              <span>Inteiro Teor</span>
              <FaExternalLinkAlt className="w-2.5 h-2.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
