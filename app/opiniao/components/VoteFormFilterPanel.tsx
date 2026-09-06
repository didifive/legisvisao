import Link from "next/link";
import {
  FaSearch,
  FaTimes,
  FaFilter,
  FaCalendarAlt,
  FaInfoCircle,
  FaTag,
  FaRandom,
} from "react-icons/fa";
import type { VoteFormFilterPanelProps, SortOption } from "../types";

export function VoteFormFilterPanel({
  search,
  sortBy,
  shuffle,
  limit,
  opinionsCount,
  activeFiltersCount,
  showFilterDrawer,
  availableYears,
  selectedYears,
  availableStatus,
  selectedStatus,
  availableThemes,
  selectedThemes,
  includeNonMerit,
  onSearchChange,
  onSortChange,
  onShuffleToggle,
  onLimitChange,
  onToggleDrawer,
  onToggleYear,
  onClearYears,
  onToggleStatus,
  onClearStatus,
  onToggleTheme,
  onClearThemes,
  onToggleIncludeNonMerit,
}: Readonly<VoteFormFilterPanelProps>) {
  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-soft space-y-4">
      {/* 1. Barra de Busca Principal */}
      <div className="relative flex items-center w-full">
        <FaSearch className="absolute left-3.5 text-muted-foreground w-4 h-4 pointer-events-none" />
        <input
          type="text"
          placeholder="Buscar proposta por tema, palavra-chave, sigla ou número (ex: PL 2630)..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-background border border-border rounded-xl pl-10 pr-10 py-2.5 text-sm sm:text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-smooth"
        />
        {search && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-3 p-1 rounded-md text-muted-foreground hover:text-foreground text-xs hover:bg-muted transition-smooth"
            title="Limpar busca"
          >
            <FaTimes className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 2. Barra de Controles Rápidos: Ordenação, Quantidade, Embaralhar e Botão de Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-border/60">
        <div className="flex flex-wrap items-center gap-2">
          {/* Ordenação */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Ordenar:</span>
            <select
              value={sortBy}
              disabled={shuffle}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 cursor-pointer"
            >
              <option value="relevance">Mais Relevantes (Quórum/Disputa)</option>
              <option value="recent">Mais Recentes</option>
              <option value="oldest">Mais Antigos</option>
            </select>
          </div>

          {/* Embaralhar */}
          <button
            type="button"
            onClick={() => onShuffleToggle(!shuffle)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-smooth cursor-pointer ${
              shuffle
                ? "bg-primary text-white border-primary shadow-soft"
                : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
            title="Embaralhar as propostas de forma aleatória"
          >
            <FaRandom className="w-3 h-3" />
            <span>Aleatório</span>
          </button>

          {/* Botão Gaveta de Filtros Avançados */}
          <button
            type="button"
            onClick={onToggleDrawer}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-smooth cursor-pointer ${
              showFilterDrawer || activeFiltersCount > 0
                ? "bg-primary/10 text-primary border-primary/30"
                : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <FaFilter className="w-3 h-3" />
            <span>Filtros</span>
            {activeFiltersCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {/* Quantidade por tela + Link Revisão */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Exibir:</span>
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="bg-background border border-border rounded-lg px-2 py-1.5 text-xs text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>

          {opinionsCount > 0 && (
            <Link
              href="/opiniao/revisao"
              className="text-xs font-bold text-primary hover:underline"
            >
              Minhas Opiniões ({opinionsCount})
            </Link>
          )}
        </div>
      </div>

      {/* 3. Gaveta Expansível de Filtros Avançados (Anos, Situações, Temas e Escopo) */}
      {showFilterDrawer && (
        <div className="p-4 sm:p-5 rounded-xl bg-muted/40 border border-border/80 space-y-4 animate-fade-in text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <span className="font-bold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <FaFilter className="w-3 h-3 text-primary" />
              <span>Filtros Detalhados</span>
            </span>
            <button
              type="button"
              onClick={onToggleDrawer}
              className="text-muted-foreground hover:text-foreground text-xs font-medium"
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
                    className="text-[10px] text-primary hover:underline font-semibold"
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
                    className="text-[10px] text-primary hover:underline font-semibold"
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
                    className="text-[10px] text-primary hover:underline font-semibold"
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

          {/* Opção de Escopo de Votação (Incluir matérias sem votação nominal de mérito) */}
          <div className="pt-2 border-t border-border/40 flex items-center gap-2">
            <input
              type="checkbox"
              id="includeNonMerit"
              checked={includeNonMerit}
              onChange={(e) => onToggleIncludeNonMerit(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary w-4 h-4 cursor-pointer"
            />
            <label htmlFor="includeNonMerit" className="text-muted-foreground cursor-pointer select-none">
              Incluir matérias com texto-base simbólico (apenas destaques/emendas votados à parte)
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
