import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Calendar, Check, Columns3, FileText, Filter, History, Pencil, Rows3, UploadCloud } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
import PinnedSearchInput, { PinnedSearchChip } from '../components/PinnedSearchInput';

type BusinessGroup = 'THU' | 'CHI' | 'DIEU_CHINH';
type ApprovalStage = 'CHO_DUYET' | 'KE_TOAN_DUYET' | 'CEO_DUYET' | 'HOAN_TAT' | 'TU_CHOI';
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
  voucherNumber: string;
  attachmentName: string;
  attachmentUrl: string;
  date: string;
  note: string;
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
  processedStatusLabel: string;
  processedStatusTone: string;
  accountingTypeLabel: string;
};

const MONEY_ACCOUNTS = ['STK ngân hàng', 'Tiền mặt'];
const APPROVAL_FILTER_LABEL_MAP: Record<ApprovalFilter, string> = {
  ALL: 'Tất cả stage',
  CHO_DUYET: 'Chờ duyệt',
  KE_TOAN_DUYET: 'Kế toán duyệt',
  CEO_DUYET: 'CEO duyệt',
  HOAN_TAT: 'Hoàn tất',
  TU_CHOI: 'Từ chối'
};
const TYPE_META: Record<TransactionType, { label: string; badge: string }> = {
  IN: { label: 'Thu', badge: 'bg-emerald-50 text-emerald-700' },
  OUT: { label: 'Chi', badge: 'bg-rose-50 text-rose-700' }
};
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
  { key: 'cashAccount', label: 'Tài khoản tiền' },
  { key: 'creator', label: 'Người tạo' }
];
const COLUMN_OPTIONS: Array<{ id: ColumnId; label: string; align?: 'left' | 'right' }> = [
  { id: 'approvalTransactionCode', label: 'Mã giao dịch' },
  { id: 'businessGroup', label: 'Nhóm nghiệp vụ' },
  { id: 'businessType', label: 'Loại nghiệp vụ' },
  { id: 'relatedEntity', label: 'Đối tượng liên quan' },
  { id: 'contractCode', label: 'Hợp đồng' },
  { id: 'amount', label: 'Số tiền', align: 'right' },
  { id: 'paymentMethod', label: 'Hình thức thanh toán' },
  { id: 'proof', label: 'Chứng từ' },
  { id: 'paymentDate', label: 'Ngày thanh toán' },
  { id: 'creator', label: 'Người tạo' },
  { id: 'createdAt', label: 'Ngày tạo' },
  { id: 'approvalStage', label: 'Trạng thái duyệt' },
  { id: 'approvalNote', label: 'Ghi chú' },
  { id: 'transactionCode', label: 'Mã thu chi' },
  { id: 'accountingType', label: 'Phân loại' },
  { id: 'cashAccount', label: 'Tài khoản tiền' },
  { id: 'voucherNumber', label: 'Số chứng từ' },
  { id: 'processedStatus', label: 'Trạng thái' },
  { id: 'actualDate', label: 'Ngày thu/chi' },
  { id: 'attachment', label: 'Attach chứng từ' }
];
const DEFAULT_VISIBLE_COLUMNS: ColumnId[] = [
  'approvalTransactionCode',
  'businessType',
  'relatedEntity',
  'contractCode',
  'amount',
  'voucherNumber',
  'paymentDate',
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

const getProcessedStatusMeta = (type: TransactionType) =>
  type === 'OUT'
    ? { label: 'Đã xử lý (đã chi)', tone: 'bg-rose-100 text-rose-700' }
    : { label: 'Đã xử lý (đã thu)', tone: 'bg-emerald-100 text-emerald-700' };

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
  requiresCeoApproval: boolean
): ApprovalStage => {
  if (!transaction) return 'HOAN_TAT';
  if (transaction.status === 'TU_CHOI') return 'TU_CHOI';
  if (quotation?.status === QuotationStatus.LOCKED) return 'HOAN_TAT';
  if (transaction.status === 'CHO_DUYET') return 'CHO_DUYET';
  if (requiresCeoApproval) return 'CEO_DUYET';
  return 'KE_TOAN_DUYET';
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
    amount: transaction.amount,
    department: existing?.department || 'Kế toán',
    cashAccount: existing?.cashAccount || (transaction.method === 'TIEN_MAT' ? 'Tiền mặt' : 'STK ngân hàng'),
    voucherNumber: existing?.voucherNumber || transaction.bankRefCode || '',
    date: existing?.date || (Number.isNaN(sourceDate.getTime()) ? new Date().toISOString().slice(0, 10) : sourceDate.toISOString().slice(0, 10)),
    status: type === 'OUT' ? 'PAID' : 'RECEIVED',
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
  voucherNumber: '',
  attachmentName: '',
  attachmentUrl: '',
  date: new Date().toISOString().slice(0, 10),
  note: ''
});

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Không thể đọc chứng từ'));
    reader.readAsDataURL(file);
  });

