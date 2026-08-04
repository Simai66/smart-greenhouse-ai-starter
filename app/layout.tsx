import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Greenhouse 01 | Smart Greenhouse",
  description: "ระบบติดตามและควบคุมโรงเรือนมะเขือเทศอัจฉริยะ",
  other: { "codex-preview": "development" },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body>
        {children}
        <script src="https://mcp.figma.com/mcp/html-to-design/capture.js" async />
      </body>
    </html>
  );
}
