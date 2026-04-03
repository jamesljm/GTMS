"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
}

export function ChatInterface({ sessionId, onSessionCreated }: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState(sessionId || "");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sendMessage = useSendMessage();

  // Load existing session messages
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

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-lg font-medium">GTMS AI Assistant</p>
            <p className="text-sm text-muted-foreground mt-1">
              Ask me to create tasks, check status, or manage your workstreams.
            </p>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <p>"Add task: follow up with June on OCBC e-giro, Finance, High priority"</p>
              <p>"What are my critical tasks this week?"</p>
              <p>"Mark the MRT3 tender review as done"</p>
              <p>"Show all tasks waiting on external parties"</p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>
            {msg.role === "assistant" && (
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground shrink-0">
                <Bot className="h-4 w-4" />
              </div>
            )}
            <div className={cn("max-w-[80%] space-y-2", msg.role === "user" ? "order-first" : "")}>
              <div className={cn(
                "rounded-lg px-4 py-2 text-sm",
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
              <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}

        {sendMessage.isPending && (
          <div className="flex gap-3">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
              <Bot className="h-4 w-4" />
            </div>
            <div className="bg-muted rounded-lg px-4 py-2 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            className="flex-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            placeholder="Ask me anything about your tasks..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={sendMessage.isPending}
          />
          <button
            type="submit"
            disabled={!input.trim() || sendMessage.isPending}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 w-10 disabled:opacity-50 disabled:pointer-events-none"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
