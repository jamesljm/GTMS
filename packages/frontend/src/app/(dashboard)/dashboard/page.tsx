"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskCard } from "@/components/task-card";
import { TaskDetailPanel } from "@/components/task-detail-panel";
import { FilterBar } from "@/components/views/filter-bar";
import { useDashboardStats, useDashboardToday, useDashboardWaiting, useDashboardCritical, useWorkstreamSummary, useDepartmentSummary, useTeamSummary } from "@/hooks/use-dashboard";
import { useTasks } from "@/hooks/use-tasks";
import { useWorkstreams, useUsers } from "@/hooks/use-workstreams";
import { useDepartments } from "@/hooks/use-departments";
import { useAuthStore } from "@/store/auth-store";
import { filterTasks } from "@/lib/filter-tasks";
import { AlertTriangle, Building2, Clock, Eye, ListTodo, XCircle, Layers, ArrowUpRight, Flame, Sun, CheckCircle2, Users, Inbox } from "lucide-react";
import Link from "next/link";
import { useState, useCallback } from "react";
import { format, isPast, isToday } from "date-fns";
import { cn } from "@/lib/utils";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

const priorityDot: Record<string, string> = {
  Critical: "bg-rose-500",
  High: "bg-amber-500",
  Medium: "bg-blue-500",
  Low: "bg-slate-500",
};

