import {
  FaLandmark,
  FaInfoCircle,
  FaCalendarAlt,
  FaRobot,
  FaFlag,
  FaExternalLinkAlt,
  FaFileAlt,
} from "react-icons/fa";
import { getHeaderStatusBadgeClass } from "../lib/projectUtils";
import { PrimarySessionOverview } from "./PrimarySessionOverview";
import type { ProjectOverviewProps } from "../types";

export function ProjectOverviewCard({
  proposition,
  situacaoAtual,
  isAprovado,
  isArquivado,
  presentationDate,
  hasAiOverview,
  primarySession,
  onOpenFeedback,
}: Readonly<ProjectOverviewProps>) {
  return (
    <div className="p-6 sm:p-8 rounded-2xl bg-card border border-border shadow-soft space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold">
            <FaLandmark className="w-3 h-3" />
            <span>Câmara dos Deputados</span>
          </span>

          {proposition.tema
            ?.split(/[•,]/)
            .map((t) => t.trim())
            .filter(Boolean)
            .map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 rounded-full bg-secondary/10 text-secondary border border-secondary/20 text-xs font-bold"
              >
                {tag}
              </span>
            ))}

          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getHeaderStatusBadgeClass(
              isAprovado,
              isArquivado
            )}`}
          >
            <FaInfoCircle className="w-3 h-3" />
            <span>{situacaoAtual}</span>
          </span>
        </div>

        {presentationDate && (
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <FaCalendarAlt className="w-3.5 h-3.5 text-primary" />
            <span>Apresentado em {presentationDate}</span>
          </span>
        )}
      </div>

      <div className="space-y-3">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
          {proposition.titulo}
        </h1>

        {hasAiOverview ? (
          <div className="p-4 sm:p-5 rounded-2xl bg-primary/5 border border-primary/20 space-y-3 shadow-soft">
            <div className="flex items-center justify-between gap-2 border-b border-primary/15 pb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <FaRobot className="w-3.5 h-3.5 shrink-0" />
                <span>Análise Geral e Síntese da Proposição (Inteligência Artificial)</span>
              </span>
              <button
                type="button"
                onClick={onOpenFeedback}
                title="Relatar inconsistência ou viés no resumo"
                className="text-[11px] text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 transition-smooth flex items-center gap-1 cursor-pointer shrink-0 font-medium"
              >
                <FaFlag className="w-2.5 h-2.5" />
                <span>Relatar problema</span>
              </button>
            </div>

            {proposition.resumo_geral && (
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Sobre o Projeto de Lei:
                </span>
                <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed font-normal">
                  {proposition.resumo_geral}
                </p>
              </div>
            )}

            <PrimarySessionOverview session={primarySession} />
          </div>
        ) : (
          <div className="space-y-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Ementa Oficial:
            </span>
            <p className="text-sm text-foreground leading-relaxed font-normal">
              {proposition.ementa_detalhada || proposition.ementa}
            </p>
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-border flex flex-wrap items-center justify-between gap-3 text-xs">
        <a
          href={`https://www.camara.leg.br/propostas-legislativas/${proposition.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-primary hover:underline font-bold"
        >
          <FaLandmark className="w-3.5 h-3.5" />
          <span>Ficha de Tramitação no Portal da Câmara</span>
          <FaExternalLinkAlt className="w-2.5 h-2.5" />
        </a>

        {proposition.url_inteiro_teor && (
          <a
            href={proposition.url_inteiro_teor}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-smooth font-medium"
          >
            <FaFileAlt className="w-3.5 h-3.5" />
            <span>Acessar Inteiro Teor (Documento Oficial)</span>
            <FaExternalLinkAlt className="w-2.5 h-2.5" />
          </a>
        )}
      </div>
    </div>
  );
}
