import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CircleCheck,
  FileText,
  GraduationCap,
  Library,
  Phone,
  PiggyBank,
  Plane,
  Shield,
  Target,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';

type ModuleCardProps = {
  role: UserRole;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  features: readonly string[];
  onSelectRole: (role: UserRole) => void;
};

type ModuleKey = 'marketing' | 'sales' | 'enrollment' | 'training' | 'studyAbroad' | 'finance' | 'library' | 'admin';

const MODULE_COPY = {
  vi: {
    description: 'Hệ thống quản trị tập trung dành cho trung tâm đào tạo và tư vấn du học. Vui lòng chọn phân hệ làm việc để truy cập hệ thống.',
    footer: '© 2024 ULA EduCRM. Powered by React & Gemini AI.',
    modules: {
      marketing: { title: 'Marketing & Lead', subtitle: 'Phân hệ Marketing', features: ['Lead ROI Tracking', 'SLA Countdown', 'Duplicate Match Score'] },
      sales: { title: 'Sales (Deals)', subtitle: 'Phân hệ Kinh doanh', features: ['Pipeline 7 bước', 'Call/Chat nhanh', 'Quote Management'] },
      enrollment: { title: 'Ghi danh', subtitle: 'Quản lý Ghi danh', features: ['E-signature', 'Phê duyệt rủi ro', 'Phụ lục hợp đồng'] },
      training: { title: 'Education', subtitle: 'Quản lý Đào tạo', features: ['Bảng điểm tỷ trọng', 'Xếp lớp thông minh', 'Unlock bài học'] },
      studyAbroad: { title: 'Study Abroad', subtitle: 'Hồ sơ Du học', features: ['Checklist hồ sơ', 'Visa Success Rate', 'Timeline bay'] },
      finance: { title: 'Finance', subtitle: 'Tài chính & Kế toán', features: ['Phê duyệt giao dịch', 'Invoice tự động', 'Refund Management'] },
      library: { title: 'Library & Docs', subtitle: 'Thư viện Tài liệu', features: ['Quy trình (SOPs)', 'Chính sách nội bộ', 'Biểu mẫu & Văn bản'] },
      admin: { title: 'System Admin', subtitle: 'Quản trị Hệ thống', features: ['Ma trận quyền (RBAC)', 'Audit Logs', 'Webhooks & API'] },
    },
  },
  en: {
    description: 'A centralized management system for education centers and study-abroad consulting. Choose a workspace module to access the system.',
    footer: '© 2024 ULA EduCRM. Powered by React & Gemini AI.',
    modules: {
      marketing: { title: 'Marketing & Lead', subtitle: 'Marketing Workspace', features: ['Lead ROI Tracking', 'SLA Countdown', 'Duplicate Match Score'] },
      sales: { title: 'Sales (Deals)', subtitle: 'Sales Workspace', features: ['7-step Pipeline', 'Quick Call/Chat', 'Quote Management'] },
      enrollment: { title: 'Enrollment', subtitle: 'Enrollment Management', features: ['E-signature', 'Risk Approval', 'Contract Appendices'] },
      training: { title: 'Education', subtitle: 'Training Management', features: ['Weighted Gradebook', 'Smart Class Placement', 'Lesson Unlock'] },
      studyAbroad: { title: 'Study Abroad', subtitle: 'Study Abroad Cases', features: ['Document Checklist', 'Visa Success Rate', 'Flight Timeline'] },
      finance: { title: 'Finance', subtitle: 'Finance & Accounting', features: ['Transaction Approval', 'Automated Invoices', 'Refund Management'] },
      library: { title: 'Library & Docs', subtitle: 'Document Library', features: ['Process SOPs', 'Internal Policies', 'Forms & Documents'] },
      admin: { title: 'System Admin', subtitle: 'System Administration', features: ['RBAC Matrix', 'Audit Logs', 'Webhooks & API'] },
    },
  },
} as const;

const MODULE_OPTIONS: Array<{ key: ModuleKey; role: UserRole; icon: LucideIcon }> = [
  { key: 'marketing', role: UserRole.MARKETING, icon: Target },
  { key: 'sales', role: UserRole.SALES_REP, icon: Phone },
  { key: 'enrollment', role: UserRole.SALES_LEADER, icon: FileText },
  { key: 'training', role: UserRole.TRAINING, icon: GraduationCap },
  { key: 'studyAbroad', role: UserRole.STUDY_ABROAD, icon: Plane },
  { key: 'finance', role: UserRole.ACCOUNTANT, icon: PiggyBank },
  { key: 'library', role: UserRole.TEACHER, icon: Library },
  { key: 'admin', role: UserRole.ADMIN, icon: Shield },
];

const ModuleCard: React.FC<ModuleCardProps> = ({ role, icon: Icon, title, subtitle, features, onSelectRole }) => {
  return (
    <button
      type="button"
      onClick={() => onSelectRole(role)}
      className="group flex flex-col rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md lg:p-[1.125rem]"
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 transition-colors group-hover:bg-blue-600 group-hover:text-white lg:mb-2.5 lg:h-10 lg:w-10">
        <Icon size={18} />
      </div>

      <h3 className="text-[1.08rem] font-bold text-slate-900 lg:text-[1.08rem]">{title}</h3>
      <p className="mt-1.5 text-xs font-semibold uppercase tracking-wide text-blue-600">{subtitle}</p>

      <div className="mt-3 space-y-1.5 lg:mt-2.5 lg:space-y-1.5">
        {features.map((feature) => (
          <div key={feature} className="flex items-center gap-2 text-[13px] leading-5 text-slate-500 lg:text-[13px] lg:leading-5">
            <CircleCheck size={14} className="text-slate-400" />
            <span>{feature}</span>
          </div>
        ))}
      </div>
    </button>
  );
};

const ModuleSelectionPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const copy = MODULE_COPY.vi;

  const handleSelectRole = (role: UserRole) => {
    login(role);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#eef3f9] px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-5">
      <div className="mx-auto flex w-full max-w-[84rem] flex-col lg:min-h-[calc(100vh-2.5rem)] lg:justify-center">
        <header className="mb-5 text-center lg:mb-6">
          <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl lg:text-[2.35rem]">
            <span className="text-blue-600">ULA</span> EduCRM
          </h1>
          <p className="mx-auto mt-3 max-w-3xl text-base text-slate-600 sm:text-lg lg:mt-2 lg:max-w-2xl lg:text-base">
            {copy.description}
          </p>
        </header>

        <main className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {MODULE_OPTIONS.map((moduleOption) => {
            const moduleCopy = copy.modules[moduleOption.key];

            return (
              <ModuleCard
                key={moduleOption.key}
                role={moduleOption.role}
                icon={moduleOption.icon}
                title={moduleCopy.title}
                subtitle={moduleCopy.subtitle}
                features={moduleCopy.features}
                onSelectRole={handleSelectRole}
              />
            );
          })}
        </main>

        <footer className="mt-6 text-center text-xs text-slate-400 sm:text-sm lg:mt-5">
          {copy.footer}
        </footer>
      </div>
    </div>
  );
};

export default ModuleSelectionPage;
