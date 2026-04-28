import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

export function useEmailFollowUps(taskId: string) {
  return useQuery({
    queryKey: ["email-followups", taskId],
    queryFn: () =>
      api.get(`/tasks/${taskId}/email-followups`).then((r) => r.data),
    enabled: !!taskId,
  });
}

export function useCreateEmailFollowUp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskId,
      data,
    }: {
      taskId: string;
      data: Record<string, any>;
    }) => api.post(`/tasks/${taskId}/email-followups`, data).then((r) => r.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["email-followups", variables.taskId],
      });
      toast.success("Email follow-up created");
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.error || "Failed to create email follow-up"
      );
    },
  });
}

export function useUpdateEmailFollowUp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskId,
      id,
      data,
    }: {
      taskId: string;
      id: string;
      data: Record<string, any>;
    }) =>
      api
        .patch(`/tasks/${taskId}/email-followups/${id}`, data)
        .then((r) => r.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["email-followups", variables.taskId],
      });
      toast.success("Email follow-up updated");
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.error || "Failed to update email follow-up"
      );
    },
  });
}

export function useDeleteEmailFollowUp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, id }: { taskId: string; id: string }) =>
      api
        .delete(`/tasks/${taskId}/email-followups/${id}`)
        .then((r) => r.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["email-followups", variables.taskId],
      });
      toast.success("Email follow-up deleted");
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.error || "Failed to delete email follow-up"
      );
    },
  });
}

export function useSendFollowUpNow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, id }: { taskId: string; id: string }) =>
      api
        .post(`/tasks/${taskId}/email-followups/${id}/send-now`)
        .then((r) => r.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["email-followups", variables.taskId],
      });
      toast.success("Email sent successfully");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to send email");
    },
  });
}
