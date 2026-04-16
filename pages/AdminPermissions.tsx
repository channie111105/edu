import React, { useMemo, useState } from 'react';
import { ChevronDown, Save, Search, Shield } from 'lucide-react';

type PermissionScope = 'none' | 'personal' | 'team' | 'branch' | 'global';
type TabId =
  | 'marketing'
  | 'sales'
  | 'enrollment'
  | 'training'
  | 'studyAbroad'
  | 'finance'
  | 'library'
  | 'admin';
type RoleId =
  | 'superAdmin'
  | 'ceo'
  | 'branchDirector'
  | 'salesLeader'
  | 'sales'
  | 'marketingLeader'
  | 'marketing'
  | 'customerCare'
  | 'trainingManager'
  | 'teacher'
  | 'accountant'
  | 'studyAbroadManager';

type PermissionSection = {
  id: string;
  title: string;
  permissions: Array<readonly [string, string]>;
};

type PermissionTab = {
  id: TabId;
  label: string;
  description: string;
  sections: PermissionSection[];
};

type PermissionState = Record<TabId, Record<string, Record<RoleId, PermissionScope>>>;
type PermissionStateSource = Partial<Record<TabId, unknown>>;

const SCOPE_OPTIONS: Array<{
  id: PermissionScope;
  label: string;
  tone: string;
  buttonTone: string;
}> = [
  {
    id: 'none',
    label: 'Không',
    tone: 'bg-slate-100 text-slate-600 border border-slate-200',
    buttonTone: 'bg-white text-slate-500 border border-slate-200',
  },
  {
    id: 'personal',
    label: 'Cá nhân',
    tone: 'bg-amber-100 text-amber-700 border border-amber-200',
    buttonTone: 'bg-amber-50 text-amber-700 border border-amber-200',
  },
  {
    id: 'team',
    label: 'Đội nhóm',
    tone: 'bg-lime-100 text-lime-700 border border-lime-200',
    buttonTone: 'bg-lime-50 text-lime-700 border border-lime-200',
  },
  {
    id: 'branch',
    label: 'Cơ sở',
    tone: 'bg-sky-100 text-sky-700 border border-sky-200',
    buttonTone: 'bg-sky-50 text-sky-700 border border-sky-200',
  },
  {
    id: 'global',
    label: 'Tổng',
    tone: 'bg-emerald-700 text-white border border-emerald-700',
    buttonTone: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  },
];

const ROLE_COLUMNS: Array<{ id: RoleId; label: string }> = [
  { id: 'superAdmin', label: 'Super admin' },
  { id: 'ceo', label: 'CEO' },
  { id: 'branchDirector', label: 'Giám đốc cơ sở' },
  { id: 'salesLeader', label: 'Sale leader' },
  { id: 'sales', label: 'Sale' },
  { id: 'marketingLeader', label: 'Trưởng phòng MKT' },
  { id: 'marketing', label: 'MKT' },
  { id: 'customerCare', label: 'Chăm sóc khách hàng' },
  { id: 'trainingManager', label: 'Quản lý đào tạo' },
  { id: 'teacher', label: 'Giáo viên' },
  { id: 'accountant', label: 'Kế toán' },
  { id: 'studyAbroadManager', label: 'Quản lý hồ sơ DH' },
];

