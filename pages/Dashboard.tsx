import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import MarketingDashboard from './MarketingDashboard';
import SalesDashboard from './SalesDashboard';
import FinanceDashboard from './FinanceDashboard';
import StudyAbroadDashboard from './StudyAbroadDashboard';
import AdminDashboard from './AdminDashboard';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  if (user?.role === UserRole.ADMIN) {
    return <AdminDashboard />;
  }

  if (user?.role === UserRole.SALES_LEADER) {
    return <Navigate to="/contracts/dashboard" replace />;
  }

  if (user?.role === UserRole.MARKETING) {
    return <MarketingDashboard />;
  }

  if (user?.role === UserRole.ACCOUNTANT) {
    return <FinanceDashboard />;
  }

  if (user?.role === UserRole.TRAINING) {
    return <Navigate to="/training/schedule" replace />;
  }

  if (user?.role === UserRole.TEACHER) {
    return <Navigate to="/library" replace />;
  }

  if (user?.role === UserRole.STUDY_ABROAD) {
    return <StudyAbroadDashboard />;
  }

  return <SalesDashboard />;
};

export default Dashboard;
