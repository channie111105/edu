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
  features: string[];
  onSelectRole: (role: UserRole) => void;
};

const ModuleCard: React.FC<ModuleCardProps> = ({ role, icon: Icon, title, subtitle, features, onSelectRole }) => {
  return (
    <button
      type="button"
      onClick={() => onSelectRole(role)}
      className="group flex h-[185px] flex-col rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700 transition-colors group-hover:bg-blue-600 group-hover:text-white">
        <Icon size={18} />
      </div>

      <h3 className="text-[1.85rem] font-bold leading-tight text-slate-900">{title}</h3>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-blue-600">{subtitle}</p>

      <div className="mt-2 space-y-1.5">
        {features.map((feature) => (
          <div key={feature} className="flex items-center gap-1.5 text-xs text-slate-500">
            <CircleCheck size={12} className="text-slate-400" />
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

  const handleSelectRole = (role: UserRole) => {
    login(role);
    navigate('/');
  };

  return (
    <div className="min-h-screen overflow-y-auto bg-[#eef3f9] px-4 py-6 md:h-screen md:overflow-hidden md:px-8">
      <div className="mx-auto flex h-full w-full max-w-6xl flex-col">
        <header className="mb-5 text-center md:mb-6">
          <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
            <span className="text-blue-600">ULA</span> EduCRM
          </h1>
          <p className="mx-auto mt-2 max-w-2xl text-base text-slate-600 md:text-lg">
            Hệ thống quản trị tập trung dành cho trung tâm đào tạo và tư vấn du học.
            Vui lòng chọn phân hệ làm việc để truy cập hệ thống.
          </p>
        </header>

        <main className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ModuleCard
            role={UserRole.MARKETING}
            icon={Target}
            title="Marketing & Lead"
            subtitle="Phân hệ Marketing"
            features={['Lead ROI Tracking', 'SLA Countdown', 'Duplicate Match Score']}
            onSelectRole={handleSelectRole}
          />

          <ModuleCard
            role={UserRole.SALES_REP}
            icon={Phone}
            title="Sales (Deals)"
            subtitle="Phân hệ Kinh doanh"
            features={['Pipeline 7 bước', 'Call/Chat nhanh', 'Quote Management']}
            onSelectRole={handleSelectRole}
          />

          <ModuleCard
            role={UserRole.SALES_LEADER}
            icon={FileText}
            title="Ghi danh"
            subtitle="Quản lý Ghi danh"
            features={['E-signature', 'Phê duyệt rủi ro', 'Phụ lục hợp đồng']}
            onSelectRole={handleSelectRole}
          />

          <ModuleCard
            role={UserRole.TRAINING}
            icon={GraduationCap}
            title="Education"
            subtitle="Quản lý Đào tạo"
            features={['Bảng điểm tỷ trọng', 'Xếp lớp thông minh', 'Unlock bài học']}
            onSelectRole={handleSelectRole}
          />

          <ModuleCard
            role={UserRole.STUDY_ABROAD}
            icon={Plane}
            title="Study Abroad"
            subtitle="Hồ sơ Du học"
            features={['Checklist hồ sơ', 'Visa Success Rate', 'Timeline bay']}
            onSelectRole={handleSelectRole}
          />

          <ModuleCard
            role={UserRole.ACCOUNTANT}
            icon={PiggyBank}
            title="Finance"
            subtitle="Tài chính & Kế toán"
            features={['Phê duyệt giao dịch', 'Invoice tự động', 'Refund Management']}
            onSelectRole={handleSelectRole}
          />

          <ModuleCard
            role={UserRole.TEACHER}
            icon={Library}
            title="Library & Docs"
            subtitle="Thư viện Tài liệu"
            features={['Quy trình (SOPs)', 'Chính sách nội bộ', 'Biểu mẫu & Văn bản']}
            onSelectRole={handleSelectRole}
          />

          <ModuleCard
            role={UserRole.ADMIN}
            icon={Shield}
            title="System Admin"
            subtitle="Quản trị Hệ thống"
            features={['Ma trận quyền (RBAC)', 'Audit Logs', 'Webhooks & API']}
            onSelectRole={handleSelectRole}
          />
        </main>

        <footer className="mt-4 text-center text-xs text-slate-400 md:mt-3 md:text-sm">
          © 2026 ULA EduCRM. Powered by React & Gemini AI.
        </footer>
      </div>
    </div>
  );
};

export default ModuleSelectionPage;