// ====================================================================
// LegisVisão - Tipos do Banco de Dados & Modelos Relacionais
// ====================================================================

export interface PoliticalParty {
  id: number;
  sigla: string;
  nome: string;
  uri?: string | null;
  situacao?: string | null; // 'Ativo' | 'Inativo'
  total_membros?: number | null;
  total_posse?: number | null;
  numero_eleitoral?: number | null;
  logo_url?: string | null;
}

export interface Politician {
  id: number;
  source: string;
  external_id: string;
  name: string;
  type: string; // 'DEPUTY' ou 'SENATOR'
  state: string;
  photo_url?: string | null;
  email?: string | null;
  is_active?: boolean;
}

export interface PoliticianPartyHistory {
  id: number;
  politician_id: number;
  party_id: number;
  start_date: string;
  end_date: string | null;
}

export interface Mandate {
  id: number;
  politician_id: number;
  office: string; // 'Deputado Federal' ou 'Senador'
  house: string; // 'CAMARA' ou 'SENADO'
  start_date: string;
  end_date: string | null;
  legislature_id?: number | null;
}

export interface LegislativeProject {
  id: number;
  canonical_id: string; // "PL-2630-2020", "PEC-45-2019"
  type: string;
  number: string;
  year: number;
  title: string;
  description: string | null;
  current_status: string | null;
  last_updated_at?: string | null;
}

export interface ProjectHouseRecord {
  id: number;
  project_id: number;
  house: string; // 'CAMARA' ou 'SENADO'
  external_id: string;
  official_url: string | null;
  full_text_url: string | null;
  presentation_date: string | null;
  author_name: string | null;
  author_party: string | null;
  author_state: string | null;
  rapporteur_name: string | null;
  tramitacao_etapa: string | null;
  despacho: string | null;
  last_event_date: string | null;
  source_updated_at?: string | null;
  source_read_at?: string | null;
}

export interface LegislativePhase {
  id: number;
  house_record_id: number;
  phase_name: string;
  phase_order: number;
  started_at?: string | null;
  completed_at?: string | null;
}

export interface VoteSession {
  id: number;
  house_record_id: number;
  phase_id: number | null;
  external_vote_id: string | null;
  date: string;
  description: string | null;
  result: string | null;
}

export interface PoliticianVote {
  id: number;
  vote_session_id: number;
  politician_id: number;
  party_id?: number | null;
  vote_original: string;
}

export interface SyncControl {
  source: string;
  name: string | null;
  official_url: string | null;
  last_sync: string;
  last_successful_sync: string | null;
  status: string;
  records_count: number;
  records_updated: number;
  records_inserted: number;
  dataset_version: string | null;
  last_error: string | null;
}

// ====================================================================
// Composite / Query Types
// ====================================================================

export interface StateRow {
  state: string;
}

export interface PartyAdherenceRow {
  id: number;
  sigla: string;
  name: string;
  matches_count: number;
  comparable_count: number;
  adherence: number | null;
}

export interface PoliticianAdherenceRow {
  id: number;
  name: string;
  type: string;
  state: string;
  party_sigla: string | null;
  party_name: string | null;
  mandate_office?: string | null;
  matches_count: number;
  comparable_count: number;
  adherence: number | null;
}

export interface ProjectWithRecords extends LegislativeProject {
  records?: ProjectHouseRecord[];
  sessions?: VoteSession[];
}

export interface ProjectWithLastVote extends LegislativeProject {
  official_urls?: string[];
  houses?: string;
  last_vote_date?: string | null;
  last_vote_description?: string | null;
  tramitacao_etapa?: string | null;
  despacho?: string | null;
  presentation_date?: string | null;
  last_event_date?: string | null;
  author_name?: string | null;
  official_url?: string | null;
}

export interface PoliticianSearchResult {
  id: number;
  source: string;
  external_id: string;
  name: string;
  type: string;
  state: string;
  photo_url?: string | null;
  party_sigla: string | null;
  party_name: string | null;
  mandate_office?: string | null;
}

export interface PoliticianDetail extends Politician {
  party_sigla: string | null;
  party_name: string | null;
}

export interface PartyHistoryRow {
  id: number;
  start_date: string;
  end_date: string | null;
  party_sigla: string;
  party_name: string;
}

export interface PoliticianVoteRow {
  vote_id: number;
  party_id?: number | null;
  vote_original: string;
  vote_date: string;
  vote_description: string | null;
  vote_result: string | null;
  project_id: number;
  canonical_id: string;
  project_title: string;
  project_description: string | null;
  house: string;
  official_url: string | null;
  party_sigla?: string | null;
}

export interface VoteDetailRow {
  id: number;
  vote_session_id: number;
  politician_id: number;
  party_id?: number | null;
  vote_original: string;
  politician_name: string;
  politician_type: string;
  politician_state: string;
  party_sigla: string | null;
}

export interface PartyPoliticianMember {
  id: number;
  name: string;
  type: string;
  state: string;
  photo_url: string | null;
  email: string | null;
  source: string;
  mandate_office?: string | null;
}

export interface PartyPoliticianVoteDetail {
  vote_id: number;
  politician_id: number;
  party_id: number | null;
  vote_original: string;
  politician_name: string;
  vote_session_id: number;
  session_date: string;
  session_description: string | null;
  project_id: number;
  canonical_id: string;
  project_number: string;
  project_year: number;
  project_type: string;
  project_title: string;
  project_description: string | null;
  house: string;
  official_url: string | null;
}

export interface ProjectVoteSessionRow extends VoteSession {
  house: string;
  phase_name?: string | null;
}

export type SQLParam = string | number | boolean | null;