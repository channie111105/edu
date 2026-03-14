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
import { decodeMojibakeText } from '../utils/mojibake';

export type StudyAbroadServiceStatus =
  | 'NEW'
  | 'UNPROCESSED'
  | 'PROCESSED'
  | 'DEPARTED'
  | 'WITHDRAWN'
  | 'VISA_FAILED'
  | 'REPROCESSING';
export type StudyAbroadCaseCompleteness = 'FULL' | 'MISSING';
export type StudyAbroadInvoiceStatus = 'UNPAID' | 'HAS_INVOICE' | 'PAID';
export type StudyAbroadCmtcStatus = 'NOT_OPENED' | 'OPENED' | 'SUBMITTED';
export type StudyAbroadProgramSelectionStatus = 'NOT_SELECTED' | 'SELECTED';
export type StudyAbroadSchoolInterviewStatus =
  | 'NO_SCHEDULE'
  | 'SCHEDULED'
  | 'INTERVIEWED'
  | 'PASSED'
  | 'FAILED'
  | 'NOT_REQUIRED';
export type StudyAbroadTranslationStatus = 'NOT_YET' | 'DONE';
export type StudyAbroadOfferLetterStatus = 'NOT_SENT' | 'SENT' | 'RECEIVED';
export type StudyAbroadEmbassyAppointmentStatus = 'NOT_BOOKED' | 'BOOKED' | 'SCHEDULED' | 'CANCELLED';
export type StudyAbroadVisaStatus = 'NOT_SUBMITTED' | 'SUBMITTED' | 'SUPPLEMENT' | 'GRANTED' | 'FAILED';
export type StudyAbroadFlightStatus = 'NOT_DEPARTED' | 'DEPARTED' | 'CANCELLED';

export type StudyAbroadCaseRecord = {
  id: string;
  soCode: string;
  student: string;
  address: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  identityCard: string;
  passport: string;
  demographicInfo: string;
  country: string;
  program: string;
  productPackage: string;
  major: string;
  salesperson: string;
  branch: string;
  processorName: string;
  intake: string;
  intakeDate: string;
  intakeNote: string;
  stage: string;
  caseCompleteness: StudyAbroadCaseCompleteness;
  caseCompletenessNote: string;
  certificate: string;
  serviceStatus: StudyAbroadServiceStatus;
  serviceStatusNote: string;
  tuition: number;
  invoiceStatus: StudyAbroadInvoiceStatus;
  invoiceNote: string;
  cmtc: StudyAbroadCmtcStatus;
  cmtcAmount: number;
  cmtcNote: string;
  schoolInterviewDate: string;
  schoolInterviewStatus: StudyAbroadSchoolInterviewStatus;
  schoolInterviewNote: string;
  programSelectionStatus: StudyAbroadProgramSelectionStatus;
  schoolProgramName: string;
  schoolProgramNote: string;
  translationStatus: StudyAbroadTranslationStatus;
  translationNote: string;
  offerLetterStatus: StudyAbroadOfferLetterStatus;
  offerLetterNote: string;
  embassyAppointmentStatus: StudyAbroadEmbassyAppointmentStatus;
  embassyAppointmentDate: string;
  embassyAppointmentNote: string;
  visaStatus: StudyAbroadVisaStatus;
  visaNote: string;
  flightStatus: StudyAbroadFlightStatus;
  expectedFlightTerm: string;
  expectedEntryDate: string;
  flightNote: string;
  stageUpdatedAt?: string;
  internalNote?: string;
  internalNoteUpdatedAt?: string;
  logNotes: IQuotationLogNote[];
  createdAt: string;
  updatedAt: string;
};

