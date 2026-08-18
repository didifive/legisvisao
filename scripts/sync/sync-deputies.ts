// ====================================================================
// LegisVisão - Sincronização de Deputados Federais (57ª Legislatura)
// ====================================================================
import { sql, CAMARA_API_BASE, fetchWithRetry } from "./client";

interface CamaraDeputyItem {
  id: number;
  uri: string;
  nome: string;
  siglaPartido: string;
  uriPartido: string;
  siglaUf: string;
  idLegislatura: number;
  urlFoto: string;
  email: string | null;
}

export interface SyncDeputiesResult {
  total: number;
  inserted: number;
  updated: number;
  deputyMap: Map<number, { nome: string; partido: string; uf: string }>;
}

export async function syncDeputies(partyMap: Map<string, number>): Promise<SyncDeputiesResult> {
  console.log("🚩 [Deputados] Sincronizando Deputados Federais da 57ª Legislatura (2023-2027)...");

  const res = await fetchWithRetry(`${CAMARA_API_BASE}/deputados?idLegislatura=57&itens=1000&ordem=ASC&ordenarPor=nome`);
  if (!res.ok) {
    throw new Error(`Erro ao consultar API de deputados: HTTP ${res.status}`);
  }

  const json = await res.json();
  const deputies: CamaraDeputyItem[] = json.dados || [];

  let inserted = 0;
  let updated = 0;
  const deputyMap = new Map<number, { nome: string; partido: string; uf: string }>();
  const partyCounts = new Map<string, number>();

  for (const dep of deputies) {
    const siglaPartido = dep.siglaPartido ? dep.siglaPartido.trim().toUpperCase() : "SEM PARTIDO";
    const siglaUf = dep.siglaUf ? dep.siglaUf.trim().toUpperCase() : "BR";

    deputyMap.set(dep.id, {
      nome: dep.nome.trim(),
      partido: siglaPartido,
      uf: siglaUf,
    });

    partyCounts.set(siglaPartido, (partyCounts.get(siglaPartido) || 0) + 1);

    // Garantir que o partido existe na tabela parties antes da foreign key
    if (!partyMap.has(siglaPartido)) {
      await sql`
        INSERT INTO parties (id, sigla, nome, total_membros)
        VALUES (${dep.id * 1000}, ${siglaPartido}, ${siglaPartido}, 0)
        ON CONFLICT (sigla) DO NOTHING;
      `;
      partyMap.set(siglaPartido, dep.id * 1000);
    }

    const result = await sql`
      INSERT INTO deputies (
        id, nome, nome_eleitoral, sigla_partido, sigla_uf,
        url_foto, email, situacao, legislatura, is_active
      )
      VALUES (
        ${dep.id},
        ${dep.nome.trim()},
        ${dep.nome.trim()},
        ${siglaPartido},
        ${siglaUf},
        ${dep.urlFoto || null},
        ${dep.email || null},
        'Exercício',
        57,
        TRUE
      )
      ON CONFLICT (id) DO UPDATE SET
        nome = EXCLUDED.nome,
        nome_eleitoral = EXCLUDED.nome_eleitoral,
        sigla_partido = EXCLUDED.sigla_partido,
        sigla_uf = EXCLUDED.sigla_uf,
        url_foto = EXCLUDED.url_foto,
        email = EXCLUDED.email,
        situacao = EXCLUDED.situacao,
        is_active = EXCLUDED.is_active
      RETURNING (xmax = 0) AS is_insert;
    `;

    if (result.length > 0) {
      if (result[0].is_insert) inserted++;
      else updated++;
    }
  }

  // Atualiza a contagem de membros de cada partido
  for (const [sigla, count] of partyCounts.entries()) {
    await sql`
      UPDATE parties 
      SET total_membros = ${count} 
      WHERE sigla = ${sigla};
    `;
  }

  console.log(`✅ [Deputados] ${deputies.length} deputados federais sincronizados (${inserted} novos, ${updated} atualizados).`);

  return {
    total: deputies.length,
    inserted,
    updated,
    deputyMap,
  };
}
