import type { PropositionWithVoteSession } from "@/types/db";
import type { StoredGranularAnswers } from "@/lib/storage";

export type SortOption = "relevance" | "recent" | "oldest";

export interface UnvotedPropositionCardProps {
  readonly proposition: PropositionWithVoteSession;
  readonly granularAnswers: StoredGranularAnswers;
  readonly onVote: (p: PropositionWithVoteSession, opinion: "CONCORDO" | "DISCORDO") => void;
  readonly onRemoveVote?: (p: PropositionWithVoteSession) => void;
  readonly onSecondaryVote: (p: PropositionWithVoteSession, sessionId: string, opinion: "CONCORDO" | "DISCORDO") => void;
  readonly onRemoveSecondaryVote?: (sessionId: string) => void;
  readonly onOpenFeedback: (p: PropositionWithVoteSession) => void;
}

export interface VoteFormFilterPanelProps {
  readonly search: string;
  readonly sortBy: SortOption;
  readonly shuffle: boolean;
  readonly limit: number;
  readonly opinionsCount: number;
  readonly activeFiltersCount: number;
  readonly showFilterDrawer: boolean;
  readonly availableYears: number[];
  readonly selectedYears: number[];
  readonly availableStatus: string[];
  readonly selectedStatus: string[];
  readonly availableThemes: string[];
  readonly selectedThemes: string[];
  readonly includeNonMerit: boolean;
  readonly onSearchChange: (val: string) => void;
  readonly onSortChange: (val: SortOption) => void;
  readonly onShuffleToggle: (val: boolean) => void;
  readonly onLimitChange: (val: number) => void;
  readonly onToggleDrawer: () => void;
  readonly onToggleYear: (yr: number) => void;
  readonly onClearYears: () => void;
  readonly onToggleStatus: (st: string) => void;
  readonly onClearStatus: () => void;
  readonly onToggleTheme: (th: string) => void;
  readonly onClearThemes: () => void;
  readonly onToggleIncludeNonMerit: (val: boolean) => void;
}

export interface VoteFormEmptyStateProps {
  readonly hasActiveFilters: boolean;
  readonly opinionsCount: number;
  readonly onResetFilters: () => void;
}

export interface VoteFormToastProps {
  readonly toast: { propositionTitle: string } | null;
  readonly onClose: () => void;
}
