import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TickerSense",
  description: "SEC Research Copilot for public company research",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
          {children}
        </div>
      </body>
    </html>
  );
}
