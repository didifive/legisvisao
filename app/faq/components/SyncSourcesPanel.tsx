"use client";

import {
  FaDatabase,
  FaExternalLinkAlt,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSyncAlt,
  FaClock,
} from "react-icons/fa";
import { SyncSourcesPanelProps } from "../types";
import { formatLocalDate } from "../lib/faqUtils";
import { SyncSourcesSkeleton } from "./SyncSourcesSkeleton";

function getStatusBadge(status: string) {
  if (status === "SUCCESS") {
    return {
      className:
        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
      icon: <FaCheckCircle className="w-3 h-3" />,
      text: "Sincronizado",
    };
  }
  if (status === "RUNNING") {
    return {
      className:
        "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 animate-pulse",
      icon: <FaSyncAlt className="w-3 h-3 animate-spin" />,
      text: "Sincronizando Dados...",
    };
  }
  if (status === "PENDING") {
    return {
      className:
        "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
      icon: <FaClock className="w-3 h-3" />,
      text: "Aguardando Ingestão",
    };
  }
  return {
    className: "bg-rose-500/10 text-rose-600 border border-rose-500/20",
    icon: <FaExclamationTriangle className="w-3 h-3" />,
    text: "Atenção",
  };
}

export function SyncSourcesPanel({ sources, loading, isClient }: SyncSourcesPanelProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <FaDatabase className="text-primary w-4 h-4" />
        <h2 className="text-xl font-bold text-foreground">
          Status das Fontes de Dados Oficiais
        </h2>
      </div>

      {loading ? (
        <SyncSourcesSkeleton />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sources.map((src) => {
            const badge = getStatusBadge(src.status);
            const formattedDate = isClient
              ? formatLocalDate(src.last_sync)
              : "Carregando horário local...";

            return (
              <div
                key={src.source}
                className="p-5 sm:p-6 rounded-xl bg-card border border-border shadow-soft flex flex-col justify-between space-y-4 hover:shadow-medium transition-smooth"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-muted text-foreground">
                      {src.source}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full ${badge.className}`}
                    >
                      {badge.icon}
                      <span>{badge.text}</span>
                    </span>
                  </div>

                  <h3 className="font-bold text-foreground text-base leading-snug">
                    {src.name}
                  </h3>
                </div>

                <div className="space-y-2.5 pt-2 border-t border-border/60 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Última sincronização:</span>
                    <span className="font-semibold text-foreground">
                      {formattedDate}
                    </span>
                  </div>

                  {typeof src.total_deputies === "number" && src.total_deputies > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Deputados Federais cadastrados:</span>
                      <span className="font-semibold text-foreground">
                        {src.total_deputies.toLocaleString("pt-BR")}
                      </span>
                    </div>
                  )}

                  {typeof src.total_propositions === "number" && src.total_propositions > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Proposições com votação:</span>
                      <span className="font-semibold text-foreground">
                        {src.total_propositions.toLocaleString("pt-BR")}
                      </span>
                    </div>
                  )}

                  {typeof src.total_votes === "number" && src.total_votes > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Votos nominais processados:</span>
                      <span className="font-semibold text-foreground">
                        {src.total_votes.toLocaleString("pt-BR")}
                      </span>
                    </div>
                  )}

                  <a
                    href={src.official_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline font-medium pt-1"
                  >
                    <span>Acessar portal de Dados Abertos</span>
                    <FaExternalLinkAlt className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
