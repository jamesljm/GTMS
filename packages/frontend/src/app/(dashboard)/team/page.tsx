"use client";

import { useTeamSummary } from "@/hooks/use-dashboard";
import { useTasksByAssignee } from "@/hooks/use-tasks";
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser, useResetPassword, useWorkstreams } from "@/hooks/use-workstreams";
import { useDepartments } from "@/hooks/use-departments";
import { useCreateAssignment, useUpdateAssignment, useDeleteAssignment } from "@/hooks/use-assignments";
import { useAuthStore } from "@/store/auth-store";
import { canManageUsers, isSuperAdminOrED } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TaskCard } from "@/components/task-card";
import { TaskDetailPanel } from "@/components/task-detail-panel";
import { M365ImportDialog } from "@/components/m365-import-dialog";
import { FilterBar } from "@/components/views/filter-bar";
import { filterTasks } from "@/lib/filter-tasks";
import { cn } from "@/lib/utils";
import { useState, useCallback } from "react";
import { Plus, Mail, Pencil, Trash2, X, Check, UserPlus, Star, KeyRound, Copy, Shield, ShieldCheck, CloudDownload } from "lucide-react";
import { toast } from "sonner";

function RoleBadge({ role }: { role: string }) {
  if (role === "SUPER_ADMIN") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 font-semibold">
        <ShieldCheck className="h-3 w-3" /> Super Admin
      </span>
    );
  }
  if (role === "ED") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200 font-semibold">
        <Shield className="h-3 w-3" /> ED
      </span>
    );
  }
  if (role === "HOD") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 font-medium">
        HOD
      </span>
    );
  }
  if (role === "MANAGER") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200 font-medium">
        Manager
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
      Staff
    </span>
  );
}

