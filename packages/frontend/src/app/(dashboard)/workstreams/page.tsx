"use client";

import { useTasksByWorkstream } from "@/hooks/use-tasks";
import { useCreateWorkstream, useUpdateWorkstream, useDeleteWorkstream } from "@/hooks/use-workstreams";
import { useAuthStore } from "@/store/auth-store";
import { canManageWorkstreams } from "@/lib/permissions";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TaskCard } from "@/components/task-card";
import { TaskDetailPanel } from "@/components/task-detail-panel";
import { useState, useCallback } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { toast } from "sonner";

export default function WorkstreamsPage() {
  const { user: currentUser } = useAuthStore();
  const isED = currentUser ? canManageWorkstreams(currentUser) : false;
  const { data: workstreams, isLoading } = useTasksByWorkstream();
  const createWorkstream = useCreateWorkstream();
  const updateWorkstream = useUpdateWorkstream();
  const deleteWorkstream = useDeleteWorkstream();

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editingWs, setEditingWs] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [showAddWs, setShowAddWs] = useState(false);
  const [newWs, setNewWs] = useState({ code: "", name: "", color: "#6366f1" });
  const [confirmState, setConfirmState] = useState<{ open: boolean; title: string; description: string; onConfirm: () => void }>({ open: false, title: "", description: "", onConfirm: () => {} });

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectTask = useCallback((taskId: string) => {
    setSelectedTaskId(taskId);
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedTaskId(null);
  }, []);

  const startEdit = (ws: any) => {
    setEditingWs(ws.id);
    setEditForm({ code: ws.code, name: ws.name, color: ws.color || "#6366f1" });
  };

  const saveEdit = async () => {
    if (!editingWs) return;
    await updateWorkstream.mutateAsync({ id: editingWs, ...editForm });
    setEditingWs(null);
  };

  const handleAddWs = async () => {
    if (!newWs.code || !newWs.name) return;
    await createWorkstream.mutateAsync(newWs);
    setNewWs({ code: "", name: "", color: "#6366f1" });
    setShowAddWs(false);
  };

  const handleDeleteWs = (id: string) => {
    setConfirmState({
      open: true,
      title: "Delete Workstream",
      description: "Delete this workstream? Only works if no tasks are assigned.",
      onConfirm: async () => {
        try {
          await deleteWorkstream.mutateAsync(id);
          setConfirmState(s => ({ ...s, open: false }));
        } catch (err: any) {
          setConfirmState(s => ({ ...s, open: false }));
          toast.error(err?.response?.data?.error || "Cannot delete workstream with tasks");
        }
      },
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Workstreams</h1>
        {isED && (
          <Button size="sm" onClick={() => setShowAddWs(!showAddWs)}>
            <Plus className="h-4 w-4 mr-1" /> Add Workstream
          </Button>
        )}
      </div>

      {/* Add workstream form */}
      {showAddWs && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Input placeholder="Code (e.g. MKT)" className="w-24" value={newWs.code} onChange={e => setNewWs(p => ({ ...p, code: e.target.value }))} />
              <Input placeholder="Name" className="flex-1" value={newWs.name} onChange={e => setNewWs(p => ({ ...p, name: e.target.value }))} />
              <input type="color" value={newWs.color} onChange={e => setNewWs(p => ({ ...p, color: e.target.value }))} className="w-8 h-8 rounded cursor-pointer" />
              <Button size="sm" onClick={handleAddWs} disabled={createWorkstream.isPending}>
                <Check className="h-4 w-4 mr-1" /> Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowAddWs(false)}>
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {workstreams?.map((ws: any) => (
          <Card key={ws.id}>
            <CardHeader className="py-4">
              <div className="flex items-center justify-between">
                {editingWs === ws.id ? (
                  /* Edit mode */
                  <div className="flex items-center gap-2 flex-1">
                    <Input placeholder="Code" className="w-20" value={editForm.code} onChange={e => setEditForm((p: any) => ({ ...p, code: e.target.value }))} />
                    <Input placeholder="Name" className="flex-1" value={editForm.name} onChange={e => setEditForm((p: any) => ({ ...p, name: e.target.value }))} />
                    <input type="color" value={editForm.color} onChange={e => setEditForm((p: any) => ({ ...p, color: e.target.value }))} className="w-8 h-8 rounded cursor-pointer" />
                    <Button size="sm" onClick={saveEdit} disabled={updateWorkstream.isPending}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingWs(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  /* Display mode */
                  <>
                    <button onClick={() => toggleExpand(ws.id)} className="flex items-center gap-3 text-left">
                      {expanded.has(ws.id) ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ws.color }} />
                      <span className="font-medium">{ws.code}</span>
                      <span className="text-muted-foreground">{ws.name}</span>
                    </button>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{ws.tasks?.length || 0} active</span>
                      {isED && (
                        <>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(ws)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDeleteWs(ws.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </CardHeader>

            {expanded.has(ws.id) && ws.tasks?.length > 0 && (
              <CardContent className="pt-0 space-y-2">
                {ws.tasks.map((task: any) => (
                  <TaskCard key={task.id} task={task} onClick={handleSelectTask} isSelected={selectedTaskId === task.id} />
                ))}
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Task detail panel */}
      <TaskDetailPanel
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onClose={handleClosePanel}
        onNavigateToTask={handleSelectTask}
      />

      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        destructive
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState(s => ({ ...s, open: false }))}
      />
    </div>
  );
}
