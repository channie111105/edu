
import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  XCircle,
  Database,
  List,
  Activity,
  CreditCard,
  Globe,
  Flag
} from 'lucide-react';

// --- MOCK DATA ---
const LEAD_SOURCES = [
  { id: 1, label: 'Đăng ký Online (Inquiry)', value: 'online_inquiry', status: 'Active' },
  { id: 2, label: 'Giới thiệu (Referral)', value: 'referral', status: 'Active' },
  { id: 3, label: 'Sự kiện (Event)', value: 'event', status: 'Active' },
  { id: 4, label: 'Gọi lạnh (Cold Call)', value: 'cold_call', status: 'Inactive' },
  { id: 5, label: 'Form Website', value: 'website_form', status: 'Active' },
  { id: 6, label: 'Facebook Ads', value: 'fb_ads', status: 'Active' },
  { id: 7, label: 'TikTok Ads', value: 'tiktok_ads', status: 'Active' },
];

const CONFIG_MENU = [
  { id: 'lead_sources', label: 'Nguồn Lead (Sources)', icon: Database },
  { id: 'lead_statuses', label: 'Trạng thái Lead', icon: Activity },
  { id: 'deal_stages', label: 'Giai đoạn Deal (Pipeline)', icon: List },
  { id: 'lost_reasons', label: 'Lý do Thất bại', icon: Flag },
  { id: 'payment_methods', label: 'Phương thức Thanh toán', icon: CreditCard },
  { id: 'programs', label: 'Quốc gia / Chương trình', icon: Globe },
];

const AdminSystemConfig: React.FC = () => {
  const [activeTab, setActiveTab] = useState('lead_sources');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter data (Mocking filtering for Lead Sources only for this demo)
  const filteredData = LEAD_SOURCES.filter(item => 
    item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#0d141b] font-sans overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        
        {/* LEFT SIDEBAR: CONFIG MENU */}
        <aside className="w-72 bg-white border-r border-[#cfdbe7] flex flex-col z-10 overflow-y-auto">
          <div className="p-6 pb-2">
            <h2 className="text-xl font-bold text-[#0d141b] mb-1">Cấu hình Dữ liệu</h2>
            <p className="text-sm text-[#4c739a]">Quản lý các danh mục từ điển hệ thống.</p>
          </div>
          
          <div className="p-4 flex flex-col gap-1">
            {CONFIG_MENU.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  activeTab === item.id 
                    ? 'bg-[#e7edf3] text-[#0d141b] font-bold shadow-sm' 
                    : 'text-[#4c739a] hover:bg-slate-50 hover:text-[#0d141b]'
                }`}
              >
                <item.icon size={18} className={activeTab === item.id ? 'text-[#1380ec]' : 'text-slate-400'} />
                {item.label}
              </button>
            ))}
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 flex flex-col overflow-hidden">
          
          {/* Header & Actions */}
          <div className="px-8 py-6 border-b border-[#cfdbe7] bg-white flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#0d141b]">
                {CONFIG_MENU.find(m => m.id === activeTab)?.label}
              </h1>
              <p className="text-sm text-[#4c739a] mt-1">
                {filteredData.length} mục đang hiển thị
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Tìm kiếm..." 
                  className="pl-10 pr-4 py-2 border border-[#cfdbe7] rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#1380ec] w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button className="flex items-center gap-2 bg-[#1380ec] hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors">
                <Plus size={18} />
                Thêm mới
              </button>
            </div>
          </div>

          {/* Table Content */}
          <div className="flex-1 overflow-y-auto p-8">
            <div className="bg-white border border-[#cfdbe7] rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#f8fafc] border-b border-[#cfdbe7]">
                    <th className="px-6 py-4 text-[#0d141b] text-sm font-bold leading-normal w-[40%]">Tên Nhãn (Label)</th>
                    <th className="px-6 py-4 text-[#0d141b] text-sm font-bold leading-normal w-[30%]">Giá trị (Value/ID)</th>
                    <th className="px-6 py-4 text-[#0d141b] text-sm font-bold leading-normal">Trạng thái</th>
                    <th className="px-6 py-4 text-[#0d141b] text-sm font-bold leading-normal text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#cfdbe7]">
                  {activeTab === 'lead_sources' ? (
                    filteredData.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4">
                          <span className="text-[#0d141b] text-sm font-medium">{row.label}</span>
                        </td>
                        <td className="px-6 py-4">
                          <code className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-mono">{row.value}</code>
                        </td>
                        <td className="px-6 py-4">
                          {row.status === 'Active' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-100">
                              <CheckCircle2 size={12} /> Hoạt động
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200">
                              <XCircle size={12} /> Ngừng
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Chỉnh sửa">
                              <Edit2 size={16} />
                            </button>
                            <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Xóa">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                        <p>Dữ liệu mẫu cho danh mục <strong>{CONFIG_MENU.find(m => m.id === activeTab)?.label}</strong> đang được cập nhật.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
};

export default AdminSystemConfig;
