"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";
import {
  LayoutDashboard, ListTodo, MessageSquare, Users, Layers,
  Settings, LogOut, Menu, X, Building2, ClipboardCheck, Activity, ShieldCheck, HelpCircle, BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/bottom-nav";
import { EmbeddedChatPanel } from "@/components/embedded-chat-panel";
import { NotificationDropdown } from "@/components/notification-dropdown";
import { GlobalSearch } from "@/components/global-search";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Dept Charts", href: "/department-dashboard", icon: BarChart3 },
  { name: "Tasks", href: "/tasks", icon: ListTodo },
  { name: "Pending", href: "/pending", icon: ClipboardCheck },
  { name: "AI Chat", href: "/chat", icon: MessageSquare },
  { name: "Activity", href: "/activity", icon: Activity },
  { name: "Team", href: "/team", icon: Users },
  { name: "Departments", href: "/departments", icon: Building2 },
  { name: "Workstreams", href: "/workstreams", icon: Layers },
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Help", href: "/help", icon: HelpCircle },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated, initialize, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !user) return null;

  return (
    <div className="min-h-screen flex">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-background border-b p-4 flex items-center gap-2">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-md hover:bg-accent shrink-0">
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <div className="flex-1 min-w-0">
          <GlobalSearch />
        </div>
        <NotificationDropdown />
      </div>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-30 w-64 bg-background border-r transform transition-transform lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b hidden lg:block">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-primary">GTMS</h1>
                <p className="text-xs text-muted-foreground mt-1">Geohan Corporation</p>
              </div>
              <NotificationDropdown />
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto mt-16 lg:mt-0">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* AI Chat Panel */}
          <div className="px-3 pb-2 hidden lg:block">
            <EmbeddedChatPanel />
          </div>

          {/* User info */}
          <div className="p-4 border-t">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
                {user.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                {user.role === "SUPER_ADMIN" ? (
                  <p className="text-xs text-red-600 font-semibold flex items-center gap-1 truncate">
                    <ShieldCheck className="h-3 w-3" /> Super Admin
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground truncate">{user.role} - {user.department?.name || "No Dept"}</p>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-20 bg-black/50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 lg:ml-64 mt-16 lg:mt-0 pb-20 lg:pb-0">
        <div className="hidden lg:block sticky top-0 z-10 bg-background border-b px-6 py-3">
          <GlobalSearch />
        </div>
        <div className="p-4 md:p-6">{children}</div>
      </main>

      {/* Bottom nav for mobile — hidden when sidebar is open to prevent overlap with Sign Out */}
      {!sidebarOpen && <BottomNav />}
    </div>
  );
}
