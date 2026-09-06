"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FaVoteYea,
  FaCheck,
  FaTimes,
  FaExternalLinkAlt,
  FaQuestionCircle,
  FaBolt,
  FaChevronDown,
  FaChevronUp,
  FaLayerGroup,
} from "react-icons/fa";
import { normalizeVote } from "@/lib/match/normalizeVotes";
import type { PropositionVoteCardProps } from "../types";

function getVoteBadgeClass(isSim: boolean, isNao: boolean): string {
  if (isSim) {
    return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
  }
  if (isNao) {
    return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30";
  }
  return "bg-muted text-foreground border-border";
}

export function PropositionVoteCard({ item }: Readonly<PropositionVoteCardProps>) {
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

            {item.tema
              ?.split(/[•,]/)
              .map((t) => t.trim())
              .filter(Boolean)
              .map((tag) => (
                <span
                  key={tag}
                  className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/50"
                >
                  {tag}
                </span>
              ))}
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
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs sm:text-sm font-black border ${getVoteBadgeClass(
                isSimPrimary,
                isNaoPrimary
              )}`}
            >
              {isSimPrimary && <FaCheck className="w-3.5 h-3.5" />}
              {isNaoPrimary && <FaTimes className="w-3.5 h-3.5" />}
              <span>Voto do parlamentar: {primary.voto_original}</span>
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
            className="w-full px-5 py-3 flex items-center justify-between text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-smooth cursor-pointer"
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
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold border ${getVoteBadgeClass(
                          isSimOther,
                          isNaoOther
                        )}`}
                      >
                        {isSimOther && <FaCheck className="w-3 h-3" />}
                        {isNaoOther && <FaTimes className="w-3 h-3" />}
                        <span>Voto do parlamentar: {other.voto_original}</span>
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
