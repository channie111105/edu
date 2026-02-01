import React, { useState, useMemo } from 'react';
import { ILead } from '../types';
import { ArrowRight, ChevronDown, Filter, LayoutGrid, RotateCcw } from 'lucide-react';

interface LeadPivotTableProps {
    leads: ILead[];
}

// Các trường có thể Group (Nhóm)
const GROUP_OPTIONS = [
    { value: 'ownerId', label: 'Người phụ trách' },
    { value: 'source', label: 'Nguồn (Source)' },
    { value: 'program', label: 'Chương trình học' },
    { value: 'status', label: 'Trạng thái (Status)' },
    { value: 'targetCountry', label: 'Thị trường (Quốc gia)' },
    { value: 'month', label: 'Tháng tạo (Created Month)' }
];

const LeadPivotTable: React.FC<LeadPivotTableProps> = ({ leads }) => {
    // 1. STATE: Cấu hình Pivot
    const [rowGroup, setRowGroup] = useState<string>('ownerId'); // Trục Hàng
    const [colGroup, setColGroup] = useState<string>('source');  // Trục Cột
    const [measure, setMeasure] = useState<'count' | 'sum_value'>('count'); // Giá trị tính toán

    // 2. HELPER: Lấy giá trị hiển thị từ Lead
    const getValue = (lead: ILead, field: string) => {
        if (field === 'month') {
            return new Date(lead.createdAt).toLocaleString('vi-VN', { month: '2-digit', year: 'numeric' });
        }
        // @ts-ignore
        const val = lead[field];
        return val ? String(val) : '(Chưa xác định)';
    };

    // 3. LOGIC XỬ LÝ DỮ LIỆU (.reduce - Trái tim của Pivot)
    const pivotData = useMemo(() => {
        // A. Lấy danh sách duy nhất các Cột (Columns Headers)
        const uniqueCols = Array.from(new Set(leads.map(l => getValue(l, colGroup)))).sort();

        // B. Lấy danh sách duy nhất các Hàng (Rows Headers)
        const uniqueRows = Array.from(new Set(leads.map(l => getValue(l, rowGroup)))).sort();

        // C. Tính toán ma trận (Matrix Update)
        // Cấu trúc Data: { "RowValue": { "ColValue": Result } }
        const matrix: Record<string, Record<string, number>> = {};

        // Khởi tạo matrix rỗng
        uniqueRows.forEach(r => {
            matrix[r] = {};
            uniqueCols.forEach(c => matrix[r][c] = 0);
        });

        // Loop qua từng lead để cộng dồn vào ô tương ứng
        leads.forEach(lead => {
            const rKey = getValue(lead, rowGroup);
            const cKey = getValue(lead, colGroup);

            const valueToAdd = measure === 'count' ? 1 : (lead.value || 0);

            if (matrix[rKey] && matrix[rKey][cKey] !== undefined) {
                matrix[rKey][cKey] += valueToAdd;
            }
        });

        // D. Tính Tổng Hàng và Tổng Cột
        const rowTotals: Record<string, number> = {};
        const colTotals: Record<string, number> = {};
        let grandTotal = 0;

        uniqueRows.forEach(r => {
            rowTotals[r] = uniqueCols.reduce((sum, c) => sum + matrix[r][c], 0);
            grandTotal += rowTotals[r];
        });

        uniqueCols.forEach(c => {
            colTotals[c] = uniqueRows.reduce((sum, r) => sum + matrix[r][c], 0);
        });

        return { uniqueRows, uniqueCols, matrix, rowTotals, colTotals, grandTotal };
    }, [leads, rowGroup, colGroup, measure]);

    const { uniqueRows, uniqueCols, matrix, rowTotals, colTotals, grandTotal } = pivotData;

    return (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-2">

            {/* TOOLBAR: Cấu hình Pivot */}
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex gap-4 items-center">
                    {/* Chọn Hàng */}
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                            <LayoutGrid size={10} /> Group By (Hàng)
                        </label>
                        <div className="relative">
                            <select
                                value={rowGroup}
                                onChange={(e) => setRowGroup(e.target.value)}
                                className="appearance-none bg-white border border-slate-300 px-3 py-1.5 pr-8 rounded text-sm font-medium focus:outline-none focus:border-blue-500 min-w-[150px]"
                            >
                                {GROUP_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    <ArrowRight size={16} className="text-slate-300 mt-5" />

                    {/* Chọn Cột */}
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                            <LayoutGrid size={10} className="rotate-90" /> Column (Cột)
                        </label>
                        <div className="relative">
                            <select
                                value={colGroup}
                                onChange={(e) => setColGroup(e.target.value)}
                                className="appearance-none bg-white border border-slate-300 px-3 py-1.5 pr-8 rounded text-sm font-medium focus:outline-none focus:border-blue-500 min-w-[150px]"
                            >
                                {GROUP_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Chọn Phép đo */}
                <div className="flex items-center bg-white rounded border border-slate-200 p-1">
                    <button
                        onClick={() => setMeasure('count')}
                        className={`px-3 py-1 text-xs font-bold rounded ${measure === 'count' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        Đếm số lượng
                    </button>
                    <button
                        onClick={() => setMeasure('sum_value')}
                        className={`px-3 py-1 text-xs font-bold rounded ${measure === 'sum_value' ? 'bg-amber-100 text-amber-700' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        Tổng Doanh thu
                    </button>
                </div>
            </div>

            {/* PIVOT TABLE DISPLAY */}
            <div className="overflow-x-auto p-4">
                <table className="w-full border-collapse border border-slate-200 text-sm">
                    <thead>
                        <tr>
                            <th className="bg-slate-100 border border-slate-300 p-2 text-left font-bold text-slate-700 min-w-[150px]">
                                {GROUP_OPTIONS.find(o => o.value === rowGroup)?.label} \ {GROUP_OPTIONS.find(o => o.value === colGroup)?.label}
                            </th>
                            {uniqueCols.map(col => (
                                <th key={col} className="bg-slate-50 border border-slate-300 p-2 text-center font-semibold text-slate-700 min-w-[100px]">
                                    {col}
                                </th>
                            ))}
                            <th className="bg-slate-200 border border-slate-300 p-2 text-center font-bold text-slate-800 w-[100px]">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {uniqueRows.map(row => (
                            <tr key={row} className="hover:bg-blue-50 transition-colors">
                                <td className="border border-slate-300 p-2 font-bold text-slate-700 bg-slate-50">
                                    {row}
                                </td>
                                {uniqueCols.map(col => {
                                    const val = matrix[row][col];
                                    return (
                                        <td key={col} className={`border border-slate-300 p-2 text-center ${val > 0 ? 'text-slate-800' : 'text-slate-300'}`}>
                                            {measure === 'sum_value' ? val.toLocaleString('vi-VN') : val}
                                        </td>
                                    )
                                })}
                                <td className="border border-slate-300 p-2 text-center font-bold bg-slate-100">
                                    {measure === 'sum_value' ? rowTotals[row].toLocaleString('vi-VN') : rowTotals[row]}
                                </td>
                            </tr>
                        ))}

                        {/* Grand Total Row */}
                        <tr className="bg-slate-200 font-bold border-t-2 border-slate-400">
                            <td className="border border-slate-300 p-2 text-right text-slate-800">TỔNG CỘNG</td>
                            {uniqueCols.map(col => (
                                <td key={col} className="border border-slate-300 p-2 text-center text-slate-900">
                                    {measure === 'sum_value' ? colTotals[col].toLocaleString('vi-VN') : colTotals[col]}
                                </td>
                            ))}
                            <td className="border border-slate-300 p-2 text-center text-blue-800 text-base">
                                {measure === 'sum_value' ? grandTotal.toLocaleString('vi-VN') : grandTotal}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="px-4 pb-4 text-xs text-slate-500 italic">
                * Báo cáo này được tổng hợp từ {leads.length} bản ghi hiện có.
            </div>
        </div>
    );
};

export default LeadPivotTable;
