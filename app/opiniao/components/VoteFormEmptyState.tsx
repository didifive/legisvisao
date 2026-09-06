import { FaCheckCircle, FaSearch } from "react-icons/fa";
import { Button } from "@/app/components/ui/Button";
import type { VoteFormEmptyStateProps } from "../types";

export function VoteFormEmptyState({
  hasActiveFilters,
  opinionsCount,
  onResetFilters,
}: Readonly<VoteFormEmptyStateProps>) {
  return (
    <div className="p-8 sm:p-12 rounded-2xl bg-card border border-border text-center space-y-4 shadow-soft">
      <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-2">
        {hasActiveFilters ? (
          <FaSearch className="w-7 h-7" />
        ) : (
          <FaCheckCircle className="w-8 h-8 text-emerald-500" />
        )}
      </div>
      <h3 className="text-lg sm:text-xl font-extrabold text-foreground">
        {hasActiveFilters
          ? "Nenhuma proposta encontrada para os filtros selecionados."
          : "Você já expressou sua opinião sobre todas as propostas listadas!"}
      </h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        {hasActiveFilters
          ? "Experimente selecionar outros anos, situações ou limpar os filtros de busca para visualizar mais matérias."
          : "Você pode revisar suas opiniões registradas ou conferir o ranking de afinidade com os deputados e partidos."}
      </p>
      <div className="flex flex-wrap justify-center items-center gap-3 pt-2">
        {hasActiveFilters && (
          <Button variant="outline" onClick={onResetFilters} className="font-bold">
            Limpar Filtros
          </Button>
        )}
        {opinionsCount > 0 && (
          <Button variant="outline" href="/opiniao/revisao" className="font-semibold">
            Revisar Opiniões ({opinionsCount})
          </Button>
        )}
        <Button variant="hero" href="/afinidade">
          Ver Afinidade
        </Button>
      </div>
    </div>
  );
}
