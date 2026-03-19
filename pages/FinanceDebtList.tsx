import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, Check, ChevronDown, Columns3, Filter } from 'lucide-react';
import { getClassStudents, getContracts, getQuotations, getSalesTeams, getStudents, getTrainingClasses } from '../utils/storage';
import { IClassStudent, IContract, IQuotation } from '../types';
import PinnedSearchInput, { PinnedSearchChip } from '../components/PinnedSearchInput';

type DebtPaymentStatus = 'CHUA_THU' | 'DA_THU_MOT_PHAN' | 'THU_DU' | 'DA_HUY';
type DebtQuickFilter = 'ALL' | 'CHUA_THU' | 'DA_THU_MOT_PHAN' | 'THU_DU' | 'DA_HUY' | 'QUA_HAN';
type DebtPageTab = 'ALL' | 'OVERDUE' | 'PAID';
type TimeRangeType = 'all' | 'today' | 'yesterday' | 'thisWeek' | 'last7Days' | 'last30Days' | 'thisMonth' | 'lastMonth' | 'custom';
type DebtAdvancedFieldId = 'paymentStatus' | 'programName' | 'servicePackage' | 'chargeName' | 'ownerName' | 'branchName';
type DebtGroupFieldId = DebtAdvancedFieldId;
type DebtColumnId =
  | 'collectionCode'
  | 'studentName'
  | 'contractCode'
  | 'programName'
  | 'servicePackage'
  | 'chargeName'
  | 'amountDue'
  | 'overdueDays'
  | 'paidAmount'
  | 'remainingAmount'
  | 'dueDate'
  | 'paymentStatus'
  | 'ownerName'
  | 'branchName'
  | 'note';

type DebtRow = {
  id: string;
  collectionCode: string;
  studentName: string;
  contractCode: string;
  programName: string;
  servicePackage: string;
  chargeName: string;
  amountDue: number;
  overdueDays: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: string;
  paymentStatus: DebtPaymentStatus;
  ownerName: string;
  branchName: string;
  note: string;
};

