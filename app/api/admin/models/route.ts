import { NextRequest, NextResponse } from "next/server";
import { addModel, deleteModel } from "@/lib/data";
import { isValidAdminPassword } from "@/lib/admin";
export async function POST(request: NextRequest) {
  if (!isValidAdminPassword(request.headers.get("x-admin-password"))) return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
  try {
    const { name, bio, images } = await request.json();
    if (typeof name !== "string" || typeof bio !== "string" || !name.trim() || !bio.trim() || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: "Preencha todos os campos e envie ao menos uma foto." }, { status: 400 });
    }
    const cleanName = name.trim();
    const id = `${cleanName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Date.now().toString(36)}`;
    await addModel({ id, name: cleanName, city: "Mendes, RJ", bio: bio.trim(), images: images.map(String), votes: 0 });
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error("[api/admin/models] Falha ao salvar modelo:", error);
    const details = error instanceof Error ? error.message : "erro desconhecido";
    return NextResponse.json(
      { error: `Não foi possível salvar a modelo: ${details}` },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!isValidAdminPassword(request.headers.get("x-admin-password"))) {
    return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
  }
  try {
    const { id } = await request.json();
    if (typeof id !== "string" || !id.trim()) {
      return NextResponse.json({ error: "Modelo inválida." }, { status: 400 });
    }
    const result = await deleteModel(id);
    return NextResponse.json({ ok: true, warning: result.storageWarning });
  } catch (error) {
    console.error("[api/admin/models] Falha ao excluir modelo:", error);
    if (error instanceof Error && error.message === "MODEL_NOT_FOUND") {
      return NextResponse.json({ error: "Essa modelo não existe mais." }, { status: 404 });
    }
    const details = error instanceof Error ? error.message : "erro desconhecido";
    return NextResponse.json({ error: `Não foi possível excluir a modelo: ${details}` }, { status: 500 });
  }
}
