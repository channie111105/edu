import React, { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { ILead } from '../types';
import { getLeadStatusLabel } from '../utils/leadStatus';
import { getLeadBatchConversionPreview } from '../utils/leadConversion';

interface LeadConvertConflictReviewModalProps {
  isOpen: boolean;
  leads: ILead[];
  onClose: () => void;
  onProceed: () => void;
  onOpenLead?: (lead: ILead) => void;
}

const getLeadCreatedAtTimestamp = (lead: ILead) => {
  const timestamp = new Date(lead.createdAt || '').getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const formatLeadCreatedAt = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('vi-VN');
};

const getLeadOwnerLabel = (lead: ILead) => lead.ownerId || 'Chưa phân';
const getLeadBranchLabel = (lead: ILead) => lead.company || lead.city || '-';

const getGroupBadgeLabel = (
  leadCount: number,
  hasLeadDuplicate: boolean,
  existingContact?: { id?: string }
) => {
  if (hasLeadDuplicate && existingContact) {
    return `${leadCount} lead trùng + Contact cũ`;
  }

  if (hasLeadDuplicate) {
    return `${leadCount} lead trùng`;
  }

  if (existingContact) {
    return 'Trùng Contact đã convert';
  }

  return 'Không trùng';
};

const LeadConvertConflictReviewModal: React.FC<LeadConvertConflictReviewModalProps> = ({
  isOpen,
  leads,
  onClose,
  onProceed,
  onOpenLead,
}) => {
  const reviewSections = useMemo(() => {
    const preview = getLeadBatchConversionPreview(leads);
    let rowNumber = 0;

    return preview.groups
      .sort((left, right) => (left.normalizedPhone || left.key).localeCompare(right.normalizedPhone || right.key))
      .map((group, groupIndex) => {
        const hasLeadDuplicate = group.leads.length > 1;
        const hasExistingContact = Boolean(group.existingContact);
        const hasConflict = hasLeadDuplicate || hasExistingContact;

        return {
          ...group,
          groupIndex,
          hasLeadDuplicate,
          hasConflict,
          rows: [...group.leads]
            .sort((left, right) => getLeadCreatedAtTimestamp(left) - getLeadCreatedAtTimestamp(right))
            .map((lead) => ({
              lead,
              stt: ++rowNumber,
            })),
        };
      });
  }, [leads]);

  const totalLeadCount = reviewSections.reduce((total, group) => total + group.leads.length, 0);
  const conflictGroupCount = reviewSections.filter((group) => group.hasConflict).length;
  const headerIsWarning = conflictGroupCount > 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative flex max-h-[85vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className={`shrink-0 border-b border-slate-200 p-5 ${headerIsWarning ? 'bg-amber-50' : 'bg-sky-50'}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className={`flex items-center gap-2 text-lg font-bold ${headerIsWarning ? 'text-amber-900' : 'text-sky-900'}`}>
                <AlertTriangle size={20} className={headerIsWarning ? 'text-amber-600' : 'text-sky-600'} />
                Rà soát lead trước khi chuyển đổi
              </h3>
              <p className={`mt-1 text-sm ${headerIsWarning ? 'text-amber-800/80' : 'text-sky-800/80'}`}>
                Hệ thống gom lead theo từng số điện thoại để bạn kiểm tra trước khi xử lý. Nếu đang trùng với Contact đã convert,
                thông tin Contact sẽ hiện ngay trong nhóm tương ứng.
              </p>
            </div>
            <button onClick={onClose} className="text-slate-400 transition hover:text-slate-600" aria-label="Đóng">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {reviewSections.length === 0 ? (
            <div className="py-10 text-center">
              <CheckCircle2 size={48} className="mx-auto mb-4 text-green-500 opacity-20" />
              <p className="text-slate-500">Không có lead nào để rà soát.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-50">
                    <tr>
                      <th className="border-b border-slate-200 px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">STT</th>
                      <th className="border-b border-slate-200 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Ngày tạo</th>
                      <th className="border-b border-slate-200 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Tên</th>
                      <th className="border-b border-slate-200 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">SĐT</th>
                      <th className="border-b border-slate-200 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Ng phụ trách</th>
                      <th className="border-b border-slate-200 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Chi nhánh</th>
                      <th className="border-b border-slate-200 px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviewSections.map((group) => {
                      const groupBadgeLabel = getGroupBadgeLabel(group.leads.length, group.hasLeadDuplicate, group.existingContact);
                      const groupToneClasses = group.hasConflict
                        ? {
                            row: 'bg-amber-50/70',
                            border: 'border-amber-100',
                            title: 'text-amber-900',
                            description: 'text-amber-800/80',
                            badge: 'text-amber-700',
                          }
                        : {
                            row: 'bg-sky-50/70',
                            border: 'border-sky-100',
                            title: 'text-sky-900',
                            description: 'text-sky-800/80',
                            badge: 'text-sky-700',
                          };

                      return (
                        <React.Fragment key={group.key}>
                          <tr className={groupToneClasses.row}>
                            <td colSpan={7} className={`border-b px-3 py-2 ${groupToneClasses.border}`}>
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <div className={`text-sm font-semibold ${groupToneClasses.title}`}>
                                    Nhóm rà soát #{group.groupIndex + 1} • SĐT {group.normalizedPhone || group.label}
                                  </div>
                                  {group.existingContact ? (
                                    <div className={`mt-1 text-xs ${groupToneClasses.description}`}>
                                      Contact đã convert: {group.existingContact.name} ({group.existingContact.id}) • SĐT {group.existingContact.phone}
                                    </div>
                                  ) : group.hasLeadDuplicate ? (
                                    <div className={`mt-1 text-xs ${groupToneClasses.description}`}>
                                      Phát hiện {group.leads.length} lead cùng số điện thoại trong lô chọn.
                                    </div>
                                  ) : (
                                    <div className={`mt-1 text-xs ${groupToneClasses.description}`}>
                                      Không phát hiện lead hoặc Contact nào khác trùng số điện thoại này.
                                    </div>
                                  )}
                                </div>
                                <div className={`text-xs font-semibold uppercase tracking-wide ${groupToneClasses.badge}`}>
                                  {groupBadgeLabel}
                                </div>
                              </div>
                            </td>
                          </tr>

                          {group.rows.map(({ lead, stt }) => (
                            <tr
                              key={lead.id}
                              onClick={() => onOpenLead?.(lead)}
                              className={`${onOpenLead ? 'cursor-pointer hover:bg-blue-50/60' : ''} border-b border-slate-100 transition-colors`}
                              title={onOpenLead ? `Mở lead: ${lead.name}` : undefined}
                            >
                              <td className="px-3 py-2 text-center text-sm font-semibold text-slate-500">{stt}</td>
                              <td className="px-3 py-2 text-sm text-slate-700">{formatLeadCreatedAt(lead.createdAt)}</td>
                              <td className="max-w-[260px] px-3 py-2 text-sm text-slate-900">
                                <div className="truncate font-semibold" title={lead.name}>{lead.name || '-'}</div>
                              </td>
                              <td className="px-3 py-2 text-sm font-semibold text-slate-700">{lead.phone || '-'}</td>
                              <td className="max-w-[180px] px-3 py-2 text-sm text-slate-700">
                                <div className="truncate" title={getLeadOwnerLabel(lead)}>{getLeadOwnerLabel(lead)}</div>
                              </td>
                              <td className="max-w-[180px] px-3 py-2 text-sm text-slate-700">
                                <div className="truncate" title={getLeadBranchLabel(lead)}>{getLeadBranchLabel(lead)}</div>
                              </td>
                              <td className="px-3 py-2 text-center text-sm text-slate-700">
                                {getLeadStatusLabel(String(lead.status || ''))}
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3">
          <div className="text-sm text-slate-500">
            {conflictGroupCount > 0
              ? `Đang rà soát ${reviewSections.length} nhóm và ${totalLeadCount} lead. Phát hiện ${conflictGroupCount} nhóm đang có khả năng trùng.`
              : `Đang rà soát ${reviewSections.length} nhóm và ${totalLeadCount} lead. Không phát hiện trùng SĐT trong bước kiểm tra này.`}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Hủy
            </button>
            <button
              onClick={onProceed}
              disabled={reviewSections.length === 0}
              className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-slate-300 ${
                conflictGroupCount > 0 ? 'bg-amber-600 hover:bg-amber-700' : 'bg-sky-700 hover:bg-sky-800'
              }`}
            >
              Xử lý
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadConvertConflictReviewModal;
