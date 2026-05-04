import {
  ADMIN_USER_ACCOUNT_STATUS_OPTIONS,
  type AdminUserAccountStatus,
  getAdminUsers,
} from './adminUsers';
import { decodeMojibakeText } from './mojibake';
import { UserRole } from '../types';

export type PermissionScope = 'none' | 'personal' | 'team' | 'branch' | 'global';
export type PermissionGroupId =
  | 'marketing'
  | 'sales'
  | 'enrollment'
  | 'training'
  | 'studyAbroad'
  | 'finance'
  | 'library'
  | 'admin';
export type SystemRoleId =
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
export type PermissionRoleTone = 'slate' | 'indigo' | 'sky' | 'amber' | 'rose' | 'emerald' | 'cyan' | 'violet';

export interface PermissionAction {
  id: string;
  label: string;
}

export interface PermissionSection {
  id: string;
  title: string;
  permissions: PermissionAction[];
}

export interface PermissionGroup {
  id: PermissionGroupId;
  label: string;
  description: string;
  sections: PermissionSection[];
}

export interface PermissionRoleRecord {
  id: string;
  label: string;
  username: string;
  email: string;
  status: AdminUserAccountStatus;
  description: string;
  tone: PermissionRoleTone;
  isSystem: boolean;
}

export type GroupPermissionState = Partial<Record<PermissionGroupId, Record<string, PermissionScope>>>;
export type PermissionState = Record<string, GroupPermissionState>;

export interface PermissionSettingsSnapshot {
  roles: PermissionRoleRecord[];
  permissions: PermissionState;
}

export interface PermissionScopeOption {
  id: PermissionScope;
  label: string;
  badgeClass: string;
  selectClass: string;
}

export interface RolePermissionHighlight {
  id: string;
  label: string;
  scope: PermissionScope;
  groupLabel: string;
}

export interface RolePermissionSummary {
  activePermissionCount: number;
  activeSectionCount: number;
  activeGroupCount: number;
  highlights: RolePermissionHighlight[];
  scopeBreakdown: Array<{ scope: PermissionScope; count: number }>;
}

const STORAGE_KEY = 'educrm_admin_permissions_v2';
export const ADMIN_PERMISSIONS_EVENT = 'educrm:admin-permissions-changed';