export type UpdateStudyAbroadCasePayload = {
  student: string;
  address: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  identityCard: string;
  passport: string;
  demographicInfo: string;
  country: string;
  program: string;
  productPackage: string;
  major: string;
  salesperson: string;
  branch: string;
  processorName: string;
  intake: string;
  intakeDate: string;
  intakeNote: string;
  stage: string;
  caseCompleteness: StudyAbroadCaseCompleteness;
  caseCompletenessNote: string;
  certificate: string;
  serviceStatus: StudyAbroadServiceStatus;
  serviceStatusNote: string;
  tuition: number;
  invoiceStatus: StudyAbroadInvoiceStatus;
  invoiceNote: string;
  cmtc: StudyAbroadCmtcStatus;
  cmtcAmount: number;
  cmtcNote: string;
  schoolInterviewDate: string;
  schoolInterviewStatus: StudyAbroadSchoolInterviewStatus;
  schoolInterviewNote: string;
  programSelectionStatus: StudyAbroadProgramSelectionStatus;
  schoolProgramName: string;
  schoolProgramNote: string;
  translationStatus: StudyAbroadTranslationStatus;
  translationNote: string;
  offerLetterStatus: StudyAbroadOfferLetterStatus;
  offerLetterNote: string;
  embassyAppointmentStatus: StudyAbroadEmbassyAppointmentStatus;
  embassyAppointmentDate: string;
  embassyAppointmentNote: string;
  visaStatus: StudyAbroadVisaStatus;
  visaNote: string;
  flightStatus: StudyAbroadFlightStatus;
  expectedFlightTerm: string;
  expectedEntryDate: string;
  flightNote: string;
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

const cleanText = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  return decodeMojibakeText(String(value)).replace(/\s+/g, ' ').trim();
};

const cleanInternalNote = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  return decodeMojibakeText(String(value))
    .replace(/\r\n/g, '\n')
    .trim();
};

const SERVICE_STATUS_LABELS: Record<StudyAbroadServiceStatus, string> = {
  NEW: 'Mới',
  UNPROCESSED: 'Chưa xử lý',
  PROCESSED: 'Đã xử lý',
  DEPARTED: 'Đã bay',
  WITHDRAWN: 'Đã rút hồ sơ',
  VISA_FAILED: 'Trượt visa',
  REPROCESSING: 'Đang xử lý lại'
};

const INVOICE_STATUS_LABELS: Record<StudyAbroadInvoiceStatus, string> = {
  UNPAID: 'Chưa nộp',
  HAS_INVOICE: 'Có invoice',
  PAID: 'Đã nộp'
};

const SCHOOL_INTERVIEW_STATUS_LABELS: Record<StudyAbroadSchoolInterviewStatus, string> = {
  NO_SCHEDULE: 'Chưa có lịch',
  SCHEDULED: 'Đã có lịch',
  INTERVIEWED: 'Đã phỏng vấn',
  PASSED: 'Đã pvan',
  FAILED: 'Trượt',
  NOT_REQUIRED: 'Không cần'
};

const CMTC_STATUS_LABELS: Record<StudyAbroadCmtcStatus, string> = {
  NOT_OPENED: 'Chưa mở tài khoản',
  OPENED: 'Đã mở tài khoản',
  SUBMITTED: 'Đã nộp'
};

const PROGRAM_SELECTION_LABELS: Record<StudyAbroadProgramSelectionStatus, string> = {
  NOT_SELECTED: 'Chưa chọn',
  SELECTED: 'Đã chọn'
};

const CASE_COMPLETENESS_LABELS: Record<StudyAbroadCaseCompleteness, string> = {
  MISSING: 'Chưa đủ',
  FULL: 'Đã đủ'
};

const TRANSLATION_STATUS_LABELS: Record<StudyAbroadTranslationStatus, string> = {
  NOT_YET: 'Chưa',
  DONE: 'Có'
};

const OFFER_LETTER_LABELS: Record<StudyAbroadOfferLetterStatus, string> = {
  NOT_SENT: 'Chưa gửi',
  SENT: 'Đã gửi',
  RECEIVED: 'Đã có'
};

const EMBASSY_APPOINTMENT_LABELS: Record<StudyAbroadEmbassyAppointmentStatus, string> = {
  NOT_BOOKED: 'Chưa đặt',
  BOOKED: 'Đã đặt lịch',
  SCHEDULED: 'Đã có lịch',
  CANCELLED: 'Huỷ lịch'
};

const VISA_STATUS_LABELS: Record<StudyAbroadVisaStatus, string> = {
  NOT_SUBMITTED: 'Chưa nộp',
  SUBMITTED: 'Đã nộp',
  SUPPLEMENT: 'Bổ sung',
  GRANTED: 'Đỗ visa',
  FAILED: 'Trượt visa'
};

const FLIGHT_STATUS_LABELS: Record<StudyAbroadFlightStatus, string> = {
  NOT_DEPARTED: 'Chưa bay',
  DEPARTED: 'Đã bay',
  CANCELLED: 'Huỷ'
};

