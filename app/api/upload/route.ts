import { NextRequest, NextResponse } from "next/server";
import { isValidAdminPassword } from "@/lib/admin";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  if (!isValidAdminPassword(request.headers.get("x-admin-password"))) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !file.type.startsWith("image/") || file.size > 4_000_000) {
    return NextResponse.json({ error: "Envie uma imagem de até 4 MB." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    const bytes = Buffer.from(await file.arrayBuffer());
    return NextResponse.json({ url: `data:${file.type};base64,${bytes.toString("base64")}` });
  }

  const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
  const storagePath = `${crypto.randomUUID()}-${safeName}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage.from("modelos").upload(storagePath, bytes, {
    contentType: file.type,
    upsert: false,
  });
  if (error) return NextResponse.json({ error: `Falha ao enviar a foto: ${error.message}` }, { status: 500 });

  const { data } = supabase.storage.from("modelos").getPublicUrl(storagePath);
  return NextResponse.json({ url: data.publicUrl });
}
