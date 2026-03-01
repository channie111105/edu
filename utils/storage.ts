import { ILead, IDeal, IContact, IContract, LeadStatus, DealStage, IMeeting, MeetingStatus, MeetingType, IQuotation, QuotationStatus, IAdmission, StudentStatus, ITransaction, IClassStudent, ITeacher, ILogNote, ITrainingClass, IStudentScore, IDebtTerm, IClassSession, IAttendanceRecord, IStudyNote, AttendanceStatus, IActualTransaction, IActualTransactionLog, IRefundRequest, IRefundLog } from '../types';

export const KEYS = {
  LEADS: 'educrm_leads_v2', // Changed key to force fresh load
  DEALS: 'educrm_deals',
  CONTACTS: 'educrm_contacts',
  CONTRACTS: 'educrm_contracts_cleaned',
  QUOTATIONS: 'educrm_quotations',
  TRANSACTIONS: 'educrm_transactions',
  STUDENTS: 'educrm_students',
  ADMISSIONS: 'educrm_admissions',
  CLASS_STUDENTS: 'educrm_class_students',
  STUDENT_SCORES: 'educrm_student_scores',
  TRAINING_CLASSES: 'educrm_training_classes',
  CLASS_SESSIONS: 'educrm_class_sessions',
  ATTENDANCE: 'educrm_attendance',
  STUDY_NOTES: 'educrm_study_notes',
  TEACHERS: 'educrm_teachers',
  LOG_NOTES: 'educrm_log_notes',
  MEETINGS: 'educrm_meetings',
  ACTUAL_TRANSACTIONS: 'educrm_actual_transactions',
  ACTUAL_TRANSACTION_LOGS: 'educrm_actual_transaction_logs',
  REFUNDS: 'educrm_refunds',
  REFUND_LOGS: 'educrm_refund_logs',
  INVOICES: 'educrm_invoices',
  COLLABORATORS: 'educrm_collaborators',
  TAGS: 'educrm_tags',
  LOST_REASONS: 'educrm_lost_reasons',
  LEAD_DISTRIBUTION_CONFIG: 'educrm_lead_distribution_config',
  INIT: 'educrm_initialized'
};

export type LeadDistributionMode = 'auto' | 'manual';

export interface ILeadDistributionConfig {
  mode: LeadDistributionMode;
  roundRobinIndex: number;
  updatedAt: string;
  updatedBy?: string;
}

const emitClientEvent = (eventName: string) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(eventName));
  }
};

// ... (existing code)

