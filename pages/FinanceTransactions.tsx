import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, Check, CheckCircle2, ChevronDown, Columns3, FileText, Filter, Plus, RotateCcw, Rows3, UploadCloud, XCircle } from 'lucide-react';
import { IQuotation, ITransaction, QuotationStatus, UserRole } from '../types';
import {
  addTransaction,
  getQuotations,
  removeActualTransactionByRelatedId,
  getSalesTeams,
  getTransactions,
  saveTransactions,
  updateQuotation
} from '../utils/storage';
import {
  approveTransaction,
  lockQuotationAfterAccounting,
  rejectTransaction,
  unlockQuotationAfterAccounting
} from '../services/financeFlow.service';
import { useAuth } from '../contexts/AuthContext';
import PinnedSearchInput, { PinnedSearchChip } from '../components/PinnedSearchInput';

type ApprovalFilter = 'ALL' | 'CHO_DUYET' | 'KE_TOAN_DUYET' | 'CEO_DUYET' | 'HOAN_TAT' | 'TU_CHOI';
type BusinessGroup = 'THU' | 'CHI' | 'DIEU_CHINH';
type ApprovalStage = 'CHO_DUYET' | 'KE_TOAN_DUYET' | 'CEO_DUYET' | 'HOAN_TAT' | 'TU_CHOI';
type TimeRangeType = 'all' | 'today' | 'yesterday' | 'thisWeek' | 'last7Days' | 'last30Days' | 'thisMonth' | 'lastMonth' | 'custom';
type FinanceGroupByKey = 'approvalStage' | 'businessGroup' | 'businessType' | 'paymentMethod' | 'proof' | 'creator';
type CreateTransactionFormState = {
  businessGroup: BusinessGroup;
  businessType: string;
  relatedEntity: string;
  quotationId: string;
  note: string;
  amount: string;
  method: 'CHUYEN_KHOAN' | 'TIEN_MAT';
  paidDate: string;
  proofFile: File | null;
};
type ColumnId =
  | 'transactionCode'
  | 'businessGroup'
  | 'businessType'
  | 'relatedEntity'
  | 'contractCode'
  | 'amount'
  | 'paymentMethod'
  | 'proof'
  | 'paidAt'
  | 'creator'
  | 'createdAt'
  | 'approvalStage'
  | 'note';

type TransactionRow = {
  transaction: ITransaction;
  quotation?: IQuotation;
  transactionCode: string;
  businessGroup: BusinessGroup;
  businessGroupLabel: string;
  businessType: string;
  relatedEntity: string;
  contractCode: string;
  paymentMethodLabel: string;
  proofLabel: string;
  proofValue: string;
  paidAtLabel: string;
  createdAtLabel: string;
  creatorLabel: string;
  noteLabel: string;
  approvalStage: ApprovalStage;
  requiresCeoApproval: boolean;
  isLocked: boolean;
};

const COLUMN_OPTIONS: Array<{ id: ColumnId; label: string }> = [
  { id: 'transactionCode', label: 'Mã giao dịch' },
  { id: 'businessGroup', label: 'Nhóm nghiệp vụ' },
  { id: 'businessType', label: 'Loại nghiệp vụ' },
  { id: 'relatedEntity', label: 'Đối tượng liên quan' },
  { id: 'contractCode', label: 'Hợp đồng' },
  { id: 'amount', label: 'Số tiền' },
  { id: 'paymentMethod', label: 'Thanh toán' },
  { id: 'proof', label: 'Chứng từ' },
  { id: 'paidAt', label: 'Ngày thanh toán' },
  { id: 'creator', label: 'Người tạo' },
  { id: 'createdAt', label: 'Ngày tạo' },
  { id: 'approvalStage', label: 'Trạng thái duyệt' },
  { id: 'note', label: 'Ghi chú' }
];

const DEFAULT_VISIBLE_COLUMNS: ColumnId[] = [
  'transactionCode',
  'businessGroup',
  'businessType',
  'relatedEntity',
  'contractCode',
  'amount',
  'paymentMethod',
  'proof',
  'approvalStage'
];

const TIME_RANGE_PRESETS: Array<{ id: TimeRangeType; label: string }> = [
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

const APPROVAL_FILTER_LABEL_MAP: Record<ApprovalFilter, string> = {
  ALL: 'Tất cả',
  CHO_DUYET: 'Chờ duyệt',
  KE_TOAN_DUYET: 'Kế toán duyệt',
  CEO_DUYET: 'CEO duyệt',
  HOAN_TAT: 'Hoàn tất',
  TU_CHOI: 'Từ chối'
};

const GROUP_BY_OPTIONS: Array<{ key: FinanceGroupByKey; label: string }> = [
  { key: 'approvalStage', label: 'Trạng thái' },
  { key: 'businessGroup', label: 'Nhóm NV' },
  { key: 'businessType', label: 'Loại nghiệp vụ' },
  { key: 'paymentMethod', label: 'Thanh toán' },
  { key: 'proof', label: 'Chứng từ' },
  { key: 'creator', label: 'Người tạo' }
];

const BUSINESS_TYPE_OPTIONS: Record<BusinessGroup, string[]> = {
  THU: ['Thu học viên', 'Thu khác'],
  CHI: ['Chi công tác', 'Chi MKT', 'Chi vận hành', 'Chi hoa hồng', 'Chi khác'],
  DIEU_CHINH: ['Điều chỉnh công nợ', 'Hủy khoản thu', 'Bù trừ', 'Điều chỉnh khác']
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value || 0);

const createInitialTransactionForm = (): CreateTransactionFormState => ({
  businessGroup: 'THU',
  businessType: BUSINESS_TYPE_OPTIONS.THU[0],
  relatedEntity: '',
  quotationId: '',
  note: '',
  amount: '',
  method: 'CHUYEN_KHOAN',
  paidDate: toDateInputValue(new Date()),
  proofFile: null
});

const toDateInputValue = (value: Date) => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const startOfDay = (value: Date) => {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
};

const endOfDay = (value: Date) => {
  const next = new Date(value);
  next.setHours(23, 59, 59, 999);
  return next;
};

const parseDateOnly = (value?: string) => {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatCustomDateRangeLabel = (start?: string, end?: string) => {
  const startLabel = parseDateOnly(start)?.toLocaleDateString('vi-VN');
  const endLabel = parseDateOnly(end)?.toLocaleDateString('vi-VN');

  if (startLabel && endLabel) return `${startLabel} - ${endLabel}`;
  if (startLabel) return `Từ ${startLabel}`;
  if (endLabel) return `Đến ${endLabel}`;
  return 'Tùy chỉnh khoảng';
};

const getTimeRangePresetValues = (rangeType: TimeRangeType) => {
  const now = new Date();
  const today = toDateInputValue(now);

  switch (rangeType) {
    case 'today':
      return { start: today, end: today };
    case 'yesterday': {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const value = toDateInputValue(yesterday);
      return { start: value, end: value };
    }
    case 'thisWeek': {
      const start = new Date(now);
      const dayOfWeek = start.getDay() === 0 ? 7 : start.getDay();
      start.setDate(start.getDate() - dayOfWeek + 1);
      return { start: toDateInputValue(start), end: today };
    }
    case 'last7Days': {
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      return { start: toDateInputValue(start), end: today };
    }
    case 'last30Days': {
      const start = new Date(now);
      start.setDate(start.getDate() - 29);
      return { start: toDateInputValue(start), end: today };
    }
    case 'thisMonth':
      return { start: toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1)), end: today };
    case 'lastMonth':
      return {
        start: toDateInputValue(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        end: toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 0))
      };
    case 'custom':
      return { start: '', end: '' };
    case 'all':
    default:
      return { start: '', end: '' };
  }
};

