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
  PICKED = 'Đã nhận',
  CONTACTED = 'Đang liên hệ',
  CONVERTED = 'Đã chuyển đổi',
  QUALIFIED = 'Đạt chuẩn', // Đủ điều kiện chuyển đổi sang Deal
  NURTURING = 'Nuôi dưỡng',
  UNREACHABLE = 'Không nghe máy',
  UNVERIFIED = 'Không xác thực',
  DISQUALIFIED = 'Không đạt', // Rác / Sai số
  LOST = 'Mất'
}

// 2. TRẠNG THÁI// 2. DEAL/PIPELINE
export enum DealStage {
  NEW_OPP = 'New Opp',
  DEEP_CONSULTING = 'Tư vấn chuyên sâu',
  PROPOSAL = 'Gửi lộ trình & Báo giá',
  NEGOTIATION = 'Thương thảo',
  DOCUMENT_COLLECTION = 'Thu thập hồ sơ',
  WON = 'Chốt thành công (Won)',
  CONTRACT = 'Đặt cọc & Ký hợp đồng',
  LOST = 'Thất bại (Lost)',
  AFTER_SALE = 'After sale',
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

export interface ISalesTeamMember {
  userId: string;
  name: string;
  role?: string;
  branch?: string;
}

export interface ISalesTeam {
  id: string;
  name: string;
  branch: string;
  productFocus: string;
  assignKeywords: string[];
  members: ISalesTeamMember[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ISalesKpiTarget {
  id: string;
  period: string;
  ownerId: string;
  ownerName: string;
  teamId: string;
  teamName: string;
  branch: string;
  targetRevenue: number;
  targetContracts: number;
  createdAt: string;
  updatedAt: string;
}

// Thông tin chi tiết học viên (Enrichment Data)
export interface IStudentInfo {
  // 1. Định danh bổ sung
  socialLink?: string; // Facebook/Zalo Link
  studentName?: string;
  studentPhone?: string;
  identityCard?: string;

  // 3. Thông tin Chuyên môn (Qualified Criteria)
  targetCountry?: string; // Đức, Úc, Nhật...
  dealType?: 'Combo' | 'Single' | 'Consulting'; // Loại hình Deal

  // 4. Thông tin bổ sung
  dob?: string;
  gender?: 'Nam' | 'Nữ' | 'Khác'; // Added Gender
  school?: string; // Tên trường học
  educationLevel?: string; // Trình độ học vấn
  languageLevel?: string;
  financialStatus?: string; // Khả năng tài chính
  parentName?: string;
  parentPhone?: string;
}

// Marketing-specific tracking data
export interface IMarketingData {
  source?: string; // Legacy/source field used by lead edit flows
  batch?: string; // Lô dữ liệu (Batch Name)
  tags?: string[]; // Thẻ phân loại (#HotLead, #VuaTotNghiep, etc.)
  profileLink?: string; // Link Profile (Facebook/TikTok)
  region?: string; // Địa chỉ/Khu vực
  message?: string; // Ghi chú từ Form (Message/Note)
  campaign?: string; // Chiến dịch Marketing
  channel?: string; // Kênh phát sinh lead
  medium?: string; // Kênh Marketing (CPC, Organic, Social, etc.)
  market?: string; // Thị trường (Miền Bắc, Miền Nam, Sinh viên, etc.)
}

// Contact entity - Central hub for customer data
export interface IContact {
  id: string;
  leadId?: string;

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
  studentName?: string;
  studentPhone?: string;
  school?: string;
  educationLevel?: string;
  languageLevel?: string;
  financialStatus?: string;
  socialLink?: string;
  company?: string;
  job?: string;
  title?: string;
  website?: string;
  mobile?: string;
  venue?: string;
  emailScore?: number;
  emailBounced?: boolean;
  contactType?: 'individual' | 'company';

  // System Info
  ownerId?: string; // Sales Rep phụ trách
  source?: string; // Nguồn gốc
  createdAt: string;
  updatedAt?: string;

  // Linked Data (References)
  dealIds?: string[]; // Danh sách Deal liên quan
  notes?: string; // Ghi chú tổng hợp
  activities?: any[]; // Nhật ký hoạt động (Sync từ Lead)
  marketingData?: IMarketingData;
}

export interface ILead {
  id: string;
  name: string;
  phone: string;
  email: string;

  // 2. Thông tin Phân loại (Marketing)
  source: string;
  campaign?: string; // Chiến dịch

  program: 'Tiếng Đức' | 'Tiếng Trung' | 'Du học Đức' | 'Du học Trung' | 'Du học nghề Úc';
  status: LeadStatus | DealStage | string;
  ownerId: string;
  createdAt: string;
  updatedAt?: string;
  lastInteraction: string;
  closedAt?: string;
  notes: string;
  company?: string;
  title?: string;
  referredBy?: string;

  // Lý do thất bại (Bắt buộc khi Disqualified)
  lostReason?: string;

  studentInfo?: IStudentInfo;
  marketingData?: (IMarketingData & { tags?: string[] | string }); // Marketing-specific tracking data

  // Additional fields for UI/Logic compatibility
  score?: number;
  pickUpDate?: string;
  slaStatus?: 'normal' | 'warning' | 'danger';
  slaReason?: string; // Lý do cảnh báo SLA
  lastActivityDate?: string;
  reclaimedAt?: string;
  reclaimReason?: 'picked_no_action' | 'slow_care';
  reclaimTriggerAt?: string;
  reclaimedFromOwnerId?: string;

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
  auditLogs?: ILeadAuditLog[];

  // 5. Followers
  followers?: IFollower[];

  // 6. Internal Notes (Structured)
  internalNotes?: {
    expectedStart?: string;
    parentOpinion?: string;
    financial?: string;
    potential?: 'Nóng' | 'Tiềm năng' | 'Tham khảo';
  };
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
  // Extended for SLA tracking
  status?: 'scheduled' | 'completed' | 'cancelled';
  datetime?: string;
}

export interface ILeadAuditFieldChange {
  field: string;
  label?: string;
  before?: string;
  after?: string;
}

export interface ILeadAuditLog {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  actorType: 'user' | 'system';
  changes: ILeadAuditFieldChange[];
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
  leadId: string; // Link back to Contact hoặc Lead gốc khi không liên kết khách hàng
  customerLinkMode?: 'linked_contact' | 'no_contact';
  title: string; // Tên Deal (Ví dụ: Combo Đức A1-B1)
  value: number; // Giá trị dự kiến
  stage: DealStage;
  ownerId: string;
  expectedCloseDate: string;
  products: string[]; // Danh sách sản phẩm (Simple list for summary)
  probability: number; // Tỷ lệ chốt (%)
  createdAt?: string;
  leadCreatedAt?: string;
  assignedAt?: string;
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
  dealId?: string;
  quotationId?: string;
  customerId?: string;
  studentId?: string;
  customerName: string;
  totalValue: number;
  paidValue: number;
  status: ContractStatus;
  signedDate?: string;
  fileUrl?: string;
  createdBy: string; // Sales Rep tạo
  paymentPlanId?: string;
  templateName?: string;
  templateFields?: Record<string, string>;
  importedAt?: string;
  importedBy?: string;
  // Identity Fields (Bê từ Lead sang)
  cccdNumber?: string;
  identityDate?: string;
  identityPlace?: string;
  address?: string;
  leadId?: string;
  quotationLineItemId?: string;
  payerName?: string;
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
  code?: string;
  quotationId: string;
  soCode: string;
  installmentTermId?: string;
  installmentTermNo?: number;
  installmentLabel?: string;
  customerId: string;
  studentName?: string;
  relatedEntityLabel?: string;
  recipientPayerName?: string;
  amount: number;
  method: 'CHUYEN_KHOAN' | 'TIEN_MAT' | 'THE' | 'OTHER';
  proofType?: 'UNC' | 'PHIEU_THU' | 'NONE';
  proofFiles?: { id: string; name: string; url: string }[];
  bankRefCode?: string;
  status: 'DRAFT' | 'CHO_DUYET' | 'DA_DUYET' | 'TU_CHOI';
  paidAt?: number;
  createdAt: number;
  approvedAt?: number;
  adminApprovedAt?: number;
  adminApprovedBy?: string;
  adminLockedQuotation?: boolean;
  rejectedAt?: number;
  createdBy: string;
  businessGroupHint?: 'THU' | 'CHI' | 'DIEU_CHINH';
  businessTypeHint?: string;
  note?: string;
}

export interface AIAnalysisResult {
  sentiment: string;
  actionableAdvice: string;
  suggestedEmail: string;
  score: number;
}

export enum MeetingStatus {
  DRAFT = 'Draft', // Mới tạo
  CONFIRMED = 'Confirmed', // Đã xác nhận/Khách đến
  SUBMITTED = 'Submitted', // Đã có kết quả
  CANCELLED = 'Cancelled' // Hủy
}

export enum MeetingType {
  ONLINE = 'Online Interview',
  OFFLINE = 'Offline Test',
  CONSULTING = 'Consulting'
}

export interface IMeeting {
  id: string;
  title: string;
  leadId: string; // Link lead
  leadName: string;
  leadPhone: string;
  salesPersonId: string;
  salesPersonName: string;
  campus?: string; // Cơ sở
  address?: string; // Địa chỉ khách hàng

  datetime: string;
  type: MeetingType;
  status: MeetingStatus;

  // Test info
  teacherId?: string;
  teacherName?: string;
  notes?: string; // Ghi chú ban đầu

  // Result
  result?: string; // Kết quả/Điểm số
  resultFile?: string; // File kết quả
  feedback?: string; // Đánh giá chi tiết

  createdAt: string;
}

export enum StudentStatus {
  ADMISSION = 'Chưa ghi danh', // From Sale Order (Locked)
  ENROLLED = 'Đã ghi danh',   // Confirmed by Training
  RESERVED = 'Bảo lưu',
  DROPPED = 'Thôi học',
  DONE = 'Hoàn thành'
}

export interface IStudent {
  id: string;
  code: string; // HV-2023-001
  name: string;
  gender?: 'Nam' | 'Nữ' | 'Khác';
  dob?: string;
  phone: string;
  email?: string;
  address?: string;
  guardianName?: string;
  guardianPhone?: string;

  // Link back to Sales
  dealId?: string;
  soId?: string; // Quotation (SO) ID
  salesPersonId?: string;
  customerId?: string;
  leadId?: string;
  quotationLineItemId?: string;
  payerName?: string;

  // Academic Info
  campus: string;
  classId?: string; // Official Class
  className?: string;
  admissionDate?: string; // Ngày nhập học
  level?: string; // A1, A2...

  status: StudentStatus;
  enrollmentStatus?: 'CHUA_GHI_DANH' | 'DA_GHI_DANH';

  // Metadata
  profileImage?: string;
  note?: string;
  createdAt: string;
}

export type StudentClaimType = 'KHONG_CO' | 'CHUYEN_LOP' | 'TAM_DUNG' | 'BAO_LUU' | 'HOC_LAI' | 'KHAC';
export type StudentClaimStatus = 'KHONG_CO' | 'CHO_XU_LY' | 'DA_XU_LY' | 'TU_CHOI' | 'DA_HUY';

export interface IStudentClaim {
  id: string;
  studentId: string;
  claimType: StudentClaimType;
  claimStatus: StudentClaimStatus;
  reason?: string;
  note?: string;
  assignedDepartment?: string;
  detail?: string;
  requestedDate?: string;
  expectedReturnDate?: string;
  reserveUntilDate?: string;
  currentClassId?: string;
  currentClassCode?: string;
  proposedClassId?: string;
  proposedClassCode?: string;
  resolvedClassId?: string;
  resolvedClassCode?: string;
  levelOrSubject?: string;
  effectiveDate?: string;
  resultNote?: string;
  policyNote?: string;
  keepFeeConfirmed?: boolean;
  keepSlot?: boolean;
  affectsStudentStatus?: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface IAdmission {
  id: string;
  code: string;
  studentId: string;
  quotationId?: string;
  classId: string;
  campusId: string;
  status: 'DRAFT' | 'CHO_DUYET' | 'DA_DUYET' | 'TU_CHOI';
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  note?: string;
}

export interface IClassStudent {
  id: string;
  classId: string;
  studentId: string;
  status: 'ACTIVE' | 'BAO_LUU' | 'NGHI_HOC';
  studentStatus?: 'ACTIVE' | 'BAO_LUU' | 'NGHI_HOC';
  debtStatus?: 'DA_DONG' | 'THIEU' | 'QUA_HAN';
  debtTerms?: IDebtTerm[];
  nearestDueDate?: string;
  totalDebt?: number;
  startDate?: string;
  createdAt: number;
}

export type ClassStatus = 'DRAFT' | 'ACTIVE' | 'DONE' | 'CANCELED';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE';

export interface IClassSession {
  id: string;
  classId: string;
  date: string; // 'YYYY-MM-DD' hoặc ISO string
  title?: string;
  order: number;
  isHeld?: boolean;
}

export interface IAttendanceRecord {
  id: string;
  classId: string;
  studentId: string;
  sessionId: string;
  status: AttendanceStatus;
  updatedAt: number;
  updatedBy: string;
}

export interface IStudyNote {
  id: string;
  classId: string;
  studentId: string;
  sessionId: string;
  note: string;
  createdAt: number;
  createdBy: string;
  updatedAt?: number;
  updatedBy?: string;
}

export type NormalizedStatus = 'UNPROCESSED' | 'PROCESSING' | 'DEPARTED';

export type CaseRecord = {
  id: string;
  country?: string | null;
  program?: string | null;
  status: NormalizedStatus;
  createdAt?: string;
  branchId?: string;
};

export type CaseStatusBreakdown = {
  unprocessed: number;
  processing: number;
  departed: number;
};

export type CountryCaseStat = { country: string } & CaseStatusBreakdown;
export type ProgramCaseStat = { program: string } & CaseStatusBreakdown;

export type DashboardCaseStats = {
  byCountry: CountryCaseStat[];
  byProgram: ProgramCaseStat[];
};

export type DashboardFilters = {
  dateRange?: { from: string; to: string };
  branchId?: string | 'all';
};

export interface ITrainingClass {
  id: string;
  code: string;
  name: string;
  campus?: string;
  room?: string;
  schedule?: string;
  studyDays?: number[];
  timeSlot?: string;
  language?: string;
  level?: string;
  classType?: 'Online' | 'Offline' | 'App';
  maxStudents?: number;
  startDate?: string;
  endDate?: string;
  status: ClassStatus;
  teacherId?: string;
}

export interface IDebtTerm {
  termNo: number;
  dueDate: string;
  amount: number;
  status: 'PAID' | 'UNPAID' | 'OVERDUE';
}

export interface IStudentScore {
  id: string;
  classId: string;
  studentId: string;
  assignment?: number;
  midterm?: number;
  final?: number;
  average?: number;
  rank?: 'A' | 'B' | 'C' | 'D';
  updatedAt: number;
}

export interface ITeacher {
  id: string;
  code: string;
  fullName: string;
  phone: string;
  dob?: string;
  birthYear?: number;
  email?: string;
  address?: string;
  contractType: 'Full-time' | 'Part-time' | 'CTV';
  contractNote?: string;
  startDate: string;
  teachSubjects: string[];
  teachLevels: string[];
  certificates: string[];
  status: 'ACTIVE' | 'INACTIVE';
  assignedClassIds: string[];
  attachments?: IAttachmentFile[];
  createdAt: string;
  updatedAt?: string;
}

export interface IAttachmentFile {
  id: string;
  name: string;
  url?: string;
}

export interface ILogNote {
  id: string;
  entityType: 'TEACHER' | 'CLASS' | 'STUDENT';
  entityId: string;
  action: string;
  message: string;
  createdAt: string;
  createdBy: string;
  category?: 'SYSTEM' | 'USER';
}

export enum QuotationStatus {
  DRAFT = 'New Quote',
  SENT = 'Quotation Sent',
  SALE_CONFIRMED = 'Sale Confirmed',
  SALE_ORDER = 'Sale Order',
  LOCKED = 'Locked'
}

export type QuotationCancelRequestStatus = 'NONE' | 'CHO_DUYET' | 'DA_DUYET' | 'TU_CHOI';

export interface IQuotationLogNote {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  detail?: string;
  type?: 'note' | 'message' | 'system' | 'activity';
  attachments?: string[];
  isPending?: boolean;
}

export type ContractFlowStatus = 'quotation' | 'sale_confirmed' | 'signed_contract' | 'enrolled' | 'active';

export interface IQuotationPaymentDocument {
  method: 'CK' | 'CASH';
  bankTransactionCode?: string;
  bankConfirmationCode?: string;
  cashReceiptImage?: string;
  cashReceiptCode?: string;
  note?: string;
  loggedAt: string;
  loggedBy?: string;
}

export interface IQuotationLineItem {
  id: string;
  productId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  studentName?: string;
  studentDob?: string;
  testerId?: string;
  testerName?: string;
  courseName?: string;
  targetMarket?: string;
  servicePackage?: string;
  programs?: string[];
  classId?: string;
  className?: string;
  additionalInfo?: string;
  paymentSchedule?: IQuotationPaymentScheduleTerm[];
}

export interface IQuotationPaymentScheduleTerm {
  id: string;
  termNo: number;
  installmentLabel: string;
  condition: string;
  amount: number;
  expectedDate?: string;
  dueDate?: string;
  activatedAt?: string;
  activatedBy?: string;
}

export interface IQuotation {
  id: string;
  soCode: string; // SO001
  customerName: string;
  customerId?: string; // Link to contact
  leadId?: string;
  dealId?: string;
  studentId?: string; // Linked Student ID when Locked
  studentIds?: string[];


  serviceType: 'StudyAbroad' | 'Training' | 'Combo';
  product: string; // Course name
  lineItems?: IQuotationLineItem[];
  amount: number;
  discount?: number;
  finalAmount: number;
  refundAmount?: number;
  pricingNote?: string;
  expirationDate?: string;
  pricelist?: string;
  orderMode?: string;

  createdAt: string;
  updatedAt: string;
  quotationDate?: string;
  confirmDate?: string;
  status: QuotationStatus;
  saleConfirmedAt?: string;
  saleConfirmedBy?: string;
  transactionStatus?: 'NONE' | 'CHO_DUYET' | 'DA_DUYET' | 'TU_CHOI';
  cancelRequestStatus?: QuotationCancelRequestStatus;
  cancelRequestedAt?: string;
  cancelRequestedBy?: string;
  cancelApprovedAt?: string;
  cancelApprovedBy?: string;
  lockedAt?: string;
  lockedBy?: string;
  contractId?: string;

  // Class Info
  schedule?: string;
  classCode?: string;
  studentPhone?: string;
  studentEmail?: string;
  studentDob?: string;
  studentAddress?: string;
  identityCard?: string;
  passport?: string;
  guardianName?: string;
  guardianPhone?: string;

  // Study Abroad Case metadata (LocalStorage adapter; TODO replace with backend API).
  country?: string;
  targetCountry?: string;
  programType?: string;
  major?: string;
  salespersonName?: string;
  branchName?: string;
  intakeTerm?: string;
  caseStage?: string;
  caseProfileStatus?: 'FULL' | 'MISSING';
  certificateInfo?: string;
  serviceProcessStatus?:
    | 'NEW'
    | 'UNPROCESSED'
    | 'PROCESSING'
    | 'PROCESSED'
    | 'DEPARTED'
    | 'WITHDRAWN'
    | 'VISA_FAILED'
    | 'REPROCESSING';
  invoiceState?: 'NONE' | 'UNPAID' | 'HAS_INVOICE' | 'PAID';
  cmtcStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NOT_OPENED' | 'OPENED' | 'SUBMITTED';
  expectedFlightTerm?: string;
  stageUpdatedAt?: string;
  internalNote?: string;
  internalNoteUpdatedAt?: string;
  demographicInfo?: string;
  studyAbroadProductPackage?: string;
  caseProcessorName?: string;
  serviceStatusNote?: string;
  intakeDate?: string;
  intakeNote?: string;
  invoiceNote?: string;
  schoolInterviewDate?: string;
  schoolInterviewStatus?: 'NO_SCHEDULE' | 'SCHEDULED' | 'INTERVIEWED' | 'PASSED' | 'FAILED' | 'NOT_REQUIRED';
  schoolInterviewNote?: string;
  cmtcAmount?: number;
  cmtcNote?: string;
  programSelectionStatus?: 'NOT_SELECTED' | 'SELECTED';
  schoolProgramName?: string;
  schoolProgramNote?: string;
  caseProfileStatusNote?: string;
  translationStatus?: 'NOT_YET' | 'DONE';
  translationNote?: string;
  offerLetterStatus?: 'NOT_SENT' | 'SENT' | 'RECEIVED';
  offerLetterNote?: string;
  embassyAppointmentStatus?: 'NOT_BOOKED' | 'BOOKED' | 'SCHEDULED' | 'CANCELLED';
  embassyAppointmentDate?: string;
  embassyAppointmentNote?: string;
  visaStatus?: 'NOT_SUBMITTED' | 'SUBMITTED' | 'SUPPLEMENT' | 'GRANTED' | 'FAILED';
  visaNote?: string;
  flightStatus?: 'NOT_DEPARTED' | 'DEPARTED' | 'CANCELLED';
  expectedEntryDate?: string;
  flightNote?: string;

  // Payment Info (Log SO)
  paymentMethod?: 'CK' | 'CASH';
  paymentProof?: string; // Image URL or code
  paymentDocuments?: IQuotationPaymentDocument;
  needInvoice?: boolean;
  logNotes?: IQuotationLogNote[];
  contractStatus?: ContractFlowStatus;

  createdBy: string;
}

// 4. TRANSACTION MANAGEMENT (THU CHI)
export type TransactionType = 'IN' | 'OUT';
export type TransactionStatus =
  | 'PROPOSED'  // Đề xuất (Chi)
  | 'APPROVED'  // Đã duyệt (Chi)
  | 'PAID'      // Đã chi (Chi)
  | 'PLANNED'   // Dự thu (Thu)
  | 'RECEIVED'; // Đã thu (Thu)

export interface IActualTransaction {
  id: string;
  transactionCode?: string;
  type: TransactionType; // Thu / Chi
  category: string; // Salary, Tuition, Electricity...
  title: string; // Description
  recipientPayerName?: string;
  amount: number;
  department: string; // Sale, OPS, Marketing
  cashAccount?: string;
  voucherNumber?: string;
  date: string;
  status: TransactionStatus;
  processResult?: 'DA_THU' | 'DA_CHI';
  proof?: string; // Image URL/Code
  attachmentName?: string;
  attachmentUrl?: string;

  // Links
  relatedId?: string; // SO ID, Student ID...
  createdBy: string;
  createdAt: string;
}

export interface IActualTransactionLog {
  id: string;
  transactionId: string;
  action: 'CREATE' | 'UPDATE_STATUS' | 'UPDATE';
  message: string;
  createdAt: string;
  createdBy: string;
}

export type RefundStatus =
  | 'DRAFT'
  | 'CHO_DUYET'
  | 'KE_TOAN_XAC_NHAN'
  | 'DA_DUYET'
  | 'DA_THU_CHI'
  | 'NHAP'
  | 'SALE_XAC_NHAN'
  | 'KE_TOAN_KIEM_TRA'
  | 'CEO_DUYET'
  | 'DA_HOAN'
  | 'TU_CHOI'
  | 'HUY_YEU_CAU';

export interface IRefundRequest {
  id: string;
  createdAt: string;
  studentName: string;
  soCode?: string;
  contractCode: string;
  program?: string;
  paidAmount: number;
  relatedPaymentCode?: string;
  requestedAmount: number;
  retainedAmount?: number | null;
  approvedAmount?: number | null;
  reason: string;
  refundBasis?: string;
  createdBy?: string;
  ownerName?: string;
  status: RefundStatus;
  paymentVoucherCode?: string;
  payoutDate?: string;
  note?: string;
  evidenceFiles?: string[];
  relatedDocuments?: string[];
}

export interface IRefundLog {
  id: string;
  refundId: string;
  action: string;
  createdAt: string;
  createdBy: string;
}

// 5. INVOICE MANAGEMENT
export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  ISSUED = 'ISSUED',
  SENT_TO_CUSTOMER = 'SENT_TO_CUSTOMER',
  CANCELLED = 'CANCELLED'
}

export enum ReceiptDocumentType {
  PAYMENT_RECEIPT = 'PAYMENT_RECEIPT',
  PAYMENT_VOUCHER = 'PAYMENT_VOUCHER'
}

export interface IInvoice {
  id: string;
  code: string; // PT-00001 / PC-00001
  documentType?: ReceiptDocumentType;
  payerName?: string;
  displayAddress?: string;
  contactPerson?: string;
  description?: string;
  contractCode?: string;
  ownerName?: string;
  branchName?: string;
  programName?: string;
  currency?: string;
  paymentMethod?: string;
  paymentDate?: string;
  accountName?: string;
  approvedTransactionCode?: string;
  cashFlowCode?: string;
  bankReference?: string;
  attachments?: IAttachmentFile[];
  requiresTaxInvoice?: boolean;
  receiptPrintedAt?: string;
  receiptEmailedAt?: string;
  note?: string;

  // Customer Info
  customerId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;

  // Tax Info (Optional)
  taxId?: string;
  companyName?: string;
  companyAddress?: string;

  // SO Link
  soId?: string;
  soCode?: string;

  // Financials
  items: {
    name: string;
    quantity: number;
    price: number;
    total: number;
  }[];
  subTotal: number;
  taxAmount: number;
  totalAmount: number;

  issueDate: string;
  dueDate?: string;
  status: InvoiceStatus;

  createdBy: string;
  createdAt: string;
}
