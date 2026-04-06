import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Calendar, Check, Columns3, Download, FileText, Filter, History, Paperclip, Printer, Rows3, UploadCloud } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  IActualTransaction,
  IActualTransactionLog,
  IContract,
  IQuotation,
  ITransaction,
  QuotationStatus,
  TransactionType
} from '../types';
import {
  addActualTransactionLog,
  getActualTransactionLogs,
  getActualTransactions,
  getContracts,
  getQuotations,
  getSalesTeams,
  getTransactions,
  saveActualTransactions,
  updateActualTransaction
} from '../utils/storage';
import LogAudienceFilterControl from '../components/LogAudienceFilter';
import PinnedSearchInput, { PinnedSearchChip } from '../components/PinnedSearchInput';
import { filterByLogAudience, getActualTransactionLogAudience, LogAudienceFilter } from '../utils/logAudience';

type BusinessGroup = 'THU' | 'CHI' | 'DIEU_CHINH';
type ApprovalStage = 'CHO_DUYET' | 'KE_TOAN_XAC_NHAN' | 'DA_DUYET' | 'DA_THU_CHI' | 'TU_CHOI';
type ApprovalFilter = 'ALL' | ApprovalStage;
type QuickFilter = 'ALL' | 'IN' | 'OUT' | 'WITH_CONTRACT' | 'NO_CONTRACT' | 'INTERNAL';
type TimeRangeType = 'all' | 'today' | 'yesterday' | 'thisWeek' | 'last7Days' | 'last30Days' | 'thisMonth' | 'lastMonth' | 'custom';
type BusinessGroupFilter = 'ALL' | BusinessGroup;
type MoneyOutGroupByKey = 'approvalStage' | 'businessGroup' | 'businessType' | 'paymentMethod' | 'cashAccount' | 'creator';
type ColumnId =
  | 'approvalTransactionCode'
  | 'businessGroup'
  | 'businessType'
  | 'relatedEntity'
  | 'recipientPayerName'
  | 'contractCode'
  | 'amount'
  | 'paymentMethod'
  | 'proof'
  | 'paymentDate'
  | 'creator'
  | 'createdAt'
  | 'approvalStage'
  | 'approvalNote'
  | 'transactionCode'
  | 'accountingType'
  | 'cashAccount'
  | 'voucherNumber'
  | 'processedStatus'
  | 'actualDate'
  | 'attachment';

type TransactionFormState = {
  transactionCode: string;
  type: TransactionType;
  cashAccount: string;
  attachmentName: string;
  attachmentUrl: string;
  date: string;
  recipientPayerName: string;
};

type ProcessResult = 'DA_THU' | 'DA_CHI';
type MoneyOutModalAction = 'VIEW' | 'PROCESS' | 'ATTACH';
type FinanceMoneyOutLocationState = {
  prefillSearch?: string;
  relatedSourceTransactionId?: string;
};

type MoneyOutRow = {
  actual: IActualTransaction;
  source?: ITransaction;
  quotation?: IQuotation;
  linkedContract?: IContract;
  approvalTransactionCode: string;
  approvalReferenceLabel: string;
  businessGroup: BusinessGroup;
  businessGroupLabel: string;
  businessType: string;
  relatedEntity: string;
  recipientPayerName: string;
  contractCode: string;
  contractReferenceLabel: string;
  paymentMethodLabel: string;
  proofValue: string;
  paymentDateLabel: string;
  creatorLabel: string;
  createdAtLabel: string;
  approvalStage: ApprovalStage;
  requiresCeoApproval: boolean;
  approvalNote: string;
  processedResult: ProcessResult | null;
  isProcessed: boolean;
  processedStatusLabel: string;
  processedStatusTone: string;
  accountingTypeLabel: string;
};

const MONEY_ACCOUNTS = ['STK ngân hàng', 'Tiền mặt'];
const APPROVAL_FILTER_LABEL_MAP: Record<ApprovalFilter, string> = {
  ALL: 'Tất cả trạng thái',
  CHO_DUYET: 'Chờ duyệt',
  KE_TOAN_XAC_NHAN: 'KT xác nhận',
  DA_DUYET: 'Duyệt',
  DA_THU_CHI: 'Đã thu / Đã chi',
  TU_CHOI: 'Từ chối'
};
const APPROVAL_FILTER_OPTIONS: ApprovalFilter[] = ['ALL', 'CHO_DUYET', 'KE_TOAN_XAC_NHAN', 'DA_DUYET', 'DA_THU_CHI', 'TU_CHOI'];
const TYPE_META: Record<TransactionType, { label: string; badge: string }> = {
  IN: { label: 'Thu', badge: 'bg-emerald-50 text-emerald-700' },
  OUT: { label: 'Chi', badge: 'bg-rose-50 text-rose-700' }
};
const PROCESS_RESULT_META: Record<ProcessResult, { label: string; tone: string; inlineTone: string; buttonTone: string }> = {
  DA_THU: {
    label: 'Đã thu',
    tone: 'bg-emerald-100 text-emerald-700',
    inlineTone: 'text-emerald-700',
    buttonTone: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
  },
  DA_CHI: {
    label: 'Đã chi',
    tone: 'bg-rose-100 text-rose-700',
    inlineTone: 'text-rose-700',
    buttonTone: 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
  }
};
const getProcessResultForTransactionType = (type: TransactionType): ProcessResult => (type === 'OUT' ? 'DA_CHI' : 'DA_THU');
const TIME_RANGE_OPTIONS: Array<{ id: TimeRangeType; label: string }> = [
  { id: 'all', label: 'Tất cả thời gian' },
  { id: 'today', label: 'Hôm nay' },
  { id: 'yesterday', label: 'Hôm qua' },
  { id: 'thisWeek', label: 'Tuần này' },
  { id: 'last7Days', label: '7 ngày qua' },
  { id: 'last30Days', label: '30 ngày qua' },
  { id: 'thisMonth', label: 'Tháng này' },
  { id: 'lastMonth', label: 'Tháng trước' },
  { id: 'custom', label: 'Tùy chỉnh khoảng...' }
];
const GROUP_BY_OPTIONS: Array<{ key: MoneyOutGroupByKey; label: string }> = [
  { key: 'approvalStage', label: 'Trạng thái' },
  { key: 'businessGroup', label: 'Nhóm NV' },
  { key: 'businessType', label: 'Loại nghiệp vụ' },
  { key: 'paymentMethod', label: 'Thanh toán' },
  { key: 'cashAccount', label: 'Hình thức thu / chi' },
  { key: 'creator', label: 'Người tạo' }
];
const COLUMN_OPTIONS: Array<{ id: ColumnId; label: string; align?: 'left' | 'right' }> = [
  { id: 'approvalTransactionCode', label: 'Mã giao dịch' },
  { id: 'businessGroup', label: 'Nhóm nghiệp vụ' },
  { id: 'businessType', label: 'Loại nghiệp vụ' },
  { id: 'relatedEntity', label: 'Đối tượng liên quan' },
  { id: 'recipientPayerName', label: 'Người nhận / nộp' },
  { id: 'contractCode', label: 'Hợp đồng' },
  { id: 'amount', label: 'Số tiền', align: 'right' },
  { id: 'paymentMethod', label: 'Hình thức thanh toán' },
  { id: 'proof', label: 'Chứng từ' },
  { id: 'paymentDate', label: 'Ngày thanh toán' },
  { id: 'creator', label: 'Người tạo' },
  { id: 'createdAt', label: 'Ngày tạo' },
  { id: 'approvalNote', label: 'Ghi chú' },
  { id: 'transactionCode', label: 'Mã thu chi' },
  { id: 'accountingType', label: 'Phân loại' },
  { id: 'cashAccount', label: 'Hình thức thu / chi' },
  { id: 'voucherNumber', label: 'Số chứng từ' },
  { id: 'approvalStage', label: 'Trạng thái duyệt' },
  { id: 'processedStatus', label: 'Trạng thái' },
  { id: 'actualDate', label: 'Ngày thu/chi' },
  { id: 'attachment', label: 'Attach chứng từ' }
];
const DEFAULT_VISIBLE_COLUMNS: ColumnId[] = [
  'approvalTransactionCode',
  'businessType',
  'relatedEntity',
  'recipientPayerName',
  'contractCode',
  'amount',
  'paymentDate',
  'voucherNumber',
  'approvalStage'
];

const INITIAL_ACTUAL_TRANSACTIONS: IActualTransaction[] = [
  {
    id: 'TXN-001',
    transactionCode: 'TC0001',
    type: 'OUT',
    category: 'Thanh toán đối tác hồ sơ',
    title: 'Đợt 1 - Đại học Goethe',
    amount: 50000000,
    department: 'Kế toán',
    cashAccount: 'STK ngân hàng',
    voucherNumber: 'UNC-2026-0201',
    attachmentName: 'unc-goethe-dot-1.pdf',
    date: '2026-02-10',
    status: 'PAID',
    proof: 'unc-goethe-dot-1.pdf',
    createdBy: 'Kế toán',
    createdAt: '2026-02-10T08:30:00.000Z'
  },
  {
    id: 'TXN-002',
    transactionCode: 'TC0002',
    type: 'OUT',
    category: 'Phí dịch vụ visa',
    title: 'Nhóm hồ sơ tháng 2',
    amount: 18000000,
    department: 'Kinh doanh',
    cashAccount: 'STK ngân hàng',
    voucherNumber: 'VC-02',
    attachmentName: 'de-xuat-chi-vc-02.pdf',
    date: '2026-02-12',
    status: 'PAID',
    proof: 'de-xuat-chi-vc-02.pdf',
    createdBy: 'Kế toán',
    createdAt: '2026-02-12T03:45:00.000Z'
  },
  {
    id: 'TXN-003',
    transactionCode: 'TC0003',
    type: 'OUT',
    category: 'Mua văn phòng phẩm',
    title: 'Bổ sung vật tư hành chính',
    amount: 3500000,
    department: 'Vận hành',
    cashAccount: 'Tiền mặt',
    voucherNumber: 'PC-014',
    attachmentName: 'phieu-chi-pc-014.pdf',
    date: '2026-02-14',
    status: 'PAID',
    proof: 'phieu-chi-pc-014.pdf',
    createdBy: 'Kế toán',
    createdAt: '2026-02-14T09:10:00.000Z'
  },
  {
    id: 'TXN-004',
    transactionCode: 'TC0004',
    type: 'IN',
    category: 'Thu học phí',
    title: 'Lớp A2 K52 - đợt 1',
    amount: 12000000,
    department: 'Đào tạo',
    cashAccount: 'Tiền mặt',
    voucherNumber: 'PT-2026-0102',
    attachmentName: 'phieu-thu-a2k52.pdf',
    date: '2026-02-11',
    status: 'RECEIVED',
    proof: 'phieu-thu-a2k52.pdf',
    createdBy: 'Kế toán',
    createdAt: '2026-02-11T05:20:00.000Z'
  },
  {
    id: 'TXN-005',
    transactionCode: 'TC0005',
    type: 'IN',
    category: 'Thu phí dịch vụ',
    title: 'Phí xử lý hồ sơ Đức',
    amount: 25000000,
    department: 'Kinh doanh',
    cashAccount: 'STK ngân hàng',
    voucherNumber: 'PT-2026-0103',
    attachmentName: 'bien-lai-thu-phi-dich-vu.pdf',
    date: '2026-02-15',
    status: 'RECEIVED',
    proof: 'bien-lai-thu-phi-dich-vu.pdf',
    createdBy: 'Kế toán',
    createdAt: '2026-02-15T02:00:00.000Z'
  }
];

const INITIAL_ACTUAL_TRANSACTION_LOGS: IActualTransactionLog[] = [
  {
    id: 'TXN-LOG-001',
    transactionId: 'TXN-001',
    action: 'CREATE',
    message: 'Tạo phiếu chi TC0001: Thanh toán đối tác hồ sơ (50.000.000 đ)',
    createdAt: '2026-02-10T08:30:00.000Z',
    createdBy: 'Kế toán'
  },
  {
    id: 'TXN-LOG-002',
    transactionId: 'TXN-001',
    action: 'UPDATE_STATUS',
    message: 'Đồng bộ sang danh sách thu chi',
    createdAt: '2026-02-10T09:15:00.000Z',
    createdBy: 'Kế toán'
  },
  {
    id: 'TXN-LOG-003',
    transactionId: 'TXN-005',
    action: 'CREATE',
    message: 'Tạo phiếu thu TC0005: Thu phí dịch vụ (25.000.000 đ)',
    createdAt: '2026-02-15T02:00:00.000Z',
    createdBy: 'Kế toán'
  }
];

const moneyFormat = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value || 0);

const dateTimeFormat = (value?: number | string) => {
  if (!value && value !== 0) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('vi-VN', { hour12: false });
};

