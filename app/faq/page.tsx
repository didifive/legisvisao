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
  FaExchangeAlt,
  FaCodeBranch,
  FaHistory,
  FaQuoteLeft,
} from "react-icons/fa";
import { Button } from "@/app/components/ui/Button";

interface SyncSource {
  source: string;
  name: string;
  official_url: string;
  last_sync: string;
  status: "SUCCESS" | "FAILED" | "RUNNING";
  records_count: number;
  last_error: string | null;
}

export default function FAQPage() {
  const [sources, setSources] = useState<SyncSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [userTimeZone, setUserTimeZone] = useState<string>("");

  useEffect(() => {
    setIsClient(true);
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setUserTimeZone(tz || "Local");
    } catch {
      setUserTimeZone("Local");
    }

    async function loadStatus() {
      try {
        const res = await fetch("/api/sync-status");
        if (res.ok) {
          const data = await res.json();
          setSources(data.sources || []);
        }
      } catch (err) {
        console.error("Erro ao buscar status das fontes:", err);
      } finally {
        setLoading(false);
      }
    }

    loadStatus();
  }, []);

  function formatLocalDate(isoString: string): string {
    if (!isoString) return "Aguardando";
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
      return isoString;
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

      {/* 2. PAINEL DE FONTES OFICIAIS */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FaDatabase className="text-primary w-4 h-4" />
            <h2 className="text-xl font-bold text-foreground">
              Status das Fontes de Dados Oficiais
            </h2>
          </div>
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <FaSyncAlt className="w-3 h-3 text-secondary animate-pulse" />
            <span>Sincronização determinística</span>
            {isClient && userTimeZone && (
              <span className="bg-muted px-2 py-0.5 rounded text-[10px] font-medium text-foreground">
                Fuso: {userTimeZone}
              </span>
            )}
          </span>
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
              const formattedDate = isClient && src.last_sync
                ? formatLocalDate(src.last_sync)
                : "Carregando horário local...";

              return (
                <div
                  key={src.source}
                  className="p-5 rounded-xl bg-card border border-border shadow-soft flex flex-col justify-between space-y-4 hover:shadow-medium transition-smooth"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-muted text-foreground">
                        {src.source}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${isSuccess
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-rose-500/10 text-rose-600"
                          }`}
                      >
                        {isSuccess ? (
                          <>
                            <FaCheckCircle className="w-3 h-3" />
                            <span>Ativo</span>
                          </>
                        ) : (
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

                  <div className="space-y-2 pt-2 border-t border-border/60 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Última sincronização:</span>
                      <span className="font-semibold text-foreground">
                        {formattedDate}
                      </span>
                    </div>
                    {src.records_count > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Registros processados:</span>
                        <span className="font-semibold text-foreground">
                          {src.records_count.toLocaleString("pt-BR")}
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
              As APIs oficiais são a fonte primária dos dados
            </span>
          </div>
        </div>

        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            O banco de dados local do <strong>LegisVisão</strong> não é a fonte primária das proposições nem dos votos. Ele atua estritamente como um <strong>cache persistente e camada de agregação rápida</strong> para reduzir requisições às APIs públicas e permitir consultas instantâneas.
          </p>
          <p>
            Em qualquer hipótese de divergência entre o banco local e as APIs oficiais da Câmara ou do Senado, <strong>prevalece sempre a informação oficial governamental</strong>. Não criamos nem inferimos informações que não constem nos registros originais.
          </p>
        </div>
      </section>

      {/* 4. GUIA CÍVICO: BICAMERALISMO */}
      <section className="space-y-6">
        <div className="border-b border-border pb-3">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FaLandmark className="text-secondary w-5 h-5" />
            Como Funciona o Poder Legislativo no Brasil? (Bicameralismo)
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            O Congresso Nacional é composto por duas casas legislativas que se complementam e se fiscalizam mutuamente.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card Câmara dos Deputados */}
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
                  Os <strong>Deputados Federais</strong> são os representantes da população. A quantidade de cadeiras de cada estado é proporcional à população, variando de <strong>8 deputados</strong> a <strong>70 deputados</strong> (SP).
                </p>

                <div className="p-3.5 rounded-xl bg-muted/60 border border-border/50 text-xs space-y-2 text-foreground">
                  <div className="flex items-center gap-2 font-bold text-primary">
                    <FaCalendarAlt className="w-3.5 h-3.5" />
                    <span>Duração do Mandato: 4 Anos</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    A cada 4 anos, a Câmara é integralmente renovada através de eleições gerais.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Card Senado Federal */}
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
                  O <strong>Senado Federal</strong> representa o Pacto Federativo com igualdade entre os 26 estados e o DF. Cada unidade da federação possui exatamente <strong>3 senadores</strong>.
                </p>

                <div className="p-3.5 rounded-xl bg-muted/60 border border-border/50 text-xs space-y-2 text-foreground">
                  <div className="flex items-center gap-2 font-bold text-secondary">
                    <FaExchangeAlt className="w-3.5 h-3.5" />
                    <span>Mandato de 8 Anos</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Renovação alternada: 1/3 (1 senador) em uma eleição e 2/3 (2 senadores) na seguinte.
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
              Metodologia de Cálculo de Afinidade e Fidelidade Partidária
            </h2>
            <span className="text-xs text-muted-foreground">
              Fórmula determinística oficial baseada no registro do plenário
            </span>
          </div>
        </div>

        <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>
            O cálculo de afinidade compara suas opiniões (<strong>Concordo</strong> ou <strong>Discordo</strong>) com os votos nominais registrados pelos parlamentares:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-muted/50 border border-border/80 text-xs text-foreground space-y-2">
              <span className="font-bold text-primary block">1. Afinidade Individual dos Parlamentares:</span>
              <code className="text-xs font-mono bg-background px-2 py-1 rounded border border-border inline-block">
                Índice = Concordâncias ÷ Comparações Válidas
              </code>
              <p className="text-muted-foreground pt-1 text-[11px] leading-relaxed">
                Cada sessão de deliberação nominal em que o parlamentar votou gera uma comparação independente. Votos com abstenção, obstrução ou falta não entram no cálculo.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-muted/50 border border-border/80 text-xs text-foreground space-y-2">
              <span className="font-bold text-primary block">2. Afinidade dos Partidos (Fidelidade do Voto):</span>
              <code className="text-xs font-mono bg-background px-2 py-1 rounded border border-border inline-block">
                Índice Partidário = Concordâncias dos Filiados ÷ Votos Válidos dos Filiados
              </code>
              <p className="text-muted-foreground pt-1 text-[11px] leading-relaxed">
                Calculada pela média dos votos nominais de parlamentares filiados. Cada voto é vinculado à legenda em que o parlamentar estava registrado <strong>no momento exato em que votou no plenário</strong> (extraído diretamente do painel oficial de votações da Câmara e do Senado).
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
              Partidos criados recentemente ou resultantes de fusões, como <strong>União Brasil</strong> (DEM + PSL) e <strong>PRD</strong> (PTB + Patriota), são considerados apenas a partir de sua constituição formal. Assim, votos registrados antes da criação da nova legenda permanecem atribuídos aos partidos existentes à época da votação e não são transferidos retroativamente para o partido sucessor. Por exemplo, votos anteriores continuam vinculados a legendas como <em>DEM</em>, <em>PSL</em>, <em>PTB</em> e <em>Patriota</em>.
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

      {/* 6. AVISO LEGAL DE NEUTRALIDADE CÍVICA */}
      <section className="p-6 sm:p-8 rounded-2xl bg-amber-500/10 dark:bg-amber-950/20 border border-amber-500/30 shadow-soft space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center">
            <FaBalanceScale className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">
              Aviso de Neutralidade Cívica
            </h2>
            <span className="text-xs text-muted-foreground">
              Compromisso cívico e de transparência
            </span>
          </div>
        </div>

        <div className="space-y-3 text-xs sm:text-sm text-muted-foreground leading-relaxed">
          <p className="p-3.5 rounded-xl bg-background/80 border border-amber-500/20 text-foreground font-medium">
            ⚖️ <strong>Esta ferramenta não recomenda representantes. Apenas compara dados públicos.</strong> O LegisVisão não emite juízo de valor sobre votos certos ou errados e não direciona o usuário a nenhum partido ou parlamentar.
          </p>
        </div>
      </section>

      {/* 7. PRIVACIDADE LOCAL-FIRST */}
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

      {/* 8. PENSAMENTOS & REFLEXÕES */}
      <section className="space-y-4 pt-4">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <FaQuoteLeft className="text-primary w-5 h-5" />
          <h2 className="text-2xl font-bold text-foreground">
            Pensamentos & Inspirações
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-soft flex flex-col justify-between space-y-3">
            <p className="text-sm italic text-foreground leading-relaxed">
              &ldquo;Julgue um homem pelas suas perguntas, não pelas suas respostas.&rdquo;
            </p>
            <span className="text-xs font-semibold text-primary">
              — Voltaire
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-soft flex flex-col justify-between space-y-3">
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
