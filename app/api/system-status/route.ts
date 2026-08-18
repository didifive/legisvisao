import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withServerCache } from "@/lib/server-cache";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await withServerCache("system_status_check", async () => {
      // 1. Contagem de Proposições com Sessão de Votação
      const [projectsRow] = await db<[{ count: string }]>`
        SELECT COUNT(DISTINCT p.id)::text AS count 
        FROM legislative_projects p
        JOIN project_house_records phr ON phr.project_id = p.id
        JOIN vote_sessions vs ON vs.house_record_id = phr.id;
      `;

      // 2. Contagem de Parlamentares Ativos
      const [politiciansRow] = await db<[{ count: string }]>`
        SELECT COUNT(*)::text AS count 
        FROM politicians 
        WHERE is_active = TRUE;
      `;

      // 3. Contagem de Partidos Políticos
      const [partiesRow] = await db<[{ count: string }]>`
        SELECT COUNT(*)::text AS count 
        FROM political_parties;
      `;

      const projectsCount = Number.parseInt(projectsRow?.count || "0", 10);
      const politiciansCount = Number.parseInt(politiciansRow?.count || "0", 10);
      const partiesCount = Number.parseInt(partiesRow?.count || "0", 10);

      // Sistema é considerado pronto para uso se houver propostas e parlamentares
      const isReady = projectsCount > 0 && politiciansCount > 0;

      return {
        isReady,
        counts: {
          projects: projectsCount,
          politicians: politiciansCount,
          parties: partiesCount,
        },
        checkedAt: new Date().toISOString(),
      };
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Erro ao verificar system-status:", error);
    // Em caso de falha de conexão ou tabela inexistente, retorna isReady: false de forma segura
    return NextResponse.json({
      isReady: false,
      counts: {
        projects: 0,
        politicians: 0,
        parties: 0,
      },
      error: "Não foi possível conectar ao banco de dados ou a base ainda não foi inicializada.",
      checkedAt: new Date().toISOString(),
    });
  }
}
