import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GraduationCap, Settings2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  getStudyAbroadCaseList,
  StudyAbroadCaseCompleteness,
  StudyAbroadCaseRecord,
  StudyAbroadCmtcStatus,
  StudyAbroadInvoiceStatus,
  StudyAbroadServiceStatus
} from '../services/studyAbroadCases.local';
import PinnedSearchInput, { PinnedSearchChip } from '../components/PinnedSearchInput';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import { decodeMojibakeReactNode } from '../utils/mojibake';

type ColumnId =
  | 'student'
  | 'address'
  | 'phone'
  | 'country'
  | 'program'
  | 'major'
  | 'salesperson'
  | 'branch'
  | 'intake'
  | 'stage'
  | 'caseCompleteness'
  | 'certificate'
  | 'serviceStatus'
  | 'tuition'
  | 'invoiceStatus'
  | 'cmtc'
  | 'expectedFlightTerm';

interface ColumnConfig {
  id: ColumnId;
  label: string;
}

const COLUMN_CONFIGS: ColumnConfig[] = [
  { id: 'student', label: 'Học viên' },
  { id: 'address', label: 'Địa chỉ' },
  { id: 'phone', label: 'SĐT' },
  { id: 'country', label: 'Quốc gia' },
  { id: 'program', label: 'Chương trình' },
  { id: 'major', label: 'Ngành' },
  { id: 'salesperson', label: 'Salesperson' },
  { id: 'branch', label: 'Chi nhánh' },
  { id: 'intake', label: 'Kỳ nhập học' },
  { id: 'stage', label: 'Giai đoạn' },
  { id: 'caseCompleteness', label: 'Trạng thái hồ sơ' },
  { id: 'certificate', label: 'Chứng chỉ' },
  { id: 'serviceStatus', label: 'Trạng thái dịch vụ' },
  { id: 'tuition', label: 'Học phí' },
  { id: 'invoiceStatus', label: 'Trạng thái invoice' },
  { id: 'cmtc', label: 'CMTC' },
  { id: 'expectedFlightTerm', label: 'Kỳ bay dự kiến' }
];

const WATCHED_STORAGE_KEYS = new Set([
  'educrm_quotations',
  'educrm_leads_v2',
  'educrm_students',
  'educrm_admissions',
  'educrm_transactions',
  'educrm_invoices'
]);

const ALL_COLUMNS_VISIBLE = COLUMN_CONFIGS.reduce((acc, column) => {
  acc[column.id] = true;
  return acc;
}, {} as Record<ColumnId, boolean>);

const DEFAULT_VISIBLE_COLUMN_IDS: ColumnId[] = [
  'student',
  'phone',
  'country',
  'program',
  'salesperson',
  'stage',
  'serviceStatus',
  'invoiceStatus'
];

const DEFAULT_COLUMNS_VISIBLE = COLUMN_CONFIGS.reduce((acc, column) => {
  acc[column.id] = DEFAULT_VISIBLE_COLUMN_IDS.includes(column.id);
  return acc;
}, {} as Record<ColumnId, boolean>);

const formatCurrency = (value: number) =>
  `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Math.max(0, value || 0))} đ`;

const normalizeForSearch = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const getCaseCompletenessMeta = (status: StudyAbroadCaseCompleteness) => {
  if (status === 'FULL') return { label: 'Đủ hồ sơ', className: 'bg-emerald-50 text-emerald-700 border-emerald-100' };
  return { label: 'Chưa đủ', className: 'bg-amber-50 text-amber-700 border-amber-100' };
};

const getServiceStatusMeta = (status: StudyAbroadServiceStatus) => {
  if (status === 'NEW') return { label: 'Mới', className: 'bg-slate-100 text-slate-700 border-slate-200' };
  if (status === 'UNPROCESSED') return { label: 'Chưa xử lý', className: 'bg-slate-100 text-slate-700 border-slate-200' };
  if (status === 'PROCESSED') return { label: 'Đã xử lý', className: 'bg-blue-50 text-blue-700 border-blue-100' };
  if (status === 'DEPARTED') return { label: 'Đã bay', className: 'bg-emerald-50 text-emerald-700 border-emerald-100' };
  if (status === 'WITHDRAWN') return { label: 'Đã rút hồ sơ', className: 'bg-rose-50 text-rose-700 border-rose-100' };
  if (status === 'VISA_FAILED') return { label: 'Trượt visa', className: 'bg-rose-50 text-rose-700 border-rose-100' };
  return { label: 'Đang xử lý lại', className: 'bg-amber-50 text-amber-700 border-amber-100' };
};

