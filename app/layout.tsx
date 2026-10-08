import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UangFlow — Kendalikan uangmu",
  description: "Catat pengeluaran, atur uang saku, dan capai target tabunganmu.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head><link rel="stylesheet" href="/styles.css" /></head>
      <body>{children}</body>
    </html>
  );
}