export const SCOPE_OPTIONS: PermissionScopeOption[] = [
  {
    id: 'none',
    label: 'Không',
    badgeClass: 'border border-slate-200 bg-slate-100 text-slate-600',
    selectClass: 'border-slate-200 bg-white text-slate-600',
  },
  {
    id: 'personal',
    label: 'Cá nhân',
    badgeClass: 'border border-amber-200 bg-amber-50 text-amber-700',
    selectClass: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  {
    id: 'team',
    label: 'Đội nhóm',
    badgeClass: 'border border-lime-200 bg-lime-50 text-lime-700',
    selectClass: 'border-lime-200 bg-lime-50 text-lime-700',
  },
  {
    id: 'branch',
    label: 'Cơ sở',
    badgeClass: 'border border-sky-200 bg-sky-50 text-sky-700',
    selectClass: 'border-sky-200 bg-sky-50 text-sky-700',
  },
  {
    id: 'global',
    label: 'Tổng',
    badgeClass: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
    selectClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
];

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: 'marketing',
    label: 'MKT',
    description: 'Quyền cho chiến dịch, cộng tác viên và danh sách SLA.',
    sections: [
      {
        id: 'campaign',
        title: 'Chiến dịch',
        permissions: [
          { id: 'search', label: 'Xem/lọc/search' },
          { id: 'create', label: 'Tạo chiến dịch, QR' },
          { id: 'edit', label: 'Sửa' },
          { id: 'delete', label: 'Xóa' },
          { id: 'import', label: 'Thêm/import lead' },
          { id: 'export', label: 'Xuất data' },
        ],
      },
      {
        id: 'collaborator',
        title: 'Cộng tác viên',
        permissions: [
          { id: 'search', label: 'Xem/lọc/search' },
          { id: 'status', label: 'Sửa/Cập nhật trạng thái' },
          { id: 'delete', label: 'Xóa' },
          { id: 'create', label: 'Thêm' },
          { id: 'export', label: 'Xuất excel' },
        ],
      },
      {
        id: 'sla',
        title: 'DS SLA',
        permissions: [
          { id: 'search', label: 'Xem/lọc/search' },
          { id: 'claim', label: 'Nhận' },
          { id: 'process', label: 'Xử lý' },
          { id: 'reassign', label: 'Phân bổ lại' },
          { id: 'settings', label: 'Cài đặt SLA' },
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
          { id: 'view', label: 'Xem' },
          { id: 'filter', label: 'Lọc' },
        ],
      },
      {
        id: 'myLeads',
        title: 'My leads',
        permissions: [
          { id: 'create', label: 'Tạo' },
          { id: 'view', label: 'Xem/lọc/tìm kiếm' },
          { id: 'edit', label: 'Sửa' },
          { id: 'delete', label: 'Xóa' },
          { id: 'pick', label: 'Tiếp nhận' },
          { id: 'process', label: 'Xử lý data' },
        ],
      },
      {
        id: 'myContacts',
        title: 'My contact',
        permissions: [
          { id: 'create', label: 'Tạo' },
          { id: 'view', label: 'Xem, tìm kiếm, lọc' },
          { id: 'edit', label: 'Sửa' },
          { id: 'delete', label: 'Xóa' },
        ],
      },
      {
        id: 'pipeline',
        title: 'Pipeline',
        permissions: [
          { id: 'view', label: 'Xem/lọc/tìm kiếm' },
          { id: 'process', label: 'Xử lý data' },
          { id: 'assign', label: 'Phân bổ' },
          { id: 'delete', label: 'Xóa' },
        ],
      },
      {
        id: 'kpis',
        title: 'KPIs',
        permissions: [
          { id: 'view', label: 'Xem/lọc' },
          { id: 'create', label: 'Tạo' },
          { id: 'edit', label: 'Sửa' },
          { id: 'export', label: 'Xuất báo cáo' },
        ],
      },
      {
        id: 'meeting',
        title: 'Lịch hẹn',
        permissions: [
          { id: 'create', label: 'Tạo' },
          { id: 'confirm', label: 'Confirm/cancel' },
          { id: 'submit', label: 'Submit' },
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
          { id: 'view', label: 'Xem' },
          { id: 'filter', label: 'Lọc' },
        ],
      },
      {
        id: 'quotation',
        title: 'Báo giá',
        permissions: [
          { id: 'draft', label: 'Tạo/sửa (chỉ sửa khi ở draft)' },
          { id: 'view', label: 'Xem' },
          { id: 'search', label: 'Tìm kiếm' },
          { id: 'stop', label: 'Dừng' },
          { id: 'debt', label: 'Kích hoạt công nợ (lần thu)' },
          { id: 'delete', label: 'Xóa' },
        ],
      },
      {
        id: 'contract',
        title: 'Hợp đồng',
        permissions: [
          { id: 'attach', label: 'Tải chứng từ' },
          { id: 'view', label: 'Xem/lọc/tìm kiếm' },
          { id: 'print', label: 'In' },
          { id: 'edit', label: 'Sửa' },
        ],
      },
      {
        id: 'student',
        title: 'Học viên',
        permissions: [
          { id: 'view', label: 'Xem/tìm kiếm/lọc' },
          { id: 'claim', label: 'Tạo claim/Hủy' },
          { id: 'edit', label: 'Sửa thông tin học viên' },
          { id: 'processClaim', label: 'Xử lý claim' },
          { id: 'enroll', label: 'Ghi danh' },
          { id: 'transfer', label: 'Chuyển lớp' },
          { id: 'approve', label: 'Duyệt ghi danh' },
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
          { id: 'view', label: 'Xem' },
          { id: 'filter', label: 'Lọc' },
          { id: 'createClass', label: 'Tạo lớp' },
        ],
      },
      {
        id: 'class',
        title: 'Quản lý lớp',
        permissions: [
          { id: 'view', label: 'Xem' },
          { id: 'addStudent', label: 'Thêm học viên' },
          { id: 'export', label: 'Xuất excel' },
          { id: 'attendance', label: 'Điểm danh' },
          { id: 'note', label: 'Note ghi chú' },
          { id: 'score', label: 'Cập nhật điểm' },
          { id: 'log', label: 'Log note' },
          { id: 'status', label: 'Đổi trạng thái' },
        ],
      },
      {
        id: 'teacher',
        title: 'Giáo viên',
        permissions: [
          { id: 'view', label: 'Xem/lọc/tìm kiếm' },
          { id: 'create', label: 'Tạo' },
          { id: 'edit', label: 'Sửa/đổi trạng thái/attach' },
          { id: 'assign', label: 'Gán lớp' },
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
          { id: 'view', label: 'Xem' },
          { id: 'filter', label: 'Lọc' },
        ],
      },
      {
        id: 'caseList',
        title: 'Danh sách hồ sơ',
        permissions: [
          { id: 'view', label: 'Xem/lọc/tìm kiếm' },
          { id: 'create', label: 'Tạo' },
          { id: 'edit', label: 'Sửa' },
        ],
      },
      {
        id: 'progress',
        title: 'Tiến độ',
        permissions: [
          { id: 'view', label: 'Xem/lọc/tìm kiếm' },
          { id: 'action', label: 'Thao tác' },
        ],
      },
      {
        id: 'interview',
        title: 'Lịch phỏng vấn',
        permissions: [
          { id: 'view', label: 'Xem/lọc/tìm kiếm' },
          { id: 'create', label: 'Tạo' },
          { id: 'edit', label: 'Sửa' },
          { id: 'delete', label: 'Xóa' },
        ],
      },
      {
        id: 'partner',
        title: 'Đối tác trường',
        permissions: [
          { id: 'view', label: 'Xem/lọc/tìm kiếm' },
          { id: 'create', label: 'Tạo' },
          { id: 'edit', label: 'Sửa' },
          { id: 'delete', label: 'Xóa' },
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
          { id: 'view', label: 'Xem' },
          { id: 'filter', label: 'Lọc' },
        ],
      },
      {
        id: 'approval',
        title: 'Duyệt giao dịch',
        permissions: [
          { id: 'view', label: 'Xem/lọc/tìm kiếm' },
          { id: 'create', label: 'Tạo' },
          { id: 'submit', label: 'Trình duyệt' },
          { id: 'accountantConfirm', label: 'Kế toán xác nhận' },
          { id: 'ceoConfirm', label: 'CEO duyệt' },
          { id: 'edit', label: 'Sửa' },
        ],
      },
      {
        id: 'cashflow',
        title: 'Thu chi',
        permissions: [
          { id: 'view', label: 'Xem/lọc/tìm kiếm' },
          { id: 'confirm', label: 'Xác nhận thu chi' },
          { id: 'attach', label: 'Attach chứng từ' },
        ],
      },
      {
        id: 'debt',
        title: 'Công nợ',
        permissions: [{ id: 'view', label: 'Xem/lọc/tìm kiếm' }],
      },
      {
        id: 'receipt',
        title: 'Phiếu thu chi',
        permissions: [
          { id: 'edit', label: 'Sửa' },
          { id: 'print', label: 'In' },
        ],
      },
      {
        id: 'refund',
        title: 'Hoàn tiền',
        permissions: [
          { id: 'view', label: 'Xem/lọc/tìm kiếm' },
          { id: 'create', label: 'Tạo' },
          { id: 'submit', label: 'Trình duyệt' },
          { id: 'accountantConfirm', label: 'Kế toán xác nhận' },
          { id: 'ceoConfirm', label: 'CEO duyệt' },
          { id: 'edit', label: 'Sửa' },
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
          { id: 'view', label: 'Xem' },
          { id: 'filter', label: 'Lọc' },
          { id: 'create', label: 'Tạo' },
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
          { id: 'view', label: 'Hệ thống' },
          { id: 'personalConfig', label: 'Cấu hình (sửa giá, tạo thủ công...)' },
          { id: 'createUser', label: 'Tạo user' },
          { id: 'createRole', label: 'Tạo role + tick quyền' },
          { id: 'toggleUser', label: 'Tick trạng thái users' },
          { id: 'delete', label: 'Xóa' },
          { id: 'edit', label: 'Sửa' },
        ],
      },
    ],
  },
];

