import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useChatSessions() {
  return useQuery({
    queryKey: ["chat", "sessions"],
    queryFn: () => api.get("/chat/sessions").then(r => r.data),
  });
}

export function useChatSession(sessionId: string) {
  return useQuery({
    queryKey: ["chat", "session", sessionId],
    queryFn: () => api.get(`/chat/sessions/${sessionId}`).then(r => r.data),
    enabled: !!sessionId,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { message: string; sessionId?: string }) =>
      api.post("/chat/message", data).then(r => r.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["chat"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
