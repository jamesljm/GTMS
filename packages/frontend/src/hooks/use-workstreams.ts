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
    mutationFn: (data: { email: string; name: string; role?: string; position?: string; departmentId?: string }) =>
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
    mutationFn: ({ id, ...data }: { id: string; name?: string; email?: string; role?: string; position?: string; departmentId?: string }) =>
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

export function useResetPassword() {
  return useMutation({
    mutationFn: (data: { userId: string; newPassword?: string }) =>
      api.post("/auth/reset-password", data).then(r => r.data),
  });
}

// Workstream Members hooks
export function useWorkstreamMembers(workstreamId: string) {
  return useQuery({
    queryKey: ["workstream-members", workstreamId],
    queryFn: () => api.get(`/workstreams/${workstreamId}/members`).then(r => r.data),
    enabled: !!workstreamId,
  });
}

export function useAddWorkstreamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workstreamId, userId, role }: { workstreamId: string; userId: string; role: string }) =>
      api.post(`/workstreams/${workstreamId}/members`, { userId, role }).then(r => r.data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["workstream-members", vars.workstreamId] });
    },
  });
}

export function useUpdateWorkstreamMemberRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workstreamId, userId, role }: { workstreamId: string; userId: string; role: string }) =>
      api.patch(`/workstreams/${workstreamId}/members/${userId}`, { role }).then(r => r.data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["workstream-members", vars.workstreamId] });
    },
  });
}

export function useRemoveWorkstreamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workstreamId, userId }: { workstreamId: string; userId: string }) =>
      api.delete(`/workstreams/${workstreamId}/members/${userId}`).then(r => r.data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["workstream-members", vars.workstreamId] });
    },
  });
}
