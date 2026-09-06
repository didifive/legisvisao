import Link from "next/link";
import {
  FaFileAlt,
  FaLandmark,
  FaInfoCircle,
  FaCalendarAlt,
  FaExternalLinkAlt,
} from "react-icons/fa";
import { getSituacaoBadgeClass } from "../lib/voteFormUtils";
import type { PropositionWithVoteSession } from "@/types/db";

interface UnvotedCardHeaderProps {
  readonly proposition: PropositionWithVoteSession;
  readonly situacaoAtual: string;
  readonly isAprovado: boolean;
  readonly isEncerrado: boolean;
  readonly lastVoteDate: string | null;
  readonly temaTags: string[];
}

export function UnvotedCardHeader({
  proposition: p,
  situacaoAtual,
  isAprovado,
  isEncerrado,
  lastVoteDate,
  temaTags,
}: Readonly<UnvotedCardHeaderProps>) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <span className="p-2 rounded-lg bg-primary/10 text-primary">
          <FaFileAlt className="w-4 h-4" />
        </span>
        <div>
          <h3 className="font-extrabold text-foreground text-base sm:text-lg">
            {p.titulo}
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
                {p.sigla_tipo} nº {p.numero}/{p.ano}
              </span>
            )}
          </div>
          <div className="pt-1.5">
            <Link
              href={`/projetos/${p.id}`}
              className="text-xs text-primary hover:underline font-bold inline-flex items-center gap-1"
            >
              <span>Ver histórico e detalhes da proposição</span>
              <FaExternalLinkAlt className="w-2.5 h-2.5" />
            </Link>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        {/* Badge de Casa Legislativa */}
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold">
          <FaLandmark className="w-3 h-3" />
          <span>Câmara dos Deputados</span>
        </span>

        {/* Badge de Situação */}
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border font-bold ${getSituacaoBadgeClass(
            isAprovado,
            isEncerrado
          )}`}
        >
          <FaInfoCircle className="w-3 h-3" />
          <span>{situacaoAtual}</span>
        </span>

        {/* Data de Votação */}
        {lastVoteDate && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-muted-foreground font-medium">
            <FaCalendarAlt className="w-3 h-3 text-primary" />
            <span>{lastVoteDate}</span>
          </span>
        )}
      </div>
    </div>
  );
}
