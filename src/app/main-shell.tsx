"use client";

import { usePathname } from "next/navigation";

export default function MainShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isWaitlist = pathname?.startsWith("/waitlist") ?? false;

  if (isWaitlist) {
    return (
      <div className="h-screen w-screen overflow-hidden">
        <main className="h-full w-full p-0 m-0">{children}</main>
      </div>
    );
  }

  return <main className="container mx-auto px-4 py-8">{children}</main>;
} 