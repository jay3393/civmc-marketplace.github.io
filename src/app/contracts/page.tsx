export const dynamic = "force-dynamic";

import { Suspense } from "react";
import CreateContract from "./create-contract";
import ContractsView from "./view-client";

export default function ContractsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Contracts</h1>
        <p className="text-muted-foreground">Create and bid on nation-scale jobs and resource requests.</p>
      </div>
      <Suspense fallback={<div>Loading…</div>}>
        <ContractsView />
      </Suspense>
      <CreateContract />
    </div>
  );
} 