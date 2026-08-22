"use client";

import { useEffect, useState } from "react";
import {
  FaDatabase,
  FaExternalLinkAlt,
  FaCheckCircle,
  FaExclamationTriangle,
  FaLandmark,
  FaUsers,
  FaBalanceScale,
  FaVoteYea,
  FaShieldAlt,
  FaSyncAlt,
  FaCalendarAlt,
  FaCodeBranch,
  FaHistory,
  FaClock,
  FaExchangeAlt,
  FaQuoteLeft,
  FaRobot,
} from "react-icons/fa";
import { Button } from "@/app/components/ui/Button";
import { useSystemStatus } from "@/app/components/SystemStatusProvider";
import { urls } from "@/lib/urls";

interface SyncSource {
  source: string;
  name: string;
  official_url: string;
  last_sync: string | null;
  status: "SUCCESS" | "FAILED" | "RUNNING" | "PENDING";
  total_deputies?: number;
  total_propositions?: number;
  total_vote_sessions?: number;
  total_votes?: number;
  last_error: string | null;
}

export default function FAQPage() {
  const { isReady, isLoading: isStatusLoading } = useSystemStatus();
  const [sources, setSources] = useState<SyncSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);

    async function loadStatus() {
      try {
        const res = await fetch("/api/sync-status");
        if (res.ok) {
          const data = await res.json();
          const list = data.sources || (data.source ? [data.source] : []);
          setSources(list);
        }
      } catch (err) {
        console.error("Erro ao buscar status das fontes:", err);
      } finally {
        setLoading(false);
      }
    }

    loadStatus();
  }, []);

  function formatLocalDate(isoString: string | null): string {
    if (!isoString) return "Aguardando primeira execução";
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat(undefined, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(date);
    } catch {
      return String(isoString);
    }
  }

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-14">
      {/* 1. CABEÇALHO */}
      <div className="text-center space-y-3 max-w-3xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          FAQ e Fontes Oficiais
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
          Entenda a metodologia do <strong>LegisVisão</strong>, de onde vêm os dados públicos
          e como funciona o cálculo determinístico de afinidade legislativa.
        </p>
      </div>

      {/* Aviso Amigável para o Visitante */}
      {!isStatusLoading && !isReady && (
        <div className="p-5 sm:p-6 rounded-2xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/30 text-foreground space-y-3 shadow-soft animate-fade-in">
          <div className="flex items-center gap-2.5 font-bold text-amber-900 dark:text-amber-300 text-base">
            <FaExclamationTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Aviso: Dados da Câmara em Processo de Ingestão</span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            As proposições legislativas e votações nominais estão sendo carregadas através da API de Dados Abertos da Câmara dos Deputados. Caso o conteúdo ainda não apareça no simulador, execute a sincronização ou consulte o status no painel abaixo:
          </p>
          <div className="pt-1 flex flex-wrap items-center gap-3">
            <a
              href={urls.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-white text-xs font-bold shadow-soft hover:bg-primary/90 transition-smooth"
            >
              <span>Falar com Luis Zancanela (zancanela.dev.br)</span>
              <FaExternalLinkAlt className="w-2.5 h-2.5" />
            </a>
            <a
              href={`mailto:${urls.email}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-card border border-border text-foreground hover:bg-muted text-xs font-medium transition-smooth"
            >
              <span>{urls.email}</span>
            </a>
          </div>
        </div>
      )}

      {/* 2. PAINEL DE FONTES OFICIAIS */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <FaDatabase className="text-primary w-4 h-4" />
          <h2 className="text-xl font-bold text-foreground">
            Status das Fontes de Dados Oficiais
          </h2>
        </div>

        {loading ? (
          <div className="p-8 rounded-xl bg-card border border-border text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span>Consultando status das bases governamentais...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sources.map((src) => {
              const isSuccess = src.status === "SUCCESS";
              const isRunning = src.status === "RUNNING";
              const isPending = src.status === "PENDING";
              const formattedDate = isClient
                ? formatLocalDate(src.last_sync)
                : "Carregando horário local...";

              return (
                <div
                  key={src.source}
                  className="p-5 sm:p-6 rounded-xl bg-card border border-border shadow-soft flex flex-col justify-between space-y-4 hover:shadow-medium transition-smooth"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-muted text-foreground">
                        {src.source}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full ${isSuccess
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : isRunning
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 animate-pulse"
                              : isPending
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                : "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                          }`}
                      >
                        {isSuccess && (
                          <>
                            <FaCheckCircle className="w-3 h-3" />
                            <span>Sincronizado</span>
                          </>
                        )}
                        {isRunning && (
                          <>
                            <FaSyncAlt className="w-3 h-3 animate-spin" />
                            <span>Sincronizando Dados...</span>
                          </>
                        )}
                        {isPending && (
                          <>
                            <FaClock className="w-3 h-3" />
                            <span>Aguardando Ingestão</span>
                          </>
                        )}
                        {!isSuccess && !isRunning && !isPending && (
                          <>
                            <FaExclamationTriangle className="w-3 h-3" />
                            <span>Atenção</span>
                          </>
                        )}
                      </span>
                    </div>

                    <h3 className="font-bold text-foreground text-base leading-snug">
                      {src.name}
                    </h3>
                  </div>

                  <div className="space-y-2.5 pt-2 border-t border-border/60 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Última sincronização:</span>
                      <span className="font-semibold text-foreground">
                        {formattedDate}
                      </span>
                    </div>

                    {typeof src.total_deputies === "number" && src.total_deputies > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Deputados Federais cadastrados:</span>
                        <span className="font-semibold text-foreground">
                          {src.total_deputies.toLocaleString("pt-BR")}
                        </span>
                      </div>
                    )}

                    {typeof src.total_propositions === "number" && src.total_propositions > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Proposições com votação:</span>
                        <span className="font-semibold text-foreground">
                          {src.total_propositions.toLocaleString("pt-BR")}
                        </span>
                      </div>
                    )}

                    {typeof src.total_votes === "number" && src.total_votes > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Votos nominais processados:</span>
                        <span className="font-semibold text-foreground">
                          {src.total_votes.toLocaleString("pt-BR")}
                        </span>
                      </div>
                    )}

                    <a
                      href={src.official_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline font-medium pt-1"
                    >
                      <span>Acessar portal de Dados Abertos</span>
                      <FaExternalLinkAlt className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. PRINCÍPIO DA FONTE DE VERDADE */}
      <section className="p-6 sm:p-8 rounded-2xl bg-card border border-border shadow-soft space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <FaDatabase className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">
              Princípio da Fonte de Verdade
            </h2>
            <span className="text-xs text-muted-foreground">
              A API oficial da Câmara dos Deputados é a fonte primária dos dados
            </span>
          </div>
        </div>

        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            O banco de dados do <strong>LegisVisão</strong> não é a fonte primária das proposições nem dos votos. Ele atua estritamente como um <strong>cache persistente e camada de indexação de alta velocidade</strong> para evitar sobrecarga nas APIs públicas e permitir consultas instantâneas no navegador.
          </p>
          <p>
            Em qualquer hipótese de divergência entre o banco local e a API oficial da Câmara dos Deputados, <strong>prevalece sempre a informação oficial governamental</strong>. Não criamos nem inferimos informações que não constem nos registros originais.
          </p>
        </div>
      </section>

      {/* 4. GUIA CÍVICO: BICAMERALISMO & MANDATOS */}
      <section className="space-y-6">
        <div className="border-b border-border pb-3">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FaLandmark className="text-secondary w-5 h-5" />
            Como Funciona o Poder Legislativo no Brasil? (Bicameralismo)
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            O Congresso Nacional é bicameral, composto por duas casas legislativas que representam esferas complementares da federação.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1: Câmara dos Deputados */}
          <div className="p-6 sm:p-7 rounded-2xl bg-card border border-border shadow-soft flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                  <FaUsers className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-xl">
                    Câmara dos Deputados
                  </h3>
                  <span className="text-xs font-semibold text-primary">
                    Representação do Povo • 513 Deputados Federais
                  </span>
                </div>
              </div>

              <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                <p>
                  Os <strong>Deputados Federais</strong> representam diretamente a população brasileira. A quantidade de cadeiras de cada estado e do Distrito Federal é proporcional ao tamanho da sua população, variando de <strong>8 deputados</strong> (estados menores como AC, AP, RR) a <strong>70 deputados</strong> (São Paulo).
                </p>

                <div className="p-3.5 rounded-xl bg-muted/60 border border-border/50 text-xs space-y-2 text-foreground">
                  <div className="flex items-center gap-2 font-bold text-primary">
                    <FaCalendarAlt className="w-3.5 h-3.5" />
                    <span>Duração do Mandato: 4 Anos (57ª Legislatura: 2023–2027)</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    A cada 4 anos, a Câmara dos Deputados é <strong>integralmente renovada</strong> através de eleições gerais pelo sistema proporcional em cada estado.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Senado Federal */}
          <div className="p-6 sm:p-7 rounded-2xl bg-card border border-border shadow-soft flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center font-bold shrink-0">
                  <FaBalanceScale className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-xl">
                    Senado Federal
                  </h3>
                  <span className="text-xs font-semibold text-secondary">
                    Representação dos Estados e DF • 81 Senadores
                  </span>
                </div>
              </div>

              <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                <p>
                  O <strong>Senado Federal</strong> representa o Pacto Federativo com igualdade rigorosa entre as 27 unidades da federação. Independentemente do tamanho da população ou território, cada estado e o DF possuem exatamente <strong>3 senadores</strong>.
                </p>

                <div className="p-3.5 rounded-xl bg-muted/60 border border-border/50 text-xs space-y-2 text-foreground">
                  <div className="flex items-center gap-2 font-bold text-secondary">
                    <FaExchangeAlt className="w-3.5 h-3.5" />
                    <span>Duração do Mandato: 8 Anos (Renovação Parcial Alternada)</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    O mandato do senador dura 8 anos, com renovação alternada a cada 4 anos: <strong>1/3 das cadeiras</strong> (1 senador por UF) em uma eleição e <strong>2/3 das cadeiras</strong> (2 senadores por UF) na eleição seguinte.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. METODOLOGIA DE CÁLCULO */}
      <section className="p-6 sm:p-8 rounded-2xl bg-card border border-border shadow-soft space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <FaBalanceScale className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">
              Metodologia de Cálculo de Afinidade
            </h2>
            <span className="text-xs text-muted-foreground">
              Fórmula determinística oficial baseada no registro do plenário
            </span>
          </div>
        </div>

        <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>
            O cálculo de afinidade compara suas opiniões (<strong>Concordo</strong> ou <strong>Discordo</strong>) com os votos nominais registrados pelos deputados:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-muted/50 border border-border/80 text-xs text-foreground space-y-2">
              <span className="font-bold text-primary block">1. Afinidade Individual dos Deputados:</span>
              <code className="text-xs font-mono bg-background px-2 py-1 rounded border border-border inline-block">
                Índice = Concordâncias ÷ Comparações Válidas
              </code>
              <p className="text-muted-foreground pt-1 text-[11px] leading-relaxed">
                Cada sessão de deliberação nominal em que o deputado votou gera uma comparação independente. Votos com abstenção, obstrução ou falta não entram no cálculo.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-muted/50 border border-border/80 text-xs text-foreground space-y-2">
              <span className="font-bold text-primary block">2. Afinidade dos Partidos (Média da Bancada):</span>
              <code className="text-xs font-mono bg-background px-2 py-1 rounded border border-border inline-block">
                Índice Partidário = Concordâncias dos Filiados ÷ Votos Válidos dos Filiados
              </code>
              <p className="text-muted-foreground pt-1 text-[11px] leading-relaxed">
                Calculada pela média dos votos nominais de deputados filiados. Cada voto é vinculado à legenda em que o parlamentar estava registrado <strong>no momento exato em que votou no plenário</strong> (extraído diretamente do painel oficial de votações da Câmara dos Deputados).
              </p>
            </div>
          </div>

          {/* Destaque Pedagógico: Partidos Recentes e Critério de Desempate */}
          <div className="p-4 sm:p-5 rounded-xl bg-primary/5 border border-primary/20 text-xs space-y-3 text-foreground">
            <div className="font-bold text-primary flex items-center gap-2">
              <FaHistory className="w-3.5 h-3.5" />
              <span>Efeito em Partidos Recentes e Fusões:</span>
            </div>
            <p className="text-muted-foreground leading-relaxed text-xs">
              Partidos criados recentemente ou resultantes de fusões são considerados a partir de sua constituição formal. Votos registrados antes da criação da nova legenda permanecem atribuídos aos partidos existentes à época da votação.
            </p>
            <div className="font-bold text-primary flex items-center gap-2 pt-1">
              <FaBalanceScale className="w-3.5 h-3.5" />
              <span>Critério de Desempate no Ranking:</span>
            </div>
            <p className="text-muted-foreground leading-relaxed text-xs">
              Em caso de empate no percentual de afinidade entre legendas ou parlamentares, o primeiro critério de desempate é o <strong>maior número de votos comparáveis considerados</strong>, privilegiando resultados baseados em uma amostra mais ampla e estatisticamente mais robusta.
            </p>
          </div>
        </div>
      </section>

      {/* 6. MÚLTIPLAS VOTAÇÕES DE UM MESMO PROJETO */}
      <section id="multiplas-votacoes" className="p-6 sm:p-8 rounded-2xl bg-card border border-border shadow-soft space-y-6 scroll-mt-24">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <FaVoteYea className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">
              Como funcionam as Múltiplas Votações de um mesmo Projeto?
            </h2>
            <span className="text-xs text-muted-foreground">
              Entenda a distinção entre Mérito Principal, Destaques e Requerimentos Procedimentais
            </span>
          </div>
        </div>

        <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>
            No processo legislativo da Câmara dos Deputados, uma mesma proposta de lei (PL, PEC, PLP ou MPV) costuma passar por <strong>diversas deliberações nominais em plenário</strong> ao longo de sua tramitação. O LegisVisão classifica e agrupa cada votação para assegurar máxima transparência:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Mérito Principal */}
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs space-y-2">
              <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 text-sm">
                <span>1. Mérito / Texto-Base</span>
              </span>
              <p className="text-muted-foreground leading-relaxed text-xs">
                <strong>Utilizada exclusivamente no cálculo de afinidade.</strong> É a votação substantiva central onde o plenário decide pela aprovação ou rejeição da matéria (Texto-Base, Substitutivo, Turnos de PEC ou Projeto de Lei de Conversão com registro nominal individual de votos). Expressa a posição direta do parlamentar sobre a essência da lei.
              </p>
            </div>

            {/* 2. Destaques e Emendas */}
            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 text-xs space-y-2">
              <span className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 text-sm">
                <span>2. Destaques & Emendas</span>
              </span>
              <p className="text-muted-foreground leading-relaxed text-xs">
                Votações pontuais (DTQ / DVS / Emendas) para manter, suprimir ou alterar artigos, parágrafos ou regras específicas dentro do texto já aprovado. Não são utilizadas no cálculo básico de afinidade para não distorcer a opinião geral.
              </p>
            </div>

            {/* 3. Requerimentos Procedimentais */}
            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs space-y-2">
              <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 text-sm">
                <span>3. Requerimentos de Pauta</span>
              </span>
              <p className="text-muted-foreground leading-relaxed text-xs">
                Manobras de regimento interno (ex: Retirada de Pauta, Adiamento da Votação, Urgência). Frequentemente usadas pela oposição ou governo como tática para acelerar ou postergar deliberações.
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-xl bg-muted/60 border border-border text-xs text-foreground space-y-3">
            <span className="font-bold text-primary block text-sm">🎯 Por que o Voto de Mérito Principal é o único considerado no cálculo de afinidade?</span>
            <p className="text-muted-foreground text-xs leading-relaxed">
              <strong>Apenas deliberações de mérito com votos nominais válidos integram o cálculo básico de afinidade.</strong> Quando você responde ao questionário ("Concordo" ou "Discordo"), sua opinião avalia o mérito substantivo da proposta de lei como um todo. Vincular sua resposta exclusivamente à deliberação principal de mérito evita distorções graves, como computar uma votação pontual de emenda ou manobra de adiamento como se fosse a aprovação ou rejeição da lei em si.
            </p>
            <div className="pt-1 p-3.5 rounded-lg bg-background/80 border border-border/70 space-y-1.5">
              <span className="font-semibold text-foreground text-xs block">💡 E as proposições deliberadas por votação simbólica?</span>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Quando o texto-base de um projeto é aprovado ou rejeitado simbolicamente (por aclamação ou acordo de lideranças, sem registro individual no painel eletrônico), a matéria <strong>não possui votação nominal de mérito</strong>. O LegisVisão disponibiliza essas matérias em modo de consulta com histórico completo de emendas e tramitação, mas <strong>não as inclui na simulação de afinidade</strong>, preservando 100% da integridade matemática dos índices.
              </p>
            </div>
          </div>

          {/* Critério Determinístico Estrito de Classificação */}
          <div className="p-4 sm:p-5 rounded-xl bg-primary/5 border border-primary/20 text-xs text-foreground space-y-3">
            <div className="font-bold text-primary flex items-center gap-2">
              <FaBalanceScale className="w-3.5 h-3.5" />
              <span>Hierarquia Determinística de Eleição da Votação Principal:</span>
            </div>
            <p className="text-muted-foreground leading-relaxed text-xs">
              Para garantir que o cálculo e a exibição sejam <strong>100% determinísticos, auditáveis e reproduzíveis</strong> em qualquer dispositivo, a seleção da votação principal segue rigorosamente quatro níveis de critérios ordenados:
            </p>
            <ol className="list-decimal pl-4 space-y-1.5 text-muted-foreground text-xs leading-relaxed">
              <li>
                <strong>Nível 1 (Relevância de Mérito Estrito):</strong> Prioridade máxima e exclusiva para deliberações de Mérito e Texto-Base (1º e 2º turnos de PECs, Substitutivos, Projetos de Lei de Conversão e Pareceres de Mérito) sobre Emendas, Destaques ou Requerimentos.
              </li>
              <li>
                <strong>Nível 2 (Presença Obrigatória de Votos Nominais):</strong> Exige votos nominais válidos registrados no painel eletrônico (Sim/Não), desconsiderando redações finais meramente simbólicas (0 votos nominais).
              </li>
              <li>
                <strong>Nível 3 (Atualidade e Turno Definitivo):</strong> Em caso de mais de uma deliberação de mérito (como em PECs), seleciona-se a data e hora mais recente (o 2º turno, que consolida a manifestação definitiva da Casa).
              </li>
              <li>
                <strong>Nível 4 (Desempate Alfanumérico Estrito):</strong> Em caso de empate temporal no mesmo segundo, o identificador oficial único da sessão na Câmara dos Deputados (<code>ID da Votação</code>) é utilizado como critério de desempate determinístico.
              </li>
            </ol>
          </div>
        </div>
      </section>

      {/* 7. COMO A INTELIGÊNCIA ARTIFICIAL É UTILIZADA NO LEGISVISÃO */}
      <section className="p-6 sm:p-8 rounded-2xl bg-card border border-border shadow-soft space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <FaRobot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">
              Como a Inteligência Artificial é Utilizada no LegisVisão?
            </h2>
            <span className="text-xs text-muted-foreground">
              Tradução cívica acessível, neutralidade 100% apartidária e auditoria transparente
            </span>
          </div>
        </div>

        <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>
            As propostas de lei e os registros regimentais da Câmara dos Deputados frequentemente utilizam termos jurídicos e procedimentos regimentais complexos que dificultam o entendimento do cidadão comum.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-muted/50 border border-border/80 text-xs space-y-2">
              <span className="font-bold text-primary block text-sm">
                1. Papel Estrito de Tradução Cívica
              </span>
              <p className="text-muted-foreground leading-relaxed text-xs">
                A Inteligência Artificial (Google AI Studio) atua exclusivamente como uma ferramenta de simplificação de linguagem. A partir do texto integral em PDF ou da ementa detalhada da Câmara, a IA gera um <strong>Resumo Geral do Projeto</strong> (de até 4 frases) e a contextualização de cada votação nominal em linguagem simples e direta.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-muted/50 border border-border/80 text-xs space-y-2">
              <span className="font-bold text-primary block text-sm">
                2. Compromisso Rígido de Imparcialidade
              </span>
              <p className="text-muted-foreground leading-relaxed text-xs">
                A IA opera com diretrizes estritas de neutralidade: não emite opiniões, não usa adjetivos elogiosos ou pejorativos e não define se uma proposta é boa ou ruim. Ela apenas resume o que a proposta altera na prática e os argumentos centrais do debate público.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-xs space-y-2 text-foreground">
              <span className="font-bold text-primary block">
                🔍 Transparência Total e Acesso à Fonte Original
              </span>
              <p className="text-muted-foreground leading-relaxed text-xs">
                A IA nunca substitui a fonte primária. Em todos os cartões de votação e páginas de projetos, o cidadão pode conferir a <strong>ementa jurídica oficial</strong> e acessar o link direto para o <strong>inteiro teor do documento no portal oficial da Câmara dos Deputados</strong>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. AVISO LEGAL DE NEUTRALIDADE CÍVICA */}
      <section className="p-6 sm:p-8 rounded-2xl bg-amber-500/10 dark:bg-amber-950/20 border border-amber-500/30 shadow-soft space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center">
            <FaBalanceScale className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">
              Aviso de Neutralidade Cívica & Transparência
            </h2>
            <span className="text-xs text-muted-foreground">
              Compromisso cívico, apartidário e de dados abertos
            </span>
          </div>
        </div>

        <div className="space-y-3 text-xs sm:text-sm text-muted-foreground leading-relaxed">
          <p className="p-3.5 rounded-xl bg-background/80 border border-amber-500/20 text-foreground font-medium">
            ⚖️ <strong>Esta ferramenta não recomenda representantes. Apenas compara dados públicos.</strong> O LegisVisão não emite juízo de valor sobre votos certos ou errados e não direciona o usuário a nenhum partido ou parlamentar.
          </p>
          <p>
            Os resumos em linguagem cidadã são gerados por modelos de Inteligência Artificial com instruções públicas no repositório de código aberto. Cada cartão de projeto conta com link para a fonte oficial na Câmara dos Deputados, texto integral da ementa e botão de relato para garantir auditoria contínua da sociedade.
          </p>
        </div>
      </section>

      {/* 9. PRIVACIDADE LOCAL-FIRST */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <FaShieldAlt className="text-primary w-5 h-5" />
          <h2 className="text-2xl font-bold text-foreground">
            Privacidade e Segurança
          </h2>
        </div>

        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            O <strong>LegisVisão</strong> é uma iniciativa cívica de código aberto
            desenvolvida por <strong>Luis Zancanela</strong>, sem qualquer vínculo financeiro ou partidário.
          </p>
          <p>
            Todas as opiniões registradas no simulador permanecem exclusivamente na memória local (<code>localStorage</code>) do seu próprio navegador. Nenhum voto ou perfil é coletado, transmitido ou gravado em servidores.
          </p>
          <p className="pt-1">
            <a
              href="https://github.com/didifive/legisvisao"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-primary hover:underline font-semibold bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/20 transition-smooth"
            >
              <FaCodeBranch className="w-3.5 h-3.5" />
              <span>Ver código-fonte aberto no GitHub</span>
              <FaExternalLinkAlt className="w-2.5 h-2.5 ml-0.5" />
            </a>
          </p>
        </div>

        <div className="pt-4 flex flex-wrap gap-3">
          <Button variant="hero" href="/opiniao">
            Analisar Propostas
          </Button>
          <Button variant="outline" href="/afinidade">
            Ver Afinidade
          </Button>
        </div>
      </section>

      {/* 10. PENSAMENTOS & REFLEXÕES */}
      <section className="space-y-4 pt-4">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <FaQuoteLeft className="text-primary w-5 h-5" />
          <h2 className="text-2xl font-bold text-foreground">
            Pensamentos & Inspirações
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-card border border-border shadow-soft flex flex-col justify-between space-y-3">
            <p className="text-sm italic text-foreground leading-relaxed">
              &ldquo;Julgue um homem pelas suas perguntas, não pelas suas respostas.&rdquo;
            </p>
            <span className="text-xs font-semibold text-primary">
              — Voltaire
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border shadow-soft flex flex-col justify-between space-y-3">
            <p className="text-sm italic text-foreground leading-relaxed">
              &ldquo;A dúvida é o princípio da sabedoria.&rdquo;
            </p>
            <span className="text-xs font-semibold text-primary">
              — Aristóteles
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-primary/5 border border-primary/20 shadow-soft flex flex-col justify-between space-y-3">
            <p className="text-sm italic text-foreground font-medium leading-relaxed">
              &ldquo;Nenhuma fonte é completa por si só. Busque informações diversas e verificáveis para formar sua opinião.&rdquo;
            </p>
            <span className="text-xs font-bold text-primary">
              — Zancanela, Luis (LegisVisão, 2026)
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