// ACTUAL TRANSACTIONS
export const getActualTransactions = (): IActualTransaction[] => {
  try {
    const data = localStorage.getItem(KEYS.ACTUAL_TRANSACTIONS);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
};

export const saveActualTransactions = (data: IActualTransaction[]) => {
  localStorage.setItem(KEYS.ACTUAL_TRANSACTIONS, JSON.stringify(data));
  emitClientEvent('educrm:actual-transactions-changed');
};

export const addActualTransaction = (newItem: IActualTransaction) => {
  const list = getActualTransactions();
  list.unshift(newItem);
  saveActualTransactions(list);
  return newItem;
};

export const updateActualTransaction = (updated: IActualTransaction) => {
  const list = getActualTransactions();
  const idx = list.findIndex((t) => t.id === updated.id);
  if (idx !== -1) {
    list[idx] = updated;
    saveActualTransactions(list);
    return true;
  }
  return false;
};

export const getActualTransactionLogs = (transactionId?: string): IActualTransactionLog[] => {
  try {
    const data = localStorage.getItem(KEYS.ACTUAL_TRANSACTION_LOGS);
    const list = data ? JSON.parse(data) : [];
    if (!transactionId) return list;
    return list.filter((item: IActualTransactionLog) => item.transactionId === transactionId);
  } catch {
    return [];
  }
};

export const addActualTransactionLog = (log: IActualTransactionLog) => {
  const list = getActualTransactionLogs();
  list.unshift(log);
  localStorage.setItem(KEYS.ACTUAL_TRANSACTION_LOGS, JSON.stringify(list));
  emitClientEvent('educrm:actual-transaction-logs-changed');
  return log;
};

// REFUNDS
export const getRefunds = (): IRefundRequest[] => {
  try {
    const data = localStorage.getItem(KEYS.REFUNDS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveRefunds = (data: IRefundRequest[]) => {
  localStorage.setItem(KEYS.REFUNDS, JSON.stringify(data));
  emitClientEvent('educrm:refunds-changed');
};

export const addRefund = (item: IRefundRequest) => {
  const list = getRefunds();
  list.unshift(item);
  saveRefunds(list);
  return item;
};

export const updateRefund = (updated: IRefundRequest) => {
  const list = getRefunds();
  const idx = list.findIndex((item) => item.id === updated.id);
  if (idx !== -1) {
    list[idx] = updated;
    saveRefunds(list);
    return true;
  }
  return false;
};

export const getRefundLogs = (refundId?: string): IRefundLog[] => {
  try {
    const data = localStorage.getItem(KEYS.REFUND_LOGS);
    const list = data ? JSON.parse(data) : [];
    if (!refundId) return list;
    return list.filter((item: IRefundLog) => item.refundId === refundId);
  } catch {
    return [];
  }
};

export const addRefundLog = (log: IRefundLog) => {
  const list = getRefundLogs();
  list.unshift(log);
  localStorage.setItem(KEYS.REFUND_LOGS, JSON.stringify(list));
  emitClientEvent('educrm:refund-logs-changed');
  return log;
};

// TAGS
export const getTags = (): string[] => {
  try {
    const data = localStorage.getItem(KEYS.TAGS);
    return data ? JSON.parse(data) : ['Gọi lần 1', 'Gọi lần 2', 'Zalo', 'Hotline', 'Facebook', 'Tiềm năng', 'Cần tư vấn'];
  } catch { return ['Gọi lần 1', 'Gọi lần 2', 'Zalo', 'Hotline', 'Facebook', 'Tiềm năng', 'Cần tư vấn']; }
};

export const saveTags = (tags: string[]) => {
  localStorage.setItem(KEYS.TAGS, JSON.stringify(tags));
};

const getDefaultLeadDistributionConfig = (): ILeadDistributionConfig => ({
  mode: 'auto',
  roundRobinIndex: 0,
  updatedAt: new Date().toISOString(),
  updatedBy: 'system'
});

export const getLeadDistributionConfig = (): ILeadDistributionConfig => {
  try {
    const data = localStorage.getItem(KEYS.LEAD_DISTRIBUTION_CONFIG);
    if (!data) return getDefaultLeadDistributionConfig();
    const parsed = JSON.parse(data) as Partial<ILeadDistributionConfig>;
    return {
      mode: parsed.mode === 'manual' ? 'manual' : 'auto',
      roundRobinIndex: Number.isFinite(parsed.roundRobinIndex) ? Math.max(0, Math.floor(parsed.roundRobinIndex as number)) : 0,
      updatedAt: parsed.updatedAt || new Date().toISOString(),
      updatedBy: parsed.updatedBy || 'system'
    };
  } catch {
    return getDefaultLeadDistributionConfig();
  }
};

export const saveLeadDistributionConfig = (config: Partial<ILeadDistributionConfig>) => {
  const current = getLeadDistributionConfig();
  const next: ILeadDistributionConfig = {
    ...current,
    ...config,
    mode: config.mode === 'manual' ? 'manual' : config.mode === 'auto' ? 'auto' : current.mode,
    roundRobinIndex: Number.isFinite(config.roundRobinIndex) ? Math.max(0, Math.floor(config.roundRobinIndex as number)) : current.roundRobinIndex,
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem(KEYS.LEAD_DISTRIBUTION_CONFIG, JSON.stringify(next));
  emitClientEvent('educrm:lead-distribution-config-changed');
  return next;
};

export const allocateLeadOwnersRoundRobin = (leadCount: number, repIds: string[]): string[] => {
  if (leadCount <= 0 || repIds.length === 0) return [];
  const config = getLeadDistributionConfig();
  const startIndex = config.roundRobinIndex % repIds.length;
  const assignedOwners: string[] = [];

  for (let i = 0; i < leadCount; i++) {
    assignedOwners.push(repIds[(startIndex + i) % repIds.length]);
  }

  saveLeadDistributionConfig({
    roundRobinIndex: (startIndex + leadCount) % repIds.length
  });

  return assignedOwners;
};

// ... (existing code)

// QUOTATIONS
export const getQuotations = (): IQuotation[] => {
  try {
    const data = localStorage.getItem(KEYS.QUOTATIONS);
    return data ? JSON.parse(data) : [];
  } catch (e) { return []; }
};

export const addQuotation = (quotation: IQuotation) => {
  const list = getQuotations();
  list.unshift(quotation);
  localStorage.setItem(KEYS.QUOTATIONS, JSON.stringify(list));
  emitClientEvent('educrm:quotations-changed');
  return list;
};

export const updateQuotation = (updated: IQuotation) => {
  const list = getQuotations();
  const idx = list.findIndex(q => q.id === updated.id);
  if (idx !== -1) {
    list[idx] = {
      ...updated,
      updatedAt: updated.updatedAt || new Date().toISOString()
    };
    localStorage.setItem(KEYS.QUOTATIONS, JSON.stringify(list));
    emitClientEvent('educrm:quotations-changed');
    return true;
  }
  return false;
};

// TRANSACTIONS (Accounting approval for SO)
export const getTransactions = (): ITransaction[] => {
  try {
    const data = localStorage.getItem(KEYS.TRANSACTIONS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveTransactions = (transactions: ITransaction[]) => {
  localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(transactions));
  emitClientEvent('educrm:transactions-changed');
};

export const addTransaction = (transaction: ITransaction) => {
  const list = getTransactions();
  list.unshift(transaction);
  saveTransactions(list);
  return transaction;
};

export const updateTransaction = (updated: ITransaction) => {
  const list = getTransactions();
  const idx = list.findIndex((t) => t.id === updated.id);
  if (idx !== -1) {
    list[idx] = updated;
    saveTransactions(list);
    return true;
  }
  return false;
};

export const createTransactionFromQuotation = (quotationId: string, createdBy: string): ITransaction => {
  // TODO: replace mock service with BE API
  const quotation = getQuotations().find((q) => q.id === quotationId);
  if (!quotation) {
    throw new Error('Không tìm thấy báo giá để tạo giao dịch');
  }

  const paymentMethod = quotation.paymentMethod === 'CK' ? 'CHUYEN_KHOAN' : quotation.paymentMethod === 'CASH' ? 'TIEN_MAT' : 'OTHER';
  const proofType = quotation.paymentMethod === 'CK' ? 'UNC' : quotation.paymentMethod === 'CASH' ? 'PHIEU_THU' : 'NONE';
  const bankRefCode =
    quotation.paymentDocuments?.bankConfirmationCode ||
    quotation.paymentDocuments?.bankTransactionCode ||
    quotation.paymentProof ||
    '';

  const newTransaction: ITransaction = {
    id: `TRX-${Date.now()}`,
    quotationId: quotation.id,
    soCode: quotation.soCode,
    customerId: quotation.customerId || quotation.leadId || quotation.id,
    studentName: quotation.customerName,
    amount: quotation.finalAmount || quotation.amount || 0,
    method: paymentMethod,
    proofType,
    proofFiles: quotation.paymentProof
      ? [{ id: `PF-${Date.now()}`, name: quotation.paymentProof, url: quotation.paymentProof }]
      : [],
    bankRefCode,
    status: 'CHO_DUYET',
    createdAt: Date.now(),
    createdBy,
    note: 'Tạo từ bước Confirm Sale'
  };

  addTransaction(newTransaction);
  return newTransaction;
};

// ... (existing code, ensure initialize calls mock)

// MEETINGS
export const getMeetings = (): IMeeting[] => {
  try {
    const data = localStorage.getItem(KEYS.MEETINGS);
    return data ? JSON.parse(data) : [];
  } catch (e) { return []; }
};

export const saveMeetings = (meetings: IMeeting[]) => {
  localStorage.setItem(KEYS.MEETINGS, JSON.stringify(meetings));
  emitClientEvent('educrm:meetings-changed');
};

export const addMeeting = (meeting: IMeeting) => {
  const meetings = getMeetings();
  meetings.unshift(meeting);
  localStorage.setItem(KEYS.MEETINGS, JSON.stringify(meetings));
  emitClientEvent('educrm:meetings-changed');
  return meetings;
};

export const updateMeeting = (updated: IMeeting) => {
  const meetings = getMeetings();
  const idx = meetings.findIndex(m => m.id === updated.id);
  if (idx !== -1) {
    meetings[idx] = updated;
    localStorage.setItem(KEYS.MEETINGS, JSON.stringify(meetings));
    emitClientEvent('educrm:meetings-changed');
    return true;
  }
  return false;
};

// STUDENTS
export const getStudents = (): any[] => {
  try {
    const data = localStorage.getItem(KEYS.STUDENTS);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
};

export const saveStudents = (students: any[]) => {
  localStorage.setItem(KEYS.STUDENTS, JSON.stringify(students));
  emitClientEvent('educrm:students-changed');
};

export const updateStudent = (updated: any) => {
  const list = getStudents();
  const idx = list.findIndex(s => s.id === updated.id);
  if (idx !== -1) {
    list[idx] = updated;
    saveStudents(list);
    return true;
  }
  return false;
};

export const getAdmissions = (): IAdmission[] => {
  try {
    const data = localStorage.getItem(KEYS.ADMISSIONS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveAdmissions = (admissions: IAdmission[]) => {
  localStorage.setItem(KEYS.ADMISSIONS, JSON.stringify(admissions));
  emitClientEvent('educrm:admissions-changed');
  emitClientEvent('educrm_cases_updated');
};

export const addAdmission = (admission: IAdmission) => {
  const list = getAdmissions();
  list.unshift(admission);
  saveAdmissions(list);
  return admission;
};

export const updateAdmission = (updated: IAdmission) => {
  const list = getAdmissions();
  const idx = list.findIndex(a => a.id === updated.id);
  if (idx !== -1) {
    list[idx] = {
      ...updated,
      updatedAt: updated.updatedAt || new Date().toISOString()
    };
    saveAdmissions(list);
    return true;
  }
  return false;
};
export const getClassStudents = (): IClassStudent[] => {
  try {
    const data = localStorage.getItem(KEYS.CLASS_STUDENTS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveClassStudents = (classStudents: IClassStudent[]) => {
  localStorage.setItem(KEYS.CLASS_STUDENTS, JSON.stringify(classStudents));
  emitClientEvent('educrm:class-students-changed');
};

const getDefaultDebtTerms = (): IDebtTerm[] => [
  {
    termNo: 1,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    amount: 5000000,
    status: 'UNPAID'
  },
  {
    termNo: 2,
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    amount: 5000000,
    status: 'UNPAID'
  }
];

const normalizeDebtTerms = (terms?: IDebtTerm[]): IDebtTerm[] => {
  const now = Date.now();
  const source = Array.isArray(terms) && terms.length ? terms : getDefaultDebtTerms();
  return source.map((term, index) => {
    const due = new Date(term.dueDate).getTime();
    const isOverdue = !Number.isNaN(due) && due < now;
    return {
      termNo: term.termNo || index + 1,
      dueDate: term.dueDate,
      amount: Number(term.amount || 0),
      status: term.status === 'PAID' ? 'PAID' : isOverdue ? 'OVERDUE' : 'UNPAID'
    };
  });
};

const summarizeDebt = (terms?: IDebtTerm[]) => {
  const normalized = normalizeDebtTerms(terms);
  const unpaid = normalized.filter((term) => term.status !== 'PAID');
  const totalDebt = unpaid.reduce((sum, term) => sum + term.amount, 0);
  const nearest = unpaid
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .find(Boolean);
  return {
    debtTerms: normalized,
    totalDebt,
    nearestDueDate: nearest?.dueDate,
    debtStatus: totalDebt <= 0 ? 'DA_DONG' : normalized.some((term) => term.status === 'OVERDUE') ? 'QUA_HAN' : 'THIEU'
  } as const;
};

export const getClassStudentsByClassId = (classId: string): IClassStudent[] =>
  getClassStudents().filter((item) => item.classId === classId);

export const addStudentToClass = (classId: string, studentId: string): IClassStudent => {
  // TODO: replace mock service with BE API
  const list = getClassStudents();
  const existing = list.find((item) => item.classId === classId && item.studentId === studentId);
  if (existing) return existing;

  const debtSummary = summarizeDebt();
  const newRecord: IClassStudent = {
    id: `CS-${Date.now()}`,
    classId,
    studentId,
    status: 'ACTIVE',
    studentStatus: 'ACTIVE',
    debtStatus: debtSummary.debtStatus,
    debtTerms: debtSummary.debtTerms,
    totalDebt: debtSummary.totalDebt,
    nearestDueDate: debtSummary.nearestDueDate,
    createdAt: Date.now()
  };

  list.unshift(newRecord);
  saveClassStudents(list);
  return newRecord;
};

export const removeStudentFromClass = (classId: string, studentId: string) => {
  const list = getClassStudents();
  const next = list.filter((item) => !(item.classId === classId && item.studentId === studentId));
  saveClassStudents(next);
  return next;
};

export const transferStudentClass = (studentId: string, fromClassId: string, toClassId: string) => {
  // TODO: replace storage with BE API
  if (fromClassId === toClassId) {
    throw new Error('Lớp đích phải khác lớp hiện tại');
  }

  const list = getClassStudents();
  const from = list.find((item) => item.classId === fromClassId && item.studentId === studentId);
  if (!from) throw new Error('Không tìm thấy học viên trong lớp hiện tại');

  const existsInTarget = list.find((item) => item.classId === toClassId && item.studentId === studentId);
  const filtered = list.filter((item) => !(item.classId === fromClassId && item.studentId === studentId));

  if (!existsInTarget) {
    const debtSummary = summarizeDebt(from.debtTerms);
    filtered.unshift({
      ...from,
      id: `CS-${Date.now()}`,
      classId: toClassId,
      debtTerms: debtSummary.debtTerms,
      totalDebt: debtSummary.totalDebt,
      nearestDueDate: debtSummary.nearestDueDate,
      debtStatus: debtSummary.debtStatus,
      createdAt: Date.now()
    });
  }

  saveClassStudents(filtered);
  return filtered;
};

export const updateDebtTerms = (classId: string, studentId: string, debtTerms: IDebtTerm[]) => {
  const list = getClassStudents();
  const idx = list.findIndex((item) => item.classId === classId && item.studentId === studentId);
  if (idx < 0) return null;
  const debtSummary = summarizeDebt(debtTerms);
  list[idx] = {
    ...list[idx],
    debtTerms: debtSummary.debtTerms,
    debtStatus: debtSummary.debtStatus,
    totalDebt: debtSummary.totalDebt,
    nearestDueDate: debtSummary.nearestDueDate
  };
  saveClassStudents(list);
  return list[idx];
};

export const markDebtTermPaid = (classId: string, studentId: string, termNo: number) => {
  const item = getClassStudents().find((entry) => entry.classId === classId && entry.studentId === studentId);
  if (!item) return null;
  const debtTerms = normalizeDebtTerms(item.debtTerms).map((term) =>
    term.termNo === termNo ? { ...term, status: 'PAID' as const } : term
  );
  return updateDebtTerms(classId, studentId, debtTerms);
};

export const getTrainingClasses = (): ITrainingClass[] => {
  try {
    const data = localStorage.getItem(KEYS.TRAINING_CLASSES);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveTrainingClasses = (classes: ITrainingClass[]) => {
  localStorage.setItem(KEYS.TRAINING_CLASSES, JSON.stringify(classes));
  emitClientEvent('educrm:training-classes-changed');
};

export const updateClassStatus = (classId: string, status: ITrainingClass['status']) => {
  const classes = getTrainingClasses();
  const idx = classes.findIndex((item) => item.id === classId || item.code === classId);
  if (idx < 0) return null;
  classes[idx] = { ...classes[idx], status };
  saveTrainingClasses(classes);
  return classes[idx];
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const parseDate = (value?: string): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toDateOnly = (value: Date) => {
  const year = value.getUTCFullYear();
  const month = `${value.getUTCMonth() + 1}`.padStart(2, '0');
  const day = `${value.getUTCDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getAllClassSessions = (): IClassSession[] => {
  try {
    const data = localStorage.getItem(KEYS.CLASS_SESSIONS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveClassSessions = (sessions: IClassSession[]) => {
  localStorage.setItem(KEYS.CLASS_SESSIONS, JSON.stringify(sessions));
  emitClientEvent('educrm:class-sessions-changed');
};

const getAllAttendance = (): IAttendanceRecord[] => {
  try {
    const data = localStorage.getItem(KEYS.ATTENDANCE);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveAttendance = (records: IAttendanceRecord[]) => {
  localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(records));
  emitClientEvent('educrm:attendance-changed');
};

const getAllStudyNotes = (): IStudyNote[] => {
  try {
    const data = localStorage.getItem(KEYS.STUDY_NOTES);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveStudyNotes = (notes: IStudyNote[]) => {
  localStorage.setItem(KEYS.STUDY_NOTES, JSON.stringify(notes));
  emitClientEvent('educrm:study-notes-changed');
};

const buildDefaultSessions = (classInfo?: ITrainingClass): IClassSession[] => {
  const now = new Date();
  const start = parseDate(classInfo?.startDate) ?? now;
  const end = parseDate(classInfo?.endDate);
  const hasWindow = !!end && end.getTime() > start.getTime();
  const sessionCount = hasWindow
    ? clamp(Math.ceil((end.getTime() - start.getTime()) / (7 * DAY_IN_MS)) * 2, 5, 10)
    : 5;

  return Array.from({ length: sessionCount }, (_, index) => {
    const order = index + 1;
    const date =
      hasWindow && end
        ? new Date(start.getTime() + Math.round((index / Math.max(sessionCount - 1, 1)) * (end.getTime() - start.getTime())))
        : new Date(start.getTime() + index * 7 * DAY_IN_MS);
    return {
      id: `SESSION-${classInfo?.id || 'CLASS'}-${order}`,
      classId: classInfo?.id || '',
      date: toDateOnly(date),
      title: `Buổi ${order} - Bài ${order}`,
      order
    };
  });
};

export const getSessionsByClassId = (classId: string): IClassSession[] => {
  return getAllClassSessions()
    .filter((item) => item.classId === classId)
    .sort((a, b) => (a.order - b.order) || a.date.localeCompare(b.date));
};

export const ensureDefaultSessionsForClass = (classId: string): IClassSession[] => {
  const existing = getSessionsByClassId(classId);
  if (existing.length > 0) return existing;

  // TODO: replace localStorage seed logic by backend API schedule endpoint.
  const classInfo = getTrainingClasses().find((item) => item.id === classId || item.code === classId);
  const seeded = buildDefaultSessions(classInfo).map((item) => ({ ...item, classId }));
  const next = [...getAllClassSessions(), ...seeded];
  saveClassSessions(next);
  return seeded;
};

export const getAttendanceByClassId = (classId: string): IAttendanceRecord[] => {
  return getAllAttendance().filter((item) => item.classId === classId);
};

export const upsertAttendance = ({
  classId,
  studentId,
  sessionId,
  status,
  updatedBy = 'training'
}: {
  classId: string;
  studentId: string;
  sessionId: string;
  status: AttendanceStatus;
  updatedBy?: string;
}) => {
  // TODO: replace localStorage write with backend API mutation.
  const list = getAllAttendance();
  const idx = list.findIndex(
    (item) => item.classId === classId && item.studentId === studentId && item.sessionId === sessionId
  );
  const next: IAttendanceRecord = idx >= 0
    ? {
      ...list[idx],
      status,
      updatedAt: Date.now(),
      updatedBy
    }
    : {
      id: `ATT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      classId,
      studentId,
      sessionId,
      status,
      updatedAt: Date.now(),
      updatedBy
    };

  if (idx >= 0) {
    list[idx] = next;
  } else {
    list.unshift(next);
  }
  saveAttendance(list);
  return next;
};

export const getStudyNotesByClassId = (classId: string): IStudyNote[] => {
  return getAllStudyNotes().filter((item) => item.classId === classId);
};

export const upsertStudyNote = ({
  classId,
  studentId,
  sessionId,
  note,
  createdBy = 'training',
  updatedBy = 'training'
}: {
  classId: string;
  studentId: string;
  sessionId: string;
  note: string;
  createdBy?: string;
  updatedBy?: string;
}) => {
  // TODO: replace localStorage write with backend API mutation.
  const list = getAllStudyNotes();
  const idx = list.findIndex(
    (item) => item.classId === classId && item.studentId === studentId && item.sessionId === sessionId
  );

  if (idx >= 0) {
    const next: IStudyNote = {
      ...list[idx],
      note,
      updatedAt: Date.now(),
      updatedBy
    };
    list[idx] = next;
    saveStudyNotes(list);
    return next;
  }

  const next: IStudyNote = {
    id: `NOTE-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    classId,
    studentId,
    sessionId,
    note,
    createdAt: Date.now(),
    createdBy
  };
  list.unshift(next);
  saveStudyNotes(list);
  return next;
};

export const getStudentScores = (): IStudentScore[] => {
  try {
    const data = localStorage.getItem(KEYS.STUDENT_SCORES);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveStudentScores = (scores: IStudentScore[]) => {
  localStorage.setItem(KEYS.STUDENT_SCORES, JSON.stringify(scores));
  emitClientEvent('educrm:student-scores-changed');
};

export const getStudentScoresByClassId = (classId: string): IStudentScore[] =>
  getStudentScores().filter((item) => item.classId === classId);

export const upsertStudentScore = (
  classId: string,
  studentId: string,
  patch: Partial<Pick<IStudentScore, 'assignment' | 'midterm' | 'final'>>
) => {
  const list = getStudentScores();
  const idx = list.findIndex((item) => item.classId === classId && item.studentId === studentId);
  const current = idx >= 0 ? list[idx] : ({ id: `SC-${Date.now()}`, classId, studentId, updatedAt: Date.now() } as IStudentScore);
  const assignment = patch.assignment ?? current.assignment ?? 0;
  const midterm = patch.midterm ?? current.midterm ?? 0;
  const finalScore = patch.final ?? current.final ?? 0;
  const average = Number(((assignment + midterm + finalScore) / 3).toFixed(1));
  const rank: IStudentScore['rank'] = average >= 8.5 ? 'A' : average >= 7 ? 'B' : average >= 5.5 ? 'C' : 'D';
  const next: IStudentScore = {
    ...current,
    assignment,
    midterm,
    final: finalScore,
    average,
    rank,
    updatedAt: Date.now()
  };
  if (idx >= 0) {
    list[idx] = next;
  } else {
    list.unshift(next);
  }
  saveStudentScores(list);
  return next;
};

export const getTeachers = (): ITeacher[] => {
  try {
    const data = localStorage.getItem(KEYS.TEACHERS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveTeachers = (teachers: ITeacher[]) => {
  localStorage.setItem(KEYS.TEACHERS, JSON.stringify(teachers));
  emitClientEvent('educrm:teachers-changed');
};

export const getTeacherById = (id: string): ITeacher | undefined => getTeachers().find((t) => t.id === id);

export const getAllLogNotes = (): ILogNote[] => {
  try {
    const data = localStorage.getItem(KEYS.LOG_NOTES);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const getLogNotes = (entityType: ILogNote['entityType'], entityId: string): ILogNote[] => {
  return getAllLogNotes()
    .filter((log) => log.entityType === entityType && log.entityId === entityId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const addLogNote = (note: ILogNote) => {
  const list = getAllLogNotes();
  list.unshift(note);
  localStorage.setItem(KEYS.LOG_NOTES, JSON.stringify(list));
  emitClientEvent('educrm:log-notes-changed');
  return note;
};

export const addClassLog = (classId: string, action: string, message: string, createdBy = 'system') => {
  return addLogNote({
    id: `LOG-CLASS-${Date.now()}`,
    entityType: 'CLASS',
    entityId: classId,
    action,
    message,
    createdAt: new Date().toISOString(),
    createdBy
  });
};

export const updateTeacher = (updated: ITeacher, actor = 'system', action = 'UPDATE_PROFILE', message = 'Cập nhật hồ sơ giáo viên') => {
  const list = getTeachers();
  const idx = list.findIndex((t) => t.id === updated.id);
  if (idx === -1) return false;

  list[idx] = {
    ...updated,
    updatedAt: new Date().toISOString()
  };
  saveTeachers(list);

  addLogNote({
    id: `LOG-${Date.now()}`,
    entityType: 'TEACHER',
    entityId: updated.id,
    action,
    message,
    createdAt: new Date().toISOString(),
    createdBy: actor
  });

  return true;
};

export const addTeacher = (teacher: ITeacher, actor = 'system') => {
  const list = getTeachers();
  list.unshift({
    ...teacher,
    updatedAt: new Date().toISOString()
  });
  saveTeachers(list);
  addLogNote({
    id: `LOG-${Date.now()}`,
    entityType: 'TEACHER',
    entityId: teacher.id,
    action: 'CREATE_TEACHER',
    message: `Tạo mới hồ sơ giáo viên ${teacher.fullName}`,
    createdAt: new Date().toISOString(),
    createdBy: actor
  });
  return teacher;
};

export const assignTeacherToClass = (teacherId: string, classId: string, actor = 'system') => {
  // TODO: replace mock service with BE API
  const teacher = getTeacherById(teacherId);
  if (!teacher) return { ok: false, error: 'Không tìm thấy giáo viên' };

  if (!teacher.assignedClassIds.includes(classId)) {
    teacher.assignedClassIds = [...teacher.assignedClassIds, classId];
  }

  const classes = getTrainingClasses();
  const classIndex = classes.findIndex((c) => c.id === classId || c.code === classId);
  if (classIndex >= 0) {
    classes[classIndex] = {
      ...classes[classIndex],
      teacherId
    };
    saveTrainingClasses(classes);
  }

  updateTeacher(teacher, actor, 'ASSIGN_CLASS', `Gán lớp ${classId} cho giáo viên`);
  return { ok: true };
};

export const unassignTeacherFromClass = (teacherId: string, classId: string, actor = 'system') => {
  // TODO: replace mock service with BE API
  const teacher = getTeacherById(teacherId);
  if (!teacher) return { ok: false, error: 'Không tìm thấy giáo viên' };

  teacher.assignedClassIds = teacher.assignedClassIds.filter((id) => id !== classId);

  const classes = getTrainingClasses();
  const classIndex = classes.findIndex((c) => c.id === classId || c.code === classId);
  if (classIndex >= 0 && classes[classIndex].teacherId === teacherId) {
    classes[classIndex] = {
      ...classes[classIndex],
      teacherId: ''
    };
    saveTrainingClasses(classes);
  }

  updateTeacher(teacher, actor, 'UNASSIGN_CLASS', `Bỏ lớp ${classId} khỏi giáo viên`);
  return { ok: true };
};
export const createStudentFromQuotation = (quotation: IQuotation) => {
  const existing = getStudents();
  const existingByCustomer = existing.find((s: any) =>
    (quotation.customerId && s.customerId === quotation.customerId) ||
    (quotation.leadId && s.customerId === quotation.leadId)
  );
  if (existingByCustomer) return existingByCustomer;

  const nextId = existing.length + 1;
  const code = `HV24-${nextId.toString().padStart(4, '0')}`;
  const lead = getLeadById(quotation.leadId || '');

  const newStudent: any = {
    id: `ST-${Date.now()}`,
    code,
    name: quotation.customerName,
    phone: lead?.phone || 'N/A',
    email: lead?.email || '',
    campus: 'Hà Nội',
    dealId: quotation.dealId,
    soId: quotation.id,
    salesPersonId: quotation.createdBy,
    customerId: quotation.customerId || quotation.leadId,
    level: quotation.serviceType,
    note: `Created from SO: ${quotation.soCode}. Planned class: ${quotation.classCode || 'N/A'}`,
    status: StudentStatus.ADMISSION,
    enrollmentStatus: 'CHUA_GHI_DANH',
    admissionDate: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  existing.unshift(newStudent);
  saveStudents(existing);
  return newStudent;
};

// --- INITIAL MOCK DATA (SEED DATA) ---
const INITIAL_LEADS: ILead[] = [
  {
    id: 'SLA-001',
    name: 'Trần Van Nguy Hiểm',
    phone: '090111222',
    email: 'danger@test.com',
    source: 'SLA Test',
    status: 'NEW' as LeadStatus,
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    ownerId: 'u1',
    activities: [],
    program: 'Du học Đức',
    city: 'Hà Nội',
    lastInteraction: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    notes: 'SLA Test Lead',
    slaStatus: 'danger'
  },
  {
    id: 'SLA-002',
    name: 'Nguyễn Thị Cảnh Báo',
    phone: '090333444',
    email: 'warning@test.com',
    source: 'SLA Test',
    status: 'NEW' as LeadStatus,
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    ownerId: 'u1',
    activities: [],
    program: 'Tiếng Đức',
    city: 'Đà Nẵng',
    lastInteraction: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    notes: 'SLA Test Lead',
    slaStatus: 'warning'
  },
  {
    id: 'LEAD-005',
    name: 'Đặng Thảo Chi',
    phone: '0988777666',
    email: 'thaochi@example.com',
    source: 'TikTok',
    status: 'CONTACTED' as LeadStatus,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    ownerId: 'u1',
    program: 'Du học nghề Úc',
    city: 'Hà Nội',
    lastInteraction: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    notes: 'Quan tâm ngành nhà hàng khách sạn',
    slaStatus: 'normal',
    activities: []
  },
  {
    id: 'LEAD-006',
    name: 'Vũ Minh Tuấn',
    phone: '0912345678',
    email: 'minhtuan@example.com',
    source: 'Google',
    status: 'NEW' as LeadStatus,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    ownerId: 'u3',
    program: 'Du học Đức',
    city: 'Quảng Ninh',
    lastInteraction: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Chưa liên hệ được',
    slaStatus: 'danger',
    activities: []
  },
  {
    id: 'LEAD-007',
    name: 'Hoàng Thị Lan',
    phone: '0933221100',
    email: 'hlan@example.com',
    source: 'Referral',
    status: 'NEW' as LeadStatus,
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    ownerId: 'u2',
    program: 'Tiếng Đức',
    city: 'Hồ Chí Minh',
    lastInteraction: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    notes: 'Bạn của học viên cũ giới thiệu',
    slaStatus: 'normal',
    activities: []
  }
];

const INITIAL_DEALS: IDeal[] = [];
const INITIAL_CONTRACTS: IContract[] = [];
const INITIAL_QUOTATIONS: IQuotation[] = [
  {
    id: 'Q-001',
    soCode: 'SO001',
    customerName: 'Nguyễn Văn A',
    customerId: 'CUST-001',
    studentId: 'ST-0001',
    serviceType: 'StudyAbroad',
    product: 'Du học Đức - Combo A1-B1',
    amount: 45000000,
    finalAmount: 45000000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: QuotationStatus.LOCKED,
    transactionStatus: 'DA_DUYET',
    contractStatus: 'enrolled',
    createdBy: 'u1'
  },
  {
    id: 'Q-002',
    soCode: 'SO002',
    customerName: 'Trần Thị B',
    customerId: 'CUST-002',
    studentId: 'ST-0002',
    serviceType: 'Training',
    product: 'Khóa tiếng Đức B1-B2',
    amount: 55000000,
    finalAmount: 55000000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: QuotationStatus.LOCKED,
    transactionStatus: 'DA_DUYET',
    contractStatus: 'signed_contract',
    createdBy: 'u2'
  },
  {
    id: 'Q-003',
    soCode: 'SO003',
    customerName: 'Lê Van C',
    customerId: 'CUST-003',
    studentId: 'ST-0003',
    serviceType: 'Combo',
    product: 'Combo Du học nghề Úc',
    amount: 210000000,
    finalAmount: 210000000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: QuotationStatus.LOCKED,
    transactionStatus: 'DA_DUYET',
    contractStatus: 'signed_contract',
    createdBy: 'u1'
  },
  {
    id: 'Q-004',
    soCode: 'SO004',
    customerName: 'Phạm Thị D',
    customerId: 'CUST-004',
    studentId: 'ST-0004',
    serviceType: 'StudyAbroad',
    product: 'Du học Đức - Trọn gói',
    amount: 180000000,
    finalAmount: 170000000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: QuotationStatus.LOCKED,
    transactionStatus: 'DA_DUYET',
    contractStatus: 'enrolled',
    createdBy: 'u1'
  },
  {
    id: 'Q-005',
    soCode: 'SO005',
    customerName: 'Hoàng Van E',
    customerId: 'CUST-005',
    serviceType: 'Training',
    product: 'Tiếng Đức A1-B1',
    amount: 25000000,
    finalAmount: 25000000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: QuotationStatus.SALE_CONFIRMED,
    saleConfirmedAt: new Date().toISOString(),
    saleConfirmedBy: 'u1',
    transactionStatus: 'TU_CHOI',
    paymentMethod: 'CASH',
    paymentProof: 'PT-005',
    contractStatus: 'sale_confirmed',
    createdBy: 'u1'
  },
  {
    id: 'Q-006',
    soCode: 'SO006',
    customerName: 'Nguyễn Thị F',
    customerId: 'CUST-006',
    serviceType: 'Training',
    product: 'Khóa tiếng Đức A2',
    amount: 30000000,
    finalAmount: 30000000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: QuotationStatus.SALE_CONFIRMED,
    saleConfirmedAt: new Date().toISOString(),
    saleConfirmedBy: 'u2',
    transactionStatus: 'CHO_DUYET',
    paymentMethod: 'CK',
    paymentProof: 'UNC-006',
    contractStatus: 'sale_confirmed',
    createdBy: 'u2'
  },
  {
    id: 'Q-007',
    soCode: 'SO007',
    customerName: 'Đỗ Văn G',
    customerId: 'CUST-007',
    serviceType: 'Combo',
    product: 'Combo Du học Đức',
    amount: 120000000,
    finalAmount: 120000000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: QuotationStatus.SALE_CONFIRMED,
    saleConfirmedAt: new Date().toISOString(),
    saleConfirmedBy: 'u1',
    transactionStatus: 'CHO_DUYET',
    paymentMethod: 'CK',
    paymentProof: 'UNC-007',
    contractStatus: 'sale_confirmed',
    createdBy: 'u1'
  }
];

const INITIAL_STUDENTS: any[] = [
  {
    id: 'ST-0001',
    code: 'HV24-0001',
    name: 'Nguyễn Văn A',
    phone: '0900000001',
    email: 'a@example.com',
    customerId: 'CUST-001',
    soId: 'Q-001',
    campus: 'Hà Nội',
    className: 'GER-A1-K35',
    status: StudentStatus.ENROLLED,
    enrollmentStatus: 'DA_GHI_DANH',
    createdAt: new Date().toISOString()
  },
  {
    id: 'ST-0002',
    code: 'HV24-0002',
    name: 'Trần Thị B',
    phone: '0900000002',
    email: 'b@example.com',
    customerId: 'CUST-002',
    soId: 'Q-002',
    campus: 'Hà Nội',
    status: StudentStatus.ADMISSION,
    enrollmentStatus: 'CHUA_GHI_DANH',
    createdAt: new Date().toISOString()
  },
  {
    id: 'ST-0003',
    code: 'HV24-0003',
    name: 'Lê Van C',
    phone: '0900000003',
    email: 'c@example.com',
    customerId: 'CUST-003',
    soId: 'Q-003',
    campus: 'HCM',
    status: StudentStatus.ADMISSION,
    enrollmentStatus: 'CHUA_GHI_DANH',
    createdAt: new Date().toISOString()
  },
  {
    id: 'ST-0004',
    code: 'HV24-0004',
    name: 'Phạm Thị D',
    phone: '0900000004',
    email: 'd@example.com',
    customerId: 'CUST-004',
    soId: 'Q-004',
    campus: 'Đà Nẵng',
    className: 'GER-B1-K12',
    status: StudentStatus.ENROLLED,
    enrollmentStatus: 'DA_GHI_DANH',
    createdAt: new Date().toISOString()
  },
  {
    id: 'ST-0005',
    code: 'HV24-0005',
    name: 'Hoàng Van E',
    phone: '0900000005',
    email: 'e@example.com',
    customerId: 'CUST-005',
    soId: 'Q-005',
    campus: 'Hà Nội',
    status: StudentStatus.ADMISSION,
    enrollmentStatus: 'CHUA_GHI_DANH',
    createdAt: new Date().toISOString()
  }
];

const INITIAL_ADMISSIONS: IAdmission[] = [
  {
    id: 'ADM-0001',
    code: 'ADM0001',
    studentId: 'ST-0002',
    quotationId: 'Q-002',
    classId: 'GER-A1-K36',
    campusId: 'Hà Nội',
    status: 'CHO_DUYET',
    createdBy: 'u1',
    createdAt: new Date().toISOString()
  },
  {
    id: 'ADM-0002',
    code: 'ADM0002',
    studentId: 'ST-0003',
    quotationId: 'Q-003',
    classId: 'AUS-COOK-K01',
    campusId: 'HCM',
    status: 'CHO_DUYET',
    createdBy: 'u2',
    createdAt: new Date().toISOString()
  },
  {
    id: 'ADM-0003',
    code: 'ADM0003',
    studentId: 'ST-0001',
    quotationId: 'Q-001',
    classId: 'GER-A1-K35',
    campusId: 'Hà Nội',
    status: 'DA_DUYET',
    createdBy: 'u1',
    createdAt: new Date().toISOString()
  }
];

const INITIAL_TRAINING_CLASSES: ITrainingClass[] = [
  { id: 'GER-A1-K35', code: 'GER-A1-K35', name: 'Lớp GER-A1-K35', campus: 'Hà Nội', schedule: 'T2-4-6 18:30', language: 'Tiếng Đức', level: 'A1', classType: 'Offline', maxStudents: 25, startDate: '2025-09-10', endDate: '2025-12-20', status: 'ACTIVE', teacherId: 'T001' },
  { id: 'GER-A1-K36', code: 'GER-A1-K36', name: 'Lớp GER-A1-K36', campus: 'Hà Nội', schedule: 'T3-5-7 19:00', language: 'Tiếng Đức', level: 'A1', classType: 'Offline', maxStudents: 25, startDate: '2025-09-12', endDate: '2025-12-22', status: 'ACTIVE', teacherId: 'T001' },
  { id: 'AUS-COOK-K01', code: 'AUS-COOK-K01', name: 'Lớp AUS-COOK-K01', campus: 'HCM', schedule: 'T2-4 20:00', language: 'Tiếng Anh', level: 'Cookery', classType: 'Offline', maxStudents: 20, startDate: '2025-10-01', endDate: '2026-01-10', status: 'ACTIVE', teacherId: 'T002' },
  { id: 'DE-A2-K10', code: 'DE-A2-K10', name: 'Lớp DE-A2-K10', campus: 'Hà Nội', schedule: 'T3-5 08:30', language: 'Tiếng Đức', level: 'A2', classType: 'Offline', maxStudents: 25, startDate: '2025-05-01', endDate: '2025-08-15', status: 'DONE', teacherId: '' },
  { id: 'DE-A1-K24', code: 'DE-A1-K24', name: 'Lớp Tiếng Đức A1 - K24', campus: 'Hà Nội', schedule: 'T2-4-6 18:30', language: 'Tiếng Đức', level: 'A1', classType: 'Offline', maxStudents: 25, startDate: '2025-09-15', endDate: '2025-12-15', status: 'ACTIVE', teacherId: 'T001' }
];

const INITIAL_TEACHERS: ITeacher[] = [
  {
    id: 'T001',
    code: 'GV001',
    fullName: 'Nguyễn Thị Lan',
    phone: '0901234567',
    dob: '1990-08-15',
    email: 'lan.nguyen@educrm.com',
    address: 'Ba Đình, Hà Nội',
    contractType: 'Full-time',
    contractNote: 'HĐ chính thức 12 tháng',
    startDate: '2022-01-01',
    teachSubjects: ['German'],
    teachLevels: ['A1', 'A2', 'B1'],
    certificates: ['Goethe C1', 'Pedagogy Cert'],
    status: 'ACTIVE',
    assignedClassIds: ['GER-A1-K35', 'GER-A1-K36'],
    createdAt: new Date().toISOString()
  },
  {
    id: 'T002',
    code: 'GV002',
    fullName: 'Hoàng Van Nam',
    phone: '0912345678',
    dob: '1988-05-10',
    email: 'nam.hoang@educrm.com',
    address: 'Q1, TP.HCM',
    contractType: 'Part-time',
    contractNote: 'Lịch dạy theo ca',
    startDate: '2023-03-15',
    teachSubjects: ['English'],
    teachLevels: ['IELTS', 'TOEIC'],
    certificates: ['IELTS 8.5', 'TESOL'],
    status: 'ACTIVE',
    assignedClassIds: ['AUS-COOK-K01'],
    createdAt: new Date().toISOString()
  },
  {
    id: 'T003',
    code: 'GV003',
    fullName: 'Trần Thị Hoa',
    phone: '0987654321',
    dob: '1995-11-20',
    email: 'hoa.tran@educrm.com',
    address: 'Cầu Giấy, Hà Nội',
    contractType: 'Full-time',
    contractNote: 'Đang tạm nghỉ',
    startDate: '2021-06-01',
    teachSubjects: ['Chinese'],
    teachLevels: ['HSK3', 'HSK4', 'HSK5'],
    certificates: ['HSK 6'],
    status: 'INACTIVE',
    assignedClassIds: [],
    createdAt: new Date().toISOString()
  }
];

const INITIAL_LOG_NOTES: ILogNote[] = [
  {
    id: 'LOG-T001-1',
    entityType: 'TEACHER',
    entityId: 'T001',
    action: 'CREATE_TEACHER',
    message: 'Tạo mới hồ sơ giáo viên Nguyễn Thị Lan',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: 'system'
  },
  {
    id: 'LOG-T002-1',
    entityType: 'TEACHER',
    entityId: 'T002',
    action: 'ASSIGN_CLASS',
    message: 'Gán lớp AUS-COOK-K01 cho giáo viên',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: 'u1'
  },
  {
    id: 'LOG-CLS-1',
    entityType: 'CLASS',
    entityId: 'GER-A1-K35',
    action: 'CLASS_CREATED',
    message: 'Khởi tạo lớp và danh sách học viên demo',
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: 'system'
  },
  {
    id: 'LOG-CLS-2',
    entityType: 'CLASS',
    entityId: 'GER-A1-K36',
    action: 'CLASS_CREATED',
    message: 'Khởi tạo lớp và danh sách học viên demo',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: 'system'
  }
];
const INITIAL_CLASS_STUDENTS: IClassStudent[] = [
  {
    id: 'CS-0001',
    classId: 'GER-A1-K35',
    studentId: 'ST-0001',
    status: 'ACTIVE',
    studentStatus: 'ACTIVE',
    debtStatus: 'DA_DONG',
    debtTerms: [
      { termNo: 1, dueDate: '2025-09-12', amount: 15000000, status: 'PAID' },
      { termNo: 2, dueDate: '2025-10-12', amount: 15000000, status: 'PAID' }
    ],
    totalDebt: 0,
    nearestDueDate: '',
    createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000
  },
  {
    id: 'CS-0002',
    classId: 'GER-A1-K36',
    studentId: 'ST-0002',
    status: 'ACTIVE',
    studentStatus: 'ACTIVE',
    debtStatus: 'THIEU',
    debtTerms: [
      { termNo: 1, dueDate: '2025-11-12', amount: 20000000, status: 'PAID' },
      { termNo: 2, dueDate: '2026-02-12', amount: 18000000, status: 'UNPAID' }
    ],
    totalDebt: 18000000,
    nearestDueDate: '2026-02-12',
    createdAt: Date.now() - 24 * 60 * 60 * 1000
  },
  {
    id: 'CS-0003',
    classId: 'AUS-COOK-K01',
    studentId: 'ST-0003',
    status: 'ACTIVE',
    studentStatus: 'ACTIVE',
    debtStatus: 'QUA_HAN',
    debtTerms: [
      { termNo: 1, dueDate: '2025-10-05', amount: 50000000, status: 'PAID' },
      { termNo: 2, dueDate: '2025-12-10', amount: 45000000, status: 'OVERDUE' }
    ],
    totalDebt: 45000000,
    nearestDueDate: '2025-12-10',
    createdAt: Date.now() - 18 * 60 * 60 * 1000
  }
];
const INITIAL_STUDENT_SCORES: IStudentScore[] = [
  { id: 'SC-0001', classId: 'GER-A1-K35', studentId: 'ST-0001', assignment: 8.5, midterm: 8, final: 8.7, average: 8.4, rank: 'B', updatedAt: Date.now() - 2 * 60 * 60 * 1000 },
  { id: 'SC-0002', classId: 'GER-A1-K36', studentId: 'ST-0002', assignment: 7.5, midterm: 7, final: 7.2, average: 7.2, rank: 'B', updatedAt: Date.now() - 3 * 60 * 60 * 1000 },
  { id: 'SC-0003', classId: 'AUS-COOK-K01', studentId: 'ST-0003', assignment: 6, midterm: 6.5, final: 6, average: 6.2, rank: 'C', updatedAt: Date.now() - 4 * 60 * 60 * 1000 }
];
const INITIAL_TRANSACTIONS: ITransaction[] = [
  {
    id: 'TRX-0001',
    quotationId: 'Q-006',
    soCode: 'SO006',
    customerId: 'CUST-006',
    studentName: 'Nguyễn Thị F',
    amount: 30000000,
    method: 'CHUYEN_KHOAN',
    proofType: 'UNC',
    bankRefCode: 'UNC-2026-0006',
    status: 'CHO_DUYET',
    createdAt: Date.now() - 3 * 60 * 60 * 1000,
    createdBy: 'u2',
    note: 'Chờ kế toán duyệt UNC'
  },
  {
    id: 'TRX-0002',
    quotationId: 'Q-007',
    soCode: 'SO007',
    customerId: 'CUST-007',
    studentName: 'Đỗ Văn G',
    amount: 120000000,
    method: 'CHUYEN_KHOAN',
    proofType: 'UNC',
    bankRefCode: 'UNC-2026-0007',
    status: 'CHO_DUYET',
    createdAt: Date.now() - 2 * 60 * 60 * 1000,
    createdBy: 'u1',
    note: 'Chờ duyệt giao dịch từ sale confirm'
  },
  {
    id: 'TRX-0003',
    quotationId: 'Q-004',
    soCode: 'SO004',
    customerId: 'CUST-004',
    studentName: 'Phạm Thị D',
    amount: 170000000,
    method: 'CHUYEN_KHOAN',
    proofType: 'UNC',
    bankRefCode: 'UNC-2026-0004',
    status: 'DA_DUYET',
    createdAt: Date.now() - 8 * 60 * 60 * 1000,
    createdBy: 'u1'
  },
  {
    id: 'TRX-0004',
    quotationId: 'Q-005',
    soCode: 'SO005',
    customerId: 'CUST-005',
    studentName: 'Hoàng Van E',
    amount: 25000000,
    method: 'OTHER',
    proofType: 'NONE',
    status: 'TU_CHOI',
    createdAt: Date.now() - 12 * 60 * 60 * 1000,
    createdBy: 'u1',
    note: 'Thiếu chứng từ thanh toán'
  },
  {
    id: 'TRX-0005',
    quotationId: 'Q-002',
    soCode: 'SO002',
    customerId: 'CUST-002',
    studentName: 'Trần Thị B',
    amount: 55000000,
    method: 'CHUYEN_KHOAN',
    proofType: 'UNC',
    bankRefCode: 'UNC-2026-0002',
    status: 'DA_DUYET',
    createdAt: Date.now() - 24 * 60 * 60 * 1000,
    createdBy: 'u1'
  },
  {
    id: 'TRX-0006',
    quotationId: 'Q-003',
    soCode: 'SO003',
    customerId: 'CUST-003',
    studentName: 'Lê Van C',
    amount: 210000000,
    method: 'TIEN_MAT',
    proofType: 'PHIEU_THU',
    status: 'DA_DUYET',
    createdAt: Date.now() - 30 * 60 * 60 * 1000,
    createdBy: 'u2',
    note: 'Đã duyệt phiếu thu'
  },
  {
    id: 'TRX-0007',
    quotationId: 'Q-001',
    soCode: 'SO001',
    customerId: 'CUST-001',
    studentName: 'Nguyễn Văn A',
    amount: 45000000,
    method: 'CHUYEN_KHOAN',
    proofType: 'UNC',
    bankRefCode: 'UNC-2026-0001',
    status: 'DA_DUYET',
    createdAt: Date.now() - 36 * 60 * 60 * 1000,
    createdBy: 'u1'
  }
];

// --- STORAGE FUNCTIONS ---
const findLockedQuotationForStudent = (student: any, quotations: IQuotation[]) => {
  return quotations.find(
    (q) =>
      q.status === QuotationStatus.LOCKED &&
      (q.studentId === student.id ||
        (!!student.customerId && q.customerId === student.customerId) ||
        (!!student.soId && q.id === student.soId))
  );
};

const migrateEnrollmentData = () => {
  try {
    const migrationKey = 'educrm_migration_enrollment_v1';
    if (localStorage.getItem(migrationKey) === 'done') return;

    const students: any[] = getStudents();
    const quotations: IQuotation[] = getQuotations();
    const admissions: IAdmission[] = getAdmissions();

    if (!students.length || !quotations.length || !admissions.length) {
      localStorage.setItem(migrationKey, 'done');
      return;
    }

    const studentMap = new Map(students.map((s) => [s.id, s]));
    const quotationMap = new Map(quotations.map((q) => [q.id, q]));
    const sanitizedAdmissions: IAdmission[] = [];
    let changed = false;

    for (const admission of admissions) {
      if (!admission.studentId || !admission.campusId || !admission.classId) {
        changed = true;
        continue;
      }

      const student = studentMap.get(admission.studentId);
      if (!student) {
        changed = true;
        continue;
      }

      let quotation = admission.quotationId ? quotationMap.get(admission.quotationId) : undefined;
      if (!quotation || quotation.status !== QuotationStatus.LOCKED) {
        quotation = findLockedQuotationForStudent(student, quotations);
      }

      if (!quotation) {
        changed = true;
        continue;
      }

      const normalizedAdmission: IAdmission = {
        ...admission,
        quotationId: quotation.id
      };

      if (normalizedAdmission.quotationId !== admission.quotationId) {
        changed = true;
      }

      sanitizedAdmissions.push(normalizedAdmission);

      if (normalizedAdmission.status === 'DA_DUYET') {
        studentMap.set(student.id, {
          ...student,
          campus: normalizedAdmission.campusId,
          className: normalizedAdmission.classId,
          enrollmentStatus: 'DA_GHI_DANH',
          status: StudentStatus.ENROLLED
        });

        quotationMap.set(quotation.id, {
          ...quotation,
          studentId: quotation.studentId || student.id,
          contractStatus: 'enrolled',
          updatedAt: new Date().toISOString()
        });
      }
    }

    if (changed) {
      saveAdmissions(sanitizedAdmissions);
      saveStudents(Array.from(studentMap.values()));
      localStorage.setItem(KEYS.QUOTATIONS, JSON.stringify(Array.from(quotationMap.values())));
      emitClientEvent('educrm:quotations-changed');
    }

    localStorage.setItem(migrationKey, 'done');
  } catch (error) {
    console.error('Failed to migrate enrollment data', error);
  }
};

const migrateTransactionsData = () => {
  try {
    const migrationKey = 'educrm_migration_transactions_v1';
    if (localStorage.getItem(migrationKey) === 'done') return;

    const transactions = getTransactions();
    const quotations = getQuotations();
    const quotationMap = new Map(quotations.map((q) => [q.id, q]));

    const sanitized = transactions.filter((t) => {
      if (!t.quotationId || !t.soCode) return false;
      const q = quotationMap.get(t.quotationId);
      return !!q && q.soCode === t.soCode;
    });

    const txByQuotation = new Map<string, ITransaction>();
    sanitized.forEach((tx) => {
      const existing = txByQuotation.get(tx.quotationId);
      if (!existing || tx.createdAt > existing.createdAt) {
        txByQuotation.set(tx.quotationId, tx);
      }
    });

    const updatedQuotations = quotations.map((q) => {
      const tx = txByQuotation.get(q.id);
      if (!tx) return q;
      return {
        ...q,
        transactionStatus: tx.status,
        status: q.status === QuotationStatus.SENT ? QuotationStatus.SALE_CONFIRMED : q.status,
        saleConfirmedAt: q.saleConfirmedAt || new Date(tx.createdAt).toISOString(),
        updatedAt: new Date().toISOString()
      };
    });

    if (sanitized.length !== transactions.length) {
      saveTransactions(sanitized);
    }
    localStorage.setItem(KEYS.QUOTATIONS, JSON.stringify(updatedQuotations));
    emitClientEvent('educrm:quotations-changed');

    localStorage.setItem(migrationKey, 'done');
  } catch (error) {
    console.error('Failed to migrate transactions data', error);
  }
};
const migrateClassStudentsData = () => {
  try {
    const migrationKey = 'educrm_migration_class_students_v2';
    if (localStorage.getItem(migrationKey) === 'done') return;

    const students: any[] = getStudents();
    const admissions: IAdmission[] = getAdmissions();
    const studentSet = new Set(students.map((s) => s.id));
    const classStudents = getClassStudents().filter((item) => item.classId && item.studentId && studentSet.has(item.studentId));
    const dedup = new Map<string, IClassStudent>();
    classStudents.forEach((item) => {
      const debtSummary = summarizeDebt(item.debtTerms);
      dedup.set(`${item.classId}::${item.studentId}`, {
        ...item,
        status: item.status || item.studentStatus || 'ACTIVE',
        studentStatus: item.studentStatus || item.status || 'ACTIVE',
        debtTerms: debtSummary.debtTerms,
        debtStatus: debtSummary.debtStatus,
        totalDebt: debtSummary.totalDebt,
        nearestDueDate: debtSummary.nearestDueDate
      });
    });

    admissions
      .filter((a) => a.status === 'DA_DUYET' && a.classId && a.studentId && studentSet.has(a.studentId))
      .forEach((a) => {
        const key = `${a.classId}::${a.studentId}`;
        if (!dedup.has(key)) {
          dedup.set(key, {
            id: `CS-MIG-${Date.now()}-${a.id}`,
            classId: a.classId,
            studentId: a.studentId,
            status: 'ACTIVE',
            studentStatus: 'ACTIVE',
            debtStatus: 'THIEU',
            debtTerms: getDefaultDebtTerms(),
            totalDebt: 10000000,
            nearestDueDate: getDefaultDebtTerms()[0].dueDate,
            createdAt: Date.now()
          });
        }
      });

    saveClassStudents(Array.from(dedup.values()));
    localStorage.setItem(migrationKey, 'done');
  } catch (error) {
    console.error('Failed to migrate class students data', error);
  }
};

const migrateTrainingClassesData = () => {
  try {
    const migrationKey = 'educrm_migration_training_classes_v1';
    if (localStorage.getItem(migrationKey) === 'done') return;

    const mapStatus = (status?: string): ITrainingClass['status'] => {
      const raw = (status || '').toUpperCase();
      if (raw === 'ACTIVE') return 'ACTIVE';
      if (raw === 'DONE' || raw === 'COMPLETED') return 'DONE';
      if (raw === 'CANCELED' || raw === 'CANCELLED') return 'CANCELED';
      return 'DRAFT';
    };

    const classes = getTrainingClasses().map((item) => ({
      ...item,
      status: mapStatus(item.status)
    }));
    saveTrainingClasses(classes);
    localStorage.setItem(migrationKey, 'done');
  } catch (error) {
    console.error('Failed to migrate training classes data', error);
  }
};

const MOJIBAKE_TEXT_MAP: Record<string, string> = {
  'Du h?c Ð?c - Combo A1-B1': 'Du học Đức - Combo A1-B1',
  'Khóa ti?ng Ð?c B1-B2': 'Khóa tiếng Đức B1-B2',
  'Combo Du h?c ngh? Úc': 'Combo Du học nghề Úc',
  'Du h?c Ð?c - Tr?n gói': 'Du học Đức - Trọn gói',
  'Ti?ng Ð?c A1-B1': 'Tiếng Đức A1-B1',
  'Khóa ti?ng Ð?c A2': 'Khóa tiếng Đức A2',
  'Combo Du h?c Ð?c': 'Combo Du học Đức',
  'G?i l?n 1': 'Gọi lần 1',
  'G?i l?n 2': 'Gọi lần 2',
  'Ti?m nang': 'Tiềm năng',
  'C?n tu v?n': 'Cần tư vấn'
};

const MOJIBAKE_TOKEN_MAP: Record<string, string> = {
  'Du h?c': 'Du học',
  'ti?ng': 'tiếng',
  'ngh?': 'nghề',
  'Tr?n': 'Trọn',
  'Ð?c': 'Đức',
  'G?i': 'Gọi',
  'l?n': 'lần',
  'Ti?m': 'Tiềm',
  'nang': 'năng',
  'C?n': 'Cần',
  'v?n': 'vấn'
};

const tryDecodeMojibake = (value: string): string => {
  let current = value;
  for (let i = 0; i < 2; i += 1) {
    try {
      const decoded = decodeURIComponent(escape(current));
      if (!decoded || decoded === current) break;
      current = decoded;
    } catch {
      break;
    }
  }
  return current;
};

const decodeUnicodeEscapeLiterals = (value: string): string => {
  if (!value || !value.includes('\\u')) return value;

  let current = value;
  for (let i = 0; i < 2; i += 1) {
    const decoded = current.replace(/\\u([0-9a-fA-F]{4})/g, (match, hex: string) => {
      const code = Number.parseInt(hex, 16);
      return Number.isNaN(code) ? match : String.fromCharCode(code);
    });
    if (decoded === current) break;
    current = decoded;
  }

  return current;
};

const normalizeMojibakeString = (value: string): string => {
  let normalized = decodeUnicodeEscapeLiterals(value);
  normalized = tryDecodeMojibake(normalized);
  normalized = decodeUnicodeEscapeLiterals(normalized);

  Object.entries(MOJIBAKE_TEXT_MAP).forEach(([wrong, right]) => {
    if (normalized.includes(wrong)) {
      normalized = normalized.split(wrong).join(right);
    }
  });
  Object.entries(MOJIBAKE_TOKEN_MAP).forEach(([wrong, right]) => {
    if (normalized.includes(wrong)) {
      normalized = normalized.split(wrong).join(right);
    }
  });
  return normalized;
};

const normalizeMojibakeInObject = (value: any): any => {
  if (typeof value === 'string') return normalizeMojibakeString(value);
  if (Array.isArray(value)) return value.map(normalizeMojibakeInObject);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, normalizeMojibakeInObject(val)])
    );
  }
  return value;
};

const migrateMojibakeTextData = () => {
  try {
    const migrationKey = 'educrm_migration_text_fix_v5';
    if (localStorage.getItem(migrationKey) === 'done') return;

    const keysToNormalize = [
      KEYS.LEADS,
      KEYS.CONTACTS,
      KEYS.QUOTATIONS,
      KEYS.STUDENTS,
      KEYS.ADMISSIONS,
      KEYS.CLASS_STUDENTS,
      KEYS.STUDENT_SCORES,
      KEYS.TRAINING_CLASSES,
      KEYS.CLASS_SESSIONS,
      KEYS.ATTENDANCE,
      KEYS.STUDY_NOTES,
      KEYS.TEACHERS,
      KEYS.LOG_NOTES,
      KEYS.TRANSACTIONS,
      KEYS.MEETINGS,
      KEYS.INVOICES,
      KEYS.COLLABORATORS,
      KEYS.TAGS,
      KEYS.LOST_REASONS
    ];

    keysToNormalize.forEach((key) => {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        const normalized = normalizeMojibakeInObject(parsed);
        if (JSON.stringify(parsed) !== JSON.stringify(normalized)) {
          localStorage.setItem(key, JSON.stringify(normalized));
        }
      } catch {
        // Ignore invalid payload and continue with other keys.
      }
    });

    localStorage.setItem(migrationKey, 'done');
  } catch (error) {
    console.error('Failed to migrate mojibake text data', error);
  }
};
export const initializeData = () => {
  const CURRENT_VERSION = 'v15';
  if (localStorage.getItem(KEYS.INIT) !== CURRENT_VERSION) {
    console.log('Initializing Data if needed...');
    localStorage.setItem(KEYS.LEADS, JSON.stringify(INITIAL_LEADS));
    localStorage.setItem(KEYS.DEALS, JSON.stringify(INITIAL_DEALS));
    localStorage.setItem(KEYS.CONTACTS, JSON.stringify([]));
    localStorage.setItem(KEYS.CONTRACTS, JSON.stringify(INITIAL_CONTRACTS));
    localStorage.setItem(KEYS.QUOTATIONS, JSON.stringify(INITIAL_QUOTATIONS));
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(INITIAL_TRANSACTIONS));
    localStorage.setItem(KEYS.STUDENTS, JSON.stringify(INITIAL_STUDENTS));
    localStorage.setItem(KEYS.ADMISSIONS, JSON.stringify(INITIAL_ADMISSIONS));
    localStorage.setItem(KEYS.CLASS_STUDENTS, JSON.stringify(INITIAL_CLASS_STUDENTS));
    localStorage.setItem(KEYS.STUDENT_SCORES, JSON.stringify(INITIAL_STUDENT_SCORES));
    localStorage.setItem(KEYS.TRAINING_CLASSES, JSON.stringify(INITIAL_TRAINING_CLASSES));
    localStorage.setItem(KEYS.CLASS_SESSIONS, JSON.stringify([]));
    localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify([]));
    localStorage.setItem(KEYS.STUDY_NOTES, JSON.stringify([]));
    localStorage.setItem(KEYS.TEACHERS, JSON.stringify(INITIAL_TEACHERS));
    localStorage.setItem(KEYS.LOG_NOTES, JSON.stringify(INITIAL_LOG_NOTES));
    localStorage.setItem(KEYS.INIT, CURRENT_VERSION);
  }
  if (!localStorage.getItem(KEYS.STUDENTS)) {
    localStorage.setItem(KEYS.STUDENTS, JSON.stringify(INITIAL_STUDENTS));
  }
  if (!localStorage.getItem(KEYS.ADMISSIONS)) {
    localStorage.setItem(KEYS.ADMISSIONS, JSON.stringify(INITIAL_ADMISSIONS));
    localStorage.setItem(KEYS.CLASS_STUDENTS, JSON.stringify(INITIAL_CLASS_STUDENTS));
    localStorage.setItem(KEYS.STUDENT_SCORES, JSON.stringify(INITIAL_STUDENT_SCORES));
    localStorage.setItem(KEYS.TRAINING_CLASSES, JSON.stringify(INITIAL_TRAINING_CLASSES));
    localStorage.setItem(KEYS.CLASS_SESSIONS, JSON.stringify([]));
    localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify([]));
    localStorage.setItem(KEYS.STUDY_NOTES, JSON.stringify([]));
    localStorage.setItem(KEYS.TEACHERS, JSON.stringify(INITIAL_TEACHERS));
    localStorage.setItem(KEYS.LOG_NOTES, JSON.stringify(INITIAL_LOG_NOTES));
  }
  if (!localStorage.getItem(KEYS.TRANSACTIONS)) {
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(INITIAL_TRANSACTIONS));
  }
  if (!localStorage.getItem(KEYS.CLASS_STUDENTS)) {
    localStorage.setItem(KEYS.CLASS_STUDENTS, JSON.stringify(INITIAL_CLASS_STUDENTS));
    localStorage.setItem(KEYS.STUDENT_SCORES, JSON.stringify(INITIAL_STUDENT_SCORES));
    localStorage.setItem(KEYS.TRAINING_CLASSES, JSON.stringify(INITIAL_TRAINING_CLASSES));
    localStorage.setItem(KEYS.CLASS_SESSIONS, JSON.stringify([]));
    localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify([]));
    localStorage.setItem(KEYS.STUDY_NOTES, JSON.stringify([]));
    localStorage.setItem(KEYS.TEACHERS, JSON.stringify(INITIAL_TEACHERS));
    localStorage.setItem(KEYS.LOG_NOTES, JSON.stringify(INITIAL_LOG_NOTES));
  }
  if (!localStorage.getItem(KEYS.STUDENT_SCORES)) {
    localStorage.setItem(KEYS.STUDENT_SCORES, JSON.stringify(INITIAL_STUDENT_SCORES));
  }
  if (!localStorage.getItem(KEYS.CLASS_SESSIONS)) {
    localStorage.setItem(KEYS.CLASS_SESSIONS, JSON.stringify([]));
  }
  if (!localStorage.getItem(KEYS.ATTENDANCE)) {
    localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify([]));
  }
  if (!localStorage.getItem(KEYS.STUDY_NOTES)) {
    localStorage.setItem(KEYS.STUDY_NOTES, JSON.stringify([]));
  }
  migrateMojibakeTextData();
  migrateEnrollmentData();
  migrateTransactionsData();
  migrateClassStudentsData();
  migrateTrainingClassesData();
};

// LEADS
export const getLeads = (): ILead[] => {
  try {
    const data = localStorage.getItem(KEYS.LEADS);
    return data ? JSON.parse(data) : [];
  } catch (e) { return []; }
};

export const saveLead = (lead: ILead) => {
  const leads = getLeads();
  const existingIndex = leads.findIndex(l => l.id === lead.id);

  if (existingIndex >= 0) {
    leads[existingIndex] = lead;
  } else {
    leads.unshift(lead);
  }

  localStorage.setItem(KEYS.LEADS, JSON.stringify(leads));
  emitClientEvent('educrm:leads-changed');
  return leads;
};

export const saveLeads = (leads: ILead[]) => {
  localStorage.setItem(KEYS.LEADS, JSON.stringify(leads));
  emitClientEvent('educrm:leads-changed');
  return leads;
};

export const getLeadById = (id: string): ILead | undefined => {
  const leads = getLeads();
  return leads.find(l => l.id === id);
};

export const deleteLead = (id: string) => {
  const leads = getLeads();
  const filteredLeads = leads.filter(l => l.id !== id);
  localStorage.setItem(KEYS.LEADS, JSON.stringify(filteredLeads));
  emitClientEvent('educrm:leads-changed');
  return filteredLeads;
};

// LOST REASONS
const DEFAULT_LOST_REASONS: string[] = [
  'Sai số điện thoại / Không liên lạc được',
  'Khách thấy giá cao / Không đủ tài chính',
  'Đã đăng ký bên khác',
  'Không còn nhu cầu',
  'Khách hàng ảo / Spam',
  'Không phù hợp chương trình',
  'Lý do khác'
];

const normalizeLostReasonToken = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const LOST_REASON_TOKEN_MAP: Record<string, string> = {
  sai_so_dien_thoai_khong_lien_lac_duoc: DEFAULT_LOST_REASONS[0],
  sai_s_i_n_tho_i_kh_ng_li_n_l_c_c: DEFAULT_LOST_REASONS[0],

  khach_thay_gia_cao_khong_du_tai_chinh: DEFAULT_LOST_REASONS[1],
  kh_ch_th_y_gi_cao_kh_ng_t_i_ch_nh: DEFAULT_LOST_REASONS[1],

  da_dang_ky_ben_khac: DEFAULT_LOST_REASONS[2],
  ng_k_b_n_kh_c: DEFAULT_LOST_REASONS[2],

  khong_con_nhu_cau: DEFAULT_LOST_REASONS[3],
  kh_ng_c_n_nhu_c_u: DEFAULT_LOST_REASONS[3],

  khach_hang_ao_spam: DEFAULT_LOST_REASONS[4],
  kh_ch_h_ng_o_spam: DEFAULT_LOST_REASONS[4],

  khong_phu_hop_chuong_trinh: DEFAULT_LOST_REASONS[5],
  kh_ng_ph_h_p_ch_ng_tr_nh: DEFAULT_LOST_REASONS[5],

  ly_do_khac: DEFAULT_LOST_REASONS[6],
  l_do_kh_c: DEFAULT_LOST_REASONS[6]
};

const normalizeLostReason = (value: string): string => {
  const normalizedText = decodeUnicodeEscapeLiterals(
    tryDecodeMojibake(decodeUnicodeEscapeLiterals(String(value || '')))
  ).replace(/\s+/g, ' ').trim();
  if (!normalizedText) return '';
  const token = normalizeLostReasonToken(normalizedText);
  return LOST_REASON_TOKEN_MAP[token] || normalizedText;
};

export const getLostReasons = (): string[] => {
  try {
    const data = localStorage.getItem(KEYS.LOST_REASONS);
    const parsed = data ? JSON.parse(data) : DEFAULT_LOST_REASONS;
    const source = Array.isArray(parsed) ? parsed : DEFAULT_LOST_REASONS;

    const normalized = source
      .map((item) => normalizeLostReason(String(item)))
      .filter(Boolean)
      .filter((item, index, arr) => arr.indexOf(item) === index);

    return normalized.length ? normalized : DEFAULT_LOST_REASONS;
  } catch {
    return DEFAULT_LOST_REASONS;
  }
};

export const saveLostReasons = (reasons: string[]) => {
  const normalized = (Array.isArray(reasons) ? reasons : DEFAULT_LOST_REASONS)
    .map((item) => normalizeLostReason(String(item)))
    .filter(Boolean)
    .filter((item, index, arr) => arr.indexOf(item) === index);

  localStorage.setItem(KEYS.LOST_REASONS, JSON.stringify(normalized.length ? normalized : DEFAULT_LOST_REASONS));
  emitClientEvent('educrm:lost-reasons-changed');
};

// CONTACTS (LOGIC QUAN TRONG: Unique Phone)
export const getContacts = (): IContact[] => {
  try {
    const data = localStorage.getItem(KEYS.CONTACTS);
    return data ? JSON.parse(data) : [];
  } catch (e) { return []; }
};

export const addContact = (contact: IContact): IContact => {
  try {
    const contacts = getContacts();

    // Chuan hoa SDT (xoa khoang trang, ky tu la) de so sanh
    const cleanPhone = (contact.phone || '').replace(/\D/g, '');

    // Tim xem SDT nay da ton tai chua trong danh ba Contacts
    const existingIndex = contacts.findIndex(c => {
      const cPhone = (c.phone || '').replace(/\D/g, '');
      return cPhone === cleanPhone && cleanPhone.length > 6;
    });

    if (existingIndex >= 0) {
      // MERGE: Cap nhat thong tin moi vao Contact cu
      console.log(`[Storage] Contact existed (Phone: ${cleanPhone}). Updating info...`);
      const existing = contacts[existingIndex];

      contacts[existingIndex] = {
        ...existing,
        ...contact,
        id: existing.id, // Giu ID goc
        dealIds: [...(existing.dealIds || []), ...(contact.dealIds || [])], // Merge dealIds
        activities: [...(existing.activities || []), ...(contact.activities || [])], // Merge activities
        updatedAt: new Date().toISOString()
      };

      localStorage.setItem(KEYS.CONTACTS, JSON.stringify(contacts));
      emitClientEvent('educrm:contacts-changed');
      return contacts[existingIndex];
    } else {
      // CREATE: Tao moi hoan toan
      console.log(`[Storage] Creating new Contact (Phone: ${cleanPhone})...`);
      const newContact: IContact = {
        ...contact,
        id: `C-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      contacts.unshift(newContact);
      localStorage.setItem(KEYS.CONTACTS, JSON.stringify(contacts));
      emitClientEvent('educrm:contacts-changed');
      return newContact;
    }
  } catch (error) {
    console.error('Error in addContact:', error);
    throw error;
  }
};

export const saveContact = (contact: IContact): IContact => {
  const contacts = getContacts();
  const existingIndex = contacts.findIndex(c => c.id === contact.id);

  const normalized: IContact = {
    ...contact,
    updatedAt: new Date().toISOString()
  };

  if (existingIndex >= 0) {
    contacts[existingIndex] = normalized;
  } else {
    contacts.unshift(normalized);
  }

  localStorage.setItem(KEYS.CONTACTS, JSON.stringify(contacts));
  emitClientEvent('educrm:contacts-changed');
  return normalized;
};

export const getContactById = (id: string): IContact | undefined => {
  const contacts = getContacts();
  return contacts.find(c => c.id === id);
};

// Helper:// CONVERT LEAD TO CONTACT OBJECT
export const convertLeadToContact = (lead: ILead): IContact => {
  return {
    id: `C-${Date.now()}`, // Temporary ID, will be handled in addContact
    name: lead.name,
    phone: lead.phone,
    targetCountry: lead.studentInfo?.targetCountry || lead.program || 'Khác', // Map target country
    email: lead.email,
    address: lead.address,
    city: lead.city,
    dob: lead.dob, // Sync DOB
    identityCard: lead.identityCard, // Sync Identity
    identityDate: lead.identityDate,
    identityPlace: lead.identityPlace,
    gender: lead.gender, // Sync Gender

    // Map Student Info
    school: lead.educationLevel, // Map education level to school/education field
    languageLevel: lead.studentInfo?.languageLevel,
    financialStatus: lead.studentInfo?.financialStatus,
    socialLink: lead.studentInfo?.socialLink,

    ownerId: lead.ownerId,
    source: lead.source,
    createdAt: new Date().toISOString(),
    notes: lead.notes,
    activities: lead.activities || [],
    dealIds: [],
    marketingData: lead.marketingData // Preserve tags, campaign, etc.
  };
};

// DEALS
export const getDeals = (): IDeal[] => {
  try {
    const data = localStorage.getItem(KEYS.DEALS);
    const deals = data ? JSON.parse(data) : [];
    return deals;
  } catch (e) { return []; }
};

export const saveDeals = (deals: IDeal[]) => {
  localStorage.setItem(KEYS.DEALS, JSON.stringify(deals));
};

export const addDeal = (deal: IDeal) => {
  try {
    const deals = getDeals();
    console.log('[Storage] Adding new Deal:', deal.title);
    deals.unshift(deal);
    localStorage.setItem(KEYS.DEALS, JSON.stringify(deals));
    return deals;
  } catch (error) {
    console.error('Error in addDeal:', error);
    return [];
  }
};

export const getDealById = (id: string): IDeal | undefined => {
  const deals = getDeals();
  return deals.find(d => d.id === id);
};

export const updateDeal = (updatedDeal: IDeal): boolean => {
  try {
    const deals = getDeals();
    const index = deals.findIndex(d => d.id === updatedDeal.id);
    if (index !== -1) {
      deals[index] = updatedDeal;
      localStorage.setItem(KEYS.DEALS, JSON.stringify(deals));
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error in updateDeal:', error);
    return false;
  }
};
// CONTRACTS
export const getContracts = (): IContract[] => {
  try {
    const data = localStorage.getItem(KEYS.CONTRACTS);
    return data ? JSON.parse(data) : [];
  } catch (e) { return []; }
};

export const addContract = (contract: IContract) => {
  const contracts = getContracts();
  console.log('[Storage] Adding new Contract:', contract.code);
  contracts.unshift(contract);
  localStorage.setItem(KEYS.CONTRACTS, JSON.stringify(contracts));
  return contracts;
};

// INVOICES
export const getInvoices = (): any[] => {
  try {
    const data = localStorage.getItem(KEYS.INVOICES);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
};

export const saveInvoices = (data: any[]) => {
  localStorage.setItem(KEYS.INVOICES, JSON.stringify(data));
};

export const addInvoice = (newItem: any) => {
  const list = getInvoices();
  list.unshift(newItem);
  saveInvoices(list);
  return newItem;
};

export const updateInvoice = (updated: any) => {
  const list = getInvoices();
  const idx = list.findIndex((t: any) => t.id === updated.id);
  if (idx !== -1) {
    list[idx] = updated;
    saveInvoices(list);
    return true;
  }
  return false;
};

// COLLABORATORS
export const getCollaborators = (): any[] => {
  try {
    const data = localStorage.getItem(KEYS.COLLABORATORS);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
};

export const saveCollaborators = (data: any[]) => {
  localStorage.setItem(KEYS.COLLABORATORS, JSON.stringify(data));
};























