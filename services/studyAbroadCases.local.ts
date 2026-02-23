import { IAdmission, ILead, IQuotation, IQuotationLogNote, IStudent, QuotationStatus } from '../types';
import {
  getAdmissions,
  getInvoices,
  getLeads,
  getQuotations,
  getStudents,
  getTransactions,
  updateQuotation,
  updateStudent
} from '../utils/storage';

export type StudyAbroadServiceStatus = 'UNPROCESSED' | 'PROCESSING';
export type StudyAbroadCaseCompleteness = 'FULL' | 'MISSING';
export type StudyAbroadInvoiceStatus = 'NONE' | 'HAS_INVOICE' | 'PAID';
export type StudyAbroadCmtcStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type StudyAbroadCaseRecord = {
  id: string;
  soCode: string;
  student: string;
  address: string;
  phone: string;
  country: string;
  program: string;
  major: string;
  salesperson: string;
  branch: string;
  intake: string;
  stage: string;
  caseCompleteness: StudyAbroadCaseCompleteness;
  certificate: string;
  serviceStatus: StudyAbroadServiceStatus;
  tuition: number;
  invoiceStatus: StudyAbroadInvoiceStatus;
  cmtc: StudyAbroadCmtcStatus;
  expectedFlightTerm: string;
  stageUpdatedAt?: string;
  internalNote?: string;
  internalNoteUpdatedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type UpdateStudyAbroadCasePayload = {
  student: string;
  address: string;
  phone: string;
  country: string;
  program: string;
  major: string;
  salesperson: string;
  branch: string;
  intake: string;
  stage: string;
  caseCompleteness: StudyAbroadCaseCompleteness;
  certificate: string;
  serviceStatus: StudyAbroadServiceStatus;
  tuition: number;
  invoiceStatus: StudyAbroadInvoiceStatus;
  cmtc: StudyAbroadCmtcStatus;
  expectedFlightTerm: string;
};

type InvoiceLike = {
  quotationId?: string;
  soCode?: string;
  relatedId?: string;
  status?: string;
};

type StudentLike = IStudent & {
  customerId?: string;
  languageLevel?: string;
};

const UNKNOWN = 'Chưa xác định';
const NOT_UPDATED = 'Chưa cập nhật';
const UNASSIGNED = 'Chưa phân công';

const USER_NAME_BY_ID: Record<string, string> = {
  u1: 'Trần Văn Quản Trị',
  u2: 'Sarah Miller',
  u3: 'David Clark',
  system: 'System'
};

const decodeUnicodeEscapeLiterals = (value: string): string => {
  if (!value || !value.includes('\\u')) return value;
  return value.replace(/\\u([0-9a-fA-F]{4})/g, (match, hex: string) => {
    const code = Number.parseInt(hex, 16);
    return Number.isNaN(code) ? match : String.fromCharCode(code);
  });
};

const cleanText = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  return decodeUnicodeEscapeLiterals(tryDecodeMojibake(String(value))).replace(/\s+/g, ' ').trim();
};

const cleanInternalNote = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  return decodeUnicodeEscapeLiterals(tryDecodeMojibake(String(value)))
    .replace(/\r\n/g, '\n')
    .trim();
};

const toToken = (value: unknown): string =>
  cleanText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

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

const mapById = <T extends { id?: string }>(rows: T[]): Map<string, T> => {
  const map = new Map<string, T>();
  rows.forEach((row) => {
    const id = cleanText(row?.id);
    if (id) map.set(id, row);
  });
  return map;
};

const normalizeCountry = (value: unknown): string => {
  const text = cleanText(value);
  if (text) return text;
  return '';
};

const inferCountry = (text: string): string => {
  const token = toToken(text);
  if (!token) return '';
  if (token.includes('duc') || token.includes('germany') || token.includes('ger')) return 'Đức';
  if (token.includes('uc') || token.includes('australia') || token.includes('aus')) return 'Úc';
  if (token.includes('canada')) return 'Canada';
  if (token.includes('han_quoc') || token.includes('korea')) return 'Hàn Quốc';
  if (token.includes('nhat') || token.includes('japan')) return 'Nhật Bản';
  if (token.includes('trung') || token.includes('china')) return 'Trung Quốc';
  return '';
};

