"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MultiSelectFilter } from "@/components/multi-select-filter";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Search, SlidersHorizontal, X } from "lucide-react";

interface FilterBarProps {
  filters: Record<string, any>;
  setFilter: (key: string, value: string) => void;
  setMultiFilter?: (key: string, values: string[]) => void;
  search: string;
  setSearch: (s: string) => void;
  workstreams: any[];
  users: any[];
  departments?: any[];
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

export function FilterBar({ filters, setFilter, setMultiFilter, search, setSearch, workstreams, users, departments }: FilterBarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  const deptOptions = (departments || []).map((d: any) => ({
    value: d.id,
    label: `${d.code} - ${d.name}`,
    color: d.color,
  }));

  // Count active filters (excluding search)
  const activeFilterCount = [
    parseMulti(filters.status).length > 0,
    parseMulti(filters.priority).length > 0,
    parseMulti(filters.workstreamId).length > 0,
    parseMulti(filters.departmentId).length > 0,
    parseMulti(filters.assigneeId).length > 0,
    parseMulti(filters.createdById).length > 0,
    parseMulti(filters.acceptanceStatus).length > 0,
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    handleMulti("status", []);
    handleMulti("priority", []);
    handleMulti("workstreamId", []);
    handleMulti("departmentId", []);
    handleMulti("assigneeId", []);
    handleMulti("createdById", []);
    handleMulti("acceptanceStatus", []);
  };

  const filterControls = (
    <>
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
      {deptOptions.length > 0 && (
        <MultiSelectFilter
          label="Department"
          options={deptOptions}
          selected={parseMulti(filters.departmentId)}
          onChange={(v) => handleMulti("departmentId", v)}
        />
      )}
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
    </>
  );

  return (
    <>
      {/* Mobile layout: search + filter button */}
      <div className="flex sm:hidden gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            className="pl-9 h-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button
          variant={activeFilterCount > 0 ? "default" : "outline"}
          size="sm"
          className="h-9 px-3 min-w-[44px]"
          onClick={() => setDrawerOpen(true)}
        >
          <SlidersHorizontal className="h-4 w-4" />
          {activeFilterCount > 0 && (
            <span className="ml-1 text-xs">{activeFilterCount}</span>
          )}
        </Button>
      </div>

      {/* Mobile filter drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] overflow-y-auto px-4 pb-6">
          <SheetHeader className="pb-3">
            <SheetTitle>Filters</SheetTitle>
            <SheetDescription className="sr-only">Filter tasks by status, priority, and more</SheetDescription>
          </SheetHeader>
          <div className="space-y-3">
            {filterControls}
          </div>
          <div className="flex gap-2 mt-6 pt-4 border-t">
            <Button
              variant="outline"
              className="flex-1 h-11"
              onClick={() => {
                clearAllFilters();
                setDrawerOpen(false);
              }}
              disabled={activeFilterCount === 0}
            >
              <X className="h-4 w-4 mr-1" />
              Clear All
            </Button>
            <Button
              className="flex-1 h-11"
              onClick={() => setDrawerOpen(false)}
            >
              Apply ({activeFilterCount})
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop layout: inline filters */}
      <div className="hidden sm:flex flex-wrap gap-2 mb-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            className="pl-9 h-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {filterControls}
      </div>
    </>
  );
}
