"use client";

import { Input } from "@/components/ui/input";
import { MultiSelectFilter } from "@/components/multi-select-filter";
import { Search } from "lucide-react";

interface FilterBarProps {
  filters: Record<string, any>;
  setFilter: (key: string, value: string) => void;
  setMultiFilter?: (key: string, values: string[]) => void;
  search: string;
  setSearch: (s: string) => void;
  workstreams: any[];
  users: any[];
}

const statusOptions = [
  { value: "Not Started", label: "Not Started" },
  { value: "In Progress", label: "In Progress" },
  { value: "Waiting On", label: "Waiting On" },
  { value: "Blocked", label: "Blocked" },
  { value: "Done", label: "Done" },
];

const priorityOptions = [
  { value: "Critical", label: "Critical" },
  { value: "High", label: "High" },
  { value: "Medium", label: "Medium" },
  { value: "Low", label: "Low" },
];

const acceptanceOptions = [
  { value: "Accepted", label: "Accepted" },
  { value: "Pending", label: "Pending" },
  { value: "Changes Requested", label: "Changes Requested" },
  { value: "Reproposed", label: "Reproposed" },
];

function parseMulti(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return String(val).split(",").filter(Boolean);
}

export function FilterBar({ filters, setFilter, setMultiFilter, search, setSearch, workstreams, users }: FilterBarProps) {
  const handleMulti = (key: string, values: string[]) => {
    if (setMultiFilter) {
      setMultiFilter(key, values);
    } else {
      // Fallback: join as comma-separated for single-value setFilter
      setFilter(key, values.length > 0 ? values.join(",") : "all");
    }
  };

  const wsOptions = (workstreams || []).map((ws: any) => ({
    value: ws.id,
    label: `${ws.code} - ${ws.name}`,
    color: ws.color,
  }));

  const assigneeOptions = (users || []).map((u: any) => ({
    value: u.id,
    label: u.name,
  }));

  const initiatorOptions = (users || []).map((u: any) => ({
    value: u.id,
    label: u.name,
  }));

  return (
    <div className="flex flex-wrap gap-2 mb-3">
      <div className="relative flex-1 min-w-[180px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search tasks..."
          className="pl-9 h-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <MultiSelectFilter
        label="Status"
        options={statusOptions}
        selected={parseMulti(filters.status)}
        onChange={(v) => handleMulti("status", v)}
      />
      <MultiSelectFilter
        label="Priority"
        options={priorityOptions}
        selected={parseMulti(filters.priority)}
        onChange={(v) => handleMulti("priority", v)}
      />
      <MultiSelectFilter
        label="Workstream"
        options={wsOptions}
        selected={parseMulti(filters.workstreamId)}
        onChange={(v) => handleMulti("workstreamId", v)}
      />
      <MultiSelectFilter
        label="Assignee"
        options={assigneeOptions}
        selected={parseMulti(filters.assigneeId)}
        onChange={(v) => handleMulti("assigneeId", v)}
      />
      <MultiSelectFilter
        label="Initiator"
        options={initiatorOptions}
        selected={parseMulti(filters.createdById)}
        onChange={(v) => handleMulti("createdById", v)}
      />
      <MultiSelectFilter
        label="Acceptance"
        options={acceptanceOptions}
        selected={parseMulti(filters.acceptanceStatus)}
        onChange={(v) => handleMulti("acceptanceStatus", v)}
      />
    </div>
  );
}
