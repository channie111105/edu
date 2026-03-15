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
   Mail,
   NotebookText,
   Paperclip,
   Plus,
   Printer,
   Send,
   UserRound,
   Wallet,
   X
} from 'lucide-react';
import { IInvoice, IQuotation, InvoiceStatus, ReceiptDocumentType, UserRole } from '../types';
import { addInvoice, getInvoices, getQuotations, saveInvoices, updateInvoice } from '../utils/storage';
import { useAuth } from '../contexts/AuthContext';
import PinnedSearchInput, { PinnedSearchChip } from '../components/PinnedSearchInput';

type InvoiceTab = 'ALL' | InvoiceStatus;

const ALL_TAB: InvoiceTab = 'ALL';

const EMPTY_FORM = (): Partial<IInvoice> => ({
   documentType: ReceiptDocumentType.PAYMENT_RECEIPT,
   customerName: '',
   description: '',
   totalAmount: 0,
   issueDate: new Date().toISOString().slice(0, 10),
   paymentDate: new Date().toISOString().slice(0, 10),
   currency: 'VND',
   paymentMethod: 'Chuyển khoản',
   accountName: '',
   customerEmail: '',
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
      label: 'Đã phát hành',
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200'
   },
   [InvoiceStatus.SENT_TO_CUSTOMER]: {
      label: 'Đã gửi khách',
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

const normalizeStatus = (status: unknown): InvoiceStatus => {
   if (Object.values(InvoiceStatus).includes(status as InvoiceStatus)) {
      return status as InvoiceStatus;
   }

   const token = normalizeToken(status);

   if (!token || token === 'draft' || token === 'nhap') return InvoiceStatus.DRAFT;
   if (
      token === 'issued' ||
      token === 'printed' ||
      token === 'da phat hanh' ||
      token === 'da in'
   ) {
      return InvoiceStatus.ISSUED;
   }
   if (
      token === 'sent' ||
      token === 'sent_to_customer' ||
      token === 'da gui' ||
      token === 'da gui email' ||
      token === 'da gui khach'
   ) {
      return InvoiceStatus.SENT_TO_CUSTOMER;
   }
   if (token === 'cancelled' || token === 'da huy' || token === 'da huy bo') {
      return InvoiceStatus.CANCELLED;
   }

   return InvoiceStatus.DRAFT;
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

const STATUS_FLOW: Array<{ status: InvoiceStatus; label: string }> = [
   { status: InvoiceStatus.DRAFT, label: 'Nháp' },
   { status: InvoiceStatus.ISSUED, label: 'Phát hành' },
   { status: InvoiceStatus.SENT_TO_CUSTOMER, label: 'Gửi khách' },
   { status: InvoiceStatus.CANCELLED, label: 'Hủy' }
];

const getStatusClipPath = (index: number, total: number) => {
   if (total === 1) return 'polygon(0 0, 100% 0, 100% 100%, 0 100%)';
   if (index === 0) return 'polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%)';
   if (index === total - 1) return 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 10px 50%)';
   return 'polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%, 10px 50%)';
};

const StatusArrowBar = ({ status }: { status: InvoiceStatus }) => {
   const activeIndex = STATUS_FLOW.findIndex((step) => step.status === status);
   const isCancelled = status === InvoiceStatus.CANCELLED;

   return (
      <div className="flex flex-wrap items-center justify-end text-[11px] font-semibold uppercase tracking-[0.04em] text-[#495057]">
         {STATUS_FLOW.map((step, index) => {
            const isCurrent = step.status === status;
            const isComplete = !isCancelled && activeIndex > index;
            const className = isCurrent
               ? step.status === InvoiceStatus.CANCELLED
                  ? 'border-[#f1aeb5] bg-[#f8d7da] text-[#b42318]'
                  : 'border-[#9ec5fe] bg-[#e7f1ff] text-[#0d6efd]'
               : isComplete
                  ? 'border-[#badbcc] bg-[#d1e7dd] text-[#146c43]'
                  : 'border-[#dee2e6] bg-white text-[#6c757d]';

            return (
               <div key={step.status} className={index === 0 ? '' : '-ml-2'}>
                  <div
                     className={`px-4 py-1.5 ${className}`}
                     style={{ clipPath: getStatusClipPath(index, STATUS_FLOW.length) }}
                  >
                     {step.label}
                  </div>
               </div>
            );
         })}
      </div>
   );
};

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

const buildReceiptEmailBody = (invoice: IInvoice) =>
   [
      `Kính gửi ${invoice.customerName || 'Quý khách'},`,
      '',
      `EduCRM gửi ${DOCUMENT_TYPE_LABELS[invoice.documentType || ReceiptDocumentType.PAYMENT_RECEIPT].toLowerCase()} ${invoice.code}.`,
      `Số tiền: ${formatCurrency(invoice.totalAmount, invoice.currency)}`,
      `Ngày thanh toán: ${formatDate(invoice.paymentDate)}`,
      `Nội dung: ${invoice.description || '--'}`,
      `Xuất hóa đơn: ${invoice.requiresTaxInvoice ? 'Có' : 'Không'}`,
      invoice.attachments && invoice.attachments.length > 0
         ? `Tệp đính kèm: ${invoice.attachments.map((attachment) => attachment.name).join(', ')}`
         : 'Tệp đính kèm: Không',
      '',
      'Trân trọng.'
   ].join('\n');

const FinanceInvoices: React.FC = () => {
   const { user } = useAuth();
   const [invoices, setInvoices] = useState<IInvoice[]>([]);
   const [activeTab, setActiveTab] = useState<InvoiceTab>(ALL_TAB);
   const [showCreateModal, setShowCreateModal] = useState(false);
   const [searchTerm, setSearchTerm] = useState('');
   const [newInvoiceData, setNewInvoiceData] = useState<Partial<IInvoice>>(EMPTY_FORM);
   const [selectedSO, setSelectedSO] = useState('');
   const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

   const quotations = useMemo(() => (getQuotations() || []) as IQuotation[], []);

   useEffect(() => {
      const storedInvoices = (getInvoices() || []) as Partial<IInvoice>[];
      const normalizedInvoices = storedInvoices.map((invoice, index) =>
         normalizeInvoice(invoice, index, quotations)
      );
      setInvoices(normalizedInvoices);

      if (JSON.stringify(storedInvoices) !== JSON.stringify(normalizedInvoices)) {
         saveInvoices(normalizedInvoices);
      }
   }, [quotations]);

   const selectedInvoice = useMemo(
      () => invoices.find((invoice) => invoice.id === selectedInvoiceId) || null,
      [invoices, selectedInvoiceId]
   );

   const lockedSOs = useMemo(
      () => quotations.filter((quotation) => quotation.status === 'Locked' || quotation.status === 'Sale Order'),
      [quotations]
   );

   const tabLabelMap: Record<InvoiceTab, string> = {
      [ALL_TAB]: 'Tất cả',
      [InvoiceStatus.DRAFT]: STATUS_META[InvoiceStatus.DRAFT].label,
      [InvoiceStatus.ISSUED]: STATUS_META[InvoiceStatus.ISSUED].label,
      [InvoiceStatus.SENT_TO_CUSTOMER]: STATUS_META[InvoiceStatus.SENT_TO_CUSTOMER].label,
      [InvoiceStatus.CANCELLED]: STATUS_META[InvoiceStatus.CANCELLED].label
   };

   const activeSearchChips = useMemo<PinnedSearchChip[]>(() => {
      if (activeTab === ALL_TAB) return [];
      return [{ key: 'status', label: `Trạng thái: ${tabLabelMap[activeTab]}` }];
   }, [activeTab]);

   const filteredData = useMemo(() => {
      const keyword = normalizeToken(searchTerm);

      return invoices.filter((invoice) => {
         const matchesTab = activeTab === ALL_TAB || invoice.status === activeTab;
         const matchesSearch =
            !keyword ||
            normalizeToken(invoice.code).includes(keyword) ||
            normalizeToken(invoice.customerName).includes(keyword) ||
            normalizeToken(invoice.description).includes(keyword) ||
            normalizeToken(DOCUMENT_TYPE_LABELS[invoice.documentType || ReceiptDocumentType.PAYMENT_RECEIPT]).includes(keyword);

         return matchesTab && matchesSearch;
      });
   }, [activeTab, invoices, searchTerm]);

   const resetCreateForm = () => {
      setNewInvoiceData(EMPTY_FORM());
      setSelectedSO('');
      setShowCreateModal(false);
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
      setInvoices((prev) => [newDocument, ...prev]);
      setSelectedInvoiceId(newDocument.id);
      if (options?.printAfterCreate && documentType === ReceiptDocumentType.PAYMENT_RECEIPT) {
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

   const handleUpdateStatus = (status: InvoiceStatus) => {
      if (!selectedInvoice) return;
      const updatedInvoice = normalizeInvoice({ ...selectedInvoice, status }, 0, quotations);
      persistInvoiceUpdate(updatedInvoice);
   };

   const handleAttachmentSelect = (files: FileList | null) => {
      const nextAttachments = createAttachmentRecords(files);
      if (!nextAttachments.length) return;

      setNewInvoiceData((prev) => ({
         ...prev,
         attachments: [...(prev.attachments || []), ...nextAttachments]
      }));
   };

   const handleRemoveAttachment = (attachmentId: string) => {
      setNewInvoiceData((prev) => ({
         ...prev,
         attachments: (prev.attachments || []).filter((attachment) => attachment.id !== attachmentId)
      }));
   };

   const handlePrintReceipt = (invoice: IInvoice) => {
      const printWindow = window.open('', '_blank', 'width=960,height=720');
      if (!printWindow) return;

      printWindow.document.write(buildReceiptPrintHtml(invoice));
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

   const handleSendReceiptEmail = (invoice: IInvoice) => {
      if (!invoice.customerEmail?.trim()) {
         window.alert('Vui lòng cập nhật email khách hàng trước khi gửi phiếu thu.');
         return;
      }

      const subject = encodeURIComponent(`${DOCUMENT_TYPE_LABELS[invoice.documentType || ReceiptDocumentType.PAYMENT_RECEIPT]} ${invoice.code}`);
      const body = encodeURIComponent(buildReceiptEmailBody(invoice));
      window.location.href = `mailto:${invoice.customerEmail}?subject=${subject}&body=${body}`;

      persistInvoiceUpdate(
         normalizeInvoice(
            {
               ...invoice,
               status: InvoiceStatus.SENT_TO_CUSTOMER,
               receiptEmailedAt: new Date().toISOString()
            },
            0,
            quotations
         )
      );
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
                     Nhấn vào từng chứng từ để xem đầy đủ thông tin nhận diện, đối tượng, tiền và liên kết gốc.
                  </p>
               </div>

               {user?.role === UserRole.ACCOUNTANT && (
                  <button
                     onClick={() => setShowCreateModal(true)}
                     className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 font-bold text-white shadow-sm transition-colors hover:bg-indigo-700"
                  >
                     <Plus size={18} />
                     Tạo chứng từ
                  </button>
               )}
            </div>

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
                  <button
                     onClick={() => setActiveTab(InvoiceStatus.ISSUED)}
                     className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
                        activeTab === InvoiceStatus.ISSUED ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                     }`}
                  >
                     {STATUS_META[InvoiceStatus.ISSUED].label}
                  </button>
                  <button
                     onClick={() => setActiveTab(InvoiceStatus.SENT_TO_CUSTOMER)}
                     className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
                        activeTab === InvoiceStatus.SENT_TO_CUSTOMER ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                     }`}
                  >
                     {STATUS_META[InvoiceStatus.SENT_TO_CUSTOMER].label}
                  </button>
                  <button
                     onClick={() => setActiveTab(InvoiceStatus.CANCELLED)}
                     className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
                        activeTab === InvoiceStatus.CANCELLED ? 'bg-red-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                     }`}
                  >
                     {STATUS_META[InvoiceStatus.CANCELLED].label}
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
                              const statusMeta = STATUS_META[invoice.status];

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
                                          {invoice.status === InvoiceStatus.ISSUED && <CheckCircle2 size={12} />}
                                          {invoice.status === InvoiceStatus.SENT_TO_CUSTOMER && <Send size={12} />}
                                          {invoice.status === InvoiceStatus.CANCELLED && <X size={12} />}
                                          {statusMeta.label}
                                       </span>
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
               <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <aside
                     className="flex max-h-[calc(100vh-32px)] w-full max-w-[980px] flex-col overflow-hidden rounded-sm border border-[#dee2e6] bg-white text-[13px] text-[#333333]"
                     style={{ fontFamily: 'Inter, Roboto, sans-serif' }}
                     onClick={(event) => event.stopPropagation()}
                  >
                  <div className="border-b border-[#dee2e6] bg-[#f8f9fa] px-4 py-2">
                     <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                           {selectedInvoice.documentType === ReceiptDocumentType.PAYMENT_RECEIPT && (
                              <>
                                 <button
                                    onClick={() => handlePrintReceipt(selectedInvoice)}
                                    className="inline-flex items-center gap-1 rounded-sm border border-[#dee2e6] bg-white px-3 py-1.5 text-[12px] font-medium text-[#495057] transition-colors hover:bg-[#f8f9fa]"
                                 >
                                    <Printer size={13} />
                                    In phiếu thu
                                 </button>
                                 <button
                                    onClick={() => handleSendReceiptEmail(selectedInvoice)}
                                    className="inline-flex items-center gap-1 rounded-sm border border-[#dee2e6] bg-white px-3 py-1.5 text-[12px] font-medium text-[#0d6efd] transition-colors hover:bg-[#f7fbff]"
                                 >
                                    <Mail size={13} />
                                    Gửi email
                                 </button>
                              </>
                           )}
                           <button
                              onClick={() => handleUpdateStatus(InvoiceStatus.ISSUED)}
                              disabled={selectedInvoice.status === InvoiceStatus.ISSUED || selectedInvoice.status === InvoiceStatus.SENT_TO_CUSTOMER || selectedInvoice.status === InvoiceStatus.CANCELLED}
                              className="rounded-sm border border-[#dee2e6] bg-white px-3 py-1.5 text-[12px] font-medium text-[#146c43] transition-colors hover:bg-[#f8fff9] disabled:cursor-not-allowed disabled:text-[#adb5bd]"
                           >
                              Phát hành
                           </button>
                           <button
                              onClick={() => handleUpdateStatus(InvoiceStatus.SENT_TO_CUSTOMER)}
                              disabled={selectedInvoice.status === InvoiceStatus.SENT_TO_CUSTOMER || selectedInvoice.status === InvoiceStatus.CANCELLED}
                              className="rounded-sm border border-[#dee2e6] bg-white px-3 py-1.5 text-[12px] font-medium text-[#0d6efd] transition-colors hover:bg-[#f7fbff] disabled:cursor-not-allowed disabled:text-[#adb5bd]"
                           >
                              Gửi khách
                           </button>
                           <button
                              onClick={() => handleUpdateStatus(InvoiceStatus.CANCELLED)}
                              disabled={selectedInvoice.status === InvoiceStatus.CANCELLED}
                              className="rounded-sm border border-[#dee2e6] bg-white px-3 py-1.5 text-[12px] font-medium text-[#b42318] transition-colors hover:bg-[#fff6f5] disabled:cursor-not-allowed disabled:text-[#adb5bd]"
                           >
                              Hủy chứng từ
                           </button>
                        </div>
                        <StatusArrowBar status={selectedInvoice.status} />
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
                              className={`hidden items-center rounded-sm border px-2 py-0.5 text-[11px] font-medium ${STATUS_META[selectedInvoice.status].className}`}
                           >
                              {STATUS_META[selectedInvoice.status].label}
                           </span>
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
                     <section>
                        <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6c757d]">
                           Thông tin chung
                        </div>
                        <div className="grid grid-cols-1 gap-x-5 gap-y-3 border border-[#dee2e6] bg-white px-4 py-3 md:grid-cols-2 xl:grid-cols-4">
                           <DetailCard label="Mã chứng từ" value={selectedInvoice.code} />
                           <DetailCard
                              label="Loại chứng từ"
                              value={DOCUMENT_TYPE_LABELS[selectedInvoice.documentType || ReceiptDocumentType.PAYMENT_RECEIPT]}
                           />
                           <DetailCard label="Ngày lập" value={formatDate(selectedInvoice.issueDate)} />
                           <DetailCard label="Trạng thái" value={STATUS_META[selectedInvoice.status].label} />
                           <DetailCard label="Học viên" value={selectedInvoice.customerName} />
                           <DetailCard label="Email khách hàng" value={selectedInvoice.customerEmail} />
                           <DetailCard label="Người phụ trách" value={selectedInvoice.ownerName} />
                           <DetailCard label="Chương trình" value={selectedInvoice.programName} />
                           <DetailCard label="Chi nhánh" value={selectedInvoice.branchName} />
                           <DetailCard label="Hợp đồng" value={selectedInvoice.contractCode} />
                           <DetailCard label="Mã SO liên kết" value={selectedInvoice.soCode} />
                           <DetailCard label="Xuất hóa đơn" value={selectedInvoice.requiresTaxInvoice ? 'Có' : 'Không'} />
                        </div>
                     </section>

                     <div className="mt-4 border-t border-[#dee2e6] pt-3">
                        <div className="grid gap-4 xl:grid-cols-2">
                           <section>
                              <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6c757d]">
                                 Thông tin tiền
                              </div>
                              <div className="grid grid-cols-1 gap-x-5 gap-y-3 border border-[#dee2e6] bg-white px-4 py-3 md:grid-cols-2">
                                 <DetailCard
                                    label="Số tiền"
                                    value={formatCurrency(selectedInvoice.totalAmount, selectedInvoice.currency)}
                                 />
                                 <DetailCard label="Loại tiền" value={selectedInvoice.currency} />
                                 <DetailCard label="Nội dung thanh toán" value={selectedInvoice.description} />
                                 <DetailCard label="Hình thức thanh toán" value={selectedInvoice.paymentMethod} />
                                 <DetailCard label="Ngày thanh toán" value={formatDate(selectedInvoice.paymentDate)} />
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
                                 Liên kết chứng từ gốc
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
                              value={STATUS_META[selectedInvoice.status].label}
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
                        Người lập: {selectedInvoice.createdBy || '--'} | Thanh toán: {formatDate(selectedInvoice.paymentDate)} | In phiếu: {formatDate(selectedInvoice.receiptPrintedAt)} | Email: {formatDate(selectedInvoice.receiptEmailedAt)}
                     </div>
                     <button
                        onClick={() => setSelectedInvoiceId(null)}
                        className="rounded-sm border border-[#dee2e6] bg-white px-3 py-1.5 text-[12px] font-medium text-[#495057] transition-colors hover:bg-white"
                     >
                        Đóng
                     </button>
                  </div>

                  <div className="hidden border-t border-slate-200 bg-white px-4 py-4 sm:px-6">
                     <div className="flex flex-wrap justify-end gap-3">
                        <button
                           onClick={() => handleUpdateStatus(InvoiceStatus.ISSUED)}
                           disabled={selectedInvoice.status === InvoiceStatus.ISSUED || selectedInvoice.status === InvoiceStatus.SENT_TO_CUSTOMER || selectedInvoice.status === InvoiceStatus.CANCELLED}
                           className="rounded-xl border border-emerald-200 px-4 py-2 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
                        >
                           Phát hành
                        </button>
                        <button
                           onClick={() => handleUpdateStatus(InvoiceStatus.SENT_TO_CUSTOMER)}
                           disabled={selectedInvoice.status === InvoiceStatus.SENT_TO_CUSTOMER || selectedInvoice.status === InvoiceStatus.CANCELLED}
                           className="rounded-xl border border-blue-200 px-4 py-2 text-sm font-bold text-blue-700 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
                        >
                           Gửi khách
                        </button>
                        <button
                           onClick={() => handleUpdateStatus(InvoiceStatus.CANCELLED)}
                           disabled={selectedInvoice.status === InvoiceStatus.CANCELLED}
                           className="rounded-xl border border-red-200 px-4 py-2 text-sm font-bold text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
                        >
                           Hủy chứng từ
                        </button>
                     </div>
                  </div>
                  </aside>
               </div>
            </>
         )}

         {showCreateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
               <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl">
                  <div className="mb-6 flex items-center justify-between">
                     <h3 className="text-xl font-bold text-slate-900">Tạo chứng từ mới</h3>
                     <button onClick={resetCreateForm}>
                        <X className="text-slate-400 transition-colors hover:text-slate-600" />
                     </button>
                  </div>

                  <div className="space-y-4">
                     <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4">
                        <label className="mb-2 block text-sm font-bold text-indigo-900">Liên kết đơn hàng (tuỳ chọn)</label>
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

                     <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <div>
                           <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Loại chứng từ</label>
                           <select
                              className="w-full rounded border border-slate-300 p-2"
                              value={newInvoiceData.documentType || ReceiptDocumentType.PAYMENT_RECEIPT}
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
                        <div>
                           <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Email khÃ¡ch hÃ ng</label>
                           <input
                              type="email"
                              className="w-full rounded border border-slate-300 p-2"
                              value={newInvoiceData.customerEmail || ''}
                              onChange={(event) =>
                                 setNewInvoiceData((prev) => ({ ...prev, customerEmail: event.target.value }))
                              }
                              placeholder="tenkhach@example.com"
                           />
                        </div>
                        <div>
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
                     </div>

                     {newInvoiceData.documentType === ReceiptDocumentType.PAYMENT_RECEIPT && (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                           <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
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
                           <p className="mt-2 text-xs text-slate-500">
                              Bật tùy chọn này nếu phiếu thu cần phát hành hóa đơn và gửi kèm hồ sơ liên quan.
                           </p>
                        </div>
                     )}

                     <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div>
                           <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Khách hàng / Đối tượng</label>
                           <input
                              className="w-full rounded border border-slate-300 p-2 font-medium text-slate-900"
                              value={newInvoiceData.customerName || ''}
                              onChange={(event) =>
                                 setNewInvoiceData((prev) => ({ ...prev, customerName: event.target.value }))
                              }
                              placeholder="Nhập tên khách hàng hoặc đối tượng"
                           />
                        </div>
                        <div>
                           <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                              {newInvoiceData.documentType === ReceiptDocumentType.PAYMENT_VOUCHER ? 'Tài khoản chi' : 'Tài khoản nhận'}
                           </label>
                           <input
                              className="w-full rounded border border-slate-300 p-2"
                              value={newInvoiceData.accountName || ''}
                              onChange={(event) =>
                                 setNewInvoiceData((prev) => ({ ...prev, accountName: event.target.value }))
                              }
                              placeholder="Ví dụ: VCB - 1900123456"
                           />
                        </div>
                     </div>

                     <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
                     </div>

                     <div>
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

                     <div>
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

                     <div>
                        <label className="mb-2 block text-xs font-bold uppercase text-slate-500">
                           {newInvoiceData.requiresTaxInvoice ? 'File hÃ³a Ä‘Æ¡n / há»“ sÆ¡ Ä‘Ã­nh kÃ¨m' : 'File Ä‘Ã­nh kÃ¨m'}
                        </label>
                        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
                           <input
                              type="file"
                              multiple
                              onChange={(event) => {
                                 handleAttachmentSelect(event.target.files);
                                 event.currentTarget.value = '';
                              }}
                              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded file:border-0 file:bg-indigo-600 file:px-3 file:py-2 file:font-semibold file:text-white hover:file:bg-indigo-700"
                           />
                           {newInvoiceData.attachments && newInvoiceData.attachments.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                 {newInvoiceData.attachments.map((attachment) => (
                                    <span
                                       key={attachment.id}
                                       className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
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

                     <div className="flex justify-end gap-3 pt-2">
                        <button
                           onClick={resetCreateForm}
                           className="rounded px-4 py-2 font-bold text-slate-600 transition-colors hover:bg-slate-100"
                        >
                           Huỷ
                        </button>
                        {newInvoiceData.documentType === ReceiptDocumentType.PAYMENT_RECEIPT && (
                           <button
                              onClick={() => handleCreateInvoice({ printAfterCreate: true })}
                              className="rounded border border-slate-300 bg-white px-4 py-2 font-bold text-slate-700 transition-colors hover:bg-slate-50"
                           >
                              LÆ°u vÃ  in
                           </button>
                        )}
                        <button
                           onClick={() => handleCreateInvoice()}
                           className="rounded bg-indigo-600 px-4 py-2 font-bold text-white shadow-md transition-colors hover:bg-indigo-700"
                        >
                           Lưu chứng từ
                        </button>
                     </div>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};

export default FinanceInvoices;
