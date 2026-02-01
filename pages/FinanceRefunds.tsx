
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  Download, 
  Plus, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  MoreHorizontal,
  CreditCard,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Ban,
  FileX
} from 'lucide-react';

// --- MOCK DATA ---
const REFUND_REQUESTS = [
  {
    id: 'REF-92812',
    studentName: 'Phạm Văn Hùng',
    contractId: 'HĐ-2024-001',
    program: 'Du học Đức',
    totalPaid: 45000000,
    requestedAmount: 12000000,
    approvedAmount: 12000000,
    reason: 'Rút hồ sơ (Withdrawal)',
    reasonTag: 'bg-slate-100 text-slate-600',
    status: 'Pending',
    date: '24/10/2023'
  },
  {
    id: 'REF-92815',
    studentName: 'Nguyễn Thị Lan',
    contractId: 'HĐ-2024-042',
    program: 'Tiếng Đức A1',
    totalPaid: 8000000,
    requestedAmount: 2000000,
    approvedAmount: 2000000,
    reason: 'Điều chỉnh Học bổng',
    reasonTag: 'bg-blue-50 text-blue-700',
    status: 'Approved',
    date: '22/10/2023'
  },
  {
    id: 'REF-92818',
    studentName: 'Trần Minh Tuấn',
    contractId: 'HĐ-2023-891',
    program: 'Tiếng Trung HSK 3',
    totalPaid: 4000000,
    requestedAmount: 4000000,
    approvedAmount: 0,
    reason: 'Trùng giao dịch',
    reasonTag: 'bg-purple-50 text-purple-700',
    status: 'Rejected',
    date: '20/10/2023'
  },
  {
    id: 'REF-92821',
    studentName: 'Lê Hoàng',
    contractId: 'HĐ-2024-112',
    program: 'Combo A1-B1',
    totalPaid: 25000000,
    requestedAmount: 5000000,
    approvedAmount: 5000000,
    reason: 'Chuyển đổi khóa học',
    reasonTag: 'bg-amber-50 text-amber-700',
    status: 'Pending',
    date: '24/10/2023'
  }
];

