// ====================================================================
// LegisVisão - Classificador Oficial de Deliberações do Plenário
// Alinhado com a metodologia cívica determinística e as 3 categorias do FAQ
// ====================================================================

export interface SessionClassification {
  type: "MERITO" | "DESTAQUE" | "EMENDA" | "REQUERIMENTO" | "OUTRO";
  label: string;
  badgeClass: string;
  priority: number;
}

/**
 * Classifica a sessão de votação nominal do plenário com base na descrição oficial da Câmara.
 * 
 * Ordem de Prioridade Determinística:
 * 1. Mérito / Texto-Base (Prioridade 1): Texto-Base, Substitutivos, Projetos de Lei de Conversão, Redação Final.
 * 2. Emendas ao Projeto (Prioridade 2): Emendas de Plenário, Emendas de Comissão, Emendas Aglutinativas.
 * 3. Destaques (Prioridade 3): Destaques para Votação em Separado (DTQ / DVS), Manutenção/Supressão de texto.
 * 4. Requerimentos de Pauta (Prioridade 4): Retirada de Pauta, Adiamento, Urgência, Preferência.
 */
export function classifyVoteSession(descricao?: string | null): SessionClassification {
  const descUpper = (descricao || "").toUpperCase().trim();

  if (!descUpper) {
    return {
      type: "OUTRO",
      label: "Deliberação em Plenário",
      badgeClass: "bg-muted text-muted-foreground border-border",
      priority: 2,
    };
  }

  // 1. Requerimentos Procedimentais / Obstrução de Pauta (Prioridade 4)
  // Verificados primeiro para evitar falsos positivos
  if (
    descUpper.includes("REQUERIMENTO") ||
    descUpper.includes("RETIRADA DE PAUTA") ||
    descUpper.includes("ADIAMENTO") ||
    descUpper.includes("URGÊNCIA") ||
    descUpper.includes("PREFERÊNCIA") ||
    descUpper.includes("INTERSTÍCIO") ||
    descUpper.includes("RECURSO Nº")
  ) {
    return {
      type: "REQUERIMENTO",
      label: "Requerimento de Pauta",
      badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
      priority: 4,
    };
  }

  // 2. Destaques para Votação em Separado (Prioridade 3)
  // (Nota: "ressalvados os destaques" no texto de aprovação de mérito NÃO é um destaque)
  if (
    descUpper.startsWith("DESTAQUE") ||
    descUpper.includes("DTQ") ||
    descUpper.includes("DVS") ||
    descUpper.includes("VOTAÇÃO EM SEPARADO") ||
    descUpper.startsWith("MANTIDO O TEXTO") ||
    descUpper.startsWith("SUPRIMIDO O TEXTO")
  ) {
    return {
      type: "DESTAQUE",
      label: "Destaque / Votação em Separado",
      badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
      priority: 3,
    };
  }

  // 3. Emendas ao Projeto (Prioridade 2)
  if (
    descUpper.startsWith("EMENDA") ||
    descUpper.startsWith("SUBEMENDA") ||
    descUpper.includes("EMENDA DE PLENÁRIO") ||
    descUpper.includes("EMENDA DE RELATOR")
  ) {
    return {
      type: "EMENDA",
      label: "Emenda ao Projeto",
      badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
      priority: 2,
    };
  }

  // 4. Mérito / Texto-Base (Prioridade 1 Máxima)
  // Deliberações sobre o mérito substantivo, incluindo 1º e 2º turnos de PECs, Substitutivos e Projetos
  if (
    descUpper.includes("TURNO") ||
    descUpper.includes("TEXTO-BASE") ||
    descUpper.includes("TEXTO BASE") ||
    descUpper.includes("PROJETO DE LEI DE CONVERSÃO") ||
    descUpper.includes("SUBSTITUTIVO") ||
    descUpper.includes("SUBEMENDA SUBSTITUTIVA") ||
    descUpper.includes("EMENDA SUBSTITUTIVA") ||
    descUpper.includes("EMENDA AGLUTINATIVA") ||
    descUpper.includes("PARECER DA COMISSÃO") ||
    descUpper.includes("REDAÇÃO FINAL") ||
    descUpper.includes("PROPOSTA DE EMENDA À CONSTITUIÇÃO") ||
    descUpper.includes("PROPOSTA DE EMENDA A CONSTITUICAO") ||
    descUpper.includes("PROJETO DE LEI") ||
    descUpper.includes("MEDIDA PROVISÓRIA") ||
    descUpper.startsWith("APROVAD") ||
    descUpper.startsWith("REJEITAD")
  ) {
    return {
      type: "MERITO",
      label: "Texto-Base / Mérito Principal",
      badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
      priority: 1,
    };
  }

  return {
    type: "OUTRO",
    label: "Deliberação em Plenário",
    badgeClass: "bg-muted text-muted-foreground border-border",
    priority: 2,
  };
}

