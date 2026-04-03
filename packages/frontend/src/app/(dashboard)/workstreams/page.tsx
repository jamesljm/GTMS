"use client";

import { useTasksByWorkstream } from "@/hooks/use-tasks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskCard } from "@/components/task-card";
import { WorkstreamBadge } from "@/components/workstream-badge";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";

export default function WorkstreamsPage() {
  const { data: workstreams, isLoading } = useTasksByWorkstream();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Workstreams</h1>

      <div className="space-y-3">
        {workstreams?.map((ws: any) => (
          <Card key={ws.id}>
            <button
              onClick={() => toggleExpand(ws.id)}
              className="w-full text-left"
            >
              <CardHeader className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {expanded.has(ws.id) ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ws.color }} />
                    <span className="font-medium">{ws.code}</span>
                    <span className="text-muted-foreground">{ws.name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {ws.tasks?.length || 0} active tasks
                  </span>
                </div>
              </CardHeader>
            </button>

            {expanded.has(ws.id) && ws.tasks?.length > 0 && (
              <CardContent className="pt-0 space-y-2">
                {ws.tasks.map((task: any) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
