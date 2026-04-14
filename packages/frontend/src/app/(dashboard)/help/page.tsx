"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ShieldCheck, Users, Eye, Pencil, HelpCircle } from "lucide-react";

export default function HelpPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <HelpCircle className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Access Rights & Permissions</h1>
      </div>

      {/* Global Roles */}
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

      {/* Workstream Roles */}
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

      {/* Visibility Rules */}
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

      {/* Edit Rules */}
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
                <tr className="border-b">
                  <td className="py-2 pr-4">Task creator</td>
                  <td className="py-2 pr-4">Yes</td>
                  <td className="py-2">All fields</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4">Task assignee</td>
                  <td className="py-2 pr-4">Yes</td>
                  <td className="py-2">All fields</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4">Workstream HOD</td>
                  <td className="py-2 pr-4">Yes</td>
                  <td className="py-2">All fields</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4">Workstream Manager</td>
                  <td className="py-2 pr-4">Yes</td>
                  <td className="py-2">All fields</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4">Workstream Staff</td>
                  <td className="py-2 pr-4">Yes</td>
                  <td className="py-2">Status only</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Not a member</td>
                  <td className="py-2 pr-4">No</td>
                  <td className="py-2">-</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card>
        <CardHeader className="pb-3">
          <h2 className="text-lg font-semibold">FAQ</h2>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="font-medium">How do I get access to a workstream?</p>
            <p className="text-muted-foreground mt-1">Ask your HOD, Manager, or ED to add you as a member of the workstream. Go to Workstreams &gt; select a workstream &gt; Members to see current members.</p>
          </div>
          <Separator />
          <div>
            <p className="font-medium">Why can I only update task status?</p>
            <p className="text-muted-foreground mt-1">If you are a Staff member in a workstream (and not the task creator or assignee), you can only change the status. HOD or Manager role in the workstream is needed for full edit access.</p>
          </div>
          <Separator />
          <div>
            <p className="font-medium">I am ED but can&apos;t see certain tasks. Why?</p>
            <p className="text-muted-foreground mt-1">ED must be a member of each workstream to see its tasks. Ask to be added to the workstream, or you will only see tasks assigned to or created by you.</p>
          </div>
          <Separator />
          <div>
            <p className="font-medium">What happens to tasks with no workstream?</p>
            <p className="text-muted-foreground mt-1">Tasks without a workstream are only visible to their creator and assignee. Assign a workstream to make them visible to workstream members.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
