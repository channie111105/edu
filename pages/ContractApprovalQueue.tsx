
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Plus, 
  Filter, 
  Settings, 
  Bell, 
  Hourglass, 
  XCircle, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  Shield,
  FileSignature,
  FolderOpen,
  Gavel,
  ShieldQuestion,
  MoreVertical,
  X
} from 'lucide-react';

const ContractApprovalQueue: React.FC = () => {
  const navigate = useNavigate();
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);

  // Mock Data
  const APPROVAL_QUEUE = [
    {
      id: 'CTR-9021',
      studentName: 'Nguyễn Văn Nam',
      avatar: 'NN',
      salesRep: 'Phạm Hương',
      createdDate: '24/10/2023',
      riskLevel: 'Low',
      note: 'Chuẩn quy trình',
    },
    {
      id: 'CTR-9104',
      studentName: 'Trần Thị Bích',
      avatar: 'TB',
      salesRep: 'Phạm Hương',
      createdDate: '24/10/2023',
      riskLevel: 'High',
      note: 'Chiết khấu 30%',
      isUrgent: true
    },
    {
      id: 'CTR-8892',
      studentName: 'Lê Văn Cường',
      avatar: 'LC',
      salesRep: 'David Clark',
      createdDate: '23/10/2023',
      riskLevel: 'Medium',
      note: 'Thiếu giấy tờ phụ huynh',
    },
    {
      id: 'CTR-8877',
      studentName: 'Hoàng Văn Em',
      avatar: 'HE',
      salesRep: 'Sarah Miller',
      createdDate: '23/10/2023',
      riskLevel: 'Low',
      note: 'Đóng full 100%',
    },
    {
      id: 'CTR-8850',
      studentName: 'Vũ Thị Phương',
      avatar: 'VP',
      salesRep: 'Sarah Miller',
      createdDate: '22/10/2023',
      riskLevel: 'Low',
      note: 'Chuẩn quy trình',
    }
  ];

  const handleRejectClick = (id: string) => {
    setSelectedContractId(id);
    setRejectModalOpen(true);
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-slate-900 font-sans overflow-hidden">
      
      {/* Header riêng cho module này (Optional, nếu muốn giữ header chung thì bỏ qua phần này, nhưng theo thiết kế HTML thì có header riêng) */}
      {/* Ở đây tôi sẽ dùng layout chung của App, chỉ render phần nội dung bên dưới Header chính */}

      <div className="flex flex-1 overflow-hidden">
        
        {/* LEFT SIDEBAR: Menu điều hướng nội bộ */}
        <aside className="w-64 border-r border-slate-200 bg-white hidden lg:flex flex-col gap-6 p-4 z-10">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-3">Quản lý Duyệt</p>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 font-bold cursor-pointer">
                <FileSignature size={18} />
                <p className="text-sm">Hàng chờ Duyệt</p>
              </div>
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
                <FolderOpen size={18} />
                <p className="text-sm font-medium">Đang soạn thảo</p>
              </div>
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
                <CheckCircle2 size={18} />
                <p className="text-sm font-medium">Đã hoàn tất</p>
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-3">Tuân thủ & Rủi ro</p>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
                <Gavel size={18} />
                <p className="text-sm font-medium">Điều khoản Pháp lý</p>
              </div>
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
                <ShieldAlert size={18} />
                <p className="text-sm font-medium">Chính sách Rủi ro</p>
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 flex flex-col overflow-y-auto relative">
          
          {/* Page Heading */}
          <div className="flex flex-wrap justify-between items-center gap-3 p-8 pb-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-slate-900 text-3xl font-black leading-tight tracking-tight">Hàng chờ Phê duyệt Hợp đồng</h1>
              <p className="text-slate-500 text-base font-normal">Xem xét các yêu cầu nhập học và đánh giá mức độ rủi ro tài chính.</p>
            </div>
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg flex items-center gap-2 transition-all shadow-sm">
              <Plus size={20} />
              Tạo Yêu cầu mới
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-8 mb-8">
            {/* Card 1 */}
            <div className="flex flex-col gap-2 rounded-xl p-6 border border-slate-200 bg-white shadow-sm">
              <div className="flex justify-between items-start">
                <p className="text-slate-500 text-sm font-bold uppercase">Chờ phê duyệt</p>
                <Hourglass size={20} className="text-blue-600" />
              </div>
              <p className="text-slate-900 text-3xl font-bold leading-tight">24</p>
              <div className="flex items-center gap-1">
                <TrendingUp size={16} className="text-green-500" />
                <p className="text-green-500 text-sm font-bold">+5% so với hôm qua</p>
              </div>
            </div>
            {/* Card 2 */}
            <div className="flex flex-col gap-2 rounded-xl p-6 border border-slate-200 bg-white shadow-sm">
              <div className="flex justify-between items-start">
                <p className="text-slate-500 text-sm font-bold uppercase">Đã từ chối (Tuần)</p>
                <XCircle size={20} className="text-red-500" />
              </div>
              <p className="text-slate-900 text-3xl font-bold leading-tight">12</p>
              <div className="flex items-center gap-1">
                <TrendingDown size={16} className="text-red-500" />
                <p className="text-red-500 text-sm font-bold">-2% so với tuần trước</p>
              </div>
            </div>
            {/* Card 3 */}
            <div className="flex flex-col gap-2 rounded-xl p-6 border border-slate-200 bg-white shadow-sm">
              <div className="flex justify-between items-start">
                <p className="text-slate-500 text-sm font-bold uppercase">Đã duyệt hôm nay</p>
                <CheckCircle2 size={20} className="text-green-500" />
              </div>
              <p className="text-slate-900 text-3xl font-bold leading-tight">48</p>
              <div className="flex items-center gap-1">
                <TrendingUp size={16} className="text-green-500" />
                <p className="text-green-500 text-sm font-bold">+15% so với mục tiêu</p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="px-8 mb-6">
            <div className="flex items-center flex-wrap gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-sm font-bold text-slate-500 px-2 flex items-center gap-2"><Filter size={16}/> Lọc theo:</span>
              <button className="flex h-9 items-center justify-center gap-x-2 rounded-lg bg-slate-100 pl-4 pr-2 text-slate-900 hover:bg-slate-200 transition-colors">
                <p className="text-sm font-medium">Độ khẩn cấp: Tất cả</p>
                <ChevronDown size={16} />
              </button>
              <button className="flex h-9 items-center justify-center gap-x-2 rounded-lg bg-slate-100 pl-4 pr-2 text-slate-900 hover:bg-slate-200 transition-colors">
                <p className="text-sm font-medium">Phòng ban: Đào tạo</p>
                <ChevronDown size={16} />
              </button>
              <button className="flex h-9 items-center justify-center gap-x-2 rounded-lg bg-slate-100 pl-4 pr-2 text-slate-900 hover:bg-slate-200 transition-colors">
                <p className="text-sm font-medium">Mức độ rủi ro: Bất kỳ</p>
                <ChevronDown size={16} />
              </button>
              <div className="ml-auto flex items-center gap-2">
                <button className="text-sm font-semibold text-blue-600 hover:underline px-2">Xóa bộ lọc</button>
              </div>
            </div>
          </div>

          {/* Main Table */}
          <div className="px-8 pb-10 flex-1 overflow-hidden">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-auto h-full">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Mã HĐ</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Học viên</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Sales Rep</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ngày tạo</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Đánh giá Rủi ro</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {APPROVAL_QUEUE.map((contract) => (
                    <tr key={contract.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                           <span className="text-sm font-bold text-blue-600">{contract.id}</span>
                           {contract.isUrgent && (
                              <span className="text-amber-500 animate-pulse" title="Khẩn cấp"><ShieldAlert size={16} /></span>
                           )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                            {contract.avatar}
                          </div>
                          <div>
                             <span className="text-sm font-semibold text-slate-900 block">{contract.studentName}</span>
                             <span className="text-xs text-slate-500">{contract.note}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-600">{contract.salesRep}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-600">{contract.createdDate}</span>
                      </td>
                      <td className="px-6 py-4">
                        {contract.riskLevel === 'Low' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">
                            <ShieldCheck size={12} /> Thấp
                          </span>
                        )}
                        {contract.riskLevel === 'Medium' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                            <Shield size={12} /> Trung bình
                          </span>
                        )}
                        {contract.riskLevel === 'High' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                            <ShieldAlert size={12} /> Cao (Cần lưu ý)
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {contract.riskLevel === 'High' ? (
                             <button 
                                onClick={() => handleRejectClick(contract.id)}
                                className="text-slate-600 hover:bg-red-50 hover:text-red-600 px-3 py-1.5 rounded text-xs font-bold transition-all"
                             >
                                Từ chối
                             </button>
                          ) : (
                             <button className="text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded text-xs font-bold transition-all">
                                Xem xét
                             </button>
                          )}
                          
                          <button className={`text-white px-3 py-1.5 rounded text-xs font-bold transition-all shadow-sm ${contract.riskLevel === 'High' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
                             {contract.riskLevel === 'High' ? 'Duyệt ngoại lệ' : 'Phê duyệt'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* Pagination */}
              <div className="p-4 border-t border-slate-200 flex justify-between items-center bg-slate-50 sticky bottom-0">
                <p className="text-xs font-medium text-slate-500">Hiển thị 5 trên 24 hợp đồng chờ duyệt</p>
                <div className="flex gap-1">
                  <button className="p-2 rounded hover:bg-slate-200 text-slate-500 disabled:opacity-50" disabled>
                    <ChevronLeft size={16} />
                  </button>
                  <button className="w-8 h-8 rounded bg-blue-600 text-white text-xs font-bold shadow-sm">1</button>
                  <button className="w-8 h-8 rounded text-slate-600 text-xs font-bold hover:bg-slate-200">2</button>
                  <button className="w-8 h-8 rounded text-slate-600 text-xs font-bold hover:bg-slate-200">3</button>
                  <button className="p-2 rounded hover:bg-slate-200 text-slate-600 transition-colors">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>

        </main>
      </div>

      {/* Reject Modal Overlay */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setRejectModalOpen(false)}></div>
           <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col animate-in zoom-in-95">
              <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-red-50">
                 <h4 className="font-bold text-red-700 flex items-center gap-2">
                    <XCircle size={20} /> Từ chối Hợp đồng {selectedContractId}
                 </h4>
                 <button onClick={() => setRejectModalOpen(false)}><X size={20} className="text-red-400 hover:text-red-600" /></button>
              </div>
              <div className="p-4">
                 <p className="text-sm text-slate-600 mb-3">Vui lòng nhập lý do từ chối để thông báo cho Sales Rep:</p>
                 <textarea 
                    className="w-full h-24 rounded-lg border border-slate-300 p-3 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none" 
                    placeholder="VD: Mức chiết khấu quá cao, chưa có phê duyệt của GD..."
                 ></textarea>
              </div>
              <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
                 <button onClick={() => setRejectModalOpen(false)} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-lg text-sm">Hủy</button>
                 <button 
                    onClick={() => { alert('Đã từ chối hợp đồng!'); setRejectModalOpen(false); }}
                    className="px-4 py-2 bg-red-600 text-white font-bold hover:bg-red-700 rounded-lg text-sm shadow-sm"
                 >
                    Xác nhận Từ chối
                 </button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default ContractApprovalQueue;
