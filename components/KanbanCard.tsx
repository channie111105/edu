import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Check,
  ChevronRight,
  GraduationCap,
  MoreHorizontal,
  Tags,
  UserCog
} from 'lucide-react';

export interface KanbanCardItem {
  id: string;
  studentName: string;
  dateOfBirth?: string;
  program: string;
  country: string;
  processorName: string;
  caseCompletenessLabel: string;
  tags: string[];
  noOfferWarning?: boolean;
  internalNote?: string;
  internalNoteUpdatedAt?: string;
  stageId: string;
  stageUpdatedAt?: string;
}

type StageOption = {
  id: string;
  title: string;
};

type KanbanCardProps = {
  item: KanbanCardItem;
  isDragging?: boolean;
  stageOptions: StageOption[];
  onOpenCase: (caseId: string) => void;
  onSaveInternalNote: (caseId: string, note: string) => boolean | Promise<boolean>;
  onUpdateStage: (caseId: string, stageId: string) => boolean | Promise<boolean>;
};

const formatDisplayDate = (value?: string) => {
  if (!value) return 'Chua cap nhat';
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Date(parsed).toLocaleDateString('vi-VN');
};

const KanbanCard: React.FC<KanbanCardProps> = ({
  item,
  isDragging = false,
  stageOptions,
  onOpenCase,
  onSaveInternalNote,
  onUpdateStage
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showStagePicker, setShowStagePicker] = useState(false);
  const [saveNotice, setSaveNotice] = useState('');
  const [stageSaving, setStageSaving] = useState(false);
  const noticeTimerRef = useRef<number | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const compactTags = item.tags.slice(0, 3);
  const remainingTagCount = Math.max(0, item.tags.length - compactTags.length);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) {
        window.clearTimeout(noticeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (menuRef.current.contains(event.target as Node)) return;
      setMenuOpen(false);
      setShowStagePicker(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const notifySaved = (message: string) => {
    setSaveNotice(message);
    if (noticeTimerRef.current) {
      window.clearTimeout(noticeTimerRef.current);
    }
    noticeTimerRef.current = window.setTimeout(() => setSaveNotice(''), 1800);
  };

  const handleStageSelect = async (event: React.MouseEvent, targetStageId: string) => {
    event.stopPropagation();
    if (stageSaving || targetStageId === item.stageId) {
      setMenuOpen(false);
      setShowStagePicker(false);
      return;
    }

    setStageSaving(true);
    const ok = await onUpdateStage(item.id, targetStageId);
    setStageSaving(false);

    if (ok) {
      notifySaved('Da cap nhat giai doan');
      setMenuOpen(false);
      setShowStagePicker(false);
    } else {
      window.alert('Khong the cap nhat giai doan. Vui long thu lai.');
    }
  };

  return (
    <>
      <div
        onClick={() => onOpenCase(item.id)}
        className={`cursor-grab rounded-lg border border-slate-200 bg-white p-2.5 transition-all hover:border-slate-300 hover:shadow-[0_4px_14px_rgba(15,23,42,0.08)] active:cursor-grabbing ${
          isDragging ? 'scale-[0.985] opacity-85' : ''
        }`}
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-tight text-blue-700">
              {item.country}
            </span>
            {item.noOfferWarning ? (
              <span
                className="flex items-center gap-1 rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700"
                title="Ho so dang bi cham thu moi"
              >
                <AlertCircle size={10} />
                Cham thu moi
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-1">
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setMenuOpen((prev) => !prev);
                  if (menuOpen) setShowStagePicker(false);
                }}
                className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                title="Tuy chon"
              >
                <MoreHorizontal size={14} />
              </button>

              {menuOpen ? (
                <div
                  className="absolute right-0 top-7 z-30 min-w-56 rounded-lg border border-slate-200 bg-white p-1 shadow-xl"
                  onClick={(event) => event.stopPropagation()}
                >
                  {!showStagePicker ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setShowStagePicker(true);
                      }}
                      className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
                    >
                      <span>Chuyen giai doan</span>
                      <ChevronRight size={14} />
                    </button>
                  ) : (
                    <div className="py-1">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setShowStagePicker(false);
                        }}
                        className="mb-1 w-full rounded-md px-3 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 hover:bg-slate-100"
                      >
                        ← Chon giai doan
                      </button>
                      <div className="max-h-64 overflow-y-auto">
                        {stageOptions.map((stage) => (
                          <button
                            key={stage.id}
                            type="button"
                            onClick={(event) => handleStageSelect(event, stage.id)}
                            disabled={stageSaving}
                            className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <span className="truncate">{stage.title}</span>
                            {item.stageId === stage.id ? <Check size={14} className="shrink-0 text-blue-600" /> : null}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <h4 className="truncate text-[15px] font-bold leading-5 text-slate-900">{item.studentName}</h4>

        <div className="mt-2 grid grid-cols-2 gap-x-2.5 gap-y-1.5 text-[11px] text-slate-600">
          <div className="flex min-w-0 items-center gap-1.5">
            <Calendar size={14} className="shrink-0 text-slate-400" />
            <span className="truncate">{formatDisplayDate(item.dateOfBirth)}</span>
          </div>
          <div className="flex min-w-0 items-center gap-1.5">
            <GraduationCap size={14} className="shrink-0 text-slate-400" />
            <span className="truncate">{item.program}</span>
          </div>
          <div className="col-span-2 flex min-w-0 items-center gap-1.5">
            <UserCog size={14} className="shrink-0 text-slate-400" />
            <span className="truncate">{item.processorName || 'Chua phan cong'}</span>
          </div>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {item.tags.length ? (
            compactTags.map((tag) => {
              const isWarningTag = tag === 'Tạm dừng' || tag === 'Bổ sung giấy tờ' || tag === 'Delay kỳ bay';

              return (
                <span
                  key={`${item.id}-${tag}`}
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                    isWarningTag ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tag}
                </span>
              );
            })
          ) : (
            <span className="text-[11px] italic text-slate-400">Chua co tag</span>
          )}
          {remainingTagCount > 0 ? (
            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
              +{remainingTagCount}
            </span>
          ) : null}
        </div>

        <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
            {item.caseCompletenessLabel}
          </div>
          <div
            className="flex h-5 min-w-5 items-center justify-center rounded-full bg-purple-100 px-1.5 text-[10px] font-semibold text-purple-600"
            title={`Nguoi phu trach: ${item.processorName || 'Chua phan cong'}`}
          >
            {(item.processorName || 'C').charAt(0).toUpperCase()}
          </div>
        </div>
        {saveNotice ? <p className="mt-1 text-[10px] font-semibold text-emerald-600">{saveNotice}</p> : null}
      </div>
    </>
  );
};

export default KanbanCard;