const SYSTEM_ROLE_DEFINITIONS: Array<{
  id: SystemRoleId;
  label: string;
  description: string;
  tone: PermissionRoleTone;
  matches: UserRole[];
}> = [
  {
    id: 'superAdmin',
    label: 'Super Admin',
    description: 'Toàn quyền hệ thống, workflow và override cấu hình gốc.',
    tone: 'slate',
    matches: [UserRole.ADMIN, UserRole.FOUNDER],
  },
  {
    id: 'ceo',
    label: 'CEO',
    description: 'Theo dõi và phê duyệt liên phòng ban ở cấp điều hành.',
    tone: 'indigo',
    matches: [UserRole.FOUNDER],
  },
  {
    id: 'branchDirector',
    label: 'Giám đốc cơ sở',
    description: 'Quản trị theo cơ sở, ưu tiên sale, ghi danh và vận hành.',
    tone: 'sky',
    matches: [UserRole.ADMIN],
  },
  {
    id: 'salesLeader',
    label: 'Sale Leader',
    description: 'Quản lý đội sale, pipeline và hiệu suất đội nhóm.',
    tone: 'amber',
    matches: [UserRole.SALES_LEADER],
  },
  {
    id: 'sales',
    label: 'Sale',
    description: 'Thực thi khai thác lead, chăm sóc contact và xử lý pipeline cá nhân.',
    tone: 'emerald',
    matches: [UserRole.SALES_REP],
  },
  {
    id: 'marketingLeader',
    label: 'Trưởng phòng MKT',
    description: 'Chịu trách nhiệm vận hành chiến dịch, cộng tác viên và SLA.',
    tone: 'rose',
    matches: [UserRole.MARKETING],
  },
  {
    id: 'marketing',
    label: 'MKT',
    description: 'Vận hành lead đầu vào và phối hợp campaign theo cá nhân.',
    tone: 'violet',
    matches: [UserRole.MARKETING],
  },
  {
    id: 'customerCare',
    label: 'Chăm sóc khách hàng',
    description: 'Theo dõi trải nghiệm lead, hỗ trợ sale và ghi danh.',
    tone: 'cyan',
    matches: [],
  },
  {
    id: 'trainingManager',
    label: 'Quản lý đào tạo',
    description: 'Điều phối lớp, lịch học và giáo viên theo cơ sở.',
    tone: 'sky',
    matches: [UserRole.TRAINING],
  },
  {
    id: 'teacher',
    label: 'Giáo viên',
    description: 'Tác nghiệp giảng dạy, điểm danh và cập nhật tiến độ học tập.',
    tone: 'emerald',
    matches: [UserRole.TEACHER],
  },
  {
    id: 'accountant',
    label: 'Kế toán',
    description: 'Quản lý giao dịch, thu chi, công nợ và hoàn tiền.',
    tone: 'amber',
    matches: [UserRole.ACCOUNTANT],
  },
  {
    id: 'studyAbroadManager',
    label: 'Quản lý hồ sơ du học',
    description: 'Quản lý hồ sơ, tiến độ và lịch phỏng vấn du học.',
    tone: 'indigo',
    matches: [UserRole.STUDY_ABROAD],
  },
];