const avatarColors = [
  "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500",
  "bg-pink-500", "bg-teal-500", "bg-indigo-500", "bg-amber-500",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

export default function TeamPage() {
  const { user: currentUser } = useAuthStore();
  const isManager = currentUser ? canManageUsers(currentUser) : false;
  const isED = currentUser ? isSuperAdminOrED(currentUser) : false;
  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";
  const { data: teamSummary } = useTeamSummary();
  const { data: tasksByAssignee } = useTasksByAssignee();
  const { data: allUsers } = useUsers();
  const { data: departments } = useDepartments();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const resetPassword = useResetPassword();
  const createAssignment = useCreateAssignment();
  const updateAssignment = useUpdateAssignment();
  const deleteAssignment = useDeleteAssignment();

  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [editAssignments, setEditAssignments] = useState<any[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", role: "STAFF", position: "", departmentId: "" });

  // M365 import dialog state
  const [showM365Import, setShowM365Import] = useState(false);

  // Confirm dialog state
  const [confirmState, setConfirmState] = useState<{ open: boolean; title: string; description: string; onConfirm: () => void }>({ open: false, title: "", description: "", onConfirm: () => {} });

  // Reset password dialog state
  const [resetPwState, setResetPwState] = useState<{ open: boolean; userId: string; userName: string; newPassword: string; generatedPassword: string }>({
    open: false, userId: "", userName: "", newPassword: "", generatedPassword: "",
  });

  const handleSelectTask = useCallback((taskId: string) => {
    setSelectedTaskId(taskId);
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedTaskId(null);
  }, []);

  // Filters for task cards
  const { data: workstreamsData } = useWorkstreams();
  const [filters, setFilters] = useState<Record<string, any>>({});
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

  // Counter for stable unique keys on new assignment rows
  const [tempIdCounter, setTempIdCounter] = useState(0);

  const startEdit = (member: any) => {
    setEditingUser(member.id);
    setEditForm({ name: member.name, email: member.email, position: member.position || "" });
    setEditAssignments(
      (member.assignments || []).map((a: any) => ({
        _key: a.id,
        id: a.id,
        departmentId: a.departmentId || "",
        role: a.role,
        position: a.position || "",
        isPrimary: !!a.isPrimary,
        _action: "existing" as const,
      }))
    );
  };

  const addAssignmentRow = () => {
    const key = `temp-${Date.now()}-${tempIdCounter}`;
    setTempIdCounter(c => c + 1);
    setEditAssignments(prev => [...prev, { _key: key, id: null, departmentId: "", role: "STAFF", position: "", isPrimary: false, _action: "new" as const }]);
  };

  const saveEdit = async () => {
    if (!editingUser) return;
    try {
      const member = members.find((m: any) => m.id === editingUser);
      // Save user fields
      await updateUser.mutateAsync({ id: editingUser, ...editForm });
      // Process assignment changes
      const origIds = new Set<string>((member?.assignments || []).map((a: any) => a.id));
      for (const a of editAssignments) {
        try {
          if (a._action === "new" && a.departmentId && a.role) {
            await createAssignment.mutateAsync({ userId: editingUser, departmentId: a.departmentId, role: a.role, position: a.position || undefined, isPrimary: a.isPrimary || undefined });
          } else if (a._action === "existing" && a.id) {
            const orig = member?.assignments?.find((o: any) => o.id === a.id);
            if (orig && (orig.departmentId !== a.departmentId || orig.role !== a.role || (orig.position || "") !== a.position || !!orig.isPrimary !== !!a.isPrimary)) {
              await updateAssignment.mutateAsync({ userId: editingUser, id: a.id, departmentId: a.departmentId, role: a.role, position: a.position || undefined, isPrimary: a.isPrimary });
            }
            origIds.delete(a.id);
          }
        } catch (err: any) {
          toast.error(`Failed to save assignment: ${err?.response?.data?.error || err?.message || "Unknown error"}`);
        }
      }
      // Delete removed assignments
      for (const id of origIds) {
        try {
          await deleteAssignment.mutateAsync({ userId: editingUser, id });
        } catch (err: any) {
          toast.error(`Failed to remove assignment: ${err?.response?.data?.error || err?.message || "Unknown error"}`);
        }
      }
      toast.success("User updated successfully");
      setEditingUser(null);
    } catch (err: any) {
      toast.error(`Failed to save: ${err?.response?.data?.error || err?.message || "Unknown error"}`);
    }
  };

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email) return;
    await createUser.mutateAsync(newUser);
    setNewUser({ name: "", email: "", role: "STAFF", position: "", departmentId: "" });
    setShowAddUser(false);
  };

  const handleDeleteUser = (id: string) => {
    setConfirmState({
      open: true,
      title: "Deactivate User",
      description: "Deactivate this user? Their tasks will remain.",
      onConfirm: async () => {
        await deleteUser.mutateAsync(id);
        setConfirmState(s => ({ ...s, open: false }));
      },
    });
  };

  const openResetPassword = (member: any) => {
    setResetPwState({ open: true, userId: member.id, userName: member.name, newPassword: "", generatedPassword: "" });
  };

  const handleResetPassword = async () => {
    try {
      const result = await resetPassword.mutateAsync({
        userId: resetPwState.userId,
        ...(resetPwState.newPassword ? { newPassword: resetPwState.newPassword } : {}),
      });
      if (result.temporaryPassword) {
        setResetPwState(s => ({ ...s, generatedPassword: result.temporaryPassword }));
      } else {
        toast.success("Password reset successfully");
        setResetPwState(s => ({ ...s, open: false }));
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to reset password");
    }
  };

  // Use allUsers (which now includes assignments) for display, merge task counts from teamSummary
  const members = (allUsers || []).map((user: any) => {
    const summary = teamSummary?.find((s: any) => s.id === user.id);
    return {
      ...user,
      activeTasks: summary?.activeTasks ?? 0,
      overdueTasks: summary?.overdueTasks ?? 0,
      criticalTasks: summary?.criticalTasks ?? 0,
    };
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Team View</h1>
        <div className="flex gap-2">
          {isED && (
            <Button size="sm" variant="outline" onClick={() => setShowM365Import(true)}>
              <CloudDownload className="h-4 w-4 mr-1" /> Import from M365
            </Button>
          )}
          {isManager && (
            <Button size="sm" onClick={() => setShowAddUser(!showAddUser)}>
              <UserPlus className="h-4 w-4 mr-1" /> Add Member
            </Button>
          )}
        </div>
      </div>

      {/* Add user form */}
      {showAddUser && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input placeholder="Full name" value={newUser.name} onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))} />
              <Input placeholder="Email" type="email" value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} />
              <Select value={newUser.role} onValueChange={v => setNewUser(p => ({ ...p, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {isSuperAdmin && <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>}
                  {isED && <SelectItem value="ED">ED</SelectItem>}
                  <SelectItem value="HOD">HOD</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="STAFF">Staff</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Position" value={newUser.position} onChange={e => setNewUser(p => ({ ...p, position: e.target.value }))} />
              <Select value={newUser.departmentId || "none"} onValueChange={v => setNewUser(p => ({ ...p, departmentId: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Department..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Department</SelectItem>
                  {departments?.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddUser} disabled={createUser.isPending}>
                  <Check className="h-4 w-4 mr-1" /> Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowAddUser(false)}>
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Team summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {members.map((member: any) => (
          <Card
            key={member.id}
            className={cn("transition-colors", expandedUser === member.id && "border-primary")}
          >
            <CardContent className="p-4">
              {editingUser === member.id ? (
                /* Edit mode */
                <div className="space-y-2">
                  <Input placeholder="Name" value={editForm.name} onChange={e => setEditForm((p: any) => ({ ...p, name: e.target.value }))} />
                  <Input placeholder="Email" value={editForm.email} onChange={e => setEditForm((p: any) => ({ ...p, email: e.target.value }))} />
                  <Input placeholder="Position (user-level)" value={editForm.position} onChange={e => setEditForm((p: any) => ({ ...p, position: e.target.value }))} />

                  {/* Assignments section */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Role Assignments</label>
                    {editAssignments.map((a, idx) => (
                      <div key={a._key} className="flex flex-wrap gap-1.5 items-center">
                        <Select value={a.departmentId || "none"} onValueChange={v => setEditAssignments(prev => prev.map((x, i) => i === idx ? { ...x, departmentId: v === "none" ? "" : v } : x))}>
                          <SelectTrigger className="h-7 text-xs w-[120px]"><SelectValue placeholder="Dept..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Select...</SelectItem>
                            {departments?.map((d: any) => (
                              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={a.role} onValueChange={v => setEditAssignments(prev => prev.map((x, i) => i === idx ? { ...x, role: v } : x))}>
                          <SelectTrigger className="h-7 text-xs w-[100px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {isSuperAdmin && <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>}
                            <SelectItem value="ED">ED</SelectItem>
                            <SelectItem value="HOD">HOD</SelectItem>
                            <SelectItem value="MANAGER">Manager</SelectItem>
                            <SelectItem value="STAFF">Staff</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input placeholder="Position" className="h-7 text-xs w-[100px]" value={a.position} onChange={e => setEditAssignments(prev => prev.map((x, i) => i === idx ? { ...x, position: e.target.value } : x))} />
                        <button
                          className={cn("p-0.5 rounded", a.isPrimary ? "text-yellow-500" : "text-muted-foreground hover:text-yellow-500")}
                          title={a.isPrimary ? "Primary role" : "Set as primary"}
                          onClick={() => setEditAssignments(prev => prev.map((x, i) => ({ ...x, isPrimary: i === idx })))}
                        >
                          <Star className={cn("h-3.5 w-3.5", a.isPrimary && "fill-current")} />
                        </button>
                        <button className="p-0.5 text-muted-foreground hover:text-destructive" onClick={() => setEditAssignments(prev => prev.filter((_, i) => i !== idx))}>
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      className="text-[11px] text-primary hover:underline flex items-center gap-0.5 mt-1"
                      onClick={addAssignmentRow}
                    >
                      <Plus className="h-3 w-3" /> Add Role
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveEdit} disabled={updateUser.isPending || createAssignment.isPending || updateAssignment.isPending || deleteAssignment.isPending}>
                      <Check className="h-4 w-4 mr-1" /> {(updateUser.isPending || createAssignment.isPending || updateAssignment.isPending || deleteAssignment.isPending) ? "Saving..." : "Save"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingUser(null)}>
                      <X className="h-4 w-4 mr-1" /> Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                /* Display mode */
                <>
                  <div className="flex items-center gap-3">
                    <div
                      className={cn("h-10 w-10 rounded-full flex items-center justify-center text-white font-medium cursor-pointer hover:ring-2 ring-primary", getAvatarColor(member.name))}
                      onClick={() => setExpandedUser(expandedUser === member.id ? null : member.id)}
                    >
                      {member.name.charAt(0)}
                    </div>
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => setExpandedUser(expandedUser === member.id ? null : member.id)}
                    >
                      <p className="font-medium truncate">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.position} · {member.department || member.dept?.name || "No Dept"}</p>
                    </div>
                    <RoleBadge role={member.assignments?.find((a: any) => a.isPrimary)?.role || member.role} />
                  </div>
                  {/* Email + actions row */}
                  <div className="flex items-center justify-between mt-1.5">
                    <a href={`mailto:${member.email}`} className="text-xs text-primary hover:underline truncate">{member.email}</a>
                    <div className="flex gap-1 shrink-0">
                      {isSuperAdmin && (
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-amber-600" title="Reset Password" onClick={(e) => { e.stopPropagation(); openResetPassword(member); }}>
                          <KeyRound className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {isManager && (
                        <Button size="icon" variant="ghost" className="h-7 w-7" title="Edit User" onClick={(e) => { e.stopPropagation(); startEdit(member); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
                        <a href={`mailto:${member.email}`} onClick={e => e.stopPropagation()} title={member.email}>
                          <Mail className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                      {isED && (
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" title="Deactivate User" onClick={(e) => { e.stopPropagation(); handleDeleteUser(member.id); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Assignments / Roles (read-only display) */}
                  {member.assignments && member.assignments.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {member.assignments.map((a: any) => (
                        <span
                          key={a.id}
                          className={cn(
                            "inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border",
                            a.isPrimary ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted border-border"
                          )}
                        >
                          {a.isPrimary && <Star className="h-2.5 w-2.5 fill-current" />}
                          {a.role} · {a.position || "\u2014"} · {a.department?.name || "\u2014"}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-2">{member.assignments?.find((a: any) => a.isPrimary)?.role || member.role} · {member.position || "No position"}</p>
                  )}

                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span><span className="font-medium">{member.activeTasks}</span> active</span>
                    {member.overdueTasks > 0 && (
                      <span className="text-red-600"><span className="font-medium">{member.overdueTasks}</span> overdue</span>
                    )}
                    {member.criticalTasks > 0 && (
                      <span className="text-orange-600"><span className="font-medium">{member.criticalTasks}</span> critical</span>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* FilterBar for task cards */}
      {expandedUser && (
        <FilterBar
          filters={filters}
          setFilter={setFilterCb}
          setMultiFilter={setMultiFilter}
          search={searchFilter}
          setSearch={setSearchFilter}
          workstreams={workstreamsData || []}
          users={allUsers || []}
          departments={departments || []}
        />
      )}

      {/* Expanded task list */}
      {expandedUser && tasksByAssignee && (() => {
        const rawTasks = tasksByAssignee.find((u: any) => u.id === expandedUser)?.assignedTasks || [];
        const filtered = hasFilters ? filterTasks(rawTasks, filters, searchFilter) : rawTasks;
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Tasks for {tasksByAssignee.find((u: any) => u.id === expandedUser)?.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {filtered.map((task: any) => (
                <TaskCard key={task.id} task={task} onClick={handleSelectTask} isSelected={selectedTaskId === task.id} />
              ))}
              {filtered.length === 0 && (
                <p className="text-sm text-muted-foreground">{hasFilters ? "No matching tasks" : "No active tasks assigned"}</p>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* Task detail panel */}
      <TaskDetailPanel
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onClose={handleClosePanel}
        onNavigateToTask={handleSelectTask}
      />

      {/* Confirm dialog */}
      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        destructive
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState(s => ({ ...s, open: false }))}
      />

      {/* M365 import dialog */}
      <M365ImportDialog open={showM365Import} onOpenChange={setShowM365Import} />

      {/* Reset password dialog */}
      <Dialog open={resetPwState.open} onOpenChange={(open) => { if (!open) setResetPwState(s => ({ ...s, open: false, generatedPassword: "" })); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Reset password for {resetPwState.userName}. Leave blank to auto-generate.
            </DialogDescription>
          </DialogHeader>
          {resetPwState.generatedPassword ? (
            <div className="space-y-3">
              <p className="text-sm">New password generated:</p>
              <div className="flex items-center gap-2 bg-muted p-3 rounded-md">
                <code className="flex-1 font-mono text-sm">{resetPwState.generatedPassword}</code>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { navigator.clipboard.writeText(resetPwState.generatedPassword); toast.success("Copied to clipboard"); }}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Share this password with the user securely. It won&apos;t be shown again.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <Input
                type="password"
                placeholder="New password (min 8 chars) or leave blank"
                value={resetPwState.newPassword}
                onChange={e => setResetPwState(s => ({ ...s, newPassword: e.target.value }))}
              />
            </div>
          )}
          <DialogFooter>
            {resetPwState.generatedPassword ? (
              <Button onClick={() => setResetPwState(s => ({ ...s, open: false, generatedPassword: "" }))}>Done</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setResetPwState(s => ({ ...s, open: false }))}>Cancel</Button>
                <Button onClick={handleResetPassword} disabled={resetPassword.isPending}>
                  {resetPassword.isPending ? "Resetting..." : "Reset Password"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
