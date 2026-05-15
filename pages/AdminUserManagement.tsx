import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Search,
  UserPlus,
  Users,
  ToggleRight,
  ChevronDown,
  X,
  Edit2,
  Trash2,
  Save,
  MapPin,
  Network,
  Columns3,
  Shield,
  Sparkles,
} from 'lucide-react';
import PermissionScopeSelect from '../components/admin-permissions/PermissionScopeSelect';
import { AdvancedFilterDropdown } from '../components/filters';
import { useAuth } from '../contexts/AuthContext';
import { getLeads, saveLeads } from '../utils/storage';
import { type ToolbarOption, type ToolbarValueOption } from '../utils/filterToolbar';
import {
  ADMIN_PERMISSIONS_EVENT,
  PERMISSION_GROUPS,
  SCOPE_OPTIONS,
  buildRolePermissionSummary,
  createEmptyPermissionStateForRole,
  getPermissionKey,
  getScopeOption,
  loadAdminPermissionSettings,
  saveAdminPermissionSettings,
  type GroupPermissionState,
  type PermissionGroupId,
  type PermissionRoleRecord,
  type PermissionScope,
} from '../utils/adminPermissions';
import {
  ADMIN_USERS_CHANGED_EVENT,
  ADMIN_USER_ACCOUNT_STATUS_OPTIONS,
  ADMIN_USER_CONTRACT_TYPE_OPTIONS,
  ADMIN_USER_ROLE_OPTIONS,
  buildAdminUserFormData,
  buildAdminUserRecord,
  createEmptyAdminUserForm,
  DEFAULT_ADMIN_BRANCHES,
  DEFAULT_ADMIN_DEPARTMENTS,
  getAdminUsers,
  saveAdminUsers,
  type AdminUserFormData,
  type AdminUserRecord,
} from '../utils/adminUsers';
import {
  ORG_CONFIG_EVENT,
  getBranches,
  getTeams,
  type OrgBranch,
  type OrgTeam,
} from '../utils/orgConfig';
import { UserRole, type ILead } from '../types';

type FilterId = 'role' | 'department' | 'branch' | 'accountStatus' | 'contractType' | 'managerId';

type OptionalColumnId =
  | 'team'
  | 'manager'
  | 'contractType'
  | 'title'
  | 'lastLoginAt'
  | 'startDate'
  | 'endDate'
  | 'employmentStatus';

type OptionalColumnConfig = {
  id: OptionalColumnId;
  label: string;
  description: string;
};

type FixedColumnId = 'name' | 'email' | 'role' | 'organization' | 'accountStatus' | 'actions';

type FixedColumnConfig = {
  id: FixedColumnId;
  label: string;
  description: string;
};

const ADMIN_USER_ADVANCED_FILTER_OPTIONS: ReadonlyArray<ToolbarOption> = [
  { id: 'role', label: 'Vai trò' },
  { id: 'department', label: 'Phòng ban' },
  { id: 'branch', label: 'Chi nhánh' },
  { id: 'accountStatus', label: 'Trạng thái' },
  { id: 'contractType', label: 'Loại hợp đồng' },
  { id: 'managerId', label: 'Quản lý trực tiếp' },
];

const FIXED_COLUMN_CONFIGS: ReadonlyArray<FixedColumnConfig> = [
  {
    id: 'name',
    label: 'Họ và tên',
    description: 'Thông tin nhận diện chính của nhân sự.',
  },
  {
    id: 'email',
    label: 'Email / Username',
    description: 'Tài khoản đăng nhập và email công việc.',
  },
  {
    id: 'role',
    label: 'Vai trò',
    description: 'Vai trò và quyền truy cập của user.',
  },
  {
    id: 'organization',
    label: 'Tổ chức',
    description: 'Phòng ban và chi nhánh hiện tại.',
  },
  {
    id: 'accountStatus',
    label: 'Trạng thái',
    description: 'Trạng thái hoạt động của tài khoản.',
  },
  {
    id: 'actions',
    label: 'Thao tác',
    description: 'Các thao tác nhanh trên từng user.',
  },
] as const;

const OPTIONAL_COLUMN_CONFIGS: ReadonlyArray<OptionalColumnConfig> = [
  {
    id: 'team',
    label: 'Team',
    description: 'Hiển thị team nội bộ của nhân sự.',
  },
  {
    id: 'manager',
    label: 'Người quản lý',
    description: 'Người quản lý trực tiếp của user.',
  },
  {
    id: 'contractType',
    label: 'Loại hợp đồng',
    description: 'Chính thức, thử việc, CTV, thực tập sinh, part time.',
  },
  {
    id: 'title',
    label: 'Chức danh',
    description: 'Chức danh hiện tại của nhân sự.',
  },
  {
    id: 'lastLoginAt',
    label: 'Lần đăng nhập cuối',
    description: 'Mốc truy cập gần nhất của tài khoản.',
  },
  {
    id: 'startDate',
    label: 'Ngày làm',
    description: 'Ngày bắt đầu làm việc.',
  },
  {
    id: 'endDate',
    label: 'Ngày nghỉ',
    description: 'Ngày nghỉ việc hoặc tạm nghỉ.',
  },
  {
    id: 'employmentStatus',
    label: 'Trạng thái nhân sự',
    description: 'Đang làm, nghỉ việc hoặc tạm nghỉ.',
  },
];

const ALL_TABLE_COLUMN_MENU_ITEMS = [
  ...FIXED_COLUMN_CONFIGS.map((column) => ({ ...column, fixed: true as const })),
  ...OPTIONAL_COLUMN_CONFIGS.map((column) => ({ ...column, fixed: false as const })),
];

const DEFAULT_SELECTED_OPTIONAL_COLUMNS: ReadonlyArray<OptionalColumnId> = ['team'];

const sortOptionalColumns = (columnIds: OptionalColumnId[]) =>
  OPTIONAL_COLUMN_CONFIGS.filter((column) => columnIds.includes(column.id)).map((column) => column.id);

