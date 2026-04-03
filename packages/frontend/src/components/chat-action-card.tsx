import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Plus, Edit, Search, MessageSquare, RefreshCw } from "lucide-react";

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

  return (
    <Card className="bg-green-50 border-green-200">
      <CardContent className="p-3 flex items-start gap-2">
        <Icon className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
        <div className="text-sm">
          <span className="font-medium text-green-800">
            {action.tool === "create_task" && "Task created"}
            {action.tool === "update_task" && "Task updated"}
            {action.tool === "query_tasks" && `Found ${action.result?.count || 0} tasks`}
            {action.tool === "add_note" && "Note added"}
            {action.tool === "create_subtask" && "Subtask created"}
            {action.tool === "bulk_update" && `Updated ${action.result?.count || 0} tasks`}
          </span>
          {action.result?.task && (
            <p className="text-green-700 mt-0.5">{action.result.task.title}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
