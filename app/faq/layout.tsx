import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ e Status das Fontes Oficiais",
  description:
    "Entenda a metodologia do LegisVisão, a fonte pública de dados abertos da Câmara dos Deputados e como funciona o cálculo de afinidade.",
};

export default function FAQLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
