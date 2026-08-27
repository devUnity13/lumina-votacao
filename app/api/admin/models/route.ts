import { NextRequest, NextResponse } from "next/server";
import { addModel } from "@/lib/data";
import { isValidAdminPassword } from "@/lib/admin";
export async function POST(request: NextRequest) {
  if (!isValidAdminPassword(request.headers.get("x-admin-password"))) return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
  try {
    const { name, city, bio, images } = await request.json();
    if (!name || !city || !bio || !Array.isArray(images) || images.length === 0) return NextResponse.json({ error: "Preencha todos os campos e envie ao menos uma foto." }, { status: 400 });
    const id = `${name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Date.now().toString(36)}`;
    await addModel({ id, name, city, bio, images, votes: 0 }); return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error("[api/admin/models] Falha ao salvar modelo:", error);
    const details = error instanceof Error ? error.message : "erro desconhecido";
    return NextResponse.json(
      { error: `Não foi possível salvar a modelo: ${details}` },
      { status: 500 },
    );
  }
}
