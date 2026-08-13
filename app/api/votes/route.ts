import { NextRequest, NextResponse } from "next/server";
import { registerVote } from "@/lib/data";
export async function POST(request: NextRequest) {
  try {
    const { modelId, voterKey, invite } = await request.json();
    if (!modelId || !voterKey) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "local";
    const agent = request.headers.get("user-agent") || "unknown";
    await registerVote(String(modelId), String(voterKey), invite ? String(invite) : null, `${ip}:${agent}`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (String(error).includes("ALREADY_VOTED")) return NextResponse.json({ error: "Este participante já votou." }, { status: 409 });
    return NextResponse.json({ error: "Não foi possível registrar o voto." }, { status: 500 });
  }
}
