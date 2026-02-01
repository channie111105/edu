
import React, { useState } from 'react';
import { 
  Search, 
  Download, 
  RefreshCw, 
  Filter, 
  Calendar, 
  User, 
  Tag, 
  LayoutGrid, 
  ArrowRight, 
  ChevronLeft, 
  ChevronRight, 
  Info, 
  X, 
  History, 
  RefreshCcw, 
  Terminal,
  Printer,
  Copy,
  ShieldAlert
} from 'lucide-react';

interface AuditLog {
  id: string;
  timestamp: string;
  user: {
    name: string;
    role: string;
    avatar: string; // Initials or Image URL
    color: string;
  };
  action: {
    name: string;
    type: string; // 'create', 'update', 'delete', 'login', 'export'
    color: string;
  };
  module: string;
  ip: string;
  details: {
    actionId: string;
    requestId: string;
    userAgent: string;
    changes?: {
      field: string;
      before: string;
      after: string;
    }[];
  };
}

const MOCK_LOGS: AuditLog[] = [
  {
    id: 'LOG-001',
    timestamp: '24/10/2023 14:22:10',
    user: { name: 'Trần Văn Quản Trị', role: 'Quản trị viên', avatar: 'QT', color: 'bg-blue-100 text-blue-700' },
    action: { name: 'Sửa Phân quyền', type: 'update', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    module: 'Phân quyền (RBAC)',
    ip: '192.168.1.45',
    details: {
      actionId: 'ACT_9921',
      requestId: 'req_a1b2c3',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      changes: [
        { field: 'Can Export Leads', before: 'false', after: 'true' },
        { field: 'Max Lead View', before: '100', after: '500' }
      ]
    }
  },
  {
    id: 'LOG-002',
    timestamp: '24/10/2023 13:05:45',
    user: { name: 'Nguyễn Thị Marketing', role: 'Trưởng phòng MKT', avatar: 'NM', color: 'bg-orange-100 text-orange-700' },
    action: { name: 'Xuất Excel Lead', type: 'export', color: 'bg-orange-50 text-orange-700 border-orange-200' },
    module: 'Quản lý Lead',
    ip: '172.16.254.1',
    details: {
      actionId: 'ACT_9920',
      requestId: 'req_x9y8z7',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    }
  },
  {
    id: 'LOG-003',
    timestamp: '24/10/2023 12:40:12',
    user: { name: 'Lê Văn Sales', role: 'Nhân viên Sale', avatar: 'LS', color: 'bg-purple-100 text-purple-700' },
    action: { name: 'Đăng nhập', type: 'login', color: 'bg-green-50 text-green-700 border-green-200' },
    module: 'Hệ thống',
    ip: '10.0.0.12',
    details: {
      actionId: 'ACT_9919',
      requestId: 'req_login_123',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X)',
    }
  },
  {
    id: 'LOG-004',
    timestamp: '24/10/2023 11:15:00',
    user: { name: 'Trần Văn Quản Trị', role: 'Quản trị viên', avatar: 'QT', color: 'bg-blue-100 text-blue-700' },
    action: { name: 'Xóa Lead Rác', type: 'delete', color: 'bg-red-50 text-red-700 border-red-200' },
    module: 'Quản lý Lead',
    ip: '192.168.1.45',
    details: {
      actionId: 'ACT_9918',
      requestId: 'req_del_456',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      changes: [
        { field: 'Status', before: 'Junk', after: 'Deleted' }
      ]
    }
  },
  {
    id: 'LOG-005',
    timestamp: '24/10/2023 10:00:23',
    user: { name: 'Phạm Kế Toán', role: 'Kế toán trưởng', avatar: 'PK', color: 'bg-pink-100 text-pink-700' },
    action: { name: 'Duyệt Giao dịch', type: 'update', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    module: 'Tài chính',
    ip: '192.168.1.100',
    details: {
      actionId: 'ACT_9917',
      requestId: 'req_fin_789',
      userAgent: 'Chrome/118.0.0.0 Safari/537.36',
      changes: [
        { field: 'Transaction Status', before: 'Pending', after: 'Approved' },
        { field: 'Approved By', before: 'null', after: 'USR_ACC_01' }
      ]
    }
  }
];

const AdminAuditLogs: React.FC = () => {
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedLog(null);
  };

  const filteredLogs = MOCK_LOGS.filter(log => 
    log.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.module.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#111418] font-sans overflow-y-auto">
      <div className="flex flex-1 flex-col py-6 px-4 md:px-8 lg:px-12 max-w-[1600px] mx-auto w-full">
        
        {/* Breadcrumb & Title */}
        <div className="flex flex-col gap-1 mb-6">
           <div className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-wider font-bold">
              <span>Quản trị Hệ thống</span>
              <span>/</span>
              <span className="text-[#1380ec]">Nhật ký (Audit Logs)</span>
           </div>
           <div className="flex flex-wrap justify-between items-end gap-4">
              <div>
                 <h1 className="text-3xl font-black text-[#111418] leading-tight tracking-tight">Nhật ký Hoạt động Hệ thống</h1>
                 <p className="text-[#617589] text-sm mt-1">Giám sát bảo mật thời gian thực và theo dõi toàn diện các hoạt động trên hệ thống.</p>
              </div>
              <div className="flex gap-3">
                 <button className="flex items-center gap-2 rounded-lg h-10 px-4 bg-white border border-[#cfdbe7] text-[#111418] text-sm font-bold hover:bg-slate-50 transition-colors shadow-sm">
                    <Download size={18} />
                    <span>Xuất CSV</span>
                 </button>
                 <button className="flex items-center gap-2 rounded-lg h-10 px-4 bg-[#1380ec] text-white text-sm font-bold hover:bg-blue-700 transition-colors shadow-md">
                    <RefreshCw size={18} />
                    <span>Làm mới</span>
                 </button>
              </div>
           </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-xl border border-[#cfdbe7] shadow-sm flex flex-wrap gap-4 items-center mb-6">
           <div className="flex items-center gap-2 text-[#617589] mr-2">
              <Filter size={20} />
              <span className="text-sm font-bold">Bộ lọc</span>
           </div>
           
           <div className="flex flex-wrap gap-3 flex-1">
              <button className="flex h-9 items-center justify-center gap-x-2 rounded-lg bg-[#f0f2f4] px-4 border border-transparent hover:border-[#1380ec]/50 transition-all text-sm font-medium text-[#111418]">
                 <Calendar size={16} className="text-[#1380ec]" />
                 Ngày: 7 ngày qua
              </button>
              <button className="flex h-9 items-center justify-center gap-x-2 rounded-lg bg-[#f0f2f4] px-4 border border-transparent hover:border-[#1380ec]/50 transition-all text-sm font-medium text-[#111418]">
                 <User size={16} className="text-[#1380ec]" />
                 Người dùng: Tất cả
              </button>
              <button className="flex h-9 items-center justify-center gap-x-2 rounded-lg bg-[#f0f2f4] px-4 border border-transparent hover:border-[#1380ec]/50 transition-all text-sm font-medium text-[#111418]">
                 <Tag size={16} className="text-[#1380ec]" />
                 Hành động: Tất cả
              </button>
              <button className="flex h-9 items-center justify-center gap-x-2 rounded-lg bg-[#f0f2f4] px-4 border border-transparent hover:border-[#1380ec]/50 transition-all text-sm font-medium text-[#111418]">
                 <LayoutGrid size={16} className="text-[#1380ec]" />
                 Phân hệ: Tất cả
              </button>
           </div>

           <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                 type="text" 
                 placeholder="Tìm kiếm nhật ký..." 
                 className="w-full pl-9 pr-4 py-2 border border-[#cfdbe7] rounded-lg text-sm focus:ring-2 focus:ring-[#1380ec] outline-none"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl border border-[#cfdbe7] shadow-sm overflow-hidden flex flex-col mb-8">
           <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                 <thead>
                    <tr className="bg-[#f8fafc] border-b border-[#cfdbe7]">
                       <th className="px-6 py-4 text-xs font-bold text-[#617589] uppercase tracking-wider w-48">Thời gian</th>
                       <th className="px-6 py-4 text-xs font-bold text-[#617589] uppercase tracking-wider min-w-[240px]">Người dùng</th>
                       <th className="px-6 py-4 text-xs font-bold text-[#617589] uppercase tracking-wider w-44 text-center">Loại hành động</th>
                       <th className="px-6 py-4 text-xs font-bold text-[#617589] uppercase tracking-wider w-48">Phân hệ</th>
                       <th className="px-6 py-4 text-xs font-bold text-[#617589] uppercase tracking-wider w-40">Địa chỉ IP</th>
                       <th className="px-6 py-4 text-xs font-bold text-[#617589] uppercase tracking-wider w-32 text-right">Chi tiết</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-[#cfdbe7]">
                    {filteredLogs.map((log) => (
                       <tr key={log.id} className="hover:bg-[#f0f4f8] transition-colors group">
                          <td className="px-6 py-4 text-[#617589] text-sm font-mono whitespace-nowrap">{log.timestamp}</td>
                          <td className="px-6 py-4">
                             <div className="flex items-center gap-3">
                                <div className={`size-8 rounded-full flex items-center justify-center font-bold text-xs ${log.user.color}`}>
                                   {log.user.avatar}
                                </div>
                                <div className="flex flex-col">
                                   <span className="text-[#111418] text-sm font-bold">{log.user.name}</span>
                                   <span className="text-[#617589] text-[10px] font-bold uppercase tracking-widest">{log.user.role}</span>
                                </div>
                             </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                             <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border ${log.action.color}`}>
                                {log.action.name}
                             </span>
                          </td>
                          <td className="px-6 py-4">
                             <span className="text-[#111418] text-sm font-medium">{log.module}</span>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-[#617589]">{log.ip}</td>
                          <td className="px-6 py-4 text-right">
                             <button 
                                onClick={() => handleViewDetails(log)}
                                className="text-[#1380ec] hover:text-blue-800 text-xs font-bold inline-flex items-center justify-end gap-1 px-3 py-1.5 rounded-lg border border-blue-100 hover:bg-blue-50 transition-all"
                             >
                                Xem <ArrowRight size={14} />
                             </button>
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
           
           {/* Pagination */}
           <div className="px-6 py-4 border-t border-[#cfdbe7] flex items-center justify-between bg-white">
              <div className="text-sm text-[#617589]">
                 Hiển thị <span className="font-bold text-[#111418]">{filteredLogs.length}</span> kết quả
              </div>
              <div className="flex gap-2">
                 <button className="flex items-center justify-center size-9 rounded-lg border border-[#cfdbe7] text-[#617589] hover:bg-slate-50 disabled:opacity-50" disabled>
                    <ChevronLeft size={18} />
                 </button>
                 <button className="flex items-center justify-center size-9 rounded-lg bg-[#1380ec] text-white font-bold text-sm shadow-sm">1</button>
                 <button className="flex items-center justify-center size-9 rounded-lg border border-[#cfdbe7] text-[#111418] font-bold text-sm hover:bg-slate-50">2</button>
                 <button className="flex items-center justify-center size-9 rounded-lg border border-[#cfdbe7] text-[#111418] font-bold text-sm hover:bg-slate-50">3</button>
                 <button className="flex items-center justify-center size-9 rounded-lg border border-[#cfdbe7] text-[#617589] hover:bg-slate-50">
                    <ChevronRight size={18} />
                 </button>
              </div>
           </div>
        </div>

      </div>

      {/* Detail Modal */}
      {isModalOpen && selectedLog && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
               <div className="px-6 py-4 border-b border-[#cfdbe7] flex justify-between items-center bg-slate-50">
                  <div className="flex items-center gap-3">
                     <div className="size-8 bg-blue-100 rounded-lg flex items-center justify-center text-[#1380ec]">
                        <Info size={20} />
                     </div>
                     <h3 className="text-lg font-bold text-[#111418]">Chi tiết Hoạt động</h3>
                  </div>
                  <button onClick={closeModal} className="text-[#617589] hover:text-red-500 transition-colors">
                     <X size={24} />
                  </button>
               </div>
               
               <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                  {/* General Info */}
                  <div className="grid grid-cols-2 gap-6 mb-8">
                     <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#617589]">Loại hành động</p>
                        <p className="text-sm font-bold text-[#1380ec]">{selectedLog.action.name}</p>
                     </div>
                     <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#617589]">Phân hệ</p>
                        <p className="text-sm font-bold text-[#111418]">{selectedLog.module}</p>
                     </div>
                     <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#617589]">Thực hiện bởi</p>
                        <div className="flex items-center gap-2">
                           <div className={`size-5 rounded-full flex items-center justify-center font-bold text-[8px] ${selectedLog.user.color}`}>
                              {selectedLog.user.avatar}
                           </div>
                           <p className="text-sm font-medium text-[#111418]">{selectedLog.user.name}</p>
                        </div>
                     </div>
                     <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#617589]">Địa chỉ IP</p>
                        <p className="text-xs font-mono text-[#111418] bg-slate-100 px-2 py-1 rounded w-fit">{selectedLog.ip}</p>
                     </div>
                  </div>

                  {/* Changes Diff */}
                  {selectedLog.details.changes && (
                     <div className="mb-8">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#111418] mb-4 border-l-4 border-[#1380ec] pl-3">
                           Thay đổi Dữ liệu
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="bg-red-50 border border-red-100 rounded-lg p-4">
                              <div className="flex items-center gap-2 mb-3 text-red-600">
                                 <History size={16} />
                                 <span className="text-[10px] font-bold uppercase">Trước (Before)</span>
                              </div>
                              <div className="space-y-3">
                                 {selectedLog.details.changes.map((change, idx) => (
                                    <div key={idx} className="flex flex-col">
                                       <span className="text-[10px] text-red-700/60 font-bold uppercase">{change.field}</span>
                                       <span className="text-sm font-mono text-red-700 font-medium">{change.before}</span>
                                    </div>
                                 ))}
                              </div>
                           </div>
                           <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                              <div className="flex items-center gap-2 mb-3 text-green-600">
                                 <RefreshCcw size={16} />
                                 <span className="text-[10px] font-bold uppercase">Sau (After)</span>
                              </div>
                              <div className="space-y-3">
                                 {selectedLog.details.changes.map((change, idx) => (
                                    <div key={idx} className="flex flex-col">
                                       <span className="text-[10px] text-green-700/60 font-bold uppercase">{change.field}</span>
                                       <span className="text-sm font-mono text-green-700 font-bold">{change.after}</span>
                                    </div>
                                 ))}
                              </div>
                           </div>
                        </div>
                     </div>
                  )}

                  {/* JSON Details */}
                  <div className="group border border-[#cfdbe7] rounded-lg overflow-hidden">
                     <div className="flex items-center justify-between p-3 bg-slate-50 border-b border-[#cfdbe7]">
                        <div className="flex items-center gap-2">
                           <Terminal size={16} className="text-[#617589]" />
                           <span className="text-xs font-bold text-[#617589] uppercase">Thông số kỹ thuật (JSON)</span>
                        </div>
                        <button className="text-[10px] bg-white border border-[#cfdbe7] px-2 py-1 rounded hover:bg-slate-100 text-[#111418] flex items-center gap-1">
                           <Copy size={10} /> Sao chép
                        </button>
                     </div>
                     <div className="p-4 bg-slate-900 text-blue-300 font-mono text-[11px] max-h-60 overflow-y-auto custom-scrollbar">
                        <pre>
{`{
  "action_id": "${selectedLog.details.actionId}",
  "request_id": "${selectedLog.details.requestId}",
  "timestamp": "${selectedLog.timestamp}",
  "actor": {
    "name": "${selectedLog.user.name}",
    "role": "${selectedLog.user.role}",
    "ip": "${selectedLog.ip}"
  },
  "environment": {
    "user_agent": "${selectedLog.details.userAgent}"
  }
}`}
                        </pre>
                     </div>
                  </div>
               </div>

               <div className="px-6 py-4 border-t border-[#cfdbe7] bg-slate-50 flex justify-end gap-3">
                  <button onClick={closeModal} className="px-4 py-2 text-xs font-bold text-[#617589] hover:text-[#111418] border border-[#cfdbe7] bg-white rounded-lg hover:bg-slate-100 transition-colors">
                     Đóng
                  </button>
                  <button className="px-4 py-2 bg-[#1380ec] text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2">
                     <Printer size={16} />
                     In báo cáo
                  </button>
               </div>
            </div>
         </div>
      )}

    </div>
  );
};

export default AdminAuditLogs;
