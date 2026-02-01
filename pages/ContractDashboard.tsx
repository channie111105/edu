
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileSignature, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  Clock, 
  ArrowRight,
  ShieldAlert,
  DollarSign,
  Plus
} from 'lucide-react';

const ContractDashboard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] font-sans text-[#0d141b] overflow-y-auto">
      <div className="flex flex-1 justify-center py-8 px-6">
        <div className="flex flex-col max-w-[1200px] w-full gap-8">
          
          {/* Welcome Section */}
          <div className="flex justify-between items-end">
             <div>
                <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Xin chào, Sarah (Sales Director) 👋</h1>
                <p className="text-slate-500">Đây là tổng quan tình hình hợp đồng và pháp lý hôm nay.</p>
             </div>
             <button 
                onClick={() => navigate('/contracts/new')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-bold shadow-lg shadow-blue-500/30 flex items-center gap-2 transition-all"
             >
                <Plus size={20} /> Tạo Hợp đồng mới
             </button>
          </div>

          {/* KPI Cards (Morning Coffee View) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
             
             {/* Card 1: Urgent Approvals */}
             <div 
                onClick={() => navigate('/contracts/approvals')}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-orange-300 transition-all cursor-pointer group relative overflow-hidden"
             >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                   <FileSignature size={64} className="text-orange-500" />
                </div>
                <div className="flex items-center gap-3 mb-4">
                   <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
                      <FileSignature size={24} />
                   </div>
                   <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Cần duyệt gấp</span>
                </div>
                <div className="flex items-end gap-3">
                   <span className="text-4xl font-black text-slate-900">5</span>
                   <span className="text-sm font-bold text-orange-600 mb-1.5 flex items-center gap-1">
                      <Clock size={14} /> 2 quá hạn
                   </span>
                </div>
                <p className="text-xs text-slate-400 mt-3">Có 3 yêu cầu giảm giá {'>'} 20%</p>
             </div>

             {/* Card 2: High Risk */}
             <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-red-300 transition-all cursor-pointer group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                   <ShieldAlert size={64} className="text-red-500" />
                </div>
                <div className="flex items-center gap-3 mb-4">
                   <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                      <ShieldAlert size={24} />
                   </div>
                   <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Rủi ro cao</span>
                </div>
                <div className="flex items-end gap-3">
                   <span className="text-4xl font-black text-slate-900">2</span>
                   <span className="text-sm font-bold text-red-600 mb-1.5 flex items-center gap-1">
                      <TrendingUp size={14} /> +1 hqua
                   </span>
                </div>
                <p className="text-xs text-slate-400 mt-3">HĐ thiếu giấy tờ bảo lãnh</p>
             </div>

             {/* Card 3: Revenue (Signed) */}
             <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                   <DollarSign size={64} className="text-emerald-500" />
                </div>
                <div className="flex items-center gap-3 mb-4">
                   <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                      <CheckCircle2 size={24} />
                   </div>
                   <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Doanh số đã ký</span>
                </div>
                <div className="flex items-end gap-3">
                   <span className="text-3xl font-black text-slate-900">1.2 Tỷ</span>
                   <span className="text-sm font-bold text-emerald-600 mb-1.5 flex items-center gap-1">
                      <TrendingUp size={14} /> 85% KPI
                   </span>
                </div>
                <p className="text-xs text-slate-400 mt-3">Tháng 10/2023</p>
             </div>

             {/* Card 4: Processing */}
             <div 
                onClick={() => navigate('/contracts')}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group relative overflow-hidden"
             >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                   <Clock size={64} className="text-blue-500" />
                </div>
                <div className="flex items-center gap-3 mb-4">
                   <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                      <Clock size={24} />
                   </div>
                   <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Đang xử lý</span>
                </div>
                <div className="flex items-end gap-3">
                   <span className="text-4xl font-black text-slate-900">18</span>
                   <span className="text-sm font-bold text-blue-600 mb-1.5 flex items-center gap-1">
                      HĐ
                   </span>
                </div>
                <p className="text-xs text-slate-400 mt-3">Bao gồm Draft & Chờ khách ký</p>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             
             {/* Action Required Feed */}
             <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                   <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                      <AlertTriangle className="text-orange-500" size={20} /> Việc cần làm ngay
                   </h3>
                   <button className="text-sm font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
                      Xem tất cả
                   </button>
                </div>
                <div className="p-0">
                   {[
                      { title: 'Duyệt chiết khấu HĐ #C9104', sub: 'Nguyễn Thị Bích - Giảm 30%', time: '15 phút trước', type: 'urgent' },
                      { title: 'Ký nháy HĐ Du học Đức #C8892', sub: 'Lê Văn Cường - Combo A1-B1', time: '1 giờ trước', type: 'normal' },
                      { title: 'Bổ sung phụ lục bảo lưu #C7721', sub: 'Hoàng Văn Em - Đi nghĩa vụ', time: '3 giờ trước', type: 'normal' },
                      { title: 'Xác nhận hủy HĐ #C6612', sub: 'Lý do: Không đủ tài chính', time: 'Hôm qua', type: 'risk' }
                   ].map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-5 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer group">
                         <div className="flex items-center gap-4">
                            <div className={`w-2 h-2 rounded-full ${item.type === 'urgent' ? 'bg-red-500 animate-pulse' : item.type === 'risk' ? 'bg-slate-400' : 'bg-blue-500'}`}></div>
                            <div>
                               <p className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{item.title}</p>
                               <p className="text-xs text-slate-500">{item.sub}</p>
                            </div>
                         </div>
                         <div className="flex items-center gap-4">
                            <span className="text-xs font-medium text-slate-400">{item.time}</span>
                            <ArrowRight size={16} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                         </div>
                      </div>
                   ))}
                </div>
             </div>

             {/* Quick Links / Templates */}
             <div className="lg:col-span-1 flex flex-col gap-6">
                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-white shadow-lg">
                   <h3 className="font-bold text-lg mb-2">Thư viện Mẫu thông minh</h3>
                   <p className="text-indigo-100 text-sm mb-6 opacity-90">Tự động điền thông tin khách hàng vào mẫu Hợp đồng Du học & Đào tạo.</p>
                   <button 
                      onClick={() => navigate('/contracts/templates')}
                      className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl font-bold text-sm transition-all backdrop-blur-sm"
                   >
                      Truy cập Thư viện
                   </button>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                   <h3 className="font-bold text-slate-900 mb-4">Hoạt động team</h3>
                   <div className="space-y-4">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">SM</div>
                         <div className="flex-1">
                            <p className="text-xs text-slate-800"><span className="font-bold">Sarah Miller</span> đã tạo HĐ mới</p>
                            <p className="text-[10px] text-slate-400">2 phút trước</p>
                         </div>
                      </div>
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold text-green-700">DC</div>
                         <div className="flex-1">
                            <p className="text-xs text-slate-800"><span className="font-bold">David Clark</span> đã chốt Deal #D992</p>
                            <p className="text-[10px] text-slate-400">15 phút trước</p>
                         </div>
                      </div>
                   </div>
                </div>
             </div>

          </div>

        </div>
      </div>
    </div>
  );
};

export default ContractDashboard;