const SCOPE_WEIGHT: Record<PermissionScope, number> = {
  none: 0,
  personal: 1,
  team: 2,
  branch: 3,
  global: 4,
};

const normalizeText = (value: unknown) =>
  decodeMojibakeText(String(value || ''))
    .replace(/\s+/g, ' ')
    .trim();

const normalizeToken = (value: unknown) =>
  normalizeText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const isPermissionScope = (value: unknown): value is PermissionScope =>
  value === 'none' || value === 'personal' || value === 'team' || value === 'branch' || value === 'global';

const isPermissionGroupId = (value: unknown): value is PermissionGroupId =>
  value === 'marketing' ||
  value === 'sales' ||
  value === 'enrollment' ||
  value === 'training' ||
  value === 'studyAbroad' ||
  value === 'finance' ||
  value === 'library' ||
  value === 'admin';

export const getPermissionKey = (sectionId: string, permissionId: string) => `${sectionId}.${permissionId}`;

export const getScopeOption = (scope: PermissionScope) =>
  SCOPE_OPTIONS.find((option) => option.id === scope) || SCOPE_OPTIONS[0];

export const getScopeWeight = (scope: PermissionScope) => SCOPE_WEIGHT[scope];

export const getRoleStatusLabel = (status: AdminUserAccountStatus) =>
  ADMIN_USER_ACCOUNT_STATUS_OPTIONS.find((item) => item.value === status)?.label || 'Hoạt động';

