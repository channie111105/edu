
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { IUser, UserRole } from '../types';
import { MOCK_USER } from '../constants';

interface AuthContextType {
  user: IUser | null;
  isAuthenticated: boolean;
  login: (role: UserRole) => void;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  hasPermission: (allowedRoles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children?: ReactNode }) => {
  const [user, setUser] = useState<IUser | null>(null);

  const getDemoUserByRole = (role: UserRole): IUser => {
    if (role === UserRole.SALES_REP) {
      return {
        id: 'u2',
        name: 'Sarah Miller',
        role: UserRole.SALES_REP,
        avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026024d'
      };
    }

    if (role === UserRole.SALES_LEADER) {
      return {
        id: 'u1',
        name: 'Trần Văn Quản Trị',
        role: UserRole.SALES_LEADER,
        avatar: 'https://picsum.photos/200?sales-leader'
      };
    }

    if (role === UserRole.MARKETING) {
      return {
        id: 'u1',
        name: 'Trần Văn Quản Trị',
        role: UserRole.MARKETING,
        avatar: 'https://picsum.photos/200'
      };
    }

    return { ...MOCK_USER, role };
  };

  const login = (role: UserRole) => {
    setUser(getDemoUserByRole(role));
  };

  const logout = () => {
    setUser(null);
  };

  const switchRole = (role: UserRole) => {
    setUser(getDemoUserByRole(role));
  };

  const hasPermission = (allowedRoles: UserRole[]) => {
    if (!user) return false;
    void allowedRoles;
    return true;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user, 
      login, 
      logout, 
      switchRole, 
      hasPermission 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
