import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, ChevronRight, DollarSign, GraduationCap, MoreHorizontal, StickyNote } from 'lucide-react';
import InternalNoteModal from './InternalNoteModal';

export interface KanbanCardItem {
  id: string;
  studentName: string;
  program: string;
  country: string;
  value: string;
  assignedTo: string;
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

const KanbanCard: React.FC<KanbanCardProps> = ({
  item,
  isDragging = false,
  stageOptions,
  onOpenCase,
  onSaveInternalNote,
  onUpdateStage
}) => {
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showStagePicker, setShowStagePicker] = useState(false);
  const [saveNotice, setSaveNotice] = useState('');
  const [stageSaving, setStageSaving] = useState(false);
  const noticeTimerRef = useRef<number | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const notePreview = (item.internalNote || '').trim();
  const hasNote = notePreview.length > 0;

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

  const openNoteModal = (event: React.MouseEvent | React.KeyboardEvent) => {
    event.stopPropagation();
    setIsNoteModalOpen(true);
  };

  const closeNoteModal = () => {
    setIsNoteModalOpen(false);
  };

  const handleSaveNote = async (note: string): Promise<boolean> => {
    const ok = await onSaveInternalNote(item.id, note);
    if (!ok) return false;
    notifySaved('Đã lưu');
    return true;
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
      notifySaved('Đã cập nhật giai đoạn');
      setMenuOpen(false);
      setShowStagePicker(false);
    } else {
      window.alert('Không thể cập nhật giai đoạn. Vui lòng thử lại.');
    }
  };

  return (
    <>
      <div
        onClick={() => onOpenCase(item.id)}
        className={`rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-all hover:border-blue-300 hover:shadow-md ${
          isDragging ? 'scale-[0.985] opacity-85' : ''
        } cursor-grab active:cursor-grabbing`}
      >
        <div className="mb-2 flex items-start justify-between">
          <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-tighter text-blue-700">
            {item.country}
          </span>
          <div className="flex items-center gap-1">
            {item.noOfferWarning ? (
              <span
                className="flex animate-pulse items-center gap-1 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600"
                title="Hồ sơ đang bị chậm thư mời"
              >
                <AlertCircle size={10} /> Chưa có thư mời
              </span>
            ) : null}

            <button
              type="button"
              onClick={openNoteModal}
              className="rounded p-1 text-gray-400 transition-colors hover:bg-slate-100 hover:text-blue-600"
              title="Ghi chú nội bộ"
            >
              <StickyNote size={13} />
            </button>

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setMenuOpen((prev) => !prev);
                  if (menuOpen) {
                    setShowStagePicker(false);
                  }
                }}
                className="rounded p-1 text-gray-400 transition-colors hover:bg-slate-100 hover:text-gray-600"
                title="Tùy chọn"
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
                      <span>Chuyển giai đoạn</span>
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
                        ← Chọn giai đoạn
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

        <h4 className="mb-1 font-bold text-gray-900">{item.studentName}</h4>
        <p className="mb-3 flex items-center gap-1 text-xs text-gray-500">
          <GraduationCap size={12} /> {item.program}
        </p>

        <div className="mb-3">
          <button
            type="button"
            onClick={openNoteModal}
            className="flex w-full items-center gap-2 rounded-md border border-dashed border-slate-200 px-2 py-1.5 text-left transition-colors hover:border-blue-200 hover:bg-blue-50/50"
          >
            <StickyNote size={12} className="shrink-0 text-slate-400" />
            <span
              className={`block min-w-0 truncate text-xs ${hasNote ? 'text-slate-600' : 'italic text-slate-400'}`}
              title={hasNote ? notePreview : ''}
            >
              {hasNote ? notePreview : 'Ghi chú nội bộ...'}
            </span>
          </button>
          {saveNotice ? <p className="mt-1 text-[10px] font-semibold text-emerald-600">{saveNotice}</p> : null}
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 pt-3">
          <div className="flex items-center gap-1 text-xs text-gray-500" title="Expected Value">
            <DollarSign size={12} className="text-green-600" />
            <span className="font-medium text-green-700">{item.value}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-100 text-[10px] font-bold text-purple-600"
              title={`Assigned to ${item.assignedTo}`}
            >
              {item.assignedTo.charAt(0)}
            </div>
          </div>
        </div>
      </div>

      <InternalNoteModal
        open={isNoteModalOpen}
        caseId={item.id}
        defaultValue={item.internalNote || ''}
        updatedAt={item.internalNoteUpdatedAt}
        onClose={closeNoteModal}
        onSave={handleSaveNote}
      />
    </>
  );
};

export default KanbanCard;