const STATUS_META: Record<DebtPaymentStatus, { label: string; badge: string }> = {
  CHUA_THU: { label: 'Chưa thu', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
  DA_THU_MOT_PHAN: { label: 'Đã thu 1 phần', badge: 'bg-amber-100 text-amber-700 border-amber-200' },
  THU_DU: { label: 'Thu đủ', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  DA_HUY: { label: 'Đã hủy', badge: 'bg-rose-100 text-rose-700 border-rose-200' }
};

const SERVICE_TYPE_LABEL: Record<IQuotation['serviceType'], string> = {
  StudyAbroad: 'Du học',
  Training: 'Đào tạo',
  Combo: 'Combo'
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
const COLUMN_OPTIONS: Array<{ id: DebtColumnId; label: string; align?: 'left' | 'right' }> = [
  { id: 'collectionCode', label: 'Mã đợt thu / khoản thu' },
  { id: 'studentName', label: 'Học viên' },
  { id: 'contractCode', label: 'Hợp đồng' },
  { id: 'programName', label: 'Chương trình' },
  { id: 'servicePackage', label: 'Gói dịch vụ' },
  { id: 'chargeName', label: 'Tên khoản thu' },
  { id: 'amountDue', label: 'Số tiền phải thu', align: 'right' },
  { id: 'overdueDays', label: 'Số ngày quá hạn' },
  { id: 'paidAmount', label: 'Đã thu', align: 'right' },
  { id: 'remainingAmount', label: 'Còn lại', align: 'right' },
  { id: 'dueDate', label: 'Ngày đến hạn' },
  { id: 'paymentStatus', label: 'Trạng thái thanh toán' },
  { id: 'ownerName', label: 'Người phụ trách' },
  { id: 'branchName', label: 'Chi nhánh/Cơ sở' },
  { id: 'note', label: 'Ghi chú' }
];
const DEFAULT_VISIBLE_COLUMNS: DebtColumnId[] = [
  'collectionCode',
  'studentName',
  'contractCode',
  'amountDue',
  'paidAmount',
  'remainingAmount',
  'dueDate',
  'paymentStatus'
];
const OVERDUE_TAB_COLUMNS: DebtColumnId[] = [
  'collectionCode',
  'studentName',
  'contractCode',
  'remainingAmount',
  'dueDate',
  'overdueDays',
  'ownerName',
  'branchName'
];
const COLUMN_WIDTH_CLASS: Partial<Record<DebtColumnId, string>> = {
  collectionCode: 'w-[18%]',
  studentName: 'w-[12%]',
  contractCode: 'w-[12%]',
  programName: 'w-[14%]',
  servicePackage: 'w-[14%]',
  chargeName: 'w-[10%]',
  amountDue: 'w-[11%]',
  overdueDays: 'w-[9%]',
  paidAmount: 'w-[10%]',
  remainingAmount: 'w-[10%]',
  dueDate: 'w-[10%]',
  paymentStatus: 'w-[14%]',
  ownerName: 'w-[12%]',
  branchName: 'w-[10%]',
  note: 'w-[14%]'
};
const QUICK_FILTER_LABEL_MAP: Record<DebtQuickFilter, string> = {
  ALL: 'Tất cả',
  CHUA_THU: 'Chưa thu',
  DA_THU_MOT_PHAN: 'Đã thu 1 phần',
  THU_DU: 'Thu đủ',
  DA_HUY: 'Đã hủy',
  QUA_HAN: 'Quá hạn'
};

const ADVANCED_GROUP_LABEL_MAP: Record<DebtGroupFieldId, string> = {
  paymentStatus: 'Trạng thái thanh toán',
  programName: 'Chương trình',
  servicePackage: 'Gói dịch vụ',
  chargeName: 'Khoản thu',
  ownerName: 'Người phụ trách',
  branchName: 'Chi nhánh/Cơ sở'
};
const ADVANCED_GROUP_OPTIONS: Array<{ id: DebtGroupFieldId; label: string }> = [
  { id: 'paymentStatus', label: 'Trạng thái thanh toán' },
  { id: 'programName', label: 'Chương trình' },
  { id: 'servicePackage', label: 'Gói dịch vụ' },
  { id: 'chargeName', label: 'Khoản thu' },
  { id: 'ownerName', label: 'Người phụ trách' },
  { id: 'branchName', label: 'Chi nhánh/Cơ sở' }
];
const ADVANCED_FILTER_TITLE_MAP: Record<DebtAdvancedFieldId, string> = {
  paymentStatus: 'Trạng thái thanh toán',
  programName: 'Chương trình',
  servicePackage: 'Gói dịch vụ',
  chargeName: 'Khoản thu',
  ownerName: 'Người phụ trách',
  branchName: 'Chi nhánh/Cơ sở'
};
const ADVANCED_FILTER_ALL_LABEL_MAP: Record<DebtAdvancedFieldId, string> = {
  paymentStatus: 'Tất cả trạng thái thanh toán',
  programName: 'Tất cả chương trình',
  servicePackage: 'Tất cả gói dịch vụ',
  chargeName: 'Tất cả khoản thu',
  ownerName: 'Tất cả người phụ trách',
  branchName: 'Tất cả chi nhánh/cơ sở'
};

const money = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value || 0);

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

const formatDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value.includes('T') ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('vi-VN');
};

const toDateOnly = (value?: string) => {
  if (!value) return null;
  const raw = value.includes('T') ? value : `${value}T00:00:00`;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const formatDateRangeLabel = (start?: string, end?: string) => {
  const startLabel = toDateOnly(start)?.toLocaleDateString('vi-VN');
  const endLabel = toDateOnly(end)?.toLocaleDateString('vi-VN');
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
      const start = startDate ? toDateOnly(startDate) : null;
      const end = endDate ? toDateOnly(endDate) : null;
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

const getTotalDebt = (item: IClassStudent) => {
  if (typeof item.totalDebt === 'number') return item.totalDebt;
  return (item.debtTerms || [])
    .filter((term) => term.status !== 'PAID')
    .reduce((sum, term) => sum + Number(term.amount || 0), 0);
};

const getOverdueDays = (dueDate: string, remainingAmount: number) => {
  if (!dueDate || remainingAmount <= 0) return 0;
  const due = toDateOnly(dueDate);
  if (!due) return 0;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = today.getTime() - due.getTime();
  if (diffMs <= 0) return 0;
  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
};

const buildCollectionCode = (soCode: string, studentCode: string, termNo: number) =>
  `THU-${soCode || studentCode}-${String(termNo).padStart(2, '0')}`;

const getContractCode = (contract?: IContract, quotation?: IQuotation) => {
  if (contract?.code) return contract.code;
  if (quotation?.soCode && quotation.status === 'LOCKED') return `HD-${quotation.soCode}`;
  return 'Chưa có HĐ';
};

const getProgramName = (quotation?: IQuotation, classInfo?: any) => {
  const lineItemPrograms = quotation?.lineItems?.flatMap((item) => item.programs || []).filter(Boolean) || [];
  if (lineItemPrograms.length) return Array.from(new Set(lineItemPrograms)).join(', ');
  if (classInfo?.name) return classInfo.name;
  return quotation?.product || '—';
};

const getServicePackage = (quotation?: IQuotation) => {
  const firstLineItem = quotation?.lineItems?.find((item) => item.servicePackage || item.name);
  return firstLineItem?.servicePackage || quotation?.studyAbroadProductPackage || firstLineItem?.name || quotation?.product || '—';
};

const getChargeName = (quotation?: IQuotation) => {
  if (!quotation) return '—';
  return SERVICE_TYPE_LABEL[quotation.serviceType] || quotation.serviceType;
};

const FinanceDebtList: React.FC = () => {
  const columnMenuRef = useRef<HTMLDivElement | null>(null);
  const quickFilterMenuRef = useRef<HTMLDivElement | null>(null);
  const timeMenuRef = useRef<HTMLDivElement | null>(null);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);
  const [classStudents, setClassStudents] = useState<IClassStudent[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<IQuotation[]>([]);
  const [contracts, setContracts] = useState<IContract[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<DebtPageTab>('ALL');
  const [quickFilter, setQuickFilter] = useState<DebtQuickFilter>('ALL');
  const [timeRangeType, setTimeRangeType] = useState<TimeRangeType>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [draftTimeRangeType, setDraftTimeRangeType] = useState<TimeRangeType>('all');
  const [draftCustomStartDate, setDraftCustomStartDate] = useState('');
  const [draftCustomEndDate, setDraftCustomEndDate] = useState('');
  const [programFilter, setProgramFilter] = useState('ALL');
  const [servicePackageFilter, setServicePackageFilter] = useState('ALL');
  const [chargeNameFilter, setChargeNameFilter] = useState('ALL');
  const [ownerFilter, setOwnerFilter] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [visibleColumns, setVisibleColumns] = useState<DebtColumnId[]>(DEFAULT_VISIBLE_COLUMNS);
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
  const [isQuickFilterOpen, setIsQuickFilterOpen] = useState(false);
  const [isTimeMenuOpen, setIsTimeMenuOpen] = useState(false);
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
  const [activeAdvancedField, setActiveAdvancedField] = useState<DebtAdvancedFieldId | null>(null);
  const [groupByFields, setGroupByFields] = useState<DebtGroupFieldId[]>([]);

  const loadData = () => {
    setClassStudents(getClassStudents());
    setStudents(getStudents());
    setClasses(getTrainingClasses());
    setQuotations(getQuotations());
    setContracts(getContracts());
  };

  useEffect(() => {
    loadData();
    window.addEventListener('educrm:class-students-changed', loadData as EventListener);
    window.addEventListener('educrm:students-changed', loadData as EventListener);
    window.addEventListener('educrm:training-classes-changed', loadData as EventListener);
    window.addEventListener('educrm:quotations-changed', loadData as EventListener);
    window.addEventListener('educrm:contracts-changed', loadData as EventListener);
    return () => {
      window.removeEventListener('educrm:class-students-changed', loadData as EventListener);
      window.removeEventListener('educrm:students-changed', loadData as EventListener);
      window.removeEventListener('educrm:training-classes-changed', loadData as EventListener);
      window.removeEventListener('educrm:quotations-changed', loadData as EventListener);
      window.removeEventListener('educrm:contracts-changed', loadData as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!isColumnMenuOpen && !isQuickFilterOpen && !isTimeMenuOpen && !isAdvancedFilterOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!columnMenuRef.current?.contains(event.target as Node)) {
        setIsColumnMenuOpen(false);
      }
      if (!quickFilterMenuRef.current?.contains(event.target as Node)) {
        setIsQuickFilterOpen(false);
      }
      if (!timeMenuRef.current?.contains(event.target as Node)) {
        setIsTimeMenuOpen(false);
      }
      if (!filterMenuRef.current?.contains(event.target as Node)) {
        setIsAdvancedFilterOpen(false);
        setActiveAdvancedField(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isAdvancedFilterOpen, isColumnMenuOpen, isQuickFilterOpen, isTimeMenuOpen]);

  const studentMap = useMemo(() => new Map(students.map((item) => [item.id, item])), [students]);
  const classMap = useMemo(() => new Map(classes.map((item) => [item.id, item])), [classes]);
  const quotationMap = useMemo(() => new Map(quotations.map((item) => [item.id, item])), [quotations]);
  const contractByQuotationId = useMemo(
    () => new Map(contracts.filter((item) => item.quotationId).map((item) => [item.quotationId as string, item])),
    [contracts]
  );
  const salesDirectory = useMemo(() => {
    const nameByUserId = new Map<string, string>();
    const branchByUserId = new Map<string, string>();

    getSalesTeams().forEach((team) => {
      team.members.forEach((member) => {
        if (member.userId && member.name && !nameByUserId.has(member.userId)) {
          nameByUserId.set(member.userId, member.name);
        }
        if (member.userId && member.branch && !branchByUserId.has(member.userId)) {
          branchByUserId.set(member.userId, member.branch);
        }
      });
    });

    return { nameByUserId, branchByUserId };
  }, []);

  const rows = useMemo<DebtRow[]>(() => {
    return classStudents
      .flatMap((item) => {
        const student = studentMap.get(item.studentId);
        const classInfo = classMap.get(item.classId);
        const quotation =
          quotationMap.get(student?.soId || '') ||
          quotations.find((entry) => entry.studentId === item.studentId || entry.customerId === student?.customerId);
        const contract = quotation?.id ? contractByQuotationId.get(quotation.id) : undefined;
        const rawTerms =
          item.debtTerms && item.debtTerms.length
            ? [...item.debtTerms]
            : getTotalDebt(item) > 0 || item.nearestDueDate
              ? [
                  {
                    termNo: 1,
                    dueDate: item.nearestDueDate || '',
                    amount: getTotalDebt(item),
                    status: item.debtStatus === 'DA_DONG' ? 'PAID' : item.debtStatus === 'QUA_HAN' ? 'OVERDUE' : 'UNPAID'
                  }
                ]
              : [];

        const sortedTerms = rawTerms.sort((a, b) => {
          const dueA = new Date(a.dueDate).getTime();
          const dueB = new Date(b.dueDate).getTime();
          if (dueA !== dueB) return dueA - dueB;
          return a.termNo - b.termNo;
        });

        const totalExpected = sortedTerms.reduce((sum, term) => sum + Number(term.amount || 0), 0);
        const remainingDebt = getTotalDebt(item);
        let paidPool = Math.max(totalExpected - remainingDebt, 0);

        return sortedTerms.map((term) => {
          const amountDue = Number(term.amount || 0);
          const isCancelled = item.status === 'NGHI_HOC';
          const paidAmount = isCancelled ? 0 : Math.min(amountDue, Math.max(paidPool, 0));
          paidPool = Math.max(paidPool - paidAmount, 0);
          const remainingAmount = Math.max(amountDue - paidAmount, 0);
          const paymentStatus: DebtPaymentStatus = isCancelled
            ? 'DA_HUY'
            : remainingAmount <= 0
              ? 'THU_DU'
              : paidAmount > 0
                ? 'DA_THU_MOT_PHAN'
                : 'CHUA_THU';
          const overdueDays = paymentStatus === 'THU_DU' || paymentStatus === 'DA_HUY' ? 0 : getOverdueDays(term.dueDate, remainingAmount);

          return {
            id: `${item.id}-${term.termNo}`,
            collectionCode: buildCollectionCode(quotation?.soCode || '', student?.code || item.studentId, term.termNo),
            studentName: student?.name || quotation?.customerName || item.studentId,
            contractCode: getContractCode(contract, quotation),
            programName: getProgramName(quotation, classInfo),
            servicePackage: getServicePackage(quotation),
            chargeName: getChargeName(quotation),
            amountDue,
            overdueDays,
            paidAmount,
            remainingAmount,
            dueDate: term.dueDate,
            paymentStatus,
            ownerName:
              quotation?.salespersonName ||
              salesDirectory.nameByUserId.get(quotation?.createdBy || '') ||
              salesDirectory.nameByUserId.get(student?.salesPersonId || '') ||
              '—',
            branchName:
              quotation?.branchName ||
              salesDirectory.branchByUserId.get(quotation?.createdBy || '') ||
              student?.campus ||
              classInfo?.campus ||
              '—',
            note: quotation?.internalNote || quotation?.pricingNote || student?.note || '—'
          };
        });
      })
      .sort((a, b) => {
        if (a.overdueDays > 0 && b.overdueDays <= 0) return -1;
        if (a.overdueDays <= 0 && b.overdueDays > 0) return 1;
        const dueA = toDateOnly(a.dueDate)?.getTime() || Number.MAX_SAFE_INTEGER;
        const dueB = toDateOnly(b.dueDate)?.getTime() || Number.MAX_SAFE_INTEGER;
        if (dueA !== dueB) return dueA - dueB;
        return b.remainingAmount - a.remainingAmount;
      });
  }, [classMap, classStudents, contractByQuotationId, quotationMap, quotations, salesDirectory, studentMap]);

  const scopedRows = useMemo(() => {
    const timeBounds = getTimeRangeBounds(timeRangeType, customStartDate, customEndDate);

    return rows.filter((item) => {
      if (programFilter !== 'ALL' && item.programName !== programFilter) return false;
      if (servicePackageFilter !== 'ALL' && item.servicePackage !== servicePackageFilter) return false;
      if (chargeNameFilter !== 'ALL' && item.chargeName !== chargeNameFilter) return false;
      if (ownerFilter !== 'ALL' && item.ownerName !== ownerFilter) return false;
      if (branchFilter !== 'ALL' && item.branchName !== branchFilter) return false;

      if (timeBounds) {
        const dueDate = toDateOnly(item.dueDate);
        if (!dueDate) return false;
        if (dueDate < timeBounds.start || dueDate > timeBounds.end) return false;
      }

      const q = searchTerm.trim().toLowerCase();
      if (!q) return true;

      return [
        item.collectionCode,
        item.studentName,
        item.contractCode,
        item.programName,
        item.servicePackage,
        item.chargeName,
        item.ownerName,
        item.branchName,
        item.note,
        STATUS_META[item.paymentStatus].label
      ]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [branchFilter, chargeNameFilter, customEndDate, customStartDate, ownerFilter, programFilter, rows, searchTerm, servicePackageFilter, timeRangeType]);

  const filteredRows = useMemo(() => {
    return scopedRows.filter((item) => {
      if (activeTab === 'OVERDUE' && !(item.overdueDays > 0 && item.remainingAmount > 0)) return false;
      if (activeTab === 'PAID' && item.paymentStatus !== 'THU_DU') return false;

      if (quickFilter === 'QUA_HAN') {
        if (item.overdueDays <= 0 || item.remainingAmount <= 0) return false;
      } else if (quickFilter !== 'ALL' && item.paymentStatus !== quickFilter) {
        return false;
      }

      return true;
    });
  }, [activeTab, quickFilter, scopedRows]);

  const clearAllSearchFilters = () => {
    setSearchTerm('');
    setQuickFilter('ALL');
    setTimeRangeType('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setDraftTimeRangeType('all');
    setDraftCustomStartDate('');
    setDraftCustomEndDate('');
    setProgramFilter('ALL');
    setServicePackageFilter('ALL');
    setChargeNameFilter('ALL');
    setOwnerFilter('ALL');
    setBranchFilter('ALL');
    setGroupByFields([]);
    setActiveAdvancedField(null);
  };

  const toggleColumn = (columnId: DebtColumnId) => {
    setVisibleColumns((current) => {
      if (current.includes(columnId)) {
        if (current.length === 1) return current;
        return current.filter((item) => item !== columnId);
      }

      return COLUMN_OPTIONS.filter((item) => item.id === columnId || current.includes(item.id)).map((item) => item.id);
    });
  };

  const getColumnWidthClass = (columnId: DebtColumnId) => COLUMN_WIDTH_CLASS[columnId] || '';
  const quickFilterOptions = useMemo(
    () => [
      { value: 'ALL' as DebtQuickFilter, label: 'Tất cả' },
      { value: 'CHUA_THU' as DebtQuickFilter, label: 'Chưa thu' },
      { value: 'DA_THU_MOT_PHAN' as DebtQuickFilter, label: 'Đã thu 1 phần' },
      { value: 'THU_DU' as DebtQuickFilter, label: 'Thu đủ' },
      { value: 'QUA_HAN' as DebtQuickFilter, label: 'Quá hạn' },
      { value: 'DA_HUY' as DebtQuickFilter, label: 'Đã hủy' }
    ],
    []
  );
  const programOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => row.programName).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'vi')),
    [rows]
  );
  const servicePackageOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => row.servicePackage).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'vi')),
    [rows]
  );
  const chargeNameOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => row.chargeName).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'vi')),
    [rows]
  );
  const ownerOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => row.ownerName).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'vi')),
    [rows]
  );
  const branchOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => row.branchName).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'vi')),
    [rows]
  );
  const activeAdvancedFilterCount = useMemo(
    () =>
      [
        quickFilter !== 'ALL',
        programFilter !== 'ALL',
        servicePackageFilter !== 'ALL',
        chargeNameFilter !== 'ALL',
        ownerFilter !== 'ALL',
        branchFilter !== 'ALL'
      ].filter(Boolean).length + groupByFields.length,
    [branchFilter, chargeNameFilter, groupByFields.length, ownerFilter, programFilter, quickFilter, servicePackageFilter]
  );
  const activeSearchChips = useMemo<PinnedSearchChip[]>(() => {
    const chips: PinnedSearchChip[] = [];

    if (quickFilter !== 'ALL') chips.push({ key: 'quickFilter', label: `Loại: ${QUICK_FILTER_LABEL_MAP[quickFilter]}` });
    if (timeRangeType !== 'all') chips.push({ key: 'time', label: `Thời gian: ${getTimeRangeLabel(timeRangeType, customStartDate, customEndDate)}` });
    if (programFilter !== 'ALL') chips.push({ key: 'program', label: `Chương trình: ${programFilter}` });
    if (servicePackageFilter !== 'ALL') chips.push({ key: 'servicePackage', label: `Gói DV: ${servicePackageFilter}` });
    if (chargeNameFilter !== 'ALL') chips.push({ key: 'chargeName', label: `Khoản thu: ${chargeNameFilter}` });
    if (ownerFilter !== 'ALL') chips.push({ key: 'owner', label: `Phụ trách: ${ownerFilter}` });
    if (branchFilter !== 'ALL') chips.push({ key: 'branch', label: `Chi nhánh: ${branchFilter}` });

    groupByFields.forEach((field) => chips.push({ key: `group:${field}`, label: `NhÃ³m: ${ADVANCED_GROUP_LABEL_MAP[field]}` }));

    return chips;
  }, [branchFilter, chargeNameFilter, customEndDate, customStartDate, groupByFields, ownerFilter, programFilter, quickFilter, servicePackageFilter, timeRangeType]);

  const advancedFilterConfigs = useMemo(
    () => [
      {
        id: 'paymentStatus' as DebtAdvancedFieldId,
        label: 'Tráº¡ng thÃ¡i thanh toÃ¡n',
        allLabel: 'Táº¥t cáº£ tráº¡ng thÃ¡i thanh toÃ¡n',
        value: quickFilter,
        onChange: setQuickFilter,
        options: quickFilterOptions.map((option) => ({ value: option.value, label: option.label }))
      },
      {
        id: 'programName' as DebtAdvancedFieldId,
        label: 'ChÆ°Æ¡ng trÃ¬nh',
        allLabel: 'Táº¥t cáº£ chÆ°Æ¡ng trÃ¬nh',
        value: programFilter,
        onChange: setProgramFilter,
        options: programOptions.map((item) => ({ value: item, label: item }))
      },
      {
        id: 'servicePackage' as DebtAdvancedFieldId,
        label: 'GÃ³i dá»‹ch vá»¥',
        allLabel: 'Táº¥t cáº£ gÃ³i dá»‹ch vá»¥',
        value: servicePackageFilter,
        onChange: setServicePackageFilter,
        options: servicePackageOptions.map((item) => ({ value: item, label: item }))
      },
      {
        id: 'chargeName' as DebtAdvancedFieldId,
        label: 'Khoáº£n thu',
        allLabel: 'Táº¥t cáº£ khoáº£n thu',
        value: chargeNameFilter,
        onChange: setChargeNameFilter,
        options: chargeNameOptions.map((item) => ({ value: item, label: item }))
      },
      {
        id: 'ownerName' as DebtAdvancedFieldId,
        label: 'NgÆ°á»i phá»¥ trÃ¡ch',
        allLabel: 'Táº¥t cáº£ ngÆ°á»i phá»¥ trÃ¡ch',
        value: ownerFilter,
        onChange: setOwnerFilter,
        options: ownerOptions.map((item) => ({ value: item, label: item }))
      },
      {
        id: 'branchName' as DebtAdvancedFieldId,
        label: 'Chi nhÃ¡nh/CÆ¡ sá»Ÿ',
        allLabel: 'Táº¥t cáº£ chi nhÃ¡nh/cÆ¡ sá»Ÿ',
        value: branchFilter,
        onChange: setBranchFilter,
        options: branchOptions.map((item) => ({ value: item, label: item }))
      }
    ],
    [
      branchFilter,
      branchOptions,
      chargeNameFilter,
      chargeNameOptions,
      ownerFilter,
      ownerOptions,
      programFilter,
      programOptions,
      quickFilter,
      quickFilterOptions,
      servicePackageFilter,
      servicePackageOptions
    ]
  );

  const groupedRows = useMemo(() => {
    if (groupByFields.length === 0) return [];

    const groups = new Map<
      string,
      { key: string; label: string; rowCount: number; remainingAmount: number; amountDue: number; rows: DebtRow[] }
    >();

    filteredRows.forEach((row) => {
      const values = groupByFields.map((field) => {
        if (field === 'paymentStatus') return STATUS_META[row.paymentStatus].label;
        return String(row[field] || '—');
      });
      const key = values.join('||');
      const label = values.map((value, index) => `${ADVANCED_GROUP_LABEL_MAP[groupByFields[index]]}: ${value}`).join(' • ');
      const current = groups.get(key);

      if (current) {
        current.rowCount += 1;
        current.remainingAmount += row.remainingAmount;
        current.amountDue += row.amountDue;
        current.rows.push(row);
        return;
      }

      groups.set(key, {
        key,
        label,
        rowCount: 1,
        remainingAmount: row.remainingAmount,
        amountDue: row.amountDue,
        rows: [row]
      });
    });

    return Array.from(groups.values());
  }, [filteredRows, groupByFields]);

  const dashboardSummary = useMemo(() => {
    const debtRows = scopedRows.filter((item) => item.remainingAmount > 0 && item.paymentStatus !== 'DA_HUY');
    const overdueRows = debtRows.filter((item) => item.overdueDays > 0);
    const dueSoonRows = debtRows.filter((item) => item.overdueDays === 0).filter((item) => {
      const dueDate = toDateOnly(item.dueDate);
      if (!dueDate) return false;
      const today = startOfDay(new Date());
      const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
      return diffDays >= 0 && diffDays <= 7;
    });

    const programBreakdown = Array.from(
      debtRows.reduce<Map<string, number>>((acc, row) => {
        acc.set(row.programName, (acc.get(row.programName) || 0) + row.remainingAmount);
        return acc;
      }, new Map())
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);

    const branchBreakdown = Array.from(
      debtRows.reduce<Map<string, number>>((acc, row) => {
        acc.set(row.branchName, (acc.get(row.branchName) || 0) + row.remainingAmount);
        return acc;
      }, new Map())
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);

    return {
      totalReceivable: debtRows.reduce((sum, row) => sum + row.remainingAmount, 0),
      dueSoonCount: dueSoonRows.length,
      overdueCount: overdueRows.length,
      debtorStudents: new Set(debtRows.map((row) => row.studentName)).size,
      debtItems: debtRows.length,
      programBreakdown,
      branchBreakdown
    };
  }, [scopedRows]);

  const tabCounts = useMemo(
    () => ({
      ALL: scopedRows.length,
      OVERDUE: scopedRows.filter((item) => item.overdueDays > 0 && item.remainingAmount > 0).length,
      PAID: scopedRows.filter((item) => item.paymentStatus === 'THU_DU').length
    }),
    [scopedRows]
  );

  const effectiveVisibleColumns = useMemo(() => {
    if (activeTab === 'OVERDUE') return OVERDUE_TAB_COLUMNS;
    if (activeTab === 'PAID') return visibleColumns.filter((column) => column !== 'overdueDays');
    return visibleColumns;
  }, [activeTab, visibleColumns]);

  const effectiveVisibleColumnOptions = useMemo(
    () => COLUMN_OPTIONS.filter((item) => effectiveVisibleColumns.includes(item.id)),
    [effectiveVisibleColumns]
  );

  const removeSearchChip = (chipKey: string) => {
    if (chipKey === 'quickFilter') {
      setQuickFilter('ALL');
      return;
    }
    if (chipKey === 'time') {
      setTimeRangeType('all');
      setCustomStartDate('');
      setCustomEndDate('');
      return;
    }
    if (chipKey === 'program') {
      setProgramFilter('ALL');
      return;
    }
    if (chipKey === 'servicePackage') {
      setServicePackageFilter('ALL');
      return;
    }
    if (chipKey === 'chargeName') {
      setChargeNameFilter('ALL');
      return;
    }
    if (chipKey === 'owner') {
      setOwnerFilter('ALL');
      return;
    }
    if (chipKey === 'branch') {
      setBranchFilter('ALL');
      return;
    }
    if (chipKey.startsWith('group:')) {
      const field = chipKey.replace('group:', '') as DebtGroupFieldId;
      setGroupByFields((current) => current.filter((item) => item !== field));
    }
  };

  const resolveDraftDateRange = (rangeType: TimeRangeType, startDate = '', endDate = '') => {
    if (rangeType === 'all') return { startDate: '', endDate: '' };
    if (rangeType === 'custom') return { startDate, endDate };
    const bounds = getTimeRangeBounds(rangeType, startDate, endDate);
    return {
      startDate: bounds?.start ? toDateInputValue(bounds.start) : '',
      endDate: bounds?.end ? toDateInputValue(bounds.end) : ''
    };
  };

  const openTimeMenu = () => {
    setIsQuickFilterOpen(false);
    setIsAdvancedFilterOpen(false);
    setIsColumnMenuOpen(false);
    setDraftTimeRangeType(timeRangeType);
    const nextDraftRange = resolveDraftDateRange(timeRangeType, customStartDate, customEndDate);
    setDraftCustomStartDate(nextDraftRange.startDate);
    setDraftCustomEndDate(nextDraftRange.endDate);
    setIsTimeMenuOpen((current) => !current);
  };

  const handleSelectDraftTimeRange = (rangeType: TimeRangeType) => {
    setDraftTimeRangeType(rangeType);
    const baseStartDate = rangeType === 'custom' ? draftCustomStartDate || customStartDate : customStartDate;
    const baseEndDate = rangeType === 'custom' ? draftCustomEndDate || customEndDate : customEndDate;
    const nextDraftRange = resolveDraftDateRange(rangeType, baseStartDate, baseEndDate);
    setDraftCustomStartDate(nextDraftRange.startDate);
    setDraftCustomEndDate(nextDraftRange.endDate);
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

  const getAdvancedFieldDisplay = (fieldId: DebtAdvancedFieldId) => {
    const config = advancedFilterConfigs.find((item) => item.id === fieldId);
    if (!config) return '';
    if (config.value === 'ALL') return ADVANCED_FILTER_ALL_LABEL_MAP[fieldId];
    return config.options.find((item) => item.value === config.value)?.label || ADVANCED_FILTER_ALL_LABEL_MAP[fieldId];
  };

  const toggleGroupField = (fieldId: DebtGroupFieldId) => {
    setGroupByFields((current) =>
      current.includes(fieldId) ? current.filter((item) => item !== fieldId) : [...current, fieldId]
    );
  };

  const closeAdvancedFilterMenu = () => {
    setIsAdvancedFilterOpen(false);
    setActiveAdvancedField(null);
  };

  const renderDebtRow = (item: DebtRow) => (
    <tr key={item.id} className="transition-colors hover:bg-slate-50">
      {effectiveVisibleColumns.includes('collectionCode') && (
        <td className={`${getColumnWidthClass('collectionCode')} px-3 py-4 text-sm font-bold text-blue-600`}>
          <div className="truncate" title={item.collectionCode}>
            {item.collectionCode}
          </div>
        </td>
      )}
      {effectiveVisibleColumns.includes('studentName') && (
        <td className={`${getColumnWidthClass('studentName')} px-3 py-4 text-sm font-semibold text-slate-900`}>
          <div className="truncate" title={item.studentName}>
            {item.studentName}
          </div>
        </td>
      )}
      {effectiveVisibleColumns.includes('contractCode') && (
        <td className={`${getColumnWidthClass('contractCode')} px-3 py-4 text-sm text-slate-700`}>
          <div className="truncate" title={item.contractCode}>
            {item.contractCode}
          </div>
        </td>
      )}
      {effectiveVisibleColumns.includes('programName') && (
        <td className={`${getColumnWidthClass('programName')} px-3 py-4 text-sm text-slate-700`}>
          <div className="max-w-[220px] truncate" title={item.programName}>
            {item.programName}
          </div>
        </td>
      )}
      {effectiveVisibleColumns.includes('servicePackage') && (
        <td className={`${getColumnWidthClass('servicePackage')} px-3 py-4 text-sm text-slate-700`}>
          <div className="truncate" title={item.servicePackage}>
            {item.servicePackage}
          </div>
        </td>
      )}
      {effectiveVisibleColumns.includes('chargeName') && (
        <td className={`${getColumnWidthClass('chargeName')} px-3 py-4 text-sm text-slate-700`}>
          <div className="truncate" title={item.chargeName}>
            {item.chargeName}
          </div>
        </td>
      )}
      {effectiveVisibleColumns.includes('amountDue') && <td className={`${getColumnWidthClass('amountDue')} px-3 py-4 whitespace-nowrap text-right text-sm font-bold text-slate-800`}>{money(item.amountDue)}</td>}
      {effectiveVisibleColumns.includes('overdueDays') && (
        <td className={`${getColumnWidthClass('overdueDays')} px-3 py-4 whitespace-nowrap text-sm`}>
          {item.overdueDays > 0 ? <span className="font-bold text-red-600">{item.overdueDays} ngÃ y</span> : <span className="text-slate-400">0 ngÃ y</span>}
        </td>
      )}
      {effectiveVisibleColumns.includes('paidAmount') && <td className={`${getColumnWidthClass('paidAmount')} px-3 py-4 whitespace-nowrap text-right text-sm font-semibold text-emerald-700`}>{money(item.paidAmount)}</td>}
      {effectiveVisibleColumns.includes('remainingAmount') && <td className={`${getColumnWidthClass('remainingAmount')} px-3 py-4 whitespace-nowrap text-right text-sm font-bold text-slate-900`}>{money(item.remainingAmount)}</td>}
      {effectiveVisibleColumns.includes('dueDate') && <td className={`${getColumnWidthClass('dueDate')} px-3 py-4 whitespace-nowrap text-sm text-slate-700`}>{formatDate(item.dueDate)}</td>}
      {effectiveVisibleColumns.includes('paymentStatus') && (
        <td className={`${getColumnWidthClass('paymentStatus')} px-3 py-4`}>
          <span className={`inline-block whitespace-nowrap rounded border px-2.5 py-1 text-xs font-bold ${STATUS_META[item.paymentStatus].badge}`}>
            {STATUS_META[item.paymentStatus].label}
          </span>
        </td>
      )}
      {effectiveVisibleColumns.includes('ownerName') && (
        <td className={`${getColumnWidthClass('ownerName')} px-3 py-4 text-sm text-slate-700`}>
          <div className="truncate" title={item.ownerName}>
            {item.ownerName}
          </div>
        </td>
      )}
      {effectiveVisibleColumns.includes('branchName') && (
        <td className={`${getColumnWidthClass('branchName')} px-3 py-4 text-sm text-slate-700`}>
          <div className="truncate" title={item.branchName}>
            {item.branchName}
          </div>
        </td>
      )}
      {effectiveVisibleColumns.includes('note') && (
        <td className={`${getColumnWidthClass('note')} px-3 py-4 text-sm text-slate-600`}>
          <div className="truncate" title={item.note}>
            {item.note}
          </div>
        </td>
      )}
    </tr>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-8 font-sans text-slate-900">
      <div className="mx-auto max-w-[1800px]">
        <div className="mb-6">
          <h1 className="mb-2 text-3xl font-black tracking-tight text-slate-900">Công nợ - Danh sách</h1>
          <p className="text-slate-500">Theo dõi công nợ theo từng đợt thu, số tiền đã thu, còn lại, hạn thanh toán và người phụ trách.</p>
        </div>

        <div className="mb-6 grid gap-4 xl:grid-cols-[1.55fr_1fr]">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 text-lg font-bold text-slate-900">Dashboard tổng quan</div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-[11px] font-bold uppercase tracking-[0.04em] text-slate-500">Tổng còn phải thu</div>
                <div className="mt-2 text-xl font-black text-slate-900">{money(dashboardSummary.totalReceivable)}</div>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <div className="text-[11px] font-bold uppercase tracking-[0.04em] text-amber-700">Sắp đến hạn</div>
                <div className="mt-2 text-xl font-black text-amber-800">{dashboardSummary.dueSoonCount}</div>
              </div>
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
                <div className="text-[11px] font-bold uppercase tracking-[0.04em] text-rose-700">Quá hạn</div>
                <div className="mt-2 text-xl font-black text-rose-800">{dashboardSummary.overdueCount}</div>
              </div>
              <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3">
                <div className="text-[11px] font-bold uppercase tracking-[0.04em] text-sky-700">Số học viên nợ</div>
                <div className="mt-2 text-xl font-black text-sky-800">{dashboardSummary.debtorStudents}</div>
              </div>
              <div className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-3">
                <div className="text-[11px] font-bold uppercase tracking-[0.04em] text-violet-700">Số khoản nợ</div>
                <div className="mt-2 text-xl font-black text-violet-800">{dashboardSummary.debtItems}</div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 text-sm font-bold text-slate-900">Nợ theo chương trình</div>
              <div className="space-y-2">
                {dashboardSummary.programBreakdown.length ? dashboardSummary.programBreakdown.map(([name, amount]) => (
                  <div key={name} className="flex items-center justify-between gap-3 text-sm">
                    <div className="truncate text-slate-600" title={name}>{name}</div>
                    <div className="whitespace-nowrap font-semibold text-slate-900">{money(amount)}</div>
                  </div>
                )) : <div className="text-sm text-slate-400">Chưa có dữ liệu.</div>}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 text-sm font-bold text-slate-900">Nợ theo chi nhánh / cơ sở</div>
              <div className="space-y-2">
                {dashboardSummary.branchBreakdown.length ? dashboardSummary.branchBreakdown.map(([name, amount]) => (
                  <div key={name} className="flex items-center justify-between gap-3 text-sm">
                    <div className="truncate text-slate-600" title={name}>{name}</div>
                    <div className="whitespace-nowrap font-semibold text-slate-900">{money(amount)}</div>
                  </div>
                )) : <div className="text-sm text-slate-400">Chưa có dữ liệu.</div>}
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-visible rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 pt-4">
            <div className="mb-3 flex flex-wrap gap-2">
              {[
                { id: 'ALL' as DebtPageTab, label: 'Danh sách chi tiết', count: tabCounts.ALL },
                { id: 'OVERDUE' as DebtPageTab, label: 'Tab quá hạn', count: tabCounts.OVERDUE },
                { id: 'PAID' as DebtPageTab, label: 'Tab đã thu đủ', count: tabCounts.PAID }
              ].map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold ${
                      active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${active ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600'}`}>{tab.count}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/50 p-4">
            <div className="min-w-[320px] flex-1">
              <PinnedSearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Tìm theo mã đợt thu, học viên, hợp đồng, chương trình, người phụ trách..."
                chips={activeSearchChips}
                onRemoveChip={removeSearchChip}
                onClearAll={clearAllSearchFilters}
                clearAllAriaLabel="Xóa tất cả bộ lọc công nợ"
                inputClassName="h-7 text-sm"
              />
            </div>

            <div className="relative z-20 flex shrink-0 flex-wrap items-center gap-2 md:flex-nowrap">
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
                    <span>{QUICK_FILTER_LABEL_MAP[quickFilter]}</span>
                  </button>

                  {isQuickFilterOpen && (
                    <div className="absolute left-0 top-full z-50 mt-2 w-[220px] rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
                      {quickFilterOptions.map((option) => {
                        const active = option.value === quickFilter;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              setQuickFilter(option.value);
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
                    setIsQuickFilterOpen(false);
                    setIsTimeMenuOpen(false);
                    setIsColumnMenuOpen(false);
                    setIsAdvancedFilterOpen((current) => {
                      const next = !current;
                      if (!next) setActiveAdvancedField(null);
                      return next;
                    });
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
                  <>
                    <div className="absolute right-0 top-full z-20 mt-2 w-[540px] max-w-[calc(100vw-10rem)] overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-2xl">
                      <div className="flex max-h-[52vh] items-stretch overflow-hidden">
                        <div className="flex w-[64%] min-h-0 flex-col border-r border-slate-200 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                                <Filter size={15} />
                              </div>
                              <div>
                                <div className="text-lg font-bold text-slate-900">Bộ lọc</div>
                                <div className="text-xs font-medium text-slate-500">Lọc nhanh theo các trường công nợ.</div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={clearAllSearchFilters}
                              className="rounded-full border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-500 hover:border-slate-300 hover:text-slate-700"
                            >
                              Xóa lọc
                            </button>
                          </div>

                          <div className="mt-2 min-h-0 flex-1 overflow-y-auto divide-y divide-slate-100 pr-1">
                            {advancedFilterConfigs.map((config) => {
                              const isActive = activeAdvancedField === config.id;
                              return (
                                <div key={config.id} className="py-1">
                                  <button
                                    type="button"
                                    onClick={() => setActiveAdvancedField((current) => (current === config.id ? null : config.id))}
                                    className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-slate-50"
                                  >
                                    <div className="min-w-0">
                                      <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">{ADVANCED_FILTER_TITLE_MAP[config.id]}</div>
                                      <div className="mt-0.5 truncate text-[12px] font-semibold text-slate-800">{getAdvancedFieldDisplay(config.id)}</div>
                                    </div>
                                    <ChevronDown size={14} className={`shrink-0 text-slate-400 transition-transform ${isActive ? 'rotate-180' : ''}`} />
                                  </button>

                                  {isActive && (
                                    <div className="px-2 pb-1.5 pt-1">
                                      <div className="max-h-32 overflow-y-auto rounded-md border border-slate-200 bg-white p-1">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            config.onChange('ALL');
                                            setActiveAdvancedField(null);
                                          }}
                                          className={`mb-0.5 flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-[11px] font-medium ${
                                            config.value === 'ALL' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-50'
                                          }`}
                                        >
                                          <span>{ADVANCED_FILTER_ALL_LABEL_MAP[config.id]}</span>
                                          {config.value === 'ALL' && <Check size={12} />}
                                        </button>
                                        {config.options.map((option) => (
                                          <button
                                            key={`${config.id}-${option.value}`}
                                            type="button"
                                            onClick={() => {
                                              config.onChange(option.value);
                                              setActiveAdvancedField(null);
                                            }}
                                            className={`mb-0.5 flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-[11px] font-medium ${
                                              config.value === option.value ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-50'
                                            }`}
                                          >
                                            <span>{option.label}</span>
                                            {config.value === option.value && <Check size={12} />}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex w-[36%] min-h-0 flex-col p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                                <Columns3 size={15} />
                              </div>
                              <div>
                                <div className="text-lg font-bold text-slate-900">Nhóm theo</div>
                                <div className="text-xs font-medium text-slate-500">Có thể chọn nhiều tiêu chí nhóm.</div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={closeAdvancedFilterMenu}
                              className="text-[11px] font-semibold text-slate-500 hover:text-slate-700"
                            >
                              Đóng
                            </button>
                          </div>

                          <div className="mt-2 min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-1">
                            {ADVANCED_GROUP_OPTIONS.map((option) => {
                              const active = groupByFields.includes(option.id);
                              return (
                                <button
                                  key={option.id}
                                  type="button"
                                  onClick={() => toggleGroupField(option.id)}
                                  className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left hover:bg-slate-50"
                                >
                                  <span className={`text-[11px] font-semibold ${active ? 'text-slate-900' : 'text-slate-600'}`}>{option.label}</span>
                                  <span
                                    className={`flex h-3.5 w-3.5 items-center justify-center rounded border transition ${
                                      active ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-transparent'
                                    }`}
                                  >
                                    <Check size={11} strokeWidth={3} />
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          {groupByFields.length > 0 && (
                            <div className="mt-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[10px] font-medium text-slate-500">
                              Đang nhóm theo: {groupByFields.map((field) => ADVANCED_GROUP_LABEL_MAP[field]).join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="hidden">
                    <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <div className="text-sm font-bold text-slate-900">Lọc nâng cao</div>
                        <div className="text-xs text-slate-500">Field lấy trực tiếp từ dữ liệu công nợ hiện có.</div>
                      </div>
                      <button
                        type="button"
                        onClick={clearAllSearchFilters}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                      >
                        Xóa lọc
                      </button>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3">
                      <select
                        value={programFilter}
                        onChange={(e) => setProgramFilter(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
                      >
                        <option value="ALL">Tất cả chương trình</option>
                        {programOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>

                      <select
                        value={servicePackageFilter}
                        onChange={(e) => setServicePackageFilter(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
                      >
                        <option value="ALL">Tất cả gói dịch vụ</option>
                        {servicePackageOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>

                      <select
                        value={chargeNameFilter}
                        onChange={(e) => setChargeNameFilter(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
                      >
                        <option value="ALL">Tất cả khoản thu</option>
                        {chargeNameOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>

                      <select
                        value={ownerFilter}
                        onChange={(e) => setOwnerFilter(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
                      >
                        <option value="ALL">Tất cả người phụ trách</option>
                        {ownerOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>

                      <select
                        value={branchFilter}
                        onChange={(e) => setBranchFilter(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
                      >
                        <option value="ALL">Tất cả chi nhánh/cơ sở</option>
                        {branchOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>
                    </div>
                  </>
                )}
              </div>

              <div className="relative" ref={columnMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsQuickFilterOpen(false);
                    setIsTimeMenuOpen(false);
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
            <table className="w-full table-fixed border-collapse text-left">
              <thead className="border-b border-slate-200 bg-[#F8FAFC]">
                <tr>
                  {effectiveVisibleColumnOptions.map((column) => (
                    <th
                      key={column.id}
                      className={`${getColumnWidthClass(column.id)} px-3 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 ${
                        column.align === 'right' ? 'text-right' : ''
                      }`}
                    >
                      <div className="truncate" title={column.label}>
                        {column.label}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredRows.length > 0 ? (
                  groupByFields.length > 0 ? (
                    groupedRows.map((group) => (
                      <React.Fragment key={group.key}>
                        <tr className="bg-slate-50/80">
                          <td colSpan={effectiveVisibleColumns.length} className="px-4 py-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <div className="text-sm font-bold text-slate-900">{group.label}</div>
                                <div className="mt-1 text-xs font-medium text-slate-500">{group.rowCount} khoản thu</div>
                              </div>
                              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500">
                                <span>Phải thu: {money(group.amountDue)}</span>
                                <span>Còn lại: {money(group.remainingAmount)}</span>
                              </div>
                            </div>
                          </td>
                        </tr>
                        {group.rows.map((item) => renderDebtRow(item))}
                      </React.Fragment>
                    ))
                  ) : (
                  filteredRows.map((item) => (
                    <tr key={item.id} className="transition-colors hover:bg-slate-50">
                      {effectiveVisibleColumns.includes('collectionCode') && (
                        <td className={`${getColumnWidthClass('collectionCode')} px-3 py-4 text-sm font-bold text-blue-600`}>
                          <div className="truncate" title={item.collectionCode}>
                            {item.collectionCode}
                          </div>
                        </td>
                      )}
                      {effectiveVisibleColumns.includes('studentName') && (
                        <td className={`${getColumnWidthClass('studentName')} px-3 py-4 text-sm font-semibold text-slate-900`}>
                          <div className="truncate" title={item.studentName}>
                            {item.studentName}
                          </div>
                        </td>
                      )}
                      {effectiveVisibleColumns.includes('contractCode') && (
                        <td className={`${getColumnWidthClass('contractCode')} px-3 py-4 text-sm text-slate-700`}>
                          <div className="truncate" title={item.contractCode}>
                            {item.contractCode}
                          </div>
                        </td>
                      )}
                      {effectiveVisibleColumns.includes('programName') && (
                        <td className={`${getColumnWidthClass('programName')} px-3 py-4 text-sm text-slate-700`}>
                          <div className="max-w-[220px] truncate" title={item.programName}>
                            {item.programName}
                          </div>
                        </td>
                      )}
                      {effectiveVisibleColumns.includes('servicePackage') && (
                        <td className={`${getColumnWidthClass('servicePackage')} px-3 py-4 text-sm text-slate-700`}>
                          <div className="truncate" title={item.servicePackage}>
                            {item.servicePackage}
                          </div>
                        </td>
                      )}
                      {effectiveVisibleColumns.includes('chargeName') && (
                        <td className={`${getColumnWidthClass('chargeName')} px-3 py-4 text-sm text-slate-700`}>
                          <div className="truncate" title={item.chargeName}>
                            {item.chargeName}
                          </div>
                        </td>
                      )}
                      {effectiveVisibleColumns.includes('amountDue') && <td className={`${getColumnWidthClass('amountDue')} px-3 py-4 text-right text-sm font-bold text-slate-800 whitespace-nowrap`}>{money(item.amountDue)}</td>}
                      {effectiveVisibleColumns.includes('overdueDays') && (
                        <td className={`${getColumnWidthClass('overdueDays')} px-3 py-4 text-sm whitespace-nowrap`}>
                          {item.overdueDays > 0 ? <span className="font-bold text-red-600">{item.overdueDays} ngày</span> : <span className="text-slate-400">0 ngày</span>}
                        </td>
                      )}
                      {effectiveVisibleColumns.includes('paidAmount') && <td className={`${getColumnWidthClass('paidAmount')} px-3 py-4 text-right text-sm font-semibold text-emerald-700 whitespace-nowrap`}>{money(item.paidAmount)}</td>}
                      {effectiveVisibleColumns.includes('remainingAmount') && <td className={`${getColumnWidthClass('remainingAmount')} px-3 py-4 text-right text-sm font-bold text-slate-900 whitespace-nowrap`}>{money(item.remainingAmount)}</td>}
                      {effectiveVisibleColumns.includes('dueDate') && <td className={`${getColumnWidthClass('dueDate')} px-3 py-4 text-sm text-slate-700 whitespace-nowrap`}>{formatDate(item.dueDate)}</td>}
                      {effectiveVisibleColumns.includes('paymentStatus') && (
                        <td className={`${getColumnWidthClass('paymentStatus')} px-3 py-4`}>
                          <span className={`inline-block whitespace-nowrap rounded px-2.5 py-1 text-xs font-bold border ${STATUS_META[item.paymentStatus].badge}`}>
                            {STATUS_META[item.paymentStatus].label}
                          </span>
                        </td>
                      )}
                      {effectiveVisibleColumns.includes('ownerName') && (
                        <td className={`${getColumnWidthClass('ownerName')} px-3 py-4 text-sm text-slate-700`}>
                          <div className="truncate" title={item.ownerName}>
                            {item.ownerName}
                          </div>
                        </td>
                      )}
                      {effectiveVisibleColumns.includes('branchName') && (
                        <td className={`${getColumnWidthClass('branchName')} px-3 py-4 text-sm text-slate-700`}>
                          <div className="truncate" title={item.branchName}>
                            {item.branchName}
                          </div>
                        </td>
                      )}
                      {effectiveVisibleColumns.includes('note') && (
                        <td className={`${getColumnWidthClass('note')} px-3 py-4 text-sm text-slate-600`}>
                          <div className="truncate" title={item.note}>
                            {item.note}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                  )
                ) : (
                  <tr>
                    <td colSpan={effectiveVisibleColumns.length} className="py-12 text-center italic text-slate-400">
                      Không tìm thấy dữ liệu công nợ phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-200 bg-slate-50 px-6 py-4">
            <span className="text-xs font-bold text-slate-500">Tổng số: {filteredRows.length} bản ghi</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceDebtList;