const getTimeRangeBounds = (rangeType: TimeRangeType, startDate?: string, endDate?: string) => {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  switch (rangeType) {
    case 'today':
      return { start: todayStart, end: todayEnd };
    case 'yesterday': {
      const start = new Date(todayStart);
      start.setDate(start.getDate() - 1);
      return { start, end: endOfDay(start) };
    }
    case 'thisWeek': {
      const start = new Date(todayStart);
      const dayOfWeek = start.getDay() === 0 ? 7 : start.getDay();
      start.setDate(start.getDate() - dayOfWeek + 1);
      return { start, end: todayEnd };
    }
    case 'last7Days': {
      const start = new Date(todayStart);
      start.setDate(start.getDate() - 6);
      return { start, end: todayEnd };
    }
    case 'last30Days': {
      const start = new Date(todayStart);
      start.setDate(start.getDate() - 29);
      return { start, end: todayEnd };
    }
    case 'thisMonth':
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: todayEnd };
    case 'lastMonth':
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
      };
    case 'custom':
      return {
        start: parseDateOnly(startDate),
        end: endDate ? endOfDay(parseDateOnly(endDate) || new Date(endDate)) : null
      };
    case 'all':
    default:
      return null;
  }
};

const formatDateTime = (value?: number | string) => {
  if (!value && value !== 0) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const normalize = (value?: string) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Không thể đọc chứng từ'));
    reader.readAsDataURL(file);
  });

const inferBusinessGroup = (transaction: ITransaction): BusinessGroup => {
  if (transaction.businessGroupHint) return transaction.businessGroupHint;
  const haystack = normalize(`${transaction.note || ''} ${transaction.studentName || ''} ${transaction.customerId || ''}`);

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

  return 'THU';
};

