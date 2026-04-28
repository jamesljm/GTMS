"use client";

import { useState, useEffect } from "react";
import { useDepartmentCharts } from "@/hooks/use-dashboard";
import { useDepartments } from "@/hooks/use-departments";
import { useWorkstreams } from "@/hooks/use-workstreams";
import { useAuthStore } from "@/store/auth-store";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const STATUS_COLORS: Record<string, string> = {
  "Not Started": "#94a3b8",
  "In Progress": "#3b82f6",
  "Waiting On": "#eab308",
  Blocked: "#ef4444",
  Done: "#22c55e",
  Cancelled: "#6b7280",
};

const STATUSES = Object.keys(STATUS_COLORS);

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

  // Filter workstreams for the selected department
  const deptWorkstreams = allWorkstreams?.filter(
    (ws: any) => !departmentId || ws.departmentId === departmentId
  ) || [];

  const chartLeftMargin = isMobile ? 0 : 0;
  const yAxisWidth = isMobile ? 50 : 80;
  const verticalChartLeftMargin = isMobile ? 10 : 80;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <h1 className="text-xl sm:text-2xl font-bold">Department Dashboard</h1>
        <select
          className="border rounded-md px-3 py-1.5 text-sm bg-background w-full sm:w-auto"
          value={departmentId || ""}
          onChange={(e) => {
            setDepartmentId(e.target.value || undefined);
            setWorkstreamId(undefined);
          }}
        >
          <option value="">All Departments</option>
          {departments?.map((d: any) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}

      {data && (
        <div className="space-y-8">
          {/* Chart 1: Tasks by Workstream */}
          <div className="border rounded-lg p-3 sm:p-4">
            <h2 className="text-base sm:text-lg font-semibold mb-4">Tasks by Workstream</h2>
            {data.byWorkstream.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No workstream data</p>
            ) : (
              <div className="overflow-x-auto">
                <ResponsiveContainer width="100%" height={350} minWidth={isMobile ? 400 : undefined}>
                  <BarChart data={data.byWorkstream} margin={{ top: 10, right: 10, left: chartLeftMargin, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: isMobile ? 10 : 12 }} interval={0} angle={isMobile ? -45 : 0} textAnchor={isMobile ? "end" : "middle"} height={isMobile ? 60 : 30} />
                    <YAxis allowDecimals={false} tick={{ fontSize: isMobile ? 10 : 12 }} />
                    <Tooltip />
                    <Legend />
                    {STATUSES.map((status) => (
                      <Bar key={status} dataKey={status} stackId="a" fill={STATUS_COLORS[status]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Chart 2: Tasks by Member */}
          <div className="border rounded-lg p-3 sm:p-4">
            <h2 className="text-base sm:text-lg font-semibold mb-4">Tasks by Member</h2>
            {data.byMember.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No member data</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(350, data.byMember.length * 40)}>
                <BarChart data={data.byMember} layout="vertical" margin={{ top: 10, right: 10, left: verticalChartLeftMargin, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: isMobile ? 10 : 12 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: isMobile ? 10 : 12 }} width={yAxisWidth} />
                  <Tooltip />
                  <Legend />
                  {STATUSES.map((status) => (
                    <Bar key={status} dataKey={status} stackId="a" fill={STATUS_COLORS[status]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Chart 3: Tasks by Member in Workstream */}
          <div className="border rounded-lg p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4">
              <h2 className="text-base sm:text-lg font-semibold">Tasks by Member in Workstream</h2>
              <select
                className="border rounded-md px-3 py-1.5 text-sm bg-background w-full sm:w-auto"
                value={workstreamId || ""}
                onChange={(e) => setWorkstreamId(e.target.value || undefined)}
              >
                <option value="">Select a workstream...</option>
                {deptWorkstreams.map((ws: any) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.code} - {ws.name}
                  </option>
                ))}
              </select>
            </div>
            {!workstreamId ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Select a workstream to see member breakdown
              </p>
            ) : data.byWorkstreamMember.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No tasks in this workstream</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(300, data.byWorkstreamMember.length * 40)}>
                <BarChart data={data.byWorkstreamMember} layout="vertical" margin={{ top: 10, right: 10, left: verticalChartLeftMargin, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: isMobile ? 10 : 12 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: isMobile ? 10 : 12 }} width={yAxisWidth} />
                  <Tooltip />
                  <Legend />
                  {STATUSES.map((status) => (
                    <Bar key={status} dataKey={status} stackId="a" fill={STATUS_COLORS[status]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
