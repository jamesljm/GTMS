import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useWorkstreams() {
  return useQuery({
    queryKey: ["workstreams"],
    queryFn: () => api.get("/workstreams").then(r => r.data),
  });
}

export function useWorkstream(id: string) {
  return useQuery({
    queryKey: ["workstream", id],
    queryFn: () => api.get(`/workstreams/${id}`).then(r => r.data),
    enabled: !!id,
  });
}

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => api.get("/users").then(r => r.data),
  });
}

export function useCreateWorkstream() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { code: string; name: string; color?: string; description?: string }) =>
      api.post("/workstreams", data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workstreams"] });
    },
  });
}

export function useUpdateWorkstream() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; code?: string; name?: string; color?: string; description?: string }) =>
      api.patch(`/workstreams/${id}`, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workstreams"] });
    },
  });
}

export function useDeleteWorkstream() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/workstreams/${id}`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workstreams"] });
    },
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; name: string; role?: string; position?: string; department?: string }) =>
      api.post("/users", data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; email?: string; role?: string; position?: string; department?: string }) =>
      api.patch(`/users/${id}`, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
