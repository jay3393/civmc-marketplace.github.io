import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">CivMC Tools</h1>
      <p className="text-muted-foreground max-w-prose">
        Contracts marketplace and rail route planner for the CivMC server.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/marketplace" className="rounded-lg border p-6 hover:bg-muted/50 transition">
          <div className="text-xl font-semibold mb-2">Marketplace</div>
          <p className="text-sm text-muted-foreground">
            Browse and bid on contract requests between nations.
          </p>
        </Link>
        <Link href="/routes" className="rounded-lg border p-6 hover:bg-muted/50 transition">
          <div className="text-xl font-semibold mb-2">Routes</div>
          <p className="text-sm text-muted-foreground">
            Plan rail itineraries across nations and hubs.
          </p>
        </Link>
        <Link href="/contracts" className="rounded-lg border p-6 hover:bg-muted/50 transition">
          <div className="text-xl font-semibold mb-2">Contracts</div>
          <p className="text-sm text-muted-foreground">
            Create large-scale contracts; bid on work and resource requests.
          </p>
        </Link>
        <Link href="/events" className="rounded-lg border p-6 hover:bg-muted/50 transition">
          <div className="text-xl font-semibold mb-2">Events</div>
          <p className="text-sm text-muted-foreground">
            Organize and discover server events with date, time, and location.
          </p>
        </Link>
        <Link href="/settlements" className="rounded-lg border p-6 hover:bg-muted/50 transition">
          <div className="text-xl font-semibold mb-2">Settlements</div>
          <p className="text-sm text-muted-foreground">
            Register your settlement and explore others across CivMC.
          </p>
        </Link>
        <Link href="/waitlist" className="rounded-lg border p-6 hover:bg-muted/50 transition">
          <div className="text-xl font-semibold mb-2">SaaS Waitlist</div>
          <p className="text-sm text-muted-foreground">
            Get early access to premium features. Join with Discord.
          </p>
        </Link>
      </div>
    </div>
  );
}
