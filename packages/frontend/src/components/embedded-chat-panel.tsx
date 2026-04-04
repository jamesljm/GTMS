"use client";

import { useState } from "react";
import { ChatInterface } from "@/components/chat-interface";
import { useUIStore } from "@/store/ui-store";
import { Bot, ChevronUp, ChevronDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmbeddedChatPanel() {
  const { chatExpanded, setChatExpanded } = useUIStore();
  const [sessionId, setSessionId] = useState("");

  const handleNewChat = () => {
    setSessionId("");
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Toggle bar */}
      <button
        onClick={() => setChatExpanded(!chatExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">AI Assistant</span>
        </div>
        <div className="flex items-center gap-2">
          {chatExpanded && (
            <span
              className="text-xs text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-accent"
              onClick={(e) => { e.stopPropagation(); handleNewChat(); }}
            >
              <Plus className="h-3 w-3 inline mr-0.5" /> New
            </span>
          )}
          {chatExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Chat content */}
      {chatExpanded && (
        <div className="border-t" style={{ height: 360 }}>
          <ChatInterface
            key={sessionId || "embedded-new"}
            sessionId={sessionId || undefined}
            onSessionCreated={setSessionId}
            compact
          />
        </div>
      )}
    </div>
  );
}
