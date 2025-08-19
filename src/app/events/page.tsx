export const dynamic = "force-dynamic";

export default function EventsPage() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
      <div className="rounded-lg border p-4 space-y-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Events</h1>
          <p className="text-muted-foreground">Create and discover events across CivHub.</p>
        </div>
        <input placeholder="Event title" className="h-9 rounded-md border px-3 text-sm bg-background w-full" />
        <div className="grid grid-cols-2 gap-2">
          <input type="date" className="h-9 rounded-md border px-3 text-sm bg-background" />
          <input type="time" className="h-9 rounded-md border px-3 text-sm bg-background" />
        </div>
        <input placeholder="Location (coords or landmark)" className="h-9 rounded-md border px-3 text-sm bg-background w-full" />
        <input placeholder="Host nation (optional)" className="h-9 rounded-md border px-3 text-sm bg-background w-full" />
        <textarea placeholder="Description" className="min-h-24 rounded-md border p-3 text-sm bg-background w-full" />
        <button className="h-9 rounded-md border px-3 w-fit">Create event</button>
      </div>
      <div className="rounded-lg border p-4">
        <div className="text-sm text-muted-foreground">Upcoming events</div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4">Event</th>
                <th className="py-2 pr-4">Host</th>
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Time</th>
                <th className="py-2 pr-4">Location</th>
                <th className="py-2 pr-4"/>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2 pr-4">Wedding Ceremony</td>
                <td className="py-2 pr-4">femyboysilly</td>
                <td className="py-2 pr-4">2025-08-12</td>
                <td className="py-2 pr-4">18:00 UTC</td>
                <td className="py-2 pr-4">Heikki</td>
                <td className="py-2 pr-4">
                  <button className="h-8 px-3 rounded-md border">Details</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 