export interface SyncSource {
  source: string;
  name: string;
  official_url: string;
  last_sync: string | null;
  status: "SUCCESS" | "FAILED" | "RUNNING" | "PENDING";
  total_deputies?: number;
  total_propositions?: number;
  total_vote_sessions?: number;
  total_votes?: number;
  last_error: string | null;
}

export interface SyncSourcesPanelProps {
  readonly sources: SyncSource[];
  readonly loading: boolean;
  readonly isClient: boolean;
}
