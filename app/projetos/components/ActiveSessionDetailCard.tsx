import Link from "next/link";
import {
  FaBolt,
  FaQuestionCircle,
  FaRobot,
  FaFlag,
  FaInfoCircle,
  FaChevronDown,
  FaChevronUp,
  FaCheck,
  FaTimes,
  FaUserTie,
  FaLayerGroup,
  FaTrashAlt,
} from "react-icons/fa";
import {
  getSessionResultadoBadgeClass,
  getUserVoteBadgeClass,
  getVoteButtonClass,
} from "../lib/projectUtils";
import { ActiveVoteTally } from "./ActiveVoteTally";
import { DeputyVotesList } from "./DeputyVotesList";
import type { ActiveSessionDetailCardProps } from "../types";

export function ActiveSessionDetailCard({
  activeSession,
  isPrimaryActive,
  activeDateFormatted,
  granularAnswers,
  activeVoteStats,
  showVotesList,
  filteredVotes,
  activeSessionVotes,
  voteSearch,
  filterParty,
  filterState,
  filterVoteType,
  availableParties,
  availableStates,
  onToggleShowVotesList,
  onSessionVote,
  onRemoveSessionVote,
  onOpenFeedback,
  onSearchChange,
  onPartyChange,
  onStateChange,
  onVoteTypeChange,
  onResetFilters,
}: Readonly<ActiveSessionDetailCardProps>) {
  return (
    <div className="p-6 rounded-2xl bg-card border border-border shadow-soft space-y-6">
      {/* Header da Deliberação Selecionada */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {isPrimaryActive ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                <FaBolt className="w-3.5 h-3.5" />
                <span>Votação Principal • Utilizada no Cálculo de Afinidade</span>
              </span>
            ) : (
              <span className={`text-xs font-bold px-3 py-1 rounded-lg border ${activeSession.classification.badgeClass}`}>
                {activeSession.classification.label}
              </span>
            )}

            {activeSession.votesCount === 0 && (
              <span className="text-[11px] font-semibold text-muted-foreground px-2.5 py-1 rounded-lg bg-muted border border-border">
                Votação Simbólica
              </span>
            )}

            <Link
              href="/faq#multiplas-votacoes"
              title="Entenda por que a votação principal é a utilizada no cálculo"
              className="text-muted-foreground hover:text-primary transition-smooth text-xs flex items-center gap-1"
            >
              <FaQuestionCircle className="w-3.5 h-3.5" />
              <span className="sr-only">Como funciona</span>
            </Link>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {activeDateFormatted && (
              <span>Votado em: <strong>{activeDateFormatted}</strong></span>
            )}
            {activeSession.resultado && (
              <span className={`px-2.5 py-0.5 rounded-full font-bold border ${getSessionResultadoBadgeClass(
                activeSession.resultado
              )}`}>
                Resultado: {activeSession.resultado}
              </span>
            )}
          </div>
        </div>

        {/* Apresentação Amigável com Nota de IA e Expansão do Original */}
        {activeSession.resumo_simplificado ? (
          <div className="p-4 sm:p-5 rounded-2xl bg-primary/5 border border-primary/20 space-y-3 shadow-soft">
            <div className="space-y-1.5">
              <h4 className="text-base sm:text-lg font-extrabold text-foreground">
                {activeSession.titulo_amigavel || activeSession.descricao}
              </h4>
              <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed font-normal">
                {activeSession.resumo_simplificado}
              </p>

              {activeSession.pergunta_cidadao && (
                <div className="mt-2 p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-xs sm:text-sm font-semibold text-primary flex items-start gap-2">
                  <FaQuestionCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{activeSession.pergunta_cidadao}</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground pt-1">
              <div className="flex items-center gap-1.5">
                <FaRobot className="w-3 h-3 text-primary shrink-0" />
                <span>Resumo simplificado gerado por Inteligência Artificial a partir dos registros oficiais da Câmara.</span>
              </div>
              <button
                type="button"
                onClick={() => onOpenFeedback(activeSession)}
                title="Relatar inconsistência ou viés no resumo desta deliberação"
                className="text-[11px] text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 transition-smooth flex items-center gap-1 cursor-pointer shrink-0 font-medium"
              >
                <FaFlag className="w-2.5 h-2.5" />
                <span>Relatar problema</span>
              </button>
            </div>

            {/* Detalhes para expandir a descrição original */}
            <details className="group pt-2 border-t border-border/40">
              <summary className="text-xs font-bold text-primary cursor-pointer hover:underline flex items-center gap-1.5 select-none list-none">
                <FaInfoCircle className="w-3.5 h-3.5" />
                <span>Ver descrição técnica oficial da Câmara</span>
                <FaChevronDown className="w-2.5 h-2.5 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="mt-2.5 p-3 rounded-xl bg-background border border-border text-xs text-muted-foreground leading-relaxed">
                {activeSession.descricao}
              </div>
            </details>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground leading-relaxed pt-1">
            <strong>Descrição Oficial da Câmara:</strong> {activeSession.descricao}
          </p>
        )}
      </div>

      {/* Posicionamento do Cidadão nesta Deliberação */}
      {activeSession.votesCount > 0 ? (
        <div className="p-4 sm:p-5 rounded-2xl bg-muted/30 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
              Sua Opinião nesta Deliberação:
            </span>
            <div className="flex items-center gap-2">
              {granularAnswers[activeSession.id] ? (
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs sm:text-sm font-extrabold border ${getUserVoteBadgeClass(
                    granularAnswers[activeSession.id]
                  )}`}
                >
                  {granularAnswers[activeSession.id] === "CONCORDO" ? (
                    <FaCheck className="w-3.5 h-3.5" />
                  ) : (
                    <FaTimes className="w-3.5 h-3.5" />
                  )}
                  <span>Você opinou: {granularAnswers[activeSession.id]}</span>
                </span>
              ) : (
                <span className="text-xs text-muted-foreground italic">
                  Você ainda não opinou sobre esta deliberação no simulador.
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSessionVote(activeSession.id, "CONCORDO")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-smooth cursor-pointer shadow-soft ${getVoteButtonClass(
                granularAnswers[activeSession.id],
                "CONCORDO"
              )}`}
            >
              <FaCheck className="w-3.5 h-3.5" />
              <span>CONCORDO</span>
            </button>

            <button
              type="button"
              onClick={() => onSessionVote(activeSession.id, "DISCORDO")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-smooth cursor-pointer shadow-soft ${getVoteButtonClass(
                granularAnswers[activeSession.id],
                "DISCORDO"
              )}`}
            >
              <FaTimes className="w-3.5 h-3.5" />
              <span>DISCORDO</span>
            </button>

            {granularAnswers[activeSession.id] && onRemoveSessionVote && (
              <button
                type="button"
                onClick={() => onRemoveSessionVote(activeSession.id)}
                title="Excluir opinião nesta deliberação"
                className="p-2.5 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/20 transition-smooth cursor-pointer ml-1"
              >
                <FaTrashAlt className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-muted/20 border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FaInfoCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              <strong>Votação de Opinião Desativada para esta Deliberação</strong>: Esta matéria foi deliberada por <em>votação simbólica</em> no Plenário e não possui votação nominal de deputados para comparar no simulador.
            </span>
          </div>
        </div>
      )}

      {/* Se a sessão tiver votos nominais, exibe o Placar e a Lista de Deputados */}
      {activeSession.votesCount > 0 ? (
        <>
          <ActiveVoteTally stats={activeVoteStats} />

          {/* Botão para Expandir Lista Nominal de Deputados */}
          <div className="pt-2">
            <button
              type="button"
              onClick={onToggleShowVotesList}
              className="w-full py-3 px-4 rounded-xl bg-muted/50 hover:bg-muted border border-border font-bold text-xs sm:text-sm text-foreground flex items-center justify-between transition-smooth cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <FaUserTie className="w-4 h-4 text-primary" />
                <span>
                  {showVotesList
                    ? "Ocultar votos individuais dos deputados"
                    : `Ver como cada um dos ${activeVoteStats.total} deputados votou nesta deliberação`}
                </span>
              </div>
              {showVotesList ? <FaChevronUp className="w-3.5 h-3.5" /> : <FaChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Lista de Votos Expandida com Filtros e Busca */}
          {showVotesList && (
            <DeputyVotesList
              filteredVotes={filteredVotes}
              totalVotes={activeSessionVotes.length}
              voteSearch={voteSearch}
              filterParty={filterParty}
              filterState={filterState}
              filterVoteType={filterVoteType}
              availableParties={availableParties}
              availableStates={availableStates}
              simCount={activeVoteStats.sim}
              naoCount={activeVoteStats.nao}
              outrosCount={activeVoteStats.outros}
              onSearchChange={onSearchChange}
              onPartyChange={onPartyChange}
              onStateChange={onStateChange}
              onVoteTypeChange={onVoteTypeChange}
              onResetFilters={onResetFilters}
            />
          )}
        </>
      ) : (
        /* Nota explicativa para deliberação simbólica selecionada */
        <div className="p-4 sm:p-5 rounded-xl bg-muted/20 border border-border/60 text-center space-y-2 pt-4 border-t border-border">
          <div className="flex items-center justify-center gap-2 text-sm font-bold text-foreground">
            <FaLayerGroup className="w-4 h-4 text-primary" />
            <span>Deliberação realizada por Votação Simbólica</span>
          </div>
          <p className="text-xs text-muted-foreground max-w-lg mx-auto leading-relaxed">
            Nesta deliberação, as lideranças partidárias firmaram acordo no Plenário e a matéria foi {activeSession.resultado?.toLowerCase() ?? "deliberada"} por aclamação, dispensando o registro individual no painel eletrônico de votação.
          </p>
        </div>
      )}
    </div>
  );
}
