import React, { useEffect, useMemo, useState } from 'react';
import {
   ArrowDownLeft,
   ArrowUpRight,
   Building2,
   CalendarDays,
   CheckCircle2,
   FileStack,
   FileText,
   Landmark,
   NotebookText,
   Paperclip,
   Plus,
   Printer,
   UserRound,
   Wallet,
   X
} from 'lucide-react';
 import { IActualTransaction, IAttachmentFile, IInvoice, IQuotation, ITransaction, InvoiceStatus, ReceiptDocumentType, UserRole } from '../types';
 import { addInvoice, getActualTransactions, getInvoices, getQuotations, getTransactions, saveInvoices, updateInvoice } from '../utils/storage';
 import { useAuth } from '../contexts/AuthContext';
 import PinnedSearchInput, { PinnedSearchChip } from '../components/PinnedSearchInput';
 import { DEFAULT_ATTACHMENT_ACCEPT, readFilesAsAttachmentRecords } from '../utils/fileAttachments';

type InvoiceTab = 'ALL' | InvoiceStatus;
 type InvoiceEditFormState = {
    payerName: string;
    displayAddress: string;
    contactPerson: string;
    description: string;
    note: string;
    attachments: IAttachmentFile[];
 };

const ALL_TAB: InvoiceTab = 'ALL';

const EMPTY_FORM = (): Partial<IInvoice> => ({
   documentType: ReceiptDocumentType.PAYMENT_RECEIPT,
   customerName: '',
   payerName: '',
   displayAddress: '',
   contactPerson: '',
   customerEmail: '',
   contractCode: '',
   ownerName: '',
   branchName: '',
   programName: '',
   description: '',
   totalAmount: 0,
   issueDate: new Date().toISOString().slice(0, 10),
   paymentDate: new Date().toISOString().slice(0, 10),
   currency: 'VND',
   paymentMethod: 'Chuyển khoản',
   accountName: '',
   approvedTransactionCode: '',
   cashFlowCode: '',
   bankReference: '',
   requiresTaxInvoice: false,
   note: '',
   items: [],
   attachments: []
});

const DOCUMENT_TYPE_LABELS: Record<ReceiptDocumentType, string> = {
   [ReceiptDocumentType.PAYMENT_RECEIPT]: 'Phiếu thu',
   [ReceiptDocumentType.PAYMENT_VOUCHER]: 'Phiếu chi'
};

const DOCUMENT_TYPE_BADGES: Record<ReceiptDocumentType, string> = {
   [ReceiptDocumentType.PAYMENT_RECEIPT]: 'border-emerald-100 bg-emerald-50 text-emerald-700',
   [ReceiptDocumentType.PAYMENT_VOUCHER]: 'border-amber-100 bg-amber-50 text-amber-700'
};

const STATUS_META: Record<InvoiceStatus, { label: string; className: string }> = {
   [InvoiceStatus.DRAFT]: {
      label: 'Nháp',
      className: 'bg-slate-100 text-slate-600 border-slate-200'
   },
   [InvoiceStatus.ISSUED]: {
      label: 'Nháp',
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200'
   },
   [InvoiceStatus.SENT_TO_CUSTOMER]: {
      label: 'Nháp',
      className: 'bg-blue-50 text-blue-700 border-blue-200'
   },
   [InvoiceStatus.CANCELLED]: {
      label: 'Đã hủy',
      className: 'bg-red-50 text-red-700 border-red-200'
   }
};

