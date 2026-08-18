import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withServerCache } from "@/lib/server-cache";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await withServerCache("system_status_check", async () => {
      // 1. Contagem de Proposições com Sessão de Votação
      const [propositionsRow] = await db<[{ count: string }]>`
        SELECT COUNT(DISTINCT p.id)::text AS count 
        FROM propositions p
        JOIN vote_sessions vs ON vs.proposicao_id = p.id;
      `;

      // 2. Contagem de Deputados Ativos
      const [deputiesRow] = await db<[{ count: string }]>`
        SELECT COUNT(*)::text AS count 
        FROM deputies 
        WHERE is_active = TRUE;
      `;

      // 3. Contagem de Partidos Políticos
      const [partiesRow] = await db<[{ count: string }]>`
        SELECT COUNT(*)::text AS count 
        FROM parties;
      `;

      const propositionsCount = Number.parseInt(propositionsRow?.count || "0", 10);
      const deputiesCount = Number.parseInt(deputiesRow?.count || "0", 10);
      const partiesCount = Number.parseInt(partiesRow?.count || "0", 10);

      // Sistema é considerado pronto para uso se houver propostas e deputados
      const isReady = propositionsCount > 0 && deputiesCount > 0;

      return {
        isReady,
        counts: {
          propositions: propositionsCount,
          projects: propositionsCount, // compatibilidade com clientes antigos
          deputies: deputiesCount,
          politicians: deputiesCount, // compatibilidade com clientes antigos
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
        propositions: 0,
        projects: 0,
        deputies: 0,
        politicians: 0,
        parties: 0,
      },
      error: "Não foi possível conectar ao banco de dados ou a base ainda não foi inicializada.",
      checkedAt: new Date().toISOString(),
    });
  }
}
