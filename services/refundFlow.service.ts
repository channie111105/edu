import { IActualTransaction, IRefundRequest, RefundStatus } from '../types';
import {
  addActualTransaction,
  addActualTransactionLog,
  addRefundLog,
  getActualTransactions,
  getRefunds,
  removeActualTransactionByRelatedId,
  updateActualTransaction,
  updateRefund
} from '../utils/storage';

type RefundStatusMeta = {
  label: string;
  badge: string;
  tone: string;
  dot: string;
};

const getActualTransactionCodeFromRefund = (refund: IRefundRequest) => {
  const rawCodeMatches = refund.id.match(/\d+/g);
  const sequence = rawCodeMatches?.length ? Number(rawCodeMatches[rawCodeMatches.length - 1]) : Date.now() % 10000;
  return `TC${String(sequence).padStart(4, '0')}`;
};

const resolveRefundCashAccount = (refund: IRefundRequest, existing?: IActualTransaction) => {
  if (existing?.cashAccount) return existing.cashAccount;
  const voucherNumber = String(refund.paymentVoucherCode || '').trim().toUpperCase();
  if (voucherNumber.startsWith('PC') || voucherNumber.includes('TIEN MAT')) {
    return 'Tiền mặt';
  }
  return 'STK ngân hàng';
};

export const REFUND_STATUS_FLOW: RefundStatus[] = ['DRAFT', 'CHO_DUYET', 'KE_TOAN_XAC_NHAN', 'DA_DUYET', 'DA_THU_CHI'];

