"use client";

import { useState } from "react";
import ContractsTable from "./table-client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ContractsView() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  return (
    <div className="rounded-lg border">
      <div className="p-4 border-b flex items-center gap-3">
        <Input
          placeholder="Search contracts or nations"
          className="w-full sm:w-72 h-9 placeholder:text-muted-foreground"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={category ?? "all"} onValueChange={(v) => setCategory(v === "all" ? null : v)}>
          <SelectTrigger className="h-9 w-[200px] text-foreground data-[placeholder]:text-muted-foreground">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            <SelectItem value="Resource">Resource</SelectItem>
            <SelectItem value="Construction">Construction</SelectItem>
            <SelectItem value="Logistics">Logistics</SelectItem>
            <SelectItem value="Service">Service</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="p-4">
        <ContractsTable searchQuery={search} category={category} />
      </div>
    </div>
  );
} 