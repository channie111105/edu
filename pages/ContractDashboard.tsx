
import React, { useState, useMemo } from 'react';
import {
   PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend,
   BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';
import {
   Lock,
   DollarSign,
   Calendar,
   MoreVertical,
   TrendingUp,
   FileText
} from 'lucide-react';

// --- MOCK DATA ---

// 1. Tỷ trọng học viên (Pie Chart)
const ENROLLMENT_DATA = [
   { name: 'Đã ghi danh', value: 65, color: '#10b981' }, // Emerald
   { name: 'Chưa ghi danh', value: 35, color: '#f59e0b' }, // Amber
];

// 2. Doanh thu theo tháng (Bar Chart) - Trend
const REVENUE_TREND_DATA = [
   { name: 'T1', expected: 400, actual: 350 },
   { name: 'T2', expected: 500, actual: 480 },
   { name: 'T3', expected: 600, actual: 550 },
   { name: 'T4', expected: 550, actual: 600 }, // Overachieved
   { name: 'T5', expected: 700, actual: 650 },
   { name: 'T6', expected: 800, actual: 400 }, // Current month partial
];

const ContractDashboard: React.FC = () => {
   const [dateRange, setDateRange] = useState('thisMonth');

   // Mock Stats based on dateRange (simple simulation)
   const stats = useMemo(() => {
      // In a real app, calculate based on filtered data
      return {
         lockedSO: 18,
         expectedRevenue: '2.5 Tỷ',
         actualRevenue: '1.8 Tỷ',
         completionRate: '72%'
      };
   }, [dateRange]);

   return (
      <div className="flex flex-col h-full bg-[#f8fafc] text-[#0d141b] font-sans overflow-y-auto">
         <div className="flex flex-col flex-1 p-6 lg:p-8 max-w-[1600px] mx-auto w-full gap-6">

            {/* Header Title & Controls */}
            <div className="flex flex-wrap justify-between items-center gap-4 mb-2">
               <div>
                  <h1 className="text-3xl font-bold text-slate-900">Tổng quan Ghi danh</h1>
                  <p className="text-slate-500 mt-1">Báo cáo tình hình ghi danh và doanh thu hợp đồng.</p>
               </div>

               {/* Date Filter */}
               <div className="flex items-center gap-4 bg-white border border-slate-200 px-4 py-2 rounded-full shadow-sm">
                  <div className="flex items-center gap-2">
                     <Calendar size={16} className="text-slate-500" />
                     <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        className="bg-transparent border-none text-sm font-bold focus:ring-0 cursor-pointer outline-none text-slate-700"
                     >
                        <option value="thisMonth">Tháng này</option>
                        <option value="lastMonth">Tháng trước</option>
                        <option value="thisQuarter">Quý này</option>
                        <option value="thisYear">Năm nay</option>
                     </select>
                  </div>
               </div>
            </div>

            {/* --- KPI CARDS --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

               {/* Card 1: Locked SO/Quotations */}
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                     <div className="bg-slate-100 p-3 rounded-xl text-slate-600">
                        <Lock size={24} />
                     </div>
                     <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded">SO / Quotes</span>
                  </div>
                  <div className="mt-4">
                     <h3 className="text-3xl font-bold text-slate-900">{stats.lockedSO}</h3>
                     <p className="text-slate-500 text-sm">Số Sale Order đã khóa</p>
                  </div>
               </div>

               {/* Card 2: Expected Revenue */}
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                     <div className="bg-blue-50 p-3 rounded-xl text-blue-600">
                        <FileText size={24} />
                     </div>
                  </div>
                  <div className="mt-4">
                     <h3 className="text-3xl font-bold text-slate-900">{stats.expectedRevenue}</h3>
                     <p className="text-slate-500 text-sm">Doanh số Dự kiến</p>
                  </div>
               </div>

               {/* Card 3: Actual Revenue */}
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                     <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600">
                        <DollarSign size={24} />
                     </div>
                     <span className="bg-emerald-50 text-emerald-600 text-xs font-bold px-2 py-1 flex items-center gap-1 rounded">
                        <TrendingUp size={12} /> +12%
                     </span>
                  </div>
                  <div className="mt-4">
                     <h3 className="text-3xl font-bold text-emerald-600">{stats.actualRevenue}</h3>
                     <p className="text-slate-500 text-sm">Doanh thu Thực tế</p>
                  </div>
               </div>

               {/* Card 4: Enrollment Rate (Placeholder for KPI like completion) */}
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                     <div className="bg-amber-50 p-3 rounded-xl text-amber-600">
                        <TrendingUp size={24} />
                     </div>
                  </div>
                  <div className="mt-4">
                     <h3 className="text-3xl font-bold text-slate-900">{stats.completionRate}</h3>
                     <p className="text-slate-500 text-sm">Tỷ lệ Hoàn thành Mục tiêu</p>
                  </div>
               </div>

            </div>

            {/* --- CHARTS ROW --- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

               {/* Chart 1: Enrollment Proportion (Pie) */}
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <div className="flex justify-between items-center mb-6">
                     <h3 className="font-bold text-lg text-slate-900">Tỷ trọng Ghi danh</h3>
                     <button className="text-slate-400 hover:text-slate-600"><MoreVertical size={20} /></button>
                  </div>

                  <div className="h-[320px] relative">
                     <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                           <Pie
                              data={ENROLLMENT_DATA}
                              cx="50%"
                              cy="50%"
                              innerRadius={80}
                              outerRadius={100}
                              paddingAngle={5}
                              dataKey="value"
                           >
                              {ENROLLMENT_DATA.map((entry, index) => (
                                 <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                           </Pie>
                           <RechartsTooltip />
                           <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        </PieChart>
                     </ResponsiveContainer>
                     {/* Center Text */}
                     <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                        <span className="text-4xl font-bold text-slate-900">350</span>
                        <span className="text-sm text-slate-400">Học viên</span>
                     </div>
                  </div>
               </div>

               {/* Chart 2: Revenue Trend (Bar) */}
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <div className="flex justify-between items-center mb-6">
                     <h3 className="font-bold text-lg text-slate-900">Doanh thu & Dự kiến (6 tháng)</h3>
                     <button className="text-slate-400 hover:text-slate-600"><MoreVertical size={20} /></button>
                  </div>

                  <div className="h-[320px]">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={REVENUE_TREND_DATA} barSize={20}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                           <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                           <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} unit="Tr" />
                           <Tooltip
                              cursor={{ fill: '#f1f5f9' }}
                              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                           />
                           <Legend wrapperStyle={{ paddingTop: '20px' }} />
                           <Bar dataKey="expected" name="Dự kiến" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                           <Bar dataKey="actual" name="Thực tế" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                     </ResponsiveContainer>
                  </div>
               </div>

            </div>

         </div>
      </div>
   );
};

export default ContractDashboard;
