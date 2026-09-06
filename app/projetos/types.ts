import type { Proposition, VoteSession } from "@/types/db";
import type { StoredGranularAnswers } from "@/lib/storage";

export interface RawVote {
  id: number;
  votacao_id: string;
  deputado_id: number;
  sigla_partido: string;
  voto_original: string;
  deputado_nome: string;
  deputado_uf: string;
  deputado_foto: string | null;
}

export interface ProjectDetailsClientProps {
  proposition: Proposition;
  sessions: VoteSession[];
  votes: RawVote[];
}

export interface ClassifiedVoteSession extends VoteSession {
  votesCount: number;
  classification: {
    label: string;
    badgeClass: string;
    type: string;
    priority: number;
  };
}

export interface VoteStats {
  sim: number;
  nao: number;
  outros: number;
  total: number;
  simPct: number;
  naoPct: number;
  outrosPct: number;
}

export interface AvailableFilters {
  availableParties: string[];
  availableStates: string[];
}

export interface PropositionStatusInfo {
  situacaoAtual: string;
  isAprovado: boolean;
  isArquivado: boolean;
}

export interface PrimarySessionOverviewProps {
  readonly session: ClassifiedVoteSession | null;
}

export interface DeputyVotesListProps {
  readonly filteredVotes: RawVote[];
  readonly totalVotes: number;
  readonly voteSearch: string;
  readonly filterParty: string;
  readonly filterState: string;
  readonly filterVoteType: string;
  readonly availableParties: string[];
  readonly availableStates: string[];
  readonly simCount: number;
  readonly naoCount: number;
  readonly outrosCount: number;
  readonly onSearchChange: (v: string) => void;
  readonly onPartyChange: (v: string) => void;
  readonly onStateChange: (v: string) => void;
  readonly onVoteTypeChange: (v: string) => void;
  readonly onResetFilters: () => void;
}

export interface SessionsSelectorGridProps {
  readonly sessions: ClassifiedVoteSession[];
  readonly activeSessionId?: string;
  readonly primarySessionId?: string;
  readonly granularAnswers: StoredGranularAnswers;
  readonly onSelectSession: (id: string) => void;
}

export interface ActiveVoteTallyProps {
  readonly stats: VoteStats;
}

export interface ProjectOverviewProps {
  readonly proposition: Proposition;
  readonly situacaoAtual: string;
  readonly isAprovado: boolean;
  readonly isArquivado: boolean;
  readonly presentationDate: string | null;
  readonly hasAiOverview: boolean;
  readonly primarySession: ClassifiedVoteSession | null;
  readonly onOpenFeedback: () => void;
}

export interface ActiveSessionDetailCardProps {
  readonly activeSession: ClassifiedVoteSession;
  readonly isPrimaryActive: boolean;
  readonly activeDateFormatted: string | null;
  readonly granularAnswers: StoredGranularAnswers;
  readonly activeVoteStats: VoteStats;
  readonly showVotesList: boolean;
  readonly filteredVotes: RawVote[];
  readonly activeSessionVotes: RawVote[];
  readonly voteSearch: string;
  readonly filterParty: string;
  readonly filterState: string;
  readonly filterVoteType: string;
  readonly availableParties: string[];
  readonly availableStates: string[];
  readonly onToggleShowVotesList: () => void;
  readonly onSessionVote: (sessionId: string, opinion: "CONCORDO" | "DISCORDO") => void;
  readonly onRemoveSessionVote?: (sessionId: string) => void;
  readonly onOpenFeedback: (session: VoteSession) => void;
  readonly onSearchChange: (val: string) => void;
  readonly onPartyChange: (val: string) => void;
  readonly onStateChange: (val: string) => void;
  readonly onVoteTypeChange: (val: string) => void;
  readonly onResetFilters: () => void;
}
