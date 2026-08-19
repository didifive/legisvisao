import type { Metadata } from "next";
import VoteForm from "./components/VoteForm";

export const metadata: Metadata = {
  title: "Simulador de Votação | Como você votaria?",
  description:
    "Opine sobre as principais propostas de lei e projetos deliberados no Plenário da Câmara dos Deputados para descobrir sua afinidade política.",
};

export default function OpiniaoPage() {
  return (
    <main className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Simulador de Votação
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Leia o resumo das leis reais votadas no Congresso e clique em <strong>CONCORDO</strong> ou <strong>DISCORDO</strong>. Com poucas respostas, você descobre quais deputados federais e partidos pensam como você.
        </p>
      </div>
      <VoteForm />
    </main>
  );
}
