
import React from 'react';
import { Link } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell
} from 'recharts';
import { 
  Users, 
  ShieldCheck, 
  MousePointerClick, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  MoreVertical, 
  Calendar,
  MapPin
} from 'lucide-react';

// --- MOCK DATA ---
const SOURCE_DATA = [
  { name: 'Facebook', value: 42, color: '#1e40af' }, // Primary Blue
  { name: 'TikTok', value: 28, color: '#22d3ee' },   // Cyan
  { name: 'Hotline', value: 15, color: '#fbbf24' },  // Amber
  { name: 'Landing Page', value: 10, color: '#fb7185' }, // Rose
  { name: 'Khác', value: 5, color: '#94a3b8' },     // Slate
];

const CAMPAIGN_DATA = [
  { name: 'Summer Sale', rate: 65 },
  { name: 'Flash HSK', rate: 54 },
  { name: 'Job Fair', rate: 88 },
  { name: 'Mastery Week', rate: 42 },
  { name: 'New Year', rate: 76 },
];

const RECENT_LEADS = [
  { id: 'L-1', name: 'Nguyễn Văn Lâm', source: 'Facebook', status: 'Qualified', program: 'Tiếng Đức B1', value: 1200, time: '2 phút trước', avatar: 'NL', color: 'bg-blue-100 text-blue-700' },
  { id: 'L-2', name: 'Trần Hoa', source: 'TikTok', status: 'Contacting', program: 'Luyện thi HSK 4', value: 850, time: '15 phút trước', avatar: 'TH', color: 'bg-cyan-100 text-cyan-700' },
  { id: 'L-3', name: 'Lê Phương', source: 'Landing Page', status: 'New', program: 'Du học nghề Đức', value: 4500, time: '1 giờ trước', avatar: 'LP', color: 'bg-rose-100 text-rose-700' },
  { id: 'L-4', name: 'Đoàn Hùng', source: 'Hotline', status: 'Qualified', program: 'Tiếng Trung Cấp tốc', value: 600, time: '3 giờ trước', avatar: 'DH', color: 'bg-slate-100 text-slate-700' },
];

