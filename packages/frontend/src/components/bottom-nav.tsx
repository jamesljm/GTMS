"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ListTodo, MessageSquare, ClipboardCheck,
  MoreHorizontal, Users, Building2, Settings, HelpCircle, Activity,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const primaryNav = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Home" },
  { href: "/tasks", icon: ListTodo, label: "Tasks" },
  { href: "/pending", icon: ClipboardCheck, label: "Pending" },
  { href: "/chat", icon: MessageSquare, label: "Chat" },
];

const moreNav = [
  { href: "/team", icon: Users, label: "Team" },
  { href: "/departments", icon: Building2, label: "Departments" },
  { href: "/activity", icon: Activity, label: "Activity" },
  { href: "/settings", icon: Settings, label: "Settings" },
  { href: "/help", icon: HelpCircle, label: "Help" },
];

export function BottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const isMoreActive = moreNav.some(
    (item) => pathname === item.href || pathname?.startsWith(item.href + "/")
  );

  return (
    <>
      {/* More menu overlay */}
      {moreOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setMoreOpen(false)} />
      )}

      {/* More menu slide-up sheet */}
      {moreOpen && (
        <div className="lg:hidden fixed bottom-[57px] left-0 right-0 z-50 bg-background border-t rounded-t-2xl shadow-lg animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <span className="text-sm font-medium">More</span>
            <button
              onClick={() => setMoreOpen(false)}
              className="p-1 rounded-md hover:bg-accent min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1 px-3 pb-4">
            {moreNav.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex flex-col items-center gap-1 py-3 rounded-lg text-xs transition-colors min-h-[44px]",
                    isActive
                      ? "text-primary bg-primary/10 font-medium"
                      : "text-muted-foreground hover:bg-accent"
                  )}
                >
                  <item.icon className={cn("h-5 w-5", isActive && "fill-primary/20")} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom navigation bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t flex items-center justify-around py-1 px-1">
        {primaryNav.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-md text-xs transition-colors min-h-[44px] min-w-[44px] justify-center",
                isActive ? "text-primary font-medium" : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "fill-primary/20")} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* More button */}
        <button
          onClick={() => setMoreOpen(!moreOpen)}
          className={cn(
            "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-md text-xs transition-colors min-h-[44px] min-w-[44px] justify-center",
            isMoreActive || moreOpen ? "text-primary font-medium" : "text-muted-foreground"
          )}
        >
          <MoreHorizontal className={cn("h-5 w-5", (isMoreActive || moreOpen) && "fill-primary/20")} />
          <span>More</span>
        </button>
      </nav>
    </>
  );
}
