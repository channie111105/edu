import React from 'react';
import { Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import { useSalesTestRole } from '../utils/salesTestRole';

interface SalesRoleTestSwitcherProps {
  className?: string;
}

const SalesRoleTestSwitcher: React.FC<SalesRoleTestSwitcherProps> = ({
  className = '',
}) => {
  const { user } = useAuth();
  const { salesTestRole, setSalesTestRole } = useSalesTestRole(user?.role);

  return (
    <label
      className={[
        'inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800',
        className,
      ]
        .join(' ')
        .trim()}
    >
      <Shield size={14} className="text-amber-600" />
      <span className="whitespace-nowrap">Quyền test</span>
      <select
        value={salesTestRole}
        onChange={(event) => setSalesTestRole(event.target.value as UserRole)}
        className="min-w-[132px] rounded-md border border-amber-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 outline-none focus:border-amber-400"
      >
        <option value={UserRole.SALES_REP}>Sales Rep</option>
        <option value={UserRole.SALES_LEADER}>Quản lý sale</option>
      </select>
    </label>
  );
};

export default SalesRoleTestSwitcher;
