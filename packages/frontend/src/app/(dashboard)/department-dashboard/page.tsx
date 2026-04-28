"use client";

import { useState } from "react";
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

export default function DepartmentDashboardPage() {
  const { user } = useAuthStore();
  const { data: departments } = useDepartments();
  const { data: allWorkstreams } = useWorkstreams();

  const isHodOrManager = user?.role === "HOD" || user?.role === "MANAGER";
  const defaultDeptId = isHodOrManager ? user?.departmentId : undefined;

  const [departmentId, setDepartmentId] = useState<string | undefined>(defaultDeptId);
  const [workstreamId, setWorkstreamId] = useState<string | undefined>(undefined);

  const { data, isLoading } = useDepartmentCharts(departmentId, workstreamId);

  // Filter workstreams for the selected department
  const deptWorkstreams = allWorkstreams?.filter(
    (ws: any) => !departmentId || ws.departmentId === departmentId
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold">Department Dashboard</h1>
        <select
          className="border rounded-md px-3 py-1.5 text-sm bg-background"
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
          <div className="border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-4">Tasks by Workstream</h2>
            {data.byWorkstream.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No workstream data</p>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={data.byWorkstream} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  {STATUSES.map((status) => (
                    <Bar key={status} dataKey={status} stackId="a" fill={STATUS_COLORS[status]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Chart 2: Tasks by Member */}
          <div className="border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-4">Tasks by Member</h2>
            {data.byMember.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No member data</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(350, data.byMember.length * 40)}>
                <BarChart data={data.byMember} layout="vertical" margin={{ top: 10, right: 30, left: 80, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={80} />
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
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
              <h2 className="text-lg font-semibold">Tasks by Member in Workstream</h2>
              <select
                className="border rounded-md px-3 py-1.5 text-sm bg-background"
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
                <BarChart data={data.byWorkstreamMember} layout="vertical" margin={{ top: 10, right: 30, left: 80, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={80} />
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
