import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useAuditLogs(filters: Record<string, any> = {}) {
  return useQuery({
    queryKey: ["audit-logs", filters],
    queryFn: () => api.get("/audit-logs", { params: filters }).then(r => r.data),
  });
}

export function useMyAuditLogs(filters: Record<string, any> = {}) {
  return useQuery({
    queryKey: ["audit-logs", "mine", filters],
    queryFn: () => api.get("/audit-logs/mine", { params: filters }).then(r => r.data),
  });
}
