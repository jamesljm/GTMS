"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateTask } from "@/hooks/use-tasks";
import { useWorkstreams, useUsers } from "@/hooks/use-workstreams";
import { useAuthStore } from "@/store/auth-store";
import { RecurrencePicker, RecurrenceData } from "@/components/recurrence-picker";

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultStartDate?: string;
}

export function TaskFormDialog({ open, onOpenChange, defaultStartDate }: TaskFormDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("My Action");
  const [priority, setPriority] = useState("Medium");
  const [workstreamId, setWorkstreamId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [startDate, setStartDate] = useState(defaultStartDate || "");
  const [dueDate, setDueDate] = useState("");

  // Sync default start date when it changes (e.g., user clicks a different calendar day)
  useEffect(() => {
    if (open && defaultStartDate !== undefined) {
      setStartDate(defaultStartDate);
    }
  }, [open, defaultStartDate]);
  const [recurrence, setRecurrence] = useState<RecurrenceData>({
    recurrenceType: null,
    recurrenceInterval: 1,
    recurrenceDays: null,
    recurrenceStartDate: null,
    recurrenceEndDate: null,
    recurrenceCount: null,
  });

  const { user: currentUser } = useAuthStore();
  const { data: workstreams } = useWorkstreams();
  const { data: users } = useUsers();
  const createTask = useCreateTask();

  // Filter assignee list by role
  const filteredUsers = users?.filter((u: any) => {
    if (!currentUser) return true;
    if (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ED') return true;
    if (currentUser.role === 'STAFF') return u.id === currentUser.id;
    // HOD/MANAGER: same department only
    if (currentUser.departmentId) return u.departmentId === currentUser.departmentId;
    return u.id === currentUser.id;
  }) || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const taskData: any = {
      title,
      description: description || undefined,
      type: recurrence.recurrenceType ? "Recurring" : type,
      priority,
      workstreamId: workstreamId || undefined,
      assigneeId: assigneeId || undefined,
      startDate: startDate || undefined,
      dueDate: dueDate || undefined,
    };

    if (recurrence.recurrenceType) {
      taskData.recurrenceType = recurrence.recurrenceType;
      taskData.recurrenceInterval = recurrence.recurrenceInterval;
      taskData.recurrenceDays = recurrence.recurrenceDays || undefined;
      taskData.recurrenceStartDate = recurrence.recurrenceStartDate || undefined;
      taskData.recurrenceEndDate = recurrence.recurrenceEndDate || undefined;
      taskData.recurrenceCount = recurrence.recurrenceCount || undefined;
    }

    await createTask.mutateAsync(taskData);
    onOpenChange(false);
    // Reset form
    setTitle("");
    setDescription("");
    setType("My Action");
    setPriority("Medium");
    setWorkstreamId("");
    setAssigneeId("");
    setStartDate("");
    setDueDate("");
    setRecurrence({ recurrenceType: null, recurrenceInterval: 1, recurrenceDays: null, recurrenceStartDate: null, recurrenceEndDate: null, recurrenceCount: null });
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Due Date</label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          {(type === "Recurring" || recurrence.recurrenceType) && (
            <RecurrencePicker
              value={recurrence}
              onChange={setRecurrence}
              defaultStartDate={dueDate}
            />
          )}
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
