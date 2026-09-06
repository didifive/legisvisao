import { FaLayerGroup, FaBolt, FaCheck, FaTimes } from "react-icons/fa";
import { getUserVoteBadgeClass } from "../lib/projectUtils";
import type { SessionsSelectorGridProps } from "../types";

export function SessionsSelectorGrid({
  sessions,
  activeSessionId,
  primarySessionId,
  granularAnswers,
  onSelectSession,
}: Readonly<SessionsSelectorGridProps>) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <FaLayerGroup className="w-3 h-3 text-primary" />
          <span>Selecione a deliberação para inspecionar os detalhes:</span>
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sessions.map((s) => {
          const isSelected = s.id === activeSessionId;
          const isMain = s.id === primarySessionId;
          const sDate = s.data_hora
            ? new Date(s.data_hora).toLocaleDateString("pt-BR")
            : "";
          const isNominal = s.votesCount > 0;
          const userVote = granularAnswers[s.id];

          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelectSession(s.id)}
              className={`p-3.5 sm:p-4 rounded-xl border text-left transition-smooth flex flex-col justify-between gap-2.5 cursor-pointer ${
                isSelected
                  ? "bg-primary/10 border-primary text-foreground shadow-soft ring-1 ring-primary/30"
                  : "bg-card border-border hover:border-border/80 text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center justify-between gap-1.5 w-full flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${s.classification.badgeClass}`}>
                    {s.classification.label}
                  </span>
                  {isMain && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <FaBolt className="w-2.5 h-2.5" />
                      <span>Principal</span>
                    </span>
                  )}
                </div>

                {userVote && (
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 border ${getUserVoteBadgeClass(
                      userVote
                    )}`}
                  >
                    {userVote === "CONCORDO" ? <FaCheck className="w-2.5 h-2.5" /> : <FaTimes className="w-2.5 h-2.5" />}
                    <span>Você opinou: {userVote}</span>
                  </span>
                )}
              </div>

              <div className="space-y-1.5 w-full">
                <h4 className="text-xs sm:text-sm font-bold text-foreground line-clamp-2 leading-snug">
                  {s.titulo_amigavel || s.descricao || "Deliberação em Plenário"}
                </h4>

                {s.resumo_simplificado && (
                  <p className="text-[11px] text-muted-foreground line-clamp-3 leading-relaxed">
                    {s.resumo_simplificado}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1.5 border-t border-border/40 w-full">
                <span>{sDate}</span>
                {isNominal ? (
                  <span><strong>{s.votesCount}</strong> votos nominais</span>
                ) : (
                  <span className="italic text-muted-foreground font-medium">Votação Simbólica</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