export const buildRoleIdCandidate = (username: string, label: string) =>
  normalizeToken(username) || normalizeToken(label) || 'custom-role';

export const ensureUniqueRoleId = (candidate: string, existingRoleIds: string[], currentRoleId?: string) => {
  const normalizedCandidate = normalizeToken(candidate) || 'custom-role';
  const occupied = new Set(existingRoleIds.filter((roleId) => roleId !== currentRoleId));

  if (!occupied.has(normalizedCandidate)) return normalizedCandidate;

  let suffix = 2;
  while (occupied.has(`${normalizedCandidate}-${suffix}`)) {
    suffix += 1;
  }
  return `${normalizedCandidate}-${suffix}`;
};

export const getDefaultScope = (groupId: PermissionGroupId, roleId: string): PermissionScope => {
  if (roleId === 'superAdmin' || roleId === 'ceo') return 'global';

  if (groupId === 'admin') {
    return roleId === 'branchDirector' ? 'branch' : 'none';
  }

  switch (roleId) {
    case 'branchDirector':
      return 'branch';
    case 'salesLeader':
      return ['sales', 'enrollment', 'library'].includes(groupId) ? 'team' : 'none';
    case 'sales':
      return ['sales', 'enrollment', 'library'].includes(groupId) ? 'personal' : 'none';
    case 'marketingLeader':
      return ['marketing', 'library'].includes(groupId) ? 'team' : 'none';
    case 'marketing':
      return groupId === 'marketing' ? 'personal' : groupId === 'library' ? 'team' : 'none';
    case 'customerCare':
      return ['marketing', 'sales', 'enrollment'].includes(groupId) ? 'personal' : 'none';
    case 'trainingManager':
      return ['training', 'enrollment', 'library'].includes(groupId) ? 'branch' : 'none';
    case 'teacher':
      return ['training', 'library'].includes(groupId) ? 'team' : 'none';
    case 'accountant':
      return ['finance', 'enrollment', 'library'].includes(groupId) ? 'branch' : 'none';
    case 'studyAbroadManager':
      return ['studyAbroad', 'library'].includes(groupId) ? 'branch' : 'none';
    default:
      return 'none';
  }
};

const buildBasePermissionsForRole = (roleId: string, isSystem: boolean): GroupPermissionState => {
  const next: GroupPermissionState = {};

  PERMISSION_GROUPS.forEach((group) => {
    const groupState: Record<string, PermissionScope> = {};

    group.sections.forEach((section) => {
      section.permissions.forEach((permission) => {
        groupState[getPermissionKey(section.id, permission.id)] = isSystem ? getDefaultScope(group.id, roleId) : 'none';
      });
    });

    next[group.id] = groupState;
  });

  return next;
};