const inferProgram = (text: string): string => {
  const token = toToken(text);
  if (!token) return '';
  if (token.includes('du_hoc_nghe') || token.includes('nghe')) return 'Du học nghề';
  if (token.includes('dai_hoc') || token.includes('bachelor')) return 'Đại học';
  if (token.includes('thac_si') || token.includes('master')) return 'Thạc sĩ';
  if (token.includes('he_tieng') || token.includes('language') || token.includes('tieng')) return 'Hệ tiếng';
  if (token.includes('combo')) return 'Combo';
  if (token.includes('du_hoc') || token.includes('study_abroad')) return 'Du học';
  return '';
};

const normalizeNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? '').replace(/[^\d.-]+/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const toMonthYear = (value?: string): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return cleanText(value);
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${year}`;
};

const toQuarterYear = (value?: string): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return cleanText(value);
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return `Q${quarter}/${date.getFullYear()}`;
};

const normalizeProfileStatus = (value: unknown, hasCoreInfo: boolean): StudyAbroadCaseCompleteness => {
  const token = toToken(value);
  if (token === 'full' || token === 'day_du' || token === 'du') return 'FULL';
  if (token === 'missing' || token === 'thieu' || token === 'chua_du') return 'MISSING';
  return hasCoreInfo ? 'FULL' : 'MISSING';
};

const normalizeServiceStatus = (value: unknown, isProcessingFallback: boolean): StudyAbroadServiceStatus => {
  const token = toToken(value);
  if (token === 'unprocessed' || token === 'chua_xu_ly' || token === 'pending' || token === 'draft') return 'UNPROCESSED';
  if (token === 'processing' || token === 'dang_xu_ly' || token === 'active' || token === 'completed') return 'PROCESSING';
  return isProcessingFallback ? 'PROCESSING' : 'UNPROCESSED';
};

const normalizeInvoiceStatus = (
  value: unknown,
  hasInvoice: boolean,
  hasApprovedTransaction: boolean
): StudyAbroadInvoiceStatus => {
  const token = toToken(value);
  if (token === 'paid' || token === 'da_nop' || token === 'submitted') return 'PAID';
  if (token === 'has_invoice' || token === 'co_invoice' || token === 'issued') return 'HAS_INVOICE';
  if (token === 'none' || token === 'chua_co' || token === 'not_issued') return 'NONE';
  if (hasApprovedTransaction) return 'PAID';
  if (hasInvoice) return 'HAS_INVOICE';
  return 'NONE';
};

const normalizeCmtcStatus = (value: unknown, fallback: 'PENDING' | 'APPROVED'): StudyAbroadCmtcStatus => {
  const token = toToken(value);
  if (token === 'approved' || token === 'dat' || token === 'done') return 'APPROVED';
  if (token === 'rejected' || token === 'can_bo_sung' || token === 'missing') return 'REJECTED';
  if (token === 'pending' || token === 'chua_nop' || token === 'updating') return 'PENDING';
  return fallback;
};

const normalizeStage = (quotation: IQuotation, admission?: IAdmission): string => {
  const explicit = cleanText(quotation.caseStage);
  if (explicit) return explicit;

  if (admission?.status === 'DA_DUYET') return 'Đã ghi danh';
  if (admission?.status === 'CHO_DUYET') return 'Chờ ghi danh';
  if (admission?.status === 'TU_CHOI') return 'Từ chối ghi danh';

  const contractToken = toToken(quotation.contractStatus);
  if (contractToken === 'enrolled') return 'Đang học';
  if (contractToken === 'signed_contract') return 'Đã ký hợp đồng';
  if (contractToken === 'sale_confirmed') return 'Chờ khóa SO';
  return 'Đang xử lý hồ sơ';
};

const resolveSalesName = (quotation: IQuotation, lead?: ILead): string => {
  const explicit = cleanText(quotation.salespersonName);
  if (explicit) return explicit;

  const ownerId = cleanText(lead?.ownerId);
  if (ownerId && USER_NAME_BY_ID[ownerId]) return USER_NAME_BY_ID[ownerId];

  const createdBy = cleanText(quotation.createdBy);
  if (createdBy && USER_NAME_BY_ID[createdBy]) return USER_NAME_BY_ID[createdBy];
  if (createdBy && createdBy.includes(' ')) return createdBy;

  return UNASSIGNED;
};

const matchesStudyAbroadService = (quotation: IQuotation, lead?: ILead): boolean => {
  if (quotation.status !== QuotationStatus.LOCKED) return false;
  if (quotation.serviceType === 'StudyAbroad' || quotation.serviceType === 'Combo') return true;

  const token = toToken([quotation.product, quotation.serviceType, lead?.program, lead?.targetCountry].join(' '));
  return token.includes('du_hoc') || token.includes('study_abroad');
};

const getLinkedStudent = (quotation: IQuotation, students: StudentLike[]): StudentLike | undefined => {
  if (quotation.studentId) {
    const byStudentId = students.find((item) => item.id === quotation.studentId);
    if (byStudentId) return byStudentId;
  }
  return students.find(
    (item) =>
      (quotation.customerId && item.customerId === quotation.customerId) ||
      (quotation.id && item.soId === quotation.id)
  );
};

const getLinkedAdmission = (
  quotation: IQuotation,
  admissions: IAdmission[],
  student?: IStudent
): IAdmission | undefined => {
  const byQuotation = admissions.find((item) => item.quotationId === quotation.id);
  if (byQuotation) return byQuotation;
  if (!student) return undefined;
  return admissions.find((item) => item.studentId === student.id);
};

const getLinkedInvoice = (quotation: IQuotation, invoices: InvoiceLike[]): InvoiceLike | undefined =>
  invoices.find(
    (item) =>
      cleanText(item.quotationId) === quotation.id ||
      cleanText(item.soCode) === quotation.soCode ||
      cleanText(item.relatedId) === quotation.id
  );

const getLinkedTransactionStatus = (quotation: IQuotation, transactions: ReturnType<typeof getTransactions>): string => {
  const transactionList = transactions
    .filter((item) => item.quotationId === quotation.id)
    .sort((a, b) => b.createdAt - a.createdAt);
  if (!transactionList.length) return '';
  return cleanText(transactionList[0].status);
};

const buildCaseRecord = (
  quotation: IQuotation,
  leadMap: Map<string, ILead>,
  invoices: InvoiceLike[],
  students: StudentLike[],
  admissions: IAdmission[],
  transactions: ReturnType<typeof getTransactions>
): StudyAbroadCaseRecord => {
  const lead =
    (quotation.leadId ? leadMap.get(quotation.leadId) : undefined) ||
    (quotation.customerId ? leadMap.get(quotation.customerId) : undefined);
  const student = getLinkedStudent(quotation, students);
  const admission = getLinkedAdmission(quotation, admissions, student);
  const linkedInvoice = getLinkedInvoice(quotation, invoices);
  const transactionStatus = getLinkedTransactionStatus(quotation, transactions);

  const address = cleanText(quotation.studentAddress || student?.address || lead?.address) || UNKNOWN;
  const phone = cleanText(quotation.studentPhone || student?.phone || lead?.phone) || UNKNOWN;

  const inferredCountry = inferCountry([quotation.product, lead?.program, lead?.targetCountry].filter(Boolean).join(' '));
  const country = normalizeCountry(quotation.country || quotation.targetCountry || lead?.targetCountry || lead?.studentInfo?.targetCountry || inferredCountry) || UNKNOWN;

  const inferredProgram = inferProgram([quotation.product, quotation.serviceType, lead?.program].filter(Boolean).join(' '));
  const program = cleanText(quotation.programType || lead?.program || inferredProgram) || UNKNOWN;

  const major = cleanText(quotation.major || lead?.educationLevel || lead?.currentEducationStatus) || NOT_UPDATED;
  const salesperson = resolveSalesName(quotation, lead);
  const branch = cleanText(quotation.branchName || admission?.campusId || student?.campus || lead?.city) || UNKNOWN;
  const intake = cleanText(quotation.intakeTerm) || toMonthYear(student?.admissionDate || admission?.createdAt || quotation.createdAt) || NOT_UPDATED;
  const stage = normalizeStage(quotation, admission);
  const certificate = cleanText(quotation.certificateInfo || lead?.studentInfo?.languageLevel || student?.languageLevel) || NOT_UPDATED;

  const hasCoreInfo = [address, phone, country, program].every((item) => item !== UNKNOWN && item !== NOT_UPDATED);
  const caseCompleteness = normalizeProfileStatus(quotation.caseProfileStatus, hasCoreInfo);

  const isProcessingFallback =
    admission?.status === 'DA_DUYET' ||
    admission?.status === 'CHO_DUYET' ||
    toToken(quotation.contractStatus) === 'enrolled' ||
    toToken(quotation.contractStatus) === 'signed_contract';
  const serviceStatus = normalizeServiceStatus(quotation.serviceProcessStatus || admission?.status || quotation.contractStatus, isProcessingFallback);

  const invoiceStatus = normalizeInvoiceStatus(
    quotation.invoiceState,
    !!linkedInvoice || !!quotation.needInvoice,
    toToken(transactionStatus) === 'da_duyet'
  );

  const cmtc = normalizeCmtcStatus(
    quotation.cmtcStatus,
    caseCompleteness === 'FULL' ? 'APPROVED' : 'PENDING'
  );

  const expectedFlightTerm =
    cleanText(quotation.expectedFlightTerm) ||
    toQuarterYear(quotation.lockedAt || quotation.createdAt) ||
    NOT_UPDATED;
  const internalNote = cleanInternalNote(quotation.internalNote);

  return {
    id: quotation.id,
    soCode: cleanText(quotation.soCode) || quotation.id,
    student: cleanText(quotation.customerName) || UNKNOWN,
    address,
    phone,
    country,
    program,
    major,
    salesperson,
    branch,
    intake,
    stage,
    caseCompleteness,
    certificate,
    serviceStatus,
    tuition: normalizeNumber(quotation.finalAmount || quotation.amount),
    invoiceStatus,
    cmtc,
    expectedFlightTerm,
    stageUpdatedAt: cleanText(quotation.stageUpdatedAt) || undefined,
    internalNote: internalNote || undefined,
    internalNoteUpdatedAt: cleanText(quotation.internalNoteUpdatedAt) || undefined,
    createdAt: cleanText(quotation.createdAt) || new Date().toISOString(),
    updatedAt: cleanText(quotation.updatedAt) || cleanText(quotation.createdAt) || new Date().toISOString()
  };
};

export const getStudyAbroadCaseList = (): StudyAbroadCaseRecord[] => {
  // TODO: replace LocalStorage adapter with backend API.
  const quotations = getQuotations();
  const leads = getLeads();
  const students = getStudents() as StudentLike[];
  const admissions = getAdmissions();
  const transactions = getTransactions();
  const leadMap = mapById<ILead>(leads);
  const invoices = (getInvoices() || []) as InvoiceLike[];

  const rows = quotations
    .filter((quotation) => matchesStudyAbroadService(quotation, quotation.leadId ? leadMap.get(quotation.leadId) : undefined))
    .map((quotation) => buildCaseRecord(quotation, leadMap, invoices, students, admissions, transactions))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return rows;
};

const buildCaseUpdateLog = (quotation: IQuotation, payload: UpdateStudyAbroadCasePayload, updatedBy: string): IQuotationLogNote => {
  const changedFields: string[] = [];
  if (cleanText(quotation.customerName) !== cleanText(payload.student)) changedFields.push('Học viên');
  if (cleanText(quotation.studentAddress) !== cleanText(payload.address)) changedFields.push('Địa chỉ');
  if (cleanText(quotation.studentPhone) !== cleanText(payload.phone)) changedFields.push('SĐT');
  if (cleanText(quotation.country) !== cleanText(payload.country)) changedFields.push('Quốc gia');
  if (cleanText(quotation.programType) !== cleanText(payload.program)) changedFields.push('Chương trình');
  if (cleanText(quotation.major) !== cleanText(payload.major)) changedFields.push('Ngành');
  if (cleanText(quotation.salespersonName) !== cleanText(payload.salesperson)) changedFields.push('Salesperson');
  if (cleanText(quotation.branchName) !== cleanText(payload.branch)) changedFields.push('Chi nhánh');
  if (normalizeNumber(quotation.finalAmount) !== normalizeNumber(payload.tuition)) changedFields.push('Học phí');

  const detail = changedFields.length
    ? `Cập nhật hồ sơ du học (${changedFields.join(', ')})`
    : 'Cập nhật hồ sơ du học';

  return {
    id: `q-log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    user: cleanText(updatedBy) || 'System',
    action: 'Update Study Abroad Case',
    detail
  };
};

