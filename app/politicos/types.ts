import type { Deputy, DeputyVoteDetail } from "@/types/db";
import type { SessionClassification } from "@/lib/match/classifyVoteSession";

export interface ClassifiedVote extends DeputyVoteDetail {
  classification: SessionClassification;
}

export interface GroupedProposition {
  proposicao_id: number;
  titulo: string;
  ementa: string;
  tema?: string | null;
  url_camara?: string | null;
  primaryVote: ClassifiedVote;
  otherVotes: ClassifiedVote[];
}

export interface PropositionVoteCardProps {
  item: GroupedProposition;
}

export interface PoliticianDetailsClientProps {
  deputy: Deputy & { party_name?: string | null };
  votes: DeputyVoteDetail[];
}
