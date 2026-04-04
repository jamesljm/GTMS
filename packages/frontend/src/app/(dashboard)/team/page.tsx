"use client";

import { useTeamSummary } from "@/hooks/use-dashboard";
import { useTasksByAssignee } from "@/hooks/use-tasks";
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from "@/hooks/use-workstreams";
import { useDepartments } from "@/hooks/use-departments";
import { useAuthStore } from "@/store/auth-store";
import { canManageUsers } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TaskCard } from "@/components/task-card";
import { TaskDetailPanel } from "@/components/task-detail-panel";
import { cn } from "@/lib/utils";
import { useState, useCallback } from "react";
import { Plus, Mail, Pencil, Trash2, X, Check, UserPlus } from "lucide-react";

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
  const { data: teamSummary } = useTeamSummary();
  const { data: tasksByAssignee } = useTasksByAssignee();
  const { data: allUsers } = useUsers();
  const { data: departments } = useDepartments();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", role: "STAFF", position: "", departmentId: "" });

  const handleSelectTask = useCallback((taskId: string) => {
    setSelectedTaskId(taskId);
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedTaskId(null);
  }, []);

  const startEdit = (member: any) => {
    setEditingUser(member.id);
    setEditForm({ name: member.name, email: member.email, role: member.role, position: member.position, departmentId: member.departmentId || "" });
  };

  const saveEdit = async () => {
    if (!editingUser) return;
    await updateUser.mutateAsync({ id: editingUser, ...editForm });
    setEditingUser(null);
  };

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email) return;
    await createUser.mutateAsync(newUser);
    setNewUser({ name: "", email: "", role: "STAFF", position: "", departmentId: "" });
    setShowAddUser(false);
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Deactivate this user? Their tasks will remain.")) return;
    await deleteUser.mutateAsync(id);
  };

  // Merge team summary (has task counts) with allUsers list for complete picture
  const members = teamSummary || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Team View</h1>
        {isManager && (
          <Button size="sm" onClick={() => setShowAddUser(!showAddUser)}>
            <UserPlus className="h-4 w-4 mr-1" /> Add Member
          </Button>
        )}
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
                  <SelectItem value="ED">ED</SelectItem>
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
                  <Input placeholder="Position" value={editForm.position} onChange={e => setEditForm((p: any) => ({ ...p, position: e.target.value }))} />
                  <Select value={editForm.departmentId || "none"} onValueChange={v => setEditForm((p: any) => ({ ...p, departmentId: v === "none" ? "" : v }))}>
                    <SelectTrigger><SelectValue placeholder="Department..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Department</SelectItem>
                      {departments?.map((d: any) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={editForm.role} onValueChange={v => setEditForm((p: any) => ({ ...p, role: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ED">ED</SelectItem>
                      <SelectItem value="HOD">HOD</SelectItem>
                      <SelectItem value="MANAGER">Manager</SelectItem>
                      <SelectItem value="STAFF">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveEdit} disabled={updateUser.isPending}>
                      <Check className="h-4 w-4 mr-1" /> Save
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
                    <div className="flex gap-1 shrink-0">
                      {isManager && (
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); startEdit(member); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
                        <a href={`mailto:${member.email}`} onClick={e => e.stopPropagation()} title={member.email}>
                          <Mail className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                      {isManager && (
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteUser(member.id); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {/* Email display */}
                  <a href={`mailto:${member.email}`} className="text-xs text-primary hover:underline mt-1 block truncate">{member.email}</a>
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
                <TaskCard key={task.id} task={task} onClick={handleSelectTask} isSelected={selectedTaskId === task.id} />
              ))}
            {(!tasksByAssignee.find((u: any) => u.id === expandedUser)?.assignedTasks?.length) && (
              <p className="text-sm text-muted-foreground">No active tasks assigned</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Task detail panel */}
      <TaskDetailPanel
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onClose={handleClosePanel}
      />
    </div>
  );
}
