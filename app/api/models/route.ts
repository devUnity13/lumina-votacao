import { NextResponse } from "next/server";
import { getModels } from "@/lib/data";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const models = (await getModels()).map(({ id, name, city, bio, images }) => ({ id, name, city, bio, images }));
    return NextResponse.json({ models });
  } catch {
    return NextResponse.json({ error: "Falha ao carregar modelos." }, { status: 500 });
  }
}
