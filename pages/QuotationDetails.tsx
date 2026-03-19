import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Save, Printer, ChevronRight, ChevronDown, FileText, Lock, Plus } from 'lucide-react';
import { useRef } from 'react';
import { Paperclip, Send, X } from 'lucide-react';
import { ContractStatus, IContract, IQuotation, IQuotationLineItem, IQuotationLogNote, IQuotationPaymentScheduleTerm, ITeacher, ITrainingClass, QuotationStatus, UserRole } from '../types';
import { addQuotation, getContacts, getContractByQuotationId, getContracts, getDealById, getLeadById, getLeads, getQuotations, getSalesTeams, getTeachers, getTrainingClasses, getTransactions, updateContract, updateQuotation, upsertLinkedContractFromQuotation } from '../utils/storage';
import { useAuth } from '../contexts/AuthContext';
import { approveQuotationCancelApproval, confirmSale, lockQuotationAfterAccounting, requestQuotationCancelApproval } from '../services/financeFlow.service';
import { ensureStudentProfilesFromQuotation } from '../services/enrollmentFlow.service';
import {
  DEFAULT_QUOTATION_RECEIPT_TYPE,
  normalizeQuotationReceiptType,
  QUOTATION_RECEIPT_TYPE_OPTIONS
} from '../utils/quotationReceiptType';
import {
  formatServicePaymentPlanNote,
  resolveServicePaymentPlan
} from '../utils/servicePaymentPlans';
import ClassCodeLookupInput from '../components/ClassCodeLookupInput';
import { buildTrainingClassLookupOptions } from '../utils/trainingClassLookup';
import LogAudienceFilterControl from '../components/LogAudienceFilter';
import { filterByLogAudience, getQuotationLogAudience, LogAudienceFilter } from '../utils/logAudience';

const SERVICES = [
  { id: 'StudyAbroad', name: 'Du học' },
  { id: 'Training', name: 'Đào tạo' },
  { id: 'Combo', name: 'Combo' }
] as const;

const PRODUCTS = [
  { id: 'p1', name: 'Khóa tiếng Đức A1-A2', price: 15000000 },
  { id: 'p2', name: 'Khóa tiếng Đức B1-B2', price: 55000000 },
  { id: 'p3', name: 'Combo Du học nghề Đức (Trọn gói)', price: 210000000 },
  { id: 'p4', name: 'Combo Du học nghề Úc', price: 210000000 },
  { id: 'p5', name: 'Phí xử lý hồ sơ', price: 5000000 }
];

const STATUS_STEPS = [
  { id: 'draft', label: 'Nháp' },
  { id: 'sent', label: 'Đã gửi' },
  { id: 'sale_order', label: 'SO' },
  { id: 'in_progress', label: 'Đang thực hiện' },
  { id: 'stopped', label: 'Dừng' },
  { id: 'completed', label: 'Hoàn tất' }
] as const;

const DEFAULT_CONTRACT_TEMPLATE_NAME = 'Mẫu hợp đồng đào tạo';

const CONTRACT_FIELD_CONFIG = [
  { key: 'customerName', label: 'Tên khách hàng / Bên B', placeholder: 'Tên khách hàng đứng tên hợp đồng' },
  { key: 'studentName', label: 'Tên học sinh', placeholder: 'Họ tên học sinh' },
  { key: 'studentPhone', label: 'SĐT học sinh', placeholder: 'Số điện thoại học sinh' },
  { key: 'identityCard', label: 'CCCD học sinh', placeholder: 'Số CCCD học sinh' }
] as const;

type QuotationTab = 'order_lines' | 'other_info' | 'contract' | 'payment_debt';

type ContractDraftState = {
  templateName: string;
  fileUrl: string;
  templateFields: Record<string, string>;
};

type CreatorMarket = 'Đức' | 'Trung Quốc';
type CreatorServicePackage = 'Du học' | 'Combo' | 'Đào tạo';

type OrderCatalogItem = {
  id: string;
  product: string;
  market: CreatorMarket;
  servicePackage: CreatorServicePackage;
  serviceType: IQuotation['serviceType'];
  courseOptions: string[];
  programOptions: string[];
  defaultPrice: number;
};

type CreatorOrderDraft = {
  id: string;
  productId?: string;
  productName: string;
  studentName: string;
  studentDob: string;
  testerId: string;
  courseName: string;
  targetMarket: CreatorMarket | '';
  servicePackage: CreatorServicePackage | '';
  programs: string[];
  classId: string;
  unitPrice: number;
  discountPercent: number;
  additionalInfo: string;
  paymentSchedule: IQuotationPaymentScheduleTerm[];
};

type PaymentDebtCollectionStatus = 'CHUA_DEN' | 'CAN_XU_LY' | 'THU_1_PHAN' | 'HOAN_TAT';

const PAYMENT_DEBT_STATUS_LABELS: Record<PaymentDebtCollectionStatus, string> = {
  CHUA_DEN: 'Chưa đến',
  CAN_XU_LY: 'Cần xử lý',
  THU_1_PHAN: 'Thu 1 phần',
  HOAN_TAT: 'Hoàn tất'
};

const PAYMENT_DEBT_STATUS_STYLES: Record<PaymentDebtCollectionStatus, string> = {
  CHUA_DEN: 'bg-slate-100 text-slate-600',
  CAN_XU_LY: 'bg-[#fef3c7] text-[#78350f]',
  THU_1_PHAN: 'bg-[#dbeafe] text-[#1d4ed8]',
  HOAN_TAT: 'bg-[#dcfce7] text-[#166534]'
};

type CustomerOption = {
  id: string;
  name: string;
  phone: string;
  email: string;
  source: 'contact' | 'lead';
};

const ORDER_LINE_CATALOG: OrderCatalogItem[] = [
  {
    id: 'order-de-training-a12',
    product: 'Khóa tiếng Đức A1-A2',
    market: 'Đức',
    servicePackage: 'Đào tạo',
    serviceType: 'Training',
    courseOptions: ['Tiếng Đức A1', 'Tiếng Đức A2'],
    programOptions: ['A1', 'A2'],
    defaultPrice: 15000000
  },
  {
    id: 'order-de-training-b12',
    product: 'Khóa tiếng Đức B1-B2',
    market: 'Đức',
    servicePackage: 'Đào tạo',
    serviceType: 'Training',
    courseOptions: ['Tiếng Đức B1', 'Tiếng Đức B2'],
    programOptions: ['B1', 'B2'],
    defaultPrice: 25000000
  },
  {
    id: 'order-de-combo',
    product: 'Combo tiếng Đức A1-B1',
    market: 'Đức',
    servicePackage: 'Combo',
    serviceType: 'Combo',
    courseOptions: ['Combo tiếng Đức A1-B1'],
    programOptions: ['A1', 'A2', 'B1'],
    defaultPrice: 45000000
  },
  {
    id: 'order-de-abroad',
    product: 'Du học Đức - Trọn gói',
    market: 'Đức',
    servicePackage: 'Du học',
    serviceType: 'StudyAbroad',
    courseOptions: ['Hồ sơ du học Đức', 'Luyện phỏng vấn', 'Định hướng trước bay'],
    programOptions: ['A1', 'A2', 'B1', 'APS', 'Visa'],
    defaultPrice: 210000000
  },
  {
    id: 'order-cn-training-hsk123',
    product: 'Khóa tiếng Trung HSK1-HSK3',
    market: 'Trung Quốc',
    servicePackage: 'Đào tạo',
    serviceType: 'Training',
    courseOptions: ['HSK 1', 'HSK 2', 'HSK 3'],
    programOptions: ['HSK1', 'HSK2', 'HSK3'],
    defaultPrice: 12000000
  },
  {
    id: 'order-cn-training-hsk45',
    product: 'Khóa tiếng Trung HSK4-HSK5',
    market: 'Trung Quốc',
    servicePackage: 'Đào tạo',
    serviceType: 'Training',
    courseOptions: ['HSK 4', 'HSK 5'],
    programOptions: ['HSK4', 'HSK5'],
    defaultPrice: 18000000
  },
  {
    id: 'order-cn-combo',
    product: 'Combo tiếng HSK1-HSK3',
    market: 'Trung Quốc',
    servicePackage: 'Combo',
    serviceType: 'Combo',
    courseOptions: ['Combo tiếng HSK1-HSK3'],
    programOptions: ['HSK1', 'HSK2', 'HSK3'],
    defaultPrice: 20000000
  },
  {
    id: 'order-cn-abroad',
    product: 'Du học Trung Quốc - Trọn gói',
    market: 'Trung Quốc',
    servicePackage: 'Du học',
    serviceType: 'StudyAbroad',
    courseOptions: ['Hồ sơ du học Trung Quốc', 'Luyện phỏng vấn', 'Định hướng trước bay'],
    programOptions: ['HSK4', 'HSK5', 'Visa', 'Hồ sơ'],
    defaultPrice: 160000000
  }
];

const CREATOR_MARKETS: CreatorMarket[] = ['Đức', 'Trung Quốc'];

const CREATOR_CLASS_FALLBACKS: ITrainingClass[] = [
  {
    id: 'CN-HSK1-K01',
    code: 'CN-HSK1-K01',
    name: 'Lớp HSK1 K01',
    campus: 'Hà Nội',
    schedule: 'T2-4-6 19:00',
    language: 'Tiếng Trung',
    level: 'HSK1',
    classType: 'Offline',
    status: 'ACTIVE',
    teacherId: 'T003'
  },
  {
    id: 'CN-HSK3-K02',
    code: 'CN-HSK3-K02',
    name: 'Lớp HSK3 K02',
    campus: 'Hà Nội',
    schedule: 'T3-5-7 18:30',
    language: 'Tiếng Trung',
    level: 'HSK3',
    classType: 'Offline',
    status: 'ACTIVE',
    teacherId: 'T003'
  },
  {
    id: 'CN-HSK5-K03',
    code: 'CN-HSK5-K03',
    name: 'Lớp HSK5 K03',
    campus: 'TP.HCM',
    schedule: 'T2-4 20:00',
    language: 'Tiếng Trung',
    level: 'HSK5',
    classType: 'Online',
    status: 'ACTIVE',
    teacherId: 'T003'
  }
];

const toInputDate = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const fromInputDate = (value?: string, fallback?: string) => {
  if (!value) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return fallback;
  const base = fallback ? new Date(fallback) : new Date();
  const safeBase = Number.isNaN(base.getTime()) ? new Date() : base;
  const next = new Date(safeBase);
  next.setFullYear(year, month - 1, day);
  next.setHours(0, 0, 0, 0);
  return next.toISOString();
};

const formatDisplayDate = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('vi-VN');
};

const formatCurrency = (value?: number) => `${(value || 0).toLocaleString('vi-VN')} đ`;
const formatCurrencyValue = (value?: number) => `${(value || 0).toLocaleString('vi-VN')}`;
const toNumberOrZero = (value: number | string | undefined) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error || new Error('Không thể đọc file'));
    reader.readAsDataURL(file);
  });

const isImageAttachment = (value: string) =>
  value.startsWith('data:image/') || /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(value);

const getCatalogByProduct = (productName: string) =>
  ORDER_LINE_CATALOG.find((item) => item.product === productName);

const getPrimaryCatalogByServicePackage = (
  market?: CreatorMarket | '',
  servicePackage?: CreatorServicePackage | ''
) =>
  ORDER_LINE_CATALOG.find(
    (item) => item.market === market && item.servicePackage === servicePackage
  );

const getServicePackageFromServiceType = (serviceType?: IQuotation['serviceType']): CreatorServicePackage =>
  serviceType === 'StudyAbroad' ? 'Du học' : serviceType === 'Combo' ? 'Combo' : 'Đào tạo';

const calculateOrderDraftLineTotal = (unitPrice: number, discountPercent: number) =>
  Math.max(0, Math.round((Number(unitPrice) || 0) * (1 - (Number(discountPercent) || 0) / 100)));

const buildPaymentScheduleFromPlan = (
  plan: ReturnType<typeof resolveServicePaymentPlan>
): IQuotationPaymentScheduleTerm[] =>
  plan?.steps.map((step, index) => ({
    id: `payment-step-${index + 1}`,
    termNo: index + 1,
    installmentLabel: step.installmentLabel,
    condition: step.condition,
    amount: step.amount,
    expectedDate: '',
    dueDate: ''
  })) || [];

const buildPaymentScheduleFallback = (amount: number): IQuotationPaymentScheduleTerm[] => [
  {
    id: 'payment-step-1',
    termNo: 1,
    installmentLabel: 'Lần 1',
    condition: 'Theo thỏa thuận',
    amount: Math.max(0, Math.round(Number(amount) || 0)),
    expectedDate: '',
    dueDate: ''
  }
];

const normalizePaymentSchedule = (
  schedule: IQuotationPaymentScheduleTerm[] | undefined,
  fallbackAmount: number
): IQuotationPaymentScheduleTerm[] => {
  if (!Array.isArray(schedule) || schedule.length === 0) {
    return buildPaymentScheduleFallback(fallbackAmount);
  }

  return schedule.map((item, index) => ({
    id: item.id || `payment-step-${index + 1}`,
    termNo: Number(item.termNo || index + 1),
    installmentLabel: item.installmentLabel || `Lần ${index + 1}`,
    condition: item.condition || '',
    amount: Math.max(0, Math.round(Number(item.amount) || 0)),
    expectedDate: item.expectedDate || '',
    dueDate: item.dueDate || ''
  }));
};

const formatPaymentScheduleNote = (schedule: IQuotationPaymentScheduleTerm[]) =>
  schedule
    .map(
      (item) =>
        `${item.installmentLabel}: ${item.condition || 'Theo thỏa thuận'} - ${Math.max(0, Math.round(Number(item.amount) || 0)).toLocaleString('vi-VN')} đ`
    )
    .join('\n');

