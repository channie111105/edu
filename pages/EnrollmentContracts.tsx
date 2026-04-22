import React, { useEffect, useMemo, useState } from 'react';
import { Edit3, ExternalLink, FileText, Printer, RotateCcw, Save, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ContractStatus, IContract, IQuotation, QuotationStatus } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { AdvancedFilterDropdown, ToolbarTimeFilter } from '../components/filters';
import { CONTRACT_FIELD_CONFIG, EditableContractFieldKey } from '../utils/contractFields';
import {
  CustomDateRange,
  ToolbarOption,
  ToolbarValueOption,
  doesDateMatchTimeRange,
  getTimeRangeSummaryLabel
} from '../utils/filterToolbar';
import { decodeMojibakeReactNode, decodeMojibakeText } from '../utils/mojibake';
import { getContracts, getPrimaryQuotationStudentName, getQuotations, updateContract } from '../utils/storage';
import PinnedSearchInput, { PinnedSearchChip } from '../components/PinnedSearchInput';

type ContractEditFormState = Record<EditableContractFieldKey, string>;

const statusConfig: Record<ContractStatus, { label: string; badge: string }> = {
  [ContractStatus.DRAFT]: { label: 'Nháp', badge: 'bg-slate-100 text-slate-700' },
  [ContractStatus.SENT]: { label: 'Đã gửi', badge: 'bg-blue-100 text-blue-700' },
  [ContractStatus.SIGNED]: { label: 'Đã ký', badge: 'bg-emerald-100 text-emerald-700' },
  [ContractStatus.ACTIVE]: { label: 'Active', badge: 'bg-indigo-100 text-indigo-700' },
  [ContractStatus.COMPLETED]: { label: 'Hoàn tất', badge: 'bg-violet-100 text-violet-700' },
  [ContractStatus.CANCELLED]: { label: 'Hủy', badge: 'bg-rose-100 text-rose-700' }
};

const contractStatusOptions = Object.values(ContractStatus) as ContractStatus[];
const CONTRACT_PRINT_STATUS_OPTIONS = ['Đã in', 'Chưa in'] as const;

const SALES_PERSON_LABELS: Record<string, string> = {
  u1: 'Trần Văn Quản Trị',
  u2: 'Sarah Miller',
  u3: 'David Clark',
  u4: 'Alex Rivera'
};

const CONTRACT_TOOLBAR_TIME_FIELD_OPTIONS = [
  { id: 'signedDate', label: 'Ngày ký' },
  { id: 'importedAt', label: 'Ngày tạo (import)' }
] as const satisfies ReadonlyArray<ToolbarOption>;
const CONTRACT_TOOLBAR_TIME_GROUP_LABEL = 'Hành động';
const CONTRACT_TOOLBAR_TIME_PLACEHOLDER = 'action';
const DEFAULT_CONTRACT_ACTION_FIELD = 'signedDate';

const CONTRACT_TOOLBAR_TIME_PRESETS = [
  { id: 'all', label: 'Tất cả thời gian' },
  { id: 'today', label: 'Hôm nay' },
  { id: 'yesterday', label: 'Hôm qua' },
  { id: 'thisWeek', label: 'Tuần này' },
  { id: 'last7Days', label: '7 ngày qua' },
  { id: 'last30Days', label: '30 ngày qua' },
  { id: 'thisMonth', label: 'Tháng này' },
  { id: 'lastMonth', label: 'Tháng trước' },
  { id: 'custom', label: 'Tùy chỉnh khoảng...' }
] as const satisfies ReadonlyArray<ToolbarOption>;

const CONTRACT_TOOLBAR_FILTER_OPTIONS = [
  { id: 'salesperson', label: 'Sale' },
  { id: 'status', label: 'Trạng thái' },
  { id: 'branch', label: 'Cơ sở' },
  { id: 'product', label: 'Sản phẩm' },
  { id: 'month', label: 'Tháng' },
  { id: 'printStatus', label: 'Trạng thái in' }
] as const satisfies ReadonlyArray<ToolbarOption>;

const CONTRACT_TOOLBAR_GROUP_OPTIONS = [
  { id: 'salesperson', label: 'Sale' },
  { id: 'status', label: 'Trạng thái' },
  { id: 'branch', label: 'Cơ sở' },
  { id: 'product', label: 'Sản phẩm' },
  { id: 'month', label: 'Tháng' }
] as const satisfies ReadonlyArray<ToolbarOption>;

