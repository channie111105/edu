import React, { useState } from 'react';
import {
    Target,
    TrendingUp,
    Award,
    BarChart2,
    Calendar,
    Filter,
    Download,
    ChevronDown,
    ArrowUpRight,
    User
} from 'lucide-react';

interface SalesKPI {
    id: string;
    name: string;
    avatar?: string;
    targetDeal: number;
    actualDeal: number;
    targetRev: number; // In millions
    actualRev: number; // In millions
    pipelineValue: number; // In millions
    conversionRate: number;
    avgDealSize: number; // In millions
}

// Mock Data
const MOCK_KPIS: SalesKPI[] = [
    {
        id: '1',
        name: 'Nguyễn Văn Nam',
        targetDeal: 30,
        actualDeal: 25,
        targetRev: 600,
        actualRev: 520,
        pipelineValue: 800,
        conversionRate: 22,
        avgDealSize: 20.8
    },
    {
        id: '2',
        name: 'Trần Thị Hương',
        targetDeal: 25,
        actualDeal: 20,
        targetRev: 500,
        actualRev: 410,
        pipelineValue: 650,
        conversionRate: 18,
        avgDealSize: 20.5
    },
    {
        id: '3',
        name: 'Lê Hoàng',
        targetDeal: 20,
        actualDeal: 18,
        targetRev: 400,
        actualRev: 380,
        pipelineValue: 450,
        conversionRate: 25,
        avgDealSize: 21.1
    },
    {
        id: '4',
        name: 'Phạm Bích Ngọc',
        targetDeal: 20,
        actualDeal: 15,
        targetRev: 400,
        actualRev: 300,
        pipelineValue: 500,
        conversionRate: 15,
        avgDealSize: 20.0
    },
    {
        id: '5',
        name: 'Vũ Minh Hiếu',
        targetDeal: 15,
        actualDeal: 12,
        targetRev: 300,
        actualRev: 250,
        pipelineValue: 400,
        conversionRate: 16,
        avgDealSize: 20.8
    },
];

