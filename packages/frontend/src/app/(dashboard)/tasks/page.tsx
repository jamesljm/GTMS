"use client";

import { useState, useCallback, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTasks, useInfiniteTasks } from "@/hooks/use-tasks";
import { useWorkstreams, useUsers } from "@/hooks/use-workstreams";
import { useDepartments } from "@/hooks/use-departments";
import { useUIStore } from "@/store/ui-store";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, List, Kanban, BarChart3, ArrowUpDown,
  CalendarDays, AlignJustify, LayoutGrid, PanelRight,
} from "lucide-react";
import { TaskFormDialog } from "@/components/task-form";
import { TaskDetailPanel } from "@/components/task-detail-panel";
import { FilterBar } from "@/components/views/filter-bar";
import { ListView } from "@/components/views/list-view";
import { KanbanView } from "@/components/views/kanban-view";
import { GanttView } from "@/components/views/gantt-view";
import { CalendarView } from "@/components/views/calendar-view";
import { cn } from "@/lib/utils";

type ViewType = "list" | "kanban" | "gantt" | "calendar";
type GroupBy = "none" | "workstream" | "assignee" | "priority" | "department";

const VIEW_OPTIONS = [
  { value: "list", label: "List", icon: List },
  { value: "kanban", label: "Kanban", icon: Kanban },
  { value: "gantt", label: "Gantt", icon: BarChart3 },
  { value: "calendar", label: "Calendar", icon: CalendarDays },
] as const;

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
  const { viewDensity, setViewDensity, detailPanelMode, setDetailPanelMode } = useUIStore();

  const initialView = (searchParams.get("view") as ViewType) || "list";
  const initialTaskId = searchParams.get("task") || null;

  // Parse initial filters from URL (for dashboard drilldown)
  const initialFilters = useMemo(() => {
    const f: Record<string, any> = { page: 1, limit: 50, sortBy: "dueDate", sortOrder: "asc" };
    const priority = searchParams.get("priority");
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const workstreamId = searchParams.get("workstreamId");
    const assigneeId = searchParams.get("assigneeId");
    const sortBy = searchParams.get("sortBy");
    const sortOrder = searchParams.get("sortOrder");
    const dueBefore = searchParams.get("dueBefore");
    if (priority) f.priority = priority;
    if (status) f.status = status;
    if (type) f.type = type;
    if (workstreamId) f.workstreamId = workstreamId;
    if (assigneeId) f.assigneeId = assigneeId;
    if (sortBy) f.sortBy = sortBy;
    if (sortOrder) f.sortOrder = sortOrder;
    if (dueBefore) f.dueBefore = dueBefore;
    return f;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [activeView, setActiveView] = useState<ViewType>(initialView);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(initialTaskId);
  const [showCreate, setShowCreate] = useState(false);
  const [filters, setFilters] = useState<Record<string, any>>(initialFilters);
  const initialSearch = searchParams.get("search") || "";
  const [search, setSearch] = useState(initialSearch);
  const [kanbanGroupBy, setKanbanGroupBy] = useState<"status" | "workstream">("status");
  const [listGroupBy, setListGroupBy] = useState<GroupBy>("none");

  const isCompactList = viewDensity === "compact" && activeView === "list";

  // Use infinite query for compact list, regular query otherwise
  const regularQuery = useTasks(isCompactList ? {} : { ...filters, search: search || undefined });
  const infiniteQuery = useInfiniteTasks(isCompactList ? { ...filters, search: search || undefined } : {});

  // Derive tasks and metadata based on mode
  const tasks = isCompactList
    ? infiniteQuery.data?.pages.flatMap((p: any) => p.tasks) || []
    : regularQuery.data?.tasks || [];
  const pagination = isCompactList ? undefined : regularQuery.data?.pagination;
  const totalCount = isCompactList
    ? infiniteQuery.data?.pages[0]?.pagination?.total ?? 0
    : regularQuery.data?.pagination?.total ?? 0;
  const isLoading = isCompactList ? infiniteQuery.isLoading : regularQuery.isLoading;

  const { data: workstreams } = useWorkstreams();
  const { data: users } = useUsers();
  const { data: departments } = useDepartments();

  const isPinned = detailPanelMode === "pinned";

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

  const setMultiFilter = useCallback((key: string, values: string[]) => {
    setFilters(prev => {
      const next = { ...prev, page: 1 };
      if (values.length === 0) {
        delete next[key];
      } else {
        next[key] = values.join(",");
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

  const handleSort = useCallback((sortBy: string) => {
    setFilters(prev => {
      const sameField = prev.sortBy === sortBy;
      return { ...prev, sortBy, sortOrder: sameField && prev.sortOrder === "asc" ? "desc" : "asc" };
    });
  }, []);

  // Escape to close detail panel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedTaskId) handleClosePanel();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [selectedTaskId, handleClosePanel]);

  const ActiveViewIcon = VIEW_OPTIONS.find(v => v.value === activeView)?.icon || List;

  const viewContent = (
    <>
      {activeView === "list" && (
        <ListView
          tasks={tasks}
          pagination={pagination}
          isLoading={isLoading}
          selectedTaskId={selectedTaskId}
          onSelectTask={handleSelectTask}
          onPageChange={handlePageChange}
          groupBy={listGroupBy}
          workstreams={workstreams || []}
          viewDensity={viewDensity}
          hasNextPage={isCompactList ? infiniteQuery.hasNextPage : undefined}
          isFetchingNextPage={isCompactList ? infiniteQuery.isFetchingNextPage : undefined}
          onLoadMore={isCompactList ? () => infiniteQuery.fetchNextPage() : undefined}
        />
      )}

      {activeView === "kanban" && (
        <KanbanView
          tasks={regularQuery.data?.tasks || []}
          isLoading={regularQuery.isLoading}
          selectedTaskId={selectedTaskId}
          onSelectTask={handleSelectTask}
          groupBy={kanbanGroupBy}
          onGroupByChange={setKanbanGroupBy}
          workstreams={workstreams || []}
        />
      )}

      {activeView === "gantt" && (
        <GanttView
          tasks={regularQuery.data?.tasks || []}
          isLoading={regularQuery.isLoading}
          selectedTaskId={selectedTaskId}
          onSelectTask={handleSelectTask}
          workstreams={workstreams || []}
        />
      )}

      {activeView === "calendar" && (
        <CalendarView
          tasks={regularQuery.data?.tasks || []}
          isLoading={regularQuery.isLoading}
          selectedTaskId={selectedTaskId}
          onSelectTask={handleSelectTask}
        />
      )}
    </>
  );

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2 min-w-0">
          {/* Mobile: view selector dropdown */}
          <div className="sm:hidden">
            <Select value={activeView} onValueChange={handleViewChange}>
              <SelectTrigger className="h-9 w-[110px] text-xs gap-1">
                <ActiveViewIcon className="h-3.5 w-3.5 shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VIEW_OPTIONS.map((v) => (
                  <SelectItem key={v.value} value={v.value} className="text-xs">
                    <span className="flex items-center gap-1.5">
                      <v.icon className="h-3.5 w-3.5" />
                      {v.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Desktop: tab buttons */}
          <div className="hidden sm:block">
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
                <TabsTrigger value="calendar" className="text-xs gap-1 px-3">
                  <CalendarDays className="h-3.5 w-3.5" /> Calendar
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Mobile: icon-only new task button */}
          <Button size="sm" onClick={() => setShowCreate(true)} className="sm:hidden h-9 w-9 p-0">
            <Plus className="h-4 w-4" />
          </Button>
          {/* Desktop: full new task button */}
          <Button size="sm" onClick={() => setShowCreate(true)} className="hidden sm:flex">
            <Plus className="h-4 w-4 mr-1" /> New Task
          </Button>

          {/* Density toggle - hidden on mobile */}
          {activeView === "list" && (
            <div className="hidden sm:flex items-center border rounded-md">
              <Button
                size="sm"
                variant={viewDensity === "default" ? "default" : "ghost"}
                className="h-8 w-8 p-0 rounded-r-none"
                onClick={() => setViewDensity("default")}
              >
                <AlignJustify className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant={viewDensity === "compact" ? "default" : "ghost"}
                className="h-8 w-8 p-0 rounded-l-none"
                onClick={() => setViewDensity("compact")}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {/* Pin toggle */}
          <Button
            size="sm"
            variant={isPinned ? "default" : "outline"}
            className="h-8 w-8 p-0 hidden lg:flex"
            onClick={() => setDetailPanelMode(isPinned ? "overlay" : "pinned")}
            title={isPinned ? "Unpin detail panel" : "Pin detail panel"}
          >
            <PanelRight className="h-3.5 w-3.5" />
          </Button>
        </div>
        <h1 className="text-lg sm:text-2xl font-bold shrink-0">Tasks</h1>
      </div>

      {/* Filter bar */}
      <FilterBar
        filters={filters}
        setFilter={setFilter}
        setMultiFilter={setMultiFilter}
        search={search}
        setSearch={setSearch}
        workstreams={workstreams || []}
        users={users || []}
        departments={departments || []}
      />

      {/* Sort & Group controls for list view */}
      {activeView === "list" && (
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm">
          {/* Total count */}
          {totalCount > 0 && (
            <span className="text-sm font-medium text-muted-foreground">
              {totalCount} task{totalCount !== 1 ? "s" : ""}
            </span>
          )}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground hidden sm:inline">Sort:</span>
            <Select value={filters.sortBy || "dueDate"} onValueChange={v => handleSort(v)}>
              <SelectTrigger className="h-7 w-[100px] sm:w-[120px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dueDate">Due Date</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="title">Title</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="createdAt">Created</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setFilters(prev => ({ ...prev, sortOrder: prev.sortOrder === "asc" ? "desc" : "asc" }))}>
              {filters.sortOrder === "desc" ? "Z-A" : "A-Z"}
            </Button>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground hidden sm:inline">Group:</span>
            <Select value={listGroupBy} onValueChange={v => setListGroupBy(v as GroupBy)}>
              <SelectTrigger className="h-7 w-[100px] sm:w-[120px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Grouping</SelectItem>
                <SelectItem value="workstream">By Workstream</SelectItem>
                <SelectItem value="department">By Department</SelectItem>
                <SelectItem value="assignee">By Assignee</SelectItem>
                <SelectItem value="priority">By Priority</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Main content area: task views + optional pinned detail panel */}
      {isPinned ? (
        <div className="flex gap-0 border rounded-lg overflow-hidden" style={{ height: "calc(100vh - 320px)" }}>
          {/* Task view area */}
          <div className="flex-1 min-w-0 overflow-y-auto p-2">
            {viewContent}
          </div>
          {/* Pinned detail panel */}
          <div className="w-[420px] shrink-0 border-l overflow-y-auto hidden lg:block">
            <TaskDetailPanel
              taskId={selectedTaskId}
              open={!!selectedTaskId}
              onClose={handleClosePanel}
              mode="pinned"
              onNavigateToTask={handleSelectTask}
            />
          </div>
        </div>
      ) : (
        <>
          {viewContent}
          <TaskDetailPanel
            taskId={selectedTaskId}
            open={!!selectedTaskId}
            onClose={handleClosePanel}
            mode="overlay"
            onNavigateToTask={handleSelectTask}
          />
        </>
      )}

      {/* Create task dialog */}
      <TaskFormDialog open={showCreate} onOpenChange={setShowCreate} />
    </div>
  );
}
