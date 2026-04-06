import { useCallback, useEffect, useState } from 'react';
import { UserRole } from '../types';

const SALES_TEST_ROLE_KEY = 'educrm_sales_test_role';
const SALES_TEST_ROLE_EVENT = 'educrm:sales-test-role-changed';

const isSupportedSalesRole = (role?: string | null): role is UserRole =>
  role === UserRole.SALES_REP || role === UserRole.SALES_LEADER;

const getFallbackSalesRole = (fallbackRole?: UserRole | null) =>
  fallbackRole === UserRole.SALES_LEADER ? UserRole.SALES_LEADER : UserRole.SALES_REP;

const normalizeSalesTestRole = (role?: string | null, fallbackRole?: UserRole | null) =>
  isSupportedSalesRole(role) ? role : getFallbackSalesRole(fallbackRole);

const readSalesTestRole = (fallbackRole?: UserRole | null) => {
  if (typeof window === 'undefined') {
    return getFallbackSalesRole(fallbackRole);
  }

  return normalizeSalesTestRole(window.localStorage.getItem(SALES_TEST_ROLE_KEY), fallbackRole);
};

export const useSalesTestRole = (fallbackRole?: UserRole | null) => {
  const [salesTestRole, setSalesTestRoleState] = useState<UserRole>(() => readSalesTestRole(fallbackRole));

  useEffect(() => {
    setSalesTestRoleState(readSalesTestRole(fallbackRole));
  }, [fallbackRole]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const syncSalesTestRole = () => {
      setSalesTestRoleState(readSalesTestRole(fallbackRole));
    };

    window.addEventListener(SALES_TEST_ROLE_EVENT, syncSalesTestRole);
    window.addEventListener('storage', syncSalesTestRole);

    return () => {
      window.removeEventListener(SALES_TEST_ROLE_EVENT, syncSalesTestRole);
      window.removeEventListener('storage', syncSalesTestRole);
    };
  }, [fallbackRole]);

  const setSalesTestRole = useCallback((role: UserRole) => {
    const nextRole = normalizeSalesTestRole(role, fallbackRole);
    setSalesTestRoleState(nextRole);

    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(SALES_TEST_ROLE_KEY, nextRole);
    window.dispatchEvent(new Event(SALES_TEST_ROLE_EVENT));
  }, [fallbackRole]);

  return { salesTestRole, setSalesTestRole };
};
