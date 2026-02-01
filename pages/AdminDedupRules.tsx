
import React, { useState } from 'react';
import { 
  Merge, 
  AlertTriangle, 
  Settings, 
  Save, 
  ToggleLeft, 
  ToggleRight, 
  ListOrdered
} from 'lucide-react';

const AdminDedupRules: React.FC = () => {
  // State
  const [autoMerge, setAutoMerge] = useState(false);
  const [fuzzyMatch, setFuzzyMatch] = useState(true);
  const [priorityOrder, setPriorityOrder] = useState(['phone', 'email', 'identity_card', 'social_id']);

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...priorityOrder];
    if (direction === 'up' && index > 0) {
      [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
    } else if (direction === 'down' && index < newOrder.length - 1) {
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    }
    setPriorityOrder(newOrder);
  };

  const getLabel = (key: string) => {
    switch (key) {
      case 'phone': return 'Số điện thoại (Mobile)';
      case 'email': return 'Địa chỉ Email';
      case 'identity_card': return 'CCCD / Hộ chiếu';
      case 'social_id': return 'ID Mạng xã hội (FB/Zalo)';
      default: return key;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#111418] font-sans overflow-y-auto">
      <div className="flex flex-1 justify-center py-8">
        <div className="flex flex-col max-w-[900px] flex-1 px-6 gap-8">
          
          <div className="flex flex-col gap-2">
             <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                <Merge className="text-blue-600" /> Cấu hình Quy tắc Chống trùng (Dedup)
             </h1>
             <p className="text-slate-500">Kiểm soát cách hệ thống phát hiện và xử lý dữ liệu khách hàng trùng lặp.</p>
          </div>

          {/* Logic Settings */}
          <div className="bg-white rounded-xl border border-[#cfdbe7] p-6 shadow-sm">
             <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Settings size={20} className="text-slate-400" /> Cơ chế Xử lý
             </h2>
             
             <div className="space-y-6">
                <div className="flex items-center justify-between">
                   <div>
                      <p className="font-bold text-slate-800">Tự động gộp (Auto-merge)</p>
                      <p className="text-sm text-slate-500">Nếu thông tin trùng khớp 100%, hệ thống tự động gộp vào hồ sơ cũ nhất.</p>
                   </div>
                   <button onClick={() => setAutoMerge(!autoMerge)} className={`transition-colors ${autoMerge ? 'text-green-600' : 'text-slate-400'}`}>
                      {autoMerge ? <ToggleRight size={48} /> : <ToggleLeft size={48} />}
                   </button>
                </div>

                <div className="flex items-center justify-between">
                   <div>
                      <p className="font-bold text-slate-800">Tìm kiếm mờ (Fuzzy Matching)</p>
                      <p className="text-sm text-slate-500">Phát hiện trùng lặp ngay cả khi có sai sót nhỏ (VD: 090... vs +8490...).</p>
                   </div>
                   <button onClick={() => setFuzzyMatch(!fuzzyMatch)} className={`transition-colors ${fuzzyMatch ? 'text-green-600' : 'text-slate-400'}`}>
                      {fuzzyMatch ? <ToggleRight size={48} /> : <ToggleLeft size={48} />}
                   </button>
                </div>
             </div>
          </div>

          {/* Priority Sorting */}
          <div className="bg-white rounded-xl border border-[#cfdbe7] p-6 shadow-sm">
             <h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                <ListOrdered size={20} className="text-slate-400" /> Độ ưu tiên định danh
             </h2>
             <p className="text-sm text-slate-500 mb-6">Sắp xếp thứ tự các trường thông tin dùng để xác định tính duy nhất của khách hàng.</p>

             <div className="space-y-2 max-w-lg">
                {priorityOrder.map((item, idx) => (
                   <div key={item} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                      <span className="flex-1 font-medium text-slate-700">{getLabel(item)}</span>
                      <div className="flex flex-col gap-1">
                         <button onClick={() => moveItem(idx, 'up')} disabled={idx === 0} className="text-slate-400 hover:text-blue-600 disabled:opacity-30">▲</button>
                         <button onClick={() => moveItem(idx, 'down')} disabled={idx === priorityOrder.length - 1} className="text-slate-400 hover:text-blue-600 disabled:opacity-30">▼</button>
                      </div>
                   </div>
                ))}
             </div>
          </div>

          {/* Save Action */}
          <div className="flex justify-end pt-4">
             <button className="flex items-center gap-2 bg-[#1380ec] text-white px-6 py-3 rounded-lg font-bold shadow-md hover:bg-blue-700 transition-colors">
                <Save size={20} /> Lưu Cấu hình
             </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AdminDedupRules;
