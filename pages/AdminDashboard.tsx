
import React from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis,
  Tooltip, 
  ResponsiveContainer,
  CartesianGrid 
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
} from 'lucide-react';

const AdminDashboard: React.FC = () => {
  
  // --- MOCK DATA ---
  const REVENUE_DATA = [
    { month: 'T1', value: 35000 },
    { month: 'T2', value: 42000 },
    { month: 'T3', value: 38000 },
    { month: 'T4', value: 65000 },
    { month: 'T5', value: 55000 },
    { month: 'T6', value: 95000 },
    { month: 'T7', value: 120000 },
    { month: 'T8', value: 110000 },
    { month: 'T9', value: 160000 },
    { month: 'T10', value: 185000 },
    { month: 'T11', value: 210000 },
    { month: 'T12', value: 250000 },
  ];

  const AGENT_PERFORMANCE = [
    { name: 'Trung tâm Tiếng Đức ABC', revenue: '500 Tr', won: 50 },
    { name: 'Du học Á Âu', revenue: '450 Tr', won: 45 },
    { name: 'Global Education', revenue: '400 Tr', won: 40 },
    { name: 'Sunrise Agency', revenue: '350 Tr', won: 35 },
    { name: 'VietGermany Link', revenue: '300 Tr', won: 30 },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50 text-[#0d141b] font-sans overflow-y-auto">
      <div className="flex flex-1 justify-center py-5 px-6">
        <div className="flex flex-col max-w-[1200px] flex-1">
          
          {/* Header */}
          <div className="flex flex-wrap justify-between gap-3 p-4">
            <p className="text-[#0d141b] tracking-tight text-[32px] font-bold leading-tight min-w-72">
              Tổng quan Điều hành & Quản trị
            </p>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
            <div className="flex flex-col gap-2 rounded-lg p-6 bg-[#e7edf3] shadow-sm">
              <p className="text-[#0d141b] text-base font-medium leading-normal">Tổng doanh thu</p>
              <p className="text-[#0d141b] tracking-tight text-2xl font-bold leading-tight">2.5 Tỷ</p>
              <p className="text-[#078838] text-base font-medium leading-normal flex items-center gap-1">
                <TrendingUp size={16} /> +10%
              </p>
            </div>
            <div className="flex flex-col gap-2 rounded-lg p-6 bg-[#e7edf3] shadow-sm">
              <p className="text-[#0d141b] text-base font-medium leading-normal">Tỷ lệ chuyển đổi Lead</p>
              <p className="text-[#0d141b] tracking-tight text-2xl font-bold leading-tight">15%</p>
              <p className="text-[#e73908] text-base font-medium leading-normal flex items-center gap-1">
                <TrendingDown size={16} /> -2%
              </p>
            </div>
            <div className="flex flex-col gap-2 rounded-lg p-6 bg-[#e7edf3] shadow-sm">
              <p className="text-[#0d141b] text-base font-medium leading-normal">Học viên đang học</p>
              <p className="text-[#0d141b] tracking-tight text-2xl font-bold leading-tight">1,250</p>
              <p className="text-[#078838] text-base font-medium leading-normal flex items-center gap-1">
                <TrendingUp size={16} /> +5%
              </p>
            </div>
            <div className="flex flex-col gap-2 rounded-lg p-6 bg-[#e7edf3] shadow-sm">
              <p className="text-[#0d141b] text-base font-medium leading-normal">Tỷ lệ đậu Visa</p>
              <p className="text-[#0d141b] tracking-tight text-2xl font-bold leading-tight">85%</p>
              <p className="text-[#078838] text-base font-medium leading-normal flex items-center gap-1">
                <TrendingUp size={16} /> +3%
              </p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 px-4 py-6">
            
            {/* Revenue Chart */}
            <div className="lg:col-span-2 flex flex-col gap-2 rounded-lg border border-[#cfdbe7] bg-white p-6 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[#0d141b] text-base font-medium leading-normal">Doanh thu & Dự báo tháng</p>
                  <p className="text-[#0d141b] tracking-tight text-[32px] font-bold leading-tight truncate">250 Triệu</p>
                </div>
                <div className="flex gap-1 text-right">
                  <p className="text-[#4c739a] text-sm font-normal">12 tháng qua</p>
                  <p className="text-[#078838] text-sm font-medium">+5%</p>
                </div>
              </div>
              
              <div className="h-[250px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={REVENUE_DATA} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4c739a" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#4c739a" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7edf3" />
                    <XAxis 
                        dataKey="month" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#4c739a', fontSize: 12, fontWeight: 700 }}
                        dy={10}
                    />
                    <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#4c739a', fontSize: 12 }} 
                        tickFormatter={(value) => `${value/1000}k`}
                    />
                    <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        formatter={(value: number) => [`${value.toLocaleString()}`, 'Doanh thu']}
                    />
                    <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#4c739a" 
                        strokeWidth={3} 
                        fillOpacity={1} 
                        fill="url(#colorRev)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Visa Comparison Chart (Custom Bar Logic) */}
            <div className="flex flex-col gap-2 rounded-lg border border-[#cfdbe7] bg-white p-6 shadow-sm">
              <p className="text-[#0d141b] text-base font-medium leading-normal">Tỷ lệ Visa thành công</p>
              <p className="text-[#0d141b] tracking-tight text-[32px] font-bold leading-tight truncate">85%</p>
              <div className="flex gap-1">
                <p className="text-[#4c739a] text-base font-normal leading-normal">Quý hiện tại</p>
                <p className="text-[#078838] text-base font-medium leading-normal">+3%</p>
              </div>
              
              <div className="grid min-h-[180px] gap-x-4 gap-y-6 grid-cols-[auto_1fr] items-center py-3">
                <p className="text-[#4c739a] text-[13px] font-bold leading-normal tracking-[0.015em] w-16">Đức</p>
                <div className="h-8 flex-1 bg-slate-100 rounded-r-full overflow-hidden">
                    <div className="bg-[#e7edf3] border-r-4 border-[#4c739a] h-full" style={{ width: '88%' }}></div>
                </div>
                
                <p className="text-[#4c739a] text-[13px] font-bold leading-normal tracking-[0.015em] w-16">Trung Quốc</p>
                <div className="h-8 flex-1 bg-slate-100 rounded-r-full overflow-hidden">
                    <div className="bg-[#e7edf3] border-r-4 border-[#4c739a] h-full" style={{ width: '92%' }}></div>
                </div>

                <p className="text-[#4c739a] text-[13px] font-bold leading-normal tracking-[0.015em] w-16">Mỹ</p>
                <div className="h-8 flex-1 bg-slate-100 rounded-r-full overflow-hidden">
                    <div className="bg-[#e7edf3] border-r-4 border-[#4c739a] h-full" style={{ width: '65%' }}></div>
                </div>

                <p className="text-[#4c739a] text-[13px] font-bold leading-normal tracking-[0.015em] w-16">Anh</p>
                <div className="h-8 flex-1 bg-slate-100 rounded-r-full overflow-hidden">
                    <div className="bg-[#e7edf3] border-r-4 border-[#4c739a] h-full" style={{ width: '78%' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 px-4 py-3">
            
            {/* Agent Table */}
            <div className="flex flex-col gap-4">
                <h3 className="text-lg font-bold text-[#0d141b]">Đối tác Tuyển sinh (Agent) Tiêu biểu</h3>
                <div className="flex overflow-hidden rounded-lg border border-[#cfdbe7] bg-white shadow-sm">
                    <table className="flex-1 w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 border-b border-[#cfdbe7]">
                                <th className="px-4 py-3 text-left text-[#0d141b] text-sm font-medium">Đối tác</th>
                                <th className="px-4 py-3 text-left text-[#0d141b] text-sm font-medium">Doanh số</th>
                                <th className="px-4 py-3 text-left text-[#0d141b] text-sm font-medium">Hồ sơ thành công</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#cfdbe7]">
                            {AGENT_PERFORMANCE.map((agent, idx) => (
                                <tr key={idx} className="hover:bg-[#f8fafc]">
                                    <td className="px-4 py-3 text-[#0d141b] text-sm font-bold">{agent.name}</td>
                                    <td className="px-4 py-3 text-[#4c739a] text-sm">{agent.revenue}</td>
                                    <td className="px-4 py-3 text-[#4c739a] text-sm">{agent.won}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Lead Quality Bars */}
            <div className="flex flex-col gap-2 rounded-lg border border-[#cfdbe7] bg-white p-6 shadow-sm">
                <p className="text-[#0d141b] text-base font-medium leading-normal">Chất lượng Lead theo Nguồn</p>
                <p className="text-[#0d141b] tracking-tight text-[32px] font-bold leading-tight truncate">100%</p>
                <div className="flex gap-1">
                  <p className="text-[#4c739a] text-base font-normal leading-normal">Quý hiện tại</p>
                  <p className="text-[#078838] text-base font-medium leading-normal">+5%</p>
                </div>
                
                <div className="grid gap-x-4 gap-y-6 grid-cols-[auto_1fr] items-center py-3 mt-2">
                  <p className="text-[#4c739a] text-[13px] font-bold leading-normal tracking-[0.015em] w-24">Giới thiệu</p>
                  <div className="h-6 flex-1"><div className="border-[#4c739a] bg-[#e7edf3] border-r-2 h-full" style={{ width: '80%' }}></div></div>
                  
                  <p className="text-[#4c739a] text-[13px] font-bold leading-normal tracking-[0.015em] w-24">Mạng xã hội</p>
                  <div className="h-6 flex-1"><div className="border-[#4c739a] bg-[#e7edf3] border-r-2 h-full" style={{ width: '45%' }}></div></div>
                  
                  <p className="text-[#4c739a] text-[13px] font-bold leading-normal tracking-[0.015em] w-24">Website</p>
                  <div className="h-6 flex-1"><div className="border-[#4c739a] bg-[#e7edf3] border-r-2 h-full" style={{ width: '60%' }}></div></div>
                  
                  <p className="text-[#4c739a] text-[13px] font-bold leading-normal tracking-[0.015em] w-24">Quảng cáo</p>
                  <div className="h-6 flex-1"><div className="border-[#4c739a] bg-[#e7edf3] border-r-2 h-full" style={{ width: '30%' }}></div></div>
                </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
