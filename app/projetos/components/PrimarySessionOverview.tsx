import { FaBolt, FaInfoCircle, FaQuestionCircle } from "react-icons/fa";
import type { PrimarySessionOverviewProps } from "../types";

export function PrimarySessionOverview({ session }: Readonly<PrimarySessionOverviewProps>) {
  if (session?.classification?.type === "MERITO" && (session.votesCount ?? 0) > 0) {
    return (
      <div className="pt-3 border-t border-primary/15 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <FaBolt className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              {session.titulo_amigavel || "Deliberação de Mérito Principal"}
            </span>
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
            Sessão Oficial: {session.id}
          </span>
        </div>

        {session.resumo_simplificado && (
          <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed font-normal">
            {session.resumo_simplificado}
          </p>
        )}

        {session.descricao && (
          <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60 text-xs text-muted-foreground leading-relaxed space-y-1">
            <span className="font-bold text-foreground text-[10px] uppercase tracking-wider block">
              Texto Oficial da Deliberação:
            </span>
            <p>{session.descricao}</p>
          </div>
        )}

        {session.pergunta_cidadao && (
          <div className="mt-2.5 p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs sm:text-sm font-semibold text-primary flex items-start gap-2">
            <FaQuestionCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{session.pergunta_cidadao}</span>
          </div>
        )}
      </div>
    );
  }

  if (!session || (session.votesCount ?? 0) === 0) {
    return (
      <div className="pt-3 border-t border-primary/15 space-y-1.5">
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-xs">
          <FaInfoCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Texto-Base Deliberado por Votação Simbólica</span>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          O texto principal desta matéria foi aprovado ou rejeitado por <strong>votação simbólica</strong> em Plenário (sem registro nominal individual de votos no painel eletrônico).
        </p>
      </div>
    );
  }

  return null;
}
