
import React from 'react';
import { 
  Users, 
  Plane, 
  AlertTriangle, 
  TrendingUp, 
  CheckCircle2,
  Clock,
  MoreHorizontal
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';

// --- MOCK DATA ---

// Chart 1: Visa Success Rates by Country
const VISA_STATS = [
  { country: 'Đức', rate: 88, color: '#1e40af' }, // Blue
  { country: 'Trung Quốc', rate: 92, color: '#0ea5e9' }, // Sky
  { country: 'Úc', rate: 75, color: '#64748b' }, // Slate
];

// Chart 2: Attendance Trend (Last 6 Months)
const ATTENDANCE_TREND = [
  { month: 'Th5', rate: 82 },
  { month: 'Th6', rate: 85 },
  { month: 'Th7', rate: 90 },
  { month: 'Th8', rate: 88 },
  { month: 'Th9', rate: 92 },
  { month: 'Th10', rate: 95 },
];

// Table: Critical Backlog
const CRITICAL_BACKLOG = [
  { 
    id: '1', 
    name: 'Nguyễn Văn Nam', 
    stage: 'Nộp hồ sơ trường', 
    deadline: '15/10/2023', 
    overdue: 9, 
    program: 'Du học Đức' 
  },
  { 
    id: '2', 
    name: 'Trần Thị Bích', 
    stage: 'Phỏng vấn Visa', 
    deadline: '20/10/2023', 
    overdue: 4, 
    program: 'Du học Trung' 
  },
  { 
    id: '3', 
    name: 'Lê Văn Cường', 
    stage: 'Dịch thuật công chứng', 
    deadline: '22/10/2023', 
    overdue: 2, 
    program: 'Du học Đức' 
  },
  { 
    id: '4', 
    name: 'Phạm Hương', 
    stage: 'Chờ thư mời (Offer)', 
    deadline: '25/10/2023', 
    overdue: 0, 
    program: 'Du học Đức' 
  },
  { 
    id: '5', 
    name: 'Hoàng Văn Em', 
    stage: 'Xin Visa', 
    deadline: '10/10/2023', 
    overdue: 14, 
    program: 'Du học Trung' 
  },
];

const StudyAbroadDashboard: React.FC = () => {
  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#0d141b] font-sans overflow-y-auto">
      <div className="flex flex-col flex-1 p-6 lg:p-10 max-w-[1200px] mx-auto w-full gap-8">
        
        {/* Header */}
        <div className="flex flex-wrap justify-between gap-3">
          <div>
             <h1 className="text-[#0d141b] tracking-tight text-[32px] font-bold leading-tight">Tổng quan Vận hành Du học</h1>
             <p className="text-[#4c739a] text-sm">Theo dõi tiến độ hồ sơ, tỷ lệ đậu Visa và các trường hợp cần xử lý gấp.</p>
          </div>
          <div className="flex items-center gap-3">
             <div className="text-sm font-medium text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                Cập nhật: Hôm nay, 09:00
             </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex flex-col gap-2 rounded-xl p-6 bg-[#e7edf3] hover:bg-slate-200 transition-colors">
            <p className="text-[#0d141b] text-base font-medium leading-normal">Hồ sơ đang xử lý</p>
            <p className="text-[#0d141b] tracking-light text-2xl font-bold leading-tight">250</p>
            <div className="flex items-center gap-1 text-xs font-bold text-blue-600 mt-1">
                <Users size={14} /> Active Cases
            </div>
          </div>
          <div className="flex flex-col gap-2 rounded-xl p-6 bg-[#e7edf3] hover:bg-slate-200 transition-colors">
            <p className="text-[#0d141b] text-base font-medium leading-normal">Tỷ lệ Chuyên cần TB</p>
            <p className="text-[#0d141b] tracking-light text-2xl font-bold leading-tight">85%</p>
            <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 mt-1">
                <CheckCircle2 size={14} /> Target: 80%
            </div>
          </div>
          <div className="flex flex-col gap-2 rounded-xl p-6 bg-[#e7edf3] hover:bg-slate-200 transition-colors">
            <p className="text-[#0d141b] text-base font-medium leading-normal">Tỷ lệ Đậu Visa</p>
            <p className="text-[#0d141b] tracking-light text-2xl font-bold leading-tight">92%</p>
            <div className="flex items-center gap-1 text-xs font-bold text-purple-600 mt-1">
                <Plane size={14} /> Visa Success
            </div>
          </div>
          <div className="flex flex-col gap-2 rounded-xl p-6 bg-[#e7edf3] hover:bg-slate-200 transition-colors">
            <p className="text-[#0d141b] text-base font-medium leading-normal">Hồ sơ Tồn đọng</p>
            <p className="text-[#0d141b] tracking-light text-2xl font-bold leading-tight">15</p>
            <div className="flex items-center gap-1 text-xs font-bold text-red-600 mt-1">
                <AlertTriangle size={14} /> Cần xử lý gấp
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <h2 className="text-[#0d141b] text-[22px] font-bold leading-tight tracking-[-0.015em] pt-4">Chỉ số Quan trọng (Key Metrics)</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Chart 1: Visa Success Rates */}
          <div className="flex flex-col gap-2 rounded-xl border border-[#cfdbe7] bg-white p-6 shadow-sm">
            <div className="flex justify-between items-start mb-4">
               <div>
                  <p className="text-[#0d141b] text-base font-bold leading-normal">Tỷ lệ Đậu Visa theo Quốc gia</p>
                  <p className="text-[#0d141b] tracking-light text-[32px] font-bold leading-tight truncate">88% <span className="text-sm font-normal text-slate-500">Trung bình</span></p>
               </div>
               <div className="flex gap-1 items-center bg-green-50 px-2 py-1 rounded text-green-700">
                  <TrendingUp size={16} />
                  <p className="text-sm font-bold">+3%</p>
               </div>
            </div>
            
            <div className="h-[200px] w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={VISA_STATS} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis type="number" hide />
                        <YAxis dataKey="country" type="category" width={80} tick={{fontSize: 12, fontWeight: 600}} />
                        <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px'}} />
                        <Bar dataKey="rate" radius={[0, 4, 4, 0]} barSize={32}>
                            {VISA_STATS.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Attendance Trend */}
          <div className="flex flex-col gap-2 rounded-xl border border-[#cfdbe7] bg-white p-6 shadow-sm">
            <div className="flex justify-between items-start mb-4">
               <div>
                  <p className="text-[#0d141b] text-base font-bold leading-normal">Xu hướng Chuyên cần (6 tháng)</p>
                  <p className="text-[#0d141b] tracking-light text-[32px] font-bold leading-tight truncate">95%</p>
               </div>
               <div className="flex gap-1 items-center bg-slate-100 px-2 py-1 rounded text-slate-600">
                  <TrendingUp size={16} />
                  <p className="text-sm font-bold">Ổn định</p>
               </div>
            </div>

            <div className="h-[200px] w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={ATTENDANCE_TREND}>
                        <defs>
                            <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#64748b" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#64748b" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <Tooltip contentStyle={{borderRadius: '8px'}} />
                        <Area type="monotone" dataKey="rate" stroke="#475569" strokeWidth={3} fill="url(#colorRate)" />
                        <XAxis dataKey="month" hide />
                    </AreaChart>
                </ResponsiveContainer>
                <div className="flex justify-between px-2 mt-2">
                    {ATTENDANCE_TREND.map((t, i) => (
                        <span key={i} className="text-[10px] font-bold text-slate-400 uppercase">{t.month}</span>
                    ))}
                </div>
            </div>
          </div>
        </div>

        {/* Table: Critical Backlog */}
        <h2 className="text-[#0d141b] text-[22px] font-bold leading-tight tracking-[-0.015em] pt-4">Hồ sơ Cần xử lý gấp (Critical Backlog)</h2>
        <div className="px-0 py-2">
          <div className="flex overflow-hidden rounded-xl border border-[#cfdbe7] bg-white shadow-sm">
            <table className="flex-1 w-full text-left border-collapse">
              <thead className="bg-[#f8fafc] border-b border-[#cfdbe7]">
                <tr>
                  <th className="px-6 py-4 text-[#0d141b] text-sm font-bold leading-normal">Học viên</th>
                  <th className="px-6 py-4 text-[#0d141b] text-sm font-bold leading-normal">Giai đoạn hiện tại</th>
                  <th className="px-6 py-4 text-[#0d141b] text-sm font-bold leading-normal">Hạn chót (Deadline)</th>
                  <th className="px-6 py-4 text-[#0d141b] text-sm font-bold leading-normal">Quá hạn</th>
                  <th className="px-6 py-4 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#cfdbe7]">
                {CRITICAL_BACKLOG.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                            <p className="text-[#0d141b] text-sm font-bold leading-normal">{item.name}</p>
                            <p className="text-[#4c739a] text-xs mt-0.5">{item.program}</p>
                        </td>
                        <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                {item.stage}
                            </span>
                        </td>
                        <td className="px-6 py-4 text-[#4c739a] text-sm font-normal leading-normal">
                            {item.deadline}
                        </td>
                        <td className="px-6 py-4">
                            {item.overdue > 0 ? (
                                <span className="inline-flex items-center gap-1 text-red-600 text-sm font-bold">
                                    <AlertTriangle size={14} /> {item.overdue} ngày
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 text-amber-600 text-sm font-bold">
                                    <Clock size={14} /> Hôm nay
                                </span>
                            )}
                        </td>
                        <td className="px-6 py-4 text-center">
                            <button className="text-slate-400 hover:text-slate-600">
                                <MoreHorizontal size={20} />
                            </button>
                        </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default StudyAbroadDashboard;
