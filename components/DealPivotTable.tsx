import React, { useState, useMemo } from 'react';
import { IDeal, DealStage } from '../types';
import { ChevronDown, ChevronRight, Plus, Minus } from 'lucide-react';

interface DealPivotTableProps {
    deals: IDeal[];
}

// Measures (Chỉ số)
const MEASURES = [
    { value: 'count', label: 'Tổng' },
    { value: 'sum_value', label: 'Doanh thu dự kiến' },
    { value: 'weighted_value', label: 'Doanh thu theo tỷ lệ' },
    { value: 'expected_revenue', label: 'Doanh thu kỳ vọng' },
    { value: 'overdue', label: 'Đã quá hạn' },
    { value: 'days_to_close', label: 'Ngày để chốt' },
];

// Dimensions
const DIMENSIONS = [
    { value: 'stage', label: 'Giai đoạn', hasSubmenu: false },
    { value: 'salesRep', label: 'Chuyên viên sales', hasSubmenu: false },
    { value: 'salesTeam', label: 'Bộ phận sales', hasSubmenu: false },
    { value: 'product', label: 'Sản phẩm/Dịch vụ', hasSubmenu: false },
    { value: 'source', label: 'Nguồn', hasSubmenu: false },
    { value: 'campaign', label: 'Chiến dịch', hasSubmenu: false },
    { value: 'createdDate', label: 'Ngày tạo', hasSubmenu: true },
    { value: 'expectedCloseDate', label: 'Ngày đóng dự kiến', hasSubmenu: true },
    { value: 'closedDate', label: 'Ngày chốt', hasSubmenu: true },
];

// Date granularities
const DATE_GRANULARITIES = [
    { value: 'year', label: 'Năm' },
    { value: 'quarter', label: 'Quý' },
    { value: 'month', label: 'Tháng' },
    { value: 'week', label: 'Tuần' },
    { value: 'day', label: 'Ngày' },
];

// Custom fields
const CUSTOM_FIELDS = [
    'Bộ phận sales', 'Chiến dịch', 'Chuyên viên sales', 'Công ty',
    'Cơ hội', 'Giai đoạn', 'Khách hàng', 'Liên hệ', 'Loại',
    'Nguồn', 'Phương tiện', 'Sản phẩm', 'Thành phố', 'Quốc gia'
];

