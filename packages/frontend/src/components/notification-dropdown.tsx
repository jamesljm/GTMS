"use client";

import { useState, useRef, useEffect } from "react";
import { useNotifications, useUnreadCount, useMarkRead, useMarkAllRead } from "@/hooks/use-notifications";
import { Bell, Check, CheckCheck, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

const typeIcons: Record<string, string> = {
  TASK_ASSIGNED: "📋",
  TASK_COMPLETED: "✅",
  TASK_ACCEPTED: "👍",
  TASK_CHANGES_REQUESTED: "✏️",
  TASK_REPROPOSED: "🔄",
};

export function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { data: unreadData } = useUnreadCount();
  const { data, isLoading } = useNotifications();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const count = unreadData?.count || 0;
  const notifications = data?.notifications || [];

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleClick = (n: any) => {
    if (!n.isRead) {
      markRead.mutate(n.id);
    }
    if (n.taskId) {
      router.push(`/tasks?task=${n.taskId}`);
    }
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-md hover:bg-accent transition-colors"
      >
        <Bell className="h-5 w-5 text-muted-foreground" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border z-50 overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b">
            <h3 className="text-sm font-semibold">Notifications</h3>
            {count > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-xs"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
              >
                <CheckCheck className="h-3 w-3 mr-1" /> Mark all read
              </Button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                No notifications
              </div>
            ) : (
              notifications.map((n: any) => (
                <div
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={cn(
                    "flex items-start gap-2.5 p-3 cursor-pointer hover:bg-accent/50 transition-colors border-b last:border-0",
                    !n.isRead && "bg-primary/5",
                  )}
                >
                  <span className="text-sm shrink-0 mt-0.5">{typeIcons[n.type] || "🔔"}</span>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-xs", !n.isRead && "font-medium")}>{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </p>
                      {n.taskId && (n.type === 'TASK_REPROPOSED' || n.type === 'TASK_CHANGES_REQUESTED') && (
                        <span className="text-[10px] text-primary font-medium flex items-center gap-0.5">
                          <ExternalLink className="h-2.5 w-2.5" /> View Task
                        </span>
                      )}
                    </div>
                  </div>
                  {!n.isRead && (
                    <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
