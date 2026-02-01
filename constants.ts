
import { UserRole, LeadStatus, DealStage } from './types';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  Plane, 
  BarChart3, 
  Settings,
  KanbanSquare, 
  Megaphone, 
  LineChart, 
  Target, 
  FileSignature, 
  Files, 
  Undo2, 
  Receipt, 
  BookOpen, 
  CalendarDays, 
  ClipboardList,
  Star,
  Award,
  Library,
  ListPlus,
  Smartphone,
  Zap,
  BookCheck,
  Globe,
  Building2,
  CalendarClock,
  Landmark,
  Home,
  Network,
  Ticket,
  Link,
  Shield,
  Database,
  SlidersHorizontal,
  UserCog,
  ScrollText,
  Mail,
  Merge,
  Tag,
  CreditCard,
  Lock,
  PenTool,     // Custom Fields
  FormInput,   // Form Builder
  GitGraph,    // Workflow
  ListTodo,     // New Icon
  Contact2,     // For Contacts
  Inbox         // For My Leads
} from 'lucide-react';

export const APP_NAME = "EduCRM";

export const SLA_CONFIG = {
  WARNING_THRESHOLD_MINUTES: 5,
  DANGER_THRESHOLD_MINUTES: 30,
};

export const MOCK_USER = {
  id: 'u1',
  name: 'Trần Văn Quản Trị',
  role: UserRole.ADMIN, // Giả lập đang login với quyền Admin
  avatar: 'https://picsum.photos/200',
};

