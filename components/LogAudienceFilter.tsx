import React from 'react';
import { LogAudienceFilter } from '../utils/logAudience';

const OPTIONS: Array<{ value: LogAudienceFilter; label: string }> = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'SYSTEM', label: 'Hệ thống' },
  { value: 'USER', label: 'Người dùng' }
];

interface LogAudienceFilterProps {
  value: LogAudienceFilter;
  onChange: (value: LogAudienceFilter) => void;
  className?: string;
}

const LogAudienceFilterControl: React.FC<LogAudienceFilterProps> = ({ value, onChange, className }) => {
  return (
    <div className={`inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 ${className || ''}`}>
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={[
            'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
            value === option.value ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          ].join(' ')}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

export default LogAudienceFilterControl;