const normalizeToken = (value: unknown) =>
   String(value || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

const extractNumberFromCode = (code?: string) => {
   const matched = String(code || '').match(/(\d+)(?!.*\d)/);
   return matched ? Number(matched[1]) : 0;
};

const formatDocumentCode = (documentType: ReceiptDocumentType, number: number) => {
   const prefix = documentType === ReceiptDocumentType.PAYMENT_RECEIPT ? 'PT' : 'PC';
   return `${prefix}-${String(number).padStart(5, '0')}`;
};

const PAYMENT_METHOD_LABEL_MAP: Record<ITransaction['method'], string> = {
   CHUYEN_KHOAN: 'Chuyển khoản',
   TIEN_MAT: 'Tiền mặt',
   THE: 'Thẻ',
   OTHER: 'Khác'
 };

const hasLegacyAdminApproval = (transaction: ITransaction, quotation?: IQuotation) => {
   if (!quotation?.lockedAt || typeof transaction.approvedAt !== 'number') return false;

   const lockedAt = new Date(quotation.lockedAt).getTime();
   return Number.isFinite(lockedAt) && lockedAt >= transaction.approvedAt;
 };

const isSourceTransactionExecuted = (transaction: ITransaction, quotation?: IQuotation) =>
   typeof transaction.adminApprovedAt === 'number' || hasLegacyAdminApproval(transaction, quotation);

const getDocumentTypeByTransactionType = (type: IActualTransaction['type']) =>
   type === 'OUT' ? ReceiptDocumentType.PAYMENT_VOUCHER : ReceiptDocumentType.PAYMENT_RECEIPT;

const buildAttachmentFromActualTransaction = (actual: IActualTransaction): IAttachmentFile[] => {
   if (!actual.attachmentName && !actual.proof) return [];

   return [
      {
         id: `ATT-AUTO-${actual.id}`,
         name: actual.attachmentName || actual.proof || `chung-tu-${actual.transactionCode || actual.id}`,
         url: actual.attachmentUrl
      }
   ];
 };

const getAutoInvoiceSequence = (actual: IActualTransaction, source?: ITransaction) =>
   extractNumberFromCode(actual.transactionCode || source?.code || source?.id || actual.id) || Date.now() % 100000;

const normalizeStatus = (status: unknown): InvoiceStatus => {
  if (Object.values(InvoiceStatus).includes(status as InvoiceStatus)) {
      return status === InvoiceStatus.CANCELLED ? InvoiceStatus.CANCELLED : InvoiceStatus.DRAFT;
  }

   const token = normalizeToken(status);

   if (!token || token === 'draft' || token === 'nhap') return InvoiceStatus.DRAFT;
   if (
      token === 'issued' ||
      token === 'printed' ||
      token === 'da phat hanh' ||
      token === 'da in' ||
      token === 'sent' ||
      token === 'sent_to_customer' ||
      token === 'da gui' ||
      token === 'da gui email' ||
      token === 'da gui khach'
   ) {
      return InvoiceStatus.DRAFT;
   }
   if (token === 'cancelled' || token === 'da huy' || token === 'da huy bo') {
      return InvoiceStatus.CANCELLED;
   }

   return InvoiceStatus.DRAFT;
};

const getInvoiceWorkflowStatus = (invoice: IInvoice): InvoiceStatus =>
   invoice.status === InvoiceStatus.CANCELLED ? InvoiceStatus.CANCELLED : InvoiceStatus.DRAFT;

const getInvoiceAccountType = (invoice: Pick<IInvoice, 'accountName' | 'paymentMethod'>): 'bank' | 'cash' => {
   const token = normalizeToken(`${invoice.accountName || ''} ${invoice.paymentMethod || ''}`);
   return token.includes('tien mat') ? 'cash' : 'bank';
};

const normalizeDocumentType = (value: unknown, code?: string): ReceiptDocumentType => {
   if (Object.values(ReceiptDocumentType).includes(value as ReceiptDocumentType)) {
      return value as ReceiptDocumentType;
   }

   const token = normalizeToken(value);
   const codeToken = normalizeToken(code);

   if (
      token === 'payment_voucher' ||
      token === 'receipt_acknowledgement' ||
      token === 'phieu chi' ||
      token === 'bien nhan' ||
      codeToken.startsWith('pc-') ||
      codeToken.startsWith('bn-')
   ) {
      return ReceiptDocumentType.PAYMENT_VOUCHER;
   }

   return ReceiptDocumentType.PAYMENT_RECEIPT;
};

const formatCurrency = (value?: number, currency = 'VND') =>
   `${Number(value || 0).toLocaleString('vi-VN')} ${currency === 'VND' ? 'đ' : currency}`;

const formatDate = (value?: string) => {
   if (!value) return '--';
   const date = new Date(value);
   if (Number.isNaN(date.getTime())) return value;
   return date.toLocaleDateString('vi-VN');
};

const DIGIT_WORDS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

const readVietnameseUnitDigit = (digit: number, tensDigit: number) => {
   if (digit === 0) return '';
   if (digit === 1 && tensDigit > 1) return 'mốt';
   if (digit === 4 && tensDigit > 1) return 'tư';
   if (digit === 5 && tensDigit >= 1) return 'lăm';
   return DIGIT_WORDS[digit];
};

const readVietnameseThreeDigits = (value: number, forceFull = false) => {
   const hundred = Math.floor(value / 100);
   const tens = Math.floor((value % 100) / 10);
   const unit = value % 10;
   const parts: string[] = [];

   if (hundred > 0 || forceFull) {
      parts.push(`${DIGIT_WORDS[hundred]} trăm`);
   }

   if (tens > 1) {
      parts.push(`${DIGIT_WORDS[tens]} mươi`);
      if (unit > 0) parts.push(readVietnameseUnitDigit(unit, tens));
      return parts.join(' ').trim();
   }

   if (tens === 1) {
      parts.push('mười');
      if (unit > 0) parts.push(readVietnameseUnitDigit(unit, tens));
      return parts.join(' ').trim();
   }

   if (unit > 0) {
      if (hundred > 0 || forceFull) parts.push('lẻ');
      parts.push(readVietnameseUnitDigit(unit, tens));
   }

   return parts.join(' ').trim();
};

const convertMoneyToVietnameseWords = (amount?: number) => {
   const normalized = Math.max(0, Math.round(Number(amount || 0)));
   if (!normalized) return 'Không đồng';

   const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
   const groups: number[] = [];
   let remaining = normalized;

   while (remaining > 0) {
      groups.unshift(remaining % 1000);
      remaining = Math.floor(remaining / 1000);
   }

   const words = groups
      .map((groupValue, index) => {
         if (!groupValue) return '';

         const hasHigherGroup = groups.slice(0, index).some((value) => value > 0);
         const chunk = readVietnameseThreeDigits(groupValue, hasHigherGroup && groupValue < 100);
         const unitLabel = units[groups.length - index - 1];
         return `${chunk} ${unitLabel}`.trim();
      })
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

   return `${words.charAt(0).toUpperCase()}${words.slice(1)} đồng`;
};

const getDescription = (invoice: Partial<IInvoice>) => {
   if (invoice.description?.trim()) return invoice.description.trim();
   if (invoice.items?.length) {
      return invoice.items
         .map((item) => item.name)
         .filter(Boolean)
         .join(', ');
   }
   return '';
};

const getLinkedQuotation = (invoice: Partial<IInvoice>, quotations: IQuotation[]) =>
   quotations.find(
      (quotation) =>
         (invoice.soId && quotation.id === invoice.soId) ||
         (invoice.soCode && quotation.soCode === invoice.soCode)
   );

const getProgramName = (quotation?: IQuotation, invoice?: Partial<IInvoice>) => {
   if (invoice?.programName?.trim()) return invoice.programName.trim();
   if (quotation?.programType?.trim()) return quotation.programType.trim();
   if (quotation?.product?.trim()) return quotation.product.trim();

   return quotation?.lineItems?.flatMap((item) => item.programs || []).filter(Boolean).join(', ') || '';
};

const normalizeInvoice = (
   invoice: Partial<IInvoice>,
   index: number,
   quotations: IQuotation[]
): IInvoice => {
   const issueDate = invoice.issueDate || invoice.createdAt || new Date().toISOString();
   const documentType = normalizeDocumentType(invoice.documentType, invoice.code);
   const linkedQuotation = getLinkedQuotation(invoice, quotations);
   const sequenceNo = extractNumberFromCode(invoice.code) || index + 1;
   const totalAmount = Number(invoice.totalAmount ?? invoice.subTotal ?? 0);
   const description =
      getDescription(invoice) ||
      `${documentType === ReceiptDocumentType.PAYMENT_RECEIPT ? 'Thu' : 'Chi'} tiền`;

   return {
      id: invoice.id || `DOC-${Date.now()}-${index}`,
      code: formatDocumentCode(documentType, sequenceNo),
      documentType,
      payerName: invoice.payerName || invoice.customerName || linkedQuotation?.customerName || invoice.companyName,
      displayAddress: invoice.displayAddress || invoice.companyAddress || linkedQuotation?.studentAddress || linkedQuotation?.branchName,
      contactPerson: invoice.contactPerson || invoice.ownerName || linkedQuotation?.salespersonName || invoice.createdBy,
      description,
      contractCode:
         invoice.contractCode ||
         linkedQuotation?.contractId ||
         (invoice.soCode || linkedQuotation?.soCode ? `HD-${invoice.soCode || linkedQuotation?.soCode}` : undefined),
      ownerName:
         invoice.ownerName ||
         linkedQuotation?.salespersonName ||
         linkedQuotation?.saleConfirmedBy ||
         invoice.createdBy ||
         'Chưa cập nhật',
      branchName: invoice.branchName || linkedQuotation?.branchName || 'Chưa cập nhật',
      programName: getProgramName(linkedQuotation, invoice) || 'Chưa cập nhật',
      currency: invoice.currency || 'VND',
      paymentMethod: invoice.paymentMethod || 'Chuyển khoản',
      paymentDate: invoice.paymentDate || issueDate,
      accountName:
         invoice.accountName ||
         (documentType === ReceiptDocumentType.PAYMENT_RECEIPT ? 'Tài khoản nhận mặc định' : 'Tài khoản chi mặc định'),
      approvedTransactionCode:
         invoice.approvedTransactionCode ||
         (invoice.soCode || linkedQuotation?.soCode ? `GD-${invoice.soCode || linkedQuotation?.soCode}` : undefined),
      cashFlowCode:
         invoice.cashFlowCode ||
         `${documentType === ReceiptDocumentType.PAYMENT_RECEIPT ? 'THU' : 'CHI'}-${String(sequenceNo).padStart(5, '0')}`,
      bankReference: invoice.bankReference,
      attachments: invoice.attachments || [],
      requiresTaxInvoice: Boolean(invoice.requiresTaxInvoice),
      receiptPrintedAt: invoice.receiptPrintedAt,
      receiptEmailedAt: invoice.receiptEmailedAt,
      note: invoice.note || '',
      customerId: invoice.customerId,
      customerName: invoice.customerName || linkedQuotation?.customerName || invoice.companyName || 'Khách lẻ',
      customerEmail: invoice.customerEmail,
      customerPhone: invoice.customerPhone || linkedQuotation?.studentPhone,
      taxId: invoice.taxId,
      companyName: invoice.companyName,
      companyAddress: invoice.companyAddress,
      soId: invoice.soId,
      soCode: invoice.soCode || linkedQuotation?.soCode,
      items: invoice.items || [],
      subTotal: Number(invoice.subTotal ?? totalAmount),
      taxAmount: Number(invoice.taxAmount ?? 0),
      totalAmount,
      issueDate,
      dueDate: invoice.dueDate,
      status: normalizeStatus(invoice.status),
      createdBy: invoice.createdBy || 'Hệ thống',
      createdAt: invoice.createdAt || issueDate
   };
};

const buildAutoInvoiceFromTransactions = ({
   actual,
   source,
   quotation,
   existing,
   fallbackIndex
 }: {
   actual: IActualTransaction;
   source: ITransaction;
   quotation?: IQuotation;
   existing?: IInvoice;
   fallbackIndex: number;
 }): Partial<IInvoice> => {
   const documentType = getDocumentTypeByTransactionType(actual.type);
   const issueDate = actual.date || new Date().toISOString().slice(0, 10);
   const autoAttachments = buildAttachmentFromActualTransaction(actual);
   const accountName = actual.cashAccount || (source.method === 'TIEN_MAT' ? 'Tiền mặt' : 'STK ngân hàng');
   const sequenceNo = getAutoInvoiceSequence(actual, source);
   const payerName = existing?.payerName || actual.recipientPayerName || source.recipientPayerName || source.relatedEntityLabel || actual.title || quotation?.customerName;
   const displayAddress = existing?.displayAddress || quotation?.studentAddress || quotation?.branchName || actual.department || '';
   const contactPerson = existing?.contactPerson || quotation?.salespersonName || existing?.ownerName || actual.createdBy || source.createdBy;

   return {
      id: existing?.id || `AUTO-DOC-${actual.id}`,
      code: existing?.code || formatDocumentCode(documentType, sequenceNo || fallbackIndex + 1),
      documentType,
      payerName,
      displayAddress,
      contactPerson,
      customerId: existing?.customerId || source.customerId,
      customerName: existing?.customerName || quotation?.customerName || actual.recipientPayerName || source.relatedEntityLabel || 'Khách lẻ',
      customerEmail: existing?.customerEmail || quotation?.studentEmail,
      customerPhone: existing?.customerPhone || quotation?.studentPhone,
      description: existing?.description || actual.title || source.note || actual.category,
      contractCode: quotation?.contractId || existing?.contractCode || (source.soCode ? `HD-${source.soCode}` : undefined),
      ownerName: existing?.ownerName || quotation?.salespersonName || actual.createdBy || source.createdBy,
      branchName: existing?.branchName || quotation?.branchName || actual.department,
      programName: existing?.programName || quotation?.product || quotation?.programType || actual.category,
      currency: existing?.currency || 'VND',
      paymentMethod: existing?.paymentMethod || PAYMENT_METHOD_LABEL_MAP[source.method] || actual.cashAccount || 'Chuyển khoản',
      paymentDate: existing?.paymentDate || issueDate,
      accountName: existing?.accountName || accountName,
      approvedTransactionCode: existing?.approvedTransactionCode || source.code || source.id,
      cashFlowCode: existing?.cashFlowCode || actual.transactionCode || actual.id,
      bankReference: existing?.bankReference || source.bankRefCode || actual.voucherNumber,
      attachments: existing?.attachments?.length ? existing.attachments : autoAttachments,
      requiresTaxInvoice: Boolean(existing?.requiresTaxInvoice),
      note: existing?.note || source.note || '',
      companyAddress: existing?.companyAddress || displayAddress,
      soId: existing?.soId || source.quotationId,
      soCode: existing?.soCode || source.soCode,
      items: existing?.items?.length
         ? existing.items
         : [
              {
                 name: actual.category || actual.title || `${DOCUMENT_TYPE_LABELS[documentType]} tự sinh`,
                 quantity: 1,
                 price: actual.amount,
                 total: actual.amount
              }
           ],
      subTotal: actual.amount,
      taxAmount: existing?.taxAmount || 0,
      totalAmount: actual.amount,
      issueDate: existing?.issueDate || issueDate,
      status: existing?.status || InvoiceStatus.DRAFT,
      receiptPrintedAt: existing?.receiptPrintedAt,
      receiptEmailedAt: existing?.receiptEmailedAt,
      createdBy: existing?.createdBy || 'Hệ thống',
      createdAt: existing?.createdAt || actual.createdAt || issueDate
   };
 };

const syncInvoicesWithExecutedTransactions = (
   invoices: IInvoice[],
   actualTransactions: IActualTransaction[],
   sourceTransactions: ITransaction[],
   quotations: IQuotation[]
) => {
   const sourceMap = new Map(sourceTransactions.map((transaction) => [transaction.id, transaction]));
   const quotationMap = new Map(quotations.map((quotation) => [quotation.id, quotation]));
   const matchedInvoiceIds = new Set<string>();
   let autoDraftsIndexSeed = 0;

   const autoDrafts = actualTransactions
      .filter((actual) => actual.relatedId)
      .map((actual) => {
         const source = sourceMap.get(actual.relatedId as string);
         if (!source) return null;

         const quotation = quotationMap.get(source.quotationId);
         if (!isSourceTransactionExecuted(source, quotation)) return null;

         const existing = invoices.find(
            (invoice) =>
               invoice.id === `AUTO-DOC-${actual.id}` ||
               invoice.cashFlowCode === actual.transactionCode ||
               (source.code && invoice.approvedTransactionCode === source.code)
         );

         if (existing) matchedInvoiceIds.add(existing.id);

         return normalizeInvoice(
            buildAutoInvoiceFromTransactions({
               actual,
               source,
               quotation,
               existing,
               fallbackIndex: autoDraftsIndexSeed++
            }),
            0,
            quotations
         );
      })
      .filter(Boolean) as IInvoice[];

   const manualInvoices = invoices.filter(
      (invoice) => !matchedInvoiceIds.has(invoice.id) && !invoice.id.startsWith('AUTO-DOC-')
   );
   return [...autoDrafts, ...manualInvoices].sort(
      (a, b) => new Date(b.issueDate || b.createdAt).getTime() - new Date(a.issueDate || a.createdAt).getTime()
   );
 };

const DetailCard = ({
   label,
   value,
   icon: _icon,
   className = ''
}: {
   label: string;
   value?: string;
   icon?: React.ComponentType<{ size?: number; className?: string }>;
   className?: string;
}) => (
   <div className={`min-w-0 border-b border-[#dee2e6] pb-1.5 ${className}`}>
      <div className="text-[12px] font-medium leading-4 text-[#666666]">{label}</div>
      <div className="mt-1 min-h-[20px] break-words text-[13px] font-medium leading-5 text-[#333333]">
         {value || '--'}
      </div>
   </div>
);

const createAttachmentRecords = (files: FileList | null) =>
   Array.from(files || []).map((file, index) => ({
      id: `ATT-${Date.now()}-${index}`,
      name: file.name
   }));

const buildReceiptPrintHtml = (invoice: IInvoice) => {
   const amount = formatCurrency(invoice.totalAmount, invoice.currency);
   const issueDate = formatDate(invoice.issueDate);
   const paymentDate = formatDate(invoice.paymentDate);
   const attachmentText =
      invoice.attachments && invoice.attachments.length > 0
         ? invoice.attachments.map((attachment) => attachment.name).join(', ')
         : '--';

   return `
      <!doctype html>
      <html lang="vi">
      <head>
         <meta charset="utf-8" />
         <title>${invoice.code}</title>
         <style>
            body { font-family: Inter, Roboto, Arial, sans-serif; color: #222; padding: 32px; }
            .sheet { max-width: 760px; margin: 0 auto; border: 1px solid #dee2e6; padding: 28px 32px; }
            .top { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 24px; }
            .title { font-size: 28px; font-weight: 700; margin: 0 0 6px; }
            .badge { display: inline-block; font-size: 12px; padding: 4px 10px; border: 1px solid #b7e4c7; background: #f1fff5; color: #1b7f45; }
            .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 24px; margin-top: 12px; }
            .field { border-bottom: 1px solid #dee2e6; padding-bottom: 8px; }
            .label { font-size: 12px; color: #666; margin-bottom: 6px; }
            .value { font-size: 14px; font-weight: 600; }
            .section { margin-top: 22px; }
            .section-title { font-size: 12px; text-transform: uppercase; letter-spacing: .08em; color: #6c757d; margin-bottom: 10px; }
         </style>
      </head>
      <body>
         <div class="sheet">
            <div class="top">
               <div>
                  <div class="badge">${DOCUMENT_TYPE_LABELS[invoice.documentType || ReceiptDocumentType.PAYMENT_RECEIPT]}</div>
                  <h1 class="title">${invoice.code}</h1>
                  <div>${invoice.description || 'Phiếu thu'}</div>
               </div>
               <div style="text-align:right">
                  <div style="font-size:12px;color:#666;">Số tiền</div>
                  <div style="font-size:24px;font-weight:700;">${amount}</div>
               </div>
            </div>
            <div class="section">
               <div class="section-title">Thông tin chung</div>
               <div class="grid">
                  <div class="field"><div class="label">Khách hàng</div><div class="value">${invoice.customerName || '--'}</div></div>
                  <div class="field"><div class="label">Ngày lập</div><div class="value">${issueDate}</div></div>
                  <div class="field"><div class="label">Ngày thanh toán</div><div class="value">${paymentDate}</div></div>
                  <div class="field"><div class="label">Hình thức thanh toán</div><div class="value">${invoice.paymentMethod || '--'}</div></div>
                  <div class="field"><div class="label">Tài khoản nhận</div><div class="value">${invoice.accountName || '--'}</div></div>
                  <div class="field"><div class="label">Xuất hóa đơn</div><div class="value">${invoice.requiresTaxInvoice ? 'Có' : 'Không'}</div></div>
               </div>
            </div>
            <div class="section">
               <div class="section-title">Ghi chú và đính kèm</div>
               <div class="grid">
                  <div class="field"><div class="label">Ghi chú</div><div class="value">${invoice.note || '--'}</div></div>
                  <div class="field"><div class="label">Tệp đính kèm</div><div class="value">${attachmentText}</div></div>
               </div>
            </div>
         </div>
      </body>
      </html>
   `;
};

const escapePrintHtml = (value?: string | number | null) =>
   String(value ?? '--')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

const formatPrintMultiline = (value?: string | null) =>
   escapePrintHtml(value || '--').replace(/\n/g, '<br />');

const buildInvoiceEditForm = (invoice?: IInvoice | null): InvoiceEditFormState => ({
   payerName: invoice?.payerName || '',
   displayAddress: invoice?.displayAddress || '',
   contactPerson: invoice?.contactPerson || '',
   description: invoice?.description || '',
   note: invoice?.note || '',
   attachments: invoice?.attachments || []
});

const buildDocumentPrintHtml = (invoice: IInvoice) => {
   const documentType = invoice.documentType || ReceiptDocumentType.PAYMENT_RECEIPT;
   const documentLabel = DOCUMENT_TYPE_LABELS[documentType];
   const amount = formatCurrency(invoice.totalAmount, invoice.currency);
   const amountInWords = convertMoneyToVietnameseWords(invoice.totalAmount);
   const issueDate = formatDate(invoice.issueDate);
   const paymentDate = formatDate(invoice.paymentDate);
   const payerLabel = documentType === ReceiptDocumentType.PAYMENT_VOUCHER ? 'Người nhận tiền' : 'Người nộp tiền';
   const accountLabel = documentType === ReceiptDocumentType.PAYMENT_VOUCHER ? 'Tài khoản chi' : 'Tài khoản nhận';
   const attachmentText =
      invoice.attachments && invoice.attachments.length > 0
         ? invoice.attachments.map((attachment) => attachment.name).join(', ')
         : '--';

   return `
      <!doctype html>
      <html lang="vi">
      <head>
         <meta charset="utf-8" />
         <title>${escapePrintHtml(invoice.code)}</title>
         <style>
            body { font-family: Inter, Roboto, Arial, sans-serif; color: #222; padding: 32px; }
            .sheet { max-width: 760px; margin: 0 auto; border: 1px solid #dee2e6; padding: 28px 32px; }
            .top { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 24px; }
            .title { font-size: 28px; font-weight: 700; margin: 0 0 6px; }
            .badge { display: inline-block; font-size: 12px; padding: 4px 10px; border: 1px solid #b7e4c7; background: #f1fff5; color: #1b7f45; }
            .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 24px; margin-top: 12px; }
            .field { border-bottom: 1px solid #dee2e6; padding-bottom: 8px; }
            .label { font-size: 12px; color: #666; margin-bottom: 6px; }
            .value { font-size: 14px; font-weight: 600; }
            .section { margin-top: 22px; }
            .section-title { font-size: 12px; text-transform: uppercase; letter-spacing: .08em; color: #6c757d; margin-bottom: 10px; }
            .block { border: 1px solid #dee2e6; background: #fafbfc; padding: 12px 14px; line-height: 1.6; }
            .stack { display: grid; gap: 10px; }
            .signatures { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin-top: 28px; text-align: center; }
            .signature-title { font-weight: 700; font-size: 13px; margin-bottom: 6px; }
            .signature-note { font-size: 11px; color: #6c757d; }
            .signature-space { height: 84px; }
          </style>
       </head>
       <body>
         <div class="sheet">
            <div class="top">
               <div>
                  <div class="badge">${escapePrintHtml(documentLabel)}</div>
                  <h1 class="title">${escapePrintHtml(invoice.code)}</h1>
                  <div>${escapePrintHtml(invoice.description || documentLabel)}</div>
               </div>
               <div style="text-align:right">
                  <div style="font-size:12px;color:#666;">Số tiền</div>
                  <div style="font-size:24px;font-weight:700;">${escapePrintHtml(amount)}</div>
               </div>
            </div>
            <div class="section">
               <div class="section-title">Thông tin chung</div>
               <div class="grid">
                  <div class="field"><div class="label">Khách hàng / đối tượng</div><div class="value">${escapePrintHtml(invoice.customerName || '--')}</div></div>
                  <div class="field"><div class="label">${escapePrintHtml(payerLabel)}</div><div class="value">${escapePrintHtml(invoice.payerName || invoice.customerName || '--')}</div></div>
                  <div class="field"><div class="label">Ngày lập</div><div class="value">${escapePrintHtml(issueDate)}</div></div>
                  <div class="field"><div class="label">Ngày thanh toán</div><div class="value">${escapePrintHtml(paymentDate)}</div></div>
                  <div class="field"><div class="label">Hình thức thanh toán</div><div class="value">${escapePrintHtml(invoice.paymentMethod || '--')}</div></div>
                  <div class="field"><div class="label">${escapePrintHtml(accountLabel)}</div><div class="value">${escapePrintHtml(invoice.accountName || '--')}</div></div>
                  <div class="field"><div class="label">Người liên hệ</div><div class="value">${escapePrintHtml(invoice.contactPerson || '--')}</div></div>
                  <div class="field"><div class="label">Địa chỉ / thông tin hiển thị</div><div class="value">${escapePrintHtml(invoice.displayAddress || '--')}</div></div>
               </div>
            </div>
             <div class="section">
                <div class="section-title">Diễn giải & liên kết gốc</div>
                <div class="stack">
                  <div class="block">
                     <div class="label">Số tiền bằng chữ</div>
                     <div class="value">${escapePrintHtml(amountInWords)}</div>
                  </div>
                  <div class="block">
                     <div class="label">Nội dung diễn giải</div>
                     <div class="value">${formatPrintMultiline(invoice.description)}</div>
                  </div>
                  <div class="grid">
                     <div class="field"><div class="label">Mã giao dịch duyệt</div><div class="value">${escapePrintHtml(invoice.approvedTransactionCode || '--')}</div></div>
                     <div class="field"><div class="label">Mã thu chi</div><div class="value">${escapePrintHtml(invoice.cashFlowCode || '--')}</div></div>
                     <div class="field"><div class="label">Số chứng từ / UNC</div><div class="value">${escapePrintHtml(invoice.bankReference || '--')}</div></div>
                     <div class="field"><div class="label">Tệp đính kèm</div><div class="value">${escapePrintHtml(attachmentText)}</div></div>
                  </div>
                  <div class="block">
                     <div class="label">Ghi chú</div>
                     <div class="value">${formatPrintMultiline(invoice.note)}</div>
                  </div>
                </div>
             </div>
             <div class="signatures">
                <div>
                   <div class="signature-title">Người lập phiếu</div>
                   <div class="signature-note">(Ký, ghi rõ họ tên)</div>
                   <div class="signature-space"></div>
                </div>
                <div>
                   <div class="signature-title">${escapePrintHtml(payerLabel)}</div>
                   <div class="signature-note">(Ký, ghi rõ họ tên)</div>
                   <div class="signature-space"></div>
                </div>
                <div>
                   <div class="signature-title">Kế toán</div>
                   <div class="signature-note">(Ký, ghi rõ họ tên)</div>
                   <div class="signature-space"></div>
                </div>
                <div>
                   <div class="signature-title">Thủ quỹ</div>
                   <div class="signature-note">(Ký, ghi rõ họ tên)</div>
                   <div class="signature-space"></div>
                </div>
             </div>
          </div>
       </body>
       </html>
   `;
};

const FinanceInvoices: React.FC = () => {
   const { user } = useAuth();
   const [quotations, setQuotations] = useState<IQuotation[]>([]);
   const [invoices, setInvoices] = useState<IInvoice[]>([]);
   const [activeTab, setActiveTab] = useState<InvoiceTab>(ALL_TAB);
   const [showCreateModal, setShowCreateModal] = useState(false);
   const [showEditModal, setShowEditModal] = useState(false);
   const [searchTerm, setSearchTerm] = useState('');
   const [newInvoiceData, setNewInvoiceData] = useState<Partial<IInvoice>>(EMPTY_FORM);
   const [editInvoiceData, setEditInvoiceData] = useState<InvoiceEditFormState>(buildInvoiceEditForm);
   const [selectedSO, setSelectedSO] = useState('');
   const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
   const [editInvoiceId, setEditInvoiceId] = useState<string | null>(null);

   useEffect(() => {
      const loadInvoices = () => {
         const nextQuotations = (getQuotations() || []) as IQuotation[];
         const storedInvoices = (getInvoices() || []) as Partial<IInvoice>[];
         const normalizedInvoices = storedInvoices.map((invoice, index) =>
            normalizeInvoice(invoice, index, nextQuotations)
         );
         const syncedInvoices = syncInvoicesWithExecutedTransactions(
            normalizedInvoices,
            getActualTransactions(),
            getTransactions(),
            nextQuotations
         );

         setQuotations(nextQuotations);
         setInvoices(syncedInvoices);

         if (JSON.stringify(storedInvoices) !== JSON.stringify(syncedInvoices)) {
            saveInvoices(syncedInvoices);
         }
      };

      loadInvoices();

      const refreshEvents = [
         'educrm:invoices-changed',
         'educrm:actual-transactions-changed',
         'educrm:transactions-changed',
         'educrm:quotations-changed'
      ] as const;

      refreshEvents.forEach((eventName) => window.addEventListener(eventName, loadInvoices as EventListener));

      return () => {
         refreshEvents.forEach((eventName) =>
            window.removeEventListener(eventName, loadInvoices as EventListener)
         );
      };
   }, []);

   const selectedInvoice = useMemo(
      () => invoices.find((invoice) => invoice.id === selectedInvoiceId) || null,
      [invoices, selectedInvoiceId]
   );

   const editInvoice = useMemo(
      () => invoices.find((invoice) => invoice.id === editInvoiceId) || null,
      [editInvoiceId, invoices]
   );
   const selectedInvoiceWorkflowStatus = useMemo(
      () => (selectedInvoice ? getInvoiceWorkflowStatus(selectedInvoice) : InvoiceStatus.DRAFT),
      [selectedInvoice]
   );

   const lockedSOs = useMemo(
      () => quotations.filter((quotation) => quotation.status === 'Locked' || quotation.status === 'Sale Order'),
      [quotations]
   );


   const getTabLabel = (tab: InvoiceTab) => (tab === ALL_TAB ? 'Tất cả' : STATUS_META[tab].label);

   const activeSearchChips = useMemo<PinnedSearchChip[]>(() => {
      if (activeTab === ALL_TAB) return [];
      return [{ key: 'status', label: `Trạng thái: ${getTabLabel(activeTab)}` }];
   }, [activeTab]);

   const filteredData = useMemo(() => {
      const keyword = normalizeToken(searchTerm);

      return invoices.filter((invoice) => {
         const workflowStatus = getInvoiceWorkflowStatus(invoice);
         const matchesTab = activeTab === ALL_TAB || workflowStatus === activeTab;
         const matchesSearch =
            !keyword ||
            normalizeToken(invoice.code).includes(keyword) ||
            normalizeToken(invoice.customerName).includes(keyword) ||
            normalizeToken(invoice.payerName).includes(keyword) ||
            normalizeToken(invoice.description).includes(keyword) ||
            normalizeToken(DOCUMENT_TYPE_LABELS[invoice.documentType || ReceiptDocumentType.PAYMENT_RECEIPT]).includes(keyword);

         return matchesTab && matchesSearch;
      });
   }, [activeTab, invoices, searchTerm]);

   const invoiceSummary = useMemo(() => {
      const activeInvoices = filteredData.filter((invoice) => getInvoiceWorkflowStatus(invoice) !== InvoiceStatus.CANCELLED);
      const totalIn = activeInvoices
         .filter((invoice) => (invoice.documentType || ReceiptDocumentType.PAYMENT_RECEIPT) === ReceiptDocumentType.PAYMENT_RECEIPT)
         .reduce((sum, invoice) => sum + Number(invoice.totalAmount || 0), 0);
      const totalOut = activeInvoices
         .filter((invoice) => (invoice.documentType || ReceiptDocumentType.PAYMENT_RECEIPT) === ReceiptDocumentType.PAYMENT_VOUCHER)
         .reduce((sum, invoice) => sum + Number(invoice.totalAmount || 0), 0);
      const accountBreakdown = {
         bank: { key: 'bank' as const, label: 'Ngân hàng', totalIn: 0, totalOut: 0, count: 0 },
         cash: { key: 'cash' as const, label: 'Tiền mặt', totalIn: 0, totalOut: 0, count: 0 }
      };

      activeInvoices.forEach((invoice) => {
         const accountType = getInvoiceAccountType(invoice);
         const documentType = invoice.documentType || ReceiptDocumentType.PAYMENT_RECEIPT;
         const amount = Number(invoice.totalAmount || 0);
         const bucket = accountBreakdown[accountType];
         bucket.count += 1;
         if (documentType === ReceiptDocumentType.PAYMENT_VOUCHER) {
            bucket.totalOut += amount;
         } else {
            bucket.totalIn += amount;
         }
      });

      return {
         totalIn,
         totalOut,
         net: totalIn - totalOut,
         count: activeInvoices.length,
         printedCount: activeInvoices.filter((invoice) => Boolean(invoice.receiptPrintedAt)).length,
         accountBreakdown: [accountBreakdown.bank, accountBreakdown.cash].map((item) => ({
            ...item,
            net: item.totalIn - item.totalOut
         }))
      };
   }, [filteredData]);

   const resetCreateForm = () => {
      setNewInvoiceData(EMPTY_FORM());
      setSelectedSO('');
      setShowCreateModal(false);
   };

   const closeEditInvoiceModal = () => {
      setShowEditModal(false);
      setEditInvoiceId(null);
      setEditInvoiceData(buildInvoiceEditForm());
   };

   const persistInvoiceUpdate = (updatedInvoice: IInvoice) => {
      updateInvoice(updatedInvoice);
      setInvoices((prev) => prev.map((invoice) => (invoice.id === updatedInvoice.id ? updatedInvoice : invoice)));
   };

   const generateDocumentCode = (documentType: ReceiptDocumentType) => {
      const currentMax = invoices
         .filter((invoice) => invoice.documentType === documentType)
         .reduce((max, invoice) => Math.max(max, extractNumberFromCode(invoice.code)), 0);

      return formatDocumentCode(documentType, currentMax + 1);
   };

   const currentFormDocumentType = normalizeDocumentType(newInvoiceData.documentType);
   const previewDocumentCode = generateDocumentCode(currentFormDocumentType);

   const handleCreateInvoice = (options?: { printAfterCreate?: boolean }) => {
      const documentType = normalizeDocumentType(newInvoiceData.documentType);
      const issueDate = newInvoiceData.issueDate || new Date().toISOString().slice(0, 10);

      const newDocument: IInvoice = normalizeInvoice(
         {
            ...newInvoiceData,
            id: `DOC-${Date.now()}`,
            code: generateDocumentCode(documentType),
            documentType,
            customerName: newInvoiceData.customerName || 'Khách lẻ',
            description: getDescription(newInvoiceData),
            issueDate,
            paymentDate: newInvoiceData.paymentDate || issueDate,
            status: InvoiceStatus.DRAFT,
            totalAmount: Number(newInvoiceData.totalAmount || 0),
            subTotal: Number(newInvoiceData.totalAmount || 0),
            taxAmount: 0,
            currency: newInvoiceData.currency || 'VND',
            paymentMethod: newInvoiceData.paymentMethod || 'Chuyển khoản',
            accountName: newInvoiceData.accountName,
            customerEmail: newInvoiceData.customerEmail,
            requiresTaxInvoice: Boolean(newInvoiceData.requiresTaxInvoice),
            attachments: newInvoiceData.attachments || [],
            note: newInvoiceData.note,
            createdBy: user?.name || 'Kế toán',
            createdAt: new Date().toISOString()
         },
         invoices.length,
         quotations
      );

      addInvoice(newDocument);
      setSelectedInvoiceId(newDocument.id);
      if (options?.printAfterCreate) {
         setTimeout(() => handlePrintReceipt(newDocument), 100);
      }
      resetCreateForm();
   };

   const handleSelectSO = (soId: string) => {
      setSelectedSO(soId);
      const so = lockedSOs.find((quotation) => quotation.id === soId);

      if (!so) {
         setNewInvoiceData((prev) => ({ ...prev, soId: undefined, soCode: undefined }));
         return;
      }

      setNewInvoiceData((prev) => ({
         ...prev,
         customerName: so.customerName,
         payerName: so.customerName,
         displayAddress: so.studentAddress || so.branchName || '',
         contactPerson: so.salespersonName || '',
         customerEmail: so.studentEmail,
         description:
            prev.documentType === ReceiptDocumentType.PAYMENT_VOUCHER
               ? `Chi tiền liên quan đơn hàng ${so.soCode || ''}`.trim()
               : so.product || `Thu tiền đơn hàng ${so.soCode || ''}`.trim(),
         totalAmount: so.finalAmount || 0,
         soId: so.id,
         soCode: so.soCode,
         contractCode: so.contractId || `HD-${so.soCode}`,
         ownerName: so.salespersonName,
         branchName: so.branchName,
         programName: getProgramName(so),
         items: [
            {
               name: so.product || `Đơn hàng ${so.soCode || ''}`.trim(),
               quantity: 1,
               price: so.finalAmount || so.amount || 0,
               total: so.finalAmount || so.amount || 0
            }
         ]
      }));
   };

   const handleAttachmentSelect = async (files: FileList | null) => {
      try {
         const nextAttachments = await readFilesAsAttachmentRecords(files);
         if (!nextAttachments.length) return;

         setNewInvoiceData((prev) => ({
            ...prev,
            attachments: [...(prev.attachments || []), ...nextAttachments]
         }));
      } catch (error) {
         window.alert(error instanceof Error ? error.message : 'Không thể tải file đính kèm.');
      }
   };

   const handleRemoveAttachment = (attachmentId: string) => {
      setNewInvoiceData((prev) => ({
         ...prev,
         attachments: (prev.attachments || []).filter((attachment) => attachment.id !== attachmentId)
      }));
   };

   const openEditInvoiceModal = (invoice: IInvoice) => {
      setEditInvoiceId(invoice.id);
      setEditInvoiceData(buildInvoiceEditForm(invoice));
      setShowEditModal(true);
   };

   const handleEditAttachmentSelect = async (files: FileList | null) => {
      try {
         const nextAttachments = await readFilesAsAttachmentRecords(files);
         if (!nextAttachments.length) return;

         setEditInvoiceData((prev) => ({
            ...prev,
            attachments: [...prev.attachments, ...nextAttachments]
         }));
      } catch (error) {
         window.alert(error instanceof Error ? error.message : 'Không thể tải file đính kèm.');
      }
   };

   const handleRemoveEditAttachment = (attachmentId: string) => {
      setEditInvoiceData((prev) => ({
         ...prev,
         attachments: prev.attachments.filter((attachment) => attachment.id !== attachmentId)
      }));
   };

   const handlePrintReceipt = (invoice: IInvoice) => {
      const printWindow = window.open('', '_blank', 'width=960,height=720');
      if (!printWindow) return;

      printWindow.document.write(buildDocumentPrintHtml(invoice));
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 250);

      persistInvoiceUpdate(
         normalizeInvoice(
            {
               ...invoice,
               receiptPrintedAt: new Date().toISOString()
            },
            0,
            quotations
         )
      );
   };

   const handleSaveInvoiceEdits = () => {
      if (!editInvoice) return;

      const updatedInvoice = normalizeInvoice(
         {
            ...editInvoice,
            payerName: editInvoiceData.payerName,
            displayAddress: editInvoiceData.displayAddress,
            contactPerson: editInvoiceData.contactPerson,
            description: editInvoiceData.description,
            note: editInvoiceData.note,
            attachments: editInvoiceData.attachments
         },
         0,
         quotations
      );

      persistInvoiceUpdate(updatedInvoice);
      setSelectedInvoiceId(updatedInvoice.id);
      closeEditInvoiceModal();
   };

   const removeSearchChip = (chipKey: string) => {
      if (chipKey === 'status') {
         setActiveTab(ALL_TAB);
      }
   };

   const clearAllSearchFilters = () => {
      setSearchTerm('');
      setActiveTab(ALL_TAB);
   };

   return (
      <div className="flex h-full flex-col overflow-hidden bg-[#f8fafc] font-sans text-[#111418]">
         <div className="mx-auto flex w-full max-w-[1680px] flex-1 flex-col overflow-y-auto p-6">
             <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">Quản lý Phiếu thu / Phiếu chi</h1>
                        <p className="mt-0.5 text-[13px] leading-5 text-[#6c757d]">
                     Chứng từ được lưu ở trạng thái nháp. Mỗi phiếu chỉ thao tác sửa nội dung hiển thị và in chứng từ.
                  </p>
               </div>

               {user?.role === UserRole.ACCOUNTANT && (
                  <button
                     onClick={() => setShowCreateModal(true)}
                     className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 font-bold text-white shadow-sm transition-colors hover:bg-indigo-700"
                  >
                     <Plus size={18} />
                     Tạo phiếu
                  </button>
                )}
             </div>

            <section className="mb-4 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
               <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                     <h2 className="text-sm font-bold text-slate-900">Tổng quan Phiếu Thu / Phiếu Chi</h2>
                  </div>
                  <div className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                     {invoiceSummary.count} chứng từ
                  </div>
               </div>

               <div className="mt-2 grid grid-cols-2 gap-2 xl:grid-cols-6">
                  <div className="rounded-md border border-emerald-100 bg-emerald-50 px-2.5 py-2">
                     <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">Tổng thu</div>
                     <div className="mt-1 text-lg font-black leading-none text-emerald-700">{formatCurrency(invoiceSummary.totalIn)}</div>
                  </div>

                  <div className="rounded-md border border-rose-100 bg-rose-50 px-2.5 py-2">
                     <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-rose-700">Tổng chi</div>
                     <div className="mt-1 text-lg font-black leading-none text-rose-700">{formatCurrency(invoiceSummary.totalOut)}</div>
                  </div>

                  <div className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2">
                     <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">Ròng</div>
                     <div className={`mt-1 text-lg font-black leading-none ${invoiceSummary.net >= 0 ? 'text-sky-700' : 'text-amber-700'}`}>
                        {formatCurrency(invoiceSummary.net)}
                     </div>
                  </div>

                  <div className="rounded-md border border-blue-100 bg-blue-50 px-2.5 py-2">
                     <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-blue-700">Đã in</div>
                     <div className="mt-1 text-lg font-black leading-none text-blue-700">{invoiceSummary.printedCount}</div>
                  </div>

                  {invoiceSummary.accountBreakdown.map((item) => (
                     <div key={item.key} className="rounded-md border border-slate-200 bg-slate-50/80 px-2.5 py-2">
                        <div className="flex items-center justify-between gap-2">
                           <div className="text-[12px] font-bold text-slate-900">{item.label}</div>
                           <div className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${item.key === 'cash' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'}`}>
                              {item.key === 'cash' ? 'Cash' : 'Bank'}
                           </div>
                        </div>
                        <div className="mt-1.5 grid grid-cols-3 gap-1.5 text-[10px]">
                           <div className="rounded bg-white px-2 py-1.5">
                              <div className="font-semibold text-slate-500">Thu</div>
                              <div className="mt-0.5 font-bold leading-none text-emerald-700">{formatCurrency(item.totalIn)}</div>
                           </div>
                           <div className="rounded bg-white px-2 py-1.5">
                              <div className="font-semibold text-slate-500">Chi</div>
                              <div className="mt-0.5 font-bold leading-none text-rose-700">{formatCurrency(item.totalOut)}</div>
                           </div>
                           <div className="rounded bg-white px-2 py-1.5">
                              <div className="font-semibold text-slate-500">Ròng</div>
                              <div className={`mt-0.5 font-bold leading-none ${item.net >= 0 ? 'text-sky-700' : 'text-amber-700'}`}>
                                 {formatCurrency(item.net)}
                              </div>
                           </div>
                        </div>
                     </div>
                  ))}
               </div>
            </section>

            <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
               <div className="min-w-[320px] flex-1">
                  <PinnedSearchInput
                     value={searchTerm}
                     onChange={setSearchTerm}
                     placeholder="Tìm theo mã chứng từ, khách hàng, nội dung..."
                     chips={activeSearchChips}
                     onRemoveChip={removeSearchChip}
                     onClearAll={clearAllSearchFilters}
                     clearAllAriaLabel="Xóa tất cả bộ lọc chứng từ"
                     inputClassName="h-7 text-sm"
                  />
               </div>

                <div className="flex flex-wrap gap-2">
                  <button
                     onClick={() => setActiveTab(ALL_TAB)}
                     className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
                        activeTab === ALL_TAB ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                     }`}
                  >
                     Tất cả
                  </button>
                   <button
                      onClick={() => setActiveTab(InvoiceStatus.DRAFT)}
                      className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
                         activeTab === InvoiceStatus.DRAFT ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                   >
                      {STATUS_META[InvoiceStatus.DRAFT].label}
                   </button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
               <div className="h-full overflow-y-auto">
                  <table className="w-full table-fixed border-collapse text-left">
                     <colgroup>
                        <col className="w-[12%]" />
                        <col className="w-[12%]" />
                        <col className="w-[17%]" />
                        <col className="w-[11%]" />
                        <col className="w-[10%]" />
                        <col className="w-[11%]" />
                        <col className="w-[12%]" />
                        <col className="w-[15%]" />
                     </colgroup>
                     <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                        <tr>
                           <th className="px-4 py-4">Mã chứng từ</th>
                           <th className="px-4 py-4">Loại chứng từ</th>
                           <th className="px-4 py-4">Khách hàng / Đối tượng</th>
                           <th className="px-4 py-4 text-right">Số tiền</th>
                           <th className="px-4 py-4">Ngày lập</th>
                           <th className="px-4 py-4 text-center">Trạng thái</th>
                           <th className="px-4 py-4">Người lập</th>
                           <th className="px-4 py-4">Nội dung</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                        {filteredData.length > 0 ? (
                           filteredData.map((invoice) => {
                              const documentType =
                                 invoice.documentType || ReceiptDocumentType.PAYMENT_RECEIPT;
                              const workflowStatus = getInvoiceWorkflowStatus(invoice);
                              const statusMeta = STATUS_META[workflowStatus];

                              return (
                                 <tr
                                    key={invoice.id}
                                    onClick={() => setSelectedInvoiceId(invoice.id)}
                                    className="cursor-pointer transition-colors hover:bg-indigo-50/30"
                                 >
                                    <td className="px-4 py-4 font-mono font-bold text-indigo-600 break-words">{invoice.code}</td>
                                    <td className="px-4 py-4">
                                       <span
                                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${DOCUMENT_TYPE_BADGES[documentType]}`}
                                       >
                                          {documentType === ReceiptDocumentType.PAYMENT_RECEIPT ? (
                                             <ArrowDownLeft size={12} />
                                          ) : (
                                             <ArrowUpRight size={12} />
                                          )}
                                          {DOCUMENT_TYPE_LABELS[documentType]}
                                       </span>
                                    </td>
                                    <td className="px-4 py-4">
                                       <div className="break-words font-bold text-slate-900">{invoice.customerName}</div>
                                       {invoice.soCode && (
                                          <div className="mt-1 text-xs text-slate-500">SO: {invoice.soCode}</div>
                                       )}
                                    </td>
                                    <td className="px-4 py-4 text-right font-bold text-slate-900">
                                       {formatCurrency(invoice.totalAmount, invoice.currency)}
                                    </td>
                                    <td className="px-4 py-4 text-sm text-slate-600">{formatDate(invoice.issueDate)}</td>
                                     <td className="px-4 py-4 text-center">
                                        <span
                                           className={`inline-flex items-center gap-1 rounded border px-3 py-1 text-xs font-bold ${statusMeta.className}`}
                                        >
                                           {workflowStatus === InvoiceStatus.CANCELLED && <X size={12} />}
                                           {statusMeta.label}
                                        </span>
                                        {invoice.receiptPrintedAt && workflowStatus !== InvoiceStatus.CANCELLED && (
                                           <div className="mt-1 text-[11px] font-medium text-slate-400">
                                              Đã in {formatDate(invoice.receiptPrintedAt)}
                                           </div>
                                        )}
                                     </td>
                                    <td className="px-4 py-4 text-sm text-slate-600 break-words">{invoice.createdBy}</td>
                                    <td className="px-4 py-4 text-sm text-slate-600">
                                       <div className="whitespace-normal break-words leading-6">{invoice.description || '--'}</div>
                                    </td>
                                 </tr>
                              );
                           })
                        ) : (
                           <tr>
                              <td colSpan={8} className="py-12 text-center text-slate-500">
                                 Chưa có phiếu thu hoặc phiếu chi nào.
                              </td>
                           </tr>
                        )}
                     </tbody>
                  </table>
               </div>
            </div>
         </div>

          {selectedInvoice && (
             <>
               <div className="fixed inset-0 z-40 bg-slate-900/30" onClick={() => setSelectedInvoiceId(null)} />
               <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:translate-x-32">
                  <aside
                     className="flex max-h-[calc(100vh-32px)] w-full max-w-[980px] flex-col overflow-hidden rounded-sm border border-[#dee2e6] bg-white text-[13px] text-[#333333]"
                     style={{ fontFamily: 'Inter, Roboto, sans-serif' }}
                     onClick={(event) => event.stopPropagation()}
                   >
                   <div className="border-b border-[#dee2e6] bg-[#f8f9fa] px-4 py-2">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                         <div className="ml-auto flex flex-wrap items-center gap-2">
                            <button
                               onClick={() => openEditInvoiceModal(selectedInvoice)}
                               className="inline-flex items-center gap-1 rounded-sm border border-[#dee2e6] bg-white px-3 py-1.5 text-[12px] font-medium text-[#0d6efd] transition-colors hover:bg-[#f7fbff]"
                            >
                              <FileText size={13} />
                              Sửa phiếu
                           </button>
                           <button
                              onClick={() => handlePrintReceipt(selectedInvoice)}
                              className="inline-flex items-center gap-1 rounded-sm border border-[#dee2e6] bg-white px-3 py-1.5 text-[12px] font-medium text-[#495057] transition-colors hover:bg-[#f8f9fa]"
                           >
                               <Printer size={13} />
                               {selectedInvoice.documentType === ReceiptDocumentType.PAYMENT_VOUCHER ? 'In phiếu chi' : 'In phiếu thu'}
                             </button>
                            <span className={`inline-flex items-center rounded-sm border px-2.5 py-1 text-[11px] font-semibold ${STATUS_META[selectedInvoiceWorkflowStatus].className}`}>
                               {STATUS_META[selectedInvoiceWorkflowStatus].label}
                            </span>
                         </div>
                      </div>
                   </div>

                  <div className="flex items-start justify-between gap-4 border-b border-[#dee2e6] bg-white px-4 py-3">
                     <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                           <span
                              className={`inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-[11px] font-medium ${
                                 DOCUMENT_TYPE_BADGES[selectedInvoice.documentType || ReceiptDocumentType.PAYMENT_RECEIPT]
                              }`}
                           >
                              {selectedInvoice.documentType === ReceiptDocumentType.PAYMENT_VOUCHER ? (
                                 <ArrowUpRight size={12} />
                              ) : (
                                 <ArrowDownLeft size={12} />
                              )}
                              {DOCUMENT_TYPE_LABELS[selectedInvoice.documentType || ReceiptDocumentType.PAYMENT_RECEIPT]}
                           </span>
                            <span
                               className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-[11px] font-medium ${STATUS_META[selectedInvoiceWorkflowStatus].className}`}
                            >
                               {STATUS_META[selectedInvoiceWorkflowStatus].label}
                            </span>
                            {selectedInvoice.receiptPrintedAt && (
                               <span className="text-[11px] font-medium text-slate-400">
                                  In gần nhất: {formatDate(selectedInvoice.receiptPrintedAt)}
                               </span>
                            )}
                         </div>
                        <h2 className="text-[24px] font-semibold leading-8 text-[#212529]">{selectedInvoice.code}</h2>
                        <p className="mt-1 text-sm text-slate-500">{selectedInvoice.description || 'Chi tiết chứng từ'}</p>
                     </div>

                     <button
                        onClick={() => setSelectedInvoiceId(null)}
                        className="rounded-sm border border-[#dee2e6] bg-white p-1.5 text-[#6c757d] transition-colors hover:bg-[#f8f9fa] hover:text-[#343a40]"
                     >
                        <X size={16} />
                     </button>
                  </div>

                  <div className="flex-1 overflow-y-auto bg-white px-4 py-3">
                     <div className="space-y-4">
                        <section>
                           <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6c757d]">
                              1. Thông tin nhận diện chứng từ
                           </div>
                           <div className="grid grid-cols-1 gap-x-5 gap-y-3 border border-[#dee2e6] bg-white px-4 py-3 md:grid-cols-2 xl:grid-cols-4">
                              <DetailCard label="Mã chứng từ" value={selectedInvoice.code} />
                              <DetailCard
                                 label="Loại chứng từ"
                                 value={DOCUMENT_TYPE_LABELS[selectedInvoice.documentType || ReceiptDocumentType.PAYMENT_RECEIPT]}
                              />
                              <DetailCard label="Ngày lập" value={formatDate(selectedInvoice.issueDate)} />
                              <DetailCard label="Trạng thái" value={STATUS_META[selectedInvoiceWorkflowStatus].label} />
                           </div>
                        </section>

                        <section>
                           <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6c757d]">
                              2. Đối tượng liên quan
                           </div>
                           <div className="grid grid-cols-1 gap-x-5 gap-y-3 border border-[#dee2e6] bg-white px-4 py-3 md:grid-cols-2 xl:grid-cols-3">
                              <DetailCard label="Học viên / Khách hàng" value={selectedInvoice.customerName} />
                              <DetailCard label="Hợp đồng" value={selectedInvoice.contractCode} />
                              <DetailCard label="Người phụ trách" value={selectedInvoice.ownerName} />
                              <DetailCard label="Chi nhánh" value={selectedInvoice.branchName} />
                              <DetailCard label="Chương trình / gói dịch vụ" value={selectedInvoice.programName} />
                              <DetailCard label="Email khách hàng" value={selectedInvoice.customerEmail} />
                           </div>
                        </section>

                        <section>
                           <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6c757d]">
                              3. Thông tin tiền
                           </div>
                           <div className="grid grid-cols-1 gap-x-5 gap-y-3 border border-[#dee2e6] bg-white px-4 py-3 md:grid-cols-2 xl:grid-cols-3">
                              <DetailCard
                                 label="Số tiền"
                                 value={formatCurrency(selectedInvoice.totalAmount, selectedInvoice.currency)}
                              />
                              <DetailCard label="Loại tiền" value={selectedInvoice.currency} />
                              <DetailCard label="Ngày thanh toán" value={formatDate(selectedInvoice.paymentDate)} />
                              <DetailCard label="Nội dung thanh toán" value={selectedInvoice.description} className="xl:col-span-2" />
                              <DetailCard label="Hình thức thanh toán" value={selectedInvoice.paymentMethod} />
                              <DetailCard
                                 label={
                                    selectedInvoice.documentType === ReceiptDocumentType.PAYMENT_VOUCHER
                                       ? 'Tài khoản chi'
                                       : 'Tài khoản nhận'
                                 }
                                 value={selectedInvoice.accountName}
                              />
                           </div>
                        </section>

                        <section>
                           <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6c757d]">
                              4. Liên kết chứng từ gốc
                           </div>
                           <div className="grid grid-cols-1 gap-x-5 gap-y-3 border border-[#dee2e6] bg-white px-4 py-3 md:grid-cols-2">
                              <DetailCard label="Mã giao dịch duyệt" value={selectedInvoice.approvedTransactionCode} />
                              <DetailCard label="Mã thu chi" value={selectedInvoice.cashFlowCode} />
                              <DetailCard
                                 label="Số chứng từ ngân hàng / UNC"
                                 value={selectedInvoice.bankReference}
                                 className="md:col-span-2"
                              />
                              <div className="border-b border-[#dee2e6] pb-2 md:col-span-2">
                                 <div className="text-[12px] font-medium leading-4 text-[#666666]">File đính kèm</div>
                                 <div className="mt-1 text-[13px] leading-5 text-[#333333]">
                                    {selectedInvoice.attachments && selectedInvoice.attachments.length > 0
                                       ? selectedInvoice.attachments.map((attachment) => attachment.name).join(', ')
                                       : 'Chưa có file đính kèm'}
                                 </div>
                              </div>
                              <div className="border-b border-[#dee2e6] pb-2 md:col-span-2">
                                 <div className="text-[12px] font-medium leading-4 text-[#666666]">Ghi chú</div>
                                 <div className="mt-1 whitespace-pre-wrap text-[13px] leading-5 text-[#333333]">
                                    {selectedInvoice.note || '--'}
                                 </div>
                              </div>
                           </div>
                        </section>
                     </div>
                  </div>

                  <div className="hidden flex-1 overflow-y-auto bg-slate-50 px-4 py-4 sm:px-6 sm:py-5">
                     <div className="grid gap-4 xl:grid-cols-2">
                     <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/50 sm:p-5">
                        <div className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
                           1. Thông tin nhận diện chứng từ
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                           <DetailCard label="Mã chứng từ" value={selectedInvoice.code} icon={FileText} />
                           <DetailCard
                              label="Loại chứng từ"
                              value={DOCUMENT_TYPE_LABELS[selectedInvoice.documentType || ReceiptDocumentType.PAYMENT_RECEIPT]}
                              icon={FileStack}
                           />
                           <DetailCard label="Ngày lập" value={formatDate(selectedInvoice.issueDate)} icon={CalendarDays} />
                           <DetailCard
                              label="Trạng thái"
                               value={STATUS_META[selectedInvoiceWorkflowStatus].label}
                               icon={CheckCircle2}
                            />
                        </div>
                     </section>

                     <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/50 sm:p-5">
                        <div className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
                           2. Đối tượng liên quan
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                           <DetailCard label="Học viên / Khách hàng" value={selectedInvoice.customerName} icon={UserRound} />
                           <DetailCard label="Hợp đồng" value={selectedInvoice.contractCode} icon={FileText} />
                           <DetailCard label="Người phụ trách" value={selectedInvoice.ownerName} icon={UserRound} />
                           <DetailCard label="Chi nhánh" value={selectedInvoice.branchName} icon={Building2} />
                           <DetailCard
                              label="Chương trình / gói dịch vụ"
                              value={selectedInvoice.programName}
                              icon={FileStack}
                           />
                           <DetailCard label="Mã SO liên kết" value={selectedInvoice.soCode} icon={FileText} />
                        </div>
                     </section>

                     <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/50 sm:p-5">
                        <div className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
                           3. Thông tin tiền
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                           <DetailCard
                              label="Số tiền"
                              value={formatCurrency(selectedInvoice.totalAmount, selectedInvoice.currency)}
                              icon={Wallet}
                           />
                           <DetailCard label="Loại tiền" value={selectedInvoice.currency} icon={Wallet} />
                           <DetailCard label="Nội dung thanh toán" value={selectedInvoice.description} icon={NotebookText} />
                           <DetailCard label="Hình thức thanh toán" value={selectedInvoice.paymentMethod} icon={Landmark} />
                           <DetailCard label="Ngày thanh toán" value={formatDate(selectedInvoice.paymentDate)} icon={CalendarDays} />
                           <DetailCard
                              label={
                                 selectedInvoice.documentType === ReceiptDocumentType.PAYMENT_VOUCHER
                                    ? 'Tài khoản chi'
                                    : 'Tài khoản nhận'
                              }
                              value={selectedInvoice.accountName}
                              icon={Landmark}
                           />
                        </div>
                     </section>

                     <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/50 sm:p-5">
                        <div className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
                           4. Liên kết chứng từ gốc
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                           <DetailCard
                              label="Mã giao dịch duyệt"
                              value={selectedInvoice.approvedTransactionCode}
                              icon={CheckCircle2}
                           />
                           <DetailCard label="Mã thu chi" value={selectedInvoice.cashFlowCode} icon={Wallet} />
                           <DetailCard label="Số chứng từ ngân hàng / UNC" value={selectedInvoice.bankReference} icon={Landmark} />
                           <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm shadow-slate-200/40 sm:col-span-2">
                              <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                                 <Paperclip size={14} className="text-slate-400" />
                                 File đính kèm
                              </div>
                              {selectedInvoice.attachments && selectedInvoice.attachments.length > 0 ? (
                                 <div className="space-y-2">
                                    {selectedInvoice.attachments.map((attachment) => (
                                       <div key={attachment.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                                          {attachment.name}
                                       </div>
                                    ))}
                                 </div>
                              ) : (
                                 <div className="text-sm font-semibold text-slate-500">Chưa có file đính kèm</div>
                              )}
                           </div>
                        </div>
                        <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm shadow-slate-200/40">
                           <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                              <NotebookText size={14} className="text-slate-400" />
                              Ghi chú
                           </div>
                           <div className="whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-800">
                              {selectedInvoice.note || '--'}
                           </div>
                        </div>
                     </section>
                     </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-[#dee2e6] bg-[#f8f9fa] px-4 py-2 text-[12px] text-[#6c757d]">
                     <div className="truncate">
                        Người lập: {selectedInvoice.createdBy || '--'} | Thanh toán: {formatDate(selectedInvoice.paymentDate)} | In phiếu: {formatDate(selectedInvoice.receiptPrintedAt)}
                     </div>
                     <button
                        onClick={() => setSelectedInvoiceId(null)}
                        className="rounded-sm border border-[#dee2e6] bg-white px-3 py-1.5 text-[12px] font-medium text-[#495057] transition-colors hover:bg-white"
                     >
                        Đóng
                     </button>
                  </div>

                  </aside>
               </div>
             </>
          )}

          {showEditModal && editInvoice && (
             <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-900/40 backdrop-blur-sm">
                <div className="flex min-h-full items-center justify-center p-4">
                   <div
                      className="w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl"
                      onClick={(event) => event.stopPropagation()}
                   >
                      <div className="border-b border-slate-200 px-6 py-4">
                         <div className="flex items-start justify-between gap-4">
                            <div>
                               <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Chỉnh sửa phiếu</p>
                               <h3 className="mt-1 text-xl font-bold text-slate-900">{editInvoice.code}</h3>
                               <p className="mt-1 text-sm text-slate-500">
                                  Chỉ cho phép cập nhật người nộp/nhận tiền, thông tin hiển thị, diễn giải, file đính kèm và ghi chú.
                               </p>
                            </div>
                            <button
                               type="button"
                               onClick={closeEditInvoiceModal}
                               className="rounded-lg border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
                            >
                               <X size={18} />
                            </button>
                         </div>
                      </div>

                      <div className="max-h-[calc(100vh-10rem)] space-y-5 overflow-y-auto px-6 py-5">
                         <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                               <label className="mb-1 block text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                                  Người nộp / nhận tiền
                               </label>
                               <input
                                  className="w-full rounded border border-slate-300 px-3 py-2.5 text-sm text-slate-800"
                                  value={editInvoiceData.payerName}
                                  onChange={(event) =>
                                     setEditInvoiceData((prev) => ({ ...prev, payerName: event.target.value }))
                                  }
                                  placeholder="Nhập người nộp hoặc người nhận tiền"
                               />
                            </div>
                            <div>
                               <label className="mb-1 block text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                                  Người liên hệ
                               </label>
                               <input
                                  className="w-full rounded border border-slate-300 px-3 py-2.5 text-sm text-slate-800"
                                  value={editInvoiceData.contactPerson}
                                  onChange={(event) =>
                                     setEditInvoiceData((prev) => ({ ...prev, contactPerson: event.target.value }))
                                  }
                                  placeholder="Nhập người liên hệ"
                               />
                            </div>
                         </div>

                         <div>
                            <label className="mb-1 block text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                               Địa chỉ / thông tin hiển thị
                            </label>
                            <textarea
                               rows={2}
                               className="w-full rounded border border-slate-300 px-3 py-2.5 text-sm text-slate-800"
                               value={editInvoiceData.displayAddress}
                               onChange={(event) =>
                                  setEditInvoiceData((prev) => ({ ...prev, displayAddress: event.target.value }))
                               }
                               placeholder="Nhập địa chỉ hoặc thông tin hiển thị trên phiếu"
                            />
                         </div>

                         <div>
                            <label className="mb-1 block text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                               Nội dung diễn giải
                            </label>
                            <textarea
                               rows={3}
                               className="w-full rounded border border-slate-300 px-3 py-2.5 text-sm text-slate-800"
                               value={editInvoiceData.description}
                               onChange={(event) =>
                                  setEditInvoiceData((prev) => ({ ...prev, description: event.target.value }))
                               }
                               placeholder="Nhập nội dung diễn giải trên phiếu"
                            />
                         </div>

                         <div>
                            <label className="mb-1 block text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                               File đính kèm
                            </label>
                            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-3">
                               <input
                                  type="file"
                                  accept={DEFAULT_ATTACHMENT_ACCEPT}
                                  multiple
                                  onChange={(event) => {
                                     handleEditAttachmentSelect(event.target.files);
                                     event.currentTarget.value = '';
                                  }}
                                  className="block h-[32px] w-full text-sm text-slate-600 file:mr-3 file:h-[32px] file:rounded file:border-0 file:bg-indigo-600 file:px-3 file:py-0 file:font-semibold file:text-white hover:file:bg-indigo-700"
                               />
                               {editInvoiceData.attachments.length > 0 && (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                     {editInvoiceData.attachments.map((attachment) => (
                                        <span
                                           key={attachment.id}
                                           className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
                                        >
                                           {attachment.name}
                                           <button
                                              type="button"
                                              onClick={() => handleRemoveEditAttachment(attachment.id)}
                                              className="text-slate-400 hover:text-slate-600"
                                           >
                                              <X size={12} />
                                           </button>
                                        </span>
                                     ))}
                                  </div>
                               )}
                            </div>
                         </div>

                         <div>
                            <label className="mb-1 block text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                               Ghi chú
                            </label>
                            <textarea
                               rows={3}
                               className="w-full rounded border border-slate-300 px-3 py-2.5 text-sm text-slate-800"
                               value={editInvoiceData.note}
                               onChange={(event) =>
                                  setEditInvoiceData((prev) => ({ ...prev, note: event.target.value }))
                               }
                               placeholder="Ghi chú nội bộ trên phiếu thu / phiếu chi"
                            />
                         </div>
                      </div>

                      <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
                         <button
                            type="button"
                            onClick={closeEditInvoiceModal}
                            className="rounded-lg border border-slate-200 px-4 py-2 font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                         >
                            Hủy
                         </button>
                         <button
                            type="button"
                            onClick={handleSaveInvoiceEdits}
                            className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-indigo-700"
                         >
                            Lưu chỉnh sửa
                         </button>
                      </div>
                   </div>
                </div>
             </div>
          )}

          {showCreateModal && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm">
               <div className="flex min-h-full items-start justify-center p-4 sm:p-6">
                  <div className="my-4 w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl">
                     <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                        <h3 className="text-xl font-bold text-slate-900">Tạo phiếu mới</h3>
                        <button onClick={resetCreateForm}>
                           <X className="text-slate-400 transition-colors hover:text-slate-600" />
                        </button>
                     </div>

                     <div className="max-h-[calc(100vh-8rem)] space-y-5 overflow-y-auto px-6 py-5">
                        <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4">
                           <label className="mb-2 block text-sm font-bold text-indigo-900">Liên kết đơn hàng (tùy chọn)</label>
                           <select
                              className="w-full rounded border border-indigo-200 bg-white p-2 text-sm"
                              value={selectedSO}
                              onChange={(event) => handleSelectSO(event.target.value)}
                           >
                              <option value="">-- Chọn đơn hàng để tự động điền --</option>
                              {lockedSOs.map((so) => (
                                 <option key={so.id} value={so.id}>
                                    {so.soCode} - {so.customerName} ({formatCurrency(so.finalAmount || 0)})
                                 </option>
                              ))}
                           </select>
                        </div>

                        <section>
                           <div className="mb-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                              1. Nhóm 1 — Thông tin nhận diện chứng từ
                           </div>
                           <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4 md:grid-cols-2 xl:grid-cols-4">
                              <div className="md:col-span-3">
                                 <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Mã chứng từ</label>
                                 <input className="w-full rounded border border-slate-300 bg-slate-100 p-2 text-slate-600" value={previewDocumentCode} disabled />
                              </div>
                              <div className="md:col-span-3">
                                 <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Loại chứng từ</label>
                                 <select
                                    className="w-full rounded border border-slate-300 p-2"
                                    value={currentFormDocumentType}
                                    onChange={(event) =>
                                       setNewInvoiceData((prev) => ({
                                          ...prev,
                                          documentType: event.target.value as ReceiptDocumentType
                                       }))
                                    }
                                 >
                                    <option value={ReceiptDocumentType.PAYMENT_RECEIPT}>Phiếu thu</option>
                                    <option value={ReceiptDocumentType.PAYMENT_VOUCHER}>Phiếu chi</option>
                                 </select>
                              </div>
                              <div className="md:col-span-2">
                                 <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Ngày lập</label>
                                 <input
                                    type="date"
                                    className="w-full rounded border border-slate-300 p-2"
                                    value={String(newInvoiceData.issueDate || '').slice(0, 10)}
                                    onChange={(event) =>
                                       setNewInvoiceData((prev) => ({ ...prev, issueDate: event.target.value }))
                                    }
                                 />
                              </div>
                              <div className="md:col-span-2">
                                 <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Trạng thái</label>
                                 <input className="w-full rounded border border-slate-300 bg-slate-100 p-2 text-slate-600" value="Nháp" disabled />
                              </div>
                           </div>
                        </section>

                        <section>
                           <div className="mb-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                              2. Nhóm 2 — Đối tượng liên quan
                           </div>
                           <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4 md:grid-cols-6">
                              <div className="md:col-span-3">
                                 <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Học viên / Khách hàng</label>
                                 <input
                                    className="w-full rounded border border-slate-300 p-2 font-medium text-slate-900"
                                    value={newInvoiceData.customerName || ''}
                                    onChange={(event) =>
                                       setNewInvoiceData((prev) => ({ ...prev, customerName: event.target.value }))
                                    }
                                    placeholder="Nhập tên khách hàng hoặc đối tượng"
                                 />
                              </div>
                              <div className="md:col-span-3">
                                 <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Hợp đồng</label>
                                 <input
                                    className="w-full rounded border border-slate-300 p-2"
                                    value={newInvoiceData.contractCode || ''}
                                    onChange={(event) =>
                                       setNewInvoiceData((prev) => ({ ...prev, contractCode: event.target.value }))
                                    }
                                    placeholder="Ví dụ: HD-00001"
                                 />
                              </div>
                              <div className="md:col-span-2">
                                 <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Người phụ trách</label>
                                 <input
                                    className="w-full rounded border border-slate-300 p-2"
                                    value={newInvoiceData.ownerName || ''}
                                    onChange={(event) =>
                                       setNewInvoiceData((prev) => ({ ...prev, ownerName: event.target.value }))
                                    }
                                    placeholder="Nhập người phụ trách"
                                 />
                              </div>
                              <div className="md:col-span-2">
                                 <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Chi nhánh</label>
                                 <input
                                    className="w-full rounded border border-slate-300 p-2"
                                    value={newInvoiceData.branchName || ''}
                                    onChange={(event) =>
                                       setNewInvoiceData((prev) => ({ ...prev, branchName: event.target.value }))
                                    }
                                    placeholder="Nhập chi nhánh"
                                 />
                              </div>
                              <div className="md:col-span-2">
                                 <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Chương trình / gói dịch vụ</label>
                                 <input
                                    className="w-full rounded border border-slate-300 p-2"
                                    value={newInvoiceData.programName || ''}
                                    onChange={(event) =>
                                       setNewInvoiceData((prev) => ({ ...prev, programName: event.target.value }))
                                    }
                                    placeholder="Nhập chương trình hoặc gói dịch vụ"
                                 />
                              </div>
                           </div>
                        </section>

                        <section>
                           <div className="mb-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                              3. Nhóm 3 — Thông tin tiền
                           </div>
                           <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4 md:grid-cols-2 xl:grid-cols-3">
                              <div>
                                 <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Số tiền</label>
                                 <input
                                    type="number"
                                    min={0}
                                    className="w-full rounded border border-slate-300 p-2 font-bold text-slate-900"
                                    value={newInvoiceData.totalAmount || ''}
                                    onChange={(event) =>
                                       setNewInvoiceData((prev) => ({
                                          ...prev,
                                          totalAmount: Number(event.target.value)
                                       }))
                                    }
                                    placeholder="0"
                                 />
                              </div>
                              <div>
                                 <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Loại tiền</label>
                                 <select
                                    className="w-full rounded border border-slate-300 p-2"
                                    value={newInvoiceData.currency || 'VND'}
                                    onChange={(event) =>
                                       setNewInvoiceData((prev) => ({ ...prev, currency: event.target.value }))
                                    }
                                 >
                                    <option value="VND">VND</option>
                                    <option value="USD">USD</option>
                                 </select>
                              </div>
                              <div>
                                 <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Hình thức thanh toán</label>
                                 <select
                                    className="w-full rounded border border-slate-300 p-2"
                                    value={newInvoiceData.paymentMethod || 'Chuyển khoản'}
                                    onChange={(event) =>
                                       setNewInvoiceData((prev) => ({ ...prev, paymentMethod: event.target.value }))
                                    }
                                 >
                                    <option value="Chuyển khoản">Chuyển khoản</option>
                                    <option value="Tiền mặt">Tiền mặt</option>
                                    <option value="Thẻ">Thẻ</option>
                                    <option value="Khác">Khác</option>
                                 </select>
                              </div>
                              <div>
                                 <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Ngày thanh toán</label>
                                 <input
                                    type="date"
                                    className="w-full rounded border border-slate-300 p-2"
                                    value={String(newInvoiceData.paymentDate || '').slice(0, 10)}
                                    onChange={(event) =>
                                       setNewInvoiceData((prev) => ({ ...prev, paymentDate: event.target.value }))
                                    }
                                 />
                              </div>
                              <div>
                                 <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Tài khoản nhận / chi</label>
                                 <input
                                    className="w-full rounded border border-slate-300 p-2"
                                    value={newInvoiceData.accountName || ''}
                                    onChange={(event) =>
                                       setNewInvoiceData((prev) => ({ ...prev, accountName: event.target.value }))
                                    }
                                    placeholder="Ví dụ: VCB - 1900123456"
                                 />
                              </div>
                              {currentFormDocumentType === ReceiptDocumentType.PAYMENT_RECEIPT && (
                                 <div className="mt-[22px] flex h-[46px] items-center self-start rounded-lg border border-slate-200 bg-white px-3">
                                    <label className="flex items-center gap-2 text-[13px] font-medium leading-4 text-slate-700">
                                       <input
                                          type="checkbox"
                                          className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                                          checked={Boolean(newInvoiceData.requiresTaxInvoice)}
                                          onChange={(event) =>
                                             setNewInvoiceData((prev) => ({
                                                ...prev,
                                                requiresTaxInvoice: event.target.checked
                                             }))
                                          }
                                       />
                                       Có xuất hóa đơn kèm phiếu thu
                                    </label>
                                 </div>
                              )}
                              <div className="xl:col-span-3">
                                 <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Nội dung thanh toán</label>
                                 <textarea
                                    className="min-h-[110px] w-full rounded border border-slate-300 p-3 text-sm text-slate-700"
                                    value={newInvoiceData.description || ''}
                                    onChange={(event) =>
                                       setNewInvoiceData((prev) => ({ ...prev, description: event.target.value }))
                                    }
                                    placeholder="Ví dụ: Thu học phí khóa IELTS Intensive tháng 03/2026"
                                 />
                              </div>
                           </div>
                        </section>

                        <section>
                           <div className="mb-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                              4. Nhóm 4 — Liên kết chứng từ gốc
                           </div>
                           <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4 md:grid-cols-2">
                              <div>
                                 <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Mã giao dịch duyệt</label>
                                 <input
                                    className="w-full rounded border border-slate-300 p-2"
                                    value={newInvoiceData.approvedTransactionCode || ''}
                                    onChange={(event) =>
                                       setNewInvoiceData((prev) => ({
                                          ...prev,
                                          approvedTransactionCode: event.target.value
                                       }))
                                    }
                                    placeholder="Ví dụ: GD-00001"
                                 />
                              </div>
                              <div>
                                 <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Mã thu chi</label>
                                 <input
                                    className="w-full rounded border border-slate-300 p-2"
                                    value={newInvoiceData.cashFlowCode || ''}
                                    onChange={(event) =>
                                       setNewInvoiceData((prev) => ({ ...prev, cashFlowCode: event.target.value }))
                                    }
                                    placeholder="Ví dụ: THU-00001 / CHI-00001"
                                 />
                              </div>
                              <div>
                                 <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Số chứng từ ngân hàng / UNC</label>
                                 <input
                                    className="w-full rounded border border-slate-300 p-2"
                                    value={newInvoiceData.bankReference || ''}
                                    onChange={(event) =>
                                       setNewInvoiceData((prev) => ({ ...prev, bankReference: event.target.value }))
                                    }
                                    placeholder="Nhập số chứng từ ngân hàng hoặc UNC"
                                 />
                              </div>
                              <div className="self-start">
                                 <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                                    {newInvoiceData.requiresTaxInvoice ? 'File hóa đơn / hồ sơ đính kèm' : 'File đính kèm'}
                                 </label>
                                 <div className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2">
                                     <input
                                        type="file"
                                        accept={DEFAULT_ATTACHMENT_ACCEPT}
                                        multiple
                                        onChange={(event) => {
                                          handleAttachmentSelect(event.target.files);
                                          event.currentTarget.value = '';
                                       }}
                                       className="block h-[30px] w-full text-sm text-slate-600 file:mr-3 file:h-[30px] file:rounded file:border-0 file:bg-indigo-600 file:px-3 file:py-0 file:font-semibold file:text-white hover:file:bg-indigo-700"
                                    />
                                    {newInvoiceData.attachments && newInvoiceData.attachments.length > 0 && (
                                       <div className="mt-3 flex flex-wrap gap-2">
                                          {newInvoiceData.attachments.map((attachment) => (
                                             <span
                                                key={attachment.id}
                                                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
                                             >
                                                {attachment.name}
                                                <button
                                                   type="button"
                                                   onClick={() => handleRemoveAttachment(attachment.id)}
                                                   className="text-slate-400 hover:text-slate-600"
                                                >
                                                   <X size={12} />
                                                </button>
                                             </span>
                                          ))}
                                       </div>
                                    )}
                                 </div>
                              </div>
                              <div className="md:col-span-2">
                                 <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Ghi chú</label>
                                 <textarea
                                    className="min-h-[90px] w-full rounded border border-slate-300 p-3 text-sm text-slate-700"
                                    value={newInvoiceData.note || ''}
                                    onChange={(event) =>
                                       setNewInvoiceData((prev) => ({ ...prev, note: event.target.value }))
                                    }
                                    placeholder="Thông tin thêm về UNC, chứng từ ngân hàng, người liên quan..."
                                 />
                              </div>
                           </div>
                        </section>

                        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                           <button
                              onClick={resetCreateForm}
                              className="rounded px-4 py-2 font-bold text-slate-600 transition-colors hover:bg-slate-100"
                           >
                              Hủy
                           </button>
                           {currentFormDocumentType === ReceiptDocumentType.PAYMENT_RECEIPT && (
                               <button
                                  onClick={() => handleCreateInvoice({ printAfterCreate: true })}
                                  className="rounded border border-slate-300 bg-white px-4 py-2 font-bold text-slate-700 transition-colors hover:bg-slate-50"
                               >
                                  Lưu nháp và in
                               </button>
                            )}
                           {currentFormDocumentType === ReceiptDocumentType.PAYMENT_VOUCHER && (
                               <button
                                  onClick={() => handleCreateInvoice({ printAfterCreate: true })}
                                  className="rounded border border-slate-300 bg-white px-4 py-2 font-bold text-slate-700 transition-colors hover:bg-slate-50"
                               >
                                  Lưu nháp và in
                               </button>
                            )}
                            <button
                               onClick={() => handleCreateInvoice()}
                               className="rounded bg-indigo-600 px-4 py-2 font-bold text-white shadow-md transition-colors hover:bg-indigo-700"
                            >
                               Lưu nháp
                            </button>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};

export default FinanceInvoices;
