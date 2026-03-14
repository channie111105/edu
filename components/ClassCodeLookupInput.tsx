import React, { useEffect, useMemo, useRef, useState } from 'react';

export interface ClassCodeLookupOption {
  code: string;
  name: string;
  campus?: string;
  schedule?: string;
  level?: string;
  classType?: string;
  status?: string;
}

interface ClassCodeLookupInputProps {
  value: string;
  onChange: (value: string) => void;
  loadOptions: () => ClassCodeLookupOption[];
  disabled?: boolean;
  placeholder?: string;
  inputClassName?: string;
  buttonClassName?: string;
  wrapperClassName?: string;
}

const normalizeToken = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const ClassCodeLookupInput: React.FC<ClassCodeLookupInputProps> = ({
  value,
  onChange,
  loadOptions,
  disabled = false,
  placeholder,
  inputClassName = '',
  buttonClassName = '',
  wrapperClassName = ''
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isManualBrowse, setIsManualBrowse] = useState(false);
  const [options, setOptions] = useState<ClassCodeLookupOption[]>([]);

  const refreshOptions = () => {
    setOptions(loadOptions());
  };

  useEffect(() => {
    refreshOptions();
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const normalizedQuery = normalizeToken(value || '');

  const filteredOptions = useMemo(() => {
    const source = normalizedQuery
      ? options.filter((option) => {
          const searchable = normalizeToken(
            [
              option.code,
              option.name,
              option.campus,
              option.schedule,
              option.level,
              option.classType,
              option.status
            ]
              .filter(Boolean)
              .join(' ')
          );
          return searchable.includes(normalizedQuery);
        })
      : isManualBrowse
        ? options
        : [];

    return source.slice(0, 12);
  }, [isManualBrowse, normalizedQuery, options]);

  const handleInputChange = (nextValue: string) => {
    onChange(nextValue);
    refreshOptions();
    setIsManualBrowse(false);
    setIsOpen(normalizeToken(nextValue).length > 0);
  };

  const handleToggleLookup = () => {
    if (disabled) return;
    refreshOptions();
    setIsManualBrowse(true);
    setIsOpen((prev) => !prev);
  };

  const handleSelectOption = (option: ClassCodeLookupOption) => {
    onChange(option.code);
    setIsManualBrowse(false);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${wrapperClassName}`}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <input
          type="text"
          value={value}
          onChange={(event) => handleInputChange(event.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          className={inputClassName}
        />
        <button
          type="button"
          onClick={handleToggleLookup}
          disabled={disabled}
          title="Tra cứu lớp hiện có"
          className={buttonClassName}
        >
          DS lớp
        </button>
      </div>

      {isOpen && !disabled && (isManualBrowse || normalizedQuery.length > 0) && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <button
                key={`${option.code}-${option.name}`}
                type="button"
                onClick={() => handleSelectOption(option)}
                className="w-full border-b border-slate-100 px-3 py-2 text-left transition-colors last:border-b-0 hover:bg-slate-50"
              >
                <div className="text-sm font-semibold text-slate-800">{option.code}</div>
                <div className="text-xs text-slate-500">
                  {[option.name, option.campus, option.schedule].filter(Boolean).join(' • ')}
                </div>
              </button>
            ))
          ) : (
            <div className="px-3 py-3 text-sm text-slate-500">Không tìm thấy lớp phù hợp</div>
          )}
        </div>
      )}
    </div>
  );
};

export default ClassCodeLookupInput;
