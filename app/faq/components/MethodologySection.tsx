import {
  FaBalanceScale,
  FaHistory,
  FaVoteYea,
} from "react-icons/fa";

export function MethodologySection() {
  return (
    <>
      {/* METODOLOGIA DE CÁLCULO */}
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
              <span>Critério de Ordenação e Desempate no Ranking:</span>
            </div>
            <p className="text-muted-foreground leading-relaxed text-xs">
              Para ordenar o ranking de deputados e partidos com justiça estatística, o sistema utiliza ordenação com suavização bayesiana. O percentual nominal exibido no cartão representa a adesão real (ex: 100% em 1 voto ou 95% em 20 votos; 72% no PV com 204 votos ou 72% no PDT com 668 votos). A ordenação prioriza quem sustentou alta concordância em um volume maior de votações, evitando que um único voto isolado de suplente ou micropartido assuma o topo do ranking. Conforme o volume de votos cresce (dezenas ou centenas de votos), a influência da suavização se dissipa e a taxa percentual real de concordância prevalece naturalmente, sem privilegiar bancadas maiores apenas pela quantidade de membros.
            </p>
          </div>
        </div>
      </section>

      {/* MÚLTIPLAS VOTAÇÕES DE UM MESMO PROJETO */}
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
                Apresentada como a deliberação principal do projeto. É a votação substantiva central onde o plenário decide pela aprovação ou rejeição da matéria (Texto-Base, Substitutivo, Turnos de PEC ou Projeto de Lei de Conversão com registro nominal individual de votos).
              </p>
            </div>

            {/* 2. Destaques e Emendas */}
            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 text-xs space-y-2">
              <span className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 text-sm">
                <span>2. Destaques & Emendas</span>
              </span>
              <p className="text-muted-foreground leading-relaxed text-xs">
                Votações pontuais (DTQ / DVS / Emendas) para manter, suprimir ou alterar regras específicas. No LegisVisão, você pode expandir a matéria e opinar individualmente em cada destaque nominal registrado.
              </p>
            </div>

            {/* 3. Requerimentos Procedimentais */}
            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs space-y-2">
              <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 text-sm">
                <span>3. Requerimentos de Pauta</span>
              </span>
              <p className="text-muted-foreground leading-relaxed text-xs">
                Manobras de regimento interno (ex: Retirada de Pauta, Adiamento da Votação, Urgência). Utilizadas como tática parlamentar e desconsideradas na pontuação de afinidade.
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-xl bg-muted/60 border border-border text-xs text-foreground space-y-3">
            <span className="font-bold text-primary block text-sm">🎯 Como funciona a Opinião Granular por Destaques e Mérito?</span>
            <p className="text-muted-foreground text-xs leading-relaxed">
              <strong>Você tem controle total sobre o nível de detalhamento do seu posicionamento.</strong> É possível opinar apenas sobre o mérito principal da lei ou abrir o expansor de deliberações para registrar sua opinião em destaques e emendas nominais específicas. Todas as seções em que você registrar uma opinião são comparadas com o voto correspondente dos parlamentares no Plenário, com peso equivalente no cálculo de afinidade.
            </p>
            <div className="pt-1 p-3.5 rounded-lg bg-background/80 border border-border/70 space-y-1.5">
              <span className="font-semibold text-foreground text-xs block">💡 E as proposições deliberadas por votação simbólica?</span>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Quando o texto-base de um projeto é aprovado ou rejeitado simbolicamente (por aclamação ou acordo de lideranças, sem registro individual no painel eletrônico), a matéria não possui votação nominal de mérito. O LegisVisão disponibiliza essas matérias em modo de consulta com histórico completo de tramitação e permite opinar nas emendas e destaques nominais caso existam, preservando a exatidão matemática dos índices.
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
              Para eleger qual deliberação é exibida como destaque principal no cartão da proposta de lei de forma <strong>100% determinística, auditável e reproduzível</strong>, o sistema segue quatro níveis ordenados:
            </p>
            <ol className="list-decimal pl-4 space-y-1.5 text-muted-foreground text-xs leading-relaxed">
              <li>
                <strong>Nível 1 (Relevância de Mérito Estrito):</strong> Prioridade máxima para deliberações de Mérito e Texto-Base (1º e 2º turnos de PECs, Substitutivos, Projetos de Lei de Conversão e Pareceres de Mérito) sobre Emendas ou Destaques.
              </li>
              <li>
                <strong>Nível 2 (Presença Obrigatória de Votos Nominais):</strong> Exige votos nominais válidos registrados no painel eletrônico (Sim/Não), desconsiderando sessões meramente simbólicas (0 votos nominais).
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
    </>
  );
}
