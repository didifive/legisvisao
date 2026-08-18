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
          records_count,
          records_updated,
          records_inserted,
          dataset_version,
          last_error
        FROM sync_control
        ORDER BY source ASC;
      `;

      let lastUpdated: string | null = null;
      if (sources.length > 0) {
        const latestTime = sources.reduce((max, s) => {
          const t = new Date(s.last_successful_sync || s.last_sync).getTime();
          return t > max ? t : max;
        }, 0);
        if (latestTime > 0) {
          lastUpdated = new Date(latestTime).toISOString();
        }
      }

      return {
        datasetVersion: datasetVersion || lastUpdated || new Date().toISOString(),
        lastUpdated: lastUpdated || new Date().toISOString(),
        sources,
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
