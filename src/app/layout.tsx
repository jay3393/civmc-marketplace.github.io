import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Providers } from "./providers";
import AuthButton from "@/components/auth/auth-button";
import UsernamePrompt from "@/components/auth/username-prompt";

export const metadata: Metadata = {
  title: "CivMC Tools",
  description: "Marketplace and rail routes for CivMC",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          <header className="w-full border-b sticky top-0 bg-background/80 backdrop-blur z-50">
            <nav className="container mx-auto flex items-center gap-6 h-14 px-4">
              <Link href="/" className="font-semibold">CivMC</Link>
              <div className="flex items-center gap-4 text-sm">
                <Link href="/marketplace">Marketplace</Link>
                <Link href="/routes">Routes</Link>
                <Link href="/contracts">Contracts</Link>
                <Link href="/events">Events</Link>
                <Link href="/settlements">Settlements</Link>
              </div>
              <div className="ml-auto">
                <AuthButton />
              </div>
            </nav>
          </header>
          <div className="py-3">
            <UsernamePrompt />
          </div>
          <main className="container mx-auto px-4 py-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
