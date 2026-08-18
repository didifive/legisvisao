import type { Metadata } from "next";
import VoteForm from "./components/VoteForm";

export const metadata: Metadata = {
  title: "Simulador de Votação | Como você votaria?",
  description:
    "Opine sobre as principais propostas de lei e projetos deliberados no Plenário da Câmara dos Deputados para descobrir sua afinidade política.",
};

export default function OpiniaoPage() {
  return (
    <main className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Como você votaria?</h1>
      <VoteForm />
    </main>
  );
}