const DealPivotTable: React.FC<DealPivotTableProps> = ({ deals }) => {
    // State
    const [selectedMeasures, setSelectedMeasures] = useState<string[]>(['count', 'sum_value']);
    const [showMeasureDropdown, setShowMeasureDropdown] = useState(false);
    const [showDimensionDropdown, setShowDimensionDropdown] = useState(false);
    const [hoveredDimension, setHoveredDimension] = useState<string | null>(null);
    const [showCustomFieldsDropdown, setShowCustomFieldsDropdown] = useState(false);
    const [rowDimensions, setRowDimensions] = useState<Array<{ field: string, granularity?: string }>>([
        { field: 'stage' }
    ]);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    // Helper: Get value from deal
    const getValue = (deal: IDeal, field: string, granularity?: string) => {
        if (field === 'createdDate' || field === 'expectedCloseDate' || field === 'closedDate') {
            const dateStr = field === 'createdDate' ? deal.createdAt :
                field === 'expectedCloseDate' ? deal.expectedCloseDate :
                    (deal as any).closedAt;
            if (!dateStr) return '(Chưa xác định)';
            const date = new Date(dateStr);

            if (granularity === 'year') return date.getFullYear().toString();
            if (granularity === 'quarter') return `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
            if (granularity === 'month') return date.toLocaleString('vi-VN', { month: '2-digit', year: 'numeric' });
            if (granularity === 'week') return `W${Math.ceil(date.getDate() / 7)} ${date.toLocaleString('vi-VN', { month: 'short', year: 'numeric' })}`;
            if (granularity === 'day') return date.toLocaleDateString('vi-VN');
            return date.toLocaleDateString('vi-VN');
        }

        if (field === 'stage') {
            switch (deal.stage) {
                case DealStage.NEW_OPP: return 'New Opp';
                case DealStage.DEEP_CONSULTING: return 'Tư vấn/Hẹn meeting';
                case DealStage.PROPOSAL: return 'Tư vấn sâu (Gửi báo giá, lộ trình)';
                case DealStage.NEGOTIATION: return 'Đàm phán (Theo dõi chốt)';
                case DealStage.WON: return 'Won';
                case DealStage.LOST: return 'Lost';
                case DealStage.AFTER_SALE:
                case DealStage.CONTRACT:
                case DealStage.DOCUMENT_COLLECTION:
                    return 'After sale';
                default: return deal.stage || '(Không xác định)';
            }
        }

        if (field === 'salesRep') return deal.ownerId || '(Chưa phân)';

        // @ts-ignore
        const val = deal[field];
        return val ? String(val) : '(Chưa xác định)';
    };

    // Calculate measure value
    const calculateMeasure = (deals: IDeal[], measure: string): number => {
        if (measure === 'count') return deals.length;
        if (measure === 'sum_value') return deals.reduce((sum, d) => sum + (d.value || 0), 0);
        if (measure === 'weighted_value') return deals.reduce((sum, d) => sum + (d.value || 0) * ((d.probability || 50) / 100), 0);
        if (measure === 'expected_revenue') return deals.reduce((sum, d) => sum + (d.value || 0) * ((d.probability || 0) / 100), 0);
        if (measure === 'overdue') {
            return deals.filter(d => d.expectedCloseDate && new Date(d.expectedCloseDate) < new Date()).length;
        }
        if (measure === 'days_to_close') {
            const total = deals.reduce((sum, d) => {
                if (d.expectedCloseDate) {
                    const days = Math.floor((new Date(d.expectedCloseDate).getTime() - new Date(d.createdAt || Date.now()).getTime()) / (1000 * 60 * 60 * 24));
                    return sum + days;
                }
                return sum;
            }, 0);
            return deals.length > 0 ? total / deals.length : 0;
        }
        return 0;
    };

    // Format measure value
    const formatMeasure = (value: number, measure: string): string => {
        if (measure === 'count' || measure === 'overdue') {
            return value.toString();
        }
        if (measure === 'sum_value' || measure === 'weighted_value' || measure === 'expected_revenue') {
            return value.toLocaleString('vi-VN') + ' đ';
        }
        if (measure === 'days_to_close') {
            return value.toFixed(1) + ' ngày';
        }
        return value.toString();
    };

    // Group deals by dimensions
    const groupedData = useMemo(() => {
        if (rowDimensions.length === 0) {
            return { groups: [], totals: {} };
        }

        const firstDim = rowDimensions[0];
        const groups = new Map<string, IDeal[]>();

        deals.forEach(deal => {
            const key = getValue(deal, firstDim.field, firstDim.granularity);
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key)!.push(deal);
        });

        const sortedGroups = Array.from(groups.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, groupDeals]) => ({ key, deals: groupDeals }));

        // Calculate totals
        const totals: Record<string, number> = {};
        selectedMeasures.forEach(measure => {
            totals[measure] = calculateMeasure(deals, measure);
        });

        return { groups: sortedGroups, totals };
    }, [deals, rowDimensions, selectedMeasures]);

    // Toggle measure selection
    const toggleMeasure = (measure: string) => {
        if (selectedMeasures.includes(measure)) {
            if (selectedMeasures.length > 1) {
                setSelectedMeasures(selectedMeasures.filter(m => m !== measure));
            }
        } else {
            setSelectedMeasures([...selectedMeasures, measure]);
        }
    };

    // Add dimension
    const addDimension = (field: string, granularity?: string) => {
        setRowDimensions([...rowDimensions, { field, granularity }]);
        setShowDimensionDropdown(false);
        setHoveredDimension(null);
    };

    // Toggle row expansion
    const toggleRow = (key: string) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(key)) {
            newExpanded.delete(key);
        } else {
            newExpanded.add(key);
        }
        setExpandedRows(newExpanded);
    };

    return (
        <div className="flex flex-col h-full bg-white border border-slate-200 rounded-lg shadow-sm">
            {/* TOP TOOLBAR */}
            <div className="flex items-center gap-2 p-3 border-b border-slate-200 bg-slate-50">
                {/* Chỉ số Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setShowMeasureDropdown(!showMeasureDropdown)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white rounded text-sm font-semibold hover:bg-purple-700"
                    >
                        Chỉ số
                        <ChevronDown size={14} />
                    </button>
                    {showMeasureDropdown && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded shadow-lg z-20 min-w-[220px]">
                            {MEASURES.map(m => (
                                <button
                                    key={m.value}
                                    onClick={() => toggleMeasure(m.value)}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedMeasures.includes(m.value)}
                                        readOnly
                                        className="pointer-events-none"
                                    />
                                    {m.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <span className="text-slate-500">Chèn vào bảng tính</span>

                {/* Icons */}
                <button className="p-1.5 hover:bg-slate-200 rounded" title="Flip axis">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M7 16V4M7 4L3 8M7 4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
                    </svg>
                </button>
                <button className="p-1.5 hover:bg-slate-200 rounded" title="Expand all">
                    <Plus size={16} />
                </button>
                <button className="p-1.5 hover:bg-slate-200 rounded" title="Download">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                    </svg>
                </button>
            </div>

            {/* PIVOT TABLE */}
            <div className="flex-1 overflow-auto">
                <table className="w-full border-collapse text-sm">
                    <thead className="sticky top-0 bg-slate-50 z-10">
                        <tr>
                            <th className="border border-slate-300 p-2 text-left font-semibold min-w-[200px]">
                                <div className="flex items-center gap-2 relative">
                                    <button
                                        onClick={() => setShowDimensionDropdown(!showDimensionDropdown)}
                                        className="p-0.5 hover:bg-slate-200 rounded"
                                    >
                                        <Plus size={14} />
                                    </button>
                                    Tổng

                                    {/* Dimension Dropdown */}
                                    {showDimensionDropdown && (
                                        <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded shadow-lg z-30 min-w-[200px] max-h-[400px] overflow-y-auto">
                                            {DIMENSIONS.map(dim => (
                                                <div
                                                    key={dim.value}
                                                    className="relative"
                                                    onMouseEnter={() => dim.hasSubmenu && setHoveredDimension(dim.value)}
                                                    onMouseLeave={() => setHoveredDimension(null)}
                                                >
                                                    <button
                                                        onClick={() => !dim.hasSubmenu && addDimension(dim.value)}
                                                        className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center justify-between"
                                                    >
                                                        {dim.label}
                                                        {dim.hasSubmenu && <ChevronRight size={14} />}
                                                    </button>

                                                    {/* Date Submenu */}
                                                    {dim.hasSubmenu && hoveredDimension === dim.value && (
                                                        <div className="absolute left-full top-0 ml-1 bg-white border border-slate-200 rounded shadow-lg min-w-[120px]">
                                                            {DATE_GRANULARITIES.map(gran => (
                                                                <button
                                                                    key={gran.value}
                                                                    onClick={() => addDimension(dim.value, gran.value)}
                                                                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                                                                >
                                                                    {gran.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}

                                            {/* Nhóm tùy chỉnh */}
                                            <div
                                                className="relative"
                                                onMouseEnter={() => setShowCustomFieldsDropdown(true)}
                                                onMouseLeave={() => setShowCustomFieldsDropdown(false)}
                                            >
                                                <button className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center justify-between">
                                                    Nhóm tùy chỉnh
                                                    <ChevronDown size={14} />
                                                </button>

                                                {showCustomFieldsDropdown && (
                                                    <div className="absolute left-full top-0 ml-1 bg-white border border-slate-200 rounded shadow-lg min-w-[200px] max-h-[300px] overflow-y-auto">
                                                        {CUSTOM_FIELDS.map(field => (
                                                            <button
                                                                key={field}
                                                                className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                                                            >
                                                                {field}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </th>
                            {selectedMeasures.map(measure => {
                                const measureObj = MEASURES.find(m => m.value === measure);
                                return (
                                    <th key={measure} className="border border-slate-300 p-2 text-right font-semibold min-w-[150px]">
                                        {measureObj?.label}
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {groupedData.groups.map(({ key, deals: groupDeals }) => (
                            <tr key={key} className="hover:bg-slate-50">
                                <td className="border border-slate-300 p-2">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => toggleRow(key)}
                                            className="p-0.5 hover:bg-slate-200 rounded"
                                        >
                                            <Plus size={14} />
                                        </button>
                                        <span className="font-medium">{key}</span>
                                    </div>
                                </td>
                                {selectedMeasures.map(measure => (
                                    <td key={measure} className="border border-slate-300 p-2 text-right font-mono">
                                        {formatMeasure(calculateMeasure(groupDeals, measure), measure)}
                                    </td>
                                ))}
                            </tr>
                        ))}

                        {/* Grand Total */}
                        <tr className="bg-slate-800 text-white font-bold">
                            <td className="border border-slate-600 p-2">
                                <div className="flex items-center gap-2">
                                    <Minus size={14} className="opacity-30" />
                                    Tổng
                                </div>
                            </td>
                            {selectedMeasures.map(measure => (
                                <td key={measure} className="border border-slate-600 p-2 text-right font-mono text-yellow-300">
                                    {formatMeasure(groupedData.totals[measure], measure)}
                                </td>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DealPivotTable;
