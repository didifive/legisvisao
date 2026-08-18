import { db } from "@/lib/db";
import { StateRow } from "@/types/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const statesResult = await db<StateRow[]>`
      SELECT DISTINCT state 
      FROM politicians 
      ORDER BY state ASC
    `;
    const states = statesResult.map((r) => r.state);
    return NextResponse.json(states);
  } catch (error) {
    console.error("Erro em GET /api/states:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor ao obter estados." },
      { status: 500 }
    );
  }
}