const getRepresentativeUser = (matches: UserRole[]) => {
  const users = getAdminUsers();

  if (!matches.length) return null;

  return (
    users.find((user) => user.roles.some((role) => matches.includes(role))) ||
    users.find((user) => matches.includes(user.role)) ||
    null
  );
};

const buildSystemRoleRecord = (
  definition: (typeof SYSTEM_ROLE_DEFINITIONS)[number],
  overrides?: Partial<PermissionRoleRecord>,
): PermissionRoleRecord => {
  const representativeUser = getRepresentativeUser(definition.matches);

  return {
    id: definition.id,
    label: normalizeText(overrides?.label) || definition.label,
    username:
      normalizeText(overrides?.username) ||
      representativeUser?.username ||
      definition.id,
    email:
      normalizeText(overrides?.email) ||
      representativeUser?.email ||
      `${definition.id}@educrm.local`,
    status: overrides?.status || representativeUser?.accountStatus || 'active',
    description: normalizeText(overrides?.description) || definition.description,
    tone: overrides?.tone || definition.tone,
    isSystem: true,
  };
};

const buildDefaultRoleCatalog = (): PermissionRoleRecord[] =>
  SYSTEM_ROLE_DEFINITIONS.map((definition) => buildSystemRoleRecord(definition));

const normalizeCustomRole = (input: Partial<PermissionRoleRecord>): PermissionRoleRecord | null => {
  const id = normalizeToken(input.id || input.username || input.label);
  const label = normalizeText(input.label);
  const username = normalizeText(input.username);

  if (!id || !label || !username) return null;

  return {
    id,
    label,
    username,
    email: normalizeText(input.email) || `${id}@educrm.local`,
    status: input.status === 'locked' ? 'locked' : 'active',
    description: normalizeText(input.description) || 'Vai trò tùy chỉnh dùng cho cấu hình RBAC mới.',
    tone:
      input.tone === 'slate' ||
      input.tone === 'indigo' ||
      input.tone === 'sky' ||
      input.tone === 'amber' ||
      input.tone === 'rose' ||
      input.tone === 'emerald' ||
      input.tone === 'cyan' ||
      input.tone === 'violet'
        ? input.tone
        : 'violet',
    isSystem: false,
  };
};

const readStoredSnapshot = (): unknown => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const buildInitialPermissionSettings = (): PermissionSettingsSnapshot => {
  const roles = buildDefaultRoleCatalog();
  const permissions = roles.reduce<PermissionState>((accumulator, role) => {
    accumulator[role.id] = buildBasePermissionsForRole(role.id, role.isSystem);
    return accumulator;
  }, {});

  return { roles, permissions };
};

export const normalizePermissionSettings = (input: unknown): PermissionSettingsSnapshot => {
  const initial = buildInitialPermissionSettings();

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return initial;
  }

  const source = input as Partial<PermissionSettingsSnapshot>;
  const sourceRoles = Array.isArray(source.roles) ? source.roles : [];
  const sourcePermissions =
    source.permissions && typeof source.permissions === 'object' && !Array.isArray(source.permissions)
      ? (source.permissions as Record<string, unknown>)
      : {};

  const systemRoles = SYSTEM_ROLE_DEFINITIONS.map((definition) => {
    const storedRole = sourceRoles.find((role) => normalizeToken(role?.id) === definition.id);
    return buildSystemRoleRecord(definition, storedRole || undefined);
  });

  const customRoles = sourceRoles
    .map((role) => normalizeCustomRole((role || {}) as Partial<PermissionRoleRecord>))
    .filter((role): role is PermissionRoleRecord => Boolean(role && !SYSTEM_ROLE_DEFINITIONS.some((item) => item.id === role.id)));

  const roles = [...systemRoles, ...customRoles];
  const permissions = roles.reduce<PermissionState>((accumulator, role) => {
    const baseRolePermissions = buildBasePermissionsForRole(role.id, role.isSystem);
    const rawRolePermissions = sourcePermissions[role.id];

    if (rawRolePermissions && typeof rawRolePermissions === 'object' && !Array.isArray(rawRolePermissions)) {
      Object.entries(rawRolePermissions as Record<string, unknown>).forEach(([groupId, groupValue]) => {
        if (!isPermissionGroupId(groupId) || !groupValue || typeof groupValue !== 'object' || Array.isArray(groupValue)) {
          return;
        }

        Object.entries(groupValue as Record<string, unknown>).forEach(([permissionKey, permissionScope]) => {
          if (isPermissionScope(permissionScope) && baseRolePermissions[groupId]?.[permissionKey] !== undefined) {
            baseRolePermissions[groupId]![permissionKey] = permissionScope;
          }
        });
      });
    }

    accumulator[role.id] = baseRolePermissions;
    return accumulator;
  }, {});

  return { roles, permissions };
};

