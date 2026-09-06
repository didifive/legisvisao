import { FaSearch, FaTimes, FaFilter, FaChevronDown } from "react-icons/fa";
import { RevisaoFilterDrawer } from "./RevisaoFilterDrawer";

interface RevisaoSearchBarProps {
  readonly search: string;
  readonly onSearchChange: (val: string) => void;
  readonly showFilterDrawer: boolean;
  readonly onToggleFilterDrawer: () => void;
  readonly activeFiltersCount: number;
  readonly availableStatus: string[];
  readonly selectedStatus: string[];
  readonly onToggleStatus: (status: string) => void;
  readonly onResetAllFilters: () => void;
  readonly availableYears: number[];
  readonly selectedYears: number[];
  readonly onToggleYear: (year: number) => void;
  readonly onClearYears: () => void;
  readonly onClearStatus: () => void;
  readonly availableThemes: string[];
  readonly selectedThemes: string[];
  readonly onToggleTheme: (theme: string) => void;
  readonly onClearThemes: () => void;
}

export function RevisaoSearchBar({
  search,
  onSearchChange,
  showFilterDrawer,
  onToggleFilterDrawer,
  activeFiltersCount,
  availableStatus,
  selectedStatus,
  onToggleStatus,
  onResetAllFilters,
  availableYears,
  selectedYears,
  onToggleYear,
  onClearYears,
  onClearStatus,
  availableThemes,
  selectedThemes,
  onToggleTheme,
  onClearThemes,
}: Readonly<RevisaoSearchBarProps>) {
  const filterButtonClass =
    activeFiltersCount > 0
      ? "bg-primary text-primary-foreground border-primary shadow-soft"
      : "bg-muted text-muted-foreground border-border hover:text-foreground";

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-soft space-y-4">
      {/* 1. Busca ampla */}
      <div className="relative flex items-center w-full">
        <FaSearch className="absolute left-3.5 text-muted-foreground w-4 h-4 pointer-events-none" />
        <input
          type="text"
          placeholder="Buscar em minhas respostas por tema, palavra-chave, sigla ou número..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-background border border-border text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-smooth"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute right-3 text-muted-foreground hover:text-foreground text-xs p-1 cursor-pointer"
          >
            <FaTimes className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 2. Filtros Rápidos (Chips) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-border/40">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onToggleFilterDrawer}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-smooth cursor-pointer ${filterButtonClass}`}
          >
            <FaFilter className="w-3 h-3" />
            <span>Filtros Avançados</span>
            {activeFiltersCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-background text-foreground text-[10px] flex items-center justify-center font-black">
                {activeFiltersCount}
              </span>
            )}
            <FaChevronDown
              className={`w-2.5 h-2.5 transition-transform ${showFilterDrawer ? "rotate-180" : ""}`}
            />
          </button>

          {/* Filtro Rápido por Situação/Status */}
          <div className="hidden sm:flex items-center gap-1.5 pl-2 border-l border-border/60">
            <span className="text-[11px] font-semibold text-muted-foreground">Status:</span>
            {availableStatus.slice(0, 3).map((st) => {
              const isSel = selectedStatus.includes(st);
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => onToggleStatus(st)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-smooth cursor-pointer ${
                    isSel
                      ? "bg-primary/15 text-primary border-primary/40 font-bold"
                      : "bg-background text-muted-foreground border-border hover:text-foreground"
                  }`}
                >
                  {st}
                </button>
              );
            })}
          </div>
        </div>

        {activeFiltersCount > 0 && (
          <button
            type="button"
            onClick={onResetAllFilters}
            className="text-xs text-muted-foreground hover:text-destructive transition-smooth font-semibold flex items-center gap-1 cursor-pointer"
          >
            <FaTimes className="w-3 h-3" />
            <span>Limpar Filtros</span>
          </button>
        )}
      </div>

      {/* Gaveta de Filtros Expandida */}
      <RevisaoFilterDrawer
        showDrawer={showFilterDrawer}
        availableYears={availableYears}
        selectedYears={selectedYears}
        availableStatus={availableStatus}
        selectedStatus={selectedStatus}
        availableThemes={availableThemes}
        selectedThemes={selectedThemes}
        onToggleDrawer={onToggleFilterDrawer}
        onToggleYear={onToggleYear}
        onClearYears={onClearYears}
        onToggleStatus={onToggleStatus}
        onClearStatus={onClearStatus}
        onToggleTheme={onToggleTheme}
        onClearThemes={onClearThemes}
      />
    </div>
  );
}