const MarketingDashboard: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans p-6 max-w-[1600px] mx-auto">
      
      {/* --- DASHBOARD HEADER CONTROLS --- */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
           {/* Mobile Title View usually handled by Layout */}
        </div>
        
        {/* Date & Location Filters (Top Right) */}
        <div className="flex items-center gap-6 w-full md:w-auto justify-end">
          <div className="hidden lg:flex items-center gap-4 bg-white border border-slate-200 px-4 py-2 rounded-full shadow-sm">
            <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
              <Calendar size={16} className="text-slate-500" />
              <select className="bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer outline-none text-slate-700">
                <option>30 ngày qua</option>
                <option>Tháng này</option>
                <option>Quý này</option>
                <option>Năm nay</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-slate-500" />
              <select className="bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer outline-none text-slate-700">
                <option>Tất cả chi nhánh</option>
                <option>Trụ sở Hà Nội</option>
                <option>Chi nhánh HCM</option>
                <option>Văn phòng Đà Nẵng</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* --- TITLE & ACTIONS --- */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Phân tích Marketing & Nguồn Lead</h2>
          <p className="text-slate-500 mt-1">Hiệu suất thời gian thực theo nguồn và chiến dịch quảng cáo.</p>
        </div>
      </div>

      {/* --- KPI CARDS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        {/* Card 1: Total Leads */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-blue-50 p-3 rounded-xl">
              <Users className="text-[#1e40af]" size={24} />
            </div>
            <span className="text-emerald-600 text-sm font-bold flex items-center bg-emerald-50 px-2 py-1 rounded-lg">
              <TrendingUp size={14} className="mr-1" /> +12.5%
            </span>
          </div>
          <h3 className="text-slate-500 text-sm font-medium">Tổng số Leads</h3>
          <p className="text-3xl font-bold mt-1 text-slate-900">2,845</p>
        </div>

        {/* Card 2: Qualified Leads */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-emerald-50 p-3 rounded-xl">
              <ShieldCheck className="text-emerald-600" size={24} />
            </div>
            <span className="text-emerald-600 text-sm font-bold flex items-center bg-emerald-50 px-2 py-1 rounded-lg">
              <TrendingUp size={14} className="mr-1" /> +8.2%
            </span>
          </div>
          <h3 className="text-slate-500 text-sm font-medium">Lead Chất lượng (Qualified)</h3>
          <p className="text-3xl font-bold mt-1 text-slate-900">1,420</p>
        </div>

        {/* Card 3: Conversion Rate */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-purple-50 p-3 rounded-xl">
              <MousePointerClick className="text-purple-600" size={24} />
            </div>
            <span className="text-rose-500 text-sm font-bold flex items-center bg-rose-50 px-2 py-1 rounded-lg">
              <TrendingDown size={14} className="mr-1" /> -2.4%
            </span>
          </div>
          <h3 className="text-slate-500 text-sm font-medium">Tỷ lệ Chuyển đổi</h3>
          <p className="text-3xl font-bold mt-1 text-slate-900">14.8%</p>
        </div>

        {/* Card 4: Cost per Lead */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-amber-50 p-3 rounded-xl">
              <DollarSign className="text-amber-600" size={24} />
            </div>
            <span className="text-emerald-600 text-sm font-bold flex items-center bg-emerald-50 px-2 py-1 rounded-lg">
              <TrendingUp size={14} className="mr-1" /> +15%
            </span>
          </div>
          <h3 className="text-slate-500 text-sm font-medium">Chi phí TB / Lead</h3>
          <p className="text-3xl font-bold mt-1 text-slate-900">280.000đ</p>
        </div>
      </div>

      {/* --- CHARTS SECTION --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        
        {/* Source Chart (Doughnut) */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-slate-900">Nguồn Lead</h3>
            <button className="text-slate-400 hover:text-slate-600">
              <MoreVertical size={20} />
            </button>
          </div>
          <div className="h-[250px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={SOURCE_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {SOURCE_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Text Simulation */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
               <div className="text-center">
                  <span className="block text-2xl font-bold text-slate-800">100%</span>
                  <span className="text-xs text-slate-400">Total</span>
               </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-medium text-slate-500">
            {SOURCE_DATA.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></span>
                {item.name} ({item.value}%)
              </div>
            ))}
          </div>
        </div>

        {/* Campaign Chart (Bar) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-slate-900">Tỷ lệ Lead đạt chuẩn theo Chiến dịch (%)</h3>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-md text-xs font-semibold">German A1</span>
              <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-semibold">Chinese HSK</span>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={CAMPAIGN_DATA} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 12}} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 12}} 
                />
                <Tooltip 
                  cursor={{fill: '#f1f5f9'}}
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                />
                <Bar 
                  dataKey="rate" 
                  fill="#3b82f6" 
                  radius={[6, 6, 0, 0]} 
                  name="Tỷ lệ %"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* --- TABLE SECTION --- */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-lg text-slate-900">Lead Tiềm năng Gần đây</h3>
          <Link to="/leads" className="text-[#1e40af] text-sm font-semibold hover:underline">Xem tất cả</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4">Họ tên</th>
                <th className="px-6 py-4">Nguồn</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4">Quan tâm khóa học</th>
                <th className="px-6 py-4">Giá trị ước tính</th>
                <th className="px-6 py-4">Thời gian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {RECENT_LEADS.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${lead.color}`}>
                        {lead.avatar}
                      </div>
                      <div className="text-sm font-semibold text-slate-900">{lead.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-tight 
                      ${lead.source === 'Facebook' ? 'bg-blue-50 text-blue-600' : 
                        lead.source === 'TikTok' ? 'bg-cyan-50 text-cyan-600' :
                        lead.source === 'Hotline' ? 'bg-amber-50 text-amber-600' :
                        'bg-rose-50 text-rose-600'
                      }`}>
                      {lead.source}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className={`flex items-center gap-1.5 font-medium text-sm
                       ${lead.status === 'Qualified' ? 'text-emerald-600' : 
                         lead.status === 'Contacting' ? 'text-amber-600' : 
                         'text-blue-600'}`}>
                      <span className={`w-2 h-2 rounded-full 
                        ${lead.status === 'Qualified' ? 'bg-emerald-500' : 
                          lead.status === 'Contacting' ? 'bg-amber-500' : 
                          'bg-blue-500'}`}></span> 
                      {lead.status === 'Qualified' ? 'Đạt chuẩn' : lead.status === 'Contacting' ? 'Đang liên hệ' : 'Mới'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700">{lead.program}</td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">${lead.value}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{lead.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default MarketingDashboard;
