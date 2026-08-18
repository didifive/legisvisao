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
          records_count,
          records_updated,
          records_inserted,
          dataset_version,
          last_error
        FROM sync_control
        ORDER BY source ASC;
      `;

      return {
        sources,
        lastCheckedAt: new Date().toISOString(),
      };
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Erro ao buscar status de sincronização:", error);
    return NextResponse.json(
      { error: "Erro ao consultar status das fontes oficiais." },
      { status: 500 }
    );
  }
}
