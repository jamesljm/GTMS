import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { addDays, addWeeks, nextFriday, endOfMonth, startOfWeek, addMonths } from 'date-fns';

const prisma = new PrismaClient();

const PASSWORD = 'Admin1234';

async function main() {
  console.log('Seeding GTMS database...');
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  // --- USERS ---
  const users = [
    { email: 'ed@gtms.com', name: 'Dato\' Sri AR', role: 'ED', position: 'Executive Director', department: 'Board' },
    { email: 'june@geohan.com', name: 'June Tan', role: 'HOD', position: 'CFO', department: 'Finance' },
    { email: 'kevin@geohan.com', name: 'Kevin Lim', role: 'HOD', position: 'Head of IT', department: 'IT' },
    { email: 'sarah@geohan.com', name: 'Sarah Wong', role: 'HOD', position: 'Head of HR', department: 'HR' },
    { email: 'david@geohan.com', name: 'David Chen', role: 'HOD', position: 'Head of Operations', department: 'Operations' },
    { email: 'farah@geohan.com', name: 'Farah Aziz', role: 'HOD', position: 'Head of ESG', department: 'ESG' },
    { email: 'rajan@geohan.com', name: 'Rajan Pillai', role: 'HOD', position: 'Head of IR', department: 'Investor Relations' },
    { email: 'lina@geohan.com', name: 'Lina Mohd', role: 'HOD', position: 'Company Secretary', department: 'Legal' },
    { email: 'ahmad@geohan.com', name: 'Ahmad Razak', role: 'HOD', position: 'Head of Commercial', department: 'Commercial' },
    { email: 'mei@geohan.com', name: 'Mei Ling', role: 'MANAGER', position: 'Accounts Manager', department: 'Finance' },
    { email: 'james@geohan.com', name: 'James Lee', role: 'MANAGER', position: 'IT Manager', department: 'IT' },
    { email: 'anis@geohan.com', name: 'Anis Ibrahim', role: 'MANAGER', position: 'Admin Manager', department: 'Admin' },
    { email: 'kumar@geohan.com', name: 'Kumar Samy', role: 'MANAGER', position: 'Tender Manager', department: 'Tender' },
    { email: 'grace@geohan.com', name: 'Grace Ong', role: 'MANAGER', position: 'Fund & Acquisitions', department: 'Fund & Acquisitions' },
    { email: 'zul@geohan.com', name: 'Zul Hakim', role: 'MANAGER', position: 'GPL Manager', department: 'GPL' },
    { email: 'rachel@geohan.com', name: 'Rachel Tan', role: 'STAFF', position: 'Accounts Executive', department: 'Finance' },
  ];

  const createdUsers: Record<string, string> = {};
  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, position: u.position, department: u.department, passwordHash },
      create: { ...u, passwordHash },
    });
    createdUsers[u.email] = user.id;
  }
  console.log(`Seeded ${users.length} users`);

  // --- WORKSTREAMS ---
  const workstreams = [
    { code: 'STR', name: 'Strategy & Corporate', color: '#6366f1', sortOrder: 1 },
    { code: 'COM', name: 'Commercial & Business Dev', color: '#f59e0b', sortOrder: 2 },
    { code: 'IR', name: 'Investor Relations', color: '#3b82f6', sortOrder: 3 },
    { code: 'IT', name: 'IT & Digital', color: '#10b981', sortOrder: 4 },
    { code: 'HR', name: 'HR & People', color: '#f97316', sortOrder: 5 },
    { code: 'FIN', name: 'Finance & Accounts', color: '#ef4444', sortOrder: 6 },
    { code: 'ESG', name: 'ESG & Sustainability', color: '#22c55e', sortOrder: 7 },
    { code: 'OPS', name: 'Operations', color: '#8b5cf6', sortOrder: 8 },
    { code: 'LEG', name: 'Legal & Secretarial', color: '#64748b', sortOrder: 9 },
    { code: 'ACU', name: 'Acumen Integration', color: '#ec4899', sortOrder: 10 },
    { code: 'GPL', name: 'GPL & Licensing', color: '#14b8a6', sortOrder: 11 },
    { code: 'ADM', name: 'Admin & General', color: '#a855f7', sortOrder: 12 },
    { code: 'FAN', name: 'Fund & Acquisitions', color: '#06b6d4', sortOrder: 13 },
    { code: 'TEN', name: 'Tender & Procurement', color: '#d97706', sortOrder: 14 },
    { code: 'RT', name: 'Recurring & Regular', color: '#78716c', sortOrder: 15 },
  ];

  const createdWorkstreams: Record<string, string> = {};
  for (const ws of workstreams) {
    const workstream = await prisma.workstream.upsert({
      where: { code: ws.code },
      update: { name: ws.name, color: ws.color, sortOrder: ws.sortOrder },
      create: ws,
    });
    createdWorkstreams[ws.code] = workstream.id;
  }
  console.log(`Seeded ${workstreams.length} workstreams`);

  // --- TASKS ---
  const now = new Date();
  const edId = createdUsers['ed@gtms.com'];

  const tasks = [
    // === STRATEGY & CORPORATE (STR) ===
    { title: 'Review 5-year strategic plan update from Board Strategy Committee', type: 'Review', priority: 'Critical', status: 'In Progress', workstream: 'STR', assignee: 'ed@gtms.com', dueDate: addDays(now, 7) },
    { title: 'Finalize corporate restructuring proposal for AGM', type: 'My Action', priority: 'High', status: 'In Progress', workstream: 'STR', assignee: 'ed@gtms.com', dueDate: addDays(now, 14) },
    { title: 'Prepare Board paper on M&A target shortlist', type: 'My Action', priority: 'High', status: 'Not Started', workstream: 'STR', assignee: 'ed@gtms.com', dueDate: addDays(now, 21) },
    { title: 'Follow up with McKinsey on market study report', type: 'Waiting On', priority: 'Medium', status: 'Waiting On', workstream: 'STR', assignee: 'ed@gtms.com', waitingOnWhom: 'McKinsey', dueDate: addDays(now, 10) },
    { title: 'Arrange strategy retreat for senior leadership team', type: 'My Action', priority: 'Medium', status: 'Not Started', workstream: 'STR', assignee: 'sarah@geohan.com', dueDate: addDays(now, 30) },
    { title: 'Update corporate governance manual', type: 'Review', priority: 'Medium', status: 'Not Started', workstream: 'STR', assignee: 'lina@geohan.com', dueDate: addDays(now, 45) },
    { title: 'Benchmark competitor M&A activity in SE Asia geotechnical sector', type: 'My Action', priority: 'High', status: 'Not Started', workstream: 'STR', assignee: 'ahmad@geohan.com', dueDate: addDays(now, 14) },

    // === COMMERCIAL & BUSINESS DEV (COM) ===
    { title: 'Review MRT3 tender submission package', type: 'Review', priority: 'Critical', status: 'In Progress', workstream: 'COM', assignee: 'ahmad@geohan.com', dueDate: addDays(now, 5) },
    { title: 'Follow up with JKR on Penang highway piling contract', type: 'Waiting On', priority: 'High', status: 'Waiting On', workstream: 'COM', assignee: 'kumar@geohan.com', waitingOnWhom: 'JKR Penang', dueDate: addDays(now, 7) },
    { title: 'Negotiate subcontractor terms for Johor CIQ project', type: 'My Action', priority: 'High', status: 'In Progress', workstream: 'COM', assignee: 'ahmad@geohan.com', dueDate: addDays(now, 10) },
    { title: 'Prepare pre-qualification docs for Sarawak dam project', type: 'My Action', priority: 'Medium', status: 'Not Started', workstream: 'COM', assignee: 'kumar@geohan.com', dueDate: addDays(now, 21) },
    { title: 'Client entertainment budget review Q2', type: 'Review', priority: 'Low', status: 'Not Started', workstream: 'COM', assignee: 'june@geohan.com', dueDate: endOfMonth(now) },
    { title: 'Update project pipeline tracker with latest wins/losses', type: 'Recurring', priority: 'Medium', status: 'Not Started', workstream: 'COM', assignee: 'ahmad@geohan.com', dueDate: nextFriday(now), recurringCron: '0 9 * * 5' },
    { title: 'Follow up with Gamuda on JV proposal for East Coast Rail Link', type: 'Waiting On', priority: 'Critical', status: 'Waiting On', workstream: 'COM', assignee: 'ed@gtms.com', waitingOnWhom: 'Gamuda', dueDate: addDays(now, 3) },

    // === INVESTOR RELATIONS (IR) ===
    { title: 'Prepare quarterly results announcement draft', type: 'My Action', priority: 'Critical', status: 'In Progress', workstream: 'IR', assignee: 'rajan@geohan.com', dueDate: addDays(now, 14) },
    { title: 'Schedule analyst briefing post-results announcement', type: 'My Action', priority: 'High', status: 'Not Started', workstream: 'IR', assignee: 'rajan@geohan.com', dueDate: addDays(now, 21) },
    { title: 'Update investor presentation deck for roadshow', type: 'My Action', priority: 'High', status: 'Not Started', workstream: 'IR', assignee: 'rajan@geohan.com', dueDate: addDays(now, 28) },
    { title: 'Review annual report draft from designer', type: 'Review', priority: 'Medium', status: 'Waiting On', workstream: 'IR', assignee: 'ed@gtms.com', waitingOnWhom: 'Design agency', dueDate: addDays(now, 30) },
    { title: 'Follow up with Bursa on compliance query re: related party disclosure', type: 'Waiting On', priority: 'High', status: 'Waiting On', workstream: 'IR', assignee: 'lina@geohan.com', waitingOnWhom: 'Bursa Malaysia', dueDate: addDays(now, 7) },
    { title: 'Respond to EPF fund manager queries on order book', type: 'My Action', priority: 'High', status: 'In Progress', workstream: 'IR', assignee: 'rajan@geohan.com', dueDate: addDays(now, 2) },

    // === IT & DIGITAL (IT) ===
    { title: 'Complete ERP Phase 2 UAT testing', type: 'My Action', priority: 'Critical', status: 'In Progress', workstream: 'IT', assignee: 'kevin@geohan.com', dueDate: addDays(now, 14) },
    { title: 'Roll out site WiFi upgrade to 12 remaining sites', type: 'My Action', priority: 'High', status: 'In Progress', workstream: 'IT', assignee: 'james@geohan.com', dueDate: addDays(now, 30) },
    { title: 'Migrate email to Microsoft 365 (Phase 2: site offices)', type: 'My Action', priority: 'High', status: 'Not Started', workstream: 'IT', assignee: 'kevin@geohan.com', dueDate: addDays(now, 45) },
    { title: 'Deploy GTMS (this system) to production', type: 'My Action', priority: 'Critical', status: 'In Progress', workstream: 'IT', assignee: 'james@geohan.com', dueDate: addDays(now, 7) },
    { title: 'Review cybersecurity assessment report from KPMG', type: 'Review', priority: 'High', status: 'Waiting On', workstream: 'IT', assignee: 'kevin@geohan.com', waitingOnWhom: 'KPMG', dueDate: addDays(now, 14) },
    { title: 'Set up backup and DR procedures for new ERP', type: 'My Action', priority: 'Medium', status: 'Not Started', workstream: 'IT', assignee: 'james@geohan.com', dueDate: addDays(now, 30) },
    { title: 'Evaluate drone survey software for site monitoring', type: 'Decision', priority: 'Medium', status: 'Not Started', workstream: 'IT', assignee: 'kevin@geohan.com', dueDate: addDays(now, 21) },

    // === HR & PEOPLE (HR) ===
    { title: 'Finalize salary review proposal for Board approval', type: 'My Action', priority: 'Critical', status: 'In Progress', workstream: 'HR', assignee: 'sarah@geohan.com', dueDate: addDays(now, 7) },
    { title: 'Complete annual training needs analysis', type: 'My Action', priority: 'High', status: 'In Progress', workstream: 'HR', assignee: 'sarah@geohan.com', dueDate: addDays(now, 14) },
    { title: 'Recruit 3 senior piling engineers (urgent site requirement)', type: 'My Action', priority: 'Critical', status: 'In Progress', workstream: 'HR', assignee: 'sarah@geohan.com', dueDate: addDays(now, 21) },
    { title: 'Review foreign worker permit renewals (45 workers)', type: 'My Action', priority: 'High', status: 'Not Started', workstream: 'HR', assignee: 'sarah@geohan.com', dueDate: addDays(now, 30) },
    { title: 'Organize Hari Raya staff event', type: 'My Action', priority: 'Medium', status: 'Not Started', workstream: 'HR', assignee: 'anis@geohan.com', dueDate: addDays(now, 21) },
    { title: 'Follow up with insurance broker on group medical policy renewal', type: 'Waiting On', priority: 'High', status: 'Waiting On', workstream: 'HR', assignee: 'sarah@geohan.com', waitingOnWhom: 'AIA broker', dueDate: addDays(now, 10) },
    { title: 'Update employee handbook with new leave policies', type: 'My Action', priority: 'Medium', status: 'Not Started', workstream: 'HR', assignee: 'sarah@geohan.com', dueDate: addDays(now, 45) },

    // === FINANCE & ACCOUNTS (FIN) ===
    { title: 'Follow up with June on OCBC e-giro setup', type: 'Waiting On', priority: 'High', status: 'Waiting On', workstream: 'FIN', assignee: 'june@geohan.com', waitingOnWhom: 'OCBC bank', dueDate: addDays(now, 5) },
    { title: 'Review monthly management accounts (March)', type: 'Review', priority: 'Critical', status: 'In Progress', workstream: 'FIN', assignee: 'june@geohan.com', dueDate: addDays(now, 3) },
    { title: 'Prepare tax planning memo for FY end', type: 'My Action', priority: 'High', status: 'Not Started', workstream: 'FIN', assignee: 'june@geohan.com', dueDate: addDays(now, 30) },
    { title: 'Finalize audit adjustments with Ernst & Young', type: 'My Action', priority: 'Critical', status: 'In Progress', workstream: 'FIN', assignee: 'june@geohan.com', dueDate: addDays(now, 14) },
    { title: 'Resolve outstanding intercompany balances (RM2.3M)', type: 'My Action', priority: 'High', status: 'In Progress', workstream: 'FIN', assignee: 'mei@geohan.com', dueDate: addDays(now, 14) },
    { title: 'Review cash flow forecast for next 6 months', type: 'Review', priority: 'High', status: 'Not Started', workstream: 'FIN', assignee: 'june@geohan.com', dueDate: addDays(now, 7) },
    { title: 'Process progress claims for 5 ongoing sites', type: 'Recurring', priority: 'High', status: 'In Progress', workstream: 'FIN', assignee: 'mei@geohan.com', dueDate: endOfMonth(now), recurringCron: '0 9 25 * *' },
    { title: 'Follow up with LHDN on tax refund status', type: 'Waiting On', priority: 'Medium', status: 'Waiting On', workstream: 'FIN', assignee: 'june@geohan.com', waitingOnWhom: 'LHDN', dueDate: addDays(now, 14) },

    // === ESG & SUSTAINABILITY (ESG) ===
    { title: 'Finalize sustainability report for annual report', type: 'My Action', priority: 'Critical', status: 'In Progress', workstream: 'ESG', assignee: 'farah@geohan.com', dueDate: addDays(now, 21) },
    { title: 'Complete carbon footprint assessment for 2025', type: 'My Action', priority: 'High', status: 'In Progress', workstream: 'ESG', assignee: 'farah@geohan.com', dueDate: addDays(now, 30) },
    { title: 'Review DOSH safety audit findings for KL site', type: 'Review', priority: 'Critical', status: 'Not Started', workstream: 'ESG', assignee: 'farah@geohan.com', dueDate: addDays(now, 5) },
    { title: 'Submit CIDB green card applications (12 workers)', type: 'My Action', priority: 'High', status: 'Not Started', workstream: 'ESG', assignee: 'farah@geohan.com', dueDate: addDays(now, 14) },
    { title: 'Organize World Environment Day activity', type: 'My Action', priority: 'Low', status: 'Not Started', workstream: 'ESG', assignee: 'farah@geohan.com', dueDate: addDays(now, 60) },
    { title: 'Follow up with SGS on ISO 14001 recertification schedule', type: 'Waiting On', priority: 'Medium', status: 'Waiting On', workstream: 'ESG', assignee: 'farah@geohan.com', waitingOnWhom: 'SGS Malaysia', dueDate: addDays(now, 14) },

    // === OPERATIONS (OPS) ===
    { title: 'Review site progress report for KVMRT3 Package 1', type: 'Review', priority: 'Critical', status: 'In Progress', workstream: 'OPS', assignee: 'david@geohan.com', dueDate: addDays(now, 2) },
    { title: 'Resolve crane breakdown at Johor site (2 days downtime)', type: 'My Action', priority: 'Critical', status: 'In Progress', workstream: 'OPS', assignee: 'david@geohan.com', dueDate: addDays(now, 1) },
    { title: 'Approve equipment purchase order for new hydraulic rig', type: 'Decision', priority: 'High', status: 'Not Started', workstream: 'OPS', assignee: 'ed@gtms.com', dueDate: addDays(now, 5) },
    { title: 'Plan site mobilization for Penang Second Bridge approach works', type: 'My Action', priority: 'High', status: 'Not Started', workstream: 'OPS', assignee: 'david@geohan.com', dueDate: addDays(now, 14) },
    { title: 'Monthly site safety walk (all active sites)', type: 'Recurring', priority: 'High', status: 'Not Started', workstream: 'OPS', assignee: 'david@geohan.com', dueDate: endOfMonth(now), recurringCron: '0 9 1 * *' },
    { title: 'Review pile load test results for Cyberjaya Phase 3', type: 'Review', priority: 'High', status: 'Waiting On', workstream: 'OPS', assignee: 'david@geohan.com', waitingOnWhom: 'Lab', dueDate: addDays(now, 7) },
    { title: 'Coordinate with subcontractor on bored pile schedule', type: 'My Action', priority: 'Medium', status: 'In Progress', workstream: 'OPS', assignee: 'david@geohan.com', dueDate: addDays(now, 10) },

    // === LEGAL & SECRETARIAL (LEG) ===
    { title: 'Review draft shareholders agreement for JV with Penta Nusantara', type: 'Review', priority: 'Critical', status: 'In Progress', workstream: 'LEG', assignee: 'lina@geohan.com', dueDate: addDays(now, 7) },
    { title: 'Prepare Board meeting agenda and papers for May Board', type: 'My Action', priority: 'High', status: 'Not Started', workstream: 'LEG', assignee: 'lina@geohan.com', dueDate: addDays(now, 21) },
    { title: 'File annual return with SSM', type: 'My Action', priority: 'High', status: 'Not Started', workstream: 'LEG', assignee: 'lina@geohan.com', dueDate: addDays(now, 30) },
    { title: 'Review employment contract templates (updated with new EA 2022 amendments)', type: 'Review', priority: 'Medium', status: 'Not Started', workstream: 'LEG', assignee: 'lina@geohan.com', dueDate: addDays(now, 21) },
    { title: 'Follow up with lawyers on land acquisition dispute (Rawang site)', type: 'Waiting On', priority: 'High', status: 'Waiting On', workstream: 'LEG', assignee: 'lina@geohan.com', waitingOnWhom: 'Shearn Delamore', dueDate: addDays(now, 7) },
    { title: 'Prepare AGM notice and proxy forms', type: 'My Action', priority: 'Medium', status: 'Not Started', workstream: 'LEG', assignee: 'lina@geohan.com', dueDate: addDays(now, 45) },

    // === ACUMEN INTEGRATION (ACU) ===
    { title: 'Review Acumen subsidiary monthly P&L', type: 'Review', priority: 'High', status: 'Not Started', workstream: 'ACU', assignee: 'june@geohan.com', dueDate: addDays(now, 7) },
    { title: 'Align Acumen HR policies with Geohan group standards', type: 'My Action', priority: 'Medium', status: 'In Progress', workstream: 'ACU', assignee: 'sarah@geohan.com', dueDate: addDays(now, 30) },
    { title: 'Complete Acumen IT systems integration roadmap', type: 'My Action', priority: 'High', status: 'In Progress', workstream: 'ACU', assignee: 'kevin@geohan.com', dueDate: addDays(now, 21) },
    { title: 'Meet Acumen MD to discuss synergy opportunities', type: 'My Action', priority: 'High', status: 'Not Started', workstream: 'ACU', assignee: 'ed@gtms.com', dueDate: addDays(now, 10) },
    { title: 'Consolidate Acumen insurance policies under group cover', type: 'My Action', priority: 'Medium', status: 'Not Started', workstream: 'ACU', assignee: 'june@geohan.com', dueDate: addDays(now, 30) },

    // === GPL & LICENSING (GPL) ===
    { title: 'Renew CIDB Grade G7 license', type: 'My Action', priority: 'Critical', status: 'In Progress', workstream: 'GPL', assignee: 'zul@geohan.com', dueDate: addDays(now, 14) },
    { title: 'Follow up with PKK on Class A contractor registration renewal', type: 'Waiting On', priority: 'High', status: 'Waiting On', workstream: 'GPL', assignee: 'zul@geohan.com', waitingOnWhom: 'PKK', dueDate: addDays(now, 10) },
    { title: 'Prepare SPAN license application for water infrastructure works', type: 'My Action', priority: 'High', status: 'Not Started', workstream: 'GPL', assignee: 'zul@geohan.com', dueDate: addDays(now, 21) },
    { title: 'Update company profile for prequalification submissions', type: 'My Action', priority: 'Medium', status: 'Not Started', workstream: 'GPL', assignee: 'zul@geohan.com', dueDate: addDays(now, 14) },
    { title: 'Review professional indemnity insurance coverage adequacy', type: 'Review', priority: 'Medium', status: 'Not Started', workstream: 'GPL', assignee: 'june@geohan.com', dueDate: addDays(now, 30) },

    // === ADMIN & GENERAL (ADM) ===
    { title: 'Review HQ office renovation proposal', type: 'Review', priority: 'Medium', status: 'In Progress', workstream: 'ADM', assignee: 'anis@geohan.com', dueDate: addDays(now, 14) },
    { title: 'Renew company vehicle fleet insurance', type: 'My Action', priority: 'High', status: 'Not Started', workstream: 'ADM', assignee: 'anis@geohan.com', dueDate: addDays(now, 21) },
    { title: 'Organize company dinner (Annual Dinner 2025)', type: 'My Action', priority: 'Medium', status: 'Not Started', workstream: 'ADM', assignee: 'anis@geohan.com', dueDate: addDays(now, 60) },
    { title: 'Review office supplies procurement contract renewal', type: 'My Action', priority: 'Low', status: 'Not Started', workstream: 'ADM', assignee: 'anis@geohan.com', dueDate: addDays(now, 30) },
    { title: 'Coordinate building maintenance with landlord (roof leak issue)', type: 'My Action', priority: 'High', status: 'In Progress', workstream: 'ADM', assignee: 'anis@geohan.com', dueDate: addDays(now, 3) },

    // === FUND & ACQUISITIONS (FAN) ===
    { title: 'Evaluate acquisition target: Borneo Piling Sdn Bhd', type: 'My Action', priority: 'Critical', status: 'In Progress', workstream: 'FAN', assignee: 'grace@geohan.com', dueDate: addDays(now, 21) },
    { title: 'Review term sheet from CIMB for revolving credit facility', type: 'Review', priority: 'High', status: 'Not Started', workstream: 'FAN', assignee: 'june@geohan.com', dueDate: addDays(now, 7) },
    { title: 'Follow up with AmBank on project financing drawdown', type: 'Waiting On', priority: 'High', status: 'Waiting On', workstream: 'FAN', assignee: 'grace@geohan.com', waitingOnWhom: 'AmBank', dueDate: addDays(now, 5) },
    { title: 'Prepare financial model for proposed acquisition', type: 'My Action', priority: 'High', status: 'In Progress', workstream: 'FAN', assignee: 'grace@geohan.com', dueDate: addDays(now, 14) },
    { title: 'Review sukuk issuance feasibility study', type: 'Decision', priority: 'Medium', status: 'Not Started', workstream: 'FAN', assignee: 'june@geohan.com', dueDate: addDays(now, 30) },

    // === TENDER & PROCUREMENT (TEN) ===
    { title: 'Submit KVMRT3 Package 2 tender by deadline', type: 'My Action', priority: 'Critical', status: 'In Progress', workstream: 'TEN', assignee: 'kumar@geohan.com', dueDate: addDays(now, 5) },
    { title: 'Prepare tender pricing for LRT3 extension piling works', type: 'My Action', priority: 'High', status: 'Not Started', workstream: 'TEN', assignee: 'kumar@geohan.com', dueDate: addDays(now, 14) },
    { title: 'Review subcontractor quotations for micropiling scope', type: 'Review', priority: 'High', status: 'In Progress', workstream: 'TEN', assignee: 'kumar@geohan.com', dueDate: addDays(now, 7) },
    { title: 'Follow up with main contractor on variation order (VO12) approval', type: 'Waiting On', priority: 'High', status: 'Waiting On', workstream: 'TEN', assignee: 'kumar@geohan.com', waitingOnWhom: 'IJM Corp', dueDate: addDays(now, 7) },
    { title: 'Negotiate bulk steel procurement contract for Q3-Q4', type: 'My Action', priority: 'High', status: 'Not Started', workstream: 'TEN', assignee: 'kumar@geohan.com', dueDate: addDays(now, 21) },
    { title: 'Review procurement policy and update delegation of authority', type: 'Review', priority: 'Medium', status: 'Not Started', workstream: 'TEN', assignee: 'ed@gtms.com', dueDate: addDays(now, 30) },

    // === RECURRING & REGULAR (RT) ===
    { title: 'Weekly ED catch-up with CFO', type: 'Recurring', priority: 'High', status: 'Not Started', workstream: 'RT', assignee: 'ed@gtms.com', dueDate: nextFriday(now), recurringCron: '0 10 * * 1' },
    { title: 'Monthly ExCo meeting preparation', type: 'Recurring', priority: 'High', status: 'Not Started', workstream: 'RT', assignee: 'lina@geohan.com', dueDate: addDays(startOfWeek(addMonths(now, 1)), 1), recurringCron: '0 9 1 * *' },
    { title: 'Quarterly Board meeting preparation', type: 'Recurring', priority: 'Critical', status: 'Not Started', workstream: 'RT', assignee: 'lina@geohan.com', dueDate: addMonths(now, 1), recurringCron: '0 9 1 1,4,7,10 *' },
    { title: 'Weekly operations review call', type: 'Recurring', priority: 'High', status: 'Not Started', workstream: 'RT', assignee: 'david@geohan.com', dueDate: nextFriday(now), recurringCron: '0 9 * * 3' },
    { title: 'Monthly project P&L review', type: 'Recurring', priority: 'High', status: 'Not Started', workstream: 'RT', assignee: 'june@geohan.com', dueDate: addDays(now, 15), recurringCron: '0 9 15 * *' },
    { title: 'Bi-weekly safety committee meeting', type: 'Recurring', priority: 'High', status: 'Not Started', workstream: 'RT', assignee: 'farah@geohan.com', dueDate: addDays(now, 14), recurringCron: '0 14 1,15 * *' },
    { title: 'Monthly HR dashboard update', type: 'Recurring', priority: 'Medium', status: 'Not Started', workstream: 'RT', assignee: 'sarah@geohan.com', dueDate: endOfMonth(now), recurringCron: '0 9 28 * *' },
    { title: 'Weekly IT helpdesk ticket review', type: 'Recurring', priority: 'Medium', status: 'Not Started', workstream: 'RT', assignee: 'kevin@geohan.com', dueDate: nextFriday(now), recurringCron: '0 16 * * 5' },
  ];

  let taskCount = 0;
  for (const t of tasks) {
    await prisma.task.create({
      data: {
        title: t.title,
        type: t.type,
        priority: t.priority,
        status: t.status,
        source: 'Manual',
        dueDate: t.dueDate,
        waitingOnWhom: t.waitingOnWhom || null,
        recurringCron: t.recurringCron || null,
        workstreamId: createdWorkstreams[t.workstream],
        assigneeId: createdUsers[t.assignee],
        createdById: edId,
      },
    });
    taskCount++;
  }
  console.log(`Seeded ${taskCount} tasks`);

  console.log('Seeding complete!');
  console.log(`\nLogin: ed@gtms.com / ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