const FinanceRefunds: React.FC = () => {
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState('All');
  const [requests, setRequests] = useState(REFUND_REQUESTS);
  
  // Simulation State
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [workflowLog, setWorkflowLog] = useState<string[]>([]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  const handleApproveRefund = (req: typeof REFUND_REQUESTS[0]) => {
      if (!window.confirm(`Xác nhận hoàn tiền ${formatCurrency(req.approvedAmount)} cho ${req.studentName}? Hành động này sẽ kích hoạt quy trình dừng dịch vụ.`)) return;

      setIsProcessing(req.id);
      setWorkflowLog([]);

      // Simulate Cross-Module Workflow
      const steps = [
          `[Finance] Đã tạo lệnh chi: ${formatCurrency(req.approvedAmount)}`,
          `[Sales] Đã hủy hợp đồng ${req.contractId} (Status: Cancelled)`,
          `[Training] Đã xóa học viên khỏi danh sách lớp chờ`,
          `[StudyAbroad] Đã đóng hồ sơ xử lý`,
          `[System] Hoàn tất quy trình Rút hồ sơ.`
      ];

      let i = 0;
      const interval = setInterval(() => {
          if (i < steps.length) {
              setWorkflowLog(prev => [...prev, steps[i]]);
              i++;
          } else {
              clearInterval(interval);
              setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'Approved' } : r));
              setTimeout(() => {
                  setIsProcessing(null);
                  setWorkflowLog([]);
              }, 2000); // Clear after 2s showing success
          }
      }, 600);
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] font-sans text-[#111418] overflow-y-auto relative">
      
      {/* --- WORKFLOW SIMULATION OVERLAY --- */}
      {isProcessing && (
          <div className="absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                  <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
                      <RefreshCw size={20} className="text-blue-600 animate-spin" />
                      <div>
                          <h3 className="font-bold text-slate-900">Đang xử lý hoàn tiền & Dừng dịch vụ</h3>
                          <p className="text-xs text-slate-500">Đang đồng bộ dữ liệu sang các phòng ban...</p>
                      </div>
                  </div>
                  <div className="p-5 space-y-3 bg-[#1e293b]">
                      {workflowLog.map((log, idx) => (
                          <div key={idx} className="flex items-start gap-3 text-sm animate-in slide-in-from-left-2">
                              {log.includes('Finance') ? <CreditCard size={16} className="text-green-400 mt-0.5" /> :
                               log.includes('Sales') ? <FileX size={16} className="text-red-400 mt-0.5" /> :
                               log.includes('Training') ? <Ban size={16} className="text-orange-400 mt-0.5" /> :
                               <CheckCircle2 size={16} className="text-blue-400 mt-0.5" />
                              }
                              <span className="text-slate-200 font-mono text-xs">{log}</span>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      <div className="flex flex-1 flex-col py-6 px-8 max-w-[1600px] mx-auto w-full gap-6">
        
        {/* Breadcrumbs & Header */}
        <div>
            <div className="flex flex-wrap justify-between items-end gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Quản lý Yêu cầu Hoàn tiền</h1>
                    <p className="text-slate-500">Xử lý và phê duyệt các yêu cầu hoàn tiền, rút phí từ học viên.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors">
                        <Download size={16} />
                        Xuất Báo cáo
                    </button>
                    <button className="flex items-center gap-2 bg-[#1380ec] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-md transition-colors">
                        <Plus size={18} />
                        Tạo Yêu cầu mới
                    </button>
                </div>
            </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                        <Clock size={24} />
                    </div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hôm nay</span>
                </div>
                <p className="text-slate-500 text-sm font-medium">Yêu cầu chờ xử lý</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">24</p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                        <CreditCard size={24} />
                    </div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tháng này</span>
                </div>
                <p className="text-slate-500 text-sm font-medium">Tổng tiền đã hoàn</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{formatCurrency(124500000)}</p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                        <TrendingUp size={24} />
                    </div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tỷ lệ duyệt</span>
                </div>
                <p className="text-slate-500 text-sm font-medium">Chấp thuận hoàn tiền</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">85%</p>
            </div>
        </div>

        {/* Main Content Area */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            
            {/* Filters */}
            <div className="p-4 border-b border-slate-200 flex flex-wrap items-center gap-4 bg-slate-50">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-500 flex items-center gap-2">
                        <Filter size={16} /> Lọc theo:
                    </span>
                    <select 
                        className="bg-white border border-slate-200 rounded-lg text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="All">Tất cả trạng thái</option>
                        <option value="Pending">Chờ xử lý</option>
                        <option value="Approved">Đã duyệt</option>
                        <option value="Rejected">Đã từ chối</option>
                    </select>
                    <select className="bg-white border border-slate-200 rounded-lg text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 font-medium">
                        <option>Tất cả chương trình</option>
                        <option>Tiếng Đức</option>
                        <option>Tiếng Trung</option>
                        <option>Du học</option>
                    </select>
                </div>
                
                <div className="ml-auto relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                        placeholder="Tìm theo tên hoặc mã yêu cầu..." 
                        type="text"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs font-bold tracking-wider">
                            <th className="px-6 py-4">Mã Yêu cầu</th>
                            <th className="px-6 py-4">Học viên</th>
                            <th className="px-6 py-4">Mã HĐ gốc</th>
                            <th className="px-6 py-4">Tổng đã đóng</th>
                            <th className="px-6 py-4">Yêu cầu hoàn</th>
                            <th className="px-6 py-4">Số tiền duyệt</th>
                            <th className="px-6 py-4">Lý do</th>
                            <th className="px-6 py-4">Trạng thái</th>
                            <th className="px-6 py-4 text-center">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {requests.map((req) => (
                            <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                    <span className="text-xs font-mono font-bold text-slate-500">{req.id}</span>
                                    <div className="text-[10px] text-slate-400">{req.date}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-sm font-bold text-slate-900">{req.studentName}</span>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600">{req.contractId}</td>
                                <td className="px-6 py-4 text-sm font-medium text-slate-900">{formatCurrency(req.totalPaid)}</td>
                                <td className="px-6 py-4 text-sm font-bold text-amber-600">{formatCurrency(req.requestedAmount)}</td>
                                <td className="px-6 py-4">
                                    {req.status === 'Pending' ? (
                                        <div className="relative max-w-[140px]">
                                            <input 
                                                className="w-full bg-blue-50 border border-blue-200 rounded-lg py-1.5 px-3 text-sm font-bold text-blue-700 focus:ring-2 focus:ring-blue-500 outline-none text-right" 
                                                type="text" 
                                                defaultValue={req.approvedAmount.toLocaleString()}
                                            />
                                        </div>
                                    ) : (
                                        <span className={`text-sm font-bold ${req.status === 'Approved' ? 'text-emerald-600' : 'text-slate-400'}`}>
                                            {formatCurrency(req.approvedAmount)}
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded border border-transparent ${req.reasonTag}`}>
                                        {req.reason}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    {req.status === 'Pending' && (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Chờ xử lý
                                        </span>
                                    )}
                                    {req.status === 'Approved' && (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                                            <CheckCircle2 size={12} className="text-emerald-600" /> Đã duyệt
                                        </span>
                                    )}
                                    {req.status === 'Rejected' && (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
                                            <XCircle size={12} className="text-rose-600" /> Từ chối
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    {req.status === 'Pending' ? (
                                        <button 
                                            onClick={() => handleApproveRefund(req)}
                                            className="bg-[#1380ec] hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors shadow-sm flex items-center justify-center gap-1 w-full"
                                        >
                                            <CheckCircle2 size={14} /> Duyệt hoàn tiền
                                        </button>
                                    ) : (
                                        <button className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-full hover:bg-slate-100">
                                            <MoreHorizontal size={18} />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
                <button className="flex items-center gap-1 px-3 py-1.5 text-sm font-bold text-slate-500 hover:text-slate-900 disabled:opacity-50 transition-colors" disabled>
                    <ChevronLeft size={16} /> Trước
                </button>
                <div className="flex items-center gap-1">
                    <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#1380ec] text-white text-sm font-bold shadow-sm">1</button>
                    <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200 text-slate-600 text-sm font-bold transition-colors">2</button>
                    <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200 text-slate-600 text-sm font-bold transition-colors">3</button>
                    <span className="px-1 text-slate-400 font-bold">...</span>
                </div>
                <button className="flex items-center gap-1 px-3 py-1.5 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors">
                    Sau <ChevronRight size={16} />
                </button>
            </div>

        </div>
      </div>
    </div>
  );
};

export default FinanceRefunds;
