import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  "Not Started": "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-500/15 dark:text-gray-300 dark:border-gray-500/30",
  "In Progress": "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30",
  "Waiting On": "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-500/15 dark:text-yellow-300 dark:border-yellow-500/30",
  Blocked: "bg-red-100 text-red-800 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30",
  Done: "bg-green-100 text-green-800 border-green-200 dark:bg-green-500/15 dark:text-green-300 dark:border-green-500/30",
  Cancelled: "bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-500/15 dark:text-gray-400 dark:border-gray-500/30",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", statusColors[status] || "bg-gray-100 text-gray-800 dark:bg-gray-500/15 dark:text-gray-300")}>
      {status}
    </span>
  );
}
