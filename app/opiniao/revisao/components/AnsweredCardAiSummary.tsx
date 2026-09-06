import {
  FaRobot,
  FaFlag,
  FaInfoCircle,
  FaChevronDown,
} from "react-icons/fa";
import type { AnsweredCardAiSummaryProps } from "../types";

export function AnsweredCardAiSummary({
  proposition,
  onOpenFeedback,
}: Readonly<AnsweredCardAiSummaryProps>) {
  if (proposition.resumo_geral) {
    return (
      <>
        <div className="p-4 sm:p-5 rounded-2xl bg-primary/5 border border-primary/20 space-y-3.5 shadow-soft">
          <div className="flex items-center justify-between gap-2 border-b border-primary/15 pb-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <FaRobot className="w-3.5 h-3.5 shrink-0" />
              <span>Análise e Resumo por IA</span>
            </span>
            <button
              type="button"
              onClick={() => onOpenFeedback(proposition)}
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
              {proposition.resumo_geral}
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
            <p>{proposition.ementa_detalhada || proposition.ementa}</p>
          </div>
        </details>
      </>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-muted/30 border border-border/60">
      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <FaInfoCircle className="w-3.5 h-3.5 text-primary shrink-0" />
        <span>Ementa Oficial do Projeto:</span>
      </span>
      <p className="text-sm text-foreground leading-relaxed font-normal mt-1">
        {proposition.ementa_detalhada || proposition.ementa}
      </p>
    </div>
  );
}
