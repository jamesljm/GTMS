import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

export function useTasks(filters: Record<string, any> = {}) {
  return useQuery({
    queryKey: ["tasks", filters],
    queryFn: () => api.get("/tasks", { params: filters }).then(r => r.data),
  });
}

export function useInfiniteTasks(filters: Record<string, any> = {}) {
  const { page, ...rest } = filters;
  return useInfiniteQuery({
    queryKey: ["tasks", "infinite", rest],
    queryFn: ({ pageParam = 1 }) =>
      api.get("/tasks", { params: { ...rest, page: pageParam, limit: 50 } }).then(r => r.data),
    initialPageParam: 1,
    getNextPageParam: (lastPage: any) =>
      lastPage.pagination.page < lastPage.pagination.totalPages
        ? lastPage.pagination.page + 1
        : undefined,
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

export function usePendingReview() {
  return useQuery({
    queryKey: ["tasks", "pending-review"],
    queryFn: () => api.get("/tasks/pending-review").then(r => r.data),
  });
}

export function useTaskProposals(taskId: string) {
  return useQuery({
    queryKey: ["task-proposals", taskId],
    queryFn: () => api.get(`/tasks/${taskId}/proposals`).then(r => r.data),
    enabled: !!taskId,
  });
}

export function useAcceptTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/tasks/${id}/accept`).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-proposals"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Task accepted");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to accept task");
    },
  });
}

export function useRequestChanges() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment: string }) =>
      api.post(`/tasks/${id}/request-changes`, { comment }).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-proposals"] });
      toast.success("Changes requested");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to request changes");
    },
  });
}

export function useReproposeTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; proposedTitle?: string; proposedDescription?: string; comment?: string }) =>
      api.post(`/tasks/${id}/repropose`, data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-proposals"] });
      toast.success("Counter-proposal sent");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to repropose task");
    },
  });
}
