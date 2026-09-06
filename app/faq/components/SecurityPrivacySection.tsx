import {
  FaShieldAlt,
  FaCodeBranch,
  FaExternalLinkAlt,
  FaQuoteLeft,
} from "react-icons/fa";
import { Button } from "@/app/components/ui/Button";

export function SecurityPrivacySection() {
  return (
    <>
      {/* PRIVACIDADE LOCAL-FIRST */}
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

      {/* PENSAMENTOS & REFLEXÕES */}
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
              Voltaire
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border shadow-soft flex flex-col justify-between space-y-3">
            <p className="text-sm italic text-foreground leading-relaxed">
              &ldquo;A dúvida é o princípio da sabedoria.&rdquo;
            </p>
            <span className="text-xs font-semibold text-primary">
              Aristóteles
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-primary/5 border border-primary/20 shadow-soft flex flex-col justify-between space-y-3">
            <p className="text-sm italic text-foreground font-medium leading-relaxed">
              &ldquo;Nenhuma fonte é completa por si só. Busque informações diversas e verificáveis para formar sua opinião.&rdquo;
            </p>
            <span className="text-xs font-bold text-primary">
              Zancanela, Luis (LegisVisão, 2026)
            </span>
          </div>
        </div>
      </section>
    </>
  );
}
