import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActiveDatasetVersion, withServerCache } from "@/lib/server-cache";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await withServerCache("api_metadata", async () => {
      const datasetVersion = await getActiveDatasetVersion();
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

      const sourceInfo = sources[0] || null;
      const lastUpdated = sourceInfo?.last_successful_sync || sourceInfo?.last_sync || new Date().toISOString();

      return {
        datasetVersion: datasetVersion || lastUpdated,
        lastUpdated,
        source: sourceInfo,
      };
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Erro em GET /api/metadata:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor ao obter metadados." },
      { status: 500 }
    );
  }
}