const getInvoiceStatusMeta = (status: StudyAbroadInvoiceStatus) => {
  if (status === 'PAID') return { label: 'Đã nộp', className: 'bg-emerald-50 text-emerald-700 border-emerald-100' };
  if (status === 'HAS_INVOICE') return { label: 'Có invoice', className: 'bg-blue-50 text-blue-700 border-blue-100' };
  return { label: 'Chưa nộp', className: 'bg-slate-100 text-slate-700 border-slate-200' };
};

const getCmtcMeta = (status: StudyAbroadCmtcStatus) => {
  if (status === 'SUBMITTED') return { label: 'Đã nộp', className: 'bg-emerald-50 text-emerald-700 border-emerald-100' };
  if (status === 'OPENED') return { label: 'Đã mở tài khoản', className: 'bg-blue-50 text-blue-700 border-blue-100' };
  return { label: 'Chưa mở tài khoản', className: 'bg-slate-100 text-slate-700 border-slate-200' };
};

const TableBadge: React.FC<{ label: string; className: string }> = ({ label, className }) => (
  <span className={`inline-flex max-w-full items-center rounded-full border px-2 py-1 text-[10px] font-bold ${className}`}>
    <span className="truncate">{label}</span>
  </span>
);

const StudyAbroadStudentList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const columnMenuRef = useRef<HTMLDivElement | null>(null);
  const refreshTimerRef = useRef<number | null>(null);

  const [rows, setRows] = useState<StudyAbroadCaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [countryFilter, setCountryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | StudyAbroadServiceStatus>('ALL');
  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnId, boolean>>(DEFAULT_COLUMNS_VISIBLE);
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  const reloadCases = useCallback(() => {
    if (refreshTimerRef.current) {
      window.clearTimeout(refreshTimerRef.current);
    }

    setLoading(true);
    refreshTimerRef.current = window.setTimeout(() => {
      setRows(getStudyAbroadCaseList());
      setLoading(false);
    }, 120);
  }, []);

  useEffect(() => {
    reloadCases();
    return () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
      }
    };
  }, [reloadCases]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!columnMenuRef.current) return;
      if (columnMenuRef.current.contains(event.target as Node)) return;
      setShowColumnMenu(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (!event.key || WATCHED_STORAGE_KEYS.has(event.key)) {
        reloadCases();
      }
    };
    const handleClientRefresh = () => reloadCases();

    const watchEvents = [
      'educrm_cases_updated',
      'educrm:study-abroad-cases-changed',
      'educrm:quotations-changed',
      'educrm:leads-changed',
      'educrm:students-changed',
      'educrm:admissions-changed'
    ];

    window.addEventListener('storage', handleStorage);
    watchEvents.forEach((eventName) => window.addEventListener(eventName, handleClientRefresh));

    return () => {
      window.removeEventListener('storage', handleStorage);
      watchEvents.forEach((eventName) => window.removeEventListener(eventName, handleClientRefresh));
    };
  }, [reloadCases]);

  const canViewAllCases = user?.role === UserRole.ADMIN || user?.role === UserRole.FOUNDER;

  const scopedRows = useMemo(() => {
    if (!user || canViewAllCases) return rows;
    const currentUserName = normalizeForSearch(user.name);
    return rows.filter((row) => normalizeForSearch(row.salesperson) === currentUserName);
  }, [canViewAllCases, rows, user]);

  const countries = useMemo(() => {
    const values = Array.from(new Set(scopedRows.map((row) => row.country))).filter(Boolean);
    return values.sort((a, b) => a.localeCompare(b, 'vi'));
  }, [scopedRows]);

  const filteredRows = useMemo(() => {
    const keyword = normalizeForSearch(searchTerm);
    return scopedRows.filter((row) => {
      if (countryFilter !== 'ALL' && row.country !== countryFilter) return false;
      if (statusFilter !== 'ALL' && row.serviceStatus !== statusFilter) return false;

      if (!keyword) return true;
      const searchable = normalizeForSearch(
        [
          row.soCode,
          row.student,
          row.address,
          row.phone,
          row.country,
          row.program,
          row.major,
          row.salesperson,
          row.branch,
          row.intake,
          row.stage,
          row.certificate,
          row.expectedFlightTerm
        ].join(' ')
      );
      return searchable.includes(keyword);
    });
  }, [countryFilter, scopedRows, searchTerm, statusFilter]);

  const statusLabelMap: Record<'ALL' | StudyAbroadServiceStatus, string> = {
    ALL: 'Tat ca',
    NEW: 'Moi',
    UNPROCESSED: 'Chua xu ly',
    PROCESSED: 'Da xu ly',
    DEPARTED: 'Da bay',
    WITHDRAWN: 'Da rut ho so',
    VISA_FAILED: 'Truot visa',
    REPROCESSING: 'Dang xu ly lai'
  };

  const activeSearchChips = useMemo<PinnedSearchChip[]>(() => {
    const chips: PinnedSearchChip[] = [];

    if (countryFilter !== 'ALL') {
      chips.push({
        key: 'country',
        label: `Quoc gia: ${countryFilter}`
      });
    }

    if (statusFilter !== 'ALL') {
      chips.push({
        key: 'status',
        label: `Trang thai: ${statusLabelMap[statusFilter]}`
      });
    }

    return chips;
  }, [countryFilter, statusFilter]);

  const removeSearchChip = (chipKey: string) => {
    if (chipKey === 'country') {
      setCountryFilter('ALL');
      return;
    }
    if (chipKey === 'status') {
      setStatusFilter('ALL');
    }
  };

  const clearAllSearchFilters = () => {
    setSearchTerm('');
    setCountryFilter('ALL');
    setStatusFilter('ALL');
  };

  const visibleColumnList = useMemo(
    () => COLUMN_CONFIGS.filter((column) => visibleColumns[column.id]),
    [visibleColumns]
  );

  const visibleCount = visibleColumnList.length;
  const allChecked = visibleCount === COLUMN_CONFIGS.length;

  const toggleColumn = (columnId: ColumnId) => {
    setVisibleColumns((prev) => {
      const currentVisible = COLUMN_CONFIGS.filter((item) => prev[item.id]).length;
      if (prev[columnId] && currentVisible <= 1) return prev;
      return { ...prev, [columnId]: !prev[columnId] };
    });
  };

  const toggleAllColumns = (checked: boolean) => {
    if (checked) {
      setVisibleColumns({ ...ALL_COLUMNS_VISIBLE });
      return;
    }

    const onlyStudent: Record<ColumnId, boolean> = { ...ALL_COLUMNS_VISIBLE };
    COLUMN_CONFIGS.forEach((column) => {
      onlyStudent[column.id] = column.id === 'student';
    });
    setVisibleColumns(onlyStudent);
  };

  const renderCell = (row: StudyAbroadCaseRecord, columnId: ColumnId) => {
    if (columnId === 'student') return `${row.student} (${row.soCode})`;
    if (columnId === 'address') return row.address;
    if (columnId === 'phone') return row.phone;
    if (columnId === 'country') return row.country;
    if (columnId === 'program') return row.program;
    if (columnId === 'major') return row.major;
    if (columnId === 'salesperson') return row.salesperson;
    if (columnId === 'branch') return row.branch;
    if (columnId === 'intake') return row.intake;
    if (columnId === 'stage') return row.stage;
    if (columnId === 'certificate') return row.certificate;
    if (columnId === 'expectedFlightTerm') return row.expectedFlightTerm;
    if (columnId === 'tuition') return formatCurrency(row.tuition);

    if (columnId === 'caseCompleteness') {
      const meta = getCaseCompletenessMeta(row.caseCompleteness);
      return <TableBadge label={meta.label} className={meta.className} />;
    }
    if (columnId === 'serviceStatus') {
      const meta = getServiceStatusMeta(row.serviceStatus);
      return <TableBadge label={meta.label} className={meta.className} />;
    }
    if (columnId === 'invoiceStatus') {
      const meta = getInvoiceStatusMeta(row.invoiceStatus);
      return <TableBadge label={meta.label} className={meta.className} />;
    }

    const meta = getCmtcMeta(row.cmtc);
    return <TableBadge label={meta.label} className={meta.className} />;
  };

  const isBadgeColumn = (columnId: ColumnId) =>
    columnId === 'caseCompleteness' ||
    columnId === 'serviceStatus' ||
    columnId === 'invoiceStatus' ||
    columnId === 'cmtc';

  return decodeMojibakeReactNode(
    <div className="flex h-full flex-col overflow-hidden bg-[#f8fafc] text-[#111418]">
      <div className="mx-auto flex h-full w-full max-w-[1500px] flex-1 flex-col overflow-y-auto p-6 lg:p-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div className="flex min-w-72 flex-col gap-1">
            <h1 className="flex items-center gap-2 text-[32px] font-bold leading-tight tracking-[-0.015em] text-[#111418]">
              <GraduationCap size={32} className="text-blue-600" /> Hồ sơ Du học sinh
            </h1>
            <p className="text-sm font-normal leading-normal text-[#4c739a]">
              Quản lý danh sách hồ sơ du học tự sinh từ SO đã khóa. Mỗi khách hàng hiển thị 1 dòng.
            </p>
          </div>
          <button className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700">
            + Thêm hồ sơ
          </button>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-[#cfdbe7] bg-white px-4 py-3 shadow-sm">
          <div className="min-w-72 flex-1">
            <PinnedSearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Tim kiem hoc vien, ma ho so, sales, SDT..."
              chips={activeSearchChips}
              onRemoveChip={removeSearchChip}
              onClearAll={clearAllSearchFilters}
              clearAllAriaLabel="Xoa tat ca bo loc ho so du hoc"
              className="border-[#cfdbe7] bg-[#e7edf3]"
              inputClassName="h-7 text-sm text-[#111418] placeholder:text-[#4c739a]"
            />
          </div>

          <select
            value={countryFilter}
            onChange={(event) => setCountryFilter(event.target.value)}
            className="h-10 rounded-lg bg-[#e7edf3] px-3 text-sm font-medium text-[#111418] outline-none"
          >
            <option value="ALL">Quốc gia: Tất cả</option>
            {countries.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'ALL' | StudyAbroadServiceStatus)}
            className="h-10 rounded-lg bg-[#e7edf3] px-3 text-sm font-medium text-[#111418] outline-none"
          >
            <option value="ALL">Trạng thái: Tất cả</option>
            <option value="NEW">Mới</option>
            <option value="UNPROCESSED">Chưa xử lý</option>
            <option value="PROCESSED">Đã xử lý</option>
            <option value="REPROCESSING">Đang xử lý lại</option>
            <option value="DEPARTED">Đã bay</option>
            <option value="WITHDRAWN">Đã rút hồ sơ</option>
            <option value="VISA_FAILED">Trượt visa</option>
          </select>

          <div className="relative" ref={columnMenuRef}>
            <button
              onClick={() => setShowColumnMenu((prev) => !prev)}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#dbe5ef] bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Settings2 size={16} />
              Cột
            </button>

            {showColumnMenu && (
              <div className="absolute right-0 top-12 z-20 max-h-96 w-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
                <label className="mb-2 flex cursor-pointer items-center gap-2 border-b border-slate-100 pb-2 text-sm font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={(event) => toggleAllColumns(event.target.checked)}
                  />
                  Chọn tất cả cột
                </label>
                <div className="space-y-2">
                  {COLUMN_CONFIGS.map((column) => (
                    <label key={column.id} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={visibleColumns[column.id]}
                        onChange={() => toggleColumn(column.id)}
                      />
                      <span className="truncate">{column.label}</span>
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-slate-500">Cần tối thiểu 1 cột được chọn.</p>
              </div>
            )}
          </div>
        </div>

        <div className="mb-2 text-xs text-slate-500">
          Đang hiển thị {loading ? '...' : filteredRows.length} hồ sơ, {visibleCount}/{COLUMN_CONFIGS.length} cột. Nguồn dữ liệu: SO đã khóa.
        </div>

        <div className="overflow-hidden rounded-xl border border-[#cfdbe7] bg-white shadow-sm">
          <div className="w-full overflow-x-hidden">
            <table className="w-full table-fixed border-collapse text-left">
              <thead className="border-b border-[#cfdbe7] bg-[#f8fafc]">
                <tr>
                  <th className="w-16 px-2 py-3 text-center text-[11px] font-bold uppercase tracking-wide text-[#111418]">STT</th>
                  {visibleColumnList.map((column) => (
                    <th
                      key={column.id}
                      className="px-2 py-3 text-[11px] font-bold uppercase tracking-wide text-[#111418]"
                    >
                      <div className="min-w-0 truncate whitespace-nowrap">{column.label}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef3f8]">
                {loading &&
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={`skeleton-${index}`}>
                      <td colSpan={visibleColumnList.length + 1} className="px-3 py-3">
                        <div className="h-8 animate-pulse rounded bg-slate-100" />
                      </td>
                    </tr>
                  ))}

                {!loading &&
                  filteredRows.map((row, index) => (
                    <tr
                      key={row.id}
                      className="cursor-pointer transition-colors hover:bg-[#f8fafc]"
                      onClick={() => navigate(`/study-abroad/cases/${row.id}`)}
                    >
                      <td className="px-2 py-2.5 text-center text-sm font-semibold text-slate-500">{index + 1}</td>
                      {visibleColumnList.map((column) => {
                        const value = renderCell(row, column.id);
                        return (
                          <td key={column.id} className="px-2 py-2.5 align-middle text-sm text-[#111418]">
                            {isBadgeColumn(column.id) ? (
                              <div className="min-w-0 truncate whitespace-nowrap">{value}</div>
                            ) : (
                              <div className="min-w-0 truncate whitespace-nowrap" title={String(value)}>
                                {value}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}

                {!loading && filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={visibleColumnList.length + 1} className="px-3 py-8 text-center text-sm font-medium text-slate-500">
                      Không có dữ liệu theo bộ lọc hiện tại.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudyAbroadStudentList;

