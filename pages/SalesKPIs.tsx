import React, { useEffect, useRef, useState } from 'react';
import {
  Building2,
  CalendarRange,
  ChevronDown,
  CheckCircle2,
  Copy,
  Download,
  Filter,
  Layers3,
  Pencil,
  Plus,
  Save,
  TrendingUp,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  DealStage,
  IDeal,
  IQuotation,
  ISalesKpiTarget,
  ISalesTeam,
  QuotationStatus,
  UserRole,
} from '../types';
import {
  getDeals,
  getQuotations,
  getSalesKpis,
  getSalesTeams,
  upsertSalesKpis,
} from '../utils/storage';
import { decodeMojibakeReactNode } from '../utils/mojibake';
import SalesRoleTestSwitcher from '../components/SalesRoleTestSwitcher';
import { useSalesTestRole } from '../utils/salesTestRole';

type MemberProfile = {
  userId: string;
  name: string;
  role: string;
  branch: string;
  teamId: string;
  teamName: string;
  productFocus: string;
  assignKeywords: string[];
};

type DraftTargetMap = Record<
  string,
  {
    targetRevenue: string;
    targetContracts: string;
  }
>;

type MemberKpiRow = MemberProfile & {
  targetRevenue: number;
  actualRevenue: number;
  targetContracts: number;
  actualContracts: number;
  pipelineValue: number;
  progress: number;
};

type TeamKpiRow = {
  teamId: string;
  teamName: string;
  branch: string;
  productFocus: string;
  memberCount: number;
  targetRevenue: number;
  actualRevenue: number;
  targetContracts: number;
  actualContracts: number;
  pipelineValue: number;
  progress: number;
};

type TimeFilterValue = '1m' | '3m' | '6m' | '12m' | 'all' | 'custom';
type KpiModalMode = 'create' | 'edit';

const TIME_FILTER_OPTIONS: Array<{
  value: TimeFilterValue;
  label: string;
  months: number | null;
}> = [
  { value: '1m', label: '1 tháng', months: 1 },
  { value: '3m', label: '3 tháng', months: 3 },
  { value: '6m', label: '6 tháng', months: 6 },
  { value: '12m', label: '12 tháng', months: 12 },
  { value: 'all', label: 'Toàn thời gian', months: null },
  { value: 'custom', label: 'Tùy chỉnh khoảng...', months: null },
];

const getMonthKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const shiftMonthKey = (period: string, diff: number) => {
  const [year, month] = period.split('-').map(Number);
  const base = new Date(year || new Date().getFullYear(), (month || 1) - 1 + diff, 1);
  return getMonthKey(base);
};

const getPeriodLabel = (period: string) => {
  const [year, month] = period.split('-');
  if (!year || !month) return period;
  return `Tháng ${month}/${year}`;
};

const parseDateValue = (value?: string | number | null) => {
  if (value === null || value === undefined || value === '') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const getDateMonthKey = (value?: string | number | null) => {
  const date = parseDateValue(value);
  if (!date) return '';
  return getMonthKey(date);
};

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);

const endOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

const parseDateInputValue = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateLabel = (date: Date) =>
  new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);

const getMonthBoundary = (period: string, boundary: 'start' | 'end') => {
  const [year, month] = period.split('-').map(Number);
  if (!year || !month) return null;
  if (boundary === 'start') {
    return new Date(year, month - 1, 1, 0, 0, 0, 0);
  }
  return new Date(year, month, 0, 23, 59, 59, 999);
};

const buildMonthRange = (startPeriod: string, endPeriod: string) => {
  if (!startPeriod || !endPeriod) return [];

  const periods: string[] = [];
  let cursor = startPeriod;
  let guard = 0;

  while (cursor <= endPeriod && guard < 240) {
    periods.push(cursor);
    cursor = shiftMonthKey(cursor, 1);
    guard += 1;
  }

  return periods;
};

const getPresetMonthRange = (monthsCount: number, anchorDate: Date) => {
  const anchorMonth = getMonthKey(anchorDate);
  const months = Array.from({ length: monthsCount }, (_, index) =>
    shiftMonthKey(anchorMonth, index - monthsCount + 1)
  );

  return {
    months,
    start: months.length > 0 ? getMonthBoundary(months[0], 'start') : null,
    end: endOfDay(anchorDate),
  };
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatCompactCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value || 0);

const getInitials = (name: string) =>
  String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || '?';

const isWonQuotation = (quotation: IQuotation) =>
  quotation.status === QuotationStatus.LOCKED ||
  quotation.contractStatus === 'signed_contract' ||
  quotation.contractStatus === 'enrolled' ||
  quotation.contractStatus === 'active';

const isOpenQuotation = (quotation: IQuotation) => quotation.status !== QuotationStatus.LOCKED;

const getProgressValue = (
  targetRevenue: number,
  actualRevenue: number,
  targetContracts: number,
  actualContracts: number
) => {
  const revenueProgress =
    targetRevenue > 0
      ? (actualRevenue / targetRevenue) * 100
      : actualRevenue > 0
        ? 100
        : 0;
  const contractProgress =
    targetContracts > 0
      ? (actualContracts / targetContracts) * 100
      : actualContracts > 0
        ? 100
        : 0;

  if (targetRevenue > 0 && targetContracts > 0) {
    return Math.round((revenueProgress + contractProgress) / 2);
  }
  if (targetRevenue > 0) return Math.round(revenueProgress);
  if (targetContracts > 0) return Math.round(contractProgress);
  return 0;
};

const getStatusMeta = (progress: number) => {
  if (progress >= 100) {
    return {
      label: 'Vượt KPI',
      badgeClass: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
      barClass: 'bg-emerald-500',
    };
  }
  if (progress >= 80) {
    return {
      label: 'Đạt yêu cầu',
      badgeClass: 'border border-blue-200 bg-blue-50 text-blue-700',
      barClass: 'bg-blue-500',
    };
  }
  if (progress > 0) {
    return {
      label: 'Cần bám sát',
      badgeClass: 'border border-amber-200 bg-amber-50 text-amber-700',
      barClass: 'bg-amber-500',
    };
  }
  return {
    label: 'Chưa có target',
    badgeClass: 'border border-slate-200 bg-slate-50 text-slate-600',
    barClass: 'bg-slate-300',
  };
};

