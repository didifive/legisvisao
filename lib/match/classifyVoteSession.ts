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

  // 1. Mérito / Texto-Base (Prioridade 1 Máxima)
  // Expressões padrão da Câmara que indicam a votação do mérito central da matéria
  if (
    descUpper.includes("PROJETO DE LEI DE CONVERSÃO") ||
    descUpper.includes("SUBSTITUTIVO") ||
    descUpper.includes("SUBEMENDA SUBSTITUTIVA") ||
    descUpper.includes("EMENDA SUBSTITUTIVA") ||
    descUpper.includes("EMENDA AGLUTINATIVA SUBSTITUTIVA") ||
    descUpper.includes("PARECER DA COMISSÃO") ||
    descUpper.includes("REDAÇÃO FINAL") ||
    descUpper.startsWith("APROVADO O PROJETO") ||
    descUpper.startsWith("APROVADA A PROPOSTA") ||
    descUpper.startsWith("APROVADA A MEDIDA PROVISÓRIA") ||
    descUpper.startsWith("REJEITADO O PROJETO") ||
    descUpper.startsWith("REJEITADA A PROPOSTA") ||
    descUpper.startsWith("REJEITADA A MEDIDA PROVISÓRIA") ||
    (descUpper.includes("PROJETO DE LEI") && !descUpper.includes("REQUERIMENTO") && !descUpper.includes("EMENDA")) ||
    (descUpper.includes("MEDIDA PROVISÓRIA") && !descUpper.includes("REQUERIMENTO") && !descUpper.includes("EMENDA"))
  ) {
    return {
      type: "MERITO",
      label: "Texto-Base / Mérito Principal",
      badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
      priority: 1,
    };
  }

  // 2. Requerimentos Procedimentais / Obstrução de Pauta (Prioridade 4)
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

  // 3. Destaques (DTQ / DVS / Votação em Separado) (Prioridade 3)
  if (
    descUpper.includes("DESTAQUE") ||
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

  // 4. Emendas ao Projeto (Prioridade 2)
  if (
    descUpper.includes("EMENDA") ||
    descUpper.includes("SUBEMENDA")
  ) {
    return {
      type: "EMENDA",
      label: "Emenda ao Projeto",
      badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
      priority: 2,
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
 * 2. Data e hora mais recente (timestamp decrescente).
 * 3. ID único da sessão na Câmara (ordem alfanumérica decrescente).
 */
export function sortVoteSessionsDeterministic<T extends {
  id?: string | number;
  data_hora?: string | null;
  descricao?: string | null;
  vote_description?: string | null;
}>(sessions: T[]): Array<T & { classification: SessionClassification }> {
  const withClass = sessions.map((s) => ({
    ...s,
    classification: classifyVoteSession(s.vote_description || s.descricao || ""),
  }));

  return withClass.sort((a, b) => {
    // 1. Prioridade do tipo de deliberação
    if (a.classification.priority !== b.classification.priority) {
      return a.classification.priority - b.classification.priority;
    }

    // 2. Data/hora mais recente
    const timeA = a.data_hora ? new Date(a.data_hora).getTime() : 0;
    const timeB = b.data_hora ? new Date(b.data_hora).getTime() : 0;
    if (timeB !== timeA) {
      return timeB - timeA;
    }

    // 3. ID único para garantia de determinismo absoluto
    const idA = String(a.id || "");
    const idB = String(b.id || "");
    return idB.localeCompare(idA);
  });
}
