import React, { useState } from 'react';
import {
   CheckCircle2,
   XCircle,
   Eye,
   Search,
   Filter,
   Clock,
   FileText,
   AlertCircle,
   MoreHorizontal,
   ChevronLeft,
   ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Mock Transaction Data (Pending Approval)
const TRANSACTIONS = [
   {
      id: 'TRX-9021',
      contractCode: 'HD-2023-089',
      student: 'Phạm Văn Hùng',
      className: 'Du học Đức',
      amount: 37500000,
      method: 'Chuyển khoản',
      proof: 'https://via.placeholder.com/150', // Mock image
      date: '24/10/2023 10:30',
      type: 'Thanh toán Đợt 1',
      status: 'approved',
      salesRep: 'Nguyễn Văn A'
   },
   {
      id: 'TRX-9104',
      contractCode: 'HD-2023-082',
      student: 'Trần Thị Mai',
      className: 'Tiếng Trung',
      amount: 12000000,
      method: 'Chuyển khoản',
      proof: 'https://via.placeholder.com/150',
      date: '24/10/2023 09:15',
      type: 'Học phí trọn gói',
      status: 'pending',
      salesRep: 'Lê Thị B'
   },
   {
      id: 'TRX-8892',
      contractCode: 'HD-2023-085',
      student: 'Lê Hoàng',
      className: 'Workshop',
      amount: 500000,
      method: 'QR Code',
      proof: 'https://via.placeholder.com/150',
      date: '23/10/2023 15:45',
      type: 'Phí ghi danh',
      status: 'approved',
      salesRep: 'Nguyễn Văn A'
   },
   {
      id: 'TRX-8877',
      contractCode: 'HD-2023-088',
      student: 'Nguyễn Thùy Linh',
      className: 'Tiếng Đức A2',
      amount: 8000000,
      method: 'Chuyển khoản',
      proof: 'https://via.placeholder.com/150',
      date: '23/10/2023 14:20',
      type: 'Đợt 2',
      status: 'pending',
      salesRep: 'Trần C'
   }
];

const FinanceTransactionQueue: React.FC = () => {
   const navigate = useNavigate();
   const [filter, setFilter] = useState('pending'); // all, pending, approved, rejected

   // Filter Data
   const filteredData = TRANSACTIONS.filter(t => {
      if (filter === 'all') return true;
      return t.status === filter;
   });

   const formatCurrency = (val: number) =>
      new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

   return (
      <div className="flex flex-col h-full bg-[#F8FAFC]">

         {/* Main Content Area - Full Width No Sidebar */}
         <div className="flex-1 p-8 max-w-[1600px] mx-auto w-full overflow-y-auto">

            {/* Header Section - Cleaned up */}
            <div className="mb-8">
               <h1 className="text-2xl font-bold text-slate-900">Hàng chờ Duyệt Giao dịch</h1>
               <p className="text-slate-500 mt-1">Kiểm tra minh chứng thanh toán (UNC) và đối chiếu ngân hàng trước khi ghi nhận doanh thu.</p>
            </div>

            {/* --- KPI STATS (Focused on Approval Workflow) --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
               <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                     <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Chờ Duyệt</p>
                     <p className="text-3xl font-black text-orange-500">18</p>
                     <p className="text-xs text-slate-400 mt-1">Giao dịch cần xử lý</p>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-full text-orange-500">
                     <Clock size={24} />
                  </div>
               </div>

               <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                     <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Cần Xuất HĐ</p>
                     <p className="text-3xl font-black text-blue-600">7</p>
                     <p className="text-xs text-slate-400 mt-1">Hóa đơn GTGT yêu cầu</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-full text-blue-600">
                     <FileText size={24} />
                  </div>
               </div>

               <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                     <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Đã Duyệt Hôm Nay</p>
                     <p className="text-3xl font-black text-emerald-600">24</p>
                     <p className="text-xs text-slate-400 mt-1">Thành công</p>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-full text-emerald-600">
                     <CheckCircle2 size={24} />
                  </div>
               </div>

               {/* REVENUE CARD REMOVED AS REQUESTED */}
            </div>

            {/* --- MAIN TRANSACTION TABLE --- */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
               {/* Toolbar */}
               <div className="p-4 border-b border-slate-200 flex flex-wrap gap-4 items-center justify-between">
                  <div className="flex gap-2">
                     <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filter === 'all' ? 'bg-slate-800 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                     >
                        Tất cả
                     </button>
                     <button
                        onClick={() => setFilter('pending')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${filter === 'pending' ? 'bg-orange-500 text-white shadow' : 'bg-orange-50 text-orange-600 hover:bg-orange-100'}`}
                     >
                        <Clock size={14} /> Chờ duyệt
                     </button>
                     <button
                        onClick={() => setFilter('approved')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${filter === 'approved' ? 'bg-emerald-600 text-white shadow' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                     >
                        <CheckCircle2 size={14} /> Đã duyệt
                     </button>
                  </div>

                  <div className="relative">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                     <input
                        placeholder="Tìm mã HĐ, Tên HV..."
                        className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 w-64"
                     />
                  </div>
               </div>

               {/* Table */}
               <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                     <thead className="bg-[#F8FAFC] border-b border-slate-200">
                        <tr>
                           <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Mã Hợp Đồng</th>
                           <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Học viên & Nội dung</th>
                           <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Minh chứng (UNC)</th>
                           <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Số tiền</th>
                           <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Trạng thái</th>
                           <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Thao tác</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                        {filteredData.map((trx) => (
                           <tr key={trx.id} className="hover:bg-slate-50 transition-colors group">
                              <td className="px-6 py-4 align-top">
                                 <div className="font-bold text-blue-600 text-sm">{trx.contractCode}</div>
                                 <div className="text-xs text-slate-400 mt-1">{trx.id}</div>
                              </td>
                              <td className="px-6 py-4 align-top">
                                 <div className="font-bold text-slate-900 text-sm">{trx.student}</div>
                                 <div className="text-xs text-slate-500 mt-0.5">{trx.type} - {trx.className}</div>
                                 <div className="text-xs text-slate-400 mt-1 italic">Sales: {trx.salesRep}</div>
                              </td>
                              <td className="px-6 py-4 align-top">
                                 <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200 text-slate-400">
                                       <FileText size={18} />
                                    </div>
                                    <a href="#" className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
                                       Xem ảnh <Eye size={12} />
                                    </a>
                                 </div>
                              </td>
                              <td className="px-6 py-4 align-top">
                                 <div className="font-black text-slate-900">{formatCurrency(trx.amount)}</div>
                                 <div className="text-xs text-slate-500 mt-1">{trx.method}</div>
                              </td>
                              <td className="px-6 py-4 align-top text-center">
                                 {trx.status === 'approved' && (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                                       Đã duyệt
                                    </span>
                                 )}
                                 {trx.status === 'pending' && (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700 animate-pulse">
                                       Chờ duyệt
                                    </span>
                                 )}
                              </td>
                              <td className="px-6 py-4 align-top text-right">
                                 <div className="flex items-center justify-end gap-2">
                                    {trx.status === 'pending' ? (
                                       <>
                                          <button className="text-xs font-bold text-red-600 hover:bg-red-50 px-3 py-1.5 rounded transition-colors">
                                             Từ chối
                                          </button>
                                          <button className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-1.5 rounded shadow-sm transition-all flex items-center gap-1">
                                             <CheckCircle2 size={14} /> Duyệt
                                          </button>
                                       </>
                                    ) : (
                                       <div className="flex items-center justify-end gap-2">
                                          <button className="text-xs font-bold text-slate-500 hover:bg-slate-100 px-3 py-1.5 rounded transition-colors flex items-center gap-1 border border-slate-200">
                                             <AlertCircle size={14} /> Báo lỗi
                                          </button>
                                          {/* REMOVED: Xuât hóa đơn button as requested */}
                                       </div>
                                    )}
                                 </div>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>

               {/* Pagination */}
               <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-white">
                  <span className="text-xs text-slate-500 font-medium">Hiển thị 4 giao dịch đang chờ xử lý</span>
                  <div className="flex gap-1">
                     <button className="p-1 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"><ChevronLeft size={20} /></button>
                     <button className="w-8 h-8 rounded bg-blue-600 text-white font-bold text-xs flex items-center justify-center">1</button>
                     <button className="w-8 h-8 rounded hover:bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center">2</button>
                     <button className="p-1 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"><ChevronRight size={20} /></button>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
};

export default FinanceTransactionQueue;
