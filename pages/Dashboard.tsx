
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import MarketingDashboard from './MarketingDashboard';
import SalesDashboard from './SalesDashboard';
import ContractDashboard from './ContractDashboard';
import FinanceDashboard from './FinanceDashboard';
// import TrainingDashboard from './TrainingDashboard'; // Removed
import TeacherDashboard from './TeacherDashboard';
import StudyAbroadDashboard from './StudyAbroadDashboard';
import AdminDashboard from './AdminDashboard'; // New Import

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  // Role Admin -> Dashboard Trống (Cấu hình)
  if (user?.role === UserRole.ADMIN) {
    return <AdminDashboard />;
  }

  // Role Hợp đồng (Sales Leader) -> Chuyển thẳng vào Dashboard "Morning Coffee"
  if (user?.role === UserRole.SALES_LEADER) {
    return <ContractDashboard />;
  }

  // Role Marketing -> Dashboard Marketing
  if (user?.role === UserRole.MARKETING) {
    return <MarketingDashboard />;
  }

  // Role Kế toán (Finance) -> Dashboard Tài chính / Công nợ
  if (user?.role === UserRole.ACCOUNTANT) {
    return <FinanceDashboard />;
  }

  // Role Đào tạo (Training) -> Redirect to Schedule
  if (user?.role === UserRole.TRAINING) {
    return <Navigate to="/training/schedule" replace />;
  }

  // Role Giáo viên (Teacher) -> Redirect to Document Library
  if (user?.role === UserRole.TEACHER) {
    return <Navigate to="/library" replace />;
  }

  // Role Du học (Study Abroad) -> Dashboard Du học
  if (user?.role === UserRole.STUDY_ABROAD) {
    return <StudyAbroadDashboard />;
  }

  // Mặc định cho Sales Rep, Founder và các role khác là Sales Dashboard
  return <SalesDashboard />;
};

export default Dashboard;
