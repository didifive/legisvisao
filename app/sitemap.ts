import { MetadataRoute } from "next";
import { siteConfig } from "@/lib/metadata";
import { db } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteConfig.url;
  const lastModified = new Date();

  // Rotas estáticas centrais
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/opiniao`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/opiniao/revisao`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/afinidade`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];

  try {
    // 1. Deputados Federais
    const deputies = await db<Array<{ id: number }>>`SELECT id FROM deputies WHERE is_active = TRUE`;
    const deputyRoutes: MetadataRoute.Sitemap = deputies.map((d) => ({
      url: `${baseUrl}/politicos/${d.id}`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    // 2. Proposições Legislativas
    const propositions = await db<Array<{ id: number }>>`SELECT id FROM propositions`;
    const propositionRoutes: MetadataRoute.Sitemap = propositions.map((p) => ({
      url: `${baseUrl}/projetos/${p.id}`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    // 3. Partidos Políticos
    const parties = await db<Array<{ id: number }>>`SELECT id FROM parties`;
    const partyRoutes: MetadataRoute.Sitemap = parties.map((pt) => ({
      url: `${baseUrl}/partidos/${pt.id}`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.7,
    }));

    return [...staticRoutes, ...deputyRoutes, ...propositionRoutes, ...partyRoutes];
  } catch (error) {
    console.error("Erro ao gerar sitemap dinâmico:", error);
    return staticRoutes;
  }
}
