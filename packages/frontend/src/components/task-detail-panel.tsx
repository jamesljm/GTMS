"use client";

import { useState, useRef } from "react";
import { useTask, useUpdateTask, useCreateTask } from "@/hooks/use-tasks";
import { useUploadAttachment, useDeleteAttachment, getAttachmentUrl } from "@/hooks/use-attachments";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PriorityBadge } from "@/components/priority-badge";
import { StatusBadge } from "@/components/status-badge";
import { WorkstreamBadge } from "@/components/workstream-badge";
import { Separator } from "@/components/ui/separator";
import {
  Trash2, Upload, Plus, CheckCircle2, Circle,
  FileText, Image as ImageIcon, Paperclip, X, Download,
} from "lucide-react";
import { format } from "date-fns";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface TaskDetailPanelProps {
  taskId: string | null;
  open: boolean;
  onClose: () => void;
}

export function TaskDetailPanel({ taskId, open, onClose }: TaskDetailPanelProps) {
  const { data: task, isLoading } = useTask(taskId || "");
  const updateTask = useUpdateTask();
  const createTask = useCreateTask();
  const uploadAttachment = useUploadAttachment();
  const deleteAttachment = useDeleteAttachment();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [noteContent, setNoteContent] = useState("");
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const addNote = useMutation({
    mutationFn: (data: { taskId: string; content: string; type: string }) =>
      api.post("/notes", data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
      setNoteContent("");
      toast.success("Note added");
    },
  });

  const handleStatusChange = (status: string) => {
    if (!task) return;
    updateTask.mutate({ id: task.id, status });
  };

  const handleAddSubtask = () => {
    if (!task || !subtaskTitle.trim()) return;
    createTask.mutate({
      title: subtaskTitle.trim(),
      type: "My Action",
      priority: task.priority,
      parentId: task.id,
      workstreamId: task.workstreamId || undefined,
      dueDate: task.dueDate || undefined,
    });
    setSubtaskTitle("");
  };

  const handleToggleSubtask = (subtaskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "Done" ? "Not Started" : "Done";
    updateTask.mutate({ id: subtaskId, status: newStatus });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !task) return;
    Array.from(files).forEach(file => {
      uploadAttachment.mutate({ taskId: task.id, file });
    });
    e.target.value = "";
  };

  const handleDeleteAttachment = (attachmentId: string) => {
    if (!task) return;
    deleteAttachment.mutate({ id: attachmentId, taskId: task.id });
  };

  const isImage = (mimeType: string) => mimeType.startsWith("image/");

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent side="right" className="overflow-y-auto p-0">
          {isLoading || !task ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <div className="flex flex-col">
              {/* Header */}
              <SheetHeader className="p-6 pb-4">
                <SheetTitle className="text-lg pr-8">{task.title}</SheetTitle>
                <SheetDescription className="sr-only">Task details for {task.title}</SheetDescription>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <PriorityBadge priority={task.priority} />
                  <StatusBadge status={task.status} />
                  {task.workstream && (
                    <WorkstreamBadge code={task.workstream.code} name={task.workstream.name} color={task.workstream.color} />
                  )}
                  <span className="text-xs text-muted-foreground">{task.type}</span>
                </div>
              </SheetHeader>

              <div className="px-6 space-y-5 pb-6">
                {/* Description */}
                {task.description && (
                  <p className="text-sm text-muted-foreground">{task.description}</p>
                )}

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground text-xs">Assignee</span>
                    <p className="font-medium">{task.assignee?.name || "Unassigned"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Due Date</span>
                    <p className="font-medium">{task.dueDate ? format(new Date(task.dueDate), "dd MMM yyyy") : "No due date"}</p>
                  </div>
                  {task.waitingOnWhom && (
                    <div>
                      <span className="text-muted-foreground text-xs">Waiting On</span>
                      <p className="font-medium">{task.waitingOnWhom}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground text-xs">Created by</span>
                    <p className="font-medium">{task.createdBy?.name}</p>
                  </div>
                </div>

                {/* Status buttons */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {["Not Started", "In Progress", "Waiting On", "Blocked", "Done"].map((s) => (
                      <Button
                        key={s}
                        variant={task.status === s ? "default" : "outline"}
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => handleStatusChange(s)}
                        disabled={updateTask.isPending}
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Subtasks */}
                <div>
                  <h3 className="text-sm font-medium mb-2">
                    Subtasks {task.subtasks?.length > 0 && (
                      <span className="text-muted-foreground">
                        ({task.subtasks.filter((s: any) => s.status === "Done").length}/{task.subtasks.length})
                      </span>
                    )}
                  </h3>
                  {task.subtasks?.length > 0 && (
                    <div className="space-y-1 mb-2">
                      {task.subtasks.map((sub: any) => (
                        <div
                          key={sub.id}
                          className="flex items-center gap-2 py-1 px-2 rounded hover:bg-accent/50 cursor-pointer group"
                          onClick={() => handleToggleSubtask(sub.id, sub.status)}
                        >
                          {sub.status === "Done" ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                          <span className={cn("text-sm flex-1", sub.status === "Done" && "line-through text-muted-foreground")}>
                            {sub.title}
                          </span>
                          {sub.assignee && (
                            <span className="text-xs text-muted-foreground">{sub.assignee.name.split(" ")[0]}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add subtask..."
                      value={subtaskTitle}
                      onChange={(e) => setSubtaskTitle(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddSubtask()}
                      className="h-8 text-sm"
                    />
                    <Button size="sm" className="h-8 shrink-0" onClick={handleAddSubtask} disabled={!subtaskTitle.trim()}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Attachments */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium">
                      Attachments {task.attachments?.length > 0 && (
                        <span className="text-muted-foreground">({task.attachments.length})</span>
                      )}
                    </h3>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadAttachment.isPending}
                    >
                      <Upload className="h-3 w-3 mr-1" />
                      {uploadAttachment.isPending ? "Uploading..." : "Upload"}
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </div>
                  {task.attachments?.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {task.attachments.map((att: any) => (
                        <div key={att.id} className="relative group border rounded-md overflow-hidden">
                          {isImage(att.mimeType) ? (
                            <img
                              src={getAttachmentUrl(att.id)}
                              alt={att.filename}
                              className="w-full h-24 object-cover cursor-pointer"
                              onClick={() => setPreviewImage(getAttachmentUrl(att.id))}
                            />
                          ) : (
                            <div className="w-full h-24 flex flex-col items-center justify-center bg-muted p-2">
                              <FileText className="h-6 w-6 text-muted-foreground" />
                              <span className="text-[10px] text-muted-foreground truncate w-full text-center mt-1">
                                {att.filename}
                              </span>
                            </div>
                          )}
                          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            <a
                              href={getAttachmentUrl(att.id)}
                              download={att.filename}
                              className="bg-white/90 rounded p-0.5 hover:bg-white"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Download className="h-3 w-3" />
                            </a>
                            <button
                              className="bg-white/90 rounded p-0.5 hover:bg-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAttachment(att.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </button>
                          </div>
                          <div className="text-[10px] px-1 py-0.5 truncate text-muted-foreground bg-muted/50">
                            {att.filename}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Notes */}
                <div>
                  <h3 className="text-sm font-medium mb-2">
                    Notes {task.notes?.length > 0 && (
                      <span className="text-muted-foreground">({task.notes.length})</span>
                    )}
                  </h3>
                  <div className="flex gap-2 mb-3">
                    <Textarea
                      placeholder="Add a note..."
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      rows={2}
                      className="flex-1 text-sm"
                    />
                    <Button
                      onClick={() => {
                        if (noteContent.trim() && task) {
                          addNote.mutate({ taskId: task.id, content: noteContent, type: "Comment" });
                        }
                      }}
                      disabled={!noteContent.trim() || addNote.isPending}
                      size="sm"
                      className="shrink-0"
                    >
                      Add
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {task.notes?.map((note: any) => (
                      <div key={note.id} className="border rounded-md p-2.5">
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
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Image preview lightbox */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-8"
          onClick={() => setPreviewImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300"
            onClick={() => setPreviewImage(null)}
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={previewImage}
            alt="Preview"
            className="max-w-full max-h-full object-contain rounded"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
