"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AuthButton from "@/components/auth/auth-button";
import UsernamePrompt from "@/components/auth/username-prompt";

export default function HeaderShell() {
  const pathname = usePathname();
  const isWaitlist = pathname?.startsWith("/waitlist") ?? false;
  const discordInvite = process.env.NEXT_PUBLIC_DISCORD_INVITE_URL || "https://discord.gg/8s7NYH5DFb";

  if (isWaitlist) return null;

  return (
    <>
      <header className="w-full border-b sticky top-0 bg-background/80 backdrop-blur z-50">
        <nav className="container mx-auto flex items-center gap-6 h-14 px-4">
          <Link href="/" className="font-semibold">CivHub</Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/marketplace">Marketplace</Link>
            <Link href="/contracts">Contracts</Link>
            <Link href="/claims">Claims</Link>

            {/* Disabled: WIP, make muted and unclickable and subscript text saying coming soon */}
            {process.env.NEXT_PUBLIC_ALLOW_WIP_ROUTES === "true" ? (
              <Link href="/routes">Routes</Link>
            ) : (
              <div className="relative">
                <span className="text-muted-foreground">Routes</span>
                <span className="absolute text-muted-foreground text-[10px] whitespace-nowrap left-1/2 -translate-x-1/2 top-full">Coming!</span>
              </div>
            )}

            {/* Disabled: WIP, make muted and unclickable and subscript text saying coming soon */}
            {process.env.NEXT_PUBLIC_ALLOW_WIP_ROUTES === "true" ? (
              <Link href="/events">Events</Link>
            ) : (
              <div className="relative">
                <span className="text-muted-foreground">Events</span>
                <span className="absolute text-muted-foreground text-[10px] whitespace-nowrap left-1/2 -translate-x-1/2 top-full">Coming!</span>
              </div>
            )}
          </div>
          <div className="ml-auto">
            <AuthButton />
          </div>
        </nav>
      </header>
      <div className="bg-black border-b border-black">
        <div className="container mx-auto px-4 py-2 text-white text-sm text-center">
          <span className="font-bold">Alpha:</span> This site is an MVP. Expect bugs and unpolished features while we iterate.
          <Link href={discordInvite} className="text-blue-500"> Join our Discord</Link>
        </div>
      </div>
      <div className="py-3">
        <UsernamePrompt />
      </div>
    </>
  );
} 