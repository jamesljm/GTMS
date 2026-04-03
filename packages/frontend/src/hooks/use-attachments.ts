import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

export function getAttachmentUrl(id: string) {
  return `${api.defaults.baseURL}/attachments/${id}`;
}

export function useUploadAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, file }: { taskId: string; file: File }) => {
      const formData = new FormData();
      formData.append("taskId", taskId);
      formData.append("file", file);
      return api.post("/attachments", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      }).then(r => r.data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["task", variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("File uploaded");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to upload file");
    },
  });
}

export function useDeleteAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, taskId }: { id: string; taskId: string }) => {
      return api.delete(`/attachments/${id}`).then(r => r.data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["task", variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Attachment deleted");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to delete attachment");
    },
  });
}
