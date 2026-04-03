import { useQuery } from "@tanstack/react-query";
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
