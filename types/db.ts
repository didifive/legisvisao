// ====================================================================
// LegisVisão - Tipos do Banco de Dados & Modelos Relacionais
// Foco: Câmara dos Deputados (Deputados Federais)
// ====================================================================

// 1. Partidos Políticos
export interface Party {
  id: number;
  sigla: string;
  nome: string;
  logo_url?: string | null;
  total_membros: number;
}

// 2. Deputados Federais
export interface Deputy {
  id: number;
  nome: string;
  nome_eleitoral: string;
  sigla_partido: string;
  sigla_uf: string;
  url_foto?: string | null;
  email?: string | null;
  situacao: string;
  legislatura: number;
  is_active: boolean;
}

// 3. Proposições Legislativas
export interface Proposition {
  id: number;
  sigla_tipo: string;
  numero: number;
  ano: number;
  titulo: string;
  ementa: string;
  ementa_detalhada?: string | null;
  tema?: string | null;
  url_inteiro_teor?: string | null;
  url_camara?: string | null;
  data_apresentacao?: string | null;
  ultimo_status?: string | null;
  resumo_geral?: string | null;
  ai_processed?: boolean;
  ai_processed_at?: string | null;
  ai_error?: string | null;
  last_updated_at?: string | null;
}

// 4. Sessões de Votação Nominal do Plenário
export interface VoteSession {
  id: string;
  proposicao_id: number;
  data_hora: string;
  descricao: string;
  resultado?: string | null;
  sigla_orgao: string;
  tipo_deliberacao?: "MERITO" | "DESTAQUE" | "EMENDA" | "REQUERIMENTO" | "OUTRO" | string | null;
  titulo_amigavel?: string | null;
  resumo_simplificado?: string | null;
  pergunta_cidadao?: string | null;
  ai_processed?: boolean;
  ai_processed_at?: string | null;
  ai_error?: string | null;
}

// 5. Votos Nominais dos Deputados
export interface DeputyVote {
  id: number;
  votacao_id: string;
  deputado_id: number;
  sigla_partido?: string | null;
  voto_original: string;
}

// 6. Controle de Sincronização
export interface SyncControl {
  source: string;
  name: string | null;
  official_url: string | null;
  last_sync: string;
  last_successful_sync: string | null;
  status: string;
  total_deputies: number;
  total_propositions: number;
  total_vote_sessions: number;
  total_votes: number;
  dataset_version: string | null;
  last_error: string | null;
}

// ====================================================================
// Tipos de Consulta, Visões e Motor de Afinidade (BFF & Frontend)
// ====================================================================

export interface StateRow {
  state: string;
  total_deputies?: number;
}

export interface UserOpinion {
  propositionId: number;
  userVote: "Sim" | "Não" | "Pular";
}

export interface DeputySearchResult {
  id: number;
  nome: string;
  nome_eleitoral: string;
  sigla_partido: string;
  sigla_uf: string;
  url_foto?: string | null;
  email?: string | null;
  situacao?: string;
  matches_count: number;
  comparable_count: number;
  adherence: number | null;
}

export interface DeputyVoteDetail {
  vote_id: number;
  votacao_id: string;
  voto_original: string;
  data_hora: string;
  proposicao_id: number;
  titulo: string;
  ementa: string;
  tema?: string | null;
  url_camara?: string | null;
  resultado?: string | null;
  vote_description?: string | null;
}

export interface DeputyDetail extends Deputy {
  party_name?: string | null;
  votes: DeputyVoteDetail[];
}

export interface PartyAdherenceResult {
  id: number;
  sigla: string;
  nome: string;
  logo_url?: string | null;
  total_deputados: number;
  matches_count: number;
  comparable_count: number;
  adherence: number | null;
}

export interface PropositionWithVoteSession extends Proposition {
  vote_session_id?: string;
  vote_session_date?: string;
  vote_session_description?: string;
  vote_session_result?: string | null;
  tipo_deliberacao?: string | null;
  titulo_amigavel?: string | null;
  resumo_simplificado?: string | null;
  total_sim?: number;
  total_nao?: number;
  total_outros?: number;
  is_merit?: boolean;
}

export interface PropositionDetail extends PropositionWithVoteSession {
  votes: Array<{
    id: number;
    votacao_id: string;
    deputado_id: number;
    sigla_partido: string;
    voto_original: string;
    deputado_nome: string;
    deputado_uf: string;
    deputado_foto: string | null;
  }>;
}

// ====================================================================
// Tipos Oficiais da API de Dados Abertos da Câmara dos Deputados
// ====================================================================

export interface CamaraVoteSessionListItem {
  id: string;
  data?: string;
  dataHoraRegistro?: string;
  siglaOrgao?: string;
  uriOrgao?: string;
  uriProposicaoObjeto?: string;
  descricao?: string;
  aprovacao?: number;
}

export interface CamaraPropositionSummary {
  id?: number;
  siglaTipo?: string;
  numero?: number;
  ano?: number;
  ementa?: string;
  ementaDetalhada?: string;
  urlInteiroTeor?: string;
  dataApresentacao?: string;
  statusProposicao?: {
    descricaoSituacao?: string;
    descricaoTramitacao?: string;
  };
}