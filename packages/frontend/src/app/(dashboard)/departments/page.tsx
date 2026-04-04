"use client";

import { useState } from "react";
import { useDepartments, useDepartment, useCreateDepartment, useUpdateDepartment, useDeleteDepartment } from "@/hooks/use-departments";
import { useUsers } from "@/hooks/use-workstreams";
import { useAuthStore } from "@/store/auth-store";
import { canManageDepartments } from "@/lib/permissions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, X, Check, Users, Crown } from "lucide-react";

export default function DepartmentsPage() {
  const { user } = useAuthStore();
  const { data: departments, isLoading } = useDepartments();
  const { data: allUsers } = useUsers();
  const createDepartment = useCreateDepartment();
  const updateDepartment = useUpdateDepartment();
  const deleteDepartment = useDeleteDepartment();

  const isED = user ? canManageDepartments(user) : false;

  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  const [editingDept, setEditingDept] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [showAdd, setShowAdd] = useState(false);
  const [newDept, setNewDept] = useState({ name: "", code: "", color: "#6366f1", description: "", headId: "" });

  const startEdit = (dept: any) => {
    setEditingDept(dept.id);
    setEditForm({
      name: dept.name,
      code: dept.code,
      color: dept.color || "#6366f1",
      description: dept.description || "",
      headId: dept.headId || "",
    });
  };

  const saveEdit = async () => {
    if (!editingDept) return;
    await updateDepartment.mutateAsync({
      id: editingDept,
      name: editForm.name,
      code: editForm.code,
      color: editForm.color,
      description: editForm.description || null,
      headId: editForm.headId || null,
    });
    setEditingDept(null);
  };

  const handleAdd = async () => {
    if (!newDept.name || !newDept.code) return;
    await createDepartment.mutateAsync({
      name: newDept.name,
      code: newDept.code.toUpperCase(),
      color: newDept.color,
      description: newDept.description || undefined,
      headId: newDept.headId || null,
    });
    setNewDept({ name: "", code: "", color: "#6366f1", description: "", headId: "" });
    setShowAdd(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this department? Only works if no members are assigned.")) return;
    try {
      await deleteDepartment.mutateAsync(id);
    } catch (err: any) {
      alert(err?.response?.data?.error || "Cannot delete department with members");
    }
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
        <h1 className="text-2xl font-bold">Departments</h1>
        {isED && (
          <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
            <Plus className="h-4 w-4 mr-1" /> Add Department
          </Button>
        )}
      </div>

      {/* Add department form */}
      {showAdd && isED && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input placeholder="Name" value={newDept.name} onChange={e => setNewDept(p => ({ ...p, name: e.target.value }))} />
              <Input placeholder="Code (e.g. FIN)" className="w-24" value={newDept.code} onChange={e => setNewDept(p => ({ ...p, code: e.target.value }))} />
              <div className="flex items-center gap-2">
                <input type="color" value={newDept.color} onChange={e => setNewDept(p => ({ ...p, color: e.target.value }))} className="w-8 h-8 rounded cursor-pointer" />
                <Input placeholder="Description (optional)" value={newDept.description} onChange={e => setNewDept(p => ({ ...p, description: e.target.value }))} />
              </div>
              <Select value={newDept.headId || "none"} onValueChange={v => setNewDept(p => ({ ...p, headId: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Select HOD..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No HOD</SelectItem>
                  {allUsers?.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>{u.name} ({u.role})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAdd} disabled={createDepartment.isPending}>
                  <Check className="h-4 w-4 mr-1" /> Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Department grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {departments?.map((dept: any) => (
          <Card
            key={dept.id}
            className="transition-colors cursor-pointer hover:border-primary"
            onClick={() => setExpandedDept(expandedDept === dept.id ? null : dept.id)}
          >
            <CardContent className="p-4">
              {editingDept === dept.id ? (
                <div className="space-y-2" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    <input type="color" value={editForm.color} onChange={e => setEditForm((p: any) => ({ ...p, color: e.target.value }))} className="w-8 h-8 rounded cursor-pointer" />
                    <Input placeholder="Name" value={editForm.name} onChange={e => setEditForm((p: any) => ({ ...p, name: e.target.value }))} />
                  </div>
                  <Input placeholder="Code" value={editForm.code} onChange={e => setEditForm((p: any) => ({ ...p, code: e.target.value }))} />
                  <Input placeholder="Description" value={editForm.description} onChange={e => setEditForm((p: any) => ({ ...p, description: e.target.value }))} />
                  <Select value={editForm.headId || "none"} onValueChange={v => setEditForm((p: any) => ({ ...p, headId: v === "none" ? "" : v }))}>
                    <SelectTrigger><SelectValue placeholder="Select HOD..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No HOD</SelectItem>
                      {allUsers?.map((u: any) => (
                        <SelectItem key={u.id} value={u.id}>{u.name} ({u.role})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveEdit} disabled={updateDepartment.isPending}>
                      <Check className="h-4 w-4 mr-1" /> Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingDept(null)}>
                      <X className="h-4 w-4 mr-1" /> Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: dept.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{dept.name}</p>
                      <p className="text-xs text-muted-foreground">{dept.code}</p>
                    </div>
                    {isED && (
                      <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(dept)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(dept.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {dept.description && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">{dept.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" /> {dept._count?.members || 0} members
                    </span>
                    {dept.head && (
                      <span className="flex items-center gap-1">
                        <Crown className="h-3 w-3" /> {dept.head.name}
                      </span>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Expanded member list */}
      {expandedDept && (
        <DepartmentMembers deptId={expandedDept} />
      )}
    </div>
  );
}

function DepartmentMembers({ deptId }: { deptId: string }) {
  const { data: dept, isLoading } = useDepartment(deptId);

  if (isLoading) {
    return <div className="flex justify-center py-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>;
  }

  if (!dept) return null;

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="font-medium mb-3">{dept.name} - Members ({dept.members?.length || 0})</h3>
        {dept.members?.length > 0 ? (
          <div className="space-y-2">
            {dept.members.map((m: any) => (
              <div key={m.id} className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-accent/50">
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium shrink-0">
                  {m.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {m.name}
                    {dept.headId === m.id && <span className="ml-2 text-xs text-amber-600 font-normal">(HOD)</span>}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{m.email} - {m.role} · {m.position || "No position"}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No members in this department</p>
        )}
      </CardContent>
    </Card>
  );
}

