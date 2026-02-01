
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Bell, 
  Receipt, 
  DollarSign, 
  History, 
  BarChart3, 
  FileText, 
  Clock, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight, 
  Image as ImageIcon,
  MoreHorizontal,
  Filter,
  X,
  Check,
  Download
} from 'lucide-react';

const FinanceTransactionQueue: React.FC = () => {
  const navigate = useNavigate();
  const [showInvoiceToast, setShowInvoiceToast] = useState(false);

  // Mock Data
  const [transactions, setTransactions] = useState([
    {
      id: 'TRX-9021',
      contractId: 'HĐ-2023-089',
      studentName: 'Phạm Văn Hùng',
      detail: 'Thanh toán Đợt 1 - Du học Đức',
      amount: 37500000,
      status: 'approved',
      date: '24/10/2023 09:30',
      proofUrl: '#'
    },
    {
      id: 'TRX-9104',
      contractId: 'HĐ-2023-092',
      studentName: 'Trần Thị Mai',
      detail: 'Học phí trọn gói - Tiếng Trung',
      amount: 12000000,
      status: 'pending',
      date: '24/10/2023 10:15',
      proofUrl: '#'
    },
    {
      id: 'TRX-8892',
      contractId: 'HĐ-2023-095',
      studentName: 'Lê Hoàng',
      detail: 'Phí ghi danh - Workshop',
      amount: 500000,
      status: 'approved',
      date: '23/10/2023 14:20',
      proofUrl: '#'
    },
    {
      id: 'TRX-8877',
      contractId: 'HĐ-2023-088',
      studentName: 'Nguyễn Thùy Linh',
      detail: 'Đợt 2 - Tiếng Đức A2',
      amount: 8000000,
      status: 'pending',
      date: '23/10/2023 16:45',
      proofUrl: '#'
    }
  ]);

  const handleApprove = (id: string) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, status: 'approved' } : t));
  };

  const handleReject = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn từ chối giao dịch này? Sales sẽ nhận được thông báo.')) {
        setTransactions(prev => prev.filter(t => t.id !== id));
    }
  };

  const handleGenerateInvoice = () => {
    setShowInvoiceToast(true);
    setTimeout(() => setShowInvoiceToast(false), 3000);
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#101922] font-sans text-slate-900 dark:text-slate-100 overflow-hidden">
      
      {/* Module Header (Internal Navigation) */}
      <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200 sticky top-0 z-20">
         <div className="flex items-center gap-4">
            <button onClick={() => navigate('/finance')} className="text-slate-500 hover:text-blue-600 transition-colors">
               <ChevronLeft size={24} />
            </button>
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                  <Receipt size={20} />
               </div>
               <div>
                  <h1 className="text-lg font-bold text-slate-900 leading-tight">Nghiệp vụ Tài chính</h1>
                  <p className="text-xs text-slate-500">EduCRM Finance Module</p>
               </div>
            </div>
         </div>
         
         <div className="flex items-center gap-4">
            <div className="relative">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
               <input 
                  type="text" 
                  placeholder="Tìm mã HĐ, Tên HV..." 
                  className="pl-9 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64 transition-all"
               />
            </div>
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full relative">
               <Bell size={20} />
               <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
         </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
         
         {/* LEFT SIDEBAR: Finance Ops */}
         <aside className="w-64 bg-white border-r border-slate-200 hidden lg:flex flex-col p-4 gap-6 overflow-y-auto">
            <div>
               <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-3">Vận hành (Ops)</p>
               <div className="flex flex-col gap-1">
                  <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-blue-50 text-blue-700 font-bold shadow-sm">
                     <Receipt size={18} />
                     <span className="text-sm">Hàng chờ Giao dịch</span>
                  </button>
                  <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors font-medium">
                     <DollarSign size={18} />
                     <span className="text-sm">Duyệt Phí / Miễn giảm</span>
                  </button>
                  <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors font-medium">
                     <History size={18} />
                     <span className="text-sm">Lịch sử Thu phí</span>
                  </button>
               </div>
            </div>

            <div>
               <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-3">Báo cáo</p>
               <div className="flex flex-col gap-1">
                  <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors font-medium">
                     <BarChart3 size={18} />
                     <span className="text-sm">Phân tích Doanh thu</span>
                  </button>
                  <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors font-medium">
                     <FileText size={18} />
                     <span className="text-sm">Nhật ký Hóa đơn</span>
                  </button>
               </div>
            </div>
         </aside>

         {/* MAIN CONTENT AREA */}
         <main className="flex-1 overflow-y-auto bg-[#f8fafc] p-6 lg:p-8 relative">
            
            {/* Page Title */}
            <div className="flex flex-col gap-1 mb-8">
               <h2 className="text-3xl font-black text-slate-900 tracking-tight">Hàng chờ Duyệt Giao dịch</h2>
               <p className="text-slate-500">Kiểm tra minh chứng thanh toán (UNC), đối chiếu ngân hàng và xuất hóa đơn.</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
               <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                     <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Chờ duyệt</p>
                     <Clock className="text-amber-500" size={20} />
                  </div>
                  <p className="text-3xl font-bold text-slate-900">18</p>
               </div>
               
               <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                     <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cần xuất HĐ</p>
                     <FileText className="text-blue-600" size={20} />
                  </div>
                  <p className="text-3xl font-bold text-slate-900">7</p>
               </div>

               <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                     <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Đã duyệt hôm nay</p>
                     <CheckCircle2 className="text-green-500" size={20} />
                  </div>
                  <p className="text-3xl font-bold text-slate-900">24</p>
               </div>

               <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                     <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Doanh số (24h)</p>
                     <DollarSign className="text-slate-400" size={20} />
                  </div>
                  <p className="text-3xl font-bold text-slate-900">1.2 Tỷ</p>
               </div>
            </div>

            {/* Transaction Table */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
               <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                     <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                           <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Mã Hợp đồng</th>
                           <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Học viên & Nội dung</th>
                           <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Minh chứng (UNC)</th>
                           <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Số tiền</th>
                           <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                           <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Thao tác</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                        {transactions.map((trx) => (
                           <tr key={trx.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4">
                                 <span className="text-sm font-bold text-blue-600 font-mono">{trx.contractId}</span>
                                 <div className="text-xs text-slate-400 mt-0.5">{trx.id}</div>
                              </td>
                              <td className="px-6 py-4">
                                 <div className="flex flex-col">
                                    <span className="text-sm font-bold text-slate-900">{trx.studentName}</span>
                                    <span className="text-xs text-slate-500">{trx.detail}</span>
                                 </div>
                              </td>
                              <td className="px-6 py-4">
                                 <div className="flex items-center gap-2 group cursor-pointer">
                                    <div className="w-10 h-10 rounded border border-slate-200 bg-slate-100 flex items-center justify-center group-hover:border-blue-300 transition-colors">
                                       <ImageIcon size={20} className="text-slate-400 group-hover:text-blue-500" />
                                    </div>
                                    <span className="text-xs font-medium text-blue-600 hover:underline">Xem ảnh</span>
                                 </div>
                              </td>
                              <td className="px-6 py-4">
                                 <span className="text-sm font-bold text-slate-900">{formatCurrency(trx.amount)}</span>
                              </td>
                              <td className="px-6 py-4">
                                 {trx.status === 'approved' ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">
                                       Đã duyệt
                                    </span>
                                 ) : (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                                       Chờ duyệt
                                    </span>
                                 )}
                              </td>
                              <td className="px-6 py-4 text-right">
                                 {trx.status === 'approved' ? (
                                    <button 
                                       onClick={handleGenerateInvoice}
                                       className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
                                    >
                                       <FileText size={14} /> Xuất hóa đơn
                                    </button>
                                 ) : (
                                    <div className="flex justify-end gap-2">
                                       <button 
                                          onClick={() => handleReject(trx.id)}
                                          className="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg text-xs font-bold transition-colors"
                                       >
                                          Từ chối
                                       </button>
                                       <button 
                                          onClick={() => handleApprove(trx.id)}
                                          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
                                       >
                                          Duyệt
                                       </button>
                                    </div>
                                 )}
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
               
               {/* Pagination */}
               <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
                  <p className="text-xs font-medium text-slate-500">Hiển thị {transactions.length} giao dịch đang chờ xử lý</p>
                  <div className="flex gap-1">
                     <button className="p-2 rounded hover:bg-slate-200 text-slate-500 disabled:opacity-50" disabled>
                        <ChevronLeft size={16} />
                     </button>
                     <button className="w-8 h-8 rounded bg-blue-600 text-white text-xs font-bold shadow-sm">1</button>
                     <button className="w-8 h-8 rounded text-slate-600 text-xs font-bold hover:bg-slate-200">2</button>
                     <button className="p-2 rounded hover:bg-slate-200 text-slate-600 transition-colors">
                        <ChevronRight size={16} />
                     </button>
                  </div>
               </div>
            </div>

         </main>
      </div>

      {/* Invoice Toast Notification */}
      {showInvoiceToast && (
         <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 border border-slate-700 animate-in slide-in-from-bottom-4 z-50">
            <CheckCircle2 className="text-green-400" size={24} />
            <div className="flex flex-col">
               <p className="text-sm font-bold">Xuất Hóa đơn Thành công</p>
               <p className="text-xs opacity-80">Đã gửi PDF hóa đơn về email của học viên.</p>
            </div>
         </div>
      )}

    </div>
  );
};

export default FinanceTransactionQueue;
