import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">CivHub</h1>
      <p className="text-muted-foreground max-w-prose">
        Contracts marketplace and rail route planner for the CivHub server.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/marketplace" className="rounded-lg border p-6 hover:bg-muted/50 transition">
          <div className="text-xl font-semibold mb-2">Marketplace</div>
          <p className="text-sm text-muted-foreground">
            Browse and bid on contract requests between nations.
          </p>
        </Link>
        {/* Disabled: WIP */}
        {process.env.NEXT_PUBLIC_ALLOW_WIP_ROUTES === "true" ? (
        <Link href="/routes" className="rounded-lg border p-6 hover:bg-muted/50 transition">
          <div className="text-xl font-semibold mb-2">Routes</div>
          <p className="text-sm text-muted-foreground">
            Plan rail itineraries across nations and hubs.
          </p>
        </Link>) : null}
        <Link href="/contracts" className="rounded-lg border p-6 hover:bg-muted/50 transition">
          <div className="text-xl font-semibold mb-2">Contracts</div>
          <p className="text-sm text-muted-foreground">
            Create large-scale contracts; bid on work and resource requests.
          </p>
        </Link>
        {/* Disabled: WIP */}
        {process.env.NEXT_PUBLIC_ALLOW_WIP_ROUTES === "true" ? (
        <Link href="/events" className="rounded-lg border p-6 hover:bg-muted/50 transition">
          <div className="text-xl font-semibold mb-2">Events</div>
          <p className="text-sm text-muted-foreground">
            Organize and discover server events with date, time, and location.
          </p>
        </Link>) : null}
        <Link href="/claims" className="rounded-lg border p-6 hover:bg-muted/50 transition">
          <div className="text-xl font-semibold mb-2">Claims</div>
          <p className="text-sm text-muted-foreground">
            Register your claims and explore nations and settlements across CivHub.
          </p>
        </Link>
      </div>
    </div>
  );
}
