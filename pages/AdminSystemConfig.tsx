
import React, { useState, useEffect, useMemo } from 'react';
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
  Flag,
  X,
  AlertTriangle
} from 'lucide-react';
import { getLostReasons, saveLostReasons } from '../utils/storage';

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
  const [activeTab, setActiveTab] = useState('lost_reasons'); // Default to lost_reasons as requested
  const [searchTerm, setSearchTerm] = useState('');

  // Real State for Lost Reasons
  const [lostReasons, setLostReasons] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newReason, setNewReason] = useState('');

  useEffect(() => {
    setLostReasons(getLostReasons());
  }, []);

  const handleAddReason = () => {
    if (!newReason.trim()) return;
    if (lostReasons.includes(newReason.trim())) {
      alert("Lý do này đã tồn tại!");
      return;
    }
    const updated = [...lostReasons, newReason.trim()];
    setLostReasons(updated);
    saveLostReasons(updated);
    setNewReason('');
    setShowAddModal(false);
  };

  const handleDeleteReason = (reason: string) => {
    if (confirm(`Bạn có chắc muốn xóa lý do: "${reason}"?`)) {
      const updated = lostReasons.filter(r => r !== reason);
      setLostReasons(updated);
      saveLostReasons(updated);
    }
  };

  // Filter data
  const filteredSources = LEAD_SOURCES.filter(item =>
    item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLostReasons = lostReasons.filter(reason =>
    reason.toLowerCase().includes(searchTerm.toLowerCase())
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
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === item.id
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
                {activeTab === 'lost_reasons' ? filteredLostReasons.length : filteredSources.length} mục đang hiển thị
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
              <button
                onClick={() => activeTab === 'lost_reasons' ? setShowAddModal(true) : null}
                className="flex items-center gap-2 bg-[#1380ec] hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors"
              >
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
                    <th className="px-6 py-4 text-[#0d141b] text-sm font-bold leading-normal w-[50%]">Tên Nhãn (Label)</th>
                    <th className="px-6 py-4 text-[#0d141b] text-sm font-bold leading-normal">Trạng thái</th>
                    <th className="px-6 py-4 text-[#0d141b] text-sm font-bold leading-normal text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#cfdbe7]">
                  {activeTab === 'lost_reasons' ? (
                    filteredLostReasons.map((reason, index) => (
                      <tr key={index} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4">
                          <span className="text-[#0d141b] text-sm font-bold">{reason}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-100">
                            <CheckCircle2 size={12} /> Hoạt động
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleDeleteReason(reason)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Xóa"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : activeTab === 'lead_sources' ? (
                    filteredSources.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4">
                          <span className="text-[#0d141b] text-sm font-medium">{row.label}</span>
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
                      <td colSpan={3} className="px-6 py-12 text-center text-slate-500">
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

      {/* ADD REASON MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in transition-all">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 bg-[#f8fafc] border-b border-[#cfdbe7] flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#0d141b]">Thêm Lý do Thất bại mới</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-[#0d141b] transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Nội dung lý do</label>
              <textarea
                className="w-full p-3 border border-[#cfdbe7] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#1380ec] min-h-[100px]"
                placeholder="Ví dụ: Khách phản hồi giá vé quá cao so với ngân sách..."
                value={newReason}
                onChange={e => setNewReason(e.target.value)}
                autoFocus
              ></textarea>
              <div className="flex items-center gap-2 mt-4 p-3 bg-blue-50 text-blue-700 rounded-lg border border-blue-100">
                <AlertTriangle size={16} className="shrink-0" />
                <p className="text-[11px] leading-tight">Lý do này sẽ hiển thị trong danh sách chọn của nhân viên khi họ đánh dấu "Thất bại" một Lead.</p>
              </div>
            </div>
            <div className="px-6 py-4 bg-[#f8fafc] border-t border-[#cfdbe7] flex justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-5 py-2 text-sm font-bold text-[#4c739a] hover:bg-slate-100 rounded-lg transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleAddReason}
                className="px-5 py-2 text-sm font-bold text-white bg-[#1380ec] hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
              >
                Lưu cấu hình
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSystemConfig;
