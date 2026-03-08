import React, { useEffect, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Copy,
  Download,
  Filter,
  Layers3,
  Plus,
  Save,
  Target,
  TrendingUp,
  X,
} from 'lucide-react';
import {
  DealStage,
  IDeal,
  IQuotation,
  ISalesKpiTarget,
  ISalesTeam,
  QuotationStatus,
} from '../types';
import {
  getDeals,
  getQuotations,
  getSalesKpis,
  getSalesTeams,
  upsertSalesKpis,
} from '../utils/storage';

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

const getDateMonthKey = (value?: string | number | null) => {
  if (value === null || value === undefined || value === '') return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return getMonthKey(date);
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
  const currentMonth = getMonthKey(new Date());

  const [selectedPeriod, setSelectedPeriod] = useState(currentMonth);
  const [branchFilter, setBranchFilter] = useState('all');
  const [teamFilter, setTeamFilter] = useState('all');
  const [teams, setTeams] = useState<ISalesTeam[]>([]);
  const [kpiTargets, setKpiTargets] = useState<ISalesKpiTarget[]>([]);
  const [quotations, setQuotations] = useState<IQuotation[]>([]);
  const [deals, setDeals] = useState<IDeal[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [draftPeriod, setDraftPeriod] = useState(currentMonth);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [copyPreviousMonth, setCopyPreviousMonth] = useState(false);
  const [draftTargets, setDraftTargets] = useState<DraftTargetMap>({});
  const [notice, setNotice] = useState('');

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

    if (isWonQuotation(quotation) && getDateMonthKey(wonDate) === selectedPeriod) {
      stats.actualRevenue += Number(quotation.finalAmount || quotation.amount || 0);
      stats.actualContracts += 1;
    }

    if (
      isOpenQuotation(quotation) &&
      !quotation.dealId &&
      getDateMonthKey(quotation.createdAt || quotation.updatedAt) === selectedPeriod
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

    const dealMonth = getDateMonthKey(deal.expectedCloseDate || deal.createdAt || '');
    if (dealMonth && dealMonth !== selectedPeriod) return;

    const stats = getOwnerStats(deal.ownerId);
    stats.pipelineValue += Number(deal.value || 0);
  });

  const currentTargetsByOwner = new Map(
    kpiTargets
      .filter((target) => target.period === selectedPeriod)
      .map((target) => [target.ownerId, target] as const)
  );

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
    const defaultIds = (filteredRoster.length ? filteredRoster : roster).map((member) => member.userId);
    setDraftPeriod(selectedPeriod);
    setCopyPreviousMonth(false);
    setSelectedMemberIds(defaultIds);
    setDraftTargets(buildDraftTargets(selectedPeriod, defaultIds, false));
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
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
    const nextIds = selectedMemberIds.includes(memberId)
      ? selectedMemberIds.filter((item) => item !== memberId)
      : [...selectedMemberIds, memberId];
    setSelectedMemberIds(nextIds);
    setDraftTargets(buildDraftTargets(draftPeriod, nextIds, copyPreviousMonth, draftTargets, true));
  };

  const handleToggleAllMembers = () => {
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
      keepOpen
        ? `Đã lưu KPI ${getPeriodLabel(draftPeriod)}. Bạn có thể tạo tiếp cho nhóm khác.`
        : `Đã lưu KPI ${getPeriodLabel(draftPeriod)} thành công.`
    );

    if (keepOpen) {
      setSelectedMemberIds([]);
      setDraftTargets({});
      setCopyPreviousMonth(false);
      return;
    }

    closeCreateModal();
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
    link.download = `kpi-sales-${selectedPeriod}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#f5f8fd] text-slate-900">
      <div className="mx-auto flex w-full max-w-[1480px] flex-1 flex-col gap-4 overflow-y-auto px-5 py-5 lg:px-7">
        <div className="space-y-2">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">KPIs & Mục tiêu Kinh doanh</h1>

            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 md:justify-end xl:w-auto xl:grid-cols-[176px_176px_148px] xl:gap-1.5">
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
          Dữ liệu thực tế lấy từ báo giá/đơn chốt và pipeline hiện có.
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
                <Save size={16} />
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
                  <th className="px-4 py-2.5">Team</th>
                  <th className="px-4 py-2.5 text-right">Nhân sự</th>
                  <th className="px-4 py-2.5 text-right">Target doanh thu</th>
                  <th className="px-4 py-2.5 text-right">Doanh thu thực tế</th>
                  <th className="px-4 py-2.5 text-right">Target HĐ</th>
                  <th className="px-4 py-2.5 text-right">HĐ thực tế</th>
                  <th className="px-4 py-2.5 text-right">Pipeline</th>
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
                  teamRows.map((row) => {
                    const status = getStatusMeta(row.progress);
                    return (
                      <tr key={row.teamId} className="hover:bg-slate-50/70">
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
                        <td className="px-4 py-3 text-right font-semibold text-blue-700">
                          {formatCurrency(row.pipelineValue)}
                        </td>
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
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-[13px] font-semibold text-blue-700 transition hover:bg-blue-100"
            >
              <Plus size={15} />
              Tạo KPI cá nhân
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">Nhân sự</th>
                  <th className="px-4 py-2.5">Team / Cơ sở</th>
                  <th className="px-4 py-2.5 text-right">Target doanh thu</th>
                  <th className="px-4 py-2.5 text-right">Doanh thu thực tế</th>
                  <th className="px-4 py-2.5 text-right">Target HĐ</th>
                  <th className="px-4 py-2.5 text-right">HĐ thực tế</th>
                  <th className="px-4 py-2.5 text-right">Pipeline</th>
                  <th className="px-4 py-2.5">Tiến độ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {memberRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-[13px] text-slate-500">
                      Chưa có nhân sự hoặc KPI khớp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  memberRows.map((row) => {
                    const status = getStatusMeta(row.progress);
                    return (
                      <tr key={row.userId} className="hover:bg-slate-50/70">
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
                        <td className="px-4 py-3 text-right font-semibold text-blue-700">
                          {formatCurrency(row.pipelineValue)}
                        </td>
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
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[17px] font-bold text-slate-900">Nhóm / team & nhân sự</h2>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {teams.map((team) => (
              <div key={team.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="text-[17px] font-bold text-slate-900">{team.name}</h3>
                    <p className="mt-1 text-[13px] text-slate-600">
                      {team.branch} • {team.productFocus}
                    </p>
                  </div>

                  <div className="space-y-1.5 md:max-w-[54%] md:text-right">
                    <div className="flex flex-wrap items-center gap-1.5 md:justify-end">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Từ khóa</div>
                      <div className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                        {team.members.length} nhân sự
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 md:justify-end">
                      {team.assignKeywords.map((keyword) => (
                        <span
                          key={`${team.id}-${keyword}`}
                          className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="mt-1.5 space-y-2">
                    {team.members.map((member) => (
                      <div
                        key={`${team.id}-${member.userId}`}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2.5"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-[13px] font-bold text-blue-700">
                            {getInitials(member.name)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{member.name}</div>
                            <div className="text-[13px] text-slate-500">{member.role || 'Sales Rep'}</div>
                          </div>
                        </div>
                        <div className="text-[13px] font-semibold text-slate-600">{member.branch || team.branch}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4 py-4 backdrop-blur-sm">
          <div className="flex max-h-[95vh] w-full max-w-[1100px] flex-col overflow-hidden rounded-[16px] border border-slate-200 bg-white shadow-2xl">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-4 py-3.5">
              <div className="space-y-1">
                <h3 className="text-[22px] font-bold tracking-tight text-slate-900">Thiết lập KPI theo tháng</h3>
                <p className="max-w-lg text-[13px] leading-5 text-slate-600">
                  Chọn một hoặc nhiều nhân sự để áp KPI cùng lúc. Có thể copy KPI từ tháng trước để
                  điền nhanh rồi chỉnh lại doanh thu và số hợp đồng nếu cần.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-700">
                  <Target size={12} />
                  Tạo KPI cá nhân
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
              <div className="grid gap-2.5 rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 lg:grid-cols-[0.8fr,0.9fr,1.02fr]">
                <label className="space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Kỳ áp dụng</span>
                  <input
                    type="month"
                    value={draftPeriod}
                    onChange={(event) => handleDraftPeriodChange(event.target.value)}
                    className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-[13px] font-semibold text-slate-800 outline-none transition focus:border-blue-500"
                  />
                </label>

                <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-2">
                  <input
                    type="checkbox"
                    checked={copyPreviousMonth}
                    onChange={(event) => handleToggleCopyPrevious(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-800">
                      <Copy size={14} className="text-blue-600" />
                      Copy KPI từ tháng trước
                    </div>
                    <div className="text-[12px] leading-4.5 text-slate-500">
                      Nếu có dữ liệu tháng trước, hệ thống sẽ tự fill vào các dòng đã chọn.
                    </div>
                  </div>
                </label>

                <div className="rounded-md border border-dashed border-blue-200 bg-blue-50 px-2.5 py-2 text-[12px] text-slate-700">
                  <div className="text-[13px] font-semibold text-blue-700">Hướng dẫn nhanh</div>
                  <div className="mt-0.5 leading-5">
                    Bạn có thể chọn <span className="font-semibold">all</span> để áp KPI cho toàn bộ nhân sự,
                    hoặc chọn vài người theo từng team rồi bấm <span className="font-semibold">Lưu & Tạo tiếp</span>.
                  </div>
                </div>
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-[272px,1fr]">
                <div className="rounded-lg border border-slate-200 bg-white">
                  <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
                    <div>
                      <h4 className="text-[15px] font-bold text-slate-900">Chọn nhân sự áp dụng</h4>
                      <p className="text-[13px] text-slate-500">{selectedMemberIds.length} người đang được chọn</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleAllMembers}
                      className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700 transition hover:bg-blue-100"
                    >
                      {selectedMemberIds.length === roster.length ? 'Bỏ chọn all' : 'Chọn all'}
                    </button>
                  </div>

                  <div className="max-h-[480px] space-y-2.5 overflow-y-auto px-2.5 py-2.5">
                    {teams.map((team) => (
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
                    <p className="text-[13px] text-slate-500">
                      Mỗi dòng gồm doanh thu mục tiêu và số hợp đồng mục tiêu cho từng nhân sự.
                    </p>
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
                                  <div className="text-[13px] text-slate-500">{member?.branch || 'Chưa xác định'}</div>
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

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-2.5">
              <div className="text-[13px] text-slate-500">
                KPI sẽ được lưu theo <span className="font-semibold text-slate-800">{getPeriodLabel(draftPeriod)}</span>.
              </div>
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
                  Lưu KPI
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveKpis(true)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-[13px] font-semibold text-white transition hover:bg-blue-700"
                >
                  <Plus size={15} />
                  Lưu & Tạo tiếp
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default SalesKPIs;
