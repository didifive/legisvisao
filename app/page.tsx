"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FaVoteYea,
  FaBalanceScale,
  FaShieldAlt,
  FaArrowRight,
  FaChartPie,
  FaCheckCircle,
  FaDownload,
  FaUpload,
  FaTrashAlt,
  FaHistory,
  FaLandmark,
  FaExternalLinkAlt,
  FaExclamationTriangle,
  FaSyncAlt,
  FaLightbulb,
  FaComments,
  FaUserCheck,
} from "react-icons/fa";
import { Button } from "./components/ui/Button";
import { useSystemStatus } from "./components/SystemStatusProvider";
import {
  getStoredAnswers,
  exportAnswersToJson,
  clearStoredAnswers,
} from "@/lib/storage";

export default function Home() {
  const { isReady, isLoading } = useSystemStatus();
  const [opinionsCount, setOpinionsCount] = useState<number>(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const answers = getStoredAnswers();
    setOpinionsCount(Object.keys(answers).length);

    const handleUpdate = () => {
      const updated = getStoredAnswers();
      setOpinionsCount(Object.keys(updated).length);
    };

    window.addEventListener("storage-answers-updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener("storage-answers-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  return (
    <div className="flex flex-col flex-1">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-14 md:pt-18 md:pb-20 bg-gradient-subtle border-b border-border">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-72 h-72 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          {/* Aviso de Dados Não Sincronizados */}
          {!isLoading && !isReady && (
            <div className="mb-8 p-4 sm:p-5 rounded-2xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/30 text-amber-900 dark:text-amber-300 text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-between gap-4 text-left shadow-soft max-w-3xl mx-auto animate-fade-in">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                  <FaExclamationTriangle className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <span className="font-bold text-sm block text-amber-950 dark:text-amber-200">
                    Base de dados legislativos não carregada
                  </span>
                  <span className="text-muted-foreground text-xs leading-relaxed block">
                    Os dados oficiais de proposições, deputados e sessões de votação da Câmara ainda não foram sincronizados.
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                href="/faq"
                className="shrink-0 border-amber-500/40 text-amber-900 dark:text-amber-300 hover:bg-amber-500/20 text-xs font-bold gap-1.5"
              >
                <FaSyncAlt className="w-3 h-3" />
                <span>Ver Fontes & FAQ</span>
              </Button>
            </div>
          )}

          {/* Tag de Apresentação Simples */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold mb-6 border border-primary/20 animate-fade-in">
            <FaLightbulb className="w-3.5 h-3.5" />
            <span>Descubra sua afinidade política real em menos de 2 minutos</span>
          </div>

          {/* Título Principal */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.15] mb-6">
            Descubra quais Deputados Federais{" "}
            <span className="text-gradient">votam como você</span>
          </h1>

          {/* Subtítulo Descomplicado */}
          <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed mb-8 sm:mb-10">
            Você sabe como os deputados em Brasília votam nos temas que afetam o seu dia a dia? Responda se você <strong>CONCORDA</strong> ou <strong>DISCORDA</strong> de leis reais do país e veja na hora quem pensa igualzinho a você.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            {isReady ? (
              <>
                <Button
                  variant="hero"
                  size="xl"
                  href="/opiniao"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 text-base shadow-soft"
                >
                  <FaVoteYea className="w-5 h-5" />
                  <span>{opinionsCount > 0 ? "Continuar Respondendo" : "Começar Agora"}</span>
                  <FaArrowRight className="w-4 h-4 ml-1" />
                </Button>

                <Button
                  variant="outline"
                  size="xl"
                  href="/afinidade"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 text-base"
                >
                  <FaChartPie className="w-4 h-4 text-primary" />
                  <span>Ver Afinidade</span>
                  {mounted && opinionsCount > 0 && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-primary/20 text-primary font-bold">
                      {opinionsCount} opiniões
                    </span>
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="hero"
                  size="xl"
                  href="/opiniao"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 text-base shadow-soft"
                >
                  <FaVoteYea className="w-5 h-5" />
                  <span>Começar Agora</span>
                  <FaArrowRight className="w-4 h-4 ml-1" />
                </Button>

                <Button
                  variant="outline"
                  size="xl"
                  href="/faq"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 text-base"
                >
                  <FaSyncAlt className="w-3.5 h-3.5 text-primary" />
                  <span>Status da Câmara & FAQ</span>
                </Button>
              </>
            )}
          </div>

          {/* Status rápido */}
          {mounted && isReady && opinionsCount > 0 && (
            <div className="mt-8 p-3 rounded-lg bg-card/80 border border-border inline-flex items-center gap-3 text-xs sm:text-sm text-foreground shadow-soft">
              <FaCheckCircle className="text-primary w-4 h-4" />
              <span>Você já opinou sobre <strong>{opinionsCount}</strong> propostas neste navegador.</span>
              <Link href="/opiniao/revisao" className="text-primary font-semibold hover:underline">
                Revisar opiniões &rarr;
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* 2. COMO FUNCIONA EM 3 PASSOS SIMPLES */}
      <section className="py-14 sm:py-18 bg-card border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold text-primary tracking-widest uppercase">
              Simples, Rápido e Direto
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Como funciona o LegisVisão?
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              Em apenas 3 passos você descobre quem realmente te representa no Congresso Nacional.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Passo 1 */}
            <div className="p-6 rounded-2xl bg-background border border-border shadow-soft flex flex-col justify-between space-y-4 relative overflow-hidden group hover:border-primary/50 transition-smooth">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-lg">
                    1
                  </div>
                  <span className="p-2 rounded-lg bg-muted text-muted-foreground">
                    <FaComments className="w-4 h-4 text-primary" />
                  </span>
                </div>
                <h3 className="font-bold text-lg text-foreground">
                  Você diz o que pensa
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Apresentamos temas reais votados no Brasil (como Reforma Tributária, Marco Temporal ou Regulação de IA). Você só precisa clicar em <strong>CONCORDO</strong> ou <strong>DISCORDO</strong>.
                </p>
              </div>
            </div>

            {/* Passo 2 */}
            <div className="p-6 rounded-2xl bg-background border border-border shadow-soft flex flex-col justify-between space-y-4 relative overflow-hidden group hover:border-secondary/50 transition-smooth">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center font-black text-lg">
                    2
                  </div>
                  <span className="p-2 rounded-lg bg-muted text-muted-foreground">
                    <FaBalanceScale className="w-4 h-4 text-secondary" />
                  </span>
                </div>
                <h3 className="font-bold text-lg text-foreground">
                  Cruzamos com o painel oficial
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  O sistema compara suas respostas diretamente com os votos oficiais registrados no painel eletrônico da Câmara pelos <strong>513 Deputados Federais</strong> e bancadas partidárias.
                </p>
              </div>
            </div>

            {/* Passo 3 */}
            <div className="p-6 rounded-2xl bg-background border border-border shadow-soft flex flex-col justify-between space-y-4 relative overflow-hidden group hover:border-emerald-500/50 transition-smooth">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-lg">
                    3
                  </div>
                  <span className="p-2 rounded-lg bg-muted text-muted-foreground">
                    <FaUserCheck className="w-4 h-4 text-emerald-500" />
                  </span>
                </div>
                <h3 className="font-bold text-lg text-foreground">
                  Veja seu ranking de afinidade
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Você recebe uma lista em porcentagem (ex: 85% de afinidade) mostrando quais parlamentares votam mais parecido com você e quais votam o oposto.
                </p>
              </div>
            </div>
          </div>

          {/* Exemplo Prático */}
          <div className="p-5 sm:p-6 rounded-2xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center gap-4 text-xs sm:text-sm text-foreground">
            <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
              <FaLightbulb className="w-5 h-5" />
            </div>
            <div className="space-y-1 leading-relaxed">
              <span className="font-bold text-foreground block">
                Exemplo prático de como funciona:
              </span>
              <p className="text-muted-foreground">
                Se você é a favor de uma proposta e clica em <strong>CONCORDO</strong>, o sistema verifica quais dos 513 deputados também votaram <strong>SIM</strong> no plenário. Quanto mais votos coincidirem com os seus, maior é a sua afinidade com aquele deputado ou partido.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. DIFERENCIAIS DO LEGISVISÃO */}
      <section className="py-16 sm:py-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
            Por que o LegisVisão é diferente?
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Uma abordagem moderna e transparente para você entender quem realmente representa suas convicções em Brasília.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="relative p-6 sm:p-8 rounded-xl bg-card border border-border shadow-soft hover:shadow-medium transition-smooth group flex flex-col">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-smooth">
              <FaVoteYea className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-primary tracking-widest uppercase mb-1">
              Foco no Cidadão
            </span>
            <h3 className="text-lg font-bold mb-3 text-foreground">
              O ponto de partida é você
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed flex-1">
              Em vez de exigir que você pesquise números de leis ou nomes de políticos, você apenas responde como votaria nas principais propostas do país.
            </p>
          </div>

          {/* Card 2 */}
          <div className="relative p-6 sm:p-8 rounded-xl bg-card border border-border shadow-soft hover:shadow-medium transition-smooth group flex flex-col">
            <div className="w-12 h-12 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-secondary group-hover:text-white transition-smooth">
              <FaBalanceScale className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-secondary tracking-widest uppercase mb-1">
              Dados Oficiais
            </span>
            <h3 className="text-lg font-bold mb-3 text-foreground">
              Afinidade com votos reais
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed flex-1">
              Comparamos sua posição diretamente com o registro oficial do painel eletrônico da Câmara dos Deputados, revelando a atuação real de cada parlamentar sem depender de discursos de campanha ou redes sociais.
            </p>
          </div>

          {/* Card 3 */}
          <div className="relative p-6 sm:p-8 rounded-xl bg-card border border-border shadow-soft hover:shadow-medium transition-smooth group flex flex-col">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-smooth">
              <FaShieldAlt className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-primary tracking-widest uppercase mb-1">
              Sigilo Total
            </span>
            <h3 className="text-lg font-bold mb-3 text-foreground">
              Privacidade absoluta (Local-First)
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed flex-1">
              Suas opiniões políticas ficam salvas exclusivamente no seu próprio navegador e nunca são enviadas para nenhum servidor ou banco de dados.
            </p>
          </div>
        </div>
      </section>

      {/* 3. PRIVACIDADE TOTAL & LOCAL-FIRST */}
      <section className="py-12 sm:py-16 bg-muted/40 border-y border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 sm:p-10 rounded-2xl bg-card border border-border shadow-medium relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-primary/5 rounded-full blur-2xl pointer-events-none" />

            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
              <div className="space-y-4 max-w-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                  <FaShieldAlt className="w-3.5 h-3.5" />
                  <span>Privacidade Absoluta Garantida</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  Seus dados são seus. Nada vai para servidores externos.
                </h2>
                <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                  Todas as suas opiniões são salvas exclusivamente na memória local do seu navegador (<em>LocalStorage</em>). Nenhum dado pessoal é rastreado, transmitido ou monetizado.
                </p>
              </div>

              {/* Botões de Gerenciamento de Dados */}
              <div className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full lg:w-auto shrink-0">
                <button
                  type="button"
                  onClick={exportAnswersToJson}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-card text-foreground font-semibold text-xs sm:text-sm hover:bg-muted transition-smooth shadow-soft"
                >
                  <FaDownload className="text-primary w-4 h-4" />
                  <span>Exportar Minhas Opiniões (.json)</span>
                </button>

                {mounted && opinionsCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Tem certeza que deseja apagar todas as opiniões salvas no seu navegador?")) {
                        clearStoredAnswers();
                      }
                    }}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-rose-500/30 text-rose-600 dark:text-rose-400 font-semibold text-xs sm:text-sm hover:bg-rose-500/10 transition-smooth"
                  >
                    <FaTrashAlt className="w-3.5 h-3.5" />
                    <span>Limpar Dados Locais</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
