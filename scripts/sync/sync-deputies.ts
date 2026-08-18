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

  const deputyMap = new Map<number, { nome: string; partido: string; uf: string }>();
  const missingPartiesMap = new Map<string, { id: number; sigla: string; nome: string; logo_url: string | null; total_membros: number }>();
  const deputiesMapToInsert = new Map<number, {
    id: number;
    nome: string;
    nome_eleitoral: string;
    sigla_partido: string;
    sigla_uf: string;
    url_foto: string | null;
    email: string | null;
    situacao: string;
    legislatura: number;
    is_active: boolean;
  }>();

  for (const dep of deputies) {
    const siglaPartido = dep.siglaPartido ? dep.siglaPartido.trim().toUpperCase() : "SEM PARTIDO";
    const siglaUf = dep.siglaUf ? dep.siglaUf.trim().toUpperCase() : "BR";

    deputyMap.set(dep.id, {
      nome: dep.nome.trim(),
      partido: siglaPartido,
      uf: siglaUf,
    });

    if (!partyMap.has(siglaPartido) && !missingPartiesMap.has(siglaPartido)) {
      const generatedId = Math.abs(dep.id * 1000);
      partyMap.set(siglaPartido, generatedId);
      missingPartiesMap.set(siglaPartido, {
        id: generatedId,
        sigla: siglaPartido,
        nome: siglaPartido,
        logo_url: null,
        total_membros: 0,
      });
    }

    // Usar Map por dep.id para garantir unicidade absoluta no lote do Postgres
    deputiesMapToInsert.set(dep.id, {
      id: dep.id,
      nome: dep.nome.trim(),
      nome_eleitoral: dep.nome.trim(),
      sigla_partido: siglaPartido,
      sigla_uf: siglaUf,
      url_foto: dep.urlFoto || null,
      email: dep.email || null,
      situacao: "Exercício",
      legislatura: 57,
      is_active: true,
    });
  }

  const missingParties = Array.from(missingPartiesMap.values());
  const deputiesToInsert = Array.from(deputiesMapToInsert.values());

  // 1. Inserir eventuais partidos faltantes em lote
  if (missingParties.length > 0) {
    await sql`
      INSERT INTO parties ${sql(missingParties, "id", "sigla", "nome", "logo_url", "total_membros")}
      ON CONFLICT (sigla) DO NOTHING;
    `;
  }

  // 2. Inserir todos os deputados únicos em um único lote (Bulk Insert)
  let inserted = 0;
  let updated = 0;

  if (deputiesToInsert.length > 0) {
    const result = await sql`
      INSERT INTO deputies ${sql(
        deputiesToInsert,
        "id",
        "nome",
        "nome_eleitoral",
        "sigla_partido",
        "sigla_uf",
        "url_foto",
        "email",
        "situacao",
        "legislatura",
        "is_active"
      )}
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

    inserted = result.filter((r) => r.is_insert).length;
    updated = result.length - inserted;
  }

  // 3. Atualizar a contagem total de membros de cada partido em uma única query otimizada
  await sql`
    UPDATE parties p
    SET total_membros = COALESCE(sub.cnt, 0)
    FROM (
      SELECT sigla_partido, COUNT(*) as cnt
      FROM deputies
      WHERE is_active = TRUE
      GROUP BY sigla_partido
    ) sub
    WHERE p.sigla = sub.sigla_partido;
  `;

  console.log(`✅ [Deputados] ${deputiesToInsert.length} deputados federais únicos sincronizados em lote (${inserted} novos, ${updated} atualizados).`);

  return {
    total: deputiesToInsert.length,
    inserted,
    updated,
    deputyMap,
  };
}
