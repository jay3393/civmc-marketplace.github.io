export const dynamic = "force-dynamic";

import { Suspense } from "react";

export default function MarketplacePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Marketplace</h1>
        <p className="text-muted-foreground">Browse open contracts and bids.</p>
      </div>
      <Suspense fallback={<div>Loading…</div>}>
        <div className="rounded-lg border">
          <div className="p-4 border-b flex items-center gap-3">
            <input
              placeholder="Search items or nations"
              className="w-full sm:w-72 h-9 rounded-md border px-3 text-sm bg-background"
            />
            <select className="h-9 rounded-md border px-3 text-sm bg-background">
              <option>All types</option>
              <option>Buy</option>
              <option>Sell</option>
            </select>
          </div>
          <div className="p-4">
            <div className="text-sm text-muted-foreground">No data yet. Connect API later.</div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-4">Nation</th>
                    <th className="py-2 pr-4">Item</th>
                    <th className="py-2 pr-4">Qty</th>
                    <th className="py-2 pr-4">Price</th>
                    <th className="py-2 pr-4">Type</th>
                    <th className="py-2 pr-4"/>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 pr-4">ExampleNation</td>
                    <td className="py-2 pr-4">Iron Ingots</td>
                    <td className="py-2 pr-4">500</td>
                    <td className="py-2 pr-4">200 diamonds</td>
                    <td className="py-2 pr-4">Buy</td>
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
    </div>
  );
} 