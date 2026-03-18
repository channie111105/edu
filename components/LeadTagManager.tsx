import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Pin, Plus, Trash2, X } from 'lucide-react';

type AccentTone = 'purple' | 'blue';
type DisplayMode = 'catalog' | 'dropdown';

interface LeadTagManagerProps {
  selectedTags: string[];
  availableTags: string[];
  fixedTags: readonly string[];
  isAdding: boolean;
  accent?: AccentTone;
  mode?: DisplayMode;
  onStartAdding: () => void;
  onStopAdding: () => void;
  onAddTag: (tag: string) => void;
  onCreateTag: (tag: string) => void;
  onRemoveSelectedTag: (tag: string) => void;
  onDeleteTag: (tag: string) => void;
}

const ACCENT_STYLES: Record<AccentTone, {
  select: string;
  input: string;
  action: string;
  fixedTag: string;
  fixedTagActive: string;
  customTag: string;
  selectedTag: string;
  selectedTagHover: string;
  helperText: string;
}> = {
  purple: {
    select: 'focus:border-purple-500',
    input: 'border-purple-400 ring-purple-100',
    action: 'border-purple-200 text-purple-700 hover:bg-purple-50',
    fixedTag: 'border-slate-200 bg-white text-slate-700 hover:border-purple-300 hover:text-purple-700',
    fixedTagActive: 'border-purple-200 bg-purple-50 text-purple-700',
    customTag: 'border-slate-200 bg-slate-50 text-slate-700 hover:border-purple-300',
    selectedTag: 'bg-purple-50 text-purple-700 border-purple-100',
    selectedTagHover: 'hover:text-purple-900',
    helperText: 'text-purple-700'
  },
  blue: {
    select: 'focus:border-blue-500',
    input: 'border-blue-400 ring-blue-100',
    action: 'border-blue-200 text-blue-700 hover:bg-blue-50',
    fixedTag: 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700',
    fixedTagActive: 'border-blue-200 bg-blue-50 text-blue-700',
    customTag: 'border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-300',
    selectedTag: 'bg-blue-50 text-blue-700 border-blue-100',
    selectedTagHover: 'hover:text-blue-900',
    helperText: 'text-blue-700'
  }
};

