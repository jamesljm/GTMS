"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskCard } from "@/components/task-card";
import { TaskDetailPanel } from "@/components/task-detail-panel";
import { useDashboardStats, useDashboardToday, useDashboardWaiting, useDashboardCritical, useWorkstreamSummary } from "@/hooks/use-dashboard";
import { AlertTriangle, Clock, Eye, ListTodo, XCircle } from "lucide-react";
import Link from "next/link";
import { useState, useCallback } from "react";

export default function DashboardPage() {
  const { data: stats } = useDashboardStats();
  const { data: todayTasks } = useDashboardToday();
  const { data: waitingTasks } = useDashboardWaiting();
  const { data: criticalTasks } = useDashboardCritical();
  const { data: workstreamSummary } = useWorkstreamSummary();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const handleSelectTask = useCallback((taskId: string) => {
    setSelectedTaskId(taskId);
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedTaskId(null);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Task overview for Geohan Corporation</p>
      </div>

      {/* Stats cards - clickable drilldown */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          <Link href="/tasks">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <ListTodo className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-muted-foreground">Active</span>
                </div>
                <p className="text-2xl font-bold mt-1">{stats.total}</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/tasks?sortBy=dueDate&sortOrder=asc&dueBefore=overdue">
            <Card className="hover:border-red-300 transition-colors cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-muted-foreground">Overdue</span>
                </div>
                <p className="text-2xl font-bold mt-1 text-red-600">{stats.overdue}</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/tasks?sortBy=dueDate&sortOrder=asc&dueBefore=thisWeek">
            <Card className="hover:border-orange-300 transition-colors cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <span className="text-sm text-muted-foreground">This Week</span>
                </div>
                <p className="text-2xl font-bold mt-1">{stats.dueThisWeek}</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/tasks?priority=Critical">
            <Card className="hover:border-red-300 transition-colors cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-muted-foreground">Critical</span>
                </div>
                <p className="text-2xl font-bold mt-1">{stats.critical}</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/tasks?type=Waiting+On">
            <Card className="hover:border-yellow-300 transition-colors cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm text-muted-foreground">Waiting On</span>
                </div>
                <p className="text-2xl font-bold mt-1">{stats.waitingOn}</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Today's Focus */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Today's Focus</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {todayTasks?.length === 0 && <p className="text-sm text-muted-foreground">No urgent tasks today</p>}
            {todayTasks?.slice(0, 8).map((task: any) => (
              <TaskCard key={task.id} task={task} compact onClick={handleSelectTask} isSelected={selectedTaskId === task.id} />
            ))}
            {todayTasks?.length > 8 && (
              <Link href="/tasks?status=In+Progress" className="text-sm text-primary hover:underline">
                View all {todayTasks.length} tasks...
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Waiting On */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Waiting On</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {waitingTasks?.length === 0 && <p className="text-sm text-muted-foreground">No pending items</p>}
            {waitingTasks?.slice(0, 8).map((task: any) => (
              <TaskCard key={task.id} task={task} compact onClick={handleSelectTask} isSelected={selectedTaskId === task.id} />
            ))}
            {waitingTasks?.length > 8 && (
              <Link href="/tasks?type=Waiting+On" className="text-sm text-primary hover:underline">
                View all {waitingTasks.length} items...
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Critical Tasks */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Critical Tasks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {criticalTasks?.length === 0 && <p className="text-sm text-muted-foreground">No critical tasks</p>}
            {criticalTasks?.slice(0, 8).map((task: any) => (
              <TaskCard key={task.id} task={task} compact onClick={handleSelectTask} isSelected={selectedTaskId === task.id} />
            ))}
          </CardContent>
        </Card>

        {/* By Workstream */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">By Workstream</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {workstreamSummary?.map((ws: any) => (
                <Link
                  key={ws.id}
                  href={`/tasks?workstreamId=${ws.id}`}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ws.color }} />
                    <span className="text-sm font-medium">{ws.code}</span>
                    <span className="text-sm text-muted-foreground hidden sm:inline">{ws.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    {ws.criticalTasks > 0 && (
                      <span className="text-red-600 font-medium">{ws.criticalTasks} critical</span>
                    )}
                    <span className="text-muted-foreground">{ws.activeTasks} active</span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task detail panel */}
      <TaskDetailPanel
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onClose={handleClosePanel}
      />
    </div>
  );
}
