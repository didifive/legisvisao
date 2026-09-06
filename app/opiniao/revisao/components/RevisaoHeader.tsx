import Link from "next/link";
import { FaArrowLeft, FaInfoCircle } from "react-icons/fa";

interface RevisaoHeaderProps {
  readonly concordoCount: number;
  readonly discordoCount: number;
  readonly totalCount: number;
  readonly nonMeritAnsweredCount: number;
}

export function RevisaoHeader({
  concordoCount,
  discordoCount,
  totalCount,
  nonMeritAnsweredCount,
}: Readonly<RevisaoHeaderProps>) {
  return (
    <>
      {/* Navegação Breadcrumb */}
      <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
        <Link href="/opiniao" className="hover:text-primary transition-smooth flex items-center gap-1">
          <FaArrowLeft className="w-3 h-3" />
          <span>Opinar em Propostas</span>
        </Link>
        <span>/</span>
        <span className="text-foreground font-semibold">Minhas Opiniões</span>
      </div>

      {/* Header com Resumo Estatístico */}
      <div className="p-6 sm:p-8 rounded-2xl bg-card border border-border shadow-soft flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Minhas Opiniões Registradas
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl leading-relaxed">
            Consulte ou altere suas respostas salvas localmente neste dispositivo. Suas opiniões determinam o índice de afinidade com os Deputados Federais.
          </p>
        </div>

        {/* Resumo visual dos votos */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center min-w-[90px]">
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase block">
              Concordo
            </span>
            <span className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-300">
              {concordoCount}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center min-w-[90px]">
            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase block">
              Discordo
            </span>
            <span className="text-xl sm:text-2xl font-black text-rose-700 dark:text-rose-300">
              {discordoCount}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-center min-w-[90px]">
            <span className="text-[10px] font-bold text-primary uppercase block">
              Total
            </span>
            <span className="text-xl sm:text-2xl font-black text-foreground">
              {totalCount}
            </span>
          </div>
        </div>
      </div>

      {/* Banner de Proposições Não-Mérito (se houver matérias simbólicas salvas) */}
      {nonMeritAnsweredCount > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs sm:text-sm text-amber-800 dark:text-amber-300 shadow-soft animate-fade-in">
          <FaInfoCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div className="space-y-1">
            <p className="font-extrabold text-foreground">
              {nonMeritAnsweredCount === 1
                ? "1 proposição sem votação nominal de mérito identificada"
                : `${nonMeritAnsweredCount} proposições sem votação nominal de mérito identificadas`}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Matérias deliberadas simbolicamente ou que possuem apenas votações nominais de emendas/destaques não possuem votação de mérito no Plenário e <strong>são automaticamente desconsideradas no cálculo de afinidade</strong>.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
