export const dynamic = "force-dynamic";

import ClientMap from "@/components/map/client-map";

export default function RoutesPage() {
  return (
    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      <div className="rounded-lg border overflow-hidden min-h-[400px]">
        <ClientMap />
      </div>
      <div className="rounded-lg border p-4 space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Routes</h1>
          <p className="text-muted-foreground">Plan a rail itinerary.</p>
        </div>
        <div className="grid grid-cols-1 gap-2">
          <input placeholder="From nation" className="h-9 rounded-md border px-3 text-sm bg-background" />
          <input placeholder="To nation" className="h-9 rounded-md border px-3 text-sm bg-background" />
          <button className="h-9 rounded-md border px-3 w-fit">Find route</button>
        </div>
        <div className="text-sm text-muted-foreground">No itinerary yet.</div>
      </div>
    </div>
  );
} 