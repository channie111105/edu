import { IQuotation, ITransaction, QuotationStatus, UserRole } from '../types';
import {
  createTransactionFromQuotation,
  upsertLinkedContractFromQuotation,
  getQuotations,
  getTransactions,
  updateQuotation,
  updateTransaction
} from '../utils/storage';
import { ensureStudentProfilesFromQuotation } from './enrollmentFlow.service';

const appendQuotationLog = (quotation: IQuotation, action: string, detail: string): IQuotation => ({
  ...quotation,
  logNotes: [
    {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: 'System',
      action,
      detail
    },
    ...(quotation.logNotes || [])
  ]
});

export const confirmSale = (
  quotationId: string,
  userId: string
): { ok: boolean; quotation?: IQuotation; transaction?: ITransaction; error?: string } => {
  // TODO: replace mock service with BE API
  const quotation = getQuotations().find((q) => q.id === quotationId);
  if (!quotation) return { ok: false, error: 'Không tìm thấy báo giá' };

  const existingPending = getTransactions().find(
    (t) => t.quotationId === quotation.id && t.status === 'CHO_DUYET'
  );

  const updatedQuotation = appendQuotationLog(
    {
      ...quotation,
      status: QuotationStatus.SALE_CONFIRMED,
      contractStatus: 'sale_confirmed',
      saleConfirmedAt: new Date().toISOString(),
      confirmDate: new Date().toISOString(),
      saleConfirmedBy: userId,
      transactionStatus: 'CHO_DUYET',
      updatedAt: new Date().toISOString()
    },
    'Sale Confirmed',
    'Đã xác nhận sale và tạo yêu cầu duyệt giao dịch'
  );
  updateQuotation(updatedQuotation);

  if (existingPending) {
    return { ok: true, quotation: updatedQuotation, transaction: existingPending };
  }

  const transaction = createTransactionFromQuotation(quotation.id, userId);
  return { ok: true, quotation: updatedQuotation, transaction };
};

export const approveTransaction = (
  transactionId: string,
  userId: string,
  userRole?: UserRole
): { ok: boolean; transaction?: ITransaction; quotation?: IQuotation; error?: string } => {
  // TODO: replace mock service with BE API
  if (userRole !== UserRole.ACCOUNTANT) {
    return { ok: false, error: 'Chỉ Kế toán được duyệt giao dịch' };
  }

  const transaction = getTransactions().find((t) => t.id === transactionId);
  if (!transaction) return { ok: false, error: 'Không tìm thấy giao dịch' };

  const updatedTransaction: ITransaction = {
    ...transaction,
    status: 'DA_DUYET',
    note: transaction.note || `Đã duyệt bởi ${userId}`
  };
  updateTransaction(updatedTransaction);

  const quotation = getQuotations().find((q) => q.id === transaction.quotationId);
  if (!quotation) return { ok: true, transaction: updatedTransaction };

  const updatedQuotation = appendQuotationLog(
    {
      ...quotation,
      transactionStatus: 'DA_DUYET',
      updatedAt: new Date().toISOString()
    },
    'Accounting Approved Transaction',
    `Kế toán đã duyệt giao dịch ${transaction.soCode}. SO sẵn sàng để khóa thủ công`
  );
  updateQuotation(updatedQuotation);
  return { ok: true, transaction: updatedTransaction, quotation: updatedQuotation };
};

