
// Các vai trò trong hệ thống ULA
export enum UserRole {
  ADMIN = 'Admin',
  FOUNDER = 'Founder',
  MARKETING = 'Marketing',
  SALES_REP = 'Sales Rep',
  SALES_LEADER = 'Sales Leader',
  ACCOUNTANT = 'Kế toán',
  TRAINING = 'Đào tạo',
  TEACHER = 'Giáo viên', // New Role
  STUDY_ABROAD = 'Du học',
  AGENT = 'Cộng tác viên (B2B)', // New Role
}

// 1. TRẠNG THÁI LEAD (Marketing & Pre-Sales)
export enum LeadStatus {
  NEW = 'Mới',
  ASSIGNED = 'Đã phân bổ',
  CONTACTED = 'Đang liên hệ',
  QUALIFIED = 'Đạt chuẩn', // Đủ điều kiện chuyển đổi sang Deal
  NURTURING = 'Nuôi dưỡng',
  UNREACHABLE = 'Không nghe máy',
  DISQUALIFIED = 'Không đạt', // Rác / Sai số
  CONVERTED = 'Đã chuyển đổi' // Đã sang Deal/Hợp đồng
}

// 2. TRẠNG THÁI// 2. DEAL/PIPELINE
export enum DealStage {
  DEEP_CONSULTING = 'Tư vấn chuyên sâu',
  PROPOSAL = 'Gửi lộ trình & Báo giá',
  NEGOTIATION = 'Thương thảo',
  DOCUMENT_COLLECTION = 'Thu thập hồ sơ',
  WON = 'Chốt thành công (Won)',
  CONTRACT = 'Đặt cọc & Ký hợp đồng',
  LOST = 'Thất bại (Lost)',
}

// 3. HỢP ĐỒNG & TÀI CHÍNH (New)
export enum ContractStatus {
  DRAFT = 'Nháp',
  SENT = 'Đã gửi khách',
  SIGNED = 'Đã ký',
  ACTIVE = 'Đang hiệu lực (Active)',
  COMPLETED = 'Hoàn tất',
  CANCELLED = 'Hủy bỏ'
}

export enum PaymentStatus {
  PENDING = 'Chờ thanh toán',
  PAID = 'Đã thanh toán',
  PARTIAL = 'Thanh toán 1 phần',
  OVERDUE = 'Quá hạn',
  REFUNDED = 'Hoàn tiền'
}

// Mức độ ưu tiên/SLA
export enum SLALevel {
  NORMAL = 'Normal',   // < 5 phút
  WARNING = 'Warning', // 5 - 30 phút
  DANGER = 'Danger',   // > 30 phút
}

export interface IUser {
  id: string;
  name: string;
  role: UserRole;
  avatar: string;
}

// Thông tin chi tiết học viên (Enrichment Data)
export interface IStudentInfo {
  // 1. Định danh bổ sung
  socialLink?: string; // Facebook/Zalo Link

  // 3. Thông tin Chuyên môn (Qualified Criteria)
  targetCountry?: string; // Đức, Úc, Nhật...
  dealType?: 'Combo' | 'Single' | 'Consulting'; // Loại hình Deal

  // 4. Thông tin bổ sung
  dob?: string;
  gender?: 'Nam' | 'Nữ' | 'Khác'; // Added Gender
  school?: string; // Trình độ học vấn / Trường
  languageLevel?: string;
  financialStatus?: string; // Khả năng tài chính
  parentName?: string;
  parentPhone?: string;
}

// Marketing-specific tracking data
export interface IMarketingData {
  batch?: string; // Lô dữ liệu (Batch Name)
  tags?: string[]; // Thẻ phân loại (#HotLead, #VuaTotNghiep, etc.)
  profileLink?: string; // Link Profile (Facebook/TikTok)
  region?: string; // Địa chỉ/Khu vực
  message?: string; // Ghi chú từ Form (Message/Note)
}

// Contact entity - Central hub for customer data
export interface IContact {
  id: string;

  // Core Info (Bắt buộc)
  name: string;
  phone: string; // Unique ID
  targetCountry: string; // Quốc gia mục tiêu

  // Profile Details
  email?: string;
  dob?: string;
  gender?: 'Nam' | 'Nữ' | 'Khác';
  address?: string; // Unified Address
  city?: string;
  district?: string;
  ward?: string;

  // Legal / Identity
  identityCard?: string;
  identityDate?: string;
  identityPlace?: string;

  // Family / Guardian
  guardianName?: string;
  guardianPhone?: string;
  guardianRelation?: string;
  parentName?: string; // Legacy
  parentPhone?: string; // Legacy

  // Additional Info
  school?: string;
  languageLevel?: string;
  financialStatus?: string;
  socialLink?: string;

  // System Info
  ownerId?: string; // Sales Rep phụ trách
  source?: string; // Nguồn gốc
  createdAt: string;
  updatedAt?: string;

  // Linked Data (References)
  dealIds?: string[]; // Danh sách Deal liên quan
  notes?: string; // Ghi chú tổng hợp
  activities?: any[]; // Nhật ký hoạt động (Sync từ Lead)
}

export interface ILead {
  id: string;
  name: string;
  phone: string;
  email: string;

