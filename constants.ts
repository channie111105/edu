
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
  CalendarCheck,
  ClipboardCheck,
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
  FileEdit,
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
  Inbox,         // For My Leads
  ArrowRightLeft // For Transactions
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
      // UserRole.TEACHER, // Removed to hide Dashboard
      UserRole.STUDY_ABROAD,
      // UserRole.SALES_LEADER, // Removed per request
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

  // --- THƯ VIỆN TÀI LIỆU (Mới) ---
  {
    label: 'Thư viện & Quy trình', path: '/library', icon: Library, roles: [
      UserRole.TEACHER,
    ]
  },


  // --- ROLE HỢP ĐỒNG --- (Removed ADMIN)
  { label: 'Tổng quan', path: '/contracts/dashboard', icon: LayoutDashboard, roles: [UserRole.SALES_LEADER] },
  { label: 'Báo giá (Quotations)', path: '/contracts/quotations', icon: Receipt, roles: [UserRole.SALES_LEADER] }, // Remove SALES_REP

  // NEW ENROLLMENT FLOW
  { label: 'Học viên (Students)', path: '/enrollment/students', icon: GraduationCap, roles: [UserRole.SALES_LEADER, UserRole.SALES_REP] },

  { label: 'Quản lý Ghi danh', path: '/contracts', icon: FileSignature, roles: [UserRole.SALES_LEADER] },
  // { label: 'Thư viện Mẫu', path: '/contracts/templates', icon: Files, roles: [UserRole.SALES_LEADER] }, // Removed per request

  // --- ROLE MARKETING --- (Removed ADMIN)
  { label: 'Cơ hội (Leads)', path: '/leads', icon: Users, roles: [UserRole.MARKETING, UserRole.FOUNDER] },
  { label: 'Chiến dịch', path: '/campaigns', icon: Megaphone, roles: [UserRole.MARKETING] },
  { label: 'Cộng tác viên', path: '/marketing/collaborators', icon: Contact2, roles: [UserRole.MARKETING] },
  { label: 'Danh sách Lead (SLA)', path: '/marketing/sla-leads', icon: ListTodo, roles: [UserRole.MARKETING, UserRole.ADMIN] },

  // --- ROLE SALES REP (Updated) ---
  { label: 'My Leads', path: '/sales/my-leads', icon: Inbox, roles: [UserRole.SALES_REP] }, // NEW
  { label: 'My Contacts', path: '/sales/my-contacts', icon: Contact2, roles: [UserRole.SALES_REP] }, // NEW
  { label: 'Pipeline (Kinh doanh)', path: '/pipeline', icon: KanbanSquare, roles: [UserRole.SALES_REP] },

  { label: 'KPIs & Mục tiêu', path: '/sales/kpis', icon: Target, roles: [UserRole.SALES_REP] }, // NEW KPI PAGE 
  { label: 'Lịch hẹn (Test/Visit)', path: '/sales/meetings', icon: CalendarClock, roles: [UserRole.SALES_REP, UserRole.FOUNDER, UserRole.ADMIN] }, // Removed SALES_LEADER and TEACHER 

  // --- ROLE ĐÀO TẠO --- (Removed ADMIN)

  { label: 'Lịch biểu', path: '/training/schedule', icon: CalendarDays, roles: [UserRole.TRAINING] },
  { label: 'Lớp học', path: '/training/classes', icon: BookOpen, roles: [UserRole.TRAINING] },
  { label: 'Giáo viên', path: '/training/teachers', icon: Users, roles: [UserRole.TRAINING] },

  // --- ROLE DU HỌC (STUDY ABROAD) --- (Removed ADMIN)
  { label: 'Danh sách hồ sơ', path: '/study-abroad/students', icon: GraduationCap, roles: [UserRole.STUDY_ABROAD] },
  { label: 'Tiến độ', path: '/study-abroad/pipeline', icon: KanbanSquare, roles: [UserRole.STUDY_ABROAD] },

  { label: 'Lịch Phỏng vấn', path: '/study-abroad/interviews', icon: CalendarClock, roles: [UserRole.STUDY_ABROAD] },
  { label: 'Đối tác Trường', path: '/study-abroad/partners', icon: Building2, roles: [UserRole.STUDY_ABROAD] },

  // --- FINANCE GROUP --- (Removed ADMIN)
  { label: 'Duyệt Giao dịch', path: '/finance/transactions', icon: Receipt, roles: [UserRole.ACCOUNTANT, UserRole.FOUNDER] },
  { label: 'Thu Chi (Transactions)', path: '/finance/transactions-list', icon: ArrowRightLeft, roles: [UserRole.ACCOUNTANT, UserRole.FOUNDER] },
  { label: 'Hóa đơn VAT (e-Invoice)', path: '/finance/invoices', icon: Receipt, roles: [UserRole.ACCOUNTANT] },
  { label: 'Hoàn tiền', path: '/refunds', icon: Undo2, roles: [UserRole.ACCOUNTANT, UserRole.FOUNDER] },

  // Reports & Settings (Removed Admin from business settings)
  { label: 'Báo cáo', path: '/reports', icon: BarChart3, roles: [UserRole.FOUNDER, UserRole.MARKETING] },
  { label: 'Cấu hình', path: '/settings/assignment-rules', icon: Settings, roles: [UserRole.FOUNDER] },
];

export const PIPELINE_STEPS = [
  DealStage.NEW_OPP,
  DealStage.DEEP_CONSULTING,
  DealStage.PROPOSAL,
  DealStage.NEGOTIATION,
  DealStage.WON,
  DealStage.LOST,
  DealStage.AFTER_SALE
];
