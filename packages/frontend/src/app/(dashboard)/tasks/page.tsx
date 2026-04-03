"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTasks } from "@/hooks/use-tasks";
import { useWorkstreams, useUsers } from "@/hooks/use-workstreams";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, List, Kanban, BarChart3 } from "lucide-react";
import { TaskFormDialog } from "@/components/task-form";
import { TaskDetailPanel } from "@/components/task-detail-panel";
import { FilterBar } from "@/components/views/filter-bar";
import { ListView } from "@/components/views/list-view";
import { KanbanView } from "@/components/views/kanban-view";
import { GanttView } from "@/components/views/gantt-view";

type ViewType = "list" | "kanban" | "gantt";

export default function TasksPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
      <TasksContent />
    </Suspense>
  );
}

function TasksContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialView = (searchParams.get("view") as ViewType) || "list";
  const initialTaskId = searchParams.get("task") || null;

  const [activeView, setActiveView] = useState<ViewType>(initialView);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(initialTaskId);
  const [showCreate, setShowCreate] = useState(false);
  const [filters, setFilters] = useState<Record<string, any>>({ page: 1, limit: 50, sortBy: "dueDate", sortOrder: "asc" });
  const [search, setSearch] = useState("");
  const [kanbanGroupBy, setKanbanGroupBy] = useState<"status" | "workstream">("status");

  const { data, isLoading } = useTasks({ ...filters, search: search || undefined });
  const { data: workstreams } = useWorkstreams();
  const { data: users } = useUsers();

  const setFilter = useCallback((key: string, value: string) => {
    setFilters(prev => {
      const next = { ...prev, page: 1 };
      if (value === "all") {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });
  }, []);

  const handleSelectTask = useCallback((taskId: string) => {
    setSelectedTaskId(taskId);
    const params = new URLSearchParams(searchParams.toString());
    params.set("task", taskId);
    router.replace(`/tasks?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  const handleClosePanel = useCallback(() => {
    setSelectedTaskId(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("task");
    router.replace(`/tasks?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  const handleViewChange = useCallback((view: string) => {
    setActiveView(view as ViewType);
    const params = new URLSearchParams(searchParams.toString());
    if (view === "list") {
      params.delete("view");
    } else {
      params.set("view", view);
    }
    router.replace(`/tasks?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  const handlePageChange = useCallback((page: number) => {
    setFilters(prev => ({ ...prev, page }));
  }, []);

  // Escape to close detail panel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedTaskId) handleClosePanel();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [selectedTaskId, handleClosePanel]);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Tasks</h1>
        <div className="flex items-center gap-2">
          <Tabs value={activeView} onValueChange={handleViewChange}>
            <TabsList className="h-9">
              <TabsTrigger value="list" className="text-xs gap-1 px-3">
                <List className="h-3.5 w-3.5" /> List
              </TabsTrigger>
              <TabsTrigger value="kanban" className="text-xs gap-1 px-3">
                <Kanban className="h-3.5 w-3.5" /> Kanban
              </TabsTrigger>
              <TabsTrigger value="gantt" className="text-xs gap-1 px-3">
                <BarChart3 className="h-3.5 w-3.5" /> Gantt
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Task
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <FilterBar
        filters={filters}
        setFilter={setFilter}
        search={search}
        setSearch={setSearch}
        workstreams={workstreams || []}
        users={users || []}
      />

      {/* Active view */}
      {activeView === "list" && (
        <ListView
          tasks={data?.tasks || []}
          pagination={data?.pagination}
          isLoading={isLoading}
          selectedTaskId={selectedTaskId}
          onSelectTask={handleSelectTask}
          onPageChange={handlePageChange}
        />
      )}

      {activeView === "kanban" && (
        <KanbanView
          tasks={data?.tasks || []}
          isLoading={isLoading}
          selectedTaskId={selectedTaskId}
          onSelectTask={handleSelectTask}
          groupBy={kanbanGroupBy}
          onGroupByChange={setKanbanGroupBy}
          workstreams={workstreams || []}
        />
      )}

      {activeView === "gantt" && (
        <GanttView
          tasks={data?.tasks || []}
          isLoading={isLoading}
          selectedTaskId={selectedTaskId}
          onSelectTask={handleSelectTask}
          workstreams={workstreams || []}
        />
      )}

      {/* Task detail panel */}
      <TaskDetailPanel
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onClose={handleClosePanel}
      />

      {/* Create task dialog */}
      <TaskFormDialog open={showCreate} onOpenChange={setShowCreate} />
    </div>
  );
}
