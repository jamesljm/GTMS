"use client";

import { useState } from "react";
import { useTasks } from "@/hooks/use-tasks";
import { useWorkstreams, useUsers } from "@/hooks/use-workstreams";
import { TaskCard } from "@/components/task-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search } from "lucide-react";
import { TaskFormDialog } from "@/components/task-form";

export default function TasksPage() {
  const [filters, setFilters] = useState<Record<string, any>>({ page: 1, limit: 50, sortBy: "dueDate", sortOrder: "asc" });
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useTasks({ ...filters, search: search || undefined });
  const { data: workstreams } = useWorkstreams();
  const { data: users } = useUsers();

  const setFilter = (key: string, value: string) => {
    setFilters(prev => {
      const next = { ...prev, page: 1 };
      if (value === "all") {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tasks</h1>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New Task
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={filters.status || "all"} onValueChange={(v) => setFilter("status", v)}>
              <SelectTrigger className="w-[140px]">
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
              <SelectTrigger className="w-[130px]">
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
              <SelectTrigger className="w-[150px]">
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
              <SelectTrigger className="w-[150px]">
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
        </CardContent>
      </Card>

      {/* Task list */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : data?.tasks?.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No tasks found matching your filters.
            </CardContent>
          </Card>
        ) : (
          data?.tasks?.map((task: any) => (
            <TaskCard key={task.id} task={task} />
          ))
        )}
      </div>

      {/* Pagination */}
      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={data.pagination.page <= 1}
            onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground py-2">
            Page {data.pagination.page} of {data.pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={data.pagination.page >= data.pagination.totalPages}
            onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
          >
            Next
          </Button>
        </div>
      )}

      {/* Create task dialog */}
      <TaskFormDialog open={showCreate} onOpenChange={setShowCreate} />
    </div>
  );
}
