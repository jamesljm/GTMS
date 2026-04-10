import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Plus, Edit, Search, MessageSquare, RefreshCw, ExternalLink } from "lucide-react";
import Link from "next/link";

const toolIcons: Record<string, any> = {
  create_task: Plus,
  update_task: Edit,
  query_tasks: Search,
  add_note: MessageSquare,
  create_subtask: Plus,
  bulk_update: RefreshCw,
};

export function ChatActionCard({ action }: { action: any }) {
  const Icon = toolIcons[action.tool] || CheckCircle;
  const taskId = action.result?.task?.id || action.result?.subtask?.id || action.result?.taskId;
  const taskTitle = action.result?.task?.title || action.result?.subtask?.title;

  const content = (
    <Card className="bg-green-50 border-green-200">
      <CardContent className="p-3 flex items-start gap-2">
        <Icon className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
        <div className="text-sm flex-1 min-w-0">
          <span className="font-medium text-green-800">
            {action.tool === "create_task" && "Task created"}
            {action.tool === "update_task" && "Task updated"}
            {action.tool === "query_tasks" && `Found ${action.result?.count || 0} tasks`}
            {action.tool === "add_note" && "Note added"}
            {action.tool === "create_subtask" && "Subtask created"}
            {action.tool === "bulk_update" && `Updated ${action.result?.count || 0} tasks`}
          </span>
          {taskTitle && (
            <p className="text-green-700 mt-0.5">
              {taskId && <span className="font-mono text-[10px] text-green-600 mr-1">{taskId.slice(0, 6)}</span>}
              {taskTitle}
            </p>
          )}
          {/* Query results — show tasks as clickable list */}
          {action.tool === "query_tasks" && action.result?.tasks?.length > 0 && (
            <div className="mt-1.5 space-y-0.5">
              {action.result.tasks.slice(0, 5).map((t: any) => (
                <Link
                  key={t.id}
                  href={`/tasks?task=${t.id}`}
                  className="flex items-center gap-1 text-xs text-green-700 hover:text-green-900 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="font-mono text-[10px] text-green-600">{t.id.slice(0, 6)}</span>
                  <span className="truncate">{t.title}</span>
                  <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-50" />
                </Link>
              ))}
              {action.result.tasks.length > 5 && (
                <span className="text-[10px] text-green-600">+{action.result.tasks.length - 5} more</span>
              )}
            </div>
          )}
        </div>
        {taskId && action.tool !== "query_tasks" && (
          <ExternalLink className="h-3 w-3 text-green-500 shrink-0 mt-1" />
        )}
      </CardContent>
    </Card>
  );

  // Wrap single-task actions in a link
  if (taskId && action.tool !== "query_tasks") {
    return (
      <Link href={`/tasks?task=${taskId}`} onClick={(e) => e.stopPropagation()}>
        {content}
      </Link>
    );
  }

  return content;
}
