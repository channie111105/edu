
import React, { useState } from 'react';
import { 
  CreditCard, 
  Plus, 
  MoreVertical, 
  CalendarClock, 
  PieChart, 
  Edit,
  Layers
} from 'lucide-react';

const AdminPaymentTemplates: React.FC = () => {
  const [activeTab, setActiveTab] = useState('abroad');

  const TEMPLATES = [
    { 
      id: 1, type: 'abroad', name: 'Lộ trình Du học Đức (Chuẩn)', total: '100%', 
      steps: [
        { name: 'Đợt 1 (Đặt cọc)', percent: 30, due: 'Ngay khi ký HĐ' },
        { name: 'Đợt 2 (Hồ sơ)', percent: 40, due: 'Sau 2 tháng / Có A2' },
        { name: 'Đợt 3 (Visa)', percent: 30, due: 'Khi có Visa' }
      ]
    },
    { 
      id: 2, type: 'abroad', name: 'Lộ trình Du học Trung Quốc', total: '100%', 
      steps: [
        { name: 'Đợt 1', percent: 50, due: 'Ngay khi ký HĐ' },
        { name: 'Đợt 2', percent: 50, due: 'Khi có Visa' }
      ]
    },
    { 
      id: 3, type: 'training', name: 'Khóa học Offline (1 lần)', total: '100%', 
      steps: [
        { name: 'Thanh toán toàn bộ', percent: 100, due: 'Trước khai giảng' }
      ]
    },
    { 
      id: 4, type: 'training', name: 'Khóa học Combo (2 lần)', total: '100%', 
      steps: [
        { name: 'Đợt 1', percent: 50, due: 'Trước khai giảng' },
        { name: 'Đợt 2', percent: 50, due: 'Sau 1 tháng học' }
      ]
    }
  ];

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#111418] font-sans overflow-y-auto">
      <div className="flex flex-1 justify-center py-8">
        <div className="flex flex-col max-w-[1000px] flex-1 px-6 gap-8">
          
          <div className="flex justify-between items-end">
             <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                   <CreditCard className="text-blue-600" /> Mẫu Lộ trình Đóng phí
                </h1>
                <p className="text-slate-500">Cấu hình sẵn các đợt thanh toán mẫu để áp dụng nhanh vào Hợp đồng.</p>
             </div>
             <button className="flex items-center gap-2 bg-[#1380ec] text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 shadow-sm transition-colors">
                <Plus size={18} /> Tạo Mẫu mới
             </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-4 border-b border-slate-200">
             <button 
                onClick={() => setActiveTab('abroad')}
                className={`pb-3 px-4 font-bold text-sm transition-colors border-b-2 ${activeTab === 'abroad' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
             >
                Du học
             </button>
             <button 
                onClick={() => setActiveTab('training')}
                className={`pb-3 px-4 font-bold text-sm transition-colors border-b-2 ${activeTab === 'training' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
             >
                Đào tạo
             </button>
          </div>

          {/* Template Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {TEMPLATES.filter(t => t.type === activeTab).map((tpl) => (
                <div key={tpl.id} className="bg-white rounded-xl border border-[#cfdbe7] shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
                   <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <div className="flex items-center gap-3">
                         <div className="p-2 bg-white rounded-lg border border-slate-200 text-blue-600 shadow-sm">
                            <Layers size={20} />
                         </div>
                         <h3 className="font-bold text-slate-900">{tpl.name}</h3>
                      </div>
                      <button className="text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Edit size={18} />
                      </button>
                   </div>
                   
                   <div className="p-5 space-y-4">
                      {tpl.steps.map((step, idx) => (
                         <div key={idx} className="flex items-center gap-4 relative">
                            {/* Timeline Line */}
                            {idx !== tpl.steps.length - 1 && (
                               <div className="absolute left-[15px] top-8 bottom-[-16px] w-[2px] bg-slate-100"></div>
                            )}
                            
                            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center border border-blue-100 z-10">
                               {step.percent}%
                            </div>
                            <div className="flex-1">
                               <p className="text-sm font-bold text-slate-800">{step.name}</p>
                               <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                  <CalendarClock size={12} /> {step.due}
                               </p>
                            </div>
                         </div>
                      ))}
                   </div>
                </div>
             ))}
          </div>

        </div>
      </div>
    </div>
  );
};

export default AdminPaymentTemplates;
