"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import { usePreferences, useUpdatePreferences } from "@/hooks/use-preferences";
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { downloadFile } from "@/lib/download";
import { toast } from "sonner";
import { Download, Database, Copy, Check, Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { user } = useAuthStore();
  const isED = user?.role === "SUPER_ADMIN" || user?.role === "ED";
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingJson, setExportingJson] = useState(false);
  const [dbUrl, setDbUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const { data: preferences, isLoading: prefsLoading } = usePreferences();
  const updatePreferences = useUpdatePreferences();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isED) {
      api.get("/admin/db-url").then(r => setDbUrl(r.data.url)).catch(() => {});
    }
  }, [isED]);

  // Sync theme from server preferences on load
  useEffect(() => {
    if (preferences?.theme && mounted) {
      setTheme(preferences.theme);
    }
  }, [preferences?.theme, mounted, setTheme]);

  const handleExportCsv = async () => {
    setExportingCsv(true);
    try {
      const date = new Date().toISOString().split("T")[0];
      await downloadFile("/export/tasks?format=csv", `gtms-tasks-${date}.csv`);
      toast.success("Tasks exported successfully");
    } catch (err: any) {
      toast.error("Failed to export tasks");
    } finally {
      setExportingCsv(false);
    }
  };

  const handleExportJson = async () => {
    setExportingJson(true);
    try {
      const date = new Date().toISOString().split("T")[0];
      await downloadFile("/export/database", `gtms-export-${date}.json`);
      toast.success("Database exported successfully");
    } catch (err: any) {
      toast.error("Failed to export database");
    } finally {
      setExportingJson(false);
    }
  };

  const handleCopyDbUrl = () => {
    navigator.clipboard.writeText(dbUrl);
    setCopied(true);
    toast.success("Database URL copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTogglePreference = (field: string, value: boolean) => {
    updatePreferences.mutate({ [field]: value });
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    updatePreferences.mutate({ theme: newTheme });
  };

  const handleQuietHoursChange = (field: "quietHoursStart" | "quietHoursEnd", value: string) => {
    updatePreferences.mutate({ [field]: value || null });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Your account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Name</span>
                  <p className="font-medium">{user?.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Email</span>
                  <p className="font-medium">{user?.email}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Role</span>
                  <p className="font-medium">{user?.role}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Department</span>
                  <p className="font-medium">{user?.department?.name || "No Department"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Download className="h-5 w-5" /> Export</CardTitle>
              <CardDescription>Download your data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button variant="outline" onClick={handleExportCsv} disabled={exportingCsv}>
                  <Download className="h-4 w-4 mr-2" />
                  {exportingCsv ? "Exporting..." : "Export Tasks (CSV)"}
                </Button>
                {isED && (
                  <Button variant="outline" onClick={handleExportJson} disabled={exportingJson}>
                    <Download className="h-4 w-4 mr-2" />
                    {exportingJson ? "Exporting..." : "Export Database (JSON)"}
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                CSV export includes only tasks you have access to. {isED ? "JSON export includes all database tables." : ""}
              </p>
            </CardContent>
          </Card>

          {isED && dbUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" /> Database Access</CardTitle>
                <CardDescription>Direct PostgreSQL connection</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Input readOnly value={dbUrl} className="font-mono text-xs" />
                  <Button size="icon" variant="outline" onClick={handleCopyDbUrl}>
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use a PostgreSQL client (pgAdmin, DBeaver, psql) to connect directly to the database.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>Choose which emails you receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {prefsLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Daily Digest</p>
                      <p className="text-xs text-muted-foreground">Summary of overdue, due today, and critical tasks</p>
                    </div>
                    <Switch
                      checked={preferences?.emailDigestEnabled ?? true}
                      onCheckedChange={(checked) => handleTogglePreference("emailDigestEnabled", checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Task Reminders</p>
                      <p className="text-xs text-muted-foreground">Reminders for tasks due within 3 days</p>
                    </div>
                    <Switch
                      checked={preferences?.emailRemindersEnabled ?? true}
                      onCheckedChange={(checked) => handleTogglePreference("emailRemindersEnabled", checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Overdue Alerts</p>
                      <p className="text-xs text-muted-foreground">Escalating alerts when tasks pass their due date</p>
                    </div>
                    <Switch
                      checked={preferences?.emailOverdueAlertsEnabled ?? true}
                      onCheckedChange={(checked) => handleTogglePreference("emailOverdueAlertsEnabled", checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Blocker Alerts</p>
                      <p className="text-xs text-muted-foreground">Notifications when tasks are blocked</p>
                    </div>
                    <Switch
                      checked={preferences?.emailBlockerAlertsEnabled ?? true}
                      onCheckedChange={(checked) => handleTogglePreference("emailBlockerAlertsEnabled", checked)}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quiet Hours</CardTitle>
              <CardDescription>No email notifications during these hours (Malaysia Time)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">From</label>
                  <Input
                    type="time"
                    value={preferences?.quietHoursStart || ""}
                    onChange={(e) => handleQuietHoursChange("quietHoursStart", e.target.value)}
                    className="w-32"
                  />
                </div>
                <span className="text-muted-foreground mt-5">to</span>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Until</label>
                  <Input
                    type="time"
                    value={preferences?.quietHoursEnd || ""}
                    onChange={(e) => handleQuietHoursChange("quietHoursEnd", e.target.value)}
                    className="w-32"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Leave empty to receive notifications at any time.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Theme</CardTitle>
              <CardDescription>Select your preferred appearance</CardDescription>
            </CardHeader>
            <CardContent>
              {mounted ? (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: "light", label: "Light", icon: Sun },
                    { value: "dark", label: "Dark", icon: Moon },
                    { value: "system", label: "System", icon: Monitor },
                  ].map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => handleThemeChange(value)}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors hover:bg-accent",
                        theme === value ? "border-primary bg-accent" : "border-border"
                      )}
                    >
                      <Icon className="h-6 w-6" />
                      <span className="text-sm font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
