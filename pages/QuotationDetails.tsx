import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Save, CheckCircle2, Printer, ChevronRight, ChevronDown, FileText, Link2, Lock } from 'lucide-react';
import { IContract, IQuotation, QuotationStatus, UserRole } from '../types';
import { addQuotation, getContacts, getContractByQuotationId, getDealById, getLeadById, getLeads, getQuotations, updateContract, updateQuotation, upsertLinkedContractFromQuotation } from '../utils/storage';
import { useAuth } from '../contexts/AuthContext';
import { confirmSale, lockQuotationAfterAccounting } from '../services/financeFlow.service';

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
  { id: QuotationStatus.DRAFT, label: 'Mới' },
  { id: QuotationStatus.SENT, label: 'Đã gửi' },
  { id: QuotationStatus.SALE_CONFIRMED, label: 'Confirm' },
  { id: QuotationStatus.LOCKED, label: 'Lock' }
] as const;

const DEFAULT_CONTRACT_TEMPLATE_NAME = 'Mẫu hợp đồng đào tạo';

const CONTRACT_FIELD_CONFIG = [
  { key: 'centerRepresentative', label: 'Đại diện trung tâm', placeholder: 'Người ký phía trung tâm' },
  { key: 'studentName', label: 'Khách hàng / học viên', placeholder: 'Họ tên trên hợp đồng' },
  { key: 'studentPhone', label: 'Số điện thoại', placeholder: 'SĐT học viên' },
  { key: 'studentEmail', label: 'Email', placeholder: 'Email học viên' },
  { key: 'address', label: 'Địa chỉ', placeholder: 'Địa chỉ liên hệ / thường trú' },
  { key: 'identityCard', label: 'CCCD', placeholder: 'Số CCCD/Hộ chiếu' },
  { key: 'guardianName', label: 'Người bảo hộ', placeholder: 'Tên phụ huynh / người bảo hộ' },
  { key: 'guardianPhone', label: 'SĐT người bảo hộ', placeholder: 'SĐT phụ huynh / người bảo hộ' },
  { key: 'branchName', label: 'Chi nhánh / cơ sở', placeholder: 'Tên cơ sở ký hợp đồng' },
  { key: 'contractNote', label: 'Ghi chú hợp đồng', placeholder: 'Điều khoản hoặc ghi chú riêng' }
] as const;

type QuotationTab = 'order_lines' | 'other_info' | 'payment' | 'contract';

type ContractDraftState = {
  templateName: string;
  fileUrl: string;
  templateFields: Record<string, string>;
};

type ContractImportResult = {
  importedKeys: string[];
  unknownKeys: string[];
};

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

const normalizeImportToken = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

const CONTRACT_IMPORT_ALIASES: Record<string, keyof ContractDraftState | string> = {
  template: 'templateName',
  templatename: 'templateName',
  mauhopdong: 'templateName',
  file: 'fileUrl',
  fileurl: 'fileUrl',
  filelink: 'fileUrl',
  linkfile: 'fileUrl',
  centerrepresentative: 'centerRepresentative',
  daidientrungtam: 'centerRepresentative',
  studentname: 'studentName',
  customername: 'studentName',
  hocvien: 'studentName',
  khachhang: 'studentName',
  studentphone: 'studentPhone',
  sodienthoai: 'studentPhone',
  phone: 'studentPhone',
  studentemail: 'studentEmail',
  email: 'studentEmail',
  address: 'address',
  diachi: 'address',
  identitycard: 'identityCard',
  cccd: 'identityCard',
  socccd: 'identityCard',
  guardianname: 'guardianName',
  nguoibaoho: 'guardianName',
  phuhuynh: 'guardianName',
  guardianphone: 'guardianPhone',
  sdtnguoibaoho: 'guardianPhone',
  branchname: 'branchName',
  chinhanh: 'branchName',
  coso: 'branchName',
  contractnote: 'contractNote',
  ghichuhopdong: 'contractNote',
  quotationdate: 'quotationDate',
  ngaybaogia: 'quotationDate',
  confirmdate: 'confirmDate',
  ngayconfirm: 'confirmDate'
};

