"use client";

import { useTasksByWorkstream } from "@/hooks/use-tasks";
import { useCreateWorkstream, useUpdateWorkstream, useDeleteWorkstream, useUsers } from "@/hooks/use-workstreams";
import { useDepartments } from "@/hooks/use-departments";
import { useAuthStore } from "@/store/auth-store";
import { canManageWorkstreams } from "@/lib/permissions";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TaskCard } from "@/components/task-card";
import { TaskDetailPanel } from "@/components/task-detail-panel";
import { FilterBar } from "@/components/views/filter-bar";
import { filterTasks } from "@/lib/filter-tasks";
import { useState, useCallback, useMemo } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, X, Check, Users, Building2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function WorkstreamsPage() {
  const router = useRouter();
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
  const [newWs, setNewWs] = useState({ code: "", name: "", color: "#6366f1", departmentId: "" });
  const [confirmState, setConfirmState] = useState<{ open: boolean; title: string; description: string; onConfirm: () => void }>({ open: false, title: "", description: "", onConfirm: () => {} });
  const { data: users } = useUsers();
  const { data: departments } = useDepartments();
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [searchFilter, setSearchFilter] = useState("");

  const setFilterCb = useCallback((key: string, value: string) => {
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

  const hasFilters = searchFilter || Object.keys(filters).length > 0;

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
    setEditForm({ code: ws.code, name: ws.name, color: ws.color || "#6366f1", departmentId: ws.departmentId || "" });
  };

  const saveEdit = async () => {
    if (!editingWs) return;
    const { departmentId, ...rest } = editForm;
    await updateWorkstream.mutateAsync({ id: editingWs, ...rest, departmentId: departmentId || null });
    setEditingWs(null);
  };

  const handleAddWs = async () => {
    if (!newWs.code || !newWs.name) return;
    const { departmentId, ...rest } = newWs;
    await createWorkstream.mutateAsync({ ...rest, departmentId: departmentId || null });
    setNewWs({ code: "", name: "", color: "#6366f1", departmentId: "" });
    setShowAddWs(false);
  };

  // Group workstreams by department
  const groupedWorkstreams = useMemo(() => {
    if (!workstreams) return [];
    const deptMap = new Map<string, { dept: any; workstreams: any[] }>();
    const ungrouped: any[] = [];

    for (const ws of workstreams) {
      if (ws.departmentId && ws.department) {
        if (!deptMap.has(ws.departmentId)) {
          deptMap.set(ws.departmentId, { dept: ws.department, workstreams: [] });
        }
        deptMap.get(ws.departmentId)!.workstreams.push(ws);
      } else {
        ungrouped.push(ws);
      }
    }

    const groups: { key: string; label: string; color?: string; workstreams: any[] }[] = [];
    // Sort departments by name
    const sorted = Array.from(deptMap.values()).sort((a, b) => a.dept.name.localeCompare(b.dept.name));
    for (const { dept, workstreams: wsArr } of sorted) {
      groups.push({ key: dept.id, label: `${dept.name} (${dept.code})`, color: dept.color, workstreams: wsArr });
    }
    if (ungrouped.length > 0) {
      groups.push({ key: "none", label: "No Department", workstreams: ungrouped });
    }
    return groups;
  }, [workstreams]);

  // Apply department filter
  const filteredWorkstreams = useMemo(() => {
    if (!workstreams) return [];
    if (deptFilter === "all") return workstreams;
    if (deptFilter === "none") return workstreams.filter((ws: any) => !ws.departmentId);
    return workstreams.filter((ws: any) => ws.departmentId === deptFilter);
  }, [workstreams, deptFilter]);

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
            <div className="flex items-center gap-3 flex-wrap">
              <Input placeholder="Code (e.g. MKT)" className="w-24" value={newWs.code} onChange={e => setNewWs(p => ({ ...p, code: e.target.value }))} />
              <Input placeholder="Name" className="flex-1 min-w-[150px]" value={newWs.name} onChange={e => setNewWs(p => ({ ...p, name: e.target.value }))} />
              <input type="color" value={newWs.color} onChange={e => setNewWs(p => ({ ...p, color: e.target.value }))} className="w-8 h-8 rounded cursor-pointer" />
              <Select value={newWs.departmentId || "none"} onValueChange={v => setNewWs(p => ({ ...p, departmentId: v === "none" ? "" : v }))}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Department..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Department</SelectItem>
                  {departments?.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: d.color }} />
                        {d.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

      {/* Filters */}
      <FilterBar
        filters={filters}
        setFilter={setFilterCb}
        setMultiFilter={setMultiFilter}
        search={searchFilter}
        setSearch={setSearchFilter}
        workstreams={workstreams?.map((ws: any) => ({ id: ws.id, code: ws.code, name: ws.name, color: ws.color })) || []}
        users={users || []}
        departments={departments || []}
      />

      {/* Department grouping filter */}
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">View:</span>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="h-8 w-[180px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments?.map((d: any) => (
              <SelectItem key={d.id} value={d.id}>{d.name} ({d.code})</SelectItem>
            ))}
            <SelectItem value="none">No Department</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {deptFilter === "all" ? (
          /* Grouped view */
          groupedWorkstreams.map((group) => (
            <div key={group.key}>
              <div className="flex items-center gap-2 mb-2 mt-4 first:mt-0">
                {group.color && <div className="w-3 h-3 rounded-full" style={{ backgroundColor: group.color }} />}
                <h2 className="text-sm font-semibold text-muted-foreground">{group.label}</h2>
                <span className="text-xs text-muted-foreground">({group.workstreams.length})</span>
              </div>
              <div className="space-y-3">
                {group.workstreams.map((ws: any) => (
                  <WorkstreamCard
                    key={ws.id}
                    ws={ws}
                    expanded={expanded}
                    toggleExpand={toggleExpand}
                    editingWs={editingWs}
                    editForm={editForm}
                    setEditForm={setEditForm}
                    saveEdit={saveEdit}
                    updateWorkstream={updateWorkstream}
                    setEditingWs={setEditingWs}
                    startEdit={startEdit}
                    handleDeleteWs={handleDeleteWs}
                    isED={isED}
                    router={router}
                    hasFilters={hasFilters}
                    filters={filters}
                    searchFilter={searchFilter}
                    selectedTaskId={selectedTaskId}
                    handleSelectTask={handleSelectTask}
                    departments={departments}
                  />
                ))}
              </div>
            </div>
          ))
        ) : (
          /* Filtered view */
          filteredWorkstreams.map((ws: any) => (
            <WorkstreamCard
              key={ws.id}
              ws={ws}
              expanded={expanded}
              toggleExpand={toggleExpand}
              editingWs={editingWs}
              editForm={editForm}
              setEditForm={setEditForm}
              saveEdit={saveEdit}
              updateWorkstream={updateWorkstream}
              setEditingWs={setEditingWs}
              startEdit={startEdit}
              handleDeleteWs={handleDeleteWs}
              isED={isED}
              router={router}
              hasFilters={hasFilters}
              filters={filters}
              searchFilter={searchFilter}
              selectedTaskId={selectedTaskId}
              handleSelectTask={handleSelectTask}
              departments={departments}
            />
          ))
        )}
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

function WorkstreamCard({ ws, expanded, toggleExpand, editingWs, editForm, setEditForm, saveEdit, updateWorkstream, setEditingWs, startEdit, handleDeleteWs, isED, router, hasFilters, filters, searchFilter, selectedTaskId, handleSelectTask, departments }: any) {
  return (
    <Card>
      <CardHeader className="py-4">
        <div className="flex items-center justify-between">
          {editingWs === ws.id ? (
            <div className="flex items-center gap-2 flex-1 flex-wrap">
              <Input placeholder="Code" className="w-20" value={editForm.code} onChange={(e: any) => setEditForm((p: any) => ({ ...p, code: e.target.value }))} />
              <Input placeholder="Name" className="flex-1 min-w-[120px]" value={editForm.name} onChange={(e: any) => setEditForm((p: any) => ({ ...p, name: e.target.value }))} />
              <input type="color" value={editForm.color} onChange={(e: any) => setEditForm((p: any) => ({ ...p, color: e.target.value }))} className="w-8 h-8 rounded cursor-pointer" />
              <Select value={editForm.departmentId || "none"} onValueChange={(v: string) => setEditForm((p: any) => ({ ...p, departmentId: v === "none" ? "" : v }))}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Department..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Department</SelectItem>
                  {departments?.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={saveEdit} disabled={updateWorkstream.isPending}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditingWs(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
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
                {ws.department && (
                  <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ws.department.color }} />
                    {ws.department.code}
                  </span>
                )}
              </button>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{ws.tasks?.length || 0} active</span>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => router.push(`/workstreams/${ws.id}/members`)}>
                  <Users className="h-3.5 w-3.5 mr-1" /> Members
                </Button>
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

      {expanded.has(ws.id) && ws.tasks?.length > 0 && (() => {
        const filtered = hasFilters ? filterTasks(ws.tasks, filters, searchFilter) : ws.tasks;
        return (
          <CardContent className="pt-0 space-y-2">
            {filtered.length === 0 && <p className="text-sm text-muted-foreground">No matching tasks</p>}
            {filtered.map((task: any) => (
              <TaskCard key={task.id} task={task} onClick={handleSelectTask} isSelected={selectedTaskId === task.id} />
            ))}
          </CardContent>
        );
      })()}
    </Card>
  );
}
