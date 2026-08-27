import { NextRequest, NextResponse } from "next/server";
import { isValidAdminPassword } from "@/lib/admin";

export async function POST(request: NextRequest) {
  if (!isValidAdminPassword(request.headers.get("x-admin-password"))) {
    return NextResponse.json(
      { error: "Senha incorreta. Você não tem autorização para acessar esta área." },
      { status: 401 },
    );
  }
  return NextResponse.json({ ok: true });
}