export const rejectTransaction = (
  transactionId: string,
  userId: string,
  userRole?: UserRole,
  reason?: string
): { ok: boolean; transaction?: ITransaction; quotation?: IQuotation; error?: string } => {
  // TODO: replace mock service with BE API
  if (userRole !== UserRole.ACCOUNTANT) {
    return { ok: false, error: 'Chỉ Kế toán được từ chối giao dịch' };
  }

  const transaction = getTransactions().find((t) => t.id === transactionId);
  if (!transaction) return { ok: false, error: 'Không tìm thấy giao dịch' };

  const updatedTransaction: ITransaction = {
    ...transaction,
    status: 'TU_CHOI',
    note: reason || `Từ chối bởi ${userId}`
  };
  updateTransaction(updatedTransaction);

  const quotation = getQuotations().find((q) => q.id === transaction.quotationId);
  if (!quotation) return { ok: true, transaction: updatedTransaction };

  const updatedQuotation = appendQuotationLog(
    {
      ...quotation,
      transactionStatus: 'TU_CHOI',
      updatedAt: new Date().toISOString()
    },
    'Accounting Rejected Transaction',
    reason || `Kế toán từ chối giao dịch ${transaction.soCode}`
  );
  updateQuotation(updatedQuotation);
  return { ok: true, transaction: updatedTransaction, quotation: updatedQuotation };
};

export const lockQuotationAfterAccounting = (
  quotationId: string,
  userId: string,
  userRole?: UserRole
): { ok: boolean; quotation?: IQuotation; error?: string } => {
  // TODO: replace mock service with BE API
  if (userRole !== UserRole.ACCOUNTANT) {
    return { ok: false, error: 'Chỉ Kế toán được khóa SO' };
  }

  const quotation = getQuotations().find((q) => q.id === quotationId);
  if (!quotation) return { ok: false, error: 'Không tìm thấy báo giá' };

  if (quotation.status === QuotationStatus.LOCKED) {
    return { ok: true, quotation };
  }

  if (quotation.status !== QuotationStatus.SALE_CONFIRMED) {
    return { ok: false, error: 'Báo giá chưa ở bước Sale Confirmed' };
  }
  if (quotation.transactionStatus !== 'DA_DUYET') {
    return { ok: false, error: 'Chưa duyệt giao dịch, không thể khóa SO' };
  }

  const students = ensureStudentProfilesFromQuotation(quotationId);
  const student = students[0];
  const updatedQuotation = appendQuotationLog(
    {
      ...quotation,
      status: QuotationStatus.LOCKED,
      confirmDate: quotation.confirmDate || quotation.saleConfirmedAt || new Date().toISOString(),
      lockedAt: new Date().toISOString(),
      lockedBy: userId,
      studentId: student?.id || quotation.studentId,
      studentIds: students.length ? students.map((item) => item.id) : quotation.studentIds,
      contractStatus: quotation.contractStatus || 'signed_contract',
      updatedAt: new Date().toISOString()
    },
    'Lock Quotation',
    `Khóa SO sau khi kế toán duyệt giao dịch (${quotation.soCode})`
  );
  const linkedContract = upsertLinkedContractFromQuotation(updatedQuotation, userId);
  updatedQuotation.contractId = linkedContract.id;
  updateQuotation(updatedQuotation);
  return { ok: true, quotation: updatedQuotation };
};

export const unlockQuotationAfterAccounting = (
  quotationId: string,
  userId: string,
  userRole?: UserRole
): { ok: boolean; quotation?: IQuotation; error?: string } => {
  // TODO: replace mock service with BE API
  if (userRole !== UserRole.ACCOUNTANT) {
    return { ok: false, error: 'Chỉ Kế toán được hủy khóa SO' };
  }

  const quotation = getQuotations().find((q) => q.id === quotationId);
  if (!quotation) return { ok: false, error: 'Không tìm thấy báo giá' };

  if (quotation.status !== QuotationStatus.LOCKED) {
    return { ok: false, error: 'SO chưa ở trạng thái khóa' };
  }

  const updatedQuotation = appendQuotationLog(
    {
      ...quotation,
      status: QuotationStatus.SALE_CONFIRMED,
      transactionStatus: 'DA_DUYET',
      contractStatus: 'sale_confirmed',
      lockedAt: undefined,
      lockedBy: undefined,
      updatedAt: new Date().toISOString()
    },
    'Unlock Quotation',
    `Kế toán hủy khóa SO (${quotation.soCode})`
  );

  updateQuotation(updatedQuotation);
  return { ok: true, quotation: updatedQuotation };
};
