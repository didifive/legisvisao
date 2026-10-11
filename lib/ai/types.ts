// ====================================================================
// LegisVisão - Tipos do Módulo de IA (Google AI Studio / Gemini API)
// ====================================================================

export type DeliberationType = "MERITO" | "DESTAQUE" | "EMENDA" | "REQUERIMENTO" | "OUTRO";

export interface GeminiModelInfo {
  name: string;
  displayName: string;
  inputTokenLimit: number;
  outputTokenLimit: number;
  supportedMethods: string[];
}

export interface ModelQuotaInfo {
  nome: string;
  rpm: number;
  tpm: string;
  rpd: number;
  isFreeTier: boolean;
  categoria: "texto" | "embedding" | "outros";
}

export interface PropositionSummaryContext {
  proposicaoId: number;
  titulo: string;
  ementa: string;
  ementaDetalhada?: string | null;
  tema?: string | null;
  urlInteiroTeor?: string | null;
}

export interface PropositionSummaryResult {
  resumo_geral: string;
}

export interface GeminiSessionEnrichment {
  tipo_deliberacao: DeliberationType;
  titulo_amigavel: string;
  resumo_simplificado: string;
  pergunta_cidadao: string;
}

export interface SessionContextData {
  sessionId: string;
  proposicaoId: number;
  proposicaoTitulo: string;
  proposicaoEmenta: string;
  sessionDescricao: string;
  sessionResultado?: string | null;
}

export interface PropositionWithSessionsContext {
  proposicaoId: number;
  titulo: string;
  ementa: string;
  ementaDetalhada?: string | null;
  tema?: string | null;
  urlInteiroTeor?: string | null;
  sessoes: Array<{
    id: string;
    descricao: string;
    resultado?: string | null;
    data_hora?: string | null;
  }>;
}

export interface EnrichedSessionItem {
  id: string;
  tipo_deliberacao: DeliberationType;
  titulo_amigavel: string;
  resumo_simplificado: string;
  pergunta_cidadao: string;
}

export interface UnifiedPropositionEnrichmentResult {
  resumo_geral: string;
  sessoes: EnrichedSessionItem[];
  model_used: string;
}

export interface ModelStatus {
  cooldownUntil: number;
  isBlacklisted: boolean;
  failCount: number;
}
