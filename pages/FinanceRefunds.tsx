import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
   AlertCircle,
   Check,
   CheckCircle2,
   ChevronLeft,
   ChevronRight,
   Clock3,
   Columns3,
   MessageSquare,
   Plus,
   Search,
   ShieldCheck,
   X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LogAudienceFilterControl from '../components/LogAudienceFilter';
import { IRefundLog, IRefundRequest, RefundStatus } from '../types';
import { addRefund, addRefundLog, getRefundLogs, getRefunds, saveRefunds } from '../utils/storage';
import { filterByLogAudience, getRefundLogAudience, LogAudienceFilter } from '../utils/logAudience';
import { decodeMojibakeReactNode } from '../utils/mojibake';

const REFUND_REASONS = [
   'Rút hồ sơ',
   'Đóng thừa',
   'Thay đổi chính sách',
   'Theo chính sách hỗ trợ',
   'Lý do khác'
];

const INITIAL_REFUNDS: IRefundRequest[] = [
   {
      id: 'REF-92821',
      createdAt: '2026-03-10T08:30:00.000Z',
      studentName: 'Lê Hoàng',
      soCode: 'SO-240321',
      contractCode: 'HD-2024-112',
      program: 'Workshop Kỹ năng',
      paidAmount: 25000000,
      relatedPaymentCode: 'PT-240310-018',
      requestedAmount: 5000000,
      retainedAmount: 1000000,
      approvedAmount: null,
      reason: 'Thay đổi chính sách',
      refundBasis: 'Biên bản điều chỉnh chương trình ngày 09/03/2026',
      createdBy: 'Trần Văn Quản Trị',
      ownerName: 'Lê Ngọc An',
      status: 'SALE_XAC_NHAN',
      paymentVoucherCode: '',
      payoutDate: '',
      note: 'Sale đã xác nhận hồ sơ, chờ kế toán kiểm tra.',
      evidenceFiles: ['email-xac-nhan-chuyen-chuong-trinh.pdf', 'phieu-de-nghi-hoan-tien.docx'],
      relatedDocuments: ['phu-luc-dieu-chinh-chuong-trinh.pdf']
   },
   {
      id: 'REF-92817',
      createdAt: '2026-03-08T10:15:00.000Z',
      studentName: 'Phạm Văn Hùng',
      soCode: 'SO-240108',
      contractCode: 'HD-2024-001',
      program: 'Du học Đức',
      paidAmount: 45000000,
      relatedPaymentCode: 'PT-240308-004',
      requestedAmount: 12000000,
      retainedAmount: 2000000,
      approvedAmount: 10000000,
      reason: 'Rút hồ sơ',
      refundBasis: 'Email xác nhận dừng hồ sơ và phụ lục thanh lý hợp đồng',
      createdBy: 'Nguyễn Thảo Sale',
      ownerName: 'Trần Văn Quản Trị',
      status: 'KE_TOAN_KIEM_TRA',
      paymentVoucherCode: '',
      payoutDate: '',
      note: 'Đã đối chiếu công nợ, chờ CEO duyệt hạn mức hoàn.',
      evidenceFiles: ['don-rut-ho-so.pdf', 'email-xac-nhan-dung-ho-so.eml'],
      relatedDocuments: ['phu-luc-thanh-ly-hop-dong.pdf', 'bang-doi-chieu-cong-no.xlsx']
   },
   {
      id: 'REF-92815',
      createdAt: '2026-03-06T14:00:00.000Z',
      studentName: 'Nguyễn Thị Lan',
      soCode: 'SO-240042',
      contractCode: 'HD-2024-042',
      program: 'Tiếng Đức A1',
      paidAmount: 8000000,
      relatedPaymentCode: 'PT-240306-011',
      requestedAmount: 2000000,
      retainedAmount: 0,
      approvedAmount: 2000000,
      reason: 'Theo chính sách hỗ trợ',
      refundBasis: 'Quyết định hỗ trợ học viên số HT-03/2026',
      createdBy: 'Lê Hạnh Sale',
      ownerName: 'Trần Văn Quản Trị',
      status: 'DA_HOAN',
      paymentVoucherCode: 'PC-00015',
      payoutDate: '2026-03-07',
      note: 'Đã chi tiền mặt tại quầy và đối chiếu ký nhận.',
      evidenceFiles: ['quyet-dinh-ho-tro.pdf'],
      relatedDocuments: ['phieu-chi-pc-00015.pdf', 'bien-ban-ky-nhan.pdf']
   },
   {
      id: 'REF-92818',
      createdAt: '2026-03-05T09:45:00.000Z',
      studentName: 'Trần Minh Tuấn',
      soCode: 'SO-230891',
      contractCode: 'HD-2023-891',
      program: 'Du học nghề Úc',
      paidAmount: 4000000,
      relatedPaymentCode: 'PT-240305-009',
      requestedAmount: 4000000,
      retainedAmount: 0,
      approvedAmount: 0,
      reason: 'Đóng thừa',
      refundBasis: 'Đối chiếu giao dịch trùng trên sao kê ngân hàng',
      createdBy: 'Phạm Nam Kế Toán',
      ownerName: 'Phạm Nam Kế Toán',
      status: 'TU_CHOI',
      paymentVoucherCode: '',
      payoutDate: '',
      note: 'Khoản thu đã được bù trừ vào kỳ công nợ kế tiếp.',
      evidenceFiles: ['sao-ke-ngan-hang-thang-03.pdf'],
      relatedDocuments: ['bien-ban-doi-soat.pdf']
   }
];

