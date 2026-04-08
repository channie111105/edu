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
   FileText,
   MessageSquare,
   Plus,
   RotateCcw,
   Search,
   ShieldCheck,
   XCircle,
   X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LogAudienceFilterControl from '../components/LogAudienceFilter';
import { IRefundLog, IRefundRequest, RefundStatus, UserRole } from '../types';
import {
   addRefund,
   addRefundLog,
   getQuotations,
   getRefundLogs,
   getRefunds,
   saveRefunds,
   updateQuotation,
   updateRefund
} from '../utils/storage';
import {
   normalizeRefundStatus,
   REFUND_STATUS_META as STATUS_META,
   syncActualTransactionFromRefund
} from '../services/refundFlow.service';
import { filterByLogAudience, getRefundLogAudience, LogAudienceFilter } from '../utils/logAudience';
import { decodeMojibakeReactNode } from '../utils/mojibake';

const REFUND_REASONS = [
   'RÃƒÂºt hÃ¡Â»â€œ sÃ†Â¡',
   'Ã„ÂÃƒÂ³ng thÃ¡Â»Â«a',
   'Thay Ã„â€˜Ã¡Â»â€¢i chÃƒÂ­nh sÃƒÂ¡ch',
   'Theo chÃƒÂ­nh sÃƒÂ¡ch hÃ¡Â»â€” trÃ¡Â»Â£',
   'LÃƒÂ½ do khÃƒÂ¡c'
];

const INITIAL_REFUNDS: IRefundRequest[] = [
   {
      id: 'REF-92821',
      createdAt: '2026-03-10T08:30:00.000Z',
      studentName: 'LÃƒÂª HoÃƒÂ ng',
      soCode: 'SO-240321',
      contractCode: 'HD-2024-112',
      program: 'Workshop KÃ¡Â»Â¹ nÃ„Æ’ng',
      paidAmount: 25000000,
      relatedPaymentCode: 'PT-240310-018',
      requestedAmount: 5000000,
      retainedAmount: 1000000,
      approvedAmount: null,
      reason: 'Thay Ã„â€˜Ã¡Â»â€¢i chÃƒÂ­nh sÃƒÂ¡ch',
      refundBasis: 'BiÃƒÂªn bÃ¡ÂºÂ£n Ã„â€˜iÃ¡Â»Âu chÃ¡Â»â€°nh chÃ†Â°Ã†Â¡ng trÃƒÂ¬nh ngÃƒÂ y 09/03/2026',
      createdBy: 'TrÃ¡ÂºÂ§n VÃ„Æ’n QuÃ¡ÂºÂ£n TrÃ¡Â»â€¹',
      ownerName: 'LÃƒÂª NgÃ¡Â»Âc An',
      status: 'SALE_XAC_NHAN',
      paymentVoucherCode: '',
      payoutDate: '',
      note: 'Sale Ã„â€˜ÃƒÂ£ xÃƒÂ¡c nhÃ¡ÂºÂ­n hÃ¡Â»â€œ sÃ†Â¡, chÃ¡Â»Â kÃ¡ÂºÂ¿ toÃƒÂ¡n kiÃ¡Â»Æ’m tra.',
      evidenceFiles: ['email-xac-nhan-chuyen-chuong-trinh.pdf', 'phieu-de-nghi-hoan-tien.docx'],
      relatedDocuments: ['phu-luc-dieu-chinh-chuong-trinh.pdf']
   },
   {
      id: 'REF-92817',
      createdAt: '2026-03-08T10:15:00.000Z',
      studentName: 'PhÃ¡ÂºÂ¡m VÃ„Æ’n HÃƒÂ¹ng',
      soCode: 'SO-240108',
      contractCode: 'HD-2024-001',
      program: 'Du hÃ¡Â»Âc Ã„ÂÃ¡Â»Â©c',
      paidAmount: 45000000,
      relatedPaymentCode: 'PT-240308-004',
      requestedAmount: 12000000,
      retainedAmount: 2000000,
      approvedAmount: 10000000,
      reason: 'RÃƒÂºt hÃ¡Â»â€œ sÃ†Â¡',
      refundBasis: 'Email xÃƒÂ¡c nhÃ¡ÂºÂ­n dÃ¡Â»Â«ng hÃ¡Â»â€œ sÃ†Â¡ vÃƒÂ  phÃ¡Â»Â¥ lÃ¡Â»Â¥c thanh lÃƒÂ½ hÃ¡Â»Â£p Ã„â€˜Ã¡Â»â€œng',
      createdBy: 'NguyÃ¡Â»â€¦n ThÃ¡ÂºÂ£o Sale',
      ownerName: 'TrÃ¡ÂºÂ§n VÃ„Æ’n QuÃ¡ÂºÂ£n TrÃ¡Â»â€¹',
      status: 'KE_TOAN_KIEM_TRA',
      paymentVoucherCode: '',
      payoutDate: '',
      note: 'Ã„ÂÃƒÂ£ Ã„â€˜Ã¡Â»â€˜i chiÃ¡ÂºÂ¿u cÃƒÂ´ng nÃ¡Â»Â£, chÃ¡Â»Â CEO duyÃ¡Â»â€¡t hÃ¡ÂºÂ¡n mÃ¡Â»Â©c hoÃƒÂ n.',
      evidenceFiles: ['don-rut-ho-so.pdf', 'email-xac-nhan-dung-ho-so.eml'],
      relatedDocuments: ['phu-luc-thanh-ly-hop-dong.pdf', 'bang-doi-chieu-cong-no.xlsx']
   },
   {
      id: 'REF-92815',
      createdAt: '2026-03-06T14:00:00.000Z',
      studentName: 'NguyÃ¡Â»â€¦n ThÃ¡Â»â€¹ Lan',
      soCode: 'SO-240042',
      contractCode: 'HD-2024-042',
      program: 'TiÃ¡ÂºÂ¿ng Ã„ÂÃ¡Â»Â©c A1',
      paidAmount: 8000000,
      relatedPaymentCode: 'PT-240306-011',
      requestedAmount: 2000000,
      retainedAmount: 0,
      approvedAmount: 2000000,
      reason: 'Theo chÃƒÂ­nh sÃƒÂ¡ch hÃ¡Â»â€” trÃ¡Â»Â£',
      refundBasis: 'QuyÃ¡ÂºÂ¿t Ã„â€˜Ã¡Â»â€¹nh hÃ¡Â»â€” trÃ¡Â»Â£ hÃ¡Â»Âc viÃƒÂªn sÃ¡Â»â€˜ HT-03/2026',
      createdBy: 'LÃƒÂª HÃ¡ÂºÂ¡nh Sale',
      ownerName: 'TrÃ¡ÂºÂ§n VÃ„Æ’n QuÃ¡ÂºÂ£n TrÃ¡Â»â€¹',
      status: 'DA_HOAN',
      paymentVoucherCode: 'PC-00015',
      payoutDate: '2026-03-07',
      note: 'Ã„ÂÃƒÂ£ chi tiÃ¡Â»Ân mÃ¡ÂºÂ·t tÃ¡ÂºÂ¡i quÃ¡ÂºÂ§y vÃƒÂ  Ã„â€˜Ã¡Â»â€˜i chiÃ¡ÂºÂ¿u kÃƒÂ½ nhÃ¡ÂºÂ­n.',
      evidenceFiles: ['quyet-dinh-ho-tro.pdf'],
      relatedDocuments: ['phieu-chi-pc-00015.pdf', 'bien-ban-ky-nhan.pdf']
   },
   {
      id: 'REF-92818',
      createdAt: '2026-03-05T09:45:00.000Z',
      studentName: 'TrÃ¡ÂºÂ§n Minh TuÃ¡ÂºÂ¥n',
      soCode: 'SO-230891',
      contractCode: 'HD-2023-891',
      program: 'Du hÃ¡Â»Âc nghÃ¡Â»Â ÃƒÅ¡c',
      paidAmount: 4000000,
      relatedPaymentCode: 'PT-240305-009',
      requestedAmount: 4000000,
      retainedAmount: 0,
      approvedAmount: 0,
      reason: 'Ã„ÂÃƒÂ³ng thÃ¡Â»Â«a',
      refundBasis: 'Ã„ÂÃ¡Â»â€˜i chiÃ¡ÂºÂ¿u giao dÃ¡Â»â€¹ch trÃƒÂ¹ng trÃƒÂªn sao kÃƒÂª ngÃƒÂ¢n hÃƒÂ ng',
      createdBy: 'PhÃ¡ÂºÂ¡m Nam KÃ¡ÂºÂ¿ ToÃƒÂ¡n',
      ownerName: 'PhÃ¡ÂºÂ¡m Nam KÃ¡ÂºÂ¿ ToÃƒÂ¡n',
      status: 'TU_CHOI',
      paymentVoucherCode: '',
      payoutDate: '',
      note: 'KhoÃ¡ÂºÂ£n thu Ã„â€˜ÃƒÂ£ Ã„â€˜Ã†Â°Ã¡Â»Â£c bÃƒÂ¹ trÃ¡Â»Â« vÃƒÂ o kÃ¡Â»Â³ cÃƒÂ´ng nÃ¡Â»Â£ kÃ¡ÂºÂ¿ tiÃ¡ÂºÂ¿p.',
      evidenceFiles: ['sao-ke-ngan-hang-thang-03.pdf'],
      relatedDocuments: ['bien-ban-doi-soat.pdf']
   }
];