const parseContractImportText = (value: string) => {
  const lines = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const meta: Partial<ContractDraftState> = {};
  const templateFields: Record<string, string> = {};
  const importedKeys = new Set<string>();
  const unknownKeys: string[] = [];

  lines.forEach((line) => {
    const separatorIndex = line.includes(':') ? line.indexOf(':') : line.indexOf('=');
    if (separatorIndex === -1) {
      unknownKeys.push(line);
      return;
    }

    const rawKey = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();
    if (!rawKey || !rawValue) return;

    const mappedKey = CONTRACT_IMPORT_ALIASES[normalizeImportToken(rawKey)];
    if (!mappedKey) {
      unknownKeys.push(rawKey);
      return;
    }

    if (mappedKey === 'templateName' || mappedKey === 'fileUrl') {
      meta[mappedKey] = rawValue;
      importedKeys.add(mappedKey);
      return;
    }

    templateFields[mappedKey] = rawValue;
    importedKeys.add(mappedKey);
  });

  return {
    meta,
    templateFields,
    importedKeys: Array.from(importedKeys),
    unknownKeys
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
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [customerQuery, setCustomerQuery] = useState('');
  const [linkedContract, setLinkedContract] = useState<IContract | null>(null);
  const [contractDraft, setContractDraft] = useState<ContractDraftState>({
    templateName: DEFAULT_CONTRACT_TEMPLATE_NAME,
    fileUrl: '',
    templateFields: {}
  });
  const [contractImportText, setContractImportText] = useState('');
  const [contractImportResult, setContractImportResult] = useState<ContractImportResult | null>(null);

  const [formData, setFormData] = useState<Partial<IQuotation>>({
    status: QuotationStatus.DRAFT,
    serviceType: 'Training',
    amount: 0,
    discount: 0,
    finalAmount: 0,
    createdAt: new Date().toISOString(),
    quotationDate: new Date().toISOString()
  });

  useEffect(() => {
    if (initialTab === 'order_lines' || initialTab === 'other_info' || initialTab === 'payment' || initialTab === 'contract') {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (isNew) {
      setLinkedContract(null);
      setContractDraft({
        templateName: DEFAULT_CONTRACT_TEMPLATE_NAME,
        fileUrl: '',
        templateFields: {}
      });
      if (dealId) {
        const deal = getDealById(dealId);
        if (deal) {
          setFormData((prev) => ({
            ...prev,
            dealId: deal.id,
            leadId: deal.leadId,
            customerName: 'Loading...',
            product: deal.title,
            amount: deal.value,
            finalAmount: deal.value,
            quotationDate: prev.quotationDate || prev.createdAt || new Date().toISOString()
          }));
          const lead = getLeadById(deal.leadId);
          if (lead) {
            setFormData((prev) => ({
              ...prev,
              customerName: lead.name,
              customerId: lead.id,
              studentPhone: lead.phone || prev.studentPhone,
              studentEmail: lead.email || prev.studentEmail,
              studentAddress: lead.address || prev.studentAddress,
              identityCard: lead.identityCard || prev.identityCard,
              guardianName: lead.guardianName || prev.guardianName,
              guardianPhone: lead.guardianPhone || prev.guardianPhone
            }));
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
    setFormData(found);
    setLinkedContract(contract);
    setCustomerQuery(found.customerName || '');
    setContractDraft({
      templateName: contract?.templateName || DEFAULT_CONTRACT_TEMPLATE_NAME,
      fileUrl: contract?.fileUrl || '',
      templateFields: contract?.templateFields || {}
    });
    if (initialAction === 'confirm' && found.status === QuotationStatus.SENT) {
      setShowConfirmModal(true);
    }
  }, [dealId, id, initialAction, isNew, navigate]);

  const isLocked = formData.status === QuotationStatus.LOCKED;
  const userRole = user?.role as UserRole | undefined;
  const canConfirmByRole = [UserRole.SALES_REP, UserRole.SALES_LEADER, UserRole.ADMIN, UserRole.FOUNDER].includes(userRole || UserRole.SALES_REP);
  const canLockByRole = userRole === UserRole.ACCOUNTANT;
  const canLockByTransaction = formData.transactionStatus === 'DA_DUYET';
  const canConfirmNow = !isLocked && (formData.status === QuotationStatus.DRAFT || formData.status === QuotationStatus.SENT);
  const canLockStage = !isLocked && (formData.status === QuotationStatus.SALE_CONFIRMED || formData.status === QuotationStatus.SALE_ORDER);
  const canLockNow = canLockStage && canLockByRole && canLockByTransaction;
  const lockButtonTitle = !canLockStage
    ? 'Cần Confirm trước khi Lock'
    : !canLockByRole
      ? 'Chỉ Kế toán được khóa SO'
      : !canLockByTransaction
        ? 'Cần kế toán duyệt giao dịch trước'
        : 'Khóa SO';
  const normalizedStatus =
    formData.status === QuotationStatus.SALE_ORDER ? QuotationStatus.SALE_CONFIRMED : formData.status;
  const recordStatusLabel = normalizedStatus === QuotationStatus.LOCKED ? 'Locked' : 'Quotation';

  const stepIndex = useMemo(() => {
    const steps = [QuotationStatus.DRAFT, QuotationStatus.SENT, QuotationStatus.SALE_CONFIRMED, QuotationStatus.LOCKED];
    return steps.indexOf(normalizedStatus as QuotationStatus);
  }, [normalizedStatus]);

  const derivedContractFields = useMemo(
    () => ({
      studentName: formData.customerName || linkedContract?.customerName || '',
      studentPhone: formData.studentPhone || '',
      studentEmail: formData.studentEmail || '',
      address: formData.studentAddress || '',
      identityCard: formData.identityCard || '',
      guardianName: formData.guardianName || '',
      guardianPhone: formData.guardianPhone || '',
      branchName: formData.branchName || '',
      contractNote: '',
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
      formData.branchName,
      formData.confirmDate,
      formData.createdAt,
      formData.customerName,
      formData.finalAmount,
      formData.guardianName,
      formData.guardianPhone,
      formData.identityCard,
      formData.lockedAt,
      formData.paymentMethod,
      formData.product,
      formData.quotationDate,
      formData.saleConfirmedAt,
      formData.soCode,
      formData.status,
      formData.studentAddress,
      formData.studentEmail,
      formData.studentPhone,
      formData.updatedAt,
      linkedContract?.customerName
    ]
  );

  const getContractFieldValue = (key: string) =>
    contractDraft.templateFields[key] ?? derivedContractFields[key as keyof typeof derivedContractFields] ?? '';

  const hasContractCustomData = useMemo(
    () =>
      Boolean(
        linkedContract ||
          contractDraft.fileUrl.trim() ||
          (contractDraft.templateName || '').trim() !== DEFAULT_CONTRACT_TEMPLATE_NAME ||
          Object.values(contractDraft.templateFields).some((value) => value.trim())
      ),
    [contractDraft.fileUrl, contractDraft.templateFields, contractDraft.templateName, linkedContract]
  );

  const syncLinkedContract = (quotation: IQuotation) => {
    const quotationDerivedFields = {
      studentName: quotation.customerName || linkedContract?.customerName || '',
      studentPhone: quotation.studentPhone || '',
      studentEmail: quotation.studentEmail || '',
      address: quotation.studentAddress || '',
      identityCard: quotation.identityCard || '',
      guardianName: quotation.guardianName || '',
      guardianPhone: quotation.guardianPhone || '',
      branchName: quotation.branchName || '',
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
        centerRepresentative: resolveDraftValue('centerRepresentative', baseContract.templateFields?.centerRepresentative || ''),
        studentName: resolveDraftValue('studentName', quotationDerivedFields.studentName),
        studentPhone: resolveDraftValue('studentPhone', quotationDerivedFields.studentPhone),
        studentEmail: resolveDraftValue('studentEmail', quotationDerivedFields.studentEmail),
        address: resolveDraftValue('address', quotationDerivedFields.address),
        identityCard: resolveDraftValue('identityCard', quotationDerivedFields.identityCard),
        guardianName: resolveDraftValue('guardianName', quotationDerivedFields.guardianName),
        guardianPhone: resolveDraftValue('guardianPhone', quotationDerivedFields.guardianPhone),
        branchName: resolveDraftValue('branchName', quotationDerivedFields.branchName),
        contractNote: resolveDraftValue('contractNote', baseContract.templateFields?.contractNote || ''),
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
      templateName: mergedContract.templateName || DEFAULT_CONTRACT_TEMPLATE_NAME,
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
      createdBy: formData.createdBy || user?.id || 'system',
      updatedAt: now,
      status: nextStatus,
      id: formData.id || `Q-${Date.now()}`,
      soCode: formData.soCode || `SO${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`
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
    if (!formData.paymentProof?.trim()) {
      alert('Vui lòng nhập chứng từ thanh toán');
      return;
    }

    const savedQuotation = persistQuotation({ syncContract: false });
    const res = confirmSale(savedQuotation.id, user?.id || 'system');
    if (!res.ok || !res.quotation) {
      alert(res.error || 'Không thể xác nhận sale');
      return;
    }

    setFormData({
      ...res.quotation,
      paymentMethod: savedQuotation.paymentMethod,
      paymentProof: savedQuotation.paymentProof
    });

    if (hasContractCustomData || linkedContract) {
      syncLinkedContract({
        ...res.quotation,
        paymentMethod: savedQuotation.paymentMethod,
        paymentProof: savedQuotation.paymentProof
      });
    }

    if (isNew) {
      navigate(`/contracts/quotations/${res.quotation.id}`, { replace: true });
    }

    setShowConfirmModal(false);
    alert('Đã xác nhận sale, giao dịch đang chờ kế toán duyệt');
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

    setFormData(res.quotation);
    setLinkedContract(getContractByQuotationId(res.quotation.id) || null);
    syncLinkedContract(res.quotation);
    alert('Đã khóa đơn hàng và tạo hồ sơ học viên');
  };

  const handleStageClick = (stepId: QuotationStatus) => {
    if (isLocked) return;

    if (stepId === QuotationStatus.SENT && formData.status === QuotationStatus.DRAFT) {
      handleSend();
      return;
    }

    if (stepId === QuotationStatus.SALE_CONFIRMED && formData.status !== QuotationStatus.LOCKED) {
      if (!canConfirmByRole) {
        alert('Chỉ Sales được xác nhận Sale');
        return;
      }
      setShowConfirmModal(true);
      return;
    }

    if (stepId === QuotationStatus.LOCKED) {
      if (!canLockByRole) {
        alert('Chỉ Kế toán được khóa SO');
        return;
      }
      if (!canLockByTransaction) {
        alert('Cần kế toán duyệt giao dịch trước khi khóa SO');
        return;
      }
      handleLock();
    }
  };

  const getStepInteraction = (stepId: QuotationStatus) => {
    if (isLocked) return { clickable: false, title: 'SO đã khóa' };
    if (stepId === QuotationStatus.SENT) {
      return {
        clickable: formData.status === QuotationStatus.DRAFT,
        title: formData.status === QuotationStatus.DRAFT ? 'Chuyển SO sang Đã gửi' : 'Đã qua bước gửi báo giá'
      };
    }
    if (stepId === QuotationStatus.SALE_CONFIRMED) {
      return {
        clickable: canConfirmByRole && formData.status !== QuotationStatus.LOCKED,
        title: canConfirmByRole ? 'Mở bước Confirm Sale' : 'Chỉ Sales được xác nhận Sale'
      };
    }
    if (stepId === QuotationStatus.LOCKED) {
      if (!canLockByRole) return { clickable: false, title: 'Chỉ Kế toán được khóa SO (trong SO hoặc màn hình giao dịch)' };
      if (!canLockByTransaction) return { clickable: false, title: 'Cần giao dịch được duyệt trước' };
      return { clickable: true, title: 'Khóa SO' };
    }
    return { clickable: false, title: 'Bước khởi tạo' };
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

  const customerOptions = useMemo(() => {
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

  const handleApplyContractImport = () => {
    if (!contractImportText.trim()) {
      alert('Vui lòng nhập nội dung import hợp đồng');
      return;
    }

    const parsed = parseContractImportText(contractImportText);
    if (parsed.importedKeys.length === 0) {
      alert('Không tìm thấy field hợp lệ để import');
      return;
    }

    setContractDraft((prev) => ({
      templateName: (parsed.meta.templateName as string) || prev.templateName,
      fileUrl: (parsed.meta.fileUrl as string) || prev.fileUrl,
      templateFields: {
        ...prev.templateFields,
        ...parsed.templateFields
      }
    }));

    setFormData((prev) => ({
      ...prev,
      customerName: parsed.templateFields.studentName || prev.customerName,
      studentPhone: parsed.templateFields.studentPhone || prev.studentPhone,
      studentEmail: parsed.templateFields.studentEmail || prev.studentEmail,
      studentAddress: parsed.templateFields.address || prev.studentAddress,
      identityCard: parsed.templateFields.identityCard || prev.identityCard,
      guardianName: parsed.templateFields.guardianName || prev.guardianName,
      guardianPhone: parsed.templateFields.guardianPhone || prev.guardianPhone,
      branchName: parsed.templateFields.branchName || prev.branchName
    }));

    if (parsed.templateFields.studentName) {
      setCustomerQuery(parsed.templateFields.studentName);
    }

    if (parsed.templateFields.quotationDate) {
      setFormData((prev) => ({
        ...prev,
        quotationDate: fromInputDate(parsed.templateFields.quotationDate, prev.quotationDate || prev.createdAt) || prev.quotationDate
      }));
    }

    if (parsed.templateFields.confirmDate) {
      setFormData((prev) => ({
        ...prev,
        confirmDate: fromInputDate(parsed.templateFields.confirmDate, prev.confirmDate || prev.updatedAt) || prev.confirmDate
      }));
    }

    setContractImportResult({
      importedKeys: parsed.importedKeys,
      unknownKeys: parsed.unknownKeys
    });
    alert(`Đã import ${parsed.importedKeys.length} trường hợp đồng`);
  };

  const handleSaveContractDraft = () => {
    const savedQuotation = persistQuotation({ syncContract: false });
    syncLinkedContract(savedQuotation);
    alert('Đã lưu dữ liệu hợp đồng tách riêng để in theo mẫu');
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
        action: 'Sale Confirmed',
        detail: 'Trạng thái đổi từ Quotation sang Confirm'
      });
    }
    if (formData.paymentProof) {
      fallback.push({
        id: 'fallback-payment',
        timestamp: formData.updatedAt || formData.createdAt || new Date().toISOString(),
        user: 'System',
        action: 'Payment Proof',
        detail: `Đã cập nhật chứng từ: ${formData.paymentProof}`
      });
    }
    fallback.push({
      id: 'fallback-created',
      timestamp: formData.createdAt || new Date().toISOString(),
      user: formData.createdBy || 'System',
      action: 'Create Quotation',
      detail: 'Tạo SO'
    });
    return fallback;
  }, [formData.createdAt, formData.createdBy, formData.logNotes, formData.paymentProof, formData.saleConfirmedAt, formData.status, formData.updatedAt]);

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6 text-sm text-slate-800">
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

        <div className="bg-white border rounded p-2 flex items-center justify-between mb-4 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
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
            <button
              onClick={handleLock}
              disabled={!canLockNow}
              title={lockButtonTitle}
              className="px-3 py-1.5 rounded border text-xs font-semibold disabled:text-slate-400"
            >
              Lock
            </button>
            {canLockStage && (
              <button
                onClick={() => navigate('/finance/transactions')}
                className="px-3 py-1.5 rounded border border-slate-200 bg-white text-xs font-semibold text-slate-700"
                title="Mở giao diện giao dịch kế toán để duyệt và khóa"
              >
                Giao diện kế toán
              </button>
            )}
            <button onClick={handleSaveContractDraft} className="px-3 py-1.5 rounded border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1">
              <FileText size={13} /> Lưu hợp đồng
            </button>
            {formData.status === QuotationStatus.LOCKED && (
              <button onClick={() => navigate(`/contracts/quotations/${formData.id}/contract`)} className="px-3 py-1.5 rounded bg-blue-600 text-white text-xs font-semibold inline-flex items-center gap-1">
                <Printer size={14} /> In hợp đồng
              </button>
            )}
            {formData.transactionStatus && formData.transactionStatus !== 'NONE' && (
              <span className="px-2 py-1 text-xs border rounded bg-slate-50">Giao dịch: {formData.transactionStatus}</span>
            )}
            <span className={`px-2 py-1 text-xs font-semibold rounded ${recordStatusLabel === 'Locked' ? 'bg-slate-200 text-slate-800' : 'bg-blue-50 text-blue-700'}`}>
              Status: {recordStatusLabel}
            </span>
          </div>

          <div className="flex items-center border rounded overflow-hidden">
            {STATUS_STEPS.map((step, idx) => {
              const { clickable, title } = getStepInteraction(step.id);
              const isReached = idx <= stepIndex;
              const isCurrent = normalizedStatus === step.id;
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

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
          <div className="bg-white border rounded p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-4xl font-bold text-slate-900">{isNew ? 'Báo giá mới' : formData.soCode}</h1>
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${recordStatusLabel === 'Locked' ? 'bg-slate-200 text-slate-800' : 'bg-blue-50 text-blue-700'}`}>
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

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
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
                            onClick={() => {
                              const sourceLead = customer.source === 'lead' ? getLeadById(customer.id) : undefined;
                              setFormData((p) => ({
                                ...p,
                                customerName: customer.name,
                                customerId: customer.id,
                                leadId: customer.source === 'lead' ? customer.id : p.leadId,
                                studentPhone: customer.phone || p.studentPhone || sourceLead?.phone,
                                studentEmail: customer.email || p.studentEmail || sourceLead?.email,
                                studentAddress: sourceLead?.address || p.studentAddress,
                                identityCard: sourceLead?.identityCard || p.identityCard,
                                guardianName: sourceLead?.guardianName || p.guardianName,
                                guardianPhone: sourceLead?.guardianPhone || p.guardianPhone
                              }));
                              setCustomerQuery(customer.name);
                              setCustomerDropdownOpen(false);
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
                <label className="text-xs font-bold uppercase text-blue-800">Quotation date</label>
                <input
                  type="date"
                  className="w-full border-b py-1 outline-none"
                  value={toInputDate(formData.quotationDate || formData.createdAt)}
                  onChange={(e) => !isLocked && setFormData((p) => ({ ...p, quotationDate: fromInputDate(e.target.value, p.quotationDate || p.createdAt) }))}
                  disabled={isLocked}
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-blue-800">Confirm date</label>
                <input
                  type="date"
                  className="w-full border-b py-1 outline-none"
                  value={toInputDate(formData.confirmDate)}
                  onChange={(e) => !isLocked && setFormData((p) => ({ ...p, confirmDate: fromInputDate(e.target.value, p.confirmDate || p.updatedAt) }))}
                  disabled={isLocked}
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-blue-800">Loại dịch vụ</label>
                <select
                  className="w-full border-b py-1 outline-none"
                  value={formData.serviceType || 'Training'}
                  onChange={(e) => !isLocked && setFormData((p) => ({ ...p, serviceType: e.target.value as IQuotation['serviceType'] }))}
                  disabled={isLocked}
                >
                  {SERVICES.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-6 border-b mb-4">
              <button onClick={() => setActiveTab('order_lines')} className={`pb-2 font-semibold ${activeTab === 'order_lines' ? 'text-blue-700 border-b-2 border-blue-700' : 'text-slate-500'}`}>Chi tiết đơn hàng</button>
              <button onClick={() => setActiveTab('other_info')} className={`pb-2 font-semibold ${activeTab === 'other_info' ? 'text-blue-700 border-b-2 border-blue-700' : 'text-slate-500'}`}>Thông tin khác</button>
              <button onClick={() => setActiveTab('payment')} className={`pb-2 font-semibold inline-flex items-center gap-2 ${activeTab === 'payment' ? 'text-blue-700 border-b-2 border-blue-700' : 'text-slate-500'}`}>Thanh toán {(formData.status === QuotationStatus.SALE_CONFIRMED || isLocked) && <CheckCircle2 size={14} className="text-green-600" />}</button>
              <button onClick={() => setActiveTab('contract')} className={`pb-2 font-semibold inline-flex items-center gap-2 ${activeTab === 'contract' ? 'text-blue-700 border-b-2 border-blue-700' : 'text-slate-500'}`}>Hợp đồng {linkedContract && <FileText size={14} className="text-blue-600" />}</button>
            </div>

            {activeTab === 'order_lines' && (
              <div>
                <table className="w-full text-left text-sm mb-4">
                  <thead>
                    <tr className="border-b-2 border-slate-800 text-xs uppercase">
                      <th className="py-2">Sản phẩm</th>
                      <th className="py-2 text-center">Số lượng</th>
                      <th className="py-2 text-right">Đơn giá</th>
                      <th className="py-2 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-3">
                        <select
                          className="w-full border rounded p-2"
                          value={formData.product || ''}
                          onChange={(e) => {
                            if (isLocked) return;
                            const prod = productOptions.find((p) => p.name === e.target.value);
                            setFormData((prev) => ({
                              ...prev,
                              product: e.target.value,
                              amount: prod ? prod.price : 0,
                              finalAmount: prod ? prod.price - (prev.discount || 0) : 0
                            }));
                          }}
                          disabled={isLocked}
                        >
                          <option value="">-- Chọn sản phẩm --</option>
                          {productOptions.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
                        </select>
                      </td>
                      <td className="py-3 text-center">1</td>
                      <td className="py-3 text-right">{(formData.amount || 0).toLocaleString('vi-VN')}</td>
                      <td className="py-3 text-right font-semibold">{(formData.finalAmount || 0).toLocaleString('vi-VN')}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="w-full md:w-80 ml-auto border rounded p-4 bg-slate-50 space-y-2">
                  <div className="flex justify-between"><span>Tổng giá trị:</span><span>{(formData.amount || 0).toLocaleString('vi-VN')} VND</span></div>
                  <div className="flex justify-between"><span>Chiết khấu:</span><span>{(formData.discount || 0).toLocaleString('vi-VN')}</span></div>
                  <div className="flex justify-between text-2xl text-blue-700 font-bold"><span>Tổng tiền:</span><span>{(formData.finalAmount || 0).toLocaleString('vi-VN')} đ</span></div>
                </div>
              </div>
            )}

            {activeTab === 'other_info' && (
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <h3 className="font-bold text-sm uppercase border-b pb-2">Thông tin sales</h3>
                  <div className="flex justify-between"><span>Người phụ trách</span><span className="font-medium text-blue-700">{user?.name || 'Sales Rep'}</span></div>
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
                    <input
                      type="text"
                      value={formData.classCode || ''}
                      onChange={(e) => !isLocked && setFormData((p) => ({ ...p, classCode: e.target.value }))}
                      disabled={isLocked}
                      className="w-40 border-b bg-transparent text-right outline-none"
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

            {activeTab === 'payment' && (
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-6 p-4 rounded border bg-blue-50">
                  <div>
                    <div className="text-xs uppercase font-bold text-slate-500 mb-1">Hình thức thanh toán</div>
                    <div className="flex gap-3">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="radio"
                          checked={(formData.paymentMethod || 'CK') === 'CK'}
                          onChange={() => !isLocked && setFormData((p) => ({ ...p, paymentMethod: 'CK' }))}
                          disabled={isLocked}
                        />
                        Chuyển khoản
                      </label>
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="radio"
                          checked={formData.paymentMethod === 'CASH'}
                          onChange={() => !isLocked && setFormData((p) => ({ ...p, paymentMethod: 'CASH' }))}
                          disabled={isLocked}
                        />
                        Tiền mặt
                      </label>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase font-bold text-slate-500 mb-1">Trạng thái giao dịch</div>
                    <div className="font-semibold">
                      {formData.transactionStatus === 'DA_DUYET'
                        ? 'Đã duyệt'
                        : formData.transactionStatus === 'CHO_DUYET'
                          ? 'Chờ duyệt'
                          : formData.transactionStatus === 'TU_CHOI'
                            ? 'Từ chối'
                            : isLocked || formData.status === QuotationStatus.SALE_CONFIRMED
                              ? 'Đã thanh toán'
                              : 'Chưa xác nhận'}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Minh chứng (Bill/Phiếu thu)</label>
                  <textarea
                    value={formData.paymentProof || ''}
                    onChange={(e) => !isLocked && setFormData((p) => ({ ...p, paymentProof: e.target.value }))}
                    disabled={isLocked}
                    placeholder="Nhập mã giao dịch hoặc ghi chú"
                    className="w-full h-40 border rounded p-3"
                  />
                </div>
              </div>
            )}

            {activeTab === 'contract' && (
              <div className="space-y-6">
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-blue-900">Hợp đồng đang lưu riêng</div>
                      <div className="text-xs text-blue-700">Dữ liệu import sẽ map vào contract riêng để in theo mẫu.</div>
                    </div>
                    {linkedContract ? (
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm">{linkedContract.code}</span>
                    ) : (
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">Chưa tạo contract riêng</span>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Mẫu hợp đồng</label>
                      <input
                        type="text"
                        value={contractDraft.templateName}
                        onChange={(e) => setContractDraft((prev) => ({ ...prev, templateName: e.target.value }))}
                        className="w-full rounded border bg-white px-3 py-2 outline-none focus:border-blue-500"
                        placeholder="Tên mẫu dùng để in"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Link file / nguồn mẫu</label>
                      <div className="flex items-center gap-2">
                        <Link2 size={14} className="text-slate-400" />
                        <input
                          type="text"
                          value={contractDraft.fileUrl}
                          onChange={(e) => setContractDraft((prev) => ({ ...prev, fileUrl: e.target.value }))}
                          className="w-full rounded border bg-white px-3 py-2 outline-none focus:border-blue-500"
                          placeholder="https://... hoặc đường dẫn nội bộ"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold uppercase text-slate-800">Import field hợp đồng</h3>
                      <button type="button" onClick={handleApplyContractImport} className="rounded bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white">
                        Import field
                      </button>
                    </div>
                    <textarea
                      value={contractImportText}
                      onChange={(e) => setContractImportText(e.target.value)}
                      className="h-52 w-full rounded border p-3 font-mono text-xs outline-none focus:border-blue-500"
                      placeholder={`template: Mẫu hợp đồng du học
studentName: Nguyễn Văn A
studentPhone: 0901234567
address: Hà Nội
identityCard: 012345678901
guardianName: Trần Thị B
guardianPhone: 0909999999`}
                    />
                    {contractImportResult && (
                      <div className="rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                        <div>Đã import: <span className="font-semibold text-slate-800">{contractImportResult.importedKeys.join(', ')}</span></div>
                        {contractImportResult.unknownKeys.length > 0 && (
                          <div className="mt-1">Bỏ qua: <span className="font-semibold text-amber-700">{contractImportResult.unknownKeys.join(', ')}</span></div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="mb-3 text-sm font-bold uppercase text-slate-800">Field map đã nối</h3>
                      <div className="grid gap-3 md:grid-cols-2">
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
                      <div className="grid gap-2 text-xs text-slate-600 md:grid-cols-2">
                        <div>Quotation code: <span className="font-semibold text-slate-800">{derivedContractFields.quotationCode || '-'}</span></div>
                        <div>Quotation date: <span className="font-semibold text-slate-800">{derivedContractFields.quotationDate || '-'}</span></div>
                        <div>Confirm date: <span className="font-semibold text-slate-800">{derivedContractFields.confirmDate || '-'}</span></div>
                        <div>Gói dịch vụ: <span className="font-semibold text-slate-800">{derivedContractFields.productName || '-'}</span></div>
                        <div>Tổng giá trị: <span className="font-semibold text-slate-800">{derivedContractFields.totalAmount || '-'}</span></div>
                        <div>Thanh toán: <span className="font-semibold text-slate-800">{derivedContractFields.paymentMethod || '-'}</span></div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={handleSaveContractDraft} className="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-xs font-semibold text-white">
                        <Save size={14} /> Lưu contract riêng
                      </button>
                      {formData.status === QuotationStatus.LOCKED && (
                        <button type="button" onClick={() => navigate(`/contracts/quotations/${formData.id}/contract`)} className="inline-flex items-center gap-2 rounded border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700">
                          <Printer size={14} /> Xem bản in
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white border rounded h-fit">
            <div className="p-3 border-b font-bold">Lịch sử hoạt động</div>
            <div className="p-4 space-y-4 text-sm">
              {isNew && <div>Đang tạo báo giá mới...</div>}
              {activityLogs.map((item) => (
                <div key={item.id} className="border-b border-slate-100 pb-3 last:border-none last:pb-0">
                  <div className="font-semibold text-slate-800">{item.action}</div>
                  <div className="mt-1 text-xs text-slate-500">{item.detail || 'Không có mô tả chi tiết'}</div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    {item.user} • {new Date(item.timestamp).toLocaleString('vi-VN')}
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
          </div>
        </div>
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Xác nhận đơn hàng (Sale Confirmed)</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1">Hình thức thanh toán</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 p-2 rounded border flex-1">
                    <input type="radio" value="CK" checked={(formData.paymentMethod || 'CK') === 'CK'} onChange={() => setFormData((p) => ({ ...p, paymentMethod: 'CK' }))} />
                    <span>Chuyển khoản</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded border flex-1">
                    <input type="radio" value="CASH" checked={formData.paymentMethod === 'CASH'} onChange={() => setFormData((p) => ({ ...p, paymentMethod: 'CASH' }))} />
                    <span>Tiền mặt</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">Mã chứng từ / Bill <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.paymentProof || ''}
                  onChange={(e) => setFormData((p) => ({ ...p, paymentProof: e.target.value }))}
                  placeholder={(formData.paymentMethod || 'CK') === 'CK' ? 'Nhập mã bill...' : 'Số phiếu thu...'}
                  className="w-full p-2 border rounded"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button onClick={() => setShowConfirmModal(false)} className="px-4 py-2 rounded hover:bg-slate-100">Hủy</button>
                <button onClick={handleConfirmSale} disabled={!formData.paymentProof?.trim()} className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50">Xác nhận</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuotationDetails;