const dateLabelFormat = (value?: string) => {
  if (!value) return '-';
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
};

const parseDateOnly = (value?: string) => {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate());
const endOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate(), 23, 59, 59, 999);
const endOfWeek = (value: Date) => {
  const end = startOfDay(value);
  const dayOfWeek = end.getDay() === 0 ? 7 : end.getDay();
  end.setDate(end.getDate() + (7 - dayOfWeek));
  return endOfDay(end);
};
const endOfMonth = (value: Date) => new Date(value.getFullYear(), value.getMonth() + 1, 0, 23, 59, 59, 999);
const toDateInputValue = (value: Date) => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const formatDateRangeLabel = (start?: string, end?: string) => {
  const startLabel = parseDateOnly(start)?.toLocaleDateString('vi-VN');
  const endLabel = parseDateOnly(end)?.toLocaleDateString('vi-VN');
  if (startLabel && endLabel) return `${startLabel} - ${endLabel}`;
  if (startLabel) return `Từ ${startLabel}`;
  if (endLabel) return `Đến ${endLabel}`;
  return 'Khoảng thời gian tùy chỉnh';
};

const getTimeRangeLabel = (rangeType: TimeRangeType, startDate?: string, endDate?: string) => {
  if (rangeType === 'custom') return formatDateRangeLabel(startDate, endDate);
  return TIME_RANGE_OPTIONS.find((item) => item.id === rangeType)?.label || 'Tất cả thời gian';
};

const getTimeRangeBounds = (rangeType: TimeRangeType, startDate?: string, endDate?: string) => {
  const now = new Date();
  const today = startOfDay(now);

  switch (rangeType) {
    case 'today':
      return { start: today, end: endOfDay(today) };
    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { start: yesterday, end: endOfDay(yesterday) };
    }
    case 'thisWeek': {
      const start = new Date(today);
      const dayOfWeek = start.getDay() === 0 ? 7 : start.getDay();
      start.setDate(start.getDate() - dayOfWeek + 1);
      return { start, end: endOfWeek(now) };
    }
    case 'last7Days': {
      const start = new Date(today);
      start.setDate(start.getDate() - 6);
      return { start, end: endOfDay(now) };
    }
    case 'last30Days': {
      const start = new Date(today);
      start.setDate(start.getDate() - 29);
      return { start, end: endOfDay(now) };
    }
    case 'thisMonth':
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: endOfMonth(now) };
    case 'lastMonth':
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
      };
    case 'custom': {
      const start = startDate ? parseDateOnly(startDate) : null;
      const end = endDate ? parseDateOnly(endDate) : null;
      return {
        start: start ? startOfDay(start) : new Date(0),
        end: end ? endOfDay(end) : endOfDay(now)
      };
    }
    case 'all':
    default:
      return null;
  }
};

const normalize = (value?: string) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const getProcessResultFromLog = (item: IActualTransactionLog): ProcessResult | null => {
  if (item.action !== 'UPDATE_STATUS' && item.action !== 'UPDATE') return null;

  const message = normalize(item.message);
  if (message.includes('da thu') || message.includes('da nhan duoc tien')) return 'DA_THU';
  if (message.includes('da chi') || message.includes('da dua tien')) return 'DA_CHI';
  return null;
};

const getProcessedStatusMeta = (processedResult: ProcessResult | null) => {
  if (!processedResult) return { label: 'Chưa xác nhận thu/chi', tone: 'bg-slate-100 text-slate-600' };
  return {
    label: PROCESS_RESULT_META[processedResult].label,
    tone: PROCESS_RESULT_META[processedResult].tone
  };
};

const getBusinessGroupLabel = (group: BusinessGroup) => {
  if (group === 'THU') return 'Thu';
  if (group === 'CHI') return 'Chi';
  return 'Điều chỉnh';
};

const inferBusinessGroup = (transaction?: ITransaction, actual?: IActualTransaction): BusinessGroup => {
  if (transaction?.businessGroupHint) return transaction.businessGroupHint;

  const haystack = normalize(
    `${transaction?.note || ''} ${transaction?.studentName || ''} ${transaction?.customerId || ''} ${actual?.category || ''} ${actual?.title || ''}`
  );

  if (
    haystack.includes('dieu chinh') ||
    haystack.includes('cong no') ||
    haystack.includes('bu tru') ||
    haystack.includes('huy khoan thu')
  ) {
    return 'DIEU_CHINH';
  }

  if (
    haystack.includes('chi ') ||
    haystack.includes('marketing') ||
    haystack.includes('mkt') ||
    haystack.includes('hoa hong') ||
    haystack.includes('commission') ||
    haystack.includes('van hanh') ||
    haystack.includes('cong tac')
  ) {
    return 'CHI';
  }

  if (actual?.type === 'OUT') return 'CHI';
  return 'THU';
};

const inferBusinessType = (transaction: ITransaction | undefined, group: BusinessGroup, actual: IActualTransaction) => {
  if (transaction?.businessTypeHint) return transaction.businessTypeHint;
  const haystack = normalize(transaction?.note || actual.category || actual.title);

  if (group === 'THU') {
    return transaction?.studentName || transaction?.soCode ? 'Thu học viên' : 'Thu khác';
  }

  if (group === 'CHI') {
    if (haystack.includes('cong tac')) return 'Chi công tác';
    if (haystack.includes('mkt') || haystack.includes('marketing')) return 'Chi MKT';
    if (haystack.includes('van hanh')) return 'Chi vận hành';
    if (haystack.includes('hoa hong') || haystack.includes('commission')) return 'Chi hoa hồng';
    return 'Chi khác';
  }

  if (haystack.includes('cong no')) return 'Điều chỉnh công nợ';
  if (haystack.includes('huy khoan thu')) return 'Hủy khoản thu';
  if (haystack.includes('bu tru')) return 'Bù trừ';
  return 'Điều chỉnh khác';
};

const getPaymentMethodLabel = (transaction?: ITransaction, actual?: IActualTransaction) => {
  if (transaction?.method === 'CHUYEN_KHOAN') return 'Chuyển khoản';
  if (transaction?.method === 'TIEN_MAT') return 'Tiền mặt';
  if (transaction?.method === 'THE') return 'Thẻ';
  if (transaction?.method === 'OTHER') return 'Khác';
  return actual?.cashAccount === 'Tiền mặt' ? 'Tiền mặt' : 'Chuyển khoản';
};

const getApprovalStage = (
  transaction: ITransaction | undefined,
  quotation: IQuotation | undefined,
  actualTransactionProcessed: boolean
): ApprovalStage => {
  if (!transaction) return actualTransactionProcessed ? 'DA_THU_CHI' : 'DA_DUYET';
  if (transaction.status === 'TU_CHOI') return 'TU_CHOI';
  if (transaction.status === 'CHO_DUYET') return 'CHO_DUYET';

  const hasLegacyAdminApproval =
    Boolean(quotation?.lockedAt) &&
    typeof transaction.approvedAt === 'number' &&
    Number.isFinite(new Date(quotation.lockedAt as string).getTime()) &&
    new Date(quotation.lockedAt as string).getTime() >= transaction.approvedAt;

  if (typeof transaction.adminApprovedAt === 'number' || hasLegacyAdminApproval) {
    return actualTransactionProcessed ? 'DA_THU_CHI' : 'DA_DUYET';
  }
  return 'KE_TOAN_XAC_NHAN';
};

const buildFallbackTransactionCode = (item: IActualTransaction, index: number) => {
  const matches = item.id.match(/\d+/g);
  const fallbackNumber = matches?.length ? Number(matches[matches.length - 1]) : index + 1;
  return `TC${String(fallbackNumber).padStart(4, '0')}`;
};

const inferCashAccount = (item: IActualTransaction) => {
  const reference = `${item.voucherNumber || item.proof || ''}`.toUpperCase();
  if (reference.startsWith('PC') || reference.startsWith('PT') || reference.includes('TIEN MAT')) {
    return 'Tiền mặt';
  }
  return 'STK ngân hàng';
};

const normalizeActualTransaction = (item: IActualTransaction, index: number): IActualTransaction => ({
  ...item,
  transactionCode: item.transactionCode || buildFallbackTransactionCode(item, index),
  cashAccount: item.cashAccount || inferCashAccount(item),
  voucherNumber: item.voucherNumber || item.proof || '',
  attachmentName: item.attachmentName || '',
  attachmentUrl: item.attachmentUrl || '',
  proof: item.proof || item.attachmentName || item.voucherNumber || undefined,
  status: item.type === 'OUT' ? 'PAID' : 'RECEIVED'
});

const getNextTransactionCode = (transactions: IActualTransaction[]) => {
  const nextNumber =
    transactions.reduce((max, item) => {
      const raw = item.transactionCode || '';
      const match = raw.match(/\d+/);
      const current = match ? Number(match[0]) : 0;
      return current > max ? current : max;
    }, 0) + 1;

  return `TC${String(nextNumber).padStart(4, '0')}`;
};

const getActualTransactionCodeFromSource = (transaction: ITransaction) => {
  const rawCodeMatches = (transaction.code || transaction.id).match(/\d+/g);
  const sequence = rawCodeMatches?.length ? Number(rawCodeMatches[rawCodeMatches.length - 1]) : Date.now() % 10000;
  return `TC${String(sequence).padStart(4, '0')}`;
};

const buildActualTransactionFromSource = (transaction: ITransaction, existing?: IActualTransaction): IActualTransaction => {
  const businessGroup = inferBusinessGroup(transaction);
  const type: TransactionType = businessGroup === 'THU' ? 'IN' : 'OUT';
  const proofFile = transaction.proofFiles?.[0];
  const defaultLabel = transaction.businessTypeHint || (type === 'IN' ? 'Thu học phí' : 'Chi phí');
  const sourceDate = new Date(transaction.paidAt || transaction.createdAt);

  return {
    id: existing?.id || `ATX-${transaction.id}`,
    transactionCode: existing?.transactionCode || getActualTransactionCodeFromSource(transaction),
    type,
    category: existing?.category || defaultLabel,
    title: existing?.title || transaction.note || transaction.relatedEntityLabel || transaction.studentName || defaultLabel,
    recipientPayerName:
      existing?.recipientPayerName || transaction.recipientPayerName || transaction.relatedEntityLabel || transaction.studentName || undefined,
    amount: transaction.amount,
    department: existing?.department || 'Kế toán',
    cashAccount: existing?.cashAccount || (transaction.method === 'TIEN_MAT' ? 'Tiền mặt' : 'STK ngân hàng'),
    voucherNumber: existing?.voucherNumber || transaction.bankRefCode || '',
    date: existing?.date || (Number.isNaN(sourceDate.getTime()) ? new Date().toISOString().slice(0, 10) : sourceDate.toISOString().slice(0, 10)),
    status: existing?.status || (type === 'OUT' ? 'PAID' : 'RECEIVED'),
    processResult: existing?.processResult,
    proof: existing?.proof || transaction.bankRefCode || proofFile?.name || undefined,
    attachmentName: existing?.attachmentName || proofFile?.name,
    attachmentUrl: existing?.attachmentUrl || proofFile?.url,
    relatedId: transaction.id,
    createdBy: existing?.createdBy || transaction.createdBy || 'Kế toán',
    createdAt: existing?.createdAt || new Date().toISOString()
  };
};

const buildApprovalTransactionCode = (
  transaction: ITransaction | undefined,
  sourceIndex: number | undefined,
  businessGroup: BusinessGroup,
  actual: IActualTransaction
) => {
  if (transaction?.code) return transaction.code;
  if (sourceIndex === undefined) return actual.transactionCode || actual.id;
  if (businessGroup === 'THU') return `KT${String(sourceIndex + 1).padStart(4, '0')}`;
  if (businessGroup === 'CHI') return `KC${String(sourceIndex + 1).padStart(5, '0')}`;
  return `DC${String(sourceIndex + 1).padStart(4, '0')}`;
};

const getApprovalReferenceLabel = (transaction: ITransaction | undefined, actual: IActualTransaction) => {
  if (transaction?.id) return transaction.id;
  if (actual.relatedId) return `Link cũ: ${actual.relatedId}`;
  return 'Phiếu kế toán trực tiếp';
};

const hasContractContext = (quotation?: IQuotation, linkedContract?: IContract) => {
  if (linkedContract?.code) return true;
  if (!quotation) return false;
  return (
    Boolean(quotation.contractId) ||
    quotation.status === QuotationStatus.LOCKED ||
    quotation.contractStatus === 'signed_contract' ||
    quotation.contractStatus === 'enrolled' ||
    quotation.contractStatus === 'active'
  );
};

