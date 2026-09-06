import Link from "next/link";
import {
  FaFileAlt,
  FaLandmark,
  FaInfoCircle,
  FaHistory,
  FaExternalLinkAlt,
} from "react-icons/fa";
import { getRevisaoStatusBadgeClass } from "../lib/revisaoUtils";
import type { AnsweredCardHeaderProps } from "../types";

export function AnsweredCardHeader({
  proposition,
  situacaoAtual,
  isAprovado,
  isEncerrado,
  isPrimaryNominal,
  lastVoteDate,
}: Readonly<AnsweredCardHeaderProps>) {
  const temaTags = proposition.tema
    ? proposition.tema.split(/[•,]/).map((t) => t.trim()).filter(Boolean)
    : [];

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <span className="p-2 rounded-lg bg-primary/10 text-primary">
          <FaFileAlt className="w-4 h-4" />
        </span>
        <div>
          <h3 className="font-extrabold text-foreground text-base sm:text-lg">
            {proposition.titulo}
          </h3>
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {temaTags.length > 0 ? (
              temaTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-muted/80 text-muted-foreground border border-border"
                >
                  {tag}
                </span>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">
                {proposition.sigla_tipo} nº {proposition.numero}/{proposition.ano}
              </span>
            )}
          </div>
          <div className="pt-1.5">
            <Link
              href={`/projetos/${proposition.id}`}
              className="text-xs text-primary hover:underline font-bold inline-flex items-center gap-1"
            >
              <span>Ver histórico e detalhes da proposição</span>
              <FaExternalLinkAlt className="w-2.5 h-2.5" />
            </Link>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold">
          <FaLandmark className="w-3 h-3" />
          <span>Câmara dos Deputados</span>
        </span>

        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border font-bold ${getRevisaoStatusBadgeClass(
            isAprovado,
            isEncerrado
          )}`}
        >
          <FaInfoCircle className="w-3 h-3" />
          <span>{situacaoAtual}</span>
        </span>

        {lastVoteDate && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-muted-foreground font-medium">
            <FaHistory className="w-3 h-3 text-primary" />
            <span>Deliberado em: {lastVoteDate}</span>
          </span>
        )}

        {!isPrimaryNominal && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold">
            <FaInfoCircle className="w-3 h-3" />
            <span>Deliberação Simbólica (Sem Mérito Nominal)</span>
          </span>
        )}
      </div>
    </div>
  );
}
