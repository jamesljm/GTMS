"use client";

import { useState, useRef, useEffect } from "react";
import { useTask, useUpdateTask, useCreateTask, useAcceptTask, useRequestChanges, useReproposeTask, useRejectProposal, useTaskProposals } from "@/hooks/use-tasks";
import { useWorkstreams, useUsers } from "@/hooks/use-workstreams";
import { useAuthStore } from "@/store/auth-store";
import { canEditAllFields, canDeleteTask } from "@/lib/permissions";
import { useUploadAttachment, useDeleteAttachment, getAttachmentUrl } from "@/hooks/use-attachments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PriorityBadge } from "@/components/priority-badge";
import { StatusBadge } from "@/components/status-badge";
import { WorkstreamBadge } from "@/components/workstream-badge";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Trash2, Upload, Plus, CheckCircle2, Circle, CornerDownRight,
  FileText, X, Download, Pencil, Check,
  MessageSquareMore, ArrowLeftRight, ChevronDown, ChevronUp, XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface TaskDetailContentProps {
  taskId: string;
  onClose: () => void;
  inline?: boolean;
  onNavigateToTask?: (taskId: string) => void;
}

export function TaskDetailContent({ taskId, onClose, inline = false, onNavigateToTask }: TaskDetailContentProps) {
  const { data: task, isLoading } = useTask(taskId);
  const updateTask = useUpdateTask();
  const createTask = useCreateTask();
  const acceptTask = useAcceptTask();
  const requestChanges = useRequestChanges();
  const reproposeTask = useReproposeTask();
  const rejectProposal = useRejectProposal();
  const { data: proposals } = useTaskProposals(taskId);
  const uploadAttachment = useUploadAttachment();
  const deleteAttachment = useDeleteAttachment();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user: currentUser } = useAuthStore();
  const { data: workstreams } = useWorkstreams();
  const { data: users } = useUsers();

  const canEditAll = currentUser ? canEditAllFields(currentUser) : false;

  // Filter assignee list by role
  const filteredUsers = users?.filter((u: any) => {
    if (!currentUser) return true;
    if (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ED') return true;
    if (currentUser.role === 'STAFF') return u.id === currentUser.id;
    if (currentUser.departmentId) return u.departmentId === currentUser.departmentId;
    return u.id === currentUser.id;
  }) || [];

  const [noteContent, setNoteContent] = useState("");
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [subtaskExpanded, setSubtaskExpanded] = useState(false);
  const [subtaskForm, setSubtaskForm] = useState<{ description: string; type: string; priority: string; status: string; assigneeId: string; dueDate: string; workstreamId: string }>({ description: "", type: "My Action", priority: "", status: "Not Started", assigneeId: "", dueDate: "", workstreamId: "" });
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [showChangesForm, setShowChangesForm] = useState(false);
  const [showReproposeForm, setShowReproposeForm] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [changesComment, setChangesComment] = useState("");
  const [rejectComment, setRejectComment] = useState("");
  const [reproposeTitle, setReproposeTitle] = useState("");
  const [reproposeDesc, setReproposeDesc] = useState("");
  const [reproposeComment, setReproposeComment] = useState("");
  const [showProposalHistory, setShowProposalHistory] = useState(false);

  // Reset edit mode and subtask form when task changes
  useEffect(() => {
    setEditing(false);
    setSubtaskExpanded(false);
    setSubtaskTitle("");
  }, [taskId]);

  const startEditing = () => {
    if (!task) return;
    setEditForm({
      title: task.title || "",
      description: task.description || "",
      type: task.type || "My Action",
      priority: task.priority || "Medium",
      workstreamId: task.workstreamId || "",
      assigneeId: task.assigneeId || "",
      dueDate: task.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd") : "",
      waitingOnWhom: task.waitingOnWhom || "",
    });
    setEditing(true);
  };

  const saveEdits = () => {
    if (!task) return;
    const updates: Record<string, any> = { id: task.id };
    if (editForm.title !== task.title) updates.title = editForm.title;
    if (editForm.description !== (task.description || "")) updates.description = editForm.description || null;
    if (editForm.type !== task.type) updates.type = editForm.type;
    if (editForm.priority !== task.priority) updates.priority = editForm.priority;
    if (editForm.workstreamId !== (task.workstreamId || "")) updates.workstreamId = editForm.workstreamId || null;
    if (editForm.assigneeId !== (task.assigneeId || "")) updates.assigneeId = editForm.assigneeId || null;
    const formDate = editForm.dueDate || null;
    const taskDate = task.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd") : null;
    if (formDate !== taskDate) updates.dueDate = formDate || null;
    if (editForm.waitingOnWhom !== (task.waitingOnWhom || "")) updates.waitingOnWhom = editForm.waitingOnWhom || null;

    if (Object.keys(updates).length > 1) {
      updateTask.mutate(updates);
    }
    setEditing(false);
  };

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

  const handleExpandSubtaskForm = () => {
    if (!task || !subtaskTitle.trim()) return;
    setSubtaskForm({
      description: "",
      type: "My Action",
      priority: task.priority || "Medium",
      status: "Not Started",
      assigneeId: "",
      dueDate: task.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd") : "",
      workstreamId: task.workstreamId || "",
    });
    setSubtaskExpanded(true);
  };

  const handleAddSubtask = () => {
    if (!task || !subtaskTitle.trim()) return;
    createTask.mutate({
      title: subtaskTitle.trim(),
      description: subtaskForm.description || undefined,
      type: subtaskForm.type,
      priority: subtaskForm.priority,
      status: subtaskForm.status,
      parentId: task.id,
      assigneeId: subtaskForm.assigneeId || undefined,
      workstreamId: subtaskForm.workstreamId || undefined,
      dueDate: subtaskForm.dueDate || undefined,
    });
    setSubtaskTitle("");
    setSubtaskExpanded(false);
  };

  const handleCancelSubtaskForm = () => {
    setSubtaskExpanded(false);
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

  if (isLoading || !task) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <>
      <div className={cn("flex flex-col", inline && "h-full overflow-y-auto")}>
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-2">
              {task.parent && (
                <button
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary mb-1 max-w-full"
                  onClick={() => onNavigateToTask?.(task.parent.id)}
                >
                  <CornerDownRight className="h-3 w-3 shrink-0" />
                  <span className="truncate">Subtask of: {task.parent.title}</span>
                </button>
              )}
              <span className="text-xs font-mono text-muted-foreground">{task.id.slice(0, 8)}</span>
              {editing ? (
                <Input
                  value={editForm.title}
                  onChange={(e) => setEditForm(p => ({ ...p, title: e.target.value }))}
                  className="text-lg font-semibold h-auto py-1"
                />
              ) : (
                <h2 className="text-lg font-semibold">{task.title}</h2>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {editing ? (
                <>
                  <Button size="sm" variant="default" className="h-7 text-xs" onClick={saveEdits} disabled={updateTask.isPending}>
                    <Check className="h-3 w-3 mr-1" /> Save
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditing(false)}>
                    <X className="h-3 w-3 mr-1" /> Cancel
                  </Button>
                </>
              ) : canEditAll ? (
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={startEditing}>
                  <Pencil className="h-3 w-3 mr-1" /> Edit
                </Button>
              ) : null}
              {inline && (
                <button onClick={onClose} className="rounded-sm opacity-70 hover:opacity-100 ml-1">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          {!editing && (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <PriorityBadge priority={task.priority} />
              <StatusBadge status={task.status} />
              {task.workstream && (
                <WorkstreamBadge code={task.workstream.code} name={task.workstream.name} color={task.workstream.color} />
              )}
              <span className="text-xs text-muted-foreground">{task.type}</span>
            </div>
          )}
        </div>

        <div className="px-6 space-y-5 pb-6">
          {/* Editable fields */}
          {editing ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Description</label>
                <Textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Description..."
                  rows={3}
                  className="text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Type</label>
                  <Select value={editForm.type} onValueChange={v => setEditForm(p => ({ ...p, type: v }))}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="My Action">My Action</SelectItem>
                      <SelectItem value="Waiting On">Waiting On</SelectItem>
                      <SelectItem value="Decision">Decision</SelectItem>
                      <SelectItem value="Review">Review</SelectItem>
                      <SelectItem value="Recurring">Recurring</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Priority</label>
                  <Select value={editForm.priority} onValueChange={v => setEditForm(p => ({ ...p, priority: v }))}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Critical">Critical</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Workstream</label>
                  <Select value={editForm.workstreamId || "none"} onValueChange={v => setEditForm(p => ({ ...p, workstreamId: v === "none" ? "" : v }))}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No workstream</SelectItem>
                      {workstreams?.map((ws: any) => (
                        <SelectItem key={ws.id} value={ws.id}>{ws.code} - {ws.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Assignee</label>
                  <Select value={editForm.assigneeId || "none"} onValueChange={v => setEditForm(p => ({ ...p, assigneeId: v === "none" ? "" : v }))}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {filteredUsers.map((u: any) => (
                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Due Date</label>
                  <Input
                    type="date"
                    value={editForm.dueDate}
                    onChange={(e) => setEditForm(p => ({ ...p, dueDate: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Waiting On</label>
                  <Input
                    value={editForm.waitingOnWhom}
                    onChange={(e) => setEditForm(p => ({ ...p, waitingOnWhom: e.target.value }))}
                    placeholder="Who is this waiting on?"
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>
          ) : (
            <>
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
            </>
          )}

          {/* Status buttons */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Status</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {["Not Started", "In Progress", "Waiting On", "Blocked", "Done"].map((s) => (
                <Button key={s} variant={task.status === s ? "default" : "outline"} size="sm" className="text-xs h-7" onClick={() => handleStatusChange(s)} disabled={updateTask.isPending}>
                  {s}
                </Button>
              ))}
            </div>
          </div>

          {/* Acceptance section */}
          {task.acceptanceStatus && task.acceptanceStatus !== "Accepted" && (
            <div className="border rounded-lg p-3 space-y-3 bg-muted/20">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Acceptance:</span>
                <Badge variant="outline" className={cn(
                  "text-[10px]",
                  task.acceptanceStatus === "Pending" && "bg-gray-100 text-gray-600",
                  task.acceptanceStatus === "Changes Requested" && "bg-amber-100 text-amber-700",
                  task.acceptanceStatus === "Reproposed" && "bg-violet-100 text-violet-700",
                )}>
                  {task.acceptanceStatus}
                </Badge>
              </div>

              {/* Assignee actions: Pending */}
              {currentUser?.id === task.assigneeId && task.acceptanceStatus === "Pending" && (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" className="h-7 text-xs" onClick={() => acceptTask.mutate(task.id)} disabled={acceptTask.isPending}>
                      <Check className="h-3 w-3 mr-1" /> Accept
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setShowChangesForm(!showChangesForm); setShowReproposeForm(false); }}>
                      <MessageSquareMore className="h-3 w-3 mr-1" /> Request Changes
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setShowReproposeForm(!showReproposeForm); setShowChangesForm(false); setReproposeTitle(task.title); setReproposeDesc(task.description || ""); }}>
                      <ArrowLeftRight className="h-3 w-3 mr-1" /> Counter-Propose
                    </Button>
                  </div>
                </div>
              )}

              {/* Initiator actions: Changes Requested */}
              {currentUser?.id === task.createdById && task.acceptanceStatus === "Changes Requested" && (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setShowReproposeForm(!showReproposeForm); setReproposeTitle(task.title); setReproposeDesc(task.description || ""); }}>
                    <ArrowLeftRight className="h-3 w-3 mr-1" /> Re-Propose
                  </Button>
                </div>
              )}

              {/* Initiator actions: Reproposed */}
              {currentUser?.id === task.createdById && task.acceptanceStatus === "Reproposed" && (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" className="h-7 text-xs" onClick={() => acceptTask.mutate(task.id)} disabled={acceptTask.isPending}>
                    <Check className="h-3 w-3 mr-1" /> Accept Proposal
                  </Button>
                  <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => { setShowRejectForm(!showRejectForm); setShowReproposeForm(false); }}>
                    <XCircle className="h-3 w-3 mr-1" /> Reject & Revert
                  </Button>
                </div>
              )}

              {/* Request Changes form */}
              {showChangesForm && (
                <div className="space-y-2">
                  <Textarea placeholder="Explain what needs to change..." value={changesComment} onChange={(e) => setChangesComment(e.target.value)} rows={2} className="text-sm" />
                  <div className="flex gap-2">
                    <Button size="sm" className="h-7 text-xs" onClick={() => { requestChanges.mutate({ id: task.id, comment: changesComment }); setChangesComment(""); setShowChangesForm(false); }} disabled={!changesComment.trim() || requestChanges.isPending}>
                      Submit
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowChangesForm(false)}>Cancel</Button>
                  </div>
                </div>
              )}

              {/* Repropose form */}
              {showReproposeForm && (
                <div className="space-y-2">
                  <Input placeholder="Proposed title" value={reproposeTitle} onChange={(e) => setReproposeTitle(e.target.value)} className="h-8 text-sm" />
                  <Textarea placeholder="Proposed description" value={reproposeDesc} onChange={(e) => setReproposeDesc(e.target.value)} rows={2} className="text-sm" />
                  <Textarea placeholder="Optional comment..." value={reproposeComment} onChange={(e) => setReproposeComment(e.target.value)} rows={1} className="text-sm" />
                  <div className="flex gap-2">
                    <Button size="sm" className="h-7 text-xs" onClick={() => {
                      reproposeTask.mutate({
                        id: task.id,
                        proposedTitle: reproposeTitle !== task.title ? reproposeTitle : undefined,
                        proposedDescription: reproposeDesc !== (task.description || "") ? reproposeDesc : undefined,
                        comment: reproposeComment || undefined,
                      });
                      setReproposeComment("");
                      setShowReproposeForm(false);
                    }} disabled={reproposeTask.isPending}>
                      Send
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowReproposeForm(false)}>Cancel</Button>
                  </div>
                </div>
              )}

              {/* Reject proposal form */}
              {showRejectForm && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">This will revert the task to its original version and resend it to the assignee.</p>
                  <Textarea placeholder="Optional reason for rejection..." value={rejectComment} onChange={(e) => setRejectComment(e.target.value)} rows={2} className="text-sm" />
                  <div className="flex gap-2">
                    <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => { rejectProposal.mutate({ id: task.id, comment: rejectComment || undefined }); setRejectComment(""); setShowRejectForm(false); }} disabled={rejectProposal.isPending}>
                      Confirm Reject
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowRejectForm(false)}>Cancel</Button>
                  </div>
                </div>
              )}

              {/* Negotiation History */}
              {proposals && proposals.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowProposalHistory(!showProposalHistory)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showProposalHistory ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    Negotiation History ({proposals.length})
                  </button>
                  {showProposalHistory && (
                    <div className="mt-2 space-y-2 border-l-2 border-muted pl-3">
                      {proposals.map((p: any) => (
                        <div key={p.id} className="text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium">{p.proposer?.name}</span>
                            <Badge variant="outline" className="text-[10px] py-0 h-4">{p.action.replace("_", " ")}</Badge>
                            <span className="text-muted-foreground">{format(new Date(p.createdAt), "dd MMM HH:mm")}</span>
                          </div>
                          {p.comment && <p className="text-muted-foreground mt-0.5">{p.comment}</p>}
                          {p.proposedTitle && <p className="mt-0.5">Title: {p.proposedTitle}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Subtasks */}
          <div>
            <h3 className="text-sm font-medium mb-2">
              Subtasks {task.subtasks?.length > 0 && (
                <span className="text-muted-foreground">({task.subtasks.filter((s: any) => s.status === "Done").length}/{task.subtasks.length})</span>
              )}
            </h3>
            {task.subtasks?.length > 0 && (
              <div className="space-y-1 mb-2">
                {task.subtasks.map((sub: any) => (
                  <div key={sub.id} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-accent/50">
                    <button onClick={() => handleToggleSubtask(sub.id, sub.status)} className="shrink-0">
                      {sub.status === "Done" ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                    </button>
                    <button
                      className={cn("text-sm flex-1 text-left truncate hover:underline", sub.status === "Done" && "line-through text-muted-foreground")}
                      onClick={() => onNavigateToTask?.(sub.id)}
                    >
                      {sub.title}
                    </button>
                    {sub.assignee && <span className="text-xs text-muted-foreground">{sub.assignee.name.split(" ")[0]}</span>}
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input placeholder="Add subtask..." value={subtaskTitle} onChange={(e) => setSubtaskTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { if (subtaskExpanded) handleAddSubtask(); else handleExpandSubtaskForm(); } }} className="h-8 text-sm" />
                <Button size="sm" className="h-8 shrink-0" onClick={subtaskExpanded ? handleAddSubtask : handleExpandSubtaskForm} disabled={!subtaskTitle.trim()}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              {subtaskExpanded && (
                <div className="border rounded-md p-3 space-y-2 bg-muted/20">
                  <Textarea
                    placeholder="Description (optional)..."
                    value={subtaskForm.description}
                    onChange={(e) => setSubtaskForm(p => ({ ...p, description: e.target.value }))}
                    rows={2}
                    className="text-sm"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <Select value={subtaskForm.type} onValueChange={v => setSubtaskForm(p => ({ ...p, type: v }))}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="My Action">My Action</SelectItem>
                        <SelectItem value="Waiting On">Waiting On</SelectItem>
                        <SelectItem value="Decision">Decision</SelectItem>
                        <SelectItem value="Review">Review</SelectItem>
                        <SelectItem value="Recurring">Recurring</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={subtaskForm.priority} onValueChange={v => setSubtaskForm(p => ({ ...p, priority: v }))}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Priority" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Critical">Critical</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={subtaskForm.status} onValueChange={v => setSubtaskForm(p => ({ ...p, status: v }))}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Not Started">Not Started</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Done">Done</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Select value={subtaskForm.assigneeId || "none"} onValueChange={v => setSubtaskForm(p => ({ ...p, assigneeId: v === "none" ? "" : v }))}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Assignee" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        {filteredUsers.map((u: any) => (
                          <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="date"
                      value={subtaskForm.dueDate}
                      onChange={(e) => setSubtaskForm(p => ({ ...p, dueDate: e.target.value }))}
                      className="h-7 text-xs"
                    />
                    <Select value={subtaskForm.workstreamId || "none"} onValueChange={v => setSubtaskForm(p => ({ ...p, workstreamId: v === "none" ? "" : v }))}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Workstream" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No workstream</SelectItem>
                        {workstreams?.map((ws: any) => (
                          <SelectItem key={ws.id} value={ws.id}>{ws.code} - {ws.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="h-7 text-xs" onClick={handleAddSubtask} disabled={!subtaskTitle.trim() || createTask.isPending}>
                      Create Subtask
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleCancelSubtaskForm}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Attachments */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium">
                Attachments {task.attachments?.length > 0 && <span className="text-muted-foreground">({task.attachments.length})</span>}
              </h3>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => fileInputRef.current?.click()} disabled={uploadAttachment.isPending}>
                <Upload className="h-3 w-3 mr-1" />{uploadAttachment.isPending ? "Uploading..." : "Upload"}
              </Button>
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileUpload} />
            </div>
            {task.attachments?.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {task.attachments.map((att: any) => (
                  <div key={att.id} className="relative group border rounded-md overflow-hidden">
                    {isImage(att.mimeType) ? (
                      <img src={getAttachmentUrl(att.id)} alt={att.filename} className="w-full h-24 object-cover cursor-pointer" onClick={() => setPreviewImage(getAttachmentUrl(att.id))} />
                    ) : (
                      <div className="w-full h-24 flex flex-col items-center justify-center bg-muted p-2">
                        <FileText className="h-6 w-6 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground truncate w-full text-center mt-1">{att.filename}</span>
                      </div>
                    )}
                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <a href={getAttachmentUrl(att.id)} download={att.filename} className="bg-white/90 rounded p-0.5 hover:bg-white" onClick={(e) => e.stopPropagation()}>
                        <Download className="h-3 w-3" />
                      </a>
                      <button className="bg-white/90 rounded p-0.5 hover:bg-white" onClick={(e) => { e.stopPropagation(); handleDeleteAttachment(att.id); }}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </button>
                    </div>
                    <div className="text-[10px] px-1 py-0.5 truncate text-muted-foreground bg-muted/50">{att.filename}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Notes */}
          <div>
            <h3 className="text-sm font-medium mb-2">
              Notes {task.notes?.length > 0 && <span className="text-muted-foreground">({task.notes.length})</span>}
            </h3>
            <div className="flex gap-2 mb-3">
              <Textarea placeholder="Add a note..." value={noteContent} onChange={(e) => setNoteContent(e.target.value)} rows={2} className="flex-1 text-sm" />
              <Button onClick={() => { if (noteContent.trim() && task) addNote.mutate({ taskId: task.id, content: noteContent, type: "Comment" }); }} disabled={!noteContent.trim() || addNote.isPending} size="sm" className="shrink-0">
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
                  {note.type !== "Comment" && <span className="text-xs text-muted-foreground mt-1 inline-block">[{note.type}]</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Image preview lightbox */}
      {previewImage && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-8" onClick={() => setPreviewImage(null)}>
          <button className="absolute top-4 right-4 text-white hover:text-gray-300" onClick={() => setPreviewImage(null)}>
            <X className="h-6 w-6" />
          </button>
          <img src={previewImage} alt="Preview" className="max-w-full max-h-full object-contain rounded" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}
