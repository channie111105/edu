
import React from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { ArrowUp, ArrowDown, AlertOctagon, Clock, Phone, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// --- DỮ LIỆU MẪU (MOCK DATA) ---
const KPI_DATA = [
  { label: 'Tổng doanh thu thực thu', value: '2.3 Tỷ', change: '+12%', isPositive: true },
  { label: 'Tổng giá trị Pipeline', value: '1.5 Tỷ', change: '+8%', isPositive: true },
  { label: 'Tỷ lệ chuyển đổi chung', value: '15%', change: '-2%', isPositive: false },
  { label: 'Tổng nợ quá hạn', value: '50 Triệu', change: '+5%', isPositive: true },
];

const URGENT_SLA_LEADS = [
  { id: 'L-991', name: 'Trần Văn Hùng', phone: '0912 345 ***', timeWaiting: '45 phút', status: 'Danger', source: 'Facebook Ads' },
  { id: 'L-992', name: 'Lê Thị Mai', phone: '0909 123 ***', timeWaiting: '32 phút', status: 'Danger', source: 'Hotline' },
  { id: 'L-993', name: 'Nguyễn Quốc Bảo', phone: '0988 777 ***', timeWaiting: '12 phút', status: 'Warning', source: 'Web Form' },
];

const FUNNEL_DATA = [
  { stage: 'Lead (Tiềm năng)', value: '100%', drop: '-60%', height: '20%', color: 'bg-[#e7edf3]' },
  { stage: 'Qualified (Đạt chuẩn)', value: '40%', drop: '-50%', height: '40%', color: 'bg-[#e7edf3]' },
  { stage: 'Negotiation (Thương lượng)', value: '20%', drop: '-25%', height: '80%', color: 'bg-[#e7edf3]' },
  { stage: 'Won (Chốt đơn)', value: '15%', drop: '', height: '100%', color: 'bg-[#e7edf3]' },
];

const REVENUE_CHART_DATA = [
  { name: 'T1', value: 40 },
  { name: 'T2', value: 70 },
  { name: 'T3', value: 50 },
  { name: 'T4', value: 90 },
  { name: 'T5', value: 120 },
  { name: 'T6', value: 160 },
  { name: 'T7', value: 140 },
  { name: 'T8', value: 180 },
  { name: 'T9', value: 200 },
  { name: 'T10', value: 240 },
  { name: 'T11', value: 300 },
  { name: 'T12', value: 380 },
];

const LEADERBOARD_DATA = [
  { name: 'Nguyễn Văn Nam', deals: 25, value: '500 Triệu', conversion: '20%' },
  { name: 'Trần Thị Hương', deals: 20, value: '400 Triệu', conversion: '18%' },
  { name: 'Lê Hoàng', deals: 18, value: '350 Triệu', conversion: '16%' },
  { name: 'Phạm Bích Ngọc', deals: 15, value: '300 Triệu', conversion: '14%' },
  { name: 'Vũ Minh Hiếu', deals: 12, value: '250 Triệu', conversion: '12%' },
];

const SalesDashboard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#0d141b] font-sans overflow-y-auto" style={{ fontFamily: 'Inter, "Noto Sans", sans-serif' }}>
      <div className="flex justify-center py-5">
        <div className="flex flex-col max-w-[960px] flex-1 px-4 md:px-8">
          
          {/* Header Title */}
          <div className="flex flex-wrap justify-between gap-3 p-4">
            <p className="text-[#0d141b] tracking-[-0.015em] text-[32px] font-bold leading-tight min-w-72">
              Tổng quan Kinh doanh
            </p>
          </div>

          {/* --- NEW: URGENT SLA SECTION --- */}
          {URGENT_SLA_LEADS.length > 0 && (
            <div className="px-4 mb-6">
              <div className="bg-red-50 border border-red-200 rounded-xl overflow-hidden shadow-sm animate-in slide-in-from-top-2">
                <div className="bg-red-100/50 px-4 py-3 flex justify-between items-center border-b border-red-200">
                   <div className="flex items-center gap-2">
                      <div className="bg-red-600 text-white p-1 rounded animate-pulse">
                        <AlertOctagon size={18} />
                      </div>
                      <h3 className="text-red-800 font-bold text-sm uppercase tracking-wider">Cảnh báo SLA (Cần xử lý ngay)</h3>
                   </div>
                   <button 
                      onClick={() => navigate('/sales/sla-leads')} 
                      className="text-xs font-bold text-red-700 hover:underline flex items-center"
                   >
                      Xem tất cả <ChevronRight size={14} />
                   </button>
                </div>
                <div className="divide-y divide-red-100">
                   {URGENT_SLA_LEADS.map(lead => (
                      <div key={lead.id} className="px-4 py-3 flex items-center justify-between hover:bg-red-100/40 transition-colors">
                         <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${lead.status === 'Danger' ? 'bg-red-600' : 'bg-amber-500'}`}></div>
                            <div>
                               <p className="text-sm font-bold text-slate-900">{lead.name} <span className="text-slate-500 font-normal text-xs">- {lead.source}</span></p>
                               <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                                  <Clock size={12} /> Đã chờ: {lead.timeWaiting}
                               </p>
                            </div>
                         </div>
                         <button 
                            className="bg-white border border-red-200 text-red-700 hover:bg-red-600 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                            onClick={() => navigate('/pipeline', { state: { highlightLeadId: lead.id } })}
                         >
                            <Phone size={14} /> Gọi ngay
                         </button>
                      </div>
                   ))}
                </div>
              </div>
            </div>
          )}

          {/* KPI Cards Grid */}
          <div className="flex flex-wrap gap-4 p-4">
            {KPI_DATA.map((kpi, index) => (
              <div key={index} className="flex min-w-[158px] flex-1 flex-col gap-2 rounded-lg p-6 border border-[#cfdbe7] bg-white">
                <p className="text-[#0d141b] text-base font-medium leading-normal">{kpi.label}</p>
                <p className="text-[#0d141b] tracking-[-0.015em] text-2xl font-bold leading-tight">{kpi.value}</p>
                <div className="flex items-center gap-1">
                   {kpi.isPositive ? <ArrowUp size={16} className="text-[#078838]" /> : <ArrowDown size={16} className="text-[#e73908]" />}
                   <p className={`text-base font-medium leading-normal ${kpi.isPositive ? 'text-[#078838]' : 'text-[#e73908]'}`}>
                    {kpi.change}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Conversion Funnel Section */}
          <h2 className="text-[#0d141b] text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">
            Phễu chuyển đổi (Funnel)
          </h2>
          <div className="flex flex-wrap gap-4 px-4 py-6">
            {/* Visual Funnel Representation */}
            <div className="flex min-w-72 flex-1 flex-col gap-2">
              <p className="text-[#0d141b] text-base font-medium leading-normal">Tỷ lệ chuyển đổi Lead</p>
              <p className="text-[#0d141b] tracking-[-0.015em] text-[32px] font-bold leading-tight truncate">100%</p>
              <p className="text-[#e73908] text-base font-medium leading-normal">-60%</p>
              
              {/* Funnel Bars */}
              <div className="grid min-h-[180px] grid-flow-col gap-6 grid-rows-[1fr_auto] items-end justify-items-center px-3 pt-4">
                {FUNNEL_DATA.map((stage, idx) => (
                  <div key={idx} className="flex flex-col items-center justify-end w-full h-full gap-2">
                     {/* Bar */}
                     <div className={`border-[#4c739a] ${stage.color} border-t-2 w-full transition-all duration-500`} style={{ height: stage.height }}></div>
                     {/* Label */}
                     <p className="text-[#4c739a] text-[13px] font-bold leading-normal tracking-[0.015em] text-center whitespace-nowrap">
                        {stage.stage.split(' ')[0]}
                     </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Funnel Text Stats */}
            <div className="flex min-w-72 flex-1 flex-col gap-2 justify-center">
              <p className="text-[#0d141b] tracking-[-0.015em] text-[32px] font-bold leading-tight truncate">40%</p>
              <p className="text-[#e73908] text-base font-medium leading-normal">-50% <span className="text-slate-400 text-sm font-normal ml-2">(Rớt tại vòng Tư vấn)</span></p>
            </div>
            <div className="flex min-w-72 flex-1 flex-col gap-2 justify-center">
              <p className="text-[#0d141b] tracking-[-0.015em] text-[32px] font-bold leading-tight truncate">20%</p>
              <p className="text-[#e73908] text-base font-medium leading-normal">-25% <span className="text-slate-400 text-sm font-normal ml-2">(Rớt tại vòng Thương lượng)</span></p>
            </div>
            <div className="flex min-w-72 flex-1 flex-col gap-2 justify-center">
               <p className="text-[#0d141b] tracking-[-0.015em] text-[32px] font-bold leading-tight truncate">15%</p>
               <p className="text-[#078838] text-base font-medium leading-normal">Win Rate</p>
            </div>
          </div>

          {/* Monthly Revenue Trends Chart */}
          <h2 className="text-[#0d141b] text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">
            Xu hướng Doanh thu Tháng
          </h2>
          <div className="flex flex-wrap gap-4 px-4 py-6">
            <div className="flex min-w-72 flex-1 flex-col gap-2">
              <p className="text-[#0d141b] text-base font-medium leading-normal">Tổng doanh thu</p>
              <p className="text-[#0d141b] tracking-[-0.015em] text-[32px] font-bold leading-tight truncate">400 Triệu</p>
              <p className="text-[#078838] text-base font-medium leading-normal">+10%</p>
              
              <div className="flex min-h-[180px] flex-1 flex-col gap-8 py-4">
                 <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={REVENUE_CHART_DATA}>
                        <defs>
                          <linearGradient id="paint0_linear" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#e7edf3" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#e7edf3" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <Tooltip 
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            cursor={{ stroke: '#cfdbe7', strokeWidth: 1 }}
                            formatter={(value: number) => [`${value} Tr`, 'Doanh thu']}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="value" 
                            stroke="#4c739a" 
                            strokeWidth={3} 
                            fill="url(#paint0_linear)" 
                        />
                        <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#4c739a', fontSize: 13, fontWeight: 700 }} 
                            dy={10}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                 </div>
              </div>
            </div>
            
            {/* Additional Metrics Columns */}
            <div className="flex min-w-72 flex-1 flex-col gap-2 justify-center">
              <p className="text-[#0d141b] tracking-[-0.015em] text-[32px] font-bold leading-tight truncate">200 Tr</p>
              <p className="text-[#078838] text-base font-medium leading-normal">+10% <span className="text-slate-400 text-sm ml-2">Doanh thu Du học</span></p>
            </div>
            <div className="flex min-w-72 flex-1 flex-col gap-2 justify-center">
              <p className="text-[#0d141b] tracking-[-0.015em] text-[32px] font-bold leading-tight truncate">220 Tr</p>
              <p className="text-[#078838] text-base font-medium leading-normal">+10% <span className="text-slate-400 text-sm ml-2">Doanh thu Đào tạo</span></p>
            </div>
          </div>

          {/* Sales Performance Leaderboard */}
          <h2 className="text-[#0d141b] text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">
            Bảng xếp hạng Hiệu suất Sale
          </h2>
          <div className="px-4 py-3">
            <div className="flex overflow-hidden rounded-lg border border-[#cfdbe7] bg-white">
              <table className="flex-1 w-full">
                <thead className="bg-[#f8fafc]">
                  <tr>
                    <th className="px-6 py-4 text-left text-[#0d141b] text-sm font-medium leading-normal">Nhân viên</th>
                    <th className="px-6 py-4 text-left text-[#0d141b] text-sm font-medium leading-normal">Deal Thắng</th>
                    <th className="px-6 py-4 text-left text-[#0d141b] text-sm font-medium leading-normal">Doanh số</th>
                    <th className="px-6 py-4 text-left text-[#0d141b] text-sm font-medium leading-normal">Tỷ lệ CĐ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#cfdbe7]">
                  {LEADERBOARD_DATA.map((row, index) => (
                    <tr key={index} className="hover:bg-[#f0f4f8] transition-colors">
                      <td className="px-6 py-4 h-[72px] text-[#0d141b] text-sm font-normal leading-normal">{row.name}</td>
                      <td className="px-6 py-4 h-[72px] text-[#4c739a] text-sm font-normal leading-normal">{row.deals}</td>
                      <td className="px-6 py-4 h-[72px] text-[#4c739a] text-sm font-normal leading-normal">{row.value}</td>
                      <td className="px-6 py-4 h-[72px] text-[#4c739a] text-sm font-normal leading-normal">{row.conversion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SalesDashboard;
