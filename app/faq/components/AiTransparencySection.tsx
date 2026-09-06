import {
  FaRobot,
  FaBalanceScale,
} from "react-icons/fa";

export function AiTransparencySection() {
  return (
    <>
      {/* COMO A INTELIGÊNCIA ARTIFICIAL É UTILIZADA NO LEGISVISÃO */}
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

      {/* AVISO LEGAL DE NEUTRALIDADE CÍVICA */}
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
    </>
  );
}
