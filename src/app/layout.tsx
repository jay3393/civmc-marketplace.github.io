import type { Metadata } from "next";
import "./globals.css";
import HeaderShell from "./header-shell";
import { Providers } from "./providers";
import { Geist, Geist_Mono } from "next/font/google";
import MainShell from "./main-shell";
import LockGuard from "./lock-guard";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "CivHub",
  description: "Marketplace and rail routes for CivHub",
};

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          <LockGuard />
          <HeaderShell />
          <MainShell>{children}</MainShell>
        </Providers>
        <Toaster richColors closeButton position="top-center" />
      </body>
    </html>
  );
}
