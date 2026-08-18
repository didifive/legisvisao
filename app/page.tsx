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
      <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24 bg-gradient-subtle border-b border-border">
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
                    Os dados oficiais de proposições, parlamentares e sessões de votação ainda não foram sincronizados neste ambiente.
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

          {/* Título Principal */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.15] mb-6">
            Descubra quais parlamentares e partidos{" "}
            <span className="text-gradient">posicionam-se como você</span>
          </h1>

          {/* Subtítulo */}
          <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed mb-8 sm:mb-10">
            Analise propostas de lei reais deliberadas na Câmara dos Deputados e no Senado Federal.
            Registre sua opinião (<strong>CONCORDO</strong> ou <strong>DISCORDO</strong>) e descubra
            em instantes seu índice de afinidade legislativa real, com total neutralidade.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            {isReady ? (
              <>
                <Button
                  variant="hero"
                  size="xl"
                  href="/opiniao"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 text-base"
                >
                  <FaVoteYea className="w-5 h-5" />
                  <span>{opinionsCount > 0 ? "Continuar Analisando" : "Começar Agora"}</span>
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
                  href="/faq"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 text-base"
                >
                  <FaSyncAlt className="w-4 h-4" />
                  <span>Consultar Status das Fontes</span>
                  <FaArrowRight className="w-4 h-4 ml-1" />
                </Button>

                <Button
                  variant="outline"
                  size="xl"
                  href="https://github.com/didifive/legisvisao"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 text-base"
                >
                  <FaExternalLinkAlt className="w-3.5 h-3.5" />
                  <span>Instruções no GitHub</span>
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

      {/* 2. COMO FUNCIONA (3 PASSOS) */}
      <section className="py-16 sm:py-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
            Como o LegisVisão funciona?
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Um processo direto, transparente e fundamentado em dados públicos da Câmara dos Deputados e do Senado Federal.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Passo 1 */}
          <div className="relative p-6 sm:p-8 rounded-xl bg-card border border-border shadow-soft hover:shadow-medium transition-smooth group flex flex-col">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-smooth">
              <FaVoteYea className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-primary tracking-widest uppercase mb-1">
              Passo 1
            </span>
            <h3 className="text-lg font-bold mb-3 text-foreground">
              Analise as Propostas de Lei
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed flex-1">
              Leia o resumo objetivo de cada proposta deliberada no Congresso Nacional e registre sua opinião (<strong>CONCORDO</strong> ou <strong>DISCORDO</strong>).
            </p>
          </div>

          {/* Passo 2 */}
          <div className="relative p-6 sm:p-8 rounded-xl bg-card border border-border shadow-soft hover:shadow-medium transition-smooth group flex flex-col">
            <div className="w-12 h-12 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-secondary group-hover:text-white transition-smooth">
              <FaBalanceScale className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-secondary tracking-widest uppercase mb-1">
              Passo 2
            </span>
            <h3 className="text-lg font-bold mb-3 text-foreground">
              Cruzamento de Dados Oficial
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed flex-1">
              O sistema compara suas escolhas diretamente com as votações nominais dos deputados e senadores registradas nos canais oficiais.
            </p>
          </div>

          {/* Passo 3 */}
          <div className="relative p-6 sm:p-8 rounded-xl bg-card border border-border shadow-soft hover:shadow-medium transition-smooth group flex flex-col">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-smooth">
              <FaChartPie className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-primary tracking-widest uppercase mb-1">
              Passo 3
            </span>
            <h3 className="text-lg font-bold mb-3 text-foreground">
              Descubra sua Afinidade
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed flex-1">
              Consulte seu índice de afinidade percentual com os parlamentares e com a média dos partidos, identificando alinhamentos reais e divergências.
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
                  O <strong>LegisVisão</strong> opera no modelo <em>Local-First</em>: todas as suas respostas são processadas e salvas unicamente na memória local (<code>localStorage</code>) do seu navegador.
                </p>
                <ul className="space-y-2 text-sm text-foreground/90 pt-1">
                  <li className="flex items-center gap-2">
                    <FaCheckCircle className="text-primary w-4 h-4 shrink-0" />
                    <span>Nenhum cadastro ou email é exigido</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FaCheckCircle className="text-primary w-4 h-4 shrink-0" />
                    <span>Sem cookies de rastreamento ou telemetria invasiva</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FaCheckCircle className="text-primary w-4 h-4 shrink-0" />
                    <span>Você pode exportar em JSON ou limpar tudo em um clique</span>
                  </li>
                </ul>
                <div className="pt-2">
                  <a
                    href="https://github.com/didifive/legisvisao"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-semibold"
                  >
                    <span>A configuração de não coletar dados pode ser confirmada no código-fonte</span>
                    <FaExternalLinkAlt className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>

              {/* Card de Gestão Rápida de Dados */}
              <div className="w-full lg:w-auto p-5 rounded-xl bg-background border border-border shadow-soft flex flex-col space-y-3 min-w-[260px]">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Controle Local de Opiniões
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportAnswersToJson}
                  className="w-full justify-start text-xs gap-2"
                >
                  <FaDownload className="text-secondary w-3.5 h-3.5" />
                  <span>Exportar Opiniões (.JSON)</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const el = document.querySelector('input[type="file"]') as HTMLInputElement;
                    if (el) el.click();
                  }}
                  className="w-full justify-start text-xs gap-2"
                >
                  <FaUpload className="text-primary w-3.5 h-3.5" />
                  <span>Importar Opiniões (.JSON)</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (opinionsCount === 0) return alert("Nenhuma opinião salva.");
                    if (confirm("Apagar todas as opiniões salvas neste navegador?")) {
                      clearStoredAnswers();
                    }
                  }}
                  className="w-full justify-start text-xs gap-2 text-destructive hover:bg-destructive/10"
                >
                  <FaTrashAlt className="w-3.5 h-3.5" />
                  <span>Limpar Minhas Opiniões</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. SEÇÃO INSTITUCIONAL & CTA FINAL */}
      <section className="py-16 sm:py-20 text-center max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-primary text-white flex items-center justify-center mx-auto mb-6 shadow-medium">
          <FaLandmark className="w-7 h-7" />
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
          Pronto para descobrir sua afinidade legislativa?
        </h2>
        <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto mb-8">
          Leva apenas alguns minutos para opinar sobre as principais pautas do país e entender quais parlamentares melhor refletem sua visão.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {isReady ? (
            <>
              <Button
                variant="hero"
                size="lg"
                href="/opiniao"
                className="w-full sm:w-auto px-8"
              >
                Iniciar Análise de Propostas
              </Button>
              <Button
                variant="outline"
                size="lg"
                href="/opiniao/revisao"
                className="w-full sm:w-auto px-8"
              >
                <FaHistory className="w-4 h-4 mr-1 text-muted-foreground" />
                Revisar Opiniões Anteriores
              </Button>
            </>
          ) : (
            <Button
              variant="hero"
              size="lg"
              href="/faq"
              className="w-full sm:w-auto px-8"
            >
              <FaSyncAlt className="w-4 h-4 mr-1.5" />
              Ver Fontes & Sincronização
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