const LeadTagManager: React.FC<LeadTagManagerProps> = ({
  selectedTags,
  availableTags,
  fixedTags,
  isAdding,
  accent = 'purple',
  mode = 'catalog',
  onStartAdding,
  onStopAdding,
  onAddTag,
  onCreateTag,
  onRemoveSelectedTag,
  onDeleteTag
}) => {
  const styles = ACCENT_STYLES[accent];
  const selectableTags = availableTags.filter((tag) => !selectedTags.includes(tag));
  const fixedAvailableTags = fixedTags.filter((tag) => availableTags.includes(tag));
  const customAvailableTags = availableTags.filter((tag) => !fixedTags.includes(tag));
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (mode !== 'dropdown' || !isMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen, mode]);

  const renderSelectedTags = () => (
    selectedTags.length > 0 && (
      <div className="space-y-1">
        <div className="flex flex-wrap gap-1">
          {selectedTags.map((tag) => (
            <span key={tag} className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded border ${styles.selectedTag}`}>
              {tag}
              <button
                type="button"
                onClick={() => onRemoveSelectedTag(tag)}
                className={`transition-colors ${styles.selectedTagHover}`}
                aria-label={`Bo chon tag ${tag}`}
              >
                <X size={10} strokeWidth={3} />
              </button>
            </span>
          ))}
        </div>
      </div>
    )
  );

  if (mode === 'dropdown') {
    return (
      <div className="flex-1 flex flex-col gap-2">
        <div className="flex gap-2">
          <div ref={dropdownRef} className="relative flex-1">
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className={`flex w-full items-center justify-between rounded border border-slate-300 bg-white px-2 py-1.5 text-left text-xs outline-none transition-colors ${styles.select}`}
            >
              <span className="text-slate-700">-- Chon Tag --</span>
              <ChevronDown size={14} className="text-slate-500" />
            </button>

            {isMenuOpen && (
              <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 max-h-64 overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg">
                {availableTags.map((tag) => {
                  const isFixed = fixedTags.includes(tag);
                  const isSelected = selectedTags.includes(tag);

                  return (
                    <div
                      key={tag}
                      className={`flex items-center justify-between gap-2 px-2 py-1.5 text-xs transition-colors ${isSelected ? 'bg-slate-50 text-slate-400' : 'text-slate-700 hover:bg-slate-50'}`}
                    >
                      <button
                        type="button"
                        disabled={isSelected}
                        onClick={() => {
                          onAddTag(tag);
                          setIsMenuOpen(false);
                        }}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left disabled:cursor-not-allowed"
                      >
                        {isFixed ? (
                          <Pin size={11} className="shrink-0 text-amber-500" />
                        ) : (
                          <span className="h-[11px] w-[11px] shrink-0" />
                        )}
                        <span className="truncate">{tag}</span>
                      </button>

                      {!isFixed && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onDeleteTag(tag);
                          }}
                          className="rounded p-0.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                          aria-label={`Xoa tag ${tag}`}
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={isAdding ? onStopAdding : onStartAdding}
            className={`inline-flex items-center gap-1 rounded border px-2 py-1.5 text-xs font-semibold transition-colors ${styles.action}`}
          >
            <Plus size={12} />
            {isAdding ? 'Dong' : 'Tao tag'}
          </button>
        </div>

        {isAdding && (
          <input
            autoFocus
            className={`w-full px-2 py-1.5 border rounded text-xs outline-none ring-2 ${styles.input}`}
            placeholder="Nhap tag moi roi an Enter..."
            onBlur={onStopAdding}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const value = (e.target as HTMLInputElement).value.trim();
                if (value) onCreateTag(value);
                onStopAdding();
              } else if (e.key === 'Escape') {
                onStopAdding();
              }
            }}
          />
        )}

        {renderSelectedTags()}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-2">
      <div className="flex gap-2">
        <select
          className={`flex-1 px-2 py-1.5 border border-slate-300 rounded text-xs bg-white outline-none ${styles.select}`}
          defaultValue=""
          onChange={(e) => {
            const value = e.target.value;
            if (value) onAddTag(value);
            e.target.value = '';
          }}
        >
          <option value="">-- Chon Tag --</option>
          {selectableTags.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={isAdding ? onStopAdding : onStartAdding}
          className={`inline-flex items-center gap-1 rounded border px-2 py-1.5 text-xs font-semibold transition-colors ${styles.action}`}
        >
          <Plus size={12} />
          {isAdding ? 'Dong' : 'Tao tag'}
        </button>
      </div>

      {isAdding && (
        <input
          autoFocus
          className={`w-full px-2 py-1.5 border rounded text-xs outline-none ring-2 ${styles.input}`}
          placeholder="Nhap tag moi roi an Enter..."
          onBlur={onStopAdding}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              const value = (e.target as HTMLInputElement).value.trim();
              if (value) onCreateTag(value);
              onStopAdding();
            } else if (e.key === 'Escape') {
              onStopAdding();
            }
          }}
        />
      )}

      {fixedAvailableTags.length > 0 && (
        <div className="space-y-1">
          <div className={`text-[11px] font-semibold ${styles.helperText}`}>Tag co dinh</div>
          <div className="flex flex-wrap gap-1.5">
            {fixedAvailableTags.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onAddTag(tag)}
                  className={`rounded-full border px-2 py-1 text-[11px] font-semibold transition-colors ${isSelected ? styles.fixedTagActive : styles.fixedTag}`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {customAvailableTags.length > 0 && (
        <div className="space-y-1">
          <div className="text-[11px] font-semibold text-slate-500">Tag tu tao</div>
          <div className="flex flex-wrap gap-1.5">
            {customAvailableTags.map((tag) => (
              <div
                key={tag}
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium transition-colors ${styles.customTag}`}
              >
                <button type="button" onClick={() => onAddTag(tag)} className="leading-none">
                  {tag}
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteTag(tag)}
                  className="text-slate-400 transition-colors hover:text-rose-600"
                  aria-label={`Xoa tag ${tag}`}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {renderSelectedTags()}
    </div>
  );
};

export default LeadTagManager;
