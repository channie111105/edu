import React, { useState, useEffect } from 'react';
import {
   Search, FileText, Send, Download, Printer, MoreHorizontal, Filter,
   ChevronLeft, ChevronRight, CheckCircle2, Clock, AlertCircle, Plus, X
} from 'lucide-react';
import { IInvoice, InvoiceStatus, UserRole } from '../types';
import { getInvoices, addInvoice, updateInvoice, getQuotations } from '../utils/storage';
import { useAuth } from '../contexts/AuthContext';

const FinanceInvoices: React.FC = () => {
   const { user } = useAuth();
   const [invoices, setInvoices] = useState<IInvoice[]>([]);
   const [activeTab, setActiveTab] = useState('ALL');
   const [showCreateModal, setShowCreateModal] = useState(false);
   const [searchTerm, setSearchTerm] = useState('');

   // Create Invoice Form State
   const [newInvoiceData, setNewInvoiceData] = useState<Partial<IInvoice>>({
      customerName: '',
      totalAmount: 0,
      issueDate: new Date().toISOString().slice(0, 10),
      items: []
   });
   const [selectedSO, setSelectedSO] = useState('');

   useEffect(() => {
      setInvoices(getInvoices());
   }, []);

   const handleCreateInvoice = () => {
      const nextId = invoices.length + 1;
      const code = `INV-2026-${nextId.toString().padStart(3, '0')}`;

      const newInv: IInvoice = {
         id: `INV-${Date.now()}`,
         code: code,
         customerName: newInvoiceData.customerName || 'Khách lẻ',
         issueDate: newInvoiceData.issueDate || new Date().toISOString(),
         status: InvoiceStatus.DRAFT,
         totalAmount: newInvoiceData.totalAmount || 0,
         subTotal: newInvoiceData.totalAmount || 0, // Simplified
         taxAmount: 0,
         items: newInvoiceData.items || [],
         createdBy: user?.name || 'Accountant',
         createdAt: new Date().toISOString()
      };

      addInvoice(newInv);
      setInvoices(getInvoices());
      setShowCreateModal(false);
      setNewInvoiceData({});
      setSelectedSO('');
   };

   const handleSelectSO = (soId: string) => {
      setSelectedSO(soId);
      const soList = getQuotations();
      const so = soList.find(q => q.id === soId);
      if (so) {
         setNewInvoiceData({
            customerName: so.customerName,
            totalAmount: so.finalAmount,
            soId: so.id,
            items: [{
               name: so.product,
               quantity: 1,
               price: so.amount,
               total: so.finalAmount
            }]
         });
      }
   };

   const handleSendEmail = (inv: IInvoice) => {
      const updated = { ...inv, status: InvoiceStatus.SENT };
      updateInvoice(updated);
      setInvoices(getInvoices());
      alert(`Đã gửi Hóa đơn ${inv.code} qua Email cho khách hàng!`);
   };

   const handlePrint = (inv: IInvoice) => {
      const updated = { ...inv, status: InvoiceStatus.PRINTED };
      updateInvoice(updated);
      setInvoices(getInvoices());
      // In real app, open print window here
      alert('Đang mở cửa sổ in...');
   };

   const filteredData = invoices.filter(inv => {
      const matchesTab = activeTab === 'ALL' || inv.status === activeTab;
      const matchesSearch = inv.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
         inv.customerName.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesTab && matchesSearch;
   });

   // Get locked SOs for dropdown
   const lockedSOs = getQuotations()?.filter(q => q.status === 'Locked' || q.status === 'Sale Order') || [];

   const getStatusStyle = (status: InvoiceStatus) => {
      switch (status) {
         case InvoiceStatus.SENT: return 'bg-blue-50 text-blue-600 border-blue-200';
         case InvoiceStatus.PRINTED: return 'bg-purple-50 text-purple-600 border-purple-200';
         case InvoiceStatus.DRAFT: return 'bg-slate-100 text-slate-500 border-slate-200';
         case InvoiceStatus.CANCELLED: return 'bg-red-50 text-red-600 border-red-200';
         default: return 'bg-slate-50 text-slate-600';
      }
   };

   return (
      <div className="flex flex-col h-full bg-[#f8fafc] text-[#111418] font-sans overflow-hidden">
         <div className="flex flex-col flex-1 overflow-y-auto p-6 max-w-[1600px] mx-auto w-full">

            {/* Header */}
            <div className="flex justify-between items-center mb-6">
               <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">Quản lý Hóa đơn (e-Invoice)</h1>
                  <p className="text-slate-500 text-sm mt-1">Tự động phát hành, quản lý hóa đơn VAT và gửi cho học viên.</p>
               </div>
               {user?.role === UserRole.ACCOUNTANT && (
                  <button
                     onClick={() => setShowCreateModal(true)}
                     className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 shadow-sm transition-colors"
                  >
                     <Plus size={18} /> Tạo Hóa đơn
                  </button>
               )}
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-center gap-4">
               <div className="relative flex-1 min-w-[300px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                     type="text"
                     placeholder="Tìm theo mã hóa đơn, tên học viên..."
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
               </div>
               <div className="flex gap-2">
                  <button onClick={() => setActiveTab('ALL')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'ALL' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-600'}`}>Tất cả</button>
                  <button onClick={() => setActiveTab(InvoiceStatus.DRAFT)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === InvoiceStatus.DRAFT ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-600'}`}>Nháp</button>
                  <button onClick={() => setActiveTab(InvoiceStatus.SENT)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === InvoiceStatus.SENT ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 text-slate-600'}`}>Đã gửi</button>
                  <button onClick={() => setActiveTab(InvoiceStatus.PRINTED)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === InvoiceStatus.PRINTED ? 'bg-purple-600 text-white' : 'hover:bg-slate-100 text-slate-600'}`}>Đã in</button>
               </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex-1">
               <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs font-bold tracking-wider">
                     <tr>
                        <th className="px-6 py-4">Mã Hóa đơn</th>
                        <th className="px-6 py-4">Khách hàng</th>
                        <th className="px-6 py-4 text-right">Tổng tiền</th>
                        <th className="px-6 py-4">Ngày xuất</th>
                        <th className="px-6 py-4 text-center">Trạng thái</th>
                        <th className="px-6 py-4 text-right">Hành động</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {filteredData.length > 0 ? (
                        filteredData.map((inv) => (
                           <tr key={inv.id} className="hover:bg-indigo-50/30 transition-colors group">
                              <td className="px-6 py-4 font-mono font-bold text-indigo-600">{inv.code}</td>
                              <td className="px-6 py-4">
                                 <div className="font-bold text-slate-900">{inv.customerName}</div>
                                 {inv.companyName && <div className="text-xs text-slate-500 truncate max-w-[200px]">{inv.companyName}</div>}
                              </td>
                              <td className="px-6 py-4 text-right font-bold text-slate-900">
                                 {inv.totalAmount?.toLocaleString()} đ
                              </td>
                              <td className="px-6 py-4 text-slate-600 text-sm">{new Date(inv.issueDate).toLocaleDateString()}</td>
                              <td className="px-6 py-4 text-center">
                                 <span className={`px-3 py-1 rounded border text-xs font-bold inline-flex items-center gap-1 ${getStatusStyle(inv.status)}`}>
                                    {inv.status === InvoiceStatus.SENT && <Send size={12} />}
                                    {inv.status === InvoiceStatus.PRINTED && <Printer size={12} />}
                                    {inv.status}
                                 </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                 <div className="flex justify-end gap-2 opacity-100 group-hover:opacity-100 transition-opacity">
                                    <button
                                       onClick={() => handleSendEmail(inv)}
                                       className="p-1.5 text-blue-600 hover:bg-blue-50 rounded border border-transparent hover:border-blue-200 transition-all"
                                       title="Gửi Email"
                                    >
                                       <Send size={16} />
                                    </button>
                                    <button
                                       onClick={() => handlePrint(inv)}
                                       className="p-1.5 text-slate-600 hover:bg-slate-100 rounded border border-transparent hover:border-slate-300 transition-all"
                                       title="In Hóa đơn"
                                    >
                                       <Printer size={16} />
                                    </button>
                                    <button className="p-1.5 text-slate-400 hover:text-slate-600">
                                       <MoreHorizontal size={16} />
                                    </button>
                                 </div>
                              </td>
                           </tr>
                        ))
                     ) : (
                        <tr>
                           <td colSpan={6} className="text-center py-12 text-slate-500">
                              Chưa có hóa đơn nào.
                           </td>
                        </tr>
                     )}
                  </tbody>
               </table>
            </div>

         </div>

         {/* Create Modal */}
         {showCreateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
               <div className="bg-white rounded-xl shadow-2xl p-6 max-w-lg w-full animate-in zoom-in-95">
                  <div className="flex justify-between items-center mb-6">
                     <h3 className="text-xl font-bold text-slate-900">Tạo Hóa đơn Mới</h3>
                     <button onClick={() => setShowCreateModal(false)}><X className="text-slate-400 hover:text-slate-600" /></button>
                  </div>

                  <div className="space-y-4">
                     {/* Option 1: Select SO */}
                     <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                        <label className="block text-sm font-bold text-indigo-900 mb-2">Chọn Đơn hàng (Sale Order)</label>
                        <select
                           className="w-full p-2 border border-indigo-200 rounded bg-white text-sm"
                           value={selectedSO}
                           onChange={(e) => handleSelectSO(e.target.value)}
                        >
                           <option value="">-- Chọn đơn hàng để tự động điền --</option>
                           {lockedSOs.map(so => (
                              <option key={so.id} value={so.id}>
                                 {so.soCode} - {so.customerName} ({so.finalAmount?.toLocaleString()}đ)
                              </option>
                           ))}
                        </select>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Khách hàng</label>
                           <input
                              className="w-full p-2 border border-slate-300 rounded font-bold text-slate-900"
                              value={newInvoiceData.customerName || ''}
                              onChange={(e) => setNewInvoiceData(p => ({ ...p, customerName: e.target.value }))}
                           />
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Ngày xuất</label>
                           <input
                              type="date"
                              className="w-full p-2 border border-slate-300 rounded"
                              value={newInvoiceData.issueDate || ''}
                              onChange={(e) => setNewInvoiceData(p => ({ ...p, issueDate: e.target.value }))}
                           />
                        </div>
                     </div>

                     <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Tổng tiền (Sau thuế)</label>
                        <div className="relative">
                           <input
                              type="number"
                              className="w-full p-2 pl-4 border border-slate-300 rounded font-bold text-lg text-slate-900"
                              value={newInvoiceData.totalAmount || ''}
                              onChange={(e) => setNewInvoiceData(p => ({ ...p, totalAmount: Number(e.target.value) }))}
                           />
                           <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">VND</span>
                        </div>
                     </div>

                     <hr className="border-slate-100 my-2" />

                     {/* Additional Info */}
                     <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Tên công ty / MST (Nếu có)</label>
                        <input
                           className="w-full p-2 border border-slate-300 rounded text-sm placeholder:italic"
                           placeholder="Nhập tên công ty..."
                           value={newInvoiceData.companyName || ''}
                           onChange={(e) => setNewInvoiceData(p => ({ ...p, companyName: e.target.value }))}
                        />
                     </div>

                     <div className="flex justify-end gap-3 mt-6">
                        <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 hover:bg-slate-100 rounded text-slate-600 font-bold">Hủy</button>
                        <button onClick={handleCreateInvoice} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded hover:bg-indigo-700 shadow-md">
                           Lưu Hóa đơn
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
