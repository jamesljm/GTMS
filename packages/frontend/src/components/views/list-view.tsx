"use client";

import { TaskCard } from "@/components/task-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ListViewProps {
  tasks: any[];
  pagination?: { page: number; totalPages: number; total: number };
  isLoading: boolean;
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
  onPageChange: (page: number) => void;
}

export function ListView({ tasks, pagination, isLoading, selectedTaskId, onSelectTask, onPageChange }: ListViewProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!tasks?.length) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          No tasks found matching your filters.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((task: any) => (
        <TaskCard
          key={task.id}
          task={task}
          isSelected={selectedTaskId === task.id}
          onClick={onSelectTask}
        />
      ))}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page <= 1}
            onClick={() => onPageChange(pagination.page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            {pagination.page} / {pagination.totalPages} ({pagination.total} tasks)
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => onPageChange(pagination.page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