const getContractDisplay = (
  quotation: IQuotation | undefined,
  linkedContract: IContract | undefined,
  source: ITransaction | undefined,
  businessGroup: BusinessGroup
) => {
  if (linkedContract?.code) {
    return {
      code: linkedContract.code,
      reference: linkedContract.id || `SO: ${quotation?.soCode || source?.soCode || '-'}`
    };
  }

  const soCode = quotation?.soCode || source?.soCode;
  if (hasContractContext(quotation, linkedContract) && soCode) {
    return {
      code: `HD-${soCode}`,
      reference: 'Suy ra từ SO đã khóa'
    };
  }

  if (soCode) {
    return {
      code: 'Chưa tạo HĐ',
      reference: `SO: ${soCode}`
    };
  }

  if (businessGroup === 'THU') {
    return {
      code: 'Chưa gắn HĐ',
      reference: 'Không tìm thấy SO/HĐ liên quan'
    };
  }

  return {
    code: 'Ngoài hợp đồng',
    reference: 'Khoản chi nội bộ hoặc đối tác'
  };
};

const getContractFilterState = (row: MoneyOutRow): 'WITH_CONTRACT' | 'NO_CONTRACT' | 'INTERNAL' => {
  if (row.contractCode === 'Ngoài hợp đồng') return 'INTERNAL';
  if (row.contractCode.startsWith('HD-') || Boolean(row.linkedContract?.code)) return 'WITH_CONTRACT';
  return 'NO_CONTRACT';
};

const getEmptyFormState = (transactionCode: string): TransactionFormState => ({
  transactionCode,
  type: 'OUT',
  cashAccount: 'STK ngân hàng',
  attachmentName: '',
  attachmentUrl: '',
  date: new Date().toISOString().slice(0, 10),
  recipientPayerName: ''
});

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Không thể đọc chứng từ'));
    reader.readAsDataURL(file);
  });

const getApprovalStageLabel = (stage: ApprovalStage, businessGroup?: BusinessGroup, processedResult?: ProcessResult | null) => {
  if (stage === 'DA_THU_CHI') {
    if (processedResult) return PROCESS_RESULT_META[processedResult].label;
    if (businessGroup === 'CHI') return 'Đã chi';
    if (businessGroup === 'THU') return 'Đã thu';
  }

  return APPROVAL_FILTER_LABEL_MAP[stage];
};

const ApprovalStageBadge: React.FC<{ stage: ApprovalStage; businessGroup: BusinessGroup; processedResult?: ProcessResult | null }> = ({
  stage,
  businessGroup,
  processedResult
}) => {
  const meta: Record<ApprovalStage, { tone: string }> = {
    CHO_DUYET: { tone: 'bg-amber-50 text-amber-700 border border-amber-200' },
    KE_TOAN_XAC_NHAN: { tone: 'bg-sky-50 text-sky-700 border border-sky-200' },
    DA_DUYET: { tone: 'bg-blue-50 text-blue-700 border border-blue-200' },
    DA_THU_CHI: { tone: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
    TU_CHOI: { tone: 'bg-rose-50 text-rose-700 border border-rose-200' }
  };

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap ${meta[stage].tone}`}>
      {getApprovalStageLabel(stage, businessGroup, processedResult)}
    </span>
  );
};

const DetailSheetRow: React.FC<{ label: string; value: React.ReactNode; className?: string }> = ({ label, value, className }) => (
  <div className={`flex items-start gap-3 py-1.5 ${className || ''}`.trim()}>
    <div className="w-[128px] shrink-0 text-[11px] font-medium uppercase tracking-[0.04em] text-slate-500">{label}</div>
    <div className="min-w-0 flex-1 text-[13px] font-semibold text-slate-900 break-words">{value}</div>
  </div>
);

const DetailStat: React.FC<{ label: string; value: React.ReactNode; tone?: 'blue' | 'green' | 'orange' | 'slate' }> = ({
  label,
  value,
  tone = 'slate'
}) => {
  const toneClass =
    tone === 'blue'
      ? 'text-blue-700'
      : tone === 'green'
        ? 'text-emerald-700'
        : tone === 'orange'
          ? 'text-amber-700'
          : 'text-slate-900';

  return (
    <div className="min-w-0 border-l border-slate-200 pl-3 first:border-l-0 first:pl-0">
      <div className="text-[11px] font-medium text-slate-500">{label}</div>
      <div className={`mt-0.5 text-[14px] font-bold ${toneClass}`}>{value}</div>
    </div>
  );
};

const StepWorkflowBar: React.FC<{ currentStep: number; labels: string[] }> = ({ currentStep, labels }) => (
  <div className="inline-flex overflow-hidden rounded-sm border border-slate-200 bg-white">
    {labels.map((label, index) => {
      const stepNumber = index + 1;
      const isActive = stepNumber <= currentStep;
      return (
        <div
          key={label}
          className={`border-l border-slate-200 px-3 py-1.5 text-[11px] font-semibold first:border-l-0 ${
            isActive ? 'bg-blue-50 text-blue-700' : 'bg-slate-50 text-slate-400'
          }`}
        >
          {label}
        </div>
      );
    })}
  </div>
);

const EnterpriseWorkflowBar: React.FC<{ currentStep: number; labels: string[] }> = ({ currentStep, labels }) => (
  <div className="flex items-center text-[11px] font-semibold">
    {labels.map((label, index) => {
      const stepNumber = index + 1;
      const isCurrent = stepNumber === currentStep;
      const isCompleted = stepNumber < currentStep;
      const className = isCurrent
        ? 'border-[#1d4ed8] bg-[#1d4ed8] text-white'
        : isCompleted
          ? 'border-[#bfd3f2] bg-[#eef4ff] text-[#1d4ed8]'
          : 'border-[#dee2e6] bg-[#f5f6f7] text-[#6b7280]';
      const clipPath =
        index === 0
          ? 'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)'
          : index === labels.length - 1
            ? 'polygon(12px 0, 100% 0, 100% 100%, 12px 100%, 0 50%)'
            : 'polygon(12px 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 12px 100%, 0 50%)';

      return (
        <div
          key={label}
          className={`relative flex h-8 min-w-[96px] items-center justify-center border px-4 ${className} ${index > 0 ? '-ml-[7px]' : ''}`}
          style={{ clipPath, zIndex: labels.length - index }}
        >
          <span className="truncate">{label}</span>
        </div>
      );
    })}
  </div>
);

const CompactSheetRow: React.FC<{ label: string; value: React.ReactNode; noBorder?: boolean }> = ({ label, value, noBorder = false }) => (
  <div className={`flex items-start gap-4 py-2 ${noBorder ? '' : 'border-b border-[#eef1f4]'}`}>
    <div className="w-[124px] shrink-0 text-[11px] font-medium uppercase tracking-[0.04em] text-[#666666]">{label}</div>
    <div className="min-w-0 flex-1 text-[13px] font-semibold text-[#111827]">{value}</div>
  </div>
);

const CompactStatusPill: React.FC<{ label: string; tone: 'blue' | 'green' | 'amber' | 'rose' | 'slate' }> = ({ label, tone }) => {
  const toneClass =
    tone === 'blue'
      ? 'border-[#bfdbfe] bg-[#eff6ff] text-[#1d4ed8]'
      : tone === 'green'
        ? 'border-[#bbf7d0] bg-[#f0fdf4] text-[#15803d]'
        : tone === 'amber'
          ? 'border-[#fde68a] bg-[#fffbeb] text-[#b45309]'
          : tone === 'rose'
            ? 'border-[#fecdd3] bg-[#fff1f2] text-[#be123c]'
            : 'border-[#d1d5db] bg-[#f9fafb] text-[#475569]';

  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${toneClass}`}>{label}</span>;
};

const CompactAttachmentLink: React.FC<{ name?: string; url?: string }> = ({ name, url }) => {
  if (!name) return <span className="text-[13px] font-medium text-[#9ca3af]">Chưa attach chứng từ</span>;

  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex max-w-full items-center gap-1 text-[13px] font-medium text-[#1d4ed8] hover:text-[#1e40af] hover:underline"
        title={name}
      >
        <Paperclip size={12} />
        <span className="truncate">{name}</span>
      </a>
    );
  }

  return (
    <span className="inline-flex max-w-full items-center gap-1 text-[13px] font-medium text-[#475569]" title={name}>
      <Paperclip size={12} />
      <span className="truncate">{name}</span>
    </span>
  );
};

const AttachmentPreview: React.FC<{ name?: string; url?: string; emptyLabel?: string }> = ({
  name,
  url,
  emptyLabel = 'Chưa attach chứng từ'
}) => {
  if (!name) return <span className="text-slate-400">{emptyLabel}</span>;

  if (!url) {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
        <FileText size={12} />
        {name}
      </span>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs text-slate-700 hover:bg-slate-200"
    >
      <FileText size={12} />
      {name}
    </a>
  );
};