const PERMISSION_TABS: PermissionTab[] = [
  {
    id: 'marketing',
    label: 'MKT',
    description: 'Quyền cho chiến dịch, cộng tác viên và DS SLA.',
    sections: [
      {
        id: 'campaign',
        title: 'Chiến dịch',
        permissions: [
          ['search', 'Xem/lọc/search'],
          ['create', 'Tạo chiến dịch, QR'],
          ['edit', 'Sửa'],
          ['delete', 'Xóa'],
          ['import', 'Thêm/import lead'],
          ['export', 'Xuất data'],
        ],
      },
      {
        id: 'collaborator',
        title: 'Cộng tác viên',
        permissions: [
          ['search', 'Xem/lọc/search'],
          ['status', 'Sửa/Cập nhật trạng thái'],
          ['delete', 'Xóa'],
          ['create', 'Thêm'],
          ['export', 'Xuất excel'],
        ],
      },
      {
        id: 'sla',
        title: 'DS SLA',
        permissions: [
          ['search', 'Xem/lọc/search'],
          ['claim', 'Nhận'],
          ['process', 'Xử lý'],
          ['reassign', 'Phân bổ lại'],
          ['settings', 'Cài đặt SLA'],
        ],
      },
    ],
  },
  {
    id: 'sales',
    label: 'Sale',
    description: 'Dashboard, my leads, my contact, pipeline, KPI và lịch hẹn.',
    sections: [
      {
        id: 'dashboard',
        title: 'Dashboard',
        permissions: [
          ['view', 'Xem'],
          ['filter', 'Lọc'],
        ],
      },
      {
        id: 'myLeads',
        title: 'My leads',
        permissions: [
          ['create', 'Tạo'],
          ['view', 'Xem/lọc/tìm kiếm'],
          ['edit', 'Sửa'],
          ['delete', 'Xóa'],
          ['pick', 'Tiếp nhận'],
          ['process', 'Xử lý data'],
        ],
      },
      {
        id: 'myContacts',
        title: 'My contact',
        permissions: [
          ['create', 'Tạo'],
          ['view', 'Xem, tìm kiếm, lọc'],
          ['edit', 'Sửa'],
          ['delete', 'Xóa'],
        ],
      },
      {
        id: 'pipeline',
        title: 'Pipeline',
        permissions: [
          ['view', 'Xem/lọc/tìm kiếm'],
          ['process', 'Xử lý data'],
          ['assign', 'Phân bổ'],
          ['delete', 'Xóa'],
        ],
      },
      {
        id: 'kpis',
        title: 'KPIs',
        permissions: [
          ['view', 'Xem/lọc'],
          ['create', 'Tạo'],
          ['edit', 'Sửa'],
          ['export', 'Xuất báo cáo'],
        ],
      },
      {
        id: 'meeting',
        title: 'Lịch hẹn',
        permissions: [
          ['create', 'Tạo'],
          ['confirm', 'Confirm/cancel'],
          ['submit', 'Submit'],
        ],
      },
    ],
  },
  {
    id: 'enrollment',
    label: 'Ghi danh',
    description: 'Dashboard, báo giá, hợp đồng và học viên.',
    sections: [
      {
        id: 'dashboard',
        title: 'Dashboard',
        permissions: [
          ['view', 'Xem'],
          ['filter', 'Lọc'],
        ],
      },
      {
        id: 'quotation',
        title: 'Báo giá',
        permissions: [
          ['draft', 'Tạo/sửa (chỉ sửa khi ở draft)'],
          ['view', 'Xem'],
          ['search', 'Tìm kiếm'],
          ['stop', 'Dừng'],
          ['debt', 'Kích hoạt công nợ (lần thu)'],
          ['delete', 'Xóa'],
        ],
      },
      {
        id: 'contract',
        title: 'Hợp đồng',
        permissions: [
          ['attach', 'Tải chứng từ'],
          ['view', 'Xem/lọc/tìm kiếm'],
          ['print', 'In'],
          ['edit', 'Sửa'],
        ],
      },
      {
        id: 'student',
        title: 'Học viên',
        permissions: [
          ['view', 'Xem/tìm kiếm/lọc'],
          ['claim', 'Tạo claim/Hủy'],
          ['edit', 'Sửa thông tin học viên'],
          ['processClaim', 'Xử lý claim'],
          ['enroll', 'Ghi danh'],
          ['transfer', 'Chuyển lớp'],
          ['approve', 'Duyệt ghi danh'],
        ],
      },
    ],
  },
  {
    id: 'training',
    label: 'Đào tạo',
    description: 'Lịch biểu, quản lý lớp và giáo viên.',
    sections: [
      {
        id: 'schedule',
        title: 'Lịch biểu',
        permissions: [
          ['view', 'Xem'],
          ['filter', 'Lọc'],
          ['createClass', 'Tạo lớp'],
        ],
      },
      {
        id: 'class',
        title: 'Quản lý lớp',
        permissions: [
          ['view', 'Xem'],
          ['addStudent', 'Thêm học viên'],
          ['export', 'Xuất excel'],
          ['attendance', 'Điểm danh'],
          ['note', 'Note ghi chú'],
          ['score', 'Cập nhật điểm'],
          ['log', 'Log note'],
          ['status', 'Đổi trạng thái'],
        ],
      },
      {
        id: 'teacher',
        title: 'Giáo viên',
        permissions: [
          ['view', 'Xem/lọc/tìm kiếm'],
          ['create', 'Tạo'],
          ['edit', 'Sửa/đổi trạng thái/attach'],
          ['assign', 'Gán lớp'],
        ],
      },
    ],
  },
  {
    id: 'studyAbroad',
    label: 'Du học',
    description: 'Dashboard, hồ sơ, tiến độ, lịch phỏng vấn và đối tác trường.',
    sections: [
      {
        id: 'dashboard',
        title: 'Dashboard',
        permissions: [
          ['view', 'Xem'],
          ['filter', 'Lọc'],
        ],
      },
      {
        id: 'caseList',
        title: 'Danh sách hồ sơ',
        permissions: [
          ['view', 'Xem/lọc/tìm kiếm'],
          ['create', 'Tạo'],
          ['edit', 'Sửa'],
        ],
      },
      {
        id: 'progress',
        title: 'Tiến độ',
        permissions: [
          ['view', 'Xem/lọc/tìm kiếm'],
          ['action', 'Thao tác'],
        ],
      },
      {
        id: 'interview',
        title: 'Lịch phỏng vấn',
        permissions: [
          ['view', 'Xem/lọc/tìm kiếm'],
          ['create', 'Tạo'],
          ['edit', 'Sửa'],
          ['delete', 'Xóa'],
        ],
      },
      {
        id: 'partner',
        title: 'Đối tác trường',
        permissions: [
          ['view', 'Xem/lọc/tìm kiếm'],
          ['create', 'Tạo'],
          ['edit', 'Sửa'],
          ['delete', 'Xóa'],
        ],
      },
    ],
  },
  {
    id: 'finance',
    label: 'Kế toán',
    description: 'Dashboard, duyệt giao dịch, thu chi, công nợ, phiếu thu chi và hoàn tiền.',
    sections: [
      {
        id: 'dashboard',
        title: 'Dashboard',
        permissions: [
          ['view', 'Xem'],
          ['filter', 'Lọc'],
        ],
      },
      {
        id: 'approval',
        title: 'Duyệt giao dịch',
        permissions: [
          ['view', 'Xem/lọc/tìm kiếm'],
          ['create', 'Tạo'],
          ['submit', 'Trình duyệt'],
          ['accountantConfirm', 'Kế toán xác nhận'],
          ['ceoConfirm', 'CEO duyệt'],
          ['edit', 'Sửa'],
        ],
      },
      {
        id: 'cashflow',
        title: 'Thu chi',
        permissions: [
          ['view', 'Xem/lọc/tìm kiếm'],
          ['confirm', 'Xác nhận thu chi'],
          ['attach', 'Attach chứng từ'],
        ],
      },
      {
        id: 'debt',
        title: 'Công nợ',
        permissions: [['view', 'Xem/lọc/tìm kiếm']],
      },
      {
        id: 'receipt',
        title: 'Phiếu thu chi',
        permissions: [
          ['edit', 'Sửa'],
          ['print', 'In'],
        ],
      },
      {
        id: 'refund',
        title: 'Hoàn tiền',
        permissions: [
          ['view', 'Xem/lọc/tìm kiếm'],
          ['create', 'Tạo'],
          ['submit', 'Trình duyệt'],
          ['accountantConfirm', 'Kế toán xác nhận'],
          ['ceoConfirm', 'CEO duyệt'],
          ['edit', 'Sửa'],
        ],
      },
    ],
  },
  {
    id: 'library',
    label: 'Thư viện',
    description: 'Quyền thư viện dùng chung.',
    sections: [
      {
        id: 'common',
        title: 'Chung',
        permissions: [
          ['view', 'Xem'],
          ['filter', 'Lọc'],
          ['create', 'Tạo'],
        ],
      },
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    description: 'Quản trị hệ thống, user, role và cấu hình gốc.',
    sections: [
      {
        id: 'system',
        title: 'Hệ thống',
        permissions: [
          ['view', 'Hệ thống'],
          ['personalConfig', 'Cấu hình (sửa giá, tạo thủ công...)'],
          ['createUser', 'Tạo user'],
          ['createRole', 'Tạo role + tick quyền'],
          ['toggleUser', 'Tick trạng thái users'],
          ['delete', 'Xóa'],
          ['edit', 'Sửa'],
        ],
      },
    ],
  },
];

const getScopeOption = (scope: PermissionScope) =>
  SCOPE_OPTIONS.find((option) => option.id === scope) || SCOPE_OPTIONS[0];

const isPermissionScope = (value: unknown): value is PermissionScope =>
  value === 'none' || value === 'personal' || value === 'team' || value === 'branch' || value === 'global';

const getDefaultScope = (tabId: TabId, roleId: RoleId): PermissionScope => {
  if (roleId === 'superAdmin' || roleId === 'ceo') return 'global';

  if (tabId === 'admin') {
    return roleId === 'branchDirector' ? 'branch' : 'none';
  }

  switch (roleId) {
    case 'branchDirector':
      return 'branch';
    case 'salesLeader':
      return ['sales', 'enrollment', 'library'].includes(tabId) ? 'team' : 'none';
    case 'sales':
      return ['sales', 'enrollment', 'library'].includes(tabId) ? 'personal' : 'none';
    case 'marketingLeader':
      return ['marketing', 'library'].includes(tabId) ? 'team' : 'none';
    case 'marketing':
      return tabId === 'marketing' ? 'personal' : tabId === 'library' ? 'team' : 'none';
    case 'customerCare':
      return ['marketing', 'sales', 'enrollment'].includes(tabId) ? 'personal' : 'none';
    case 'trainingManager':
      return ['training', 'enrollment', 'library'].includes(tabId) ? 'branch' : 'none';
    case 'teacher':
      return ['training', 'library'].includes(tabId) ? 'team' : 'none';
    case 'accountant':
      return ['finance', 'enrollment', 'library'].includes(tabId) ? 'branch' : 'none';
    case 'studyAbroadManager':
      return ['studyAbroad', 'library'].includes(tabId) ? 'branch' : 'none';
    default:
      return 'none';
  }
};

const buildInitialPermissions = (): PermissionState => {
  const next = {} as PermissionState;

  PERMISSION_TABS.forEach((tab) => {
    const tabState = {} as Record<string, Record<RoleId, PermissionScope>>;

    tab.sections.forEach((section) => {
      section.permissions.forEach(([permissionId]) => {
        const roleState = {} as Record<RoleId, PermissionScope>;
        ROLE_COLUMNS.forEach((role) => {
          roleState[role.id] = getDefaultScope(tab.id, role.id);
        });
        tabState[`${section.id}.${permissionId}`] = roleState;
      });
    });

    next[tab.id] = tabState;
  });

  return next;
};

const normalizePermissionState = (input: unknown): PermissionState => {
  const next = buildInitialPermissions();

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return next;
  }

  const source = input as PermissionStateSource;

  PERMISSION_TABS.forEach((tab) => {
    const sourceTab = source[tab.id];
    if (!sourceTab || typeof sourceTab !== 'object' || Array.isArray(sourceTab)) {
      return;
    }

    const sourcePermissions = sourceTab as Record<string, unknown>;

    tab.sections.forEach((section) => {
      section.permissions.forEach(([permissionId]) => {
        const permissionKey = `${section.id}.${permissionId}`;
        const sourceRoles = sourcePermissions[permissionKey];

        if (!sourceRoles || typeof sourceRoles !== 'object' || Array.isArray(sourceRoles)) {
          return;
        }

        const roleRecord = sourceRoles as Record<string, unknown>;

        ROLE_COLUMNS.forEach((role) => {
          const candidate = roleRecord[role.id];
          if (isPermissionScope(candidate)) {
            next[tab.id][permissionKey][role.id] = candidate;
          }
        });
      });
    });
  });

  return next;
};

