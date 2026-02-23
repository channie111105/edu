import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, X } from 'lucide-react';

type InternalNoteModalProps = {
  open: boolean;
  caseId: string;
  defaultValue?: string;
  updatedAt?: string;
  onClose: () => void;
  onSave: (note: string) => boolean | void | Promise<boolean | void>;
};

const formatUpdatedAt = (value?: string): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN');
};

const InternalNoteModal: React.FC<InternalNoteModalProps> = ({
  open,
  caseId,
  defaultValue = '',
  updatedAt,
  onClose,
  onSave
}) => {
  const [note, setNote] = useState(defaultValue);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!open) return;
    setNote(defaultValue);
    setSaving(false);
    setErrorMessage('');
  }, [caseId, defaultValue, open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, open, saving]);

  const hasChanges = useMemo(() => note !== defaultValue, [defaultValue, note]);
  const lastUpdatedLabel = useMemo(() => formatUpdatedAt(updatedAt), [updatedAt]);

  const handleSave = async () => {
    if (!hasChanges || saving) return;
    setSaving(true);
    setErrorMessage('');
    try {
      const result = await onSave(note);
      if (result === false) {
        setErrorMessage('Không thể lưu ghi chú. Vui lòng thử lại.');
        return;
      }
      onClose();
    } catch {
      setErrorMessage('Không thể lưu ghi chú. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40"
        onClick={() => {
          if (!saving) onClose();
        }}
        aria-label="Đóng ghi chú nội bộ"
      />

      <div className="relative w-full max-w-xl rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Ghi chú nội bộ</h3>
            {lastUpdatedLabel ? (
              <p className="mt-0.5 text-xs text-slate-500">Cập nhật lần cuối: {lastUpdatedLabel}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4">
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Nhập ghi chú nội bộ..."
            className="h-40 w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            autoFocus
          />
          {errorMessage ? <p className="mt-2 text-xs font-medium text-rose-600">{errorMessage}</p> : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-10 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InternalNoteModal;