const FinanceMoneyOut: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const columnMenuRef = useRef<HTMLDivElement | null>(null);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);
  const timeMenuRef = useRef<HTMLDivElement | null>(null);
  const quickFilterMenuRef = useRef<HTMLDivElement | null>(null);
  const navigationPrefillKeyRef = useRef<string | null>(null);
  const [transactions, setTransactions] = useState<IActualTransaction[]>([]);
  const [sourceTransactions, setSourceTransactions] = useState<ITransaction[]>([]);
  const [quotations, setQuotations] = useState<IQuotation[]>([]);
  const [contracts, setContracts] = useState<IContract[]>([]);
  const [logs, setLogs] = useState<IActualTransactionLog[]>([]);
  const [creatorDirectory, setCreatorDirectory] = useState<Map<string, string>>(new Map());
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<QuickFilter>('ALL');
  const [timeRangeType, setTimeRangeType] = useState<TimeRangeType>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [draftTimeRangeType, setDraftTimeRangeType] = useState<TimeRangeType>('all');
  const [draftCustomStartDate, setDraftCustomStartDate] = useState('');
  const [draftCustomEndDate, setDraftCustomEndDate] = useState('');
  const [approvalFilter, setApprovalFilter] = useState<ApprovalFilter>('ALL');
  const [businessGroupFilter, setBusinessGroupFilter] = useState<BusinessGroupFilter>('ALL');
  const [businessTypeFilter, setBusinessTypeFilter] = useState('ALL');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('ALL');
  const [creatorFilter, setCreatorFilter] = useState('ALL');
  const [cashAccountFilter, setCashAccountFilter] = useState('ALL');
  const [groupBy, setGroupBy] = useState<MoneyOutGroupByKey[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<ColumnId[]>(DEFAULT_VISIBLE_COLUMNS);
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
  const [isTimeMenuOpen, setIsTimeMenuOpen] = useState(false);
  const [isQuickFilterOpen, setIsQuickFilterOpen] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [logAudienceFilter, setLogAudienceFilter] = useState<LogAudienceFilter>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [modalAction, setModalAction] = useState<MoneyOutModalAction>('VIEW');
  const [selectedAttachment, setSelectedAttachment] = useState<File | null>(null);
  const [formData, setFormData] = useState<TransactionFormState>(() => getEmptyFormState('TC0001'));

  const loadData = () => {
    const currentTransactions = getActualTransactions();
    const sourceList = getTransactions();
    const approvedSourceTransactions = sourceList.filter((item) => item.status === 'DA_DUYET');
    const actualByRelatedId = new Map(
      currentTransactions
        .filter((item) => item.relatedId)
        .map((item, index) => {
          const normalizedItem = normalizeActualTransaction(item, index);
          return [normalizedItem.relatedId as string, normalizedItem] as const;
        })
    );
    const syncedTransactions = approvedSourceTransactions.map((source, index) =>
      normalizeActualTransaction(buildActualTransactionFromSource(source, actualByRelatedId.get(source.id)), index)
    );

    if (JSON.stringify(currentTransactions) !== JSON.stringify(syncedTransactions)) {
      saveActualTransactions(syncedTransactions);
    }

    setTransactions(syncedTransactions);
    setSourceTransactions(sourceList);
    setQuotations(getQuotations());
    setContracts(getContracts());
    setLogs(getActualTransactionLogs());

    const salesMap = new Map<string, string>();
    getSalesTeams().forEach((team) => {
      team.members.forEach((member) => {
        if (member.userId && member.name && !salesMap.has(member.userId)) {
          salesMap.set(member.userId, member.name);
        }
      });
    });
    salesMap.set('accountant', 'Kế toán');
    setCreatorDirectory(salesMap);
  };

  useEffect(() => {
    loadData();

    window.addEventListener('educrm:actual-transactions-changed', loadData as EventListener);
    window.addEventListener('educrm:actual-transaction-logs-changed', loadData as EventListener);
    window.addEventListener('educrm:transactions-changed', loadData as EventListener);
    window.addEventListener('educrm:quotations-changed', loadData as EventListener);
    window.addEventListener('educrm:contracts-changed', loadData as EventListener);
    window.addEventListener('educrm:sales-teams-changed', loadData as EventListener);
    return () => {
      window.removeEventListener('educrm:actual-transactions-changed', loadData as EventListener);
      window.removeEventListener('educrm:actual-transaction-logs-changed', loadData as EventListener);
      window.removeEventListener('educrm:transactions-changed', loadData as EventListener);
      window.removeEventListener('educrm:quotations-changed', loadData as EventListener);
      window.removeEventListener('educrm:contracts-changed', loadData as EventListener);
      window.removeEventListener('educrm:sales-teams-changed', loadData as EventListener);
    };
  }, []);

  useEffect(() => {
    const navigationState = location.state as FinanceMoneyOutLocationState | null;
    const prefillSearch = navigationState?.prefillSearch?.trim();
    if (!prefillSearch) return;

    const consumeKey = `${location.key}:${navigationState?.relatedSourceTransactionId || prefillSearch}`;
    if (navigationPrefillKeyRef.current === consumeKey) return;

    navigationPrefillKeyRef.current = consumeKey;
    setSearchTerm(prefillSearch);
    setTypeFilter('ALL');
    setTimeRangeType('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setDraftTimeRangeType('all');
    setDraftCustomStartDate('');
    setDraftCustomEndDate('');
    setApprovalFilter('ALL');
    setBusinessGroupFilter('ALL');
    setBusinessTypeFilter('ALL');
    setPaymentMethodFilter('ALL');
    setCreatorFilter('ALL');
    setCashAccountFilter('ALL');
    setGroupBy([]);
  }, [location.key, location.state]);

  useEffect(() => {
    if (!isColumnMenuOpen && !isAdvancedFilterOpen && !isTimeMenuOpen && !isQuickFilterOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!columnMenuRef.current?.contains(event.target as Node)) {
        setIsColumnMenuOpen(false);
      }

      if (!filterMenuRef.current?.contains(event.target as Node)) {
        setIsAdvancedFilterOpen(false);
      }

      if (!timeMenuRef.current?.contains(event.target as Node)) {
        setIsTimeMenuOpen(false);
      }

      if (!quickFilterMenuRef.current?.contains(event.target as Node)) {
        setIsQuickFilterOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isAdvancedFilterOpen, isColumnMenuOpen, isQuickFilterOpen, isTimeMenuOpen]);

  const logsByTransaction = useMemo(() => {
    return logs.reduce<Record<string, IActualTransactionLog[]>>((acc, item) => {
      if (!acc[item.transactionId]) acc[item.transactionId] = [];
      acc[item.transactionId].push(item);
      return acc;
    }, {});
  }, [logs]);

  const processedResultByTransactionId = useMemo(() => {
    const map = new Map<string, ProcessResult>();

    transactions.forEach((item) => {
      if (item.processResult === 'DA_THU' || item.processResult === 'DA_CHI') {
        map.set(item.id, item.processResult);
      }
    });

    [...logs]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .forEach((item) => {
        if (map.has(item.transactionId)) return;
        const result = getProcessResultFromLog(item);
        if (result) map.set(item.transactionId, result);
      });

    return map;
  }, [logs, transactions]);

  const sourceTransactionMap = useMemo(() => new Map(sourceTransactions.map((item) => [item.id, item])), [sourceTransactions]);
  const quotationMap = useMemo(() => new Map(quotations.map((item) => [item.id, item])), [quotations]);
  const contractByQuotationId = useMemo(
    () => new Map(contracts.filter((item) => item.quotationId).map((item) => [item.quotationId as string, item])),
    [contracts]
  );
  const sourceIndexMap = useMemo(
    () => new Map(sourceTransactions.map((item, index) => [item.id, index])),
    [sourceTransactions]
  );

  const rows = useMemo<MoneyOutRow[]>(() => {
    return transactions.map((actual) => {
      const source = actual.relatedId ? sourceTransactionMap.get(actual.relatedId) : undefined;
      const quotation = source?.quotationId ? quotationMap.get(source.quotationId) : undefined;
      const linkedContract = quotation?.id ? contractByQuotationId.get(quotation.id) : undefined;
      const businessGroup = inferBusinessGroup(source, actual);
      const requiresCeoApproval = source ? businessGroup !== 'THU' || source.amount >= 100_000_000 : businessGroup !== 'THU';
      const processedResult = processedResultByTransactionId.get(actual.id) || null;
      const actualTransactionProcessed = processedResult !== null;
      const approvalStage = getApprovalStage(source, quotation, actualTransactionProcessed);
      const processedStatus = getProcessedStatusMeta(processedResult);
      const sourceIndex = source?.id ? sourceIndexMap.get(source.id) : undefined;
      const contractDisplay = getContractDisplay(quotation, linkedContract, source, businessGroup);

      return {
        actual,
        source,
        quotation,
        linkedContract,
        approvalTransactionCode: buildApprovalTransactionCode(source, sourceIndex, businessGroup, actual),
        approvalReferenceLabel: getApprovalReferenceLabel(source, actual),
        businessGroup,
        businessGroupLabel: getBusinessGroupLabel(businessGroup),
        businessType: inferBusinessType(source, businessGroup, actual),
        relatedEntity:
          source?.relatedEntityLabel || source?.studentName || quotation?.customerName || actual.title || actual.category || '-',
        recipientPayerName:
          source?.recipientPayerName ||
          actual.recipientPayerName ||
          source?.relatedEntityLabel ||
          source?.studentName ||
          quotation?.customerName ||
          '-',
        contractCode: contractDisplay.code,
        contractReferenceLabel: contractDisplay.reference,
        paymentMethodLabel: getPaymentMethodLabel(source, actual),
        proofValue: source?.bankRefCode || source?.proofFiles?.[0]?.name || actual.proof || actual.attachmentName || '-',
        paymentDateLabel: source ? dateTimeFormat(source.paidAt || source.createdAt) : dateLabelFormat(actual.date),
        creatorLabel: creatorDirectory.get(source?.createdBy || actual.createdBy) || source?.createdBy || actual.createdBy || 'System',
        createdAtLabel: source ? dateTimeFormat(source.createdAt) : dateTimeFormat(actual.createdAt),
        approvalStage,
        requiresCeoApproval,
        approvalNote: source?.note || actual.title || '-',
        processedResult,
        isProcessed: actualTransactionProcessed,
        processedStatusLabel: processedStatus.label,
        processedStatusTone: processedStatus.tone,
        accountingTypeLabel: TYPE_META[actual.type].label
      };
    });
  }, [contractByQuotationId, creatorDirectory, processedResultByTransactionId, quotationMap, sourceIndexMap, sourceTransactionMap, transactions]);

  const businessTypeOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => row.businessType).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'vi')),
    [rows]
  );
  const paymentMethodOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => row.paymentMethodLabel).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'vi')),
    [rows]
  );
  const businessGroupOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => row.businessGroup))).sort((a, b) => getBusinessGroupLabel(a).localeCompare(getBusinessGroupLabel(b), 'vi')),
    [rows]
  );
  const creatorOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => row.creatorLabel).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'vi')),
    [rows]
  );
  const cashAccountOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => row.actual.cashAccount).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, 'vi')),
    [rows]
  );

  const filteredRows = useMemo(() => {
    const timeBounds = getTimeRangeBounds(timeRangeType, customStartDate, customEndDate);

    return rows
      .filter((row) => {
        if (typeFilter === 'IN' && row.actual.type !== 'IN') return false;
        if (typeFilter === 'OUT' && row.actual.type !== 'OUT') return false;
        if (typeFilter === 'WITH_CONTRACT' && getContractFilterState(row) !== 'WITH_CONTRACT') return false;
        if (typeFilter === 'NO_CONTRACT' && getContractFilterState(row) !== 'NO_CONTRACT') return false;
        if (typeFilter === 'INTERNAL' && getContractFilterState(row) !== 'INTERNAL') return false;
        if (approvalFilter !== 'ALL' && row.approvalStage !== approvalFilter) return false;
        if (businessGroupFilter !== 'ALL' && row.businessGroup !== businessGroupFilter) return false;
        if (businessTypeFilter !== 'ALL' && row.businessType !== businessTypeFilter) return false;
        if (paymentMethodFilter !== 'ALL' && row.paymentMethodLabel !== paymentMethodFilter) return false;
        if (creatorFilter !== 'ALL' && row.creatorLabel !== creatorFilter) return false;
        if (cashAccountFilter !== 'ALL' && (row.actual.cashAccount || '') !== cashAccountFilter) return false;

        if (timeBounds) {
          const rowDate = parseDateOnly(row.actual.date);
          if (!rowDate) return false;
          if (rowDate < timeBounds.start || rowDate > timeBounds.end) return false;
        }

        const query = searchTerm.trim().toLowerCase();
        if (!query) return true;

        return [
          row.approvalTransactionCode,
          row.approvalReferenceLabel,
          row.businessGroupLabel,
          row.businessType,
          row.relatedEntity,
          row.recipientPayerName,
          row.contractCode,
          row.contractReferenceLabel,
          row.paymentMethodLabel,
          row.proofValue,
          row.paymentDateLabel,
          row.creatorLabel,
          row.createdAtLabel,
          getApprovalStageLabel(row.approvalStage, row.businessGroup, row.processedResult),
          row.approvalNote,
          row.actual.transactionCode,
          row.actual.recipientPayerName,
          row.source?.recipientPayerName,
          row.accountingTypeLabel,
          row.actual.cashAccount,
          row.actual.voucherNumber,
          row.processedStatusLabel,
          row.actual.date,
          row.actual.attachmentName
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(query);
      })
      .sort((a, b) => new Date(b.actual.date).getTime() - new Date(a.actual.date).getTime());
  }, [approvalFilter, businessGroupFilter, businessTypeFilter, cashAccountFilter, creatorFilter, customEndDate, customStartDate, paymentMethodFilter, rows, searchTerm, timeRangeType, typeFilter]);

  const typeLabelMap: Record<QuickFilter, string> = {
    ALL: 'Tất cả',
    IN: TYPE_META.IN.label,
    OUT: TYPE_META.OUT.label,
    WITH_CONTRACT: 'Có hợp đồng',
    NO_CONTRACT: 'Chưa gắn hợp đồng',
    INTERNAL: 'Ngoài hợp đồng'
  };

  const getGroupByValue = (row: MoneyOutRow, key: MoneyOutGroupByKey) => {
    switch (key) {
      case 'approvalStage':
        return getApprovalStageLabel(row.approvalStage, row.businessGroup, row.processedResult);
      case 'businessGroup':
        return row.businessGroupLabel;
      case 'businessType':
        return row.businessType;
      case 'paymentMethod':
        return row.paymentMethodLabel;
      case 'cashAccount':
        return row.actual.cashAccount || '-';
      case 'creator':
        return row.creatorLabel;
      default:
        return '-';
    }
  };

  const groupedRows = useMemo(() => {
    if (groupBy.length === 0) return [];

    const groups = new Map<string, MoneyOutRow[]>();

    filteredRows.forEach((row) => {
      const label = groupBy
        .map((groupKey) => {
          const groupLabel = GROUP_BY_OPTIONS.find((option) => option.key === groupKey)?.label || groupKey;
          return `${groupLabel}: ${getGroupByValue(row, groupKey)}`;
        })
        .join(' • ');

      groups.set(label, [...(groups.get(label) || []), row]);
    });

    return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
  }, [filteredRows, groupBy]);

  const activeSearchChips = useMemo<PinnedSearchChip[]>(() => {
    const chips: PinnedSearchChip[] = [];

    if (typeFilter !== 'ALL') {
      chips.push({ key: 'type', label: `Loại: ${typeLabelMap[typeFilter]}` });
    }

    if (timeRangeType !== 'all') {
      chips.push({ key: 'time', label: `Thời gian: ${getTimeRangeLabel(timeRangeType, customStartDate, customEndDate)}` });
    }
    if (approvalFilter !== 'ALL') chips.push({ key: 'approval', label: `Trạng thái: ${APPROVAL_FILTER_LABEL_MAP[approvalFilter]}` });
    if (businessGroupFilter !== 'ALL') chips.push({ key: 'businessGroup', label: `Nhóm NV: ${getBusinessGroupLabel(businessGroupFilter)}` });
    if (businessTypeFilter !== 'ALL') chips.push({ key: 'businessType', label: `Nghiệp vụ: ${businessTypeFilter}` });
    if (paymentMethodFilter !== 'ALL') chips.push({ key: 'paymentMethod', label: `Thanh toán: ${paymentMethodFilter}` });
    if (creatorFilter !== 'ALL') chips.push({ key: 'creator', label: `Người tạo: ${creatorFilter}` });
    if (cashAccountFilter !== 'ALL') chips.push({ key: 'cashAccount', label: `Tài khoản: ${cashAccountFilter}` });
    if (groupBy.length > 0) {
      chips.push({
        key: 'groupBy',
        label: `Nhóm theo: ${groupBy.map((key) => GROUP_BY_OPTIONS.find((option) => option.key === key)?.label || key).join(', ')}`
      });
    }
    return chips;
  }, [approvalFilter, businessGroupFilter, businessTypeFilter, cashAccountFilter, creatorFilter, customEndDate, customStartDate, groupBy, paymentMethodFilter, timeRangeType, typeFilter]);

  const visibleColumnOptions = useMemo(
    () => COLUMN_OPTIONS.filter((item) => visibleColumns.includes(item.id)),
    [visibleColumns]
  );
  const activeAdvancedFilterCount = useMemo(
    () =>
      [approvalFilter !== 'ALL', businessGroupFilter !== 'ALL', businessTypeFilter !== 'ALL', paymentMethodFilter !== 'ALL', creatorFilter !== 'ALL', cashAccountFilter !== 'ALL', groupBy.length > 0].filter(Boolean).length,
    [approvalFilter, businessGroupFilter, businessTypeFilter, cashAccountFilter, creatorFilter, groupBy.length, paymentMethodFilter]
  );
  const quickFilterOptions = useMemo(
    () => [
      { value: 'ALL' as QuickFilter, label: 'Tất cả' },
      { value: 'IN' as QuickFilter, label: 'Thu' },
      { value: 'OUT' as QuickFilter, label: 'Chi' },
      { value: 'WITH_CONTRACT' as QuickFilter, label: 'Có hợp đồng' },
      { value: 'NO_CONTRACT' as QuickFilter, label: 'Chưa gắn hợp đồng' },
      { value: 'INTERNAL' as QuickFilter, label: 'Ngoài hợp đồng' }
    ],
    []
  );

  const removeSearchChip = (chipKey: string) => {
    if (chipKey === 'type') {
      setTypeFilter('ALL');
      return;
    }
    if (chipKey === 'time') {
      setTimeRangeType('all');
      return;
    }
    if (chipKey === 'approval') {
      setApprovalFilter('ALL');
      return;
    }
    if (chipKey === 'businessGroup') {
      setBusinessGroupFilter('ALL');
      return;
    }
    if (chipKey === 'businessType') {
      setBusinessTypeFilter('ALL');
      return;
    }
    if (chipKey === 'paymentMethod') {
      setPaymentMethodFilter('ALL');
      return;
    }
    if (chipKey === 'creator') {
      setCreatorFilter('ALL');
      return;
    }
    if (chipKey === 'cashAccount') {
      setCashAccountFilter('ALL');
      return;
    }
    if (chipKey === 'groupBy') {
      setGroupBy([]);
      return;
    }
  };

  const clearAllSearchFilters = () => {
    setSearchTerm('');
    setTypeFilter('ALL');
    setTimeRangeType('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setDraftTimeRangeType('all');
    setDraftCustomStartDate('');
    setDraftCustomEndDate('');
    setApprovalFilter('ALL');
    setBusinessGroupFilter('ALL');
    setBusinessTypeFilter('ALL');
    setPaymentMethodFilter('ALL');
    setCreatorFilter('ALL');
    setCashAccountFilter('ALL');
    setGroupBy([]);
  };

  const toggleGroupBy = (groupKey: MoneyOutGroupByKey) => {
    setGroupBy((current) => (current.includes(groupKey) ? current.filter((item) => item !== groupKey) : [...current, groupKey]));
  };

  const resolveDraftDateRange = (rangeType: TimeRangeType, startDate = '', endDate = '') => {
    if (rangeType === 'all') {
      return { startDate: '', endDate: '' };
    }

    if (rangeType === 'custom') {
      return { startDate, endDate };
    }

    const bounds = getTimeRangeBounds(rangeType, startDate, endDate);
    return {
      startDate: bounds?.start ? toDateInputValue(bounds.start) : '',
      endDate: bounds?.end ? toDateInputValue(bounds.end) : ''
    };
  };

  const openTimeMenu = () => {
    setIsAdvancedFilterOpen(false);
    setIsColumnMenuOpen(false);
    setIsQuickFilterOpen(false);
    setDraftTimeRangeType(timeRangeType);
    const nextDraftRange = resolveDraftDateRange(timeRangeType, customStartDate, customEndDate);
    setDraftCustomStartDate(nextDraftRange.startDate);
    setDraftCustomEndDate(nextDraftRange.endDate);
    setIsTimeMenuOpen((current) => !current);
  };

  const applyTimeFilter = () => {
    setTimeRangeType(draftTimeRangeType);
    if (draftTimeRangeType === 'custom') {
      setCustomStartDate(draftCustomStartDate);
      setCustomEndDate(draftCustomEndDate);
    } else {
      setCustomStartDate('');
      setCustomEndDate('');
    }
    setIsTimeMenuOpen(false);
  };

  const resetDraftTimeFilter = () => {
    setDraftTimeRangeType('all');
    setDraftCustomStartDate('');
    setDraftCustomEndDate('');
  };

  const handleSelectDraftTimeRange = (rangeType: TimeRangeType) => {
    setDraftTimeRangeType(rangeType);
    const baseStartDate = rangeType === 'custom' ? draftCustomStartDate || customStartDate : customStartDate;
    const baseEndDate = rangeType === 'custom' ? draftCustomEndDate || customEndDate : customEndDate;
    const nextDraftRange = resolveDraftDateRange(rangeType, baseStartDate, baseEndDate);
    setDraftCustomStartDate(nextDraftRange.startDate);
    setDraftCustomEndDate(nextDraftRange.endDate);
  };

  const toggleColumn = (columnId: ColumnId) => {
    setVisibleColumns((current) => {
      if (current.includes(columnId)) {
        if (current.length === 1) return current;
        return current.filter((item) => item !== columnId);
      }

      return COLUMN_OPTIONS.filter((item) => item.id === columnId || current.includes(item.id)).map((item) => item.id);
    });
  };

  const createLog = (transactionId: string, action: IActualTransactionLog['action'], message: string) => {
    addActualTransactionLog({
      id: `TXN-LOG-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      transactionId,
      action,
      message,
      createdAt: new Date().toISOString(),
      createdBy: user?.name || user?.id || 'Kế toán'
    });
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTransactionId(null);
    setSelectedAttachment(null);
    setModalAction('VIEW');
  };

  const openTransactionModal = (item: IActualTransaction, action: MoneyOutModalAction) => {
    setEditingTransactionId(item.id);
    setModalAction(action);
    setSelectedAttachment(null);
    setFormData({
      transactionCode: item.transactionCode || buildFallbackTransactionCode(item, 0),
      type: item.type,
      cashAccount: item.cashAccount || inferCashAccount(item),
      attachmentName: item.attachmentName || '',
      attachmentUrl: item.attachmentUrl || '',
      date: item.date,
      recipientPayerName: item.recipientPayerName || item.title || ''
    });
    setIsModalOpen(true);
  };

  const handleProcessSelection = (item: IActualTransaction, result: ProcessResult) => {
    const expectedResult = getProcessResultForTransactionType(item.type);
    if (result !== expectedResult) {
      alert(`Phiếu ${item.type === 'OUT' ? 'chi' : 'thu'} chỉ được xác nhận "${PROCESS_RESULT_META[expectedResult].label}".`);
      return;
    }

    if (!item.attachmentName?.trim() && !item.proof?.trim()) {
      alert('Vui lòng attach chứng từ trước khi xác nhận thu/chi.');
      return;
    }

    const updatedItem: IActualTransaction = {
      ...item,
      status: result === 'DA_CHI' ? 'PAID' : 'RECEIVED',
      processResult: result,
      proof: item.proof || item.attachmentName || undefined
    };

    if (!updateActualTransaction(updatedItem)) {
      alert('Không thể cập nhật trạng thái thu chi.');
      return;
    }

    createLog(
      item.id,
      'UPDATE_STATUS',
      `${PROCESS_RESULT_META[result].label} cho phiếu ${item.transactionCode || buildFallbackTransactionCode(item, 0)}`
    );
  };

  const handleAttachmentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] || null;
    setSelectedAttachment(nextFile);
    setFormData((prev) => ({
      ...prev,
      attachmentName: nextFile?.name || prev.attachmentName
    }));
  };

  const handleSubmit = async () => {
    if (!editingTransactionId) {
      alert('Thu chi chỉ cho phép cập nhật phiếu đã chuyển từ Duyệt giao dịch.');
      return;
    }

    if (!formData.transactionCode.trim()) {
      alert('Không tìm thấy Mã thu chi để cập nhật.');
      return;
    }

    const existing = transactions.find((item) => item.id === editingTransactionId);
    if (!existing) {
      alert('Không tìm thấy phiếu thu chi để cập nhật.');
      return;
    }

    let attachmentName = formData.attachmentName.trim();
    let attachmentUrl = formData.attachmentUrl.trim();

    if (selectedAttachment) {
      attachmentName = selectedAttachment.name;
      attachmentUrl = await readFileAsDataUrl(selectedAttachment);
    }

    if (!attachmentName || !attachmentUrl) {
      alert('Vui lòng attach chứng từ trước khi lưu phiếu thu chi.');
      return;
    }

    const defaultLabel = formData.type === 'IN' ? 'Thu khác' : 'Chi khác';
    const item: IActualTransaction = {
      id: existing.id,
      transactionCode: formData.transactionCode.trim(),
      type: formData.type,
      category: existing.category || defaultLabel,
      title: existing.title || defaultLabel,
      recipientPayerName: formData.recipientPayerName.trim() || existing.recipientPayerName || undefined,
      amount: existing.amount || 0,
      department: existing.department || 'Kế toán',
      cashAccount: formData.cashAccount,
      voucherNumber: existing.voucherNumber,
      date: formData.date,
      status: existing.processResult === 'DA_CHI' ? 'PAID' : existing.processResult === 'DA_THU' ? 'RECEIVED' : existing.status,
      processResult: existing.processResult,
      proof: attachmentName || existing.proof || undefined,
      attachmentName: attachmentName || undefined,
      attachmentUrl: attachmentUrl || undefined,
      relatedId: existing.relatedId,
      createdBy: existing.createdBy || user?.name || user?.id || 'Kế toán',
      createdAt: existing.createdAt || new Date().toISOString()
    };

    const ok = updateActualTransaction(item);
    if (!ok) return;

    if (modalAction === 'PROCESS') {
      createLog(
        item.id,
        'UPDATE_STATUS',
        item.type === 'IN' ? `Đã nhận được tiền cho phiếu ${item.transactionCode}` : `Đã đưa tiền cho phiếu ${item.transactionCode}`
      );
    } else {
      createLog(item.id, 'UPDATE', `Cập nhật phiếu ${item.transactionCode}`);
    }

    closeModal();
  };

  const editingRow = useMemo(
    () => rows.find((row) => row.actual.id === editingTransactionId),
    [editingTransactionId, rows]
  );
  const hasAttachment = Boolean(selectedAttachment || (formData.attachmentName.trim() && formData.attachmentUrl.trim()));
  const canSave =
    Boolean(editingTransactionId) &&
    Boolean(formData.transactionCode.trim()) &&
    hasAttachment;
  const isViewMode = modalAction === 'VIEW';
  const modalTitle =
    modalAction === 'ATTACH' ? 'Attach chứng từ phiếu thu chi' : modalAction === 'PROCESS' ? 'Xử lý phiếu thu chi' : 'Chi tiết phiếu thu chi';
  const modalDescription =
    modalAction === 'ATTACH'
      ? 'Mở chi tiết phiếu để cập nhật file chứng từ đính kèm trước khi hoàn tất.'
      : modalAction === 'PROCESS'
        ? `Xác nhận ${formData.type === 'IN' ? 'đã nhận được tiền' : 'đã đưa tiền'} cho phiếu này. Chỉ được lưu khi đã có chứng từ đính kèm.`
        : 'Màn hình xem chi tiết hiển thị toàn bộ thông tin của phiếu thu chi, giống thao tác xem chi tiết.';
  const saveButtonLabel =
    modalAction === 'ATTACH' ? 'Lưu chứng từ' : formData.type === 'IN' ? 'Xác nhận đã thu' : 'Xác nhận đã chi';
  const currentProcessedStatus = getProcessedStatusMeta(editingRow?.processedResult || null);
  const currentAttachmentName = selectedAttachment?.name || formData.attachmentName;
  const currentAttachmentUrl = selectedAttachment ? undefined : formData.attachmentUrl;
  const currentWorkflowStep = !editingRow
    ? 1
    : editingRow.approvalStage === 'CHO_DUYET'
      ? 1
      : editingRow.approvalStage === 'KE_TOAN_XAC_NHAN'
        ? 2
        : editingRow.approvalStage === 'DA_DUYET'
          ? 3
          : 4;
  const handlePrintCurrentTransaction = () => {
    window.print();
  };

  const handleExportCurrentTransaction = () => {
    if (!editingRow) return;

    const exportPayload = {
      approvalTransactionCode: editingRow.approvalTransactionCode,
      approvalReferenceLabel: editingRow.approvalReferenceLabel,
      businessGroup: editingRow.businessGroupLabel,
      businessType: editingRow.businessType,
      relatedEntity: editingRow.relatedEntity,
      contractCode: editingRow.contractCode,
      contractReferenceLabel: editingRow.contractReferenceLabel,
      amount: editingRow.actual.amount,
      paymentMethod: editingRow.paymentMethodLabel,
      proof: editingRow.proofValue,
      paymentDate: editingRow.paymentDateLabel,
      recipientPayerName: formData.recipientPayerName.trim() || editingRow.actual.recipientPayerName || editingRow.actual.title || '',
      creator: editingRow.creatorLabel,
      createdAt: editingRow.createdAtLabel,
      approvalStage: getApprovalStageLabel(editingRow.approvalStage, editingRow.businessGroup, editingRow.processedResult),
      transactionCode: formData.transactionCode.trim() || editingRow.actual.transactionCode || '',
      accountingType: TYPE_META[formData.type].label,
      cashAccount: formData.cashAccount,
      processedStatus: currentProcessedStatus.label,
      actualDate: dateLabelFormat(formData.date),
      attachmentName: currentAttachmentName || '',
      attachmentUrl: currentAttachmentUrl || ''
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json;charset=utf-8' });
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = `${editingRow.approvalTransactionCode || editingRow.actual.transactionCode || 'phieu-thu-chi'}.json`;
    anchor.click();
    URL.revokeObjectURL(downloadUrl);
  };
  const detailPresentation = useMemo(() => {
    if (!editingRow) return null;
    const currentProcessedTone =
      editingRow.processedResult === 'DA_CHI' ? ('orange' as const) : editingRow.processedResult === 'DA_THU' ? ('green' as const) : ('slate' as const);

    return {
      stats: [
        { label: 'Số tiền', value: moneyFormat(editingRow.actual.amount), tone: 'blue' as const },
        {
          label: 'Trạng thái duyệt',
          value: getApprovalStageLabel(editingRow.approvalStage, editingRow.businessGroup, editingRow.processedResult),
          tone: editingRow.approvalStage === 'TU_CHOI' ? ('orange' as const) : ('slate' as const)
        },
        { label: 'Trạng thái', value: currentProcessedStatus.label, tone: currentProcessedTone }
      ],
      workflowStep: currentWorkflowStep,
      leftColumn: [
        {
          label: 'Mã giao dịch',
          value: (
            <div>
              <div>{editingRow.approvalTransactionCode}</div>
              <div className="text-[11px] font-medium text-slate-400">{editingRow.approvalReferenceLabel}</div>
            </div>
          )
        },
        { label: 'Nhóm nghiệp vụ', value: editingRow.businessGroupLabel },
        { label: 'Loại nghiệp vụ', value: editingRow.businessType },
        { label: 'Đối tượng', value: editingRow.relatedEntity },
        {
          label: 'Hợp đồng',
          value: (
            <div>
              <div>{editingRow.contractCode}</div>
              <div className="text-[11px] font-medium text-slate-400">{editingRow.contractReferenceLabel}</div>
            </div>
          )
        },
        { label: 'Số tiền', value: moneyFormat(editingRow.actual.amount) },
        { label: 'Thanh toán', value: editingRow.paymentMethodLabel },
        { label: 'Chứng từ', value: editingRow.proofValue },
        { label: 'Ngày thanh toán', value: editingRow.paymentDateLabel },
        { label: 'Người nhận / nộp', value: formData.recipientPayerName.trim() || editingRow.actual.recipientPayerName || editingRow.actual.title || '-' }
      ],
      rightColumn: [
        { label: 'Người tạo', value: editingRow.creatorLabel },
        { label: 'Ngày tạo', value: editingRow.createdAtLabel },
        {
          label: 'Trạng thái duyệt',
          value: (
            <ApprovalStageBadge
              stage={editingRow.approvalStage}
              businessGroup={editingRow.businessGroup}
              processedResult={editingRow.processedResult}
            />
          )
        },
        { label: 'Mã thu chi', value: formData.transactionCode.trim() || editingRow.actual.transactionCode || '-' },
        { label: 'Phân loại', value: TYPE_META[formData.type].label },
        { label: 'Hình thức thu / chi', value: formData.cashAccount || '-' },
        {
          label: 'Trạng thái xử lý',
          value: (
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${currentProcessedStatus.tone}`}>
              {currentProcessedStatus.label}
            </span>
          )
        },
        { label: 'Ngày thu/chi', value: dateLabelFormat(formData.date) },
        { label: 'Attach chứng từ', value: <AttachmentPreview name={currentAttachmentName} url={currentAttachmentUrl} /> }
      ]
    };
  }, [currentAttachmentName, currentAttachmentUrl, currentProcessedStatus, currentWorkflowStep, editingRow, formData]);

  const renderCell = (row: MoneyOutRow, columnId: ColumnId) => {
    switch (columnId) {
      case 'approvalTransactionCode':
        return (
          <td className="px-4 py-4 align-top">
            <div className="font-mono text-xs font-bold text-blue-600 break-all">{row.approvalTransactionCode}</div>
            <div className="text-xs text-slate-400">{row.approvalReferenceLabel}</div>
          </td>
        );
      case 'businessGroup':
        return (
          <td className="px-4 py-4">
            <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
              {row.businessGroupLabel}
            </span>
          </td>
        );
      case 'businessType':
        return <td className="px-4 py-4 text-sm font-medium text-slate-800">{row.businessType}</td>;
      case 'relatedEntity':
        return (
          <td className="px-4 py-4 text-sm text-slate-700 align-top">
            <button
              type="button"
              onClick={() => openTransactionModal(row.actual, 'VIEW')}
              className="max-w-[220px] truncate text-left font-medium text-slate-800 hover:text-blue-600 hover:underline"
              title={`Xem chi tiết ${row.relatedEntity}`}
            >
              {row.relatedEntity}
            </button>
          </td>
        );
      case 'recipientPayerName':
        return (
          <td className="px-4 py-4 text-sm text-slate-700 align-top">
            <div className="max-w-[220px] truncate font-medium text-slate-800" title={row.recipientPayerName}>
              {row.recipientPayerName}
            </div>
          </td>
        );
      case 'contractCode':
        return (
          <td className="px-4 py-4 align-top">
            <div className="max-w-[180px] truncate text-sm font-medium text-slate-700" title={row.contractCode}>
              {row.contractCode}
            </div>
            <div className="max-w-[180px] truncate text-xs text-slate-400" title={row.contractReferenceLabel}>
              {row.contractReferenceLabel}
            </div>
          </td>
        );
      case 'amount':
        return <td className="px-4 py-4 text-sm font-bold text-slate-900 whitespace-nowrap text-right">{moneyFormat(row.actual.amount)}</td>;
      case 'paymentMethod':
        return <td className="px-4 py-4 text-sm text-slate-700 whitespace-nowrap">{row.paymentMethodLabel}</td>;
      case 'proof':
        return (
          <td className="px-4 py-4 text-sm text-slate-700 align-top">
            <div className="max-w-[200px] truncate" title={row.proofValue}>
              {row.proofValue}
            </div>
          </td>
        );
      case 'paymentDate':
        return <td className="px-4 py-4 text-sm text-slate-700 whitespace-nowrap">{row.paymentDateLabel}</td>;
      case 'creator':
        return <td className="px-4 py-4 text-sm text-slate-700 whitespace-nowrap">{row.creatorLabel}</td>;
      case 'createdAt':
        return <td className="px-4 py-4 text-sm text-slate-700 whitespace-nowrap">{row.createdAtLabel}</td>;
      case 'approvalStage':
        return (
          <td className="px-4 py-4">
            <ApprovalStageBadge stage={row.approvalStage} businessGroup={row.businessGroup} processedResult={row.processedResult} />
          </td>
        );
      case 'approvalNote':
        return <td className="px-4 py-4 text-sm text-slate-700 whitespace-pre-wrap break-words">{row.approvalNote}</td>;
      case 'transactionCode':
        return (
          <td className="px-4 py-4">
            <div className="font-mono text-xs font-bold text-indigo-600">{row.actual.transactionCode}</div>
            <div className="text-xs text-slate-400">{row.actual.id}</div>
          </td>
        );
      case 'accountingType':
        return (
          <td className="px-4 py-4">
            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${TYPE_META[row.actual.type].badge}`}>
              {row.accountingTypeLabel}
            </span>
          </td>
        );
      case 'cashAccount':
        return <td className="px-4 py-4 text-sm text-slate-700 whitespace-nowrap">{row.actual.cashAccount || '-'}</td>;
      case 'voucherNumber':
        return (
          <td className="px-4 py-4 text-sm text-slate-700 align-top">
            <div className="max-w-[160px] truncate" title={row.actual.voucherNumber || '-'}>
              {row.actual.voucherNumber || '-'}
            </div>
          </td>
        );
      case 'processedStatus':
        return (
          <td className="px-4 py-4">
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${row.processedStatusTone}`}>
              {row.processedStatusLabel}
            </span>
          </td>
        );
      case 'actualDate':
        return <td className="px-4 py-4 text-sm text-slate-700 whitespace-nowrap">{dateLabelFormat(row.actual.date)}</td>;
      case 'attachment':
        return (
          <td className="px-4 py-4">
            <AttachmentPreview name={row.actual.attachmentName} url={row.actual.attachmentUrl} />
          </td>
        );
      default:
        return null;
    }
  };

  const renderMoneyOutRow = (row: MoneyOutRow, rowNumber: number) => {
    const itemLogs = (logsByTransaction[row.actual.id] || []).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const filteredItemLogs = filterByLogAudience(itemLogs, logAudienceFilter, getActualTransactionLogAudience);
    const canProcessMoney = row.approvalStage === 'DA_DUYET' && !row.isProcessed;
    const selectedProcessMeta = row.processedResult ? PROCESS_RESULT_META[row.processedResult] : null;
    const availableProcessResult = getProcessResultForTransactionType(row.actual.type);
    const availableProcessMeta = PROCESS_RESULT_META[availableProcessResult];

    return (
      <React.Fragment key={row.actual.id}>
        <tr
          className="cursor-pointer hover:bg-slate-50 transition-colors align-top"
          onClick={() => openTransactionModal(row.actual, 'VIEW')}
          title={`Xem chi tiết ${row.relatedEntity}`}
        >
          <td className="px-4 py-4 text-center font-semibold text-slate-500 align-top">{rowNumber}</td>
          {visibleColumnOptions.map((column) => (
            <React.Fragment key={column.id}>{renderCell(row, column.id)}</React.Fragment>
          ))}
          <td className="w-[220px] min-w-[220px] px-4 py-4 text-right align-top">
            <div className="ml-auto flex max-w-[210px] flex-col items-end gap-2">
              {selectedProcessMeta ? (
                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${selectedProcessMeta.inlineTone}`}>
                  <Check size={12} /> {selectedProcessMeta.label}
                </span>
              ) : canProcessMoney ? (
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    handleProcessSelection(row.actual, availableProcessResult);
                  }}
                  className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${availableProcessMeta.buttonTone}`}
                >
                  <Check size={12} /> {availableProcessMeta.label}
                </button>
              ) : null}
              <div className="flex flex-wrap justify-end gap-x-3 gap-y-2">
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    openTransactionModal(row.actual, 'ATTACH');
                  }}
                  className="text-xs font-semibold text-slate-700 hover:underline inline-flex items-center gap-1"
                >
                  <UploadCloud size={12} /> Attach chứng từ
                </button>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    setExpandedLogId(expandedLogId === row.actual.id ? null : row.actual.id);
                  }}
                  className="text-xs font-semibold text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  <History size={12} /> Log note
                </button>
              </div>
            </div>
          </td>
        </tr>

        {expandedLogId === row.actual.id && (
          <tr className="bg-slate-50">
            <td colSpan={visibleColumns.length + 2} className="px-6 py-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase text-slate-500">Lịch sử log note</p>
                <LogAudienceFilterControl value={logAudienceFilter} onChange={setLogAudienceFilter} />
              </div>
              {filteredItemLogs.length ? (
                <div className="space-y-2">
                  {filteredItemLogs.map((log) => (
                    <div key={log.id} className="text-sm bg-white border border-slate-200 rounded-lg px-3 py-2">
                      <p className="text-slate-800 font-medium">{log.message}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {dateTimeFormat(log.createdAt)} • {log.createdBy}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic">Chưa có log note phù hợp bộ lọc.</p>
              )}
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  };

  return (
    <div className="bg-[#f8fafc] text-[#111418] font-sans">
      <div className="p-6 lg:p-8 max-w-[1880px] mx-auto w-full">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
              <ArrowLeft size={24} className="text-slate-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Thu chi - Danh sách</h1>
              <p className="text-sm text-slate-500">
                Phiếu thu chi được đồng bộ từ `Duyệt giao dịch`. Màn hình này chỉ cập nhật phần kế toán và chứng từ đính kèm.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => undefined}
              disabled
              className="hidden"
            >
              Về Kế toán
            </button>
            <button
              type="button"
              onClick={() => undefined}
              disabled
              className="hidden"
            >
              Giả lập Admin
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-visible">
          <div className="p-4 border-b border-slate-200 flex flex-wrap lg:flex-nowrap items-center gap-2 bg-slate-50">
            <div className="flex-1 min-w-[320px]">
              <PinnedSearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Tìm theo mã giao dịch, mã thu chi, đối tượng, hợp đồng, số chứng từ..."
                chips={activeSearchChips}
                onRemoveChip={removeSearchChip}
                onClearAll={clearAllSearchFilters}
                clearAllAriaLabel="Xóa tất cả bộ lọc thu chi"
                inputClassName="text-sm h-7"
              />
            </div>

            <div className="relative z-20 flex items-center gap-2 flex-wrap md:flex-nowrap shrink-0">
              <div className="relative flex overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="relative" ref={quickFilterMenuRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdvancedFilterOpen(false);
                      setIsColumnMenuOpen(false);
                      setIsTimeMenuOpen(false);
                      setIsQuickFilterOpen((current) => !current);
                    }}
                    className="relative z-10 inline-flex min-w-[150px] cursor-pointer items-center justify-between gap-3 px-4 py-2 text-sm font-semibold text-slate-700"
                  >
                    <span>{typeLabelMap[typeFilter]}</span>
                  </button>

                  {isQuickFilterOpen && (
                    <div className="absolute left-0 top-full z-50 mt-2 w-[220px] rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
                      {quickFilterOptions.map((option) => {
                        const active = option.value === typeFilter;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              setTypeFilter(option.value);
                              setIsQuickFilterOpen(false);
                            }}
                            className={`mb-1 flex w-full items-center rounded-xl px-4 py-3 text-left text-sm font-semibold ${
                              active ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="relative border-l border-slate-200" ref={timeMenuRef}>
                  <button
                    type="button"
                    onClick={openTimeMenu}
                    className="relative z-10 inline-flex min-w-[220px] cursor-pointer items-center gap-3 px-4 py-2 text-sm font-semibold text-slate-700"
                  >
                    <Calendar size={16} className="text-slate-400" />
                    <span>{getTimeRangeLabel(timeRangeType, customStartDate, customEndDate)}</span>
                  </button>

                  {isTimeMenuOpen && (
                    <div className="absolute right-0 top-full z-50 mt-2 flex w-[620px] max-w-[calc(100vw-22rem)] overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-2xl">
                      <div className="w-[188px] border-r border-slate-200 bg-slate-50/60 p-2">
                        {TIME_RANGE_OPTIONS.map((item) => {
                          const active = draftTimeRangeType === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleSelectDraftTimeRange(item.id)}
                              className={`mb-1 flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm font-semibold ${
                                active ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              {item.label}
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex min-h-[292px] flex-1 flex-col justify-between p-5">
                        <div>
                          <div className="text-sm font-bold uppercase tracking-wide text-slate-300">Khoảng thời gian tùy chỉnh</div>
                          <div className="mt-3 grid grid-cols-2 gap-3">
                            <label className="text-sm">
                              <span className="mb-1.5 block font-semibold text-slate-500">Từ ngày</span>
                              <input
                                type="date"
                                value={draftCustomStartDate}
                                onChange={(event) => {
                                  setDraftTimeRangeType('custom');
                                  setDraftCustomStartDate(event.target.value);
                                }}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none"
                              />
                            </label>
                            <label className="text-sm">
                              <span className="mb-1.5 block font-semibold text-slate-500">Đến ngày</span>
                              <input
                                type="date"
                                value={draftCustomEndDate}
                                onChange={(event) => {
                                  setDraftTimeRangeType('custom');
                                  setDraftCustomEndDate(event.target.value);
                                }}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none"
                              />
                            </label>
                          </div>
                        </div>

                        <div className="mt-6 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={resetDraftTimeFilter}
                            className="text-base font-semibold text-slate-400 hover:text-slate-600"
                          >
                            Làm lại
                          </button>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setIsTimeMenuOpen(false)}
                              className="px-4 py-2 text-base font-semibold text-slate-500 hover:text-slate-700"
                            >
                              Hủy
                            </button>
                            <button
                              type="button"
                              onClick={applyTimeFilter}
                              className="rounded-xl bg-blue-600 px-5 py-2.5 text-base font-bold text-white hover:bg-blue-700"
                            >
                              Áp dụng
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="relative" ref={filterMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsTimeMenuOpen(false);
                    setIsColumnMenuOpen(false);
                    setIsAdvancedFilterOpen((current) => !current);
                  }}
                  className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold ${
                    isAdvancedFilterOpen ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  <Filter size={16} />
                  Lọc nâng cao
                  {activeAdvancedFilterCount > 0 && (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${isAdvancedFilterOpen ? 'bg-white/15 text-white' : 'bg-blue-50 text-blue-700'}`}>
                      {activeAdvancedFilterCount}
                    </span>
                  )}
                </button>

                {isAdvancedFilterOpen && (
                  <div className="absolute right-0 top-full z-20 mt-2 w-[760px] max-w-[calc(100vw-22rem)] overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-2xl">
                    <div className="grid grid-cols-[1.05fr_0.95fr]">
                      <div className="border-r border-slate-200 p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-base font-semibold text-slate-800">
                            <Filter size={18} className="text-slate-700" />
                            <span>Bộ lọc</span>
                          </div>
                          {activeAdvancedFilterCount > 0 && (
                            <button
                              type="button"
                              onClick={clearAllSearchFilters}
                              className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50"
                            >
                              Xóa lọc
                            </button>
                          )}
                        </div>

                        <div className="space-y-1">
                          <div className="rounded-lg px-3 py-2 hover:bg-slate-50">
                            <select
                              value={approvalFilter}
                              onChange={(e) => setApprovalFilter(e.target.value as ApprovalFilter)}
                              className="w-full border-0 bg-transparent px-0 py-0 text-sm font-medium leading-5 text-slate-700 outline-none"
                            >
                              {APPROVAL_FILTER_OPTIONS.map((item) => (
                                <option key={item} value={item}>
                                  {APPROVAL_FILTER_LABEL_MAP[item]}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="rounded-lg px-3 py-2 hover:bg-slate-50">
                            <select
                              value={businessGroupFilter}
                              onChange={(e) => setBusinessGroupFilter(e.target.value as BusinessGroupFilter)}
                              className="w-full border-0 bg-transparent px-0 py-0 text-sm font-medium leading-5 text-slate-700 outline-none"
                            >
                              <option value="ALL">Tất cả nhóm nghiệp vụ</option>
                              {businessGroupOptions.map((item) => (
                                <option key={item} value={item}>
                                  {getBusinessGroupLabel(item)}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="rounded-lg px-3 py-2 hover:bg-slate-50">
                            <select
                              value={creatorFilter}
                              onChange={(e) => setCreatorFilter(e.target.value)}
                              className="w-full border-0 bg-transparent px-0 py-0 text-sm font-medium leading-5 text-slate-700 outline-none"
                            >
                              <option value="ALL">Tất cả người tạo</option>
                              {creatorOptions.map((item) => (
                                <option key={item} value={item}>
                                  {item}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="mt-3 border-t border-slate-100 pt-3">
                          <div className="space-y-1">
                            <div className="rounded-lg px-3 py-2 hover:bg-slate-50">
                              <select
                                value={businessTypeFilter}
                                onChange={(e) => setBusinessTypeFilter(e.target.value)}
                                className="w-full border-0 bg-transparent px-0 py-0 text-sm font-medium leading-5 text-slate-700 outline-none"
                              >
                                <option value="ALL">Tất cả loại nghiệp vụ</option>
                                {businessTypeOptions.map((item) => (
                                  <option key={item} value={item}>
                                    {item}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="rounded-lg px-3 py-2 hover:bg-slate-50">
                              <select
                                value={paymentMethodFilter}
                                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                                className="w-full border-0 bg-transparent px-0 py-0 text-sm font-medium leading-5 text-slate-700 outline-none"
                              >
                                <option value="ALL">Tất cả hình thức thanh toán</option>
                                {paymentMethodOptions.map((item) => (
                                  <option key={item} value={item}>
                                    {item}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="rounded-lg px-3 py-2 hover:bg-slate-50">
                              <select
                                value={cashAccountFilter}
                                onChange={(e) => setCashAccountFilter(e.target.value)}
                                className="w-full border-0 bg-transparent px-0 py-0 text-sm font-medium leading-5 text-slate-700 outline-none"
                              >
                                <option value="ALL">Tất cả tài khoản tiền</option>
                                {cashAccountOptions.map((item) => (
                                  <option key={item} value={item}>
                                    {item}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-base font-semibold text-slate-800">
                            <Rows3 size={18} className="text-slate-700" />
                            <span>Nhóm theo</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {groupBy.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setGroupBy([])}
                                className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50"
                              >
                                Bỏ nhóm
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setIsAdvancedFilterOpen(false)}
                              className="rounded-lg px-2 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-50"
                            >
                              Đóng
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1">
                          {GROUP_BY_OPTIONS.map((option) => (
                            <label
                              key={option.key}
                              className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium leading-5 transition-colors ${
                                groupBy.includes(option.key) ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <span>{option.label}</span>
                              <input
                                type="checkbox"
                                checked={groupBy.includes(option.key)}
                                onChange={() => toggleGroupBy(option.key)}
                                className="h-4 w-4 rounded border-slate-300 text-blue-600"
                              />
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="relative" ref={columnMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsAdvancedFilterOpen(false);
                    setIsColumnMenuOpen((current) => !current);
                  }}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${
                    isColumnMenuOpen ? 'bg-slate-800 text-white' : 'border border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  <Columns3 size={16} />
                  Cột
                </button>

                {isColumnMenuOpen && (
                  <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                    <div className="border-b border-slate-100 px-2 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      Hiển thị cột
                    </div>
                    <div className="max-h-80 overflow-y-auto py-1">
                      {COLUMN_OPTIONS.map((column) => {
                        const active = visibleColumns.includes(column.id);

                        return (
                          <button
                            key={column.id}
                            type="button"
                            onClick={() => toggleColumn(column.id)}
                            className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm hover:bg-slate-50"
                          >
                            <span className={active ? 'font-medium text-slate-900' : 'text-slate-500'}>{column.label}</span>
                            <span
                              className={`flex h-4 w-4 items-center justify-center rounded border ${
                                active ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-transparent'
                              }`}
                            >
                              <Check size={11} strokeWidth={3} />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

          <div className="overflow-x-hidden">
            <table className="w-full table-fixed text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold">
                <tr>
                  <th className="w-16 px-4 py-4 text-center">STT</th>
                  {visibleColumnOptions.map((column) => (
                    <th
                      key={column.id}
                      className={`px-4 py-4 whitespace-normal ${column.align === 'right' ? 'text-right' : ''}`}
                    >
                      {column.label}
                    </th>
                  ))}
                  <th className="w-[170px] min-w-[170px] px-4 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.length ? (
                  groupBy.length === 0 ? (
                    filteredRows.map((row, index) => renderMoneyOutRow(row, index + 1))
                  ) : (
                    (() => {
                      let rowNumber = 0;
                      return groupedRows.map((group) => (
                      <React.Fragment key={group.label}>
                        <tr className="bg-slate-50/80">
                          <td colSpan={visibleColumns.length + 2} className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                            {group.label}
                            <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] text-slate-700">{group.items.length}</span>
                          </td>
                        </tr>
                        {group.items.map((row) => renderMoneyOutRow(row, ++rowNumber))}
                      </React.Fragment>
                    ));
                    })()
                  )
                ) : (
                  <tr>
                    <td colSpan={visibleColumns.length + 2} className="text-center py-10 text-slate-500">
                      Chưa có phiếu thu chi nào được đồng bộ từ Duyệt giao dịch phù hợp với bộ lọc hiện tại.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[3px] border border-[#d8dadd] bg-white shadow-[0_18px_38px_rgba(15,23,42,0.10)]">
              {isViewMode ? (
                <>
                  <div className="border-b border-[#dee2e6] bg-[#f6f7f9] px-4 py-2">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={handlePrintCurrentTransaction}
                          className="inline-flex items-center gap-1 rounded-[2px] border border-[#d8dadd] bg-white px-3 py-1 text-[12px] font-medium text-[#374151] hover:bg-[#f8f9fa]"
                        >
                          <Printer size={13} />
                          Print
                        </button>
                        <button
                          type="button"
                          onClick={handleExportCurrentTransaction}
                          disabled={!editingRow}
                          className={`inline-flex items-center gap-1 rounded-[2px] border border-[#d8dadd] px-3 py-1 text-[12px] font-medium ${
                            editingRow ? 'bg-white text-[#374151] hover:bg-[#f8f9fa]' : 'bg-[#f3f4f6] text-[#9ca3af] cursor-not-allowed'
                          }`}
                        >
                          <Download size={13} />
                          Export
                        </button>
                      </div>

                      <EnterpriseWorkflowBar currentStep={currentWorkflowStep} labels={['Chờ duyệt', 'KT xác nhận', 'Duyệt', 'Đã thu/chi']} />
                    </div>
                  </div>

                  <div className="border-b border-[#eef1f4] bg-white px-4 py-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                      <div className="min-w-0">
                        <h2 className="text-[16px] font-semibold text-[#111827]">{modalTitle}</h2>
                        <div className="mt-2 flex flex-wrap items-end gap-x-4 gap-y-1">
                          <span className="text-[18px] font-semibold tracking-[-0.01em] text-[#111827]">
                            {editingRow?.approvalTransactionCode || '-'}
                          </span>
                          <span className="text-[18px] font-bold text-[#1d4ed8]">{editingRow ? moneyFormat(editingRow.actual.amount) : '-'}</span>
                        </div>
                      </div>

                      {editingRow && (
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px]">
                          <div className="flex items-center gap-2">
                            <span className="text-[#666666]">Trạng thái duyệt</span>
                            <CompactStatusPill
                              label={getApprovalStageLabel(editingRow.approvalStage, editingRow.businessGroup, editingRow.processedResult)}
                              tone={
                                editingRow.approvalStage === 'TU_CHOI'
                                  ? 'rose'
                                  : editingRow.approvalStage === 'CHO_DUYET'
                                    ? 'amber'
                                    : editingRow.approvalStage === 'KE_TOAN_XAC_NHAN'
                                      ? 'blue'
                                      : 'green'
                              }
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[#666666]">Trạng thái xử lý</span>
                            <CompactStatusPill
                              label={currentProcessedStatus.label}
                              tone={editingRow.processedResult === 'DA_CHI' ? 'rose' : editingRow.processedResult === 'DA_THU' ? 'green' : 'slate'}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="overflow-y-auto bg-white px-4 py-4">
                    {editingRow ? (
                      <div className="grid grid-cols-1 gap-x-8 gap-y-4 lg:grid-cols-2">
                        <div>
                          <div className="border-t border-[#eef1f4]">
                            <CompactSheetRow
                              label="Mã giao dịch"
                              value={
                                <div className="min-w-0">
                                  <div>{editingRow.approvalTransactionCode}</div>
                                  <div className="mt-0.5 text-[12px] font-medium text-[#94a3b8]">{editingRow.approvalReferenceLabel}</div>
                                </div>
                              }
                            />
                            <CompactSheetRow label="Nhóm nghiệp vụ" value={editingRow.businessGroupLabel} />
                            <CompactSheetRow label="Loại nghiệp vụ" value={editingRow.businessType} />
                            <CompactSheetRow label="Đối tượng" value={editingRow.relatedEntity} />
                            <CompactSheetRow
                              label="Hợp đồng"
                              noBorder
                              value={
                                <div className="min-w-0">
                                  <div>{editingRow.contractCode}</div>
                                  <div className="mt-0.5 text-[12px] font-medium text-[#94a3b8]">{editingRow.contractReferenceLabel}</div>
                                </div>
                              }
                            />
                          </div>

                          <div className="mt-3 border-t border-[#eef1f4]">
                            <CompactSheetRow label="Số tiền" value={moneyFormat(editingRow.actual.amount)} />
                            <CompactSheetRow label="Hình thức" value={editingRow.paymentMethodLabel} />
                            <CompactSheetRow label="Chứng từ" value={<span className="break-all">{editingRow.proofValue}</span>} />
                            <CompactSheetRow label="Ngày thanh toán" value={<span className="whitespace-nowrap">{editingRow.paymentDateLabel}</span>} />
                            <CompactSheetRow
                              label="Người nhận / nộp"
                              noBorder
                              value={formData.recipientPayerName.trim() || editingRow.actual.recipientPayerName || editingRow.actual.title || '-'}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="border-t border-[#eef1f4]">
                            <CompactSheetRow label="Người tạo" value={editingRow.creatorLabel} />
                            <CompactSheetRow label="Ngày tạo" value={<span className="whitespace-nowrap">{editingRow.createdAtLabel}</span>} />
                            <CompactSheetRow
                              label="Trạng thái duyệt"
                              value={
                                <CompactStatusPill
                                  label={getApprovalStageLabel(editingRow.approvalStage, editingRow.businessGroup, editingRow.processedResult)}
                                  tone={
                                    editingRow.approvalStage === 'TU_CHOI'
                                      ? 'rose'
                                      : editingRow.approvalStage === 'CHO_DUYET'
                                        ? 'amber'
                                        : editingRow.approvalStage === 'KE_TOAN_XAC_NHAN'
                                          ? 'blue'
                                          : 'green'
                                  }
                                />
                              }
                            />
                            <CompactSheetRow label="Mã thu chi" value={formData.transactionCode.trim() || editingRow.actual.transactionCode || '-'} />
                            <CompactSheetRow label="Phân loại" value={TYPE_META[formData.type].label} noBorder />
                          </div>

                          <div className="mt-3 border-t border-[#eef1f4]">
                            <CompactSheetRow label="Hình thức thu / chi" value={formData.cashAccount || '-'} />
                            <CompactSheetRow
                              label="Trạng thái xử lý"
                              value={
                                <CompactStatusPill
                                  label={currentProcessedStatus.label}
                                  tone={editingRow.processedResult === 'DA_CHI' ? 'rose' : editingRow.processedResult === 'DA_THU' ? 'green' : 'slate'}
                                />
                              }
                            />
                            <CompactSheetRow label="Ngày thu/chi" value={<span className="whitespace-nowrap">{dateLabelFormat(formData.date)}</span>} />
                            <CompactSheetRow
                              label="Attach chứng từ"
                              noBorder
                              value={<CompactAttachmentLink name={editingRow.actual.attachmentName} url={editingRow.actual.attachmentUrl} />}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-[2px] border border-dashed border-[#dee2e6] bg-[#fafafa] px-4 py-5 text-sm text-slate-600">
                        Không tìm thấy dữ liệu chi tiết cho phiếu thu chi này.
                      </div>
                    )}
                  </div>

                  <div className="sticky bottom-0 flex justify-end gap-2 border-t border-[#dee2e6] bg-white px-4 py-3">
                    <button
                      onClick={closeModal}
                      className="rounded-[2px] border border-[#dee2e6] px-4 py-2 text-[12px] font-medium text-[#374151] hover:bg-[#f8f9fa]"
                    >
                      Đóng
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="border-b border-[#dee2e6] bg-[#fbfbfc] px-5 py-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <h2 className="text-[16px] font-semibold leading-6 text-[#111827]">{modalTitle}</h2>
                        <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1 text-[12px]">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[#666666]">Số tiền:</span>
                            <span className="font-bold text-[#1d4ed8]">{editingRow ? moneyFormat(editingRow.actual.amount) : '-'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[#666666]">Trạng thái:</span>
                            <span className="font-semibold text-[#111827]">{currentProcessedStatus.label}</span>
                          </div>
                        </div>
                      </div>

                      {editingRow && (
                        <div className="flex flex-col items-start gap-2 lg:items-end">
                          <EnterpriseWorkflowBar currentStep={currentWorkflowStep} labels={['Chờ duyệt', 'KT xác nhận', 'Duyệt', 'Đã thu/chi']} />
                          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px]">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[#666666]">Trạng thái duyệt:</span>
                              <span className="font-semibold text-[#111827]">
                                {getApprovalStageLabel(editingRow.approvalStage, editingRow.businessGroup, editingRow.processedResult)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[#666666]">Trạng thái:</span>
                              <span className="font-semibold text-[#b45309]">{currentProcessedStatus.label}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="overflow-y-auto px-5 py-4">
                    {editingRow ? (
                      <div className="rounded-[2px] border border-[#dee2e6] bg-white p-4">
                        <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2">
                          <div>
                            <label className="block text-[12px] font-medium text-[#666666]">Mã thu chi</label>
                            <div className="mt-1 flex min-h-[36px] items-center rounded-[2px] border border-[#dee2e6] bg-[#f8f9fa] px-3 text-[13px] font-medium text-[#111827]">
                              {formData.transactionCode || '-'}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[12px] font-medium text-[#666666]">Phân loại</label>
                            <div className="mt-1 flex min-h-[36px] items-center rounded-[2px] border border-[#dee2e6] bg-[#f8f9fa] px-3 text-[13px] font-medium text-[#111827]">
                              {TYPE_META[formData.type].label}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[12px] font-medium text-[#666666]">Hình thức thu / chi</label>
                            <select
                              value={formData.cashAccount}
                              onChange={(e) => setFormData((prev) => ({ ...prev, cashAccount: e.target.value }))}
                              className="mt-1 h-9 w-full rounded-[2px] border border-[#dee2e6] bg-white px-3 text-[13px] text-[#111827] outline-none focus:border-[#94a3b8]"
                            >
                              {MONEY_ACCOUNTS.map((account) => (
                                <option key={account} value={account}>
                                  {account}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[12px] font-medium text-[#666666]">Trạng thái</label>
                            <div className="mt-1 flex min-h-[36px] items-center rounded-[2px] border border-[#dee2e6] bg-[#f8f9fa] px-3 text-[13px] font-medium text-[#111827]">
                              {currentProcessedStatus.label}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[12px] font-medium text-[#666666]">Ngày thu/chi</label>
                            <div className="mt-1 flex min-h-[36px] items-center rounded-[2px] border border-[#dee2e6] bg-[#f8f9fa] px-3 text-[13px] font-medium text-[#111827]">
                              {dateLabelFormat(formData.date)}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[12px] font-medium text-[#666666]">Người nhận / nộp</label>
                            <input
                              type="text"
                              value={formData.recipientPayerName}
                              onChange={(e) => setFormData((prev) => ({ ...prev, recipientPayerName: e.target.value }))}
                              className="mt-1 h-9 w-full rounded-[2px] border border-[#dee2e6] bg-white px-3 text-[13px] text-[#111827] outline-none focus:border-[#94a3b8]"
                              placeholder={formData.type === 'IN' ? 'Nhập người nộp tiền' : 'Nhập người nhận tiền'}
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-[12px] font-medium text-[#666666]">Attach chứng từ</label>
                            <label className="relative mt-1 block cursor-pointer">
                              <span className="flex min-h-[36px] items-center rounded-[2px] border border-[#dee2e6] bg-white px-3 pr-10 text-[13px] text-[#111827]">
                                <span className="truncate">{currentAttachmentName || 'Chọn file chứng từ'}</span>
                              </span>
                              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[#6b7280]">
                                <Paperclip size={14} />
                              </span>
                              <input type="file" accept=".pdf,image/*" className="hidden" onChange={handleAttachmentChange} />
                            </label>
                            <p className={`mt-1 text-[11px] ${hasAttachment ? 'text-[#6b7280]' : 'text-[#dc2626]'}`}>
                              {hasAttachment
                                ? 'Đã có chứng từ đính kèm.'
                                : 'Chưa có chứng từ đính kèm. Nút lưu sẽ bị khóa cho đến khi attach chứng từ.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-[2px] border border-dashed border-[#dee2e6] bg-[#fafafa] px-4 py-5 text-sm text-slate-600">
                        Không tìm thấy dữ liệu phiếu thu chi để cập nhật.
                      </div>
                    )}
                  </div>

                  <div className="sticky bottom-0 flex justify-end gap-2 border-t border-[#dee2e6] bg-white px-5 py-3">
                    <button
                      onClick={closeModal}
                      className="rounded-[2px] border border-[#dee2e6] px-4 py-2 text-[12px] font-medium text-[#4b5563] hover:bg-[#f8f9fa]"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={() => {
                        void handleSubmit();
                      }}
                      disabled={!canSave}
                      className={`rounded-[2px] px-4 py-2 text-[12px] font-semibold ${
                        canSave ? 'bg-[#1d4ed8] text-white hover:bg-[#1e40af]' : 'bg-[#e5e7eb] text-[#9ca3af] cursor-not-allowed'
                      }`}
                    >
                      {saveButtonLabel}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinanceMoneyOut;