const INITIAL_REFUND_LOGS: IRefundLog[] = [
   {
      id: 'RLOG-REF-92821-1',
      refundId: 'REF-92821',
      action: 'Tạo yêu cầu hoàn tiền',
      createdAt: '2026-03-10T08:30:00.000Z',
      createdBy: 'Trần Văn Quản Trị'
   },
   {
      id: 'RLOG-REF-92821-2',
      refundId: 'REF-92821',
      action: 'Sale xác nhận hồ sơ hợp lệ',
      createdAt: '2026-03-10T14:10:00.000Z',
      createdBy: 'Lê Ngọc An'
   },
   {
      id: 'RLOG-REF-92817-1',
      refundId: 'REF-92817',
      action: 'Tạo yêu cầu hoàn tiền',
      createdAt: '2026-03-08T10:15:00.000Z',
      createdBy: 'Nguyễn Thảo Sale'
   },
   {
      id: 'RLOG-REF-92817-2',
      refundId: 'REF-92817',
      action: 'Kế toán kiểm tra số tiền hoàn 10.000.000 đ',
      createdAt: '2026-03-09T16:45:00.000Z',
      createdBy: 'Trần Văn Quản Trị'
   },
   {
      id: 'RLOG-REF-92815-1',
      refundId: 'REF-92815',
      action: 'CEO duyệt hoàn tiền',
      createdAt: '2026-03-06T16:00:00.000Z',
      createdBy: 'CEO'
   },
   {
      id: 'RLOG-REF-92815-2',
      refundId: 'REF-92815',
      action: 'Phát hành chứng từ chi PC-00015',
      createdAt: '2026-03-07T10:20:00.000Z',
      createdBy: 'Phạm Nam Kế Toán'
   }
];

const formatCurrency = (value: number) =>
   new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);

const formatDate = (value?: string) => {
   if (!value) return '--';
   const date = new Date(value);
   return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('vi-VN');
};

const formatDateTime = (value: string) =>
   new Date(value).toLocaleString('vi-VN', { hour12: false });

type RefundFilter = 'ALL' | RefundStatus;

type RefundColumnKey =
   | 'refundId'
   | 'studentName'
   | 'soCode'
   | 'contractCode'
   | 'program'
   | 'paidAmount'
   | 'requestedAmount'
   | 'approvedAmount'
   | 'reason'
   | 'refundBasis'
   | 'createdBy'
   | 'ownerName'
   | 'status'
   | 'paymentVoucherCode'
   | 'payoutDate'
   | 'note'
   | 'log';

type RefundColumnOption = {
   id: RefundColumnKey;
   label: string;
   align?: 'left' | 'right' | 'center';
   defaultVisible?: boolean;
   required?: boolean;
   thClassName?: string;
   tdClassName?: string;
};

type RefundFormState = {
   studentName: string;
   soCode: string;
   contractCode: string;
   program: string;
   paidAmount: string;
   requestedAmount: string;
   approvedAmount: string;
   reason: string;
   refundBasis: string;
   ownerName: string;
   status: RefundStatus;
   paymentVoucherCode: string;
   payoutDate: string;
   note: string;
};

type FormErrors = Partial<Record<keyof RefundFormState, string>>;

const EMPTY_FORM: RefundFormState = {
   studentName: '',
   soCode: '',
   contractCode: '',
   program: '',
   paidAmount: '',
   requestedAmount: '',
   approvedAmount: '',
   reason: REFUND_REASONS[0],
   refundBasis: '',
   ownerName: '',
   status: 'NHAP',
   paymentVoucherCode: '',
   payoutDate: '',
   note: ''
};

const FILTERS: Array<{ key: RefundFilter; label: string; icon?: React.ComponentType<{ size?: number }> }> = [
   { key: 'ALL', label: 'Tất cả' },
   { key: 'NHAP', label: 'Nháp', icon: Clock3 },
   { key: 'SALE_XAC_NHAN', label: 'Sale xác nhận', icon: CheckCircle2 },
   { key: 'KE_TOAN_KIEM_TRA', label: 'Kế toán kiểm tra', icon: AlertCircle },
   { key: 'CEO_DUYET', label: 'CEO duyệt', icon: ShieldCheck },
   { key: 'DA_HOAN', label: 'Đã hoàn', icon: CheckCircle2 }
];