const ApprovalStageBadge: React.FC<{ stage: ApprovalStage; requiresCeoApproval: boolean }> = ({ stage, requiresCeoApproval }) => {
  const meta: Record<ApprovalStage, { label: string; tone: string }> = {
    CHO_DUYET: { label: 'Chờ duyệt', tone: 'bg-amber-50 text-amber-700 border border-amber-200' },
    KE_TOAN_DUYET: { label: 'Kế toán duyệt', tone: 'bg-blue-50 text-blue-700 border border-blue-200' },
    CEO_DUYET: {
      label: requiresCeoApproval ? 'CEO duyệt' : 'Hoàn tất',
      tone: 'bg-violet-50 text-violet-700 border border-violet-200'
    },
    HOAN_TAT: { label: 'Hoàn tất', tone: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
    TU_CHOI: { label: 'Từ chối', tone: 'bg-rose-50 text-rose-700 border border-rose-200' }
  };

  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap ${meta[stage].tone}`}>{meta[stage].label}</span>;
};

const ReadonlyField: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
    <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">{label}</div>
    <div className="mt-1 text-sm font-medium text-slate-800 break-words">{value}</div>
  </div>
);

const FinanceMoneyOut: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const columnMenuRef = useRef<HTMLDivElement | null>(null);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);
  const timeMenuRef = useRef<HTMLDivElement | null>(null);
  const quickFilterMenuRef = useRef<HTMLDivElement | null>(null);
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
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
      const approvalStage = getApprovalStage(source, quotation, requiresCeoApproval);
      const processedStatus = getProcessedStatusMeta(actual.type);
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
        processedStatusLabel: processedStatus.label,
        processedStatusTone: processedStatus.tone,
        accountingTypeLabel: TYPE_META[actual.type].label
      };
    });
  }, [contractByQuotationId, creatorDirectory, quotationMap, sourceIndexMap, sourceTransactionMap, transactions]);

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
          row.contractCode,
          row.contractReferenceLabel,
          row.paymentMethodLabel,
          row.proofValue,
          row.paymentDateLabel,
          row.creatorLabel,
          row.createdAtLabel,
          APPROVAL_FILTER_LABEL_MAP[row.approvalStage],
          row.approvalNote,
          row.actual.transactionCode,
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
        return APPROVAL_FILTER_LABEL_MAP[row.approvalStage];
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
    if (approvalFilter !== 'ALL') chips.push({ key: 'approval', label: `Stage: ${APPROVAL_FILTER_LABEL_MAP[approvalFilter]}` });
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
  };

  const openEditModal = (item: IActualTransaction) => {
    setEditingTransactionId(item.id);
    setSelectedAttachment(null);
    setFormData({
      transactionCode: item.transactionCode || buildFallbackTransactionCode(item, 0),
      type: item.type,
      cashAccount: item.cashAccount || inferCashAccount(item),
      voucherNumber: item.voucherNumber || '',
      attachmentName: item.attachmentName || '',
      attachmentUrl: item.attachmentUrl || '',
      date: item.date,
      note: item.title || ''
    });
    setIsModalOpen(true);
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

    if (!formData.transactionCode.trim() || !formData.voucherNumber.trim()) {
      alert('Vui lòng nhập đủ Mã thu chi và Số chứng từ.');
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
      title: formData.note.trim() || existing.title || defaultLabel,
      amount: existing.amount || 0,
      department: existing.department || 'Kế toán',
      cashAccount: formData.cashAccount,
      voucherNumber: formData.voucherNumber.trim(),
      date: formData.date,
      status: formData.type === 'OUT' ? 'PAID' : 'RECEIVED',
      proof: attachmentName || formData.voucherNumber.trim() || undefined,
      attachmentName: attachmentName || undefined,
      attachmentUrl: attachmentUrl || undefined,
      relatedId: existing.relatedId,
      createdBy: existing.createdBy || user?.name || user?.id || 'Kế toán',
      createdAt: existing.createdAt || new Date().toISOString()
    };

    const ok = updateActualTransaction(item);
    if (!ok) return;
    createLog(item.id, 'UPDATE', `Cập nhật phiếu ${item.transactionCode}: số chứng từ ${item.voucherNumber}`);

    closeModal();
  };

  const editingRow = useMemo(
    () => rows.find((row) => row.actual.id === editingTransactionId),
    [editingTransactionId, rows]
  );

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
            <div className="max-w-[220px] truncate" title={row.relatedEntity}>
              {row.relatedEntity}
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
            <ApprovalStageBadge stage={row.approvalStage} requiresCeoApproval={row.requiresCeoApproval} />
          </td>
        );
      case 'approvalNote':
        return <td className="px-4 py-4 text-sm text-slate-700 min-w-[220px] whitespace-pre-wrap break-words">{row.approvalNote}</td>;
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
            {row.actual.attachmentName ? (
              row.actual.attachmentUrl ? (
                <a
                  href={row.actual.attachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-slate-700 bg-slate-100 px-2 py-1 rounded hover:bg-slate-200"
                >
                  <FileText size={12} />
                  {row.actual.attachmentName}
                </a>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-slate-700 bg-slate-100 px-2 py-1 rounded">
                  <FileText size={12} />
                  {row.actual.attachmentName}
                </span>
              )
            ) : (
              <span className="text-xs text-slate-400">Chưa attach chứng từ</span>
            )}
          </td>
        );
      default:
        return null;
    }
  };

  const renderMoneyOutRow = (row: MoneyOutRow) => {
    const itemLogs = (logsByTransaction[row.actual.id] || []).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return (
      <React.Fragment key={row.actual.id}>
        <tr className="hover:bg-slate-50 transition-colors align-top">
          {visibleColumns.map((columnId) => (
            <React.Fragment key={columnId}>{renderCell(row, columnId)}</React.Fragment>
          ))}
          <td className="w-[150px] min-w-[150px] px-4 py-4 text-right align-top">
            <div className="ml-auto flex max-w-[130px] flex-wrap items-center justify-end gap-x-3 gap-y-2">
              <button
                onClick={() => openEditModal(row.actual)}
                className="text-xs font-semibold text-slate-700 hover:underline inline-flex items-center gap-1"
              >
                <Pencil size={12} /> Sửa
              </button>
              <button
                onClick={() => setExpandedLogId(expandedLogId === row.actual.id ? null : row.actual.id)}
                className="text-xs font-semibold text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                <History size={12} /> Log note
              </button>
            </div>
          </td>
        </tr>

        {expandedLogId === row.actual.id && (
          <tr className="bg-slate-50">
            <td colSpan={visibleColumns.length + 1} className="px-6 py-4">
              <p className="text-xs font-bold text-slate-500 uppercase mb-2">Lịch sử log note</p>
              {itemLogs.length ? (
                <div className="space-y-2">
                  {itemLogs.map((log) => (
                    <div key={log.id} className="text-sm bg-white border border-slate-200 rounded-lg px-3 py-2">
                      <p className="text-slate-800 font-medium">{log.message}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {dateTimeFormat(log.createdAt)} • {log.createdBy}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic">Chưa có log note.</p>
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
                              {(['ALL', 'CHO_DUYET', 'KE_TOAN_DUYET', 'CEO_DUYET', 'HOAN_TAT', 'TU_CHOI'] as ApprovalFilter[]).map((item) => (
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

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1240px] table-fixed text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold">
                <tr>
                  {visibleColumnOptions.map((column) => (
                    <th
                      key={column.id}
                      className={`px-4 py-4 whitespace-normal ${column.align === 'right' ? 'text-right' : ''}`}
                    >
                      {column.label}
                    </th>
                  ))}
                  <th className="w-[150px] min-w-[150px] px-4 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.length ? (
                  groupBy.length === 0 ? (
                    filteredRows.map((row) => renderMoneyOutRow(row))
                  ) : (
                    groupedRows.map((group) => (
                      <React.Fragment key={group.label}>
                        <tr className="bg-slate-50/80">
                          <td colSpan={visibleColumns.length + 1} className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                            {group.label}
                            <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] text-slate-700">{group.items.length}</span>
                          </td>
                        </tr>
                        {group.items.map((row) => renderMoneyOutRow(row))}
                      </React.Fragment>
                    ))
                  )
                ) : (
                  <tr>
                    <td colSpan={visibleColumns.length + 1} className="text-center py-10 text-slate-500">
                      Chưa có phiếu thu chi nào được đồng bộ từ Duyệt giao dịch phù hợp với bộ lọc hiện tại.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-6xl max-h-[92vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
                <h2 className="text-lg font-bold text-slate-900">Cập nhật phiếu thu chi</h2>
                <p className="text-sm text-slate-500">
                  Phiếu này được chuyển từ `Duyệt giao dịch`. Bạn chỉ chỉnh phần kế toán và bắt buộc phải có chứng từ đính kèm.
                </p>
              </div>

              <div className="p-6 space-y-6">
                <section className="rounded-2xl border border-slate-200 p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Thông tin duyệt giao dịch</h3>
                      <p className="text-sm text-slate-500">Nhóm field cũ từ phân hệ duyệt lệnh.</p>
                    </div>
                    {editingRow?.source && (
                      <ApprovalStageBadge stage={editingRow.approvalStage} requiresCeoApproval={editingRow.requiresCeoApproval} />
                    )}
                  </div>

                  {editingRow?.source ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                      <ReadonlyField
                        label="Mã giao dịch"
                        value={
                          <div>
                            <div>{editingRow.approvalTransactionCode}</div>
                            <div className="text-xs text-slate-400">{editingRow.approvalReferenceLabel}</div>
                          </div>
                        }
                      />
                      <ReadonlyField label="Nhóm nghiệp vụ" value={editingRow.businessGroupLabel} />
                      <ReadonlyField label="Loại nghiệp vụ" value={editingRow.businessType} />
                      <ReadonlyField label="Đối tượng liên quan" value={editingRow.relatedEntity} />
                      <ReadonlyField
                        label="Hợp đồng"
                        value={
                          <div>
                            <div>{editingRow.contractCode}</div>
                            <div className="text-xs text-slate-400">{editingRow.contractReferenceLabel}</div>
                          </div>
                        }
                      />
                      <ReadonlyField label="Số tiền" value={moneyFormat(editingRow.actual.amount)} />
                      <ReadonlyField label="Hình thức thanh toán" value={editingRow.paymentMethodLabel} />
                      <ReadonlyField label="Chứng từ" value={editingRow.proofValue} />
                      <ReadonlyField label="Ngày thanh toán" value={editingRow.paymentDateLabel} />
                      <ReadonlyField label="Người tạo" value={editingRow.creatorLabel} />
                      <ReadonlyField label="Ngày tạo" value={editingRow.createdAtLabel} />
                      <ReadonlyField
                        label="Trạng thái duyệt"
                        value={<ApprovalStageBadge stage={editingRow.approvalStage} requiresCeoApproval={editingRow.requiresCeoApproval} />}
                      />
                      <div className="md:col-span-2 xl:col-span-4">
                        <ReadonlyField label="Ghi chú" value={editingRow.approvalNote} />
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                      Phiếu này không gắn với bản ghi từ phân hệ duyệt giao dịch. Nếu cần đủ thông tin nghiệp vụ phía trên, hãy tạo ở màn hình
                      `Duyệt giao dịch` trước rồi đồng bộ sang `Thu chi`.
                    </div>
                  )}
                </section>

                <section className="rounded-2xl border border-slate-200 p-5">
                  <div className="mb-4">
                    <h3 className="text-base font-bold text-slate-900">Thông tin kế toán thu chi</h3>
                    <p className="text-sm text-slate-500">Nhóm field kế toán sửa trực tiếp ở màn hình này.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold text-slate-700">Mã thu chi</label>
                      <input
                        type="text"
                        value={formData.transactionCode}
                        onChange={(e) => setFormData((prev) => ({ ...prev, transactionCode: e.target.value }))}
                        className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        placeholder="Ví dụ: TC0001"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-slate-700">Phân loại</label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value as TransactionType }))}
                        className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      >
                        <option value="OUT">Chi</option>
                        <option value="IN">Thu</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-slate-700">Tài khoản tiền</label>
                      <select
                        value={formData.cashAccount}
                        onChange={(e) => setFormData((prev) => ({ ...prev, cashAccount: e.target.value }))}
                        className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      >
                        {MONEY_ACCOUNTS.map((account) => (
                          <option key={account} value={account}>
                            {account}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-slate-700">Số chứng từ</label>
                      <input
                        type="text"
                        value={formData.voucherNumber}
                        onChange={(e) => setFormData((prev) => ({ ...prev, voucherNumber: e.target.value }))}
                        className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        placeholder="Ví dụ: PT-2026-0103 / PC-014 / UNC-2026-0201"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-slate-700">Trạng thái</label>
                      <div className="mt-1 h-[42px] rounded-lg border border-slate-200 px-3 flex items-center text-sm font-semibold text-slate-700 bg-slate-50">
                        {getProcessedStatusMeta(formData.type).label}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-slate-700">Ngày thu/chi</label>
                      <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                        className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-sm font-semibold text-slate-700">Attach chứng từ</label>
                      <label className="mt-1 flex items-center justify-between gap-3 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-600 cursor-pointer hover:bg-slate-50">
                        <span className="truncate">{selectedAttachment?.name || formData.attachmentName || 'Chọn file chứng từ'}</span>
                        <span className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 shrink-0">
                          <UploadCloud size={14} />
                          Attach
                        </span>
                        <input type="file" accept=".pdf,image/*" className="hidden" onChange={handleAttachmentChange} />
                      </label>
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-sm font-semibold text-slate-700">Ghi chú kế toán</label>
                      <textarea
                        value={formData.note}
                        onChange={(e) => setFormData((prev) => ({ ...prev, note: e.target.value }))}
                        className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm min-h-[88px]"
                        placeholder="Ghi chú nội bộ nếu cần..."
                      />
                    </div>
                  </div>
                </section>
              </div>

              <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2 sticky bottom-0 bg-white">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  onClick={() => {
                    void handleSubmit();
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-bold bg-blue-600 text-white hover:bg-blue-700"
                >
                  Lưu thay đổi
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinanceMoneyOut;
