export const dynamic = "force-dynamic";

import { Suspense } from "react";
import CreateContract from "./create-contract";

export default function ContractsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Contracts</h1>
        <p className="text-muted-foreground">Create and bid on nation-scale jobs and resource requests.</p>
      </div>
      <Suspense fallback={<div>Loading…</div>}>
        <div className="rounded-lg border">
          <div className="p-4 border-b flex items-center gap-3">
            <input
              placeholder="Search contracts or nations"
              className="w-full sm:w-72 h-9 rounded-md border px-3 text-sm bg-background"
            />
            <select className="h-9 rounded-md border px-3 text-sm bg-background">
              <option>All categories</option>
              <option>Resource</option>
              <option>Construction</option>
              <option>Logistics</option>
            </select>
          </div>
          <div className="p-4">
            <div className="text-sm text-muted-foreground">No contracts yet. Connect API later.</div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-4">Nation</th>
                    <th className="py-2 pr-4">Title</th>
                    <th className="py-2 pr-4">Category</th>
                    <th className="py-2 pr-4">Budget</th>
                    <th className="py-2 pr-4">Deadline</th>
                    <th className="py-2 pr-4"/>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 pr-4">GreatNation</td>
                    <td className="py-2 pr-4">Deliver 10k Stone</td>
                    <td className="py-2 pr-4">Resource</td>
                    <td className="py-2 pr-4">500 diamonds</td>
                    <td className="py-2 pr-4">2025-09-01</td>
                    <td className="py-2 pr-4">
                      <button className="h-8 px-3 rounded-md border">Bid</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Suspense>
      <CreateContract />
    </div>
  );
} 