
import React, { useState } from 'react';
import { 
  Tag, 
  DollarSign, 
  AlertTriangle, 
  Save, 
  Search, 
  Plus, 
  Edit2,
  Trash2,
  CreditCard,
  Layers,
  CalendarClock,
  Settings2
} from 'lucide-react';

const PRODUCTS = [
  { id: 'DE-A1', name: 'Tiếng Đức A1 (Offline)', price: 8000000, minPrice: 7000000, maxDiscount: 10 },
  { id: 'DE-A2', name: 'Tiếng Đức A2 (Offline)', price: 9000000, minPrice: 8000000, maxDiscount: 10 },
  { id: 'CN-HSK3', name: 'Tiếng Trung HSK 3', price: 4500000, minPrice: 4000000, maxDiscount: 15 },
  { id: 'COMBO-GER', name: 'Combo Du học Đức (A1-B1)', price: 45000000, minPrice: 40000000, maxDiscount: 20 },
];

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

const AdminFinancialConfig: React.FC = () => {
  const [mainTab, setMainTab] = useState<'pricing' | 'payment'>('pricing');
  const [products, setProducts] = useState(PRODUCTS);
  const [policyThreshold, setPolicyThreshold] = useState(15);
  const [paymentActiveTab, setPaymentActiveTab] = useState('abroad');

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#111418] font-sans overflow-y-auto">
      <div className="flex flex-1 justify-center py-8">
        <div className="flex flex-col max-w-[1200px] flex-1 px-6 gap-8">
          
          <div className="flex flex-col gap-2">
             <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                <Settings2 className="text-blue-600" /> Cấu hình Tài chính & Chính sách
             </h1>
             <p className="text-slate-500">Quản lý giá sản phẩm, chính sách chiết khấu và các mẫu lộ trình đóng phí.</p>
          </div>

          {/* Main Tabs */}
          <div className="flex gap-1 p-1 bg-slate-200/50 rounded-xl w-fit">
            <button 
              onClick={() => setMainTab('pricing')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${mainTab === 'pricing' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <Tag size={18} /> Chính sách Giá & Sản phẩm
            </button>
            <button 
              onClick={() => setMainTab('payment')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${mainTab === 'payment' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <CreditCard size={18} /> Mẫu Lộ trình Phí
            </button>
          </div>

          {mainTab === 'pricing' ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Global Policy */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                <div className="flex gap-4 items-start">
                    <div className="p-3 bg-amber-100 text-amber-600 rounded-lg">
                      <AlertTriangle size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-amber-900 text-lg">Chính sách Phê duyệt Giá</h3>
                      <p className="text-sm text-amber-800 mt-1 max-w-lg">
                          Các Deal có mức giảm giá vượt quá ngưỡng này sẽ bị khóa và yêu cầu sự phê duyệt từ Sales Leader hoặc Admin.
                      </p>
                    </div>
                </div>
                <div className="flex items-center gap-4 bg-white px-4 py-3 rounded-lg border border-amber-200">
                    <span className="font-bold text-slate-700 text-sm">Ngưỡng tối đa:</span>
                    <div className="relative w-24">
                      <input 
                          type="number" 
                          value={policyThreshold} 
                          onChange={(e) => setPolicyThreshold(Number(e.target.value))}
                          className="w-full pl-3 pr-6 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-amber-500 outline-none text-right font-bold text-amber-700"
                      />
                      <span className="absolute right-2 top-1.5 text-slate-400 font-bold text-sm">%</span>
                    </div>
                </div>
              </div>

              {/* Price List Table */}
              <div className="bg-white rounded-xl border border-[#cfdbe7] shadow-sm overflow-hidden">
                <div className="p-6 border-b border-[#cfdbe7] flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-900 text-lg">Bảng giá Niêm yết</h3>
                    <div className="flex gap-3">
                      <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          <input className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 w-64" placeholder="Tìm sản phẩm..." />
                      </div>
                      <button className="flex items-center gap-2 bg-[#1380ec] text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors shadow-sm">
                          <Plus size={16} /> Thêm Sản phẩm
                      </button>
                    </div>
                </div>
                <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-500 uppercase text-xs font-bold border-b border-slate-200">
                      <tr>
                          <th className="px-6 py-4 w-20">Mã</th>
                          <th className="px-6 py-4">Tên Sản phẩm</th>
                          <th className="px-6 py-4 text-right">Giá Niêm yết</th>
                          <th className="px-6 py-4 text-right">Giá Sàn (Min)</th>
                          <th className="px-6 py-4 text-center">Max Discount</th>
                          <th className="px-6 py-4 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {products.map((prod) => (
                          <tr key={prod.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-mono text-xs font-bold text-slate-500">{prod.id}</td>
                            <td className="px-6 py-4 font-bold text-slate-900">{prod.name}</td>
                            <td className="px-6 py-4 text-right font-medium text-slate-700">{formatCurrency(prod.price)}</td>
                            <td className="px-6 py-4 text-right font-medium text-red-600">{formatCurrency(prod.minPrice)}</td>
                            <td className="px-6 py-4 text-center">
                                <span className="inline-block bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-bold">{prod.maxDiscount}%</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                  <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"><Edit2 size={16} /></button>
                                  <button className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={16} /></button>
                                </div>
                            </td>
                          </tr>
                      ))}
                    </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <button className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg font-bold shadow-md hover:bg-green-700 transition-colors" onClick={() => alert("Đã lưu bảng giá mới!")}>
                    <Save size={20} /> Lưu thay đổi
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex justify-between items-center">
                <div className="flex gap-4 border-b border-slate-200 flex-1">
                  <button 
                      onClick={() => setPaymentActiveTab('abroad')}
                      className={`pb-3 px-4 font-bold text-sm transition-colors border-b-2 ${paymentActiveTab === 'abroad' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                  >
                      Du học
                  </button>
                  <button 
                      onClick={() => setPaymentActiveTab('training')}
                      className={`pb-3 px-4 font-bold text-sm transition-colors border-b-2 ${paymentActiveTab === 'training' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                  >
                      Đào tạo
                  </button>
                </div>
                <button className="flex items-center gap-2 bg-[#1380ec] text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 shadow-sm transition-colors">
                    <Plus size={18} /> Tạo Mẫu mới
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {TEMPLATES.filter(t => t.type === paymentActiveTab).map((tpl) => (
                    <div key={tpl.id} className="bg-white rounded-xl border border-[#cfdbe7] shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
                      <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-white rounded-lg border border-slate-200 text-blue-600 shadow-sm">
                                <Layers size={20} />
                            </div>
                            <h3 className="font-bold text-slate-900">{tpl.name}</h3>
                          </div>
                          <button className="text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Edit2 size={18} />
                          </button>
                      </div>
                      
                      <div className="p-5 space-y-4">
                          {tpl.steps.map((step, idx) => (
                            <div key={idx} className="flex items-center gap-4 relative">
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
          )}

        </div>
      </div>
    </div>
  );
};

export default AdminFinancialConfig;
