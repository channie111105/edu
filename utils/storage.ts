import { ILead, IDeal, IContact, IContract, LeadStatus, DealStage, ContractStatus, IMeeting, MeetingStatus, MeetingType, IQuotation, IQuotationLineItem, QuotationStatus, IAdmission, IStudent, StudentStatus, ITransaction, IClassStudent, ITeacher, ILogNote, ITrainingClass, IStudentScore, IDebtTerm, IClassSession, IAttendanceRecord, IStudyNote, AttendanceStatus, IActualTransaction, IActualTransactionLog, IRefundRequest, IRefundLog, ISalesKpiTarget, ISalesTeam } from '../types';
import type { IStudentClaim } from '../types';

import { decodeMojibakeText } from './mojibake';
import { createLeadAssignmentNotification } from './notifications';

export const KEYS = {
  LEADS: 'educrm_leads_v2', // Changed key to force fresh load
  DEALS: 'educrm_deals',
  CONTACTS: 'educrm_contacts',
  CONTRACTS: 'educrm_contracts_cleaned',
  QUOTATIONS: 'educrm_quotations',
  TRANSACTIONS: 'educrm_transactions',
  STUDENTS: 'educrm_students',
  STUDENT_CLAIMS: 'educrm_student_claims',
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
  SALES_KPIS: 'educrm_sales_kpis',
  SALES_TEAMS: 'educrm_sales_teams',
  LEAD_DISTRIBUTION_CONFIG: 'educrm_lead_distribution_config',
  INIT: 'educrm_initialized'
};

export const FIXED_LEAD_TAGS = [
  'Gọi lần 1',
  'Gọi lần 2',
  'Gọi lần 3'
] as const;

const LEGACY_SYSTEM_LEAD_TAGS = [
  'Zalo',
  'Hotline',
  'Facebook',
  'Tiềm năng',
  'Cần tư vấn'
] as const;

export type LeadDistributionMode = 'manual';
export type LeadDistributionMethod = 'round_robin' | 'weighted';

export interface ILeadDistributionConfig {
  mode: LeadDistributionMode;
  method: LeadDistributionMethod;
  roundRobinIndex: number;
  weightedIndex: number;
  weightedRatios: Record<string, number>;
  updatedAt: string;
  updatedBy?: string;
}

const emitClientEvent = (eventName: string) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(eventName));
  }
};

const decodeStorageValue = <T,>(value: T): T => {
  if (typeof value === 'string') return decodeMojibakeText(value) as T;
  if (Array.isArray(value)) return value.map((item) => decodeStorageValue(item)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => [key, decodeStorageValue(nestedValue)])
    ) as T;
  }
  return value;
};

const STUDENT_TEXT_REPAIR_BY_ID: Record<string, Partial<IStudent>> = {
  'ST-0001': { name: 'Nguyễn Văn A', campus: 'Hà Nội', className: 'GER-A1-K35' },
  'ST-0002': { name: 'Trần Thị B', campus: 'Hà Nội' },
  'ST-0003': { name: 'Lê Văn C', campus: 'HCM' },
  'ST-0004': { name: 'Phạm Thị D', campus: 'Đà Nẵng', className: 'GER-B1-K12' },
  'ST-0005': { name: 'Hoàng Văn E', campus: 'Hà Nội' }
};

const QUOTATION_TEXT_REPAIR_BY_ID: Record<string, Partial<IQuotation>> = {
  'Q-001': { customerName: 'Nguyễn Văn A', product: 'Du học Đức - Combo A1-B1' },
  'Q-002': { customerName: 'Trần Thị B', product: 'Khóa tiếng Đức B1-B2' },
  'Q-003': { customerName: 'Lê Văn C', product: 'Combo Du học nghề Úc' },
  'Q-004': { customerName: 'Phạm Thị D', product: 'Du học Đức - Trọn gói' },
  'Q-005': { customerName: 'Hoàng Văn E', product: 'Tiếng Đức A1-B1' },
  'Q-006': { customerName: 'Nguyễn Thị F', product: 'Khóa tiếng Đức A2' },
  'Q-007': { customerName: 'Đỗ Văn G', product: 'Combo Du học Đức' }
};

const ADMISSION_TEXT_REPAIR_BY_ID: Record<string, Partial<IAdmission>> = {
  'ADM-0001': { campusId: 'Hà Nội' },
  'ADM-0003': { campusId: 'Hà Nội' }
};

const TRANSACTION_TEXT_REPAIR_BY_ID: Record<string, Partial<ITransaction>> = {
  'TRX-0001': { studentName: 'Nguyễn Thị F', note: 'Chờ kế toán duyệt UNC' },
  'TRX-0002': { studentName: 'Đỗ Văn G', note: 'Chờ duyệt giao dịch từ sale confirm' },
  'TRX-0003': { studentName: 'Phạm Thị D' },
  'TRX-0004': { studentName: 'Hoàng Văn E', note: 'Thiếu chứng từ thanh toán' },
  'TRX-0005': { studentName: 'Trần Thị B' },
  'TRX-0006': { studentName: 'Lê Văn C', note: 'Đã duyệt phiếu thu' },
  'TRX-0007': { studentName: 'Nguyễn Văn A' }
};

const normalizeStudentRecord = (student: IStudent): IStudent => {
  const normalized = decodeStorageValue(student) as IStudent;
  return {
    ...normalized,
    note: normalizeEnrollmentText(normalized.note),
    ...(STUDENT_TEXT_REPAIR_BY_ID[student.id] || {})
  };
};

const normalizeQuotationRecord = (quotation: IQuotation): IQuotation => ({
  ...decodeStorageValue(quotation),
  ...(QUOTATION_TEXT_REPAIR_BY_ID[quotation.id] || {})
});

const normalizeAdmissionRecord = (admission: IAdmission): IAdmission => {
  const normalized = decodeStorageValue(admission) as IAdmission;
  return {
    ...normalized,
    note: normalizeEnrollmentText(normalized.note),
    ...(ADMISSION_TEXT_REPAIR_BY_ID[admission.id] || {})
  };
};

const normalizeStudentClaimRecord = (claim: IStudentClaim): IStudentClaim => {
  const normalized = decodeStorageValue(claim) as IStudentClaim;
  return {
    ...normalized,
    reason: normalizeEnrollmentText(normalized.reason),
    note: normalizeEnrollmentText(normalized.note),
    detail: normalizeEnrollmentText(normalized.detail),
    currentClassCode: normalizeEnrollmentText(normalized.currentClassCode),
    proposedClassCode: normalizeEnrollmentText(normalized.proposedClassCode),
    resolvedClassCode: normalizeEnrollmentText(normalized.resolvedClassCode),
    levelOrSubject: normalizeEnrollmentText(normalized.levelOrSubject),
    resultNote: normalizeEnrollmentText(normalized.resultNote),
    policyNote: normalizeEnrollmentText(normalized.policyNote)
  };
};

const normalizeTransactionRecord = (transaction: ITransaction): ITransaction => ({
  ...decodeStorageValue(transaction),
  ...(TRANSACTION_TEXT_REPAIR_BY_ID[transaction.id] || {})
});

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

