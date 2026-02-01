
import React from 'react';
import { 
  Search, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  ExternalLink,
  Code,
  Terminal,
  Clock,
  Filter
} from 'lucide-react';

const FinanceGatewayLogs: React.FC = () => {
  const LOGS = [
    { id: 'LOG-001', gateway: 'VNPAY', txnRef: 'VNP12345678', amount: 10000000, status: 'Success', time: '24/10/2023 10:30:05', message: 'Giao dịch thành công' },
    { id: 'LOG-002', gateway: 'MOMO', txnRef: 'MM98765432', amount: 5000000, status: 'Failed', time: '24/10/2023 11:15:22', message: 'Số dư không đủ' },
    { id: 'LOG-003', gateway: 'VNPAY', txnRef: 'VNP87654321', amount: 2000000, status: 'Pending', time: '24/10/2023 11:20:00', message: 'Chờ phản hồi từ NH' },
    { id: 'LOG-004', gateway: 'TECHCOMBANK', txnRef: 'TCB99887766', amount: 15000000, status: 'Success', time: '24/10/2023 11:45:10', message: 'Giao dịch thành công' },
    { id: 'LOG-005', gateway: 'MOMO', txnRef: 'MM11223344', amount: 500000, status: 'Success', time: '24/10/2023 12:00:01', message: 'Giao dịch thành công' },
  ];

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#111418] font-sans overflow-hidden">
      <div className="flex flex-col flex-1 overflow-y-auto p-6 lg:p-8">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
           <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                 <Terminal className="text-blue-600" /> Đối soát Cổng thanh toán (Gateway Logs)
              </h1>
              <p className="text-slate-500 mt-1">Giám sát API Real-time từ VNPAY, Momo, Techcombank.</p>
           </div>
           <button className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm transition-colors">
              <RefreshCw size={16} /> Làm mới
           </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-center gap-4">
           <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                 type="text" 
                 placeholder="Tìm kiếm mã giao dịch (Transaction ID)..." 
                 className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
           </div>
           <div className="flex gap-2">
              <select className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Tất cả trạng thái</option>
                  <option>Thành công</option>
                  <option>Thất bại</option>
                  <option>Đang chờ</option>
              </select>
              <select className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Tất cả cổng</option>
                  <option>VNPAY</option>
                  <option>Momo</option>
                  <option>Techcombank</option>
              </select>
           </div>
        </div>

        {/* Log Viewer Table - Updated to match Image 1 style (Sans Serif) */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
           <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <div className="flex items-center gap-2">
                 <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                    <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                    <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                 </div>
                 <span className="ml-3 text-slate-500 font-bold font-mono text-xs">api/payment/callback</span>
              </div>
              <div className="text-xs text-slate-400">Live Stream</div>
           </div>

           <table className="w-full text-left">
              <thead className="bg-[#F8FAFC] border-b border-slate-200 text-[#475569] uppercase text-xs font-bold">
                 <tr>
                    <th className="px-6 py-4 font-bold text-sm">Thời gian</th>
                    <th className="px-6 py-4 font-bold text-sm">Cổng TT</th>
                    <th className="px-6 py-4 font-bold text-sm">Mã GD</th>
                    <th className="px-6 py-4 font-bold text-sm">Số tiền</th>
                    <th className="px-6 py-4 font-bold text-sm">Trạng thái</th>
                    <th className="px-6 py-4 font-bold text-sm">Thông điệp</th>
                    <th className="px-6 py-4 font-bold text-sm text-right">Dữ liệu</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                 {LOGS.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                       <td className="px-6 py-4 text-[#334155] font-mono text-xs">{log.time}</td>
                       <td className="px-6 py-4 font-bold text-[#111418]">{log.gateway}</td>
                       <td className="px-6 py-4 text-blue-600 font-medium font-mono text-xs">{log.txnRef}</td>
                       <td className="px-6 py-4 text-[#111418] font-bold">{formatCurrency(log.amount)}</td>
                       <td className="px-6 py-4">
                          {log.status === 'Success' && <span className="text-emerald-600 flex items-center gap-1 font-bold"><CheckCircle2 size={16}/> Thành công</span>}
                          {log.status === 'Failed' && <span className="text-red-600 flex items-center gap-1 font-bold"><AlertCircle size={16}/> Thất bại</span>}
                          {log.status === 'Pending' && <span className="text-amber-600 flex items-center gap-1 font-bold"><Clock size={16}/> Đang chờ</span>}
                       </td>
                       <td className="px-6 py-4 text-[#334155] truncate max-w-xs">{log.message}</td>
                       <td className="px-6 py-4 text-right">
                          <button className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded text-xs font-bold transition-colors inline-flex items-center gap-1">
                             <Code size={14} /> Chi tiết
                          </button>
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>

      </div>
    </div>
  );
};

export default FinanceGatewayLogs;
