import { cn } from "@/lib/utils";

const priorityColors: Record<string, string> = {
  Critical: "bg-red-100 text-red-800 border-red-200",
  High: "bg-orange-100 text-orange-800 border-orange-200",
  Medium: "bg-blue-100 text-blue-800 border-blue-200",
  Low: "bg-gray-100 text-gray-800 border-gray-200",
};

export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", priorityColors[priority] || "bg-gray-100 text-gray-800")}>
      {priority}
    </span>
  );
}
