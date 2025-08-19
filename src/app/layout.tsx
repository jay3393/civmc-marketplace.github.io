import type { Metadata } from "next";
import "./globals.css";
import HeaderShell from "./header-shell";
import { Providers } from "./providers";
import { Geist, Geist_Mono } from "next/font/google";
import MainShell from "./main-shell";

export const metadata: Metadata = {
  title: "CivMC Tools",
  description: "Marketplace and rail routes for CivMC",
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
          <HeaderShell />
          <MainShell>{children}</MainShell>
        </Providers>
      </body>
    </html>
  );
}
