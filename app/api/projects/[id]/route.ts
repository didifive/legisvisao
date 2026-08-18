import { db } from "@/lib/db";
import { VoteDetailRow, LegislativePhase, ProjectVoteSessionRow, ProjectHouseRecord, LegislativeProject } from "@/types/db";
import { NextRequest, NextResponse } from "next/server";
import { withServerCache } from "@/lib/server-cache";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = Number.parseInt(id, 10);

    if (Number.isNaN(projectId)) {
      return NextResponse.json(
        { error: "ID de projeto inválido." },
        { status: 400 }
      );
    }

    const cacheKey = `project_detail_${projectId}`;

    const data = await withServerCache(cacheKey, async () => {
      // 1. Buscar projeto canônico
      const projectsResult = await db<LegislativeProject[]>`
        SELECT * FROM legislative_projects WHERE id = ${projectId} LIMIT 1;
      `;

      if (projectsResult.length === 0) {
        return null;
      }

      const project = projectsResult[0];

      // 2. Buscar registros por casa legislativa (Câmara / Senado)
      const houseRecords = await db<ProjectHouseRecord[]>`
        SELECT * FROM project_house_records
        WHERE project_id = ${projectId}
        ORDER BY house ASC;
      `;

      const houseRecordIds = houseRecords.map((r) => r.id);

      // 3. Buscar fases legislativas
      let phases: LegislativePhase[] = [];
      if (houseRecordIds.length > 0) {
        phases = await db<LegislativePhase[]>`
          SELECT * FROM legislative_phases
          WHERE house_record_id = ANY(${houseRecordIds})
          ORDER BY phase_order ASC;
        `;
      }

      // 4. Buscar sessões de votação
      let sessions: ProjectVoteSessionRow[] = [];
      let votes: VoteDetailRow[] = [];

      if (houseRecordIds.length > 0) {
        sessions = await db<ProjectVoteSessionRow[]>`
          SELECT 
            vs.id,
            vs.house_record_id,
            vs.phase_id,
            vs.external_vote_id,
            vs.date,
            vs.description,
            vs.result,
            phr.house,
            lp.phase_name
          FROM vote_sessions vs
          JOIN project_house_records phr ON phr.id = vs.house_record_id
          LEFT JOIN legislative_phases lp ON lp.id = vs.phase_id
          WHERE vs.house_record_id = ANY(${houseRecordIds})
          ORDER BY vs.date DESC;
        `;

        if (sessions.length > 0) {
          const sessionIds = sessions.map((s) => s.id);

          // 5. Buscar votos nominais com valor original e filiação direta no momento da votação
          votes = await db<VoteDetailRow[]>`
            SELECT 
              pv.id,
              pv.vote_session_id,
              pv.politician_id,
              pv.party_id,
              pv.vote_original,
              p.name AS politician_name,
              p.type AS politician_type,
              p.state AS politician_state,
              part.sigla AS party_sigla
            FROM politician_votes pv
            JOIN vote_sessions vs
              ON vs.id = pv.vote_session_id
            JOIN politicians p 
              ON pv.politician_id = p.id
            LEFT JOIN political_parties part
              ON part.id = pv.party_id
            WHERE pv.vote_session_id = ANY(${sessionIds})
            ORDER BY p.name ASC;
          `;
        }
      }

      return {
        project,
        houseRecords,
        phases,
        sessions,
        votes,
      };
    });

    if (!data) {
      return NextResponse.json(
        { error: "Projeto não encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Erro em GET /api/projects/[id]:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor ao buscar detalhes do projeto." },
      { status: 500 }
    );
  }
}
