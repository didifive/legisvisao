import Link from "next/link";
import { FaSearch, FaUserTie } from "react-icons/fa";
import { normalizeVote } from "@/lib/match/normalizeVotes";
import { getVoteBadgeClass } from "../lib/projectUtils";
import type { DeputyVotesListProps } from "../types";

export function DeputyVotesList({
  filteredVotes,
  totalVotes,
  voteSearch,
  filterParty,
  filterState,
  filterVoteType,
  availableParties,
  availableStates,
  simCount,
  naoCount,
  outrosCount,
  onSearchChange,
  onPartyChange,
  onStateChange,
  onVoteTypeChange,
  onResetFilters,
}: Readonly<DeputyVotesListProps>) {
  const hasActiveFilters = Boolean(
    voteSearch || filterParty !== "ALL" || filterState !== "ALL" || filterVoteType !== "ALL"
  );

  return (
    <div className="space-y-4 pt-4 border-t border-border animate-fade-in">
      {/* Barra de Filtros e Busca */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
        {/* Busca por Nome */}
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
          <input
            type="text"
            placeholder="Buscar parlamentar..."
            value={voteSearch}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-smooth"
          />
        </div>

        {/* Filtro de Partido */}
        <div>
          <select
            value={filterParty}
            onChange={(e) => onPartyChange(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-smooth cursor-pointer"
          >
            <option value="ALL">Todos os Partidos ({availableParties.length})</option>
            {availableParties.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro de Estado */}
        <div>
          <select
            value={filterState}
            onChange={(e) => onStateChange(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-smooth cursor-pointer"
          >
            <option value="ALL">Todos os Estados ({availableStates.length})</option>
            {availableStates.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro por Tipo de Voto */}
        <div>
          <select
            value={filterVoteType}
            onChange={(e) => onVoteTypeChange(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-smooth cursor-pointer"
          >
            <option value="ALL">Todos os Votos</option>
            <option value="SIM">Apenas SIM ({simCount})</option>
            <option value="NAO">Apenas NÃO ({naoCount})</option>
            <option value="OUTROS">Outros / Abstenção ({outrosCount})</option>
          </select>
        </div>
      </div>

      {/* Contador de Registros Filtrados */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
        <span>
          Exibindo <strong>{filteredVotes.length}</strong> de <strong>{totalVotes}</strong> deputados votantes
        </span>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="text-primary hover:underline font-bold cursor-pointer"
          >
            Limpar Filtros
          </button>
        )}
      </div>

      {/* Lista com Virtualização / Grid Responsivo */}
      {filteredVotes.length === 0 ? (
        <div className="p-8 rounded-xl bg-muted/20 text-center space-y-2 border border-border/60">
          <p className="text-sm text-muted-foreground">
            Nenhum voto de parlamentar encontrado com os filtros selecionados.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[420px] overflow-y-auto pr-1">
          {filteredVotes.map((v) => {
            const norm = normalizeVote(v.voto_original);
            const isSim = norm === "SIM";
            const isNao = norm === "NÃO";

            return (
              <div
                key={v.id}
                className="p-2.5 rounded-xl bg-background border border-border/80 flex items-center justify-between gap-2 shadow-soft hover:border-border transition-smooth"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {v.deputado_foto ? (
                    <img
                      src={v.deputado_foto}
                      alt={v.deputado_nome}
                      className="w-8 h-8 rounded-full object-cover shrink-0 border border-border/60 bg-muted"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 border border-border/60 text-muted-foreground">
                      <FaUserTie className="w-4 h-4" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <Link
                      href={`/politicos/${v.deputado_id}`}
                      className="text-xs font-bold text-foreground hover:text-primary transition-smooth truncate block"
                      title={v.deputado_nome}
                    >
                      {v.deputado_nome}
                    </Link>
                    <span className="text-[11px] text-muted-foreground">
                      {v.sigla_partido} • {v.deputado_uf}
                    </span>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-0.5 rounded-lg text-[11px] font-black shrink-0 ${getVoteBadgeClass(
                    isSim,
                    isNao
                  )}`}
                >
                  {v.voto_original}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
