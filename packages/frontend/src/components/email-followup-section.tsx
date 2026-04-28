"use client";

import { useState } from "react";
import {
  useEmailFollowUps,
  useCreateEmailFollowUp,
  useUpdateEmailFollowUp,
  useDeleteEmailFollowUp,
  useSendFollowUpNow,
} from "@/hooks/use-email-followups";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RecurrencePicker, RecurrenceData } from "@/components/recurrence-picker";
import {
  Plus,
  Send,
  Trash2,
  Pencil,
  X,
  Check,
  Mail,
  Clock,
  Repeat,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface EmailFollowUpSectionProps {
  taskId: string;
  canEdit: boolean;
}

interface FollowUpForm {
  recipientEmails: string;
  subject: string;
  body: string;
  scheduleType: "once" | "recurring";
  sendAt: string;
  recurrence: RecurrenceData;
}

const emptyForm: FollowUpForm = {
  recipientEmails: "",
  subject: "",
  body: "",
  scheduleType: "once",
  sendAt: "",
  recurrence: {
    recurrenceType: null,
    recurrenceInterval: 1,
    recurrenceDays: null,
    recurrenceStartDate: null,
    recurrenceEndDate: null,
    recurrenceCount: null,
  },
};

function formatScheduleDescription(fu: any): string {
  if (fu.recurrenceType) {
    const interval = fu.recurrenceInterval || 1;
    const typeLabels: Record<string, [string, string]> = {
      daily: ["day", "days"],
      weekly: ["week", "weeks"],
      biweekly: ["2 weeks", "2-week periods"],
      monthly: ["month", "months"],
      quarterly: ["quarter", "quarters"],
      yearly: ["year", "years"],
    };
    const [singular, plural] = typeLabels[fu.recurrenceType] || [fu.recurrenceType, fu.recurrenceType];
    let desc = interval === 1 ? `Every ${singular}` : `Every ${interval} ${plural}`;

    if (fu.recurrenceDays && (fu.recurrenceType === "weekly" || fu.recurrenceType === "biweekly")) {
      try {
        const days = JSON.parse(fu.recurrenceDays);
        if (Array.isArray(days) && days.length > 0) {
          desc += ` on ${days.join(", ")}`;
        }
      } catch {}
    }

    return desc;
  }

  if (fu.sendAt) {
    return `Once: ${format(new Date(fu.sendAt), "dd MMM yyyy HH:mm")}`;
  }

  return "No schedule set";
}

export function EmailFollowUpSection({ taskId, canEdit }: EmailFollowUpSectionProps) {
  const { data: followUps, isLoading } = useEmailFollowUps(taskId);
  const createFollowUp = useCreateEmailFollowUp();
  const updateFollowUp = useUpdateEmailFollowUp();
  const deleteFollowUp = useDeleteEmailFollowUp();
  const sendNow = useSendFollowUpNow();
  const { user: currentUser } = useAuthStore();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FollowUpForm>(emptyForm);

  const hasMicrosoftId = !!(currentUser as any)?.microsoftId;

  const openAddForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openEditForm = (fu: any) => {
    const recipients: string[] = (() => {
      try { return JSON.parse(fu.recipientEmails); } catch { return []; }
    })();

    setForm({
      recipientEmails: recipients.join(", "),
      subject: fu.subject,
      body: fu.body,
      scheduleType: fu.recurrenceType ? "recurring" : "once",
      sendAt: fu.sendAt ? format(new Date(fu.sendAt), "yyyy-MM-dd'T'HH:mm") : "",
      recurrence: {
        recurrenceType: fu.recurrenceType || null,
        recurrenceInterval: fu.recurrenceInterval || 1,
        recurrenceDays: fu.recurrenceDays || null,
        recurrenceStartDate: null,
        recurrenceEndDate: fu.recurrenceEndDate ? format(new Date(fu.recurrenceEndDate), "yyyy-MM-dd") : null,
        recurrenceCount: fu.recurrenceCount || null,
      },
    });
    setEditingId(fu.id);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const parseRecipients = (input: string): string[] => {
    return input
      .split(/[,;\n]+/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0);
  };

  const handleSubmit = () => {
    const recipients = parseRecipients(form.recipientEmails);
    if (recipients.length === 0) return;

    const data: Record<string, any> = {
      recipientEmails: recipients,
      subject: form.subject,
      body: form.body,
    };

    if (form.scheduleType === "recurring" && form.recurrence.recurrenceType) {
      data.recurrenceType = form.recurrence.recurrenceType;
      data.recurrenceInterval = form.recurrence.recurrenceInterval;
      if (form.recurrence.recurrenceDays) data.recurrenceDays = form.recurrence.recurrenceDays;
      if (form.recurrence.recurrenceEndDate) data.recurrenceEndDate = form.recurrence.recurrenceEndDate;
      if (form.recurrence.recurrenceCount) data.recurrenceCount = form.recurrence.recurrenceCount;
      if (form.sendAt) data.sendAt = form.sendAt;
    } else if (form.scheduleType === "once" && form.sendAt) {
      data.sendAt = form.sendAt;
    }

    if (editingId) {
      updateFollowUp.mutate(
        { taskId, id: editingId, data },
        { onSuccess: closeForm }
      );
    } else {
      createFollowUp.mutate({ taskId, data }, { onSuccess: closeForm });
    }
  };

  const handleDelete = (id: string) => {
    deleteFollowUp.mutate({ taskId, id });
  };

  const handleSendNow = (id: string) => {
    sendNow.mutate({ taskId, id });
  };

  const handleToggleActive = (fu: any) => {
    updateFollowUp.mutate({
      taskId,
      id: fu.id,
      data: { isActive: !fu.isActive },
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium">
          Email Follow-ups{" "}
          {followUps?.length > 0 && (
            <span className="text-muted-foreground">({followUps.length})</span>
          )}
        </h3>
        {canEdit && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={openAddForm}
            disabled={!hasMicrosoftId}
            title={
              !hasMicrosoftId
                ? "Your account must be linked to Microsoft 365 to create email follow-ups"
                : undefined
            }
          >
            <Plus className="h-3 w-3 mr-1" /> Add
          </Button>
        )}
      </div>

      {!hasMicrosoftId && canEdit && (
        <p className="text-xs text-muted-foreground mb-2">
          Your account is not linked to Microsoft 365. Link your account to send follow-up emails.
        </p>
      )}

      {/* Follow-up list */}
      {followUps?.length > 0 && (
        <div className="space-y-2 mb-3">
          {followUps.map((fu: any) => {
            const recipients: string[] = (() => {
              try { return JSON.parse(fu.recipientEmails); } catch { return []; }
            })();
            const lastLog = fu.sendLogs?.[0];
            const isOwner = fu.senderId === currentUser?.id;
            const isAdmin = currentUser?.role === "ED" || currentUser?.role === "SUPER_ADMIN";

            return (
              <div key={fu.id} className="border rounded-md p-2.5 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium truncate">
                        {fu.subject}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] py-0 h-4",
                          fu.isActive
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-gray-50 text-gray-500 border-gray-200"
                        )}
                      >
                        {fu.isActive ? "Active" : "Paused"}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {recipients.slice(0, 3).map((email, i) => (
                        <Badge
                          key={i}
                          variant="secondary"
                          className="text-[10px] py-0 h-4 font-normal"
                        >
                          {email}
                        </Badge>
                      ))}
                      {recipients.length > 3 && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] py-0 h-4 font-normal"
                        >
                          +{recipients.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                  {(isOwner || isAdmin) && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => handleSendNow(fu.id)}
                        disabled={sendNow.isPending}
                        title="Send now"
                      >
                        <Send className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => openEditForm(fu)}
                        title="Edit"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => handleDelete(fu.id)}
                        disabled={deleteFollowUp.isPending}
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    {fu.recurrenceType ? (
                      <Repeat className="h-3 w-3" />
                    ) : (
                      <Clock className="h-3 w-3" />
                    )}
                    {formatScheduleDescription(fu)}
                  </span>
                  {fu.sendCount > 0 && (
                    <span>Sent {fu.sendCount}x</span>
                  )}
                  {lastLog && (
                    <span>
                      Last:{" "}
                      {format(new Date(lastLog.sentAt), "dd MMM HH:mm")}
                      {lastLog.status === "failed" && (
                        <span className="text-destructive ml-1">(failed)</span>
                      )}
                    </span>
                  )}
                </div>
                {(isOwner || isAdmin) && (
                  <button
                    onClick={() => handleToggleActive(fu)}
                    className="text-[11px] text-primary hover:underline"
                  >
                    {fu.isActive ? "Pause" : "Resume"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit form */}
      {showForm && (
        <div className="border rounded-md p-3 space-y-3 bg-muted/20">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {editingId ? "Edit Follow-up" : "New Follow-up"}
            </span>
            <button onClick={closeForm}>
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Recipients (comma-separated)
            </label>
            <Input
              value={form.recipientEmails}
              onChange={(e) =>
                setForm((p) => ({ ...p, recipientEmails: e.target.value }))
              }
              placeholder="alice@example.com, bob@example.com"
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Subject
            </label>
            <Input
              value={form.subject}
              onChange={(e) =>
                setForm((p) => ({ ...p, subject: e.target.value }))
              }
              placeholder="Follow-up: Task reminder"
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Body (HTML)
            </label>
            <Textarea
              value={form.body}
              onChange={(e) =>
                setForm((p) => ({ ...p, body: e.target.value }))
              }
              placeholder="Email body content..."
              rows={4}
              className="text-sm"
            />
          </div>

          {/* Schedule type */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Schedule
            </label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={
                  form.scheduleType === "once" ? "default" : "outline"
                }
                className="h-7 text-xs"
                onClick={() =>
                  setForm((p) => ({
                    ...p,
                    scheduleType: "once",
                    recurrence: {
                      ...p.recurrence,
                      recurrenceType: null,
                    },
                  }))
                }
              >
                <Clock className="h-3 w-3 mr-1" /> Send once
              </Button>
              <Button
                type="button"
                size="sm"
                variant={
                  form.scheduleType === "recurring" ? "default" : "outline"
                }
                className="h-7 text-xs"
                onClick={() =>
                  setForm((p) => ({
                    ...p,
                    scheduleType: "recurring",
                    recurrence: {
                      ...p.recurrence,
                      recurrenceType: p.recurrence.recurrenceType || "weekly",
                    },
                  }))
                }
              >
                <Repeat className="h-3 w-3 mr-1" /> Recurring
              </Button>
            </div>
          </div>

          {form.scheduleType === "once" && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Send at
              </label>
              <Input
                type="datetime-local"
                value={form.sendAt}
                onChange={(e) =>
                  setForm((p) => ({ ...p, sendAt: e.target.value }))
                }
                className="h-8 text-sm w-60"
              />
            </div>
          )}

          {form.scheduleType === "recurring" && (
            <RecurrencePicker
              value={form.recurrence}
              onChange={(r) => setForm((p) => ({ ...p, recurrence: r }))}
            />
          )}

          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={handleSubmit}
              disabled={
                !form.subject.trim() ||
                !form.body.trim() ||
                parseRecipients(form.recipientEmails).length === 0 ||
                createFollowUp.isPending ||
                updateFollowUp.isPending
              }
            >
              <Check className="h-3 w-3 mr-1" />{" "}
              {editingId ? "Save" : "Create"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={closeForm}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
