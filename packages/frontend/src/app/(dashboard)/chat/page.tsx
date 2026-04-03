"use client";

import { useState } from "react";
import { ChatInterface } from "@/components/chat-interface";
import { useChatSessions } from "@/hooks/use-chat";
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function ChatPage() {
  const [selectedSession, setSelectedSession] = useState<string>("");
  const [showSidebar, setShowSidebar] = useState(false);
  const { data: sessions } = useChatSessions();

  const handleNewChat = () => {
    setSelectedSession("");
    setShowSidebar(false);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] lg:h-[calc(100vh-4rem)] -m-4 md:-m-6">
      {/* Session sidebar - desktop */}
      <div className="hidden lg:flex w-64 border-r flex-col bg-white">
        <div className="p-3 border-b">
          <Button className="w-full" size="sm" onClick={handleNewChat}>
            <Plus className="h-4 w-4 mr-1" /> New Chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {sessions?.map((session: any) => (
            <button
              key={session.id}
              onClick={() => setSelectedSession(session.id)}
              className={cn(
                "w-full text-left p-3 border-b hover:bg-accent/50 transition-colors",
                selectedSession === session.id && "bg-accent"
              )}
            >
              <p className="text-sm font-medium truncate">{session.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {format(new Date(session.updatedAt), "dd MMM HH:mm")} · {session._count?.messages || 0} msgs
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between p-3 border-b">
          <Button variant="ghost" size="sm" onClick={() => setShowSidebar(!showSidebar)}>
            <MessageSquare className="h-4 w-4 mr-1" /> Sessions
          </Button>
          <Button size="sm" onClick={handleNewChat}>
            <Plus className="h-4 w-4 mr-1" /> New
          </Button>
        </div>

        {/* Mobile session list */}
        {showSidebar && (
          <div className="lg:hidden border-b max-h-48 overflow-y-auto">
            {sessions?.map((session: any) => (
              <button
                key={session.id}
                onClick={() => { setSelectedSession(session.id); setShowSidebar(false); }}
                className="w-full text-left p-3 border-b hover:bg-accent/50 text-sm"
              >
                {session.title}
              </button>
            ))}
          </div>
        )}

        <ChatInterface
          key={selectedSession || "new"}
          sessionId={selectedSession}
          onSessionCreated={setSelectedSession}
        />
      </div>
    </div>
  );
}
