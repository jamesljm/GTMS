"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  BookOpen, ShieldCheck, Users, Eye, Pencil, HelpCircle, LayoutDashboard,
  ListTodo, Bell, Mail, Repeat, MessageSquare, Layers, Building2,
  Activity, Settings, Paperclip, ArrowLeftRight, Search, BarChart3,
  AlertTriangle, Clock, CheckCircle2, XCircle, ChevronDown, ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "overview", label: "Overview", icon: BookOpen },
  { id: "tasks", label: "Tasks", icon: ListTodo },
  { id: "views", label: "Views", icon: LayoutDashboard },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "workstreams", label: "Workstreams", icon: Layers },
  { id: "permissions", label: "Permissions", icon: ShieldCheck },
  { id: "faq", label: "FAQ", icon: HelpCircle },
];

function Accordion({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border rounded-lg">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-3 text-sm font-medium hover:bg-muted/50 transition-colors">
        {title}
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

function DefinitionItem({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30">
      <span className="text-sm font-medium shrink-0 w-32">{term}</span>
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

export default function HelpPage() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <HelpCircle className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">User Guide</h1>
          <p className="text-sm text-muted-foreground">Geohan Task Management System (GTMS)</p>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="overflow-x-auto scrollbar-hide border-b pb-3">
        <div className="flex gap-1.5 flex-nowrap min-w-max">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "outline"}
              size="sm"
              className="text-xs h-8 gap-1.5 shrink-0"
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {/* ===== OVERVIEW TAB ===== */}
      {activeTab === "overview" && (
        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">What is GTMS?</h2>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-3">
              <p>
                GTMS (Geohan Task Management System) is a task tracking and collaboration platform built for Geohan Corporation. It helps teams organise work across departments and workstreams, track task progress, manage deadlines, and communicate through an integrated notification system.
              </p>
              <p>
                Tasks flow through departments and workstreams with role-based visibility and edit controls so that each team member sees and acts on the work relevant to them.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <h2 className="text-lg font-semibold">Key Definitions</h2>
            </CardHeader>
            <CardContent className="space-y-2">
              <DefinitionItem term="Task">A unit of work with a title, description, assignee, due date, priority, and status. The core object in GTMS.</DefinitionItem>
              <DefinitionItem term="Workstream">A project or area of focus (e.g. &quot;Marketing Campaign&quot;, &quot;IT Infrastructure&quot;). Tasks belong to workstreams, and workstream membership controls who can see and edit them.</DefinitionItem>
              <DefinitionItem term="Department">An organisational unit (e.g. Finance, HR, IT). Departments contain users and can be linked to workstreams.</DefinitionItem>
              <DefinitionItem term="Assignee">The person responsible for completing a task.</DefinitionItem>
              <DefinitionItem term="Initiator">The person who created a task. Also called the task creator.</DefinitionItem>
              <DefinitionItem term="HOD">Head of Department. A role at both the global level (system-wide) and workstream level (per-workstream).</DefinitionItem>
              <DefinitionItem term="Subtask">A child task linked to a parent task, used to break large items into smaller pieces.</DefinitionItem>
              <DefinitionItem term="Note">A comment or log entry attached to a task. Types include Comment, Status Update, Blocker Report, and System Log.</DefinitionItem>
              <DefinitionItem term="Acceptance">The negotiation process when a task is assigned to someone. The assignee can accept, request changes, or counter-propose.</DefinitionItem>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <h2 className="text-lg font-semibold">Navigation</h2>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 text-sm">
                <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                  <LayoutDashboard className="h-4 w-4 text-primary shrink-0" />
                  <div><strong>Dashboard</strong> &mdash; Overview of your active, overdue, critical, and waiting tasks.</div>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                  <BarChart3 className="h-4 w-4 text-primary shrink-0" />
                  <div><strong>Dept Charts</strong> &mdash; Department-level analytics: tasks by workstream, by member, and combined breakdowns.</div>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                  <ListTodo className="h-4 w-4 text-primary shrink-0" />
                  <div><strong>Tasks</strong> &mdash; Browse, filter, and manage all tasks you have access to. Supports List, Kanban, Gantt, and Calendar views.</div>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                  <ArrowLeftRight className="h-4 w-4 text-primary shrink-0" />
                  <div><strong>Pending</strong> &mdash; Tasks awaiting your acceptance or review of a counter-proposal.</div>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                  <MessageSquare className="h-4 w-4 text-primary shrink-0" />
                  <div><strong>AI Chat</strong> &mdash; Ask the AI assistant questions about your tasks, workstreams, or get help navigating the system.</div>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                  <Activity className="h-4 w-4 text-primary shrink-0" />
                  <div><strong>Activity</strong> &mdash; Audit log of all task actions. ED sees all activity; others see their own.</div>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                  <Users className="h-4 w-4 text-primary shrink-0" />
                  <div><strong>Team</strong> &mdash; View team members, their roles, departments, and task counts. ED can manage users.</div>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                  <Building2 className="h-4 w-4 text-primary shrink-0" />
                  <div><strong>Departments</strong> &mdash; Manage departments, assign HODs, and view linked workstreams.</div>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                  <Layers className="h-4 w-4 text-primary shrink-0" />
                  <div><strong>Workstreams</strong> &mdash; Manage workstreams, view tasks per workstream, and manage members.</div>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                  <Settings className="h-4 w-4 text-primary shrink-0" />
                  <div><strong>Settings</strong> &mdash; Change password, toggle email notifications, set quiet hours, choose theme, and export data.</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ===== TASKS TAB ===== */}
      {activeTab === "tasks" && (
        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <h2 className="text-lg font-semibold">Task Properties</h2>
              <p className="text-sm text-muted-foreground">Every task has the following attributes.</p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4 font-medium">Field</th>
                      <th className="text-left py-2 font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b"><td className="py-2 pr-4 font-medium text-foreground">Title</td><td className="py-2">Short description of the task (required).</td></tr>
                    <tr className="border-b"><td className="py-2 pr-4 font-medium text-foreground">Description</td><td className="py-2">Detailed information, context, or instructions.</td></tr>
                    <tr className="border-b"><td className="py-2 pr-4 font-medium text-foreground">Type</td><td className="py-2">My Action, Waiting On, Decision, Review, or Recurring.</td></tr>
                    <tr className="border-b"><td className="py-2 pr-4 font-medium text-foreground">Status</td><td className="py-2">Not Started, In Progress, Waiting On, Blocked, Done, or Cancelled.</td></tr>
                    <tr className="border-b"><td className="py-2 pr-4 font-medium text-foreground">Priority</td><td className="py-2">Critical (red), High (orange), Medium (blue), or Low (grey).</td></tr>
                    <tr className="border-b"><td className="py-2 pr-4 font-medium text-foreground">Due Date</td><td className="py-2">Target completion date. Overdue tasks are highlighted in red.</td></tr>
                    <tr className="border-b"><td className="py-2 pr-4 font-medium text-foreground">Assignee</td><td className="py-2">The person responsible for completing the task.</td></tr>
                    <tr className="border-b"><td className="py-2 pr-4 font-medium text-foreground">Workstream</td><td className="py-2">The project or area this task belongs to. Controls visibility.</td></tr>
                    <tr><td className="py-2 pr-4 font-medium text-foreground">Waiting On</td><td className="py-2">Free text field noting who or what the task is waiting for.</td></tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <h2 className="text-lg font-semibold">Task Statuses</h2>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30">
                <Badge variant="outline" className="shrink-0 bg-gray-100 text-gray-600">Not Started</Badge>
                <p className="text-sm text-muted-foreground">Default state for new tasks. Work has not begun.</p>
              </div>
              <div className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30">
                <Badge variant="outline" className="shrink-0 bg-blue-100 text-blue-700">In Progress</Badge>
                <p className="text-sm text-muted-foreground">The assignee is actively working on this task.</p>
              </div>
              <div className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30">
                <Badge variant="outline" className="shrink-0 bg-amber-100 text-amber-700">Waiting On</Badge>
                <p className="text-sm text-muted-foreground">Work is paused pending input from someone else. A dialog will prompt you for remarks and optional CC recipients. HOD and task creator are notified automatically.</p>
              </div>
              <div className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30">
                <Badge variant="outline" className="shrink-0 bg-red-100 text-red-700">Blocked</Badge>
                <p className="text-sm text-muted-foreground">The task cannot proceed due to an obstacle. A dialog will prompt you to describe the blocker and CC additional people. HOD and task creator are notified automatically.</p>
              </div>
              <div className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30">
                <Badge variant="outline" className="shrink-0 bg-green-100 text-green-700">Done</Badge>
                <p className="text-sm text-muted-foreground">Task is completed. The task creator receives a notification.</p>
              </div>
              <div className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30">
                <Badge variant="outline" className="shrink-0 bg-gray-100 text-gray-500">Cancelled</Badge>
                <p className="text-sm text-muted-foreground">Task has been abandoned and is no longer relevant.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <h2 className="text-lg font-semibold">Creating a Task</h2>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>Click the <strong>+ New Task</strong> button on the Tasks page. Fill in the title (required), then optionally set description, type, priority, workstream, assignee, and due date.</p>
              <p>If you assign the task to someone other than yourself, it enters a <strong>Pending</strong> acceptance state. The assignee will receive a notification and must accept, request changes, or counter-propose before the task is fully active.</p>
              <p>To create a <strong>subtask</strong>, open a parent task&apos;s detail panel and use the &quot;Add subtask&quot; input at the bottom of the Subtasks section.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <h2 className="text-lg font-semibold">Task Acceptance &amp; Negotiation</h2>
              <p className="text-sm text-muted-foreground">When you assign a task to someone else, it goes through a negotiation process.</p>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <div className="space-y-2">
                <p className="font-medium">As the Assignee (task assigned to you):</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                  <li><strong>Accept</strong> &mdash; Agree to the task as described.</li>
                  <li><strong>Request Changes</strong> &mdash; Ask the initiator to modify the task (provide a comment explaining what should change).</li>
                  <li><strong>Counter-Propose</strong> &mdash; Suggest an alternative title or description. The initiator reviews your proposal.</li>
                </ul>
              </div>
              <Separator />
              <div className="space-y-2">
                <p className="font-medium">As the Initiator (you created the task):</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                  <li><strong>Accept Proposal</strong> &mdash; Agree to the assignee&apos;s counter-proposal.</li>
                  <li><strong>Reject &amp; Revert</strong> &mdash; Reject the counter-proposal. The task reverts to its original version and is resent to the assignee.</li>
                  <li><strong>Re-Propose</strong> &mdash; After changes are requested, send a revised version back to the assignee.</li>
                </ul>
              </div>
              <Separator />
              <p className="text-xs text-muted-foreground">The full negotiation history is visible in the task detail panel under &quot;Negotiation History&quot;. Visit the <strong>Pending</strong> page to see all tasks awaiting your action.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <h2 className="text-lg font-semibold">Recurring Tasks</h2>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>When creating or editing a task, set the type to <strong>Recurring</strong> to reveal the recurrence configuration.</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm mt-2">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4 font-medium text-foreground">Pattern</th>
                      <th className="text-left py-2 font-medium text-foreground">Example</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b"><td className="py-1.5 pr-4">Daily</td><td className="py-1.5">Every 2 days</td></tr>
                    <tr className="border-b"><td className="py-1.5 pr-4">Weekly</td><td className="py-1.5">Every week on Mon, Wed, Fri</td></tr>
                    <tr className="border-b"><td className="py-1.5 pr-4">Biweekly</td><td className="py-1.5">Every 2 weeks on Tuesday</td></tr>
                    <tr className="border-b"><td className="py-1.5 pr-4">Monthly</td><td className="py-1.5">Every month (on the same day of month)</td></tr>
                    <tr className="border-b"><td className="py-1.5 pr-4">Quarterly</td><td className="py-1.5">Every 3 months</td></tr>
                    <tr><td className="py-1.5 pr-4">Yearly</td><td className="py-1.5">Once per year</td></tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-2">You can set an optional <strong>end date</strong> or <strong>max occurrences</strong> to limit how many instances are created. The system automatically generates child tasks on schedule.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Paperclip className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Attachments &amp; Notes</h2>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p><strong>Attachments</strong> &mdash; Upload files to any task from the detail panel. Images show a preview thumbnail; other files display as icons. You can download or delete attachments.</p>
              <p><strong>Notes</strong> &mdash; Add comments to a task to record updates, questions, or information. Notes are timestamped and attributed to the author. When you mark a task as Blocked or Waiting On with remarks, the remarks are automatically saved as a note.</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ===== VIEWS TAB ===== */}
      {activeTab === "views" && (
        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <h2 className="text-lg font-semibold">Dashboard</h2>
              <p className="text-sm text-muted-foreground">Your home page showing a summary of all relevant work.</p>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>The dashboard shows clickable stat cards for <strong>Active</strong>, <strong>Overdue</strong>, <strong>Due This Week</strong>, <strong>Critical</strong>, and <strong>Waiting On</strong> tasks. Click any card to jump to a filtered task list.</p>
              <p>Below the stats you will find <strong>Today&apos;s Focus</strong> (tasks due today or overdue plus in-progress items), a <strong>Waiting On</strong> section, and summaries grouped by workstream and by department.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <h2 className="text-lg font-semibold">Task Views</h2>
              <p className="text-sm text-muted-foreground">The Tasks page offers four different ways to visualise your tasks.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Accordion title="List View" defaultOpen>
                <div className="text-sm text-muted-foreground space-y-1.5 mt-1">
                  <p>The default tabular display. Features include:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><strong>Sort</strong> by due date, priority, title, status, or creation date.</li>
                    <li><strong>Group by</strong> workstream, department, assignee, priority, or none.</li>
                    <li><strong>Compact / Default density</strong> toggle for tighter rows.</li>
                    <li><strong>Pin detail panel</strong> on wide screens to view task details side-by-side.</li>
                    <li>Click any task to open its detail panel.</li>
                  </ul>
                </div>
              </Accordion>
              <Accordion title="Kanban View">
                <div className="text-sm text-muted-foreground space-y-1.5 mt-1">
                  <p>Drag-and-drop cards between status columns (Not Started, In Progress, Waiting On, Blocked, Done). Useful for visual workflow management.</p>
                  <p>Cards can be grouped by status or by workstream.</p>
                </div>
              </Accordion>
              <Accordion title="Gantt View">
                <div className="text-sm text-muted-foreground space-y-1.5 mt-1">
                  <p>A timeline visualisation showing tasks as horizontal bars along a date axis. Tasks are colour-coded by workstream. Useful for spotting scheduling conflicts and understanding workload over time.</p>
                </div>
              </Accordion>
              <Accordion title="Calendar View">
                <div className="text-sm text-muted-foreground space-y-1.5 mt-1">
                  <p>A month-view calendar showing tasks on their due dates. Click a date cell to see all tasks due on that day.</p>
                </div>
              </Accordion>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Filtering &amp; Search</h2>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p><strong>Global Search</strong> &mdash; The search bar at the top of every page searches task titles and descriptions. Press Enter or click to navigate to filtered results.</p>
              <p><strong>Filter Bar</strong> &mdash; On the Tasks page, use the filter bar to narrow results by:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Status (multi-select)</li>
                <li>Priority (multi-select)</li>
                <li>Type</li>
                <li>Workstream (multi-select)</li>
                <li>Assignee (multi-select)</li>
                <li>Department</li>
                <li>Due date range (Overdue, This Week, or custom)</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Department Dashboard</h2>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>The Dept Charts page provides department-level analytics. Select a department to see:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>Tasks by Workstream</strong> &mdash; Stacked bar chart showing task counts per status for each workstream.</li>
                <li><strong>Tasks by Member</strong> &mdash; Horizontal bar chart showing how tasks are distributed among team members.</li>
                <li><strong>Member &times; Workstream</strong> &mdash; Combined view showing each member&apos;s task distribution within a selected workstream.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Activity Log</h2>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>The Activity page shows an audit trail of all task actions.</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>All Activity</strong> (ED/Super Admin only) &mdash; every action across the entire system.</li>
                <li><strong>My Activity</strong> (everyone) &mdash; actions you performed.</li>
              </ul>
              <p>Each entry shows the timestamp, who performed the action, the action type (created, updated, completed, etc.), and a details section showing exactly what changed.</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ===== NOTIFICATIONS TAB ===== */}
      {activeTab === "notifications" && (
        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">In-App Notifications</h2>
              </div>
              <p className="text-sm text-muted-foreground">The bell icon in the sidebar shows your unread notification count. Click to open the notification panel.</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30">
                  <span className="text-base shrink-0">📋</span>
                  <div><strong>Task Assigned</strong> &mdash; A task has been assigned to you and is awaiting your acceptance.</div>
                </div>
                <div className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30">
                  <span className="text-base shrink-0">✅</span>
                  <div><strong>Task Completed</strong> &mdash; A task you created has been marked as Done.</div>
                </div>
                <div className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30">
                  <span className="text-base shrink-0">👍</span>
                  <div><strong>Task Accepted</strong> &mdash; An assignee accepted a task you created.</div>
                </div>
                <div className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30">
                  <span className="text-base shrink-0">✏️</span>
                  <div><strong>Changes Requested</strong> &mdash; An assignee wants you to revise a task you created.</div>
                </div>
                <div className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30">
                  <span className="text-base shrink-0">🔄</span>
                  <div><strong>Counter-Proposal</strong> &mdash; An assignee has counter-proposed changes to a task.</div>
                </div>
                <div className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30">
                  <span className="text-base shrink-0">🚫</span>
                  <div><strong>Task Blocked</strong> &mdash; A task has been marked as Blocked. Sent to the HOD, task creator, and any CC&apos;d users.</div>
                </div>
                <div className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30">
                  <span className="text-base shrink-0">⏳</span>
                  <div><strong>Task Waiting</strong> &mdash; A task has been marked as Waiting On. Sent to the HOD, task creator, and any CC&apos;d users.</div>
                </div>
                <div className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30">
                  <span className="text-base shrink-0">⏰</span>
                  <div><strong>Task Overdue</strong> &mdash; A task has passed its due date without being completed.</div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">Click a notification to navigate to the task. Use &quot;Mark all read&quot; to clear all unread notifications at once.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Blocked &amp; Waiting On Alerts</h2>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>When you change a task&apos;s status to <strong>Blocked</strong> or <strong>Waiting On</strong>, a dialog appears asking you to:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Enter <strong>remarks</strong> describing the blocker or what you are waiting for (required).</li>
                <li>Optionally <strong>CC additional people</strong> by searching for users by name or email.</li>
              </ul>
              <p>On confirmation, the system automatically:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Saves your remarks as a note on the task.</li>
                <li>Sends in-app notifications to the <strong>workstream HOD</strong> and <strong>task creator</strong>.</li>
                <li>Sends in-app notifications to any <strong>CC&apos;d users</strong>.</li>
                <li>Sends email alerts to all notified users (if they have blocker email alerts enabled).</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Email Notifications</h2>
              </div>
              <p className="text-sm text-muted-foreground">Email notifications can be toggled on or off in Settings &gt; Notifications.</p>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Accordion title="Daily Digest" defaultOpen>
                <p className="text-muted-foreground mt-1">A morning summary email listing your overdue tasks, tasks due today, critical tasks, and items you are waiting on.</p>
              </Accordion>
              <Accordion title="Task Reminders">
                <p className="text-muted-foreground mt-1">Reminder emails sent when tasks are approaching their due date.</p>
              </Accordion>
              <Accordion title="Overdue Alerts (Escalating)">
                <div className="text-muted-foreground mt-1 space-y-1">
                  <p>When a task passes its due date, escalating alerts are sent:</p>
                  <ul className="list-disc list-inside space-y-0.5 ml-2">
                    <li><strong>Day 1+</strong> &mdash; Email to the assignee.</li>
                    <li><strong>Day 3+</strong> &mdash; Email to the workstream HOD.</li>
                    <li><strong>Day 5+</strong> &mdash; Email to the Executive Director.</li>
                  </ul>
                  <p>Alerts are deduplicated (one per 24 hours per recipient).</p>
                </div>
              </Accordion>
              <Accordion title="Blocker / Status Change Alerts">
                <p className="text-muted-foreground mt-1">When a task is marked Blocked or Waiting On, email alerts with the remarks are sent to the HOD, task creator, and CC&apos;d users.</p>
              </Accordion>
              <Accordion title="Quiet Hours">
                <p className="text-muted-foreground mt-1">Set a time range (in Malaysia Time) during which no email notifications will be sent. Configure in Settings &gt; Notifications.</p>
              </Accordion>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Repeat className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Email Follow-Ups</h2>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>Within any task&apos;s detail panel, you can create <strong>email follow-ups</strong> to send scheduled or recurring emails to external or internal recipients.</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Set recipients (with autocomplete from system users).</li>
                <li>Write a custom subject and HTML body.</li>
                <li>Schedule a <strong>one-time send</strong> at a specific date/time, or set up a <strong>recurring schedule</strong> (daily, weekly, biweekly, monthly, quarterly, yearly).</li>
                <li>Pause/resume follow-ups without deleting them.</li>
                <li>Use <strong>Send Now</strong> to trigger an immediate email.</li>
                <li>View send history (count, last sent time, success/failure).</li>
              </ul>
              <p className="text-xs mt-2">Note: Email follow-ups require your account to be linked to Microsoft 365.</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ===== WORKSTREAMS TAB ===== */}
      {activeTab === "workstreams" && (
        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Workstreams</h2>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>A <strong>workstream</strong> is a project or area of focus (e.g. &quot;Q3 Marketing Campaign&quot;, &quot;IT Infrastructure Upgrade&quot;). Each workstream has:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>Code</strong> &mdash; A short identifier (e.g. MKT, IT, FIN).</li>
                <li><strong>Name</strong> &mdash; Full descriptive name.</li>
                <li><strong>Colour</strong> &mdash; For visual identification on task cards and charts.</li>
                <li><strong>Department</strong> &mdash; Optional link to an organisational department.</li>
                <li><strong>Members</strong> &mdash; Users who belong to the workstream, each with a role (HOD, Manager, or Staff).</li>
              </ul>
              <p>Tasks assigned to a workstream are visible to all members of that workstream. Tasks without a workstream are only visible to the creator and assignee.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <h2 className="text-lg font-semibold">Workstream Members</h2>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>Navigate to <strong>Workstreams</strong> &gt; select a workstream &gt; <strong>Members</strong> to manage membership.</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>Add members</strong> &mdash; Search for users and assign them a workstream role.</li>
                <li><strong>Change roles</strong> &mdash; Promote or change a member&apos;s role within the workstream.</li>
                <li><strong>Remove members</strong> &mdash; Remove a user from the workstream (their tasks remain).</li>
              </ul>
              <p>Only workstream HODs, Managers, and system-level ED/HOD can manage workstream membership.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Departments</h2>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>A <strong>department</strong> represents an organisational unit (e.g. Finance, Human Resources, IT). Each department has:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>Code</strong> &mdash; Short identifier (e.g. FIN, HR).</li>
                <li><strong>Name</strong> &mdash; Full name of the department.</li>
                <li><strong>Colour</strong> &mdash; For visual identification.</li>
                <li><strong>HOD</strong> &mdash; The department head (assigned user).</li>
                <li><strong>Members</strong> &mdash; Users belonging to this department.</li>
                <li><strong>Linked Workstreams</strong> &mdash; Workstreams associated with this department.</li>
              </ul>
              <p>Department management (create, edit, delete, assign HOD) is restricted to ED and Super Admin.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Team Management</h2>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>The <strong>Team</strong> page shows all users as cards with their name, role, department, and task counts (active, overdue, critical). Click a user card to see their assigned tasks.</p>
              <p>ED and Super Admin can:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Create new user accounts.</li>
                <li>Edit user details (name, role, position, department).</li>
                <li>Reset passwords.</li>
                <li>Deactivate user accounts.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ===== PERMISSIONS TAB ===== */}
      {activeTab === "permissions" && (
        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Global Roles</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Your global role determines system-level permissions like managing users, creating workstreams, and other administrative functions.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <Badge className="shrink-0 bg-red-100 text-red-700 hover:bg-red-100">ED</Badge>
                  <div>
                    <p className="text-sm font-medium">Executive Director</p>
                    <p className="text-xs text-muted-foreground">Full system access. Can manage users, departments, workstreams, and all settings.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <Badge className="shrink-0 bg-purple-100 text-purple-700 hover:bg-purple-100">HOD</Badge>
                  <div>
                    <p className="text-sm font-medium">Head of Department</p>
                    <p className="text-xs text-muted-foreground">Can manage users and workstream members. Can create and manage workstreams.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <Badge className="shrink-0 bg-blue-100 text-blue-700 hover:bg-blue-100">MANAGER</Badge>
                  <div>
                    <p className="text-sm font-medium">Manager</p>
                    <p className="text-xs text-muted-foreground">Can manage workstream members. Cannot manage users or system settings.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <Badge className="shrink-0 bg-gray-100 text-gray-600 hover:bg-gray-100">STAFF</Badge>
                  <div>
                    <p className="text-sm font-medium">Staff</p>
                    <p className="text-xs text-muted-foreground">Standard access. Can view and work on assigned tasks.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Workstream Roles</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Each workstream has its own membership and roles. Your workstream role determines what you can see and edit within that workstream.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <Badge className="shrink-0 bg-purple-100 text-purple-700 hover:bg-purple-100">HOD</Badge>
                  <div>
                    <p className="text-sm font-medium">Workstream HOD</p>
                    <p className="text-xs text-muted-foreground">Full edit access to all tasks in this workstream. Can modify title, description, priority, assignee, due date, and status.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <Badge className="shrink-0 bg-blue-100 text-blue-700 hover:bg-blue-100">MANAGER</Badge>
                  <div>
                    <p className="text-sm font-medium">Workstream Manager</p>
                    <p className="text-xs text-muted-foreground">Full edit access to all tasks in this workstream, same as HOD.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <Badge className="shrink-0 bg-gray-100 text-gray-600 hover:bg-gray-100">STAFF</Badge>
                  <div>
                    <p className="text-sm font-medium">Workstream Staff</p>
                    <p className="text-xs text-muted-foreground">Can view all tasks in this workstream. Can only update task status (not other fields) unless you are the creator or assignee.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Task Visibility</h2>
              </div>
              <p className="text-sm text-muted-foreground">Who can see which tasks.</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-primary font-bold mt-0.5">1.</span>
                  <p><strong>Workstream tasks:</strong> If you are a member of a workstream (any role), you can see all tasks in that workstream.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary font-bold mt-0.5">2.</span>
                  <p><strong>Assigned to you:</strong> You always see tasks assigned to you, regardless of workstream membership.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary font-bold mt-0.5">3.</span>
                  <p><strong>Created by you:</strong> You always see tasks you created, regardless of workstream membership.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary font-bold mt-0.5">4.</span>
                  <p><strong>No-workstream tasks:</strong> Tasks without a workstream are only visible to their creator and assignee.</p>
                </div>
                <Separator className="my-3" />
                <p className="text-xs text-muted-foreground">
                  Note: Even ED and SUPER_ADMIN must be workstream members to see workstream tasks. However, they always see tasks assigned to or created by them.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Pencil className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Edit Permissions</h2>
              </div>
              <p className="text-sm text-muted-foreground">Who can edit tasks and what fields.</p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4 font-medium">Relationship to Task</th>
                      <th className="text-left py-2 pr-4 font-medium">Can Edit</th>
                      <th className="text-left py-2 font-medium">Fields</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b"><td className="py-2 pr-4">Task creator</td><td className="py-2 pr-4">Yes</td><td className="py-2">All fields</td></tr>
                    <tr className="border-b"><td className="py-2 pr-4">Task assignee</td><td className="py-2 pr-4">Yes</td><td className="py-2">All fields</td></tr>
                    <tr className="border-b"><td className="py-2 pr-4">Workstream HOD</td><td className="py-2 pr-4">Yes</td><td className="py-2">All fields</td></tr>
                    <tr className="border-b"><td className="py-2 pr-4">Workstream Manager</td><td className="py-2 pr-4">Yes</td><td className="py-2">All fields</td></tr>
                    <tr className="border-b"><td className="py-2 pr-4">Workstream Staff</td><td className="py-2 pr-4">Yes</td><td className="py-2">Status only</td></tr>
                    <tr><td className="py-2 pr-4">Not a member</td><td className="py-2 pr-4">No</td><td className="py-2">-</td></tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ===== FAQ TAB ===== */}
      {activeTab === "faq" && (
        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <h2 className="text-lg font-semibold">Frequently Asked Questions</h2>
            </CardHeader>
            <CardContent className="space-y-3">
              <Accordion title="How do I get access to a workstream?" defaultOpen>
                <p className="text-sm text-muted-foreground mt-1">Ask your HOD, Manager, or ED to add you as a member of the workstream. Go to <strong>Workstreams</strong> &gt; select a workstream &gt; <strong>Members</strong> to see current members.</p>
              </Accordion>
              <Accordion title="Why can I only update task status?">
                <p className="text-sm text-muted-foreground mt-1">If you are a Staff member in a workstream (and not the task creator or assignee), you can only change the status. You need a HOD or Manager role in the workstream for full edit access.</p>
              </Accordion>
              <Accordion title="I am ED but can't see certain tasks. Why?">
                <p className="text-sm text-muted-foreground mt-1">ED must be a member of each workstream to see its tasks. Ask to be added to the workstream, or you will only see tasks assigned to or created by you.</p>
              </Accordion>
              <Accordion title="What happens to tasks with no workstream?">
                <p className="text-sm text-muted-foreground mt-1">Tasks without a workstream are only visible to their creator and assignee. Assign a workstream to make them visible to all workstream members.</p>
              </Accordion>
              <Accordion title="How do I set up a recurring task?">
                <p className="text-sm text-muted-foreground mt-1">When creating or editing a task, set the type to <strong>Recurring</strong>. A recurrence picker will appear where you can choose daily, weekly, biweekly, monthly, quarterly, or yearly patterns with optional end dates and occurrence limits.</p>
              </Accordion>
              <Accordion title="How do Blocked / Waiting On notifications work?">
                <p className="text-sm text-muted-foreground mt-1">When you change a task to Blocked or Waiting On, a dialog prompts you for remarks and optional CC recipients. The system automatically notifies the workstream HOD, task creator, and any CC&apos;d users via both in-app notifications and email (if they have blocker alerts enabled).</p>
              </Accordion>
              <Accordion title="How do email follow-ups work?">
                <p className="text-sm text-muted-foreground mt-1">Open a task&apos;s detail panel and scroll to the Email Follow-ups section. You can schedule one-time or recurring emails to any recipient. Your account must be linked to Microsoft 365 to use this feature.</p>
              </Accordion>
              <Accordion title="How do I change my notification preferences?">
                <p className="text-sm text-muted-foreground mt-1">Go to <strong>Settings</strong> &gt; <strong>Notifications</strong> tab. You can toggle daily digest, task reminders, overdue alerts, and blocker alerts on or off. You can also set quiet hours during which no emails are sent.</p>
              </Accordion>
              <Accordion title="How do I change the theme?">
                <p className="text-sm text-muted-foreground mt-1">Go to <strong>Settings</strong> &gt; <strong>Appearance</strong> tab. Choose between Light, Dark, or System (follows your device setting).</p>
              </Accordion>
              <Accordion title="How do I export my tasks?">
                <p className="text-sm text-muted-foreground mt-1">Go to <strong>Settings</strong> &gt; <strong>Profile</strong> tab and scroll to the Export section. Click <strong>Export Tasks as CSV</strong> to download all tasks you have access to.</p>
              </Accordion>
              <Accordion title="What does the AI Chat do?">
                <p className="text-sm text-muted-foreground mt-1">The AI Chat assistant can help you find tasks, answer questions about your workload, and provide guidance on using GTMS. Access it from the <strong>AI Chat</strong> page or the chat panel in the sidebar (desktop only).</p>
              </Accordion>
              <Accordion title="Who can delete a task?">
                <p className="text-sm text-muted-foreground mt-1">Only the task creator, ED, or Super Admin can delete a task. Deletion is permanent.</p>
              </Accordion>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
