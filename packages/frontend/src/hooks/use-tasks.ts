import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

export function useTasks(filters: Record<string, any> = {}) {
  return useQuery({
    queryKey: ["tasks", filters],
    queryFn: () => api.get("/tasks", { params: filters }).then(r => r.data),
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: ["task", id],
    queryFn: () => api.get(`/tasks/${id}`).then(r => r.data),
    enabled: !!id,
  });
}

export function useTodayTasks() {
  return useQuery({
    queryKey: ["tasks", "today"],
    queryFn: () => api.get("/tasks/today").then(r => r.data),
  });
}

export function useWaitingTasks() {
  return useQuery({
    queryKey: ["tasks", "waiting"],
    queryFn: () => api.get("/tasks/waiting").then(r => r.data),
  });
}

export function useTasksByWorkstream() {
  return useQuery({
    queryKey: ["tasks", "by-workstream"],
    queryFn: () => api.get("/tasks/by-workstream").then(r => r.data),
  });
}

export function useTasksByAssignee() {
  return useQuery({
    queryKey: ["tasks", "by-assignee"],
    queryFn: () => api.get("/tasks/by-assignee").then(r => r.data),
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post("/tasks", data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Task created");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to create task");
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) => api.patch(`/tasks/${id}`, data).then(r => r.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Task updated");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to update task");
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/tasks/${id}`).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Task deleted");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to delete task");
    },
  });
}
