"use client";

import { useState, useRef, useEffect } from "react";
import { ChatActionCard } from "@/components/chat-action-card";
import { useSendMessage, useChatSession } from "@/hooks/use-chat";
import { Send, Loader2, Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
  actions?: any[];
  createdAt?: string;
}

interface ChatInterfaceProps {
  sessionId?: string;
  onSessionCreated?: (sessionId: string) => void;
  compact?: boolean;
}

export function ChatInterface({ sessionId, onSessionCreated, compact = false }: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState(sessionId || "");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sendMessage = useSendMessage();

  const { data: session } = useChatSession(currentSessionId);

  useEffect(() => {
    if (session?.messages && messages.length === 0) {
      setMessages(session.messages.map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        actions: m.actionTaken ? JSON.parse(m.actionTaken) : undefined,
      })));
    }
  }, [session]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sendMessage.isPending) return;

    const userMessage = input.trim();
    setInput("");

    setMessages(prev => [...prev, { role: "user", content: userMessage }]);

    try {
      const result = await sendMessage.mutateAsync({
        message: userMessage,
        sessionId: currentSessionId || undefined,
      });

      if (result.sessionId && !currentSessionId) {
        setCurrentSessionId(result.sessionId);
        onSessionCreated?.(result.sessionId);
      }

      setMessages(prev => [...prev, {
        role: "assistant",
        content: result.response,
        actions: result.actions,
      }]);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
      }]);
    }
  };

  const avatarSize = compact ? "h-6 w-6" : "h-8 w-8";
  const iconSize = compact ? "h-3 w-3" : "h-4 w-4";

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className={cn("flex-1 overflow-y-auto space-y-3", compact ? "p-3" : "p-4 space-y-4")}>
        {messages.length === 0 && (
          <div className={cn("text-center", compact ? "py-4" : "py-8")}>
            <Bot className={cn("mx-auto text-muted-foreground mb-2", compact ? "h-8 w-8" : "h-12 w-12 mb-3")} />
            <p className={cn("font-medium", compact ? "text-sm" : "text-lg")}>AI Assistant</p>
            <p className={cn("text-muted-foreground mt-1", compact ? "text-xs" : "text-sm")}>
              {compact ? "Ask about tasks, create or update them" : "Ask me to create tasks, check status, or manage your workstreams."}
            </p>
            {!compact && (
              <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                <p>"Add task: follow up with June on OCBC e-giro, Finance, High priority"</p>
                <p>"What are my critical tasks this week?"</p>
                <p>"Mark the MRT3 tender review as done"</p>
                <p>"Show all tasks waiting on external parties"</p>
              </div>
            )}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
            {msg.role === "assistant" && (
              <div className={cn(avatarSize, "rounded-full bg-primary flex items-center justify-center text-primary-foreground shrink-0")}>
                <Bot className={iconSize} />
              </div>
            )}
            <div className={cn("max-w-[80%] space-y-2", msg.role === "user" ? "order-first" : "")}>
              <div className={cn(
                "rounded-lg px-3 py-2",
                compact ? "text-xs" : "text-sm px-4",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground ml-auto"
                  : "bg-muted"
              )}>
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
              {msg.actions?.map((action, j) => (
                <ChatActionCard key={j} action={action} />
              ))}
            </div>
            {msg.role === "user" && (
              <div className={cn(avatarSize, "rounded-full bg-secondary flex items-center justify-center shrink-0")}>
                <User className={iconSize} />
              </div>
            )}
          </div>
        ))}

        {sendMessage.isPending && (
          <div className="flex gap-2">
            <div className={cn(avatarSize, "rounded-full bg-primary flex items-center justify-center text-primary-foreground")}>
              <Bot className={iconSize} />
            </div>
            <div className={cn("bg-muted rounded-lg px-3 py-2 flex items-center gap-2", compact ? "text-xs" : "text-sm")}>
              <Loader2 className={cn(iconSize, "animate-spin")} />
              <span>Thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className={cn("border-t", compact ? "p-2" : "p-4")}>
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
          <input
            type="text"
            className={cn(
              "flex-1 flex w-full rounded-md border border-input bg-background px-3 py-1.5 ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              compact ? "h-8 text-xs" : "h-10 text-sm py-2",
            )}
            placeholder={compact ? "Ask AI..." : "Ask me anything about your tasks..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={sendMessage.isPending}
          />
          <button
            type="submit"
            disabled={!input.trim() || sendMessage.isPending}
            className={cn(
              "inline-flex items-center justify-center rounded-md font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none",
              compact ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm",
            )}
          >
            <Send className={iconSize} />
          </button>
        </form>
      </div>
    </div>
  );
}
