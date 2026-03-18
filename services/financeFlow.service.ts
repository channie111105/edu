import { IQuotation, ITransaction, QuotationStatus, UserRole } from '../types';
import {
  createTransactionFromQuotation,
  upsertLinkedContractFromQuotation,
  getQuotations,
  getTransactions,
  updateQuotation,
  updateTransaction
} from '../utils/storage';
import { IActualTransaction, TransactionStatus, TransactionType } from '../types';
import { addActualTransaction, addActualTransactionLog, getActualTransactions, updateActualTransaction } from '../utils/storage';
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

const normalize = (value?: string) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const inferBusinessGroup = (transaction: ITransaction): 'THU' | 'CHI' | 'DIEU_CHINH' => {
  if (transaction.businessGroupHint) return transaction.businessGroupHint;

  const haystack = normalize(`${transaction.note || ''} ${transaction.studentName || ''} ${transaction.customerId || ''}`);

  if (
    haystack.includes('dieu chinh') ||
    haystack.includes('cong no') ||
    haystack.includes('bu tru') ||
    haystack.includes('huy khoan thu')
  ) {
    return 'DIEU_CHINH';
  }

  if (
    haystack.includes('chi ') ||
    haystack.includes('marketing') ||
    haystack.includes('mkt') ||
    haystack.includes('hoa hong') ||
    haystack.includes('commission') ||
    haystack.includes('van hanh') ||
    haystack.includes('cong tac')
  ) {
    return 'CHI';
  }

  return 'THU';
};