export const REFUND_STATUS_META: Record<RefundStatus, RefundStatusMeta> = {
  DRAFT: { label: 'Nháp', badge: 'bg-slate-100 text-slate-700 border-slate-200', tone: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' },
  CHO_DUYET: { label: 'Chờ duyệt', badge: 'bg-blue-50 text-blue-700 border-blue-200', tone: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  KE_TOAN_XAC_NHAN: {
    label: 'KT xác nhận',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    tone: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500'
  },
  DA_DUYET: { label: 'Duyệt', badge: 'bg-violet-50 text-violet-700 border-violet-200', tone: 'bg-violet-50 text-violet-700 border-violet-200', dot: 'bg-violet-500' },
  DA_THU_CHI: {
    label: 'Đã thu / đã chi',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    tone: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500'
  },
  NHAP: { label: 'Nháp', badge: 'bg-slate-100 text-slate-700 border-slate-200', tone: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' },
  SALE_XAC_NHAN: { label: 'Chờ duyệt', badge: 'bg-blue-50 text-blue-700 border-blue-200', tone: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  KE_TOAN_KIEM_TRA: {
    label: 'KT xác nhận',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    tone: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500'
  },
  CEO_DUYET: { label: 'Duyệt', badge: 'bg-violet-50 text-violet-700 border-violet-200', tone: 'bg-violet-50 text-violet-700 border-violet-200', dot: 'bg-violet-500' },
  DA_HOAN: {
    label: 'Đã thu / đã chi',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    tone: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500'
  },
  TU_CHOI: { label: 'Từ chối', badge: 'bg-red-50 text-red-700 border-red-200', tone: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
  HUY_YEU_CAU: {
    label: 'Hủy yêu cầu',
    badge: 'bg-slate-200 text-slate-600 border-slate-300',
    tone: 'bg-slate-200 text-slate-600 border-slate-300',
    dot: 'bg-slate-400'
  }
};

export const normalizeRefundStatus = (status: unknown): RefundStatus => {
  const token = String(status || '').trim().toUpperCase();

  if (token === 'DRAFT' || token === 'NHAP') return 'DRAFT';
  if (token === 'CHO_DUYET' || token === 'SALE_XAC_NHAN' || token === 'CHO_SALE_DUYET') return 'CHO_DUYET';
  if (token === 'KE_TOAN_XAC_NHAN' || token === 'KE_TOAN_KIEM_TRA' || token === 'CHO_KE_TOAN_DUYET') return 'KE_TOAN_XAC_NHAN';
  if (token === 'DA_DUYET' || token === 'CEO_DUYET') return 'DA_DUYET';
  if (token === 'DA_THU_CHI' || token === 'DA_HOAN' || token === 'DA_HOAN_TIEN') return 'DA_THU_CHI';
  if (token === 'TU_CHOI' || token === 'DA_TU_CHOI') return 'TU_CHOI';
  if (token === 'HUY_YEU_CAU') return 'HUY_YEU_CAU';

  return 'DRAFT';
};

export const normalizeRefund = (item: Partial<IRefundRequest>): IRefundRequest => ({
  id: item.id || `REF-${Date.now()}`,
  createdAt: item.createdAt || new Date().toISOString(),
  studentName: item.studentName || 'Chưa cập nhật',
  soCode: item.soCode || '',
  contractCode: item.contractCode || '',
  program: item.program || '',
  paidAmount: Number(item.paidAmount || 0),
  relatedPaymentCode: item.relatedPaymentCode || '',
  requestedAmount: Number(item.requestedAmount || 0),
  retainedAmount: item.retainedAmount === null || item.retainedAmount === undefined ? null : Number(item.retainedAmount || 0),
  approvedAmount: item.approvedAmount === null || item.approvedAmount === undefined ? null : Number(item.approvedAmount || 0),
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

export const getRefundAmountToSync = (item: IRefundRequest) =>
  Math.max(0, Number(item.approvedAmount ?? item.requestedAmount ?? 0) || 0);

export const canRefundSyncToMoneyOut = (status: RefundStatus) =>
  ['KE_TOAN_XAC_NHAN', 'DA_DUYET', 'DA_THU_CHI'].includes(normalizeRefundStatus(status));

export const buildActualTransactionFromRefund = (refundInput: IRefundRequest, existing?: IActualTransaction): IActualTransaction => {
  const refund = normalizeRefund(refundInput);
  const transactionCode = existing?.transactionCode || getActualTransactionCodeFromRefund(refund);
  const processResult = refund.status === 'DA_THU_CHI' ? 'DA_CHI' : existing?.processResult;
  const sourceDate = refund.payoutDate
    ? new Date(`${refund.payoutDate}T00:00:00`)
    : new Date(refund.createdAt || new Date().toISOString());
  const defaultDate = Number.isNaN(sourceDate.getTime()) ? new Date().toISOString().slice(0, 10) : sourceDate.toISOString().slice(0, 10);
  const voucherNumber = refund.paymentVoucherCode || existing?.voucherNumber || transactionCode;
  const category = refund.program?.trim() ? `Hoàn tiền ${refund.program.trim()}` : 'Hoàn tiền học viên';

  return {
    id: existing?.id || `ATX-${refund.id}`,
    transactionCode,
    type: 'OUT',
    category,
    title: existing?.title || `Hoàn tiền ${refund.studentName}`.trim(),
    recipientPayerName: existing?.recipientPayerName || refund.studentName || undefined,
    amount: getRefundAmountToSync(refund),
    department: existing?.department || 'Kế toán',
    cashAccount: resolveRefundCashAccount(refund, existing),
    voucherNumber,
    date: refund.payoutDate || existing?.date || defaultDate,
    status: processResult === 'DA_CHI' ? 'PAID' : 'APPROVED',
    processResult,
    proof: existing?.proof || voucherNumber || undefined,
    attachmentName: existing?.attachmentName,
    attachmentUrl: existing?.attachmentUrl,
    relatedId: refund.id,
    createdBy: existing?.createdBy || refund.createdBy || 'Kế toán',
    createdAt: existing?.createdAt || refund.createdAt || new Date().toISOString()
  };
};

export const syncActualTransactionFromRefund = (refundInput: IRefundRequest, userId: string) => {
  const refund = normalizeRefund(refundInput);
  if (!canRefundSyncToMoneyOut(refund.status)) {
    removeActualTransactionByRelatedId(refund.id);
    return null;
  }

  const existing = getActualTransactions().find((item) => item.relatedId === refund.id);
  const payload = buildActualTransactionFromRefund(refund, existing);

  if (existing) {
    updateActualTransaction({
      ...existing,
      ...payload,
      id: existing.id,
      createdAt: existing.createdAt,
      createdBy: existing.createdBy
    });
    return payload;
  }

  addActualTransaction(payload);
  addActualTransactionLog({
    id: `TXN-LOG-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    transactionId: payload.id,
    action: 'CREATE',
    message: `Tạo tự động từ yêu cầu hoàn tiền ${refund.id}`,
    createdAt: new Date().toISOString(),
    createdBy: userId
  });
  return payload;
};

type SyncRefundFromActualOptions = {
  markProcessed?: boolean;
  actorName?: string;
};

export const syncRefundFromActualTransaction = (actual: IActualTransaction, options: SyncRefundFromActualOptions = {}) => {
  const refundId = String(actual.relatedId || '').trim();
  if (!refundId) return null;

  const refund = getRefunds().map(normalizeRefund).find((item) => item.id === refundId);
  if (!refund) return null;

  const nextRefund: IRefundRequest = {
    ...refund,
    status: options.markProcessed ? 'DA_THU_CHI' : refund.status,
    paymentVoucherCode: actual.voucherNumber || actual.transactionCode || refund.paymentVoucherCode,
    payoutDate: actual.date || refund.payoutDate,
    approvedAmount: refund.approvedAmount ?? getRefundAmountToSync(refund)
  };

  const updated = updateRefund(nextRefund);
  if (!updated) return null;

  if (options.markProcessed) {
    addRefundLog({
      id: `RLOG-${Date.now()}`,
      refundId: refund.id,
      action: `Thu Chi xác nhận đã chi ${actual.transactionCode || actual.voucherNumber || refund.id}`,
      createdAt: new Date().toISOString(),
      createdBy: options.actorName || 'Kế toán'
    });
  }

  return nextRefund;
};
