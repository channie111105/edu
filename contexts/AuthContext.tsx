
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { IUser, UserRole } from '../types';
import { MOCK_USER } from '../constants';
import { getAdminUsers, type AdminUserRecord } from '../utils/adminUsers';
import {
  loadAdminPermissionSettings,
  getPermissionKey,
  PERMISSION_GROUPS,
  deriveRolesFromPermissionState,
  type GroupPermissionState,
  type PermissionGroupId,
  type PermissionScope,
} from '../utils/adminPermissions';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LoginResult {
  success: boolean;
  error?: string;
}

interface AuthContextType {
  user: IUser | null;
  adminUser: AdminUserRecord | null;
  isAuthenticated: boolean;
  permissionState: GroupPermissionState;
  /** Đăng nhập bằng username/email + password (so khớp với adminUsers) */
  loginWithCredentials: (usernameOrEmail: string, password: string) => LoginResult;
  /** Đăng nhập nhanh bằng role (dùng trong ModuleSelectionPage, dev mode) */
  login: (role: UserRole) => void;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  switchWorkspace: (role: UserRole) => void;
  /** Kiểm tra xem user có quyền cụ thể không (scope khác 'none') */
  checkPermission: (groupId: PermissionGroupId, sectionId: string, permissionId: string) => boolean;
  /** Lấy scope của một quyền cụ thể */
  getPermissionScope: (groupId: PermissionGroupId, sectionId: string, permissionId: string) => PermissionScope;
  /** Kiểm tra xem user có ít nhất một quyền trong group không */
  hasGroupAccess: (groupId: PermissionGroupId) => boolean;
  /** Legacy: check xem role có trong danh sách cho phép không */
  hasPermission: (allowedRoles: UserRole[]) => boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const EMPTY_PERMISSION_STATE: GroupPermissionState = {};

/**
 * Tạo IUser từ AdminUserRecord để dùng trong context.
 */
const toIUser = (adminUser: AdminUserRecord): IUser => ({
  id: adminUser.id,
  name: adminUser.name,
  role: adminUser.role,
  avatar: adminUser.avatar || adminUser.name?.slice(0, 2).toUpperCase() || 'U',
});

/**
 * Tìm AdminUserRecord theo username hoặc email (case-insensitive).
 */
const findAdminUser = (usernameOrEmail: string): AdminUserRecord | null => {
  const normalized = usernameOrEmail.trim().toLowerCase();
  if (!normalized) return null;

  const users = getAdminUsers();
  return (
    users.find(
      (u) =>
        u.username?.toLowerCase() === normalized ||
        u.email?.toLowerCase() === normalized
    ) || null
  );
};

/**
 * Tạo demo IUser theo role (dùng khi chọn module nhanh, không cần login thật).
 */
const getDemoUserByRole = (role: UserRole): IUser => {
  const matchedAdminUser = findAdminUserByRole(role);
  if (matchedAdminUser) {
    return toIUser(matchedAdminUser);
  }

  // Fallback to default admin if no user with that role exists
  return {
    id: 'u1',
    name: 'Trần Văn Quản Trị',
    role: role,
    avatar: 'https://picsum.photos/200',
  };
};

/**
 * Tìm AdminUserRecord phù hợp với role demo (dùng khi login nhanh qua ModuleSelection).
 * Ưu tiên user active có role đó.
 */
const findAdminUserByRole = (role: UserRole): AdminUserRecord | null => {
  try {
    const users = getAdminUsers();
    return (
      users.find((u) => u.accountStatus === 'active' && (u.role === role || u.roles?.includes(role))) ||
      users.find((u) => u.role === role || u.roles?.includes(role)) ||
      null
    );
  } catch {
    return null;
  }
};

/**
 * Tải trạng thái quyền cho một user cụ thể.
 */
const loadPermissionStateForUser = (adminUser: AdminUserRecord | null): GroupPermissionState => {
  if (!adminUser) return EMPTY_PERMISSION_STATE;
  try {
    const settings = loadAdminPermissionSettings();
    return settings.permissions[adminUser.permissionRoleId || ''] || EMPTY_PERMISSION_STATE;
  } catch {
    return EMPTY_PERMISSION_STATE;
  }
};

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children?: ReactNode }) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUserRecord | null>(null);
  const [permissionState, setPermissionState] = useState<GroupPermissionState>(EMPTY_PERMISSION_STATE);

  // ── loginWithCredentials ──────────────────────────────────────────────────
  const loginWithCredentials = useCallback((usernameOrEmail: string, password: string): LoginResult => {
    if (!usernameOrEmail.trim()) {
      return { success: false, error: 'Vui lòng nhập tên đăng nhập.' };
    }
    if (!password.trim()) {
      return { success: false, error: 'Vui lòng nhập mật khẩu.' };
    }

    const found = findAdminUser(usernameOrEmail);
    if (!found) {
      return { success: false, error: 'Tài khoản không tồn tại.' };
    }
    // Skip account lock check as requested to remove login restrictions
    /*
    if (found.accountStatus === 'locked') {
      return { success: false, error: 'Tài khoản đang bị khóa. Vui lòng liên hệ Admin.' };
    }
    */

    // Check password
    if (found.password && password !== found.password) {
      return { success: false, error: 'Mật khẩu không chính xác.' };
    }

    const loadedPermissions = loadAdminPermissionSettings().permissions[found.permissionRoleId || ''] || EMPTY_PERMISSION_STATE;
    // Auto-correct stale roles based on current RBAC permissions
    const derivedRoles = deriveRolesFromPermissionState(loadedPermissions);
    const correctedRoles = (found.roles.includes(UserRole.ADMIN) || found.roles.includes(UserRole.FOUNDER))
      ? found.roles
      : (derivedRoles.length > 0 ? derivedRoles : found.roles);
      
    const correctedUser = { ...found, roles: correctedRoles };
    setAdminUser(correctedUser);
    setUser(toIUser(correctedUser));
    setPermissionState(loadedPermissions);

    return { success: true };
  }, []);

  // ── login (nhanh qua ModuleSelectionPage) ─────────────────────────────────
  const login = useCallback((role: UserRole) => {
    const demoUser = getDemoUserByRole(role);
    const matchedAdminUser = findAdminUserByRole(role);
    const loadedPermissions = loadPermissionStateForUser(matchedAdminUser);

    setUser(demoUser);
    setAdminUser(matchedAdminUser);
    setPermissionState(loadedPermissions);
  }, []);

  // ── logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    setUser(null);
    setAdminUser(null);
    setPermissionState(EMPTY_PERMISSION_STATE);
  }, []);

  // ── switchRole ────────────────────────────────────────────────────────────
  const switchRole = useCallback((role: UserRole) => {
    const demoUser = getDemoUserByRole(role);
    const matchedAdminUser = findAdminUserByRole(role);
    const loadedPermissions = loadPermissionStateForUser(matchedAdminUser);

    setUser(demoUser);
    setAdminUser(matchedAdminUser);
    setPermissionState(loadedPermissions);
  }, []);

  // ── switchWorkspace ─────────────────────────────────────────────────────────
  const switchWorkspace = useCallback((role: UserRole) => {
    if (adminUser && user) {
      // Chỉ thay đổi role hiển thị (workspace) nhưng giữ nguyên identity và permissions
      setUser({ ...user, role });
    } else {
      login(role);
    }
  }, [adminUser, user, login]);

  // ── checkPermission ───────────────────────────────────────────────────────
  const checkPermission = useCallback(
    (groupId: PermissionGroupId, sectionId: string, permissionId: string): boolean => {
      // Đã gỡ bỏ hạn chế: Tất cả người dùng đều có toàn quyền
      return true;
    },
    [],
  );

  // ── getPermissionScope ────────────────────────────────────────────────────
  const getPermissionScope = useCallback(
    (groupId: PermissionGroupId, sectionId: string, permissionId: string): PermissionScope => {
      // Đã gỡ bỏ hạn chế: Tất cả người dùng đều có quyền hạn toàn cầu (global)
      return 'global';
    },
    [],
  );

  // ── hasGroupAccess ────────────────────────────────────────────────────────
  const hasGroupAccess = useCallback(
    (groupId: PermissionGroupId): boolean => {
      // Đã gỡ bỏ hạn chế: Tất cả người dùng đều có quyền truy cập vào tất cả các nhóm (phân hệ)
      return true;
    },
    [],
  );

  // ── hasPermission (legacy) ────────────────────────────────────────────────
  const hasPermission = useCallback(
    (allowedRoles: UserRole[]): boolean => {
      if (!user) return false;
      return allowedRoles.includes(user.role);
    },
    [user],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        adminUser,
        isAuthenticated: !!user,
        permissionState,
        loginWithCredentials,
        login,
        logout,
        switchRole,
        switchWorkspace,
        checkPermission,
        getPermissionScope,
        hasGroupAccess,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
