import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LUMINA — Escolha do Público",
  description: "Conheça as finalistas, escolha sua favorita e faça seu voto brilhar.",
  metadataBase: (() => {
    try {
      return new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
    } catch {
      return new URL("http://localhost:3000");
    }
  })(),
  openGraph: { title: "LUMINA — Escolha do Público", description: "Uma passarela. Um voto. Uma estrela.", type: "website", locale: "pt_BR", images: [{ url: "/og.png", width: 1200, height: 630, alt: "LUMINA — Escolha do Público 2026" }] },
  twitter: { card: "summary_large_image", title: "LUMINA — Escolha do Público", description: "Uma passarela. Um voto. Uma estrela.", images: ["/og.png"] },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
      </body>
    </html>
  );
}
