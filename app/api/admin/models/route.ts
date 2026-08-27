import { NextRequest, NextResponse } from "next/server";
import { addModel, deleteModel, getModels, updateModel } from "@/lib/data";
import { isValidAdminPassword } from "@/lib/admin";

function isValidImages(images: unknown): images is string[] {
  return Array.isArray(images) && images.length >= 1 && images.length <= 3 && images.every((image) => typeof image === "string" && image.length > 0);
}

export async function GET(request: NextRequest) {
  if (!isValidAdminPassword(request.headers.get("x-admin-password"))) {
    return NextResponse.json({ error: "Você não tem autorização para acessar esta área." }, { status: 401 });
  }
  try {
    return NextResponse.json({ models: await getModels() });
  } catch (error) {
    console.error("[api/admin/models] Falha ao carregar modelos:", error);
    return NextResponse.json({ error: "Não foi possível carregar as modelos." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isValidAdminPassword(request.headers.get("x-admin-password"))) return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
  try {
    const { name, bio, images } = await request.json();
    if (typeof name !== "string" || typeof bio !== "string" || !name.trim() || !bio.trim() || !isValidImages(images)) {
      return NextResponse.json({ error: "Preencha os campos e envie de uma a três fotos." }, { status: 400 });
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

export async function PATCH(request: NextRequest) {
  if (!isValidAdminPassword(request.headers.get("x-admin-password"))) {
    return NextResponse.json({ error: "Você não tem autorização para editar esta modelo." }, { status: 401 });
  }
  try {
    const { id, name, bio, images } = await request.json();
    if (typeof id !== "string" || !id.trim() || typeof name !== "string" || !name.trim() || typeof bio !== "string" || !bio.trim() || !isValidImages(images)) {
      return NextResponse.json({ error: "Preencha os campos e mantenha de uma a três fotos." }, { status: 400 });
    }
    const result = await updateModel(id, { name: name.trim(), bio: bio.trim(), images: images.map(String) });
    return NextResponse.json({ ok: true, warning: result.storageWarning });
  } catch (error) {
    console.error("[api/admin/models] Falha ao editar modelo:", error);
    if (error instanceof Error && error.message === "MODEL_NOT_FOUND") {
      return NextResponse.json({ error: "Essa modelo não existe mais." }, { status: 404 });
    }
    const details = error instanceof Error ? error.message : "erro desconhecido";
    return NextResponse.json({ error: `Não foi possível editar a modelo: ${details}` }, { status: 500 });
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
