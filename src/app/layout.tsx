import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Horus Videomonitoramento", template: "%s | Horus" },
  description: "Monitoramento por câmeras 24h para residências, condomínios e empresas.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
