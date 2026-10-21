import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UangFlow",
  description: "Catat pengeluaran, atur anggaran, dan capai target tabunganmu.",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head><meta name="theme-color" content="#102b40"/><link rel="stylesheet" href="/styles.css" /><link rel="stylesheet" href="/glass/landing.css" /><link rel="stylesheet" href="/theme.css" /><link rel="modulepreload" href="/app.js" /></head>
      <body className="on-home boot-pending"><noscript><style>{`.boot-pending .landing main,.boot-pending .landing .brand,.boot-pending .landing nav{opacity:1!important}`}</style></noscript>{children}</body>
    </html>
  );
}