export const loadAdminPermissionSettings = (): PermissionSettingsSnapshot => normalizePermissionSettings(readStoredSnapshot());

export const saveAdminPermissionSettings = (snapshot: PermissionSettingsSnapshot) => {
  const normalized = normalizePermissionSettings(snapshot);

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent(ADMIN_PERMISSIONS_EVENT));
  }

  return normalized;
};

export const createEmptyPermissionRole = (): PermissionRoleRecord => ({
  id: 'draft-role',
  label: '',
  username: '',
  email: '',
  status: 'active',
  description: '',
  tone: 'violet',
  isSystem: false,
});

export const createEmptyPermissionStateForRole = (): GroupPermissionState => buildBasePermissionsForRole('custom-role', false);

export const countTotalPermissionItems = () =>
  PERMISSION_GROUPS.reduce(
    (total, group) =>
      total +
      group.sections.reduce((groupTotal, section) => groupTotal + section.permissions.length, 0),
    0,
  );

export const buildRolePermissionSummary = (rolePermissions?: GroupPermissionState): RolePermissionSummary => {
  const normalizedRolePermissions = rolePermissions || {};
  const sectionHighlights: RolePermissionHighlight[] = [];
  const scopeCounts = new Map<PermissionScope, number>();

  let activePermissionCount = 0;
  let activeSectionCount = 0;
  let activeGroupCount = 0;

  PERMISSION_GROUPS.forEach((group) => {
    let groupHasActivePermissions = false;

    group.sections.forEach((section) => {
      let sectionMaxScope: PermissionScope = 'none';
      let sectionHasActivePermissions = false;

      section.permissions.forEach((permission) => {
        const permissionKey = getPermissionKey(section.id, permission.id);
        const scope = normalizedRolePermissions[group.id]?.[permissionKey] || 'none';

        if (scope !== 'none') {
          activePermissionCount += 1;
          groupHasActivePermissions = true;
          sectionHasActivePermissions = true;
          scopeCounts.set(scope, (scopeCounts.get(scope) || 0) + 1);
        }

        if (getScopeWeight(scope) > getScopeWeight(sectionMaxScope)) {
          sectionMaxScope = scope;
        }
      });

      if (sectionHasActivePermissions) {
        activeSectionCount += 1;
        sectionHighlights.push({
          id: `${group.id}.${section.id}`,
          label: section.title,
          scope: sectionMaxScope,
          groupLabel: group.label,
        });
      }
    });

    if (groupHasActivePermissions) {
      activeGroupCount += 1;
    }
  });

  const highlights = sectionHighlights
    .sort((left, right) => {
      const scopeOrder = getScopeWeight(right.scope) - getScopeWeight(left.scope);
      if (scopeOrder !== 0) return scopeOrder;
      return left.label.localeCompare(right.label, 'vi');
    })
    .slice(0, 4);

  const scopeBreakdown = Array.from(scopeCounts.entries())
    .sort((left, right) => getScopeWeight(right[0]) - getScopeWeight(left[0]))
    .map(([scope, count]) => ({ scope, count }));

  return {
    activePermissionCount,
    activeSectionCount,
    activeGroupCount,
    highlights,
    scopeBreakdown,
  };
};