  // 2. Thông tin Phân loại (Marketing)
  source: string;
  campaign?: string; // Chiến dịch

  program: 'Tiếng Đức' | 'Tiếng Trung' | 'Du học Đức' | 'Du học Trung';
  status: LeadStatus | DealStage | string;
  ownerId: string;
  createdAt: string;
  lastInteraction: string;
  notes: string;

  // Lý do thất bại (Bắt buộc khi Disqualified)
  lostReason?: string;

  studentInfo?: IStudentInfo;
  marketingData?: IMarketingData; // Marketing-specific tracking data

  // Additional fields for UI/Logic compatibility
  score?: number;
  slaStatus?: 'normal' | 'warning' | 'danger';
  lastActivityDate?: string;

  // 3. Deal & Revenue Info (Persisted)
  value?: number;
  probability?: number;
  product?: string;
  contractCode?: string;
  contractDate?: string;
  installments?: string;

  // New Fields for All-in-One Form
  targetCountry?: string; // Đức, Úc, Nhật
  educationLevel?: string; // Trình độ học vấn (Highest Degree)
  testScore?: number;

  // 1. Identity Extended
  dob?: string;
  gender?: 'Nam' | 'Nữ' | 'Khác';
  address?: string; // Street Address
  city?: string;
  district?: string;
  ward?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianRelation?: string;

  // 2. Capability Extended
  currentEducationStatus?: string; // Đang học 12, Đã tốt nghiệp...
  gpa?: number;

  // 3. Legal Info (CRITICAL for Contract)
  identityCard?: string; // CCCD
  identityDate?: string;
  identityPlace?: string;
  contractSigner?: 'student' | 'guardian'; // Người ký

  // Quotation Details
  productItems?: {
    id: string;
    name: string;
    price: number;
    quantity: number;
  }[];
  discount?: number;
  discountReason?: string;
  paymentRoadmap?: string; // Lộ trình đóng phí dự kiến

  // Closing Conditions
  expectedClosingDate?: string;
  closingNotes?: string;

  // 4. Audit Trail / Activities (Persisted)
  activities?: IActivityLog[];

  // 5. Followers
  followers?: IFollower[];
}

export interface IFollower {
  id: string; // User ID
  name: string;
  avatar?: string;
  isOwner?: boolean; // Is the main Sales Rep?
  addedAt: string;
}

export interface IActivityLog {
  id: string;
  type: 'note' | 'message' | 'system' | 'activity';
  timestamp: string;
  title: string;
  description: string;
  user: string;
}

// --- SALES ENTITIES ---

export interface IProductItem {
  id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  discount: number;
  total: number;
  type: 'Service' | 'Course' | 'Combo';
}

export interface IQuote {
  id: string;
  code: string;
  version: number;
  status: 'Draft' | 'Sent' | 'Accepted' | 'Rejected';
  totalAmount: number;
  createdAt: string;
  validUntil: string;
  fileUrl?: string;
}

export type ActivityType = 'call' | 'email' | 'chat' | 'meeting' | 'note' | 'document';

export interface Activity {
  id: string;
  type: ActivityType;
  timestamp: string;
  title: string;
  description: string;
  duration?: string;
  attachments?: string[];
  status?: 'completed' | 'scheduled' | 'cancelled';
}

export interface IDeal {
  id: string;
  leadId: string; // Link back to Lead/Contact
  title: string; // Tên Deal (Ví dụ: Combo Đức A1-B1)
  value: number; // Giá trị dự kiến
  stage: DealStage;
  ownerId: string;
  expectedCloseDate: string;
  products: string[]; // Danh sách sản phẩm (Simple list for summary)
  probability: number; // Tỷ lệ chốt (%)
  createdAt?: string;
  activities?: Activity[]; // Nhật ký hoạt động
  productItems?: {
    id: string;
    name: string;
    price: number;
    quantity: number;
  }[];
  discount?: number;
  paymentRoadmap?: string; // Lộ trình đóng phí
}


// Entity: Hợp đồng
export interface IContract {
  id: string;
  code: string; // Mã HĐ (VD: HĐ-2023-001)
  dealId: string;
  customerName: string;
  totalValue: number;
  paidValue: number;
  status: ContractStatus;
  signedDate?: string;
  fileUrl?: string;
  createdBy: string; // Sales Rep tạo
  paymentPlanId?: string;
  // Identity Fields (Bê từ Lead sang)
  cccdNumber?: string;
  identityDate?: string;
  identityPlace?: string;
  address?: string;
}

// Entity: Đợt thanh toán (Installment)
export interface IInstallment {
  id: string;
  contractId: string;
  name: string; // Đợt 1, Đợt 2...
  dueDate: string;
  amount: number;
  paidAmount: number;
  status: PaymentStatus;
  unlockCondition?: string; // Điều kiện mở khóa (VD: Mở lớp A1)
  note?: string;
}

// Entity: Giao dịch thực tế
export interface ITransaction {
  id: string;
  installmentId: string;
  amount: number;
  date: string;
  method: 'Transfer' | 'Cash';
}

export interface AIAnalysisResult {
  sentiment: string;
  actionableAdvice: string;
  suggestedEmail: string;
  score: number;
}