const sanitizeNumericInput = (value: string) => value.replace(/[^\d]/g, '');

const SalesKPIs: React.FC = () => {
  const { user } = useAuth();
  const { salesTestRole } = useSalesTestRole(user?.role);
  const currentMonth = getMonthKey(new Date());
  const today = new Date();
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const canManageKpis =
    user?.role === UserRole.ADMIN ||
    user?.role === UserRole.FOUNDER ||
    salesTestRole === UserRole.SALES_LEADER;

  const [timeFilter, setTimeFilter] = useState<TimeFilterValue>('1m');
  const [customStartDate, setCustomStartDate] = useState(toDateInputValue(currentMonthStart));
  const [customEndDate, setCustomEndDate] = useState(toDateInputValue(today));
  const [branchFilter, setBranchFilter] = useState('all');
  const [teamFilter, setTeamFilter] = useState('all');
  const [teams, setTeams] = useState<ISalesTeam[]>([]);
  const [kpiTargets, setKpiTargets] = useState<ISalesKpiTarget[]>([]);
  const [quotations, setQuotations] = useState<IQuotation[]>([]);
  const [deals, setDeals] = useState<IDeal[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalMode, setModalMode] = useState<KpiModalMode>('create');
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [draftPeriod, setDraftPeriod] = useState(currentMonth);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [copyPreviousMonth, setCopyPreviousMonth] = useState(false);
  const [draftTargets, setDraftTargets] = useState<DraftTargetMap>({});
  const [notice, setNotice] = useState('');
  const [isTimeFilterOpen, setIsTimeFilterOpen] = useState(false);
  const [draftTimeFilter, setDraftTimeFilter] = useState<TimeFilterValue>('1m');
  const [draftCustomStartDate, setDraftCustomStartDate] = useState(toDateInputValue(currentMonthStart));
  const [draftCustomEndDate, setDraftCustomEndDate] = useState(toDateInputValue(today));
  const timeFilterRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const loadData = () => {
      setTeams(getSalesTeams());
      setKpiTargets(getSalesKpis());
      setQuotations(getQuotations());
      setDeals(getDeals());
    };

    loadData();

    window.addEventListener('educrm:sales-kpis-changed', loadData);
    window.addEventListener('educrm:sales-teams-changed', loadData);
    window.addEventListener('educrm:quotations-changed', loadData);
    window.addEventListener('storage', loadData);

    return () => {
      window.removeEventListener('educrm:sales-kpis-changed', loadData);
      window.removeEventListener('educrm:sales-teams-changed', loadData);
      window.removeEventListener('educrm:quotations-changed', loadData);
      window.removeEventListener('storage', loadData);
    };
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 2500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!isTimeFilterOpen) return undefined;

    const handleClickOutside = (event: MouseEvent) => {
      if (timeFilterRef.current && !timeFilterRef.current.contains(event.target as Node)) {
        setIsTimeFilterOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isTimeFilterOpen]);

  const openTimeFilter = () => {
    const nextDraftRange = resolveDraftTimeFilterInputs(timeFilter, customStartDate, customEndDate);
    setDraftTimeFilter(timeFilter);
    setDraftCustomStartDate(nextDraftRange.startDate);
    setDraftCustomEndDate(nextDraftRange.endDate);
    setIsTimeFilterOpen(true);
  };

  const closeTimeFilter = () => setIsTimeFilterOpen(false);

  const rosterMap = new Map<string, MemberProfile>();

  teams.forEach((team) => {
    team.members.forEach((member) => {
      if (rosterMap.has(member.userId)) return;
      rosterMap.set(member.userId, {
        userId: member.userId,
        name: member.name,
        role: member.role || 'Sales Rep',
        branch: member.branch || team.branch,
        teamId: team.id,
        teamName: team.name,
        productFocus: team.productFocus,
        assignKeywords: team.assignKeywords || [],
      });
    });
  });

  kpiTargets.forEach((target) => {
    if (rosterMap.has(target.ownerId)) return;
    rosterMap.set(target.ownerId, {
      userId: target.ownerId,
      name: target.ownerName,
      role: 'Sales Rep',
      branch: target.branch || 'Chưa xác định',
      teamId: target.teamId || 'unassigned',
      teamName: target.teamName || 'Chưa gán team',
      productFocus: 'Khác',
      assignKeywords: [],
    });
  });

  quotations.forEach((quotation) => {
    const ownerId = quotation.createdBy;
    if (!ownerId || rosterMap.has(ownerId)) return;
    rosterMap.set(ownerId, {
      userId: ownerId,
      name: quotation.salespersonName || ownerId,
      role: 'Sales Rep',
      branch: quotation.branchName || 'Chưa xác định',
      teamId: 'unassigned',
      teamName: 'Chưa gán team',
      productFocus: quotation.product || 'Khác',
      assignKeywords: [],
    });
  });

  deals.forEach((deal) => {
    const ownerId = deal.ownerId;
    if (!ownerId || rosterMap.has(ownerId)) return;
    rosterMap.set(ownerId, {
      userId: ownerId,
      name: ownerId,
      role: 'Sales Rep',
      branch: 'Chưa xác định',
      teamId: 'unassigned',
      teamName: 'Chưa gán team',
      productFocus: 'Khác',
      assignKeywords: [],
    });
  });

  const roster = Array.from(rosterMap.values()).sort((left, right) => {
    if (left.teamName !== right.teamName) return left.teamName.localeCompare(right.teamName);
    return left.name.localeCompare(right.name);
  });

  const branchOptions = ['all', ...Array.from(new Set(roster.map((item) => item.branch).filter(Boolean)))];
  const teamOptions = [
    { id: 'all', name: 'Tất cả team' },
    ...teams.map((team) => ({ id: team.id, name: team.name })),
    ...Array.from(
      new Set(
        roster
          .filter((item) => item.teamId === 'unassigned')
          .map((item) => JSON.stringify({ id: item.teamId, name: item.teamName }))
      )
    ).map((item) => JSON.parse(item) as { id: string; name: string }),
  ];

  const filteredRoster = roster.filter((member) => {
    const matchesBranch = branchFilter === 'all' || member.branch === branchFilter;
    const matchesTeam = teamFilter === 'all' || member.teamId === teamFilter;
    return matchesBranch && matchesTeam;
  });

  const resolveTimeFilterRange = (
    filter: TimeFilterValue,
    startInput: string,
    endInput: string
  ) => {
    const selectedOption = TIME_FILTER_OPTIONS.find((option) => option.value === filter) || TIME_FILTER_OPTIONS[0];

    if (filter === 'all') {
      return {
        start: null as Date | null,
        end: null as Date | null,
        months: [] as string[],
        buttonLabel: 'Tất cả thời gian',
        displayLabel: 'Toàn bộ thời gian',
      };
    }

    if (filter === 'custom') {
      const startDate = parseDateInputValue(startInput);
      const endDate = parseDateInputValue(endInput);
      if (!startDate || !endDate) {
        return {
          start: null as Date | null,
          end: null as Date | null,
          months: [] as string[],
          buttonLabel: 'Tùy chỉnh khoảng...',
          displayLabel:
            startInput || endInput
              ? 'Chọn đầy đủ Từ ngày và Đến ngày'
              : 'Chưa chọn khoảng thời gian',
        };
      }

      if (startDate > endDate) {
        return {
          start: startOfDay(startDate),
          end: endOfDay(endDate),
          months: [] as string[],
          buttonLabel: 'Tùy chỉnh khoảng...',
          displayLabel: 'Khoảng thời gian không hợp lệ',
        };
      }

      if (startDate && endDate) {
        const start = startOfDay(startDate);
        const end = endOfDay(endDate);
        const months = buildMonthRange(getMonthKey(start), getMonthKey(end));
        return {
          start,
          end,
          months,
          buttonLabel: 'Tùy chỉnh khoảng...',
          displayLabel: `${formatDateLabel(start)} - ${formatDateLabel(end)}`,
        };
      }
    }

    const presetRange =
      selectedOption.months !== null ? getPresetMonthRange(selectedOption.months, today) : null;
    const months = presetRange?.months || [];
    const start = presetRange?.start || null;
    const end = presetRange?.end || null;

    return {
      start,
      end,
      months,
      buttonLabel: selectedOption.label,
      displayLabel:
        months.length === 0
          ? 'Toàn bộ thời gian'
          : months.length === 1
            ? getPeriodLabel(months[0])
            : `${getPeriodLabel(months[0])} - ${getPeriodLabel(months[months.length - 1])}`,
    };
  };

  const resolveDraftTimeFilterInputs = (
    filter: TimeFilterValue,
    startInput: string,
    endInput: string
  ) => {
    if (filter === 'custom') {
      return {
        startDate: startInput,
        endDate: endInput,
      };
    }

    if (filter === 'all') {
      return {
        startDate: '',
        endDate: '',
      };
    }

    const resolvedRange = resolveTimeFilterRange(filter, startInput, endInput);
    return {
      startDate: resolvedRange.start ? toDateInputValue(resolvedRange.start) : '',
      endDate: resolvedRange.end ? toDateInputValue(resolvedRange.end) : '',
    };
  };

  const activeDateRange = resolveTimeFilterRange(timeFilter, customStartDate, customEndDate);
  const draftDateRange = resolveTimeFilterRange(draftTimeFilter, draftCustomStartDate, draftCustomEndDate);
  const activePeriodSet = new Set(activeDateRange.months);
  const activePeriodLabel = activeDateRange.displayLabel;
  const activeButtonLabel =
    timeFilter === 'custom' ? activeDateRange.displayLabel : activeDateRange.buttonLabel;
  const isPeriodIncluded = (period?: string) => {
    if (!period) return timeFilter === 'all';
    return timeFilter === 'all' ? true : activePeriodSet.has(period);
  };
  const isDateIncluded = (value?: string | number | null) => {
    if (!activeDateRange.start || !activeDateRange.end) return true;
    const date = parseDateValue(value);
    if (!date) return false;
    return date >= activeDateRange.start && date <= activeDateRange.end;
  };
  const defaultKpiPeriod =
    activeDateRange.months.length > 0
      ? activeDateRange.months[activeDateRange.months.length - 1]
      : currentMonth;

  const statsByOwner = new Map<
    string,
    { actualRevenue: number; actualContracts: number; pipelineValue: number }
  >();

  const getOwnerStats = (ownerId: string) => {
    if (!statsByOwner.has(ownerId)) {
      statsByOwner.set(ownerId, {
        actualRevenue: 0,
        actualContracts: 0,
        pipelineValue: 0,
      });
    }
    return statsByOwner.get(ownerId)!;
  };

  quotations.forEach((quotation) => {
    if (!quotation.createdBy) return;
    const stats = getOwnerStats(quotation.createdBy);
    const wonDate = quotation.lockedAt || quotation.updatedAt || quotation.createdAt;

    if (isWonQuotation(quotation) && isDateIncluded(wonDate)) {
      stats.actualRevenue += Number(quotation.finalAmount || quotation.amount || 0);
      stats.actualContracts += 1;
    }

    if (
      isOpenQuotation(quotation) &&
      !quotation.dealId &&
      isDateIncluded(quotation.createdAt || quotation.updatedAt)
    ) {
      stats.pipelineValue += Number(quotation.finalAmount || quotation.amount || 0);
    }
  });

  deals.forEach((deal) => {
    if (!deal.ownerId) return;
    const isOpenStage =
      deal.stage !== DealStage.WON &&
      deal.stage !== DealStage.LOST &&
      deal.stage !== DealStage.AFTER_SALE;
    if (!isOpenStage) return;

    if (!isDateIncluded(deal.expectedCloseDate || deal.createdAt || '')) return;

    const stats = getOwnerStats(deal.ownerId);
    stats.pipelineValue += Number(deal.value || 0);
  });

  const currentTargetsByOwner = new Map<
    string,
    { targetRevenue: number; targetContracts: number }
  >();

  kpiTargets
    .filter((target) => isPeriodIncluded(target.period))
    .forEach((target) => {
      const currentTarget = currentTargetsByOwner.get(target.ownerId) || {
        targetRevenue: 0,
        targetContracts: 0,
      };

      currentTarget.targetRevenue += Number(target.targetRevenue || 0);
      currentTarget.targetContracts += Number(target.targetContracts || 0);
      currentTargetsByOwner.set(target.ownerId, currentTarget);
    });

  const memberRows: MemberKpiRow[] = filteredRoster
    .map((member) => {
      const target = currentTargetsByOwner.get(member.userId);
      const actual = statsByOwner.get(member.userId) || {
        actualRevenue: 0,
        actualContracts: 0,
        pipelineValue: 0,
      };

      const targetRevenue = Number(target?.targetRevenue || 0);
      const targetContracts = Number(target?.targetContracts || 0);
      const actualRevenue = Number(actual.actualRevenue || 0);
      const actualContracts = Number(actual.actualContracts || 0);
      const pipelineValue = Number(actual.pipelineValue || 0);

      return {
        ...member,
        targetRevenue,
        actualRevenue,
        targetContracts,
        actualContracts,
        pipelineValue,
        progress: getProgressValue(targetRevenue, actualRevenue, targetContracts, actualContracts),
      };
    })
    .sort((left, right) => {
      if (left.teamName !== right.teamName) return left.teamName.localeCompare(right.teamName);
      return right.actualRevenue - left.actualRevenue || left.name.localeCompare(right.name);
    });

  const teamRowsMap = new Map<string, TeamKpiRow>();
  memberRows.forEach((row) => {
    if (!teamRowsMap.has(row.teamId)) {
      teamRowsMap.set(row.teamId, {
        teamId: row.teamId,
        teamName: row.teamName,
        branch: row.branch,
        productFocus: row.productFocus,
        memberCount: 0,
        targetRevenue: 0,
        actualRevenue: 0,
        targetContracts: 0,
        actualContracts: 0,
        pipelineValue: 0,
        progress: 0,
      });
    }

    const aggregate = teamRowsMap.get(row.teamId)!;
    aggregate.memberCount += 1;
    aggregate.targetRevenue += row.targetRevenue;
    aggregate.actualRevenue += row.actualRevenue;
    aggregate.targetContracts += row.targetContracts;
    aggregate.actualContracts += row.actualContracts;
    aggregate.pipelineValue += row.pipelineValue;
    aggregate.progress = getProgressValue(
      aggregate.targetRevenue,
      aggregate.actualRevenue,
      aggregate.targetContracts,
      aggregate.actualContracts
    );
  });

  const teamRows = Array.from(teamRowsMap.values()).sort(
    (left, right) => right.actualRevenue - left.actualRevenue || left.teamName.localeCompare(right.teamName)
  );

  const totalTargetRevenue = memberRows.reduce((sum, row) => sum + row.targetRevenue, 0);
  const totalActualRevenue = memberRows.reduce((sum, row) => sum + row.actualRevenue, 0);
  const totalTargetContracts = memberRows.reduce((sum, row) => sum + row.targetContracts, 0);
  const totalActualContracts = memberRows.reduce((sum, row) => sum + row.actualContracts, 0);
  const totalPipeline = memberRows.reduce((sum, row) => sum + row.pipelineValue, 0);
  const revenueProgress = getProgressValue(
    totalTargetRevenue,
    totalActualRevenue,
    totalTargetContracts,
    totalActualContracts
  );
  const topMember = [...memberRows].sort(
    (left, right) => right.actualRevenue - left.actualRevenue || right.progress - left.progress
  )[0];

  const buildDraftTargets = (
    period: string,
    memberIds: string[],
    shouldCopyPrevious: boolean,
    carryOver: DraftTargetMap = {},
    keepCarryOver = false
  ) => {
    const previousPeriod = shiftMonthKey(period, -1);
    return memberIds.reduce<DraftTargetMap>((accumulator, memberId) => {
      const currentTarget = kpiTargets.find(
        (item) => item.period === period && item.ownerId === memberId
      );
      const previousTarget = kpiTargets.find(
        (item) => item.period === previousPeriod && item.ownerId === memberId
      );
      const source = currentTarget || (shouldCopyPrevious ? previousTarget : undefined);

      if (source) {
        accumulator[memberId] = {
          targetRevenue: String(source.targetRevenue || ''),
          targetContracts: String(source.targetContracts || ''),
        };
      } else if (keepCarryOver && carryOver[memberId]) {
        accumulator[memberId] = carryOver[memberId];
      } else {
        accumulator[memberId] = {
          targetRevenue: '',
          targetContracts: '',
        };
      }

      return accumulator;
    }, {});
  };

  const openCreateModal = () => {
    if (!canManageKpis) return;
    const defaultIds = (filteredRoster.length ? filteredRoster : roster).map((member) => member.userId);
    setModalMode('create');
    setEditingMemberId(null);
    setDraftPeriod(defaultKpiPeriod);
    setCopyPreviousMonth(false);
    setSelectedMemberIds(defaultIds);
    setDraftTargets(buildDraftTargets(defaultKpiPeriod, defaultIds, false));
    setShowCreateModal(true);
  };

  const openEditModal = (memberId: string) => {
    if (!canManageKpis) return;
    const editableMember = roster.find((member) => member.userId === memberId);
    if (!editableMember) return;

    setModalMode('edit');
    setEditingMemberId(memberId);
    setDraftPeriod(defaultKpiPeriod);
    setCopyPreviousMonth(false);
    setSelectedMemberIds([memberId]);
    setDraftTargets(buildDraftTargets(defaultKpiPeriod, [memberId], false));
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setModalMode('create');
    setEditingMemberId(null);
    setCopyPreviousMonth(false);
    setSelectedMemberIds([]);
    setDraftTargets({});
  };

  const handleDraftPeriodChange = (nextPeriod: string) => {
    setDraftPeriod(nextPeriod);
    setDraftTargets(buildDraftTargets(nextPeriod, selectedMemberIds, copyPreviousMonth));
  };

  const handleToggleCopyPrevious = (checked: boolean) => {
    setCopyPreviousMonth(checked);
    setDraftTargets(buildDraftTargets(draftPeriod, selectedMemberIds, checked));
  };

  const handleToggleMember = (memberId: string) => {
    if (modalMode === 'edit') return;
    const nextIds = selectedMemberIds.includes(memberId)
      ? selectedMemberIds.filter((item) => item !== memberId)
      : [...selectedMemberIds, memberId];
    setSelectedMemberIds(nextIds);
    setDraftTargets(buildDraftTargets(draftPeriod, nextIds, copyPreviousMonth, draftTargets, true));
  };

  const handleToggleAllMembers = () => {
    if (modalMode === 'edit') return;
    const allIds = roster.map((member) => member.userId);
    const nextIds = selectedMemberIds.length === allIds.length ? [] : allIds;
    setSelectedMemberIds(nextIds);
    setDraftTargets(buildDraftTargets(draftPeriod, nextIds, copyPreviousMonth, draftTargets, true));
  };

  const handleDraftValueChange = (
    memberId: string,
    field: 'targetRevenue' | 'targetContracts',
    value: string
  ) => {
    setDraftTargets((current) => ({
      ...current,
      [memberId]: {
        targetRevenue: current[memberId]?.targetRevenue || '',
        targetContracts: current[memberId]?.targetContracts || '',
        [field]: sanitizeNumericInput(value),
      },
    }));
  };

  const handleSaveKpis = (keepOpen: boolean) => {
    if (!canManageKpis) return;
    if (selectedMemberIds.length === 0) {
      setNotice('Cần chọn ít nhất một nhân sự để lưu KPI.');
      return;
    }

    const timestamp = new Date().toISOString();
    const payload = selectedMemberIds
      .map((memberId) => {
        const profile = roster.find((member) => member.userId === memberId);
        if (!profile) return null;

        const existing = kpiTargets.find(
          (item) => item.period === draftPeriod && item.ownerId === memberId
        );
        const values = draftTargets[memberId] || { targetRevenue: '', targetContracts: '' };

        return {
          id: existing?.id || `kpi-${draftPeriod}-${memberId}`,
          period: draftPeriod,
          ownerId: memberId,
          ownerName: profile.name,
          teamId: profile.teamId,
          teamName: profile.teamName,
          branch: profile.branch,
          targetRevenue: Number(values.targetRevenue || 0),
          targetContracts: Number(values.targetContracts || 0),
          createdAt: existing?.createdAt || timestamp,
          updatedAt: timestamp,
        };
      })
      .filter(Boolean) as ISalesKpiTarget[];

    const nextTargets = upsertSalesKpis(payload);
    setKpiTargets(nextTargets);
    setNotice(
      modalMode === 'edit'
        ? `Đã cập nhật KPI ${getPeriodLabel(draftPeriod)} thành công.`
        : keepOpen
          ? `Đã lưu KPI ${getPeriodLabel(draftPeriod)}. Bạn có thể tạo tiếp cho nhóm khác.`
          : `Đã lưu KPI ${getPeriodLabel(draftPeriod)} thành công.`
    );

    if (modalMode === 'edit') {
      closeCreateModal();
      return;
    }

    if (keepOpen) {
      setSelectedMemberIds([]);
      setDraftTargets({});
      setCopyPreviousMonth(false);
      return;
    }

    closeCreateModal();
  };

  const handleSelectDraftTimeFilter = (nextFilter: TimeFilterValue) => {
    const nextDraftRange = resolveDraftTimeFilterInputs(
      nextFilter,
      draftCustomStartDate,
      draftCustomEndDate
    );

    setDraftTimeFilter(nextFilter);
    setDraftCustomStartDate(nextDraftRange.startDate);
    setDraftCustomEndDate(nextDraftRange.endDate);
  };

  const handleResetTimeFilterDraft = () => {
    setDraftTimeFilter('all');
    setDraftCustomStartDate('');
    setDraftCustomEndDate('');
  };

  const handleApplyTimeFilter = () => {
    if (draftTimeFilter === 'custom') {
      const startDate = parseDateInputValue(draftCustomStartDate);
      const endDate = parseDateInputValue(draftCustomEndDate);

      if (!startDate || !endDate) {
        setNotice('Vui lòng chọn đầy đủ Từ ngày và Đến ngày cho khoảng tùy chỉnh.');
        return;
      }

      if (startDate > endDate) {
        setNotice('Khoảng thời gian tùy chỉnh không hợp lệ. Từ ngày phải trước Đến ngày.');
        return;
      }

      setCustomStartDate(draftCustomStartDate);
      setCustomEndDate(draftCustomEndDate);
    } else {
      setCustomStartDate('');
      setCustomEndDate('');
    }

    setTimeFilter(draftTimeFilter);
    closeTimeFilter();
  };

  const handleExport = () => {
    const rows = [
      [
        'Nhân sự',
        'Team',
        'Cơ sở',
        'Target doanh thu',
        'Doanh thu thực tế',
        'Target hợp đồng',
        'Hợp đồng thực tế',
        'Pipeline',
        'Tiến độ (%)',
      ].join(','),
      ...memberRows.map((row) =>
        [
          `"${row.name}"`,
          `"${row.teamName}"`,
          `"${row.branch}"`,
          row.targetRevenue,
          row.actualRevenue,
          row.targetContracts,
          row.actualContracts,
          row.pipelineValue,
          row.progress,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([`\uFEFF${rows}`], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const exportKey =
      timeFilter === 'custom' && customStartDate && customEndDate
        ? `${customStartDate}_${customEndDate}`
        : timeFilter === 'all'
          ? 'all-time'
          : defaultKpiPeriod;
    link.download = `kpi-sales-${timeFilter}-${exportKey}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const editingMember =
    editingMemberId ? roster.find((member) => member.userId === editingMemberId) || null : null;
  const isEditMode = modalMode === 'edit';

  return decodeMojibakeReactNode(
    <div className="flex h-full flex-col overflow-hidden bg-[#f5f8fd] text-slate-900">
      <div className="mx-auto flex w-full max-w-[1480px] flex-1 flex-col gap-4 overflow-y-auto px-5 py-5 lg:px-7">
        <div className="space-y-2">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">KPIs & Mục tiêu</h1>
              <SalesRoleTestSwitcher />
            </div>

            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 md:justify-end xl:w-auto xl:grid-cols-[220px_176px_176px_148px] xl:gap-1.5">
              <div ref={timeFilterRef} className="relative min-w-0">
                <span className="sr-only">Lọc theo thời gian</span>
                <button
                  type="button"
                  onClick={() => {
                    if (isTimeFilterOpen) {
                      closeTimeFilter();
                    } else {
                      openTimeFilter();
                    }
                  }}
                  title={`Khoảng áp dụng: ${activePeriodLabel}`}
                  className="inline-flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs font-bold text-slate-600 transition-all hover:bg-slate-50 focus:border-blue-500 focus:outline-none"
                >
                  <CalendarRange size={15} className="shrink-0 text-slate-400" />
                  <span className="min-w-0 flex-1 truncate">{activeButtonLabel}</span>
                  <ChevronDown
                    size={15}
                    className={`shrink-0 text-slate-400 transition-transform ${isTimeFilterOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {isTimeFilterOpen ? (
                  <div className="absolute left-0 top-[calc(100%+8px)] z-30 w-[500px] max-w-[calc(100vw-2.5rem)] overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-2xl">
                    <div className="flex flex-col sm:flex-row">
                      <div className="border-b border-slate-100 bg-slate-50/70 p-3 sm:w-[180px] sm:border-b-0 sm:border-r">
                        <div className="space-y-1">
                          {TIME_FILTER_OPTIONS.map((option) => {
                            const isActive = option.value === draftTimeFilter;
                            return (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => handleSelectDraftTimeFilter(option.value)}
                                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[12px] font-semibold transition ${
                                  isActive
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-slate-700 hover:bg-white hover:text-slate-900'
                                }`}
                              >
                                <span>{option.label}</span>
                                {isActive ? <span className="text-[10px] font-bold">Đang chọn</span> : null}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex-1 p-4">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Khoảng thời gian tùy chỉnh
                        </div>

                        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                          <label className="space-y-1">
                            <span className="block text-[11px] font-semibold text-slate-500">Từ ngày</span>
                            <input
                              type="date"
                              value={draftCustomStartDate}
                              onChange={(event) => {
                                setDraftTimeFilter('custom');
                                setDraftCustomStartDate(event.target.value);
                              }}
                              disabled={draftTimeFilter !== 'custom'}
                              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-800 outline-none transition focus:border-blue-500"
                            />
                          </label>

                          <label className="space-y-1">
                            <span className="block text-[11px] font-semibold text-slate-500">Đến ngày</span>
                            <input
                              type="date"
                              value={draftCustomEndDate}
                              onChange={(event) => {
                                setDraftTimeFilter('custom');
                                setDraftCustomEndDate(event.target.value);
                              }}
                              disabled={draftTimeFilter !== 'custom'}
                              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-800 outline-none transition focus:border-blue-500"
                            />
                          </label>
                        </div>

                        <div className="mt-3 space-y-1 text-[11px] text-slate-500">
                          <div>
                            Đang chọn:{' '}
                            <span className="font-semibold text-slate-700">{draftDateRange.displayLabel}</span>
                          </div>
                          <div>
                            Áp dụng hiện tại:{' '}
                            <span className="font-semibold text-slate-700">{activePeriodLabel}</span>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-2.5">
                          <button
                            type="button"
                            onClick={handleResetTimeFilterDraft}
                            className="text-[12px] font-semibold text-slate-500 transition hover:text-slate-700"
                          >
                            Làm lại
                          </button>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={closeTimeFilter}
                              className="rounded-xl px-3.5 py-1.5 text-[12px] font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                            >
                              Hủy
                            </button>
                            <button
                              type="button"
                              onClick={handleApplyTimeFilter}
                              className="rounded-xl bg-blue-600 px-4 py-1.5 text-[12px] font-semibold text-white transition hover:bg-blue-700"
                            >
                              Áp dụng
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <label className="relative min-w-0">
                <Building2
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <span className="sr-only">Lọc theo cơ sở</span>
                <select
                  value={branchFilter}
                  onChange={(event) => setBranchFilter(event.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-300 bg-slate-50 pl-9 pr-7 text-[13px] font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
                >
                  <option value="all">Toàn hệ thống</option>
                  {branchOptions
                    .filter((option) => option !== 'all')
                    .map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                </select>
              </label>

              <label className="relative min-w-0">
                <Filter
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <span className="sr-only">Lọc theo team</span>
                <select
                  value={teamFilter}
                  onChange={(event) => setTeamFilter(event.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-300 bg-slate-50 pl-9 pr-7 text-[13px] font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
                >
                  {teamOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={handleExport}
                className="inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700"
              >
                <Download size={15} />
                Xuất báo cáo
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-dashed border-blue-200 bg-blue-50/70 px-3 py-2.5 text-[13px] text-slate-700 shadow-sm">
          Dữ liệu thực tế lấy từ báo giá/đơn chốt và pipeline hiện có trong khoảng {activePeriodLabel}.
        </div>

        {notice ? (
          <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[13px] font-semibold text-emerald-700">
            <CheckCircle2 size={16} />
            {notice}
          </div>
        ) : null}

        <div className="grid gap-2.5 lg:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] font-medium text-slate-500">Doanh thu / mục tiêu</p>
                <h3 className="mt-1 text-[26px] font-bold leading-none text-slate-900">
                  {formatCompactCurrency(totalActualRevenue)} / {formatCompactCurrency(totalTargetRevenue)}
                </h3>
              </div>
              <div className="rounded-md bg-blue-50 p-2 text-blue-600">
                <TrendingUp size={16} />
              </div>
            </div>
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-500"
                style={{ width: `${Math.min(revenueProgress, 100)}%` }}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[10px] font-semibold">
              <span className="text-blue-700">{revenueProgress}% hoàn thành</span>
              <span className="text-slate-500">
                Còn {formatCompactCurrency(Math.max(totalTargetRevenue - totalActualRevenue, 0))}
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] font-medium text-slate-500">HĐ chốt</p>
                <h3 className="mt-1 text-[26px] font-bold leading-none text-slate-900">
                  {totalActualContracts} / {totalTargetContracts}
                </h3>
              </div>
              <div className="rounded-md bg-emerald-50 p-2 text-emerald-600">
                <CheckCircle2 size={16} />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] font-medium text-slate-500">Pipeline</p>
                <h3 className="mt-1 text-[26px] font-bold leading-none text-slate-900">{formatCompactCurrency(totalPipeline)}</h3>
              </div>
              <div className="rounded-md bg-amber-50 p-2 text-amber-600">
                <Layers3 size={16} />
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 p-3.5 text-white shadow-sm">
            <p className="text-[12px] font-medium text-blue-100">Top sale</p>
            <h3 className="mt-1 text-[26px] font-bold leading-none">{topMember?.name || 'Chưa có dữ liệu'}</h3>
            <p className="mt-1 text-[12px] text-blue-100">
              {topMember ? `${topMember.teamName} • ${topMember.branch}` : 'Chưa phát sinh doanh số'}
            </p>
            <div className="mt-2.5 inline-flex rounded-md bg-white/15 px-2 py-1 text-[10px] font-semibold">
              {topMember ? `Doanh thu ${formatCompactCurrency(topMember.actualRevenue)}` : 'Chưa có dữ liệu'}
            </div>
          </div>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <div>
              <h2 className="text-[17px] font-bold text-slate-900">KPI Team</h2>
            </div>
            <div className="text-[13px] font-semibold text-slate-600">
              {teamRows.length} team • {filteredRoster.length} nhân sự
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 text-center w-16">STT</th>
                  <th className="px-4 py-2.5">Team</th>
                  <th className="px-4 py-2.5 text-right">Nhân sự</th>
                  <th className="px-4 py-2.5 text-right">Target doanh thu</th>
                  <th className="px-4 py-2.5 text-right">Doanh thu thực tế</th>
                  <th className="px-4 py-2.5 text-right">Target HĐ</th>
                  <th className="px-4 py-2.5 text-right">HĐ thực tế</th>
                  <th className="px-4 py-2.5">Tiến độ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teamRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-[13px] text-slate-500">
                      Chưa có dữ liệu KPI team theo bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  teamRows.map((row, index) => {
                    const status = getStatusMeta(row.progress);
                    return (
                      <tr key={row.teamId} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3 text-center font-semibold text-slate-500">{index + 1}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{row.teamName}</div>
                          <div className="mt-0.5 text-[13px] text-slate-500">
                            {row.branch} • {row.productFocus}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-700">{row.memberCount}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-700">
                          {formatCurrency(row.targetRevenue)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                          {formatCurrency(row.actualRevenue)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-700">{row.targetContracts}</td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-700">{row.actualContracts}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-full rounded-full ${status.barClass}`}
                                style={{ width: `${Math.min(row.progress, 100)}%` }}
                              />
                            </div>
                            <span
                              className={`inline-flex min-w-[102px] justify-center rounded-md px-2 py-1 text-[11px] font-semibold ${status.badgeClass}`}
                            >
                              {status.label} • {row.progress}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <div>
              <h2 className="text-[17px] font-bold text-slate-900">KPI Cá nhân</h2>
            </div>
            {canManageKpis ? (
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-[13px] font-semibold text-blue-700 transition hover:bg-blue-100"
              >
                <Plus size={15} />
                Tạo KPI cá nhân
              </button>
            ) : null}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 text-center w-16">STT</th>
                  <th className="px-4 py-2.5">Nhân sự</th>
                  <th className="px-4 py-2.5">Team / Cơ sở</th>
                  <th className="px-4 py-2.5 text-right">Target doanh thu</th>
                  <th className="px-4 py-2.5 text-right">Doanh thu thực tế</th>
                  <th className="px-4 py-2.5 text-right">Target HĐ</th>
                  <th className="px-4 py-2.5 text-right">HĐ thực tế</th>
                  <th className="px-4 py-2.5">Tiến độ</th>
                  {canManageKpis ? <th className="px-4 py-2.5 text-right">Thao tác</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {memberRows.length === 0 ? (
                  <tr>
                    <td colSpan={canManageKpis ? 9 : 8} className="px-4 py-8 text-center text-[13px] text-slate-500">
                      Chưa có nhân sự hoặc KPI khớp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  memberRows.map((row, index) => {
                    const status = getStatusMeta(row.progress);
                    return (
                      <tr key={row.userId} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3 text-center font-semibold text-slate-500">{index + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-[13px] font-bold text-blue-700">
                              {getInitials(row.name)}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">{row.name}</div>
                              <div className="text-[13px] text-slate-500">{row.role}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800">{row.teamName}</div>
                          <div className="mt-0.5 text-[13px] text-slate-500">{row.branch}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-700">
                          {formatCurrency(row.targetRevenue)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                          {formatCurrency(row.actualRevenue)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-700">{row.targetContracts}</td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-700">{row.actualContracts}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-full rounded-full ${status.barClass}`}
                                style={{ width: `${Math.min(row.progress, 100)}%` }}
                              />
                            </div>
                            <span
                              className={`inline-flex min-w-[110px] justify-center rounded-md px-2 py-1 text-[11px] font-semibold ${status.badgeClass}`}
                            >
                              {status.label} • {row.progress}%
                            </span>
                          </div>
                        </td>
                        {canManageKpis ? (
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => openEditModal(row.userId)}
                              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-700"
                            >
                              <Pencil size={14} />
                              Sửa KPI
                            </button>
                          </td>
                        ) : null}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

      </div>

      {canManageKpis && showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4 py-4 backdrop-blur-sm">
          <div className="flex max-h-[95vh] w-full max-w-[1100px] flex-col overflow-hidden rounded-[16px] border border-slate-200 bg-white shadow-2xl">
            <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-3.5">
              <div>
                <h3 className="shrink-0 text-[22px] font-bold tracking-tight text-slate-900">
                  {isEditMode ? 'Chỉnh sửa KPI cá nhân' : 'Thiết lập KPI theo tháng'}
                </h3>
                {isEditMode && editingMember ? (
                  <p className="mt-0.5 text-[13px] text-slate-500">
                    Đang chỉnh KPI cho <span className="font-semibold text-slate-700">{editingMember.name}</span>
                  </p>
                ) : null}
              </div>

              <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {!isEditMode ? (
                    <label className="flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5">
                      <input
                        type="checkbox"
                        checked={copyPreviousMonth}
                        onChange={(event) => handleToggleCopyPrevious(event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-800">
                        <Copy size={14} className="text-blue-600" />
                        Copy KPI từ tháng trước
                      </div>
                    </label>
                  ) : null}

                  <input
                    type="month"
                    value={draftPeriod}
                    onChange={(event) => handleDraftPeriodChange(event.target.value)}
                    className="h-9 w-[190px] max-w-full rounded-md border border-slate-300 bg-white px-2.5 text-[13px] font-semibold text-slate-800 outline-none transition focus:border-blue-500"
                  />

                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Kỳ áp dụng
                  </span>
                </div>

                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="rounded-md border border-slate-200 p-1.5 text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3">
              <div className="grid gap-3 lg:grid-cols-[272px,1fr]">
                <div className="rounded-lg border border-slate-200 bg-white">
                  <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
                    <div>
                      <h4 className="text-[15px] font-bold text-slate-900">
                        {isEditMode ? 'Nhân sự đang áp dụng' : 'Chọn nhân sự áp dụng'}
                      </h4>
                    </div>
                    {!isEditMode ? (
                      <button
                        type="button"
                        onClick={handleToggleAllMembers}
                        className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700 transition hover:bg-blue-100"
                      >
                        {selectedMemberIds.length === roster.length ? 'Bỏ chọn all' : 'Chọn all'}
                      </button>
                    ) : null}
                  </div>

                  <div className="max-h-[480px] space-y-2.5 overflow-y-auto px-2.5 py-2.5">
                    {(isEditMode && editingMember
                      ? teams.filter((team) => team.members.some((member) => member.userId === editingMember.userId))
                      : teams
                    ).map((team) => (
                      <div key={team.id} className="space-y-1.5">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          {team.name} • {team.branch}
                        </div>
                        {team.members.map((member) => {
                          const checked = selectedMemberIds.includes(member.userId);
                          return (
                            <label
                              key={`${team.id}-${member.userId}`}
                              className={`flex cursor-pointer items-start gap-2.5 rounded-md border px-2.5 py-2 transition ${
                                checked
                                  ? 'border-blue-300 bg-blue-50'
                                  : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => handleToggleMember(member.userId)}
                                disabled={isEditMode}
                                className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                              <div>
                                <div className="text-[15px] font-semibold text-slate-900">{member.name}</div>
                                <div className="text-[13px] leading-4.5 text-slate-500">
                                  {member.role || 'Sales Rep'} • {member.branch || team.branch}
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white">
                  <div className="border-b border-slate-200 px-3 py-2">
                    <h4 className="text-[15px] font-bold text-slate-900">Nhập mục tiêu</h4>
                  </div>

                  <div className="max-h-[480px] overflow-auto">
                    <table className="min-w-full text-left">
                      <thead className="sticky top-0 bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        <tr>
                          <th className="px-3 py-2.5">Nhân sự</th>
                          <th className="px-3 py-2.5">Team</th>
                          <th className="px-3 py-2.5">Mục tiêu doanh thu</th>
                          <th className="px-3 py-2.5">Số hợp đồng</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedMemberIds.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-3 py-8 text-center text-[13px] text-slate-500">
                              Chưa chọn nhân sự áp dụng KPI.
                            </td>
                          </tr>
                        ) : (
                          selectedMemberIds.map((memberId) => {
                            const member = roster.find((item) => item.userId === memberId);
                            const values = draftTargets[memberId] || {
                              targetRevenue: '',
                              targetContracts: '',
                            };

                            return (
                              <tr key={memberId}>
                                <td className="px-3 py-2.5">
                                  <div className="text-[15px] font-semibold text-slate-900">{member?.name || memberId}</div>
                                </td>
                                <td className="px-3 py-2.5 text-[13px] font-semibold text-slate-700">
                                  {member?.teamName || 'Chưa gán team'}
                                </td>
                                <td className="px-3 py-2.5">
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={values.targetRevenue}
                                    onChange={(event) =>
                                      handleDraftValueChange(memberId, 'targetRevenue', event.target.value)
                                    }
                                    placeholder="Ví dụ: 350000000"
                                    className="h-9 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-[13px] font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
                                  />
                                </td>
                                <td className="px-3 py-2.5">
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={values.targetContracts}
                                    onChange={(event) =>
                                      handleDraftValueChange(memberId, 'targetContracts', event.target.value)
                                    }
                                    placeholder="Ví dụ: 6"
                                    className="h-9 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-[13px] font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
                                  />
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 px-4 py-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Huỷ
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveKpis(false)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-[13px] font-semibold text-blue-700 transition hover:bg-blue-100"
                >
                  <Save size={15} />
                  {isEditMode ? 'Lưu cập nhật' : 'Lưu KPI'}
                </button>
                {!isEditMode ? (
                  <button
                    type="button"
                    onClick={() => handleSaveKpis(true)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-[13px] font-semibold text-white transition hover:bg-blue-700"
                  >
                    <Plus size={15} />
                    Lưu & Tạo tiếp
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default SalesKPIs;
