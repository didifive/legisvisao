import type { Metadata } from "next";
import { urls, appConfig } from "@/lib/urls";

export const siteConfig = {
  name: "LegisVisão",
  title: "LegisVisão | Transparência Legislativa e Afinidade com Propostas Reais",
  description:
    "Analise propostas legislativas reais da Câmara dos Deputados e do Senado Federal e descubra quais parlamentares e partidos têm maior afinidade com seus posicionamentos. 100% privado, local e transparente.",
  url: appConfig.url,
  keywords: [
    "legisvisao",
    "transparencia legislativa",
    "camara dos deputados",
    "senado federal",
    "projetos de lei",
    "proposicoes legislativas",
    "afinidadade partidaria",
    "posicionamentos parlamentares",
    "deputados federais",
    "senadores",
    "transparencia publica",
    "congresso nacional",
    "luis zancanela",
  ],
  author: {
    name: "Luis Zancanela",
    email: urls.email,
    linkedin: urls.linkedin,
    github: urls.github,
    website: urls.website,
  },
  locale: "pt-BR",
  type: "website",
};

export const defaultMetadata: Metadata = {
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  authors: [{ name: siteConfig.author.name, url: siteConfig.author.website }],
  creator: siteConfig.author.name,
  publisher: siteConfig.author.name,
  metadataBase: new URL(siteConfig.url),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: siteConfig.url,
    title: siteConfig.title,
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [
      {
        url: "/og-image",
        width: 1200,
        height: 630,
        alt: siteConfig.title,
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
    creator: "@didifive",
    images: ["/og-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};
