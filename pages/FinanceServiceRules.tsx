
import React, { useState } from 'react';
import { 
  Zap, 
  ArrowRight, 
  Plus, 
  Trash2, 
  Save, 
  Layers, 
  Lock, 
  Unlock, 
  AlertTriangle,
  Package,
  CheckCircle2
} from 'lucide-react';

const FinanceServiceRules: React.FC = () => {
  const [rules, setRules] = useState([
    { 
        id: 1, 
        product: 'Combo Đức A1-B1', 
        installment: 'Đợt 1 (Đặt cọc)', 
        action: 'Unlock', 
        target: 'Lớp học A1 & Tài khoản LMS',
        active: true 
    },
    { 
        id: 2, 
        product: 'Combo Đức A1-B1', 
        installment: 'Đợt 2 (Trước học A2)', 
        action: 'Unlock', 
        target: 'Lớp học A2',
        active: true 
    },
    { 
        id: 3, 
        product: 'Du học Trung Quốc', 
        installment: 'Đợt 2 (Visa)', 
        action: 'Unlock', 
        target: 'Dịch vụ Hỗ trợ Sau bay',
        active: true 
    },
    { 
        id: 4, 
        product: 'Toàn bộ khóa học', 
        installment: 'Quá hạn > 7 ngày', 
        action: 'Lock', 
        target: 'Quyền truy cập App & Điểm danh',
        active: false 
    },
  ]);

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#111418] font-sans overflow-hidden">
      <div className="flex flex-col flex-1 overflow-y-auto p-6 lg:p-8 max-w-[1200px] mx-auto w-full">
        
        <div className="mb-8">
           <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2 flex items-center gap-3">
              <Lock className="text-blue-600" /> Mapping Dịch vụ & Thanh toán (Unlock Rules)
           </h1>
           <p className="text-slate-500">Định nghĩa quy tắc: Khách hàng đóng tiền đợt nào thì hệ thống tự động mở khóa dịch vụ tương ứng.</p>
        </div>

        {/* Warning Banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 mb-8">
           <AlertTriangle className="text-amber-600 mt-0.5" size={20} />
           <div>
              <h3 className="text-sm font-bold text-amber-800">Cơ chế hoạt động</h3>
              <p className="text-sm text-amber-700 mt-1 leading-relaxed">
                 Khi Kế toán xác nhận giao dịch thanh toán thành công (Status = Paid), hệ thống sẽ quét bảng luật này. 
                 Nếu khớp Sản phẩm và Đợt thu, lệnh Mở khóa (Unlock) sẽ được gửi sang phân hệ Đào tạo/Du học ngay lập tức.
              </p>
           </div>
        </div>

        {/* Rules Table */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
           <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                 <tr>
                    <th className="px-6 py-4">Sản phẩm / Gói</th>
                    <th className="px-6 py-4">Điều kiện (Khi đóng xong...)</th>
                    <th className="px-6 py-4 text-center">Hành động</th>
                    <th className="px-6 py-4">Đối tượng tác động</th>
                    <th className="px-6 py-4 text-center">Trạng thái</th>
                    <th className="px-6 py-4"></th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                 {rules.map((rule) => (
                    <tr key={rule.id} className={`hover:bg-slate-50 transition-colors ${!rule.active ? 'opacity-50 bg-slate-50' : ''}`}>
                       <td className="px-6 py-4">
                          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                             <Package size={16} className="text-blue-600" /> {rule.product}
                          </div>
                       </td>
                       <td className="px-6 py-4">
                          <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold border border-slate-200">
                             {rule.installment}
                          </span>
                       </td>
                       <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center">
                             <ArrowRight size={16} className="text-slate-300 mr-4" />
                             {rule.action === 'Unlock' ? (
                                <span className="flex items-center gap-1 text-green-600 font-bold text-xs uppercase bg-green-50 px-2 py-1 rounded">
                                   <Unlock size={14} /> Mở khóa
                                </span>
                             ) : (
                                <span className="flex items-center gap-1 text-red-600 font-bold text-xs uppercase bg-red-50 px-2 py-1 rounded">
                                   <Lock size={14} /> Khóa lại
                                </span>
                             )}
                          </div>
                       </td>
                       <td className="px-6 py-4 font-medium text-sm text-slate-800">
                          {rule.target}
                       </td>
                       <td className="px-6 py-4 text-center">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={rule.active} className="sr-only peer" onChange={() => {}} />
                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                       </td>
                       <td className="px-6 py-4 text-right">
                          <button className="text-slate-400 hover:text-red-500 transition-colors">
                             <Trash2 size={18} />
                          </button>
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
           
           <div className="p-4 bg-slate-50 border-t border-slate-200">
              <button className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-bold flex items-center justify-center gap-2 hover:bg-white hover:border-blue-300 hover:text-blue-600 transition-all">
                 <Plus size={20} /> Thêm Quy tắc Mapping mới
              </button>
           </div>
        </div>

      </div>
    </div>
  );
};

export default FinanceServiceRules;
