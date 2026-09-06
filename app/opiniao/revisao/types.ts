import type { PropositionWithVoteSession } from "@/types/db";
import type { StoredGranularAnswers } from "@/lib/storage";

export interface CardStatusBooleans {
  situacaoAtual: string;
  isAprovado: boolean;
  isEncerrado: boolean;
}

export interface CardPrimaryVoteMeta {
  isPrimaryNominal: boolean;
  hasPrimaryVote: boolean;
  primaryOpinion?: "CONCORDO" | "DISCORDO";
  isPrimaryConcordo: boolean;
  primaryTargetSessionId: string;
}

export interface AnsweredCardHeaderProps {
  readonly proposition: PropositionWithVoteSession;
  readonly situacaoAtual: string;
  readonly isAprovado: boolean;
  readonly isEncerrado: boolean;
  readonly isPrimaryNominal: boolean;
  readonly lastVoteDate: string | null;
}

export interface AnsweredCardAiSummaryProps {
  readonly proposition: PropositionWithVoteSession;
  readonly onOpenFeedback: (p: PropositionWithVoteSession) => void;
}

export interface AnsweredCardPrimaryVoteProps {
  readonly proposition: PropositionWithVoteSession;
  readonly isPrimaryNominal: boolean;
  readonly hasPrimaryVote: boolean;
  readonly isPrimaryConcordo: boolean;
  readonly primaryOpinion?: "CONCORDO" | "DISCORDO";
  readonly primaryTargetSessionId: string;
  readonly onVoteChange: (sessionId: string, opinion: "CONCORDO" | "DISCORDO") => void;
  readonly onRemoveOpinion: (sessionId: string, propositionId?: number) => void;
  readonly onOpenFeedback: (p: PropositionWithVoteSession) => void;
}

export interface AnsweredPropositionCardProps {
  readonly proposition: PropositionWithVoteSession;
  readonly answer?: "CONCORDO" | "DISCORDO";
  readonly sessionId: string;
  readonly validSessionIds: Set<string>;
  readonly granularAnswers: StoredGranularAnswers;
  readonly onVoteChange: (sessionId: string, opinion: "CONCORDO" | "DISCORDO") => void;
  readonly onRemoveOpinion: (sessionId: string, propositionId?: number) => void;
  readonly onSecondaryVote: (sessionId: string, opinion: "CONCORDO" | "DISCORDO") => void;
  readonly onRemoveSecondaryVote?: (sessionId: string) => void;
  readonly onOpenFeedback: (proposition: PropositionWithVoteSession) => void;
}

export interface RevisaoFilterDrawerProps {
  readonly showDrawer: boolean;
  readonly availableYears: number[];
  readonly selectedYears: number[];
  readonly availableStatus: string[];
  readonly selectedStatus: string[];
  readonly availableThemes: string[];
  readonly selectedThemes: string[];
  readonly onToggleDrawer: () => void;
  readonly onToggleYear: (yr: number) => void;
  readonly onClearYears: () => void;
  readonly onToggleStatus: (st: string) => void;
  readonly onClearStatus: () => void;
  readonly onToggleTheme: (th: string) => void;
  readonly onClearThemes: () => void;
}

export interface RevisaoStatsBarProps {
  readonly totalAnswered: number;
  readonly simCount: number;
  readonly naoCount: number;
  readonly simPct: number;
  readonly naoPct: number;
}

export interface RevisaoPaginationProps {
  readonly totalItems: number;
  readonly currentPage: number;
  readonly totalPages: number;
  readonly startIndex: number;
  readonly endIndex: number;
  readonly pageSize: number;
  readonly onPageChange: (p: number) => void;
  readonly onPageSizeChange: (s: number) => void;
}
