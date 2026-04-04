import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useUserAssignments(userId: string) {
  return useQuery({
    queryKey: ["assignments", userId],
    queryFn: () => api.get(`/users/${userId}/assignments`).then(r => r.data),
    enabled: !!userId,
  });
}

export function useCreateAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, ...data }: { userId: string; departmentId: string; role: string; position?: string; isPrimary?: boolean }) =>
      api.post(`/users/${userId}/assignments`, data).then(r => r.data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["assignments", variables.userId] });
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, id, ...data }: { userId: string; id: string; departmentId?: string; role?: string; position?: string; isPrimary?: boolean }) =>
      api.patch(`/users/${userId}/assignments/${id}`, data).then(r => r.data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["assignments", variables.userId] });
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, id }: { userId: string; id: string }) =>
      api.delete(`/users/${userId}/assignments/${id}`).then(r => r.data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["assignments", variables.userId] });
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
