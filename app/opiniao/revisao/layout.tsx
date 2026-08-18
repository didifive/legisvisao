import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Minhas Opiniões | Revisão do Questionário",
  description:
    "Consulte, filtre e revise suas opiniões registradas sobre as proposições legislativas da Câmara dos Deputados.",
};

export default function RevisaoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
