import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  "Not Started": "bg-gray-100 text-gray-800 border-gray-200",
  "In Progress": "bg-blue-100 text-blue-800 border-blue-200",
  "Waiting On": "bg-yellow-100 text-yellow-800 border-yellow-200",
  Blocked: "bg-red-100 text-red-800 border-red-200",
  Done: "bg-green-100 text-green-800 border-green-200",
  Cancelled: "bg-gray-100 text-gray-500 border-gray-200",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", statusColors[status] || "bg-gray-100 text-gray-800")}>
      {status}
    </span>
  );
}
