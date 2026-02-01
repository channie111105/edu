
import React, { useState } from 'react';
import { 
  Home, 
  PlaneLanding, 
  ShieldPlus, 
  Plus, 
  MoreHorizontal, 
  MapPin, 
  Calendar,
  User,
  CheckCircle2,
  Clock
} from 'lucide-react';

const SERVICES = [
  { 
    id: 1, type: 'Housing', title: 'Ký túc xá Munich', student: 'Nguyễn Thùy Linh', 
    date: '15/10/2024', status: 'Processing', assignee: 'Sarah', 
    details: 'Phòng đơn, Budget €400-500' 
  },
  { 
    id: 2, type: 'Pickup', title: 'Đón sân bay Frankfurt', student: 'Trần Văn Minh', 
    date: '20/10/2024', status: 'Scheduled', assignee: 'David', 
    details: 'Chuyến bay VN31, hạ cánh 06:00 AM' 
  },
  { 
    id: 3, type: 'Insurance', title: 'Gia hạn Bảo hiểm AOK', student: 'Lê Hoàng', 
    date: '01/11/2024', status: 'Done', assignee: 'Sarah', 
    details: 'Đã gửi thẻ cứng về địa chỉ nhà' 
  },
];

const StudyAbroadServices: React.FC = () => {
  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#0d141b] font-sans overflow-y-auto">
      <div className="flex flex-col flex-1 p-6 lg:p-10 max-w-[1600px] mx-auto w-full gap-8">
        
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
               <PlaneLanding className="text-blue-600" /> Dịch vụ Sau bay & Hỗ trợ
            </h1>
            <p className="text-slate-500 mt-1">Quản lý nhà ở, đưa đón và các dịch vụ hỗ trợ sinh hoạt cho du học sinh.</p>
          </div>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm hover:bg-blue-700 transition-colors flex items-center gap-2">
             <Plus size={18} /> Đăng ký Dịch vụ mới
          </button>
        </div>

        {/* Service Categories */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 cursor-pointer hover:border-blue-400 transition-all">
              <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                 <Home size={24} />
              </div>
              <div>
                 <p className="font-bold text-slate-900 text-lg">Nhà ở & KTX</p>
                 <p className="text-xs text-slate-500">12 yêu cầu đang xử lý</p>
              </div>
           </div>
           <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 cursor-pointer hover:border-blue-400 transition-all">
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                 <PlaneLanding size={24} />
              </div>
              <div>
                 <p className="font-bold text-slate-900 text-lg">Đưa đón Sân bay</p>
                 <p className="text-xs text-slate-500">5 lịch đón tuần này</p>
              </div>
           </div>
           <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 cursor-pointer hover:border-blue-400 transition-all">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                 <ShieldPlus size={24} />
              </div>
              <div>
                 <p className="font-bold text-slate-900 text-lg">Bảo hiểm & Sim</p>
                 <p className="text-xs text-slate-500">8 hợp đồng sắp hết hạn</p>
              </div>
           </div>
        </div>

        {/* Task Board / List */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
           <div className="p-4 border-b border-slate-200 bg-slate-50 font-bold text-slate-700">
              Danh sách Yêu cầu Hỗ trợ
           </div>
           <div className="divide-y divide-slate-100">
              {SERVICES.map(item => (
                 <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                       <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          item.type === 'Housing' ? 'bg-orange-50 text-orange-600' :
                          item.type === 'Pickup' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                       }`}>
                          {item.type === 'Housing' ? <Home size={20} /> : item.type === 'Pickup' ? <PlaneLanding size={20} /> : <ShieldPlus size={20} />}
                       </div>
                       <div>
                          <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                             <span className="flex items-center gap-1"><User size={12}/> {item.student}</span>
                             <span className="flex items-center gap-1"><Calendar size={12}/> {item.date}</span>
                          </div>
                       </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                       <div className="text-right">
                          <p className="text-xs font-medium text-slate-600 mb-1">Chi tiết</p>
                          <p className="text-sm font-bold text-slate-800">{item.details}</p>
                       </div>
                       <div className="text-right w-24">
                          {item.status === 'Done' && <span className="flex items-center justify-end gap-1 text-xs font-bold text-green-600"><CheckCircle2 size={14}/> Hoàn tất</span>}
                          {item.status === 'Processing' && <span className="flex items-center justify-end gap-1 text-xs font-bold text-blue-600"><Clock size={14}/> Đang tìm</span>}
                          {item.status === 'Scheduled' && <span className="flex items-center justify-end gap-1 text-xs font-bold text-amber-600"><Calendar size={14}/> Đã chốt lịch</span>}
                       </div>
                       <button className="text-slate-400 hover:text-slate-600"><MoreHorizontal size={20}/></button>
                    </div>
                 </div>
              ))}
           </div>
        </div>

      </div>
    </div>
  );
};

export default StudyAbroadServices;
