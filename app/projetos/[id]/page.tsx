import { notFound } from "next/navigation";
import ProjectDetailsClient from "./ProjectDetailsClient";
import { db } from "@/lib/db";
import type { Metadata } from "next";
import type { Proposition, VoteSession } from "@/types/db";

export async function generateMetadata(
  props: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await props.params;
  const propId = Number(id);
  if (isNaN(propId)) return { title: "Proposição não encontrada" };

  const propRes = await db<Proposition[]>`
    SELECT id, titulo, sigla_tipo, numero, ano, ementa
    FROM propositions
    WHERE id = ${propId}
    LIMIT 1;
  `;
  if (!propRes || propRes.length === 0) {
    return { title: "Proposição não encontrada" };
  }

  const p = propRes[0];

  return {
    title: `${p.titulo} | Detalhes e Votações Nominais na Câmara`,
    description: p.ementa
      ? `${p.ementa.slice(0, 160)}...`
      : `Veja o histórico de deliberações e os votos nominais dos deputados federais sobre ${p.titulo}.`,
  };
}

export default async function ProjectPage(
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  const propId = Number(id);

  if (isNaN(propId)) {
    notFound();
  }

  // 1. Buscar proposição
  const propResult = await db<Proposition[]>`
    SELECT * FROM propositions WHERE id = ${propId} LIMIT 1;
  `;

  if (!propResult || propResult.length === 0) {
    notFound();
  }

  const proposition = propResult[0];

  // 2. Buscar sessões de votação
  const sessions = await db<VoteSession[]>`
    SELECT * FROM vote_sessions
    WHERE proposicao_id = ${propId}
    ORDER BY data_hora DESC;
  `;

  const sessionIds = sessions.map((s) => s.id);

  // 3. Buscar votos nominais dos deputados
  let votes: Array<{
    id: number;
    votacao_id: string;
    deputado_id: number;
    sigla_partido: string;
    voto_original: string;
    deputado_nome: string;
    deputado_uf: string;
    deputado_foto: string | null;
  }> = [];

  if (sessionIds.length > 0) {
    votes = await db`
      SELECT 
        dv.id,
        dv.votacao_id,
        dv.deputado_id,
        dv.sigla_partido,
        dv.voto_original,
        d.nome_eleitoral AS deputado_nome,
        d.sigla_uf AS deputado_uf,
        d.url_foto AS deputado_foto
      FROM deputy_votes dv
      JOIN deputies d ON d.id = dv.deputado_id
      WHERE dv.votacao_id = ANY(${sessionIds})
      ORDER BY d.nome_eleitoral ASC;
    `;
  }

  return (
    <ProjectDetailsClient
      proposition={proposition}
      sessions={sessions}
      votes={votes}
    />
  );
}