const SalesKPIs: React.FC = () => {
    const [period, setPeriod] = useState('Tháng này');

    // Calculations
    const totalTargetRev = MOCK_KPIS.reduce((sum, k) => sum + k.targetRev, 0);
    const totalActualRev = MOCK_KPIS.reduce((sum, k) => sum + k.actualRev, 0);
    const percentAchieved = Math.round((totalActualRev / totalTargetRev) * 100);

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] text-[#0d141b] font-sans overflow-hidden">
            <div className="flex flex-col flex-1 p-6 lg:p-8 max-w-[1400px] mx-auto w-full gap-6 overflow-y-auto">

                {/* Header */}
                <div className="flex flex-wrap justify-between items-center gap-4">
                    <div className="flex flex-col gap-1">
                        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                            <Target className="text-blue-600" size={32} /> KPIs & Mục tiêu Kinh doanh
                        </h1>
                        <p className="text-slate-500 text-sm">Theo dõi hiệu suất và tiến độ đạt mục tiêu của đội ngũ Sales.</p>
                    </div>

                    <div className="flex gap-3">
                        <div className="bg-white border border-slate-200 rounded-lg flex items-center px-3 py-2 gap-2 shadow-sm font-medium text-slate-700">
                            <Calendar size={16} className="text-slate-400" />
                            <span>{period}</span>
                            <ChevronDown size={14} className="text-slate-400" />
                        </div>
                        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold shadow-sm flex items-center gap-2 transition-colors">
                            <Download size={18} /> Xuất Báo cáo
                        </button>
                    </div>
                </div>

                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Revenue Progress */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-[140px]">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-slate-500 text-sm font-medium">Doanh thu Thực tế / Mục tiêu</p>
                                <h3 className="text-2xl font-bold text-slate-900 mt-1">
                                    {totalActualRev.toLocaleString()} / {totalTargetRev.toLocaleString()} <span className="text-sm font-normal text-slate-400">Tr VNĐ</span>
                                </h3>
                            </div>
                            <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                                <TrendingUp size={20} />
                            </div>
                        </div>
                        <div className="mt-2">
                            <div className="flex justify-between text-xs mb-1 font-semibold">
                                <span className={percentAchieved >= 80 ? "text-green-600" : "text-amber-600"}>{percentAchieved}% Đạt được</span>
                                <span className="text-slate-400">Còn {((totalTargetRev - totalActualRev) / 30).toFixed(0)} Tr/ngày</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div className={`h-full rounded-full ${percentAchieved >= 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(percentAchieved, 100)}%` }}></div>
                            </div>
                        </div>
                    </div>

                    {/* Deals Won */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-[140px]">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-slate-500 text-sm font-medium">Hợp đồng Chốt được</p>
                                <h3 className="text-2xl font-bold text-slate-900 mt-1">90 <span className="text-sm font-normal text-slate-400">HĐ</span></h3>
                            </div>
                            <div className="bg-purple-50 p-2 rounded-lg text-purple-600">
                                <Award size={20} />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-green-600 font-bold mt-2">
                            <ArrowUpRight size={16} /> +12% <span className="text-slate-400 font-normal">so với tháng trước</span>
                        </div>
                    </div>

                    {/* Pipeline Value */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-[140px]">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-slate-500 text-sm font-medium">Giá trị Pipeline</p>
                                <h3 className="text-2xl font-bold text-slate-900 mt-1">2.8 <span className="text-sm font-normal text-slate-400">Tỷ VNĐ</span></h3>
                            </div>
                            <div className="bg-amber-50 p-2 rounded-lg text-amber-600">
                                <BarChart2 size={20} />
                            </div>
                        </div>
                        <div className="text-xs text-slate-500 mt-2">
                            Dự kiến chốt thêm <span className="font-bold text-slate-800">1.2 Tỷ</span> trong tháng này
                        </div>
                    </div>

                    {/* Top Performer */}
                    <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-5 rounded-xl shadow-md flex flex-col justify-between h-[140px] text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <Award size={100} />
                        </div>
                        <div>
                            <p className="text-blue-100 text-sm font-medium flex items-center gap-1"><Award size={14} /> Top Sale Tháng</p>
                            <h3 className="text-xl font-bold mt-1">Nguyễn Văn Nam</h3>
                            <p className="text-blue-200 text-sm">Đạt 115% Target</p>
                        </div>
                        <div className="mt-3">
                            <span className="bg-white/20 px-2 py-1 rounded text-xs font-semibold backdrop-blur-sm">
                                Doanh thu 520 Tr
                            </span>
                        </div>
                    </div>
                </div>

                {/* Detailed KPI Table */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col flex-1 overflow-hidden">
                    <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                        <h2 className="font-bold text-slate-800 flex items-center gap-2">
                            <User size={18} className="text-slate-500" /> Bảng KPIs Cá nhân
                        </h2>
                        <button className="text-sm text-blue-600 font-bold hover:underline">
                            Thiết lập KPI Mới
                        </button>
                    </div>

                    <div className="overflow-auto flex-1">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 sticky top-0 z-10 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                <tr>
                                    <th className="p-4 border-b border-slate-200 w-[200px]">Nhân viên Sale</th>
                                    <th className="p-4 border-b border-slate-200 text-center bg-blue-50/30">Mục tiêu HĐ</th>
                                    <th className="p-4 border-b border-slate-200 text-center bg-green-50/30">Đạt được</th>
                                    <th className="p-4 border-b border-slate-200 text-center bg-blue-50/30">Target D.Thu</th>
                                    <th className="p-4 border-b border-slate-200 text-center bg-green-50/30">D.Thu Thực tế</th>
                                    <th className="p-4 border-b border-slate-200 text-center w-[250px]">Tiến độ</th>
                                    <th className="p-4 border-b border-slate-200 text-center">Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {MOCK_KPIS.map((kpi) => {
                                    const progress = Math.min(Math.round((kpi.actualRev / kpi.targetRev) * 100), 100);
                                    const isHigh = progress >= 100;
                                    const isGood = progress >= 80;

                                    return (
                                        <tr key={kpi.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-4 font-semibold text-slate-800">{kpi.name}</td>
                                            <td className="p-4 text-center bg-blue-50/10 text-slate-600">{kpi.targetDeal}</td>
                                            <td className="p-4 text-center bg-green-50/10 font-bold text-green-700">{kpi.actualDeal}</td>
                                            <td className="p-4 text-center bg-blue-50/10 text-slate-600">{kpi.targetRev} Tr</td>
                                            <td className="p-4 text-center bg-green-50/10 font-bold text-green-700">{kpi.actualRev} Tr</td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${isHigh ? 'bg-gradient-to-r from-green-400 to-green-600' : isGood ? 'bg-blue-500' : 'bg-amber-500'}`}
                                                            style={{ width: `${progress}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className={`text-xs font-bold w-10 text-right ${isHigh ? 'text-green-600' : 'text-slate-600'}`}>{progress}%</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                {isHigh ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                                                        Xuất sắc
                                                    </span>
                                                ) : isGood ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">
                                                        Đạt yêu cầu
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
                                                        Chậm tiến độ
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="p-4 border-t border-slate-200 bg-slate-50 text-slate-500 text-sm flex justify-between items-center">
                        <span>Hiển thị 5/5 nhân viên</span>
                        <div className="flex gap-2">
                            <button className="px-3 py-1 border border-slate-300 rounded hover:bg-white disabled:opacity-50" disabled>Trước</button>
                            <button className="px-3 py-1 border border-slate-300 rounded hover:bg-white disabled:opacity-50" disabled>Sau</button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default SalesKPIs;