export const updateStudyAbroadCase = (
  caseId: string,
  payload: UpdateStudyAbroadCasePayload,
  updatedBy = 'System'
): boolean => {
  // TODO: replace LocalStorage adapter with backend API mutation.
  const quotations = getQuotations();
  const quotation = quotations.find((item) => item.id === caseId && item.status === QuotationStatus.LOCKED);
  if (!quotation) return false;

  const tuition = Math.max(0, normalizeNumber(payload.tuition));
  const now = new Date().toISOString();

  const updatedQuotation: IQuotation = {
    ...quotation,
    customerName: cleanText(payload.student) || quotation.customerName,
    studentAddress: cleanText(payload.address) || '',
    studentPhone: cleanText(payload.phone) || '',
    country: cleanText(payload.country) || undefined,
    targetCountry: cleanText(payload.country) || undefined,
    programType: cleanText(payload.program) || undefined,
    major: cleanText(payload.major) || undefined,
    salespersonName: cleanText(payload.salesperson) || undefined,
    branchName: cleanText(payload.branch) || undefined,
    intakeTerm: cleanText(payload.intake) || undefined,
    caseStage: cleanText(payload.stage) || undefined,
    stageUpdatedAt:
      cleanText(payload.stage) && cleanText(payload.stage) !== cleanText(quotation.caseStage)
        ? now
        : quotation.stageUpdatedAt,
    caseProfileStatus: payload.caseCompleteness,
    certificateInfo: cleanText(payload.certificate) || undefined,
    serviceProcessStatus: payload.serviceStatus,
    invoiceState: payload.invoiceStatus,
    cmtcStatus: payload.cmtc,
    expectedFlightTerm: cleanText(payload.expectedFlightTerm) || undefined,
    finalAmount: tuition || quotation.finalAmount || quotation.amount,
    updatedAt: now,
    logNotes: [buildCaseUpdateLog(quotation, payload, updatedBy), ...(quotation.logNotes || [])]
  };

  const updated = updateQuotation(updatedQuotation);
  if (!updated) return false;

  const student = getLinkedStudent(quotation, getStudents() as StudentLike[]);
  if (student) {
    updateStudent({
      ...student,
      name: cleanText(payload.student) || student.name,
      phone: cleanText(payload.phone) || student.phone,
      address: cleanText(payload.address) || student.address,
      campus: cleanText(payload.branch) || student.campus
    });
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('educrm_cases_updated'));
    window.dispatchEvent(new Event('educrm:study-abroad-cases-changed'));
  }

  return true;
};

