import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Facebook, 
  Globe, 
  Video, 
  Phone, 
  Database, 
  Briefcase, 
  User, 
  LayoutGrid,
  Filter,
  Chrome,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Settings,
  X,
  Save,
  PieChart
} from 'lucide-react';

// --- MOCK DATA TYPES ---
interface ICampaignLead {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  campaign: string;
  program: string;
  status: string;
}

interface ISourceMetrics {
  id: string;
  name: string;
  icon: any;
  leadCount: number; // Mẫu số (Số Lead)
  revenue: number;   // Doanh thu chốt (Lấy từ Sales)
  budget: number;    // Ngân sách (Marketing nhập)
}

// --- MOCK DATA: LEADS ---
const CAMPAIGN_LEADS: ICampaignLead[] = [
  { id: '1', name: 'Nguyễn Văn An', email: 'an.nguyen@email.com', phone: '0901 123 456', source: 'fb_lead_form', campaign: 'Trại Hè 2024', program: 'Tiếng Đức', status: 'Mới' },
  { id: '2', name: 'Trần Thị Bích', email: 'bich.tran@email.com', phone: '0902 987 654', source: 'landing_page', campaign: 'Quảng cáo Khóa Online', program: 'Tiếng Trung', status: 'Đã liên hệ' },
  { id: '3', name: 'Lê Văn Cường', email: 'cuong.le@email.com', phone: '0903 246 801', source: 'tiktok', campaign: 'Chiến dịch Tựu trường', program: 'Tiếng Đức', status: 'Đạt chuẩn' },
  { id: '4', name: 'Phạm Thị Dung', email: 'dung.pham@email.com', phone: '0904 369 147', source: 'hotline', campaign: 'Sự kiện Open House', program: 'Tiếng Trung', status: 'Đang xử lý' },
  { id: '5', name: 'Hoàng Văn Em', email: 'em.hoang@email.com', phone: '0905 789 012', source: 'google', campaign: 'Học bổng Du học', program: 'Tiếng Đức', status: 'Đóng' },
  { id: '6', name: 'Vũ Thị Phương', email: 'phuong.vu@email.com', phone: '0906 456 789', source: 'data_thi_truong_THPT', campaign: 'Hội thảo Luyện thi', program: 'Tiếng Trung', status: 'Mới' },
  { id: '7', name: 'Đặng Văn Giang', email: 'giang.dang@email.com', phone: '0907 654 321', source: 'B2B', campaign: 'Đào tạo Doanh nghiệp', program: 'Tiếng Đức', status: 'Đã liên hệ' },
  { id: '8', name: 'Bùi Thị Hoa', email: 'hoa.bui@email.com', phone: '0908 102 938', source: 'sale_tu_kiem_ca_nhan', campaign: 'Gia sư 1-1', program: 'Tiếng Trung', status: 'Đạt chuẩn' },
  { id: '9', name: 'Ngô Văn Ích', email: 'ich.ngo@email.com', phone: '0909 876 543', source: 'fb_inbox', campaign: 'Tuyển sinh Mùa thu', program: 'Tiếng Đức', status: 'Đang xử lý' },
  { id: '10', name: 'Đỗ Thị Kim', email: 'kim.do@email.com', phone: '0910 210 987', source: 'landing_page', campaign: 'Đăng ký Khóa Đông', program: 'Tiếng Trung', status: 'Đóng' },
];

// --- MOCK DATA: SOURCES & BUDGET ---
const INITIAL_SOURCES: ISourceMetrics[] = [
  { id: 'fb_lead_form', name: 'Facebook Lead Form', icon: Facebook, leadCount: 42, revenue: 250000000, budget: 15000000 },
  { id: 'fb_inbox', name: 'Facebook Inbox', icon: Facebook, leadCount: 18, revenue: 80000000, budget: 5000000 },
  { id: 'landing_page', name: 'Landing Page', icon: Globe, leadCount: 25, revenue: 120000000, budget: 10000000 },
  { id: 'tiktok', name: 'TikTok', icon: Video, leadCount: 15, revenue: 45000000, budget: 8000000 },
  { id: 'hotline', name: 'Hotline', icon: Phone, leadCount: 8, revenue: 90000000, budget: 2000000 },
  { id: 'google', name: 'Google Search', icon: Chrome, leadCount: 12, revenue: 150000000, budget: 12000000 },
  { id: 'data_thi_truong_THPT', name: 'Data THPT', icon: Database, leadCount: 50, revenue: 30000000, budget: 5000000 },
  { id: 'B2B', name: 'Đối tác B2B', icon: Briefcase, leadCount: 5, revenue: 200000000, budget: 500000 },
  { id: 'sale_tu_kiem_ca_nhan', name: 'Sale tự kiếm', icon: User, leadCount: 3, revenue: 15000000, budget: 0 },
];

