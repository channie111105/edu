
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

  const login = (role: UserRole) => {
    // Simulate logging in with distinct IDs for demo purposes
    let demoUser = { ...MOCK_USER, role };

    if (role === UserRole.SALES_REP) {
        // Nếu là Sales, đóng vai Sarah Miller (u2) để khớp dữ liệu mẫu
        demoUser = {
            id: 'u2',
            name: 'Sarah Miller',
            role: UserRole.SALES_REP,
            avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026024d'
        };
    } else if (role === UserRole.MARKETING) {
        demoUser = {
            id: 'u1',
            name: 'Trần Văn Quản Trị',
            role: UserRole.MARKETING,
            avatar: 'https://picsum.photos/200'
        };
    }

    setUser(demoUser);
  };

  const logout = () => {
    setUser(null);
  };

  const switchRole = (role: UserRole) => {
    if (user) {
      setUser({ ...user, role });
    }
  };

  const hasPermission = (allowedRoles: UserRole[]) => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
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
