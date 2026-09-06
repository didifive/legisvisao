import { PropositionSecondarySessions } from "@/app/opiniao/components/PropositionSecondarySessions";
import {
  getCardStatusBooleans,
  getCardPrimaryVoteMeta,
} from "../lib/revisaoUtils";
import { AnsweredCardHeader } from "./AnsweredCardHeader";
import { AnsweredCardAiSummary } from "./AnsweredCardAiSummary";
import { AnsweredCardPrimaryVote } from "./AnsweredCardPrimaryVote";
import type { AnsweredPropositionCardProps } from "../types";

export function AnsweredPropositionCard({
  proposition,
  answer,
  sessionId,
  validSessionIds,
  granularAnswers,
  onVoteChange,
  onRemoveOpinion,
  onSecondaryVote,
  onRemoveSecondaryVote,
  onOpenFeedback,
}: Readonly<AnsweredPropositionCardProps>) {
  const { situacaoAtual, isAprovado, isEncerrado } = getCardStatusBooleans(proposition.ultimo_status);

  const lastVoteDate = proposition.vote_session_date
    ? new Date(proposition.vote_session_date).toLocaleDateString("pt-BR")
    : null;

  const {
    isPrimaryNominal,
    hasPrimaryVote,
    primaryOpinion,
    isPrimaryConcordo,
    primaryTargetSessionId,
  } = getCardPrimaryVoteMeta(proposition, answer, validSessionIds, granularAnswers, sessionId);

  return (
    <div
      key={proposition.id}
      className="p-5 sm:p-6 rounded-2xl bg-card border border-border shadow-soft hover:shadow-medium transition-smooth space-y-4"
    >
      {/* Header do Card */}
      <AnsweredCardHeader
        proposition={proposition}
        situacaoAtual={situacaoAtual}
        isAprovado={isAprovado}
        isEncerrado={isEncerrado}
        isPrimaryNominal={isPrimaryNominal}
        lastVoteDate={lastVoteDate}
      />

      {/* 1. Quadro de Análise Geral por Inteligência Artificial */}
      <AnsweredCardAiSummary
        proposition={proposition}
        onOpenFeedback={onOpenFeedback}
      />

      {/* 2. Card de Deliberação do Mérito Principal */}
      <AnsweredCardPrimaryVote
        proposition={proposition}
        isPrimaryNominal={isPrimaryNominal}
        hasPrimaryVote={hasPrimaryVote}
        isPrimaryConcordo={isPrimaryConcordo}
        primaryOpinion={primaryOpinion}
        primaryTargetSessionId={primaryTargetSessionId}
        onVoteChange={onVoteChange}
        onRemoveOpinion={onRemoveOpinion}
        onOpenFeedback={onOpenFeedback}
      />

      {/* 3. Outras Seções Votadas à Parte */}
      <PropositionSecondarySessions
        propositionId={proposition.id}
        primarySessionId={proposition.vote_session_id ? String(proposition.vote_session_id) : undefined}
        totalNominalSessions={proposition.total_nominal_sessions}
        nominalSessionIds={proposition.nominal_session_ids}
        isReviewMode
        onVote={onSecondaryVote}
        onRemoveVote={onRemoveSecondaryVote}
        granularAnswers={granularAnswers}
      />
    </div>
  );
}
