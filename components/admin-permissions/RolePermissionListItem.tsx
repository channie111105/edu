import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { type PermissionRoleRecord, type RolePermissionSummary } from '../../utils/adminPermissions';

interface RolePermissionListItemProps {
  role: PermissionRoleRecord;
  summary: RolePermissionSummary;
  onOpen: () => void;
}

const ROLE_TONE_STYLES = {
  slate: 'border-slate-200 bg-slate-100 text-slate-700',
  indigo: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  sky: 'border-sky-200 bg-sky-50 text-sky-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-700',
  rose: 'border-rose-200 bg-rose-50 text-rose-700',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  cyan: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  violet: 'border-violet-200 bg-violet-50 text-violet-700',
} as const;

const permissionChipClass =
  'inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600';

const RolePermissionListItem: React.FC<RolePermissionListItemProps> = ({ role, summary, onOpen }) => {
  const visibleHighlights = summary.highlights.slice(0, 3);
  const hiddenCount = Math.max(summary.activeSectionCount - visibleHighlights.length, 0);

  return (
    <article className="grid gap-4 px-6 py-5 lg:grid-cols-[260px_minmax(0,1fr)_120px] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${ROLE_TONE_STYLES[role.tone]}`}>
            {role.label}
          </span>
          {!role.isSystem ? (
            <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-500">
              Tùy chỉnh
            </span>
          ) : null}
        </div>
        <div className="mt-2 text-sm text-slate-500">@{role.username}</div>
      </div>

      <div className="min-w-0">
        {visibleHighlights.length ? (
          <div className="flex flex-wrap gap-2">
            {visibleHighlights.map((highlight) => (
              <span key={`${role.id}-${highlight.id}`} className={permissionChipClass} title={`${highlight.groupLabel} - ${highlight.label}`}>
                {highlight.groupLabel}:{highlight.label}
              </span>
            ))}
            {hiddenCount > 0 ? <span className={permissionChipClass}>+{hiddenCount} more</span> : null}
          </div>
        ) : (
          <div className="text-sm text-slate-400">Chưa có quyền bật</div>
        )}
      </div>

      <div className="flex items-center justify-start lg:justify-end">
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 transition hover:text-indigo-700"
        >
          Chi tiết
          <ArrowUpRight size={16} />
        </button>
      </div>
    </article>
  );
};

export default RolePermissionListItem;
