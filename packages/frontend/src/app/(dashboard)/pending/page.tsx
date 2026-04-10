"use client";

import { useState } from "react";
import { usePendingReview, useAcceptTask, useRequestChanges, useReproposeTask, useRejectProposal, useTaskProposals } from "@/hooks/use-tasks";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Check, MessageSquareMore, ArrowLeftRight, Clock, ChevronDown, ChevronUp, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

function ProposalHistory({ taskId }: { taskId: string }) {
  const { data: proposals, isLoading } = useTaskProposals(taskId);
  const [expanded, setExpanded] = useState(false);

  if (isLoading || !proposals?.length) return null;

  return (
    <div className="mt-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        Negotiation History ({proposals.length})
      </button>
      {expanded && (
        <div className="mt-2 space-y-2 border-l-2 border-muted pl-3">
          {proposals.map((p: any) => (
            <div key={p.id} className="text-xs">
              <div className="flex items-center gap-1.5">
                <span className="font-medium">{p.proposer?.name}</span>
                <Badge variant="outline" className="text-[10px] py-0 h-4">
                  {p.action.replace("_", " ")}
                </Badge>
                <span className="text-muted-foreground">
                  {format(new Date(p.createdAt), "dd MMM HH:mm")}
                </span>
              </div>
              {p.comment && <p className="text-muted-foreground mt-0.5">{p.comment}</p>}
              {p.proposedTitle && <p className="mt-0.5">Title: {p.proposedTitle}</p>}
              {p.proposedDescription && <p className="mt-0.5 text-muted-foreground">Desc: {p.proposedDescription}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TaskActionCard({ task, role }: { task: any; role: "assignee" | "initiator" }) {
  const acceptTask = useAcceptTask();
  const requestChanges = useRequestChanges();
  const reproposeTask = useReproposeTask();
  const rejectProposal = useRejectProposal();
  const [showChangesForm, setShowChangesForm] = useState(false);
  const [showReproposeForm, setShowReproposeForm] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [comment, setComment] = useState("");
  const [rejectComment, setRejectComment] = useState("");
  const [proposedTitle, setProposedTitle] = useState(task.title || "");
  const [proposedDescription, setProposedDescription] = useState(task.description || "");

  const handleAccept = () => acceptTask.mutate(task.id);
  const handleRequestChanges = () => {
    if (!comment.trim()) return;
    requestChanges.mutate({ id: task.id, comment });
    setComment("");
    setShowChangesForm(false);
  };
  const handleRepropose = () => {
    reproposeTask.mutate({
      id: task.id,
      proposedTitle: proposedTitle !== task.title ? proposedTitle : undefined,
      proposedDescription: proposedDescription !== (task.description || "") ? proposedDescription : undefined,
      comment: comment || undefined,
    });
    setComment("");
    setShowReproposeForm(false);
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium">{task.title}</h3>
            {task.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted-foreground">
              {role === "assignee" ? (
                <span>From: {task.createdBy?.name}</span>
              ) : (
                <span>Assigned to: {task.assignee?.name}</span>
              )}
              {task.dueDate && (
                <span>Due: {format(new Date(task.dueDate), "dd MMM yyyy")}</span>
              )}
              <Badge variant="outline" className={cn(
                "text-[10px]",
                task.acceptanceStatus === "Pending" && "bg-gray-100 text-gray-600",
                task.acceptanceStatus === "Changes Requested" && "bg-amber-100 text-amber-700",
                task.acceptanceStatus === "Reproposed" && "bg-violet-100 text-violet-700",
              )}>
                {task.acceptanceStatus}
              </Badge>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 mt-3">
          {role === "assignee" && task.acceptanceStatus === "Pending" && (
            <>
              <Button size="sm" className="h-7 text-xs" onClick={handleAccept} disabled={acceptTask.isPending}>
                <Check className="h-3 w-3 mr-1" /> Accept
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setShowChangesForm(!showChangesForm); setShowReproposeForm(false); }}>
                <MessageSquareMore className="h-3 w-3 mr-1" /> Request Changes
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setShowReproposeForm(!showReproposeForm); setShowChangesForm(false); }}>
                <ArrowLeftRight className="h-3 w-3 mr-1" /> Counter-Propose
              </Button>
            </>
          )}
          {role === "initiator" && task.acceptanceStatus === "Reproposed" && (
            <>
              <Button size="sm" className="h-7 text-xs" onClick={handleAccept} disabled={acceptTask.isPending}>
                <Check className="h-3 w-3 mr-1" /> Accept Proposal
              </Button>
              <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => { setShowRejectForm(!showRejectForm); setShowReproposeForm(false); }}>
                <XCircle className="h-3 w-3 mr-1" /> Reject & Revert
              </Button>
            </>
          )}
          {role === "initiator" && task.acceptanceStatus === "Changes Requested" && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setShowReproposeForm(!showReproposeForm); }}>
              <ArrowLeftRight className="h-3 w-3 mr-1" /> Re-Propose
            </Button>
          )}
        </div>

        {/* Request Changes form */}
        {showChangesForm && (
          <div className="mt-3 space-y-2">
            <Textarea
              placeholder="Explain what needs to change..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              className="text-sm"
            />
            <div className="flex gap-2">
              <Button size="sm" className="h-7 text-xs" onClick={handleRequestChanges} disabled={!comment.trim() || requestChanges.isPending}>
                Submit
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowChangesForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Repropose form */}
        {showReproposeForm && (
          <div className="mt-3 space-y-2">
            <Input
              placeholder="Proposed title"
              value={proposedTitle}
              onChange={(e) => setProposedTitle(e.target.value)}
              className="h-8 text-sm"
            />
            <Textarea
              placeholder="Proposed description"
              value={proposedDescription}
              onChange={(e) => setProposedDescription(e.target.value)}
              rows={2}
              className="text-sm"
            />
            <Textarea
              placeholder="Optional comment..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={1}
              className="text-sm"
            />
            <div className="flex gap-2">
              <Button size="sm" className="h-7 text-xs" onClick={handleRepropose} disabled={reproposeTask.isPending}>
                Send Proposal
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowReproposeForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Reject proposal form */}
        {showRejectForm && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-muted-foreground">This will revert the task to its original version and resend it to the assignee.</p>
            <Textarea
              placeholder="Optional reason for rejection..."
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              rows={2}
              className="text-sm"
            />
            <div className="flex gap-2">
              <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => { rejectProposal.mutate({ id: task.id, comment: rejectComment || undefined }); setRejectComment(""); setShowRejectForm(false); }} disabled={rejectProposal.isPending}>
                Confirm Reject
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowRejectForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        <ProposalHistory taskId={task.id} />
      </CardContent>
    </Card>
  );
}

export default function PendingReviewPage() {
  const { data, isLoading } = usePendingReview();

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const asAssignee = data?.asAssignee || [];
  const asInitiator = data?.asInitiator || [];
  const total = asAssignee.length + asInitiator.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pending Review</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {total === 0 ? "No tasks need your attention" : `${total} task${total !== 1 ? "s" : ""} need${total === 1 ? "s" : ""} your attention`}
        </p>
      </div>

      {asAssignee.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-amber-500" />
            Action Required ({asAssignee.length})
          </h2>
          <p className="text-xs text-muted-foreground mb-3">Tasks assigned to you awaiting your response</p>
          <div className="space-y-3">
            {asAssignee.map((task: any) => (
              <TaskActionCard key={task.id} task={task} role="assignee" />
            ))}
          </div>
        </div>
      )}

      {asInitiator.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
            <MessageSquareMore className="h-4 w-4 text-violet-500" />
            Awaiting Response ({asInitiator.length})
          </h2>
          <p className="text-xs text-muted-foreground mb-3">Tasks you created that need your review</p>
          <div className="space-y-3">
            {asInitiator.map((task: any) => (
              <TaskActionCard key={task.id} task={task} role="initiator" />
            ))}
          </div>
        </div>
      )}

      {total === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Check className="h-12 w-12 mx-auto mb-3 text-green-500" />
          <p className="text-lg font-medium">All caught up!</p>
          <p className="text-sm">No tasks require your review.</p>
        </div>
      )}
    </div>
  );
}
