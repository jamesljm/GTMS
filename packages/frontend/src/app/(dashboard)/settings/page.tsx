"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { downloadFile } from "@/lib/download";
import { toast } from "sonner";
import { Download, Database, Copy, Check } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuthStore();
  const isED = user?.role === "ED";
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingJson, setExportingJson] = useState(false);
  const [dbUrl, setDbUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isED) {
      api.get("/admin/db-url").then(r => setDbUrl(r.data.url)).catch(() => {});
    }
  }, [isED]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/change-password", { currentPassword, newPassword });
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Settings</h1>

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
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Current Password</label>
              <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">New Password</label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Confirm New Password</label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Changing..." : "Change Password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Export - visible to all, scoped by RBAC */}
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

      {/* Database Access - ED only */}
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
    </div>
  );
}
