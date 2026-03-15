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
import { IRefundLog, IRefundRequest, RefundStatus, UserRole } from '../types';
import { addRefundLog, getRefundLogs, getRefunds, updateRefund } from '../utils/storage';

const STATUS_META: Record<RefundStatus, { label: string; tone: string; dot: string }> = {
   NHAP: { label: 'Nháp', tone: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' },
   SALE_XAC_NHAN: { label: 'Sale xác nhận', tone: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
   KE_TOAN_KIEM_TRA: { label: 'Kế toán kiểm tra', tone: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
   CEO_DUYET: { label: 'CEO duyệt', tone: 'bg-violet-50 text-violet-700 border-violet-200', dot: 'bg-violet-500' },
   DA_HOAN: { label: 'Đã hoàn', tone: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
   TU_CHOI: { label: 'Từ chối', tone: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
   HUY_YEU_CAU: { label: 'Huỷ yêu cầu', tone: 'bg-slate-200 text-slate-600 border-slate-300', dot: 'bg-slate-400' }
};

const STATUS_STEPS: RefundStatus[] = ['NHAP', 'SALE_XAC_NHAN', 'KE_TOAN_KIEM_TRA', 'CEO_DUYET', 'DA_HOAN'];

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
   relatedPaymentCode: item.relatedPaymentCode || '',
   requestedAmount: Number(item.requestedAmount || 0),
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
   noteTitle: string;
   buttonClassName: string;
};

const canHandleSale = (role?: UserRole) =>
   role === UserRole.SALES_REP || role === UserRole.SALES_LEADER || role === UserRole.ADMIN;

const canHandleAccounting = (role?: UserRole) =>
   role === UserRole.ACCOUNTANT || role === UserRole.ADMIN;

const canHandleCeo = (role?: UserRole) =>
   role === UserRole.FOUNDER || role === UserRole.ADMIN;

const getAvailableActions = (refund: IRefundRequest, role?: UserRole): RefundAction[] => {
   const actions: RefundAction[] = [];

   if (refund.status === 'NHAP' && canHandleSale(role)) {
      actions.push({
         id: 'sale_confirm',
         label: 'Sale duyệt',
         nextStatus: 'SALE_XAC_NHAN',
         noteTitle: 'Nhập log note khi Sale duyệt',
         buttonClassName: 'bg-blue-600 text-white hover:bg-blue-700'
      });
   }

   if (refund.status === 'SALE_XAC_NHAN' && canHandleAccounting(role)) {
      actions.push({
         id: 'accounting_review',
         label: 'Kế toán duyệt',
         nextStatus: 'KE_TOAN_KIEM_TRA',
         noteTitle: 'Nhập log note khi kế toán kiểm tra',
         buttonClassName: 'bg-amber-500 text-white hover:bg-amber-600'
      });
   }

   if (refund.status === 'KE_TOAN_KIEM_TRA' && canHandleCeo(role)) {
      actions.push({
         id: 'ceo_approve',
         label: 'CEO duyệt',
         nextStatus: 'CEO_DUYET',
         noteTitle: 'Nhập log note khi CEO duyệt',
         buttonClassName: 'bg-violet-600 text-white hover:bg-violet-700'
      });
   }

   if (refund.status === 'CEO_DUYET' && canHandleAccounting(role)) {
      actions.push({
         id: 'mark_refunded',
         label: 'Đánh dấu đã hoàn',
         nextStatus: 'DA_HOAN',
         noteTitle: 'Nhập log note khi hoàn tiền xong',
         buttonClassName: 'bg-emerald-600 text-white hover:bg-emerald-700'
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
         { label: 'Đã đóng', value: formatCurrency(refund.paidAmount), tone: 'text-slate-900' },
         { label: 'Đề nghị hoàn', value: formatCurrency(refund.requestedAmount), tone: 'text-orange-600' },
         { label: 'Giữ lại', value: formatCurrency(refund.retainedAmount), tone: 'text-amber-600' },
         { label: 'Duyệt hoàn', value: formatCurrency(refund.approvedAmount), tone: 'text-emerald-600' }
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

   const handleWorkflowAction = (action: RefundAction) => {
      if (!refund) return;

      const input = window.prompt(action.noteTitle, noteDraft.trim());
      if (input === null) return;

      const note = input.trim();
      const nextRefund: IRefundRequest = { ...refund, status: action.nextStatus };
      const updated = updateRefund(nextRefund);
      if (!updated) {
         window.alert('Không thể cập nhật trạng thái hoàn tiền.');
         return;
      }

      addRefundLog({
         id: `RLOG-${Date.now()}`,
         refundId: refund.id,
         action: note
            ? `${action.label}: ${note}`
            : `${action.label} chuyển trạng thái sang ${STATUS_META[action.nextStatus].label}`,
         createdAt: new Date().toISOString(),
         createdBy: user?.name || user?.role || 'Hệ thống'
      });

      setNoteDraft('');
   };

   const handleAddLogNote = () => {
      if (!refund) return;

      const trimmed = noteDraft.trim();
      if (!trimmed) {
         window.alert('Nhập log note trước khi lưu.');
         return;
      }

      addRefundLog({
         id: `RLOG-${Date.now()}`,
         refundId: refund.id,
         action: `Log note: ${trimmed}`,
         createdAt: new Date().toISOString(),
         createdBy: user?.name || user?.role || 'Hệ thống'
      });
      setNoteDraft('');
   };

   if (!refund) {
      return (
         <div className="flex min-h-screen items-center justify-center bg-[#f5f6f8] p-6">
            <div className="w-full max-w-md rounded-md border border-slate-200 bg-white p-6 shadow-sm">
               <div className="text-base font-bold text-slate-900">Không tìm thấy hồ sơ hoàn tiền</div>
               <div className="mt-2 text-[13px] text-slate-500">Bản ghi có thể đã bị xoá hoặc chưa tồn tại.</div>
               <button
                  type="button"
                  onClick={() => navigate('/refunds')}
                  className="mt-4 rounded-md bg-slate-900 px-3 py-2 text-[13px] font-semibold text-white"
               >
                  Quay lại danh sách
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
                           <span>Hoàn tiền</span>
                           <ChevronRight size={12} />
                           <span className="font-semibold text-slate-500">{refund.id}</span>
                        </div>
                        <div className="truncate text-[26px] font-black leading-none text-slate-900">
                           {refund.id} • {refund.studentName}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                           <span>Tạo ngày {formatDate(refund.createdAt)}</span>
                           <span>Người tạo: {refund.createdBy || '--'}</span>
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
                              <RowField label="Học viên" value={refund.studentName} />
                              <RowField label="Hồ sơ" value={refund.soCode || '--'} />
                              <RowField label="Hợp đồng" value={refund.contractCode} />
                              <RowField label="Chương trình / khóa học" value={refund.program || '--'} />
                              <RowField label="Người phụ trách hồ sơ" value={refund.ownerName || '--'} />
                              <RowField
                                 label="Người tạo, ngày tạo, trạng thái"
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
                              <RowField label="Số tiền đã đóng" value={formatCurrency(refund.paidAmount)} />
                              <RowField label="Khoản thu liên quan" value={refund.relatedPaymentCode || '--'} />
                              <RowField label="Số tiền đề nghị hoàn" value={formatCurrency(refund.requestedAmount)} />
                              <RowField label="Số tiền dự kiến giữ lại" value={formatCurrency(refund.retainedAmount)} />
                           </div>
                        </section>
                     </div>

                     <section className="rounded-md border border-slate-200 bg-white p-4">
                        <SectionTitle title="Reasons & Documents" />
                        <div className="mt-3 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                           <div className="space-y-3">
                              <RowField label="Lý do hoàn" value={refund.reason || '--'} multiline />
                              <RowField label="Căn cứ / chính sách áp dụng" value={refund.refundBasis || '--'} multiline />
                              <RowField label="Ghi chú nội bộ" value={refund.note || '--'} multiline />
                           </div>

                           <div className="space-y-4 rounded-md border border-slate-100 bg-slate-50/50 p-3">
                              <div>
                                 <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                                    <FileText size={14} className="text-slate-400" />
                                    File minh chứng
                                 </div>
                                 <FileChipList items={refund.evidenceFiles} emptyText="Chưa có file minh chứng." />
                              </div>

                              <div>
                                 <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                                    <FolderOpen size={14} className="text-slate-400" />
                                    Tài liệu liên quan
                                 </div>
                                 <FileChipList items={refund.relatedDocuments} emptyText="Chưa có tài liệu liên quan." />
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
                              <div className="text-[14px] font-extrabold uppercase tracking-[0.18em] text-slate-700">Phê duyệt hoàn tiền</div>
                              <div className="text-[11px] text-slate-400">Sale, kế toán, CEO và log note</div>
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
                                 placeholder="Nhập ghi chú xử lý, lý do duyệt hoặc lưu ý..."
                              />
                           </div>

                           <button
                              type="button"
                              onClick={handleAddLogNote}
                              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                           >
                              Lưu log note
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
                                 Không có bước duyệt khả dụng cho vai trò hiện tại hoặc hồ sơ đã ở trạng thái cuối.
                              </div>
                           )}
                        </div>
                     </section>

                     <section className="rounded-md border border-slate-200 bg-white p-4">
                        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                           <Receipt size={14} className="text-slate-400" />
                           <div>
                              <div className="text-[14px] font-extrabold uppercase tracking-[0.18em] text-slate-700">Tổng quan xử lý</div>
                              <div className="text-[11px] text-slate-400">Thông tin nghiệp vụ chính</div>
                           </div>
                        </div>
                        <div className="mt-3">
                           <RowField label="Chứng từ chi" value={refund.paymentVoucherCode || '--'} />
                           <RowField label="Ngày thực chi" value={formatDate(refund.payoutDate)} />
                           <RowField label="Hồ sơ liên quan" value={refund.soCode || '--'} />
                        </div>
                     </section>

                     <section className="rounded-md border border-slate-200 bg-white p-4">
                        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                           <CalendarDays size={14} className="text-slate-400" />
                           <div>
                              <div className="text-[14px] font-extrabold uppercase tracking-[0.18em] text-slate-700">Nhật ký xử lý</div>
                              <div className="text-[11px] text-slate-400">Tiến trình phê duyệt hoàn tiền</div>
                           </div>
                        </div>

                        <div className="mt-3">
                           {logs.length > 0 ? (
                              <div className="space-y-3">
                                 {logs.map((log, index) => (
                                    <div key={log.id} className="relative pl-4">
                                       {index < logs.length - 1 && <div className="absolute left-[5px] top-3 h-[calc(100%+10px)] w-px bg-slate-200" />}
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
                              <div className="text-[12px] italic text-slate-400">Chưa có lịch sử xử lý.</div>
                           )}
                        </div>
                     </section>

                     <section className="rounded-md border border-slate-200 bg-white p-4">
                        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                           <UserRound size={14} className="text-slate-400" />
                           <div className="text-[14px] font-extrabold uppercase tracking-[0.18em] text-slate-700">Phụ trách</div>
                        </div>
                        <div className="mt-3 space-y-2 text-[13px] text-slate-900">
                           <div className="font-semibold">{refund.ownerName || '--'}</div>
                           <div className="text-[11px] text-slate-400">Theo dõi hồ sơ hoàn tiền và phối hợp xử lý.</div>
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
