import React, { useEffect, useMemo, useState } from 'react';
import {
   ArrowLeft,
   CalendarDays,
   ChevronRight,
   CircleDollarSign,
   FileText,
   FolderOpen,
   Paperclip,
   Receipt,
   ShieldCheck,
   UserRound
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LogAudienceFilterControl from '../components/LogAudienceFilter';
import { IRefundLog, IRefundRequest, RefundStatus, UserRole } from '../types';
import { addRefundLog, getQuotations, getRefundLogs, getRefunds, updateQuotation, updateRefund } from '../utils/storage';
import { canRefundSyncToMoneyOut, syncActualTransactionFromRefund } from '../services/refundFlow.service';
import { filterByLogAudience, getRefundLogAudience, LogAudienceFilter } from '../utils/logAudience';

const STATUS_META: Record<RefundStatus, { label: string; tone: string; dot: string }> = {
   DRAFT: { label: 'Nh\u00e1p', tone: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' },
   CHO_DUYET: { label: 'Ch\u1edd duy\u1ec7t', tone: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
   KE_TOAN_XAC_NHAN: { label: 'KT x\u00e1c nh\u1eadn', tone: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
   DA_DUYET: { label: 'Duy\u1ec7t', tone: 'bg-violet-50 text-violet-700 border-violet-200', dot: 'bg-violet-500' },
   DA_THU_CHI: { label: '\u0110\u00e3 thu / \u0111\u00e3 chi', tone: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
   NHAP: { label: 'Nh\u00e1p', tone: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' },
   SALE_XAC_NHAN: { label: 'Ch\u1edd duy\u1ec7t', tone: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
   KE_TOAN_KIEM_TRA: { label: 'KT x\u00e1c nh\u1eadn', tone: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
   CEO_DUYET: { label: 'Duy\u1ec7t', tone: 'bg-violet-50 text-violet-700 border-violet-200', dot: 'bg-violet-500' },
   DA_HOAN: { label: '\u0110\u00e3 thu / \u0111\u00e3 chi', tone: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
   TU_CHOI: { label: 'T\u1eeb ch\u1ed1i', tone: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
   HUY_YEU_CAU: { label: 'Hu\u1ef7 y\u00eau c\u1ea7u', tone: 'bg-slate-200 text-slate-600 border-slate-300', dot: 'bg-slate-400' }
};

const STATUS_STEPS: RefundStatus[] = ['DRAFT', 'CHO_DUYET', 'KE_TOAN_XAC_NHAN', 'DA_DUYET', 'DA_THU_CHI'];

const formatCurrency = (value?: number | null) => {
   if (value === null || value === undefined) return '--';
   return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
};

const formatDate = (value?: string) => {
   if (!value) return '--';
   const date = new Date(value);
   return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('vi-VN');
};

const formatDateTime = (value?: string) => {
   if (!value) return '--';
   const date = new Date(value);
   return Number.isNaN(date.getTime()) ? value : date.toLocaleString('vi-VN', { hour12: false });
};

const normalizeRefundStatus = (status: unknown): RefundStatus => {
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

const normalizeRefund = (item: Partial<IRefundRequest>): IRefundRequest => ({
   id: item.id || `REF-${Date.now()}`,
   createdAt: item.createdAt || new Date().toISOString(),
   studentName: item.studentName || 'ChÆ°a cáº­p nháº­t',
   soCode: item.soCode || '',
   contractCode: item.contractCode || '',
   program: item.program || '',
   paidAmount: Number(item.paidAmount || 0),
   relatedPaymentCode: item.relatedPaymentCode || '',
   requestedAmount: Number(item.requestedAmount || 0),
   retainedAmount:
      item.retainedAmount === null || item.retainedAmount === undefined ? null : Number(item.retainedAmount || 0),
   approvedAmount:
      item.approvedAmount === null || item.approvedAmount === undefined ? null : Number(item.approvedAmount || 0),
   reason: item.reason || 'LÃ½ do khÃ¡c',
   refundBasis: item.refundBasis || '',
   createdBy: item.createdBy || 'Há»‡ thá»‘ng',
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

const SectionTitle = ({ title }: { title: string }) => (
   <div className="border-b border-slate-300 pb-2.5">
      <div className="text-[14px] font-extrabold uppercase tracking-[0.18em] text-slate-700">{title}</div>
   </div>
);

const StatBlock = ({ label, value, tone }: { label: string; value: string; tone: string }) => (
   <div className="min-w-0">
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className={`mt-1 text-[20px] font-black leading-none ${tone}`}>{value}</div>
   </div>
);

const RowField = ({
   label,
   value,
   multiline = false
}: {
   label: string;
   value: React.ReactNode;
   multiline?: boolean;
}) => (
   <div
      className={`flex gap-4 border-b border-slate-100 py-2.5 last:border-b-0 ${
         multiline ? 'items-start' : 'items-center'
      }`}
   >
      <div className="w-[42%] shrink-0 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</div>
      <div className={`min-w-0 flex-1 text-[13px] text-slate-900 ${multiline ? 'leading-5' : 'truncate'}`}>{value || '--'}</div>
   </div>
);

const FileChipList = ({ items, emptyText }: { items?: string[]; emptyText: string }) => {
   if (!items?.length) {
      return <div className="text-[12px] italic text-slate-400">{emptyText}</div>;
   }

   return (
      <div className="flex flex-wrap gap-2">
         {items.map((item) => (
            <button
               key={item}
               type="button"
               className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[12px] text-slate-700 transition-colors hover:bg-slate-100"
            >
               <Paperclip size={12} className="text-slate-400" />
               <span className="max-w-[220px] truncate">{item}</span>
            </button>
         ))}
      </div>
   );
};

type RefundAction = {
   id: string;
   label: string;
   nextStatus: RefundStatus;
   buttonClassName: string;
   requiresReason?: boolean;
   confirmMessage?: string;
};

const canSubmitRefund = (role?: UserRole) => Boolean(role);

const canHandleFinanceApproval = (role?: UserRole) =>
   role === UserRole.ACCOUNTANT || role === UserRole.ADMIN || role === UserRole.FOUNDER;

const getAvailableActions = (refund: IRefundRequest, role?: UserRole): RefundAction[] => {
   const actions: RefundAction[] = [];

   if (refund.status === 'DRAFT' && canSubmitRefund(role)) {
      actions.push({
         id: 'submit_refund',
         label: 'Tr\u00ecnh duy\u1ec7t',
         nextStatus: 'CHO_DUYET',
         buttonClassName: 'bg-slate-900 text-white hover:bg-slate-800'
      });
   }

   if (refund.status === 'CHO_DUYET' && canHandleFinanceApproval(role)) {
      actions.push({
         id: 'reject_refund',
         label: 'T\u1eeb ch\u1ed1i',
         nextStatus: 'TU_CHOI',
         buttonClassName: 'border border-rose-200 bg-white text-rose-700 hover:bg-rose-50',
         requiresReason: true
      });
      actions.push({
         id: 'accounting_confirm',
         label: 'KT x\u00e1c nh\u1eadn',
         nextStatus: 'KE_TOAN_XAC_NHAN',
         buttonClassName: 'bg-emerald-600 text-white hover:bg-emerald-700'
      });
   }

   if (refund.status === 'KE_TOAN_XAC_NHAN' && canHandleFinanceApproval(role)) {
      actions.push({
         id: 'reject_refund',
         label: 'T\u1eeb ch\u1ed1i',
         nextStatus: 'TU_CHOI',
         buttonClassName: 'border border-rose-200 bg-white text-rose-700 hover:bg-rose-50',
         requiresReason: true
      });
      actions.push({
         id: 'admin_approve',
         label: 'Duy\u1ec7t',
         nextStatus: 'DA_DUYET',
         buttonClassName: 'bg-emerald-600 text-white hover:bg-emerald-700'
      });
   }

   if (refund.status === 'DA_DUYET' && canHandleFinanceApproval(role)) {
      actions.push({
         id: 'undo_approve',
         label: 'H\u1ee7y duy\u1ec7t',
         nextStatus: 'KE_TOAN_XAC_NHAN',
         buttonClassName: 'border border-amber-300 bg-white text-amber-700 hover:bg-amber-50',
         confirmMessage: `B\u1ea1n c\u00f3 ch\u1eafc mu\u1ed1n h\u1ee7y duy\u1ec7t y\u00eau c\u1ea7u ho\u00e0n ti\u1ec1n ${refund.id}?`
      });
   }

   return actions;
};

const FinanceRefundDetail: React.FC = () => {
   const navigate = useNavigate();
   const { user } = useAuth();
   const { id } = useParams<{ id: string }>();
   const [refund, setRefund] = useState<IRefundRequest | null>(null);
   const [logs, setLogs] = useState<IRefundLog[]>([]);
   const [noteDraft, setNoteDraft] = useState('');
   const [logAudienceFilter, setLogAudienceFilter] = useState<LogAudienceFilter>('ALL');

   useEffect(() => {
      const loadData = () => {
         const record = getRefunds().map((item) => normalizeRefund(item)).find((item) => item.id === id) || null;
         setRefund(record);
         setLogs(getRefundLogs(id).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
      };

      loadData();
      window.addEventListener('educrm:refunds-changed', loadData as EventListener);
      window.addEventListener('educrm:refund-logs-changed', loadData as EventListener);

      return () => {
         window.removeEventListener('educrm:refunds-changed', loadData as EventListener);
         window.removeEventListener('educrm:refund-logs-changed', loadData as EventListener);
      };
   }, [id]);

   const summary = useMemo(() => {
      if (!refund) return [];

      return [
         { label: 'ÄÃ£ Ä‘Ã³ng', value: formatCurrency(refund.paidAmount), tone: 'text-slate-900' },
         { label: 'Äá» nghá»‹ hoÃ n', value: formatCurrency(refund.requestedAmount), tone: 'text-orange-600' },
         { label: 'Giá»¯ láº¡i', value: formatCurrency(refund.retainedAmount), tone: 'text-amber-600' },
         { label: 'Duyá»‡t hoÃ n', value: formatCurrency(refund.approvedAmount), tone: 'text-emerald-600' }
      ];
   }, [refund]);

   const currentStepIndex = useMemo(() => {
      if (!refund) return 0;
      const index = STATUS_STEPS.indexOf(refund.status);
      return index === -1 ? 0 : index;
   }, [refund]);

   const availableActions = useMemo(() => {
      if (!refund) return [];
      return getAvailableActions(refund, user?.role);
   }, [refund, user?.role]);
   const canOpenMoneyOut = useMemo(() => Boolean(refund && canRefundSyncToMoneyOut(refund.status)), [refund]);
   const filteredLogs = useMemo(
      () => filterByLogAudience(logs, logAudienceFilter, getRefundLogAudience),
      [logAudienceFilter, logs]
   );

   const handleWorkflowAction = (action: RefundAction) => {
      if (!refund) return;

      if (action.confirmMessage && !window.confirm(action.confirmMessage)) return;

      let note = noteDraft.trim();
      if (action.requiresReason) {
         const input = window.prompt('Nhập lý do từ chối hoàn tiền:', note || 'Thiếu chứng từ');
         if (input === null) return;

         note = input.trim();
         if (!note) {
            window.alert('Cần nhập lý do từ chối.');
            return;
         }
      }

      const nextRefund: IRefundRequest = {
         ...refund,
         status: action.nextStatus,
         approvedAmount:
            action.nextStatus === 'KE_TOAN_XAC_NHAN' || action.nextStatus === 'DA_DUYET' || action.nextStatus === 'DA_THU_CHI'
               ? refund.approvedAmount ?? refund.requestedAmount
               : refund.approvedAmount
      };
      const updated = updateRefund(nextRefund);
      if (!updated) {
         window.alert('KhÃ´ng thá»ƒ cáº­p nháº­t tráº¡ng thÃ¡i hoÃ n tiá»n.');
         return;
      }

      syncActualTransactionFromRefund(nextRefund, user?.id || user?.name || 'system');
      syncQuotationRefundAmount(refund.soCode);

      addRefundLog({
         id: `RLOG-${Date.now()}`,
         refundId: refund.id,
         action: note
            ? `${action.label}: ${note}`
            : `${action.label} chuyá»ƒn tráº¡ng thÃ¡i sang ${STATUS_META[action.nextStatus].label}`,
         createdAt: new Date().toISOString(),
         createdBy: user?.name || user?.role || 'Há»‡ thá»‘ng'
      });

      setNoteDraft('');
   };

   const handleAddLogNote = () => {
      if (!refund) return;

      const trimmed = noteDraft.trim();
      if (!trimmed) {
         window.alert('Nháº­p log note trÆ°á»›c khi lÆ°u.');
         return;
      }

      addRefundLog({
         id: `RLOG-${Date.now()}`,
         refundId: refund.id,
         action: `Log note: ${trimmed}`,
         createdAt: new Date().toISOString(),
         createdBy: user?.name || user?.role || 'Há»‡ thá»‘ng'
      });
      setNoteDraft('');
   };

   if (!refund) {
      return (
         <div className="flex min-h-screen items-center justify-center bg-[#f5f6f8] p-6">
            <div className="w-full max-w-md rounded-md border border-slate-200 bg-white p-6 shadow-sm">
               <div className="text-base font-bold text-slate-900">KhÃ´ng tÃ¬m tháº¥y há»“ sÆ¡ hoÃ n tiá»n</div>
               <div className="mt-2 text-[13px] text-slate-500">Báº£n ghi cÃ³ thá»ƒ Ä‘Ã£ bá»‹ xoÃ¡ hoáº·c chÆ°a tá»“n táº¡i.</div>
               <button
                  type="button"
                  onClick={() => navigate('/refunds')}
                  className="mt-4 rounded-md bg-slate-900 px-3 py-2 text-[13px] font-semibold text-white"
               >
                  Quay láº¡i danh sÃ¡ch
               </button>
            </div>
         </div>
      );
   }

   return (
      <div className="min-h-screen bg-[#f5f6f8] px-4 py-4 font-sans text-slate-900 lg:px-6">
         <div className="mx-auto max-w-[1600px]">
            <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
               <div className="border-b border-slate-200 bg-slate-50/70 px-4 py-3">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                     <div className="min-w-0">
                        <div className="mb-1 flex items-center gap-2 text-[11px] text-slate-400">
                           <button
                              type="button"
                              onClick={() => navigate('/refunds')}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50"
                           >
                              <ArrowLeft size={14} />
                           </button>
                           <span>HoÃ n tiá»n</span>
                           <ChevronRight size={12} />
                           <span className="font-semibold text-slate-500">{refund.id}</span>
                        </div>
                        <div className="truncate text-[26px] font-black leading-none text-slate-900">
                           {refund.id} â€¢ {refund.studentName}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                           <span>Táº¡o ngÃ y {formatDate(refund.createdAt)}</span>
                           <span>NgÆ°á»i táº¡o: {refund.createdBy || '--'}</span>
                        </div>
                     </div>

                     <div className="flex flex-wrap items-center gap-1.5 xl:justify-end">
                        {STATUS_STEPS.map((step, index) => {
                           const active = step === refund.status;
                           const passed = index <= currentStepIndex;
                           return (
                              <React.Fragment key={step}>
                                 <div
                                    className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-semibold ${
                                       active
                                          ? STATUS_META[step].tone
                                          : passed
                                            ? 'border-slate-300 bg-white text-slate-700'
                                            : 'border-slate-200 bg-slate-50 text-slate-400'
                                    }`}
                                 >
                                    <span className={`h-1.5 w-1.5 rounded-full ${passed ? STATUS_META[step].dot : 'bg-slate-300'}`} />
                                    {STATUS_META[step].label}
                                 </div>
                                 {index < STATUS_STEPS.length - 1 && <ChevronRight size={12} className="text-slate-300" />}
                              </React.Fragment>
                           );
                        })}
                     </div>
                  </div>
               </div>

               <div className="border-b border-slate-200 bg-white px-4 py-3">
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                     {summary.map((item) => (
                        <StatBlock key={item.label} label={item.label} value={item.value} tone={item.tone} />
                     ))}
                  </div>
               </div>

               <div className="grid grid-cols-1 gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="space-y-4">
                     <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                        <section className="rounded-md border border-slate-200 bg-white p-4">
                           <SectionTitle title="Document Info" />
                           <div className="mt-3">
                              <RowField label="Há»c viÃªn" value={refund.studentName} />
                              <RowField label="Há»“ sÆ¡" value={refund.soCode || '--'} />
                              <RowField label="Há»£p Ä‘á»“ng" value={refund.contractCode} />
                              <RowField label="ChÆ°Æ¡ng trÃ¬nh / khÃ³a há»c" value={refund.program || '--'} />
                              <RowField label="NgÆ°á»i phá»¥ trÃ¡ch há»“ sÆ¡" value={refund.ownerName || '--'} />
                              <RowField
                                 label="NgÆ°á»i táº¡o, ngÃ y táº¡o, tráº¡ng thÃ¡i"
                                 value={
                                    <div className="space-y-0.5">
                                       <div>{refund.createdBy || '--'}</div>
                                       <div className="text-[11px] text-slate-400">{formatDateTime(refund.createdAt)}</div>
                                       <div>{STATUS_META[refund.status].label}</div>
                                    </div>
                                 }
                                 multiline
                              />
                           </div>
                        </section>

                        <section className="rounded-md border border-slate-200 bg-white p-4">
                           <SectionTitle title="Financial Info" />
                           <div className="mt-3">
                              <RowField label="Sá»‘ tiá»n Ä‘Ã£ Ä‘Ã³ng" value={formatCurrency(refund.paidAmount)} />
                              <RowField label="Khoáº£n thu liÃªn quan" value={refund.relatedPaymentCode || '--'} />
                              <RowField label="Sá»‘ tiá»n Ä‘á» nghá»‹ hoÃ n" value={formatCurrency(refund.requestedAmount)} />
                              <RowField label="Sá»‘ tiá»n Ä‘á»“ng Ã½ hoÃ n" value={formatCurrency(refund.approvedAmount)} />
                              <RowField label="Sá»‘ tiá»n dá»± kiáº¿n giá»¯ láº¡i" value={formatCurrency(refund.retainedAmount)} />
                           </div>
                        </section>
                     </div>

                     <section className="rounded-md border border-slate-200 bg-white p-4">
                        <SectionTitle title="Reasons & Documents" />
                        <div className="mt-3 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                           <div className="space-y-3">
                              <RowField label="LÃ½ do hoÃ n" value={refund.reason || '--'} multiline />
                              <RowField label="CÄƒn cá»© / chÃ­nh sÃ¡ch Ã¡p dá»¥ng" value={refund.refundBasis || '--'} multiline />
                              <RowField label="Ghi chÃº ná»™i bá»™" value={refund.note || '--'} multiline />
                           </div>

                           <div className="space-y-4 rounded-md border border-slate-100 bg-slate-50/50 p-3">
                              <div>
                                 <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                                    <FileText size={14} className="text-slate-400" />
                                    File minh chá»©ng
                                 </div>
                                 <FileChipList items={refund.evidenceFiles} emptyText="ChÆ°a cÃ³ file minh chá»©ng." />
                              </div>

                              <div>
                                 <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                                    <FolderOpen size={14} className="text-slate-400" />
                                    TÃ i liá»‡u liÃªn quan
                                 </div>
                                 <FileChipList items={refund.relatedDocuments} emptyText="ChÆ°a cÃ³ tÃ i liá»‡u liÃªn quan." />
                              </div>
                           </div>
                        </div>
                     </section>
                  </div>

                  <aside className="space-y-4">
                     <section className="rounded-md border border-slate-200 bg-white p-4">
                        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                           <ShieldCheck size={14} className="text-slate-400" />
                           <div>
                              <div className="text-[14px] font-extrabold uppercase tracking-[0.18em] text-slate-700">PhÃª duyá»‡t hoÃ n tiá»n</div>
                              <div className="text-[11px] text-slate-400">Sale, káº¿ toÃ¡n, CEO vÃ  log note</div>
                           </div>
                        </div>

                        <div className="mt-3 space-y-3">
                           <div>
                              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                                 Log note
                              </label>
                              <textarea
                                 value={noteDraft}
                                 onChange={(event) => setNoteDraft(event.target.value)}
                                 className="min-h-[84px] w-full rounded-md border border-slate-200 px-3 py-2 text-[13px] text-slate-900 outline-none transition-colors focus:border-blue-400"
                                 placeholder="Nháº­p ghi chÃº xá»­ lÃ½, lÃ½ do duyá»‡t hoáº·c lÆ°u Ã½..."
                              />
                           </div>

                           <button
                              type="button"
                              onClick={handleAddLogNote}
                              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                           >
                              LÆ°u log note
                           </button>

                           {availableActions.length > 0 ? (
                              <div className="space-y-2">
                                 {availableActions.map((action) => (
                                    <button
                                       key={action.id}
                                       type="button"
                                       onClick={() => handleWorkflowAction(action)}
                                       className={`w-full rounded-md px-3 py-2 text-[13px] font-semibold transition-colors ${action.buttonClassName}`}
                                    >
                                       {action.label}
                                    </button>
                                 ))}
                              </div>
                           ) : (
                              <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-[12px] text-slate-500">
                                 KhÃ´ng cÃ³ bÆ°á»›c duyá»‡t kháº£ dá»¥ng cho vai trÃ² hiá»‡n táº¡i hoáº·c há»“ sÆ¡ Ä‘Ã£ á»Ÿ tráº¡ng thÃ¡i cuá»‘i.
                              </div>
                           )}

                           {canOpenMoneyOut && (
                              <button
                                 type="button"
                                 onClick={() =>
                                    navigate('/finance/money-out', {
                                       state: {
                                          prefillSearch: refund.id,
                                          relatedSourceTransactionId: refund.id
                                       }
                                    })
                                 }
                                 className="w-full rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[13px] font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                              >
                                 Mở Thu Chi
                              </button>
                           )}
                        </div>
                     </section>

                     <section className="rounded-md border border-slate-200 bg-white p-4">
                        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                           <Receipt size={14} className="text-slate-400" />
                           <div>
                              <div className="text-[14px] font-extrabold uppercase tracking-[0.18em] text-slate-700">Tá»•ng quan xá»­ lÃ½</div>
                              <div className="text-[11px] text-slate-400">ThÃ´ng tin nghiá»‡p vá»¥ chÃ­nh</div>
                           </div>
                        </div>
                        <div className="mt-3">
                           <RowField label="Chá»©ng tá»« chi" value={refund.paymentVoucherCode || '--'} />
                           <RowField label="NgÃ y thá»±c chi" value={formatDate(refund.payoutDate)} />
                           <RowField label="Há»“ sÆ¡ liÃªn quan" value={refund.soCode || '--'} />
                        </div>
                     </section>

                     <section className="rounded-md border border-slate-200 bg-white p-4">
                        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                           <CalendarDays size={14} className="text-slate-400" />
                           <div>
                              <div className="text-[14px] font-extrabold uppercase tracking-[0.18em] text-slate-700">Nháº­t kÃ½ xá»­ lÃ½</div>
                              <div className="text-[11px] text-slate-400">Tiáº¿n trÃ¬nh phÃª duyá»‡t hoÃ n tiá»n</div>
                           </div>
                        </div>

                        <div className="mt-3">
                           <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Bá»™ lá»c log note</div>
                              <LogAudienceFilterControl value={logAudienceFilter} onChange={setLogAudienceFilter} />
                           </div>
                           {filteredLogs.length > 0 ? (
                              <div className="space-y-3">
                                 {filteredLogs.map((log, index) => (
                                    <div key={log.id} className="relative pl-4">
                                       {index < filteredLogs.length - 1 && <div className="absolute left-[5px] top-3 h-[calc(100%+10px)] w-px bg-slate-200" />}
                                       <div className="absolute left-0 top-1.5 h-[10px] w-[10px] rounded-full border-2 border-white bg-blue-500" />
                                       <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                                          <div className="text-[12px] font-semibold leading-4 text-slate-900">{log.action}</div>
                                          <div className="mt-1 text-[11px] text-slate-500">{log.createdBy}</div>
                                          <div className="mt-1 text-[10px] text-slate-400">{formatDateTime(log.createdAt)}</div>
                                       </div>
                                    </div>
                                 ))}
                              </div>
                           ) : (
                              <div className="text-[12px] italic text-slate-400">ChÆ°a cÃ³ lá»‹ch sá»­ phÃ¹ há»£p bá»™ lá»c.</div>
                           )}
                        </div>
                     </section>

                     <section className="rounded-md border border-slate-200 bg-white p-4">
                        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                           <UserRound size={14} className="text-slate-400" />
                           <div className="text-[14px] font-extrabold uppercase tracking-[0.18em] text-slate-700">Phá»¥ trÃ¡ch</div>
                        </div>
                        <div className="mt-3 space-y-2 text-[13px] text-slate-900">
                           <div className="font-semibold">{refund.ownerName || '--'}</div>
                           <div className="text-[11px] text-slate-400">Theo dÃµi há»“ sÆ¡ hoÃ n tiá»n vÃ  phá»‘i há»£p xá»­ lÃ½.</div>
                        </div>
                     </section>
                  </aside>
               </div>
            </div>
         </div>
      </div>
   );
};

export default FinanceRefundDetail;
