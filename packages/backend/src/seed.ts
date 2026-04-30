import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { addDays, addWeeks, nextFriday, endOfMonth, startOfWeek, addMonths } from 'date-fns';

const prisma = new PrismaClient();

const PASSWORD = 'Admin1234';

async function main() {
  console.log('Clearing all existing data...');

  // Delete in order (respect FK constraints)
  await prisma.attachment.deleteMany();
  await prisma.note.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.chatSession.deleteMany();
  await prisma.reminderLog.deleteMany();
  await prisma.task.deleteMany();
  await prisma.workstreamMember.deleteMany();
  await prisma.workstream.deleteMany();
  await prisma.user.deleteMany();
  await prisma.appSetting.deleteMany();

  console.log('All data cleared. Seeding...');
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  // --- USERS ---
  const users = [
    { email: 'ed@gtms.com', name: "Dato' Sri AR", role: 'ED', position: 'Executive Director', department: 'Board' },
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
    { email: 'alvin@geohan.com', name: 'Alvin Lau', role: 'STAFF', position: 'Internal Audit', department: 'Finance' },
    { email: 'yc@geohan.com', name: 'Yung Cien', role: 'STAFF', position: 'Executive', department: 'Admin' },
    { email: 'ken@geohan.com', name: 'Ken Ooi', role: 'STAFF', position: 'Executive', department: 'Finance' },
    { email: 'alia@geohan.com', name: 'Alia Razak', role: 'STAFF', position: 'Project Admin', department: 'Operations' },
    { email: 'joseph@geohan.com', name: 'Joseph Lim', role: 'STAFF', position: 'Compliance Officer', department: 'Legal' },
    { email: 'jiva@geohan.com', name: 'Jiva Kumar', role: 'STAFF', position: 'Finance Executive', department: 'Finance' },
    { email: 'athirah@geohan.com', name: 'Athirah Noor', role: 'STAFF', position: 'Finance Executive', department: 'Finance' },
    { email: 'jiemin@geohan.com', name: 'Jie Min', role: 'SUPER_ADMIN', position: 'IT & Digitalisation', department: 'IT' },
    { email: 'jinghui@geohan.com', name: 'Jing Hui', role: 'STAFF', position: 'Quantity Surveyor', department: 'Commercial' },
    { email: 'jeremy@geohan.com', name: 'Jeremy Loh', role: 'MANAGER', position: 'Site Manager', department: 'Operations' },
    { email: 'mroh@geohan.com', name: 'Mr Oh', role: 'MANAGER', position: 'Senior Manager', department: 'Operations' },
  ];

  const createdUsers: Record<string, string> = {};
  for (const u of users) {
    const { department, ...userData } = u;
    const user = await prisma.user.create({ data: { ...userData, passwordHash } });
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
    { code: 'ACU', name: 'Acumatica', color: '#ec4899', sortOrder: 10 },
    { code: 'GPL', name: 'GPL Singapore', color: '#14b8a6', sortOrder: 11 },
    { code: 'ADM', name: 'Admin & System', color: '#a855f7', sortOrder: 12 },
    { code: 'FAN', name: 'Financial Analysis & Simulation', color: '#06b6d4', sortOrder: 13 },
    { code: 'TEN', name: 'Tender & Contract', color: '#d97706', sortOrder: 14 },
    { code: 'RT', name: 'Recurring & Regular', color: '#78716c', sortOrder: 15 },
  ];

  const ws: Record<string, string> = {};
  for (const w of workstreams) {
    const created = await prisma.workstream.create({ data: w });
    ws[w.code] = created.id;
  }
  console.log(`Seeded ${workstreams.length} workstreams`);

  // --- WORKSTREAM MEMBERS ---
  // Map users to workstreams with roles based on their responsibilities
  const workstreamMembers: { email: string; wsCode: string; role: string }[] = [
    // ED is member of all workstreams as HOD
    ...workstreams.map(w => ({ email: 'ed@gtms.com', wsCode: w.code, role: 'HOD' })),
    // SUPER_ADMIN (Jie Min) - IT, ACU, ADM workstreams
    { email: 'jiemin@geohan.com', wsCode: 'IT', role: 'HOD' },
    { email: 'jiemin@geohan.com', wsCode: 'ACU', role: 'HOD' },
    { email: 'jiemin@geohan.com', wsCode: 'ADM', role: 'MANAGER' },
    // Finance HOD
    { email: 'june@geohan.com', wsCode: 'FIN', role: 'HOD' },
    { email: 'june@geohan.com', wsCode: 'FAN', role: 'HOD' },
    { email: 'june@geohan.com', wsCode: 'ACU', role: 'MANAGER' },
    // IT HOD
    { email: 'kevin@geohan.com', wsCode: 'IT', role: 'MANAGER' },
    // HR HOD
    { email: 'sarah@geohan.com', wsCode: 'HR', role: 'HOD' },
    // Operations HOD
    { email: 'david@geohan.com', wsCode: 'OPS', role: 'HOD' },
    // ESG HOD
    { email: 'farah@geohan.com', wsCode: 'ESG', role: 'HOD' },
    // IR HOD
    { email: 'rajan@geohan.com', wsCode: 'IR', role: 'HOD' },
    // Legal HOD
    { email: 'lina@geohan.com', wsCode: 'LEG', role: 'HOD' },
    { email: 'lina@geohan.com', wsCode: 'TEN', role: 'MANAGER' },
    // Commercial HOD
    { email: 'ahmad@geohan.com', wsCode: 'COM', role: 'HOD' },
    // Managers
    { email: 'mei@geohan.com', wsCode: 'FIN', role: 'MANAGER' },
    { email: 'james@geohan.com', wsCode: 'IT', role: 'STAFF' },
    { email: 'anis@geohan.com', wsCode: 'ADM', role: 'HOD' },
    { email: 'kumar@geohan.com', wsCode: 'TEN', role: 'HOD' },
    { email: 'grace@geohan.com', wsCode: 'FAN', role: 'MANAGER' },
    { email: 'zul@geohan.com', wsCode: 'GPL', role: 'HOD' },
    { email: 'zul@geohan.com', wsCode: 'ADM', role: 'STAFF' },
    // Staff
    { email: 'rachel@geohan.com', wsCode: 'FIN', role: 'STAFF' },
    { email: 'alvin@geohan.com', wsCode: 'FIN', role: 'STAFF' },
    { email: 'alvin@geohan.com', wsCode: 'ESG', role: 'STAFF' },
    { email: 'yc@geohan.com', wsCode: 'ACU', role: 'STAFF' },
    { email: 'yc@geohan.com', wsCode: 'ADM', role: 'STAFF' },
    { email: 'ken@geohan.com', wsCode: 'FIN', role: 'STAFF' },
    { email: 'alia@geohan.com', wsCode: 'OPS', role: 'STAFF' },
    { email: 'joseph@geohan.com', wsCode: 'LEG', role: 'STAFF' },
    { email: 'jiva@geohan.com', wsCode: 'FIN', role: 'STAFF' },
    { email: 'athirah@geohan.com', wsCode: 'FIN', role: 'STAFF' },
    { email: 'jinghui@geohan.com', wsCode: 'COM', role: 'STAFF' },
    { email: 'jinghui@geohan.com', wsCode: 'FIN', role: 'STAFF' },
    { email: 'jeremy@geohan.com', wsCode: 'OPS', role: 'STAFF' },
    { email: 'jeremy@geohan.com', wsCode: 'FIN', role: 'STAFF' },
    { email: 'mroh@geohan.com', wsCode: 'OPS', role: 'MANAGER' },
    // STR workstream - strategic roles
    { email: 'june@geohan.com', wsCode: 'STR', role: 'STAFF' },
    { email: 'lina@geohan.com', wsCode: 'STR', role: 'STAFF' },
  ];

  let memberCount = 0;
  for (const m of workstreamMembers) {
    const userId = createdUsers[m.email];
    const workstreamId = ws[m.wsCode];
    if (userId && workstreamId) {
      await prisma.workstreamMember.create({
        data: { userId, workstreamId, role: m.role },
      });
      memberCount++;
    }
  }
  console.log(`Seeded ${memberCount} workstream members`);

  // --- HELPERS ---
  const now = new Date();
  const edId = createdUsers['ed@gtms.com'];

  interface TaskDef {
    title: string;
    type?: string;
    priority?: string;
    status?: string;
    workstream: string;
    assignee?: string;
    dueDate?: Date | null;
    waitingOnWhom?: string;
    description?: string;
    subtasks?: { title: string; status?: string }[];
  }

  async function createTaskWithSubtasks(t: TaskDef) {
    const task = await prisma.task.create({
      data: {
        title: t.title,
        description: t.description || null,
        type: t.type || 'My Action',
        priority: t.priority || 'Medium',
        status: t.status || 'Not Started',
        source: 'Manual',
        dueDate: t.dueDate || null,
        waitingOnWhom: t.waitingOnWhom || null,
        workstreamId: ws[t.workstream],
        assigneeId: t.assignee ? createdUsers[t.assignee] : null,
        createdById: edId,
      },
    });
    if (t.subtasks) {
      for (const sub of t.subtasks) {
        await prisma.task.create({
          data: {
            title: sub.title,
            type: 'My Action',
            priority: t.priority || 'Medium',
            status: sub.status || 'Not Started',
            source: 'Manual',
            parentId: task.id,
            workstreamId: ws[t.workstream],
            assigneeId: t.assignee ? createdUsers[t.assignee] : null,
            createdById: edId,
          },
        });
      }
    }
    return task;
  }

  // =============================================
  // MAIN SUBJECT AREA / SCOPE (No HOD - ED tasks)
  // =============================================

  // Operations / Subcon items
  const opsTasks: TaskDef[] = [
    { title: 'Subcon management material take out', workstream: 'OPS', priority: 'High', assignee: 'ed@gtms.com', dueDate: addDays(now, 14) },
    { title: 'Cost code and lakefront spun pile', workstream: 'OPS', priority: 'High', assignee: 'ed@gtms.com', dueDate: addDays(now, 14) },
    { title: 'Budget vs actual', workstream: 'FIN', priority: 'High', assignee: 'ed@gtms.com', dueDate: addDays(now, 7) },
    { title: 'Cost code ordering system', workstream: 'ACU', priority: 'Medium', assignee: 'jiemin@geohan.com', dueDate: addDays(now, 21) },
    { title: 'Slope monitoring new business development', workstream: 'COM', priority: 'Medium', assignee: 'ed@gtms.com', dueDate: addDays(now, 30) },
    { title: 'Can we reduce site flood? New competitive advantage', workstream: 'OPS', priority: 'Medium', assignee: 'david@geohan.com', dueDate: addDays(now, 30), type: 'Decision' },
  ];

  // =============================================
  // ED MAIN TASK LIST (Items 1-27)
  // =============================================
  const edMainTasks: TaskDef[] = [
    {
      title: 'NSRF - S1 S2 Confirm if we include in ESG framework',
      workstream: 'ESG', priority: 'High', assignee: 'farah@geohan.com', dueDate: addDays(now, 14),
    },
    {
      title: 'Write to lawyer of rencana for clearance letter from bank',
      workstream: 'LEG', priority: 'High', assignee: 'lina@geohan.com', dueDate: addDays(now, 7),
    },
    {
      title: 'Check with Joseph on Contractor code of ethics',
      workstream: 'LEG', priority: 'Medium', assignee: 'joseph@geohan.com', dueDate: addDays(now, 10),
    },
    {
      title: 'Study listing guidelines and MCCG code, charters, COI',
      workstream: 'STR', priority: 'High', assignee: 'ed@gtms.com', dueDate: addDays(now, 21),
    },
    {
      title: 'Gantt chart for each department',
      workstream: 'ADM', priority: 'Medium', assignee: 'jiemin@geohan.com', dueDate: addDays(now, 30),
    },
    {
      title: 'The Louvre',
      workstream: 'STR', priority: 'Low', assignee: 'ed@gtms.com', dueDate: addDays(now, 60),
    },
    {
      title: 'Rental agreement between GSB and GESB for land',
      workstream: 'LEG', priority: 'High', assignee: 'lina@geohan.com', dueDate: addDays(now, 14),
    },
    {
      title: 'CP500 LKS',
      workstream: 'FIN', priority: 'Medium', assignee: 'june@geohan.com', dueDate: addDays(now, 14),
    },
    {
      title: 'KPI setting, performance incentive, pending KD, framework for remcom',
      workstream: 'HR', priority: 'High', assignee: 'sarah@geohan.com', dueDate: addDays(now, 14),
      subtasks: [
        { title: 'Review the KPI setting paper, and chart it out into policy' },
      ],
    },
    {
      title: 'Dividend policy',
      workstream: 'FIN', priority: 'High', assignee: 'june@geohan.com', dueDate: addDays(now, 21),
      subtasks: [
        { title: 'Study market for dividend policy benchmarks' },
      ],
    },
    {
      title: 'Stamp duty exemption application - write up',
      workstream: 'FIN', priority: 'High', assignee: 'ed@gtms.com', dueDate: addDays(now, 14),
      subtasks: [
        { title: 'Read Yung Cien write up' },
        { title: 'Clean up Claude write up' },
      ],
    },
    {
      title: 'Singapore budget and direction setting',
      workstream: 'GPL', priority: 'High', assignee: 'zul@geohan.com', dueDate: addDays(now, 21),
    },
    {
      title: 'Authority matrix',
      workstream: 'STR', priority: 'High', assignee: 'ed@gtms.com', dueDate: addDays(now, 14),
      subtasks: [
        { title: 'Remember to add for BOD sign off' },
      ],
    },
    {
      title: 'Succession planning',
      workstream: 'HR', priority: 'High', assignee: 'sarah@geohan.com', dueDate: addDays(now, 30),
    },
    {
      title: 'AI usage policy',
      workstream: 'IT', priority: 'Medium', assignee: 'jiemin@geohan.com', dueDate: addDays(now, 21),
    },
    {
      title: 'Analysing daily site progress',
      workstream: 'OPS', priority: 'High', assignee: 'david@geohan.com', dueDate: addDays(now, 7),
    },
    {
      title: 'Report management system',
      workstream: 'IT', priority: 'High', assignee: 'jiemin@geohan.com', dueDate: addDays(now, 14),
      subtasks: [
        { title: 'Planning usage' },
        { title: 'Prepare briefing' },
      ],
    },
    {
      title: 'Do comparison between meeting per day and meeting allowance per meeting',
      workstream: 'HR', priority: 'Medium', assignee: 'sarah@geohan.com', dueDate: addDays(now, 14),
    },
    {
      title: 'ABC planning',
      workstream: 'STR', priority: 'Medium', assignee: 'ed@gtms.com', dueDate: addDays(now, 21),
    },
    {
      title: 'Read sustainability',
      workstream: 'ESG', priority: 'Low', assignee: 'ed@gtms.com', dueDate: addDays(now, 14),
    },
    {
      title: 'Check Jiva table on remuneration',
      workstream: 'HR', priority: 'Medium', status: 'Done', assignee: 'jiva@geohan.com', dueDate: addDays(now, -3),
    },
    {
      title: 'Training for directors sign',
      workstream: 'HR', priority: 'Medium', assignee: 'sarah@geohan.com', dueDate: addDays(now, 21),
    },
    {
      title: 'OCBC form, arrange trip to Singapore',
      workstream: 'FIN', priority: 'High', assignee: 'june@geohan.com', dueDate: addDays(now, 14),
    },
    {
      title: 'Internal audit checking',
      workstream: 'FIN', priority: 'High', assignee: 'alvin@geohan.com', dueDate: addDays(now, 14),
      subtasks: [
        { title: 'Check Alvin work' },
        { title: 'Check YC' },
        { title: 'Check Ken' },
      ],
    },
    {
      title: 'Viia SPA',
      workstream: 'LEG', priority: 'High', status: 'Waiting On', assignee: 'lina@geohan.com', dueDate: addDays(now, 21), waitingOnWhom: 'Taksiran pending',
      subtasks: [
        { title: 'Now pending taksiran' },
      ],
    },
    {
      title: 'Read minutes',
      workstream: 'STR', priority: 'Medium', assignee: 'ed@gtms.com', dueDate: addDays(now, 7),
      subtasks: [
        { title: 'RC minutes' },
        { title: 'NC minutes' },
        { title: 'ARMC minutes' },
      ],
    },
    {
      title: 'OCBC form',
      workstream: 'FIN', priority: 'High', assignee: 'june@geohan.com', dueDate: addDays(now, 14),
      subtasks: [
        { title: 'Apply e-giro form' },
        { title: 'Appoint Jiva, HRPlus and Athirah as maker' },
        { title: 'June account activate' },
        { title: 'Appoint Jie Min as authorizer - need to send in new passport' },
      ],
    },
  ];

  // =============================================
  // WEEKEND TO DO
  // =============================================
  const weekendTasks: TaskDef[] = [
    { title: 'Check unit cost message by Jing Hui on the 23rd Apr', workstream: 'FIN', priority: 'High', assignee: 'ed@gtms.com', dueDate: addDays(now, 3) },
    { title: 'Profit takeup projects - go through one by one - Apr margins comparison', workstream: 'FIN', priority: 'High', assignee: 'ed@gtms.com', dueDate: addDays(now, 3) },
    { title: 'Project costing recon', workstream: 'FIN', priority: 'High', assignee: 'ed@gtms.com', dueDate: addDays(now, 3) },
    { title: 'GESB recon', workstream: 'FIN', priority: 'High', assignee: 'ed@gtms.com', dueDate: addDays(now, 3) },
  ];

  // =============================================
  // PERSONAL / MISC
  // =============================================
  const personalTasks: TaskDef[] = [
    { title: 'RM40k from daddy 29 May', workstream: 'FIN', priority: 'Low', assignee: 'ed@gtms.com', dueDate: addDays(now, 56) },
    { title: '6pDRXp7OlgD6 code lenovo', workstream: 'IT', priority: 'Low', assignee: 'ed@gtms.com', description: 'Lenovo redemption code' },
  ];

  // =============================================
  // ACUMATICA (ACU)
  // =============================================
  const acuTasks: TaskDef[] = [
    { title: 'Design report to track online payment approvals', workstream: 'ACU', priority: 'High', assignee: 'jiemin@geohan.com', dueDate: addDays(now, 21) },
    { title: 'Review cash flow', workstream: 'ACU', priority: 'High', assignee: 'june@geohan.com', dueDate: addDays(now, 14) },
    { title: 'Acumatica dashboard', workstream: 'ACU', priority: 'Medium', assignee: 'jiemin@geohan.com', dueDate: addDays(now, 30) },
    { title: 'Change request form - for claim', workstream: 'ACU', priority: 'Medium', assignee: 'jiemin@geohan.com', dueDate: addDays(now, 21) },
    { title: 'Share financing', workstream: 'ACU', priority: 'Medium', assignee: 'june@geohan.com', dueDate: addDays(now, 14) },
    { title: 'Check inventory code mapping', workstream: 'ACU', priority: 'Medium', assignee: 'yc@geohan.com', dueDate: addDays(now, 14) },
    { title: 'Acumatica payment - check HRDF', workstream: 'ACU', priority: 'Medium', assignee: 'june@geohan.com', dueDate: addDays(now, 7) },
    { title: 'GESB Inventory code check - Check inventory code again and feedback', workstream: 'ACU', priority: 'Medium', assignee: 'yc@geohan.com', dueDate: addDays(now, 14) },
    { title: 'Outstanding item list', workstream: 'ACU', priority: 'High', assignee: 'jiemin@geohan.com', dueDate: addDays(now, 7) },
    { title: "YC's request class, item code", workstream: 'ACU', priority: 'Medium', assignee: 'yc@geohan.com', dueDate: addDays(now, 14) },
    { title: 'PRF form', workstream: 'ACU', priority: 'Medium', assignee: 'jiemin@geohan.com', dueDate: addDays(now, 21) },
    { title: 'Petty cash form', workstream: 'ACU', priority: 'Medium', assignee: 'jiemin@geohan.com', dueDate: addDays(now, 21) },
    { title: 'CPS - estimated work done by type of work, debit note', workstream: 'ACU', priority: 'High', assignee: 'jiemin@geohan.com', dueDate: addDays(now, 14) },
    { title: 'Training for approvers', workstream: 'ACU', priority: 'Medium', assignee: 'jiemin@geohan.com', dueDate: addDays(now, 30) },
  ];

  // =============================================
  // GPL Singapore (GPL)
  // =============================================
  const gplTasks: TaskDef[] = [
    { title: 'GPL Tax for personnel - do we need to pay tax in Singapore if tax residency in Malaysia', workstream: 'GPL', priority: 'High', assignee: 'zul@geohan.com', dueDate: addDays(now, 14), type: 'Decision' },
    { title: 'GPL salary', workstream: 'GPL', priority: 'High', assignee: 'zul@geohan.com', dueDate: addDays(now, 14) },
    { title: 'GPL recruiter', workstream: 'GPL', priority: 'Medium', assignee: 'zul@geohan.com', dueDate: addDays(now, 21) },
    { title: 'GPL outsource HR', workstream: 'GPL', priority: 'Medium', assignee: 'zul@geohan.com', dueDate: addDays(now, 21) },
    { title: 'GPL forecast', workstream: 'GPL', priority: 'High', assignee: 'zul@geohan.com', dueDate: addDays(now, 14) },
    { title: 'GPL tender and project database', workstream: 'GPL', priority: 'Medium', assignee: 'zul@geohan.com', dueDate: addDays(now, 30) },
    { title: 'GPL handover notes', workstream: 'GPL', priority: 'High', assignee: 'zul@geohan.com', dueDate: addDays(now, 7) },
  ];

  // =============================================
  // ADMIN & SYSTEM (ADM)
  // =============================================
  const admTasks: TaskDef[] = [
    { title: 'System training for engineer', workstream: 'ADM', priority: 'Medium', assignee: 'jiemin@geohan.com', dueDate: addDays(now, 30) },
    { title: 'System training for site supervisor', workstream: 'ADM', priority: 'Medium', assignee: 'jiemin@geohan.com', dueDate: addDays(now, 30) },
    { title: 'System training for safety', workstream: 'ADM', priority: 'Medium', assignee: 'jiemin@geohan.com', dueDate: addDays(now, 30) },
    { title: 'R&D', workstream: 'ADM', priority: 'Low', assignee: 'ed@gtms.com', dueDate: addDays(now, 60) },
    { title: 'Centralised CLQ - CLQ policy', workstream: 'ADM', priority: 'Medium', assignee: 'anis@geohan.com', dueDate: addDays(now, 30) },
    { title: 'If QA fails: Reporting - Flag out system process to rectify and train - Process improvement plan', workstream: 'ADM', priority: 'High', assignee: 'ed@gtms.com', dueDate: addDays(now, 21), description: 'Question is which part to get PD buy in' },
    {
      title: 'ESG - Assurance 2027 - Form up fundamental',
      workstream: 'ESG', priority: 'High', assignee: 'farah@geohan.com', dueDate: addDays(now, 30),
      description: 'Risk register EAIR Finance, Governance, Safety - Board training to confirm if can do Fri 23rd Jan 4-5pm',
    },
    { title: 'SOP to gather data, adopt assurance, what is the process to adopt this standard', workstream: 'ESG', priority: 'Medium', assignee: 'farah@geohan.com', dueDate: addDays(now, 30) },
    { title: 'Jan - ESG SOP drafting, ESG data collection parallel run and trials for 2026 data - IA - Present ERM to board, elect IA - MCCG training', workstream: 'ESG', priority: 'High', assignee: 'farah@geohan.com', dueDate: addDays(now, -60), status: 'Done' },
    { title: 'Feb - ESG Data collecting for past data for 2025 - Finalise IA plan', workstream: 'ESG', priority: 'High', assignee: 'farah@geohan.com', dueDate: addDays(now, -30), status: 'Done' },
    { title: 'Mar - ESG Results 2025 tabulation - IA fieldwork', workstream: 'ESG', priority: 'High', assignee: 'farah@geohan.com', dueDate: addDays(now, -7) },
    { title: 'Apr - ESG Sustainability statement', workstream: 'ESG', priority: 'High', assignee: 'farah@geohan.com', dueDate: addDays(now, 27) },
    { title: 'May - IA Report', workstream: 'ESG', priority: 'High', assignee: 'alvin@geohan.com', dueDate: addDays(now, 57) },
    { title: 'June - Interview ESG Assurance provider', workstream: 'ESG', priority: 'Medium', assignee: 'farah@geohan.com', dueDate: addDays(now, 87) },
    { title: 'Policy, framework, SOP - MCCG (Jan)', workstream: 'ESG', priority: 'High', assignee: 'ed@gtms.com', dueDate: addDays(now, -60), status: 'Done' },
    { title: 'Alia - projection on resources (Workdone, manpower, material) - Reporting standardisation', workstream: 'OPS', priority: 'High', assignee: 'alia@geohan.com', dueDate: addDays(now, 14) },
    { title: 'Admin budget', workstream: 'ADM', priority: 'Medium', assignee: 'anis@geohan.com', dueDate: addDays(now, 21) },
    { title: 'Collection risk, business tender slow, underground risk, material pricing risk', workstream: 'STR', priority: 'High', assignee: 'ed@gtms.com', dueDate: addDays(now, 14), type: 'Review' },
    { title: 'ISO, operations inventory and safety asset, safety, tender questionnaire', workstream: 'ADM', priority: 'Medium', assignee: 'anis@geohan.com', dueDate: addDays(now, 30) },
    { title: '50%/Establish monthly meeting and reporting', workstream: 'ADM', priority: 'Medium', assignee: 'ed@gtms.com', dueDate: addDays(now, 14) },
    { title: 'Circulate memo to company on info flow to project admin if required', workstream: 'ADM', priority: 'Medium', assignee: 'anis@geohan.com', dueDate: addDays(now, 7) },
    { title: 'Review insurance', workstream: 'ADM', priority: 'Medium', assignee: 'june@geohan.com', dueDate: addDays(now, 21), type: 'Review' },
    { title: 'Revert on intercompany car rental', workstream: 'ADM', priority: 'Low', assignee: 'anis@geohan.com', dueDate: addDays(now, 14) },
    { title: 'GMSB CIDB', workstream: 'ADM', priority: 'Medium', assignee: 'zul@geohan.com', dueDate: addDays(now, 21) },
    { title: 'Roof contractor', workstream: 'ADM', priority: 'High', assignee: 'anis@geohan.com', dueDate: addDays(now, 7) },
  ];

  // =============================================
  // FINANCIAL ANALYSIS & SIMULATION (FAN)
  // =============================================
  const fanTasks: TaskDef[] = [
    { title: 'KL East/Flora to breakdown the loss components - what is the root cause. Compare to budget and analyse top three cost components', workstream: 'FAN', priority: 'Critical', assignee: 'june@geohan.com', dueDate: addDays(now, 7) },
    { title: 'BP work order 100mil in hand, currently boss forecast 20mil loss. Analyse this 100mil BP work and the margin', workstream: 'FAN', priority: 'Critical', assignee: 'june@geohan.com', dueDate: addDays(now, 7) },
    { title: 'BG scheme scenario analysis. Sell at 10th year, 15th year. Compare the revenue, cost and tax impact', workstream: 'FAN', priority: 'High', assignee: 'grace@geohan.com', dueDate: addDays(now, 14) },
    { title: 'Analyse transport', workstream: 'FAN', priority: 'Medium', assignee: 'june@geohan.com', dueDate: addDays(now, 21) },
  ];

  // =============================================
  // HR (HR)
  // =============================================
  const hrTasks: TaskDef[] = [
    { title: 'Slides for weekly meeting SMM budget vs actual', workstream: 'HR', priority: 'High', assignee: 'sarah@geohan.com', dueDate: addDays(now, 3), type: 'Recurring' },
    { title: 'Assist in performance assessment', workstream: 'HR', priority: 'High', assignee: 'sarah@geohan.com', dueDate: addDays(now, 14) },
    { title: 'Remuneration framework, balance scorecard, discretionary reasons to be documented (KPI meeting)', workstream: 'HR', priority: 'High', assignee: 'sarah@geohan.com', dueDate: addDays(now, 21) },
    { title: 'Succession planning', workstream: 'HR', priority: 'High', assignee: 'sarah@geohan.com', dueDate: addDays(now, 30) },
    { title: 'Handbook', workstream: 'HR', priority: 'Medium', assignee: 'sarah@geohan.com', dueDate: addDays(now, 45) },
    { title: 'Jobs and responsibility, Roadmap for each role', workstream: 'HR', priority: 'Medium', assignee: 'sarah@geohan.com', dueDate: addDays(now, 30) },
  ];

  // =============================================
  // FINANCE (FIN)
  // =============================================
  const finTasks: TaskDef[] = [
    { title: 'Check project costing profit - high side', workstream: 'FIN', priority: 'High', assignee: 'june@geohan.com', dueDate: addDays(now, 7) },
    { title: 'Check month to month profit recognition. If cut off June, what is the results in 2023, 2022', workstream: 'FIN', priority: 'High', assignee: 'june@geohan.com', dueDate: addDays(now, 14) },
    { title: 'Follow up - Jeremy Loh subcontract backcharge', workstream: 'FIN', priority: 'High', assignee: 'jeremy@geohan.com', dueDate: addDays(now, 7), type: 'Waiting On', waitingOnWhom: 'Jeremy Loh' },
    {
      title: 'Check wages 2nd Half 90%/Check foreign subcon - brief June, Mr Oh and Jeremy Loh, how to treat moving forward',
      workstream: 'FIN', priority: 'Critical', assignee: 'june@geohan.com', dueDate: addDays(now, 7),
      subtasks: [
        { title: 'Check foreign pass' },
        { title: 'Steps for future: June to check ID of subcon (company or individual)' },
        { title: 'If foreigner, get passport or PR, permit page/e-pass and CIDB card photos' },
        { title: 'If foreigner has valid PR and valid CIDB, continue as per normal subcontractor certification and payment' },
        { title: 'If CIDB is expired, request them to renew, otherwise all certification and payment is rejected' },
        { title: 'If foreigner is not PR, award and pay through appointment. Check if proxy is Malaysian and have CIDB' },
        { title: 'Prepare contract agreement signed by both parties' },
      ],
    },
    {
      title: 'Finding list',
      workstream: 'FIN', priority: 'Medium', assignee: 'alvin@geohan.com', dueDate: addDays(now, 14),
      subtasks: [
        { title: 'Scrap iron' },
        { title: 'Mobile app' },
      ],
    },
    { title: 'Alvin on previous years cash', workstream: 'FIN', priority: 'Medium', assignee: 'alvin@geohan.com', dueDate: addDays(now, 14) },
  ];

  // =============================================
  // IT (IT)
  // =============================================
  const itTasks: TaskDef[] = [
    // Q1
    { title: 'AI Proof of Concept with Contract Department', workstream: 'IT', priority: 'High', assignee: 'kevin@geohan.com', dueDate: addDays(now, 30), description: 'Q1 target' },
    { title: 'Moodle Launch (LMS)', workstream: 'IT', priority: 'High', assignee: 'kevin@geohan.com', dueDate: addDays(now, 30), description: 'Q1 target' },
    { title: 'Posting IT Bulletin every month', workstream: 'IT', priority: 'Low', assignee: 'james@geohan.com', dueDate: endOfMonth(now), type: 'Recurring' },
    { title: 'Site CCTV monitor access', workstream: 'IT', priority: 'Medium', assignee: 'james@geohan.com', dueDate: addDays(now, 30) },
    // Q2
    { title: 'Jodoo Subscription upgrade to Enterprise', workstream: 'IT', priority: 'Medium', assignee: 'kevin@geohan.com', dueDate: addDays(now, 60), description: 'Q2 target' },
    { title: 'Getting Cybersecurity Training / Certified Train-the-trainer', workstream: 'IT', priority: 'High', assignee: 'kevin@geohan.com', dueDate: addDays(now, 60), description: 'Q2 target' },
    { title: 'Server Consolidation Project', workstream: 'IT', priority: 'High', assignee: 'james@geohan.com', dueDate: addDays(now, 60), description: 'Q2 target' },
    // Q3
    { title: 'Firewall replacement upgrade project (for HQ & Warehouse)', workstream: 'IT', priority: 'High', assignee: 'james@geohan.com', dueDate: addDays(now, 120), description: 'Q3 target' },
    { title: 'Data Backup & Recovery Enhancement - 2 way backup (HQ & Warehouse)', workstream: 'IT', priority: 'High', assignee: 'james@geohan.com', dueDate: addDays(now, 120), description: 'Q3 target' },
    // Q4
    { title: 'Implement AI Adoption for every department', workstream: 'IT', priority: 'High', assignee: 'kevin@geohan.com', dueDate: addDays(now, 180), description: 'Q4 target' },
    // App development
    { title: 'OCR for Statement Reconciliation (DO, supplier invoice, bank statement, supplier statement) for Finance Department', workstream: 'IT', priority: 'High', assignee: 'jiemin@geohan.com', dueDate: addDays(now, 30), description: 'Q1 App' },
    { title: 'Acumatica Claim Feature for Contract Department', workstream: 'IT', priority: 'High', assignee: 'jiemin@geohan.com', dueDate: addDays(now, 30), description: 'Q1 App' },
    { title: 'Launch welding app for HR and Drilling Centre team', workstream: 'IT', priority: 'Medium', assignee: 'jiemin@geohan.com', dueDate: addDays(now, 30), description: 'Q1 App' },
    { title: 'ESG Data collection on CSI Solution portal', workstream: 'IT', priority: 'Medium', assignee: 'jiemin@geohan.com', dueDate: addDays(now, 30), description: 'Q1 App' },
    // Q2 Apps
    { title: 'Field Log in Acumatica for Operations Department', workstream: 'IT', priority: 'High', assignee: 'jiemin@geohan.com', dueDate: addDays(now, 60), description: 'Q2 App' },
    { title: 'GDN App Development for Warehouse and Operations Department', workstream: 'IT', priority: 'High', assignee: 'jiemin@geohan.com', dueDate: addDays(now, 60), description: 'Q2 App' },
    // Q3 Apps
    { title: 'GDN App Launch for Warehouse and Operations Department', workstream: 'IT', priority: 'High', assignee: 'jiemin@geohan.com', dueDate: addDays(now, 120), description: 'Q3 App' },
    // Q4 Apps
    { title: 'Redevelop BPMS App', workstream: 'IT', priority: 'Medium', assignee: 'jiemin@geohan.com', dueDate: addDays(now, 180), description: 'Q4 App' },
    // Other IT
    { title: 'OCR petty cash', workstream: 'IT', priority: 'Medium', assignee: 'jiemin@geohan.com', dueDate: addDays(now, 45) },
    { title: 'PRF forms', workstream: 'IT', priority: 'Medium', assignee: 'jiemin@geohan.com', dueDate: addDays(now, 45) },
    { title: 'Dashboard for senior management', workstream: 'IT', priority: 'High', assignee: 'jiemin@geohan.com', dueDate: addDays(now, 30) },
    { title: 'Dashboard for site manager / site PIC', workstream: 'IT', priority: 'Medium', assignee: 'jiemin@geohan.com', dueDate: addDays(now, 45) },
    { title: 'WhatsApp API with Acumatica, implement reports out to WhatsApp group', workstream: 'IT', priority: 'Medium', assignee: 'jiemin@geohan.com', dueDate: addDays(now, 60) },
  ];

  // =============================================
  // TENDER & CONTRACT (TEN)
  // =============================================
  const tenTasks: TaskDef[] = [
    {
      title: 'Tender process documentation and workflow',
      workstream: 'TEN', priority: 'High', assignee: 'kumar@geohan.com', dueDate: addDays(now, 21),
      description: 'Full tender document set (PDF). BQ summary excel. Cost estimation (Cost-BP Conf/CAD). Addendums/revisions.',
      subtasks: [
        { title: 'Generate BQ Summary excel file from tender documents' },
        { title: 'Work on cost estimation (Cost-BP Conf and CAD options)' },
        { title: 'Handle addendums and revisions to BQ Summary' },
        { title: 'Generate formal CAD Bills of Quantities for submission' },
      ],
    },
    {
      title: 'Post-Contract (Award) - progress claim excel file setup',
      workstream: 'TEN', priority: 'High', assignee: 'kumar@geohan.com', dueDate: addDays(now, 14),
      description: 'Description from full BQ. Qty and price follow awarded BQ summary. Set formulas.',
    },
    {
      title: 'Contract Review process',
      workstream: 'TEN', priority: 'High', assignee: 'lina@geohan.com', dueDate: addDays(now, 21),
      description: 'Letter of Award T&C review. Standard forms PAM 2006/2018. Addendum/Amendments to Conditions of Contract. Specifications review.',
      subtasks: [
        { title: 'Review Letter of Award terms and conditions' },
        { title: 'Review standard forms of contract (PAM 2006/2018)' },
        { title: 'Review Addendum/Amendments to Conditions of Contract' },
        { title: 'Go through specifications' },
      ],
    },
  ];

  // =============================================
  // CREATE ALL TASKS
  // =============================================
  const allTasks = [
    ...opsTasks, ...edMainTasks, ...weekendTasks, ...personalTasks,
    ...acuTasks, ...gplTasks, ...admTasks, ...fanTasks, ...hrTasks,
    ...finTasks, ...itTasks, ...tenTasks,
  ];

  let taskCount = 0;
  let subtaskCount = 0;
  for (const t of allTasks) {
    const task = await createTaskWithSubtasks(t);
    taskCount++;
    subtaskCount += t.subtasks?.length || 0;
  }

  console.log(`Seeded ${taskCount} tasks + ${subtaskCount} subtasks`);
  console.log('Seeding complete!');
  console.log(`\nLogin: ed@gtms.com / ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
