import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withServerCache } from "@/lib/server-cache";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await withServerCache("api_sync_status", async () => {
      const sources = await db`
        SELECT 
          source, 
          name, 
          official_url, 
          last_sync, 
          last_successful_sync,
          status, 
          total_deputies,
          total_propositions,
          total_vote_sessions,
          total_votes,
          dataset_version,
          last_error
        FROM sync_control
        WHERE source = 'CAMARA'
        LIMIT 1;
      `;

      const sourceRow = sources && sources.length > 0 ? sources[0] : null;

      const defaultCamaraSource = {
        source: "CAMARA",
        name: "Câmara dos Deputados (Dados Abertos)",
        official_url: "https://dadosabertos.camara.leg.br",
        last_sync: null,
        last_successful_sync: null,
        status: "PENDING",
        total_deputies: 0,
        total_propositions: 0,
        total_vote_sessions: 0,
        total_votes: 0,
        dataset_version: null,
        last_error: null,
      };

      const finalSource = sourceRow || defaultCamaraSource;

      return {
        source: finalSource,
        sources: [finalSource],
        lastCheckedAt: new Date().toISOString(),
      };
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Erro ao buscar status de sincronização:", error);
    const fallbackSource = {
      source: "CAMARA",
      name: "Câmara dos Deputados (Dados Abertos)",
      official_url: "https://dadosabertos.camara.leg.br",
      last_sync: null,
      last_successful_sync: null,
      status: "PENDING",
      total_deputies: 0,
      total_propositions: 0,
      total_vote_sessions: 0,
      total_votes: 0,
      dataset_version: null,
      last_error: "Aguardando conexão com banco de dados",
    };

    return NextResponse.json({
      source: fallbackSource,
      sources: [fallbackSource],
      lastCheckedAt: new Date().toISOString(),
    });
  }
}