export const removeActualTransactionByRelatedId = (relatedId: string) => {
  const transactions = getActualTransactions();
  const removedIds = transactions.filter((item) => item.relatedId === relatedId).map((item) => item.id);
  if (removedIds.length === 0) return 0;

  saveActualTransactions(transactions.filter((item) => item.relatedId !== relatedId));

  const logs = getActualTransactionLogs();
  localStorage.setItem(
    KEYS.ACTUAL_TRANSACTION_LOGS,
    JSON.stringify(logs.filter((item) => !removedIds.includes(item.transactionId)))
  );
  emitClientEvent('educrm:actual-transaction-logs-changed');
  return removedIds.length;
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
const normalizeLeadTagToken = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');

const LEAD_TAG_LABEL_ALIASES: Record<string, string> = {
  goilan1: 'Gọi lần 1',
  dagoilan1: 'Gọi lần 1',
  goilan2: 'Gọi lần 2',
  dagoilan2: 'Gọi lần 2',
  goilan3: 'Gọi lần 3',
  dagoilan3: 'Gọi lần 3',
};

const normalizeLeadTag = (tag: unknown): string => {
  const normalized = decodeMojibakeText(String(tag ?? '')).trim();
  if (!normalized) return '';
  return LEAD_TAG_LABEL_ALIASES[normalizeLeadTagToken(normalized)] || normalized;
};

const normalizeLeadTagList = (tags: unknown): string[] => {
  const rawTags = Array.isArray(tags) ? tags : [];
  const uniqueTags = new Set<string>();

  rawTags.forEach((tag) => {
    const normalized = normalizeLeadTag(tag);
    if (normalized) uniqueTags.add(normalized);
  });

  FIXED_LEAD_TAGS.forEach((tag) => uniqueTags.add(tag));

  const fixedTags = FIXED_LEAD_TAGS.filter((tag) => uniqueTags.has(tag));
  const customTags = Array.from(uniqueTags).filter((tag) => !FIXED_LEAD_TAGS.includes(tag as typeof FIXED_LEAD_TAGS[number]));

  return [...fixedTags, ...customTags];
};

const normalizeLeadTagCatalog = (tags: unknown): string[] => {
  const rawTags = Array.isArray(tags) ? tags : [];
  const uniqueTags = new Set<string>();

  rawTags.forEach((tag) => {
    const normalized = normalizeLeadTag(tag);
    if (!normalized) return;
    if (LEGACY_SYSTEM_LEAD_TAGS.includes(normalized as typeof LEGACY_SYSTEM_LEAD_TAGS[number])) return;
    uniqueTags.add(normalized);
  });

  FIXED_LEAD_TAGS.forEach((tag) => uniqueTags.add(tag));

  const fixedTags = FIXED_LEAD_TAGS.filter((tag) => uniqueTags.has(tag));
  const customTags = Array.from(uniqueTags).filter(
    (tag) => !FIXED_LEAD_TAGS.includes(tag as typeof FIXED_LEAD_TAGS[number])
  );

  return [...fixedTags, ...customTags];
};

const normalizeLeadRecord = (lead: ILead): ILead => {
  const normalized = decodeStorageValue(lead) as ILead;
  const rawTags = Array.isArray(normalized.marketingData?.tags) ? normalized.marketingData.tags : [];

  if (rawTags.length === 0) return normalized;

  return {
    ...normalized,
    marketingData: {
      ...normalized.marketingData,
      tags: normalizeLeadTagList(rawTags),
    },
  };
};

const maybeNotifyLeadAssignment = (previousLead: ILead | undefined, nextLead: ILead) => {
  const previousOwnerId = String(previousLead?.ownerId || '').trim();
  const nextOwnerId = String(nextLead.ownerId || '').trim();

  if (!nextOwnerId || previousOwnerId === nextOwnerId) return;

  createLeadAssignmentNotification({
    recipientUserId: nextOwnerId,
    leadId: nextLead.id,
    leadName: nextLead.name || 'Lead',
    isReassigned: Boolean(previousOwnerId),
  });
};

export const getTags = (): string[] => {
  try {
    const data = localStorage.getItem(KEYS.TAGS);
    return normalizeLeadTagCatalog(data ? JSON.parse(data) : []);
  } catch {
    return [...FIXED_LEAD_TAGS];
  }
};

export const saveTags = (tags: string[]) => {
  const normalizedTags = normalizeLeadTagCatalog(tags);
  localStorage.setItem(KEYS.TAGS, JSON.stringify(normalizedTags));
  emitClientEvent('educrm:tags-changed');
  return normalizedTags;
};

const getDefaultLeadDistributionConfig = (): ILeadDistributionConfig => ({
  mode: 'manual',
  method: 'round_robin',
  roundRobinIndex: 0,
  weightedIndex: 0,
  weightedRatios: {},
  updatedAt: new Date().toISOString(),
  updatedBy: 'system'
});

const sanitizeDistributionMethod = (method: unknown): LeadDistributionMethod =>
  method === 'weighted' ? 'weighted' : 'round_robin';

const sanitizeWeightedRatios = (ratios: unknown): Record<string, number> => {
  if (!ratios || typeof ratios !== 'object') return {};
  return Object.entries(ratios as Record<string, unknown>).reduce<Record<string, number>>((acc, [repId, rawValue]) => {
    if (!repId) return acc;
    const numeric = Number(rawValue);
    if (!Number.isFinite(numeric)) return acc;
    acc[repId] = Math.max(0, Math.floor(numeric));
    return acc;
  }, {});
};

export const getLeadDistributionConfig = (): ILeadDistributionConfig => {
  try {
    const data = localStorage.getItem(KEYS.LEAD_DISTRIBUTION_CONFIG);
    if (!data) return getDefaultLeadDistributionConfig();
    const parsed = JSON.parse(data) as Partial<ILeadDistributionConfig>;
    return {
      mode: 'manual',
      method: sanitizeDistributionMethod(parsed.method),
      roundRobinIndex: Number.isFinite(parsed.roundRobinIndex) ? Math.max(0, Math.floor(parsed.roundRobinIndex as number)) : 0,
      weightedIndex: Number.isFinite(parsed.weightedIndex) ? Math.max(0, Math.floor(parsed.weightedIndex as number)) : 0,
      weightedRatios: sanitizeWeightedRatios(parsed.weightedRatios),
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
    mode: 'manual',
    method: config.method ? sanitizeDistributionMethod(config.method) : current.method,
    roundRobinIndex: Number.isFinite(config.roundRobinIndex) ? Math.max(0, Math.floor(config.roundRobinIndex as number)) : current.roundRobinIndex,
    weightedIndex: Number.isFinite(config.weightedIndex) ? Math.max(0, Math.floor(config.weightedIndex as number)) : current.weightedIndex,
    weightedRatios: config.weightedRatios ? sanitizeWeightedRatios(config.weightedRatios) : current.weightedRatios,
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem(KEYS.LEAD_DISTRIBUTION_CONFIG, JSON.stringify(next));
  emitClientEvent('educrm:lead-distribution-config-changed');
  return next;
};

export const getSalesTeams = (): ISalesTeam[] => {
  try {
    const data = localStorage.getItem(KEYS.SALES_TEAMS);
    return data ? JSON.parse(data) : INITIAL_SALES_TEAMS;
  } catch {
    return INITIAL_SALES_TEAMS;
  }
};

export const saveSalesTeams = (teams: ISalesTeam[]) => {
  localStorage.setItem(KEYS.SALES_TEAMS, JSON.stringify(teams));
  emitClientEvent('educrm:sales-teams-changed');
};

export const getSalesKpis = (): ISalesKpiTarget[] => {
  try {
    const data = localStorage.getItem(KEYS.SALES_KPIS);
    return data ? JSON.parse(data) : INITIAL_SALES_KPIS;
  } catch {
    return INITIAL_SALES_KPIS;
  }
};

export const saveSalesKpis = (targets: ISalesKpiTarget[]) => {
  localStorage.setItem(KEYS.SALES_KPIS, JSON.stringify(targets));
  emitClientEvent('educrm:sales-kpis-changed');
};

export const upsertSalesKpis = (targets: ISalesKpiTarget[]) => {
  const current = getSalesKpis();
  const next = [...current];

  targets.forEach((target) => {
    const index = next.findIndex((item) => item.period === target.period && item.ownerId === target.ownerId);
    if (index >= 0) {
      next[index] = {
        ...next[index],
        ...target,
        id: next[index].id || target.id,
        updatedAt: new Date().toISOString()
      };
      return;
    }

    next.unshift({
      ...target,
      id: target.id || `kpi-${target.period}-${target.ownerId}`,
      createdAt: target.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  });

  saveSalesKpis(next);
  return next;
};

// QUOTATIONS
const normalizeQuotation = (quotation: IQuotation): IQuotation => {
  const quotationDate = quotation.quotationDate || quotation.createdAt || new Date().toISOString();
  const confirmDate =
    quotation.confirmDate ||
    quotation.saleConfirmedAt ||
    (quotation.status === QuotationStatus.LOCKED ? quotation.lockedAt || quotation.updatedAt : undefined);

  return {
    ...quotation,
    createdAt: quotation.createdAt || quotationDate,
    updatedAt: quotation.updatedAt || quotation.createdAt || quotationDate,
    quotationDate,
    confirmDate,
    refundAmount: Math.max(0, Number(quotation.refundAmount) || 0),
    contractStatus:
      quotation.contractStatus ||
      (quotation.status === QuotationStatus.LOCKED
        ? 'signed_contract'
        : quotation.status === QuotationStatus.SALE_CONFIRMED || quotation.status === QuotationStatus.SALE_ORDER
          ? 'sale_confirmed'
          : 'quotation')
  };
};

export const getQuotations = (): IQuotation[] => {
  try {
    const data = localStorage.getItem(KEYS.QUOTATIONS);
    const list: IQuotation[] = data ? JSON.parse(data) : [];
    return list.map((item) => normalizeQuotation(normalizeQuotationRecord(item)));
  } catch (e) { return []; }
};

export const addQuotation = (quotation: IQuotation) => {
  const list = getQuotations();
  list.unshift(normalizeQuotation(quotation));
  localStorage.setItem(KEYS.QUOTATIONS, JSON.stringify(list));
  emitClientEvent('educrm:quotations-changed');
  return list;
};

export const updateQuotation = (updated: IQuotation) => {
  const list = getQuotations();
  const idx = list.findIndex(q => q.id === updated.id);
  if (idx !== -1) {
    list[idx] = normalizeQuotation({
      ...updated,
      updatedAt: updated.updatedAt || new Date().toISOString()
    });
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
    const list: ITransaction[] = data ? JSON.parse(data) : [];
    return list.map(normalizeTransactionRecord);
  } catch {
    return [];
  }
};

export const saveTransactions = (transactions: ITransaction[]) => {
  localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(transactions.map(normalizeTransactionRecord)));
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

type QuotationStudentDraft = {
  lineItemId?: string;
  name: string;
  dob?: string;
  phone: string;
  email?: string;
  address?: string;
  guardianName?: string;
  guardianPhone?: string;
  campus: string;
  classId?: string;
  className?: string;
  level?: string;
  note?: string;
};

const normalizeStudentIdentity = (value?: string) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const getQuotationLinkedStudentIds = (quotation: IQuotation) =>
  Array.from(new Set([quotation.studentId, ...(quotation.studentIds || [])].filter(Boolean) as string[]));

const getNextStudentCode = (students: IStudent[]) => {
  const maxCode = students.reduce((maxValue, student) => {
    const matched = String(student.code || '').match(/(\d+)$/);
    if (!matched) return maxValue;
    const numeric = Number(matched[1]);
    return Number.isFinite(numeric) ? Math.max(maxValue, numeric) : maxValue;
  }, 0);

  return `HV24-${String(maxCode + 1).padStart(4, '0')}`;
};

const getResolvedTrainingClass = (quotation: IQuotation, lineItem?: IQuotationLineItem) => {
  const classes = getTrainingClasses();
  const classKey = lineItem?.classId || quotation.classCode;
  const byId = classKey
    ? classes.find((item) => item.id === classKey || item.code === classKey)
    : undefined;

  if (byId) return byId;

  const className = lineItem?.className;
  if (!className) return undefined;
  return classes.find((item) => item.name === className);
};

const buildStudentNote = (
  quotation: IQuotation,
  lineItem: IQuotationLineItem | undefined,
  resolvedClass: ITrainingClass | undefined
) => {
  const parts = [`SO: ${quotation.soCode}`];
  const productName = lineItem?.name || quotation.product;
  const plannedClass = resolvedClass?.code || lineItem?.classId || quotation.classCode;

  if (productName) parts.push(`Sản phẩm: ${productName}`);
  if (plannedClass) parts.push(`Lớp dự kiến: ${plannedClass}`);

  return parts.join(' | ');
};

const getQuotationStudentDrafts = (quotation: IQuotation): QuotationStudentDraft[] => {
  const lead = getLeadById(quotation.leadId || '');
  const lineItems = (quotation.lineItems || []).filter((item) => normalizeStudentIdentity(item.studentName));

  if (lineItems.length > 0) {
    return lineItems.map((item) => {
      const resolvedClass = getResolvedTrainingClass(quotation, item);
      return {
        lineItemId: item.id,
        name: String(item.studentName || '').trim(),
        dob: item.studentDob || quotation.studentDob || lead?.dob || '',
        phone: quotation.studentPhone || lead?.phone || 'N/A',
        email: quotation.studentEmail || lead?.email || '',
        address: quotation.studentAddress || lead?.address || '',
        guardianName: quotation.guardianName || lead?.guardianName || '',
        guardianPhone: quotation.guardianPhone || lead?.guardianPhone || '',
        campus: resolvedClass?.campus || lead?.city || 'Hà Nội',
        classId: item.classId || resolvedClass?.id || quotation.classCode,
        className: item.className || resolvedClass?.name || quotation.classCode,
        level: item.courseName || item.name || quotation.product || quotation.serviceType,
        note: buildStudentNote(quotation, item, resolvedClass)
      };
    });
  }

  const resolvedClass = getResolvedTrainingClass(quotation);
  const fallbackName = String(quotation.customerName || lead?.name || '').trim();

  if (!fallbackName) return [];

  return [
    {
      name: fallbackName,
      dob: quotation.studentDob || lead?.dob || '',
      phone: quotation.studentPhone || lead?.phone || 'N/A',
      email: quotation.studentEmail || lead?.email || '',
      address: quotation.studentAddress || lead?.address || '',
      guardianName: quotation.guardianName || lead?.guardianName || '',
      guardianPhone: quotation.guardianPhone || lead?.guardianPhone || '',
      campus: resolvedClass?.campus || lead?.city || 'Hà Nội',
      classId: quotation.classCode || resolvedClass?.id,
      className: resolvedClass?.name || quotation.classCode,
      level: quotation.product || quotation.serviceType,
      note: buildStudentNote(quotation, undefined, resolvedClass)
    }
  ];
};

export const getPrimaryQuotationStudentName = (quotation: IQuotation) =>
  getQuotationStudentDrafts(quotation)[0]?.name || quotation.customerName;

export const quotationLinksToStudent = (quotation: IQuotation, student: IStudent) => {
  const linkedStudentIds = getQuotationLinkedStudentIds(quotation);

  if (student.quotationLineItemId && quotation.lineItems?.some((item) => item.id === student.quotationLineItemId)) {
    return true;
  }

  if (linkedStudentIds.length > 0) {
    return linkedStudentIds.includes(student.id);
  }

  return (
    (!!student.soId && quotation.id === student.soId) ||
    (!!student.customerId && quotation.customerId === student.customerId) ||
    (!!student.leadId && quotation.leadId === student.leadId)
  );
};

export const createStudentsFromQuotation = (quotation: IQuotation): IStudent[] => {
  const drafts = getQuotationStudentDrafts(quotation);
  if (!drafts.length) return [];

  const existingStudents = getStudents();
  const nextStudents = [...existingStudents];
  const now = new Date().toISOString();
  const linkedStudentIds = new Set(getQuotationLinkedStudentIds(quotation));
  const ensuredStudents: IStudent[] = [];

  drafts.forEach((draft, index) => {
    const normalizedName = normalizeStudentIdentity(draft.name);
    const normalizedDob = draft.dob || '';

    let matchIndex = draft.lineItemId
      ? nextStudents.findIndex(
          (student) => student.soId === quotation.id && student.quotationLineItemId === draft.lineItemId
        )
      : -1;

    if (matchIndex < 0) {
      matchIndex = nextStudents.findIndex((student) => {
        if (student.soId !== quotation.id) return false;
        if (student.quotationLineItemId) return false;
        if (normalizeStudentIdentity(student.name) !== normalizedName) return false;
        if (normalizedDob && (student.dob || '') !== normalizedDob) return false;
        if (linkedStudentIds.size > 0 && !linkedStudentIds.has(student.id)) return false;
        return true;
      });
    }

    const current = matchIndex >= 0 ? nextStudents[matchIndex] : undefined;
    const isEnrolled =
      current?.enrollmentStatus === 'DA_GHI_DANH' || current?.status === StudentStatus.ENROLLED;

    const nextStudent: IStudent = {
      id: current?.id || `ST-${Date.now()}-${index}`,
      code: current?.code || getNextStudentCode(nextStudents),
      name: draft.name,
      dob: draft.dob || current?.dob,
      phone: draft.phone || current?.phone || 'N/A',
      email: draft.email || current?.email || '',
      address: draft.address || current?.address || '',
      guardianName: draft.guardianName || current?.guardianName || '',
      guardianPhone: draft.guardianPhone || current?.guardianPhone || '',
      dealId: quotation.dealId || current?.dealId,
      soId: quotation.id,
      salesPersonId: quotation.createdBy || current?.salesPersonId,
      customerId: quotation.customerId || current?.customerId,
      leadId: quotation.leadId || current?.leadId,
      quotationLineItemId: draft.lineItemId || current?.quotationLineItemId,
      payerName: quotation.customerName || current?.payerName,
      campus: isEnrolled ? current?.campus || draft.campus : draft.campus || current?.campus || 'Hà Nội',
      classId: isEnrolled ? current?.classId : draft.classId || current?.classId,
      className: isEnrolled ? current?.className : draft.className || current?.className,
      admissionDate: current?.admissionDate || now,
      level: draft.level || current?.level || quotation.product || quotation.serviceType,
      status: current?.status || StudentStatus.ADMISSION,
      enrollmentStatus: current?.enrollmentStatus || 'CHUA_GHI_DANH',
      profileImage: current?.profileImage,
      note: draft.note || current?.note,
      createdAt: current?.createdAt || now
    };

    if (matchIndex >= 0) {
      nextStudents[matchIndex] = nextStudent;
    } else {
      nextStudents.unshift(nextStudent);
    }

    ensuredStudents.push(nextStudent);
  });

  saveStudents(nextStudents);
  return ensuredStudents;
};

export const createTransactionFromQuotation = (quotationId: string, createdBy: string): ITransaction => {
  // TODO: replace mock service with BE API
  const quotation = getQuotations().find((q) => q.id === quotationId);
  if (!quotation) {
    throw new Error('KhÃ´ng tÃ¬m tháº¥y bÃ¡o giÃ¡ Ä‘á»ƒ táº¡o giao dá»‹ch');
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
    studentName: getPrimaryQuotationStudentName(quotation),
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
    note: 'Táº¡o tá»« bÆ°á»›c Confirm Sale'
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
export const getStudents = (): IStudent[] => {
  try {
    const data = localStorage.getItem(KEYS.STUDENTS);
    const list: IStudent[] = data ? JSON.parse(data) : [];
    return list.map(normalizeStudentRecord);
  } catch { return []; }
};

export const saveStudents = (students: IStudent[]) => {
  localStorage.setItem(KEYS.STUDENTS, JSON.stringify(students.map(normalizeStudentRecord)));
  emitClientEvent('educrm:students-changed');
};

export const updateStudent = (updated: IStudent) => {
  const list = getStudents();
  const idx = list.findIndex(s => s.id === updated.id);
  if (idx !== -1) {
    list[idx] = updated;
    saveStudents(list);
    return true;
  }
  return false;
};

export const getStudentClaims = (): IStudentClaim[] => {
  try {
    const data = localStorage.getItem(KEYS.STUDENT_CLAIMS);
    const list: IStudentClaim[] = data ? JSON.parse(data) : [];
    return list
      .map(normalizeStudentClaimRecord)
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  } catch {
    return [];
  }
};

export const saveStudentClaims = (claims: IStudentClaim[]) => {
  localStorage.setItem(KEYS.STUDENT_CLAIMS, JSON.stringify(claims.map(normalizeStudentClaimRecord)));
  emitClientEvent('educrm:student-claims-changed');
};

export const createStudentClaim = (claim: IStudentClaim) => {
  const list = getStudentClaims();
  list.unshift(normalizeStudentClaimRecord(claim));
  saveStudentClaims(list);
  return claim;
};

export const updateStudentClaim = (updated: IStudentClaim) => {
  const list = getStudentClaims();
  const idx = list.findIndex((item) => item.id === updated.id);
  if (idx !== -1) {
    list[idx] = normalizeStudentClaimRecord({
      ...updated,
      updatedAt: updated.updatedAt || new Date().toISOString()
    });
    saveStudentClaims(list);
    return true;
  }
  return false;
};

export const getAdmissions = (): IAdmission[] => {
  try {
    const data = localStorage.getItem(KEYS.ADMISSIONS);
    const list: IAdmission[] = data ? JSON.parse(data) : [];
    return list.map(normalizeAdmissionRecord);
  } catch {
    return [];
  }
};

export const saveAdmissions = (admissions: IAdmission[]) => {
  localStorage.setItem(KEYS.ADMISSIONS, JSON.stringify(admissions.map(normalizeAdmissionRecord)));
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
    throw new Error('Lá»›p Ä‘Ã­ch pháº£i khÃ¡c lá»›p hiá»‡n táº¡i');
  }

  const list = getClassStudents();
  const from = list.find((item) => item.classId === fromClassId && item.studentId === studentId);
  if (!from) throw new Error('KhÃ´ng tÃ¬m tháº¥y há»c viÃªn trong lá»›p hiá»‡n táº¡i');

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

export const updateClassStudentStatus = (
  classId: string,
  studentId: string,
  status: IClassStudent['status']
) => {
  const list = getClassStudents();
  const idx = list.findIndex((item) => item.classId === classId && item.studentId === studentId);
  if (idx < 0) return null;

  list[idx] = {
    ...list[idx],
    status,
    studentStatus: status
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
    return data ? (JSON.parse(data) as ITrainingClass[]).map((item) => buildClassSnapshot(item)) : [];
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
const TRAINING_DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'] as const;

const normalizeStudyDays = (studyDays?: number[]) =>
  (studyDays || [])
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    .filter((day, index, list) => list.indexOf(day) === index)
    .sort((a, b) => a - b);

const parseStudyDaysFromSchedule = (schedule?: string) => {
  if (!schedule) return [];
  const match = schedule.trim().match(/^([A-Za-z0-9-]+)/);
  if (!match) return [];

  let currentPrefix = '';
  return normalizeStudyDays(
    match[1]
      .split('-')
      .map((part) => part.trim().toUpperCase())
      .map((part) => {
        if (!part) return null;
        if (part === 'CN') return 0;
        if (part.startsWith('T')) {
          currentPrefix = 'T';
        } else if (!currentPrefix) {
          return null;
        }

        const normalized = part.startsWith('T') ? part.slice(1) : part;
        const numeric = Number.parseInt(normalized, 10);
        if (!Number.isFinite(numeric) || numeric < 2 || numeric > 7) return null;
        return numeric - 1;
      })
      .filter((day): day is number => day !== null)
  );
};

const parseTimeSlotFromSchedule = (schedule?: string) => {
  if (!schedule) return '';
  const segments = schedule.trim().split(/\s+/);
  return segments.slice(1).join(' ');
};

const formatTrainingSchedule = (studyDays?: number[], timeSlot?: string) => {
  const normalizedDays = normalizeStudyDays(studyDays);
  const dayLabel = normalizedDays.map((day) => TRAINING_DAY_LABELS[day]).join('-');
  return [dayLabel, timeSlot?.trim()].filter(Boolean).join(' ').trim();
};

const buildClassSnapshot = (classInfo: ITrainingClass): ITrainingClass => {
  const studyDays = normalizeStudyDays(classInfo.studyDays?.length ? classInfo.studyDays : parseStudyDaysFromSchedule(classInfo.schedule));
  const timeSlot = (classInfo.timeSlot || parseTimeSlotFromSchedule(classInfo.schedule)).trim();
  return {
    ...classInfo,
    studyDays,
    timeSlot,
    schedule: formatTrainingSchedule(studyDays, timeSlot)
  };
};

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
  const normalizedClass = classInfo ? buildClassSnapshot(classInfo) : undefined;
  const start = parseDate(normalizedClass?.startDate) ?? now;
  const end = parseDate(classInfo?.endDate);
  const normalizedDays = normalizeStudyDays(normalizedClass?.studyDays);

  if (normalizedClass && normalizedDays.length && end && end.getTime() >= start.getTime()) {
    const sessions: IClassSession[] = [];
    const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
    const endDateOnly = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));

    while (cursor.getTime() <= endDateOnly.getTime()) {
      if (normalizedDays.includes(cursor.getUTCDay())) {
        const order = sessions.length + 1;
        sessions.push({
          id: `SESSION-${normalizedClass.id || 'CLASS'}-${order}`,
          classId: normalizedClass.id || '',
          date: toDateOnly(cursor),
          title: `Buổi ${order}`,
          order,
          isHeld: false
        });
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    if (sessions.length) return sessions;
  }

  const hasWindow = !!end && end.getTime() > start.getTime();
  const sessionCount = hasWindow ? clamp(Math.ceil((end.getTime() - start.getTime()) / (7 * DAY_IN_MS)) * 2, 5, 10) : 5;

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
      title: `Buá»•i ${order} - BÃ i ${order}`,
      order,
      isHeld: false
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

export const createTrainingClass = (classInfo: Omit<ITrainingClass, 'id' | 'schedule'> & { id?: string; schedule?: string }) => {
  const classes = getTrainingClasses();
  const snapshot = buildClassSnapshot({
    ...classInfo,
    id: classInfo.id || classInfo.code || `CLASS-${Date.now()}`
  });

  if (classes.some((item) => item.id === snapshot.id || item.code === snapshot.code)) {
    return { ok: false as const, error: 'Mã lớp đã tồn tại' };
  }

  const nextClasses = [snapshot, ...classes];
  saveTrainingClasses(nextClasses);

  const seededSessions = buildDefaultSessions(snapshot).map((session) => ({
    ...session,
    classId: snapshot.id
  }));
  if (seededSessions.length) {
    saveClassSessions([...getAllClassSessions(), ...seededSessions]);
  }

  if (snapshot.teacherId) {
    const teachers = getTeachers();
    const teacherIndex = teachers.findIndex((teacher) => teacher.id === snapshot.teacherId);
    if (teacherIndex >= 0 && !teachers[teacherIndex].assignedClassIds.includes(snapshot.id)) {
      teachers[teacherIndex] = {
        ...teachers[teacherIndex],
        assignedClassIds: [...teachers[teacherIndex].assignedClassIds, snapshot.id]
      };
      saveTeachers(teachers);
    }
  }

  addClassLog(snapshot.id, 'CREATE_CLASS', `Tạo lớp ${snapshot.code}`, 'training');
  return { ok: true as const, data: snapshot };
};

export const updateClassSession = (sessionId: string, updates: Partial<IClassSession>) => {
  const sessions = getAllClassSessions();
  const index = sessions.findIndex((item) => item.id === sessionId);
  if (index < 0) return null;

  sessions[index] = {
    ...sessions[index],
    ...updates
  };
  saveClassSessions(sessions);
  return sessions[index];
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
    createdBy,
    category: 'SYSTEM'
  });
};

export const addStudentLog = (
  studentId: string,
  action: string,
  message: string,
  createdBy = 'system',
  category: ILogNote['category'] = 'SYSTEM'
) => {
  return addLogNote({
    id: `LOG-STUDENT-${Date.now()}`,
    entityType: 'STUDENT',
    entityId: studentId,
    action,
    message,
    createdAt: new Date().toISOString(),
    createdBy,
    category
  });
};

export const updateTeacher = (updated: ITeacher, actor = 'system', action = 'UPDATE_PROFILE', message = 'Cáº­p nháº­t há»“ sÆ¡ giÃ¡o viÃªn') => {
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
    message: `Táº¡o má»›i há»“ sÆ¡ giÃ¡o viÃªn ${teacher.fullName}`,
    createdAt: new Date().toISOString(),
    createdBy: actor
  });
  return teacher;
};

export const assignTeacherToClass = (teacherId: string, classId: string, actor = 'system') => {
  // TODO: replace mock service with BE API
  const teacher = getTeacherById(teacherId);
  if (!teacher) return { ok: false, error: 'KhÃ´ng tÃ¬m tháº¥y giÃ¡o viÃªn' };

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

  updateTeacher(teacher, actor, 'ASSIGN_CLASS', `GÃ¡n lá»›p ${classId} cho giÃ¡o viÃªn`);
  return { ok: true };
};

export const unassignTeacherFromClass = (teacherId: string, classId: string, actor = 'system') => {
  // TODO: replace mock service with BE API
  const teacher = getTeacherById(teacherId);
  if (!teacher) return { ok: false, error: 'KhÃ´ng tÃ¬m tháº¥y giÃ¡o viÃªn' };

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

  updateTeacher(teacher, actor, 'UNASSIGN_CLASS', `Bá» lá»›p ${classId} khá»i giÃ¡o viÃªn`);
  return { ok: true };
};
export const createStudentFromQuotation = (quotation: IQuotation) => {
  return createStudentsFromQuotation(quotation)[0] || null;
};

// --- INITIAL MOCK DATA (SEED DATA) ---
const INITIAL_LEADS: ILead[] = [
  {
    id: 'SLA-001',
    name: 'Tráº§n Van Nguy Hiá»ƒm',
    phone: '090111222',
    email: 'danger@test.com',
    source: 'SLA Test',
    status: 'NEW' as LeadStatus,
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    ownerId: 'u1',
    activities: [],
    program: 'Du há»c Äá»©c',
    city: 'HÃ  Ná»™i',
    lastInteraction: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    notes: 'SLA Test Lead',
    slaStatus: 'danger'
  },
  {
    id: 'SLA-002',
    name: 'Nguyá»…n Thá»‹ Cáº£nh BÃ¡o',
    phone: '090333444',
    email: 'warning@test.com',
    source: 'SLA Test',
    status: 'NEW' as LeadStatus,
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    ownerId: 'u1',
    activities: [],
    program: 'Tiáº¿ng Äá»©c',
    city: 'ÄÃ  Náºµng',
    lastInteraction: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    notes: 'SLA Test Lead',
    slaStatus: 'warning'
  },
  {
    id: 'LEAD-005',
    name: 'Äáº·ng Tháº£o Chi',
    phone: '0988777666',
    email: 'thaochi@example.com',
    source: 'TikTok',
    status: 'CONTACTED' as LeadStatus,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    ownerId: 'u1',
    program: 'Du há»c nghá» Ãšc',
    city: 'HÃ  Ná»™i',
    lastInteraction: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    notes: 'Quan tÃ¢m ngÃ nh nhÃ  hÃ ng khÃ¡ch sáº¡n',
    slaStatus: 'normal',
    activities: []
  },
  {
    id: 'LEAD-006',
    name: 'VÅ© Minh Tuáº¥n',
    phone: '0912345678',
    email: 'minhtuan@example.com',
    source: 'Google',
    status: 'NEW' as LeadStatus,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    ownerId: 'u3',
    program: 'Du há»c Äá»©c',
    city: 'Quáº£ng Ninh',
    lastInteraction: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'ChÆ°a liÃªn há»‡ Ä‘Æ°á»£c',
    slaStatus: 'danger',
    activities: []
  },
  {
    id: 'LEAD-007',
    name: 'HoÃ ng Thá»‹ Lan',
    phone: '0933221100',
    email: 'hlan@example.com',
    source: 'Referral',
    status: 'NEW' as LeadStatus,
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    ownerId: 'u2',
    program: 'Tiáº¿ng Äá»©c',
    city: 'Há»“ ChÃ­ Minh',
    lastInteraction: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    notes: 'Báº¡n cá»§a há»c viÃªn cÅ© giá»›i thiá»‡u',
    slaStatus: 'normal',
    activities: []
  }
];

const DEMO_RECLAIM_LEAD_ID = 'DEMO-RECLAIM-001';
const DEMO_TODAY_CARE_LEAD_ID = 'DEMO-TODAY-CARE-001';

const buildDemoReclaimLead = (): ILead => {
  const now = new Date();
  const triggerAt = new Date(now.getTime() - 5 * 60 * 60 * 1000);
  const reclaimedAt = new Date(now.getTime() - 2 * 60 * 60 * 1000);

  return {
    id: DEMO_RECLAIM_LEAD_ID,
    name: 'Demo Lead Thu Hoi',
    phone: '0909990001',
    email: 'demo.thuhoi@example.com',
    source: 'Demo SLA',
    status: LeadStatus.NEW as LeadStatus,
    createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    ownerId: '',
    activities: [],
    program: 'Tiếng Đức',
    city: 'Hà Nội',
    lastInteraction: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Lead demo da bi thu hoi va dang cho phan bo lai.',
    slaStatus: 'normal',
    reclaimedAt: reclaimedAt.toISOString(),
    reclaimReason: 'slow_care',
    reclaimTriggerAt: triggerAt.toISOString(),
    reclaimedFromOwnerId: 'u2'
  };
};

const buildDemoTodayCareLead = (): ILead => {
  const now = new Date();
  const scheduledAt = new Date(now);
  scheduledAt.setHours(Math.max(now.getHours() + 1, 15), 30, 0, 0);

  if (scheduledAt.getTime() <= now.getTime()) {
    scheduledAt.setHours(now.getHours() + 1, 30, 0, 0);
  }

  const createdAt = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const lastInteraction = new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString();

  return {
    id: DEMO_TODAY_CARE_LEAD_ID,
    name: 'Demo Chăm Sóc Hôm Nay',
    phone: '0909990002',
    email: 'demo.todaycare@example.com',
    source: 'Demo My Leads',
    status: LeadStatus.CONTACTED as LeadStatus,
    createdAt,
    ownerId: 'u2',
    pickUpDate: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
    program: 'Du học Đức',
    company: 'Hà Nội',
    city: 'Hà Nội',
    lastInteraction,
    notes: 'Lead demo để kiểm tra tab Chăm sóc hôm nay.',
    slaStatus: 'normal',
    internalNotes: {
      potential: 'Tiềm năng'
    },
    activities: [
      {
        id: `demo-activity-${now.getTime()}`,
        type: 'activity',
        activityType: 'call',
        title: 'Gọi điện',
        description: 'Nhắc khách xác nhận lịch test đầu vào và hồ sơ còn thiếu.',
        timestamp: scheduledAt.toISOString(),
        datetime: scheduledAt.toISOString(),
        status: 'scheduled',
        user: 'Sarah Miller'
      }
    ] as any
  };
};

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
    customerName: 'Lê Văn C',
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
    customerName: 'Hoàng Văn E',
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

const toMonthKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const shiftMonthKey = (period: string, diff: number) => {
  const [year, month] = period.split('-').map(Number);
  const baseDate = new Date(year || new Date().getFullYear(), (month || 1) - 1 + diff, 1);
  return toMonthKey(baseDate);
};

const CURRENT_KPI_PERIOD = toMonthKey(new Date());
const PREVIOUS_KPI_PERIOD = shiftMonthKey(CURRENT_KPI_PERIOD, -1);
const KPI_SEED_TIMESTAMP = new Date().toISOString();

const INITIAL_SALES_TEAMS: ISalesTeam[] = [
  {
    id: 'team-duc',
    name: 'Team Äá»©c',
    branch: 'HÃ  Ná»™i',
    productFocus: 'Tiáº¿ng Äá»©c / Du há»c Äá»©c',
    assignKeywords: ['Äá»©c', 'Tiáº¿ng Äá»©c', 'Du há»c Äá»©c', 'German'],
    members: [
      { userId: 'u1', name: 'Tráº§n VÄƒn Quáº£n Trá»‹', role: 'Team Lead', branch: 'HÃ  Ná»™i' },
      { userId: 'u2', name: 'Sarah Miller', role: 'Sales Rep', branch: 'HÃ  Ná»™i' }
    ],
    createdAt: KPI_SEED_TIMESTAMP,
    updatedAt: KPI_SEED_TIMESTAMP
  },
  {
    id: 'team-trung',
    name: 'Team Trung',
    branch: 'HCM',
    productFocus: 'Tiáº¿ng Trung / Du há»c Trung',
    assignKeywords: ['Trung', 'Tiáº¿ng Trung', 'Du há»c Trung', 'Chinese'],
    members: [
      { userId: 'u3', name: 'David Clark', role: 'Team Lead', branch: 'HCM' },
      { userId: 'u4', name: 'Alex Rivera', role: 'Sales Rep', branch: 'HCM' }
    ],
    createdAt: KPI_SEED_TIMESTAMP,
    updatedAt: KPI_SEED_TIMESTAMP
  }
];

const INITIAL_SALES_KPIS: ISalesKpiTarget[] = [
  {
    id: `kpi-${CURRENT_KPI_PERIOD}-u1`,
    period: CURRENT_KPI_PERIOD,
    ownerId: 'u1',
    ownerName: 'Tráº§n VÄƒn Quáº£n Trá»‹',
    teamId: 'team-duc',
    teamName: 'Team Äá»©c',
    branch: 'HÃ  Ná»™i',
    targetRevenue: 600000000,
    targetContracts: 8,
    createdAt: KPI_SEED_TIMESTAMP,
    updatedAt: KPI_SEED_TIMESTAMP
  },
  {
    id: `kpi-${CURRENT_KPI_PERIOD}-u2`,
    period: CURRENT_KPI_PERIOD,
    ownerId: 'u2',
    ownerName: 'Sarah Miller',
    teamId: 'team-duc',
    teamName: 'Team Äá»©c',
    branch: 'HÃ  Ná»™i',
    targetRevenue: 350000000,
    targetContracts: 6,
    createdAt: KPI_SEED_TIMESTAMP,
    updatedAt: KPI_SEED_TIMESTAMP
  },
  {
    id: `kpi-${CURRENT_KPI_PERIOD}-u3`,
    period: CURRENT_KPI_PERIOD,
    ownerId: 'u3',
    ownerName: 'David Clark',
    teamId: 'team-trung',
    teamName: 'Team Trung',
    branch: 'HCM',
    targetRevenue: 280000000,
    targetContracts: 5,
    createdAt: KPI_SEED_TIMESTAMP,
    updatedAt: KPI_SEED_TIMESTAMP
  },
  {
    id: `kpi-${CURRENT_KPI_PERIOD}-u4`,
    period: CURRENT_KPI_PERIOD,
    ownerId: 'u4',
    ownerName: 'Alex Rivera',
    teamId: 'team-trung',
    teamName: 'Team Trung',
    branch: 'HCM',
    targetRevenue: 200000000,
    targetContracts: 4,
    createdAt: KPI_SEED_TIMESTAMP,
    updatedAt: KPI_SEED_TIMESTAMP
  },
  {
    id: `kpi-${PREVIOUS_KPI_PERIOD}-u1`,
    period: PREVIOUS_KPI_PERIOD,
    ownerId: 'u1',
    ownerName: 'Tráº§n VÄƒn Quáº£n Trá»‹',
    teamId: 'team-duc',
    teamName: 'Team Äá»©c',
    branch: 'HÃ  Ná»™i',
    targetRevenue: 520000000,
    targetContracts: 7,
    createdAt: KPI_SEED_TIMESTAMP,
    updatedAt: KPI_SEED_TIMESTAMP
  },
  {
    id: `kpi-${PREVIOUS_KPI_PERIOD}-u2`,
    period: PREVIOUS_KPI_PERIOD,
    ownerId: 'u2',
    ownerName: 'Sarah Miller',
    teamId: 'team-duc',
    teamName: 'Team Äá»©c',
    branch: 'HÃ  Ná»™i',
    targetRevenue: 320000000,
    targetContracts: 5,
    createdAt: KPI_SEED_TIMESTAMP,
    updatedAt: KPI_SEED_TIMESTAMP
  },
  {
    id: `kpi-${PREVIOUS_KPI_PERIOD}-u3`,
    period: PREVIOUS_KPI_PERIOD,
    ownerId: 'u3',
    ownerName: 'David Clark',
    teamId: 'team-trung',
    teamName: 'Team Trung',
    branch: 'HCM',
    targetRevenue: 250000000,
    targetContracts: 4,
    createdAt: KPI_SEED_TIMESTAMP,
    updatedAt: KPI_SEED_TIMESTAMP
  },
  {
    id: `kpi-${PREVIOUS_KPI_PERIOD}-u4`,
    period: PREVIOUS_KPI_PERIOD,
    ownerId: 'u4',
    ownerName: 'Alex Rivera',
    teamId: 'team-trung',
    teamName: 'Team Trung',
    branch: 'HCM',
    targetRevenue: 180000000,
    targetContracts: 3,
    createdAt: KPI_SEED_TIMESTAMP,
    updatedAt: KPI_SEED_TIMESTAMP
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
    name: 'Lê Văn C',
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
    name: 'Hoàng Văn E',
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
  { id: 'GER-A1-K35', code: 'GER-A1-K35', name: 'Lá»›p GER-A1-K35', campus: 'HÃ  Ná»™i', schedule: 'T2-4-6 18:30', language: 'Tiáº¿ng Äá»©c', level: 'A1', classType: 'Offline', maxStudents: 25, startDate: '2025-09-10', endDate: '2025-12-20', status: 'ACTIVE', teacherId: 'T001' },
  { id: 'GER-A1-K36', code: 'GER-A1-K36', name: 'Lá»›p GER-A1-K36', campus: 'HÃ  Ná»™i', schedule: 'T3-5-7 19:00', language: 'Tiáº¿ng Äá»©c', level: 'A1', classType: 'Offline', maxStudents: 25, startDate: '2025-09-12', endDate: '2025-12-22', status: 'ACTIVE', teacherId: 'T001' },
  { id: 'AUS-COOK-K01', code: 'AUS-COOK-K01', name: 'Lá»›p AUS-COOK-K01', campus: 'HCM', schedule: 'T2-4 20:00', language: 'Tiáº¿ng Anh', level: 'Cookery', classType: 'Offline', maxStudents: 20, startDate: '2025-10-01', endDate: '2026-01-10', status: 'ACTIVE', teacherId: 'T002' },
  { id: 'DE-A2-K10', code: 'DE-A2-K10', name: 'Lá»›p DE-A2-K10', campus: 'HÃ  Ná»™i', schedule: 'T3-5 08:30', language: 'Tiáº¿ng Äá»©c', level: 'A2', classType: 'Offline', maxStudents: 25, startDate: '2025-05-01', endDate: '2025-08-15', status: 'DONE', teacherId: '' },
  { id: 'DE-A1-K24', code: 'DE-A1-K24', name: 'Lá»›p Tiáº¿ng Äá»©c A1 - K24', campus: 'HÃ  Ná»™i', schedule: 'T2-4-6 18:30', language: 'Tiáº¿ng Äá»©c', level: 'A1', classType: 'Offline', maxStudents: 25, startDate: '2025-09-15', endDate: '2025-12-15', status: 'ACTIVE', teacherId: 'T001' }
];

const INITIAL_TEACHERS: ITeacher[] = [
  {
    id: 'T001',
    code: 'GV001',
    fullName: 'Nguyá»…n Thá»‹ Lan',
    phone: '0901234567',
    dob: '1990-08-15',
    email: 'lan.nguyen@educrm.com',
    address: 'Ba ÄÃ¬nh, HÃ  Ná»™i',
    contractType: 'Full-time',
    contractNote: 'HÄ chÃ­nh thá»©c 12 thÃ¡ng',
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
    fullName: 'HoÃ ng Van Nam',
    phone: '0912345678',
    dob: '1988-05-10',
    email: 'nam.hoang@educrm.com',
    address: 'Q1, TP.HCM',
    contractType: 'Part-time',
    contractNote: 'Lá»‹ch dáº¡y theo ca',
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
    fullName: 'Tráº§n Thá»‹ Hoa',
    phone: '0987654321',
    dob: '1995-11-20',
    email: 'hoa.tran@educrm.com',
    address: 'Cáº§u Giáº¥y, HÃ  Ná»™i',
    contractType: 'Full-time',
    contractNote: 'Äang táº¡m nghá»‰',
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
    message: 'Táº¡o má»›i há»“ sÆ¡ giÃ¡o viÃªn Nguyá»…n Thá»‹ Lan',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: 'system'
  },
  {
    id: 'LOG-T002-1',
    entityType: 'TEACHER',
    entityId: 'T002',
    action: 'ASSIGN_CLASS',
    message: 'GÃ¡n lá»›p AUS-COOK-K01 cho giÃ¡o viÃªn',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: 'u1'
  },
  {
    id: 'LOG-CLS-1',
    entityType: 'CLASS',
    entityId: 'GER-A1-K35',
    action: 'CLASS_CREATED',
    message: 'Khá»Ÿi táº¡o lá»›p vÃ  danh sÃ¡ch há»c viÃªn demo',
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: 'system'
  },
  {
    id: 'LOG-CLS-2',
    entityType: 'CLASS',
    entityId: 'GER-A1-K36',
    action: 'CLASS_CREATED',
    message: 'Khá»Ÿi táº¡o lá»›p vÃ  danh sÃ¡ch há»c viÃªn demo',
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
    studentName: 'Hoàng Văn E',
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
    studentName: 'Lê Văn C',
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
const findLockedQuotationForStudent = (student: IStudent, quotations: IQuotation[]) => {
  return quotations.find(
    (q) => q.status === QuotationStatus.LOCKED && quotationLinksToStudent(q, student)
  );
};

const migrateEnrollmentData = () => {
  try {
    const migrationKey = 'educrm_migration_enrollment_v1';
    if (localStorage.getItem(migrationKey) === 'done') return;

    const students = getStudents();
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
          studentIds: Array.from(new Set([student.id, ...(quotation.studentIds || [])])),
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

const migrateQuotationStudentsData = () => {
  try {
    const migrationKey = 'educrm_migration_quotation_students_v1';
    if (localStorage.getItem(migrationKey) === 'done') return;

    const quotations = getQuotations();
    if (!quotations.length) {
      localStorage.setItem(migrationKey, 'done');
      return;
    }

    const updatedQuotations = quotations.map((quotation) => {
      if (quotation.status !== QuotationStatus.LOCKED) return quotation;

      const linkedStudents = createStudentsFromQuotation(quotation);
      if (!linkedStudents.length) return quotation;

      const studentIds = linkedStudents.map((student) => student.id);
      return {
        ...quotation,
        studentId: studentIds[0] || quotation.studentId,
        studentIds,
        updatedAt: quotation.updatedAt || new Date().toISOString()
      };
    });

    localStorage.setItem(KEYS.QUOTATIONS, JSON.stringify(updatedQuotations));
    emitClientEvent('educrm:quotations-changed');
    localStorage.setItem(migrationKey, 'done');
  } catch (error) {
    console.error('Failed to migrate quotation students data', error);
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

const migrateLegacyConfirmSaleTransactions = () => {
  try {
    const migrationKey = 'educrm_migration_transactions_v2';
    if (localStorage.getItem(migrationKey) === 'done') return;

    const transactions = getTransactions();
    const quotations = getQuotations();
    const legacyAutoTransactions = transactions.filter((transaction) =>
      String(transaction.note || '').includes('Confirm Sale')
    );

    if (!legacyAutoTransactions.length) {
      localStorage.setItem(migrationKey, 'done');
      return;
    }

    const legacyIds = new Set(legacyAutoTransactions.map((transaction) => transaction.id));
    const sanitizedTransactions = transactions.filter((transaction) => !legacyIds.has(transaction.id));
    const quotationIdsToReset = new Set(legacyAutoTransactions.map((transaction) => transaction.quotationId).filter(Boolean));

    const updatedQuotations = quotations.map((quotation) => {
      if (!quotationIdsToReset.has(quotation.id)) return quotation;

      const hasRemainingTransactions = sanitizedTransactions.some((transaction) => transaction.quotationId === quotation.id);
      if (hasRemainingTransactions) return quotation;

      return {
        ...quotation,
        transactionStatus: 'NONE',
        updatedAt: new Date().toISOString()
      };
    });

    saveTransactions(sanitizedTransactions);
    localStorage.setItem(KEYS.QUOTATIONS, JSON.stringify(updatedQuotations));
    emitClientEvent('educrm:quotations-changed');
    localStorage.setItem(migrationKey, 'done');
  } catch (error) {
    console.error('Failed to remove legacy confirm sale transactions', error);
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
  'Du h?c Ã?c - Combo A1-B1': 'Du há»c Äá»©c - Combo A1-B1',
  'KhÃ³a ti?ng Ã?c B1-B2': 'KhÃ³a tiáº¿ng Äá»©c B1-B2',
  'Combo Du h?c ngh? Ãšc': 'Combo Du há»c nghá» Ãšc',
  'Du h?c Ã?c - Tr?n gÃ³i': 'Du há»c Äá»©c - Trá»n gÃ³i',
  'Ti?ng Ã?c A1-B1': 'Tiáº¿ng Äá»©c A1-B1',
  'KhÃ³a ti?ng Ã?c A2': 'KhÃ³a tiáº¿ng Äá»©c A2',
  'Combo Du h?c Ã?c': 'Combo Du há»c Äá»©c',
  'Sáº£n pháº©m': 'Sản phẩm',
  'Lá»›p dá»± kiáº¿n': 'Lớp dự kiến',
  'Chuyá»ƒn lá»›p': 'Chuyển lớp',
  'G?i l?n 1': 'Gá»i láº§n 1',
  'G?i l?n 2': 'Gá»i láº§n 2',
  'Ti?m nang': 'Tiá»m nÄƒng',
  'C?n tu v?n': 'Cáº§n tÆ° váº¥n'
};

const MOJIBAKE_TOKEN_MAP: Record<string, string> = {
  'Du h?c': 'Du há»c',
  'ti?ng': 'tiáº¿ng',
  'ngh?': 'nghá»',
  'Tr?n': 'Trá»n',
  'Ã?c': 'Äá»©c',
  'G?i': 'Gá»i',
  'l?n': 'láº§n',
  'Ti?m': 'Tiá»m',
  'nang': 'nÄƒng',
  'C?n': 'Cáº§n',
  'v?n': 'váº¥n'
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
  let normalized = decodeMojibakeText(value);

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

const normalizeEnrollmentText = (value?: string): string => normalizeMojibakeString(String(value || ''));

const normalizeMojibakeInObject = (value: any): any => {
  if (typeof value === 'string') return normalizeMojibakeString(value);
  if (Array.isArray(value)) return value.map((item) => normalizeMojibakeInObject(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, normalizeMojibakeInObject(nestedValue)])
    );
  }
  return value;
};

const migrateMojibakeTextData = () => {
  try {
    const migrationKey = 'educrm_migration_text_fix_v7';
    if (localStorage.getItem(migrationKey) === 'done') return;

    const keysToNormalize = [
      KEYS.LEADS,
      KEYS.CONTACTS,
      KEYS.QUOTATIONS,
      KEYS.CONTRACTS,
      KEYS.STUDENTS,
      KEYS.STUDENT_CLAIMS,
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
        let normalized = normalizeMojibakeInObject(parsed);

        if (key === KEYS.STUDENTS && Array.isArray(normalized)) {
          normalized = normalized.map((item) => normalizeStudentRecord(item as IStudent));
        } else if (key === KEYS.QUOTATIONS && Array.isArray(normalized)) {
          normalized = normalized.map((item) => normalizeQuotationRecord(item as IQuotation));
        } else if (key === KEYS.ADMISSIONS && Array.isArray(normalized)) {
          normalized = normalized.map((item) => normalizeAdmissionRecord(item as IAdmission));
        } else if (key === KEYS.TRANSACTIONS && Array.isArray(normalized)) {
          normalized = normalized.map((item) => normalizeTransactionRecord(item as ITransaction));
        }

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
  const ensureDemoReclaimLead = () => {
    try {
      const raw = localStorage.getItem(KEYS.LEADS);
      const leads = raw ? (JSON.parse(raw) as ILead[]) : [];
      if (!Array.isArray(leads)) return;
      if (leads.some((lead) => lead?.id === DEMO_RECLAIM_LEAD_ID)) return;

      leads.unshift(buildDemoReclaimLead());
      localStorage.setItem(KEYS.LEADS, JSON.stringify(leads));
    } catch {
      // Ignore malformed storage payloads during demo seed.
    }
  };

  const ensureDemoTodayCareLead = () => {
    try {
      const raw = localStorage.getItem(KEYS.LEADS);
      const leads = raw ? (JSON.parse(raw) as ILead[]) : [];
      if (!Array.isArray(leads)) return;
      const demoLead = buildDemoTodayCareLead();
      const existingIndex = leads.findIndex((lead) => lead?.id === DEMO_TODAY_CARE_LEAD_ID);

      if (existingIndex >= 0) {
        leads[existingIndex] = {
          ...leads[existingIndex],
          ...demoLead
        };
      } else {
        leads.unshift(demoLead);
      }

      localStorage.setItem(KEYS.LEADS, JSON.stringify(leads));
    } catch {
      // Ignore malformed storage payloads during demo seed.
    }
  };

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
    localStorage.setItem(KEYS.SALES_TEAMS, JSON.stringify(INITIAL_SALES_TEAMS));
    localStorage.setItem(KEYS.SALES_KPIS, JSON.stringify(INITIAL_SALES_KPIS));
    localStorage.setItem(KEYS.INIT, CURRENT_VERSION);
  }
  ensureDemoReclaimLead();
  ensureDemoTodayCareLead();
  if (!localStorage.getItem(KEYS.STUDENTS)) {
    localStorage.setItem(KEYS.STUDENTS, JSON.stringify(INITIAL_STUDENTS));
  }
  if (!localStorage.getItem(KEYS.STUDENT_CLAIMS)) {
    localStorage.setItem(KEYS.STUDENT_CLAIMS, JSON.stringify([]));
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
  if (!localStorage.getItem(KEYS.SALES_TEAMS)) {
    localStorage.setItem(KEYS.SALES_TEAMS, JSON.stringify(INITIAL_SALES_TEAMS));
  }
  if (!localStorage.getItem(KEYS.SALES_KPIS)) {
    localStorage.setItem(KEYS.SALES_KPIS, JSON.stringify(INITIAL_SALES_KPIS));
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
  migrateQuotationStudentsData();
  migrateTransactionsData();
  migrateLegacyConfirmSaleTransactions();
  migrateClassStudentsData();
  migrateTrainingClassesData();
};

// LEADS
export const getLeads = (): ILead[] => {
  try {
    const data = localStorage.getItem(KEYS.LEADS);
    return data ? (JSON.parse(data) as ILead[]).map(normalizeLeadRecord) : [];
  } catch (e) { return []; }
};

export const saveLead = (lead: ILead) => {
  const leads = getLeads();
  const existingIndex = leads.findIndex(l => l.id === lead.id);
  const normalizedLead = normalizeLeadRecord(lead);
  const previousLead = existingIndex >= 0 ? leads[existingIndex] : undefined;

  if (existingIndex >= 0) {
    leads[existingIndex] = normalizedLead;
  } else {
    leads.unshift(normalizedLead);
  }

  localStorage.setItem(KEYS.LEADS, JSON.stringify(leads));
  maybeNotifyLeadAssignment(previousLead, normalizedLead);
  emitClientEvent('educrm:leads-changed');
  return leads;
};

export const saveLeads = (leads: ILead[]) => {
  const previousLeads = getLeads();
  const previousById = new Map(previousLeads.map((lead) => [lead.id, lead]));
  const normalizedLeads = leads.map(normalizeLeadRecord);

  localStorage.setItem(KEYS.LEADS, JSON.stringify(normalizedLeads));
  normalizedLeads.forEach((lead) => {
    maybeNotifyLeadAssignment(previousById.get(lead.id), lead);
  });
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

// CLOSED LEAD REASONS
const DEFAULT_UNVERIFIED_REASONS: string[] = [
  'Sai số',
  'Trùng',
  'Không xác thực',
  'Rác / bot / test',
  'Ngoài phạm vi phục vụ',
  'Không đủ điều kiện tối thiểu đầu vào',
  'Lý do khác'
];

const DEFAULT_LOST_REASONS: string[] = [
  'Không đủ tài chính',
  'Không đủ điều kiện hồ sơ',
  'Khách từ chối',
  'Chọn đơn vị khác',
  'Hoãn vô thời hạn',
  'Không còn nhu cầu',
  'Lý do khác'
];

const DEFAULT_CLOSED_REASON_MAP = {
  lost: DEFAULT_LOST_REASONS,
  unverified: DEFAULT_UNVERIFIED_REASONS,
} as const;

const normalizeLostReasonToken = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const CLOSED_REASON_TOKEN_MAP: Record<string, string> = [
  ...DEFAULT_UNVERIFIED_REASONS,
  ...DEFAULT_LOST_REASONS
].reduce<Record<string, string>>((acc, reason) => {
  acc[normalizeLostReasonToken(reason)] = reason;
  return acc;
}, {
  sai_so_dien_thoai_khong_lien_lac_duoc: DEFAULT_UNVERIFIED_REASONS[0],
  khach_hang_ao_spam: DEFAULT_UNVERIFIED_REASONS[3],
  khong_phu_hop_chuong_trinh: DEFAULT_UNVERIFIED_REASONS[4],
  khach_thay_gia_cao_khong_du_tai_chinh: DEFAULT_LOST_REASONS[0],
  da_dang_ky_ben_khac: DEFAULT_LOST_REASONS[3],
});

const normalizeLostReason = (value: string): string => {
  const normalizedText = decodeUnicodeEscapeLiterals(
    tryDecodeMojibake(decodeUnicodeEscapeLiterals(String(value || '')))
  ).replace(/\s+/g, ' ').trim();
  if (!normalizedText) return '';
  const token = normalizeLostReasonToken(normalizedText);
  return CLOSED_REASON_TOKEN_MAP[token] || normalizedText;
};

export const getClosedLeadReasons = (status?: string): string[] => {
  const normalizedStatus = normalizeLostReasonToken(String(status || ''));
  if (normalizedStatus === 'unverified' || normalizedStatus === 'disqualified' || normalizedStatus === 'khongxacthuc') {
    return DEFAULT_CLOSED_REASON_MAP.unverified;
  }
  return DEFAULT_CLOSED_REASON_MAP.lost;
};

export const getLostReasons = (): string[] => getClosedLeadReasons('lost');

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

export const getLeadActivitiesForConversion = (lead: Pick<ILead, 'activities'>): any[] => {
  return (Array.isArray(lead.activities) ? lead.activities : []).filter((activity: any) => {
    const rawType = String(activity?.type || '').toLowerCase();
    const rawStatus = String(activity?.status || '').toLowerCase();
    return rawType !== 'activity' && rawStatus !== 'scheduled';
  });
};

// Helper:// CONVERT LEAD TO CONTACT OBJECT
export const convertLeadToContact = (lead: ILead): IContact => {
  const studentInfo = lead.studentInfo || {};
  return {
    id: `C-${Date.now()}`, // Temporary ID, will be handled in addContact
    leadId: lead.id,
    name: lead.name,
    phone: lead.phone,
    targetCountry: lead.targetCountry || studentInfo.targetCountry || lead.program || 'Khác',
    email: lead.email,
    address: lead.address,
    city: lead.city,
    dob: studentInfo.dob || lead.dob,
    identityCard: studentInfo.identityCard || lead.identityCard,
    identityDate: lead.identityDate,
    identityPlace: lead.identityPlace,
    gender: studentInfo.gender || lead.gender,

    studentName: studentInfo.studentName || undefined,
    studentPhone: studentInfo.studentPhone || undefined,
    guardianName: lead.guardianName || studentInfo.parentName,
    guardianPhone: lead.guardianPhone || studentInfo.parentPhone,
    guardianRelation: lead.guardianRelation,
    school: studentInfo.school || undefined,
    educationLevel: lead.educationLevel || studentInfo.educationLevel,
    languageLevel: studentInfo.languageLevel,
    financialStatus: studentInfo.financialStatus,
    socialLink: studentInfo.socialLink,
    company: lead.company,
    title: lead.title,

    ownerId: lead.ownerId,
    source: lead.source,
    createdAt: new Date().toISOString(),
    notes: lead.notes,
    activities: getLeadActivitiesForConversion(lead),
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

const normalizeStoragePhone = (value?: string) => String(value || '').replace(/\D/g, '');

const resolveLeadForDealStatusSync = (deal: IDeal, contacts: IContact[], leads: ILead[]) => {
  const linkedContact = contacts.find((contact) => contact.id === deal.leadId);

  if (linkedContact?.leadId) {
    const directLead = leads.find((lead) => lead.id === linkedContact.leadId);
    if (directLead) return directLead;
  }

  const normalizedPhone = normalizeStoragePhone(linkedContact?.phone);
  if (normalizedPhone) {
    const leadByPhone = leads.find((lead) => normalizeStoragePhone(lead.phone) === normalizedPhone);
    if (leadByPhone) return leadByPhone;
  }

  const contactName = String(linkedContact?.name || deal.title.split(' - ')[0] || '').trim().toLowerCase();
  if (!contactName) return undefined;

  return leads.find((lead) => String(lead.name || '').trim().toLowerCase() === contactName);
};

const syncLostLeadStatusesFromDeals = (deals: IDeal[]) => {
  // Lead closure is now managed from lead workflows.
  // Do not infer closed leads from deal stage anymore.
  void deals;
};

export const saveDeals = (deals: IDeal[]) => {
  localStorage.setItem(KEYS.DEALS, JSON.stringify(deals));
  syncLostLeadStatusesFromDeals(deals);
};

export const addDeal = (deal: IDeal) => {
  try {
    const deals = getDeals();
    console.log('[Storage] Adding new Deal:', deal.title);
    deals.unshift(deal);
    localStorage.setItem(KEYS.DEALS, JSON.stringify(deals));
    syncLostLeadStatusesFromDeals(deals);
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
      syncLostLeadStatusesFromDeals(deals);
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
    const contracts: IContract[] = data ? JSON.parse(data) : [];
    return contracts.map((contract) => {
      const normalized = decodeStorageValue(contract) as IContract;
      return {
        ...normalized,
        templateFields: normalized.templateFields || {}
      };
    });
  } catch (e) { return []; }
};

export const addContract = (contract: IContract) => {
  const contracts = getContracts();
  console.log('[Storage] Adding new Contract:', contract.code);
  contracts.unshift(contract);
  localStorage.setItem(KEYS.CONTRACTS, JSON.stringify(contracts));
  emitClientEvent('educrm:contracts-changed');
  return contracts;
};

export const updateContract = (updated: IContract) => {
  const contracts = getContracts();
  const idx = contracts.findIndex((item) => item.id === updated.id);
  if (idx === -1) return false;

  contracts[idx] = {
    ...updated,
    templateFields: updated.templateFields || {}
  };
  localStorage.setItem(KEYS.CONTRACTS, JSON.stringify(contracts));
  emitClientEvent('educrm:contracts-changed');
  return true;
};

export const getContractByQuotationId = (quotationId: string): IContract | undefined => {
  return getContracts().find((contract) => contract.quotationId === quotationId);
};

export const upsertLinkedContractFromQuotation = (quotation: IQuotation, actor: string): IContract => {
  const normalizedQuotation = normalizeQuotation(quotation);
  const existing = getContractByQuotationId(normalizedQuotation.id);
  const now = new Date().toISOString();

  const nextContract: IContract = {
    id: existing?.id || `CT-${Date.now()}`,
    code: existing?.code || `HD-${normalizedQuotation.soCode}`,
    quotationId: normalizedQuotation.id,
    dealId: existing?.dealId || normalizedQuotation.dealId,
    customerId: existing?.customerId || normalizedQuotation.customerId,
    studentId: existing?.studentId || normalizedQuotation.studentId,
    customerName: normalizedQuotation.customerName,
    totalValue: normalizedQuotation.finalAmount || normalizedQuotation.amount || 0,
    paidValue:
      existing?.paidValue ??
      (normalizedQuotation.transactionStatus === 'DA_DUYET' || normalizedQuotation.status === QuotationStatus.LOCKED
        ? normalizedQuotation.finalAmount || normalizedQuotation.amount || 0
        : 0),
    status:
      normalizedQuotation.status === QuotationStatus.LOCKED
        ? ContractStatus.SIGNED
        : existing?.status || ContractStatus.DRAFT,
    signedDate: existing?.signedDate || normalizedQuotation.lockedAt || normalizedQuotation.confirmDate,
    createdBy: existing?.createdBy || actor,
    templateName: existing?.templateName || 'Mẫu hợp đồng đào tạo',
    templateFields: {
      centerRepresentative: existing?.templateFields?.centerRepresentative || '',
      studentName: existing?.templateFields?.studentName || getPrimaryQuotationStudentName(normalizedQuotation),
      studentPhone: existing?.templateFields?.studentPhone || normalizedQuotation.studentPhone || '',
      studentEmail: existing?.templateFields?.studentEmail || normalizedQuotation.studentEmail || '',
      address: existing?.templateFields?.address || normalizedQuotation.studentAddress || '',
      identityCard: existing?.templateFields?.identityCard || normalizedQuotation.identityCard || '',
      guardianName: existing?.templateFields?.guardianName || normalizedQuotation.guardianName || '',
      guardianPhone: existing?.templateFields?.guardianPhone || normalizedQuotation.guardianPhone || '',
      branchName: existing?.templateFields?.branchName || normalizedQuotation.branchName || '',
      contractNote: existing?.templateFields?.contractNote || '',
      paymentMethod:
        existing?.templateFields?.paymentMethod ||
        (normalizedQuotation.paymentMethod === 'CK' ? 'Chuyển khoản' : normalizedQuotation.paymentMethod === 'CASH' ? 'Tiền mặt' : ''),
      quotationCode: normalizedQuotation.soCode,
      quotationDate: existing?.templateFields?.quotationDate || (normalizedQuotation.quotationDate ? new Date(normalizedQuotation.quotationDate).toLocaleDateString('vi-VN') : ''),
      confirmDate: existing?.templateFields?.confirmDate || (normalizedQuotation.confirmDate ? new Date(normalizedQuotation.confirmDate).toLocaleDateString('vi-VN') : ''),
      productName: existing?.templateFields?.productName || normalizedQuotation.product || '',
      totalAmount: existing?.templateFields?.totalAmount || `${(normalizedQuotation.finalAmount || normalizedQuotation.amount || 0).toLocaleString('vi-VN')} đ`
    },
    importedAt: existing?.importedAt || now,
    importedBy: existing?.importedBy || actor,
    cccdNumber: existing?.cccdNumber || normalizedQuotation.identityCard,
    identityDate: existing?.identityDate,
    identityPlace: existing?.identityPlace,
    address: existing?.address || normalizedQuotation.studentAddress
  };

  if (existing) {
    updateContract(nextContract);
    return nextContract;
  }

  addContract(nextContract);
  return nextContract;
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
























