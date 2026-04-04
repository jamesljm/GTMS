import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useDepartments() {
  return useQuery({
    queryKey: ["departments"],
    queryFn: () => api.get("/departments").then(r => r.data),
  });
}

export function useDepartment(id: string) {
  return useQuery({
    queryKey: ["department", id],
    queryFn: () => api.get(`/departments/${id}`).then(r => r.data),
    enabled: !!id,
  });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; code: string; description?: string; color?: string; headId?: string | null }) =>
      api.post("/departments", data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["departments"] });
    },
  });
}

export function useUpdateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; code?: string; description?: string; color?: string; headId?: string | null }) =>
      api.patch(`/departments/${id}`, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["departments"] });
    },
  });
}

export function useDeleteDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/departments/${id}`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["departments"] });
    },
  });
}
