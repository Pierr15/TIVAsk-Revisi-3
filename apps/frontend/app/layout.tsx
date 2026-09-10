import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TIVAsk Admin Dashboard - SMKN 1 Adiwerna",
  description: "TI Virtual Assistant School Knowledge Management Dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="bg-slate-50 text-slate-900 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