const INITIAL_REFUND_LOGS: IRefundLog[] = [
   {
      id: 'RLOG-REF-92821-1',
      refundId: 'REF-92821',
      action: 'TÃ¡ÂºÂ¡o yÃƒÂªu cÃ¡ÂºÂ§u hoÃƒÂ n tiÃ¡Â»Ân',
      createdAt: '2026-03-10T08:30:00.000Z',
      createdBy: 'TrÃ¡ÂºÂ§n VÃ„Æ’n QuÃ¡ÂºÂ£n TrÃ¡Â»â€¹'
   },
   {
      id: 'RLOG-REF-92821-2',
      refundId: 'REF-92821',
      action: 'Sale xÃƒÂ¡c nhÃ¡ÂºÂ­n hÃ¡Â»â€œ sÃ†Â¡ hÃ¡Â»Â£p lÃ¡Â»â€¡',
      createdAt: '2026-03-10T14:10:00.000Z',
      createdBy: 'LÃƒÂª NgÃ¡Â»Âc An'
   },
   {
      id: 'RLOG-REF-92817-1',
      refundId: 'REF-92817',
      action: 'TÃ¡ÂºÂ¡o yÃƒÂªu cÃ¡ÂºÂ§u hoÃƒÂ n tiÃ¡Â»Ân',
      createdAt: '2026-03-08T10:15:00.000Z',
      createdBy: 'NguyÃ¡Â»â€¦n ThÃ¡ÂºÂ£o Sale'
   },
   {
      id: 'RLOG-REF-92817-2',
      refundId: 'REF-92817',
      action: 'KÃ¡ÂºÂ¿ toÃƒÂ¡n kiÃ¡Â»Æ’m tra sÃ¡Â»â€˜ tiÃ¡Â»Ân hoÃƒÂ n 10.000.000 Ã„â€˜',
      createdAt: '2026-03-09T16:45:00.000Z',
      createdBy: 'TrÃ¡ÂºÂ§n VÃ„Æ’n QuÃ¡ÂºÂ£n TrÃ¡Â»â€¹'
   },
   {
      id: 'RLOG-REF-92815-1',
      refundId: 'REF-92815',
      action: 'CEO duyÃ¡Â»â€¡t hoÃƒÂ n tiÃ¡Â»Ân',
      createdAt: '2026-03-06T16:00:00.000Z',
      createdBy: 'CEO'
   },
   {
      id: 'RLOG-REF-92815-2',
      refundId: 'REF-92815',
      action: 'PhÃƒÂ¡t hÃƒÂ nh chÃ¡Â»Â©ng tÃ¡Â»Â« chi PC-00015',
      createdAt: '2026-03-07T10:20:00.000Z',
      createdBy: 'PhÃ¡ÂºÂ¡m Nam KÃ¡ÂºÂ¿ ToÃƒÂ¡n'
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
   | 'action'
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
   status: 'DRAFT',
   paymentVoucherCode: '',
   payoutDate: '',
   note: ''
};

const FILTERS: Array<{ key: RefundFilter; label: string; icon?: React.ComponentType<{ size?: number }> }> = [
   { key: 'ALL', label: 'T\u1ea5t c\u1ea3' },
   { key: 'DRAFT', label: 'Nh\u00e1p', icon: Clock3 },
   { key: 'CHO_DUYET', label: 'Ch\u1edd duy\u1ec7t', icon: CheckCircle2 },
   { key: 'KE_TOAN_XAC_NHAN', label: 'KT x\u00e1c nh\u1eadn', icon: AlertCircle },
   { key: 'DA_DUYET', label: 'Duy\u1ec7t', icon: ShieldCheck },
   { key: 'DA_THU_CHI', label: '\u0110\u00e3 thu / \u0111\u00e3 chi', icon: CheckCircle2 }
];

const REFUND_VISIBLE_COLUMNS_STORAGE_KEY = 'educrm_refund_visible_columns_v3';

const _LEGACY_REFUND_COLUMN_OPTIONS: RefundColumnOption[] = [
   {
      id: 'refundId',
      label: 'MÃƒÂ£ HT',
      defaultVisible: true,
      required: true,
      thClassName: 'whitespace-nowrap',
      tdClassName: 'whitespace-nowrap align-top'
   },
   {
      id: 'studentName',
      label: 'HÃ¡Â»Âc viÃƒÂªn',
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
      label: 'HÃ„Â',
      defaultVisible: true,
      thClassName: 'whitespace-nowrap',
      tdClassName: 'whitespace-nowrap align-top text-sm text-slate-700'
   },
   {
      id: 'program',
      label: 'ChÃ†Â°Ã†Â¡ng trÃƒÂ¬nh/GÃƒÂ³i SP',
      tdClassName: 'align-top text-sm text-slate-700'
   },
   {
      id: 'paidAmount',
      label: 'SÃ¡Â»â€˜ tiÃ¡Â»Ân Ã„â€˜ÃƒÂ£ thu',
      align: 'right',
      thClassName: 'whitespace-nowrap',
      tdClassName: 'whitespace-nowrap align-top text-sm text-slate-600'
   },
   {
      id: 'requestedAmount',
      label: 'Ã„ÂÃ¡Â»Â nghÃ¡Â»â€¹ hoÃƒÂ n',
      align: 'right',
      defaultVisible: true,
      thClassName: 'whitespace-nowrap',
      tdClassName: 'whitespace-nowrap align-top text-sm font-bold text-orange-600'
   },
   {
      id: 'approvedAmount',
      label: 'DuyÃ¡Â»â€¡t hoÃƒÂ n',
      align: 'right',
      defaultVisible: true,
      thClassName: 'whitespace-nowrap',
      tdClassName: 'whitespace-nowrap align-top'
   },
   {
      id: 'reason',
      label: 'LÃƒÂ½ do hoÃƒÂ n',
      thClassName: 'whitespace-nowrap',
      tdClassName: 'align-top text-sm text-slate-700'
   },
   {
      id: 'refundBasis',
      label: 'CÃ„Æ’n cÃ¡Â»Â© hoÃƒÂ n',
      tdClassName: 'min-w-[240px] align-top text-sm text-slate-600'
   },
   {
      id: 'createdBy',
      label: 'NgÃ†Â°Ã¡Â»Âi tÃ¡ÂºÂ¡o',
      thClassName: 'whitespace-nowrap',
      tdClassName: 'whitespace-nowrap align-top text-sm text-slate-700'
   },
   {
      id: 'ownerName',
      label: 'NgÃ†Â°Ã¡Â»Âi phÃ¡Â»Â¥ trÃƒÂ¡ch',
      thClassName: 'whitespace-nowrap',
      tdClassName: 'whitespace-nowrap align-top text-sm text-slate-700'
   },
   {
      id: 'status',
      label: 'TrÃ¡ÂºÂ¡ng thÃƒÂ¡i',
      align: 'center',
      defaultVisible: true,
      required: true,
      thClassName: 'whitespace-nowrap',
      tdClassName: 'whitespace-nowrap text-center align-top'
   },
   {
      id: 'paymentVoucherCode',
      label: 'ChÃ¡Â»Â©ng tÃ¡Â»Â« chi',
      thClassName: 'whitespace-nowrap',
      tdClassName: 'whitespace-nowrap align-top text-sm text-slate-700'
   },
   {
      id: 'payoutDate',
      label: 'NgÃƒÂ y thÃ¡Â»Â±c chi',
      thClassName: 'whitespace-nowrap',
      tdClassName: 'whitespace-nowrap align-top text-sm text-slate-600'
   },
   {
      id: 'note',
      label: 'Ghi chÃƒÂº',
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

void _LEGACY_REFUND_COLUMN_OPTIONS;

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
      defaultVisible: true,
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
      label: 'Trạng thái duyệt',
      align: 'center',
      defaultVisible: true,
      required: true,
      thClassName: 'whitespace-nowrap',
      tdClassName: 'whitespace-nowrap text-center align-top'
   },
   {
      id: 'paymentVoucherCode',
      label: 'Chứng từ chi',
      defaultVisible: true,
      thClassName: 'whitespace-nowrap',
      tdClassName: 'whitespace-nowrap align-top text-sm text-slate-700'
   },
   {
      id: 'payoutDate',
      label: 'Ngày thực chi',
      defaultVisible: true,
      thClassName: 'whitespace-nowrap',
      tdClassName: 'whitespace-nowrap align-top text-sm text-slate-600'
   },
   {
      id: 'note',
      label: 'Ghi chú',
      tdClassName: 'min-w-[220px] align-top text-sm text-slate-600'
   },
   {
      id: 'action',
      label: 'Thao tác',
      align: 'center',
      defaultVisible: true,
      required: true,
      thClassName: 'w-[260px] whitespace-nowrap',
      tdClassName: 'w-[260px] text-center align-top'
   },
   {
      id: 'log',
      label: 'Log',
      align: 'center',
      defaultVisible: true,
      required: true,
      thClassName: 'w-[56px] whitespace-nowrap',
      tdClassName: 'w-[56px] text-center align-top'
   }
];

const DEFAULT_VISIBLE_REFUND_COLUMNS = REFUND_COLUMN_OPTIONS.filter(
   (column) => column.defaultVisible || column.required
).map((column) => column.id);

const REFUND_COLUMN_DISPLAY_ORDER: RefundColumnKey[] = [
   'refundId',
   'studentName',
   'soCode',
   'contractCode',
   'program',
   'paidAmount',
   'requestedAmount',
   'approvedAmount',
   'reason',
   'refundBasis',
   'createdBy',
   'ownerName',
   'paymentVoucherCode',
   'payoutDate',
   'note',
   'status',
   'action',
   'log'
];

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

const normalizeRefund = (item: Partial<IRefundRequest>): IRefundRequest => ({
   id: item.id || `REF-${Date.now()}`,
   createdAt: item.createdAt || new Date().toISOString(),
   studentName: item.studentName || 'ChÃ†Â°a cÃ¡ÂºÂ­p nhÃ¡ÂºÂ­t',
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
   reason: item.reason || 'LÃƒÂ½ do khÃƒÂ¡c',
   refundBasis: item.refundBasis || '',
   createdBy: item.createdBy || 'HÃ¡Â»â€¡ thÃ¡Â»â€˜ng',
   ownerName: item.ownerName || '',
   status: normalizeRefundStatus(item.status),
   paymentVoucherCode: item.paymentVoucherCode || '',
   payoutDate: item.payoutDate || '',
   note: item.note || '',
   evidenceFiles: Array.isArray(item.evidenceFiles) ? item.evidenceFiles : [],
   relatedDocuments: Array.isArray(item.relatedDocuments) ? item.relatedDocuments : []
});

const getRefundAmountToSync = (item: IRefundRequest) =>
   Math.max(0, Number(item.approvedAmount ?? item.requestedAmount ?? 0) || 0);

const syncQuotationRefundAmount = (soCode?: string) => {
   if (!soCode) return;

   const quotation = getQuotations().find((item) => item.soCode === soCode);
   if (!quotation) return;

   const totalApprovedRefund = getRefunds()
      .map((item) => normalizeRefund(item))
      .filter((item) => item.soCode === soCode && (item.status === 'DA_DUYET' || item.status === 'DA_THU_CHI'))
      .reduce((sum, item) => sum + getRefundAmountToSync(item), 0);

   updateQuotation({
      ...quotation,
      refundAmount: totalApprovedRefund,
      updatedAt: new Date().toISOString()
   });
};

const FinanceRefunds: React.FC = () => {
   const { user } = useAuth();
   const userRole = user?.role;
   const canUseDualFinanceApproval =
      userRole === UserRole.ACCOUNTANT || userRole === UserRole.ADMIN || userRole === UserRole.FOUNDER;
   const canActAsAccountant = canUseDualFinanceApproval;
   const canActAsAdmin = canUseDualFinanceApproval;
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
      () =>
         REFUND_COLUMN_DISPLAY_ORDER.map((columnId) => REFUND_COLUMN_OPTIONS.find((column) => column.id === columnId))
            .filter((column): column is RefundColumnOption => Boolean(column) && visibleColumns.includes(column.id)),
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

   const persistRefundWorkflow = (
      item: IRefundRequest,
      nextStatus: RefundStatus,
      actionLabel: string,
      note?: string
   ) => {
      const nextRefund: IRefundRequest = {
         ...item,
         status: nextStatus,
         approvedAmount:
            nextStatus === 'KE_TOAN_XAC_NHAN' || nextStatus === 'DA_DUYET' || nextStatus === 'DA_THU_CHI'
               ? item.approvedAmount ?? item.requestedAmount
               : item.approvedAmount
      };

      const updated = updateRefund(nextRefund);
      if (!updated) {
         window.alert('Không thể cập nhật trạng thái hoàn tiền.');
         return;
      }

      syncActualTransactionFromRefund(nextRefund, user?.id || user?.name || 'system');
      syncQuotationRefundAmount(item.soCode);
      addRefundLog({
         id: `RLOG-${Date.now()}`,
         refundId: item.id,
         action: note ? `${actionLabel}: ${note}` : `${actionLabel} chuyển trạng thái sang ${STATUS_META[nextStatus].label}`,
         createdAt: new Date().toISOString(),
         createdBy: user?.name || user?.role || 'Hệ thống'
      });

      loadData();
   };

   const handleSubmitForApproval = (item: IRefundRequest) => {
      persistRefundWorkflow(item, 'CHO_DUYET', 'Trình duyệt');
   };

   const handleAccountingConfirm = (item: IRefundRequest) => {
      persistRefundWorkflow(item, 'KE_TOAN_XAC_NHAN', 'KT xác nhận');
   };

   const handleAdminApprove = (item: IRefundRequest) => {
      persistRefundWorkflow(item, 'DA_DUYET', 'Duyệt');
   };

   const handleReject = (item: IRefundRequest) => {
      const reason = window.prompt('Nhập lý do từ chối hoàn tiền:', 'Thiếu chứng từ');
      if (reason === null) return;

      const trimmedReason = reason.trim();
      if (!trimmedReason) {
         window.alert('Cần nhập lý do từ chối.');
         return;
      }

      persistRefundWorkflow(item, 'TU_CHOI', 'Từ chối', trimmedReason);
   };

   const handleUndoApprove = (item: IRefundRequest) => {
      const confirmed = window.confirm(`Bạn có chắc muốn hủy duyệt yêu cầu hoàn tiền ${item.id}?`);
      if (!confirmed) return;

      persistRefundWorkflow(item, 'KE_TOAN_XAC_NHAN', 'Hủy duyệt');
   };

   const validateForm = () => {
      const nextErrors: FormErrors = {};
      const paidAmount = Number(formData.paidAmount || 0);
      const requestedAmount = Number(formData.requestedAmount || 0);
      const approvedAmount = formData.approvedAmount === '' ? null : Number(formData.approvedAmount);

      if (!formData.studentName.trim()) nextErrors.studentName = 'HÃ¡Â»Âc viÃƒÂªn lÃƒÂ  bÃ¡ÂºÂ¯t buÃ¡Â»â„¢c.';
      if (!formData.soCode.trim()) nextErrors.soCode = 'SO lÃƒÂ  bÃ¡ÂºÂ¯t buÃ¡Â»â„¢c.';
      if (!formData.contractCode.trim()) nextErrors.contractCode = 'HÃ¡Â»Â£p Ã„â€˜Ã¡Â»â€œng lÃƒÂ  bÃ¡ÂºÂ¯t buÃ¡Â»â„¢c.';
      if (!formData.program.trim()) nextErrors.program = 'ChÃ†Â°Ã†Â¡ng trÃƒÂ¬nh/GÃƒÂ³i SP lÃƒÂ  bÃ¡ÂºÂ¯t buÃ¡Â»â„¢c.';
      if (!paidAmount || paidAmount <= 0) nextErrors.paidAmount = 'SÃ¡Â»â€˜ tiÃ¡Â»Ân Ã„â€˜ÃƒÂ£ thu phÃ¡ÂºÂ£i lÃ¡Â»â€ºn hÃ†Â¡n 0.';
      if (!requestedAmount || requestedAmount <= 0) {
         nextErrors.requestedAmount = 'SÃ¡Â»â€˜ tiÃ¡Â»Ân Ã„â€˜Ã¡Â»Â nghÃ¡Â»â€¹ hoÃƒÂ n phÃ¡ÂºÂ£i lÃ¡Â»â€ºn hÃ†Â¡n 0.';
      } else if (requestedAmount > paidAmount) {
         nextErrors.requestedAmount = 'SÃ¡Â»â€˜ tiÃ¡Â»Ân Ã„â€˜Ã¡Â»Â nghÃ¡Â»â€¹ hoÃƒÂ n khÃƒÂ´ng Ã„â€˜Ã†Â°Ã¡Â»Â£c vÃ†Â°Ã¡Â»Â£t sÃ¡Â»â€˜ tiÃ¡Â»Ân Ã„â€˜ÃƒÂ£ thu.';
      }
      if (approvedAmount !== null && !Number.isNaN(approvedAmount) && approvedAmount > requestedAmount) {
         nextErrors.approvedAmount = 'SÃ¡Â»â€˜ tiÃ¡Â»Ân duyÃ¡Â»â€¡t khÃƒÂ´ng Ã„â€˜Ã†Â°Ã¡Â»Â£c vÃ†Â°Ã¡Â»Â£t sÃ¡Â»â€˜ tiÃ¡Â»Ân Ã„â€˜Ã¡Â»Â nghÃ¡Â»â€¹.';
      }
      if (!formData.reason.trim()) nextErrors.reason = 'LÃƒÂ½ do hoÃƒÂ n lÃƒÂ  bÃ¡ÂºÂ¯t buÃ¡Â»â„¢c.';
      if (!formData.refundBasis.trim()) nextErrors.refundBasis = 'CÃ„Æ’n cÃ¡Â»Â© hoÃƒÂ n lÃƒÂ  bÃ¡ÂºÂ¯t buÃ¡Â»â„¢c.';
      if (!formData.ownerName.trim()) nextErrors.ownerName = 'NgÃ†Â°Ã¡Â»Âi phÃ¡Â»Â¥ trÃƒÂ¡ch lÃƒÂ  bÃ¡ÂºÂ¯t buÃ¡Â»â„¢c.';
      if (formData.paymentVoucherCode.trim() && !formData.payoutDate.trim()) {
         nextErrors.payoutDate = 'CÃ¡ÂºÂ§n nhÃ¡ÂºÂ­p ngÃƒÂ y thÃ¡Â»Â±c chi khi Ã„â€˜ÃƒÂ£ cÃƒÂ³ chÃ¡Â»Â©ng tÃ¡Â»Â« chi.';
      }

      setErrors(nextErrors);
      return Object.keys(nextErrors).length === 0;
   };

   const handleCreateRefund = () => {
      if (!validateForm()) return;

      const now = new Date().toISOString();
      const initialStatus: RefundStatus = 'DRAFT';
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
         createdBy: user?.name || 'HÃ¡Â»â€¡ thÃ¡Â»â€˜ng',
         ownerName: formData.ownerName.trim(),
         status: initialStatus,
         paymentVoucherCode: formData.paymentVoucherCode.trim(),
         payoutDate: formData.payoutDate || undefined,
         note: formData.note.trim()
      };

      addRefund(newRecord);
      addRefundLog({
         id: `RLOG-${Date.now()}`,
         refundId: newRecord.id,
         action: `TÃ¡ÂºÂ¡o yÃƒÂªu cÃ¡ÂºÂ§u hoÃƒÂ n tiÃ¡Â»Ân Ã¡Â»Å¸ trÃ¡ÂºÂ¡ng thÃƒÂ¡i ${STATUS_META[initialStatus].label}`,
         createdAt: now,
         createdBy: user?.name || user?.role || 'HÃ¡Â»â€¡ thÃ¡Â»â€˜ng'
      });

      setToastMessage('Ã„ÂÃƒÂ£ tÃ¡ÂºÂ¡o yÃƒÂªu cÃ¡ÂºÂ§u hoÃƒÂ n tiÃ¡Â»Ân');
      resetForm();
   };

   const getApprovedAmountCell = (item: IRefundRequest) => {
      if (typeof item.approvedAmount !== 'number') {
         return <span className="text-sm italic text-slate-400">ChÃ†Â°a duyÃ¡Â»â€¡t</span>;
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

   const renderRefundActions = (item: IRefundRequest) => {
      const unavailable = (
         <span className="inline-flex items-center gap-1 text-xs text-slate-400">
            <XCircle size={12} />
            Không khả dụng
         </span>
      );

      if (item.status === 'DRAFT') {
         return (
            <div className="flex flex-nowrap justify-center gap-2">
               <button
                  type="button"
                  onClick={(event) => {
                     event.stopPropagation();
                     handleSubmitForApproval(item);
                  }}
                  className="inline-flex min-w-[96px] items-center justify-center gap-1 whitespace-nowrap rounded bg-slate-900 px-2.5 py-1.5 text-xs font-bold text-white"
               >
                  <FileText size={12} />
                  Trình duyệt
               </button>
            </div>
         );
      }

      if (item.status === 'CHO_DUYET') {
         if (!canActAsAccountant) return unavailable;

         return (
            <div className="flex flex-nowrap justify-center gap-2">
               <button
                  type="button"
                  onClick={(event) => {
                     event.stopPropagation();
                     handleReject(item);
                  }}
                  className="inline-flex min-w-[74px] items-center justify-center whitespace-nowrap rounded border border-rose-200 px-2.5 py-1.5 text-xs font-bold text-rose-700"
               >
                  Từ chối
               </button>
               <button
                  type="button"
                  onClick={(event) => {
                     event.stopPropagation();
                     handleAccountingConfirm(item);
                  }}
                  className="inline-flex min-w-[104px] items-center justify-center gap-1 whitespace-nowrap rounded bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white"
               >
                  <CheckCircle2 size={12} />
                  KT xác nhận
               </button>
            </div>
         );
      }

      if (item.status === 'KE_TOAN_XAC_NHAN') {
         if (!canActAsAdmin) return unavailable;

         return (
            <div className="flex flex-nowrap justify-center gap-2">
               <button
                  type="button"
                  onClick={(event) => {
                     event.stopPropagation();
                     handleReject(item);
                  }}
                  className="inline-flex min-w-[74px] items-center justify-center whitespace-nowrap rounded border border-rose-200 px-2.5 py-1.5 text-xs font-bold text-rose-700"
               >
                  Từ chối
               </button>
               <button
                  type="button"
                  onClick={(event) => {
                     event.stopPropagation();
                     handleAdminApprove(item);
                  }}
                  className="inline-flex min-w-[80px] items-center justify-center gap-1 whitespace-nowrap rounded bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white"
               >
                  <FileText size={12} />
                  Duyệt
               </button>
            </div>
         );
      }

      if (item.status === 'DA_DUYET') {
         if (!canActAsAdmin) return unavailable;

         return (
            <div className="flex flex-nowrap justify-center gap-2">
               <button
                  type="button"
                  onClick={(event) => {
                     event.stopPropagation();
                     handleUndoApprove(item);
                  }}
                  className="inline-flex min-w-[96px] items-center justify-center gap-1 whitespace-nowrap rounded border border-amber-300 px-2.5 py-1.5 text-xs font-bold text-amber-700"
               >
                  <RotateCcw size={12} />
                  Hủy duyệt
               </button>
            </div>
         );
      }

      return unavailable;
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
          case 'action':
             return <td className="w-[260px] px-4 py-4 text-center align-top">{renderRefundActions(item)}</td>;
          case 'log':
             return (
                <td className="w-[56px] px-2 py-4 text-center align-top">
                  <button
                     onClick={(event) => {
                        event.stopPropagation();
                        setShowLogModal(item);
                     }}
                     className="rounded p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                     title="Xem log xÃ¡Â»Â­ lÃƒÂ½"
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
                  <h1 className="mb-2 text-3xl font-black tracking-tight text-slate-900">QuÃ¡ÂºÂ£n lÃƒÂ½ YÃƒÂªu cÃ¡ÂºÂ§u HoÃƒÂ n tiÃ¡Â»Ân</h1>
                  <p className="text-slate-500">
                     Theo dÃƒÂµi Ã„â€˜Ã¡ÂºÂ§y Ã„â€˜Ã¡Â»Â§ thÃƒÂ´ng tin hoÃƒÂ n tiÃ¡Â»Ân, cÃ„Æ’n cÃ¡Â»Â© xÃ¡Â»Â­ lÃƒÂ½, chÃ¡Â»Â©ng tÃ¡Â»Â« chi vÃƒÂ  trÃ¡ÂºÂ¡ng thÃƒÂ¡i phÃƒÂª duyÃ¡Â»â€¡t.
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
                  TÃ¡ÂºÂ¡o YÃƒÂªu cÃ¡ÂºÂ§u mÃ¡Â»â€ºi
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
                           placeholder="TÃƒÂ¬m theo mÃƒÂ£, hÃ¡Â»Âc viÃƒÂªn, SO, hÃ¡Â»Â£p Ã„â€˜Ã¡Â»â€œng..."
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
                           CÃ¡Â»â„¢t
                        </button>

                        {showColumnMenu && (
                           <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                              <div className="border-b border-slate-100 px-2 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                 HiÃ¡Â»Æ’n thÃ¡Â»â€¹ cÃ¡Â»â„¢t
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
                                             {column.required && <div className="text-xs text-slate-400">CÃ¡Â»â„¢t cÃ¡Â»â€˜ Ã„â€˜Ã¡Â»â€¹nh</div>}
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
                           <th className="whitespace-nowrap px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">MÃƒÂ£ hoÃƒÂ n tiÃ¡Â»Ân</th>
                           <th className="whitespace-nowrap px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">HÃ¡Â»Âc viÃƒÂªn</th>
                           <th className="whitespace-nowrap px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">SO</th>
                           <th className="whitespace-nowrap px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">HÃ¡Â»Â£p Ã„â€˜Ã¡Â»â€œng</th>
                           <th className="whitespace-nowrap px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">ChÃ†Â°Ã†Â¡ng trÃƒÂ¬nh/GÃƒÂ³i SP</th>
                           <th className="whitespace-nowrap px-4 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">SÃ¡Â»â€˜ tiÃ¡Â»Ân Ã„â€˜ÃƒÂ£ thu</th>
                           <th className="whitespace-nowrap px-4 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">SÃ¡Â»â€˜ tiÃ¡Â»Ân Ã„â€˜Ã¡Â»Â nghÃ¡Â»â€¹ hoÃƒÂ n</th>
                           <th className="whitespace-nowrap px-4 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">SÃ¡Â»â€˜ tiÃ¡Â»Ân Ã„â€˜Ã†Â°Ã¡Â»Â£c duyÃ¡Â»â€¡t hoÃƒÂ n</th>
                           <th className="whitespace-nowrap px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">LÃƒÂ½ do hoÃƒÂ n</th>
                           <th className="whitespace-nowrap px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">CÃ„Æ’n cÃ¡Â»Â© hoÃƒÂ n</th>
                           <th className="whitespace-nowrap px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">NgÃ†Â°Ã¡Â»Âi tÃ¡ÂºÂ¡o</th>
                           <th className="whitespace-nowrap px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">NgÃ†Â°Ã¡Â»Âi phÃ¡Â»Â¥ trÃƒÂ¡ch</th>
                           <th className="whitespace-nowrap px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500">TrÃ¡ÂºÂ¡ng thÃƒÂ¡i hoÃƒÂ n tiÃ¡Â»Ân</th>
                           <th className="whitespace-nowrap px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">ChÃ¡Â»Â©ng tÃ¡Â»Â« chi</th>
                           <th className="whitespace-nowrap px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">NgÃƒÂ y thÃ¡Â»Â±c chi</th>
                           <th className="whitespace-nowrap px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Ghi chÃƒÂº</th>
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
                                    title="Xem log xÃ¡Â»Â­ lÃƒÂ½"
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
                                 KhÃƒÂ´ng tÃƒÂ¬m thÃ¡ÂºÂ¥y yÃƒÂªu cÃ¡ÂºÂ§u hoÃƒÂ n tiÃ¡Â»Ân nÃƒÂ o trong bÃ¡Â»â„¢ lÃ¡Â»Âc nÃƒÂ y.
                              </td>
                           </tr>
                        )}
                     </tbody>
                  </table>
               </div>

               <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
                  <span className="text-xs font-bold text-slate-500">TÃ¡Â»â€¢ng sÃ¡Â»â€˜: {filteredData.length} bÃ¡ÂºÂ£n ghi</span>
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
                     <h3 className="text-lg font-bold text-slate-800">TÃ¡ÂºÂ¡o yÃƒÂªu cÃ¡ÂºÂ§u hoÃƒÂ n tiÃ¡Â»Ân</h3>
                     <button onClick={resetForm} className="text-slate-400 transition-colors hover:text-slate-600">
                        <X size={18} />
                     </button>
                  </div>

                  <div className="max-h-[calc(92vh-134px)] overflow-y-auto p-6">
                     <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <div>
                           <label className="text-sm font-semibold text-slate-700">MÃƒÂ£ hoÃƒÂ n tiÃ¡Â»Ân</label>
                           <input
                              value="TÃ¡Â»Â± Ã„â€˜Ã¡Â»â„¢ng sinh sau khi lÃ†Â°u"
                              readOnly
                              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
                           />
                        </div>

                        <div>
                           <label className="text-sm font-semibold text-slate-700">HÃ¡Â»Âc viÃƒÂªn</label>
                           <input
                              list="refund-students"
                              value={formData.studentName}
                              onChange={(event) => {
                                 setFormData((prev) => ({ ...prev, studentName: event.target.value }));
                                 setErrors((prev) => ({ ...prev, studentName: undefined }));
                              }}
                              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                              placeholder="NhÃ¡ÂºÂ­p hÃ¡Â»Âc viÃƒÂªn"
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
                              placeholder="NhÃ¡ÂºÂ­p mÃƒÂ£ SO"
                           />
                           <datalist id="refund-sos">
                              {soOptions.map((code) => (
                                 <option key={code} value={code} />
                              ))}
                           </datalist>
                           {errors.soCode && <p className="mt-1 text-xs text-red-600">{errors.soCode}</p>}
                        </div>

                        <div>
                           <label className="text-sm font-semibold text-slate-700">HÃ¡Â»Â£p Ã„â€˜Ã¡Â»â€œng</label>
                           <input
                              list="refund-contracts"
                              value={formData.contractCode}
                              onChange={(event) => {
                                 setFormData((prev) => ({ ...prev, contractCode: event.target.value }));
                                 setErrors((prev) => ({ ...prev, contractCode: undefined }));
                              }}
                              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                              placeholder="NhÃ¡ÂºÂ­p mÃƒÂ£ hÃ¡Â»Â£p Ã„â€˜Ã¡Â»â€œng"
                           />
                           <datalist id="refund-contracts">
                              {contractOptions.map((code) => (
                                 <option key={code} value={code} />
                              ))}
                           </datalist>
                           {errors.contractCode && <p className="mt-1 text-xs text-red-600">{errors.contractCode}</p>}
                        </div>

                        <div>
                           <label className="text-sm font-semibold text-slate-700">ChÃ†Â°Ã†Â¡ng trÃƒÂ¬nh/GÃƒÂ³i SP</label>
                           <input
                              value={formData.program}
                              onChange={(event) => {
                                 setFormData((prev) => ({ ...prev, program: event.target.value }));
                                 setErrors((prev) => ({ ...prev, program: undefined }));
                              }}
                              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                              placeholder="NhÃ¡ÂºÂ­p chÃ†Â°Ã†Â¡ng trÃƒÂ¬nh hoÃ¡ÂºÂ·c gÃƒÂ³i sÃ¡ÂºÂ£n phÃ¡ÂºÂ©m"
                           />
                           {errors.program && <p className="mt-1 text-xs text-red-600">{errors.program}</p>}
                        </div>

                        <div>
                           <label className="text-sm font-semibold text-slate-700">NgÃ†Â°Ã¡Â»Âi phÃ¡Â»Â¥ trÃƒÂ¡ch</label>
                           <input
                              value={formData.ownerName}
                              onChange={(event) => {
                                 setFormData((prev) => ({ ...prev, ownerName: event.target.value }));
                                 setErrors((prev) => ({ ...prev, ownerName: undefined }));
                              }}
                              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                              placeholder="NhÃ¡ÂºÂ­p ngÃ†Â°Ã¡Â»Âi phÃ¡Â»Â¥ trÃƒÂ¡ch"
                           />
                           {errors.ownerName && <p className="mt-1 text-xs text-red-600">{errors.ownerName}</p>}
                        </div>

                        <div>
                           <label className="text-sm font-semibold text-slate-700">SÃ¡Â»â€˜ tiÃ¡Â»Ân Ã„â€˜ÃƒÂ£ thu</label>
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
                           <label className="text-sm font-semibold text-slate-700">SÃ¡Â»â€˜ tiÃ¡Â»Ân Ã„â€˜Ã¡Â»Â nghÃ¡Â»â€¹ hoÃƒÂ n</label>
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
                           <label className="text-sm font-semibold text-slate-700">SÃ¡Â»â€˜ tiÃ¡Â»Ân Ã„â€˜Ã†Â°Ã¡Â»Â£c duyÃ¡Â»â€¡t hoÃƒÂ n</label>
                           <input
                              type="number"
                              value={formData.approvedAmount}
                              onChange={(event) => {
                                 setFormData((prev) => ({ ...prev, approvedAmount: event.target.value }));
                                 setErrors((prev) => ({ ...prev, approvedAmount: undefined }));
                              }}
                              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                              placeholder="Ã„ÂÃ¡Â»Æ’ trÃ¡Â»â€˜ng nÃ¡ÂºÂ¿u chÃ†Â°a duyÃ¡Â»â€¡t"
                           />
                           {errors.approvedAmount && <p className="mt-1 text-xs text-red-600">{errors.approvedAmount}</p>}
                        </div>

                        <div>
                           <label className="text-sm font-semibold text-slate-700">LÃƒÂ½ do hoÃƒÂ n</label>
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
                           <label className="text-sm font-semibold text-slate-700">CÃ„Æ’n cÃ¡Â»Â© hoÃƒÂ n</label>
                           <textarea
                              value={formData.refundBasis}
                              onChange={(event) => {
                                 setFormData((prev) => ({ ...prev, refundBasis: event.target.value }));
                                 setErrors((prev) => ({ ...prev, refundBasis: undefined }));
                              }}
                              className="mt-1 min-h-[90px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                              placeholder="BiÃƒÂªn bÃ¡ÂºÂ£n, email xÃƒÂ¡c nhÃ¡ÂºÂ­n, phÃ¡Â»Â¥ lÃ¡Â»Â¥c hÃ¡Â»Â£p Ã„â€˜Ã¡Â»â€œng, chÃƒÂ­nh sÃƒÂ¡ch hÃ¡Â»â€” trÃ¡Â»Â£..."
                           />
                           {errors.refundBasis && <p className="mt-1 text-xs text-red-600">{errors.refundBasis}</p>}
                        </div>

                        <div>
                           <label className="text-sm font-semibold text-slate-700">TrÃ¡ÂºÂ¡ng thÃƒÂ¡i hoÃƒÂ n tiÃ¡Â»Ân</label>
                           <input
                              value={STATUS_META.DRAFT.label}
                              readOnly
                              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600"
                           />
                           <p className="mt-1 text-xs text-slate-500">TÃ¡Â»Â± Ã„â€˜Ã¡Â»â„¢ng chuyÃ¡Â»Æ’n theo quy trÃƒÂ¬nh duyÃ¡Â»â€¡t, khÃƒÂ´ng chÃ¡Â»Ân tay.</p>
                        </div>

                        <div>
                           <label className="text-sm font-semibold text-slate-700">ChÃ¡Â»Â©ng tÃ¡Â»Â« chi</label>
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
                           <label className="text-sm font-semibold text-slate-700">NgÃƒÂ y thÃ¡Â»Â±c chi</label>
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
                           <label className="text-sm font-semibold text-slate-700">Ghi chÃƒÂº</label>
                           <textarea
                              value={formData.note}
                              onChange={(event) => setFormData((prev) => ({ ...prev, note: event.target.value }))}
                              className="mt-1 min-h-[88px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                              placeholder="Ghi chÃƒÂº xÃ¡Â»Â­ lÃƒÂ½ nÃ¡Â»â„¢i bÃ¡Â»â„¢, tÃƒÂ¬nh trÃ¡ÂºÂ¡ng chÃ¡Â»Â©ng tÃ¡Â»Â«, thÃƒÂ´ng tin bÃ¡Â»â€¢ sung..."
                           />
                        </div>
                     </div>
                  </div>

                  <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
                     <button
                        onClick={resetForm}
                        className="rounded-lg px-4 py-2 font-bold text-slate-600 transition-colors hover:bg-slate-100"
                     >
                        HuÃ¡Â»Â·
                     </button>
                     <button
                        onClick={handleCreateRefund}
                        className="rounded-lg bg-blue-600 px-4 py-2 font-bold text-white transition-colors hover:bg-blue-700"
                     >
                        LÃ†Â°u yÃƒÂªu cÃ¡ÂºÂ§u
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
                        <h3 className="text-lg font-bold text-slate-800">NhÃ¡ÂºÂ­t kÃƒÂ½ xÃ¡Â»Â­ lÃƒÂ½ {showLogModal.id}</h3>
                        <p className="mt-1 text-sm text-slate-500">
                           {showLogModal.studentName} Ã¢â‚¬Â¢ {showLogModal.contractCode}
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
                              <div className="mt-2 text-sm text-slate-500">ThÃ¡Â»Â±c hiÃ¡Â»â€¡n bÃ¡Â»Å¸i: {log.createdBy}</div>
                           </div>
                        ))
                     ) : (
                        <div className="py-12 text-center italic text-slate-400">ChÃ†Â°a cÃƒÂ³ log xÃ¡Â»Â­ lÃƒÂ½ phÃƒÂ¹ hÃ¡Â»Â£p bÃ¡Â»â„¢ lÃ¡Â»Âc.</div>
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


