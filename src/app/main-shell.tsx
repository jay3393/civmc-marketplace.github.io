"use client";

import FooterShell from "./footer-shell";

export default function MainShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full overflow-x-hidden">
      <main className="container mx-auto max-w-7xl px-4 py-4">
        {/* Ambient glow (no layout impact) */}
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-blue-500/25 blur-3xl"/>
          <div className="absolute top-1/3 -right-24 h-[22rem] w-[22rem] rounded-full bg-emerald-500/20 blur-3xl"/>
          <div className="absolute bottom-10 left-1/3 h-64 w-64 rounded-full bg-indigo-400/20 blur-3xl"/>
        </div>
        {children}
        <FooterShell />
      </main>
    </div>
  );
} 