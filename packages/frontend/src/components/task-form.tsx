"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateTask } from "@/hooks/use-tasks";
import { useWorkstreams, useUsers } from "@/hooks/use-workstreams";
import { useAuthStore } from "@/store/auth-store";

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskFormDialog({ open, onOpenChange }: TaskFormDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("My Action");
  const [priority, setPriority] = useState("Medium");
  const [workstreamId, setWorkstreamId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");

  const { user: currentUser } = useAuthStore();
  const { data: workstreams } = useWorkstreams();
  const { data: users } = useUsers();
  const createTask = useCreateTask();

  // Filter assignee list by role
  const filteredUsers = users?.filter((u: any) => {
    if (!currentUser) return true;
    if (currentUser.role === 'ED') return true;
    if (currentUser.role === 'STAFF') return u.id === currentUser.id;
    // HOD/MANAGER: same department only
    if (currentUser.departmentId) return u.departmentId === currentUser.departmentId;
    return u.id === currentUser.id;
  }) || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createTask.mutateAsync({
      title,
      description: description || undefined,
      type,
      priority,
      workstreamId: workstreamId || undefined,
      assigneeId: assigneeId || undefined,
      dueDate: dueDate || undefined,
    });
    onOpenChange(false);
    // Reset form
    setTitle("");
    setDescription("");
    setType("My Action");
    setPriority("Medium");
    setWorkstreamId("");
    setAssigneeId("");
    setDueDate("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title..."
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="My Action">My Action</SelectItem>
                  <SelectItem value="Waiting On">Waiting On</SelectItem>
                  <SelectItem value="Decision">Decision</SelectItem>
                  <SelectItem value="Review">Review</SelectItem>
                  <SelectItem value="Recurring">Recurring</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Priority</label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
            <div className="space-y-2">
              <label className="text-sm font-medium">Workstream</label>
              <Select value={workstreamId} onValueChange={setWorkstreamId}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {workstreams?.map((ws: any) => (
                    <SelectItem key={ws.id} value={ws.id}>{ws.code} - {ws.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Assignee</label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {filteredUsers.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Due Date</label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createTask.isPending}>
              {createTask.isPending ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
