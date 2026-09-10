import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { NavBar } from "@/components/NavBar";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CivicFlow — Public Service Intelligence",
  description: "Turn public services into an understandable, actionable journey. Synthetic demo data.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <Providers>
          <NavBar />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-500 dark:border-slate-800">
            CivicFlow is a demo/synthetic public-service intelligence platform. No data represents a real government service or determination.
          </footer>
        </Providers>
      </body>
    </html>
  );
}
