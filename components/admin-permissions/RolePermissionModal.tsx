import React, { useEffect, useMemo, useState } from 'react';
import { Save, Shield, Sparkles, X } from 'lucide-react';
import PermissionScopeSelect from './PermissionScopeSelect';
import {
  PERMISSION_GROUPS,
  SCOPE_OPTIONS,
  buildRoleIdCandidate,
  buildRolePermissionSummary,
  ensureUniqueRoleId,
  getDefaultScope,
  getPermissionKey,
  getScopeOption,
  type GroupPermissionState,
  type PermissionGroupId,
  type PermissionRoleRecord,
  type PermissionScope,
} from '../../utils/adminPermissions';

interface RolePermissionModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  role: PermissionRoleRecord;
  permissions: GroupPermissionState;
  existingRoleIds: string[];
  onClose: () => void;
  onSave: (nextRole: PermissionRoleRecord, nextPermissions: GroupPermissionState) => void;
}

const inputClass =
  'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-100';
const labelClass = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500';

const clonePermissions = (permissions: GroupPermissionState): GroupPermissionState =>
  Object.fromEntries(
    Object.entries(permissions || {}).map(([groupId, groupValue]) => [groupId, { ...(groupValue || {}) }]),
  ) as GroupPermissionState;

const RolePermissionModal: React.FC<RolePermissionModalProps> = ({
  isOpen,
  mode,
  role,
  permissions,
  existingRoleIds,
  onClose,
  onSave,
}) => {
  const [draftRole, setDraftRole] = useState<PermissionRoleRecord>(role);
  const [draftPermissions, setDraftPermissions] = useState<GroupPermissionState>(permissions);
  const [activeGroupId, setActiveGroupId] = useState<PermissionGroupId>(PERMISSION_GROUPS[0].id);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setDraftRole(role);
    setDraftPermissions(clonePermissions(permissions));
    setActiveGroupId(PERMISSION_GROUPS[0].id);
    setErrorMessage('');
  }, [isOpen, permissions, role]);

  const activeGroup = useMemo(
    () => PERMISSION_GROUPS.find((group) => group.id === activeGroupId) || PERMISSION_GROUPS[0],
    [activeGroupId],
  );

  const summary = useMemo(() => buildRolePermissionSummary(draftPermissions), [draftPermissions]);

  const activeGroupSummary = useMemo(
    () =>
      buildRolePermissionSummary({
        [activeGroup.id]: draftPermissions[activeGroup.id] || {},
      }),
    [activeGroup.id, draftPermissions],
  );

  const getScopeValue = (groupId: PermissionGroupId, permissionKey: string): PermissionScope =>
    draftPermissions[groupId]?.[permissionKey] || 'none';

  const setScopeValue = (groupId: PermissionGroupId, permissionKey: string, nextScope: PermissionScope) => {
    setDraftPermissions((prev) => ({
      ...prev,
      [groupId]: {
        ...(prev[groupId] || {}),
        [permissionKey]: nextScope,
      },
    }));
  };

  const getSuggestedScope = (groupId: PermissionGroupId): PermissionScope => {
    const preferredScope = draftRole.isSystem ? getDefaultScope(groupId, role.id) : 'none';
    return preferredScope !== 'none' ? preferredScope : 'personal';
  };

  const handleTogglePermission = (groupId: PermissionGroupId, permissionKey: string, checked: boolean) => {
    if (!checked) {
      setScopeValue(groupId, permissionKey, 'none');
      return;
    }

    const currentScope = getScopeValue(groupId, permissionKey);
    setScopeValue(groupId, permissionKey, currentScope !== 'none' ? currentScope : getSuggestedScope(groupId));
  };

  const handleApplyScopeToGroup = (groupId: PermissionGroupId, nextScope: PermissionScope) => {
    setDraftPermissions((prev) => {
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

  const handleSubmit = () => {
    const nextLabel = draftRole.label.trim();

    if (!nextLabel) {
      setErrorMessage('Role không được để trống.');
      return;
    }

    const candidateRoleId = buildRoleIdCandidate(nextLabel, nextLabel);
    const nextRoleId = mode === 'create' ? ensureUniqueRoleId(candidateRoleId, existingRoleIds) : role.id;

    const nextRole: PermissionRoleRecord = {
      ...draftRole,
      id: nextRoleId,
      label: nextLabel,
      username: draftRole.username.trim() || nextRoleId,
      email: draftRole.email.trim() || `${candidateRoleId}@educrm.local`,
      description:
        draftRole.description.trim() ||
        (draftRole.isSystem
          ? role.description
          : 'Vai trò tùy chỉnh dùng để gom quyền theo đúng cơ cấu vận hành mới.'),
    };

    onSave(nextRole, clonePermissions(draftPermissions));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <button type="button" className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Đóng modal" />

      <div className="relative z-10 flex max-h-[calc(100vh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div className="min-w-0 space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              <Shield size={14} />
              List-Detail RBAC
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-[#122033] sm:text-2xl">
                {mode === 'create' ? 'Tạo vai trò phân quyền' : `Chi tiết vai trò ${role.label}`}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Phần nhập tài khoản user đã chuyển sang màn Quản lý người dùng, ở đây chỉ giữ thông tin role và ma trận quyền.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit();
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-4">
              <section className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      <Shield size={14} />
                      {draftRole.isSystem ? 'System role' : 'Custom role'}
                    </div>
                    <h3 className="mt-3 text-base font-semibold text-[#122033]">Thông tin vai trò</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Giữ lại phần role sau khi đã cắt khối tài khoản người dùng sang modal thêm user.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                      {summary.activePermissionCount} quyền bật
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                      {summary.activeGroupCount} nhóm có quyền
                    </span>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-12">
                  <div className="lg:col-span-12">
                    <label className={labelClass}>Role</label>
                    <input
                      value={draftRole.label}
                      onChange={(event) => setDraftRole((prev) => ({ ...prev, label: event.target.value }))}
                      className={inputClass}
                      placeholder="Tên vai trò"
                    />
                  </div>
                </div>

                {summary.scopeBreakdown.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {summary.scopeBreakdown.slice(0, 4).map((item) => (
                      <span
                        key={`scope-${item.scope}`}
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getScopeOption(item.scope).badgeClass}`}
                      >
                        {getScopeOption(item.scope).label}: {item.count}
                      </span>
                    ))}
                  </div>
                ) : null}
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                        <Sparkles size={14} />
                        {activeGroup.label}
                      </div>
                      <h3 className="mt-3 text-base font-semibold tracking-tight text-[#122033]">Quyền bổ sung</h3>
                      <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">{activeGroup.description}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                        {activeGroupSummary.activePermissionCount} quyền trong nhóm
                      </span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                        {activeGroupSummary.activeSectionCount} phân hệ bật
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {PERMISSION_GROUPS.map((group) => {
                      const groupSummary = buildRolePermissionSummary({
                        [group.id]: draftPermissions[group.id] || {},
                      });
                      const isActive = activeGroupId === group.id;

                      return (
                        <button
                          key={group.id}
                          type="button"
                          onClick={() => setActiveGroupId(group.id)}
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

                  <div className="flex flex-wrap gap-2">
                    {SCOPE_OPTIONS.filter((option) => option.id !== 'personal').map((option) => (
                      <button
                        key={`bulk-${option.id}`}
                        type="button"
                        onClick={() => handleApplyScopeToGroup(activeGroup.id, option.id)}
                        className={`rounded-full px-2.5 py-1.5 text-xs font-semibold transition ${option.badgeClass}`}
                      >
                        Áp dụng {option.label}
                      </button>
                    ))}
                  </div>

                  <div className="max-h-[46vh] space-y-3 overflow-y-auto pr-1">
                    {activeGroup.sections.map((section) => (
                      <div
                        key={`${activeGroup.id}-${section.id}`}
                        className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                      >
                        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                          <div>
                            <h4 className="text-sm font-semibold text-[#122033]">{section.title}</h4>
                            <p className="mt-0.5 text-xs text-slate-500">{section.permissions.length} quyền chi tiết</p>
                          </div>
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                            {
                              section.permissions.filter(
                                (permission) =>
                                  getScopeValue(activeGroup.id, getPermissionKey(section.id, permission.id)) !== 'none',
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
                          const scope = getScopeValue(activeGroup.id, permissionKey);
                          const enabled = scope !== 'none';

                          return (
                            <div
                              key={`${activeGroup.id}-${permissionKey}`}
                              className={`grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_220px] md:items-center ${
                                index > 0 ? 'border-t border-slate-100' : ''
                              }`}
                            >
                              <label className="flex items-start gap-3">
                                <input
                                  type="checkbox"
                                  checked={enabled}
                                  onChange={(event) =>
                                    handleTogglePermission(activeGroup.id, permissionKey, event.target.checked)
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
                                  onChange={(nextScope) => setScopeValue(activeGroup.id, permissionKey, nextScope)}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-500">
              {errorMessage ? <span className="font-medium text-rose-600">{errorMessage}</span> : 'Lưu role để cập nhật lại màn hình list-detail.'}
            </div>
            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 items-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <Save size={16} />
                {mode === 'create' ? 'Tạo vai trò' : 'Lưu vai trò'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RolePermissionModal;