const getActualTransactionPayload = (transaction: ITransaction, userId: string): IActualTransaction => {
  const businessGroup = inferBusinessGroup(transaction);
  const type: TransactionType = businessGroup === 'THU' ? 'IN' : 'OUT';
  const status: TransactionStatus = type === 'IN' ? 'RECEIVED' : 'PAID';
  const proofFile = transaction.proofFiles?.[0];
  const proof = transaction.bankRefCode || proofFile?.name;
  const rawCodeMatches = (transaction.code || transaction.id).match(/\d+/g);
  const sequence = rawCodeMatches?.length ? Number(rawCodeMatches[rawCodeMatches.length - 1]) : Date.now() % 10000;

  return {
    id: `ATX-${transaction.id}`,
    transactionCode: `TC${String(sequence).padStart(4, '0')}`,
    type,
    category: transaction.businessTypeHint || (businessGroup === 'THU' ? 'Thu học phí' : businessGroup === 'CHI' ? 'Chi phí' : 'Điều chỉnh'),
    title: transaction.note || transaction.relatedEntityLabel || transaction.studentName || transaction.soCode || transaction.customerId,
    amount: transaction.amount,
    department: 'Kế toán',
    cashAccount: transaction.method === 'TIEN_MAT' ? 'Tiền mặt' : 'STK ngân hàng',
    voucherNumber: transaction.bankRefCode || '',
    date: new Date(transaction.paidAt || transaction.createdAt).toISOString().slice(0, 10),
    status,
    proof: proof || undefined,
    attachmentName: proofFile?.name,
    attachmentUrl: proofFile?.url,
    relatedId: transaction.id,
    createdBy: userId,
    createdAt: new Date().toISOString()
  };
};

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

  const actualPayload = getActualTransactionPayload(updatedTransaction, userId);
  const existingActual = getActualTransactions().find((item) => item.relatedId === updatedTransaction.id);

  if (existingActual) {
    updateActualTransaction({
      ...existingActual,
      ...actualPayload,
      id: existingActual.id,
      createdAt: existingActual.createdAt,
      createdBy: existingActual.createdBy
    });
  } else {
    addActualTransaction(actualPayload);
    addActualTransactionLog({
      id: `TXN-LOG-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      transactionId: actualPayload.id,
      action: 'CREATE',
      message: `Tạo tự động từ duyệt giao dịch ${updatedTransaction.code || updatedTransaction.id}`,
      createdAt: new Date().toISOString(),
      createdBy: userId
    });
  }

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

export const requestQuotationCancelApproval = (
  quotationId: string,
  userId: string,
  userRole?: UserRole
): { ok: boolean; quotation?: IQuotation; error?: string } => {
  if (userRole !== UserRole.ACCOUNTANT) {
    return { ok: false, error: 'Chỉ Kế toán được gửi yêu cầu hủy SO' };
  }

  const quotation = getQuotations().find((q) => q.id === quotationId);
  if (!quotation) return { ok: false, error: 'Không tìm thấy báo giá' };

  if (quotation.status !== QuotationStatus.SALE_CONFIRMED && quotation.status !== QuotationStatus.SALE_ORDER) {
    return { ok: false, error: 'Chỉ SO đã Confirm mới được gửi yêu cầu hủy' };
  }

  if (quotation.transactionStatus === 'DA_DUYET') {
    return { ok: false, error: 'Giao dịch đã duyệt, không thể gửi yêu cầu hủy ở bước này' };
  }

  if (quotation.cancelRequestStatus === 'CHO_DUYET') {
    return { ok: true, quotation };
  }

  const updatedQuotation = appendQuotationLog(
    {
      ...quotation,
      cancelRequestStatus: 'CHO_DUYET',
      cancelRequestedAt: new Date().toISOString(),
      cancelRequestedBy: userId,
      updatedAt: new Date().toISOString()
    },
    'Accounting Requested Cancel',
    `Kế toán gửi yêu cầu hủy SO ${quotation.soCode}`
  );

  updateQuotation(updatedQuotation);
  return { ok: true, quotation: updatedQuotation };
};

export const approveQuotationCancelApproval = (
  quotationId: string,
  userId: string,
  userRole?: UserRole
): { ok: boolean; quotation?: IQuotation; error?: string } => {
  if (userRole !== UserRole.ADMIN && userRole !== UserRole.FOUNDER) {
    return { ok: false, error: 'Chỉ Admin được duyệt hủy SO' };
  }

  const quotation = getQuotations().find((q) => q.id === quotationId);
  if (!quotation) return { ok: false, error: 'Không tìm thấy báo giá' };

  if (quotation.cancelRequestStatus !== 'CHO_DUYET') {
    return { ok: false, error: 'SO chưa có yêu cầu hủy chờ duyệt' };
  }

  const relatedPendingTransactions = getTransactions().filter(
    (transaction) => transaction.quotationId === quotation.id && transaction.status === 'CHO_DUYET'
  );
  relatedPendingTransactions.forEach((transaction) => {
    updateTransaction({
      ...transaction,
      status: 'TU_CHOI',
      note: transaction.note
        ? `${transaction.note} | Admin duyệt hủy SO`
        : `Admin duyệt hủy SO bởi ${userId}`
    });
  });

  const updatedQuotation = appendQuotationLog(
    {
      ...quotation,
      status: QuotationStatus.SENT,
      contractStatus: 'quotation',
      transactionStatus:
        quotation.transactionStatus === 'CHO_DUYET' || relatedPendingTransactions.length > 0
          ? 'TU_CHOI'
          : quotation.transactionStatus === 'DA_DUYET'
            ? 'DA_DUYET'
            : 'NONE',
      saleConfirmedAt: undefined,
      saleConfirmedBy: undefined,
      confirmDate: undefined,
      cancelRequestStatus: 'DA_DUYET',
      cancelApprovedAt: new Date().toISOString(),
      cancelApprovedBy: userId,
      updatedAt: new Date().toISOString()
    },
    'Admin Approved Cancel',
    `Admin duyệt hủy SO ${quotation.soCode}, chuyển về trạng thái Đã gửi`
  );

  updateQuotation(updatedQuotation);
  return { ok: true, quotation: updatedQuotation };
};
