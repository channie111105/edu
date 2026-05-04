import React from 'react';
import { ChevronDown } from 'lucide-react';
import {
  type PermissionScope,
  SCOPE_OPTIONS,
  getScopeOption,
} from '../../utils/adminPermissions';

interface PermissionScopeSelectProps {
  value: PermissionScope;
  disabled?: boolean;
  onChange: (nextValue: PermissionScope) => void;
}

const PermissionScopeSelect: React.FC<PermissionScopeSelectProps> = ({ value, disabled = false, onChange }) => {
  const activeOption = getScopeOption(value);

  return (
    <div className="relative">
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as PermissionScope)}
        className={`h-10 w-full appearance-none rounded-xl border px-3 pr-9 text-sm font-medium outline-none transition disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 ${activeOption.selectClass}`}
      >
        {SCOPE_OPTIONS.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
      />
    </div>
  );
};

export default PermissionScopeSelect;
