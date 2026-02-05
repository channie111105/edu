import React, { useState, useMemo } from 'react';
import { ILead } from '../types';
import { ChevronDown, ChevronRight, Plus, Minus } from 'lucide-react';

interface LeadPivotTableProps {
    leads: ILead[];
}

// Measures (Chỉ số - Thêm cột)
const MEASURES = [
    { value: 'count', label: 'Tổng' },
    { value: 'sum_value', label: 'Doanh thu dự kiến' },
    { value: 'weighted_value', label: 'Doanh thu theo tỷ lệ' },
    { value: 'expected_revenue', label: 'Doanh thu kỳ vọng' },
    { value: 'overdue', label: 'Đã quá hạn' },
    { value: 'days_to_close', label: 'Ngày để chốt' },
];

// Dimensions (Các trường để group - Thêm hàng)
const DIMENSIONS = [
    { value: 'status', label: 'Giai đoạn', hasSubmenu: false },
    { value: 'salesRep', label: 'Chuyên viên sales', hasSubmenu: false },
    { value: 'salesTeam', label: 'Bộ phận sales', hasSubmenu: false },
    { value: 'city', label: 'Thành phố', hasSubmenu: false },
    { value: 'source', label: 'Nguồn', hasSubmenu: false },
    { value: 'program', label: 'Chương trình', hasSubmenu: false },
    { value: 'createdDate', label: 'Ngày tạo', hasSubmenu: true },
    { value: 'expectedCloseDate', label: 'Ngày đóng dự kiến', hasSubmenu: true },
];

// Date granularities
const DATE_GRANULARITIES = [
    { value: 'year', label: 'Năm' },
    { value: 'quarter', label: 'Quý' },
    { value: 'month', label: 'Tháng' },
    { value: 'week', label: 'Tuần' },
    { value: 'day', label: 'Ngày' },
];