const createOrderDraft = (
  formData: Partial<IQuotation>,
  base?: Partial<CreatorOrderDraft>,
  lineItem?: IQuotationLineItem
): CreatorOrderDraft => {
  const targetMarket =
    (lineItem?.targetMarket as CreatorMarket) ||
    base?.targetMarket ||
    (formData.targetCountry as CreatorMarket) ||
    '';
  const servicePackage =
    (lineItem?.servicePackage as CreatorServicePackage) ||
    base?.servicePackage ||
    getServicePackageFromServiceType(formData.serviceType);
  const unitPrice = lineItem?.unitPrice || base?.unitPrice || 0;
  const discountPercent = lineItem?.discount || base?.discountPercent || 0;
  const lineTotal = calculateOrderDraftLineTotal(unitPrice, discountPercent);
  const defaultPlan = resolveServicePaymentPlan(targetMarket, servicePackage, lineTotal);
  const fallbackSchedule = defaultPlan ? buildPaymentScheduleFromPlan(defaultPlan) : buildPaymentScheduleFallback(lineTotal);

  const existingSchedule = (lineItem?.paymentSchedule as IQuotationPaymentScheduleTerm[] | undefined) || base?.paymentSchedule;

  return {
    id: lineItem?.id || base?.id || `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    productId: lineItem?.productId || base?.productId,
    productName: lineItem?.name || base?.productName || '',
    studentName: lineItem?.studentName || base?.studentName || formData.customerName || '',
    studentDob: toInputDate(lineItem?.studentDob || base?.studentDob || formData.studentDob),
    testerId: lineItem?.testerId || base?.testerId || '',
    courseName: lineItem?.courseName || base?.courseName || '',
    targetMarket,
    servicePackage,
    programs: Array.isArray(lineItem?.programs) ? lineItem.programs : base?.programs || [],
    classId: lineItem?.classId || base?.classId || '',
    unitPrice,
    discountPercent,
    additionalInfo: lineItem?.additionalInfo || base?.additionalInfo || '',
    paymentSchedule: existingSchedule && existingSchedule.length > 0
      ? normalizePaymentSchedule(existingSchedule, lineTotal)
      : fallbackSchedule
  };
};

const getPrimaryQuotationStudentName = (quotation?: Partial<IQuotation> | null) => {
  const lineItems = Array.isArray(quotation?.lineItems) ? quotation.lineItems : [];
  const primaryStudentName = lineItems
    .map((item) => String(item?.studentName || '').trim())
    .find(Boolean);

  return primaryStudentName || String(quotation?.customerName || '').trim();
};

const normalizeTemplateDraftName = (templateName?: string) => {
  const normalized = String(templateName || '').trim();
  return normalized && normalized !== DEFAULT_CONTRACT_TEMPLATE_NAME ? normalized : '';
};

const QUOTATION_AUDIT_FIELD_LABELS: Partial<Record<keyof IQuotation, string>> = {
  customerName: 'Khách hàng',
  product: 'Sản phẩm',
  amount: 'Tổng tiền',
  discount: 'Chiết khấu',
  finalAmount: 'Thành tiền',
  paymentMethod: 'Phương thức thanh toán',
  paymentProof: 'Chứng từ thanh toán',
  classCode: 'Mã lớp dự kiến',
  schedule: 'Lịch học',
  identityCard: 'CCCD',
  studentPhone: 'Số điện thoại',
  studentEmail: 'Email',
  studentDob: 'Ngày sinh',
  studentAddress: 'Địa chỉ',
  guardianName: 'Người bảo hộ',
  guardianPhone: 'SĐT người bảo hộ',
  branchName: 'Chi nhánh',
  status: 'Trạng thái SO',
  transactionStatus: 'Trạng thái giao dịch',
  contractStatus: 'Trạng thái hợp đồng',
  serviceType: 'Loại dịch vụ'
};

const QUOTATION_AUDIT_FIELDS: (keyof IQuotation)[] = [
  'customerName',
  'product',
  'amount',
  'discount',
  'finalAmount',
  'paymentMethod',
  'paymentProof',
  'classCode',
  'schedule',
  'identityCard',
  'studentPhone',
  'studentEmail',
  'studentDob',
  'studentAddress',
  'guardianName',
  'guardianPhone',
  'branchName',
  'serviceType',
  'status',
  'transactionStatus',
  'contractStatus'
];

const formatAuditValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') return '(Trống)';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const buildQuotationAuditLogNote = (
  before: IQuotation | undefined,
  after: IQuotation,
  actor: string
): IQuotationLogNote | null => {
  const timestamp = new Date().toISOString();

  if (!before) {
    return {
      id: `q-log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp,
      user: actor,
      type: 'system',
      action: 'Tạo SO',
      detail: `Khởi tạo ${after.soCode || 'SO mới'}`
    };
  }

  const changes: string[] = [];
  for (const field of QUOTATION_AUDIT_FIELDS) {
    const oldValue = (before as any)[field];
    const newValue = (after as any)[field];
    if (JSON.stringify(oldValue) === JSON.stringify(newValue)) continue;
    const label = QUOTATION_AUDIT_FIELD_LABELS[field] || String(field);
    changes.push(`${label}: ${formatAuditValue(oldValue)} -> ${formatAuditValue(newValue)}`);
  }

  if (changes.length === 0) return null;

  const shortDetail = changes.slice(0, 6).join(' | ');
  const remaining = changes.length - 6;

  return {
    id: `q-log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp,
    user: actor,
    type: 'system',
    action: 'Cập nhật SO',
    detail: remaining > 0 ? `${shortDetail} | +${remaining} thay đổi khác` : shortDetail
  };
};

const QuotationDetails: React.FC = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isNew = id === 'new';
  const dealId = searchParams.get('dealId');
  const initialAction = searchParams.get('action');
  const initialTab = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState<QuotationTab>('order_lines');
  const [quotationCreatorWorkflowStatus, setQuotationCreatorWorkflowStatus] = useState<'draft' | 'sent' | 'sale_order' | 'cancelled'>('draft');
  const [creatorLineItems, setCreatorLineItems] = useState<IQuotationLineItem[]>([]);
  const [showOrderLineModal, setShowOrderLineModal] = useState(false);
  const [editingCreatorLineId, setEditingCreatorLineId] = useState<string | null>(null);
  const [programDropdownOpen, setProgramDropdownOpen] = useState(false);
  const [contractTemplateDropdownOpen, setContractTemplateDropdownOpen] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [customerQuery, setCustomerQuery] = useState('');
  const [linkedContract, setLinkedContract] = useState<IContract | null>(null);
  const [contractDraft, setContractDraft] = useState<ContractDraftState>({
    templateName: '',
    fileUrl: '',
    templateFields: {}
  });
  const [logNoteContent, setLogNoteContent] = useState('');
  const [logAudienceFilter, setLogAudienceFilter] = useState<LogAudienceFilter>('ALL');
  const [pendingLogAttachments, setPendingLogAttachments] = useState<string[]>([]);
  const logAttachmentInputRef = useRef<HTMLInputElement | null>(null);
  const programDropdownRef = useRef<HTMLDivElement | null>(null);
  const contractTemplateDropdownRef = useRef<HTMLDivElement | null>(null);
  const quotationPrintRestoreTabRef = useRef<QuotationTab | null>(null);

  const [formData, setFormData] = useState<Partial<IQuotation>>({
    status: QuotationStatus.DRAFT,
    serviceType: 'Training',
    amount: 0,
    discount: 0,
    finalAmount: 0,
    refundAmount: 0,
    expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    pricelist: '[Center 11] Base Price (VND)',
    orderMode: DEFAULT_QUOTATION_RECEIPT_TYPE,
    needInvoice: false,
    createdBy: user?.id || 'system',
    salespersonName: user?.name || 'Tôi',
    createdAt: new Date().toISOString(),
    quotationDate: new Date().toISOString()
  });
  const [orderLineDraft, setOrderLineDraft] = useState<CreatorOrderDraft>(() => createOrderDraft({
    customerName: '',
    studentDob: ''
  }));

  useEffect(() => {
    if (initialTab === 'order_lines' || initialTab === 'other_info' || initialTab === 'contract' || initialTab === 'payment_debt') {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (!formData.id) return;

    const syncRefundAmountFromQuotation = () => {
      const latestQuotation = getQuotations().find((quotation) => quotation.id === formData.id);
      if (!latestQuotation) return;

      setFormData((prev) => {
        const nextRefundAmount = Math.max(0, Number(latestQuotation.refundAmount) || 0);
        if (Math.max(0, Number(prev.refundAmount) || 0) === nextRefundAmount) {
          return prev;
        }

        return {
          ...prev,
          refundAmount: nextRefundAmount
        };
      });
    };

    syncRefundAmountFromQuotation();
    window.addEventListener('educrm:quotations-changed', syncRefundAmountFromQuotation as EventListener);
    return () => window.removeEventListener('educrm:quotations-changed', syncRefundAmountFromQuotation as EventListener);
  }, [formData.id]);

  useEffect(() => {
    if (!programDropdownOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (programDropdownRef.current && !programDropdownRef.current.contains(event.target as Node)) {
        setProgramDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [programDropdownOpen]);

  useEffect(() => {
    if (!contractTemplateDropdownOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (contractTemplateDropdownRef.current && !contractTemplateDropdownRef.current.contains(event.target as Node)) {
        setContractTemplateDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [contractTemplateDropdownOpen]);

  const loadClassCodeOptions = () =>
    buildTrainingClassLookupOptions([...getTrainingClasses(), ...CREATOR_CLASS_FALLBACKS]);

  const salesOwnerOptions = useMemo(() => {
    const options = new Map<string, { id: string; name: string }>();

    if (user?.id && user?.name) {
      options.set(user.id, { id: user.id, name: user.name });
    }

    getSalesTeams().forEach((team) => {
      team.members.forEach((member) => {
        if (!member.userId || !member.name) return;
        options.set(member.userId, { id: member.userId, name: member.name });
      });
    });

    return Array.from(options.values());
  }, [user?.id, user?.name]);

  useEffect(() => {
    if (!isNew) return;

    setFormData((prev) => ({
      ...prev,
      createdBy: user?.id || 'system',
      salespersonName: user?.name || 'Tôi'
    }));
  }, [isNew, user?.id, user?.name]);

  useEffect(() => {
    if (isNew) {
      setQuotationCreatorWorkflowStatus('draft');
      setCreatorLineItems([]);
      setLinkedContract(null);
      setContractDraft({
        templateName: '',
        fileUrl: '',
        templateFields: {}
      });
      if (dealId) {
        const deal = getDealById(dealId);
        if (deal) {
          setCreatorLineItems([
            {
              id: `line-${deal.id}`,
              productId: deal.id,
              name: deal.title,
              quantity: 1,
              unitPrice: deal.value,
              discount: 0,
              total: deal.value
            }
          ]);
          setFormData((prev) => ({
            ...prev,
            dealId: deal.id,
            leadId: deal.leadId,
            customerName: 'Loading...',
            product: deal.title,
            amount: deal.value,
            finalAmount: deal.value,
            quotationDate: prev.quotationDate || prev.createdAt || new Date().toISOString(),
            lineItems: [
              {
                id: `line-${deal.id}`,
                productId: deal.id,
                name: deal.title,
                quantity: 1,
                unitPrice: deal.value,
                discount: 0,
                total: deal.value
              }
            ]
          }));
          const lead = getLeadById(deal.leadId);
          if (lead) {
            setFormData((prev) => ({
              ...prev,
              customerName: lead.name,
              customerId: lead.id,
              targetCountry: lead.targetCountry || prev.targetCountry,
              studentDob: lead.dob || prev.studentDob,
              studentPhone: lead.phone || prev.studentPhone,
              studentEmail: lead.email || prev.studentEmail,
              studentAddress: lead.address || prev.studentAddress,
              identityCard: lead.identityCard || prev.identityCard,
              guardianName: lead.guardianName || prev.guardianName,
              guardianPhone: lead.guardianPhone || prev.guardianPhone
            }));
            setCreatorLineItems((prev) =>
              prev.map((item) => ({
                ...item,
                studentName: lead.name,
                studentDob: lead.dob || item.studentDob,
                targetMarket: (lead.targetCountry as CreatorMarket) || item.targetMarket
              }))
            );
            setCustomerQuery(lead.name);
          }
        }
      }
      const soCode = `SO${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      setFormData((prev) => ({ ...prev, soCode }));
      return;
    }

    if (!id) return;
    const found = getQuotations().find((q) => q.id === id);
    if (!found) {
      navigate('/contracts/quotations');
      return;
    }

    const contract = getContractByQuotationId(found.id) || null;
    setFormData({
      ...found,
      orderMode: normalizeQuotationReceiptType(found.orderMode)
    });
    setLinkedContract(contract);
    setQuotationCreatorWorkflowStatus(
      found.status === QuotationStatus.SALE_ORDER || found.status === QuotationStatus.SALE_CONFIRMED
        ? 'sale_order'
        : found.status === QuotationStatus.SENT
          ? 'sent'
          : 'draft'
    );
    setCreatorLineItems(found.lineItems || []);
    setCustomerQuery(found.customerName || '');
    setContractDraft({
      templateName: normalizeTemplateDraftName(contract?.templateName),
      fileUrl: contract?.fileUrl || '',
      templateFields: contract?.templateFields || {}
    });
    if (initialAction === 'confirm' && found.status === QuotationStatus.SENT) {
      setShowConfirmModal(true);
    }
  }, [dealId, id, initialAction, isNew, navigate]);

  useEffect(() => {
    if (!isNew) return;

    const subtotal = creatorLineItems.reduce((sum, item) => sum + (item.unitPrice || 0) * (item.quantity || 0), 0);
    const finalTotal = creatorLineItems.reduce((sum, item) => sum + (item.total || 0), 0);
    const nextLineItems = creatorLineItems.map((item) => ({
      ...item,
      total: Math.max(0, (item.unitPrice || 0) * (item.quantity || 0) * (1 - (item.discount || 0) / 100))
    }));

    setFormData((prev) => ({
      ...prev,
      lineItems: nextLineItems,
      product: nextLineItems.map((item) => item.name).filter(Boolean).join(' + ') || prev.product || '',
      targetCountry: nextLineItems[0]?.targetMarket || prev.targetCountry,
      serviceType:
        nextLineItems[0]?.servicePackage === 'Du học'
          ? 'StudyAbroad'
          : nextLineItems[0]?.servicePackage === 'Combo'
            ? 'Combo'
            : nextLineItems[0]?.servicePackage === 'Đào tạo'
              ? 'Training'
              : prev.serviceType,
      amount: subtotal,
      discount: Math.max(0, subtotal - finalTotal),
      finalAmount: finalTotal
    }));
  }, [creatorLineItems, isNew]);

  useEffect(() => {
    if (!isNew || showOrderLineModal) return;
    setOrderLineDraft((prev) =>
      editingCreatorLineId ? prev : createOrderDraft(formData, prev)
    );
  }, [editingCreatorLineId, formData, isNew, showOrderLineModal]);

  const isLocked = formData.status === QuotationStatus.LOCKED;
  const userRole = user?.role as UserRole | undefined;
  const cancelRequestStatus = formData.cancelRequestStatus || 'NONE';
  const hasPendingCancelRequest = cancelRequestStatus === 'CHO_DUYET';
  const canConfirmByRole = [UserRole.SALES_REP, UserRole.SALES_LEADER, UserRole.ADMIN, UserRole.FOUNDER].includes(userRole || UserRole.SALES_REP);
  const canLockByRole = userRole === UserRole.ACCOUNTANT;
  const canCancelByRole = userRole === UserRole.ACCOUNTANT;
  const canApproveCancelByRole = userRole === UserRole.ADMIN || userRole === UserRole.FOUNDER;
  const canLockByTransaction = formData.transactionStatus === 'DA_DUYET';
  const hasReceiptApprovalRequest = formData.transactionStatus === 'CHO_DUYET' || formData.transactionStatus === 'DA_DUYET';
  const canConfirmNow = !isLocked && (formData.status === QuotationStatus.DRAFT || formData.status === QuotationStatus.SENT);
  const canLockStage = !isLocked && (formData.status === QuotationStatus.SALE_CONFIRMED || formData.status === QuotationStatus.SALE_ORDER);
  const canCancelNow =
    canLockStage &&
    canCancelByRole &&
    formData.transactionStatus !== 'DA_DUYET' &&
    cancelRequestStatus !== 'CHO_DUYET';
  const canApproveCancelNow = hasPendingCancelRequest && canApproveCancelByRole;
  const canLockNow = canLockStage && canLockByRole && canLockByTransaction && !hasPendingCancelRequest;
  const canCreateReceiptApproval = canLockStage && canLockByRole && !hasPendingCancelRequest && !hasReceiptApprovalRequest;
  const lockButtonTitle = !canLockStage
    ? 'Cần Confirm trước khi Lock'
    : hasPendingCancelRequest
      ? 'SO đang có yêu cầu hủy chờ duyệt'
    : !canLockByRole
      ? 'Chỉ Kế toán được khóa SO'
      : !canLockByTransaction
        ? 'Cần kế toán duyệt giao dịch trước'
        : 'Khóa SO';
  const createReceiptApprovalTitle = hasPendingCancelRequest
    ? 'SO đang có yêu cầu hủy chờ duyệt'
    : formData.transactionStatus === 'CHO_DUYET'
      ? 'SO đã có phiếu duyệt thu chờ kế toán xử lý'
      : formData.transactionStatus === 'DA_DUYET'
        ? 'SO đã có phiếu duyệt thu được duyệt'
        : 'Tạo phiếu duyệt thu cho SO này';
  const normalizedStatus =
    formData.status === QuotationStatus.SALE_ORDER ? QuotationStatus.SALE_CONFIRMED : formData.status;
  const workflowPaymentMetrics = useMemo(() => {
    const fallbackServicePackage =
      formData.serviceType === 'StudyAbroad'
        ? 'Du học'
        : formData.serviceType === 'Combo'
          ? 'Combo'
          : 'Đào tạo';

    const sourceLineItems: IQuotationLineItem[] =
      creatorLineItems.length > 0
        ? creatorLineItems
        : Array.isArray(formData.lineItems) && formData.lineItems.length > 0
          ? formData.lineItems
          : [
              {
                id: 'workflow-fallback-line',
                name: formData.product || '',
                quantity: 1,
                unitPrice: toNumberOrZero(formData.finalAmount || formData.amount),
                discount: 0,
                total: toNumberOrZero(formData.finalAmount || formData.amount),
                servicePackage: formData.lineItems?.[0]?.servicePackage || fallbackServicePackage,
                targetMarket: formData.lineItems?.[0]?.targetMarket || formData.targetCountry
              }
            ];

    let totalDue = 0;
    let firstInstallmentDue = 0;
    let installmentCount = 0;

    sourceLineItems.forEach((item) => {
      const discountPercent = Math.max(0, toNumberOrZero(item.discount));
      const lineTotal =
        Math.max(0, toNumberOrZero(item.total)) ||
        Math.max(0, Math.round(toNumberOrZero(item.unitPrice) * (1 - discountPercent / 100)));

      totalDue += lineTotal;

      const resolvedPlan = resolveServicePaymentPlan(
        item.targetMarket || formData.targetCountry,
        item.servicePackage || fallbackServicePackage,
        lineTotal
      );

      if (resolvedPlan && resolvedPlan.steps.length > 0) {
        firstInstallmentDue += resolvedPlan.steps[0].amount;
        installmentCount += resolvedPlan.steps.length;
        return;
      }

      firstInstallmentDue += lineTotal;
      installmentCount += 1;
    });

    const approvedPayments = formData.id
      ? getTransactions().filter(
          (transaction) => transaction.quotationId === formData.id && transaction.status === 'DA_DUYET'
        )
      : [];
    const totalPaid = approvedPayments.reduce((sum, transaction) => sum + toNumberOrZero(transaction.amount), 0);

    return {
      totalDue: Math.max(totalDue, toNumberOrZero(formData.finalAmount || formData.amount)),
      firstInstallmentDue: Math.max(0, firstInstallmentDue || totalDue || toNumberOrZero(formData.finalAmount || formData.amount)),
      installmentCount: Math.max(installmentCount, 1),
      totalPaid
    };
  }, [
    creatorLineItems,
    formData.amount,
    formData.finalAmount,
    formData.id,
    formData.lineItems,
    formData.product,
    formData.serviceType,
    formData.targetCountry
  ]);
  const workflowStatusId = useMemo(() => {
    const { firstInstallmentDue, installmentCount, totalDue, totalPaid } = workflowPaymentMetrics;

    if (cancelRequestStatus === 'DA_DUYET') {
      return 'stopped';
    }

    if (totalDue > 0 && totalPaid >= totalDue) {
      return 'completed';
    }

    if (
      linkedContract?.status === ContractStatus.COMPLETED ||
      formData.serviceProcessStatus === 'PROCESSED' ||
      formData.serviceProcessStatus === 'DEPARTED'
    ) {
      return 'completed';
    }

    if (
      normalizedStatus === QuotationStatus.SALE_CONFIRMED ||
      formData.status === QuotationStatus.LOCKED ||
      linkedContract?.status === ContractStatus.SIGNED ||
      linkedContract?.status === ContractStatus.ACTIVE
    ) {
      if (firstInstallmentDue > 0 && totalPaid >= firstInstallmentDue) {
        return installmentCount <= 1 ? 'completed' : 'in_progress';
      }

      return 'sale_order';
    }

    if (normalizedStatus === QuotationStatus.SENT) {
      return 'sent';
    }

    return 'draft';
  }, [cancelRequestStatus, formData.serviceProcessStatus, formData.status, linkedContract?.status, normalizedStatus, workflowPaymentMetrics]);

  const recordStatusLabel = useMemo(() => {
    const current = STATUS_STEPS.find((step) => step.id === workflowStatusId);
    return current?.label || 'Nháp';
  }, [workflowStatusId]);

  const stepIndex = useMemo(
    () => STATUS_STEPS.findIndex((step) => step.id === workflowStatusId),
    [workflowStatusId]
  );

  useEffect(() => {
    if (!formData.id) return;
    if (workflowStatusId !== 'in_progress' && workflowStatusId !== 'completed') return;
    if ((formData.studentIds && formData.studentIds.length > 0) || formData.studentId) return;

    const students = ensureStudentProfilesFromQuotation(formData.id);
    if (!students.length) return;

    const nextStudentIds = students.map((student) => student.id);
    setFormData((prev) => ({
      ...prev,
      studentId: nextStudentIds[0] || prev.studentId,
      studentIds: nextStudentIds
    }));
  }, [formData.id, formData.studentId, formData.studentIds, workflowStatusId]);

  const derivedContractFields = useMemo(
    () => ({
      customerName: formData.customerName || linkedContract?.customerName || getPrimaryQuotationStudentName(formData),
      studentName:
        getPrimaryQuotationStudentName(formData) ||
        String(linkedContract?.templateFields?.studentName || '').trim() ||
        formData.customerName ||
        linkedContract?.customerName ||
        '',
      studentPhone: formData.studentPhone || '',
      identityCard: formData.identityCard || '',
      quotationCode: formData.soCode || '',
      quotationDate: formatDisplayDate(formData.quotationDate || formData.createdAt),
      confirmDate: formatDisplayDate(
        formData.confirmDate ||
          formData.saleConfirmedAt ||
          (formData.status === QuotationStatus.LOCKED ? formData.lockedAt || formData.updatedAt : undefined)
      ),
      productName: formData.product || '',
      totalAmount: formatCurrency(formData.finalAmount || formData.amount),
      paymentMethod:
        formData.paymentMethod === 'CK' ? 'Chuyển khoản' : formData.paymentMethod === 'CASH' ? 'Tiền mặt' : ''
    }),
    [
      formData.amount,
      formData.confirmDate,
      formData.createdAt,
      formData.customerName,
      formData.finalAmount,
      formData.identityCard,
      formData.lineItems,
      formData.lockedAt,
      formData.paymentMethod,
      formData.product,
      formData.quotationDate,
      formData.saleConfirmedAt,
      formData.soCode,
      formData.status,
      formData.studentPhone,
      formData.updatedAt,
      linkedContract?.customerName,
      linkedContract?.templateFields?.studentName
    ]
  );

  const getContractFieldValue = (key: string) =>
    contractDraft.templateFields[key] ?? derivedContractFields[key as keyof typeof derivedContractFields] ?? '';

  const contractTemplateOptions = useMemo(() => {
    const options = new Map<string, { id: string; templateName: string; code: string; customerName: string }>();

    getContracts().forEach((contract) => {
      const templateName = normalizeTemplateDraftName(contract.templateName);
      if (!templateName) return;

      options.set(contract.id, {
        id: contract.id,
        templateName,
        code: contract.code || '',
        customerName: contract.customerName || ''
      });
    });

    const linkedTemplateName = normalizeTemplateDraftName(linkedContract?.templateName);
    if (linkedContract?.id && linkedTemplateName) {
      options.set(linkedContract.id, {
        id: linkedContract.id,
        templateName: linkedTemplateName,
        code: linkedContract.code || '',
        customerName: linkedContract.customerName || ''
      });
    }

    const draftTemplateName = contractDraft.templateName.trim();
    if (draftTemplateName) {
      options.set(`draft-${draftTemplateName}`, {
        id: `draft-${draftTemplateName}`,
        templateName: draftTemplateName,
        code: '',
        customerName: ''
      });
    }

    return Array.from(options.values()).sort((left, right) => {
      const byTemplate = left.templateName.localeCompare(right.templateName, 'vi');
      return byTemplate !== 0 ? byTemplate : left.code.localeCompare(right.code, 'vi');
    });
  }, [contractDraft.templateName, linkedContract?.code, linkedContract?.customerName, linkedContract?.id, linkedContract?.templateName]);

  const filteredContractTemplateOptions = useMemo(() => {
    const keyword = contractDraft.templateName.trim().toLowerCase();
    const source = keyword
      ? contractTemplateOptions.filter((contractOption) =>
          [contractOption.templateName, contractOption.code, contractOption.customerName]
            .join(' ')
            .toLowerCase()
            .includes(keyword)
        )
      : contractTemplateOptions;

    return source.slice(0, 8);
  }, [contractDraft.templateName, contractTemplateOptions]);

  const hasContractCustomData = useMemo(
    () =>
      Boolean(
        linkedContract ||
          Boolean((contractDraft.templateName || '').trim()) ||
          Object.values(contractDraft.templateFields).some((value) => value.trim())
      ),
    [contractDraft.templateFields, contractDraft.templateName, linkedContract]
  );

  const syncLinkedContract = (quotation: IQuotation) => {
    const quotationDerivedFields = {
      customerName: quotation.customerName || linkedContract?.customerName || getPrimaryQuotationStudentName(quotation),
      studentName:
        getPrimaryQuotationStudentName(quotation) ||
        String(linkedContract?.templateFields?.studentName || '').trim() ||
        quotation.customerName ||
        linkedContract?.customerName ||
        '',
      studentPhone: quotation.studentPhone || '',
      identityCard: quotation.identityCard || '',
      quotationCode: quotation.soCode || '',
      quotationDate: formatDisplayDate(quotation.quotationDate || quotation.createdAt),
      confirmDate: formatDisplayDate(
        quotation.confirmDate ||
          quotation.saleConfirmedAt ||
          (quotation.status === QuotationStatus.LOCKED ? quotation.lockedAt || quotation.updatedAt : undefined)
      ),
      productName: quotation.product || '',
      totalAmount: formatCurrency(quotation.finalAmount || quotation.amount),
      paymentMethod:
        quotation.paymentMethod === 'CK' ? 'Chuyển khoản' : quotation.paymentMethod === 'CASH' ? 'Tiền mặt' : ''
    };

    const resolveDraftValue = (key: string, fallback: string) => contractDraft.templateFields[key] || fallback;
    const baseContract = upsertLinkedContractFromQuotation(quotation, user?.id || 'system');
    const mergedContract: IContract = {
      ...baseContract,
      templateName: contractDraft.templateName || baseContract.templateName || DEFAULT_CONTRACT_TEMPLATE_NAME,
      fileUrl: contractDraft.fileUrl || baseContract.fileUrl,
      templateFields: {
        ...baseContract.templateFields,
        customerName: resolveDraftValue('customerName', quotationDerivedFields.customerName),
        studentName: resolveDraftValue('studentName', quotationDerivedFields.studentName),
        studentPhone: resolveDraftValue('studentPhone', quotationDerivedFields.studentPhone),
        identityCard: resolveDraftValue('identityCard', quotationDerivedFields.identityCard),
        quotationCode: quotationDerivedFields.quotationCode,
        quotationDate: quotationDerivedFields.quotationDate,
        confirmDate: quotationDerivedFields.confirmDate,
        productName: quotationDerivedFields.productName,
        totalAmount: quotationDerivedFields.totalAmount,
        paymentMethod: quotationDerivedFields.paymentMethod
      },
      importedAt: hasContractCustomData ? new Date().toISOString() : baseContract.importedAt,
      importedBy: hasContractCustomData ? user?.name || user?.id || 'system' : baseContract.importedBy
    };

    updateContract(mergedContract);
    setLinkedContract(mergedContract);
    setContractDraft({
      templateName: normalizeTemplateDraftName(mergedContract.templateName),
      fileUrl: mergedContract.fileUrl || '',
      templateFields: mergedContract.templateFields || {}
    });

    return mergedContract;
  };

  const persistQuotation = (options?: {
    nextStatus?: QuotationStatus;
    extraFields?: Partial<IQuotation>;
    navigateToList?: boolean;
    syncContract?: boolean;
  }) => {
    const nextStatus = options?.nextStatus || formData.status || QuotationStatus.DRAFT;
    const now = new Date().toISOString();
    const quotationDate = formData.quotationDate || formData.createdAt || now;
    const existing = formData.id ? getQuotations().find((quotation) => quotation.id === formData.id) : undefined;
    const actor = user?.name || user?.id || 'system';

    let dataToSave: IQuotation = {
      ...existing,
      ...formData,
      ...options?.extraFields,
      createdAt: formData.createdAt || quotationDate,
      quotationDate,
      confirmDate:
        options?.extraFields?.confirmDate ||
        formData.confirmDate ||
        formData.saleConfirmedAt ||
        (nextStatus === QuotationStatus.LOCKED ? formData.lockedAt || now : undefined),
      serviceType: (formData.serviceType || 'Training') as IQuotation['serviceType'],
      customerName: formData.customerName || '',
      product: formData.product || '',
      paymentMethod: formData.paymentMethod,
      paymentProof: formData.paymentProof,
      orderMode: normalizeQuotationReceiptType(formData.orderMode),
      createdBy: formData.createdBy || user?.id || 'system',
      salespersonName: formData.salespersonName || user?.name || 'Tôi',
      updatedAt: now,
      status: nextStatus,
      id: formData.id || `Q-${Date.now()}`,
      soCode: formData.soCode || `SO${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`
    };

    const baseLogNotes = Array.isArray(formData.logNotes)
      ? formData.logNotes
      : Array.isArray(existing?.logNotes)
        ? existing.logNotes
        : [];
    const auditLog = buildQuotationAuditLogNote(existing, dataToSave, actor);
    dataToSave = {
      ...dataToSave,
      logNotes: auditLog ? [auditLog, ...baseLogNotes] : baseLogNotes
    };

    if (existing) updateQuotation(dataToSave);
    else addQuotation(dataToSave);

    if (options?.syncContract !== false && (hasContractCustomData || dataToSave.status === QuotationStatus.LOCKED || Boolean(linkedContract))) {
      const mergedContract = syncLinkedContract(dataToSave);
      if (dataToSave.contractId !== mergedContract.id) {
        dataToSave = { ...dataToSave, contractId: mergedContract.id };
        updateQuotation(dataToSave);
      }
    }

    setFormData(dataToSave);

    if (options?.navigateToList) {
      navigate('/contracts/quotations');
      return dataToSave;
    }

    if (isNew) {
      const tabQuery = activeTab !== 'order_lines' ? `?tab=${activeTab}` : '';
      navigate(`/contracts/quotations/${dataToSave.id}${tabQuery}`, { replace: true });
    }

    return dataToSave;
  };

  const handleSave = () => {
    persistQuotation({ navigateToList: true });
  };

  const handleSend = () => {
    persistQuotation({
      nextStatus: QuotationStatus.SENT,
      extraFields: {
        quotationDate: formData.quotationDate || formData.createdAt || new Date().toISOString()
      }
    });
    alert('Đã gửi báo giá cho khách hàng');
  };

  const handleConfirmSale = () => {
    const savedQuotation = persistQuotation({ syncContract: false });
    const res = confirmSale(savedQuotation.id, user?.id || 'system');
    if (!res.ok || !res.quotation) {
      alert(res.error || 'Không thể xác nhận sale');
      return;
    }

    setFormData({
      ...res.quotation,
      orderMode: normalizeQuotationReceiptType(res.quotation.orderMode)
    });

    if (hasContractCustomData || linkedContract) {
      syncLinkedContract(res.quotation);
    }

    if (isNew) {
      navigate(`/contracts/quotations/${res.quotation.id}`, { replace: true });
    }

    setShowConfirmModal(false);
    alert('Đã xác nhận sale. Kế toán tạo phiếu duyệt thu ở bước tiếp theo.');
  };

  const handleOpenCreateReceiptApproval = () => {
    if (!formData.id || !canCreateReceiptApproval) return;

    navigate('/finance/transactions', {
      state: {
        createReceiptApproval: {
          quotationId: formData.id,
          relatedEntity: getPrimaryQuotationStudentName(formData),
          amount: Number(formData.finalAmount || formData.amount || 0)
        }
      }
    });
  };

  const handleLock = () => {
    if (!formData.id) {
      alert('Cần lưu SO trước khi khóa');
      return;
    }

    const res = lockQuotationAfterAccounting(formData.id, user?.id || 'system', userRole);
    if (!res.ok || !res.quotation) {
      alert(res.error || 'Không thể khóa SO');
      return;
    }

    setFormData({
      ...res.quotation,
      orderMode: normalizeQuotationReceiptType(res.quotation.orderMode)
    });
    setLinkedContract(getContractByQuotationId(res.quotation.id) || null);
    syncLinkedContract(res.quotation);
    alert('Đã khóa đơn hàng và tạo hồ sơ học viên');
  };

  const handleRequestCancel = () => {
    if (!formData.id) {
      alert('Cần lưu SO trước khi gửi yêu cầu hủy');
      return;
    }

    const res = requestQuotationCancelApproval(formData.id, user?.id || 'system', userRole);
    if (!res.ok || !res.quotation) {
      alert(res.error || 'Không thể gửi yêu cầu hủy');
      return;
    }

    setFormData({
      ...res.quotation,
      orderMode: normalizeQuotationReceiptType(res.quotation.orderMode)
    });
    alert('Đã gửi yêu cầu hủy. SO đang chờ Admin duyệt');
  };

  const handleApproveCancel = () => {
    if (!formData.id) {
      alert('Không tìm thấy SO để duyệt hủy');
      return;
    }

    const res = approveQuotationCancelApproval(formData.id, user?.id || 'system', userRole);
    if (!res.ok || !res.quotation) {
      alert(res.error || 'Không thể duyệt hủy SO');
      return;
    }

    setFormData({
      ...res.quotation,
      orderMode: normalizeQuotationReceiptType(res.quotation.orderMode)
    });
    alert('Admin đã duyệt hủy. SO được chuyển về trạng thái Đã gửi');
  };

  const handleStageClick = (stepId: (typeof STATUS_STEPS)[number]['id']) => {
    if (isLocked) return;

    if (stepId === 'sent' && formData.status === QuotationStatus.DRAFT) {
      handleSend();
      return;
    }

    if (stepId === 'sale_order' && formData.status !== QuotationStatus.LOCKED) {
      if (!canConfirmByRole) {
        alert('Chỉ Sales được xác nhận Sale');
        return;
      }
      setShowConfirmModal(true);
      return;
    }

    if (stepId === 'in_progress') {
      if (!canLockByRole) {
        alert('Chỉ Kế toán được khóa SO');
        return;
      }
      if (!canLockByTransaction) {
        alert('Cần kế toán duyệt giao dịch trước khi khóa SO');
        return;
      }
      if (hasPendingCancelRequest) {
        alert('SO đang có yêu cầu hủy chờ duyệt');
        return;
      }
      handleLock();
    }
  };

  const getStepInteraction = (stepId: (typeof STATUS_STEPS)[number]['id']) => {
    if (stepId === 'draft') return { clickable: false, title: 'Bước khởi tạo' };
    if (stepId === 'sent') {
      return {
        clickable: formData.status === QuotationStatus.DRAFT,
        title: formData.status === QuotationStatus.DRAFT ? 'Chuyển SO sang Đã gửi' : 'Đã qua bước gửi báo giá'
      };
    }
    if (stepId === 'sale_order') {
      return {
        clickable: canConfirmByRole && formData.status !== QuotationStatus.LOCKED,
        title: canConfirmByRole ? 'Mở bước Confirm Sale' : 'Chỉ Sales được xác nhận Sale'
      };
    }
    if (stepId === 'in_progress') {
      if (!canLockByRole) return { clickable: false, title: 'Chỉ Kế toán được khóa SO (trong SO hoặc màn hình giao dịch)' };
      if (hasPendingCancelRequest) return { clickable: false, title: 'SO đang có yêu cầu hủy chờ duyệt' };
      if (!canLockByTransaction) return { clickable: false, title: 'Cần giao dịch được duyệt trước' };
      if (isLocked) return { clickable: false, title: 'SO đã ở trạng thái đang thực hiện' };
      return { clickable: true, title: 'Chuyển SO sang Đang thực hiện' };
    }
    if (stepId === 'stopped') {
      return { clickable: false, title: 'Bước dừng xử lý' };
    }
    if (stepId === 'completed') {
      return { clickable: false, title: 'Bước hoàn tất' };
    }
    return { clickable: false, title: 'Bước khởi tạo' };
  };

  const calculateCreatorLineTotal = (unitPrice: number, discountPercent: number) =>
    Math.max(0, unitPrice * (1 - discountPercent / 100));

  const openNewOrderLineModal = () => {
    setEditingCreatorLineId(null);
    setProgramDropdownOpen(false);
    setOrderLineDraft(createOrderDraft(formData));
    setShowOrderLineModal(true);
  };

  const openEditOrderLineModal = (lineId: string) => {
    const foundLine = creatorLineItems.find((item) => item.id === lineId);
    if (!foundLine) return;
    setEditingCreatorLineId(lineId);
    setProgramDropdownOpen(false);
    setOrderLineDraft(createOrderDraft(formData, undefined, foundLine));
    setShowOrderLineModal(true);
  };

  const closeOrderLineModal = () => {
    setProgramDropdownOpen(false);
    setShowOrderLineModal(false);
    setEditingCreatorLineId(null);
    setOrderLineDraft(createOrderDraft(formData));
  };

  const handleOrderDraftMarketChange = (market: CreatorMarket | '') => {
    setProgramDropdownOpen(false);
    setOrderLineDraft((prev) => ({
      ...prev,
      targetMarket: market,
      servicePackage: '',
      productId: undefined,
      productName: '',
      courseName: '',
      programs: [],
      classId: '',
      unitPrice: 0
    }));
  };

  const handleOrderDraftServiceChange = (servicePackage: CreatorServicePackage | '') => {
    setProgramDropdownOpen(false);
    const catalog = getPrimaryCatalogByServicePackage(orderLineDraft.targetMarket, servicePackage);
    setOrderLineDraft((prev) => ({
      ...prev,
      servicePackage,
      productId: catalog?.id,
      productName: catalog?.product || servicePackage,
      courseName: '',
      programs: [],
      classId: '',
      unitPrice: catalog?.defaultPrice || 0
    }));
  };

  const handleOrderDraftProgramToggle = (program: string) => {
    setOrderLineDraft((prev) => ({
      ...prev,
      programs: prev.programs.includes(program)
        ? prev.programs.filter((item) => item !== program)
        : [...prev.programs, program],
      classId: ''
    }));
  };

  const handleOrderDraftPaymentScheduleChange = (
    rowId: string,
    field: keyof Pick<IQuotationPaymentScheduleTerm, 'installmentLabel' | 'condition' | 'amount' | 'expectedDate' | 'dueDate'>,
    value: string
  ) => {
    setOrderLineDraft((prev) => ({
      ...prev,
      paymentSchedule: prev.paymentSchedule.map((row) =>
        row.id !== rowId
          ? row
          : {
              ...row,
              [field]: field === 'amount' ? Math.max(0, Math.round(Number(value) || 0)) : value
            }
      )
    }));
  };

  const handleRemoveOrderLine = () => {
    if (editingCreatorLineId) {
      setCreatorLineItems((prev) => prev.filter((item) => item.id !== editingCreatorLineId));
    }
    closeOrderLineModal();
  };

  const handleSaveOrderLine = (mode: 'close' | 'new') => {
    if (!orderLineDraft.studentName || !orderLineDraft.targetMarket || !orderLineDraft.servicePackage) {
      alert('Vui lòng nhập đủ tên học sinh, thị trường mục tiêu và gói dịch vụ.');
      return;
    }

    const selectedClass = [...getTrainingClasses(), ...CREATOR_CLASS_FALLBACKS].find((item) => item.id === orderLineDraft.classId);
    const total = calculateCreatorLineTotal(orderLineDraft.unitPrice, orderLineDraft.discountPercent);
    const paymentSchedule = normalizePaymentSchedule(orderLineDraft.paymentSchedule, total);
    const pricingNote = formatPaymentScheduleNote(paymentSchedule);

    const nextLineItem: IQuotationLineItem = {
      id: editingCreatorLineId || orderLineDraft.id,
      productId: orderLineDraft.productId,
      name: orderLineDraft.productName || orderLineDraft.servicePackage,
      quantity: 1,
      unitPrice: orderLineDraft.unitPrice,
      discount: orderLineDraft.discountPercent,
      total,
      studentName: orderLineDraft.studentName,
      studentDob: fromInputDate(orderLineDraft.studentDob, formData.studentDob),
      targetMarket: orderLineDraft.targetMarket || undefined,
      servicePackage: orderLineDraft.servicePackage || undefined,
      programs: orderLineDraft.programs,
      classId: orderLineDraft.classId || undefined,
      className: selectedClass?.name,
      additionalInfo: orderLineDraft.additionalInfo || undefined,
      paymentSchedule
    };

    setCreatorLineItems((prev) =>
      editingCreatorLineId
        ? prev.map((item) => (item.id === editingCreatorLineId ? nextLineItem : item))
        : [...prev, nextLineItem]
    );
    if (pricingNote) {
      setFormData((prev) => ({ ...prev, pricingNote }));
    }

    if (mode === 'new') {
      setEditingCreatorLineId(null);
      setOrderLineDraft(createOrderDraft(formData, {
        studentName: orderLineDraft.studentName,
        studentDob: orderLineDraft.studentDob,
        targetMarket: orderLineDraft.targetMarket
      }));
      return;
    }

    closeOrderLineModal();
  };

  const handleSaveCreatorDraft = () => {
    persistQuotation({ syncContract: false, navigateToList: true });
    setQuotationCreatorWorkflowStatus('draft');
  };

  const handleCreateCreatorQuotation = () => {
    const savedQuotation = persistQuotation({ syncContract: false });
    setQuotationCreatorWorkflowStatus('draft');
    alert(`Đã tạo báo giá thành công (${savedQuotation.soCode})`);
  };

  const handlePrintCreatorQuotation = () => {
    const savedQuotation = persistQuotation({ syncContract: false });
    setQuotationCreatorWorkflowStatus('draft');
    alert(`Đang mở bản in cho ${savedQuotation.soCode}`);
    window.print();
  };

  const handleConfirmCreatorQuotation = () => {
    const savedQuotation = persistQuotation({
      nextStatus: QuotationStatus.SALE_ORDER,
      syncContract: false
    });
    setQuotationCreatorWorkflowStatus('sale_order');
    alert(`Đã xác nhận ${savedQuotation.soCode} thành đơn bán hàng`);
  };

  const handleCancelCreatorQuotation = () => {
    setQuotationCreatorWorkflowStatus('cancelled');
  };

  const productOptions = useMemo(() => {
    if (!formData.product) return PRODUCTS;
    const exists = PRODUCTS.some((p) => p.name === formData.product);
    if (exists) return PRODUCTS;
    return [
      ...PRODUCTS,
      {
        id: 'legacy-product',
        name: formData.product,
        price: formData.amount || formData.finalAmount || 0
      }
    ];
  }, [formData.product, formData.amount, formData.finalAmount]);

  const customerOptions = useMemo<CustomerOption[]>(() => {
    const contacts = getContacts().map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone || '',
      email: c.email || '',
      source: 'contact' as const
    }));
    const leads = getLeads().map((l) => ({
      id: l.id,
      name: l.name,
      phone: l.phone || '',
      email: l.email || '',
      source: 'lead' as const
    }));
    const merged = [...contacts, ...leads];
    const keyword = (customerQuery || '').trim().toLowerCase();
    if (!keyword) return merged.slice(0, 20);
    return merged
      .filter((c) =>
        [c.name, c.phone, c.email].some((v) => (v || '').toLowerCase().includes(keyword))
      )
      .slice(0, 20);
  }, [customerQuery]);

  const applyCustomerSelection = (customer: CustomerOption, options?: { includeDob?: boolean }) => {
    const sourceLead = customer.source === 'lead' ? getLeadById(customer.id) : undefined;
    setFormData((prev) => ({
      ...prev,
      customerName: customer.name,
      customerId: customer.id,
      leadId: customer.source === 'lead' ? customer.id : prev.leadId,
      studentPhone: customer.phone || prev.studentPhone || sourceLead?.phone,
      studentEmail: customer.email || prev.studentEmail || sourceLead?.email,
      studentDob: options?.includeDob ? sourceLead?.dob || prev.studentDob : prev.studentDob,
      studentAddress: sourceLead?.address || prev.studentAddress,
      identityCard: sourceLead?.identityCard || prev.identityCard,
      guardianName: sourceLead?.guardianName || prev.guardianName,
      guardianPhone: sourceLead?.guardianPhone || prev.guardianPhone
    }));
    setCustomerQuery(customer.name);
    setCustomerDropdownOpen(false);
  };

  const creatorTeachers = useMemo(() => getTeachers(), []);

  const creatorClasses = useMemo(() => {
    const classes = [...getTrainingClasses(), ...CREATOR_CLASS_FALLBACKS];
    const seen = new Set<string>();
    return classes.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, []);

  const availableServicePackages = useMemo(() => {
    if (!orderLineDraft.targetMarket) return [];
    return Array.from(
      new Set(
        ORDER_LINE_CATALOG.filter((item) => item.market === orderLineDraft.targetMarket).map((item) => item.servicePackage)
      )
    );
  }, [orderLineDraft.targetMarket]);

  const availableProducts = useMemo(() => {
    if (!orderLineDraft.targetMarket || !orderLineDraft.servicePackage) return [];
    return ORDER_LINE_CATALOG.filter(
      (item) => item.market === orderLineDraft.targetMarket && item.servicePackage === orderLineDraft.servicePackage
    );
  }, [orderLineDraft.servicePackage, orderLineDraft.targetMarket]);

  const availableProgramOptions = useMemo(() => {
    return Array.from(new Set(availableProducts.flatMap((item) => item.programOptions)));
  }, [availableProducts]);

  const availableClassOptions = useMemo(() => {
    if (!orderLineDraft.targetMarket) return creatorClasses;

    return creatorClasses.filter((trainingClass) => {
      const language = (trainingClass.language || '').toLowerCase();
      const matchesMarket =
        orderLineDraft.targetMarket === 'Đức' ? language.includes('đức') || language.includes('german') : language.includes('trung') || language.includes('chinese');

      if (!matchesMarket) return false;
      if (orderLineDraft.programs.length === 0) return true;

      const classTokens = `${trainingClass.level || ''} ${trainingClass.name || ''}`.toLowerCase();
      return orderLineDraft.programs.some((program) => classTokens.includes(program.toLowerCase()));
    });
  }, [creatorClasses, orderLineDraft.programs, orderLineDraft.targetMarket]);

  const creatorSubtotal = useMemo(
    () => creatorLineItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0),
    [creatorLineItems]
  );

  const creatorGrandTotal = creatorSubtotal;
  const resolvedOrderPaymentPlan = useMemo(
    () =>
      resolveServicePaymentPlan(
        orderLineDraft.targetMarket,
        orderLineDraft.servicePackage,
        calculateOrderDraftLineTotal(orderLineDraft.unitPrice, orderLineDraft.discountPercent)
      ),
    [orderLineDraft.discountPercent, orderLineDraft.servicePackage, orderLineDraft.targetMarket, orderLineDraft.unitPrice]
  );
  const quotationServicePackageSummary = useMemo(() => {
    const packageNames = Array.from(
      new Set(
        creatorLineItems
          .map((item) => String(item.servicePackage || '').trim())
          .filter(Boolean)
      )
    );

    if (packageNames.length > 0) {
      return packageNames.join(', ');
    }

    return SERVICES.find((service) => service.id === formData.serviceType)?.name || '-';
  }, [creatorLineItems, formData.serviceType]);
  const quotationAmountDisplay = formatCurrency(creatorGrandTotal || formData.finalAmount || formData.amount || 0);
  const quotationPrintSummaryItems = useMemo(
    () => [
      { label: 'Khách hàng', value: formData.customerName || '-', wide: false },
      { label: 'SĐT khách hàng', value: formData.studentPhone || '-', wide: false },
      { label: 'Gói dịch vụ', value: quotationServicePackageSummary || '-', wide: false },
      { label: 'Địa chỉ khách hàng', value: formData.studentAddress || '-', wide: false },
      { label: 'Ngày hết hạn báo giá', value: formatDisplayDate(formData.expirationDate) || '-', wide: false },
      { label: 'Giá tiền', value: quotationAmountDisplay, wide: false }
    ],
    [
      formData.customerName,
      formData.expirationDate,
      formData.studentAddress,
      formData.studentPhone,
      quotationAmountDisplay,
      quotationServicePackageSummary
    ]
  );
  const editableOrderLineItems = useMemo<IQuotationLineItem[]>(() => {
    if (creatorLineItems.length > 0) return creatorLineItems;

    return [
      {
        id: formData.id ? `${formData.id}-line-1` : 'quotation-line-1',
        productId: productOptions.find((item) => item.name === formData.product)?.id,
        name: formData.product || '',
        quantity: 1,
        unitPrice: toNumberOrZero(formData.finalAmount || formData.amount),
        discount: 0,
        total: toNumberOrZero(formData.finalAmount || formData.amount),
        studentName: getPrimaryQuotationStudentName(formData),
        studentDob: formData.studentDob,
        courseName: Array.isArray(formData.lineItems)
          ? formData.lineItems.map((item) => String(item.courseName || '').trim()).filter(Boolean).join(', ')
          : '',
        servicePackage: formData.lineItems?.[0]?.servicePackage,
        programs: Array.isArray(formData.lineItems?.[0]?.programs) ? formData.lineItems?.[0]?.programs : [],
        additionalInfo: formData.lineItems?.[0]?.additionalInfo || formData.internalNote || ''
      }
    ];
  }, [creatorLineItems, formData, productOptions]);

  useEffect(() => {
    setOrderLineDraft((prev) => {
      if (!prev.targetMarket || !prev.servicePackage) {
        if (prev.paymentSchedule.length === 0) return prev;
        return { ...prev, paymentSchedule: [] };
      }

      const fallbackAmount = calculateOrderDraftLineTotal(prev.unitPrice, prev.discountPercent);
      const templateSchedule = resolvedOrderPaymentPlan
        ? buildPaymentScheduleFromPlan(resolvedOrderPaymentPlan)
        : buildPaymentScheduleFallback(fallbackAmount);
      const mergedSchedule = templateSchedule.map((step, index) => {
        const existing = prev.paymentSchedule[index];
        return {
          ...step,
          id: existing?.id || step.id,
          installmentLabel: existing?.installmentLabel || step.installmentLabel,
          condition: existing?.condition || step.condition,
          expectedDate: existing?.expectedDate || '',
          dueDate: existing?.dueDate || ''
        };
      });

      if (JSON.stringify(mergedSchedule) === JSON.stringify(prev.paymentSchedule)) {
        return prev;
      }

      return {
        ...prev,
        paymentSchedule: mergedSchedule
      };
    });
  }, [resolvedOrderPaymentPlan]);

  const syncEditableOrderLineItems = (nextItems: IQuotationLineItem[]) => {
    const normalizedItems = nextItems.map((item, index) => {
      const quantity = Math.max(1, toNumberOrZero(item.quantity || 1));
      const unitPrice = Math.max(0, toNumberOrZero(item.unitPrice));
      const discount = Math.max(0, toNumberOrZero(item.discount));
      const total = Math.max(0, unitPrice * quantity * (1 - discount / 100));

      return {
        ...item,
        id: item.id || `quotation-line-${index + 1}`,
        quantity,
        unitPrice,
        discount,
        total
      };
    });

    const subtotal = normalizedItems.reduce((sum, item) => sum + (item.unitPrice || 0) * (item.quantity || 0), 0);
    const finalTotal = normalizedItems.reduce((sum, item) => sum + (item.total || 0), 0);
    const primaryLineItem = normalizedItems[0];
    const nextProduct = normalizedItems.map((item) => item.name).filter(Boolean).join(' + ');

    setCreatorLineItems(normalizedItems);
    setFormData((prev) => ({
      ...prev,
      lineItems: normalizedItems,
      product: nextProduct || prev.product || '',
      amount: subtotal,
      discount: Math.max(0, subtotal - finalTotal),
      finalAmount: finalTotal,
      serviceType:
        primaryLineItem?.servicePackage === 'Du học'
          ? 'StudyAbroad'
          : primaryLineItem?.servicePackage === 'Combo'
            ? 'Combo'
            : primaryLineItem?.servicePackage === 'Đào tạo'
              ? 'Training'
              : prev.serviceType,
      studentDob: primaryLineItem?.studentDob || prev.studentDob,
      internalNote: primaryLineItem?.additionalInfo || prev.internalNote
    }));
  };

  const paymentDebtRows = useMemo(() => {
    const totalPaid = formData.id
      ? getTransactions()
          .filter((transaction) => transaction.quotationId === formData.id && transaction.status === 'DA_DUYET')
          .reduce((sum, transaction) => sum + toNumberOrZero(transaction.amount), 0)
      : 0;

    let paidPool = totalPaid;
    const rows = editableOrderLineItems.flatMap((item, itemIndex) => {
      const lineTotal = Math.max(0, toNumberOrZero(item.total) || calculateOrderDraftLineTotal(item.unitPrice || 0, item.discount || 0));
      const schedule = normalizePaymentSchedule(item.paymentSchedule, lineTotal);

      return schedule.map((term, termIndex) => {
        const mustCollect = Math.max(0, toNumberOrZero(term.amount));
        const paidAmount = Math.min(mustCollect, Math.max(paidPool, 0));
        paidPool = Math.max(paidPool - paidAmount, 0);
        const remainingAmount = Math.max(mustCollect - paidAmount, 0);
        const dueTimestamp = term.dueDate ? new Date(term.dueDate).getTime() : Number.NaN;

        let status: PaymentDebtCollectionStatus = 'CAN_XU_LY';
        if (remainingAmount <= 0) status = 'HOAN_TAT';
        else if (paidAmount > 0) status = 'THU_1_PHAN';
        else if (!Number.isNaN(dueTimestamp) && dueTimestamp > Date.now()) status = 'CHUA_DEN';

        return {
          id: `${item.id}-${term.id || termIndex + 1}`,
          lineLabel: item.name || item.servicePackage || `Dòng ${itemIndex + 1}`,
          installmentLabel: term.installmentLabel || `Lần ${term.termNo || termIndex + 1}`,
          condition: term.condition || '-',
          mustCollect,
          remainingAmount,
          status,
          expectedDate: term.expectedDate,
          dueDate: term.dueDate
        };
      });
    });

    return {
      rows,
      totalPaid,
      totalMustCollect: rows.reduce((sum, row) => sum + row.mustCollect, 0),
      totalRemaining: rows.reduce((sum, row) => sum + row.remainingAmount, 0)
    };
  }, [editableOrderLineItems, formData.id]);

  const approvedRefundAmount = Math.max(0, toNumberOrZero(formData.refundAmount));
  const totalMustCollectAmount = Math.max(paymentDebtRows.totalMustCollect, toNumberOrZero(formData.finalAmount || formData.amount));
  const totalApprovedCollectedAmount = paymentDebtRows.totalPaid;
  const actualNetAmount = Math.max(0, totalMustCollectAmount - totalApprovedCollectedAmount - approvedRefundAmount);

  const paymentDebtSection = (
    <div className="space-y-2">
      <div className="bg-white">
        <div className="border-b border-slate-100 px-3 py-2">
          <div>
            <div className="text-sm font-semibold text-slate-900">Thanh toán & công nợ</div>
            <div className="text-[11px] text-slate-500">Danh sách công nợ theo lộ trình đóng phí đã nhập trên SO.</div>
          </div>
        </div>

        {paymentDebtRows.rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left">
              <colgroup>
                <col className="w-[25%]" />
                <col className="w-[8%]" />
                <col className="w-[26%]" />
                <col className="w-[10%]" />
                <col className="w-[10%]" />
                <col className="w-[10%]" />
                <col className="w-[5.5%]" />
                <col className="w-[5.5%]" />
              </colgroup>
              <thead className="bg-slate-50">
                <tr>
                  <th className="whitespace-nowrap px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.04em] text-slate-500">Gói dịch vụ</th>
                  <th className="whitespace-nowrap px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.04em] text-slate-500">Đợt thu</th>
                  <th className="whitespace-nowrap px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.04em] text-slate-500">Điều kiện đóng</th>
                  <th className="whitespace-nowrap px-3 py-1.5 text-right text-[11px] font-bold uppercase tracking-[0.04em] text-slate-500">Phải thu</th>
                  <th className="whitespace-nowrap px-3 py-1.5 text-right text-[11px] font-bold uppercase tracking-[0.04em] text-slate-500">Còn thiếu</th>
                  <th className="whitespace-nowrap px-3 py-1.5 text-center text-[11px] font-bold uppercase tracking-[0.04em] text-slate-500">Trạng thái</th>
                  <th className="whitespace-nowrap px-3 py-1.5 text-center text-[11px] font-bold uppercase tracking-[0.04em] text-slate-500">Thời gian dự kiến</th>
                  <th className="whitespace-nowrap px-3 py-1.5 text-center text-[11px] font-bold uppercase tracking-[0.04em] text-slate-500">Thời gian cần đóng</th>
                </tr>
              </thead>
              <tbody>
                {paymentDebtRows.rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-50 last:border-b-0">
                    <td className="whitespace-nowrap px-3 py-1 align-top text-[13px] font-medium text-slate-800">{row.lineLabel}</td>
                    <td className="whitespace-nowrap px-3 py-1 align-top text-[12px] text-slate-700">{row.installmentLabel}</td>
                    <td className="whitespace-nowrap px-3 py-1 align-top text-[12px] text-slate-600">{row.condition || '-'}</td>
                    <td className="whitespace-nowrap px-3 py-1 align-top text-right text-[12px] font-semibold text-slate-800">{formatCurrencyValue(row.mustCollect)}</td>
                    <td className="whitespace-nowrap px-3 py-1 align-top text-right text-[12px] font-semibold text-amber-700">{formatCurrencyValue(row.remainingAmount)}</td>
                    <td className="whitespace-nowrap px-3 py-1 align-top text-center">
                      <span className={`inline-flex rounded-sm px-1.5 py-0.5 text-[10px] font-semibold ${PAYMENT_DEBT_STATUS_STYLES[row.status]}`}>
                        {PAYMENT_DEBT_STATUS_LABELS[row.status]}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-1 align-top text-center text-[12px] text-slate-600">{formatDisplayDate(row.expectedDate) || '-'}</td>
                    <td className="whitespace-nowrap px-3 py-1 align-top text-center text-[12px] text-slate-600">{formatDisplayDate(row.dueDate) || '-'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50">
                <tr className="border-t border-slate-100">
                  <td className="whitespace-nowrap px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.04em] text-slate-500" colSpan={3}>
                    Tổng
                  </td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-right text-[12px] font-bold text-slate-900">{formatCurrencyValue(paymentDebtRows.totalMustCollect)}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-right text-[12px] font-bold text-amber-700">{formatCurrencyValue(paymentDebtRows.totalRemaining)}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-center text-[11px] text-slate-500">Đã thu: {formatCurrencyValue(paymentDebtRows.totalPaid)}</td>
                  <td className="px-3 py-1.5" colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="px-4 py-10 text-center text-sm text-slate-500">
            Chưa có lộ trình đóng phí để hiển thị công nợ.
          </div>
        )}
      </div>
    </div>
  );

  const handleEditableOrderLineChange = (
    lineId: string,
    field: 'name' | 'studentName' | 'studentDob' | 'servicePackage' | 'courseName' | 'unitPrice' | 'discount' | 'additionalInfo',
    value: string
  ) => {
    const nextItems = editableOrderLineItems.map((item) => {
      if (item.id !== lineId) return item;

      if (field === 'unitPrice') {
        const unitPrice = Math.max(0, toNumberOrZero(value));
        return {
          ...item,
          unitPrice,
          total: Math.max(0, unitPrice * (item.quantity || 1) * (1 - (item.discount || 0) / 100))
        };
      }

      if (field === 'discount') {
        const discount = Math.min(100, Math.max(0, toNumberOrZero(value)));
        return {
          ...item,
          discount,
          total: Math.max(0, (item.unitPrice || 0) * (item.quantity || 1) * (1 - discount / 100))
        };
      }

      return {
        ...item,
        [field]: value
      };
    });

    syncEditableOrderLineItems(nextItems);
  };

  const newQuotationView = isNew ? (
      <div className="min-h-screen bg-slate-100 p-4 md:p-6 text-sm text-slate-800">
        <div className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-white px-6 py-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex h-8">
                <div className="flex items-center">
                  <div className={`rounded-l-md border border-slate-200 px-5 py-1.5 text-[10px] font-extrabold uppercase ${quotationCreatorWorkflowStatus === 'draft' ? 'bg-blue-50 text-[#2b5a83]' : 'bg-white text-slate-400'}`}>Báo giá</div>
                  <div className="relative h-full w-[16px] overflow-hidden">
                    <div className={`absolute left-[-8px] top-[-8px] h-[32px] w-[32px] rotate-45 border border-slate-200 ${quotationCreatorWorkflowStatus === 'draft' ? 'bg-blue-50' : 'bg-white'}`} />
                  </div>
                </div>
                <div className="ml-[-12px] flex items-center">
                  <div className={`border-y border-slate-200 px-5 py-1.5 text-[10px] font-bold uppercase ${quotationCreatorWorkflowStatus === 'sent' ? 'bg-blue-50 text-[#2b5a83]' : 'bg-white text-slate-400'}`}>Đã gửi báo giá</div>
                  <div className="relative h-full w-[16px] overflow-hidden">
                    <div className={`absolute left-[-8px] top-[-8px] h-[32px] w-[32px] rotate-45 border border-slate-200 ${quotationCreatorWorkflowStatus === 'sent' ? 'bg-blue-50' : 'bg-white'}`} />
                  </div>
                </div>
                <div className="ml-[-12px] flex items-center">
                  <div className={`rounded-r-md border border-slate-200 px-5 py-1.5 text-[10px] font-bold uppercase ${quotationCreatorWorkflowStatus === 'sale_order' ? 'bg-blue-50 text-[#2b5a83]' : 'bg-white text-slate-400'}`}>Đơn bán hàng</div>
                </div>
                {quotationCreatorWorkflowStatus === 'cancelled' && (
                  <div className="ml-2 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-[10px] font-bold uppercase text-red-600">Đã hủy</div>
                )}
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={handleCreateCreatorQuotation} className="rounded bg-blue-600 px-5 py-1.5 text-xs font-bold uppercase text-white shadow-sm hover:bg-blue-700">
                    Tạo
                  </button>
                  <button onClick={() => navigate('/contracts/quotations')} className="flex h-8 w-8 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 shadow-sm hover:bg-slate-50">
                    <X size={14} />
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-y-auto bg-white p-12">
              <div className="mx-auto max-w-4xl">
                <h2 className="mb-8 text-3xl font-bold tracking-tight text-slate-800">Mới</h2>

                <div className="mb-12 grid grid-cols-1 gap-x-20 gap-y-5 lg:grid-cols-2">
                  <div className="space-y-4">
                    <div className="flex min-h-[32px] items-center">
                      <label className="w-40 text-[13px] font-bold text-slate-700">Khách hàng</label>
                      <div className="relative flex-1">
                        <div className="flex items-center rounded border border-slate-300 bg-blue-50 px-3 py-1.5">
                          <input
                            className="w-full bg-transparent text-[13px] font-bold text-blue-900 outline-none"
                            value={customerQuery || formData.customerName || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              setCustomerQuery(value);
                              setFormData((prev) => ({ ...prev, customerName: value }));
                              setCustomerDropdownOpen(true);
                            }}
                            onFocus={() => setCustomerDropdownOpen(true)}
                            onBlur={() => setTimeout(() => setCustomerDropdownOpen(false), 120)}
                            placeholder="Chọn hoặc nhập khách hàng"
                          />
                          <button
                            type="button"
                            className="text-slate-500 hover:text-slate-700"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => setCustomerDropdownOpen((prev) => !prev)}
                          >
                            <ChevronDown size={16} />
                          </button>
                        </div>

                        {customerDropdownOpen && (
                          <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded border bg-white shadow">
                            {customerOptions.length > 0 ? (
                              customerOptions.map((customer) => {
                                return (
                                  <button
                                    key={`${customer.source}-${customer.id}`}
                                    type="button"
                                    className="w-full border-b px-3 py-2 text-left hover:bg-slate-50"
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      applyCustomerSelection(customer, { includeDob: true });
                                    }}
                                  >
                                    <div className="font-medium text-slate-800">{customer.name}</div>
                                    <div className="text-xs text-slate-500">{customer.phone || customer.email || 'Không có thông tin liên hệ'}</div>
                                  </button>
                                );
                              })
                            ) : (
                              <div className="px-3 py-2 text-xs text-slate-500">Không có khách hàng phù hợp</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex min-h-[32px] items-center">
                      <label className="w-40 text-[13px] font-bold text-slate-700">Sale phụ trách</label>
                      <select
                        className="flex-1 rounded border border-slate-300 bg-blue-50 px-3 py-1.5 text-[13px] outline-none transition-colors focus:border-blue-500"
                        value={formData.createdBy || user?.id || ''}
                        onChange={(e) => {
                          const selectedSale = salesOwnerOptions.find((option) => option.id === e.target.value);
                          setFormData((prev) => ({
                            ...prev,
                            createdBy: e.target.value,
                            salespersonName: selectedSale?.name || prev.salespersonName || ''
                          }));
                        }}
                      >
                        {salesOwnerOptions.map((option) => (
                          <option key={option.id} value={option.id}>{option.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex min-h-[32px] items-center">
                      <label className="w-[148px] text-[13px] font-bold text-slate-700">Ngày hết hạn</label>
                      <div className="flex-1">
                        <input
                          type="date"
                          className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-[13px] outline-none transition-colors focus:border-blue-500"
                          value={formData.expirationDate || ''}
                          onChange={(e) => setFormData((prev) => ({ ...prev, expirationDate: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-6 flex gap-8 border-b border-slate-200 px-2">
                  <button onClick={() => setActiveTab('order_lines')} className={`pb-3 text-[11px] font-extrabold uppercase tracking-wider ${activeTab === 'order_lines' ? 'border-b-2 border-blue-700 text-blue-700' : 'text-slate-400 transition-colors hover:text-slate-600'}`}>Chi tiết đơn hàng</button>
                  <button onClick={() => setActiveTab('other_info')} className={`pb-3 text-[11px] font-extrabold uppercase tracking-wider ${activeTab === 'other_info' ? 'border-b-2 border-blue-700 text-blue-700' : 'text-slate-400 transition-colors hover:text-slate-600'}`}>Thông tin khác</button>
                </div>

                {activeTab === 'order_lines' && (
                  <div className="overflow-x-auto">
                    <table className="w-full table-fixed border-collapse text-left text-[12px]">
                      <colgroup>
                        <col className="w-[19%]" />
                        <col className="w-[30%]" />
                        <col className="w-[15%]" />
                        <col className="w-[14%]" />
                        <col className="w-[22%]" />
                      </colgroup>
                      <thead className="bg-[#f8f9fa] font-bold uppercase text-slate-700">
                        <tr className="border-b border-slate-200">
                          <th className="p-3">Gói dịch vụ</th>
                          <th className="p-3">Chương trình</th>
                          <th className="p-3 text-right">Đơn giá</th>
                          <th className="p-3 text-center">Giảm giá (%)</th>
                          <th className="p-3 text-right">Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {creatorLineItems.map((item) => (
                          <tr
                            key={item.id}
                            className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50"
                            onClick={() => openEditOrderLineModal(item.id)}
                          >
                            <td className="align-top p-3 text-slate-700">{item.servicePackage || '-'}</td>
                            <td className="align-top p-3 text-slate-500">
                              <div className="text-[11px] leading-5">
                                <div className="font-semibold text-slate-700">
                                  {item.programs?.length ? item.programs.join(', ') : item.courseName || '-'}
                                </div>
                                {item.courseName && item.programs?.length ? (
                                  <div>
                                    <span className="font-semibold text-slate-500">Khóa học:</span> {item.courseName}
                                  </div>
                                ) : null}
                                {item.testerName ? (
                                  <div>
                                    <span className="font-semibold text-slate-500">Tester:</span> {item.testerName}
                                  </div>
                                ) : null}
                                {item.className ? (
                                  <div>
                                    <span className="font-semibold text-slate-500">Lớp:</span> {item.className}
                                  </div>
                                ) : null}
                                {item.additionalInfo ? (
                                  <div>
                                    <span className="font-semibold text-slate-500">Thông tin thêm:</span> {item.additionalInfo}
                                  </div>
                                ) : null}
                                {!item.courseName && !item.programs?.length && !item.testerName && !item.className && !item.additionalInfo && (
                                  <div className="italic text-slate-400">Không có thông tin thêm</div>
                                )}
                              </div>
                            </td>
                            <td className="align-top p-3 text-right text-slate-700">{(item.unitPrice || 0).toLocaleString('vi-VN')}</td>
                            <td className="align-top p-3 text-center text-slate-700">{item.discount || 0}</td>
                            <td className="align-top p-3 text-right font-bold text-slate-900">{(item.total || 0).toLocaleString('vi-VN')}</td>
                          </tr>
                        ))}
                        <tr className="bg-slate-50/30">
                          <td colSpan={5} className="p-3">
                            <button onClick={openNewOrderLineModal} className="flex items-center gap-1 font-bold text-blue-600 transition-all hover:underline">
                              <Plus size={14} /> Thêm đơn hàng
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {activeTab === 'other_info' && (
                  <div className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase text-slate-600">Loại dịch vụ</label>
                      <select
                        value={formData.serviceType || 'Training'}
                        onChange={(e) => setFormData((prev) => ({ ...prev, serviceType: e.target.value as IQuotation['serviceType'] }))}
                        className="h-9 w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-[13px]"
                      >
                        <option value="Training">Đào tạo</option>
                        <option value="StudyAbroad">Du học</option>
                        <option value="Combo">Combo</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase text-slate-600">Mã lớp dự kiến</label>
                      <ClassCodeLookupInput
                        value={formData.classCode || ''}
                        onChange={(value) => setFormData((prev) => ({ ...prev, classCode: value }))}
                        loadOptions={loadClassCodeOptions}
                        disabled={isLocked}
                        placeholder="VD: DE-A1-02/2026"
                        inputClassName="h-9 w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-[13px] outline-none focus:border-blue-500"
                        buttonClassName="h-9 rounded border border-slate-300 bg-white px-3 text-[12px] font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase text-slate-600">Lịch học mong muốn</label>
                      <input
                        value={formData.schedule || ''}
                        onChange={(e) => setFormData((prev) => ({ ...prev, schedule: e.target.value }))}
                        className="h-9 w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-[13px]"
                        placeholder="VD: T2-T4-T6, 19:00-21:00"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase text-slate-600">Ghi chú chính sách giá</label>
                      <input
                        value={formData.pricingNote || ''}
                        onChange={(e) => setFormData((prev) => ({ ...prev, pricingNote: e.target.value }))}
                        className="h-9 w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-[13px]"
                        placeholder="Nêu lý do giảm giá/chính sách áp dụng..."
                      />
                    </div>
                    <div className="col-span-1 grid items-end gap-3 md:col-span-2 md:grid-cols-[minmax(0,1fr)_auto]">
                      <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase text-slate-600">Thông tin khác</label>
                        <textarea
                          value={formData.internalNote || ''}
                          onChange={(e) => setFormData((prev) => ({ ...prev, internalNote: e.target.value }))}
                          className="h-14 w-full resize-none rounded border border-slate-300 bg-white px-3 py-2 text-[13px]"
                          placeholder="Ghi chú nội bộ hoặc yêu cầu xử lý..."
                        />
                      </div>
                      <label className="inline-flex whitespace-nowrap pb-2 text-[13px] font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={!!formData.needInvoice}
                          onChange={(e) => setFormData((prev) => ({ ...prev, needInvoice: e.target.checked }))}
                          className="mr-2 rounded border-slate-300"
                        />
                        KH cần in hóa đơn VAT
                      </label>
                    </div>
                  </div>
                )}

                <div className="mt-16 flex justify-end">
                  <div className="w-80 space-y-2 border-t border-slate-800 pt-4">
                    <div className="flex justify-between py-1 text-[13px]">
                      <span className="font-bold text-slate-500">Số tiền trước thuế:</span>
                      <span className="border-b border-slate-200 px-6 font-bold text-slate-900">{creatorSubtotal.toLocaleString('vi-VN')} ₫</span>
                    </div>
                    <div className="flex justify-between py-1 text-[13px]">
                      <span className="font-bold text-slate-500">Thuế:</span>
                      <span className="border-b border-slate-200 px-6 font-bold text-slate-900">0 ₫</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t border-slate-200 py-5">
                      <span className="text-lg font-black uppercase tracking-tighter text-slate-800">Tổng cộng:</span>
                      <span className="border-b-2 border-slate-800 px-6 text-2xl font-black tracking-tight text-blue-700">{creatorGrandTotal.toLocaleString('vi-VN')} ₫</span>
                    </div>
                  </div>
                </div>

                {showOrderLineModal && (
                  <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/50 p-3 backdrop-blur-sm">
                    <div className="flex max-h-[calc(100vh-1rem)] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
                      <div className="shrink-0 flex items-center justify-between border-b border-slate-200 px-6 py-3">
                        <h3 className="text-lg font-bold text-slate-900">
                          {editingCreatorLineId ? 'Cập nhật đơn hàng' : 'Thêm đơn hàng'}
                        </h3>
                        <button type="button" onClick={closeOrderLineModal} className="text-slate-400 transition-colors hover:text-slate-700">
                          <X size={18} />
                        </button>
                      </div>

                      <div className="min-h-0 overflow-y-auto px-6 py-4">
                        <div className="grid gap-4 md:grid-cols-2">
                        <div className="min-w-0 space-y-3">
                          <div>
                            <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Tên học sinh</label>
                            <input
                              value={orderLineDraft.studentName}
                              onChange={(e) => setOrderLineDraft((prev) => ({ ...prev, studentName: e.target.value }))}
                              className="h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500"
                              placeholder="Nhập tên học sinh"
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Ngày sinh</label>
                            <input
                              type="date"
                              value={orderLineDraft.studentDob}
                              onChange={(e) => setOrderLineDraft((prev) => ({ ...prev, studentDob: e.target.value }))}
                              className="h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500"
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Thị trường mục tiêu</label>
                            <select
                              value={orderLineDraft.targetMarket}
                              onChange={(e) => handleOrderDraftMarketChange(e.target.value as CreatorMarket | '')}
                              className="h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500"
                            >
                              <option value="">-- Chọn thị trường --</option>
                              {CREATOR_MARKETS.map((market) => (
                                <option key={market} value={market}>{market}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Gói dịch vụ</label>
                            <select
                              value={orderLineDraft.servicePackage}
                              onChange={(e) => handleOrderDraftServiceChange(e.target.value as CreatorServicePackage | '')}
                              className="h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500"
                            >
                              <option value="">-- Chọn gói dịch vụ --</option>
                              {availableServicePackages.map((servicePackage) => (
                                <option key={servicePackage} value={servicePackage}>{servicePackage}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="min-w-0 space-y-3">
                          <div ref={programDropdownRef} className="relative min-w-0">
                            <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Chương trình</label>
                            <button
                              type="button"
                              onClick={() => setProgramDropdownOpen((prev) => !prev)}
                              className="flex h-10 w-full items-center justify-between gap-3 rounded border border-slate-300 bg-white px-3 text-left text-sm outline-none transition-colors hover:border-blue-400 focus:border-blue-500"
                            >
                              <div className="min-w-0 flex flex-1 flex-nowrap items-center gap-2 overflow-hidden">
                                {orderLineDraft.programs.length > 0 ? (
                                  orderLineDraft.programs.map((program) => (
                                    <span key={program} className="shrink-0 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                                      {program}
                                    </span>
                                  ))
                                ) : (
                                  <span className="truncate text-sm text-slate-400">
                                    -- Chọn chương trình --
                                  </span>
                                )}
                              </div>
                              <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${programDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {programDropdownOpen && (
                              <div className="absolute z-30 mt-1 w-full rounded border border-slate-200 bg-white shadow-lg">
                                <div className="max-h-56 overflow-auto py-1">
                                  {availableProgramOptions.length > 0 ? (
                                    availableProgramOptions.map((program) => (
                                      <label key={program} className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50">
                                        <input
                                          type="checkbox"
                                          checked={orderLineDraft.programs.includes(program)}
                                          onChange={() => handleOrderDraftProgramToggle(program)}
                                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span>{program}</span>
                                      </label>
                                    ))
                                  ) : (
                                    <div className="px-3 py-2 text-sm text-slate-400">Chưa có chương trình phù hợp</div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Lớp</label>
                            <select
                              value={orderLineDraft.classId}
                              onChange={(e) => setOrderLineDraft((prev) => ({ ...prev, classId: e.target.value }))}
                              className="h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500"
                            >
                              <option value="">-- Chọn lớp --</option>
                              {availableClassOptions.map((trainingClass) => (
                                <option key={trainingClass.id} value={trainingClass.id}>
                                  {trainingClass.name} {trainingClass.schedule ? `• ${trainingClass.schedule}` : ''}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-3">
                            <div>
                              <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Đơn giá</label>
                              <input
                                type="number"
                                min={0}
                                value={orderLineDraft.unitPrice}
                                onChange={(e) => setOrderLineDraft((prev) => ({ ...prev, unitPrice: Math.max(0, Number(e.target.value) || 0) }))}
                                className="h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Giảm giá (%)</label>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={orderLineDraft.discountPercent}
                                onChange={(e) => setOrderLineDraft((prev) => ({ ...prev, discountPercent: Math.min(100, Math.max(0, Number(e.target.value) || 0)) }))}
                                className="h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500"
                              />
                            </div>
                          </div>
                        </div>

                            <div className="md:col-span-2">
                              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                <div className="mb-2 flex items-center justify-between">
                                  <div>
                                    <div className="text-xs font-bold uppercase tracking-wide text-slate-600">Lộ trình đóng phí</div>
                                    <div className="text-sm text-slate-500">Mặc định theo cấu hình admin, có thể chỉnh trực tiếp trước khi lưu.</div>
                                  </div>
                                </div>

                            {orderLineDraft.paymentSchedule.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-left text-sm">
                                  <thead>
                                    <tr className="border-b border-slate-200 text-xs font-bold uppercase text-slate-500">
                                      <th className="py-2 pr-4">Đợt thu</th>
                                      <th className="py-2 pr-4">Điều kiện đóng</th>
                                      <th className="py-2 pr-4">Số tiền</th>
                                      <th className="py-2 pr-4">Thời gian dự kiến</th>
                                      <th className="py-2">Thời gian cần đóng</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {orderLineDraft.paymentSchedule.map((step) => (
                                      <tr key={step.id} className="border-b border-slate-100 last:border-b-0">
                                        <td className="py-2 pr-4 align-top">
                                          <input
                                            value={step.installmentLabel}
                                            onChange={(e) => handleOrderDraftPaymentScheduleChange(step.id, 'installmentLabel', e.target.value)}
                                            className="h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500"
                                          />
                                        </td>
                                        <td className="py-2 pr-4 align-top">
                                          <input
                                            value={step.condition}
                                            onChange={(e) => handleOrderDraftPaymentScheduleChange(step.id, 'condition', e.target.value)}
                                            className="h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500"
                                          />
                                        </td>
                                        <td className="py-2 pr-4 align-top">
                                          <input
                                            type="number"
                                            min={0}
                                            value={step.amount}
                                            onChange={(e) => handleOrderDraftPaymentScheduleChange(step.id, 'amount', e.target.value)}
                                            className="h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500"
                                          />
                                        </td>
                                        <td className="py-2 pr-4 align-top">
                                          <input
                                            type="date"
                                            value={toInputDate(step.expectedDate)}
                                            onChange={(e) => handleOrderDraftPaymentScheduleChange(step.id, 'expectedDate', fromInputDate(e.target.value, step.expectedDate) || '')}
                                            className="h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500"
                                          />
                                        </td>
                                        <td className="py-2 align-top">
                                          <input
                                            type="date"
                                            value={toInputDate(step.dueDate)}
                                            onChange={(e) => handleOrderDraftPaymentScheduleChange(step.id, 'dueDate', fromInputDate(e.target.value, step.dueDate) || '')}
                                            className="h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500"
                                          />
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="rounded border border-dashed border-slate-300 bg-white px-4 py-4 text-sm text-slate-500">
                                Chọn thị trường và gói dịch vụ để tạo lộ trình đóng phí.
                              </div>
                            )}
                          </div>
                        </div>

                          <div className="md:col-span-2">
                            <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Thông tin thêm</label>
                            <textarea
                              value={orderLineDraft.additionalInfo}
                              onChange={(e) => setOrderLineDraft((prev) => ({ ...prev, additionalInfo: e.target.value }))}
                              className="h-20 w-full resize-none rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                              placeholder="Nhập ghi chú hoặc yêu cầu đặc biệt..."
                            />
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center justify-between border-t border-slate-200 px-6 py-3">
                        <div className="text-sm font-semibold text-slate-600">
                          Thành tiền: <span className="text-base text-blue-700">{calculateCreatorLineTotal(orderLineDraft.unitPrice, orderLineDraft.discountPercent).toLocaleString('vi-VN')} đ</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleSaveOrderLine('close')}
                            className="rounded bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                          >
                            Lưu và đóng
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveOrderLine('new')}
                            className="rounded border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                          >
                            Lưu và thêm
                          </button>
                          <button
                            type="button"
                            onClick={handleRemoveOrderLine}
                            className="rounded border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                          >
                            Loại bỏ
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    ) : null;

  const handleSaveContractDraft = () => {
    const savedQuotation = persistQuotation({ syncContract: false });
    syncLinkedContract(savedQuotation);
    alert('Đã lưu dữ liệu hợp đồng tách riêng và đồng bộ vào trang Hợp đồng');
  };

  const handlePrintQuotation = () => {
    const previousTab = activeTab;

    const restoreActiveTab = () => {
      const restoreTab = quotationPrintRestoreTabRef.current;
      if (restoreTab) {
        setActiveTab(restoreTab);
        quotationPrintRestoreTabRef.current = null;
      }
    };

    if (previousTab !== 'order_lines') {
      quotationPrintRestoreTabRef.current = previousTab;
      setActiveTab('order_lines');
      window.addEventListener('afterprint', restoreActiveTab, { once: true });
      window.setTimeout(() => window.print(), 80);
      return;
    }

    window.print();
  };

  const handleLogAttachmentChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).filter(
      (file) => file.type.startsWith('image/') || file.type === 'application/pdf'
    );
    if (files.length === 0) {
      event.target.value = '';
      return;
    }

    try {
      const nextAttachments = await Promise.all(files.map(readFileAsDataUrl));
      setPendingLogAttachments((prev) => [...prev, ...nextAttachments.filter(Boolean)]);
    } catch {
      alert('Không thể tải chứng từ lên. Vui lòng thử lại.');
    } finally {
      event.target.value = '';
    }
  };

  const handleRemovePendingAttachment = (index: number) => {
    setPendingLogAttachments((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleSaveLogNote = () => {
    const trimmedContent = logNoteContent.trim();
    if (!trimmedContent && pendingLogAttachments.length === 0) return;

    const persistedQuotation =
      formData.id && !isNew
        ? getQuotations().find((quotation) => quotation.id === formData.id)
        : persistQuotation({ syncContract: false });

    if (!persistedQuotation) return;

    const detail =
      trimmedContent ||
      (pendingLogAttachments.length === 1 ? 'Đã tải 1 chứng từ' : `Đã tải ${pendingLogAttachments.length} chứng từ`);

    const nextLog: IQuotationLogNote = {
      id: `q-note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      user: user?.name || user?.id || 'System',
      type: 'note',
      action: 'Log Note',
      detail,
      attachments: pendingLogAttachments.length > 0 ? pendingLogAttachments : undefined
    };

    const currentLogs =
      Array.isArray(persistedQuotation.logNotes) && persistedQuotation.logNotes.length > 0
        ? persistedQuotation.logNotes
        : Array.isArray(formData.logNotes) && formData.logNotes.length > 0
          ? formData.logNotes
          : activityLogs;
    const nextLogNotes = [nextLog, ...currentLogs];
    updateQuotation({
      ...persistedQuotation,
      logNotes: nextLogNotes
    });

    setFormData((prev) => ({
      ...prev,
      id: persistedQuotation.id,
      logNotes: nextLogNotes
    }));
    setLogNoteContent('');
    setPendingLogAttachments([]);
  };

  const activityLogs = useMemo(() => {
    if (Array.isArray(formData.logNotes) && formData.logNotes.length > 0) {
      return formData.logNotes;
    }

    const fallback = [];
    if (formData.status === QuotationStatus.SALE_CONFIRMED || formData.status === QuotationStatus.SALE_ORDER) {
    fallback.push({
      id: 'fallback-confirmed',
      timestamp: formData.saleConfirmedAt || formData.updatedAt || formData.createdAt || new Date().toISOString(),
      user: 'System',
      type: 'system',
      action: 'Sale Confirmed',
      detail: 'Trạng thái đổi từ Quotation sang Confirm'
    });
  }
  if (formData.paymentProof) {
    fallback.push({
      id: 'fallback-payment',
      timestamp: formData.updatedAt || formData.createdAt || new Date().toISOString(),
      user: 'System',
      type: 'system',
      action: 'Payment Proof',
      detail: `Đã cập nhật chứng từ: ${formData.paymentProof}`
    });
  }
  fallback.push({
    id: 'fallback-created',
    timestamp: formData.createdAt || new Date().toISOString(),
    user: formData.createdBy || 'System',
    type: 'system',
    action: 'Create Quotation',
    detail: 'Tạo SO'
  });
  return fallback;
}, [formData.createdAt, formData.createdBy, formData.logNotes, formData.paymentProof, formData.saleConfirmedAt, formData.status, formData.updatedAt]);

  const filteredActivityLogs = useMemo(
    () => filterByLogAudience(activityLogs, logAudienceFilter, getQuotationLogAudience),
    [activityLogs, logAudienceFilter]
  );

  const groupedActivityLogs = useMemo(() => {
    const groups: Record<string, IQuotationLogNote[]> = {};
    const sortedLogs = [...filteredActivityLogs].sort((a, b) => {
      const tsA = Date.parse(a.timestamp || '');
      const tsB = Date.parse(b.timestamp || '');
      return (Number.isNaN(tsB) ? 0 : tsB) - (Number.isNaN(tsA) ? 0 : tsA);
    });

    sortedLogs.forEach((item) => {
      const dateKey = new Date(item.timestamp).toLocaleDateString('vi-VN');
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(item);
    });

    return groups;
  }, [filteredActivityLogs]);

  if (newQuotationView) return newQuotationView;

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6 text-sm text-slate-800">
      <style>{`
        @media screen {
          .quotation-print-only { display: none !important; }
        }

        @page {
          size: A4 portrait;
          margin: 12mm 10mm;
        }

        @media print {
          html, body {
            background: #fff !important;
          }
          body * { visibility: hidden !important; }
          #quotation-print-root, #quotation-print-root * { visibility: visible !important; }
          #quotation-print-root {
            position: absolute;
            inset: 0;
            width: auto !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            background: #fff !important;
            padding: 0 !important;
            margin: 0 !important;
            color: #0f172a !important;
          }
          .quotation-print-hide { display: none !important; }
          .quotation-screen-only { display: none !important; }
          .quotation-print-only { display: block !important; }
          .quotation-print-title {
            margin: 0 0 18px 0;
            text-align: center;
          }
          .quotation-print-title-text {
            font-size: 28px;
            line-height: 1.1;
            font-weight: 800;
            letter-spacing: 0.18em;
            text-transform: uppercase;
            color: #0f172a;
          }
          .quotation-print-summary-grid {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 10px 22px !important;
            margin: 0 0 18px 0 !important;
          }
          .quotation-print-summary-card {
            break-inside: avoid;
            padding: 0 0 8px 0;
            min-height: 0;
            border: none;
            border-bottom: 1px solid #dbe2ea;
            background: transparent;
          }
          .quotation-print-summary-card--wide {
            grid-column: span 2;
          }
          .quotation-print-label {
            display: block;
            margin-bottom: 6px;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            color: #64748b;
          }
          .quotation-print-value {
            font-size: 13px;
            line-height: 1.45;
            font-weight: 600;
            color: #0f172a;
            white-space: normal;
            overflow-wrap: anywhere;
          }
          .quotation-print-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }
          .quotation-print-table th,
          .quotation-print-table td {
            border-bottom: 1px solid #dbe2ea;
            padding: 10px 8px;
            vertical-align: top;
            text-align: left;
            white-space: normal;
            overflow-wrap: anywhere;
          }
          .quotation-print-table th {
            background: #f8fafc;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            color: #475569;
          }
          .quotation-print-table td {
            font-size: 12px;
            color: #0f172a;
          }
          .quotation-print-table .text-right {
            text-align: right;
          }
          .quotation-print-total {
            break-inside: avoid;
            margin-top: 16px;
            margin-left: auto;
            width: 280px;
            border: 1px solid #dbe2ea;
            border-radius: 8px;
            padding: 12px 14px;
          }
          .quotation-print-total-row {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            padding: 4px 0;
            font-size: 12px;
          }
          .quotation-print-total-row--grand {
            margin-top: 6px;
            padding-top: 8px;
            border-top: 1px solid #cbd5e1;
            font-size: 18px;
            font-weight: 700;
            color: #1d4ed8;
          }
        }
      `}</style>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-slate-500">
            <button onClick={() => navigate('/contracts/quotations')} className="hover:text-blue-600">Báo giá</button>
            <ChevronRight size={14} />
            <span className="font-semibold text-slate-900">{isNew ? 'Mới' : formData.soCode}</span>
          </div>
          {!isLocked && (
            <button onClick={handleSave} className="bg-slate-800 text-white px-3 py-2 rounded flex items-center gap-2">
              <Save size={16} /> Lưu
            </button>
          )}
        </div>

        <div className="bg-white border rounded p-2 mb-4">
          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap">
            {formData.status === QuotationStatus.DRAFT && (
              <button onClick={handleSend} className="px-3 py-1.5 rounded bg-purple-600 text-white text-xs font-semibold">Gửi Email</button>
            )}
            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={!canConfirmByRole || !canConfirmNow}
              title={!canConfirmByRole ? 'Chỉ Sales được xác nhận Sale' : !canConfirmNow ? 'Bước Confirm chỉ áp dụng từ Mới/Đã gửi' : 'Xác nhận Sale'}
              className="px-3 py-1.5 rounded bg-blue-600 text-white text-xs font-semibold disabled:opacity-50"
            >
              Confirm
            </button>
            {(canLockStage || hasPendingCancelRequest || canApproveCancelNow) && (
              <button
                onClick={canApproveCancelNow ? handleApproveCancel : handleRequestCancel}
                disabled={!canCancelNow && !canApproveCancelNow}
                title={
                  canApproveCancelNow
                    ? 'Admin duyệt yêu cầu hủy SO'
                    : hasPendingCancelRequest
                      ? 'SO đang chờ Admin duyệt hủy'
                      : !canCancelByRole
                        ? 'Chỉ Kế toán được gửi yêu cầu hủy'
                        : formData.transactionStatus === 'DA_DUYET'
                          ? 'Giao dịch đã duyệt, không thể gửi yêu cầu hủy ở bước này'
                          : 'Gửi yêu cầu hủy SO'
                }
                className={`px-3 py-1.5 rounded text-xs font-semibold border ${
                  canApproveCancelNow
                    ? 'border-amber-300 bg-amber-50 text-amber-700'
                    : 'border-rose-200 bg-white text-rose-600'
                } disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400`}
              >
                {canApproveCancelNow ? 'Duyệt hủy' : hasPendingCancelRequest ? 'Chờ duyệt' : 'Hủy'}
              </button>
            )}
            <button
              onClick={handleLock}
              disabled={!canLockNow}
              title={lockButtonTitle}
              className="px-3 py-1.5 rounded border text-xs font-semibold disabled:text-slate-400"
            >
              Lock
            </button>
            <button
              onClick={handlePrintQuotation}
              className="px-3 py-1.5 rounded bg-blue-600 text-white text-xs font-semibold inline-flex items-center gap-1"
            >
              <Printer size={14} /> In báo giá
            </button>
            {canLockByRole && canLockStage && (
              <button
                onClick={handleOpenCreateReceiptApproval}
                disabled={!canCreateReceiptApproval}
                className="px-3 py-1.5 rounded border border-slate-200 bg-white text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                title={createReceiptApprovalTitle}
              >
                Tạo phiếu duyệt thu
              </button>
            )}
            <span className="px-2 py-1 text-xs font-semibold rounded bg-blue-50 text-blue-700">
              Trạng thái: {recordStatusLabel}
            </span>
            {formData.transactionStatus && formData.transactionStatus !== 'NONE' && (
              <span className="px-2 py-1 text-xs border rounded bg-slate-50">Giao dịch: {formData.transactionStatus}</span>
            )}
            {cancelRequestStatus !== 'NONE' && (
              <span className="px-2 py-1 text-xs border rounded bg-amber-50 border-amber-200 text-amber-700">
                Hủy SO: {cancelRequestStatus}
              </span>
            )}
            <div className="ml-auto flex items-center border rounded overflow-hidden">
              {STATUS_STEPS.map((step, idx) => {
                const { clickable, title } = getStepInteraction(step.id);
                const isReached = idx <= stepIndex;
                const isCurrent = workflowStatusId === step.id;
                return (
                  <button
                    key={step.id}
                    type="button"
                    title={title}
                    disabled={!clickable}
                    onClick={() => clickable && handleStageClick(step.id)}
                    className={`px-3 py-1.5 text-[11px] font-bold uppercase transition-colors ${
                      isCurrent
                        ? 'text-blue-700 bg-blue-50'
                        : isReached
                          ? 'text-slate-700 bg-white'
                          : 'text-slate-500 bg-slate-100'
                    } ${clickable ? 'cursor-pointer hover:bg-blue-50 hover:text-blue-700' : 'cursor-default'}`}
                  >
                    {step.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-4">
          <div id="quotation-print-root" className="bg-white border rounded p-6">
            <div className="quotation-print-only">
              <div className="quotation-print-title">
                <div className="quotation-print-title-text">BÁO GIÁ</div>
              </div>
            </div>
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-4xl font-bold text-slate-900">{isNew ? 'Báo giá mới' : formData.soCode}</h1>
                  <span className="px-2 py-1 text-xs font-semibold rounded bg-blue-50 text-blue-700">
                    {recordStatusLabel}
                  </span>
                </div>
                {linkedContract && (
                  <div className="inline-flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                    <FileText size={13} />
                    Hợp đồng: <span className="font-semibold text-slate-800">{linkedContract.code}</span>
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-slate-500 uppercase">Ngày tạo</div>
                <div className="font-medium">{formatDisplayDate(formData.createdAt)}</div>
              </div>
            </div>

            <div className="quotation-screen-only mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className="text-xs font-bold uppercase text-blue-800">Khách hàng</label>
                <div className="relative">
                  <div className="flex items-center border-b">
                    <input
                      className="w-full py-1 pr-8 outline-none"
                      value={customerQuery || formData.customerName || ''}
                      onChange={(e) => {
                        if (isLocked) return;
                        const value = e.target.value;
                        setCustomerQuery(value);
                        setFormData((p) => ({ ...p, customerName: value }));
                        setCustomerDropdownOpen(true);
                      }}
                      onFocus={() => !isLocked && setCustomerDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setCustomerDropdownOpen(false), 120)}
                      disabled={isLocked}
                      placeholder="Nhập tên/SĐT hoặc chọn từ danh sách"
                    />
                    {!isLocked && (
                      <button
                        type="button"
                        className="absolute right-0 p-1 text-slate-500 hover:text-slate-700"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setCustomerDropdownOpen((prev) => !prev)}
                        title="Danh sách khách hàng"
                      >
                        <ChevronDown size={16} />
                      </button>
                    )}
                  </div>
                  {customerDropdownOpen && !isLocked && (
                    <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded border bg-white shadow">
                      {customerOptions.length > 0 ? (
                        customerOptions.map((customer) => (
                          <button
                            key={`${customer.source}-${customer.id}`}
                            type="button"
                            className="w-full border-b px-3 py-2 text-left hover:bg-slate-50"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              applyCustomerSelection(customer);
                            }}
                          >
                            <div className="font-medium text-slate-800">{customer.name}</div>
                            <div className="text-xs text-slate-500">
                              {customer.phone || customer.email || 'Không có thông tin liên hệ'}
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-xs text-slate-500">Không có khách hàng phù hợp</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-blue-800">SĐT khách hàng</label>
                <input
                  className="w-full border-b py-1 outline-none"
                  value={formData.studentPhone || ''}
                  onChange={(e) => !isLocked && setFormData((p) => ({ ...p, studentPhone: e.target.value }))}
                  disabled={isLocked}
                  placeholder="Nhập số điện thoại"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-blue-800">Gói dịch vụ</label>
                <input
                  className="w-full border-b py-1 outline-none text-slate-700"
                  value={quotationServicePackageSummary}
                  readOnly
                  disabled
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-blue-800">{approvedRefundAmount > 0 ? 'Tổng phải thu' : 'Giá tiền'}</label>
                <input
                  className="w-full border-b py-1 font-semibold text-slate-800 outline-none"
                  value={quotationAmountDisplay}
                  readOnly
                  disabled
                />
              </div>
              {approvedRefundAmount > 0 && (
                <>
                  <div>
                    <label className="text-xs font-bold uppercase text-blue-800">Hoàn phí</label>
                    <input
                      className="w-full border-b py-1 font-semibold text-amber-700 outline-none"
                      value={formatCurrency(approvedRefundAmount)}
                      readOnly
                      disabled
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-blue-800">Thực thu</label>
                    <input
                      className="w-full border-b py-1 font-semibold text-emerald-700 outline-none"
                      value={formatCurrency(actualNetAmount)}
                      readOnly
                      disabled
                    />
                  </div>
                </>
              )}
              <div>
                <label className="text-xs font-bold uppercase text-blue-800">Ngày hết hạn báo giá</label>
                <input
                  type="date"
                  className="w-full border-b py-1 outline-none"
                  value={toInputDate(formData.expirationDate)}
                  onChange={(e) => !isLocked && setFormData((p) => ({ ...p, expirationDate: fromInputDate(e.target.value, p.expirationDate) }))}
                  disabled={isLocked}
                />
              </div>
              <div className="xl:col-span-2">
                <label className="text-xs font-bold uppercase text-blue-800">Địa chỉ khách hàng</label>
                <input
                  className="w-full border-b py-1 outline-none"
                  value={formData.studentAddress || ''}
                  onChange={(e) => !isLocked && setFormData((p) => ({ ...p, studentAddress: e.target.value }))}
                  disabled={isLocked}
                  placeholder="Nhập địa chỉ khách hàng"
                />
              </div>
            </div>

            <div className="quotation-print-only">
              <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Thông tin báo giá</div>
              <div className="quotation-print-summary-grid">
                {quotationPrintSummaryItems.map((item) => (
                  <div
                    key={item.label}
                    className={`quotation-print-summary-card ${item.wide ? 'quotation-print-summary-card--wide' : ''}`}
                  >
                    <span className="quotation-print-label">{item.label}</span>
                    <span className="quotation-print-value">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="quotation-print-hide flex items-center gap-6 border-b mb-4">
              <button onClick={() => setActiveTab('order_lines')} className={`pb-2 font-semibold ${activeTab === 'order_lines' ? 'text-blue-700 border-b-2 border-blue-700' : 'text-slate-500'}`}>Chi tiết đơn hàng</button>
              <button onClick={() => setActiveTab('other_info')} className={`pb-2 font-semibold ${activeTab === 'other_info' ? 'text-blue-700 border-b-2 border-blue-700' : 'text-slate-500'}`}>Thông tin khác</button>
              <button onClick={() => setActiveTab('contract')} className={`pb-2 font-semibold inline-flex items-center gap-2 ${activeTab === 'contract' ? 'text-blue-700 border-b-2 border-blue-700' : 'text-slate-500'}`}>Hợp đồng {linkedContract && <FileText size={14} className="text-blue-600" />}</button>
              <button onClick={() => setActiveTab('payment_debt')} className={`pb-2 font-semibold ${activeTab === 'payment_debt' ? 'text-blue-700 border-b-2 border-blue-700' : 'text-slate-500'}`}>Thanh toán & công nợ</button>
            </div>

            {activeTab === 'order_lines' && (
              <div>
                <div className="quotation-print-only">
                  <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Chi tiết đơn hàng</div>
                  <table className="quotation-print-table">
                    <colgroup>
                      <col style={{ width: '18%' }} />
                      <col style={{ width: '30%' }} />
                      <col style={{ width: '16%' }} />
                      <col style={{ width: '14%' }} />
                      <col style={{ width: '22%' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>Gói dịch vụ</th>
                        <th>Chương trình</th>
                        <th className="text-right">Đơn giá</th>
                        <th>Giảm giá</th>
                        <th className="text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editableOrderLineItems.map((item) => (
                        <tr key={`print-${item.id}`}>
                          <td>{item.servicePackage || '-'}</td>
                          <td>{item.programs?.join(', ') || item.courseName || '-'}</td>
                          <td className="text-right">{formatCurrency(item.unitPrice || 0)}</td>
                          <td>{item.discount || 0}%</td>
                          <td className="text-right">{formatCurrency(item.total || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="quotation-print-total">
                    <div className="quotation-print-total-row">
                      <span>Tổng giá trị</span>
                      <span>{formatCurrency(formData.amount || 0)}</span>
                    </div>
                    <div className="quotation-print-total-row">
                      <span>Chiết khấu</span>
                      <span>{formatCurrency(formData.discount || 0)}</span>
                    </div>
                    <div className="quotation-print-total-row quotation-print-total-row--grand">
                      <span>Tổng tiền</span>
                      <span>{formatCurrency(formData.finalAmount || 0)}</span>
                    </div>
                  </div>
                </div>

                <div className="quotation-screen-only">
                  <table className="w-full text-left text-sm mb-4">
                    <thead>
                      <tr className="border-b-2 border-slate-800 text-xs uppercase">
                        <th className="py-2">Gói dịch vụ</th>
                        <th className="py-2">Chương trình</th>
                        <th className="py-2 text-right">Đơn giá</th>
                        <th className="py-2 text-center">Giảm giá</th>
                        <th className="py-2 text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editableOrderLineItems.map((item) => (
                        <tr key={item.id}>
                          <td className="py-3 pr-3 align-top">
                            <input
                              className="w-full rounded border p-2"
                              value={item.servicePackage || ''}
                              onChange={(e) => !isLocked && handleEditableOrderLineChange(item.id, 'servicePackage', e.target.value)}
                              disabled={isLocked}
                              placeholder="Gói dịch vụ"
                            />
                          </td>
                          <td className="py-3 pr-3 align-top">
                            <input
                              className="w-full rounded border p-2"
                              value={item.courseName || item.programs?.join(', ') || ''}
                              onChange={(e) => !isLocked && handleEditableOrderLineChange(item.id, 'courseName', e.target.value)}
                              disabled={isLocked}
                              placeholder="Chương trình"
                            />
                          </td>
                          <td className="py-3 pr-3 align-top">
                            <input
                              type="number"
                              min="0"
                              className="w-full rounded border p-2 text-right"
                              value={item.unitPrice || 0}
                              onChange={(e) => !isLocked && handleEditableOrderLineChange(item.id, 'unitPrice', e.target.value)}
                              disabled={isLocked}
                              placeholder="0"
                            />
                          </td>
                          <td className="py-3 pr-3 align-top">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              className="w-full rounded border p-2 text-center"
                              value={item.discount || 0}
                              onChange={(e) => !isLocked && handleEditableOrderLineChange(item.id, 'discount', e.target.value)}
                              disabled={isLocked}
                              placeholder="0"
                            />
                          </td>
                          <td className="py-3 align-top">
                            <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-right font-semibold text-slate-700">
                              {formatCurrency(item.total || 0)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="w-full md:w-80 ml-auto border rounded p-4 bg-slate-50 space-y-2">
                    <div className="flex justify-between"><span>Tổng giá trị:</span><span>{(formData.amount || 0).toLocaleString('vi-VN')} VND</span></div>
                    <div className="flex justify-between"><span>Chiết khấu:</span><span>{(formData.discount || 0).toLocaleString('vi-VN')}</span></div>
                    <div className="flex justify-between text-2xl text-blue-700 font-bold"><span>Tổng tiền:</span><span>{(formData.finalAmount || 0).toLocaleString('vi-VN')} đ</span></div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'other_info' && (
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <h3 className="font-bold text-sm uppercase border-b pb-2">Thông tin sales</h3>
                  <div className="flex justify-between"><span>Người phụ trách</span><span className="font-medium text-blue-700">{formData.salespersonName || user?.name || 'Sales Rep'}</span></div>
                  <div className="flex justify-between"><span>Đội nhóm</span><span>Sales Team 1</span></div>
                  <div className="flex justify-between items-center">
                    <span>Chi nhánh</span>
                    <input
                      type="text"
                      value={formData.branchName || ''}
                      onChange={(e) => !isLocked && setFormData((p) => ({ ...p, branchName: e.target.value }))}
                      disabled={isLocked}
                      className="w-40 border-b bg-transparent text-right outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="font-bold text-sm uppercase border-b pb-2">Thông tin bổ sung</h3>
                  <div className="flex justify-between items-center">
                    <span>Mã lớp dự kiến</span>
                    <ClassCodeLookupInput
                      value={formData.classCode || ''}
                      onChange={(value) => !isLocked && setFormData((p) => ({ ...p, classCode: value }))}
                      loadOptions={loadClassCodeOptions}
                      disabled={isLocked}
                      placeholder="VD: DE-A1-02/2026"
                      wrapperClassName="w-56"
                      inputClassName="w-full border-b bg-transparent px-1 py-1 text-right outline-none"
                      buttonClassName="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Lịch học</span>
                    <input
                      type="text"
                      value={formData.schedule || ''}
                      onChange={(e) => !isLocked && setFormData((p) => ({ ...p, schedule: e.target.value }))}
                      disabled={isLocked}
                      className="w-40 border-b bg-transparent text-right outline-none"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span>CCCD</span>
                    <input
                      type="text"
                      value={formData.identityCard || ''}
                      onChange={(e) => !isLocked && setFormData((p) => ({ ...p, identityCard: e.target.value }))}
                      disabled={isLocked}
                      className="w-40 border-b bg-transparent text-right outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'contract' && (
              <div className="space-y-6">
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-blue-900">Hợp đồng đang lưu riêng</div>
                      <div className="text-xs text-blue-700">Dữ liệu field map sẽ nối vào contract riêng để in theo mẫu.</div>
                    </div>
                    {linkedContract ? (
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm">{linkedContract.code}</span>
                    ) : (
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">Chưa tạo contract riêng</span>
                    )}
                  </div>

                  <div>
                    <div ref={contractTemplateDropdownRef} className="relative">
                      <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Mẫu hợp đồng</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={contractDraft.templateName}
                          onFocus={() => setContractTemplateDropdownOpen(true)}
                          onChange={(e) => {
                            const templateName = e.target.value;
                            setContractDraft((prev) => ({ ...prev, templateName }));
                            setContractTemplateDropdownOpen(true);
                          }}
                          className="w-full rounded border bg-white px-3 py-2 pr-10 outline-none focus:border-blue-500"
                          placeholder="Tìm hoặc chọn mẫu hợp đồng"
                        />
                        <button
                          type="button"
                          onClick={() => setContractTemplateDropdownOpen((prev) => !prev)}
                          className="absolute inset-y-0 right-2 my-auto inline-flex h-7 w-7 items-center justify-center rounded text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                          title="Xổ danh sách mẫu hợp đồng"
                        >
                          <ChevronDown
                            size={16}
                            className={`transition-transform ${contractTemplateDropdownOpen ? 'rotate-180' : ''}`}
                          />
                        </button>
                      </div>
                      {contractTemplateDropdownOpen && (
                        <div className="absolute left-0 right-0 z-20 mt-1 max-h-56 overflow-y-auto rounded border border-slate-200 bg-white p-1 shadow-lg">
                          {filteredContractTemplateOptions.length > 0 ? (
                            filteredContractTemplateOptions.map((contractOption) => (
                              <button
                                key={contractOption.id}
                                type="button"
                                onClick={() => {
                                  setContractDraft((prev) => ({ ...prev, templateName: contractOption.templateName }));
                                  setContractTemplateDropdownOpen(false);
                                }}
                                className={`block w-full rounded px-3 py-2 text-left text-sm transition-colors ${
                                  contractDraft.templateName === contractOption.templateName
                                    ? 'bg-blue-600 text-white'
                                    : 'text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                <div className="font-medium">{contractOption.templateName}</div>
                                <div
                                  className={`text-xs ${
                                    contractDraft.templateName === contractOption.templateName ? 'text-blue-100' : 'text-slate-400'
                                  }`}
                                >
                                  {contractOption.code || 'Chưa có mã hợp đồng'}
                                  {contractOption.customerName ? ` • ${contractOption.customerName}` : ''}
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-sm text-slate-400">Không có hợp đồng phù hợp</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                    <div>
                      <h3 className="mb-3 text-sm font-bold uppercase text-slate-800">Field map đã nối</h3>
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        {CONTRACT_FIELD_CONFIG.map((field) => (
                          <div key={field.key}>
                            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">{field.label}</label>
                            <input
                              type="text"
                              value={getContractFieldValue(field.key)}
                              onChange={(e) => setContractDraft((prev) => ({
                                ...prev,
                                templateFields: {
                                  ...prev.templateFields,
                                  [field.key]: e.target.value
                                }
                              }))}
                              className="w-full rounded border px-3 py-2 outline-none focus:border-blue-500"
                              placeholder={field.placeholder}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs font-bold uppercase text-slate-500 mb-2">Field lấy từ SO</div>
                      <div className="grid gap-2 text-xs text-slate-600 md:grid-cols-2 xl:grid-cols-3">
                        <div>Quotation code: <span className="font-semibold text-slate-800">{derivedContractFields.quotationCode || '-'}</span></div>
                        <div>Quotation date: <span className="font-semibold text-slate-800">{derivedContractFields.quotationDate || '-'}</span></div>
                        <div>Confirm date: <span className="font-semibold text-slate-800">{derivedContractFields.confirmDate || '-'}</span></div>
                        <div>Gói dịch vụ: <span className="font-semibold text-slate-800">{derivedContractFields.productName || '-'}</span></div>
                        <div>Tổng giá trị: <span className="font-semibold text-slate-800">{derivedContractFields.totalAmount || '-'}</span></div>
                        <div>Thanh toán: <span className="font-semibold text-slate-800">{derivedContractFields.paymentMethod || '-'}</span></div>
                      </div>
                    </div>

                    <div className="flex flex-wrap justify-end gap-2">
                      <button type="button" onClick={handleSaveContractDraft} className="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-xs font-semibold text-white">
                        <Save size={14} /> Lưu contract riêng
                      </button>
                      {formData.id && (
                        <button type="button" onClick={() => navigate(`/contracts/quotations/${formData.id}/contract`)} className="inline-flex items-center gap-2 rounded border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700">
                          <Printer size={14} /> Xem bản in
                        </button>
                      )}
                    </div>

                    <div className="pt-2">
                      {paymentDebtSection}
                    </div>
                </div>
              </div>
            )}

            {activeTab === 'payment_debt' && paymentDebtSection}
          </div>

          <div className="h-fit overflow-hidden rounded border bg-white xl:sticky xl:top-4">
            <div className="border-b px-4 py-3 font-bold">Log Note</div>

            <div className="border-b border-slate-200 bg-white p-4">
              <textarea
                className="h-24 w-full resize-none rounded border border-amber-200 bg-amber-50 p-3 text-sm outline-none transition-colors focus:border-amber-400"
                placeholder="Ghi chú nhanh cho team..."
                value={logNoteContent}
                onChange={(e) => setLogNoteContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSaveLogNote();
                  }
                }}
              />

              <input
                ref={logAttachmentInputRef}
                type="file"
                accept="image/*,.pdf"
                multiple
                className="hidden"
                onChange={handleLogAttachmentChange}
              />

              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => logAttachmentInputRef.current?.click()}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:border-blue-300 hover:text-blue-700"
                    title="Tải chứng từ"
                  >
                    <Paperclip size={15} />
                  </button>
                  <span className="text-xs font-medium text-slate-500">
                    {pendingLogAttachments.length > 0 ? `${pendingLogAttachments.length} chứng từ đã tải` : 'Tải chứng từ'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleSaveLogNote}
                  disabled={!logNoteContent.trim() && pendingLogAttachments.length === 0}
                  className="inline-flex items-center gap-2 rounded bg-amber-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send size={14} />
                  Gửi / Lưu
                </button>
              </div>

              {pendingLogAttachments.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {pendingLogAttachments.map((attachment, index) => (
                    <div key={`${attachment.slice(0, 24)}-${index}`} className="group relative h-16 w-16 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                      {isImageAttachment(attachment) ? (
                        <img src={attachment} alt={`attachment-${index + 1}`} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-white px-2 text-center text-[10px] font-semibold text-blue-700">
                          PDF
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemovePendingAttachment(index)}
                        className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
                        title="Bỏ chứng từ"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="max-h-[560px] overflow-auto p-4">
              <div className="mb-4 flex flex-wrap items-center justify-end gap-3">
                <LogAudienceFilterControl value={logAudienceFilter} onChange={setLogAudienceFilter} />
              </div>
              {isNew && filteredActivityLogs.length === 0 ? (
                <div className="text-sm text-slate-500">Đang tạo báo giá mới...</div>
              ) : Object.keys(groupedActivityLogs).length === 0 ? (
                <div className="text-sm text-slate-500">Chưa có log note phù hợp bộ lọc.</div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedActivityLogs).map(([date, logs]) => (
                    <div key={date}>
                      <div className="mb-4 flex items-center gap-4">
                        <div className="h-px flex-1 bg-slate-200" />
                        <span className="whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-400">
                          {date}
                        </span>
                        <div className="h-px flex-1 bg-slate-200" />
                      </div>

                      <div className="space-y-4">
                        {logs.map((item) => {
                          const isNote = item.type === 'note';
                          return (
                            <div key={item.id} className="group relative ml-2 border-l border-slate-200 pb-2 pl-6 last:border-0">
                              <div className={`absolute -left-[17px] top-0 z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-white text-[10px] font-bold ${isNote ? 'border-amber-200 text-amber-700' : 'border-slate-200 text-slate-500'}`}>
                                {(item.user || 'U').charAt(0).toUpperCase()}
                              </div>

                              <div className="flex items-start justify-between gap-3">
                                <span className="text-xs font-bold text-slate-800">{item.user || 'System'}</span>
                                <span className="text-[10px] text-slate-400">
                                  {new Date(item.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>

                              <div className={`mt-1 rounded-lg border p-3 text-xs shadow-sm ${isNote ? 'border-amber-100 bg-amber-50 text-slate-800' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
                                {isNote ? (
                                  <span className="mr-2 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-amber-700">
                                    Log Note
                                  </span>
                                ) : (
                                  <div className="mb-1 text-[11px] font-semibold text-slate-800">{item.action}</div>
                                )}

                                <div>{item.detail || (isNote ? 'Không có nội dung ghi chú' : 'Không có mô tả chi tiết')}</div>

                                {Array.isArray(item.attachments) && item.attachments.length > 0 && (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {item.attachments.map((attachment, index) => (
                                      <a
                                        key={`${attachment.slice(0, 24)}-${index}`}
                                        href={attachment}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block"
                                      >
                                        {isImageAttachment(attachment) ? (
                                          <img
                                            src={attachment}
                                            alt={`log-attachment-${index + 1}`}
                                            className="h-20 w-20 rounded-lg border border-slate-200 object-cover"
                                          />
                                        ) : (
                                          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-medium text-blue-700">
                                            Tệp đính kèm {index + 1}
                                          </div>
                                        )}
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {linkedContract && (
                    <div className="rounded border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
                      <div className="mb-1 flex items-center gap-2 font-semibold">
                        <Lock size={12} />
                        Contract riêng
                      </div>
                      <div>Mã: {linkedContract.code}</div>
                      <div>Mẫu: {linkedContract.templateName || DEFAULT_CONTRACT_TEMPLATE_NAME}</div>
                      <div>Imported by: {linkedContract.importedBy || 'system'}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Xác nhận đơn hàng (Sale Confirmed)</h3>
            <div className="space-y-4">
              <p className="text-sm leading-6 text-slate-600">
                Xác nhận chuyển báo giá sang trạng thái <span className="font-semibold text-slate-900">Sale Confirmed</span>. Sau đó kế toán sẽ tạo phiếu duyệt thu cho SO này.
              </p>

              <div className="flex justify-end gap-3">
                <button onClick={() => setShowConfirmModal(false)} className="px-4 py-2 rounded hover:bg-slate-100">Hủy</button>
                <button onClick={handleConfirmSale} className="px-4 py-2 rounded bg-blue-600 text-white">Xác nhận</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuotationDetails;
