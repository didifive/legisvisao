import { FaChartPie, FaCheck, FaTimes } from "react-icons/fa";
import type { RevisaoStatsBarProps } from "../types";

export function RevisaoStatsBar({
  totalAnswered,
  simCount,
  naoCount,
  simPct,
  naoPct,
}: Readonly<RevisaoStatsBarProps>) {
  if (totalAnswered === 0) return null;

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-soft space-y-3">
      <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
        <span className="flex items-center gap-1.5 uppercase tracking-wider">
          <FaChartPie className="w-3.5 h-3.5 text-primary" />
          <span>Distribuição das Suas Opiniões Registradas</span>
        </span>
        <span>{totalAnswered} opiniões no simulador</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FaCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
              CONCORDO
            </span>
          </div>
          <span className="text-lg font-black text-emerald-700 dark:text-emerald-300">
            {simCount} ({simPct}%)
          </span>
        </div>

        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FaTimes className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <span className="text-xs font-bold text-rose-700 dark:text-rose-300">
              DISCORDO
            </span>
          </div>
          <span className="text-lg font-black text-rose-700 dark:text-rose-300">
            {naoCount} ({naoPct}%)
          </span>
        </div>
      </div>

      <div className="w-full h-2.5 rounded-full overflow-hidden flex bg-muted shadow-inner">
        <div
          style={{ width: `${simPct}%` }}
          className="bg-emerald-500 h-full transition-all duration-500"
          title={`CONCORDO: ${simCount} (${simPct}%)`}
        />
        <div
          style={{ width: `${naoPct}%` }}
          className="bg-rose-500 h-full transition-all duration-500"
          title={`DISCORDO: ${naoCount} (${naoPct}%)`}
        />
      </div>
    </div>
  );
}