type ContractTimeField = (typeof CONTRACT_TOOLBAR_TIME_FIELD_OPTIONS)[number]['id'];
type ContractTimeFieldSelection = typeof CONTRACT_TOOLBAR_TIME_PLACEHOLDER | ContractTimeField;
type ContractTimeRangeType = (typeof CONTRACT_TOOLBAR_TIME_PRESETS)[number]['id'];
type ContractAdvancedFilterFieldKey = (typeof CONTRACT_TOOLBAR_FILTER_OPTIONS)[number]['id'];
type ContractAdvancedGroupFieldKey = (typeof CONTRACT_TOOLBAR_GROUP_OPTIONS)[number]['id'];

type ContractListRow = {
  contract: IContract;
  quotation?: IQuotation;
  searchable: string;
  sortTime: number;
  normalizedStatus: ContractStatus | null;
  statusMeta: ReturnType<typeof getContractStatusMeta>;
  salespersonName: string;
  branchName: string;
  productName: string;
  signedDateValue?: string;
  importedDateValue?: string;
  printStatus: 'Đã in' | 'Chưa in';
};

const normalizeStatusToken = (value: unknown) =>
  decodeMojibakeText(typeof value === 'string' ? value : String(value || ''))
    .trim()
    .toLocaleLowerCase('vi-VN');

const contractStatusLookup = (() => {
  const lookup = new Map<string, ContractStatus>();
  contractStatusOptions.forEach((status) => {
    [status, statusConfig[status].label, status === ContractStatus.SENT ? 'Da gui' : '', status === ContractStatus.ACTIVE ? 'Dang hieu luc' : '', status === ContractStatus.CANCELLED ? 'Huy' : ''].forEach((candidate) => {
      const token = normalizeStatusToken(candidate);
      if (token) lookup.set(token, status);
    });
  });
  return lookup;
})();

const normalizeContractStatus = (value: unknown): ContractStatus | null => {
  const token = normalizeStatusToken(value);
  return token ? contractStatusLookup.get(token) || null : null;
};

const getContractStatusMeta = (value: unknown) => {
  const normalizedStatus = normalizeContractStatus(value);
  if (normalizedStatus) {
    return { key: normalizedStatus, ...statusConfig[normalizedStatus] };
  }
  return {
    key: null,
    label: decodeMojibakeText(String(value || '')).trim() || 'Unknown',
    badge: 'bg-slate-100 text-slate-500'
  };
};

const formatCurrency = (value?: number) => `${(value || 0).toLocaleString('vi-VN')} đ`;

const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('vi-VN');
};

const formatMonthKey = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const formatMonthLabel = (value: string) => {
  if (!value || value === '-') return 'Chưa có tháng';
  const [year, month] = value.split('-');
  if (!year || !month) return value;
  return `Tháng ${month}/${year}`;
};

const getContractTimeFieldLabel = (fieldId: ContractTimeFieldSelection) =>
  fieldId === CONTRACT_TOOLBAR_TIME_PLACEHOLDER
    ? CONTRACT_TOOLBAR_TIME_GROUP_LABEL
    : CONTRACT_TOOLBAR_TIME_FIELD_OPTIONS.find((option) => option.id === fieldId)?.label || fieldId;

const createContractEditForm = (contract: IContract, quotation?: IQuotation): ContractEditFormState => {
  const templateFields = contract.templateFields || {};
  const primaryStudentName = quotation ? getPrimaryQuotationStudentName(quotation) : '';
  return {
    customerName: String(templateFields.customerName || contract.customerName || primaryStudentName || '').trim(),
    studentName: String(templateFields.studentName || primaryStudentName || contract.customerName || '').trim(),
    studentPhone: String(templateFields.studentPhone || quotation?.studentPhone || '').trim(),
    identityCard: String(templateFields.identityCard || contract.cccdNumber || quotation?.identityCard || '').trim()
  };
};

