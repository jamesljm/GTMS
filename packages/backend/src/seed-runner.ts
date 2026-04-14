import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { addDays, endOfMonth } from 'date-fns';

const PASSWORD = 'Admin1234';

export async function runSeed() {
  const prisma = new PrismaClient();
  try {
    console.log('Clearing all existing data...');
    await prisma.notification.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.taskProposal.deleteMany();
    await prisma.userAssignment.deleteMany();
    await prisma.attachment.deleteMany();
    await prisma.note.deleteMany();
    await prisma.chatMessage.deleteMany();
    await prisma.chatSession.deleteMany();
    await prisma.reminderLog.deleteMany();
    await prisma.workstreamMember.deleteMany();
    await prisma.task.deleteMany();
    await prisma.workstream.deleteMany();
    // Clear department headId before deleting users (FK constraint)
    await prisma.department.updateMany({ data: { headId: null } });
    await prisma.user.deleteMany();
    await prisma.department.deleteMany();
    await prisma.appSetting.deleteMany();
    console.log('All data cleared.');

    const passwordHash = await bcrypt.hash(PASSWORD, 12);
    const now = new Date();

    // --- DEPARTMENTS ---
    const deptDefs = [
      { name: 'Board', code: 'BRD', color: '#1e293b', sortOrder: 0 },
      { name: 'Finance', code: 'FIN', color: '#ef4444', sortOrder: 1 },
      { name: 'IT', code: 'IT', color: '#10b981', sortOrder: 2 },
      { name: 'HR', code: 'HR', color: '#f97316', sortOrder: 3 },
      { name: 'Operations', code: 'OPS', color: '#8b5cf6', sortOrder: 4 },
      { name: 'ESG', code: 'ESG', color: '#22c55e', sortOrder: 5 },
      { name: 'Investor Relations', code: 'IR', color: '#3b82f6', sortOrder: 6 },
      { name: 'Legal', code: 'LEG', color: '#64748b', sortOrder: 7 },
      { name: 'Commercial', code: 'COM', color: '#f59e0b', sortOrder: 8 },
      { name: 'Admin', code: 'ADM', color: '#a855f7', sortOrder: 9 },
      { name: 'Fund & Acquisitions', code: 'FNA', color: '#06b6d4', sortOrder: 10 },
      { name: 'GPL', code: 'GPL', color: '#14b8a6', sortOrder: 11 },
      { name: 'Tender', code: 'TEN', color: '#d97706', sortOrder: 12 },
    ];

    const dept: Record<string, string> = {};
    for (const d of deptDefs) {
      const created = await prisma.department.create({ data: d });
      dept[d.name] = created.id;
    }
    console.log(`Seeded ${deptDefs.length} departments`);

    // --- USERS ---
    const userDefs = [
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
      { email: 'jiemin@geohan.com', name: 'Jie Min', role: 'MANAGER', position: 'IT & Digitalisation', department: 'IT' },
      { email: 'jinghui@geohan.com', name: 'Jing Hui', role: 'STAFF', position: 'Quantity Surveyor', department: 'Commercial' },
      { email: 'jeremy@geohan.com', name: 'Jeremy Loh', role: 'MANAGER', position: 'Site Manager', department: 'Operations' },
      { email: 'mroh@geohan.com', name: 'Mr Oh', role: 'MANAGER', position: 'Senior Manager', department: 'Operations' },
    ];

    const u: Record<string, string> = {};
    for (const ud of userDefs) {
      const created = await prisma.user.create({
        data: {
          email: ud.email,
          name: ud.name,
          role: ud.role,
          position: ud.position,
          departmentId: dept[ud.department] || null,
          passwordHash,
        },
      });
      u[ud.email] = created.id;
    }
    console.log(`Seeded ${userDefs.length} users`);

    // --- SET HODs AS DEPARTMENT HEADS ---
    const hodMappings: Record<string, string> = {
      'Finance': 'june@geohan.com',
      'IT': 'kevin@geohan.com',
      'HR': 'sarah@geohan.com',
      'Operations': 'david@geohan.com',
      'ESG': 'farah@geohan.com',
      'Investor Relations': 'rajan@geohan.com',
      'Legal': 'lina@geohan.com',
      'Commercial': 'ahmad@geohan.com',
    };
    for (const [deptName, hodEmail] of Object.entries(hodMappings)) {
      await prisma.department.update({
        where: { id: dept[deptName] },
        data: { headId: u[hodEmail] },
      });
    }
    console.log('Set HODs as department heads');

    // --- USER ASSIGNMENTS ---
    // Create assignments matching each user's primary role/department
    for (const ud of userDefs) {
      if (!dept[ud.department]) continue;
      await prisma.userAssignment.create({
        data: {
          userId: u[ud.email],
          departmentId: dept[ud.department],
          role: ud.role,
          position: ud.position,
          isPrimary: true,
        },
      });
    }

    // ED gets additional assignments across key departments
    const edExtraAssignments = [
      { department: 'Finance', role: 'ED', position: 'Oversight' },
      { department: 'Operations', role: 'ED', position: 'Oversight' },
      { department: 'IT', role: 'ED', position: 'Oversight' },
      { department: 'Legal', role: 'ED', position: 'Oversight' },
      { department: 'ESG', role: 'ED', position: 'Oversight' },
    ];
    for (const ea of edExtraAssignments) {
      if (!dept[ea.department]) continue;
      await prisma.userAssignment.upsert({
        where: { userId_departmentId: { userId: u['ed@gtms.com'], departmentId: dept[ea.department] } },
        create: {
          userId: u['ed@gtms.com'],
          departmentId: dept[ea.department],
          role: ea.role,
          position: ea.position,
          isPrimary: false,
        },
        update: {},
      });
    }
    console.log('Seeded user assignments');

    // Workstreams
    const wsDefs = [
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
    for (const w of wsDefs) {
      const created = await prisma.workstream.create({ data: w });
      ws[w.code] = created.id;
    }
    console.log(`Seeded ${wsDefs.length} workstreams`);

    const edId = u['ed@gtms.com'];

    // Helper to create task with optional subtasks
    async function ct(title: string, wsCode: string, opts: any = {}) {
      const task = await prisma.task.create({
        data: {
          title,
          description: opts.desc || null,
          type: opts.type || 'My Action',
          priority: opts.p || 'Medium',
          status: opts.s || 'Not Started',
          source: 'Manual',
          dueDate: opts.due || null,
          waitingOnWhom: opts.wait || null,
          workstreamId: ws[wsCode],
          assigneeId: opts.a ? u[opts.a] : null,
          createdById: edId,
        },
      });
      if (opts.subs) {
        for (const sub of opts.subs as string[]) {
          await prisma.task.create({
            data: {
              title: sub,
              type: 'My Action',
              priority: opts.p || 'Medium',
              status: 'Not Started',
              source: 'Manual',
              parentId: task.id,
              workstreamId: ws[wsCode],
              assigneeId: opts.a ? u[opts.a] : null,
              createdById: edId,
            },
          });
        }
      }
      return task;
    }

    let count = 0;

    // === Operations / Subcon ===
    await ct('Subcon management material take out', 'OPS', { p: 'High', a: 'ed@gtms.com', due: addDays(now, 14) }); count++;
    await ct('Cost code and lakefront spun pile', 'OPS', { p: 'High', a: 'ed@gtms.com', due: addDays(now, 14) }); count++;
    await ct('Budget vs actual', 'FIN', { p: 'High', a: 'ed@gtms.com', due: addDays(now, 7) }); count++;
    await ct('Cost code ordering system', 'ACU', { p: 'Medium', a: 'jiemin@geohan.com', due: addDays(now, 21) }); count++;
    await ct('Slope monitoring new business development', 'COM', { p: 'Medium', a: 'ed@gtms.com', due: addDays(now, 30) }); count++;
    await ct('Can we reduce site flood? New competitive advantage', 'OPS', { p: 'Medium', a: 'david@geohan.com', due: addDays(now, 30), type: 'Decision' }); count++;

    // === ED Main Tasks ===
    await ct('NSRF - S1 S2 Confirm if we include in ESG framework', 'ESG', { p: 'High', a: 'farah@geohan.com', due: addDays(now, 14) }); count++;
    await ct('Write to lawyer of rencana for clearance letter from bank', 'LEG', { p: 'High', a: 'lina@geohan.com', due: addDays(now, 7) }); count++;
    await ct('Check with Joseph on Contractor code of ethics', 'LEG', { p: 'Medium', a: 'joseph@geohan.com', due: addDays(now, 10) }); count++;
    await ct('Study listing guidelines and MCCG code, charters, COI', 'STR', { p: 'High', a: 'ed@gtms.com', due: addDays(now, 21) }); count++;
    await ct('Gantt chart for each department', 'ADM', { p: 'Medium', a: 'jiemin@geohan.com', due: addDays(now, 30) }); count++;
    await ct('The Louvre', 'STR', { p: 'Low', a: 'ed@gtms.com', due: addDays(now, 60) }); count++;
    await ct('Rental agreement between GSB and GESB for land', 'LEG', { p: 'High', a: 'lina@geohan.com', due: addDays(now, 14) }); count++;
    await ct('CP500 LKS', 'FIN', { p: 'Medium', a: 'june@geohan.com', due: addDays(now, 14) }); count++;
    await ct('KPI setting, performance incentive, pending KD, framework for remcom', 'HR', { p: 'High', a: 'sarah@geohan.com', due: addDays(now, 14), subs: ['Review the KPI setting paper, and chart it out into policy'] }); count++;
    await ct('Dividend policy', 'FIN', { p: 'High', a: 'june@geohan.com', due: addDays(now, 21), subs: ['Study market for dividend policy benchmarks'] }); count++;
    await ct('Stamp duty exemption application - write up', 'FIN', { p: 'High', a: 'ed@gtms.com', due: addDays(now, 14), subs: ['Read Yung Cien write up', 'Clean up Claude write up'] }); count++;
    await ct('Singapore budget and direction setting', 'GPL', { p: 'High', a: 'zul@geohan.com', due: addDays(now, 21) }); count++;
    await ct('Authority matrix', 'STR', { p: 'High', a: 'ed@gtms.com', due: addDays(now, 14), subs: ['Remember to add for BOD sign off'] }); count++;
    await ct('Succession planning', 'HR', { p: 'High', a: 'sarah@geohan.com', due: addDays(now, 30) }); count++;
    await ct('AI usage policy', 'IT', { p: 'Medium', a: 'jiemin@geohan.com', due: addDays(now, 21) }); count++;
    await ct('Analysing daily site progress', 'OPS', { p: 'High', a: 'david@geohan.com', due: addDays(now, 7) }); count++;
    await ct('Report management system', 'IT', { p: 'High', a: 'jiemin@geohan.com', due: addDays(now, 14), subs: ['Planning usage', 'Prepare briefing'] }); count++;
    await ct('Comparison between meeting per day and meeting allowance per meeting', 'HR', { p: 'Medium', a: 'sarah@geohan.com', due: addDays(now, 14) }); count++;
    await ct('ABC planning', 'STR', { p: 'Medium', a: 'ed@gtms.com', due: addDays(now, 21) }); count++;
    await ct('Read sustainability', 'ESG', { p: 'Low', a: 'ed@gtms.com', due: addDays(now, 14) }); count++;
    await ct('Check Jiva table on remuneration', 'HR', { p: 'Medium', s: 'Done', a: 'jiva@geohan.com', due: addDays(now, -3) }); count++;
    await ct('Training for directors sign', 'HR', { p: 'Medium', a: 'sarah@geohan.com', due: addDays(now, 21) }); count++;
    await ct('OCBC form, arrange trip to Singapore', 'FIN', { p: 'High', a: 'june@geohan.com', due: addDays(now, 14) }); count++;
    await ct('Internal audit checking', 'FIN', { p: 'High', a: 'alvin@geohan.com', due: addDays(now, 14), subs: ['Check Alvin work', 'Check YC', 'Check Ken'] }); count++;
    await ct('Viia SPA', 'LEG', { p: 'High', s: 'Waiting On', a: 'lina@geohan.com', due: addDays(now, 21), wait: 'Taksiran pending', subs: ['Now pending taksiran'] }); count++;
    await ct('Read minutes', 'STR', { p: 'Medium', a: 'ed@gtms.com', due: addDays(now, 7), subs: ['RC minutes', 'NC minutes', 'ARMC minutes'] }); count++;
    await ct('OCBC form setup', 'FIN', { p: 'High', a: 'june@geohan.com', due: addDays(now, 14), subs: ['Apply e-giro form', 'Appoint Jiva, HRPlus and Athirah as maker', 'June account activate', 'Appoint Jie Min as authorizer - need to send in new passport'] }); count++;

    // === Weekend To Do ===
    await ct('Check unit cost message by Jing Hui on the 23rd Apr', 'FIN', { p: 'High', a: 'ed@gtms.com', due: addDays(now, 3) }); count++;
    await ct('Profit takeup projects - go through one by one - Apr margins comparison', 'FIN', { p: 'High', a: 'ed@gtms.com', due: addDays(now, 3) }); count++;
    await ct('Project costing recon', 'FIN', { p: 'High', a: 'ed@gtms.com', due: addDays(now, 3) }); count++;
    await ct('GESB recon', 'FIN', { p: 'High', a: 'ed@gtms.com', due: addDays(now, 3) }); count++;

    // === Personal ===
    await ct('RM40k from daddy 29 May', 'FIN', { p: 'Low', a: 'ed@gtms.com', due: addDays(now, 56) }); count++;
    await ct('6pDRXp7OlgD6 code lenovo', 'IT', { p: 'Low', a: 'ed@gtms.com', desc: 'Lenovo redemption code' }); count++;

    // === ACUMATICA ===
    await ct('Design report to track online payment approvals', 'ACU', { p: 'High', a: 'jiemin@geohan.com', due: addDays(now, 21) }); count++;
    await ct('Review cash flow', 'ACU', { p: 'High', a: 'june@geohan.com', due: addDays(now, 14) }); count++;
    await ct('Acumatica dashboard', 'ACU', { p: 'Medium', a: 'jiemin@geohan.com', due: addDays(now, 30) }); count++;
    await ct('Change request form - for claim', 'ACU', { p: 'Medium', a: 'jiemin@geohan.com', due: addDays(now, 21) }); count++;
    await ct('Share financing', 'ACU', { p: 'Medium', a: 'june@geohan.com', due: addDays(now, 14) }); count++;
    await ct('Check inventory code mapping', 'ACU', { p: 'Medium', a: 'yc@geohan.com', due: addDays(now, 14) }); count++;
    await ct('Acumatica payment - check HRDF', 'ACU', { p: 'Medium', a: 'june@geohan.com', due: addDays(now, 7) }); count++;
    await ct('GESB Inventory code check - feedback', 'ACU', { p: 'Medium', a: 'yc@geohan.com', due: addDays(now, 14) }); count++;
    await ct('Outstanding item list', 'ACU', { p: 'High', a: 'jiemin@geohan.com', due: addDays(now, 7) }); count++;
    await ct("YC's request class, item code", 'ACU', { p: 'Medium', a: 'yc@geohan.com', due: addDays(now, 14) }); count++;
    await ct('PRF form', 'ACU', { p: 'Medium', a: 'jiemin@geohan.com', due: addDays(now, 21) }); count++;
    await ct('Petty cash form', 'ACU', { p: 'Medium', a: 'jiemin@geohan.com', due: addDays(now, 21) }); count++;
    await ct('CPS - estimated work done by type of work, debit note', 'ACU', { p: 'High', a: 'jiemin@geohan.com', due: addDays(now, 14) }); count++;
    await ct('Training for approvers', 'ACU', { p: 'Medium', a: 'jiemin@geohan.com', due: addDays(now, 30) }); count++;

    // === GPL ===
    await ct('GPL Tax for personnel - tax in Singapore if tax residency in Malaysia', 'GPL', { p: 'High', a: 'zul@geohan.com', due: addDays(now, 14), type: 'Decision' }); count++;
    await ct('GPL salary', 'GPL', { p: 'High', a: 'zul@geohan.com', due: addDays(now, 14) }); count++;
    await ct('GPL recruiter', 'GPL', { p: 'Medium', a: 'zul@geohan.com', due: addDays(now, 21) }); count++;
    await ct('GPL outsource HR', 'GPL', { p: 'Medium', a: 'zul@geohan.com', due: addDays(now, 21) }); count++;
    await ct('GPL forecast', 'GPL', { p: 'High', a: 'zul@geohan.com', due: addDays(now, 14) }); count++;
    await ct('GPL tender and project database', 'GPL', { p: 'Medium', a: 'zul@geohan.com', due: addDays(now, 30) }); count++;
    await ct('GPL handover notes', 'GPL', { p: 'High', a: 'zul@geohan.com', due: addDays(now, 7) }); count++;

    // === Admin & System ===
    await ct('System training for engineer', 'ADM', { p: 'Medium', a: 'jiemin@geohan.com', due: addDays(now, 30) }); count++;
    await ct('System training for site supervisor', 'ADM', { p: 'Medium', a: 'jiemin@geohan.com', due: addDays(now, 30) }); count++;
    await ct('System training for safety', 'ADM', { p: 'Medium', a: 'jiemin@geohan.com', due: addDays(now, 30) }); count++;
    await ct('R&D', 'ADM', { p: 'Low', a: 'ed@gtms.com', due: addDays(now, 60) }); count++;
    await ct('Centralised CLQ - CLQ policy', 'ADM', { p: 'Medium', a: 'anis@geohan.com', due: addDays(now, 30) }); count++;
    await ct('QA fail: Reporting flag out system process to rectify and train', 'ADM', { p: 'High', a: 'ed@gtms.com', due: addDays(now, 21), desc: 'Process improvement plan - which part to get PD buy in' }); count++;
    await ct('ESG Assurance 2027 - Form up fundamental', 'ESG', { p: 'High', a: 'farah@geohan.com', due: addDays(now, 30), desc: 'Risk register EAIR Finance, Governance, Safety' }); count++;
    await ct('SOP to gather data, adopt assurance standard', 'ESG', { p: 'Medium', a: 'farah@geohan.com', due: addDays(now, 30) }); count++;
    await ct('Jan - ESG SOP drafting, data collection trials, ERM to board, MCCG training', 'ESG', { p: 'High', s: 'Done', a: 'farah@geohan.com', due: addDays(now, -60) }); count++;
    await ct('Feb - ESG Data collecting for 2025 - Finalise IA plan', 'ESG', { p: 'High', s: 'Done', a: 'farah@geohan.com', due: addDays(now, -30) }); count++;
    await ct('Mar - ESG Results 2025 tabulation - IA fieldwork', 'ESG', { p: 'High', a: 'farah@geohan.com', due: addDays(now, -7) }); count++;
    await ct('Apr - ESG Sustainability statement', 'ESG', { p: 'High', a: 'farah@geohan.com', due: addDays(now, 27) }); count++;
    await ct('May - IA Report', 'ESG', { p: 'High', a: 'alvin@geohan.com', due: addDays(now, 57) }); count++;
    await ct('June - Interview ESG Assurance provider', 'ESG', { p: 'Medium', a: 'farah@geohan.com', due: addDays(now, 87) }); count++;
    await ct('Policy, framework, SOP - MCCG (Jan)', 'ESG', { p: 'High', s: 'Done', a: 'ed@gtms.com', due: addDays(now, -60) }); count++;
    await ct('Alia - projection on resources (Workdone, manpower, material) - Reporting standardisation', 'OPS', { p: 'High', a: 'alia@geohan.com', due: addDays(now, 14) }); count++;
    await ct('Admin budget', 'ADM', { p: 'Medium', a: 'anis@geohan.com', due: addDays(now, 21) }); count++;
    await ct('Collection risk, business tender slow, underground risk, material pricing risk', 'STR', { p: 'High', a: 'ed@gtms.com', due: addDays(now, 14), type: 'Review' }); count++;
    await ct('ISO, operations inventory and safety asset, tender questionnaire', 'ADM', { p: 'Medium', a: 'anis@geohan.com', due: addDays(now, 30) }); count++;
    await ct('Establish monthly meeting and reporting (50%)', 'ADM', { p: 'Medium', a: 'ed@gtms.com', due: addDays(now, 14) }); count++;
    await ct('Circulate memo to company on info flow to project admin', 'ADM', { p: 'Medium', a: 'anis@geohan.com', due: addDays(now, 7) }); count++;
    await ct('Review insurance', 'ADM', { p: 'Medium', a: 'june@geohan.com', due: addDays(now, 21), type: 'Review' }); count++;
    await ct('Revert on intercompany car rental', 'ADM', { p: 'Low', a: 'anis@geohan.com', due: addDays(now, 14) }); count++;
    await ct('GMSB CIDB', 'ADM', { p: 'Medium', a: 'zul@geohan.com', due: addDays(now, 21) }); count++;
    await ct('Roof contractor', 'ADM', { p: 'High', a: 'anis@geohan.com', due: addDays(now, 7) }); count++;

    // === Financial Analysis ===
    await ct('KL East/Flora breakdown loss components - compare to budget, top 3 cost components', 'FAN', { p: 'Critical', a: 'june@geohan.com', due: addDays(now, 7) }); count++;
    await ct('BP work order 100mil - analyse margin on 20mil forecast loss', 'FAN', { p: 'Critical', a: 'june@geohan.com', due: addDays(now, 7) }); count++;
    await ct('BG scheme scenario analysis - sell at 10th/15th year, revenue/cost/tax impact', 'FAN', { p: 'High', a: 'grace@geohan.com', due: addDays(now, 14) }); count++;
    await ct('Analyse transport', 'FAN', { p: 'Medium', a: 'june@geohan.com', due: addDays(now, 21) }); count++;

    // === HR ===
    await ct('Slides for weekly meeting SMM budget vs actual', 'HR', { p: 'High', a: 'sarah@geohan.com', due: addDays(now, 3), type: 'Recurring' }); count++;
    await ct('Assist in performance assessment', 'HR', { p: 'High', a: 'sarah@geohan.com', due: addDays(now, 14) }); count++;
    await ct('Remuneration framework, balance scorecard, discretionary reasons documentation', 'HR', { p: 'High', a: 'sarah@geohan.com', due: addDays(now, 21) }); count++;
    await ct('Succession Planning', 'HR', { p: 'High', a: 'sarah@geohan.com', due: addDays(now, 30) }); count++;
    await ct('Handbook', 'HR', { p: 'Medium', a: 'sarah@geohan.com', due: addDays(now, 45) }); count++;
    await ct('Jobs and responsibility, Roadmap for each role', 'HR', { p: 'Medium', a: 'sarah@geohan.com', due: addDays(now, 30) }); count++;

    // === Finance ===
    await ct('Check project costing profit - high side', 'FIN', { p: 'High', a: 'june@geohan.com', due: addDays(now, 7) }); count++;
    await ct('Check month to month profit recognition - cut off June results 2023/2022', 'FIN', { p: 'High', a: 'june@geohan.com', due: addDays(now, 14) }); count++;
    await ct('Follow up - Jeremy Loh subcontract backcharge', 'FIN', { p: 'High', a: 'jeremy@geohan.com', due: addDays(now, 7), type: 'Waiting On', wait: 'Jeremy Loh' }); count++;
    await ct('Check wages 2nd Half 90% / Check foreign subcon', 'FIN', { p: 'Critical', a: 'june@geohan.com', due: addDays(now, 7), subs: ['Check foreign pass', 'June to check ID of subcon (company or individual)', 'Get passport/PR, permit page, CIDB card photos for foreigners', 'Valid PR + CIDB: continue normal subcon certification', 'Expired CIDB: request renewal, reject cert/payment', 'Not PR: award through appointment, check proxy Malaysian + CIDB', 'Prepare contract agreement signed by both parties'] }); count++;
    await ct('Finding list', 'FIN', { p: 'Medium', a: 'alvin@geohan.com', due: addDays(now, 14), subs: ['Scrap iron', 'Mobile app'] }); count++;
    await ct('Alvin on previous years cash', 'FIN', { p: 'Medium', a: 'alvin@geohan.com', due: addDays(now, 14) }); count++;

    // === IT ===
    await ct('AI Proof of Concept with Contract Department', 'IT', { p: 'High', a: 'kevin@geohan.com', due: addDays(now, 30), desc: 'Q1' }); count++;
    await ct('Moodle Launch (LMS)', 'IT', { p: 'High', a: 'kevin@geohan.com', due: addDays(now, 30), desc: 'Q1' }); count++;
    await ct('Posting IT Bulletin every month', 'IT', { p: 'Low', a: 'james@geohan.com', due: endOfMonth(now), type: 'Recurring' }); count++;
    await ct('Site CCTV monitor access', 'IT', { p: 'Medium', a: 'james@geohan.com', due: addDays(now, 30) }); count++;
    await ct('Jodoo Subscription upgrade to Enterprise', 'IT', { p: 'Medium', a: 'kevin@geohan.com', due: addDays(now, 60), desc: 'Q2' }); count++;
    await ct('Cybersecurity Training / Certified Train-the-trainer', 'IT', { p: 'High', a: 'kevin@geohan.com', due: addDays(now, 60), desc: 'Q2' }); count++;
    await ct('Server Consolidation Project', 'IT', { p: 'High', a: 'james@geohan.com', due: addDays(now, 60), desc: 'Q2' }); count++;
    await ct('Firewall replacement upgrade (HQ & Warehouse)', 'IT', { p: 'High', a: 'james@geohan.com', due: addDays(now, 120), desc: 'Q3' }); count++;
    await ct('Data Backup & Recovery Enhancement - 2 way backup', 'IT', { p: 'High', a: 'james@geohan.com', due: addDays(now, 120), desc: 'Q3' }); count++;
    await ct('Implement AI Adoption for every department', 'IT', { p: 'High', a: 'kevin@geohan.com', due: addDays(now, 180), desc: 'Q4' }); count++;
    await ct('OCR for Statement Reconciliation (DO, invoice, bank/supplier statement)', 'IT', { p: 'High', a: 'jiemin@geohan.com', due: addDays(now, 30), desc: 'Q1 App' }); count++;
    await ct('Acumatica Claim Feature for Contract Department', 'IT', { p: 'High', a: 'jiemin@geohan.com', due: addDays(now, 30), desc: 'Q1 App' }); count++;
    await ct('Launch welding app for HR and Drilling Centre team', 'IT', { p: 'Medium', a: 'jiemin@geohan.com', due: addDays(now, 30), desc: 'Q1 App' }); count++;
    await ct('ESG Data collection on CSI Solution portal', 'IT', { p: 'Medium', a: 'jiemin@geohan.com', due: addDays(now, 30), desc: 'Q1 App' }); count++;
    await ct('Field Log in Acumatica for Operations Department', 'IT', { p: 'High', a: 'jiemin@geohan.com', due: addDays(now, 60), desc: 'Q2 App' }); count++;
    await ct('GDN App Development for Warehouse and Operations', 'IT', { p: 'High', a: 'jiemin@geohan.com', due: addDays(now, 60), desc: 'Q2 App' }); count++;
    await ct('GDN App Launch for Warehouse and Operations', 'IT', { p: 'High', a: 'jiemin@geohan.com', due: addDays(now, 120), desc: 'Q3 App' }); count++;
    await ct('Redevelop BPMS App', 'IT', { p: 'Medium', a: 'jiemin@geohan.com', due: addDays(now, 180), desc: 'Q4 App' }); count++;
    await ct('OCR petty cash', 'IT', { p: 'Medium', a: 'jiemin@geohan.com', due: addDays(now, 45) }); count++;
    await ct('PRF forms', 'IT', { p: 'Medium', a: 'jiemin@geohan.com', due: addDays(now, 45) }); count++;
    await ct('Dashboard for senior management', 'IT', { p: 'High', a: 'jiemin@geohan.com', due: addDays(now, 30) }); count++;
    await ct('Dashboard for site manager / site PIC', 'IT', { p: 'Medium', a: 'jiemin@geohan.com', due: addDays(now, 45) }); count++;
    await ct('WhatsApp API with Acumatica - reports to WhatsApp group', 'IT', { p: 'Medium', a: 'jiemin@geohan.com', due: addDays(now, 60) }); count++;

    // === Tender & Contract ===
    await ct('Tender process documentation and workflow', 'TEN', { p: 'High', a: 'kumar@geohan.com', due: addDays(now, 21), desc: 'BQ summary, cost estimation, addendums', subs: ['Generate BQ Summary excel file from tender documents', 'Work on cost estimation (Cost-BP Conf and CAD)', 'Handle addendums and revisions to BQ Summary', 'Generate formal CAD Bills of Quantities for submission'] }); count++;
    await ct('Post-Contract (Award) - progress claim excel file setup', 'TEN', { p: 'High', a: 'kumar@geohan.com', due: addDays(now, 14), desc: 'Description from full BQ, qty/price follow awarded BQ summary' }); count++;
    await ct('Contract Review process', 'TEN', { p: 'High', a: 'lina@geohan.com', due: addDays(now, 21), desc: 'LOA, standard forms, amendments, specifications', subs: ['Review Letter of Award terms and conditions', 'Review standard forms (PAM 2006/2018)', 'Review Addendum/Amendments to Conditions of Contract', 'Go through specifications'] }); count++;

    console.log(`Seeded ${count} tasks (+ subtasks)`);
    console.log('Done!');
  } finally {
    await prisma.$disconnect();
  }
}
