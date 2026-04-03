"use client";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

interface FilterBarProps {
  filters: Record<string, any>;
  setFilter: (key: string, value: string) => void;
  search: string;
  setSearch: (s: string) => void;
  workstreams: any[];
  users: any[];
}

export function FilterBar({ filters, setFilter, search, setSearch, workstreams, users }: FilterBarProps) {
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
      <Select value={filters.status || "all"} onValueChange={(v) => setFilter("status", v)}>
        <SelectTrigger className="w-[130px] h-9">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="Not Started">Not Started</SelectItem>
          <SelectItem value="In Progress">In Progress</SelectItem>
          <SelectItem value="Waiting On">Waiting On</SelectItem>
          <SelectItem value="Blocked">Blocked</SelectItem>
          <SelectItem value="Done">Done</SelectItem>
        </SelectContent>
      </Select>
      <Select value={filters.priority || "all"} onValueChange={(v) => setFilter("priority", v)}>
        <SelectTrigger className="w-[120px] h-9">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Priority</SelectItem>
          <SelectItem value="Critical">Critical</SelectItem>
          <SelectItem value="High">High</SelectItem>
          <SelectItem value="Medium">Medium</SelectItem>
          <SelectItem value="Low">Low</SelectItem>
        </SelectContent>
      </Select>
      <Select value={filters.workstreamId || "all"} onValueChange={(v) => setFilter("workstreamId", v)}>
        <SelectTrigger className="w-[140px] h-9">
          <SelectValue placeholder="Workstream" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Workstreams</SelectItem>
          {workstreams?.map((ws: any) => (
            <SelectItem key={ws.id} value={ws.id}>{ws.code} - {ws.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={filters.assigneeId || "all"} onValueChange={(v) => setFilter("assigneeId", v)}>
        <SelectTrigger className="w-[140px] h-9">
          <SelectValue placeholder="Assignee" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Assignees</SelectItem>
          {users?.map((u: any) => (
            <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
