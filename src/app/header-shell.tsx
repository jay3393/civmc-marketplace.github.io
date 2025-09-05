"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AuthButton from "@/components/auth/auth-button";
import UsernamePrompt from "@/components/auth/username-prompt";

export default function HeaderShell() {
  const pathname = usePathname();
  const isWaitlist = pathname?.startsWith("/waitlist") ?? false;

  if (isWaitlist) return null;

  return (
    <>
      <header className="w-full border-b sticky top-0 bg-background/80 backdrop-blur z-50">
        <nav className="container mx-auto flex items-center gap-6 h-14 px-4">
          <Link href="/" className="font-semibold">CivHub</Link>
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
      <div className="bg-black border-b border-black">
        <div className="container mx-auto px-4 py-2 text-white text-sm text-center">
          <span className="font-bold">Alpha:</span> This site is an MVP. Expect bugs and unpolished features while we iterate.
          <Link href="https://discord.gg/8s7NYH5DFb" className="text-blue-500"> Join our Discord</Link>
        </div>
      </div>
      <div className="py-3">
        <UsernamePrompt />
      </div>
    </>
  );
} 