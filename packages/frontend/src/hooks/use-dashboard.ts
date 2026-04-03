import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: () => api.get("/dashboard").then(r => r.data),
  });
}

export function useDashboardToday() {
  return useQuery({
    queryKey: ["dashboard", "today"],
    queryFn: () => api.get("/dashboard/today").then(r => r.data),
  });
}

export function useDashboardWaiting() {
  return useQuery({
    queryKey: ["dashboard", "waiting"],
    queryFn: () => api.get("/dashboard/waiting").then(r => r.data),
  });
}

export function useDashboardCritical() {
  return useQuery({
    queryKey: ["dashboard", "critical"],
    queryFn: () => api.get("/dashboard/critical").then(r => r.data),
  });
}

export function useWorkstreamSummary() {
  return useQuery({
    queryKey: ["dashboard", "workstream-summary"],
    queryFn: () => api.get("/dashboard/workstream-summary").then(r => r.data),
  });
}

export function useTeamSummary() {
  return useQuery({
    queryKey: ["dashboard", "team-summary"],
    queryFn: () => api.get("/dashboard/team-summary").then(r => r.data),
  });
}
