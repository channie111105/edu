import { UserRole } from '../types';

export type AdminUserAccountStatus = 'active' | 'locked';
export type AdminUserContractType = 'official' | 'probation' | 'collaborator' | 'intern' | 'part_time';
export type AdminUserEmploymentStatus = 'working' | 'paused' | 'resigned';

export interface AdminUserRecord {
  id: string;
  name: string;
  email: string;
  username: string;
  role: UserRole;
  roles: UserRole[];
  department: string;
  branch: string;
  team: string;
  managerId?: string;
  title: string;
  accountStatus: AdminUserAccountStatus;
  contractType: AdminUserContractType;
  employmentStatus: AdminUserEmploymentStatus;
  permissionRoleId?: string;
  permissionRoleLabel?: string;
  lastLoginAt?: string;
  startDate?: string;
  endDate?: string;
  avatar: string;
  password?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserFormData {
  name: string;
  email: string;
  username: string;
  password: string;
  roles: UserRole[];
  department: string;
  branch: string;
  team: string;
  managerId: string;
  title: string;
  accountStatus: AdminUserAccountStatus;
  contractType: AdminUserContractType;
  employmentStatus: AdminUserEmploymentStatus;
  permissionRoleId: string;
  permissionRoleLabel: string;
  lastLoginAt: string;
  startDate: string;
  endDate: string;
}

const STORAGE_KEY = 'educrm_admin_users_v4';
export const ADMIN_USERS_CHANGED_EVENT = 'educrm:admin-users-changed';

export const ADMIN_USER_ROLE_OPTIONS = Object.values(UserRole);

export const ADMIN_USER_ACCOUNT_STATUS_OPTIONS = [
  { value: 'active' as const, label: 'Hoạt động' },
  { value: 'locked' as const, label: 'Tạm khóa' },
] as const;

export const ADMIN_USER_CONTRACT_TYPE_OPTIONS = [
  { value: 'official' as const, label: 'Chính thức' },
  { value: 'probation' as const, label: 'Thử việc' },
  { value: 'collaborator' as const, label: 'CTV' },
  { value: 'intern' as const, label: 'Thực tập sinh' },
  { value: 'part_time' as const, label: 'Part time' },
] as const;

export const ADMIN_USER_EMPLOYMENT_STATUS_OPTIONS = [
  { value: 'working' as const, label: 'Đang làm' },
  { value: 'paused' as const, label: 'Tạm nghỉ' },
  { value: 'resigned' as const, label: 'Nghỉ việc' },
] as const;

export const DEFAULT_ADMIN_DEPARTMENTS = [
  'Ban Giám đốc',
  'Kinh doanh (Sales)',
  'Marketing',
  'Đào tạo (Education)',
  'Tài chính (Finance)',
  'Du học (Study Abroad)',
] as const;

export const DEFAULT_ADMIN_BRANCHES = [
  'Hà Nội',
  'HCM',
  'Đà Nẵng',
  'Vinh',
  'Hà Tĩnh',
  'Online',
] as const;

export const DEFAULT_ADMIN_TEAMS = [
  'Điều hành',
  'Team Đức',
  'Team Trung',
  'Team Marketing',
  'Team Đào tạo',
  'Team Tài chính',
  'Team Du học',
] as const;

export const DEFAULT_ADMIN_TITLES = [
  'Founder',
  'Giám đốc vận hành',
  'Trưởng nhóm Sales',
  'Nhân viên Sales',
  'Giáo viên',
  'Kế toán',
  'Chuyên viên Marketing',
  'Chuyên viên Du học',
] as const;

const INITIAL_ADMIN_USERS: AdminUserRecord[] = [
  {
    id: 'u1',
    name: 'Quản trị hệ thống',
    email: 'admin@abc',
    username: 'admin@abc',
    role: UserRole.ADMIN,
    roles: [UserRole.ADMIN],
    department: 'Ban Giám đốc',
    branch: 'Hà Nội',
    team: 'Điều hành',
    title: 'Administrator',
    accountStatus: 'active',
    contractType: 'official',
    employmentStatus: 'working',
    lastLoginAt: new Date().toISOString(),
    startDate: '2024-01-01',
    avatar: 'AD',
    password: '123456',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const canUseStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const emitUsersChanged = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ADMIN_USERS_CHANGED_EVENT));
  }
};

const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'U';

const normalizeRoleList = (roles?: Array<UserRole | string>, fallbackRole?: UserRole | string): UserRole[] => {
  const source = Array.isArray(roles) && roles.length ? roles : fallbackRole ? [fallbackRole] : [];
  const normalized = ADMIN_USER_ROLE_OPTIONS.filter((role) => source.some((item) => String(item) === role));
  return normalized.length ? normalized : [UserRole.SALES_REP];
};

const normalizeAccountStatus = (value?: string): AdminUserAccountStatus => (
  value === 'locked' ? 'locked' : 'active'
);

const normalizeContractType = (value?: string): AdminUserContractType => {
  switch (value) {
    case 'probation':
    case 'collaborator':
    case 'intern':
    case 'part_time':
      return value;
    default:
      return 'official';
  }
};

