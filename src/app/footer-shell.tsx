export default function FooterShell() {
  const year = new Date().getFullYear();
  const discordInvite = process.env.NEXT_PUBLIC_DISCORD_INVITE_URL || "https://discord.gg/8s7NYH5DFb";
  const botInvite = process.env.NEXT_PUBLIC_BOT_INVITE_URL || "#";

  return (
    <footer className="border-t mt-12">
      <div className="container mx-auto px-4 py-6 grid gap-4 sm:grid-cols-[1fr_auto] items-center">
        <div className="space-y-1 text-sm text-muted-foreground">
          <div>© {year} CivHub • All rights reserved.</div>
          <div>This site is a community-built third-party tool and is not affiliated with or endorsed by the CivMC server.</div>
        </div>
        <div className="flex items-center gap-3">
          <a href={discordInvite} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted transition" aria-label="Join our Discord">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
              <path d="M20.317 4.369a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.211.375-.444.864-.608 1.249-1.844-.276-3.68-.276-5.486 0-.164-.398-.405-.874-.617-1.249a.077.077 0 00-.079-.037 19.736 19.736 0 00-4.885 1.515.07.07 0 00-.032.027C.533 9.045-.32 13.58.099 18.057a.082.082 0 00.031.057c2.052 1.506 4.041 2.422 5.993 3.029a.077.077 0 00.084-.027c.461-.63.873-1.295 1.226-1.994a.074.074 0 00-.041-.102c-.652-.247-1.27-.549-1.861-.892a.075.075 0 01-.007-.124c.125-.094.25-.192.368-.291a.074.074 0 01.077-.01c3.927 1.793 8.18 1.793 12.061 0a.074.074 0 01.078.01c.118.099.243.197.368.291a.075.075 0 01-.006.124c-.591.343-1.209.645-1.861.892a.074.074 0 00-.041.103c.36.698.772 1.362 1.226 1.993a.076.076 0 00.084.028c1.953-.607 3.942-1.523 5.993-3.03a.082.082 0 00.031-.056c.5-5.251-.838-9.737-3.548-13.661a.061.061 0 00-.031-.028zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.211 0 2.175 1.095 2.157 2.419 0 1.334-.955 2.419-2.157 2.419zm7.974 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.211 0 2.175 1.095 2.157 2.419 0 1.334-.946 2.419-2.157 2.419z"/>
            </svg>
            <span>Join Discord</span>
          </a>
          <a href={botInvite} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted transition" aria-label="Invite our bot">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
              <path d="M5 3h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-3 4-3-4H5a2 2 0 01-2-2V5a2 2 0 012-2zm3 5a1 1 0 100 2h8a1 1 0 100-2H8zm0 4a1 1 0 100 2h5a1 1 0 100-2H8z"/>
            </svg>
            <span>Invite Bot</span>
          </a>
        </div>
      </div>
    </footer>
  );
} 