export const NAV_ITEMS = [
  // Dashboard chung (Giữ lại cho Admin để vào trang Welcome)
  { 
    label: 'Tổng quan', 
    path: '/', 
    icon: LayoutDashboard, 
    roles: [
      UserRole.ADMIN, 
      UserRole.FOUNDER, 
      UserRole.SALES_REP,
      UserRole.MARKETING, 
      UserRole.ACCOUNTANT,
      UserRole.TRAINING,
      UserRole.TEACHER, 
      UserRole.STUDY_ABROAD,
      UserRole.SALES_LEADER,
      UserRole.AGENT
    ] 
  },
  
  // --- ROLE ADMIN ---
  { label: 'Quản lý Người dùng', path: '/admin/users', icon: UserCog, roles: [UserRole.ADMIN] },
  { label: 'Cấu hình Dữ liệu', path: '/admin/system-config', icon: Database, roles: [UserRole.ADMIN] },
  
  // Advanced Tools (New Phase 2)
  { label: 'Trường Tùy chỉnh', path: '/admin/custom-fields', icon: PenTool, roles: [UserRole.ADMIN] },
  { label: 'Trình tạo Form', path: '/admin/form-builder', icon: FormInput, roles: [UserRole.ADMIN] },
  { label: 'Workflow (Visual)', path: '/admin/workflow-builder', icon: GitGraph, roles: [UserRole.ADMIN] },

  { label: 'Tự động hóa (Rule)', path: '/admin/automation', icon: SlidersHorizontal, roles: [UserRole.ADMIN] },
  
  // Existing Admin Features
  { label: 'Mẫu Thông báo', path: '/admin/templates', icon: Mail, roles: [UserRole.ADMIN] },
  { label: 'Luật Chống trùng', path: '/admin/dedup-rules', icon: Merge, roles: [UserRole.ADMIN] },
  { label: 'Chính sách Giá', path: '/admin/pricing', icon: Tag, roles: [UserRole.ADMIN] },
  { label: 'Mẫu Lộ trình Phí', path: '/admin/payment-templates', icon: CreditCard, roles: [UserRole.ADMIN] },
  { label: 'Mapping Dịch vụ', path: '/finance/rules', icon: Lock, roles: [UserRole.ADMIN] }, 

  { label: 'Nhật ký Hệ thống', path: '/admin/audit-logs', icon: ScrollText, roles: [UserRole.ADMIN] },
  { label: 'Tích hợp & API', path: '/admin/integrations', icon: Link, roles: [UserRole.ADMIN] },
  { label: 'Phân quyền (RBAC)', path: '/admin/permissions', icon: Shield, roles: [UserRole.ADMIN] },

  // --- ROLE TEACHER ---
  { label: 'Lớp của tôi', path: '/teacher/classes', icon: BookCheck, roles: [UserRole.TEACHER] },
  { label: 'Lịch dạy', path: '/teacher/schedule', icon: CalendarDays, roles: [UserRole.TEACHER] },

  // --- ROLE HỢP ĐỒNG --- (Removed ADMIN)
  { label: 'Quản lý Hợp đồng', path: '/contracts', icon: FileSignature, roles: [UserRole.SALES_LEADER] },
  { label: 'Thư viện Mẫu', path: '/contracts/templates', icon: Files, roles: [UserRole.SALES_LEADER] },

  // --- ROLE MARKETING --- (Removed ADMIN)
  { label: 'Cơ hội (Leads)', path: '/leads', icon: Users, roles: [UserRole.MARKETING, UserRole.FOUNDER] },
  { label: 'Chiến dịch', path: '/campaigns', icon: Megaphone, roles: [UserRole.MARKETING] },
  { label: 'Sự kiện (Events)', path: '/marketing/events', icon: Ticket, roles: [UserRole.MARKETING] }, 
  
  // --- ROLE SALES REP (Updated) ---
  { label: 'My Leads', path: '/sales/my-leads', icon: Inbox, roles: [UserRole.SALES_REP] }, // NEW
  { label: 'My Contacts', path: '/sales/my-contacts', icon: Contact2, roles: [UserRole.SALES_REP] }, // NEW
  { label: 'Pipeline (Kinh doanh)', path: '/pipeline', icon: KanbanSquare, roles: [UserRole.SALES_REP] },
  { label: 'Danh sách Lead (SLA)', path: '/sales/sla-leads', icon: ListTodo, roles: [UserRole.SALES_REP] }, 

  // --- ROLE ĐÀO TẠO --- (Removed ADMIN)
  { label: 'Danh mục Khóa', path: '/training/courses', icon: Library, roles: [UserRole.TRAINING] }, 
  { label: 'Xếp lớp (Waitlist)', path: '/training/enrollment', icon: ListPlus, roles: [UserRole.TRAINING] }, 
  { label: 'Lớp học', path: '/training/classes', icon: BookOpen, roles: [UserRole.TRAINING] },
  { label: 'Thời khóa biểu', path: '/training/schedule', icon: CalendarDays, roles: [UserRole.TRAINING] },
  { label: 'Tự động hóa', path: '/training/automation', icon: Zap, roles: [UserRole.TRAINING] },
  { label: 'Học viên', path: '/training/students', icon: GraduationCap, roles: [UserRole.TRAINING] },
  { label: 'Đánh giá GV', path: '/training/feedback', icon: Star, roles: [UserRole.TRAINING] },
  { label: 'Chứng chỉ', path: '/training/certificates', icon: Award, roles: [UserRole.TRAINING] },

  // --- ROLE DU HỌC (STUDY ABROAD) --- (Removed ADMIN)
  { label: 'Tổng quan Du học', path: '/study-abroad', icon: Plane, roles: [UserRole.STUDY_ABROAD] },
  { label: 'Quy trình Hồ sơ', path: '/study-abroad/pipeline', icon: KanbanSquare, roles: [UserRole.STUDY_ABROAD] },
  { label: 'Hoa hồng & Invoice', path: '/study-abroad/finance', icon: Landmark, roles: [UserRole.STUDY_ABROAD, UserRole.ACCOUNTANT] }, 
  { label: 'Dịch vụ Sau bay', path: '/study-abroad/services', icon: Home, roles: [UserRole.STUDY_ABROAD] }, 
  { label: 'Lịch Phỏng vấn', path: '/study-abroad/interviews', icon: CalendarClock, roles: [UserRole.STUDY_ABROAD] },
  { label: 'Đối tác Trường', path: '/study-abroad/partners', icon: Building2, roles: [UserRole.STUDY_ABROAD] },
  { label: 'Cộng tác viên (B2B)', path: '/study-abroad/agents', icon: Network, roles: [UserRole.STUDY_ABROAD, UserRole.AGENT] }, 
  
  // --- FINANCE GROUP --- (Removed ADMIN)
  { label: 'Duyệt Giao dịch', path: '/finance/transactions', icon: Receipt, roles: [UserRole.ACCOUNTANT, UserRole.FOUNDER] },
  { label: 'Hoàn tiền', path: '/refunds', icon: Undo2, roles: [UserRole.ACCOUNTANT, UserRole.FOUNDER] },

  // Reports & Settings (Removed Admin from business settings)
  { label: 'Báo cáo', path: '/reports', icon: BarChart3, roles: [UserRole.FOUNDER, UserRole.MARKETING] }, 
  { label: 'Cấu hình', path: '/settings/assignment-rules', icon: Settings, roles: [UserRole.FOUNDER] },
];

export const PIPELINE_STEPS = [
  DealStage.NEEDS_DISCOVERY,
  DealStage.CONSULTATION,
  DealStage.OFFER_SENT,
  DealStage.FOLLOW_UP,
  DealStage.NEGOTIATION,
  DealStage.WON,
  DealStage.LOST
];
