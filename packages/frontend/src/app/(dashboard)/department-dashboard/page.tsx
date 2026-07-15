"use client";

import { useState, useEffect } from "react";
import { useDepartmentCharts } from "@/hooks/use-dashboard";
import { useDepartments } from "@/hooks/use-departments";
import { useWorkstreams } from "@/hooks/use-workstreams";
import { useAuthStore } from "@/store/auth-store";
import { BarChart3 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Cohesive, slightly desaturated palette that reads well on both dark and light
const STATUS_COLORS: Record<string, string> = {
  "Not Started": "#8b93a7", // cool gray
  "In Progress": "#4f8cf5", // blue
  "Waiting On": "#f5b13d",  // amber
  Blocked: "#ef5f6b",       // soft red
  Done: "#2fbf87",          // emerald
  Cancelled: "#5b6472",     // muted slate
};

const STATUSES = Object.keys(STATUS_COLORS);

// Neutral chart chrome colors that work in either theme (no CSS vars — SVG attrs can't resolve them)
const GRID = "rgba(148,163,184,0.18)";
const AXIS_TICK = "#94a3b8";
const CURSOR = "rgba(148,163,184,0.12)";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const items = payload.filter((p: any) => p.value > 0);
  const total = payload.reduce((s: number, p: any) => s + (p.value || 0), 0);
  if (total === 0) return null;
  return (
    <div className="min-w-[10rem] rounded-lg border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="mb-1.5 font-semibold text-popover-foreground">{label}</p>
      <div className="space-y-1">
        {items.map((p: any) => (
          <div key={p.dataKey} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: p.color }} />
            <span className="text-muted-foreground">{p.dataKey}</span>
            <span className="ml-auto font-medium tabular-nums text-foreground">{p.value}</span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between border-t pt-1.5">
        <span className="text-muted-foreground">Total</span>
        <span className="font-semibold tabular-nums text-foreground">{total}</span>
      </div>
    </div>
  );
}

function StatusLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {STATUSES.map((s) => (
        <div key={s} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: STATUS_COLORS[s] }} />
          {s}
        </div>
      ))}
    </div>
  );
}

