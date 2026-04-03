export enum UserRole {
  ED = 'ED',
  HOD = 'HOD',
  MANAGER = 'MANAGER',
  STAFF = 'STAFF',
}

export enum TaskStatus {
  NOT_STARTED = 'Not Started',
  IN_PROGRESS = 'In Progress',
  WAITING_ON = 'Waiting On',
  BLOCKED = 'Blocked',
  DONE = 'Done',
  CANCELLED = 'Cancelled',
}

export enum TaskType {
  MY_ACTION = 'My Action',
  WAITING_ON = 'Waiting On',
  DECISION = 'Decision',
  REVIEW = 'Review',
  RECURRING = 'Recurring',
}

export enum TaskPriority {
  CRITICAL = 'Critical',
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low',
}

export enum TaskSource {
  CHAT = 'Chat',
  EMAIL = 'Email',
  MANUAL = 'Manual',
  RECURRING = 'Recurring',
}

export enum NoteType {
  COMMENT = 'Comment',
  STATUS_UPDATE = 'Status Update',
  BLOCKER_REPORT = 'Blocker Report',
  SYSTEM_LOG = 'System Log',
}

export enum WorkstreamCode {
  STR = 'STR',
  COM = 'COM',
  IR = 'IR',
  IT = 'IT',
  HR = 'HR',
  FIN = 'FIN',
  ESG = 'ESG',
  OPS = 'OPS',
  LEG = 'LEG',
  ACU = 'ACU',
  GPL = 'GPL',
  ADM = 'ADM',
  FAN = 'FAN',
  TEN = 'TEN',
  RT = 'RT',
}
