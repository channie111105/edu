import React from 'react';
import { Search, X } from 'lucide-react';

export interface PinnedSearchChip {
  key: string;
  label: string;
  removable?: boolean;
}

interface PinnedSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  chips?: PinnedSearchChip[];
  onRemoveChip?: (chipKey: string) => void;
  onClearAll?: () => void;
  clearAllAriaLabel?: string;
  className?: string;
  inputClassName?: string;
}

const PinnedSearchInput: React.FC<PinnedSearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Tim kiem...',
  chips = [],
  onRemoveChip,
  onClearAll,
  clearAllAriaLabel = 'Xoa tat ca bo loc',
  className,
  inputClassName
}) => {
  const showClearAll = Boolean(onClearAll) && (chips.length > 0 || value.trim().length > 0);

  return (
    <div
      className={`min-h-[38px] rounded-lg border border-slate-200 bg-white px-2.5 py-1 shadow-sm transition-colors focus-within:border-blue-400 ${className || ''}`}
    >
      <div className="flex items-center gap-1.5">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
          <Search size={15} className="shrink-0 text-slate-400" />

          {chips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-300 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700"
            >
              <span>{chip.label}</span>
              {onRemoveChip && chip.removable !== false ? (
                <button
                  type="button"
                  onClick={() => onRemoveChip(chip.key)}
                  className="text-slate-400 transition-colors hover:text-slate-700"
                  aria-label={`Remove ${chip.label}`}
                >
                  <X size={12} />
                </button>
              ) : null}
            </span>
          ))}

          <input
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            className={`h-6 min-w-[140px] flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400 ${inputClassName || ''}`}
          />
        </div>

        {showClearAll ? (
          <button
            type="button"
            onClick={onClearAll}
            className="shrink-0 rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label={clearAllAriaLabel}
          >
            <X size={14} />
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default PinnedSearchInput;
