import React, { useState, useMemo } from 'react';
import { IDeal, DealStage } from '../types';
import { ArrowRight, ChevronDown, Filter, LayoutGrid, RotateCcw } from 'lucide-react';

interface DealPivotTableProps {
    deals: IDeal[];
}

// Các trường Group By chuyên cho Sales
const GROUP_OPTIONS = [
    { value: 'stage', label: 'Giai đoạn (Stage)' },
    { value: 'salesRepId', label: 'Người phụ trách (Sales Rep)' },
    { value: 'product', label: 'Sản phẩm/Dịch vụ' },
    { value: 'source', label: 'Nguồn (Source)' },
];

const DealPivotTable: React.FC<DealPivotTableProps> = ({ deals }) => {
    // State cấu hình
    const [rowGroup, setRowGroup] = useState<string>('salesRepId');
    const [colGroup, setColGroup] = useState<string>('stage');
    // Sales quan tâm tiền, nên mặc định là Doanh thu
    const [measure, setMeasure] = useState<'count' | 'sum_value' | 'weighted_value'>('sum_value');

    const getValue = (deal: IDeal, field: string) => {
        // @ts-ignore
        const val = deal[field];
        if (field === 'stage') {
            // Mapping stage name? Or just use raw value
            switch (val) {
                case DealStage.WON: return '6. Won';
                case DealStage.LOST: return '7. Lost';
                case DealStage.CONTRACT: return '5. Hợp đồng';
                case DealStage.DOCUMENT_COLLECTION: return '4. Thu hồ sơ';
                case DealStage.NEGOTIATION: return '3. Thương thảo';
                case DealStage.PROPOSAL: return '2. Báo giá';
                case DealStage.DEEP_CONSULTING: return '1. Tư vấn';
                default: return val || '(Unknown)';
            }
        }
        return val ? String(val) : '(Chưa xác định)';
    };

    const pivotData = useMemo(() => {
        const uniqueCols = Array.from(new Set(deals.map(d => getValue(d, colGroup)))).sort();
        const uniqueRows = Array.from(new Set(deals.map(d => getValue(d, rowGroup)))).sort();

        const matrix: Record<string, Record<string, number>> = {};

        uniqueRows.forEach(r => {
            matrix[r] = {};
            uniqueCols.forEach(c => matrix[r][c] = 0);
        });

        deals.forEach(deal => {
            const rKey = getValue(deal, rowGroup);
            const cKey = getValue(deal, colGroup);

            let valToAdd = 0;
            if (measure === 'count') valToAdd = 1;
            else if (measure === 'sum_value') valToAdd = deal.value || 0;
            else if (measure === 'weighted_value') valToAdd = (deal.value || 0) * ((deal.probability || 0) / 100);

            if (matrix[rKey] && matrix[rKey][cKey] !== undefined) {
                matrix[rKey][cKey] += valToAdd;
            }
        });

        // Totals
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
    }, [deals, rowGroup, colGroup, measure]);

    const { uniqueRows, uniqueCols, matrix, rowTotals, colTotals, grandTotal } = pivotData;

    return (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
            {/* CONFIG BAR */}
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex gap-4 items-center">
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500">Hàng (Rows)</label>
                        <select value={rowGroup} onChange={e => setRowGroup(e.target.value)} className="text-sm font-semibold bg-white border border-slate-300 rounded px-2 py-1">
                            {GROUP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>
                    <ArrowRight size={16} className="text-slate-300 mt-5" />
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500">Cột (Columns)</label>
                        <select value={colGroup} onChange={e => setColGroup(e.target.value)} className="text-sm font-semibold bg-white border border-slate-300 rounded px-2 py-1">
                            {GROUP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex items-center bg-white rounded border border-slate-200 p-1">
                    <button onClick={() => setMeasure('sum_value')} className={`px-3 py-1 text-xs font-bold rounded ${measure === 'sum_value' ? 'bg-green-100 text-green-700' : 'text-slate-600'}`}>Doanh thu (VNĐ)</button>
                    <button onClick={() => setMeasure('count')} className={`px-3 py-1 text-xs font-bold rounded ${measure === 'count' ? 'bg-blue-100 text-blue-700' : 'text-slate-600'}`}>Số lượng Deal</button>
                    <button onClick={() => setMeasure('weighted_value')} className={`px-3 py-1 text-xs font-bold rounded ${measure === 'weighted_value' ? 'bg-purple-100 text-purple-700' : 'text-slate-600'}`}>Doanh thu dự báo (%)</button>
                </div>
            </div>

            {/* TABLE */}
            <div className="overflow-x-auto p-4">
                <table className="w-full border-collapse text-sm">
                    <thead>
                        <tr>
                            <th className="bg-slate-100 p-2 border border-slate-300 text-left min-w-[150px]">{rowGroup} \ {colGroup}</th>
                            {uniqueCols.map(c => <th key={c} className="bg-slate-50 p-2 border border-slate-300 min-w-[100px]">{c}</th>)}
                            <th className="bg-slate-200 p-2 border border-slate-300 font-bold min-w-[100px]">TỔNG</th>
                        </tr>
                    </thead>
                    <tbody>
                        {uniqueRows.map(r => (
                            <tr key={r} className="hover:bg-slate-50">
                                <td className="p-2 border border-slate-300 font-semibold text-slate-700 bg-slate-50">{r}</td>
                                {uniqueCols.map(c => (
                                    <td key={c} className="p-2 border border-slate-300 text-center">
                                        {measure === 'count' ? matrix[r][c] : matrix[r][c].toLocaleString('vi-VN')}
                                    </td>
                                ))}
                                <td className="p-2 border border-slate-300 font-bold text-center bg-slate-100">
                                    {measure === 'count' ? rowTotals[r] : rowTotals[r].toLocaleString('vi-VN')}
                                </td>
                            </tr>
                        ))}
                        <tr className="bg-slate-800 text-white font-bold">
                            <td className="p-2 border border-slate-600 text-right">TỔNG CỘNG</td>
                            {uniqueCols.map(c => (
                                <td key={c} className="p-2 border border-slate-600 text-center">
                                    {measure === 'count' ? colTotals[c] : colTotals[c].toLocaleString('vi-VN')}
                                </td>
                            ))}
                            <td className="p-2 border border-slate-600 text-center text-yellow-400 text-base">
                                {measure === 'count' ? grandTotal : grandTotal.toLocaleString('vi-VN')}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div className="px-5 pb-5 text-xs text-slate-400 italic">
                * Dữ liệu được tính toán dựa trên {deals.length} Deal đang hiển thị. Doanh thu dự báo = Giá trị x Tỷ lệ thành công (%).
            </div>
        </div>
    );
};

export default DealPivotTable;
