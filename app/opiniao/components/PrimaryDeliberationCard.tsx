import {
  FaVoteYea,
  FaCheck,
  FaTimes,
  FaRobot,
  FaFlag,
  FaQuestionCircle,
  FaTrashAlt,
} from "react-icons/fa";
import type { PropositionWithVoteSession } from "@/types/db";
import type { UserVote } from "@/lib/storage";

interface PrimaryDeliberationCardProps {
  readonly proposition: PropositionWithVoteSession;
  readonly primaryVote?: UserVote;
  readonly isConcordo: boolean;
  readonly isDiscordo: boolean;
  readonly onVote: (p: PropositionWithVoteSession, opinion: UserVote) => void;
  readonly onRemoveVote?: (p: PropositionWithVoteSession) => void;
  readonly onOpenFeedback: (p: PropositionWithVoteSession) => void;
}

export function PrimaryDeliberationCard({
  proposition: p,
  primaryVote,
  isConcordo,
  isDiscordo,
  onVote,
  onRemoveVote,
  onOpenFeedback,
}: Readonly<PrimaryDeliberationCardProps>) {
  const badgeClass = isConcordo
    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
    : "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30";

  const concordoButtonClass = isConcordo
    ? "bg-emerald-600 text-white"
    : "bg-background border border-border text-foreground hover:bg-emerald-600 hover:text-white";

  const discordoButtonClass = isDiscordo
    ? "bg-rose-600 text-white"
    : "bg-background border border-border text-foreground hover:bg-rose-600 hover:text-white";

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-soft space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <FaVoteYea className="w-3.5 h-3.5" />
          </span>
          <h4 className="text-xs sm:text-sm font-bold text-foreground">
            {p.titulo_amigavel || "Texto-Base / Mérito Principal"}
          </h4>
        </div>

        {primaryVote && (
          <span
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold flex items-center gap-1 border ${badgeClass}`}
          >
            {isConcordo ? <FaCheck className="w-2.5 h-2.5" /> : <FaTimes className="w-2.5 h-2.5" />}
            <span>Você opinou: {primaryVote}</span>
          </span>
        )}
      </div>

      {p.resumo_simplificado && (
        <>
          <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed font-normal">
            {p.resumo_simplificado}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground pt-0.5">
            <div className="flex items-center gap-1.5">
              <FaRobot className="w-3 h-3 text-primary shrink-0" />
              <span>Análise e Resumo por IA</span>
            </div>
            <button
              type="button"
              onClick={() => onOpenFeedback(p)}
              title="Relatar inconsistência ou viés no resumo desta deliberação"
              className="text-[11px] text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 transition-smooth flex items-center gap-1 cursor-pointer shrink-0 font-medium"
            >
              <FaFlag className="w-2.5 h-2.5" />
              <span>Relatar problema</span>
            </button>
          </div>
        </>
      )}

      {p.vote_session_description && (
        <div className="p-3 rounded-xl bg-muted/40 border border-border/60 text-xs text-muted-foreground leading-relaxed space-y-1">
          <span className="font-bold text-foreground text-[11px] uppercase tracking-wider block">
            Texto Oficial da Deliberação:
          </span>
          <p>{p.vote_session_description}</p>
        </div>
      )}

      {p.pergunta_cidadao && (
        <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs sm:text-sm font-semibold text-primary flex items-start gap-2">
          <FaQuestionCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{p.pergunta_cidadao}</span>
        </div>
      )}

      <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-border/40">
        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
          {primaryVote ? "Alterar sua opinião nesta deliberação:" : "Sua opinião nesta deliberação:"}
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onVote(p, "CONCORDO")}
            className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-smooth flex items-center gap-1.5 cursor-pointer shadow-soft ${concordoButtonClass}`}
          >
            <FaCheck className="w-3.5 h-3.5" />
            <span>CONCORDO</span>
          </button>

          <button
            type="button"
            onClick={() => onVote(p, "DISCORDO")}
            className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-smooth flex items-center gap-1.5 cursor-pointer shadow-soft ${discordoButtonClass}`}
          >
            <FaTimes className="w-3.5 h-3.5" />
            <span>DISCORDO</span>
          </button>

          {primaryVote && onRemoveVote && (
            <button
              type="button"
              onClick={() => onRemoveVote(p)}
              title="Excluir opinião nesta deliberação"
              className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/20 transition-smooth cursor-pointer ml-1"
            >
              <FaTrashAlt className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
