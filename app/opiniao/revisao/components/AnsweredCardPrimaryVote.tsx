import {
  FaInfoCircle,
  FaVoteYea,
  FaCheck,
  FaTimes,
  FaQuestionCircle,
  FaTrashAlt,
  FaRobot,
  FaFlag,
} from "react-icons/fa";
import type { AnsweredCardPrimaryVoteProps } from "../types";

export function AnsweredCardPrimaryVote({
  proposition,
  isPrimaryNominal,
  hasPrimaryVote,
  isPrimaryConcordo,
  primaryOpinion,
  primaryTargetSessionId,
  onVoteChange,
  onRemoveOpinion,
  onOpenFeedback,
}: Readonly<AnsweredCardPrimaryVoteProps>) {
  if (!isPrimaryNominal) {
    return (
      <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60 text-xs text-muted-foreground flex items-center gap-2">
        <FaInfoCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <span>Matéria com texto-base deliberado por votação simbólica no Plenário (sem votação nominal eletrônica no mérito).</span>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-soft space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <FaVoteYea className="w-3.5 h-3.5" />
          </span>
          <h4 className="text-xs sm:text-sm font-bold text-foreground">
            {proposition.titulo_amigavel || "Texto-Base / Mérito Principal"}
          </h4>
        </div>

        {hasPrimaryVote && (
          <span
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold flex items-center gap-1 border ${
              isPrimaryConcordo
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                : "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30"
            }`}
          >
            {isPrimaryConcordo ? <FaCheck className="w-2.5 h-2.5" /> : <FaTimes className="w-2.5 h-2.5" />}
            <span>Você opinou: {primaryOpinion}</span>
          </span>
        )}
      </div>

      {proposition.resumo_simplificado && (
        <>
          <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed font-normal">
            {proposition.resumo_simplificado}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground pt-0.5">
            <div className="flex items-center gap-1.5">
              <FaRobot className="w-3 h-3 text-primary shrink-0" />
              <span>Análise e Resumo por IA</span>
            </div>
            <button
              type="button"
              onClick={() => onOpenFeedback(proposition)}
              title="Relatar inconsistência ou viés no resumo desta deliberação"
              className="text-[11px] text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 transition-smooth flex items-center gap-1 cursor-pointer shrink-0 font-medium"
            >
              <FaFlag className="w-2.5 h-2.5" />
              <span>Relatar problema</span>
            </button>
          </div>
        </>
      )}

      {proposition.vote_session_description && (
        <div className="p-3 rounded-xl bg-muted/40 border border-border/60 text-xs text-muted-foreground leading-relaxed space-y-1">
          <span className="font-bold text-foreground text-[11px] uppercase tracking-wider block">
            Texto Oficial da Deliberação:
          </span>
          <p>{proposition.vote_session_description}</p>
        </div>
      )}

      {proposition.pergunta_cidadao && (
        <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs sm:text-sm font-semibold text-primary flex items-start gap-2">
          <FaQuestionCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{proposition.pergunta_cidadao}</span>
        </div>
      )}

      <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-border/40">
        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
          {hasPrimaryVote ? "Alterar sua opinião nesta deliberação:" : "Sua opinião nesta deliberação:"}
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onVoteChange(primaryTargetSessionId, "CONCORDO")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-smooth cursor-pointer ${
              isPrimaryConcordo
                ? "bg-emerald-600 text-white shadow-soft"
                : "bg-background border border-border text-foreground hover:bg-emerald-600 hover:text-white"
            }`}
          >
            <FaCheck className="w-3 h-3" />
            <span>CONCORDO</span>
          </button>

          <button
            type="button"
            onClick={() => onVoteChange(primaryTargetSessionId, "DISCORDO")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-smooth cursor-pointer ${
              hasPrimaryVote && !isPrimaryConcordo
                ? "bg-rose-600 text-white shadow-soft"
                : "bg-background border border-border text-foreground hover:bg-rose-600 hover:text-white"
            }`}
          >
            <FaTimes className="w-3 h-3" />
            <span>DISCORDO</span>
          </button>

          {hasPrimaryVote && (
            <button
              type="button"
              onClick={() => onRemoveOpinion(primaryTargetSessionId, proposition.id)}
              title="Excluir opinião nesta deliberação"
              className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/20 transition-smooth cursor-pointer ml-1"
            >
              <FaTrashAlt className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
