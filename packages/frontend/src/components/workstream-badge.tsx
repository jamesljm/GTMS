export function WorkstreamBadge({ code, name, color }: { code: string; name?: string; color?: string }) {
  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium text-white"
      style={{ backgroundColor: color || "#6366f1" }}
    >
      {code}
      {name && <span className="ml-1 hidden sm:inline">{name}</span>}
    </span>
  );
}
