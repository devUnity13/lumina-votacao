import { NextResponse } from "next/server";
import { getSponsors } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ sponsors: await getSponsors() });
  } catch (error) {
    console.error("[api/sponsors] Falha ao carregar patrocinadores:", error);
    return NextResponse.json({ error: "Falha ao carregar patrocinadores." }, { status: 500 });
  }
}