const EnrollmentContracts: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [contracts, setContracts] = useState<IContract[]>([]);
  const [quotations, setQuotations] = useState<IQuotation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [timeFilterField, setTimeFilterField] = useState<ContractTimeFieldSelection>(CONTRACT_TOOLBAR_TIME_PLACEHOLDER);
  const [timeRangeType, setTimeRangeType] = useState<ContractTimeRangeType>('all');
  const [customRange, setCustomRange] = useState<CustomDateRange | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [selectedAdvancedFilterFields, setSelectedAdvancedFilterFields] = useState<ContractAdvancedFilterFieldKey[]>([]);
  const [selectedAdvancedFilterValue, setSelectedAdvancedFilterValue] = useState('');
  const [selectedAdvancedGroupFields, setSelectedAdvancedGroupFields] = useState<ContractAdvancedGroupFieldKey[]>([]);
  const [editingContract, setEditingContract] = useState<IContract | null>(null);
  const [editingQuotation, setEditingQuotation] = useState<IQuotation | undefined>(undefined);
  const [contractEditForm, setContractEditForm] = useState<ContractEditFormState>({
    customerName: '',
    studentName: '',
    studentPhone: '',
    identityCard: ''
  });

  useEffect(() => {
    const loadData = () => {
      setContracts(getContracts());
      setQuotations(getQuotations());
    };
    loadData();
    window.addEventListener('educrm:contracts-changed', loadData as EventListener);
    window.addEventListener('educrm:quotations-changed', loadData as EventListener);
    return () => {
      window.removeEventListener('educrm:contracts-changed', loadData as EventListener);
      window.removeEventListener('educrm:quotations-changed', loadData as EventListener);
    };
  }, []);

  const quotationMap = useMemo(() => new Map(quotations.map((item) => [item.id, item])), [quotations]);

  const closeEditModal = () => {
    setEditingContract(null);
    setEditingQuotation(undefined);
    setContractEditForm({ customerName: '', studentName: '', studentPhone: '', identityCard: '' });
  };

  const openEditModal = (contract: IContract, quotation?: IQuotation) => {
    setEditingContract(contract);
    setEditingQuotation(quotation);
    setContractEditForm(createContractEditForm(contract, quotation));
  };

  const handleContractFieldChange = (field: EditableContractFieldKey, value: string) => {
    setContractEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveContractEdit = () => {
    if (!editingContract) return;
    const actor = user?.name || user?.id || 'system';
    const normalizedFields: ContractEditFormState = {
      customerName: contractEditForm.customerName.trim(),
      studentName: contractEditForm.studentName.trim(),
      studentPhone: contractEditForm.studentPhone.trim(),
      identityCard: contractEditForm.identityCard.trim()
    };
    const nextContract: IContract = {
      ...editingContract,
      customerName:
        normalizedFields.customerName ||
        editingQuotation?.customerName ||
        editingContract.customerName ||
        normalizedFields.studentName,
      cccdNumber: normalizedFields.identityCard || editingContract.cccdNumber,
      templateFields: { ...(editingContract.templateFields || {}), ...normalizedFields },
      importedAt: new Date().toISOString(),
      importedBy: actor
    };
    updateContract(nextContract);
    closeEditModal();
  };

  const selectedAdvancedFilterOptions = useMemo(
    () =>
      selectedAdvancedFilterFields
        .map((fieldId) => CONTRACT_TOOLBAR_FILTER_OPTIONS.find((option) => option.id === fieldId))
        .filter((option): option is (typeof CONTRACT_TOOLBAR_FILTER_OPTIONS)[number] => Boolean(option)),
    [selectedAdvancedFilterFields]
  );
  const activeAdvancedFilterField = selectedAdvancedFilterOptions[0] || null;
  const selectedAdvancedGroupOptions = useMemo(
    () =>
      selectedAdvancedGroupFields
        .map((fieldId) => CONTRACT_TOOLBAR_GROUP_OPTIONS.find((option) => option.id === fieldId))
        .filter((option): option is (typeof CONTRACT_TOOLBAR_GROUP_OPTIONS)[number] => Boolean(option)),
    [selectedAdvancedGroupFields]
  );
  const resolvedTimeFilterField =
    timeFilterField === CONTRACT_TOOLBAR_TIME_PLACEHOLDER ? DEFAULT_CONTRACT_ACTION_FIELD : timeFilterField;

  const getRowTimeFieldValue = (row: ContractListRow, fieldId: ContractTimeField = resolvedTimeFilterField) => {
    switch (fieldId) {
      case 'importedAt':
        return row.importedDateValue;
      case 'signedDate':
      default:
        return row.signedDateValue;
    }
  };

  const getMonthValueByField = (row: ContractListRow, fieldId: ContractTimeField = resolvedTimeFilterField) =>
    formatMonthKey(getRowTimeFieldValue(row, fieldId));

  const getAdvancedFieldValue = (
    row: ContractListRow,
    fieldId: ContractAdvancedFilterFieldKey | ContractAdvancedGroupFieldKey
  ) => {
    switch (fieldId) {
      case 'salesperson':
        return row.salespersonName;
      case 'status':
        return row.statusMeta.label;
      case 'branch':
        return row.branchName;
      case 'product':
        return row.productName;
      case 'month':
        return getMonthValueByField(row);
      case 'printStatus':
        return row.printStatus;
      default:
        return '-';
    }
  };

  const formatAdvancedFieldValue = (
    fieldId: ContractAdvancedFilterFieldKey | ContractAdvancedGroupFieldKey,
    value: string
  ) => {
    if (fieldId === 'branch' && value === '-') return 'Chưa có cơ sở';
    if (fieldId === 'month') return formatMonthLabel(value);
    return value || '-';
  };

  const enrichedRows = useMemo<ContractListRow[]>(
    () =>
      contracts.map((contract) => {
        const quotation = contract.quotationId ? quotationMap.get(contract.quotationId) : undefined;
        const statusMeta = getContractStatusMeta(contract.status);
        const salespersonName =
          decodeMojibakeText(
            String(
              quotation?.salespersonName ||
                contract.templateFields?.salespersonName ||
                SALES_PERSON_LABELS[contract.createdBy] ||
                contract.importedBy ||
                contract.createdBy ||
                '-'
            )
          ).trim() || '-';
        const branchName =
          decodeMojibakeText(String(contract.templateFields?.branchName || quotation?.branchName || '-')).trim() || '-';
        const productName =
          decodeMojibakeText(String(contract.templateFields?.productName || quotation?.product || '-')).trim() || '-';
        const signedDateValue = contract.signedDate || quotation?.confirmDate || quotation?.lockedAt || '';
        const importedDateValue = contract.importedAt || quotation?.createdAt || '';
        const printStatus = contract.fileUrl ? 'Đã in' : 'Chưa in';
        const searchable = [
          contract.code,
          contract.id,
          contract.customerName,
          contract.templateName,
          contract.templateFields?.studentPhone,
          contract.templateFields?.studentEmail,
          contract.templateFields?.identityCard,
          quotation?.soCode,
          quotation?.customerName,
          salespersonName,
          branchName,
          productName,
          statusMeta.label,
          printStatus,
          formatMonthLabel(formatMonthKey(signedDateValue)),
          formatMonthLabel(formatMonthKey(importedDateValue))
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        const sortTime = new Date(
          importedDateValue || signedDateValue || quotation?.updatedAt || quotation?.createdAt || Date.now()
        ).getTime();

        return {
          contract,
          quotation,
          searchable,
          sortTime,
          normalizedStatus: normalizeContractStatus(contract.status),
          statusMeta,
          salespersonName,
          branchName,
          productName,
          signedDateValue,
          importedDateValue,
          printStatus
        };
      }),
    [contracts, quotationMap]
  );

  const toggleAdvancedFieldSelection = (
    type: 'filter' | 'group',
    fieldId: ContractAdvancedFilterFieldKey | ContractAdvancedGroupFieldKey
  ) => {
    if (type === 'filter') {
      setSelectedAdvancedFilterValue('');
      setSelectedAdvancedFilterFields((prev) =>
        prev.includes(fieldId as ContractAdvancedFilterFieldKey) ? [] : [fieldId as ContractAdvancedFilterFieldKey]
      );
      return;
    }

    setSelectedAdvancedGroupFields((prev) =>
      prev.includes(fieldId as ContractAdvancedGroupFieldKey)
        ? prev.filter((item) => item !== fieldId)
        : [...prev, fieldId as ContractAdvancedGroupFieldKey]
    );
  };

  const sortSelectableValues = (fieldId: ContractAdvancedFilterFieldKey, values: string[]) => {
    if (fieldId === 'month') return [...values].sort((left, right) => right.localeCompare(left, 'vi'));

    if (fieldId === 'status') {
      const statusOrder = new Map(contractStatusOptions.map((status, index) => [statusConfig[status].label, index]));
      return [...values].sort((left, right) => {
        const leftOrder = statusOrder.get(left) ?? Number.MAX_SAFE_INTEGER;
        const rightOrder = statusOrder.get(right) ?? Number.MAX_SAFE_INTEGER;
        if (leftOrder !== rightOrder) return leftOrder - rightOrder;
        return left.localeCompare(right, 'vi');
      });
    }

    if (fieldId === 'printStatus') {
      const printOrder = new Map([
        ['Đã in', 0],
        ['Chưa in', 1]
      ]);
      return [...values].sort((left, right) => (printOrder.get(left) ?? 99) - (printOrder.get(right) ?? 99));
    }

    return [...values].sort((left, right) => left.localeCompare(right, 'vi'));
  };

  const getPresetAdvancedFilterValues = (fieldId: ContractAdvancedFilterFieldKey): string[] => {
    switch (fieldId) {
      case 'status':
        return contractStatusOptions.map((status) => statusConfig[status].label);
      case 'printStatus':
        return [...CONTRACT_PRINT_STATUS_OPTIONS];
      default:
        return [];
    }
  };

  const advancedFilterSelectableValues = useMemo<ReadonlyArray<ToolbarValueOption>>(() => {
    if (!activeAdvancedFilterField) return [];

    const activeFieldId = activeAdvancedFilterField.id as ContractAdvancedFilterFieldKey;
    const derivedValues = enrichedRows.map((row) => getAdvancedFieldValue(row, activeFieldId));

    return sortSelectableValues(
      activeFieldId,
      Array.from(new Set([...getPresetAdvancedFilterValues(activeFieldId), ...derivedValues].filter(Boolean)))
    ).map((value) => ({
      value,
      label: formatAdvancedFieldValue(activeFieldId, value)
    }));
  }, [activeAdvancedFilterField, enrichedRows, resolvedTimeFilterField]);

  const filteredRows = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return enrichedRows
      .filter((row) => {
        if (keyword && !row.searchable.includes(keyword)) return false;
        if (!doesDateMatchTimeRange(getRowTimeFieldValue(row), timeRangeType, customRange)) return false;
        if (
          activeAdvancedFilterField &&
          selectedAdvancedFilterValue &&
          getAdvancedFieldValue(row, activeAdvancedFilterField.id as ContractAdvancedFilterFieldKey) !==
            selectedAdvancedFilterValue
        ) {
          return false;
        }
        return true;
      })
      .sort((left, right) => {
        if (selectedAdvancedGroupFields.length > 0) {
          const leftGroup = selectedAdvancedGroupFields.map((fieldId) => getAdvancedFieldValue(left, fieldId)).join('||');
          const rightGroup = selectedAdvancedGroupFields.map((fieldId) => getAdvancedFieldValue(right, fieldId)).join('||');
          const groupCompare = leftGroup.localeCompare(rightGroup, 'vi');
          if (groupCompare !== 0) return groupCompare;
        }
        return right.sortTime - left.sortTime;
      });
  }, [
    activeAdvancedFilterField,
    customRange,
    enrichedRows,
    searchTerm,
    selectedAdvancedFilterValue,
    selectedAdvancedGroupFields,
    timeFilterField,
    timeRangeType
  ]);

  const getGroupValue = (row: ContractListRow) =>
    selectedAdvancedGroupFields.map((fieldId) => getAdvancedFieldValue(row, fieldId)).join('||');

  const getGroupLabel = (row: ContractListRow) =>
    selectedAdvancedGroupFields
      .map(
        (fieldId, index) =>
          `${selectedAdvancedGroupOptions[index]?.label || fieldId}: ${formatAdvancedFieldValue(
            fieldId,
            getAdvancedFieldValue(row, fieldId)
          )}`
      )
      .join(' • ');

  const groupedRows = useMemo(() => {
    let lastGroupValue = '';
    let rowNumber = 0;

    return filteredRows.flatMap((row) => {
      const groupValue = getGroupValue(row);
      const renderedRows: React.ReactNode[] = [];

      if (selectedAdvancedGroupFields.length > 0 && groupValue !== lastGroupValue) {
        lastGroupValue = groupValue;
        renderedRows.push(
          <tr key={`group-${groupValue}`} className="bg-slate-50/80">
            <td colSpan={9} className="px-4 py-2 text-xs font-semibold text-slate-600">
              {getGroupLabel(row) || '-'}
            </td>
          </tr>
        );
      }

      const { contract, quotation } = row;
      const canPrint = Boolean(quotation?.id && quotation.status === QuotationStatus.LOCKED);
      const currentIndex = ++rowNumber;

      renderedRows.push(
        <tr key={contract.id} className="hover:bg-slate-50">
          <td className="px-4 py-3 text-center font-semibold text-slate-500">{currentIndex}</td>
          <td className="px-4 py-3">
            <div className="font-semibold text-blue-700">{contract.code}</div>
            <div className="text-xs text-slate-500">{contract.id}</div>
          </td>
          <td className="px-4 py-3">
            <div className="font-semibold text-slate-900">{contract.customerName || '-'}</div>
            <div className="text-xs text-slate-500">
              {contract.templateFields?.studentPhone || '-'} • {contract.templateFields?.studentEmail || '-'}
            </div>
          </td>
          <td className="px-4 py-3">
            {quotation ? (
              <div>
                <div className="font-semibold">{quotation.soCode}</div>
                <div className="text-xs text-slate-500">{quotation.customerName}</div>
              </div>
            ) : (
              <span className="text-slate-400 italic">Chưa nối SO</span>
            )}
          </td>
          <td className="px-4 py-3">
            <div className="font-medium text-slate-800">{contract.templateName || '-'}</div>
            <div className="text-xs text-slate-500">Import: {formatDate(contract.importedAt)}</div>
          </td>
          <td className="px-4 py-3 font-semibold text-slate-900">{formatCurrency(contract.totalValue)}</td>
          <td className="px-4 py-3">
            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${row.statusMeta.badge}`}>
              {row.statusMeta.label}
            </span>
          </td>
          <td className="px-4 py-3">{formatDate(contract.signedDate)}</td>
          <td className="px-4 py-3">
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => openEditModal(contract, quotation)}
                className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100"
              >
                <Edit3 size={12} />
                Sửa HĐ
              </button>
              <button
                type="button"
                onClick={() => quotation?.id && navigate(`/contracts/quotations/${quotation.id}?tab=contract`)}
                disabled={!quotation?.id}
                className="inline-flex items-center gap-1 rounded border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ExternalLink size={12} />
                Mở SO
              </button>
              <button
                type="button"
                onClick={() => quotation?.id && navigate(`/contracts/quotations/${quotation.id}/contract`)}
                disabled={!canPrint}
                className="inline-flex items-center gap-1 rounded bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Printer size={12} />
                In mẫu
              </button>
            </div>
          </td>
        </tr>
      );

      return renderedRows;
    });
  }, [filteredRows, navigate, selectedAdvancedGroupFields, selectedAdvancedGroupOptions]);

  const advancedToolbarActiveCount =
    selectedAdvancedGroupFields.length + (selectedAdvancedFilterValue ? 1 : 0);
  const hasAdvancedToolbarFilters =
    selectedAdvancedGroupFields.length > 0 || Boolean(selectedAdvancedFilterValue);

  const activeSearchChips = useMemo<PinnedSearchChip[]>(() => {
    const chips: PinnedSearchChip[] = [];

    if (activeAdvancedFilterField && selectedAdvancedFilterValue) {
      chips.push({
        key: 'advancedFilter',
        label: `${activeAdvancedFilterField.label}: ${formatAdvancedFieldValue(
          activeAdvancedFilterField.id as ContractAdvancedFilterFieldKey,
          selectedAdvancedFilterValue
        )}`
      });
    }

    if (selectedAdvancedGroupFields.length > 0) {
      chips.push({
        key: 'groupMode',
        label: `Nhóm theo: ${selectedAdvancedGroupOptions.map((option) => option.label).join(', ')}`
      });
    }

    if (timeRangeType !== 'all') {
      chips.push({
        key: 'time',
        label: `${getContractTimeFieldLabel(timeFilterField)}: ${getTimeRangeSummaryLabel(
          CONTRACT_TOOLBAR_TIME_PRESETS,
          timeRangeType,
          customRange
        )}`
      });
    }

    return chips;
  }, [
    activeAdvancedFilterField,
    customRange,
    selectedAdvancedFilterValue,
    selectedAdvancedGroupFields.length,
    selectedAdvancedGroupOptions,
    timeFilterField,
    timeRangeType
  ]);

  const removeSearchChip = (chipKey: string) => {
    switch (chipKey) {
      case 'advancedFilter':
        setSelectedAdvancedFilterFields([]);
        setSelectedAdvancedFilterValue('');
        break;
      case 'groupMode':
        setSelectedAdvancedGroupFields([]);
        break;
      case 'time':
        setTimeFilterField(CONTRACT_TOOLBAR_TIME_PLACEHOLDER);
        setTimeRangeType('all');
        setCustomRange(null);
        setShowTimePicker(false);
        break;
      default:
        break;
    }
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setTimeFilterField(CONTRACT_TOOLBAR_TIME_PLACEHOLDER);
    setTimeRangeType('all');
    setCustomRange(null);
    setShowTimePicker(false);
    setShowFilterDropdown(false);
    setSelectedAdvancedFilterFields([]);
    setSelectedAdvancedFilterValue('');
    setSelectedAdvancedGroupFields([]);
  };

  const handleTimeFilterOpenChange = (nextOpen: boolean) => {
    setShowFilterDropdown(false);
    setShowTimePicker(nextOpen);
  };

  const handleTimeFilterFieldChange = (fieldId: string) => {
    setShowFilterDropdown(false);
    setShowTimePicker(false);
    setTimeFilterField(fieldId as ContractTimeFieldSelection);
  };

  const handleTimePresetSelect = (presetId: string) => {
    setTimeRangeType(presetId as ContractTimeRangeType);
    if (presetId !== 'custom') {
      setShowTimePicker(false);
    }
  };

  const handleApplyCustomTimeRange = () => {
    if (customRange?.start && customRange?.end) {
      setTimeRangeType('custom');
      setShowTimePicker(false);
      return;
    }
    window.alert('Vui lòng chọn khoảng ngày');
  };

  const handleAdvancedFilterOpenChange = (nextOpen: boolean) => {
    setShowTimePicker(false);
    setShowFilterDropdown(nextOpen);
  };

  const handleAdvancedFilterValueChange = (nextValue: string) => {
    setSelectedAdvancedFilterValue(nextValue);
  };

  const summary = useMemo(() => {
    const total = contracts.length;
    const signed = contracts.filter((item) => {
      const normalizedStatus = normalizeContractStatus(item.status);
      return normalizedStatus === ContractStatus.SIGNED || normalizedStatus === ContractStatus.ACTIVE;
    }).length;
    const totalValue = contracts.reduce((sum, item) => sum + (item.totalValue || 0), 0);
    return { total, signed, totalValue };
  }, [contracts]);

  return decodeMojibakeReactNode(
    <div className="mx-auto max-w-7xl p-6 font-sans text-slate-800">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Hợp đồng</h1>
          <p className="mt-1 text-sm text-slate-500">
            Danh sách hợp đồng lưu riêng từ báo giá. Dữ liệu import được nối trường để in theo mẫu hợp đồng.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
            Tổng HĐ: <span className="font-bold text-slate-900">{summary.total}</span>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
            Đã ký/Active: <span className="font-bold text-emerald-700">{summary.signed}</span>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
            Tổng giá trị: <span className="font-bold text-blue-700">{formatCurrency(summary.totalValue)}</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex min-h-[34px] items-center gap-2 rounded-lg bg-emerald-50 px-3.5 text-[12px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
            >
              <RotateCcw size={15} />
              Đặt lại
            </button>

            <ToolbarTimeFilter
              isOpen={showTimePicker}
              fieldOptions={CONTRACT_TOOLBAR_TIME_FIELD_OPTIONS}
              fieldPlaceholderValue={CONTRACT_TOOLBAR_TIME_PLACEHOLDER}
              fieldPlaceholderLabel={CONTRACT_TOOLBAR_TIME_GROUP_LABEL}
              selectedField={timeFilterField}
              selectedRangeType={timeRangeType}
              customRange={customRange}
              presets={CONTRACT_TOOLBAR_TIME_PRESETS}
              onOpenChange={handleTimeFilterOpenChange}
              onFieldChange={handleTimeFilterFieldChange}
              onPresetSelect={handleTimePresetSelect}
              onCustomRangeChange={setCustomRange}
              onReset={() => {
                setTimeFilterField(CONTRACT_TOOLBAR_TIME_PLACEHOLDER);
                setTimeRangeType('all');
                setCustomRange(null);
                setShowTimePicker(false);
              }}
              onCancel={() => setShowTimePicker(false)}
              onApplyCustomRange={handleApplyCustomTimeRange}
              className="shrink-0"
            />

            <div className="min-w-[280px] flex-1">
              <PinnedSearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Tìm theo mã hợp đồng, SO, khách hàng, CCCD..."
                chips={activeSearchChips}
                onRemoveChip={removeSearchChip}
                onClearAll={clearAllFilters}
                clearAllAriaLabel="Xóa tất cả bộ lọc hợp đồng"
                inputClassName="text-sm h-7"
              />
            </div>

            <AdvancedFilterDropdown
              isOpen={showFilterDropdown}
              activeCount={advancedToolbarActiveCount}
              hasActiveFilters={hasAdvancedToolbarFilters}
              filterOptions={CONTRACT_TOOLBAR_FILTER_OPTIONS}
              groupOptions={CONTRACT_TOOLBAR_GROUP_OPTIONS}
              selectedFilterFieldIds={selectedAdvancedFilterFields}
              selectedGroupFieldIds={selectedAdvancedGroupFields}
              activeFilterField={activeAdvancedFilterField}
              selectableValues={advancedFilterSelectableValues}
              selectedFilterValue={selectedAdvancedFilterValue}
              onOpenChange={handleAdvancedFilterOpenChange}
              onToggleFilterField={(fieldId) =>
                toggleAdvancedFieldSelection('filter', fieldId as ContractAdvancedFilterFieldKey)
              }
              onToggleGroupField={(fieldId) =>
                toggleAdvancedFieldSelection('group', fieldId as ContractAdvancedGroupFieldKey)
              }
              onFilterValueChange={handleAdvancedFilterValueChange}
              onClearAll={() => {
                setSelectedAdvancedFilterFields([]);
                setSelectedAdvancedFilterValue('');
                setSelectedAdvancedGroupFields([]);
              }}
              triggerLabel="Bộ lọc nâng cao"
              filterDescription="Chọn 1 trường rồi chọn giá trị tương ứng để lọc nhanh danh sách hợp đồng ghi danh."
              groupDescription="Có thể chọn nhiều trường. Thứ tự bấm sẽ là thứ tự ghép nhóm hiển thị trong bảng."
              triggerClassName="min-h-[34px] rounded-lg px-3 py-1.5 text-[12px] shadow-sm"
              className="shrink-0"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-b-xl">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase text-slate-500">
              <tr>
                <th className="w-16 px-4 py-3 text-center">STT</th>
                <th className="px-4 py-3">Mã HĐ</th>
                <th className="px-4 py-3">Khách hàng</th>
                <th className="px-4 py-3">SO liên quan</th>
                <th className="px-4 py-3">Mẫu</th>
                <th className="px-4 py-3">Giá trị</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Ngày ký</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {groupedRows.length ? (
                groupedRows
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <FileText size={22} className="text-slate-300" />
                      <span>Chưa có hợp đồng phù hợp bộ lọc.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" onClick={closeEditModal}>
          <div
            className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Sửa hợp đồng</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Chỉ cho sửa các trường được nối từ tab hợp đồng của báo giá.
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                title="Đóng"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-4 text-sm md:grid-cols-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Mã hợp đồng</div>
                <div className="mt-1 font-semibold text-slate-800">{editingContract.code}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">SO liên quan</div>
                <div className="mt-1 font-semibold text-slate-800">{editingQuotation?.soCode || 'Chưa nối SO'}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Mẫu hợp đồng</div>
                <div className="mt-1 font-semibold text-slate-800">{editingContract.templateName || '-'}</div>
              </div>
            </div>

            <div className="grid gap-4 px-5 py-5 md:grid-cols-2">
              {CONTRACT_FIELD_CONFIG.map((field) => (
                <label key={field.key} className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    {field.label}
                  </span>
                  <input
                    type="text"
                    value={contractEditForm[field.key]}
                    onChange={(event) => handleContractFieldChange(field.key, event.target.value)}
                    placeholder={field.placeholder}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-800 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                onClick={closeEditModal}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveContractEdit}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <Save size={15} />
                Lưu trường nối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnrollmentContracts;
