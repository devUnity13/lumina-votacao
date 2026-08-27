import { NextRequest, NextResponse } from "next/server";
import { isValidAdminPassword } from "@/lib/admin";

export async function POST(request: NextRequest) {
  if (!isValidAdminPassword(request.headers.get("x-admin-password"))) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !file.type.startsWith("image/") || file.size > 4_000_000) {
    return NextResponse.json({ error: "Envie uma imagem de até 4 MB." }, { status: 400 });
  }

  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl && process.env.NODE_ENV !== "production") {
    const bytes = Buffer.from(await file.arrayBuffer());
    return NextResponse.json({ url: `data:${file.type};base64,${bytes.toString("base64")}` });
  }
  if (!supabaseUrl) {
    return NextResponse.json({ error: "SUPABASE_URL não está configurada na Vercel." }, { status: 503 });
  }
  if (!serviceRoleKey) {
    return NextResponse.json(
      {
        error: "Configure SUPABASE_SERVICE_ROLE_KEY na Vercel com a chave service_role da seção Legacy API Keys do Supabase.",
      },
      { status: 503 },
    );
  }

  const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
  const storagePath = `${crypto.randomUUID()}-${safeName}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const uploadResponse = await fetch(`${supabaseUrl}/storage/v1/object/modelos/${storagePath}`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": file.type,
      "x-upsert": "false",
    },
    body: bytes,
  });
  if (!uploadResponse.ok) {
    const error = await uploadResponse.json().catch(() => null) as {
      code?: string;
      message?: string;
      error?: string;
    } | null;
    const message = error?.code === "InvalidMimeType" || error?.error === "invalid_mime_type"
      ? "O bucket 'modelos' não aceita este formato. No Supabase, permita image/jpeg, image/png e image/webp nas configurações do bucket."
      : error?.message || error?.error || `HTTP ${uploadResponse.status}`;
    return NextResponse.json(
      { error: `Falha ao enviar a foto: ${message}` },
      { status: uploadResponse.status >= 400 && uploadResponse.status < 500 ? 400 : 502 },
    );
  }

  return NextResponse.json({ url: `${supabaseUrl}/storage/v1/object/public/modelos/${storagePath}` });
}
