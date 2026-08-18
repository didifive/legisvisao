import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resultado de Afinidade | Deputados Federais e Partidos",
  description:
    "Veja o índice de afinidade e alinhamento do seu posicionamento com os 513 Deputados Federais e bancadas partidárias da Câmara dos Deputados.",
};

export default function AfinidadeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
