import {
  FaDatabase,
  FaLandmark,
  FaUsers,
  FaBalanceScale,
  FaCalendarAlt,
  FaExchangeAlt,
} from "react-icons/fa";

export function CivicGuideSection() {
  return (
    <>
      {/* PRINCÍPIO DA FONTE DE VERDADE */}
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

      {/* GUIA CÍVICO: BICAMERALISMO & MANDATOS */}
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
                    <span>Duração do Mandato: 4 Anos (57ª Legislatura: 2023-2027)</span>
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
    </>
  );
}
