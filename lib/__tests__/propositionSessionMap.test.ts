import { describe, it, expect } from "vitest";
import { buildPropositionSessionMapping } from "../propositionSessionMap";
import type { PropositionWithVoteSession } from "@/types/db";

describe("buildPropositionSessionMapping", () => {
  it("mapeia corretamente sessões nominais e mérito principal", () => {
    const mockPropositions: PropositionWithVoteSession[] = [
      {
        id: 100,
        sigla_tipo: "PL",
        numero: 1,
        ano: 2024,
        titulo: "PL 1/2024",
        ementa: "Ementa 1",
        vote_session_id: "sess-100",
        is_merit: true,
        nominal_session_ids: ["sess-100", "sess-101", "sess-102"],
      },
      {
        id: 200,
        sigla_tipo: "PEC",
        numero: 2,
        ano: 2025,
        titulo: "PEC 2/2025",
        ementa: "Ementa 2",
        vote_session_id: "sess-200",
        is_merit: false, // simbólica no mérito, mas com emendas nominais
        nominal_session_ids: ["sess-201"],
      },
      {
        id: 300,
        sigla_tipo: "PL",
        numero: 3,
        ano: 2024,
        titulo: "PL 3/2024",
        ementa: "Ementa 3",
        // Sem vote_session_id (usa id como fallback se merit)
        is_merit: true,
      },
    ];

    const mapping = buildPropositionSessionMapping(mockPropositions);

    expect(mapping.validSessionIds.has("sess-100")).toBe(true);
    expect(mapping.validSessionIds.has("sess-101")).toBe(true);
    expect(mapping.validSessionIds.has("sess-102")).toBe(true);
    expect(mapping.validSessionIds.has("sess-200")).toBe(false); // is_merit is false
    expect(mapping.validSessionIds.has("sess-201")).toBe(true);
    expect(mapping.validSessionIds.has("300")).toBe(true); // Fallback para ID quando sem vote_session_id

    expect(mapping.propositionToSessionMap[100]).toBe("sess-100");
    expect(mapping.propositionToSessionMap[200]).toBeUndefined();
    expect(mapping.propositionToSessionMap[300]).toBe("300");

    expect(mapping.sessionToPropMap.get("sess-100")).toBe(100);
    expect(mapping.sessionToPropMap.get("sess-101")).toBe(100);
    expect(mapping.sessionToPropMap.get("sess-201")).toBe(200);
    expect(mapping.sessionToPropMap.get("300")).toBe(300);
  });
});
