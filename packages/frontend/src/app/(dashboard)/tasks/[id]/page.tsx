"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTask, useUpdateTask, useDeleteTask } from "@/hooks/use-tasks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PriorityBadge } from "@/components/priority-badge";
import { StatusBadge } from "@/components/status-badge";
import { WorkstreamBadge } from "@/components/workstream-badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { TaskCard } from "@/components/task-card";

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: task, isLoading } = useTask(id);
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const queryClient = useQueryClient();

  const [noteContent, setNoteContent] = useState("");

  const addNote = useMutation({
    mutationFn: (data: { taskId: string; content: string; type: string }) =>
      api.post("/notes", data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task", id] });
      setNoteContent("");
      toast.success("Note added");
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!task) {
    return <p className="text-muted-foreground">Task not found</p>;
  }

  const handleStatusChange = (status: string) => {
    updateTask.mutate({ id: task.id, status });
  };

  const handleDelete = async () => {
    if (confirm("Delete this task?")) {
      await deleteTask.mutateAsync(task.id);
      router.push("/tasks");
    }
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <Button variant="ghost" size="sm" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-xl">{task.title}</CardTitle>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <PriorityBadge priority={task.priority} />
                <StatusBadge status={task.status} />
                {task.workstream && (
                  <WorkstreamBadge code={task.workstream.code} name={task.workstream.name} color={task.workstream.color} />
                )}
                <span className="text-xs text-muted-foreground">{task.type}</span>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {task.description && (
            <p className="text-sm text-muted-foreground">{task.description}</p>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Assignee:</span>
              <p className="font-medium">{task.assignee?.name || "Unassigned"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Due Date:</span>
              <p className="font-medium">{task.dueDate ? format(new Date(task.dueDate), "dd MMM yyyy") : "No due date"}</p>
            </div>
            {task.waitingOnWhom && (
              <div>
                <span className="text-muted-foreground">Waiting On:</span>
                <p className="font-medium">{task.waitingOnWhom}</p>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Created by:</span>
              <p className="font-medium">{task.createdBy?.name}</p>
            </div>
          </div>

          {/* Status change buttons */}
          <div>
            <label className="text-sm font-medium">Change Status:</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {["Not Started", "In Progress", "Waiting On", "Blocked", "Done"].map((s) => (
                <Button
                  key={s}
                  variant={task.status === s ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleStatusChange(s)}
                  disabled={updateTask.isPending}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>

          {/* Subtasks */}
          {task.subtasks?.length > 0 && (
            <div>
              <Separator className="my-4" />
              <h3 className="text-sm font-medium mb-2">Subtasks ({task.subtasks.length})</h3>
              <div className="space-y-1">
                {task.subtasks.map((sub: any) => (
                  <TaskCard key={sub.id} task={sub} compact />
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <Separator className="my-4" />
          <h3 className="text-sm font-medium">Notes ({task.notes?.length || 0})</h3>

          <div className="flex gap-2">
            <Textarea
              placeholder="Add a note..."
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              rows={2}
              className="flex-1"
            />
            <Button
              onClick={() => {
                if (noteContent.trim()) {
                  addNote.mutate({ taskId: task.id, content: noteContent, type: "Comment" });
                }
              }}
              disabled={!noteContent.trim() || addNote.isPending}
              size="sm"
            >
              Add
            </Button>
          </div>

          <div className="space-y-3">
            {task.notes?.map((note: any) => (
              <div key={note.id} className="border rounded-md p-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span className="font-medium">{note.author?.name}</span>
                  <span>{format(new Date(note.createdAt), "dd MMM yyyy HH:mm")}</span>
                </div>
                <p className="text-sm">{note.content}</p>
                {note.type !== "Comment" && (
                  <span className="text-xs text-muted-foreground mt-1 inline-block">[{note.type}]</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
