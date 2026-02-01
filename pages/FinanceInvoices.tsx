
import React, { useState } from 'react';
import { 
  Search, 
  FileText, 
  Send, 
  Download, 
  Printer, 
  MoreHorizontal, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle
} from 'lucide-react';

const FinanceInvoices: React.FC = () => {
  const [activeTab, setActiveTab] = useState('all');

  // Mock Invoice Data
  const INVOICES = [
    { id: 'INV-2023-001', customer: 'Nguyễn Văn Nam', amount: 15000000, date: '24/10/2023', status: 'sent', type: 'vat' },
    { id: 'INV-2023-002', customer: 'Trần Thị Bích', amount: 5000000, date: '23/10/2023', status: 'draft', type: 'vat' },
    { id: 'INV-2023-003', customer: 'Lê Hoàng', amount: 8000000, date: '23/10/2023', status: 'paid', type: 'normal' },
    { id: 'INV-2023-004', customer: 'Phạm Hương', amount: 25000000, date: '22/10/2023', status: 'cancelled', type: 'vat' },
  ];

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  const TABS = [
      { id: 'all', label: 'Tất cả' },
      { id: 'draft', label: 'Nháp' },
      { id: 'sent', label: 'Đã gửi' },
      { id: 'paid', label: 'Đã thanh toán' },
      { id: 'cancelled', label: 'Đã hủy' },
  ];

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#111418] font-sans overflow-hidden">
      <div className="flex flex-col flex-1 overflow-y-auto p-6 lg:p-8">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Quản lý Hóa đơn (e-Invoice)</h1>
            <p className="text-slate-500">Tự động phát hành, quản lý hóa đơn VAT và gửi cơ quan thuế.</p>
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg flex items-center gap-2 shadow-sm">
            <FileText size={18} /> Tạo Hóa đơn mới
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-center gap-4">
           <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                 type="text" 
                 placeholder="Tìm theo mã HĐ, tên khách hàng, MST..." 
                 className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
           </div>
           <div className="flex gap-2">
              {TABS.map(tab => (
                 <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === tab.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                 >
                    {tab.label}
                 </button>
              ))}
           </div>
           <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600">
              <Filter size={20} />
           </button>
        </div>

        {/* Invoice Table */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
           <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                 <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Mã Hóa đơn</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Khách hàng</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Loại HĐ</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng tiền</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ngày tạo</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Thao tác</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                 {INVOICES.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                       <td className="px-6 py-4 text-sm font-bold text-blue-600 font-mono">{inv.id}</td>
                       <td className="px-6 py-4 text-sm font-bold text-slate-900">{inv.customer}</td>
                       <td className="px-6 py-4">
                          <span className={`text-xs font-bold px-2 py-1 rounded border ${inv.type === 'vat' ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                             {inv.type === 'vat' ? 'HĐ GTGT' : 'HĐ Thường'}
                          </span>
                       </td>
                       <td className="px-6 py-4 text-sm font-bold text-slate-900">{formatCurrency(inv.amount)}</td>
                       <td className="px-6 py-4 text-sm text-slate-600">{inv.date}</td>
                       <td className="px-6 py-4">
                          {inv.status === 'sent' && <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded"><Send size={12}/> Đã gửi</span>}
                          {inv.status === 'draft' && <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded"><FileText size={12}/> Nháp</span>}
                          {inv.status === 'paid' && <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded"><CheckCircle2 size={12}/> Đã thanh toán</span>}
                          {inv.status === 'cancelled' && <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded"><AlertCircle size={12}/> Đã hủy</span>}
                       </td>
                       <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                             <button className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded" title="In">
                                <Printer size={16} />
                             </button>
                             <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Tải PDF">
                                <Download size={16} />
                             </button>
                             <button className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded">
                                <MoreHorizontal size={16} />
                             </button>
                          </div>
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
           
           {/* Pagination */}
           <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
              <span className="text-xs text-slate-500 font-bold">Hiển thị 4 hóa đơn</span>
              <div className="flex gap-1">
                 <button className="p-1 rounded hover:bg-slate-200 text-slate-500"><ChevronLeft size={18}/></button>
                 <button className="p-1 rounded hover:bg-slate-200 text-slate-500"><ChevronRight size={18}/></button>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default FinanceInvoices;
