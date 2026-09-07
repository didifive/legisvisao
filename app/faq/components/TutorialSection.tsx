"use client";

import { useState, useEffect } from "react";
import {
  FaLightbulb,
  FaVoteYea,
  FaLayerGroup,
  FaChartPie,
  FaShieldAlt,
  FaArrowRight,
  FaCheckCircle,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";
import { Button } from "@/app/components/ui/Button";

function getToggleButtonText(isOpen: boolean): string {
  if (isOpen) {
    return "Ocultar tutorial";
  }
  return "Ver tutorial passo a passo";
}

function getHelperHintText(isOpen: boolean): string {
  if (isOpen) {
    return "Clique no cabeçalho ou no botão ao final para recolher o tutorial";
  }
  return "Clique para expandir o tutorial ilustrado de 4 passos";
}

interface TutorialStepItem {
  number: string;
  title: string;
  subtitle: string;
  icon: typeof FaVoteYea;
  description: string[];
  imageSrc: string;
  imageAlt: string;
}

const steps: TutorialStepItem[] = [
  {
    number: "1",
    title: "Leia a proposta e dê a sua opinião",
    subtitle: "Resumos neutros por Inteligência Artificial e votos diretos",
    icon: FaVoteYea,
    description: [
      "Em Analisar Propostas, você encontra matérias legislativas reais deliberadas no Plenário da Câmara dos Deputados.",
      "Para cada lei, a Inteligência Artificial apresenta um resumo factual e descomplicado do objetivo da proposta. Se preferir ler o teor jurídico completo, basta expandir a ementa oficial.",
      "Clique em CONCORDO se apoia a aprovação da matéria, ou DISCORDO caso seja contrário. Se não tiver opinião formada sobre o tema, você pode pular sem qualquer prejuízo ao cálculo.",
    ],
    imageSrc: "/tutorial/passo-1-opinar.png",
    imageAlt: "Exemplo de cartão de votação com resumo por IA e botões Concordo e Discordo",
  },
  {
    number: "2",
    title: "Opine em destaques e emendas específicas",
    subtitle: "Avalie pontos polêmicos votados à parte no Plenário",
    icon: FaLayerGroup,
    description: [
      "No processo legislativo real, disputas cruciais ocorrem nos Destaques para Votação em Separado (DVS) e Emendas (como isenções, regras de transição ou vetos).",
      "O LegisVisão separa automaticamente o texto-base principal das deliberações secundárias da mesma matéria.",
      "Basta clicar no botão 'Ver outras seções votadas' no rodapé do cartão para expandir e opinar pontualmente em cada artigo ou destaque votado nominalmente.",
    ],
    imageSrc: "/tutorial/passo-2-destaques.png",
    imageAlt: "Exemplo do botão expansível para votações de destaques e emendas secundárias",
  },
  {
    number: "3",
    title: "Consulte seu ranking de afinidade real",
    subtitle: "Cruzamento determinístico e ordenação justa por Média Bayesiana",
    icon: FaChartPie,
    description: [
      "Na página de Afinidade, suas respostas são confrontadas voto a voto com os registros oficiais de cada Deputado Federal na Câmara.",
      "A porcentagem empírica (%) informa a taxa real de vezes em que você e o político (ou partido) votaram de forma idêntica.",
      "Para a ordenação da lista, utilizamos a Média Bayesiana: parlamentares com dezenas de votos comprovados recebem destaque estatístico sobre suplentes que votaram em apenas 1 matéria isolada.",
    ],
    imageSrc: "/tutorial/passo-3-afinidade.png",
    imageAlt: "Ranking de afinidade partidária e parlamentar com porcentagens e barras de progresso",
  },
  {
    number: "4",
    title: "Filtre por estado e preserve sua privacidade",
    subtitle: "Arquitetura Local-First com zero envio de dados para servidores",
    icon: FaShieldAlt,
    description: [
      "Você pode filtrar os resultados pela bancada do seu estado (UF) ou por legenda partidária para acompanhar os deputados da sua região.",
      "Privacidade absoluta: todas as suas escolhas são processadas e armazenadas unicamente no seu próprio navegador (localStorage). Nenhuma opinião trafega pela internet ou é gravada em bancos de dados remotos.",
      "Você pode exportar um arquivo de backup em JSON ou limpar seus registros a qualquer momento pelo menu de opções.",
    ],
    imageSrc: "/tutorial/passo-4-deputados.png",
    imageAlt: "Filtro de deputados federais por estado e botões de backup local e exportação",
  },
];

interface TutorialSectionProps {
  readonly defaultOpen?: boolean;
}

export function TutorialSection({ defaultOpen = false }: Readonly<TutorialSectionProps>) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  useEffect(() => {
    const handleHash = () => {
      if (typeof window !== "undefined" && window.location.hash === "#como-usar") {
        setIsOpen(true);
      }
    };

    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  const toggleOpen = () => {
    setIsOpen((prev) => !prev);
  };

  const chevronRotationClass = isOpen ? "rotate-180" : "";
  const toggleText = getToggleButtonText(isOpen);
  const hintText = getHelperHintText(isOpen);

  return (
    <section id="como-usar" className="scroll-mt-24 space-y-6 pt-4">
      {/* Cabeçalho Expansível */}
      <div
        onClick={toggleOpen}
        className="p-6 sm:p-8 rounded-3xl bg-gradient-subtle border border-border space-y-3 relative overflow-hidden shadow-soft cursor-pointer transition-smooth hover:border-primary/50 group select-none"
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        aria-controls="tutorial-steps-content"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleOpen();
          }
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
            <FaLightbulb className="w-3.5 h-3.5 text-amber-500" />
            <span>Guia Passo a Passo</span>
          </div>

          <span
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 group-hover:bg-primary/20 text-primary text-xs sm:text-sm font-bold border border-primary/25 transition-smooth"
            aria-label={toggleText}
          >
            <span>{toggleText}</span>
            <FaChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${chevronRotationClass}`} />
          </span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center justify-between">
          <span>Tutorial Rápido: Como Usar o LegisVisão</span>
        </h2>

        <p className="text-sm sm:text-base text-muted-foreground max-w-3xl leading-relaxed">
          Descubra em 4 etapas simples como o simulador permite confrontar suas opiniões com a atuação real dos deputados em Brasília de forma 100% anônima e transparente.
        </p>

        <div className="pt-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span>{hintText}</span>
        </div>
      </div>

      {/* Conteúdo Expansível (Passos + CTA + Botão de Recolher) */}
      {isOpen && (
        <div id="tutorial-steps-content" className="space-y-8 animate-in fade-in-50 duration-300">
          <div className="space-y-8">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.number}
                  className="p-6 sm:p-8 rounded-2xl bg-card border border-border shadow-soft space-y-6 transition-smooth hover:border-primary/40"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center font-black text-lg shrink-0 shadow-soft">
                      {step.number}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-primary shrink-0" />
                        <h3 className="text-xl font-bold text-foreground">
                          {step.title}
                        </h3>
                      </div>
                      <p className="text-xs sm:text-sm font-semibold text-primary">
                        {step.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Texto explicativo */}
                  <div className="space-y-2.5 text-sm text-muted-foreground leading-relaxed pl-0 sm:pl-14">
                    {step.description.map((paragrafo, idx) => (
                      <p key={idx} className="flex items-start gap-2">
                        <FaCheckCircle className="w-3.5 h-3.5 text-primary shrink-0 mt-1" />
                        <span>{paragrafo}</span>
                      </p>
                    ))}
                  </div>

                  {/* Print ilustrativo */}
                  <div className="pl-0 sm:pl-14 pt-2">
                    <div className="rounded-2xl border border-border/80 bg-muted/20 overflow-hidden shadow-soft max-w-2xl">
                      <img
                        src={step.imageSrc}
                        alt={step.imageAlt}
                        className="w-full h-auto block"
                        loading="lazy"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Call to Action Final */}
          <div className="p-8 rounded-3xl bg-primary/5 border border-primary/20 text-center space-y-4 shadow-soft">
            <h3 className="text-xl sm:text-2xl font-black text-foreground">
              Pronto para testar sua afinidade política?
            </h3>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Leva menos de 2 minutos para responder às principais matérias e descobrir quais deputados e partidos representam você.
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
              <Button
                variant="hero"
                size="xl"
                href="/opiniao"
                className="gap-2 text-base shadow-soft"
              >
                <FaVoteYea className="w-5 h-5" />
                <span>Começar Agora</span>
                <FaArrowRight className="w-4 h-4 ml-1" />
              </Button>

              <Button
                variant="outline"
                size="xl"
                href="/afinidade"
                className="gap-2 text-base"
              >
                <FaChartPie className="w-4 h-4 text-primary" />
                <span>Ver Afinidade</span>
              </Button>
            </div>
          </div>

          {/* Botão de Recolher ao Final */}
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={toggleOpen}
              className="px-5 py-2.5 rounded-full bg-muted/60 hover:bg-muted text-xs sm:text-sm font-bold text-muted-foreground hover:text-foreground transition-smooth flex items-center gap-2 border border-border cursor-pointer shadow-soft"
            >
              <FaChevronUp className="w-3.5 h-3.5 text-primary" />
              <span>Recolher tutorial</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
