/**
 * usePermission – Hook tiện ích để kiểm tra quyền RBAC trong components.
 *
 * Cách dùng:
 *   const { can, scope, hasGroup } = usePermission();
 *
 *   // Kiểm tra xem user có quyền 'create' trong section 'campaign' của group 'marketing' không
 *   if (can('marketing', 'campaign', 'create')) { ... }
 *
 *   // Lấy scope để hiển thị UI phù hợp (personal / team / branch / global / none)
 *   const s = scope('sales', 'myLeads', 'view');
 *
 *   // Kiểm tra xem user có ít nhất 1 quyền trong group finance không
 *   if (hasGroup('finance')) { ... }
 */

import { useAuth } from '../contexts/AuthContext';
import type { PermissionGroupId, PermissionScope } from '../utils/adminPermissions';

export interface UsePermissionReturn {
  /**
   * Trả về `true` nếu user có quyền (scope khác 'none').
   * Admin / Founder luôn trả về `true`.
   */
  can: (groupId: PermissionGroupId, sectionId: string, permissionId: string) => boolean;

  /**
   * Trả về scope thực của quyền đó.
   * Admin / Founder luôn trả về 'global'.
   */
  scope: (groupId: PermissionGroupId, sectionId: string, permissionId: string) => PermissionScope;

  /**
   * Trả về `true` nếu user có ít nhất 1 quyền trong group.
   */
  hasGroup: (groupId: PermissionGroupId) => boolean;

  /** Tắt/mở UI element dựa trên quyền (helper để dùng với disabled prop) */
  cannot: (groupId: PermissionGroupId, sectionId: string, permissionId: string) => boolean;
}

export const usePermission = (): UsePermissionReturn => {
  const { checkPermission, getPermissionScope, hasGroupAccess } = useAuth();

  return {
    can: checkPermission,
    scope: getPermissionScope,
    hasGroup: hasGroupAccess,
    cannot: (groupId, sectionId, permissionId) => !checkPermission(groupId, sectionId, permissionId),
  };
};
