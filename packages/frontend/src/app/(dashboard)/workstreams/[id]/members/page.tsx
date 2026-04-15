"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useWorkstream, useWorkstreamMembers, useAddWorkstreamMember, useUpdateWorkstreamMemberRole, useRemoveWorkstreamMember, useUsers } from "@/hooks/use-workstreams";
import { useAuthStore } from "@/store/auth-store";
import { canManageWorkstreamMembers } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ArrowLeft, Plus, Trash2, Users, Building2 } from "lucide-react";
import { useDepartment } from "@/hooks/use-departments";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const roleBadgeStyles: Record<string, string> = {
  HOD: "bg-purple-100 text-purple-700",
  MANAGER: "bg-blue-100 text-blue-700",
  STAFF: "bg-gray-100 text-gray-600",
};

export default function WorkstreamMembersPage() {
  const params = useParams();
  const router = useRouter();
  const workstreamId = params.id as string;
  const { user: currentUser } = useAuthStore();
  const canManage = currentUser ? canManageWorkstreamMembers(currentUser) : false;

  const { data: workstream, isLoading: wsLoading } = useWorkstream(workstreamId);
  const { data: members, isLoading: membersLoading } = useWorkstreamMembers(workstreamId);
  const { data: allUsers } = useUsers();
  const addMember = useAddWorkstreamMember();
  const updateRole = useUpdateWorkstreamMemberRole();
  const removeMember = useRemoveWorkstreamMember();

  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState("STAFF");
  const [confirmState, setConfirmState] = useState<{ open: boolean; userId: string; name: string }>({ open: false, userId: "", name: "" });

  const deptId = workstream?.departmentId || "";
  const { data: deptDetail } = useDepartment(deptId);

  const memberUserIds = new Set((members || []).map((m: any) => m.userId));
  const availableUsers = (allUsers || []).filter((u: any) => !memberUserIds.has(u.id) && u.isActive !== false);

  // Partition: department members first, then others
  const deptMemberIds = new Set((deptDetail?.members || []).map((m: any) => m.id));
  const deptAvailable = deptId ? availableUsers.filter((u: any) => deptMemberIds.has(u.id)) : [];
  const otherAvailable = deptId ? availableUsers.filter((u: any) => !deptMemberIds.has(u.id)) : availableUsers;

  const handleAdd = async () => {
    if (!selectedUserId) return;
    try {
      await addMember.mutateAsync({ workstreamId, userId: selectedUserId, role: selectedRole });
      setSelectedUserId("");
      setSelectedRole("STAFF");
      setShowAddForm(false);
      toast.success("Member added");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to add member");
    }
  };

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await updateRole.mutateAsync({ workstreamId, userId, role });
      toast.success("Role updated");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to update role");
    }
  };

  const handleRemove = async () => {
    try {
      await removeMember.mutateAsync({ workstreamId, userId: confirmState.userId });
      setConfirmState({ open: false, userId: "", name: "" });
      toast.success("Member removed");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to remove member");
    }
  };

  if (wsLoading || membersLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/workstreams")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="flex items-center gap-2">
          {workstream?.color && <div className="w-3 h-3 rounded-full" style={{ backgroundColor: workstream.color }} />}
          <h1 className="text-2xl font-bold">{workstream?.code} - {workstream?.name}</h1>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="h-4 w-4" />
          <span className="text-sm">{members?.length || 0} members</span>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}>
            <Plus className="h-4 w-4 mr-1" /> Add Member
          </Button>
        )}
      </div>

      {/* Add member form */}
      {showAddForm && canManage && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Select value={selectedUserId || "none"} onValueChange={v => setSelectedUserId(v === "none" ? "" : v)}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select user..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" disabled>Select user...</SelectItem>
                  {deptAvailable.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-1">
                        <Building2 className="h-3 w-3" /> {deptDetail?.name || "Department"} Members
                      </div>
                      {deptAvailable.map((u: any) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name} ({u.email})
                        </SelectItem>
                      ))}
                      {otherAvailable.length > 0 && (
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-1.5">
                          Other Users
                        </div>
                      )}
                    </>
                  )}
                  {otherAvailable.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HOD">HOD</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="STAFF">Staff</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleAdd} disabled={!selectedUserId || addMember.isPending}>
                Add
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Members list */}
      <div className="space-y-2">
        {members?.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No members yet. Add users to this workstream to control task access.
            </CardContent>
          </Card>
        )}
        {members?.map((m: any) => (
          <Card key={m.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
                    {m.user.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{m.user.name}</p>
                    <p className="text-xs text-muted-foreground">{m.user.email} {m.user.position ? `- ${m.user.position}` : ""}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {canManage ? (
                    <Select value={m.role} onValueChange={(v) => handleRoleChange(m.userId, v)}>
                      <SelectTrigger className="w-28 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HOD">HOD</SelectItem>
                        <SelectItem value="MANAGER">Manager</SelectItem>
                        <SelectItem value="STAFF">Staff</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline" className={cn("text-xs", roleBadgeStyles[m.role])}>
                      {m.role}
                    </Badge>
                  )}
                  {canManage && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive"
                      onClick={() => setConfirmState({ open: true, userId: m.userId, name: m.user.name })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ConfirmDialog
        open={confirmState.open}
        title="Remove Member"
        description={`Remove ${confirmState.name} from this workstream? They will lose access to workstream tasks.`}
        destructive
        onConfirm={handleRemove}
        onCancel={() => setConfirmState({ open: false, userId: "", name: "" })}
      />
    </div>
  );
}
