// ====================================================================
// LegisVisão - Normalização de Votos e Posicionamentos
// ====================================================================

/**
 * Normaliza qualquer formato de resposta do visitante ou voto original da API
 * para os valores estritamente comparáveis: "SIM" ou "NÃO".
 * 
 * Valores que não representam posicionamento de mérito (Abstenção, Obstrução,
 * Art. 17, Ausência, etc.) retornam null e são ignorados nos cálculos.
 */
export function normalizeVote(v?: string | null): "SIM" | "NÃO" | null {
  if (!v) return null;
  const s = v
    .toString()
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // Remove acentos para comparação uniforme

  // Casos Afirmativos
  if (
    s === "SIM" ||
    s === "S" ||
    s === "Y" ||
    s === "YES" ||
    s === "CONCORDO" ||
    s === "FAVORAVEL" ||
    s === "SIM-SIM" ||
    s.startsWith("SIM")
  ) {
    return "SIM";
  }

  // Casos Negativos
  if (
    s === "NAO" ||
    s === "N" ||
    s === "NO" ||
    s === "DISCORDO" ||
    s === "CONTRARIO" ||
    s === "NAO-NAO" ||
    s.startsWith("NAO")
  ) {
    return "NÃO";
  }

  // Valores deliberadamente ignorados no cálculo de afinidade:
  // - ABSTENCAO, OBSTRUCAO, ART. 17, PRESENTE, AUSENTE, LICENCA, FALTA, LIBERADO, OUTROS
  return null;
}

/**
 * Verifica se um voto original é elegível para cálculo de afinidade
 */
export function isComparableVote(v?: string | null): boolean {
  return normalizeVote(v) !== null;
}
