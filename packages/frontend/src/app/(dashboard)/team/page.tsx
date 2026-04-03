"use client";

import { useTeamSummary } from "@/hooks/use-dashboard";
import { useTasksByAssignee } from "@/hooks/use-tasks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskCard } from "@/components/task-card";
import { cn } from "@/lib/utils";
import { useState } from "react";

export default function TeamPage() {
  const { data: teamSummary } = useTeamSummary();
  const { data: tasksByAssignee } = useTasksByAssignee();
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Team View</h1>

      {/* Team summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {teamSummary?.map((member: any) => (
          <Card
            key={member.id}
            className={cn("cursor-pointer hover:border-primary/50 transition-colors", expandedUser === member.id && "border-primary")}
            onClick={() => setExpandedUser(expandedUser === member.id ? null : member.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium">
                  {member.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{member.name}</p>
                  <p className="text-xs text-muted-foreground">{member.position} · {member.department}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-3 text-sm">
                <span><span className="font-medium">{member.activeTasks}</span> active</span>
                {member.overdueTasks > 0 && (
                  <span className="text-red-600"><span className="font-medium">{member.overdueTasks}</span> overdue</span>
                )}
                {member.criticalTasks > 0 && (
                  <span className="text-orange-600"><span className="font-medium">{member.criticalTasks}</span> critical</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Expanded task list */}
      {expandedUser && tasksByAssignee && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Tasks for {tasksByAssignee.find((u: any) => u.id === expandedUser)?.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {tasksByAssignee
              .find((u: any) => u.id === expandedUser)
              ?.assignedTasks?.map((task: any) => (
                <TaskCard key={task.id} task={task} />
              ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