const LeadPivotTable: React.FC<LeadPivotTableProps> = ({ leads }) => {
    // State
    const [selectedMeasures, setSelectedMeasures] = useState<string[]>(['count', 'sum_value']);
    const [showMeasureDropdown, setShowMeasureDropdown] = useState(false);
    const [showDimensionDropdown, setShowDimensionDropdown] = useState<string | null>(null);
    const [hoveredDimension, setHoveredDimension] = useState<string | null>(null);

    // Row dimensions
    const [rowDimensions, setRowDimensions] = useState<Array<{ field: string, granularity?: string }>>([]);

    // Expanded rows (stores which row keys are expanded)
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    // Helper: Get value from lead
    const getValue = (lead: ILead, field: string, granularity?: string): string => {
        if (field === 'createdDate' || field === 'expectedCloseDate') {
            const dateStr = field === 'createdDate' ? lead.createdAt : lead.expectedClosingDate;
            if (!dateStr) return '(Chưa xác định)';
            const date = new Date(dateStr);

            if (granularity === 'year') return date.getFullYear().toString();
            if (granularity === 'quarter') return `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
            if (granularity === 'month') return date.toLocaleString('vi-VN', { month: '2-digit', year: 'numeric' });
            if (granularity === 'week') return `W${Math.ceil(date.getDate() / 7)} ${date.toLocaleString('vi-VN', { month: 'short', year: 'numeric' })}`;
            if (granularity === 'day') return date.toLocaleDateString('vi-VN');
            return date.toLocaleDateString('vi-VN');
        }

        if (field === 'salesRep') return lead.ownerId || '(Chưa phân)';
        if (field === 'city') return (lead as any).city || '(Chưa xác định)';

        // @ts-ignore
        const val = lead[field];
        return val ? String(val) : '(Chưa xác định)';
    };

    // Calculate measure value
    const calculateMeasure = (leads: ILead[], measure: string): number => {
        if (measure === 'count') return leads.length;
        if (measure === 'sum_value') return leads.reduce((sum, l) => sum + (l.value || 0), 0);
        if (measure === 'weighted_value') return leads.reduce((sum, l) => sum + (l.value || 0) * 0.5, 0);
        if (measure === 'expected_revenue') return leads.reduce((sum, l) => sum + (l.value || 0) * 0.5, 0);
        if (measure === 'overdue') {
            return leads.filter(l => l.expectedClosingDate && new Date(l.expectedClosingDate) < new Date()).length;
        }
        if (measure === 'days_to_close') {
            const total = leads.reduce((sum, l) => {
                if (l.expectedClosingDate) {
                    const days = Math.floor((new Date(l.expectedClosingDate).getTime() - new Date(l.createdAt).getTime()) / (1000 * 60 * 60 * 24));
                    return sum + days;
                }
                return sum;
            }, 0);
            return leads.length > 0 ? total / leads.length : 0;
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

    // Group leads by a dimension
    const groupLeadsByDimension = (leads: ILead[], dimension: { field: string, granularity?: string }) => {
        const groups = new Map<string, ILead[]>();

        leads.forEach(lead => {
            const key = getValue(lead, dimension.field, dimension.granularity);
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key)!.push(lead);
        });

        return Array.from(groups.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, groupLeads]) => ({ key, leads: groupLeads }));
    };

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

    // Add row dimension
    const addRowDimension = (field: string, granularity?: string) => {
        setRowDimensions([...rowDimensions, { field, granularity }]);
        setShowDimensionDropdown(null);
        setHoveredDimension(null);
    };

    // Toggle row expansion
    const toggleRowExpansion = (rowKey: string) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(rowKey)) {
            newExpanded.delete(rowKey);
        } else {
            newExpanded.add(rowKey);
        }
        setExpandedRows(newExpanded);
    };

    // Recursively render rows
    const renderRows = (
        leadsToGroup: ILead[],
        dimensionIndex: number,
        parentKey: string = '',
        level: number = 0
    ): React.ReactNode[] => {
        if (dimensionIndex >= rowDimensions.length) {
            return [];
        }

        const dimension = rowDimensions[dimensionIndex];
        const groups = groupLeadsByDimension(leadsToGroup, dimension);
        const rows: React.ReactNode[] = [];

        groups.forEach(({ key: groupLabel, leads: groupLeads }, groupIndex) => {
            const rowKey = parentKey ? `${parentKey}>${groupLabel}` : `dim${dimensionIndex}-${groupLabel}`;
            const isExpanded = expandedRows.has(rowKey);
            const hasMoreDimensions = dimensionIndex < rowDimensions.length - 1;
            const canExpand = hasMoreDimensions;

            // Render this row
            rows.push(
                <tr key={rowKey} className="hover:bg-slate-50">
                    <td className="border border-slate-300 p-2" style={{ paddingLeft: `${8 + level * 20}px` }}>
                        <div className="flex items-center gap-2">
                            {canExpand ? (
                                <button
                                    onClick={() => toggleRowExpansion(rowKey)}
                                    className="p-0.5 hover:bg-slate-200 rounded"
                                >
                                    {isExpanded ? <Minus size={14} /> : <Plus size={14} />}
                                </button>
                            ) : (
                                <span className="w-4" />
                            )}
                            <span className="font-medium">{groupLabel}</span>
                        </div>
                    </td>
                    {selectedMeasures.map(measure => (
                        <td key={`${rowKey}-${measure}`} className="border border-slate-300 p-2 text-right font-mono">
                            {formatMeasure(calculateMeasure(groupLeads, measure), measure)}
                        </td>
                    ))}
                </tr>
            );

            // Render sub-rows if expanded
            if (isExpanded && hasMoreDimensions) {
                rows.push(...renderRows(groupLeads, dimensionIndex + 1, rowKey, level + 1));
            }
        });

        return rows;
    };

    // Calculate grand totals
    const grandTotals = useMemo(() => {
        const totals: Record<string, number> = {};
        selectedMeasures.forEach(measure => {
            totals[measure] = calculateMeasure(leads, measure);
        });
        return totals;
    }, [leads, selectedMeasures]);

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
                                        onClick={() => setShowDimensionDropdown(showDimensionDropdown === 'header' ? null : 'header')}
                                        className="p-0.5 hover:bg-slate-200 rounded"
                                    >
                                        <Plus size={14} />
                                    </button>
                                    Tổng

                                    {/* Dimension Dropdown */}
                                    {showDimensionDropdown === 'header' && (
                                        <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded shadow-lg z-30 min-w-[200px] max-h-[400px] overflow-y-auto">
                                            {DIMENSIONS.map(dim => (
                                                <div
                                                    key={dim.value}
                                                    className="relative"
                                                    onMouseEnter={() => dim.hasSubmenu && setHoveredDimension(dim.value)}
                                                    onMouseLeave={() => setHoveredDimension(null)}
                                                >
                                                    <button
                                                        onClick={() => !dim.hasSubmenu && addRowDimension(dim.value)}
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
                                                                    onClick={() => addRowDimension(dim.value, gran.value)}
                                                                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                                                                >
                                                                    {gran.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
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
                        {rowDimensions.length > 0 ? (
                            <>
                                {renderRows(leads, 0)}

                                {/* Grand Total */}
                                <tr className="bg-slate-800 text-white font-bold">
                                    <td className="border border-slate-600 p-2">Tổng</td>
                                    {selectedMeasures.map(measure => (
                                        <td key={measure} className="border border-slate-600 p-2 text-right font-mono text-yellow-300">
                                            {formatMeasure(grandTotals[measure], measure)}
                                        </td>
                                    ))}
                                </tr>
                            </>
                        ) : (
                            // No dimensions - just show total
                            <tr className="bg-slate-100 font-bold">
                                <td className="border border-slate-300 p-2">Tổng</td>
                                {selectedMeasures.map(measure => (
                                    <td key={measure} className="border border-slate-300 p-2 text-right font-mono text-blue-700">
                                        {formatMeasure(grandTotals[measure], measure)}
                                    </td>
                                ))}
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default LeadPivotTable;