const AdminPermissions: React.FC = () => {
  const [activeTabId, setActiveTabId] = useState<TabId>('marketing');
  const [searchTerm, setSearchTerm] = useState('');
  const [permissions, setPermissions] = useState<PermissionState>(() => buildInitialPermissions());
  const [openCellId, setOpenCellId] = useState<string | null>(null);

  const activeTab = PERMISSION_TABS.find((tab) => tab.id === activeTabId) || PERMISSION_TABS[0];
  const normalizedPermissions = useMemo(() => normalizePermissionState(permissions), [permissions]);
  const activePermissionState = normalizedPermissions[activeTab.id];

  const visibleSections = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return activeTab.sections;

    return activeTab.sections
      .map((section) => ({
        ...section,
        permissions: section.permissions.filter(([, label]) => {
          const sectionMatch = section.title.toLowerCase().includes(keyword);
          const labelMatch = label.toLowerCase().includes(keyword);
          return sectionMatch || labelMatch;
        }),
      }))
      .filter((section) => section.permissions.length > 0);
  }, [activeTab, searchTerm]);

  const updateScope = (sectionId: string, permissionId: string, roleId: RoleId, scope: PermissionScope) => {
    const permissionKey = `${sectionId}.${permissionId}`;

    setPermissions((prev) => {
      const next = normalizePermissionState(prev);
      return {
        ...next,
        [activeTab.id]: {
          ...next[activeTab.id],
          [permissionKey]: {
            ...next[activeTab.id][permissionKey],
            [roleId]: scope,
          },
        },
      };
    });

    setOpenCellId(null);
  };

  const renderScopeCell = (sectionId: string, permissionId: string, roleId: RoleId) => {
    const permissionKey = `${sectionId}.${permissionId}`;
    const scope = activePermissionState[permissionKey]?.[roleId] ?? getDefaultScope(activeTab.id, roleId);
    const option = getScopeOption(scope);
    const cellId = `${activeTab.id}:${permissionKey}:${roleId}`;

    return (
      <div className="relative" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          onClick={() => setOpenCellId((prev) => (prev === cellId ? null : cellId))}
          className={`inline-flex h-9 min-w-[112px] items-center justify-between gap-2 rounded-full px-3 text-xs font-bold transition ${option.buttonTone}`}
        >
          <span className="truncate">{option.label}</span>
          <ChevronDown size={14} />
        </button>

        {openCellId === cellId ? (
          <div className="absolute right-0 top-full z-30 mt-2 w-52 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
            {SCOPE_OPTIONS.map((scopeOption) => {
              const isActive = scopeOption.id === scope;

              return (
                <button
                  key={scopeOption.id}
                  type="button"
                  onClick={() => updateScope(sectionId, permissionId, roleId, scopeOption.id)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition ${isActive ? 'bg-slate-50' : 'hover:bg-slate-50'}`}
                >
                  <span className={`rounded-full px-2.5 py-1 font-bold ${scopeOption.tone}`}>
                    {scopeOption.label}
                  </span>
                  {isActive ? <span className="text-indigo-600">✓</span> : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col bg-slate-50 text-slate-900" onClick={() => setOpenCellId(null)}>
      <div className="flex-1 overflow-y-auto px-5 py-6 lg:px-8 lg:py-8">
        <div className="mx-auto flex max-w-[1800px] flex-col gap-5">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm lg:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-600">
                  <Shield size={14} />
                  Ma trận phân quyền
                </div>
                <h1 className="text-3xl font-black tracking-tight text-slate-950">Phân quyền hệ thống</h1>
              </div>

              <button
                type="button"
                onClick={() => alert(`Đã lưu cấu hình tab ${activeTab.label}.`)}
                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                <Save size={16} />
                Lưu cấu hình
              </button>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-1 gap-2 overflow-x-auto pb-1">
                {PERMISSION_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTabId(tab.id);
                      setOpenCellId(null);
                    }}
                    className={`whitespace-nowrap rounded-2xl px-4 py-2.5 text-sm font-bold transition ${
                      activeTabId === tab.id
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative min-w-[260px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Tìm phân hệ nhỏ hoặc quyền..."
                  className="h-10 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50"
                />
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <strong className="text-slate-900">{activeTab.label}</strong>: {activeTab.description}
            </div>
          </div>

          <div className="overflow-auto rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[2200px] border-collapse text-left">
              <thead className="sticky top-0 z-20 bg-slate-50">
                <tr className="border-b border-slate-200">
                  <th className="sticky left-0 z-30 min-w-[180px] border-r border-slate-200 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                    Phân hệ nhỏ
                  </th>
                  <th className="sticky left-[180px] z-30 min-w-[260px] border-r border-slate-200 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                    Quyền
                  </th>
                  {ROLE_COLUMNS.map((role) => (
                    <th
                      key={role.id}
                      className="min-w-[140px] border-r border-slate-200 px-3 py-3 text-center text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 last:border-r-0"
                    >
                      {role.label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {visibleSections.map((section) =>
                  section.permissions.map(([permissionId, permissionLabel], index) => (
                    <tr key={`${section.id}.${permissionId}`} className="border-b border-slate-100 last:border-b-0">
                      {index === 0 ? (
                        <td
                          rowSpan={section.permissions.length}
                          className="sticky left-0 z-10 border-r border-slate-200 bg-white px-4 py-3 align-top text-sm font-bold text-slate-900"
                        >
                          {section.title}
                        </td>
                      ) : null}

                      <td className="sticky left-[180px] z-10 border-r border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                        {permissionLabel}
                      </td>

                      {ROLE_COLUMNS.map((role) => (
                        <td
                          key={`${section.id}.${permissionId}.${role.id}`}
                          className="border-r border-slate-100 px-3 py-2 text-center last:border-r-0"
                        >
                          {renderScopeCell(section.id, permissionId, role.id)}
                        </td>
                      ))}
                    </tr>
                  )),
                )}
              </tbody>
            </table>

            {visibleSections.length === 0 ? (
              <div className="px-6 py-14 text-center text-sm text-slate-500">
                Không có quyền nào khớp với từ khóa tìm kiếm.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPermissions;