function StatusBarChart({
  data,
  layout = "horizontal",
  height,
  isMobile,
  yAxisWidth,
}: {
  data: any[];
  layout?: "horizontal" | "vertical";
  height: number;
  isMobile: boolean;
  yAxisWidth: number;
}) {
  const fontSize = isMobile ? 10 : 12;
  const isVertical = layout === "vertical";

  return (
    <ResponsiveContainer width="100%" height={height} minWidth={!isVertical && isMobile ? 400 : undefined}>
      <BarChart
        data={data}
        layout={layout}
        margin={{ top: 8, right: 12, left: isVertical ? (isMobile ? 4 : 12) : 0, bottom: 4 }}
        barCategoryGap={isVertical ? "22%" : "28%"}
      >
        <CartesianGrid stroke={GRID} vertical={isVertical} horizontal={!isVertical} />
        {isVertical ? (
          <>
            <XAxis type="number" allowDecimals={false} tick={{ fontSize, fill: AXIS_TICK }} axisLine={{ stroke: GRID }} tickLine={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize, fill: AXIS_TICK }} width={yAxisWidth} axisLine={false} tickLine={false} />
          </>
        ) : (
          <>
            <XAxis
              dataKey="name"
              tick={{ fontSize, fill: AXIS_TICK }}
              interval={0}
              angle={isMobile ? -45 : 0}
              textAnchor={isMobile ? "end" : "middle"}
              height={isMobile ? 60 : 30}
              axisLine={{ stroke: GRID }}
              tickLine={false}
            />
            <YAxis allowDecimals={false} tick={{ fontSize, fill: AXIS_TICK }} axisLine={false} tickLine={false} />
          </>
        )}
        <Tooltip cursor={{ fill: CURSOR }} content={<ChartTooltip />} />
        {STATUSES.map((status, i) => (
          <Bar
            key={status}
            dataKey={status}
            stackId="a"
            fill={STATUS_COLORS[status]}
            radius={i === STATUSES.length - 1 ? (isVertical ? [0, 3, 3, 0] : [3, 3, 0, 0]) : undefined}
            maxBarSize={isVertical ? 26 : 64}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function DepartmentDashboardPage() {
  const { user } = useAuthStore();
  const { data: departments } = useDepartments();
  const { data: allWorkstreams } = useWorkstreams();
  const isMobile = useIsMobile();

  const isHodOrManager = user?.role === "HOD" || user?.role === "MANAGER";
  const defaultDeptId = isHodOrManager ? user?.departmentId : undefined;

  const [departmentId, setDepartmentId] = useState<string | undefined>(defaultDeptId);
  const [workstreamId, setWorkstreamId] = useState<string | undefined>(undefined);

  const { data, isLoading } = useDepartmentCharts(departmentId, workstreamId);

  const deptWorkstreams = allWorkstreams?.filter(
    (ws: any) => !departmentId || ws.departmentId === departmentId
  ) || [];

  const yAxisWidth = isMobile ? 60 : 110;

  const selectClass = "rounded-md border bg-card px-3 py-1.5 text-sm w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Department Charts</h1>
          <p className="text-sm text-muted-foreground">Task distribution by workstream and team member.</p>
        </div>
        <select
          className={selectClass}
          value={departmentId || ""}
          onChange={(e) => {
            setDepartmentId(e.target.value || undefined);
            setWorkstreamId(undefined);
          }}
        >
          <option value="">All Departments</option>
          {departments?.map((d: any) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      {/* Shared legend */}
      <div className="rounded-lg border bg-card px-4 py-3">
        <StatusLegend />
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}

      {data && (
        <div className="space-y-6">
          {/* Chart 1: Tasks by Workstream */}
          <div className="rounded-xl border bg-card p-4 sm:p-5">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold sm:text-lg">
              <span className="grid h-7 w-7 place-items-center rounded-md bg-blue-500/10 text-blue-500">
                <BarChart3 className="h-4 w-4" />
              </span>
              Tasks by Workstream
            </h2>
            {data.byWorkstream.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No workstream data</p>
            ) : (
              <div className="overflow-x-auto">
                <StatusBarChart data={data.byWorkstream} layout="horizontal" height={340} isMobile={isMobile} yAxisWidth={yAxisWidth} />
              </div>
            )}
          </div>

          {/* Chart 2: Tasks by Member */}
          <div className="rounded-xl border bg-card p-4 sm:p-5">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold sm:text-lg">
              <span className="grid h-7 w-7 place-items-center rounded-md bg-emerald-500/10 text-emerald-500">
                <BarChart3 className="h-4 w-4" />
              </span>
              Tasks by Member
            </h2>
            {data.byMember.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No member data</p>
            ) : (
              <StatusBarChart data={data.byMember} layout="vertical" height={Math.max(320, data.byMember.length * 42)} isMobile={isMobile} yAxisWidth={yAxisWidth} />
            )}
          </div>

          {/* Chart 3: Tasks by Member in Workstream */}
          <div className="rounded-xl border bg-card p-4 sm:p-5">
            <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center sm:gap-4">
              <h2 className="flex items-center gap-2 text-base font-semibold sm:text-lg">
                <span className="grid h-7 w-7 place-items-center rounded-md bg-violet-500/10 text-violet-500">
                  <BarChart3 className="h-4 w-4" />
                </span>
                Tasks by Member in Workstream
              </h2>
              <select
                className={selectClass}
                value={workstreamId || ""}
                onChange={(e) => setWorkstreamId(e.target.value || undefined)}
              >
                <option value="">Select a workstream...</option>
                {deptWorkstreams.map((ws: any) => (
                  <option key={ws.id} value={ws.id}>{ws.code} - {ws.name}</option>
                ))}
              </select>
            </div>
            {!workstreamId ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Select a workstream to see member breakdown</p>
            ) : data.byWorkstreamMember.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No tasks in this workstream</p>
            ) : (
              <StatusBarChart data={data.byWorkstreamMember} layout="vertical" height={Math.max(300, data.byWorkstreamMember.length * 42)} isMobile={isMobile} yAxisWidth={yAxisWidth} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