const avatarColors = [
  "bg-blue-500/90", "bg-emerald-500/90", "bg-violet-500/90", "bg-orange-500/90",
  "bg-pink-500/90", "bg-teal-500/90", "bg-indigo-500/90", "bg-amber-500/90",
];
function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}
function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function TaskRow({ task, onClick, isSelected }: { task: any; onClick: (id: string) => void; isSelected: boolean }) {
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const isDone = ["Done", "Cancelled"].includes(task.status);
  const overdue = !!dueDate && isPast(dueDate) && !isToday(dueDate) && !isDone;
  const dueToday = !!dueDate && isToday(dueDate);

  return (
    <button
      type="button"
      onClick={() => onClick(task.id)}
      className={cn(
        "group flex w-full items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-left transition-colors",
        overdue
          ? "border-l-red-500/60 bg-red-500/[0.05] hover:bg-red-500/[0.09]"
          : "border-l-transparent hover:bg-accent/60",
        isSelected && "border-l-primary bg-accent"
      )}
    >
      <span className={cn("h-2 w-2 shrink-0 rounded-full", priorityDot[task.priority] || "bg-slate-500")} />

      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm font-medium", isDone && "text-muted-foreground line-through")}>
          {task.title}
        </p>
        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="font-mono">{task.id.slice(0, 6)}</span>
          {task.workstream && (
            <>
              <span className="opacity-40">·</span>
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: task.workstream.color }} />
                {task.workstream.code}
              </span>
            </>
          )}
          <span className="opacity-40">·</span>
          <span>{task.status}</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2.5">
        {dueDate && (
          <span
            className={cn(
              "whitespace-nowrap text-xs",
              overdue ? "font-medium text-red-500" : dueToday ? "font-medium text-amber-500" : "text-muted-foreground"
            )}
          >
            {overdue ? `Overdue · ${format(dueDate, "d MMM")}` : dueToday ? "Due today" : format(dueDate, "d MMM")}
          </span>
        )}
        {task.assignee && (
          <span
            className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white", getAvatarColor(task.assignee.name))}
            title={task.assignee.name}
          >
            {getInitials(task.assignee.name)}
          </span>
        )}
      </div>
    </button>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data: stats } = useDashboardStats();
  const { data: todayTasks } = useDashboardToday();
  const { data: waitingTasks } = useDashboardWaiting();
  const { data: criticalTasks } = useDashboardCritical();
  const { data: workstreamSummary } = useWorkstreamSummary();
  const { data: departmentSummary } = useDepartmentSummary();
  const { data: teamSummary } = useTeamSummary();
  const { data: workstreams } = useWorkstreams();
  const { data: users } = useUsers();
  const { data: departments } = useDepartments();

  const { data: myTasksData } = useTasks({ assigneeId: user?.id || "none", sortBy: "dueDate", sortOrder: "asc", limit: 50 });
  const { data: overdueData } = useTasks({ dueBefore: "overdue", sortBy: "dueDate", sortOrder: "asc", limit: 50 });

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [search, setSearch] = useState("");

  const setFilter = useCallback((key: string, value: string) => {
    setFilters(prev => {
      const next = { ...prev };
      if (value === "all") { delete next[key]; } else { next[key] = value; }
      return next;
    });
  }, []);

  const setMultiFilter = useCallback((key: string, values: string[]) => {
    setFilters(prev => {
      const next = { ...prev };
      if (values.length === 0) { delete next[key]; } else { next[key] = values.join(","); }
      return next;
    });
  }, []);

  const hasFilters = search || Object.keys(filters).length > 0;
  const filteredToday = hasFilters ? filterTasks(todayTasks || [], filters, search) : todayTasks;
  const filteredWaiting = hasFilters ? filterTasks(waitingTasks || [], filters, search) : waitingTasks;
  const filteredCritical = hasFilters ? filterTasks(criticalTasks || [], filters, search) : criticalTasks;

  const handleSelectTask = useCallback((taskId: string) => setSelectedTaskId(taskId), []);
  const handleClosePanel = useCallback(() => setSelectedTaskId(null), []);

  const firstName = user?.name?.split(" ")[0] ?? "";

  // ----- Derived data -----
  const myTasks = (myTasksData?.tasks || [])
    .filter((t: any) => !["Done", "Cancelled"].includes(t.status))
    .sort((a: any, b: any) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  const overdueTasks = overdueData?.tasks || [];

  const done = stats?.done ?? 0;
  const active = stats?.total ?? 0;
  const grandTotal = active + done;
  const completion = grandTotal ? Math.round((done / grandTotal) * 100) : 0;

  const statusSegments = stats ? [
    { label: "In Progress", value: stats.inProgress, color: "bg-blue-500", href: "/tasks?status=In+Progress" },
    { label: "Not Started", value: stats.notStarted, color: "bg-slate-400", href: "/tasks?status=Not+Started" },
    { label: "Waiting On", value: stats.waitingOn, color: "bg-amber-500", href: "/tasks?type=Waiting+On" },
    { label: "Blocked", value: stats.blocked, color: "bg-rose-500", href: "/tasks?status=Blocked" },
  ].filter(s => s.value > 0) : [];

  const statCards = stats ? [
    { label: "Active", value: stats.total, href: "/tasks", icon: ListTodo, chip: "bg-blue-500/10 text-blue-600 dark:text-blue-400", tone: "" },
    { label: "Overdue", value: stats.overdue, href: "/tasks?sortBy=dueDate&sortOrder=asc&dueBefore=overdue", icon: AlertTriangle, chip: "bg-red-500/10 text-red-600 dark:text-red-400", tone: "text-red-500" },
    { label: "This Week", value: stats.dueThisWeek, href: "/tasks?sortBy=dueDate&sortOrder=asc&dueBefore=thisWeek", icon: Clock, chip: "bg-amber-500/10 text-amber-600 dark:text-amber-400", tone: "" },
    { label: "Critical", value: stats.critical, href: "/tasks?priority=Critical", icon: XCircle, chip: "bg-rose-500/10 text-rose-600 dark:text-rose-400", tone: "text-rose-500" },
    { label: "Waiting On", value: stats.waitingOn, href: "/tasks?type=Waiting+On", icon: Eye, chip: "bg-violet-500/10 text-violet-600 dark:text-violet-400", tone: "" },
  ] : [];

  const team = (teamSummary || []).slice().sort((a: any, b: any) => b.activeTasks - a.activeTasks);
  const maxActive = Math.max(1, ...team.map((t: any) => t.activeTasks));

  return (
    <div className="space-y-6">
      {/* Greeting header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {greeting()}{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground">Here's what's happening at Geohan Corporation today.</p>
        </div>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {/* KPI tiles */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {statCards.map((c) => (
            <Link key={c.label} href={c.href} className="group">
              <div className="rounded-xl border bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md hover:shadow-primary/5">
                <div className="flex items-center justify-between">
                  <span className={cn("grid h-9 w-9 place-items-center rounded-lg", c.chip)}>
                    <c.icon className="h-[18px] w-[18px]" />
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-transparent transition-colors group-hover:text-muted-foreground" />
                </div>
                <p className={cn("mt-3 text-3xl font-bold tracking-tight tabular-nums", c.tone)}>{c.value}</p>
                <p className="text-xs font-medium text-muted-foreground">{c.label}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Task Health */}
      {stats && (
        <Card>
          <CardContent className="flex flex-col gap-6 p-5 sm:flex-row sm:items-center">
            {/* Completion ring */}
            <div className="flex items-center gap-4 sm:w-56 sm:shrink-0">
              <div
                className="relative h-20 w-20 shrink-0 rounded-full"
                style={{ background: `conic-gradient(#10b981 ${completion * 3.6}deg, hsl(var(--muted)) 0deg)` }}
              >
                <div className="absolute inset-[7px] grid place-items-center rounded-full bg-card">
                  <span className="text-lg font-bold tabular-nums">{completion}%</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold">Completion</p>
                <p className="text-xs text-muted-foreground">
                  {done} of {grandTotal} tasks done
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{active}</span> still active
                </p>
              </div>
            </div>

            {/* Active status breakdown */}
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold">Active work breakdown</p>
                <span className="text-xs text-muted-foreground">{active} tasks</span>
              </div>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
                {statusSegments.map((s) => (
                  <div
                    key={s.label}
                    className={cn("h-full transition-all", s.color)}
                    style={{ width: `${active ? (s.value / active) * 100 : 0}%` }}
                    title={`${s.label}: ${s.value}`}
                  />
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                {statusSegments.map((s) => (
                  <Link key={s.label} href={s.href} className="flex items-center gap-1.5 text-xs hover:underline">
                    <span className={cn("h-2.5 w-2.5 rounded-sm", s.color)} />
                    <span className="text-muted-foreground">{s.label}</span>
                    <span className="font-semibold tabular-nums">{s.value}</span>
                  </Link>
                ))}
                {statusSegments.length === 0 && (
                  <span className="text-xs text-muted-foreground">No active tasks</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* My Tasks + Overdue Spotlight */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* My Open Tasks */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <span className="grid h-7 w-7 place-items-center rounded-md bg-primary/10 text-primary">
                <Inbox className="h-4 w-4" />
              </span>
              My Open Tasks
              {myTasks.length > 0 && (
                <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {myTasks.length}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0.5">
            {myTasks.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                <p className="text-sm text-muted-foreground">You're all caught up — nothing assigned to you.</p>
              </div>
            ) : (
              <>
                {myTasks.slice(0, 6).map((task: any) => (
                  <TaskRow key={task.id} task={task} onClick={handleSelectTask} isSelected={selectedTaskId === task.id} />
                ))}
                {myTasks.length > 6 && user && (
                  <Link href={`/tasks?assigneeId=${user.id}`} className="mt-1 inline-block px-3 text-sm text-primary hover:underline">
                    View all {myTasks.length} of my tasks...
                  </Link>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Overdue Spotlight */}
        <Card className={cn(overdueTasks.length > 0 && "border-red-500/30")}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <span className={cn("grid h-7 w-7 place-items-center rounded-md", overdueTasks.length > 0 ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500")}>
                <AlertTriangle className="h-4 w-4" />
              </span>
              Overdue Spotlight
              {overdueTasks.length > 0 && (
                <span className="ml-auto rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-semibold text-red-500">
                  {overdueTasks.length}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0.5">
            {overdueTasks.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                <p className="text-sm text-muted-foreground">No overdue tasks. Nicely done.</p>
              </div>
            ) : (
              <>
                {overdueTasks.slice(0, 6).map((task: any) => (
                  <TaskRow key={task.id} task={task} onClick={handleSelectTask} isSelected={selectedTaskId === task.id} />
                ))}
                {overdueTasks.length > 6 && (
                  <Link href="/tasks?sortBy=dueDate&sortOrder=asc&dueBefore=overdue" className="mt-1 inline-block px-3 text-sm text-primary hover:underline">
                    View all {overdueTasks.length} overdue tasks...
                  </Link>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Team Workload */}
      {team.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <span className="grid h-7 w-7 place-items-center rounded-md bg-indigo-500/10 text-indigo-500">
                <Users className="h-4 w-4" />
              </span>
              Team Workload
              <span className="ml-auto text-xs font-normal text-muted-foreground">{team.length} members</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {team.slice(0, 8).map((m: any) => (
                <Link
                  key={m.id}
                  href={`/tasks?assigneeId=${m.id}`}
                  className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-accent/50"
                >
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">
                    {m.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{m.name}</p>
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{m.activeTasks} active</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-indigo-500" style={{ width: `${(m.activeTasks / maxActive) * 100}%` }} />
                      </div>
                      {m.overdueTasks > 0 && (
                        <span className="shrink-0 text-[11px] font-medium text-red-500">{m.overdueTasks} overdue</span>
                      )}
                      {m.criticalTasks > 0 && (
                        <span className="shrink-0 text-[11px] font-medium text-rose-500">{m.criticalTasks} critical</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ---------- Org overview ---------- */}
      <div className="flex items-center gap-3 pt-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Organization overview</h2>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Filters */}
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's Focus */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <span className="grid h-7 w-7 place-items-center rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Sun className="h-4 w-4" />
              </span>
              Today's Focus
              {(filteredToday?.length ?? 0) > 0 && (
                <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{filteredToday?.length}</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(filteredToday?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">No urgent tasks today</p>}
            {filteredToday?.slice(0, 8).map((task: any) => (
              <TaskCard key={task.id} task={task} compact onClick={handleSelectTask} isSelected={selectedTaskId === task.id} />
            ))}
            {(filteredToday?.length ?? 0) > 8 && (
              <Link href="/tasks?status=In+Progress" className="text-sm text-primary hover:underline">View all {filteredToday?.length} tasks...</Link>
            )}
          </CardContent>
        </Card>

        {/* Waiting On */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <span className="grid h-7 w-7 place-items-center rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400">
                <Eye className="h-4 w-4" />
              </span>
              Waiting On
              {(filteredWaiting?.length ?? 0) > 0 && (
                <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{filteredWaiting?.length}</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(filteredWaiting?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">No pending items</p>}
            {filteredWaiting?.slice(0, 8).map((task: any) => (
              <TaskCard key={task.id} task={task} compact onClick={handleSelectTask} isSelected={selectedTaskId === task.id} />
            ))}
            {(filteredWaiting?.length ?? 0) > 8 && (
              <Link href="/tasks?type=Waiting+On" className="text-sm text-primary hover:underline">View all {filteredWaiting?.length} items...</Link>
            )}
          </CardContent>
        </Card>

        {/* Critical Tasks */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <span className="grid h-7 w-7 place-items-center rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <Flame className="h-4 w-4" />
              </span>
              Critical Tasks
              {(filteredCritical?.length ?? 0) > 0 && (
                <span className="ml-auto rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-600 dark:text-rose-400">{filteredCritical?.length}</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(filteredCritical?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">No critical tasks</p>}
            {filteredCritical?.slice(0, 8).map((task: any) => (
              <TaskCard key={task.id} task={task} compact onClick={handleSelectTask} isSelected={selectedTaskId === task.id} />
            ))}
          </CardContent>
        </Card>

        {/* By Workstream */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <span className="grid h-7 w-7 place-items-center rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Layers className="h-4 w-4" />
              </span>
              By Workstream
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {workstreamSummary?.map((ws: any) => (
                <Link key={ws.id} href={`/tasks?workstreamId=${ws.id}`} className="flex items-center justify-between rounded-md p-2 transition-colors hover:bg-accent/50">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: ws.color }} />
                    <span className="text-sm font-medium">{ws.code}</span>
                    <span className="hidden text-sm text-muted-foreground sm:inline">{ws.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    {ws.criticalTasks > 0 && <span className="font-medium text-red-500">{ws.criticalTasks} critical</span>}
                    <span className="text-muted-foreground">{ws.activeTasks} active</span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* By Department */}
        {departmentSummary?.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <span className="grid h-7 w-7 place-items-center rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400">
                  <Building2 className="h-4 w-4" />
                </span>
                By Department
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {departmentSummary.map((dept: any) => (
                  <Link key={dept.id} href={`/tasks?departmentId=${dept.id}`} className="flex items-center justify-between rounded-md p-2 transition-colors hover:bg-accent/50">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: dept.color }} />
                      <span className="text-sm font-medium">{dept.code}</span>
                      <span className="hidden text-sm text-muted-foreground sm:inline">{dept.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-muted-foreground">{dept.workstreamCount} ws</span>
                      {dept.criticalTasks > 0 && <span className="font-medium text-red-500">{dept.criticalTasks} critical</span>}
                      <span className="text-muted-foreground">{dept.totalTasks} active</span>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Task detail panel */}
      <TaskDetailPanel
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onClose={handleClosePanel}
        onNavigateToTask={handleSelectTask}
      />
    </div>
  );
}
