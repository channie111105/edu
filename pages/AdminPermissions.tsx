import React, { useEffect, useMemo, useState } from 'react';
import { Save, Shield } from 'lucide-react';
import RolePermissionListItem from '../components/admin-permissions/RolePermissionListItem';
import RolePermissionModal from '../components/admin-permissions/RolePermissionModal';
import { getAdminUsers, saveAdminUsers } from '../utils/adminUsers';
import {
  ADMIN_PERMISSIONS_EVENT,
  buildRolePermissionSummary,
  createEmptyPermissionRole,
  createEmptyPermissionStateForRole,
  loadAdminPermissionSettings,
  normalizePermissionSettings,
  saveAdminPermissionSettings,
  type GroupPermissionState,
  type PermissionRoleRecord,
  type PermissionSettingsSnapshot,
} from '../utils/adminPermissions';

type ModalState =
  | {
      role: PermissionRoleRecord;
      permissions: GroupPermissionState;
    }
  | null;

const AdminPermissions: React.FC = () => {
  const [settings, setSettings] = useState<PermissionSettingsSnapshot>(() => loadAdminPermissionSettings());
  const [modalState, setModalState] = useState<ModalState>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    const syncSettings = () => {
      setSettings(loadAdminPermissionSettings());
      setHasUnsavedChanges(false);
    };

    window.addEventListener(ADMIN_PERMISSIONS_EVENT, syncSettings as EventListener);
    window.addEventListener('storage', syncSettings as EventListener);

    return () => {
      window.removeEventListener(ADMIN_PERMISSIONS_EVENT, syncSettings as EventListener);
      window.removeEventListener('storage', syncSettings as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!feedbackMessage) return undefined;

    const timer = window.setTimeout(() => setFeedbackMessage(null), 2600);
    return () => window.clearTimeout(timer);
  }, [feedbackMessage]);

  const roleSummaries = useMemo(
    () =>
      Object.fromEntries(
        settings.roles.map((role) => [role.id, buildRolePermissionSummary(settings.permissions[role.id])]),
      ),
    [settings.permissions, settings.roles],
  );

  const openEditModal = (role: PermissionRoleRecord) => {
    setModalState({
      role,
      permissions: settings.permissions[role.id] || createEmptyPermissionStateForRole(),
    });
  };

  const handleModalSave = (nextRole: PermissionRoleRecord, nextPermissions: GroupPermissionState) => {
    setSettings((prev) => {
      const roleExists = prev.roles.some((role) => role.id === nextRole.id);
      return normalizePermissionSettings({
        roles: roleExists ? prev.roles.map((role) => (role.id === nextRole.id ? nextRole : role)) : [...prev.roles, nextRole],
        permissions: {
          ...prev.permissions,
          [nextRole.id]: nextPermissions,
        },
      });
    });

    setHasUnsavedChanges(true);
    setModalState(null);
    setFeedbackMessage(`Đã cập nhật nháp cho ${nextRole.label}.`);
  };

  const handleSaveAll = () => {
    const saved = saveAdminPermissionSettings(settings);
    const roleLabelById = new Map(saved.roles.map((role) => [role.id, role.label]));
    const nextUsers = getAdminUsers().map((user) =>
      user.permissionRoleId
        ? {
            ...user,
            permissionRoleLabel: roleLabelById.get(user.permissionRoleId) || user.permissionRoleLabel,
          }
        : user,
    );

    saveAdminUsers(nextUsers);
    setSettings(saved);
    setHasUnsavedChanges(false);
    setFeedbackMessage('Đã lưu cấu hình phân quyền mới.');
  };

  return (
    <div className="min-h-full bg-[#F3F4F6] text-[#122033]">
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                <Shield size={14} />
                ULA Style RBAC
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-[#122033]">Quản lý phân quyền</h1>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                  Tạo role mới đã chuyển sang modal Thêm người dùng. Màn này chỉ còn danh sách role và phần chỉnh sửa quyền.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {feedbackMessage ? (
                <div className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
                  {feedbackMessage}
                </div>
              ) : hasUnsavedChanges ? (
                <div className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700">
                  Có thay đổi chưa lưu
                </div>
              ) : null}

              <button
                type="button"
                onClick={handleSaveAll}
                disabled={!hasUnsavedChanges}
                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <Save size={16} />
                Lưu cấu hình
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-6 lg:px-8 lg:py-8">
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-bold text-[#122033]">Danh sách vai trò</h2>
            <div className="text-sm text-slate-500">
              {settings.roles.length} vai trò
            </div>
          </div>

          <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
            <div className="hidden border-b border-slate-200 bg-slate-50/80 px-6 py-4 lg:grid lg:grid-cols-[260px_minmax(0,1fr)_120px] lg:items-center">
              <div className="text-sm font-bold uppercase tracking-[0.08em] text-slate-700">Vai trò</div>
              <div className="text-sm font-bold uppercase tracking-[0.08em] text-slate-700">Quyền hạn</div>
              <div className="text-right text-sm font-bold uppercase tracking-[0.08em] text-slate-700">Hành động</div>
            </div>

            {settings.roles.map((role, index) => (
              <div key={role.id} className={index > 0 ? 'border-t border-slate-200' : ''}>
                <RolePermissionListItem
                  role={role}
                  summary={roleSummaries[role.id]}
                  onOpen={() => openEditModal(role)}
                />
              </div>
            ))}
          </div>
        </section>
      </div>

      <RolePermissionModal
        isOpen={Boolean(modalState)}
        mode="edit"
        role={modalState?.role || createEmptyPermissionRole()}
        permissions={modalState?.permissions || createEmptyPermissionStateForRole()}
        existingRoleIds={settings.roles.map((role) => role.id)}
        onClose={() => setModalState(null)}
        onSave={handleModalSave}
      />
    </div>
  );
};

export default AdminPermissions;