const inferBusinessType = (transaction: ITransaction, group: BusinessGroup) => {
  if (transaction.businessTypeHint) return transaction.businessTypeHint;
  const haystack = normalize(transaction.note);

  if (group === 'THU') {
    return transaction.studentName || transaction.soCode ? 'Thu học viên' : 'Thu khác';
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

const getBusinessGroupLabel = (group: BusinessGroup) => {
  if (group === 'THU') return 'Thu';
  if (group === 'CHI') return 'Chi';
  return 'Điều chỉnh';
};

const getPaymentMethodLabel = (method: ITransaction['method']) => {
  switch (method) {
    case 'CHUYEN_KHOAN':
      return 'Chuyển khoản';
    case 'TIEN_MAT':
      return 'Tiền mặt';
    case 'THE':
      return 'Thẻ';
    default:
      return 'Khác';
  }
};

const getProofLabel = (transaction: ITransaction) => {
  if (transaction.proofType === 'UNC') return 'UNC';
  if (transaction.proofType === 'PHIEU_THU') return 'Phiếu thu';
  return 'Không có';
};

const getApprovalStage = (transaction: ITransaction, isLocked: boolean, requiresCeoApproval: boolean): ApprovalStage => {
  if (transaction.status === 'TU_CHOI') return 'TU_CHOI';
  if (isLocked) return 'HOAN_TAT';
  if (transaction.status === 'CHO_DUYET') return 'CHO_DUYET';
  if (requiresCeoApproval) return 'CEO_DUYET';
  return 'KE_TOAN_DUYET';
};

const ApprovalStageView: React.FC<{ stage: ApprovalStage; requiresCeoApproval: boolean }> = ({ stage, requiresCeoApproval }) => {
  const stageMeta: Record<ApprovalStage, { label: string; tone: string }> = {
    CHO_DUYET: {
      label: 'Chờ duyệt',
      tone: 'bg-amber-50 text-amber-700 border border-amber-200'
    },
    KE_TOAN_DUYET: {
      label: 'Kế toán duyệt',
      tone: 'bg-blue-50 text-blue-700 border border-blue-200'
    },
    CEO_DUYET: {
      label: requiresCeoApproval ? 'CEO duyệt' : 'Hoàn tất',
      tone: 'bg-violet-50 text-violet-700 border border-violet-200'
    },
    HOAN_TAT: {
      label: 'Hoàn tất',
      tone: 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    },
    TU_CHOI: {
      label: 'Từ chối',
      tone: 'bg-rose-50 text-rose-700 border border-rose-200'
    }
  };

  if (stage === 'TU_CHOI') {
    return (
      <div className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-bold ${stageMeta.TU_CHOI.tone}`}>{stageMeta.TU_CHOI.label}</div>
    );
  }

  return (
    <div className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-bold whitespace-nowrap ${stageMeta[stage].tone}`}>
      {stageMeta[stage].label}
    </div>
  );
};

const FinanceTransactions: React.FC = () => {
  const { user } = useAuth();
  const columnMenuRef = useRef<HTMLDivElement | null>(null);
  const timeMenuRef = useRef<HTMLDivElement | null>(null);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);
  const [transactions, setTransactions] = useState<ITransaction[]>([]);
  const [quotations, setQuotations] = useState<IQuotation[]>([]);
  const [creatorDirectory, setCreatorDirectory] = useState<Map<string, string>>(new Map());
  const [statusFilter, setStatusFilter] = useState<ApprovalFilter>('ALL');
  const [businessGroupFilter, setBusinessGroupFilter] = useState<'ALL' | BusinessGroup>('ALL');
  const [businessTypeFilter, setBusinessTypeFilter] = useState('ALL');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('ALL');
  const [proofFilter, setProofFilter] = useState('ALL');
  const [creatorFilter, setCreatorFilter] = useState('ALL');
  const [groupBy, setGroupBy] = useState<FinanceGroupByKey[]>([]);
  const [timeRangeType, setTimeRangeType] = useState<TimeRangeType>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [draftTimeRangeType, setDraftTimeRangeType] = useState<TimeRangeType>('all');
  const [draftCustomStartDate, setDraftCustomStartDate] = useState('');
  const [draftCustomEndDate, setDraftCustomEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [visibleColumns, setVisibleColumns] = useState<ColumnId[]>(DEFAULT_VISIBLE_COLUMNS);
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
  const [isTimeMenuOpen, setIsTimeMenuOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateTransactionFormState>(createInitialTransactionForm);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  const loadData = () => {
    setTransactions(getTransactions());
    setQuotations(getQuotations());
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
    window.addEventListener('educrm:transactions-changed', loadData as EventListener);
    window.addEventListener('educrm:quotations-changed', loadData as EventListener);
    window.addEventListener('educrm:sales-teams-changed', loadData as EventListener);
    return () => {
      window.removeEventListener('educrm:transactions-changed', loadData as EventListener);
      window.removeEventListener('educrm:quotations-changed', loadData as EventListener);
      window.removeEventListener('educrm:sales-teams-changed', loadData as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!isColumnMenuOpen && !isTimeMenuOpen && !filtersOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!columnMenuRef.current?.contains(event.target as Node)) {
        setIsColumnMenuOpen(false);
      }

      if (!timeMenuRef.current?.contains(event.target as Node)) {
        setIsTimeMenuOpen(false);
      }

      if (!filterMenuRef.current?.contains(event.target as Node)) {
        setFiltersOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [filtersOpen, isColumnMenuOpen, isTimeMenuOpen]);

  const quotationMap = useMemo(() => new Map(quotations.map((q) => [q.id, q])), [quotations]);

  const rows = useMemo<TransactionRow[]>(() => {
    return transactions.map((transaction, index) => {
      const quotation = quotationMap.get(transaction.quotationId);
      const isLocked = quotation?.status === QuotationStatus.LOCKED;
      const businessGroup = inferBusinessGroup(transaction);
      const requiresCeoApproval = businessGroup !== 'THU' || transaction.amount >= 100_000_000;
      const approvalStage = getApprovalStage(transaction, Boolean(isLocked), requiresCeoApproval);
      const transactionCode =
        transaction.code ||
        (businessGroup === 'THU'
          ? `KT${String(index + 1).padStart(4, '0')}`
          : businessGroup === 'CHI'
            ? `KC${String(index + 1).padStart(5, '0')}`
            : `DC${String(index + 1).padStart(4, '0')}`);

      return {
        transaction,
        quotation,
        transactionCode,
        businessGroup,
        businessGroupLabel: getBusinessGroupLabel(businessGroup),
        businessType: inferBusinessType(transaction, businessGroup),
        relatedEntity: transaction.relatedEntityLabel || transaction.studentName || quotation?.customerName || transaction.customerId || '-',
        contractCode: transaction.soCode || quotation?.soCode || '-',
        paymentMethodLabel: getPaymentMethodLabel(transaction.method),
        proofLabel: getProofLabel(transaction),
        proofValue: transaction.bankRefCode || transaction.proofFiles?.[0]?.name || 'Không có chứng từ',
        paidAtLabel: formatDateTime(transaction.paidAt || transaction.createdAt),
        createdAtLabel: formatDateTime(transaction.createdAt),
        creatorLabel: creatorDirectory.get(transaction.createdBy) || transaction.createdBy || 'System',
        noteLabel: transaction.note || '-',
        approvalStage,
        requiresCeoApproval,
        isLocked: Boolean(isLocked)
      };
    });
  }, [creatorDirectory, quotationMap, transactions]);

  const businessTypeOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => row.businessType).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'vi')),
    [rows]
  );
  const paymentMethodOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => row.paymentMethodLabel).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'vi')),
    [rows]
  );
  const proofOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => row.proofLabel).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'vi')),
    [rows]
  );
  const creatorOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => row.creatorLabel).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'vi')),
    [rows]
  );
  const quotationOptions = useMemo(
    () =>
      quotations
        .slice()
        .sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)))
        .map((quotation) => ({
          id: quotation.id,
          soCode: quotation.soCode,
          label: `${quotation.soCode} - ${quotation.customerName}`,
          customerName: quotation.customerName,
          customerId: quotation.customerId || quotation.leadId || quotation.id,
          amount: quotation.finalAmount || quotation.amount || 0
        })),
    [quotations]
  );
  const selectedCreateQuotation = useMemo(
    () => quotationOptions.find((quotation) => quotation.id === createForm.quotationId),
    [createForm.quotationId, quotationOptions]
  );

  const filteredRows = useMemo(() => {
    const timeBounds = getTimeRangeBounds(timeRangeType, customStartDate, customEndDate);

    return rows.filter((row) => {
      if (statusFilter !== 'ALL' && row.approvalStage !== statusFilter) return false;
      if (businessGroupFilter !== 'ALL' && row.businessGroup !== businessGroupFilter) return false;
      if (businessTypeFilter !== 'ALL' && row.businessType !== businessTypeFilter) return false;
      if (paymentMethodFilter !== 'ALL' && row.paymentMethodLabel !== paymentMethodFilter) return false;
      if (proofFilter !== 'ALL' && row.proofLabel !== proofFilter) return false;
      if (creatorFilter !== 'ALL' && row.creatorLabel !== creatorFilter) return false;

      if (timeBounds) {
        const rowDate = new Date(row.transaction.paidAt || row.transaction.createdAt);
        if (Number.isNaN(rowDate.getTime())) return false;
        if (timeBounds.start && rowDate < timeBounds.start) return false;
        if (timeBounds.end && rowDate > timeBounds.end) return false;
      }

      const q = search.trim().toLowerCase();
      if (!q) return true;

      return [
        row.transactionCode,
        row.businessGroupLabel,
        row.businessType,
        row.relatedEntity,
        row.contractCode,
        row.paymentMethodLabel,
        row.proofLabel,
        row.proofValue,
        row.creatorLabel,
        row.noteLabel,
        row.transaction.customerId
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [
    businessGroupFilter,
    businessTypeFilter,
    creatorFilter,
    customEndDate,
    customStartDate,
    paymentMethodFilter,
    proofFilter,
    rows,
    search,
    statusFilter,
    timeRangeType
  ]);

  const activeFilterCount = useMemo(
    () =>
      [
        statusFilter !== 'ALL',
        businessGroupFilter !== 'ALL',
        businessTypeFilter !== 'ALL',
        paymentMethodFilter !== 'ALL',
        proofFilter !== 'ALL',
        creatorFilter !== 'ALL',
        groupBy.length > 0
      ].filter(Boolean).length,
    [businessGroupFilter, businessTypeFilter, creatorFilter, groupBy.length, paymentMethodFilter, proofFilter, statusFilter]
  );
  const hasAnyActiveTools = activeFilterCount > 0 || timeRangeType !== 'all';

  const getGroupByValue = (row: TransactionRow, key: FinanceGroupByKey) => {
    switch (key) {
      case 'approvalStage':
        return APPROVAL_FILTER_LABEL_MAP[row.approvalStage];
      case 'businessGroup':
        return row.businessGroupLabel;
      case 'businessType':
        return row.businessType;
      case 'paymentMethod':
        return row.paymentMethodLabel;
      case 'proof':
        return row.proofLabel;
      case 'creator':
        return row.creatorLabel;
      default:
        return '-';
    }
  };

  const groupedRows = useMemo(() => {
    if (groupBy.length === 0) return [];

    const groups = new Map<string, TransactionRow[]>();

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

    if (statusFilter !== 'ALL') {
      chips.push({ key: 'status', label: `Hành động: ${APPROVAL_FILTER_LABEL_MAP[statusFilter]}` });
    }

    if (businessGroupFilter !== 'ALL') {
      chips.push({ key: 'businessGroup', label: `Nhóm NV: ${getBusinessGroupLabel(businessGroupFilter)}` });
    }

    if (businessTypeFilter !== 'ALL') {
      chips.push({ key: 'businessType', label: `Loại NV: ${businessTypeFilter}` });
    }

    if (paymentMethodFilter !== 'ALL') {
      chips.push({ key: 'paymentMethod', label: `Thanh toán: ${paymentMethodFilter}` });
    }

    if (proofFilter !== 'ALL') {
      chips.push({ key: 'proof', label: `Chứng từ: ${proofFilter}` });
    }

    if (creatorFilter !== 'ALL') {
      chips.push({ key: 'creator', label: `Người tạo: ${creatorFilter}` });
    }

    if (timeRangeType !== 'all') {
      chips.push({
        key: 'time',
        label: `Thời gian: ${
          timeRangeType === 'custom'
            ? formatCustomDateRangeLabel(customStartDate, customEndDate)
            : TIME_RANGE_PRESETS.find((item) => item.id === timeRangeType)?.label || 'Tất cả thời gian'
        }`
      });
    }

    if (groupBy.length > 0) {
      chips.push({
        key: 'groupBy',
        label: `Nhóm theo: ${groupBy.map((key) => GROUP_BY_OPTIONS.find((option) => option.key === key)?.label || key).join(', ')}`
      });
    }

    return chips;
  }, [businessGroupFilter, businessTypeFilter, creatorFilter, customEndDate, customStartDate, groupBy, paymentMethodFilter, proofFilter, statusFilter, timeRangeType]);

  const removeSearchChip = (chipKey: string) => {
    if (chipKey === 'status') setStatusFilter('ALL');
    if (chipKey === 'businessGroup') setBusinessGroupFilter('ALL');
    if (chipKey === 'businessType') setBusinessTypeFilter('ALL');
    if (chipKey === 'paymentMethod') setPaymentMethodFilter('ALL');
    if (chipKey === 'proof') setProofFilter('ALL');
    if (chipKey === 'creator') setCreatorFilter('ALL');
    if (chipKey === 'time') {
      setTimeRangeType('all');
      setCustomStartDate('');
      setCustomEndDate('');
    }
    if (chipKey === 'groupBy') setGroupBy([]);
  };

  const clearAllSearchFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setBusinessGroupFilter('ALL');
    setBusinessTypeFilter('ALL');
    setPaymentMethodFilter('ALL');
    setProofFilter('ALL');
    setCreatorFilter('ALL');
    setGroupBy([]);
    setTimeRangeType('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setDraftTimeRangeType('all');
    setDraftCustomStartDate('');
    setDraftCustomEndDate('');
    setFiltersOpen(false);
  };

  const getNextTransactionCode = (businessGroup: BusinessGroup) => {
    const prefix = businessGroup === 'THU' ? 'KT' : businessGroup === 'CHI' ? 'KC' : 'DC';
    const padding = businessGroup === 'CHI' ? 5 : 4;
    let maxValue = 0;

    rows.forEach((row, index) => {
      const candidateCode =
        row.transaction.code ||
        (row.businessGroup === 'THU'
          ? `KT${String(index + 1).padStart(4, '0')}`
          : row.businessGroup === 'CHI'
            ? `KC${String(index + 1).padStart(5, '0')}`
            : `DC${String(index + 1).padStart(4, '0')}`);

      if (!candidateCode.startsWith(prefix)) return;
      const numeric = Number.parseInt(candidateCode.slice(prefix.length), 10);
      if (Number.isFinite(numeric)) {
        maxValue = Math.max(maxValue, numeric);
      }
    });

    return `${prefix}${String(maxValue + 1).padStart(padding, '0')}`;
  };

  const resetCreateForm = () => setCreateForm(createInitialTransactionForm());

  const handleOpenCreateModal = () => {
    setFiltersOpen(false);
    setIsTimeMenuOpen(false);
    setIsColumnMenuOpen(false);
    resetCreateForm();
    setIsCreateModalOpen(true);
  };

  const handleChangeCreateBusinessGroup = (businessGroup: BusinessGroup) => {
    setCreateForm((current) => ({
      ...current,
      businessGroup,
      businessType: BUSINESS_TYPE_OPTIONS[businessGroup][0],
      quotationId: businessGroup === 'THU' ? current.quotationId : ''
    }));
  };

  const handleChangeCreateQuotation = (quotationId: string) => {
    const selectedQuotation = quotationOptions.find((quotation) => quotation.id === quotationId);
    setCreateForm((current) => ({
      ...current,
      quotationId,
      relatedEntity: selectedQuotation ? selectedQuotation.customerName : current.relatedEntity,
      amount: selectedQuotation && !current.amount ? String(selectedQuotation.amount) : current.amount
    }));
  };

  const handleCreateProofFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] || null;
    setCreateForm((current) => ({ ...current, proofFile: nextFile }));
  };

  const handleCreateTransaction = async () => {
    if (!createForm.relatedEntity.trim()) {
      alert('Vui lòng nhập đối tượng liên quan');
      return;
    }

    if (createForm.businessGroup === 'THU' && !createForm.quotationId) {
      alert('Vui lòng chọn hợp đồng học viên');
      return;
    }

    const amount = Number.parseInt(createForm.amount.replace(/[^\d]/g, ''), 10);
    if (!Number.isFinite(amount) || amount <= 0) {
      alert('Vui lòng nhập số tiền hợp lệ');
      return;
    }

    if (!createForm.proofFile) {
      alert('Vui lòng attach chứng từ trước khi tạo phiếu duyệt.');
      return;
    }

    setIsSubmittingCreate(true);

    try {
      const createdAt = Date.now();
      const paidAt = createForm.paidDate ? new Date(`${createForm.paidDate}T00:00:00`).getTime() : createdAt;
      const proofUrl = createForm.proofFile ? await readFileAsDataUrl(createForm.proofFile) : '';
      const newTransaction: ITransaction = {
        id: `TRX-${createdAt}`,
        code: getNextTransactionCode(createForm.businessGroup),
        quotationId: createForm.quotationId,
        soCode: selectedCreateQuotation?.soCode || '',
        customerId: selectedCreateQuotation?.customerId || createForm.relatedEntity.trim(),
        studentName: createForm.businessGroup === 'THU' ? createForm.relatedEntity.trim() : undefined,
        relatedEntityLabel: createForm.relatedEntity.trim(),
        amount,
        method: createForm.method,
        proofType: createForm.proofFile ? (createForm.method === 'CHUYEN_KHOAN' ? 'UNC' : 'PHIEU_THU') : 'NONE',
        proofFiles: createForm.proofFile
          ? [{ id: `PF-${createdAt}`, name: createForm.proofFile.name, url: proofUrl }]
          : [],
        bankRefCode: createForm.method === 'CHUYEN_KHOAN' && createForm.proofFile ? createForm.proofFile.name : '',
        status: 'CHO_DUYET',
        paidAt,
        createdAt,
        createdBy: user?.id || 'accountant',
        businessGroupHint: createForm.businessGroup,
        businessTypeHint: createForm.businessType,
        note: createForm.note.trim()
      };

      addTransaction(newTransaction);
      setIsCreateModalOpen(false);
      resetCreateForm();
      loadData();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Không thể tạo phiếu duyệt');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const timeRangeLabel =
    timeRangeType === 'custom'
      ? formatCustomDateRangeLabel(customStartDate, customEndDate)
      : TIME_RANGE_PRESETS.find((item) => item.id === timeRangeType)?.label || 'Tất cả thời gian';

  const syncDraftTimeRangeFromApplied = () => {
    setDraftTimeRangeType(timeRangeType);
    setDraftCustomStartDate(customStartDate);
    setDraftCustomEndDate(customEndDate);
  };

  const handleSelectDraftTimePreset = (presetId: TimeRangeType) => {
    setDraftTimeRangeType(presetId);

    if (presetId === 'custom') {
      return;
    }

    const { start, end } = getTimeRangePresetValues(presetId);
    setDraftCustomStartDate(start);
    setDraftCustomEndDate(end);
  };

  const handleOpenTimeMenu = () => {
    if (!isTimeMenuOpen) {
      syncDraftTimeRangeFromApplied();
      setIsColumnMenuOpen(false);
      setFiltersOpen(false);
    }

    setIsTimeMenuOpen((current) => !current);
  };

  const handleResetDraftTimeRange = () => {
    setDraftTimeRangeType('all');
    setDraftCustomStartDate('');
    setDraftCustomEndDate('');
  };

  const handleCancelTimeMenu = () => {
    syncDraftTimeRangeFromApplied();
    setIsTimeMenuOpen(false);
  };

  const handleApplyTimeMenu = () => {
    const shouldFallbackToAll = draftTimeRangeType === 'custom' && !draftCustomStartDate && !draftCustomEndDate;
    const nextRangeType = shouldFallbackToAll ? 'all' : draftTimeRangeType;
    const nextEndDate =
      draftCustomStartDate && draftCustomEndDate && draftCustomEndDate < draftCustomStartDate ? draftCustomStartDate : draftCustomEndDate;

    setTimeRangeType(nextRangeType);
    setCustomStartDate(nextRangeType === 'all' ? '' : draftCustomStartDate);
    setCustomEndDate(nextRangeType === 'all' ? '' : nextEndDate);
    setDraftTimeRangeType(nextRangeType);
    setDraftCustomEndDate(nextEndDate);
    setIsTimeMenuOpen(false);
  };

  const toggleGroupBy = (groupKey: FinanceGroupByKey) => {
    setGroupBy((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }

      return GROUP_BY_OPTIONS.map((option) => option.key).filter((key) => next.has(key));
    });
  };

  const handleToggleAdvancedFilters = () => {
    setIsTimeMenuOpen(false);
    setIsColumnMenuOpen(false);
    setFiltersOpen((current) => !current);
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

  const handleApprove = (id: string) => {
    const res = approveTransaction(id, user?.id || 'accountant', user?.role as UserRole | undefined);
    if (!res.ok) {
      alert(res.error || 'Không thể duyệt giao dịch');
      return;
    }
    loadData();
  };

  const handleReject = (id: string) => {
    const reason = window.prompt('Nhập lý do từ chối giao dịch:', 'Thiếu chứng từ');
    const res = rejectTransaction(id, user?.id || 'accountant', user?.role as UserRole | undefined, reason || undefined);
    if (!res.ok) {
      alert(res.error || 'Không thể từ chối giao dịch');
      return;
    }
    loadData();
  };

  const handleUndoApprove = (row: TransactionRow) => {
    const confirm = window.confirm(`Bạn có chắc muốn hủy approve giao dịch ${row.transactionCode}?`);
    if (!confirm) return;

    if (row.isLocked && row.quotation) {
      const unlockRes = unlockQuotationAfterAccounting(row.quotation.id, user?.id || 'accountant', user?.role as UserRole | undefined);
      if (!unlockRes.ok) {
        alert(unlockRes.error || 'Không thể hủy approve giao dịch');
        return;
      }
    }

    const nextTransactions = transactions.map((item) =>
      item.id === row.transaction.id
        ? {
            ...item,
            status: 'CHO_DUYET' as const,
            note: `Hủy approve${item.note ? ` | ${item.note}` : ''}`
          }
        : item
    );
    saveTransactions(nextTransactions);

    if (row.quotation) {
      updateQuotation({
        ...row.quotation,
        status: row.quotation.status === QuotationStatus.LOCKED ? QuotationStatus.SALE_CONFIRMED : row.quotation.status,
        transactionStatus: 'CHO_DUYET',
        updatedAt: new Date().toISOString()
      });
    }

    removeActualTransactionByRelatedId(row.transaction.id);

    loadData();
  };

  const handleComplete = (row: TransactionRow) => {
    if (!row.quotation) {
      alert('Không tìm thấy hợp đồng/SO liên quan');
      return;
    }

    const res = lockQuotationAfterAccounting(row.quotation.id, user?.id || 'accountant', user?.role as UserRole | undefined);
    if (!res.ok) {
      alert(res.error || 'Không thể hoàn tất giao dịch');
      return;
    }

    loadData();
  };

  const renderTransactionRow = (row: TransactionRow) => (
    <tr key={row.transaction.id} className="hover:bg-slate-50 align-top">
      {visibleColumns.includes('transactionCode') && (
        <td className="px-3 py-2.5">
          <div className="font-bold text-indigo-700">{row.transactionCode}</div>
          <div className="text-[11px] text-slate-500">{row.transaction.id}</div>
        </td>
      )}
      {visibleColumns.includes('businessGroup') && (
        <td className="px-3 py-2.5">
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${
              row.businessGroup === 'THU'
                ? 'bg-emerald-50 text-emerald-700'
                : row.businessGroup === 'CHI'
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-indigo-50 text-indigo-700'
            }`}
          >
            {row.businessGroupLabel}
          </span>
        </td>
      )}
      {visibleColumns.includes('businessType') && <td className="px-3 py-2.5 font-semibold text-slate-700 whitespace-nowrap">{row.businessType}</td>}
      {visibleColumns.includes('relatedEntity') && (
        <td className="px-3 py-2.5">
          <div className="font-semibold text-slate-800">{row.relatedEntity}</div>
          <div className="text-[11px] text-slate-500">{row.transaction.customerId || '-'}</div>
        </td>
      )}
      {visibleColumns.includes('contractCode') && (
        <td className="px-3 py-2.5">
          <div className="font-bold text-blue-700">{row.contractCode}</div>
          <div className="text-[11px] text-slate-500">{row.quotation?.customerName || '-'}</div>
        </td>
      )}
      {visibleColumns.includes('amount') && <td className="px-3 py-2.5 text-right font-bold whitespace-nowrap">{formatMoney(row.transaction.amount)}</td>}
      {visibleColumns.includes('paymentMethod') && (
        <td className="px-3 py-2.5">
          <div className="font-semibold">{row.paymentMethodLabel}</div>
          <div className="text-[11px] text-slate-500">{row.businessGroupLabel}</div>
        </td>
      )}
      {visibleColumns.includes('proof') && (
        <td className="px-3 py-2.5">
          <div className="font-semibold">{row.proofLabel}</div>
          <div className="max-w-[180px] break-all text-[11px] text-slate-500">{row.proofValue}</div>
        </td>
      )}
      {visibleColumns.includes('paidAt') && <td className="px-3 py-2.5 whitespace-nowrap">{row.paidAtLabel}</td>}
      {visibleColumns.includes('creator') && <td className="px-3 py-2.5 whitespace-nowrap">{row.creatorLabel}</td>}
      {visibleColumns.includes('createdAt') && <td className="px-3 py-2.5 whitespace-nowrap">{row.createdAtLabel}</td>}
      {visibleColumns.includes('approvalStage') && (
        <td className="px-3 py-2.5">
          <ApprovalStageView stage={row.approvalStage} requiresCeoApproval={row.requiresCeoApproval} />
        </td>
      )}
      {visibleColumns.includes('note') && (
        <td className="px-3 py-2.5 min-w-[220px]">
          <div className="text-sm text-slate-700 whitespace-pre-wrap break-words">{row.noteLabel}</div>
        </td>
      )}
      <td className="px-3 py-2.5 text-right">
        {row.transaction.status === 'CHO_DUYET' ? (
          <div className="flex justify-end gap-2">
            <button
              onClick={() => handleReject(row.transaction.id)}
              className="px-2.5 py-1.5 rounded border border-rose-200 text-rose-700 text-xs font-bold"
            >
              Từ chối
            </button>
            <button
              onClick={() => handleApprove(row.transaction.id)}
              className="px-2.5 py-1.5 rounded bg-emerald-600 text-white text-xs font-bold inline-flex items-center gap-1"
            >
              <CheckCircle2 size={12} /> Duyệt
            </button>
          </div>
        ) : row.transaction.status === 'DA_DUYET' ? (
          <div className="flex justify-end gap-2">
            <button
              onClick={() => handleUndoApprove(row)}
              className="px-2.5 py-1.5 rounded border border-amber-300 text-amber-700 text-xs font-bold inline-flex items-center gap-1"
            >
              <RotateCcw size={12} /> Hủy approve
            </button>
            {!row.isLocked && (
              <button
                onClick={() => handleComplete(row)}
                className="px-2.5 py-1.5 rounded bg-slate-800 text-white text-xs font-bold inline-flex items-center gap-1"
              >
                <FileText size={12} /> Hoàn tất
              </button>
            )}
          </div>
        ) : (
          <span className="text-xs text-slate-400 inline-flex items-center gap-1">
            <XCircle size={12} />
            Không khả dụng
          </span>
        )}
      </td>
    </tr>
  );

  return (
    <div className="p-6 max-w-[1700px] mx-auto font-sans text-slate-800">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Duyệt giao dịch kế toán</h1>
          <p className="text-slate-500 text-sm mt-1">Hiển thị đầy đủ chứng từ, luồng duyệt và trạng thái hoàn tất đồng bộ về Thu Chi.</p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
        >
          <Plus size={16} />
          Tạo phiếu duyệt
        </button>
      </div>

      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl flex-1">
          <PinnedSearchInput
            value={search}
            onChange={setSearch}
            placeholder="Tìm theo mã giao dịch, loại nghiệp vụ, đối tượng, hợp đồng..."
            chips={activeSearchChips}
            onRemoveChip={removeSearchChip}
            onClearAll={clearAllSearchFilters}
            clearAllAriaLabel="Xóa tất cả bộ lọc duyệt giao dịch"
            inputClassName="text-sm h-7"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          <div className="flex overflow-visible rounded-lg border border-slate-200 bg-white">
            <div className="flex items-center px-3 py-1.5">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as ApprovalFilter)}
                className="min-w-[140px] bg-transparent text-sm font-semibold text-slate-700 outline-none"
              >
                {(['ALL', 'CHO_DUYET', 'KE_TOAN_DUYET', 'CEO_DUYET', 'HOAN_TAT', 'TU_CHOI'] as ApprovalFilter[]).map((item) => (
                  <option key={item} value={item}>
                    {APPROVAL_FILTER_LABEL_MAP[item]}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative border-l border-slate-200" ref={timeMenuRef}>
              <button
                type="button"
                onClick={handleOpenTimeMenu}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-semibold ${
                  isTimeMenuOpen ? 'bg-slate-50 text-slate-900' : 'text-slate-700'
                }`}
              >
                <Calendar size={14} className="text-slate-400" />
                <span className="min-w-[170px] text-left">{timeRangeLabel}</span>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${isTimeMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isTimeMenuOpen && (
                <div className="absolute right-0 top-full z-30 mt-3 w-[520px] rounded-2xl border border-slate-200 bg-white shadow-xl">
                  <div className="flex overflow-hidden rounded-2xl">
                    <div className="w-36 border-r border-slate-100 bg-slate-50 p-1.5">
                      <div className="space-y-1">
                        {TIME_RANGE_PRESETS.map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => handleSelectDraftTimePreset(preset.id)}
                            className={`w-full rounded-xl px-3 py-1.5 text-left text-sm font-semibold leading-5 ${
                              draftTimeRangeType === preset.id ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex min-h-[170px] flex-1 flex-col p-3">
                      <div className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-300">Khoảng thời gian tùy chỉnh</div>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="text-sm">
                          <span className="mb-1 block text-xs font-semibold text-slate-400">Từ ngày</span>
                          <input
                            type="date"
                            value={draftCustomStartDate}
                            onChange={(event) => {
                              setDraftTimeRangeType('custom');
                              setDraftCustomStartDate(event.target.value);
                              if (draftCustomEndDate && event.target.value && draftCustomEndDate < event.target.value) {
                                setDraftCustomEndDate(event.target.value);
                              }
                            }}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-blue-500"
                          />
                        </label>

                        <label className="text-sm">
                          <span className="mb-1 block text-xs font-semibold text-slate-400">Đến ngày</span>
                          <input
                            type="date"
                            value={draftCustomEndDate}
                            min={draftCustomStartDate || undefined}
                            onChange={(event) => {
                              setDraftTimeRangeType('custom');
                              setDraftCustomEndDate(event.target.value);
                            }}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-blue-500"
                          />
                        </label>
                      </div>

                      <div className="mt-auto flex items-center justify-between pt-2">
                        <button
                          type="button"
                          onClick={handleResetDraftTimeRange}
                          className="text-sm font-semibold text-slate-400 hover:text-slate-600"
                        >
                          Làm lại
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleCancelTimeMenu}
                            className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50"
                          >
                            Hủy
                          </button>
                          <button
                            type="button"
                            onClick={handleApplyTimeMenu}
                            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white"
                          >
                            Áp dụng
                          </button>
                        </div>
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
              onClick={handleToggleAdvancedFilters}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-semibold transition-colors ${
                filtersOpen || activeFilterCount ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Filter size={15} />
              Lọc nâng cao
              {activeFilterCount > 0 && <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[11px] font-bold text-white">{activeFilterCount}</span>}
            </button>

            {filtersOpen && (
              <div className="absolute right-0 top-full z-20 mt-3 w-full min-w-[620px] max-w-[680px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                <button
                  type="button"
                  onClick={() => setFiltersOpen(false)}
                  className="absolute right-3 top-3 rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50"
                >
                  Đóng
                </button>

                <div className="grid grid-cols-[1fr_0.9fr] items-start">
                  <div className="border-r border-slate-100 p-3">
                    <div className="mb-2 flex items-center gap-2 text-base font-semibold text-slate-800">
                      <Filter size={18} className="text-slate-700" />
                      <span>Bộ lọc</span>
                    </div>

                    <div className="space-y-2">
                      <div className="space-y-1">
                        <select
                          value={statusFilter}
                          onChange={(event) => setStatusFilter(event.target.value as ApprovalFilter)}
                          className="w-full border-0 bg-transparent px-0 py-0 text-sm font-medium leading-5 text-slate-700 outline-none"
                        >
                          {(['ALL', 'CHO_DUYET', 'KE_TOAN_DUYET', 'CEO_DUYET', 'HOAN_TAT', 'TU_CHOI'] as ApprovalFilter[]).map((item) => (
                            <option key={item} value={item}>
                              {APPROVAL_FILTER_LABEL_MAP[item]}
                            </option>
                          ))}
                        </select>

                        <select
                          value={businessGroupFilter}
                          onChange={(event) => setBusinessGroupFilter(event.target.value as 'ALL' | BusinessGroup)}
                          className="w-full border-0 bg-transparent px-0 py-0 text-sm font-medium leading-5 text-slate-700 outline-none"
                        >
                          <option value="ALL">Tất cả nhóm nghiệp vụ</option>
                          {(['THU', 'CHI', 'DIEU_CHINH'] as BusinessGroup[]).map((item) => (
                            <option key={item} value={item}>
                              {getBusinessGroupLabel(item)}
                            </option>
                          ))}
                        </select>

                        <select
                          value={creatorFilter}
                          onChange={(event) => setCreatorFilter(event.target.value)}
                          className="w-full border-0 bg-transparent px-0 py-0 text-sm font-medium leading-5 text-slate-700 outline-none"
                        >
                          <option value="ALL">Tất cả người tạo</option>
                          {creatorOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="border-t border-slate-100 pt-2">
                        <div className="space-y-1">
                          <select
                            value={businessTypeFilter}
                            onChange={(event) => setBusinessTypeFilter(event.target.value)}
                            className="w-full border-0 bg-transparent px-0 py-0 text-sm font-medium leading-5 text-slate-700 outline-none"
                          >
                            <option value="ALL">Tất cả loại nghiệp vụ</option>
                            {businessTypeOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>

                          <select
                            value={paymentMethodFilter}
                            onChange={(event) => setPaymentMethodFilter(event.target.value)}
                            className="w-full border-0 bg-transparent px-0 py-0 text-sm font-medium leading-5 text-slate-700 outline-none"
                          >
                            <option value="ALL">Tất cả hình thức thanh toán</option>
                            {paymentMethodOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>

                          <select
                            value={proofFilter}
                            onChange={(event) => setProofFilter(event.target.value)}
                            className="w-full border-0 bg-transparent px-0 py-0 text-sm font-medium leading-5 text-slate-700 outline-none"
                          >
                            <option value="ALL">Tất cả chứng từ</option>
                            {proofOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3">
                    <div className="mb-2">
                      <div className="flex items-center gap-2 text-base font-semibold text-slate-800">
                        <Rows3 size={18} className="text-slate-700" />
                        <span>Nhóm theo</span>
                      </div>
                      {groupBy.length > 0 && (
                        <div className="mt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => setGroupBy([])}
                            className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50"
                          >
                            Bỏ nhóm
                          </button>
                        </div>
                      )}
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

          {hasAnyActiveTools && (
            <button
              type="button"
              onClick={clearAllSearchFilters}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-500 hover:bg-slate-50"
            >
              Xóa lọc
            </button>
          )}

          <div className="relative" ref={columnMenuRef}>
            <button
              type="button"
              onClick={() => {
                setIsTimeMenuOpen(false);
                setFiltersOpen(false);
                setIsColumnMenuOpen((current) => !current);
              }}
              className={`inline-flex items-center gap-2 rounded px-3 py-1.5 text-sm font-semibold ${
                isColumnMenuOpen ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              <Columns3 size={14} />
              Cột
            </button>

            {isColumnMenuOpen && (
              <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
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

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[11px] border-b border-slate-200">
              <tr>
                {visibleColumns.includes('transactionCode') && <th className="px-3 py-2.5">Mã giao dịch</th>}
                {visibleColumns.includes('businessGroup') && <th className="px-3 py-2.5">Nhóm NV</th>}
                {visibleColumns.includes('businessType') && <th className="px-3 py-2.5">Loại nghiệp vụ</th>}
                {visibleColumns.includes('relatedEntity') && <th className="px-3 py-2.5">Đối tượng</th>}
                {visibleColumns.includes('contractCode') && <th className="px-3 py-2.5">Hợp đồng</th>}
                {visibleColumns.includes('amount') && <th className="px-3 py-2.5 text-right">Số tiền</th>}
                {visibleColumns.includes('paymentMethod') && <th className="px-3 py-2.5">Thanh toán</th>}
                {visibleColumns.includes('proof') && <th className="px-3 py-2.5">Chứng từ</th>}
                {visibleColumns.includes('paidAt') && <th className="px-3 py-2.5">Ngày thanh toán</th>}
                {visibleColumns.includes('creator') && <th className="px-3 py-2.5">Người tạo</th>}
                {visibleColumns.includes('createdAt') && <th className="px-3 py-2.5">Ngày tạo</th>}
                {visibleColumns.includes('approvalStage') && <th className="px-3 py-2.5">Trạng thái duyệt</th>}
                {visibleColumns.includes('note') && <th className="px-3 py-2.5">Ghi chú</th>}
                <th className="px-3 py-2.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.length ? (
                groupBy.length === 0 ? (
                  filteredRows.map((row) => renderTransactionRow(row))
                ) : (
                  groupedRows.map((group) => (
                    <React.Fragment key={group.label}>
                      <tr className="bg-slate-50/80">
                        <td colSpan={visibleColumns.length + 1} className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                          {group.label}
                          <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] text-slate-700">{group.items.length}</span>
                        </td>
                      </tr>
                      {group.items.map((row) => renderTransactionRow(row))}
                    </React.Fragment>
                  ))
                )
              ) : (
                <tr>
                  <td colSpan={visibleColumns.length + 1} className="text-center py-10 text-slate-500">
                    Không có giao dịch phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Tạo phiếu duyệt giao dịch</h2>
                <p className="mt-1 text-sm text-slate-500">Điền thông tin nghiệp vụ, tiền và chứng từ để tạo phiếu duyệt mới.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  resetCreateForm();
                }}
                className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-500 hover:bg-slate-50"
              >
                Đóng
              </button>
            </div>

            <div className="space-y-6 p-6">
              <section className="rounded-2xl border border-slate-200 p-5">
                <div className="mb-4">
                  <h3 className="text-base font-bold text-slate-900">1. Thông tin nghiệp vụ</h3>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="text-sm">
                    <span className="mb-1.5 block font-semibold text-slate-700">Nhóm nghiệp vụ</span>
                    <select
                      value={createForm.businessGroup}
                      onChange={(event) => handleChangeCreateBusinessGroup(event.target.value as BusinessGroup)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500"
                    >
                      <option value="THU">Thu</option>
                      <option value="CHI">Chi</option>
                      <option value="DIEU_CHINH">Điều chỉnh</option>
                    </select>
                  </label>

                  <label className="text-sm">
                    <span className="mb-1.5 block font-semibold text-slate-700">Loại nghiệp vụ</span>
                    <select
                      value={createForm.businessType}
                      onChange={(event) => setCreateForm((current) => ({ ...current, businessType: event.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500"
                    >
                      {BUSINESS_TYPE_OPTIONS[createForm.businessGroup].map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm">
                    <span className="mb-1.5 block font-semibold text-slate-700">Đối tượng liên quan</span>
                    <input
                      value={createForm.relatedEntity}
                      onChange={(event) => setCreateForm((current) => ({ ...current, relatedEntity: event.target.value }))}
                      placeholder="Nhập học viên / đối tác / nhà cung cấp..."
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500"
                    />
                  </label>

                  <label className="text-sm">
                    <span className="mb-1.5 block font-semibold text-slate-700">Hợp đồng HV</span>
                    <select
                      value={createForm.quotationId}
                      onChange={(event) => handleChangeCreateQuotation(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500"
                    >
                      <option value="">Chọn hợp đồng (nếu có)</option>
                      {quotationOptions.map((quotation) => (
                        <option key={quotation.id} value={quotation.id}>
                          {quotation.label}
                        </option>
                      ))}
                    </select>
                    {createForm.businessGroup === 'THU' && <span className="mt-1 block text-xs text-slate-400">Bắt buộc với giao dịch thu học viên.</span>}
                  </label>

                  <label className="text-sm md:col-span-2">
                    <span className="mb-1.5 block font-semibold text-slate-700">Nội dung</span>
                    <textarea
                      value={createForm.note}
                      onChange={(event) => setCreateForm((current) => ({ ...current, note: event.target.value }))}
                      rows={3}
                      placeholder="Mô tả nội dung nghiệp vụ..."
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500"
                    />
                  </label>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 p-5">
                <div className="mb-4">
                  <h3 className="text-base font-bold text-slate-900">2. Thông tin tiền</h3>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <label className="text-sm">
                    <span className="mb-1.5 block font-semibold text-slate-700">Số tiền</span>
                    <input
                      value={createForm.amount}
                      onChange={(event) => setCreateForm((current) => ({ ...current, amount: event.target.value }))}
                      inputMode="numeric"
                      placeholder="Ví dụ: 10000000"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500"
                    />
                  </label>

                  <label className="text-sm">
                    <span className="mb-1.5 block font-semibold text-slate-700">Hình thức</span>
                    <select
                      value={createForm.method}
                      onChange={(event) => setCreateForm((current) => ({ ...current, method: event.target.value as 'CHUYEN_KHOAN' | 'TIEN_MAT' }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500"
                    >
                      <option value="CHUYEN_KHOAN">Chuyển khoản</option>
                      <option value="TIEN_MAT">Tiền mặt</option>
                    </select>
                  </label>

                  <label className="text-sm">
                    <span className="mb-1.5 block font-semibold text-slate-700">Ngày thanh toán</span>
                    <input
                      type="date"
                      value={createForm.paidDate}
                      onChange={(event) => setCreateForm((current) => ({ ...current, paidDate: event.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500"
                    />
                  </label>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 p-5">
                <div className="mb-4">
                  <h3 className="text-base font-bold text-slate-900">3. Upload chứng từ</h3>
                </div>
                <label className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center hover:bg-slate-100">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    <UploadCloud size={22} />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800">{createForm.proofFile ? createForm.proofFile.name : 'Tải lên chứng từ'}</div>
                    <div className="text-sm text-slate-500">Ảnh / PDF, kéo thả hoặc bấm để chọn</div>
                  </div>
                  <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleCreateProofFileChange} />
                </label>
              </section>

              <section className="rounded-2xl border border-slate-200 p-5">
                <div className="mb-4">
                  <h3 className="text-base font-bold text-slate-900">4. Hệ thống chung</h3>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <div className="rounded-xl bg-slate-50 px-3 py-3 text-sm">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Người tạo</div>
                    <div className="mt-1 font-semibold text-slate-800">{user?.name || user?.id || 'Kế toán'}</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-3 text-sm">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Ngày tạo</div>
                    <div className="mt-1 font-semibold text-slate-800">{new Date().toLocaleDateString('vi-VN')}</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-3 text-sm">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Trạng thái</div>
                    <div className="mt-1 font-semibold text-slate-800">Nháp</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-3 text-sm">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Mã giao dịch</div>
                    <div className="mt-1 font-semibold text-slate-800">Tự sinh khi lưu</div>
                  </div>
                </div>
              </section>
            </div>

            <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-slate-100 bg-white px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  resetCreateForm();
                }}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleCreateTransaction}
                disabled={isSubmittingCreate}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus size={16} />
                {isSubmittingCreate ? 'Đang tạo...' : 'Tạo phiếu duyệt'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceTransactions;
