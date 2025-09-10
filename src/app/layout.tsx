import type { Metadata } from "next";
import "./globals.css";
import HeaderShell from "./header-shell";
import { Providers } from "./providers";
import { Geist, Geist_Mono } from "next/font/google";
import MainShell from "./main-shell";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/next"

export const metadata: Metadata = {
  title: "CivHub",
  description: "Marketplace and all things CivHub",
};

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full w-full overflow-x-hidden">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased h-full w-full overflow-x-hidden`}> 
        <Providers>
          <HeaderShell />
          <MainShell>{children}</MainShell>
        </Providers>
        <Toaster richColors closeButton position="top-center" />
        <Analytics />
      </body>
    </html>
  );
}