const Campaigns: React.FC = () => {
  const [activeSourceId, setActiveSourceId] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sources, setSources] = useState<ISourceMetrics[]>(INITIAL_SOURCES);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [tempBudgets, setTempBudgets] = useState<{id: string, value: number}[]>([]);

  // --- CALCULATIONS ---
  const activeSource = useMemo(() => {
    return sources.find(s => s.id === activeSourceId) || null;
  }, [activeSourceId, sources]);

  const filteredLeads = useMemo(() => {
    return CAMPAIGN_LEADS.filter(lead => {
      const matchesSource = activeSourceId === 'all' || lead.source === activeSourceId;
      const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            lead.campaign.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSource && matchesSearch;
    });
  }, [activeSourceId, searchTerm]);

  // Tính toán KPI Tổng hợp
  const totalKPI = useMemo(() => {
    let targetSources = activeSourceId === 'all' ? sources : sources.filter(s => s.id === activeSourceId);
    
    const totalBudget = targetSources.reduce((acc, curr) => acc + curr.budget, 0);
    const totalRevenue = targetSources.reduce((acc, curr) => acc + curr.revenue, 0);
    const totalLeads = targetSources.reduce((acc, curr) => acc + curr.leadCount, 0);
    
    const cpl = totalLeads > 0 ? totalBudget / totalLeads : 0;
    const roi = totalBudget > 0 ? ((totalRevenue - totalBudget) / totalBudget) * 100 : 0;

    return { totalBudget, totalRevenue, totalLeads, cpl, roi };
  }, [activeSourceId, sources]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  // --- HANDLERS ---
  const openBudgetModal = () => {
    setTempBudgets(sources.map(s => ({ id: s.id, value: s.budget })));
    setIsBudgetModalOpen(true);
  };

  const handleBudgetChange = (id: string, newVal: string) => {
    const numVal = parseInt(newVal.replace(/\D/g, ''), 10) || 0;
    setTempBudgets(prev => prev.map(item => item.id === id ? { ...item, value: numVal } : item));
  };

  const saveBudgets = () => {
    setSources(prev => prev.map(s => {
      const update = tempBudgets.find(t => t.id === s.id);
      return update ? { ...s, budget: update.value } : s;
    }));
    setIsBudgetModalOpen(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#111418] font-sans">
      <div className="flex flex-1 justify-center py-5 px-6 gap-6 h-full overflow-hidden">
        
        {/* LEFT SIDEBAR: Source Filters */}
        <div className="flex flex-col w-80 shrink-0 h-full overflow-hidden">
          {/* Search Box */}
          <div className="py-3">
             <label className="flex flex-col h-12 w-full">
                <div className="flex w-full flex-1 items-stretch rounded-lg h-full shadow-sm">
                  <div className="text-[#4c739a] flex border border-r-0 border-[#dbe0e6] bg-white items-center justify-center pl-4 rounded-l-lg">
                    <Search size={20} />
                  </div>
                  <input
                    placeholder="Tìm kiếm chiến dịch..."
                    className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-r-lg text-[#111418] focus:outline-0 focus:ring-0 border border-l-0 border-[#dbe0e6] bg-white h-full placeholder:text-[#4c739a] px-3 text-base font-normal leading-normal"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </label>
          </div>

          {/* Sources List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <h3 className="text-[#111418] text-lg font-bold leading-tight tracking-[-0.015em] pb-3 pt-2">Nguồn Lead (Sources)</h3>
            
            <button
               onClick={() => setActiveSourceId('all')}
               className={`flex items-center w-full gap-4 px-4 min-h-14 rounded-lg transition-colors border mb-1 ${
                 activeSourceId === 'all' 
                   ? 'bg-blue-50 border-blue-200 shadow-sm' 
                   : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'
               }`}
             >
                <div className={`flex items-center justify-center rounded-lg shrink-0 size-10 ${activeSourceId === 'all' ? 'bg-blue-100 text-blue-600' : 'bg-[#e7edf3] text-[#111418]'}`}>
                  <LayoutGrid size={20} />
                </div>
                <div className="flex-1 text-left">
                  <p className={`text-base font-medium ${activeSourceId === 'all' ? 'text-blue-700' : 'text-[#111418]'}`}>Tất cả nguồn</p>
                </div>
                {activeSourceId === 'all' && (
                   <span className="text-xs font-bold text-blue-600 bg-white px-2 py-0.5 rounded-full shadow-sm">
                     {sources.reduce((a, b) => a + b.leadCount, 0)}
                   </span>
                )}
             </button>

            <div className="space-y-1">
              {sources.map((source) => (
                <button
                  key={source.id}
                  onClick={() => setActiveSourceId(source.id)}
                  className={`flex items-center w-full gap-4 px-4 min-h-14 rounded-lg transition-colors border ${
                    activeSourceId === source.id 
                      ? 'bg-blue-50 border-blue-200 shadow-sm' 
                      : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'
                  }`}
                >
                  <div className={`flex items-center justify-center rounded-lg shrink-0 size-10 ${
                     activeSourceId === source.id ? 'bg-blue-100 text-blue-600' : 'bg-[#e7edf3] text-[#111418]'
                  }`}>
                    <source.icon size={20} />
                  </div>
                  <div className="flex-1 text-left overflow-hidden">
                    <p className={`text-base font-medium leading-normal truncate ${activeSourceId === source.id ? 'text-blue-700' : 'text-[#111418]'}`}>
                      {source.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                       {/* Mini ROI Indicator */}
                       {source.budget > 0 && (
                          <span className={`text-[10px] font-bold ${((source.revenue - source.budget) > 0) ? 'text-green-600' : 'text-red-500'}`}>
                             ROI: {(((source.revenue - source.budget) / source.budget) * 100).toFixed(0)}%
                          </span>
                       )}
                    </div>
                  </div>
                  {activeSourceId === source.id && (
                     <span className="text-xs font-bold text-blue-600 bg-white px-2 py-0.5 rounded-full shadow-sm">{source.leadCount}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT CONTENT: Table */}
        <div className="flex flex-col flex-1 h-full overflow-hidden bg-white rounded-xl shadow-sm border border-[#dbe0e6]">
            
            {/* KPI Dashboard - ROI & Budget */}
            <div className="grid grid-cols-4 gap-4 p-6 border-b border-[#dbe0e6] bg-slate-50">
               <div className="col-span-4 flex justify-between items-center mb-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                     <PieChart size={16} /> Hiệu quả đầu tư (ROI)
                  </h3>
                  <button 
                     onClick={openBudgetModal}
                     className="text-xs font-bold text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                  >
                     <Settings size={14} /> Quản lý Ngân sách
                  </button>
               </div>
               
               {/* KPI Card 1: Budget */}
               <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-500 font-medium mb-1">Tổng Ngân sách (Budget)</p>
                  <p className="text-lg font-bold text-slate-900">{formatCurrency(totalKPI.totalBudget)}</p>
               </div>

               {/* KPI Card 2: Revenue */}
               <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-500 font-medium mb-1">Doanh thu chốt (Revenue)</p>
                  <p className="text-lg font-bold text-emerald-600">{formatCurrency(totalKPI.totalRevenue)}</p>
               </div>

               {/* KPI Card 3: CPL */}
               <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-500 font-medium mb-1">Chi phí / Lead (CPL)</p>
                  <p className="text-lg font-bold text-blue-600">{formatCurrency(totalKPI.cpl)}</p>
                  <p className="text-[10px] text-slate-400">trên {totalKPI.totalLeads} leads</p>
               </div>

               {/* KPI Card 4: ROI */}
               <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-500 font-medium mb-1">Tỷ suất lợi nhuận (ROI)</p>
                  <div className="flex items-center gap-2">
                     <p className={`text-lg font-bold ${totalKPI.roi >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {totalKPI.roi.toFixed(1)}%
                     </p>
                     {totalKPI.roi > 0 ? <TrendingUp size={16} className="text-emerald-500" /> : <TrendingDown size={16} className="text-red-500" />}
                  </div>
               </div>
            </div>

            {/* Table Header */}
            <div className="flex flex-wrap justify-between gap-3 p-6 border-b border-[#dbe0e6]">
              <div className="flex flex-col gap-1">
                <p className="text-[#111418] tracking-light text-[20px] font-bold leading-tight">Danh sách Lead chi tiết</p>
                <p className="text-[#4c739a] text-sm font-normal leading-normal">
                   Đang xem: <span className="font-bold text-blue-600">{activeSource ? activeSource.name : 'Tất cả nguồn'}</span>
                </p>
              </div>
              <div className="flex gap-2">
                 <button className="flex items-center gap-2 px-4 py-2 bg-white border border-[#dbe0e6] rounded-lg text-sm font-medium hover:bg-slate-50">
                    <Filter size={16} /> Bộ lọc
                 </button>
              </div>
            </div>

            {/* Table Body */}
            <div className="flex-1 overflow-auto px-6 py-3">
              <div className="min-w-full inline-block align-middle">
                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-[#111418] uppercase tracking-wider w-[20%]">Họ tên</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-[#111418] uppercase tracking-wider w-[20%] hidden xl:table-cell">Email</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-[#111418] uppercase tracking-wider w-[15%]">Điện thoại</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-[#111418] uppercase tracking-wider w-[15%]">Nguồn</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-[#111418] uppercase tracking-wider w-[15%] hidden lg:table-cell">Chiến dịch</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-[#111418] uppercase tracking-wider w-[10%]">Chương trình</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-[#111418] uppercase tracking-wider w-[10%]">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredLeads.map((lead) => (
                        <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-[#111418]">{lead.name}</div>
                            <div className="text-xs text-[#4c739a] xl:hidden">{lead.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap hidden xl:table-cell">
                            <div className="text-sm text-[#4c739a]">{lead.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-[#4c739a]">{lead.phone}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-[#e7edf3] text-[#0d141b] max-w-[140px] truncate">
                              {sources.find(s => s.id === lead.source)?.name || lead.source}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                             <div className="text-sm text-[#4c739a] truncate max-w-[150px]" title={lead.campaign}>{lead.campaign}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-50 text-blue-700">
                              {lead.program}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                             <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full border ${
                                lead.status === 'Đạt chuẩn' ? 'bg-green-50 text-green-700 border-green-100' : 
                                lead.status === 'Mới' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                lead.status === 'Đã liên hệ' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                lead.status === 'Đang xử lý' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                'bg-slate-50 text-slate-600 border-slate-100'
                             }`}>
                              {lead.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      
                      {filteredLeads.length === 0 && (
                         <tr>
                            <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                               Không tìm thấy dữ liệu phù hợp với bộ lọc hiện tại.
                            </td>
                         </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
        </div>
      </div>

      {/* --- BUDGET MODAL --- */}
      {isBudgetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsBudgetModalOpen(false)}></div>
           <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                 <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                       <DollarSign className="text-emerald-600" /> Quản lý Ngân sách Marketing
                    </h3>
                    <p className="text-sm text-slate-500">Nhập ngân sách dự kiến (Tháng này) để tính toán ROI.</p>
                 </div>
                 <button onClick={() => setIsBudgetModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={24} />
                 </button>
              </div>
              
              <div className="p-6 overflow-y-auto custom-scrollbar bg-white">
                 <div className="space-y-4">
                    {sources.map((src) => {
                       const currentVal = tempBudgets.find(t => t.id === src.id)?.value || 0;
                       return (
                          <div key={src.id} className="flex items-center gap-4 p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
                             <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                <src.icon size={20} />
                             </div>
                             <div className="flex-1">
                                <p className="font-bold text-sm text-slate-900">{src.name}</p>
                                <p className="text-xs text-slate-500">
                                   Doanh thu: <span className="font-medium text-emerald-600">{formatCurrency(src.revenue)}</span>
                                </p>
                             </div>
                             <div className="w-48">
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Ngân sách (VNĐ)</label>
                                <input 
                                   type="text" 
                                   value={currentVal.toLocaleString('vi-VN')}
                                   onChange={(e) => handleBudgetChange(src.id, e.target.value)}
                                   className="w-full text-right px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                             </div>
                          </div>
                       );
                    })}
                 </div>
              </div>

              <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
                 <button 
                    onClick={() => setIsBudgetModalOpen(false)}
                    className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg"
                 >
                    Hủy bỏ
                 </button>
                 <button 
                    onClick={saveBudgets}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center gap-2 shadow-sm"
                 >
                    <Save size={18} /> Lưu cấu hình
                 </button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default Campaigns;