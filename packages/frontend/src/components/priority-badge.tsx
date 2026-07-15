import { cn } from "@/lib/utils";

const priorityColors: Record<string, string> = {
  Critical: "bg-red-100 text-red-800 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30",
  High: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/30",
  Medium: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30",
  Low: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-500/15 dark:text-gray-300 dark:border-gray-500/30",
};

export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", priorityColors[priority] || "bg-gray-100 text-gray-800 dark:bg-gray-500/15 dark:text-gray-300")}>
      {priority}
    </span>
  );
}
