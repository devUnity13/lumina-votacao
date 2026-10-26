import { NextRequest, NextResponse } from "next/server";
import { addSponsor, deleteSponsor, getSponsors } from "@/lib/data";
import { isValidAdminPassword } from "@/lib/admin";

function authorized(request: NextRequest): boolean {
  return isValidAdminPassword(request.headers.get("x-admin-password"));
}

function normalizeWebsite(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const candidate = /^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Acesso negado." }, { status: 401 });
  try {
    return NextResponse.json({ sponsors: await getSponsors() });
  } catch (error) {
    console.error("[api/admin/sponsors] Falha ao carregar:", error);
    return NextResponse.json({ error: "Não foi possível carregar os patrocinadores." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Acesso negado." }, { status: 401 });
  try {
    const { name, logoUrl, website, tier } = await request.json();
    if (typeof name !== "string" || !name.trim() || typeof logoUrl !== "string" || !logoUrl.trim()) {
      return NextResponse.json({ error: "Informe o nome e envie a logo do patrocinador." }, { status: 400 });
    }
    const cleanTier = tier === "principal" ? "principal" : "apoio";
    const id = `${name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Date.now().toString(36)}`;
    const sponsors = await getSponsors();
    await addSponsor({
      id,
      name: name.trim(),
      logoUrl: logoUrl.trim(),
      website: normalizeWebsite(website),
      tier: cleanTier,
      displayOrder: sponsors.length,
    });
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error("[api/admin/sponsors] Falha ao cadastrar:", error);
    const details = error instanceof Error ? error.message : "erro desconhecido";
    return NextResponse.json({ error: `Não foi possível cadastrar o patrocinador: ${details}` }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Acesso negado." }, { status: 401 });
  try {
    const { id } = await request.json();
    if (typeof id !== "string" || !id.trim()) return NextResponse.json({ error: "Patrocinador inválido." }, { status: 400 });
    const result = await deleteSponsor(id);
    return NextResponse.json({ ok: true, warning: result.storageWarning });
  } catch (error) {
    console.error("[api/admin/sponsors] Falha ao excluir:", error);
    if (error instanceof Error && error.message === "SPONSOR_NOT_FOUND") {
      return NextResponse.json({ error: "Esse patrocinador não existe mais." }, { status: 404 });
    }
    const details = error instanceof Error ? error.message : "erro desconhecido";
    return NextResponse.json({ error: `Não foi possível excluir o patrocinador: ${details}` }, { status: 500 });
  }
}
