import React from 'react';
import {
  Users,
  Plane,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  Clock,
  MoreHorizontal,
  BookOpen
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie
} from 'recharts';

// --- MOCK DATA ---

// Chart 1: Visa Success Rates by Country (Existing)
const VISA_STATS = [
  { country: 'Đức', rate: 88, color: '#1e40af' }, // Blue
  { country: 'Trung Quốc', rate: 92, color: '#0ea5e9' }, // Sky
  { country: 'Úc', rate: 75, color: '#64748b' }, // Slate
];

// Chart 2: Program Stats (New)
const PROGRAM_STATS = [
  { name: 'Du học nghề', count: 120, color: '#3b82f6' }, // Blue
  { name: 'Đại học', count: 45, color: '#8b5cf6' },    // Violet
  { name: 'Thạc sĩ', count: 25, color: '#10b981' },     // Emerald
  { name: 'Ngôn ngữ', count: 60, color: '#f59e0b' },    // Amber
];

const StudyAbroadDashboard: React.FC = () => {
  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#0d141b] font-sans overflow-y-auto">
      <div className="flex flex-col flex-1 p-6 lg:p-10 max-w-[1200px] mx-auto w-full gap-8">

        {/* Header */}
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <h1 className="text-[#0d141b] tracking-tight text-[32px] font-bold leading-tight">Tổng quan Vận hành Du học</h1>
            <p className="text-[#4c739a] text-sm">Theo dõi tiến độ hồ sơ, thống kê theo chương trình và các trường hợp cần xử lý gấp.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm font-medium text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
              Cập nhật: Hôm nay, 09:00
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col gap-2 rounded-xl p-6 bg-[#e7edf3] hover:bg-slate-200 transition-colors">
            <p className="text-[#0d141b] text-base font-medium leading-normal">Hồ sơ đang xử lý</p>
            <p className="text-[#0d141b] tracking-light text-2xl font-bold leading-tight">250</p>
            <div className="flex items-center gap-1 text-xs font-bold text-blue-600 mt-1">
              <Users size={14} /> Active Cases
            </div>
          </div>

          {/* REPLACED: Visa Rate -> Departed Students */}
          <div className="flex flex-col gap-2 rounded-xl p-6 bg-[#e7edf3] hover:bg-slate-200 transition-colors">
            <p className="text-[#0d141b] text-base font-medium leading-normal">Học viên đã xuất cảnh</p>
            <p className="text-[#0d141b] tracking-light text-2xl font-bold leading-tight">85</p>
            <div className="flex items-center gap-1 text-xs font-bold text-green-600 mt-1">
              <Plane size={14} /> Đã bay thành công
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
        <h2 className="text-[#0d141b] text-[22px] font-bold leading-tight tracking-[-0.015em] pt-4">Thống kê & Phân loại</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Chart 1: Visa Success Rates (Existing) */}
          <div className="flex flex-col gap-2 rounded-xl border border-[#cfdbe7] bg-white p-6 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-[#0d141b] text-base font-bold leading-normal">Tỷ lệ Đậu Visa theo Quốc gia</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-[#0d141b] tracking-light text-[32px] font-bold leading-tight">88%</p>
                  <span className="text-sm font-normal text-slate-500">Trung bình</span>
                </div>
              </div>
            </div>

            <div className="h-[250px] w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={VISA_STATS} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="country" type="category" width={80} tick={{ fontSize: 12, fontWeight: 600 }} />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px' }} />
                  <Bar dataKey="rate" radius={[0, 4, 4, 0]} barSize={32}>
                    {VISA_STATS.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Program Breakdown (New) */}
          <div className="flex flex-col gap-2 rounded-xl border border-[#cfdbe7] bg-white p-6 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-[#0d141b] text-base font-bold leading-normal">Phân loại theo Chương trình</p>
                <p className="text-[#0d141b] tracking-light text-[32px] font-bold leading-tight">250 <span className="text-sm font-normal text-slate-500">Hồ sơ</span></p>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                <BookOpen size={20} />
              </div>
            </div>

            <div className="h-[250px] w-full mt-2 flex flex-col justify-center">
              {/* Custom Legend/List for Program Stats */}
              <div className="space-y-4">
                {PROGRAM_STATS.map((item, idx) => (
                  <div key={idx} className="flex items-center group">
                    <div className="w-2 h-full self-stretch rounded-full mr-3" style={{ backgroundColor: item.color }}></div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700">{item.name}</span>
                        <span className="text-sm font-bold text-slate-900">{item.count}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all duration-500"
                          style={{ width: `${(item.count / 250) * 100}%`, backgroundColor: item.color }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Removed Critical Backlog Section per request */}

      </div>
    </div>
  );
};

export default StudyAbroadDashboard;
