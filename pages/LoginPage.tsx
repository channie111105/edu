
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import { 
  Shield, 
  Target, 
  Phone, 
  FileText, 
  PiggyBank, 
  GraduationCap, 
  Plane, 
  ArrowRight,
  CheckCircle2,
  BookCheck
} from 'lucide-react';

const LoginRoleCard = ({ 
  role, 
  icon: Icon, 
  title, 
  description, 
  features 
}: { 
  role: UserRole, 
  icon: any, 
  title: string, 
  description: string, 
  features: string[] 
}) => {
  const { login } = useAuth();

  return (
    <button 
      onClick={() => login(role)}
      className="flex flex-col text-left group relative bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-xl hover:border-blue-300 transition-all duration-300 overflow-hidden"
    >
      <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <ArrowRight className="text-blue-600" size={20} />
      </div>
      
      <div className="h-12 w-12 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
        <Icon size={24} />
      </div>
      
      <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-blue-700 transition-colors">{title}</h3>
      <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-3">{description}</p>
      
      <div className="mt-auto space-y-2">
        {features.map((feature, idx) => (
          <div key={idx} className="flex items-start text-xs text-gray-500">
            <CheckCircle2 size={12} className="mr-1.5 mt-0.5 text-gray-400 group-hover:text-blue-500" />
            <span>{feature}</span>
          </div>
        ))}
      </div>
    </button>
  );
};

const LoginPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex flex-col items-center justify-center p-4 sm:p-8 font-sans">
      <div className="w-full max-w-7xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-ula-900 mb-4">
            <span className="text-blue-600">ULA</span> EduCRM
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Hệ thống quản trị tập trung dành cho trung tâm đào tạo & tư vấn du học. 
            Vui lòng chọn phân hệ làm việc để truy cập hệ thống.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* 1. Marketing */}
          <LoginRoleCard 
            role={UserRole.MARKETING}
            icon={Target}
            title="Marketing & Lead"
            description="Phân hệ Marketing"
            features={["Lead ROI Tracking", "SLA Countdown", "Duplicate Match Score"]}
          />

          {/* 2. Sales (Deals) */}
          <LoginRoleCard 
            role={UserRole.SALES_REP}
            icon={Phone}
            title="Sales (Deals)"
            description="Phân hệ Kinh doanh"
            features={["Pipeline 7 bước", "Call/Chat nhanh", "Quote Management"]}
          />

          {/* 3. Contracts (Sales Leader) */}
          <LoginRoleCard 
            role={UserRole.SALES_LEADER}
            icon={FileText}
            title="Contracts & Risk"
            description="Quản lý Hợp đồng"
            features={["E-signature", "Phê duyệt rủi ro", "Phụ lục hợp đồng"]}
          />

          {/* 4. Finance */}
          <LoginRoleCard 
            role={UserRole.ACCOUNTANT}
            icon={PiggyBank}
            title="Finance"
            description="Tài chính & Kế toán"
            features={["Phê duyệt giao dịch", "Invoice tự động", "Refund Management"]}
          />

          {/* 5. Education */}
          <LoginRoleCard 
            role={UserRole.TRAINING}
            icon={GraduationCap}
            title="Education"
            description="Quản lý Đào tạo"
            features={["Bảng điểm tỷ trọng", "Xếp lớp thông minh", "Unlock bài học"]}
          />

          {/* 6. Teacher Portal (NEW FEATURE B) */}
          <LoginRoleCard 
            role={UserRole.TEACHER}
            icon={BookCheck}
            title="Teacher Portal"
            description="Cổng Giáo viên"
            features={["Lịch dạy cá nhân", "Điểm danh nhanh", "Nhập điểm số"]}
          />

          {/* 7. Study Abroad */}
          <LoginRoleCard 
            role={UserRole.STUDY_ABROAD}
            icon={Plane}
            title="Study Abroad"
            description="Hồ sơ Du học"
            features={["Checklist hồ sơ", "Visa Success Rate", "Timeline bay"]}
          />

          {/* 8. System Admin */}
          <LoginRoleCard 
            role={UserRole.ADMIN}
            icon={Shield}
            title="System Admin"
            description="Quản trị hệ thống"
            features={["Ma trận quyền (RBAC)", "Audit Logs", "Webhooks & API"]}
          />
        </div>

        <div className="mt-12 text-center">
          <p className="text-xs text-gray-400">
            © 2024 ULA EduCRM. Powered by React & Gemini AI.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