/**
 * Ordenador Determinístico de Sessões de Votação Nominal.
 * 
 * Regra de Desempate Estrito:
 * 1. Prioridade do Tipo de Deliberação (Menor número = Maior relevância de mérito: 1=Mérito Principal, 2=Emendas, 3=Destaques, 4=Requerimentos).
 * 2. Presença de votos nominais (prioriza deliberações com votos registrados sobre redações finais meramente simbólicas).
 * 3. Data e hora mais recente (timestamp decrescente: 2º turno antes de 1º turno).
 * 4. ID único da sessão na Câmara (ordem alfanumérica decrescente).
 */
export function sortVoteSessionsDeterministic<T extends {
  id?: string | number;
  data_hora?: string | null;
  descricao?: string | null;
  vote_description?: string | null;
  total_votos?: number | string | null;
  total_sim?: number | string | null;
  total_nao?: number | string | null;
}>(sessions: T[]): Array<T & { classification: SessionClassification }> {
  const withClass = sessions.map((s) => ({
    ...s,
    classification: classifyVoteSession(s.vote_description || s.descricao || ""),
  }));

  return withClass.sort((a, b) => {
    // 1. Prioridade do tipo de deliberação (1=Mérito, 2=Emenda, 3=Destaque, 4=Requerimento)
    if (a.classification.priority !== b.classification.priority) {
      return a.classification.priority - b.classification.priority;
    }

    // 2. Presença de votos nominais para desempate de mérito (evita redação final simbólica com 0 votos nominais)
    const votesA = Number(a.total_votos || (Number(a.total_sim || 0) + Number(a.total_nao || 0)) || 0);
    const votesB = Number(b.total_votos || (Number(b.total_sim || 0) + Number(b.total_nao || 0)) || 0);
    if (votesA > 0 && votesB === 0) return -1;
    if (votesB > 0 && votesA === 0) return 1;

    // 3. Data/hora mais recente (2º turno mais recente que 1º turno)
    const timeA = a.data_hora ? new Date(a.data_hora).getTime() : 0;
    const timeB = b.data_hora ? new Date(b.data_hora).getTime() : 0;
    if (timeB !== timeA) {
      return timeB - timeA;
    }

    // 4. ID único para garantia de determinismo absoluto
    const idA = String(a.id || "");
    const idB = String(b.id || "");
    return idB.localeCompare(idA);
  });
}

/**
 * Ordenador Determinístico de Relevância de Proposições Legislativas para o Simulador de Votação.
 * 
 * Heurística Oficial de Relevância Cívica:
 * 1. Maior Quórum Total (votos Sim + Não + Outros decrescente) - Prioriza grandes matérias de plenário.
 * 2. Menor Abstenção e Outros Tipos (total_outros crescente) - Prioriza votações conclusivas e assertivas.
 * 3. Menor Diferença Absoluta entre Sim e Não (|total_sim - total_nao| crescente) - Prioriza projetos disputados voto a voto e polarizados.
 * 4. Desempate: Data mais recente da deliberação e ID da proposição decrescente.
 */
export function sortPropositionsByRelevance<T extends {
  id: number;
  total_sim?: number | null;
  total_nao?: number | null;
  total_outros?: number | null;
  vote_session_date?: string | null;
  data_apresentacao?: string | null;
}>(propositions: T[]): T[] {
  return [...propositions].sort((a, b) => {
    // 1. Maior quórum total (Sim + Não + Outros)
    const quorumA = Number(a.total_sim || 0) + Number(a.total_nao || 0) + Number(a.total_outros || 0);
    const quorumB = Number(b.total_sim || 0) + Number(b.total_nao || 0) + Number(b.total_outros || 0);
    if (quorumB !== quorumA) {
      return quorumB - quorumA;
    }

    // 2. Menor abstenção / outros tipos
    const outrosA = Number(a.total_outros || 0);
    const outrosB = Number(b.total_outros || 0);
    if (outrosA !== outrosB) {
      return outrosA - outrosB;
    }

    // 3. Menor margem entre Sim e Não (mais disputado voto a voto)
    const diffA = Math.abs(Number(a.total_sim || 0) - Number(a.total_nao || 0));
    const diffB = Math.abs(Number(b.total_sim || 0) - Number(b.total_nao || 0));
    if (diffA !== diffB) {
      return diffA - diffB;
    }

    // 4. Data de deliberação mais recente
    const dateStrA = a.vote_session_date || a.data_apresentacao;
    const dateStrB = b.vote_session_date || b.data_apresentacao;
    const timeA = dateStrA ? new Date(dateStrA).getTime() : 0;
    const timeB = dateStrB ? new Date(dateStrB).getTime() : 0;
    if (timeB !== timeA) {
      return timeB - timeA;
    }

    // 5. Desempate estrito por ID
    return b.id - a.id;
  });
}