const STATUS_META: Record<RefundStatus, { label: string; badge: string }> = {
   NHAP: { label: 'Nháp', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
   SALE_XAC_NHAN: { label: 'Sale xác nhận', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
   KE_TOAN_KIEM_TRA: { label: 'Kế toán kiểm tra', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
   CEO_DUYET: { label: 'CEO duyệt', badge: 'bg-violet-50 text-violet-700 border-violet-200' },
   DA_HOAN: { label: 'Đã hoàn', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
   TU_CHOI: { label: 'Từ chối', badge: 'bg-red-50 text-red-700 border-red-200' },
   HUY_YEU_CAU: { label: 'Huỷ yêu cầu', badge: 'bg-slate-200 text-slate-600 border-slate-300' }
};

const REFUND_VISIBLE_COLUMNS_STORAGE_KEY = 'educrm_refund_visible_columns_v2';

const REFUND_COLUMN_OPTIONS: RefundColumnOption[] = [
   {
      id: 'refundId',
      label: 'Mã HT',
      defaultVisible: true,
      required: true,
      thClassName: 'whitespace-nowrap',
      tdClassName: 'whitespace-nowrap align-top'
   },
   {
      id: 'studentName',
      label: 'Học viên',
      defaultVisible: true,
      thClassName: 'whitespace-nowrap',
      tdClassName: 'whitespace-nowrap align-top text-sm font-semibold text-slate-900'
   },
   {
      id: 'soCode',
      label: 'SO',
      thClassName: 'whitespace-nowrap',
      tdClassName: 'whitespace-nowrap align-top text-sm text-slate-700'
   },
   {
      id: 'contractCode',
      label: 'HĐ',
      defaultVisible: true,
      thClassName: 'whitespace-nowrap',
      tdClassName: 'whitespace-nowrap align-top text-sm text-slate-700'
   },
   {
      id: 'program',
      label: 'Chương trình/Gói SP',
      tdClassName: 'align-top text-sm text-slate-700'
   },
   {
      id: 'paidAmount',
      label: 'Số tiền đã thu',
      align: 'right',
      thClassName: 'whitespace-nowrap',
      tdClassName: 'whitespace-nowrap align-top text-sm text-slate-600'
   },
   {
      id: 'requestedAmount',
      label: 'Đề nghị hoàn',
      align: 'right',
      defaultVisible: true,
      thClassName: 'whitespace-nowrap',
      tdClassName: 'whitespace-nowrap align-top text-sm font-bold text-orange-600'
   },
   {
      id: 'approvedAmount',
      label: 'Duyệt hoàn',
      align: 'right',
      defaultVisible: true,
      thClassName: 'whitespace-nowrap',
      tdClassName: 'whitespace-nowrap align-top'
   },
   {
      id: 'reason',
      label: 'Lý do hoàn',
      thClassName: 'whitespace-nowrap',
      tdClassName: 'align-top text-sm text-slate-700'
   },
   {
      id: 'refundBasis',
      label: 'Căn cứ hoàn',
      tdClassName: 'min-w-[240px] align-top text-sm text-slate-600'
   },
   {
      id: 'createdBy',
      label: 'Người tạo',
      thClassName: 'whitespace-nowrap',
      tdClassName: 'whitespace-nowrap align-top text-sm text-slate-700'
   },
   {
      id: 'ownerName',
      label: 'Người phụ trách',
      thClassName: 'whitespace-nowrap',
      tdClassName: 'whitespace-nowrap align-top text-sm text-slate-700'
   },
   {
      id: 'status',
      label: 'Trạng thái',
      align: 'center',
      defaultVisible: true,
      required: true,
      thClassName: 'whitespace-nowrap',
      tdClassName: 'whitespace-nowrap text-center align-top'
   },
   {
      id: 'paymentVoucherCode',
      label: 'Chứng từ chi',
      thClassName: 'whitespace-nowrap',
      tdClassName: 'whitespace-nowrap align-top text-sm text-slate-700'
   },
   {
      id: 'payoutDate',
      label: 'Ngày thực chi',
      thClassName: 'whitespace-nowrap',
      tdClassName: 'whitespace-nowrap align-top text-sm text-slate-600'
   },
   {
      id: 'note',
      label: 'Ghi chú',
      tdClassName: 'min-w-[220px] align-top text-sm text-slate-600'
   },
   {
      id: 'log',
      label: 'Log',
      align: 'center',
      defaultVisible: true,
      required: true,
      thClassName: 'whitespace-nowrap',
      tdClassName: 'text-center align-top'
   }
];

const DEFAULT_VISIBLE_REFUND_COLUMNS = REFUND_COLUMN_OPTIONS.filter(
   (column) => column.defaultVisible || column.required
).map((column) => column.id);

const getStoredVisibleRefundColumns = (): RefundColumnKey[] => {
   if (typeof window === 'undefined') return DEFAULT_VISIBLE_REFUND_COLUMNS;

   const validIds = new Set(REFUND_COLUMN_OPTIONS.map((column) => column.id));
   const requiredIds = new Set(
      REFUND_COLUMN_OPTIONS.filter((column) => column.required).map((column) => column.id)
   );

   try {
      const raw = window.localStorage.getItem(REFUND_VISIBLE_COLUMNS_STORAGE_KEY);
      if (!raw) return DEFAULT_VISIBLE_REFUND_COLUMNS;

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return DEFAULT_VISIBLE_REFUND_COLUMNS;

      const selected = parsed.filter((value): value is RefundColumnKey => validIds.has(value));
      const merged = REFUND_COLUMN_OPTIONS.filter(
         (column) => requiredIds.has(column.id) || selected.includes(column.id)
      ).map((column) => column.id);

      return merged.length ? merged : DEFAULT_VISIBLE_REFUND_COLUMNS;
   } catch {
      return DEFAULT_VISIBLE_REFUND_COLUMNS;
   }
};

const normalizeRefundStatus = (status: unknown): RefundStatus => {
   const token = String(status || '').trim().toUpperCase();

   if (token === 'NHAP') return 'NHAP';
   if (token === 'SALE_XAC_NHAN' || token === 'CHO_SALE_DUYET') return 'SALE_XAC_NHAN';
   if (token === 'KE_TOAN_KIEM_TRA' || token === 'CHO_KE_TOAN_DUYET') return 'KE_TOAN_KIEM_TRA';
   if (token === 'CEO_DUYET') return 'CEO_DUYET';
   if (token === 'DA_HOAN' || token === 'DA_HOAN_TIEN') return 'DA_HOAN';
   if (token === 'TU_CHOI' || token === 'DA_TU_CHOI') return 'TU_CHOI';
   if (token === 'HUY_YEU_CAU') return 'HUY_YEU_CAU';

   return 'NHAP';
};

const normalizeRefund = (item: Partial<IRefundRequest>): IRefundRequest => ({
   id: item.id || `REF-${Date.now()}`,
   createdAt: item.createdAt || new Date().toISOString(),
   studentName: item.studentName || 'Chưa cập nhật',
   soCode: item.soCode || '',
   contractCode: item.contractCode || '',
   program: item.program || '',
   paidAmount: Number(item.paidAmount || 0),
   requestedAmount: Number(item.requestedAmount || 0),
   relatedPaymentCode: item.relatedPaymentCode || '',
   retainedAmount:
      item.retainedAmount === null || item.retainedAmount === undefined ? null : Number(item.retainedAmount || 0),
   approvedAmount:
      item.approvedAmount === null || item.approvedAmount === undefined ? null : Number(item.approvedAmount || 0),
   reason: item.reason || 'Lý do khác',
   refundBasis: item.refundBasis || '',
   createdBy: item.createdBy || 'Hệ thống',
   ownerName: item.ownerName || '',
   status: normalizeRefundStatus(item.status),
   paymentVoucherCode: item.paymentVoucherCode || '',
   payoutDate: item.payoutDate || '',
   note: item.note || '',
   evidenceFiles: Array.isArray(item.evidenceFiles) ? item.evidenceFiles : [],
   relatedDocuments: Array.isArray(item.relatedDocuments) ? item.relatedDocuments : []
});

const FinanceRefunds: React.FC = () => {
   const { user } = useAuth();
   const navigate = useNavigate();
   const columnMenuRef = useRef<HTMLDivElement | null>(null);
   const [refunds, setRefunds] = useState<IRefundRequest[]>([]);
   const [logs, setLogs] = useState<IRefundLog[]>([]);
   const [statusFilter, setStatusFilter] = useState<RefundFilter>('ALL');
   const [searchTerm, setSearchTerm] = useState('');
   const [visibleColumns, setVisibleColumns] = useState<RefundColumnKey[]>(() => getStoredVisibleRefundColumns());
   const [showColumnMenu, setShowColumnMenu] = useState(false);
   const [showCreateModal, setShowCreateModal] = useState(false);
   const [showLogModal, setShowLogModal] = useState<IRefundRequest | null>(null);
   const [logAudienceFilter, setLogAudienceFilter] = useState<LogAudienceFilter>('ALL');
   const [toastMessage, setToastMessage] = useState<string | null>(null);
   const [formData, setFormData] = useState<RefundFormState>(EMPTY_FORM);
   const [errors, setErrors] = useState<FormErrors>({});

   const loadData = () => {
      setRefunds((getRefunds() || []).map((item) => normalizeRefund(item)));
      setLogs(getRefundLogs());
   };

   useEffect(() => {
      const currentRefunds = getRefunds();
      if (!currentRefunds.length) {
         saveRefunds(INITIAL_REFUNDS);
      } else {
         const normalizedRefunds = currentRefunds.map((item) => normalizeRefund(item));
         if (JSON.stringify(currentRefunds) !== JSON.stringify(normalizedRefunds)) {
            saveRefunds(normalizedRefunds);
         }
      }

      const currentLogs = getRefundLogs();
      if (!currentLogs.length) {
         INITIAL_REFUND_LOGS.forEach((item) => addRefundLog(item));
      }

      loadData();

      window.addEventListener('educrm:refunds-changed', loadData as EventListener);
      window.addEventListener('educrm:refund-logs-changed', loadData as EventListener);

      return () => {
         window.removeEventListener('educrm:refunds-changed', loadData as EventListener);
         window.removeEventListener('educrm:refund-logs-changed', loadData as EventListener);
      };
   }, []);

   useEffect(() => {
      if (!toastMessage) return;
      const timer = window.setTimeout(() => setToastMessage(null), 2500);
      return () => window.clearTimeout(timer);
   }, [toastMessage]);

   useEffect(() => {
      window.localStorage.setItem(REFUND_VISIBLE_COLUMNS_STORAGE_KEY, JSON.stringify(visibleColumns));
   }, [visibleColumns]);

   useEffect(() => {
      if (!showColumnMenu) return;

      const handleClickOutside = (event: MouseEvent) => {
         if (!columnMenuRef.current?.contains(event.target as Node)) {
            setShowColumnMenu(false);
         }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
   }, [showColumnMenu]);

   const selectedLogs = useMemo(() => {
      if (!showLogModal) return [];
      return filterByLogAudience(
         getRefundLogs(showLogModal.id).sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
         ),
         logAudienceFilter,
         getRefundLogAudience
      );
   }, [showLogModal, logs, logAudienceFilter]);

   const activeRefundColumns = useMemo(
      () => REFUND_COLUMN_OPTIONS.filter((column) => visibleColumns.includes(column.id)),
      [visibleColumns]
   );

   const filteredData = useMemo(() => {
      const query = searchTerm.trim().toLowerCase();

      return refunds
         .filter((item) => {
            if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
            if (!query) return true;

            return [
               item.id,
               item.studentName,
               item.soCode,
               item.contractCode,
               item.program,
               item.reason,
               item.createdBy,
               item.ownerName,
               item.paymentVoucherCode
            ]
               .join(' ')
               .toLowerCase()
               .includes(query);
         })
         .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
   }, [refunds, searchTerm, statusFilter]);

   const studentOptions = useMemo(
      () => Array.from(new Set(refunds.map((item) => item.studentName))).sort((a, b) => a.localeCompare(b)),
      [refunds]
   );

   const contractOptions = useMemo(
      () => Array.from(new Set(refunds.map((item) => item.contractCode))).sort((a, b) => a.localeCompare(b)),
      [refunds]
   );

   const soOptions = useMemo(
      () => Array.from(new Set(refunds.map((item) => item.soCode).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b)),
      [refunds]
   );

   const resetForm = () => {
      setFormData(EMPTY_FORM);
      setErrors({});
      setShowCreateModal(false);
   };

   const validateForm = () => {
      const nextErrors: FormErrors = {};
      const paidAmount = Number(formData.paidAmount || 0);
      const requestedAmount = Number(formData.requestedAmount || 0);
      const approvedAmount = formData.approvedAmount === '' ? null : Number(formData.approvedAmount);

      if (!formData.studentName.trim()) nextErrors.studentName = 'Học viên là bắt buộc.';
      if (!formData.soCode.trim()) nextErrors.soCode = 'SO là bắt buộc.';
      if (!formData.contractCode.trim()) nextErrors.contractCode = 'Hợp đồng là bắt buộc.';
      if (!formData.program.trim()) nextErrors.program = 'Chương trình/Gói SP là bắt buộc.';
      if (!paidAmount || paidAmount <= 0) nextErrors.paidAmount = 'Số tiền đã thu phải lớn hơn 0.';
      if (!requestedAmount || requestedAmount <= 0) {
         nextErrors.requestedAmount = 'Số tiền đề nghị hoàn phải lớn hơn 0.';
      } else if (requestedAmount > paidAmount) {
         nextErrors.requestedAmount = 'Số tiền đề nghị hoàn không được vượt số tiền đã thu.';
      }
      if (approvedAmount !== null && !Number.isNaN(approvedAmount) && approvedAmount > requestedAmount) {
         nextErrors.approvedAmount = 'Số tiền duyệt không được vượt số tiền đề nghị.';
      }
      if (!formData.reason.trim()) nextErrors.reason = 'Lý do hoàn là bắt buộc.';
      if (!formData.refundBasis.trim()) nextErrors.refundBasis = 'Căn cứ hoàn là bắt buộc.';
      if (!formData.ownerName.trim()) nextErrors.ownerName = 'Người phụ trách là bắt buộc.';
      if (formData.paymentVoucherCode.trim() && !formData.payoutDate.trim()) {
         nextErrors.payoutDate = 'Cần nhập ngày thực chi khi đã có chứng từ chi.';
      }

      setErrors(nextErrors);
      return Object.keys(nextErrors).length === 0;
   };

   const handleCreateRefund = () => {
      if (!validateForm()) return;

      const now = new Date().toISOString();
      const newRecord: IRefundRequest = {
         id: `REF-${Math.floor(10000 + Math.random() * 90000)}`,
         createdAt: now,
         studentName: formData.studentName.trim(),
         soCode: formData.soCode.trim(),
         contractCode: formData.contractCode.trim(),
         program: formData.program.trim(),
         paidAmount: Number(formData.paidAmount || 0),
         requestedAmount: Number(formData.requestedAmount || 0),
         approvedAmount: formData.approvedAmount === '' ? null : Number(formData.approvedAmount),
         reason: formData.reason.trim(),
         refundBasis: formData.refundBasis.trim(),
         createdBy: user?.name || 'Hệ thống',
         ownerName: formData.ownerName.trim(),
         status: formData.status,
         paymentVoucherCode: formData.paymentVoucherCode.trim(),
         payoutDate: formData.payoutDate || undefined,
         note: formData.note.trim()
      };

      addRefund(newRecord);
      addRefundLog({
         id: `RLOG-${Date.now()}`,
         refundId: newRecord.id,
         action: `Tạo yêu cầu hoàn tiền ở trạng thái ${STATUS_META[newRecord.status].label}`,
         createdAt: now,
         createdBy: user?.name || user?.role || 'Hệ thống'
      });

      setToastMessage('Đã tạo yêu cầu hoàn tiền');
      resetForm();
   };

   const getApprovedAmountCell = (item: IRefundRequest) => {
      if (typeof item.approvedAmount !== 'number') {
         return <span className="text-sm italic text-slate-400">Chưa duyệt</span>;
      }

      return (
         <span
            className={`text-sm font-bold ${
               item.approvedAmount > 0 ? 'text-emerald-600' : 'text-slate-500'
            }`}
         >
            {formatCurrency(item.approvedAmount)}
         </span>
      );
   };

   const toggleColumn = (columnId: RefundColumnKey) => {
      const target = REFUND_COLUMN_OPTIONS.find((column) => column.id === columnId);
      if (target?.required) return;

      setVisibleColumns((current) => {
         if (current.includes(columnId)) {
            const next = current.filter((item) => item !== columnId);
            return next.length ? next : current;
         }

         return REFUND_COLUMN_OPTIONS.filter(
            (column) => column.id === columnId || current.includes(column.id)
         ).map((column) => column.id);
      });
   };

   const renderRefundCell = (item: IRefundRequest, columnId: RefundColumnKey) => {
      switch (columnId) {
         case 'refundId':
            return (
               <td className="w-[150px] px-4 py-4 align-top">
                  <Link
                     to={`/refunds/${item.id}`}
                     className="font-mono text-sm font-bold text-blue-600 transition-colors hover:text-blue-700 hover:underline"
                  >
                     {item.id}
                  </Link>
                  <div className="mt-1 text-xs text-slate-400">{formatDate(item.createdAt)}</div>
               </td>
            );
         case 'studentName':
            return (
               <td className="w-[170px] break-words px-4 py-4 align-top text-sm font-semibold text-slate-900">
                  <Link
                     to={`/refunds/${item.id}`}
                     className="transition-colors hover:text-blue-700 hover:underline"
                  >
                     {item.studentName}
                  </Link>
               </td>
            );
         case 'soCode':
            return <td className="w-[120px] break-words px-4 py-4 align-top text-sm text-slate-700">{item.soCode || '--'}</td>;
         case 'contractCode':
            return <td className="w-[130px] break-words px-4 py-4 align-top text-sm text-slate-700">{item.contractCode || '--'}</td>;
         case 'program':
            return <td className="break-words px-4 py-4 align-top text-sm text-slate-700">{item.program || '--'}</td>;
         case 'paidAmount':
            return (
               <td className="w-[150px] whitespace-nowrap px-4 py-4 text-right align-top text-sm text-slate-600">
                  {formatCurrency(item.paidAmount)}
               </td>
            );
         case 'requestedAmount':
            return (
               <td className="w-[150px] whitespace-nowrap px-4 py-4 text-right align-top text-sm font-bold text-orange-600">
                  {formatCurrency(item.requestedAmount)}
               </td>
            );
         case 'approvedAmount':
            return <td className="w-[150px] whitespace-nowrap px-4 py-4 text-right align-top">{getApprovedAmountCell(item)}</td>;
         case 'reason':
            return <td className="break-words px-4 py-4 align-top text-sm text-slate-700">{item.reason || '--'}</td>;
         case 'refundBasis':
            return <td className="break-words px-4 py-4 align-top text-sm text-slate-600">{item.refundBasis || '--'}</td>;
         case 'createdBy':
            return <td className="break-words px-4 py-4 align-top text-sm text-slate-700">{item.createdBy || '--'}</td>;
         case 'ownerName':
            return <td className="break-words px-4 py-4 align-top text-sm text-slate-700">{item.ownerName || '--'}</td>;
         case 'status':
            return (
               <td className="w-[170px] px-4 py-4 text-center align-top">
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${STATUS_META[item.status].badge}`}>
                     {STATUS_META[item.status].label}
                  </span>
               </td>
            );
         case 'paymentVoucherCode':
            return (
               <td className="break-words px-4 py-4 align-top text-sm text-slate-700">
                  {item.paymentVoucherCode || '--'}
               </td>
            );
         case 'payoutDate':
            return <td className="w-[120px] px-4 py-4 align-top text-sm text-slate-600">{formatDate(item.payoutDate)}</td>;
         case 'note':
            return <td className="break-words px-4 py-4 align-top text-sm text-slate-600">{item.note || '--'}</td>;
         case 'log':
            return (
               <td className="w-[72px] px-4 py-4 text-center align-top">
                  <button
                     onClick={(event) => {
                        event.stopPropagation();
                        setShowLogModal(item);
                     }}
                     className="rounded p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                     title="Xem log xử lý"
                  >
                     <MessageSquare size={18} />
                  </button>
               </td>
            );
         default:
            return null;
      }
   };

   return decodeMojibakeReactNode(
      <div className="min-h-screen bg-[#F8FAFC] p-8 font-sans text-slate-900">
         <div className="mx-auto max-w-[1880px]">
            <div className="mb-8 flex items-end justify-between gap-6">
               <div>
                  <h1 className="mb-2 text-3xl font-black tracking-tight text-slate-900">Quản lý Yêu cầu Hoàn tiền</h1>
                  <p className="text-slate-500">
                     Theo dõi đầy đủ thông tin hoàn tiền, căn cứ xử lý, chứng từ chi và trạng thái phê duyệt.
                  </p>
               </div>
               <button
                  onClick={() => {
                     setFormData(EMPTY_FORM);
                     setErrors({});
                     setShowCreateModal(true);
                  }}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
               >
                  <Plus size={18} />
                  Tạo Yêu cầu mới
               </button>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
               <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex flex-wrap gap-2">
                     {FILTERS.map((filter) => {
                        const Icon = filter.icon;
                        const active = statusFilter === filter.key;
                        return (
                           <button
                              key={filter.key}
                              onClick={() => setStatusFilter(filter.key)}
                              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                                 active
                                    ? 'bg-slate-800 text-white shadow'
                                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                              }`}
                           >
                              {Icon && <Icon size={14} />}
                              {filter.label}
                           </button>
                        );
                     })}

                  </div>

                  <div className="flex items-center gap-2">
                     <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                           value={searchTerm}
                           onChange={(event) => setSearchTerm(event.target.value)}
                           placeholder="Tìm theo mã, học viên, SO, hợp đồng..."
                           className="w-80 rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                     </div>

                     <div className="relative" ref={columnMenuRef}>
                        <button
                           type="button"
                           onClick={() => setShowColumnMenu((current) => !current)}
                           className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                              showColumnMenu
                                 ? 'bg-slate-800 text-white shadow'
                                 : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                           }`}
                        >
                           <Columns3 size={14} />
                           Cột
                        </button>

                        {showColumnMenu && (
                           <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                              <div className="border-b border-slate-100 px-2 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                 Hiển thị cột
                              </div>
                              <div className="max-h-80 overflow-y-auto py-1">
                                 {REFUND_COLUMN_OPTIONS.map((column) => {
                                    const active = visibleColumns.includes(column.id);

                                    return (
                                       <button
                                          key={column.id}
                                          type="button"
                                          onClick={() => toggleColumn(column.id)}
                                          className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm hover:bg-slate-50"
                                       >
                                          <div>
                                             <div className={active ? 'font-medium text-slate-900' : 'text-slate-500'}>
                                                {column.label}
                                             </div>
                                             {column.required && <div className="text-xs text-slate-400">Cột cố định</div>}
                                          </div>
                                          <span
                                             className={`flex h-4 w-4 items-center justify-center rounded border ${
                                                active
                                                   ? 'border-blue-600 bg-blue-600 text-white'
                                                   : 'border-slate-300 bg-white text-transparent'
                                             }`}
                                          >
                                             <Check size={11} strokeWidth={3} />
                                          </span>
                                       </button>
                                    );
                                 })}
                              </div>
                           </div>
                        )}
                     </div>
                  </div>
               </div>

               <div className="overflow-hidden">
                  <table className="w-full table-fixed border-collapse text-left">
                     <thead className="border-b border-slate-200 bg-[#F8FAFC]">
                        <tr>
                           <th className="w-16 px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500">STT</th>
                           {activeRefundColumns.map((column) => (
                              <th
                                 key={column.id}
                                 className={`px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 ${
                                    column.align === 'right'
                                       ? 'text-right'
                                       : column.align === 'center'
                                         ? 'text-center'
                                         : 'text-left'
                                 } ${column.thClassName || ''}`}
                              >
                                 {column.label}
                              </th>
                           ))}
                           {false && (
                              <>
                           <th className="whitespace-nowrap px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Mã hoàn tiền</th>
                           <th className="whitespace-nowrap px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Học viên</th>
                           <th className="whitespace-nowrap px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">SO</th>
                           <th className="whitespace-nowrap px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Hợp đồng</th>
                           <th className="whitespace-nowrap px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Chương trình/Gói SP</th>
                           <th className="whitespace-nowrap px-4 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Số tiền đã thu</th>
                           <th className="whitespace-nowrap px-4 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Số tiền đề nghị hoàn</th>
                           <th className="whitespace-nowrap px-4 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Số tiền được duyệt hoàn</th>
                           <th className="whitespace-nowrap px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Lý do hoàn</th>
                           <th className="whitespace-nowrap px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Căn cứ hoàn</th>
                           <th className="whitespace-nowrap px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Người tạo</th>
                           <th className="whitespace-nowrap px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Người phụ trách</th>
                           <th className="whitespace-nowrap px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Trạng thái hoàn tiền</th>
                           <th className="whitespace-nowrap px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Chứng từ chi</th>
                           <th className="whitespace-nowrap px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Ngày thực chi</th>
                           <th className="whitespace-nowrap px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Ghi chú</th>
                           <th className="whitespace-nowrap px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Log</th>
                           </>
                        )}
                        </tr>
                     </thead>

                     <tbody className="divide-y divide-slate-100">
                        {filteredData.map((item, index) => (
                           <tr
                              key={item.id}
                              onClick={() => navigate(`/refunds/${item.id}`)}
                              className="cursor-pointer transition-colors hover:bg-slate-50"
                           >
                              <td className="w-16 px-4 py-4 text-center align-top text-sm font-semibold text-slate-500">{index + 1}</td>
                              {activeRefundColumns.map((column) => (
                                 <React.Fragment key={column.id}>{renderRefundCell(item, column.id)}</React.Fragment>
                              ))}
                              {false && (
                                 <>
                              <td className="whitespace-nowrap px-4 py-4 align-top">
                                 <div className="font-mono text-sm font-bold text-blue-600">{item.id}</div>
                                 <div className="mt-1 text-xs text-slate-400">{formatDate(item.createdAt)}</div>
                              </td>
                              <td className="whitespace-nowrap px-4 py-4 align-top text-sm font-semibold text-slate-900">{item.studentName}</td>
                              <td className="whitespace-nowrap px-4 py-4 align-top text-sm text-slate-700">{item.soCode || '--'}</td>
                              <td className="whitespace-nowrap px-4 py-4 align-top text-sm text-slate-700">{item.contractCode}</td>
                              <td className="px-4 py-4 align-top text-sm text-slate-700">{item.program || '--'}</td>
                              <td className="whitespace-nowrap px-4 py-4 text-right align-top text-sm text-slate-600">{formatCurrency(item.paidAmount)}</td>
                              <td className="whitespace-nowrap px-4 py-4 text-right align-top text-sm font-bold text-orange-600">{formatCurrency(item.requestedAmount)}</td>
                              <td className="whitespace-nowrap px-4 py-4 text-right align-top">{getApprovedAmountCell(item)}</td>
                              <td className="px-4 py-4 align-top text-sm text-slate-700">{item.reason}</td>
                              <td className="min-w-[240px] px-4 py-4 align-top text-sm text-slate-600">{item.refundBasis || '--'}</td>
                              <td className="whitespace-nowrap px-4 py-4 align-top text-sm text-slate-700">{item.createdBy || '--'}</td>
                              <td className="whitespace-nowrap px-4 py-4 align-top text-sm text-slate-700">{item.ownerName || '--'}</td>
                              <td className="whitespace-nowrap px-4 py-4 text-center align-top">
                                 <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${STATUS_META[item.status].badge}`}>
                                    {STATUS_META[item.status].label}
                                 </span>
                              </td>
                              <td className="whitespace-nowrap px-4 py-4 align-top text-sm text-slate-700">{item.paymentVoucherCode || '--'}</td>
                              <td className="whitespace-nowrap px-4 py-4 align-top text-sm text-slate-600">{formatDate(item.payoutDate)}</td>
                              <td className="min-w-[220px] px-4 py-4 align-top text-sm text-slate-600">{item.note || '--'}</td>
                              <td className="px-4 py-4 text-center align-top">
                                 <button
                                    onClick={() => setShowLogModal(item)}
                                    className="rounded p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                                    title="Xem log xử lý"
                                 >
                                    <MessageSquare size={18} />
                                 </button>
                              </td>
                              </>
                           )}
                           </tr>
                        ))}

                        {filteredData.length === 0 && (
                           <tr>
                              <td colSpan={activeRefundColumns.length + 1} className="py-12 text-center italic text-slate-400">
                                 Không tìm thấy yêu cầu hoàn tiền nào trong bộ lọc này.
                              </td>
                           </tr>
                        )}
                     </tbody>
                  </table>
               </div>

               <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
                  <span className="text-xs font-bold text-slate-500">Tổng số: {filteredData.length} bản ghi</span>
                  <div className="flex gap-1">
                     <button className="rounded p-1 text-slate-400 hover:bg-slate-200">
                        <ChevronLeft size={18} />
                     </button>
                     <button className="rounded p-1 text-slate-400 hover:bg-slate-200">
                        <ChevronRight size={18} />
                     </button>
                  </div>
               </div>
            </div>
         </div>

         {showCreateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
               <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-xl bg-white shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
                     <h3 className="text-lg font-bold text-slate-800">Tạo yêu cầu hoàn tiền</h3>
                     <button onClick={resetForm} className="text-slate-400 transition-colors hover:text-slate-600">
                        <X size={18} />
                     </button>
                  </div>

                  <div className="max-h-[calc(92vh-134px)] overflow-y-auto p-6">
                     <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <div>
                           <label className="text-sm font-semibold text-slate-700">Mã hoàn tiền</label>
                           <input
                              value="Tự động sinh sau khi lưu"
                              readOnly
                              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
                           />
                        </div>

                        <div>
                           <label className="text-sm font-semibold text-slate-700">Học viên</label>
                           <input
                              list="refund-students"
                              value={formData.studentName}
                              onChange={(event) => {
                                 setFormData((prev) => ({ ...prev, studentName: event.target.value }));
                                 setErrors((prev) => ({ ...prev, studentName: undefined }));
                              }}
                              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                              placeholder="Nhập học viên"
                           />
                           <datalist id="refund-students">
                              {studentOptions.map((name) => (
                                 <option key={name} value={name} />
                              ))}
                           </datalist>
                           {errors.studentName && <p className="mt-1 text-xs text-red-600">{errors.studentName}</p>}
                        </div>

                        <div>
                           <label className="text-sm font-semibold text-slate-700">SO</label>
                           <input
                              list="refund-sos"
                              value={formData.soCode}
                              onChange={(event) => {
                                 setFormData((prev) => ({ ...prev, soCode: event.target.value }));
                                 setErrors((prev) => ({ ...prev, soCode: undefined }));
                              }}
                              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                              placeholder="Nhập mã SO"
                           />
                           <datalist id="refund-sos">
                              {soOptions.map((code) => (
                                 <option key={code} value={code} />
                              ))}
                           </datalist>
                           {errors.soCode && <p className="mt-1 text-xs text-red-600">{errors.soCode}</p>}
                        </div>

                        <div>
                           <label className="text-sm font-semibold text-slate-700">Hợp đồng</label>
                           <input
                              list="refund-contracts"
                              value={formData.contractCode}
                              onChange={(event) => {
                                 setFormData((prev) => ({ ...prev, contractCode: event.target.value }));
                                 setErrors((prev) => ({ ...prev, contractCode: undefined }));
                              }}
                              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                              placeholder="Nhập mã hợp đồng"
                           />
                           <datalist id="refund-contracts">
                              {contractOptions.map((code) => (
                                 <option key={code} value={code} />
                              ))}
                           </datalist>
                           {errors.contractCode && <p className="mt-1 text-xs text-red-600">{errors.contractCode}</p>}
                        </div>

                        <div>
                           <label className="text-sm font-semibold text-slate-700">Chương trình/Gói SP</label>
                           <input
                              value={formData.program}
                              onChange={(event) => {
                                 setFormData((prev) => ({ ...prev, program: event.target.value }));
                                 setErrors((prev) => ({ ...prev, program: undefined }));
                              }}
                              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                              placeholder="Nhập chương trình hoặc gói sản phẩm"
                           />
                           {errors.program && <p className="mt-1 text-xs text-red-600">{errors.program}</p>}
                        </div>

                        <div>
                           <label className="text-sm font-semibold text-slate-700">Người phụ trách</label>
                           <input
                              value={formData.ownerName}
                              onChange={(event) => {
                                 setFormData((prev) => ({ ...prev, ownerName: event.target.value }));
                                 setErrors((prev) => ({ ...prev, ownerName: undefined }));
                              }}
                              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                              placeholder="Nhập người phụ trách"
                           />
                           {errors.ownerName && <p className="mt-1 text-xs text-red-600">{errors.ownerName}</p>}
                        </div>

                        <div>
                           <label className="text-sm font-semibold text-slate-700">Số tiền đã thu</label>
                           <input
                              type="number"
                              value={formData.paidAmount}
                              onChange={(event) => {
                                 setFormData((prev) => ({ ...prev, paidAmount: event.target.value }));
                                 setErrors((prev) => ({ ...prev, paidAmount: undefined }));
                              }}
                              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                              placeholder="0"
                           />
                           {errors.paidAmount && <p className="mt-1 text-xs text-red-600">{errors.paidAmount}</p>}
                        </div>

                        <div>
                           <label className="text-sm font-semibold text-slate-700">Số tiền đề nghị hoàn</label>
                           <input
                              type="number"
                              value={formData.requestedAmount}
                              onChange={(event) => {
                                 setFormData((prev) => ({ ...prev, requestedAmount: event.target.value }));
                                 setErrors((prev) => ({ ...prev, requestedAmount: undefined }));
                              }}
                              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                              placeholder="0"
                           />
                           {errors.requestedAmount && <p className="mt-1 text-xs text-red-600">{errors.requestedAmount}</p>}
                        </div>

                        <div>
                           <label className="text-sm font-semibold text-slate-700">Số tiền được duyệt hoàn</label>
                           <input
                              type="number"
                              value={formData.approvedAmount}
                              onChange={(event) => {
                                 setFormData((prev) => ({ ...prev, approvedAmount: event.target.value }));
                                 setErrors((prev) => ({ ...prev, approvedAmount: undefined }));
                              }}
                              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                              placeholder="Để trống nếu chưa duyệt"
                           />
                           {errors.approvedAmount && <p className="mt-1 text-xs text-red-600">{errors.approvedAmount}</p>}
                        </div>

                        <div>
                           <label className="text-sm font-semibold text-slate-700">Lý do hoàn</label>
                           <select
                              value={formData.reason}
                              onChange={(event) => {
                                 setFormData((prev) => ({ ...prev, reason: event.target.value }));
                                 setErrors((prev) => ({ ...prev, reason: undefined }));
                              }}
                              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                           >
                              {REFUND_REASONS.map((reason) => (
                                 <option key={reason} value={reason}>
                                    {reason}
                                 </option>
                              ))}
                           </select>
                           {errors.reason && <p className="mt-1 text-xs text-red-600">{errors.reason}</p>}
                        </div>

                        <div className="xl:col-span-2">
                           <label className="text-sm font-semibold text-slate-700">Căn cứ hoàn</label>
                           <textarea
                              value={formData.refundBasis}
                              onChange={(event) => {
                                 setFormData((prev) => ({ ...prev, refundBasis: event.target.value }));
                                 setErrors((prev) => ({ ...prev, refundBasis: undefined }));
                              }}
                              className="mt-1 min-h-[90px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                              placeholder="Biên bản, email xác nhận, phụ lục hợp đồng, chính sách hỗ trợ..."
                           />
                           {errors.refundBasis && <p className="mt-1 text-xs text-red-600">{errors.refundBasis}</p>}
                        </div>

                        <div>
                           <label className="text-sm font-semibold text-slate-700">Trạng thái hoàn tiền</label>
                           <select
                              value={formData.status}
                              onChange={(event) =>
                                 setFormData((prev) => ({ ...prev, status: event.target.value as RefundStatus }))
                              }
                              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                           >
                              {Object.entries(STATUS_META).map(([value, meta]) => (
                                 <option key={value} value={value}>
                                    {meta.label}
                                 </option>
                              ))}
                           </select>
                        </div>

                        <div>
                           <label className="text-sm font-semibold text-slate-700">Chứng từ chi</label>
                           <input
                              value={formData.paymentVoucherCode}
                              onChange={(event) =>
                                 setFormData((prev) => ({ ...prev, paymentVoucherCode: event.target.value }))
                              }
                              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                              placeholder="PC-00001"
                           />
                        </div>

                        <div>
                           <label className="text-sm font-semibold text-slate-700">Ngày thực chi</label>
                           <input
                              type="date"
                              value={formData.payoutDate}
                              onChange={(event) => {
                                 setFormData((prev) => ({ ...prev, payoutDate: event.target.value }));
                                 setErrors((prev) => ({ ...prev, payoutDate: undefined }));
                              }}
                              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                           />
                           {errors.payoutDate && <p className="mt-1 text-xs text-red-600">{errors.payoutDate}</p>}
                        </div>

                        <div className="md:col-span-2 xl:col-span-3">
                           <label className="text-sm font-semibold text-slate-700">Ghi chú</label>
                           <textarea
                              value={formData.note}
                              onChange={(event) => setFormData((prev) => ({ ...prev, note: event.target.value }))}
                              className="mt-1 min-h-[88px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                              placeholder="Ghi chú xử lý nội bộ, tình trạng chứng từ, thông tin bổ sung..."
                           />
                        </div>
                     </div>
                  </div>

                  <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
                     <button
                        onClick={resetForm}
                        className="rounded-lg px-4 py-2 font-bold text-slate-600 transition-colors hover:bg-slate-100"
                     >
                        Huỷ
                     </button>
                     <button
                        onClick={handleCreateRefund}
                        className="rounded-lg bg-blue-600 px-4 py-2 font-bold text-white transition-colors hover:bg-blue-700"
                     >
                        Lưu yêu cầu
                     </button>
                  </div>
               </div>
            </div>
         )}

         {showLogModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
               <div className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
                     <div>
                        <h3 className="text-lg font-bold text-slate-800">Nhật ký xử lý {showLogModal.id}</h3>
                        <p className="mt-1 text-sm text-slate-500">
                           {showLogModal.studentName} • {showLogModal.contractCode}
                        </p>
                     </div>
                     <button
                        onClick={() => setShowLogModal(null)}
                        className="text-slate-400 transition-colors hover:text-slate-600"
                     >
                        <X size={18} />
                     </button>
                  </div>

                  <div className="max-h-[70vh] space-y-4 overflow-y-auto p-6">
                     <div className="flex justify-end">
                        <LogAudienceFilterControl value={logAudienceFilter} onChange={setLogAudienceFilter} />
                     </div>
                     {selectedLogs.length > 0 ? (
                        selectedLogs.map((log) => (
                           <div key={log.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                              <div className="flex items-center justify-between gap-4">
                                 <div className="font-semibold text-slate-800">{log.action}</div>
                                 <div className="text-xs text-slate-400">{formatDateTime(log.createdAt)}</div>
                              </div>
                              <div className="mt-2 text-sm text-slate-500">Thực hiện bởi: {log.createdBy}</div>
                           </div>
                        ))
                     ) : (
                        <div className="py-12 text-center italic text-slate-400">Chưa có log xử lý phù hợp bộ lọc.</div>
                     )}
                  </div>
               </div>
            </div>
         )}

         {toastMessage && (
            <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-xl">
               {toastMessage}
            </div>
         )}
      </div>
   );
};

export default FinanceRefunds;