const ROLE_BADGE_CLASS: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'border-rose-200 bg-rose-50 text-rose-700',
  [UserRole.FOUNDER]: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700',
  [UserRole.MARKETING]: 'border-pink-200 bg-pink-50 text-pink-700',
  [UserRole.SALES_REP]: 'border-blue-200 bg-blue-50 text-blue-700',
  [UserRole.SALES_LEADER]: 'border-amber-200 bg-amber-50 text-amber-700',
  [UserRole.ACCOUNTANT]: 'border-purple-200 bg-purple-50 text-purple-700',
  [UserRole.TRAINING]: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  [UserRole.TEACHER]: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  [UserRole.STUDY_ABROAD]: 'border-sky-200 bg-sky-50 text-sky-700',
  [UserRole.AGENT]: 'border-orange-200 bg-orange-50 text-orange-700',
};

const ACCOUNT_STATUS_META = {
  active: {
    label: 'Hoạt động',
    badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    dotClass: 'bg-emerald-500',
  },
  locked: {
    label: 'Tạm khóa',
    badgeClass: 'border-slate-200 bg-slate-100 text-slate-600',
    dotClass: 'bg-slate-400',
  },
} as const;

const EMPLOYMENT_STATUS_META = {
  working: {
    label: 'Đang làm',
    badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  paused: {
    label: 'Tạm nghỉ',
    badgeClass: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  resigned: {
    label: 'Nghỉ việc',
    badgeClass: 'border-rose-200 bg-rose-50 text-rose-700',
  },
} as const;

const CONTRACT_TYPE_LABELS = Object.fromEntries(
  ADMIN_USER_CONTRACT_TYPE_OPTIONS.map((item) => [item.value, item.label])
) as Record<string, string>;

const normalizeToken = (value?: string) => String(value || '').trim().toLowerCase();

const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN');
};

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatRoles = (roles: UserRole[]) => (roles.length ? roles : [UserRole.SALES_REP]);

const getRoleBadgeClass = (role: UserRole) => ROLE_BADGE_CLASS[role] || 'border-slate-200 bg-slate-50 text-slate-700';

const getAccountStatusMeta = (status: AdminUserRecord['accountStatus']) =>
  ACCOUNT_STATUS_META[status] || ACCOUNT_STATUS_META.active;

const getEmploymentStatusMeta = (status: AdminUserRecord['employmentStatus']) =>
  EMPLOYMENT_STATUS_META[status] || EMPLOYMENT_STATUS_META.working;

const getManagedLeadCount = (leadList: ILead[], user: AdminUserRecord) => {
  const userToken = normalizeToken(user.id);
  const nameToken = normalizeToken(user.name);
  return leadList.filter((lead) => {
    const ownerToken = normalizeToken(lead.ownerId);
    return ownerToken === userToken || ownerToken === nameToken;
  }).length;
};

const updateManagedLeadsOwner = (leadList: ILead[], sourceUser: AdminUserRecord, targetUserId: string) => {
  const sourceUserToken = normalizeToken(sourceUser.id);
  const sourceNameToken = normalizeToken(sourceUser.name);
  const nowIso = new Date().toISOString();

  return leadList.map((lead) => {
    const ownerToken = normalizeToken(lead.ownerId);
    if (ownerToken !== sourceUserToken && ownerToken !== sourceNameToken) return lead;
    return {
      ...lead,
      ownerId: targetUserId,
      updatedAt: nowIso,
      lastInteraction: lead.lastInteraction || nowIso,
    };
  });
};

const renderSelectedColumnValue = (
  columnId: OptionalColumnId,
  userRecord: AdminUserRecord,
  managerName: string
) => {
  switch (columnId) {
    case 'team':
      return userRecord.team || '-';
    case 'manager':
      return managerName;
    case 'contractType':
      return CONTRACT_TYPE_LABELS[userRecord.contractType] || '-';
    case 'title':
      return userRecord.title || '-';
    case 'lastLoginAt':
      return formatDateTime(userRecord.lastLoginAt);
    case 'startDate':
      return formatDate(userRecord.startDate);
    case 'endDate':
      return formatDate(userRecord.endDate);
    case 'employmentStatus': {
      const employmentMeta = getEmploymentStatusMeta(userRecord.employmentStatus);
      return (
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${employmentMeta.badgeClass}`}>
          {employmentMeta.label}
        </span>
      );
    }
    default:
      return '-';
  }
};

const clonePermissionState = (permissions: GroupPermissionState): GroupPermissionState =>
  Object.fromEntries(
    Object.entries(permissions || {}).map(([groupId, groupValue]) => [groupId, { ...(groupValue || {}) }]),
  ) as GroupPermissionState;

const AdminUserManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [leadList, setLeadList] = useState<ILead[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [selectedAdvancedFilterFields, setSelectedAdvancedFilterFields] = useState<FilterId[]>([]);
  const [selectedAdvancedFilterValues, setSelectedAdvancedFilterValues] = useState<Partial<Record<FilterId, string>>>({});
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
  const [selectedOptionalColumns, setSelectedOptionalColumns] = useState<OptionalColumnId[]>(() =>
    sortOptionalColumns([...DEFAULT_SELECTED_OPTIONAL_COLUMNS])
  );
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserRecord | null>(null);
  const [formData, setFormData] = useState<AdminUserFormData>(createEmptyAdminUserForm());
  const [permissionDraft, setPermissionDraft] = useState<GroupPermissionState>(() => createEmptyPermissionStateForRole());
  const [permissionRoles, setPermissionRoles] = useState<PermissionRoleRecord[]>(() => loadAdminPermissionSettings().roles);
  const [activePermissionGroupId, setActivePermissionGroupId] = useState<PermissionGroupId>(PERMISSION_GROUPS[0].id);
  const [formError, setFormError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<AdminUserRecord | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [reassignUserId, setReassignUserId] = useState('');

  const [orgVersion, setOrgVersion] = useState(0);

  useEffect(() => {
    const syncData = () => {
      setUsers(getAdminUsers());
      setLeadList(getLeads());
      setPermissionRoles(loadAdminPermissionSettings().roles);
    };

    const syncOrg = () => {
      setOrgVersion(v => v + 1);
    };

    syncData();
    window.addEventListener(ADMIN_USERS_CHANGED_EVENT, syncData as EventListener);
    window.addEventListener(ADMIN_PERMISSIONS_EVENT, syncData as EventListener);
    window.addEventListener('educrm:leads-changed', syncData as EventListener);
    window.addEventListener(ORG_CONFIG_EVENT, syncOrg);
    window.addEventListener('storage', syncData);

    return () => {
      window.removeEventListener(ADMIN_USERS_CHANGED_EVENT, syncData as EventListener);
      window.removeEventListener(ADMIN_PERMISSIONS_EVENT, syncData as EventListener);
      window.removeEventListener('educrm:leads-changed', syncData as EventListener);
      window.removeEventListener(ORG_CONFIG_EVENT, syncOrg);
      window.removeEventListener('storage', syncData);
    };
  }, []);

  const managerNameById = useMemo(() => {
    const map = new Map<string, string>();
    users.forEach((item) => {
      map.set(item.id, item.name);
    });
    return map;
  }, [users]);

  const departmentOptions = useMemo(
    () =>
      Array.from(new Set([...DEFAULT_ADMIN_DEPARTMENTS, ...users.map((item) => item.department).filter(Boolean)])).map((item) => ({
        value: item,
        label: item,
      })),
    [users]
  );

  const branchOptions = useMemo(
    () =>
      getBranches()
        .filter((b) => b.status === 'Đang hoạt động')
        .map((b) => ({
          value: b.name,
          label: b.name,
        })),
    [orgVersion]
  );

  const teamOptions = useMemo(
    () =>
      getTeams()
        .filter((t) => t.status === 'Đang hoạt động')
        .map((t) => ({
          value: t.name,
          label: t.name,
        })),
    [orgVersion]
  );

  const managerOptions = useMemo(
    () => users.map((item) => ({ value: item.id, label: item.name })),
    [users]
  );

  const advancedFilterSelectableValuesByField = useMemo<Partial<Record<FilterId, ReadonlyArray<ToolbarValueOption>>>>(
    () => ({
      role: ADMIN_USER_ROLE_OPTIONS.map((item) => ({ value: item, label: item })),
      department: departmentOptions,
      branch: branchOptions,
      accountStatus: ADMIN_USER_ACCOUNT_STATUS_OPTIONS.map((item) => ({ value: item.value, label: item.label })),
      contractType: ADMIN_USER_CONTRACT_TYPE_OPTIONS.map((item) => ({ value: item.value, label: item.label })),
      managerId: managerOptions,
    }),
    [branchOptions, departmentOptions, managerOptions]
  );

  const selectedAdvancedFilterOptions = useMemo(
    () =>
      selectedAdvancedFilterFields
        .map((fieldId) => ADMIN_USER_ADVANCED_FILTER_OPTIONS.find((option) => option.id === fieldId))
        .filter((option): option is ToolbarOption => Boolean(option)),
    [selectedAdvancedFilterFields]
  );

  const activeAdvancedFilterField = selectedAdvancedFilterOptions[0] || null;

  const selectedAdvancedFilterEntries = useMemo(
    () =>
      Object.entries(selectedAdvancedFilterValues).filter(
        (entry): entry is [FilterId, string] => Boolean(entry[1])
      ),
    [selectedAdvancedFilterValues]
  );

  const filteredUsers = useMemo(() => {
    const normalizedSearch = normalizeToken(searchTerm);

    return users.filter((item) => {
      const matchesAdvancedFilters = selectedAdvancedFilterEntries.every(([fieldId, value]) => {
        switch (fieldId) {
          case 'role':
            return formatRoles(item.roles).includes(value as UserRole);
          case 'department':
            return item.department === value;
          case 'branch':
            return item.branch === value;
          case 'accountStatus':
            return item.accountStatus === value;
          case 'contractType':
            return item.contractType === value;
          case 'managerId':
            return (item.managerId || '') === value;
          default:
            return true;
        }
      });

      if (!matchesAdvancedFilters) return false;

      if (!normalizedSearch) return true;

      return [
        item.name,
        item.email,
        item.username,
        item.department,
        item.branch,
        item.team,
        item.title,
        item.permissionRoleLabel || '',
        managerNameById.get(item.managerId || '') || '',
      ].some((value) => normalizeToken(value).includes(normalizedSearch));
    });
  }, [managerNameById, searchTerm, selectedAdvancedFilterEntries, users]);

  const replacementUserOptions = useMemo(
    () => users.filter((item) => item.id !== deleteTarget?.id),
    [deleteTarget?.id, users]
  );

  const deleteTargetLeadCount = useMemo(
    () => (deleteTarget ? getManagedLeadCount(leadList, deleteTarget) : 0),
    [deleteTarget, leadList]
  );

  const activeAdvancedFilterCount = selectedAdvancedFilterEntries.length;
  const hasActiveFilters = activeAdvancedFilterCount > 0;

  const selectedOptionalColumnConfigs = useMemo(
    () => OPTIONAL_COLUMN_CONFIGS.filter((item) => selectedOptionalColumns.includes(item.id)),
    [selectedOptionalColumns]
  );

  const hasCustomOptionalColumns =
    selectedOptionalColumns.length !== DEFAULT_SELECTED_OPTIONAL_COLUMNS.length ||
    selectedOptionalColumns.some((columnId, index) => columnId !== DEFAULT_SELECTED_OPTIONAL_COLUMNS[index]);

  const visibleTableColumnCount = FIXED_COLUMN_CONFIGS.length + selectedOptionalColumnConfigs.length;

  const visibleColumnSummaryLabel = `${visibleTableColumnCount} cột`;

  const visibleColumnTooltip = useMemo(
    () => [...FIXED_COLUMN_CONFIGS.map((column) => column.label), ...selectedOptionalColumnConfigs.map((column) => column.label)].join(', '),
    [selectedOptionalColumnConfigs]
  );

  const visibleColumnMenuIds = useMemo(
    () => new Set<string>([...FIXED_COLUMN_CONFIGS.map((column) => column.id), ...selectedOptionalColumns]),
    [selectedOptionalColumns]
  );

  const resetForm = () => {
    setEditingUser(null);
    setFormData(createEmptyAdminUserForm());
    setPermissionDraft(createEmptyPermissionStateForRole());
    setActivePermissionGroupId(PERMISSION_GROUPS[0].id);
    setFormError('');
    setIsFormOpen(false);
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData(createEmptyAdminUserForm());
    setPermissionDraft(createEmptyPermissionStateForRole());
    setActivePermissionGroupId(PERMISSION_GROUPS[0].id);
    setFormError('');
    setIsFormOpen(true);
  };

  const openEditModal = (userRecord: AdminUserRecord) => {
    const permissionSettings = loadAdminPermissionSettings();
    const linkedPermissionRole = userRecord.permissionRoleId
      ? permissionSettings.roles.find((role) => role.id === userRecord.permissionRoleId) || null
      : null;

    setEditingUser(userRecord);
    setFormData({
      ...buildAdminUserFormData(userRecord),
      permissionRoleId: userRecord.permissionRoleId || linkedPermissionRole?.id || '',
      permissionRoleLabel: userRecord.permissionRoleLabel || linkedPermissionRole?.label || '',
    });
    setPermissionDraft(
      clonePermissionState(
        linkedPermissionRole
          ? permissionSettings.permissions[linkedPermissionRole.id] || createEmptyPermissionStateForRole()
          : createEmptyPermissionStateForRole(),
      ),
    );
    setActivePermissionGroupId(PERMISSION_GROUPS[0].id);
    setFormError('');
    setIsFormOpen(true);
  };

  const openDeleteModal = (userRecord: AdminUserRecord) => {
    setDeleteTarget(userRecord);
    setDeleteError('');
    const fallbackUser = users.find((item) => item.id !== userRecord.id);
    setReassignUserId(fallbackUser?.id || '');
  };

  const closeDeleteModal = () => {
    setDeleteTarget(null);
    setDeleteError('');
    setReassignUserId('');
  };

  const handleAdvancedFilterOpenChange = (nextOpen: boolean) => {
    setIsColumnMenuOpen(false);
    setShowFilterDropdown(nextOpen);
  };

  const handleToggleAdvancedFilterField = (fieldId: FilterId) => {
    setSelectedAdvancedFilterFields((prev) =>
      prev.includes(fieldId)
        ? prev.filter((item) => item !== fieldId)
        : [...prev, fieldId]
    );
    setSelectedAdvancedFilterValues((prev) => {
      if (!(fieldId in prev)) return prev;

      const nextValues = { ...prev };
      delete nextValues[fieldId];
      return nextValues;
    });
  };

  const handleAdvancedFilterValueChange = (fieldId: FilterId, value: string) => {
    setSelectedAdvancedFilterValues((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  const handleClearAdvancedFilters = () => {
    setSelectedAdvancedFilterFields([]);
    setSelectedAdvancedFilterValues({});
  };

  const handleClearOptionalColumns = () => {
    setSelectedOptionalColumns([]);
  };

  const handleResetOptionalColumns = () => {
    setSelectedOptionalColumns(sortOptionalColumns([...DEFAULT_SELECTED_OPTIONAL_COLUMNS]));
  };

  const handleToggleOptionalColumn = (columnId: OptionalColumnId) => {
    setSelectedOptionalColumns((prev) => {
      if (prev.includes(columnId)) {
        return prev.filter((item) => item !== columnId);
      }
      return sortOptionalColumns([...prev, columnId]);
    });
  };

  const handleFormFieldChange = <K extends keyof AdminUserFormData>(field: K, value: AdminUserFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePermissionRoleLabelChange = (nextLabel: string) => {
    const permissionSettings = loadAdminPermissionSettings();
    const linkedPermissionRole = permissionSettings.roles.find((role) => role.label === nextLabel) || null;

    setFormData((prev) => ({
      ...prev,
      permissionRoleId: linkedPermissionRole?.id || '',
      permissionRoleLabel: nextLabel,
    }));
    setPermissionDraft(
      clonePermissionState(
        linkedPermissionRole
          ? permissionSettings.permissions[linkedPermissionRole.id] || createEmptyPermissionStateForRole()
          : createEmptyPermissionStateForRole(),
      ),
    );
    setActivePermissionGroupId(PERMISSION_GROUPS[0].id);
  };

  const activePermissionGroup = useMemo(
    () => PERMISSION_GROUPS.find((group) => group.id === activePermissionGroupId) || PERMISSION_GROUPS[0],
    [activePermissionGroupId],
  );

  const permissionSummary = useMemo(() => buildRolePermissionSummary(permissionDraft), [permissionDraft]);

  const activePermissionGroupSummary = useMemo(
    () =>
      buildRolePermissionSummary({
        [activePermissionGroup.id]: permissionDraft[activePermissionGroup.id] || {},
      }),
    [activePermissionGroup.id, permissionDraft],
  );

  const getPermissionScopeValue = (groupId: PermissionGroupId, permissionKey: string): PermissionScope =>
    permissionDraft[groupId]?.[permissionKey] || 'none';

  const setPermissionScopeValue = (groupId: PermissionGroupId, permissionKey: string, nextScope: PermissionScope) => {
    setPermissionDraft((prev) => ({
      ...prev,
      [groupId]: {
        ...(prev[groupId] || {}),
        [permissionKey]: nextScope,
      },
    }));
  };

  const handleTogglePermission = (groupId: PermissionGroupId, permissionKey: string, checked: boolean) => {
    if (!checked) {
      setPermissionScopeValue(groupId, permissionKey, 'none');
      return;
    }

    const currentScope = getPermissionScopeValue(groupId, permissionKey);
    setPermissionScopeValue(groupId, permissionKey, currentScope !== 'none' ? currentScope : 'personal');
  };

  const handleApplyScopeToGroup = (groupId: PermissionGroupId, nextScope: PermissionScope) => {
    setPermissionDraft((prev) => {
      const nextGroupPermissions = { ...(prev[groupId] || {}) };

      PERMISSION_GROUPS.find((group) => group.id === groupId)?.sections.forEach((section) => {
        section.permissions.forEach((permission) => {
          nextGroupPermissions[getPermissionKey(section.id, permission.id)] = nextScope;
        });
      });

      return {
        ...prev,
        [groupId]: nextGroupPermissions,
      };
    });
  };

  const handleSaveUser = () => {
    const trimmedName = formData.name.trim();
    const trimmedEmail = formData.email.trim();
    const trimmedUsername = formData.username.trim();
    const trimmedDepartment = formData.department.trim();
    const trimmedBranch = formData.branch.trim();
    const trimmedTeam = formData.team.trim();
    const trimmedTitle = formData.title.trim();
    const trimmedPermissionRoleLabel = formData.permissionRoleLabel.trim();
    const draftPermissionSummary = buildRolePermissionSummary(permissionDraft);

    if (!trimmedEmail) {
      setFormError('Vui lòng nhập email.');
      return;
    }

    if (!trimmedUsername) {
      setFormError('Vui lòng nhập username.');
      return;
    }

    if (!editingUser && !formData.password.trim()) {
      setFormError('Vui lòng nhập mật khẩu.');
      return;
    }

    const displayName = trimmedName || trimmedUsername || trimmedEmail;

    if (draftPermissionSummary.activePermissionCount > 0 && !trimmedPermissionRoleLabel) {
      setFormError('Vui lòng nhập Role cho khối phân quyền trước khi bật quyền.');
      return;
    }

    const duplicateEmail = users.some(
      (item) => item.id !== editingUser?.id && normalizeToken(item.email) === normalizeToken(trimmedEmail)
    );
    if (duplicateEmail) {
      setFormError('Email đã tồn tại.');
      return;
    }

    const duplicateUsername = users.some(
      (item) => item.id !== editingUser?.id && normalizeToken(item.username) === normalizeToken(trimmedUsername)
    );
    if (duplicateUsername) {
      setFormError('Username đã tồn tại.');
      return;
    }

    const permissionSettings = loadAdminPermissionSettings();
    const linkedPermissionRole = formData.permissionRoleId
      ? permissionSettings.roles.find((role) => role.id === formData.permissionRoleId) || null
      : null;
    const selectedPermissionRole =
      linkedPermissionRole || permissionSettings.roles.find((role) => role.label === trimmedPermissionRoleLabel) || null;

    let nextPermissionRoleId = '';
    let nextPermissionRoleLabel = '';

    if (trimmedPermissionRoleLabel) {
      if (!selectedPermissionRole) {
        setFormError('Vui lòng chọn Role hợp lệ.');
        return;
      }

      const nextRoleId = selectedPermissionRole.id;

      if (draftPermissionSummary.activePermissionCount > 0) {
        saveAdminPermissionSettings({
          roles: permissionSettings.roles,
          permissions: {
            ...permissionSettings.permissions,
            [nextRoleId]: clonePermissionState(permissionDraft),
          },
        });
      }

      nextPermissionRoleId = nextRoleId;
      nextPermissionRoleLabel = selectedPermissionRole.label;
    }

    const nextUser = buildAdminUserRecord(
      {
        ...formData,
        name: displayName,
        email: trimmedEmail,
        username: trimmedUsername,
        department: trimmedDepartment,
        branch: trimmedBranch,
        team: trimmedTeam,
        title: trimmedTitle,
        permissionRoleId: nextPermissionRoleId,
        permissionRoleLabel: nextPermissionRoleLabel,
      },
      editingUser || undefined
    );

    const nextUsers = editingUser
      ? users.map((item) => (item.id === editingUser.id ? nextUser : item))
      : [nextUser, ...users];

    saveAdminUsers(nextUsers);
    setUsers(nextUsers);
    resetForm();
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;

    if (normalizeToken(currentUser?.id) === normalizeToken(deleteTarget.id)) {
      setDeleteError('Không thể xóa tài khoản đang đăng nhập.');
      return;
    }

    if (deleteTargetLeadCount > 0 && !replacementUserOptions.length) {
      setDeleteError('Không còn user khác để nhận lead. Vui lòng tạo user mới trước khi xóa.');
      return;
    }

    if (deleteTargetLeadCount > 0 && !reassignUserId) {
      setDeleteError('Vui lòng chọn người nhận lead trước khi xóa user.');
      return;
    }

    const nextUsers = users
      .filter((item) => item.id !== deleteTarget.id)
      .map((item) => {
        if (item.managerId !== deleteTarget.id) return item;
        const nextManagerId = reassignUserId && reassignUserId !== item.id ? reassignUserId : undefined;
        return {
          ...item,
          managerId: nextManagerId,
          updatedAt: new Date().toISOString(),
        };
      });

    if (deleteTargetLeadCount > 0 && reassignUserId) {
      const nextLeads = updateManagedLeadsOwner(leadList, deleteTarget, reassignUserId);
      saveLeads(nextLeads);
      setLeadList(nextLeads);
    }

    saveAdminUsers(nextUsers);
    setUsers(nextUsers);
    closeDeleteModal();
  };

  const summaryCards = [
    {
      title: 'Tổng nhân sự',
      value: users.length,
      icon: Users,
      accent: 'bg-blue-50 text-blue-700',
    },
    {
      title: 'Tài khoản hoạt động',
      value: users.filter((item) => item.accountStatus === 'active').length,
      icon: ToggleRight,
      accent: 'bg-emerald-50 text-emerald-700',
    },
    {
      title: 'Chi nhánh',
      value: branchOptions.length,
      icon: MapPin,
      accent: 'bg-amber-50 text-amber-700',
    },
    {
      title: 'Team',
      value: Array.from(new Set(users.map((item) => item.team).filter(Boolean))).length,
      icon: Network,
      accent: 'bg-violet-50 text-violet-700',
    },
  ];

  const inputClass =
    'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100';
  const labelClass = 'mb-2 block text-sm font-semibold text-slate-700';

  return (
    <div className="space-y-6 p-4 md:p-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Quản lý Tài khoản Người dùng</h1>
            <p className="max-w-3xl text-sm text-slate-500">
              Cấu hình truy cập, vai trò và quản trị nhân sự hệ thống. Danh sách này cũng dùng để gán quản lý trực
              tiếp, chuyển lead khi xóa user và lọc theo tổ chức nội bộ.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <UserPlus size={18} />
            Thêm Người dùng
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.title} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-500">{card.title}</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{card.value}</p>
                  </div>
                  <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${card.accent}`}>
                    <Icon size={18} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
            <label className="relative block w-full xl:min-w-[420px] xl:flex-1">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Tìm kiếm nhân viên..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </label>
            <div className="flex shrink-0 flex-wrap items-center gap-3">
              <AdvancedFilterDropdown
                isOpen={showFilterDropdown}
                activeCount={activeAdvancedFilterCount}
                hasActiveFilters={hasActiveFilters}
                filterOptions={ADMIN_USER_ADVANCED_FILTER_OPTIONS}
                groupOptions={[]}
                selectedFilterFieldIds={selectedAdvancedFilterFields}
                selectedGroupFieldIds={[]}
                activeFilterField={activeAdvancedFilterField}
                selectableValues={
                  activeAdvancedFilterField
                    ? advancedFilterSelectableValuesByField[activeAdvancedFilterField.id as FilterId] || []
                    : []
                }
                selectedFilterValue={
                  activeAdvancedFilterField
                    ? selectedAdvancedFilterValues[activeAdvancedFilterField.id as FilterId] || ''
                    : ''
                }
                selectedFilterValuesByField={selectedAdvancedFilterValues}
                selectableValuesByField={advancedFilterSelectableValuesByField}
                onOpenChange={handleAdvancedFilterOpenChange}
                onToggleFilterField={(fieldId) => handleToggleAdvancedFilterField(fieldId as FilterId)}
                onToggleGroupField={() => undefined}
                onFilterValueChange={() => undefined}
                onFilterValueChangeForField={(fieldId, value) =>
                  handleAdvancedFilterValueChange(fieldId as FilterId, value)
                }
                onClearAll={handleClearAdvancedFilters}
                triggerLabel="Lọc nâng cao"
                filterDescription="Chọn một hoặc nhiều trường rồi chọn giá trị tương ứng để lọc nhanh danh sách người dùng."
                filterValueHint="Có thể đặt giá trị cho nhiều trường cùng lúc. Chỉ các trường có giá trị mới được áp dụng vào kết quả."
                filterFieldHint="Chọn các trường cần lọc ở danh sách bên trên để hiện toàn bộ giá trị có sẵn."
                triggerClassName="h-11 rounded-xl px-3 text-sm font-medium shadow-none"
                panelClassName="!w-[420px]"
                className="shrink-0"
              />

              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowFilterDropdown(false);
                    setIsColumnMenuOpen((prev) => !prev);
                  }}
                  className={`inline-flex h-11 items-center gap-2 rounded-xl border px-3 text-sm font-medium transition ${
                    isColumnMenuOpen || hasCustomOptionalColumns
                      ? 'border-blue-200 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Columns3 size={16} />
                  <span>Cột hiển thị</span>
                  <span
                    className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-semibold text-slate-600"
                    title={visibleColumnTooltip}
                  >
                    {visibleColumnSummaryLabel}
                  </span>
                  <ChevronDown size={14} className="text-slate-400" />
                </button>

                {isColumnMenuOpen ? (
                  <>
                    <button
                      type="button"
                      className="fixed inset-0 z-30 cursor-default"
                      onClick={() => setIsColumnMenuOpen(false)}
                      aria-label="Đóng chọn cột"
                    />
                    <div className="absolute right-0 top-full z-40 mt-2 flex max-h-[calc(100vh-8rem)] w-[520px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-2 py-1 pb-3">
                        <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Hiển thị cột</div>
                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            onClick={handleClearOptionalColumns}
                            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                          >
                            Chỉ cố định
                          </button>
                          <button
                            type="button"
                            onClick={handleResetOptionalColumns}
                            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                          >
                            Mặc định
                          </button>
                        </div>
                      </div>

                      <div className="mt-2 min-h-0 flex-1 overflow-y-auto pr-1">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                          {ALL_TABLE_COLUMN_MENU_ITEMS.map((column) => {
                            const isSelected = visibleColumnMenuIds.has(column.id);
                            return (
                              <button
                                key={column.id}
                                type="button"
                                onClick={() => {
                                  if (!column.fixed) {
                                    handleToggleOptionalColumn(column.id as OptionalColumnId);
                                  }
                                }}
                                className={`flex items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition ${
                                  column.fixed ? 'cursor-default' : 'cursor-pointer hover:bg-slate-50'
                                }`}
                                title={column.fixed ? `${column.label} (cố định)` : column.label}
                              >
                                <span
                                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                                    isSelected
                                      ? 'border-blue-600 bg-blue-600 text-white'
                                      : 'border-slate-300 bg-white text-transparent'
                                  }`}
                                >
                                  <Check size={12} strokeWidth={4} />
                                </span>
                                <span className={isSelected ? 'font-medium text-slate-900' : 'text-slate-500'}>
                                  {column.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table
            className="w-full table-fixed divide-y divide-slate-200"
            style={{ minWidth: `${Math.max(1120, 960 + selectedOptionalColumnConfigs.length * 180)}px` }}
          >
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="w-[26%] px-4 py-3">Họ và tên</th>
                <th className="w-[21%] px-4 py-3">Email / Username</th>
                <th className="w-[14%] px-4 py-3">Vai trò</th>
                <th className="w-[17%] px-4 py-3">Tổ chức</th>
                <th className="w-[11%] px-4 py-3">Trạng thái</th>
                {selectedOptionalColumnConfigs.map((column) => (
                  <th key={column.id} className="w-[15%] px-4 py-3">
                    {column.label}
                  </th>
                ))}
                <th className="w-[10%] px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredUsers.length ? (
                filteredUsers.map((userRecord, index) => {
                  const accountMeta = getAccountStatusMeta(userRecord.accountStatus);
                  const isCurrentUser = normalizeToken(currentUser?.id) === normalizeToken(userRecord.id);
                  const managerName = managerNameById.get(userRecord.managerId || '') || '-';
                  const managedLeadCount = getManagedLeadCount(leadList, userRecord);

                  return (
                    <tr key={userRecord.id} className="align-top text-sm text-slate-700">
                      <td className="px-4 py-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                            {userRecord.avatar || userRecord.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-slate-400">#{index + 1}</span>
                              <div className="truncate font-semibold text-slate-900">{userRecord.name}</div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              {isCurrentUser ? (
                                <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                                  Bạn đang đăng nhập
                                </span>
                              ) : null}
                              {managedLeadCount ? (
                                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                                  {managedLeadCount} lead đang giữ
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <div className="truncate font-medium text-slate-900">{userRecord.email}</div>
                          <div className="truncate text-xs text-slate-500">@{userRecord.username}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex max-w-xs flex-wrap gap-2">
                          {userRecord.permissionRoleLabel ? (
                            <span className="rounded-full border border-slate-300 bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white">
                              {userRecord.permissionRoleLabel}
                            </span>
                          ) : null}
                          {formatRoles(userRecord.roles).map((role) => (
                            <span
                              key={`${userRecord.id}-${role}`}
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getRoleBadgeClass(role)}`}
                            >
                              {role}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <div className="font-medium text-slate-900">{userRecord.department || '-'}</div>
                          <div className="text-xs text-slate-500">{userRecord.branch || '-'}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold ${accountMeta.badgeClass}`}>
                          <span className={`h-2 w-2 rounded-full ${accountMeta.dotClass}`} />
                          {accountMeta.label}
                        </span>
                      </td>
                      {selectedOptionalColumnConfigs.map((column) => (
                        <td key={`${userRecord.id}-${column.id}`} className="px-4 py-4">
                          <div className="truncate">{renderSelectedColumnValue(column.id, userRecord, managerName)}</div>
                        </td>
                      ))}
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(userRecord)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                            aria-label={`Sửa ${userRecord.name}`}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeleteModal(userRecord)}
                            disabled={isCurrentUser}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300 disabled:hover:bg-transparent"
                            aria-label={`Xóa ${userRecord.name}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={visibleTableColumnCount} className="px-6 py-14 text-center text-sm text-slate-500">
                    Không có người dùng nào khớp với bộ lọc hiện tại.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-200 px-6 py-4 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <p>
            Hiển thị <span className="font-semibold text-slate-700">{filteredUsers.length}</span> trên tổng số{' '}
            <span className="font-semibold text-slate-700">{users.length}</span> người dùng
          </p>
          <p>
            Tổng lead đang được giữ bởi nhân sự trong danh sách:{' '}
            <span className="font-semibold text-slate-700">
              {filteredUsers.reduce((total, item) => total + getManagedLeadCount(leadList, item), 0)}
            </span>
          </p>
        </div>
      </section>

      {isFormOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <button type="button" className="absolute inset-0 cursor-default" onClick={resetForm} aria-label="Đóng modal" />
          <div className="relative z-10 flex max-h-[calc(100vh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{editingUser ? 'Cập nhật người dùng' : 'Thêm người dùng'}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Khai báo đầy đủ thông tin nội bộ, vai trò và quan hệ quản lý trực tiếp.
                </p>
              </div>
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50"
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                handleSaveUser();
              }}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6">
                <section className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        <UserPlus size={14} />
                        Tài khoản user
                      </div>
                      <h3 className="mt-3 text-base font-semibold text-slate-900">Thông tin tài khoản</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Khối nhập tài khoản này được cắt từ màn tạo vai trò sang để thêm user đúng chỗ.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                        {editingUser ? 'Đang cập nhật' : 'Tạo mới'}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-12">
                    <div className="lg:col-span-4">
                      <label className={labelClass}>Họ và tên</label>
                      <input
                        value={formData.name}
                        onChange={(event) => handleFormFieldChange('name', event.target.value)}
                        className={inputClass}
                        placeholder="Nguyễn Văn A"
                      />
                    </div>

                    <div className="lg:col-span-4">
                      <label className={labelClass}>Username</label>
                      <input
                        value={formData.username}
                        onChange={(event) => handleFormFieldChange('username', event.target.value)}
                        className={inputClass}
                        placeholder="username"
                      />
                    </div>

                    <div className="lg:col-span-4">
                      <label className={labelClass}>Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(event) => handleFormFieldChange('email', event.target.value)}
                        className={inputClass}
                        placeholder="email@educrm.com"
                      />
                    </div>

                    <div className="lg:col-span-4">
                      <label className={labelClass}>Mật khẩu</label>
                      <input
                        type="password"
                        autoComplete="new-password"
                        value={formData.password}
                        onChange={(event) => handleFormFieldChange('password', event.target.value)}
                        className={inputClass}
                        placeholder={editingUser ? 'Để trống nếu không đổi' : 'Nhập mật khẩu...'}
                      />
                    </div>

                    <div className="lg:col-span-8">
                      <label className={labelClass}>Role</label>
                      <select
                        value={formData.permissionRoleLabel}
                        onChange={(event) => handlePermissionRoleLabelChange(event.target.value)}
                        className={inputClass}
                      >
                        <option value="">Chọn vai trò</option>
                        {permissionRoles.map((role) => (
                          <option key={role.id} value={role.label}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="lg:col-span-4">
                      <label className={labelClass}>Cơ sở (Chi nhánh)</label>
                      <select
                        value={formData.branch}
                        onChange={(event) => handleFormFieldChange('branch', event.target.value)}
                        className={inputClass}
                      >
                        <option value="">Chọn cơ sở</option>
                        {branchOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="lg:col-span-4">
                      <label className={labelClass}>Team (Phòng ban)</label>
                      <select
                        value={formData.team}
                        onChange={(event) => handleFormFieldChange('team', event.target.value)}
                        className={inputClass}
                      >
                        <option value="">Chọn team</option>
                        {teamOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="lg:col-span-4">
                      <label className={labelClass}>Trạng thái</label>
                      <select
                        value={formData.accountStatus}
                        onChange={(event) => handleFormFieldChange('accountStatus', event.target.value as AdminUserFormData['accountStatus'])}
                        className={inputClass}
                      >
                        {ADMIN_USER_ACCOUNT_STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="space-y-4">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                      <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                          <Shield size={14} />
                          List-Detail RBAC
                        </div>
                        <h3 className="mt-3 text-base font-semibold tracking-tight text-slate-900">Phân quyền theo vai trò</h3>
                        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                          Chọn vai trò đã tạo ở màn Phân quyền (RBAC), rồi kiểm tra hoặc tinh chỉnh các quyền chi tiết khi cần.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                          {permissionSummary.activePermissionCount} quyền bật
                        </span>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                          {permissionSummary.activeGroupCount} nhóm có quyền
                        </span>
                      </div>
                    </div>

                    {permissionSummary.scopeBreakdown.length ? (
                      <div className="flex flex-wrap gap-2">
                        {permissionSummary.scopeBreakdown.slice(0, 4).map((item) => (
                          <span
                            key={`permission-scope-${item.scope}`}
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getScopeOption(item.scope).badgeClass}`}
                          >
                            {getScopeOption(item.scope).label}: {item.count}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                        <div>
                          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                            <Sparkles size={14} />
                            {activePermissionGroup.label}
                          </div>
                          <h4 className="mt-3 text-base font-semibold tracking-tight text-slate-900">Quyền bổ sung</h4>
                          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">{activePermissionGroup.description}</p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                            {activePermissionGroupSummary.activePermissionCount} quyền trong nhóm
                          </span>
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                            {activePermissionGroupSummary.activeSectionCount} phân hệ bật
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {PERMISSION_GROUPS.map((group) => {
                          const groupSummary = buildRolePermissionSummary({
                            [group.id]: permissionDraft[group.id] || {},
                          });
                          const isActive = activePermissionGroupId === group.id;

                          return (
                            <button
                              key={group.id}
                              type="button"
                              onClick={() => setActivePermissionGroupId(group.id)}
                              className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                                isActive
                                  ? 'border-slate-900 bg-slate-900 text-white'
                                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              {group.label} · {groupSummary.activePermissionCount}
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {SCOPE_OPTIONS.filter((option) => option.id !== 'personal').map((option) => (
                          <button
                            key={`bulk-user-role-${option.id}`}
                            type="button"
                            onClick={() => handleApplyScopeToGroup(activePermissionGroup.id, option.id)}
                            className={`rounded-full px-2.5 py-1.5 text-xs font-semibold transition ${option.badgeClass}`}
                          >
                            Áp dụng {option.label}
                          </button>
                        ))}
                      </div>

                      <div className="mt-4 max-h-[42vh] space-y-3 overflow-y-auto pr-1">
                        {activePermissionGroup.sections.map((section) => (
                          <div
                            key={`${activePermissionGroup.id}-${section.id}`}
                            className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                          >
                            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                              <div>
                                <h4 className="text-sm font-semibold text-slate-900">{section.title}</h4>
                                <p className="mt-0.5 text-xs text-slate-500">{section.permissions.length} quyền chi tiết</p>
                              </div>
                              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                                {
                                  section.permissions.filter(
                                    (permission) =>
                                      getPermissionScopeValue(
                                        activePermissionGroup.id,
                                        getPermissionKey(section.id, permission.id),
                                      ) !== 'none',
                                  ).length
                                }
                                /{section.permissions.length} bật
                              </span>
                            </div>

                            <div className="hidden gap-3 bg-slate-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 md:grid md:grid-cols-[minmax(0,1fr)_220px]">
                              <div>Quyền</div>
                              <div>Cấp độ quyền</div>
                            </div>

                            {section.permissions.map((permission, index) => {
                              const permissionKey = getPermissionKey(section.id, permission.id);
                              const scope = getPermissionScopeValue(activePermissionGroup.id, permissionKey);
                              const enabled = scope !== 'none';

                              return (
                                <div
                                  key={`${activePermissionGroup.id}-${permissionKey}`}
                                  className={`grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_220px] md:items-center ${
                                    index > 0 ? 'border-t border-slate-100' : ''
                                  }`}
                                >
                                  <label className="flex items-start gap-3">
                                    <input
                                      type="checkbox"
                                      checked={enabled}
                                      onChange={(event) =>
                                        handleTogglePermission(activePermissionGroup.id, permissionKey, event.target.checked)
                                      }
                                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                                    />
                                    <div className="min-w-0">
                                      <div className="font-medium text-slate-900">{permission.label}</div>
                                      <div className="mt-0.5 text-xs text-slate-500">
                                        Bỏ chọn để trả quyền về mức <strong>Không</strong>.
                                      </div>
                                    </div>
                                  </label>

                                  <div className="md:max-w-[220px]">
                                    <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 md:hidden">
                                      Cấp độ quyền
                                    </div>
                                    <PermissionScopeSelect
                                      value={scope}
                                      disabled={!enabled}
                                      onChange={(nextScope) => setPermissionScopeValue(activePermissionGroup.id, permissionKey, nextScope)}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

                {formError ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{formError}</div>
                ) : null}
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                  <Save size={16} />
                  {editingUser ? 'Lưu cập nhật' : 'Tạo người dùng'}
                </button>
              </div>
            </form>

          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            onClick={closeDeleteModal}
            aria-label="Đóng xác nhận xóa"
          />
          <div className="relative z-10 w-full max-w-xl rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Xóa người dùng</h2>
                <p className="mt-1 text-sm text-slate-500">Lead đang được user này giữ sẽ cần chuyển cho người khác trước khi xóa.</p>
              </div>
              <button
                type="button"
                onClick={closeDeleteModal}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50"
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 px-6 py-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-100 text-sm font-bold text-rose-700">
                    {deleteTarget.avatar || deleteTarget.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="space-y-1">
                    <div className="font-semibold text-slate-900">{deleteTarget.name}</div>
                    <div className="text-sm text-slate-500">
                      {deleteTarget.email} • {deleteTarget.title || 'Chưa có chức danh'}
                    </div>
                    <div className="text-sm text-slate-500">
                      Chi nhánh {deleteTarget.branch || '-'} • Team {deleteTarget.team || '-'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Lead đang giữ</p>
                  <p className="mt-1 text-2xl font-bold text-amber-900">{deleteTargetLeadCount}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nhân sự đang báo cáo</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {users.filter((item) => item.managerId === deleteTarget.id).length}
                  </p>
                </div>
              </div>

              {deleteTargetLeadCount > 0 ? (
                <div>
                  <label className={labelClass}>Chuyển {deleteTargetLeadCount} lead sang</label>
                  <select
                    value={reassignUserId}
                    onChange={(event) => {
                      setReassignUserId(event.target.value);
                      setDeleteError('');
                    }}
                    className={inputClass}
                  >
                    <option value="">Chọn người nhận lead</option>
                    {replacementUserOptions.map((item) => (
                      <option key={`replacement-${item.id}`} value={item.id}>
                        {item.name} • {item.branch || '-'} • {item.team || '-'}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-sm text-slate-500">
                    Các nhân sự đang báo cáo cho user này cũng sẽ được cập nhật người quản lý theo lựa chọn trên nếu phù hợp.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  User này hiện không giữ lead nào. Có thể xóa trực tiếp.
                </div>
              )}

              {deleteError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{deleteError}</div>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteTargetLeadCount > 0 && !replacementUserOptions.length}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <Trash2 size={16} />
                Xóa người dùng
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AdminUserManagement;
