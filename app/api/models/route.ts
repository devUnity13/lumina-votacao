import { NextResponse } from "next/server";
import { getModels } from "@/lib/data";
export const dynamic = "force-dynamic";
export async function GET() { try { return NextResponse.json({ models: await getModels() }); } catch { return NextResponse.json({ error: "Falha ao carregar modelos." }, { status: 500 }); } }
