"use client";

import { useState } from "react";
import { useAuditLogs, useMyAuditLogs } from "@/hooks/use-audit";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const actionLabels: Record<string, { label: string; color: string }> = {
  "task.created": { label: "Created", color: "bg-green-100 text-green-700" },
  "task.updated": { label: "Updated", color: "bg-blue-100 text-blue-700" },
  "task.deleted": { label: "Deleted", color: "bg-red-100 text-red-700" },
  "task.completed": { label: "Completed", color: "bg-emerald-100 text-emerald-700" },
  "task.assigned": { label: "Assigned", color: "bg-purple-100 text-purple-700" },
  "task.accepted": { label: "Accepted", color: "bg-green-100 text-green-700" },
  "task.changes_requested": { label: "Changes Requested", color: "bg-amber-100 text-amber-700" },
  "task.reproposed": { label: "Reproposed", color: "bg-violet-100 text-violet-700" },
};

function parseDetails(details: string | null): Record<string, any> | null {
  if (!details) return null;
  try {
    return JSON.parse(details);
  } catch {
    return null;
  }
}

function DetailsCell({ details }: { details: string | null }) {
  const parsed = parseDetails(details);
  if (!parsed) return <span className="text-muted-foreground">-</span>;

  // For task.created, show title
  if (parsed.title) {
    return <span className="text-xs">{parsed.title}</span>;
  }

  // For task.updated, show changed fields
  const entries = Object.entries(parsed);
  if (entries.length === 0) return <span className="text-muted-foreground">-</span>;

  return (
    <div className="text-xs space-y-0.5">
      {entries.slice(0, 3).map(([key, val]: [string, any]) => (
        <div key={key}>
          <span className="text-muted-foreground">{key}: </span>
          {val?.from !== undefined ? (
            <span>{String(val.from || "-")} → {String(val.to || "-")}</span>
          ) : (
            <span>{String(val)}</span>
          )}
        </div>
      ))}
      {entries.length > 3 && (
        <span className="text-muted-foreground">+{entries.length - 3} more</span>
      )}
    </div>
  );
}

export default function ActivityPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "ED";
  const [tab, setTab] = useState<"all" | "mine">(isAdmin ? "all" : "mine");
  const [actionFilter, setActionFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const filters: Record<string, any> = { page, limit: 50 };
  if (actionFilter !== "all") filters.action = actionFilter;
  if (dateFrom) filters.dateFrom = dateFrom;
  if (dateTo) filters.dateTo = dateTo;

  const allLogs = useAuditLogs(tab === "all" ? filters : {});
  const myLogs = useMyAuditLogs(tab === "mine" ? filters : {});
  const { data, isLoading } = tab === "all" ? allLogs : myLogs;

  const logs = data?.logs || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Activity Log</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {isAdmin ? "Track all task actions across the organization" : "Your task activity history"}
        </p>
      </div>

      {/* Tabs */}
      {isAdmin && (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={tab === "all" ? "default" : "outline"}
            className="h-8"
            onClick={() => { setTab("all"); setPage(1); }}
          >
            All Activity
          </Button>
          <Button
            size="sm"
            variant={tab === "mine" ? "default" : "outline"}
            className="h-8"
            onClick={() => { setTab("mine"); setPage(1); }}
          >
            My Activity
          </Button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[170px] h-9">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {Object.entries(actionLabels).map(([key, { label }]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">From:</span>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="h-9 w-[150px]"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">To:</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="h-9 w-[150px]"
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No activity logs found.
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Time</th>
                  {tab === "all" && <th className="text-left p-3 text-xs font-medium text-muted-foreground">User</th>}
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Action</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log: any) => {
                  const actionInfo = actionLabels[log.action] || { label: log.action, color: "bg-gray-100 text-gray-700" };
                  return (
                    <tr key={log.id} className="border-t hover:bg-accent/30 transition-colors">
                      <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.createdAt), "dd MMM yyyy HH:mm")}
                      </td>
                      {tab === "all" && (
                        <td className="p-3 text-xs font-medium">{log.user?.name}</td>
                      )}
                      <td className="p-3">
                        <Badge variant="outline" className={cn("text-[10px]", actionInfo.color)}>
                          {actionInfo.label}
                        </Badge>
                      </td>
                      <td className="p-3 max-w-[300px]">
                        <DetailsCell details={log.details} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
