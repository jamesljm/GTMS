# GTMS Site Testing Checklist

Default admin login: `ed@gtms.com` / `Admin1234` (SUPER_ADMIN, clean DB).

Track issues found in `BUGS.md`.

---

## Auth
- [ ] Email/password login (`ed@gtms.com` / `Admin1234`)
- [ ] Microsoft SSO login
- [ ] Sign out → sign back in (session persists)
- [ ] Access `/tasks` while logged out → redirects to login
- [ ] Public `/signup` page (decide: keep or remove?)

## Departments
- [ ] Create new department
- [ ] Edit department (name, code, color, head)
- [ ] Delete department
- [ ] Assign HOD

## Team
- [ ] Add Member (manual create)
- [ ] Edit user (role, department, position)
- [ ] Reset Password (shows generated password)
- [ ] Deactivate user
- [ ] Import from M365

## Workstreams
- [ ] View all workstreams
- [ ] Create workstream
- [ ] Edit workstream
- [ ] Delete workstream
- [ ] Add/remove members at `/workstreams/[id]/members`

## Tasks
- [ ] Create task (manual form)
- [ ] Quick add (natural language: "Send proposal to John by Friday")
- [ ] Edit title, due date, priority, status, assignee, workstream
- [ ] Add subtasks
- [ ] Status transitions: Not Started → In Progress → Done / Blocked / Waiting On
- [ ] Set "Waiting On" + waiting-on-whom note
- [ ] Delete task (cascade to subtasks?)
- [ ] Filter / sort
- [ ] Reassign

## Recurring tasks
- [ ] Create with recurrence pattern
- [ ] Wait until next interval → new instance spawns

## Attachments / Notes
- [ ] Upload file to a task
- [ ] Add note to a task
- [ ] Delete note / attachment

## Dashboards
- [ ] `/dashboard` — overall metrics
- [ ] `/department-dashboard` — per-department
- [ ] `/team` view
- [ ] Numbers match reality

## Notifications
- [ ] Bell icon updates (polls 30s)
- [ ] Mark as read
- [ ] Mark all read

## Email (Microsoft Graph)
- [ ] Daily digest (7:30 AM MYT)
- [ ] Overdue alert email
- [ ] Blocked task → manager email
- [ ] Reply with `DONE` updates task (likely won't work without inbound webhook)

## Permissions (test by logging in as different roles)
- [ ] STAFF — limited to own/assigned tasks
- [ ] MANAGER — workstream-level access
- [ ] HOD — department-wide access
- [ ] ED — see everything
- [ ] SUPER_ADMIN — admin features visible

## Other features
- [ ] `/chat` — AI chat (needs ANTHROPIC_API_KEY)
- [ ] `/activity` — activity log shows changes
- [ ] `/settings` — notification preferences save
- [ ] `/help` — help content loads

## Cross-cutting
- [ ] No CORS errors in browser console (F12)
- [ ] Page load speed acceptable
- [ ] Responsive on phone / tablet
- [ ] Concurrent edits (same task, two tabs)
- [ ] Refresh during edit doesn't lose data
