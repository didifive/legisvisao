import {
  FaFilter,
  FaCalendarAlt,
  FaInfoCircle,
  FaTag,
} from "react-icons/fa";
import type { RevisaoFilterDrawerProps } from "../types";

export function RevisaoFilterDrawer({
  showDrawer,
  availableYears,
  selectedYears,
  availableStatus,
  selectedStatus,
  availableThemes,
  selectedThemes,
  onToggleDrawer,
  onToggleYear,
  onClearYears,
  onToggleStatus,
  onClearStatus,
  onToggleTheme,
  onClearThemes,
}: Readonly<RevisaoFilterDrawerProps>) {
  if (!showDrawer) return null;

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-soft space-y-4 animate-fade-in text-xs">
      <div className="flex items-center justify-between pb-2 border-b border-border/60">
        <span className="font-bold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5">
          <FaFilter className="w-3 h-3 text-primary" />
          <span>Filtros Detalhados</span>
        </span>
        <button
          type="button"
          onClick={onToggleDrawer}
          className="text-muted-foreground hover:text-foreground text-xs font-medium cursor-pointer"
        >
          Fechar filtros
        </button>
      </div>

      {/* Filtro de Anos */}
      {availableYears.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-muted-foreground uppercase tracking-wider text-[10px] flex items-center gap-1">
              <FaCalendarAlt className="w-3 h-3 text-primary" />
              <span>Ano de Apresentação</span>
            </span>
            {selectedYears.length > 0 && (
              <button
                type="button"
                onClick={onClearYears}
                className="text-[10px] text-primary hover:underline font-semibold cursor-pointer"
              >
                Limpar anos
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {availableYears.map((yr) => {
              const isSel = selectedYears.includes(yr);
              return (
                <button
                  key={yr}
                  type="button"
                  onClick={() => onToggleYear(yr)}
                  className={`px-2.5 py-1 rounded-lg border font-semibold transition-smooth cursor-pointer ${
                    isSel
                      ? "bg-primary text-white border-primary shadow-soft"
                      : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {yr}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Filtro de Situações / Status */}
      {availableStatus.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-border/40">
          <div className="flex items-center justify-between">
            <span className="font-bold text-muted-foreground uppercase tracking-wider text-[10px] flex items-center gap-1">
              <FaInfoCircle className="w-3 h-3 text-primary" />
              <span>Situação Atual da Proposição</span>
            </span>
            {selectedStatus.length > 0 && (
              <button
                type="button"
                onClick={onClearStatus}
                className="text-[10px] text-primary hover:underline font-semibold cursor-pointer"
              >
                Limpar situações
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {availableStatus.map((st) => {
              const isSel = selectedStatus.includes(st);
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => onToggleStatus(st)}
                  className={`px-2.5 py-1 rounded-lg border font-semibold transition-smooth cursor-pointer ${
                    isSel
                      ? "bg-primary text-white border-primary shadow-soft"
                      : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {st}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Filtro de Temas Oficiais */}
      {availableThemes.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-border/40">
          <div className="flex items-center justify-between">
            <span className="font-bold text-muted-foreground uppercase tracking-wider text-[10px] flex items-center gap-1">
              <FaTag className="w-3 h-3 text-primary" />
              <span>Temas & Áreas de Impacto</span>
            </span>
            {selectedThemes.length > 0 && (
              <button
                type="button"
                onClick={onClearThemes}
                className="text-[10px] text-primary hover:underline font-semibold cursor-pointer"
              >
                Limpar temas
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
            {availableThemes.map((th) => {
              const isSel = selectedThemes.includes(th);
              return (
                <button
                  key={th}
                  type="button"
                  onClick={() => onToggleTheme(th)}
                  className={`px-2.5 py-1 rounded-lg border font-semibold transition-smooth cursor-pointer ${
                    isSel
                      ? "bg-primary text-white border-primary shadow-soft"
                      : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {th}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