export const updateStudyAbroadCaseInternalNote = (
  caseId: string,
  note: string,
  updatedBy = 'System'
): boolean => {
  const quotations = getQuotations();
  const quotation =
    quotations.find((item) => item.id === caseId && item.status === QuotationStatus.LOCKED) ||
    quotations.find((item) => item.id === caseId);
  if (!quotation) return false;

  const now = new Date().toISOString();
  const normalizedNote = cleanInternalNote(note);

  const updatedQuotation: IQuotation = {
    ...quotation,
    internalNote: normalizedNote || undefined,
    internalNoteUpdatedAt: normalizedNote ? now : undefined,
    updatedAt: now,
    logNotes: [
      {
        id: `q-log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: now,
        user: cleanText(updatedBy) || 'System',
        action: normalizedNote ? 'Update Internal Note' : 'Clear Internal Note',
        detail: normalizedNote ? 'Cập nhật ghi chú nội bộ' : 'Xóa ghi chú nội bộ'
      },
      ...(quotation.logNotes || [])
    ]
  };

  const updated = updateQuotation(updatedQuotation);
  if (!updated) return false;

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('educrm_cases_updated'));
    window.dispatchEvent(new Event('educrm:study-abroad-cases-changed'));
  }

  return true;
};

export const updateStudyAbroadCaseStage = (
  caseId: string,
  stage: string,
  updatedBy = 'System'
): boolean => {
  const quotations = getQuotations();
  const quotation =
    quotations.find((item) => item.id === caseId && item.status === QuotationStatus.LOCKED) ||
    quotations.find((item) => item.id === caseId);
  if (!quotation) return false;

  const now = new Date().toISOString();
  const normalizedStage = cleanText(stage);

  const updatedQuotation: IQuotation = {
    ...quotation,
    caseStage: normalizedStage || quotation.caseStage || undefined,
    stageUpdatedAt: now,
    updatedAt: now,
    logNotes: [
      {
        id: `q-log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: now,
        user: cleanText(updatedBy) || 'System',
        action: 'Update Stage',
        detail: normalizedStage ? `Chuyển giai đoạn: ${normalizedStage}` : 'Cập nhật giai đoạn'
      },
      ...(quotation.logNotes || [])
    ]
  };

  const updated = updateQuotation(updatedQuotation);
  if (!updated) return false;

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('educrm_cases_updated'));
    window.dispatchEvent(new Event('educrm:study-abroad-cases-changed'));
  }

  return true;
};
