export const dynamic = "force-dynamic";

import { Suspense } from "react";
import CreateContract from "./create-contract";
import ContractsTable from "./table-client";

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
            <ContractsTable />
          </div>
        </div>
      </Suspense>
      <CreateContract />
    </div>
  );
} 