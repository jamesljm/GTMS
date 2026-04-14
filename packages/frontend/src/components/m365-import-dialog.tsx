"use client";

import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useM365Users, useImportM365Users } from "@/hooks/use-workstreams";
import { Search, Users, Check, Copy, Loader2, AlertCircle, Link2, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ImportResult {
  email: string;
  displayName: string;
  action: "created" | "linked" | "already_linked" | "error";
  temporaryPassword?: string;
  error?: string;
}

interface ImportResponse {
  summary: { created: number; linked: number; alreadyLinked: number; errors: number; total: number };
  results: ImportResult[];
}

type DialogState = "browse" | "importing" | "results";

export function M365ImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: m365Users, refetch, isFetching, error } = useM365Users();
  const importMutation = useImportM365Users();

  const [state, setState] = useState<DialogState>("browse");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importResults, setImportResults] = useState<ImportResponse | null>(null);

  // Fetch users when dialog opens
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setState("browse");
      setSearch("");
      setSelected(new Set());
      setImportResults(null);
      refetch();
    }
    onOpenChange(nextOpen);
  };

  const filteredUsers = useMemo(() => {
    if (!m365Users) return [];
    if (!search) return m365Users;
    const q = search.toLowerCase();
    return m365Users.filter((u: any) =>
      u.displayName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.jobTitle && u.jobTitle.toLowerCase().includes(q)) ||
      (u.department && u.department.toLowerCase().includes(q))
    );
  }, [m365Users, search]);

  const importableUsers = useMemo(() => {
    if (!filteredUsers) return [];
    return filteredUsers.filter((u: any) => u.status !== "linked");
  }, [filteredUsers]);

  const toggleUser = (microsoftId: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(microsoftId)) next.delete(microsoftId);
      else next.add(microsoftId);
      return next;
    });
  };

  const selectAllNew = () => {
    const newIds = importableUsers
      .filter((u: any) => u.status === "new")
      .map((u: any) => u.microsoftId);
    setSelected(new Set(newIds));
  };

  const handleImport = async () => {
    if (selected.size === 0) return;
    const usersToImport = (m365Users || [])
      .filter((u: any) => selected.has(u.microsoftId))
      .map((u: any) => ({
        microsoftId: u.microsoftId,
        email: u.email,
        displayName: u.displayName,
        jobTitle: u.jobTitle || undefined,
        mobilePhone: u.mobilePhone || undefined,
      }));

    setState("importing");
    try {
      const result = await importMutation.mutateAsync({ users: usersToImport });
      setImportResults(result);
      setState("results");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Import failed");
      setState("browse");
    }
  };

  const copyPassword = (pw: string) => {
    navigator.clipboard.writeText(pw);
    toast.success("Copied to clipboard");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Import from Microsoft 365
          </DialogTitle>
          <DialogDescription>
            {state === "browse" && "Select users from your organization's Microsoft 365 directory to import into GTMS."}
            {state === "importing" && "Importing selected users..."}
            {state === "results" && "Import complete. See results below."}
          </DialogDescription>
        </DialogHeader>

        {/* Browse state */}
        {state === "browse" && (
          <>
            {error ? (
              <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
                <AlertCircle className="h-10 w-10 text-destructive" />
                <p className="text-sm text-destructive font-medium">Failed to fetch Microsoft 365 users</p>
                <p className="text-xs text-muted-foreground max-w-sm">
                  {(error as any)?.response?.data?.error || (error as Error).message}
                </p>
                <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
              </div>
            ) : isFetching ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Fetching users from Microsoft 365...</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, email, title, or department..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Button size="sm" variant="outline" onClick={selectAllNew}>
                    Select All New
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  {filteredUsers.length} users found &middot; {selected.size} selected
                </p>

                <ScrollArea className="h-[400px] border rounded-md">
                  <div className="divide-y">
                    {filteredUsers.map((u: any) => {
                      const isLinked = u.status === "linked";
                      const isUnlinked = u.status === "exists_unlinked";
                      const isChecked = selected.has(u.microsoftId);

                      return (
                        <div
                          key={u.microsoftId}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 transition-colors",
                            isLinked ? "opacity-50 cursor-default" : "cursor-pointer hover:bg-muted/50",
                            isChecked && !isLinked && "bg-primary/5"
                          )}
                          onClick={() => !isLinked && toggleUser(u.microsoftId)}
                        >
                          {/* Checkbox area */}
                          <div className={cn(
                            "h-4 w-4 rounded border flex items-center justify-center shrink-0",
                            isLinked ? "border-muted bg-muted" : isChecked ? "border-primary bg-primary" : "border-input"
                          )}>
                            {(isChecked || isLinked) && <Check className={cn("h-3 w-3", isLinked ? "text-muted-foreground" : "text-primary-foreground")} />}
                          </div>

                          {/* User info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{u.displayName}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {u.email}
                              {u.jobTitle && ` \u00B7 ${u.jobTitle}`}
                              {u.department && ` \u00B7 ${u.department}`}
                            </p>
                          </div>

                          {/* Status badge */}
                          {isLinked && (
                            <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100 shrink-0">
                              <Check className="h-3 w-3 mr-1" /> Imported
                            </Badge>
                          )}
                          {isUnlinked && (
                            <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-100 shrink-0">
                              <Link2 className="h-3 w-3 mr-1" /> Link M365
                            </Badge>
                          )}
                          {u.status === "new" && (
                            <Badge variant="outline" className="shrink-0">
                              <UserPlus className="h-3 w-3 mr-1" /> New
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                    {filteredUsers.length === 0 && (
                      <div className="py-8 text-center text-sm text-muted-foreground">
                        {search ? "No users match your search" : "No users found in Microsoft 365"}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button
                onClick={handleImport}
                disabled={selected.size === 0 || isFetching}
              >
                Import {selected.size > 0 ? `${selected.size} User${selected.size > 1 ? "s" : ""}` : "Selected"}
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Importing state */}
        {state === "importing" && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Importing {selected.size} user{selected.size > 1 ? "s" : ""}...</p>
          </div>
        )}

        {/* Results state */}
        {state === "results" && importResults && (
          <>
            {/* Summary */}
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="rounded-lg bg-green-50 p-3">
                <p className="text-2xl font-bold text-green-700">{importResults.summary.created}</p>
                <p className="text-xs text-green-600">Created</p>
              </div>
              <div className="rounded-lg bg-blue-50 p-3">
                <p className="text-2xl font-bold text-blue-700">{importResults.summary.linked}</p>
                <p className="text-xs text-blue-600">Linked</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-2xl font-bold text-gray-700">{importResults.summary.alreadyLinked}</p>
                <p className="text-xs text-gray-600">Already Linked</p>
              </div>
              <div className="rounded-lg bg-red-50 p-3">
                <p className="text-2xl font-bold text-red-700">{importResults.summary.errors}</p>
                <p className="text-xs text-red-600">Errors</p>
              </div>
            </div>

            {/* New users with passwords */}
            {importResults.results.some(r => r.action === "created") && (
              <div className="space-y-2">
                <p className="text-sm font-medium">New Users &mdash; Temporary Passwords</p>
                <p className="text-xs text-muted-foreground">Share these passwords securely. They won&apos;t be shown again.</p>
                <ScrollArea className="h-[200px] border rounded-md">
                  <div className="divide-y">
                    {importResults.results.filter(r => r.action === "created").map(r => (
                      <div key={r.email} className="flex items-center gap-3 px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{r.displayName}</p>
                          <p className="text-xs text-muted-foreground truncate">{r.email}</p>
                        </div>
                        <div className="flex items-center gap-1.5 bg-muted px-2 py-1 rounded">
                          <code className="text-xs font-mono">{r.temporaryPassword}</code>
                          <button
                            className="p-0.5 hover:text-primary"
                            onClick={() => copyPassword(r.temporaryPassword!)}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Errors */}
            {importResults.results.some(r => r.action === "error") && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-destructive">Errors</p>
                <div className="space-y-1">
                  {importResults.results.filter(r => r.action === "error").map(r => (
                    <p key={r.email} className="text-xs text-destructive">
                      {r.displayName} ({r.email}): {r.error}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