const getStatusLabel = <T extends string>(labels: Record<T, string>, value: T | string | undefined): string => {
  const normalized = cleanText(value);
  if (!normalized) return '-';
  return labels[normalized as T] || normalized;
};

const normalizeQuotationLogNote = (item: IQuotationLogNote, index: number): IQuotationLogNote => ({
  id: cleanText(item.id) || `q-log-${index}`,
  timestamp: cleanText(item.timestamp) || new Date().toISOString(),
  user: cleanText(item.user) || 'System',
  action: cleanText(item.action) || 'System',
  detail: cleanInternalNote(item.detail),
  type: item.type,
  attachments: Array.isArray(item.attachments) ? item.attachments.map((attachment) => cleanText(attachment)).filter(Boolean) : undefined
});

const toToken = (value: unknown): string =>
  cleanText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

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

const inferProductPackage = (text: string): string => {
  const token = toToken(text);
  if (!token) return '';
  if (token.includes('combo') && token.includes('duc')) return 'Combo du học Đức';
  if (token.includes('combo') && token.includes('nghe')) return 'Combo du học nghề';
  if (token.includes('nghe')) return 'Du học nghề';
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

const normalizeDemographicValue = (value: string): string => {
  const cleaned = cleanText(value);
  if (!cleaned || cleaned === UNKNOWN || cleaned === NOT_UPDATED) return '';
  return cleaned;
};

const formatDemographicInfo = (fields: {
  student: string;
  phone: string;
  email: string;
  address: string;
  dateOfBirth: string;
  identityCard: string;
  passport: string;
}): string => {
  const lines = [
    ['Họ tên', normalizeDemographicValue(fields.student)],
    ['SĐT', normalizeDemographicValue(fields.phone)],
    ['Email', normalizeDemographicValue(fields.email)],
    ['Địa chỉ', normalizeDemographicValue(fields.address)],
    ['Ngày sinh', normalizeDemographicValue(fields.dateOfBirth)],
    ['CCCD', normalizeDemographicValue(fields.identityCard)],
    ['Passport', normalizeDemographicValue(fields.passport)]
  ]
    .filter(([, value]) => Boolean(value))
    .map(([label, value]) => `${label}: ${value}`);

  return lines.join('\n');
};

const mergeDemographicInfo = (structuredInfo: string, legacyInfo: unknown): string => {
  const structured = cleanInternalNote(structuredInfo);
  const legacy = cleanInternalNote(legacyInfo);

  if (!structured) return legacy;
  if (!legacy || legacy === structured) return structured;
  if (legacy.includes(structured)) return legacy;

  return `${structured}\n${legacy}`;
};

const normalizeProfileStatus = (value: unknown, hasCoreInfo: boolean): StudyAbroadCaseCompleteness => {
  const token = toToken(value);
  if (token === 'full' || token === 'day_du' || token === 'du') return 'FULL';
  if (token === 'missing' || token === 'thieu' || token === 'chua_du') return 'MISSING';
  return hasCoreInfo ? 'FULL' : 'MISSING';
};

const normalizeServiceStatus = (value: unknown, isProcessingFallback: boolean): StudyAbroadServiceStatus => {
  const token = toToken(value);
  if (token === 'new' || token === 'moi') return 'NEW';
  if (token === 'unprocessed' || token === 'chua_xu_ly' || token === 'pending' || token === 'draft') return 'UNPROCESSED';
  if (token === 'processed' || token === 'da_xu_ly' || token === 'processing' || token === 'dang_xu_ly' || token === 'active' || token === 'completed') return 'PROCESSED';
  if (token === 'departed' || token === 'da_bay') return 'DEPARTED';
  if (token === 'withdrawn' || token === 'da_rut_hso' || token === 'da_rut_ho_so') return 'WITHDRAWN';
  if (token === 'visa_failed' || token === 'truot_visa' || token === 'failed_visa') return 'VISA_FAILED';
  if (token === 'reprocessing' || token === 'dang_xu_ly_lai') return 'REPROCESSING';
  return isProcessingFallback ? 'PROCESSED' : 'NEW';
};

const normalizeInvoiceStatus = (
  value: unknown,
  hasInvoice: boolean,
  hasApprovedTransaction: boolean
): StudyAbroadInvoiceStatus => {
  const token = toToken(value);
  if (token === 'paid' || token === 'da_nop' || token === 'submitted') return 'PAID';
  if (token === 'has_invoice' || token === 'co_invoice' || token === 'issued') return 'HAS_INVOICE';
  if (token === 'none' || token === 'chua_co' || token === 'not_issued' || token === 'unpaid' || token === 'chua_nop') return 'UNPAID';
  if (hasApprovedTransaction) return 'PAID';
  if (hasInvoice) return 'HAS_INVOICE';
  return 'UNPAID';
};

const normalizeCmtcStatus = (value: unknown, fallback: StudyAbroadCmtcStatus): StudyAbroadCmtcStatus => {
  const token = toToken(value);
  if (token === 'submitted' || token === 'da_nop' || token === 'approved' || token === 'dat' || token === 'done') return 'SUBMITTED';
  if (token === 'opened' || token === 'da_mo_tai_khoan' || token === 'rejected' || token === 'can_bo_sung') return 'OPENED';
  if (token === 'pending' || token === 'chua_nop' || token === 'not_opened' || token === 'chua_mo_tai_khoan' || token === 'updating') return 'NOT_OPENED';
  return fallback;
};

const normalizeSchoolInterviewStatus = (value: unknown): StudyAbroadSchoolInterviewStatus => {
  const token = toToken(value);
  if (token === 'scheduled' || token === 'da_co_lich') return 'SCHEDULED';
  if (token === 'interviewed' || token === 'da_phong_van' || token === 'completed') return 'INTERVIEWED';
  if (token === 'passed' || token === 'da_pvan' || token === 'pass') return 'PASSED';
  if (token === 'failed' || token === 'truot') return 'FAILED';
  if (token === 'not_required' || token === 'khong_can') return 'NOT_REQUIRED';
  return 'NO_SCHEDULE';
};

const normalizeProgramSelectionStatus = (value: unknown, hasProgramName: boolean): StudyAbroadProgramSelectionStatus => {
  const token = toToken(value);
  if (token === 'selected' || token === 'da_chon') return 'SELECTED';
  if (token === 'not_selected' || token === 'chua_chon') return 'NOT_SELECTED';
  return hasProgramName ? 'SELECTED' : 'NOT_SELECTED';
};

const normalizeTranslationStatus = (value: unknown, caseStatus: StudyAbroadCaseCompleteness): StudyAbroadTranslationStatus => {
  const token = toToken(value);
  if (token === 'done' || token === 'co' || token === 'da_dich') return 'DONE';
  if (token === 'not_yet' || token === 'chua' || token === 'chua_dich') return 'NOT_YET';
  return caseStatus === 'FULL' ? 'DONE' : 'NOT_YET';
};

const normalizeOfferLetterStatus = (value: unknown): StudyAbroadOfferLetterStatus => {
  const token = toToken(value);
  if (token === 'sent' || token === 'da_gui') return 'SENT';
  if (token === 'received' || token === 'da_co') return 'RECEIVED';
  return 'NOT_SENT';
};

const normalizeEmbassyAppointmentStatus = (value: unknown): StudyAbroadEmbassyAppointmentStatus => {
  const token = toToken(value);
  if (token === 'booked' || token === 'da_dat_lich') return 'BOOKED';
  if (token === 'scheduled' || token === 'da_co_lich') return 'SCHEDULED';
  if (token === 'cancelled' || token === 'huy_lich') return 'CANCELLED';
  return 'NOT_BOOKED';
};

const normalizeVisaStatus = (value: unknown): StudyAbroadVisaStatus => {
  const token = toToken(value);
  if (token === 'submitted' || token === 'da_nop') return 'SUBMITTED';
  if (token === 'supplement' || token === 'bo_sung') return 'SUPPLEMENT';
  if (token === 'granted' || token === 'do_visa' || token === 'co_visa') return 'GRANTED';
  if (token === 'failed' || token === 'truot_visa') return 'FAILED';
  return 'NOT_SUBMITTED';
};

const normalizeFlightStatus = (value: unknown, hasExpectedEntryDate: boolean): StudyAbroadFlightStatus => {
  const token = toToken(value);
  if (token === 'departed' || token === 'da_bay') return 'DEPARTED';
  if (token === 'cancelled' || token === 'huy') return 'CANCELLED';
  return hasExpectedEntryDate ? 'NOT_DEPARTED' : 'NOT_DEPARTED';
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

const hasStudyAbroadKeyword = (...values: unknown[]): boolean => {
  const token = toToken(values.filter(Boolean).join(' '));
  return token.includes('du_hoc') || token.includes('study_abroad');
};

const getStudyAbroadLineItems = (quotation: IQuotation) =>
  (quotation.lineItems || []).filter((item) =>
    hasStudyAbroadKeyword(item.name, item.servicePackage, item.courseName, ...(item.programs || []))
  );

const getStudyAbroadContextText = (quotation: IQuotation, lead?: ILead): string => {
  const lineItemTokens = getStudyAbroadLineItems(quotation).flatMap((item) => [
    item.name,
    item.courseName,
    item.servicePackage,
    ...(item.programs || [])
  ]);

  return [
    quotation.product,
    quotation.programType,
    quotation.targetCountry,
    ...lineItemTokens,
    lead?.program
  ]
    .filter(Boolean)
    .join(' ');
};

const matchesStudyAbroadService = (quotation: IQuotation, lead?: ILead): boolean => {
  if (quotation.status !== QuotationStatus.LOCKED) return false;
  if (quotation.serviceType === 'StudyAbroad') return true;
  if (getStudyAbroadLineItems(quotation).length > 0) return true;
  return hasStudyAbroadKeyword(quotation.product, quotation.programType);
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
  const primaryStudyAbroadLineItem = getStudyAbroadLineItems(quotation)[0];
  const studyAbroadContext = getStudyAbroadContextText(quotation, lead);

  const address = cleanText(quotation.studentAddress || student?.address || lead?.address) || UNKNOWN;
  const phone = cleanText(quotation.studentPhone || student?.phone || lead?.phone) || UNKNOWN;
  const email = cleanText(quotation.studentEmail || student?.email || lead?.email) || '';
  const dateOfBirth = cleanText(quotation.studentDob || student?.dob || lead?.dob) || '';
  const identityCard = cleanText(quotation.identityCard || lead?.identityCard) || '';
  const passport = cleanText(quotation.passport) || '';

  const inferredCountry = inferCountry(studyAbroadContext || [quotation.product, lead?.program, lead?.targetCountry].filter(Boolean).join(' '));
  const country = normalizeCountry(quotation.country || quotation.targetCountry || lead?.targetCountry || lead?.studentInfo?.targetCountry || inferredCountry) || UNKNOWN;

  const inferredProgram = inferProgram(studyAbroadContext || [quotation.product, quotation.serviceType, lead?.program].filter(Boolean).join(' '));
  const inferredPackage = inferProductPackage(studyAbroadContext || [quotation.product, quotation.programType].filter(Boolean).join(' '));
  const program = cleanText(quotation.programType || lead?.program || inferredProgram) || UNKNOWN;
  const productPackage = cleanText(quotation.studyAbroadProductPackage || inferredPackage) || NOT_UPDATED;

  const major = cleanText(quotation.major || lead?.educationLevel || lead?.currentEducationStatus) || NOT_UPDATED;
  const salesperson = resolveSalesName(quotation, lead);
  const branch = cleanText(quotation.branchName || admission?.campusId || student?.campus || lead?.city) || UNKNOWN;
  const processorName = cleanText(quotation.caseProcessorName) || salesperson;
  const intakeDate = cleanText(quotation.intakeDate) || cleanText(quotation.intakeTerm) || '';
  const intake = intakeDate || toMonthYear(student?.admissionDate || admission?.createdAt || quotation.createdAt) || NOT_UPDATED;
  const stage = normalizeStage(quotation, admission);
  const certificate = cleanText(quotation.certificateInfo || lead?.studentInfo?.languageLevel || student?.languageLevel) || NOT_UPDATED;
  const demographicInfo =
    mergeDemographicInfo(
      formatDemographicInfo({
        student: cleanText(primaryStudyAbroadLineItem?.studentName || student?.name || quotation.customerName) || UNKNOWN,
        phone,
        email,
        address,
        dateOfBirth,
        identityCard,
        passport
      }),
      quotation.demographicInfo
    ) || NOT_UPDATED;

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
    caseCompleteness === 'FULL' ? 'SUBMITTED' : 'NOT_OPENED'
  );

  const schoolProgramName = cleanText(quotation.schoolProgramName || quotation.major) || NOT_UPDATED;
  const programSelectionStatus = normalizeProgramSelectionStatus(quotation.programSelectionStatus, schoolProgramName !== NOT_UPDATED);
  const schoolInterviewStatus = normalizeSchoolInterviewStatus(quotation.schoolInterviewStatus || quotation.caseStage);
  const translationStatus = normalizeTranslationStatus(quotation.translationStatus, caseCompleteness);
  const offerLetterStatus = normalizeOfferLetterStatus(quotation.offerLetterStatus);
  const embassyAppointmentStatus = normalizeEmbassyAppointmentStatus(quotation.embassyAppointmentStatus || quotation.caseStage);
  const visaStatus = normalizeVisaStatus(quotation.visaStatus || quotation.caseStage);

  const expectedFlightTerm =
    cleanText(quotation.expectedFlightTerm) ||
    toQuarterYear(quotation.lockedAt || quotation.createdAt) ||
    NOT_UPDATED;
  const expectedEntryDate = cleanText(quotation.expectedEntryDate) || cleanText(quotation.expectedFlightTerm) || '';
  const flightStatus = normalizeFlightStatus(quotation.flightStatus || quotation.caseStage, Boolean(expectedEntryDate));
  const internalNote = cleanInternalNote(quotation.internalNote);

  return {
    id: quotation.id,
    soCode: cleanText(quotation.soCode) || quotation.id,
    student: cleanText(primaryStudyAbroadLineItem?.studentName || student?.name || quotation.customerName) || UNKNOWN,
    address,
    phone,
    email,
    dateOfBirth,
    identityCard,
    passport,
    demographicInfo,
    country,
    program,
    productPackage,
    major,
    salesperson,
    branch,
    processorName,
    intake,
    intakeDate,
    intakeNote: cleanInternalNote(quotation.intakeNote),
    stage,
    caseCompleteness,
    caseCompletenessNote: cleanInternalNote(quotation.caseProfileStatusNote),
    certificate,
    serviceStatus,
    serviceStatusNote: cleanInternalNote(quotation.serviceStatusNote),
    tuition: normalizeNumber(quotation.finalAmount || quotation.amount),
    invoiceStatus,
    invoiceNote: cleanInternalNote(quotation.invoiceNote),
    cmtc,
    cmtcAmount: normalizeNumber(quotation.cmtcAmount),
    cmtcNote: cleanInternalNote(quotation.cmtcNote),
    schoolInterviewDate: cleanText(quotation.schoolInterviewDate),
    schoolInterviewStatus,
    schoolInterviewNote: cleanInternalNote(quotation.schoolInterviewNote),
    programSelectionStatus,
    schoolProgramName,
    schoolProgramNote: cleanInternalNote(quotation.schoolProgramNote),
    translationStatus,
    translationNote: cleanInternalNote(quotation.translationNote),
    offerLetterStatus,
    offerLetterNote: cleanInternalNote(quotation.offerLetterNote),
    embassyAppointmentStatus,
    embassyAppointmentDate: cleanText(quotation.embassyAppointmentDate),
    embassyAppointmentNote: cleanInternalNote(quotation.embassyAppointmentNote),
    visaStatus,
    visaNote: cleanInternalNote(quotation.visaNote),
    flightStatus,
    expectedFlightTerm,
    expectedEntryDate,
    flightNote: cleanInternalNote(quotation.flightNote),
    stageUpdatedAt: cleanText(quotation.stageUpdatedAt) || undefined,
    internalNote: internalNote || undefined,
    internalNoteUpdatedAt: cleanText(quotation.internalNoteUpdatedAt) || undefined,
    logNotes: Array.isArray(quotation.logNotes) ? quotation.logNotes.map(normalizeQuotationLogNote) : [],
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

const buildCaseUpdateLog = (
  currentCase: StudyAbroadCaseRecord | undefined,
  payload: UpdateStudyAbroadCasePayload,
  updatedBy: string
): IQuotationLogNote | null => {
  if (!currentCase) return null;

  const changedFields: string[] = [];
  const pushChange = <T extends string>(
    label: string,
    currentValue: T,
    nextValue: T,
    labels: Record<T, string>
  ) => {
    if (currentValue === nextValue) return;
    changedFields.push(`${label}: ${getStatusLabel(labels, currentValue)} -> ${getStatusLabel(labels, nextValue)}`);
  };

  pushChange('Trạng thái dịch vụ', currentCase.serviceStatus, payload.serviceStatus, SERVICE_STATUS_LABELS);
  pushChange('Invoice', currentCase.invoiceStatus, payload.invoiceStatus, INVOICE_STATUS_LABELS);
  pushChange('Phỏng vấn trường', currentCase.schoolInterviewStatus, payload.schoolInterviewStatus, SCHOOL_INTERVIEW_STATUS_LABELS);
  pushChange('CMTC', currentCase.cmtc, payload.cmtc, CMTC_STATUS_LABELS);
  pushChange('Chọn chương trình', currentCase.programSelectionStatus, payload.programSelectionStatus, PROGRAM_SELECTION_LABELS);
  pushChange('Trạng thái hồ sơ', currentCase.caseCompleteness, payload.caseCompleteness, CASE_COMPLETENESS_LABELS);
  pushChange('Dịch thuật công chứng', currentCase.translationStatus, payload.translationStatus, TRANSLATION_STATUS_LABELS);
  pushChange('Xin thư mời', currentCase.offerLetterStatus, payload.offerLetterStatus, OFFER_LETTER_LABELS);
  pushChange('Lịch hẹn ĐSQ', currentCase.embassyAppointmentStatus, payload.embassyAppointmentStatus, EMBASSY_APPOINTMENT_LABELS);
  pushChange('Visa', currentCase.visaStatus, payload.visaStatus, VISA_STATUS_LABELS);
  pushChange('Bay', currentCase.flightStatus, payload.flightStatus, FLIGHT_STATUS_LABELS);

  if (!changedFields.length) return null;

  return {
    id: `q-log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    user: cleanText(updatedBy) || 'System',
    type: 'system',
    action: 'Study Abroad Status Update',
    detail: changedFields.join('\n')
  };
  /*
  const changedFields: string[] = [];
  if (cleanText(quotation.customerName) !== cleanText(payload.student)) changedFields.push('Học viên');
  if (cleanText(quotation.studentAddress) !== cleanText(payload.address)) changedFields.push('Địa chỉ');
  if (cleanText(quotation.studentPhone) !== cleanText(payload.phone)) changedFields.push('SĐT');
  if (cleanText(quotation.country) !== cleanText(payload.country)) changedFields.push('Quốc gia');
  if (cleanText(quotation.programType) !== cleanText(payload.program)) changedFields.push('Chương trình');
  if (cleanText(quotation.studyAbroadProductPackage) !== cleanText(payload.productPackage)) changedFields.push('Gói sản phẩm');
  if (cleanText(quotation.major) !== cleanText(payload.major)) changedFields.push('Ngành');
  if (cleanText(quotation.salespersonName) !== cleanText(payload.salesperson)) changedFields.push('Salesperson');
  if (cleanText(quotation.branchName) !== cleanText(payload.branch)) changedFields.push('Chi nhánh');
  if (cleanText(quotation.caseProcessorName) !== cleanText(payload.processorName)) changedFields.push('Người xử lý');
  if (cleanText(quotation.caseStage) !== cleanText(payload.stage)) changedFields.push('Giai đoạn');
  if (cleanText(quotation.serviceProcessStatus) !== cleanText(payload.serviceStatus)) changedFields.push('Trạng thái dịch vụ');

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
  */
};

export const updateStudyAbroadCase = (
  caseId: string,
  payload: UpdateStudyAbroadCasePayload,
  updatedBy = 'System',
  previousCase?: StudyAbroadCaseRecord
): boolean => {
  // TODO: replace LocalStorage adapter with backend API mutation.
  const quotations = getQuotations();
  const quotation = quotations.find((item) => item.id === caseId && item.status === QuotationStatus.LOCKED);
  if (!quotation) return false;

  const tuition = Math.max(0, normalizeNumber(payload.tuition));
  const now = new Date().toISOString();
  const currentCase = previousCase || getStudyAbroadCaseList().find((item) => item.id === caseId);
  const updateLog = buildCaseUpdateLog(currentCase, payload, updatedBy);
  const demographicInfo = mergeDemographicInfo(
    formatDemographicInfo({
      student: payload.student,
      phone: payload.phone,
      email: payload.email,
      address: payload.address,
      dateOfBirth: payload.dateOfBirth,
      identityCard: payload.identityCard,
      passport: payload.passport
    }),
    payload.demographicInfo
  );

  const updatedQuotation: IQuotation = {
    ...quotation,
    customerName: cleanText(payload.student) || quotation.customerName,
    studentAddress: cleanText(payload.address) || '',
    studentPhone: cleanText(payload.phone) || '',
    studentEmail: cleanText(payload.email) || undefined,
    studentDob: cleanText(payload.dateOfBirth) || undefined,
    identityCard: cleanText(payload.identityCard) || undefined,
    passport: cleanText(payload.passport) || undefined,
    demographicInfo: demographicInfo || undefined,
    country: cleanText(payload.country) || undefined,
    targetCountry: cleanText(payload.country) || undefined,
    programType: cleanText(payload.program) || undefined,
    studyAbroadProductPackage: cleanText(payload.productPackage) || undefined,
    major: cleanText(payload.major) || undefined,
    salespersonName: cleanText(payload.salesperson) || undefined,
    branchName: cleanText(payload.branch) || undefined,
    caseProcessorName: cleanText(payload.processorName) || undefined,
    intakeTerm: cleanText(payload.intake) || undefined,
    intakeDate: cleanText(payload.intakeDate) || undefined,
    intakeNote: cleanInternalNote(payload.intakeNote) || undefined,
    caseStage: cleanText(payload.stage) || undefined,
    stageUpdatedAt:
      cleanText(payload.stage) && cleanText(payload.stage) !== cleanText(quotation.caseStage)
        ? now
        : quotation.stageUpdatedAt,
    caseProfileStatus: payload.caseCompleteness,
    caseProfileStatusNote: cleanInternalNote(payload.caseCompletenessNote) || undefined,
    certificateInfo: cleanText(payload.certificate) || undefined,
    serviceProcessStatus: payload.serviceStatus,
    serviceStatusNote: cleanInternalNote(payload.serviceStatusNote) || undefined,
    invoiceState: payload.invoiceStatus,
    invoiceNote: cleanInternalNote(payload.invoiceNote) || undefined,
    cmtcStatus: payload.cmtc,
    cmtcAmount: normalizeNumber(payload.cmtcAmount),
    cmtcNote: cleanInternalNote(payload.cmtcNote) || undefined,
    schoolInterviewDate: cleanText(payload.schoolInterviewDate) || undefined,
    schoolInterviewStatus: payload.schoolInterviewStatus,
    schoolInterviewNote: cleanInternalNote(payload.schoolInterviewNote) || undefined,
    programSelectionStatus: payload.programSelectionStatus,
    schoolProgramName: cleanText(payload.schoolProgramName) || undefined,
    schoolProgramNote: cleanInternalNote(payload.schoolProgramNote) || undefined,
    translationStatus: payload.translationStatus,
    translationNote: cleanInternalNote(payload.translationNote) || undefined,
    offerLetterStatus: payload.offerLetterStatus,
    offerLetterNote: cleanInternalNote(payload.offerLetterNote) || undefined,
    embassyAppointmentStatus: payload.embassyAppointmentStatus,
    embassyAppointmentDate: cleanText(payload.embassyAppointmentDate) || undefined,
    embassyAppointmentNote: cleanInternalNote(payload.embassyAppointmentNote) || undefined,
    visaStatus: payload.visaStatus,
    visaNote: cleanInternalNote(payload.visaNote) || undefined,
    flightStatus: payload.flightStatus,
    expectedFlightTerm: cleanText(payload.expectedFlightTerm) || undefined,
    expectedEntryDate: cleanText(payload.expectedEntryDate) || undefined,
    flightNote: cleanInternalNote(payload.flightNote) || undefined,
    finalAmount: tuition || quotation.finalAmount || quotation.amount,
    updatedAt: now,
    logNotes: updateLog ? [updateLog, ...(quotation.logNotes || [])] : quotation.logNotes || []
  };

  const updated = updateQuotation(updatedQuotation);
  if (!updated) return false;

  const student = getLinkedStudent(quotation, getStudents() as StudentLike[]);
  if (student) {
    updateStudent({
      ...student,
      name: cleanText(payload.student) || student.name,
      phone: cleanText(payload.phone) || student.phone,
      email: cleanText(payload.email) || student.email,
      dob: cleanText(payload.dateOfBirth) || student.dob,
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
