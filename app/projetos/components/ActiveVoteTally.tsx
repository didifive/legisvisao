import type { ActiveVoteTallyProps } from "../types";

export function ActiveVoteTally({ stats }: Readonly<ActiveVoteTallyProps>) {
  return (
    <div className="space-y-3 pt-4 border-t border-border">
      <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
        <span>Placar Nominal dos Deputados Federais ({stats.total} votos)</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase block">
            SIM ({stats.simPct}%)
          </span>
          <span className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-300">
            {stats.sim}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
          <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase block">
            NÃO ({stats.naoPct}%)
          </span>
          <span className="text-xl sm:text-2xl font-black text-rose-700 dark:text-rose-300">
            {stats.nao}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-muted text-center border border-border">
          <span className="text-[10px] font-bold text-muted-foreground uppercase block">
            Outros ({stats.outrosPct}%)
          </span>
          <span className="text-xl sm:text-2xl font-black text-foreground">
            {stats.outros}
          </span>
        </div>
      </div>

      {stats.total > 0 && (
        <div className="w-full h-3 rounded-full overflow-hidden flex bg-muted shadow-inner">
          <div
            style={{ width: `${stats.simPct}%` }}
            className="bg-emerald-500 h-full transition-all duration-500"
            title={`SIM: ${stats.sim} (${stats.simPct}%)`}
          />
          <div
            style={{ width: `${stats.naoPct}%` }}
            className="bg-rose-500 h-full transition-all duration-500"
            title={`NÃO: ${stats.nao} (${stats.naoPct}%)`}
          />
          <div
            style={{ width: `${stats.outrosPct}%` }}
            className="bg-muted-foreground/30 h-full transition-all duration-500"
            title={`Outros: ${stats.outros} (${stats.outrosPct}%)`}
          />
        </div>
      )}
    </div>
  );
}
