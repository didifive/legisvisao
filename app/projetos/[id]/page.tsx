import { notFound } from "next/navigation";
import ProjectDetailsClient from "./ProjectDetailsClient";
import { db } from "@/lib/db";
import type { Metadata } from "next";
import type {
  LegislativeProject,
  ProjectHouseRecord,
  LegislativePhase,
  ProjectVoteSessionRow,
  VoteDetailRow,
} from "@/types/db";

export async function generateMetadata(
  props: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await props.params;
  const projectId = Number(id);
  if (isNaN(projectId)) return { title: "Projeto não encontrado" };

  const projectRes = await db<LegislativeProject[]>`
    SELECT title, canonical_id, type, number, year, description
    FROM legislative_projects
    WHERE id = ${projectId}
    LIMIT 1;
  `;
  if (!projectRes || projectRes.length === 0) {
    return { title: "Projeto não encontrado" };
  }

  const p = projectRes[0];
  const ident = p.canonical_id || `${p.type} ${p.number}/${p.year}`;

  return {
    title: `${ident} - ${p.title} | Detalhes e Votações Nominais`,
    description: p.description
      ? `${p.description.slice(0, 160)}...`
      : `Veja o histórico de deliberações e os votos nominais de deputados e senadores sobre ${ident}.`,
  };
}

export default async function ProjectPage(
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  const projectId = Number(id);

  if (isNaN(projectId)) {
    notFound();
  }

  // 1. Buscar projeto canônico
  const projectsResult = await db<LegislativeProject[]>`
    SELECT * FROM legislative_projects WHERE id = ${projectId} LIMIT 1;
  `;

  if (!projectsResult || projectsResult.length === 0) {
    notFound();
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

      // 5. Buscar votos nominais
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
        JOIN vote_sessions vs ON vs.id = pv.vote_session_id
        JOIN politicians p ON pv.politician_id = p.id
        LEFT JOIN political_parties part ON part.id = pv.party_id
        WHERE pv.vote_session_id = ANY(${sessionIds})
        ORDER BY p.name ASC;
      `;
    }
  }

  return (
    <ProjectDetailsClient
      project={project}
      houseRecords={houseRecords}
      phases={phases}
      sessions={sessions}
      votes={votes}
    />
  );
}