const normalizeEmploymentStatus = (value?: string): AdminUserEmploymentStatus => {
  switch (value) {
    case 'paused':
    case 'resigned':
      return value;
    default:
      return 'working';
  }
};

const normalizeAdminUser = (user: Partial<AdminUserRecord> & Pick<AdminUserRecord, 'id' | 'name'>): AdminUserRecord => {
  const nowIso = new Date().toISOString();
  const roles = normalizeRoleList(user.roles, user.role);
  return {
    id: String(user.id),
    name: String(user.name || '').trim(),
    email: String(user.email || '').trim(),
    username: String(user.username || '').trim(),
    role: roles[0],
    roles,
    department: String(user.department || '').trim(),
    branch: String(user.branch || '').trim(),
    team: String(user.team || '').trim(),
    managerId: String(user.managerId || '').trim() || undefined,
    title: String(user.title || '').trim(),
    accountStatus: normalizeAccountStatus(user.accountStatus),
    contractType: normalizeContractType(user.contractType),
    employmentStatus: normalizeEmploymentStatus(user.employmentStatus),
    permissionRoleId: String(user.permissionRoleId || '').trim() || undefined,
    permissionRoleLabel: String(user.permissionRoleLabel || '').trim() || undefined,
    lastLoginAt: String(user.lastLoginAt || '').trim() || undefined,
    startDate: String(user.startDate || '').trim() || undefined,
    endDate: String(user.endDate || '').trim() || undefined,
    avatar: String(user.avatar || '').trim() || getInitials(String(user.name || '')),
    password: user.password || '',
    createdAt: String(user.createdAt || '').trim() || nowIso,
    updatedAt: String(user.updatedAt || '').trim() || nowIso,
  };
};

export const createEmptyAdminUserForm = (): AdminUserFormData => ({
  name: '',
  email: '',
  username: '',
  password: '',
  roles: [],
  department: '',
  branch: '',
  team: '',
  managerId: '',
  title: '',
  accountStatus: 'active',
  contractType: 'official',
  employmentStatus: 'working',
  permissionRoleId: '',
  permissionRoleLabel: '',
  lastLoginAt: '',
  startDate: '',
  endDate: '',
});

export const buildAdminUserFormData = (user?: AdminUserRecord): AdminUserFormData => (
  user
    ? {
        name: user.name || '',
        email: user.email || '',
        username: user.username || '',
        password: '',
        roles: normalizeRoleList(user.roles, user.role),
        department: user.department || '',
        branch: user.branch || '',
        team: user.team || '',
        managerId: user.managerId || '',
        title: user.title || '',
        accountStatus: normalizeAccountStatus(user.accountStatus),
        contractType: normalizeContractType(user.contractType),
        employmentStatus: normalizeEmploymentStatus(user.employmentStatus),
        permissionRoleId: user.permissionRoleId || '',
        permissionRoleLabel: user.permissionRoleLabel || '',
        lastLoginAt: user.lastLoginAt || '',
        startDate: user.startDate || '',
        endDate: user.endDate || '',
      }
    : createEmptyAdminUserForm()
);

export const buildAdminUserRecord = (
  formData: AdminUserFormData,
  existingUser?: AdminUserRecord
): AdminUserRecord => {
  const nowIso = new Date().toISOString();
  return normalizeAdminUser({
    id: existingUser?.id || `usr-${Date.now()}`,
    name: formData.name,
    email: formData.email,
    username: formData.username,
    role: formData.roles[0],
    roles: formData.roles,
    department: formData.department,
    branch: formData.branch,
    team: formData.team,
    managerId: formData.managerId,
    title: formData.title,
    accountStatus: formData.accountStatus,
    contractType: formData.contractType,
    employmentStatus: formData.employmentStatus,
    permissionRoleId: formData.permissionRoleId,
    permissionRoleLabel: formData.permissionRoleLabel,
    lastLoginAt: formData.lastLoginAt,
    startDate: formData.startDate,
    endDate: formData.endDate,
    avatar: existingUser?.avatar || getInitials(formData.name),
    password: formData.password || existingUser?.password || 'password123',
    createdAt: existingUser?.createdAt || nowIso,
    updatedAt: nowIso,
  });
};

export const getAdminUsers = (): AdminUserRecord[] => {
  let users = INITIAL_ADMIN_USERS;
  if (canUseStorage()) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          users = parsed;
        }
      }
    } catch {
      // Fallback to initial
    }
  }

  const normalizedUsers = users.map(normalizeAdminUser);
  
  // Hardcode: Always ensure the root admin is present
  const hasRootAdmin = normalizedUsers.some(u => u.username === 'admin@abc');
  if (!hasRootAdmin) {
    normalizedUsers.unshift(normalizeAdminUser(INITIAL_ADMIN_USERS[0]));
  }

  return normalizedUsers;
};

export const saveAdminUsers = (users: AdminUserRecord[]) => {
  if (!canUseStorage()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users.map(normalizeAdminUser)));
  emitUsersChanged();
};
