import React, { useState } from 'react';
import {
    Search,
    Filter,
    ChevronLeft,
    ChevronRight,
    MoreHorizontal,
    Plus,
    AlertCircle,
    CheckCircle2,
    Undo2,
    Clock,
    MessageSquare
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';

// Mock Data
const REFUNDS = [
    {
        id: 'REF-92817',
        createdDate: '24/10/2023',
        studentName: 'Phạm Văn Hùng',
        contractCode: 'HD-2024-001',
        program: 'Du học Đức',
        totalPaid: 45000000,
        refundRequest: 12000000,
        approvedAmount: 12000000,
        reason: 'Rút hồ sơ (Withdrawal)',
        status: 'pending_accountant', // wait_sale, pending_accountant, approved, rejected
        log: [
            { user: 'Sale Admin', action: 'Tạo yêu cầu', time: '24/10/2023 09:00' },
            { user: 'Sale Leader', action: 'Đã duyệt sơ bộ', time: '24/10/2023 10:30' }
        ]
    },
    {
        id: 'REF-92815',
        createdDate: '22/10/2023',
        studentName: 'Nguyễn Thị Lan',
        contractCode: 'HD-2024-042',
        program: 'Tiếng Đức A1',
        totalPaid: 8000000,
        refundRequest: 2000000,
        approvedAmount: 2000000,
        reason: 'Điều chỉnh Học bổng',
        status: 'approved',
        log: [
            { user: 'Sale Admin', action: 'Tạo yêu cầu', time: '22/10/2023 14:00' },
            { user: 'Kế toán trưởng', action: 'Đã duyệt chi', time: '23/10/2023 09:15' }
        ]
    },
    {
        id: 'REF-92818',
        createdDate: '20/10/2023',
        studentName: 'Trần Minh Tuấn',
        contractCode: 'HD-2023-891',
        program: 'Du học nghề Úc',
        totalPaid: 4000000,
        refundRequest: 4000000,
        approvedAmount: 0,
        reason: 'Trùng giao dịch',
        status: 'rejected',
        log: [
            { user: 'System', action: 'Auto-detect Duplicate', time: '20/10/2023 11:00' },
            { user: 'Kế toán', action: 'Từ chối: Đã xử lý ở giao dịch khác', time: '20/10/2023 11:05' }
        ]
    },
    {
        id: 'REF-92821',
        createdDate: '24/10/2023',
        studentName: 'Lê Hoàng',
        contractCode: 'HD-2024-112',
        program: 'Workshop Kỹ năng',
        totalPaid: 25000000,
        refundRequest: 5000000,
        approvedAmount: 5000000,
        reason: 'Chuyển đổi khóa học',
        status: 'wait_sale',
        log: [
            { user: 'Sale Rep', action: 'Tạo yêu cầu', time: '24/10/2023 15:00' }
        ]
    },
];

const FinanceRefunds: React.FC = () => {
    const { user } = useAuth();
    const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, WAIT_SALE, PENDING_ACCOUNTANT, APPROVED
    const [showLogModal, setShowLogModal] = useState<any>(null);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'wait_sale':
                return <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-700 text-xs font-bold border border-yellow-200">Chờ Sale Duyệt</span>;
            case 'pending_accountant':
                return <span className="px-2 py-1 rounded bg-orange-100 text-orange-700 text-xs font-bold border border-orange-200 animate-pulse">Chờ Kế Toán Duyệt</span>;
            case 'approved':
                return <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200">Đã Hoàn Tiền</span>;
            case 'rejected':
                return <span className="px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-bold border border-red-200">Đã Từ Chối</span>;
            default:
                return <span className="px-2 py-1 rounded bg-slate-100 text-slate-600 text-xs font-bold">Unknown</span>;
        }
    };

    const filteredData = REFUNDS.filter(item => {
        if (statusFilter === 'ALL') return true;
        return item.status === statusFilter.toLowerCase();
    });

    const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

    return (
        <div className="p-8 max-w-[1600px] mx-auto bg-[#F8FAFC] min-h-screen font-sans text-slate-900">

            {/* Header - Simplified */}
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Quản lý Yêu cầu Hoàn tiền</h1>
                    <p className="text-slate-500">Xử lý và phê duyệt các yêu cầu hoàn tiền, rút phí từ học viên.</p>
                </div>
                <div>
                    <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-bold shadow-sm transition-all">
                        <Plus size={18} /> Tạo Yêu cầu mới
                    </button>
                </div>
            </div>

            {/* Main Table Container */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

                {/* Toolbar & Filters */}
                <div className="p-4 border-b border-slate-200 flex flex-wrap gap-4 justify-between items-center bg-slate-50/50">
                    {/* Detailed Filter Tabs */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setStatusFilter('ALL')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${statusFilter === 'ALL' ? 'bg-slate-800 text-white shadow' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                        >
                            Tất cả
                        </button>
                        <button
                            onClick={() => setStatusFilter('wait_sale')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${statusFilter === 'wait_sale' ? 'bg-yellow-500 text-white shadow' : 'bg-white text-slate-600 border border-slate-200 hover:bg-yellow-50 hover:text-yellow-700'}`}
                        >
                            <Clock size={14} /> Chờ Sale duyệt
                        </button>
                        <button
                            onClick={() => setStatusFilter('pending_accountant')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${statusFilter === 'pending_accountant' ? 'bg-orange-500 text-white shadow' : 'bg-white text-slate-600 border border-slate-200 hover:bg-orange-50 hover:text-orange-700'}`}
                        >
                            <AlertCircle size={14} /> Chờ Kế toán duyệt
                        </button>
                        <button
                            onClick={() => setStatusFilter('approved')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${statusFilter === 'approved' ? 'bg-emerald-600 text-white shadow' : 'bg-white text-slate-600 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700'}`}
                        >
                            <CheckCircle2 size={14} /> Đã hoàn tiền
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            placeholder="Tìm theo tên hoặc mã yêu cầu..."
                            className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                    </div>
                </div>

                {/* Table Content */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-[#F8FAFC] border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-[120px]">Mã Yêu cầu</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Học viên</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Mã HĐ Gốc</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Tổng đã đóng</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Yêu cầu hoàn</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Lý do</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Trạng thái</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-[100px]">Log/Ghi chú</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredData.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4 align-top">
                                        <div className="font-mono text-sm font-bold text-blue-600">{item.id}</div>
                                        <div className="text-xs text-slate-400 mt-1">{item.createdDate}</div>
                                    </td>
                                    <td className="px-6 py-4 align-top">
                                        <div className="text-sm font-bold text-slate-900">{item.studentName}</div>
                                        <div className="text-xs text-slate-500 mt-0.5">{item.program}</div>
                                    </td>
                                    <td className="px-6 py-4 align-top text-sm font-medium text-slate-600">
                                        {item.contractCode}
                                    </td>
                                    <td className="px-6 py-4 align-top text-right text-sm text-slate-500">
                                        {formatCurrency(item.totalPaid)}
                                    </td>
                                    <td className="px-6 py-4 align-top text-right">
                                        <div className="text-sm font-bold text-orange-600">{formatCurrency(item.refundRequest)}</div>
                                    </td>
                                    <td className="px-6 py-4 align-top">
                                        <span className="inline-block px-2 py-1 rounded bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200 max-w-[150px] truncate" title={item.reason}>
                                            {item.reason}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 align-top text-center">
                                        {getStatusBadge(item.status)}
                                    </td>
                                    {/* Log Column */}
                                    <td className="px-6 py-4 align-top text-center">
                                        <button
                                            onClick={() => setShowLogModal(item)}
                                            className="p-1.5 rounded hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
                                            title="Xem lịch sử xử lý"
                                        >
                                            <MessageSquare size={18} />
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 align-top text-right">
                                        <div className="flex justify-end items-center gap-2 opacity-100">
                                            {item.status === 'pending_accountant' && (
                                                <button className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded shadow-sm flex items-center gap-1">
                                                    <Undo2 size={14} /> Duyệt hoàn tiền
                                                </button>
                                            )}
                                            <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded">
                                                <MoreHorizontal size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredData.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="py-12 text-center text-slate-400 italic">
                                        Không tìm thấy yêu cầu hoàn tiền nào trong bộ lọc này.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination - Simplified */}
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
                    <span className="text-xs text-slate-500 font-bold">Tổng số: {filteredData.length} bản ghi</span>
                    <div className="flex gap-1">
                        <button className="p-1 rounded hover:bg-slate-200 text-slate-400"><ChevronLeft size={18} /></button>
                        <button className="p-1 rounded hover:bg-slate-200 text-slate-400"><ChevronRight size={18} /></button>
                    </div>
                </div>
            </div>

            {/* LOG MODAL */}
            {showLogModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <Clock size={16} className="text-blue-500" /> Lịch sử xử lý: {showLogModal.id}
                            </h3>
                            <button onClick={() => setShowLogModal(null)} className="text-slate-400 hover:text-slate-600 font-bold text-xl">&times;</button>
                        </div>
                        <div className="p-0">
                            <div className="relative">
                                {/* Timeline Line */}
                                <div className="absolute left-8 top-4 bottom-4 w-0.5 bg-slate-100"></div>

                                <ul className="py-4 space-y-0">
                                    {showLogModal.log.map((log: any, idx: number) => (
                                        <li key={idx} className="relative pl-16 pr-6 py-3 hover:bg-slate-50 transition-colors">
                                            <div className="absolute left-6 top-4 w-4 h-4 rounded-full border-2 border-white bg-blue-500 shadow-sm z-10"></div>
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-bold text-sm text-slate-800">{log.action}</p>
                                                    <p className="text-xs text-slate-500">Bởi: <span className="font-semibold text-slate-700">{log.user}</span></p>
                                                </div>
                                                <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded">{log.time}</span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 text-right">
                            <button onClick={() => setShowLogModal(null)} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-100 text-sm">Đóng</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default FinanceRefunds;
