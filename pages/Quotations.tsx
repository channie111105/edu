
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FileText,
    Plus,
    Search,
    Filter,
    CheckCircle2,
    Lock,
    Printer,
    MoreHorizontal,
    Eye,
    Send
} from 'lucide-react';
import { IQuotation, QuotationStatus } from '../types';
import { getQuotations } from '../utils/storage';

const Quotations: React.FC = () => {
    const navigate = useNavigate();
    const [quotations, setQuotations] = useState<IQuotation[]>([]);
    const [filterStatus, setFilterStatus] = useState<string>('ALL');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const data = getQuotations();
        console.log('Quotations loaded:', data);
        setQuotations(data || []);
    }, []);

    const getStatusBadge = (status: QuotationStatus) => {
        switch (status) {
            case QuotationStatus.DRAFT:
                return <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">New Quotation</span>;
            case QuotationStatus.SENT:
                return <span className="bg-purple-50 text-purple-600 px-2 py-1 rounded text-xs font-bold">Sent</span>;
            case QuotationStatus.SALE_ORDER:
                return <span className="bg-green-50 text-green-600 px-2 py-1 rounded text-xs font-bold">Sale Order</span>;
            case QuotationStatus.LOCKED:
                return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-bold flex items-center gap-1"><Lock size={10} /> Locked</span>;
            default:
                return <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs">{status}</span>;
        }
    };

    const filteredData = quotations.filter(q => {
        if (!q) return false;
        const matchesStatus = filterStatus === 'ALL' || q.status === filterStatus;
        const soCode = q.soCode || '';
        const customerName = q.customerName || '';
        const matchesSearch = soCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
            customerName.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] text-[#0d141b] font-sans">
            <div className="flex flex-col flex-1 p-6 lg:p-8 max-w-[1600px] mx-auto w-full gap-6">

                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Danh sách Báo giá</h1>
                        <p className="text-slate-500 mt-1">Quản lý toàn bộ báo giá và đơn hàng (SO).</p>
                    </div>
                    <button
                        onClick={() => navigate('/contracts/quotations/new')}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-bold shadow-sm flex items-center gap-2 transition-all"
                    >
                        <Plus size={18} /> Tạo Báo giá
                    </button>
                </div>

                {/* Filters */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative flex-1 w-full md:max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm theo mã SO, tên khách hàng..."
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                        <button
                            onClick={() => setFilterStatus('ALL')}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filterStatus === 'ALL' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            Tất cả
                        </button>
                        <button
                            onClick={() => setFilterStatus(QuotationStatus.DRAFT)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filterStatus === QuotationStatus.DRAFT ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            Mới tạo
                        </button>
                        <button
                            onClick={() => setFilterStatus(QuotationStatus.SENT)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filterStatus === QuotationStatus.SENT ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            Đã gửi
                        </button>
                        <button
                            onClick={() => setFilterStatus(QuotationStatus.SALE_ORDER)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filterStatus === QuotationStatus.SALE_ORDER ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            Sale Order
                        </button>
                        <button
                            onClick={() => setFilterStatus(QuotationStatus.LOCKED)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filterStatus === QuotationStatus.LOCKED ? 'bg-gray-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            Locked
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-bold">
                                <th className="px-6 py-4">Mã SO</th>
                                <th className="px-6 py-4">Khách hàng</th>
                                <th className="px-6 py-4">Sản phẩm</th>
                                <th className="px-6 py-4">Giá trị</th>
                                <th className="px-6 py-4">Ngày tạo</th>
                                <th className="px-6 py-4">Trạng thái</th>
                                <th className="px-6 py-4 text-right">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredData.length > 0 ? (
                                filteredData.map((q) => (
                                    <tr
                                        key={q.id}
                                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                                        onClick={() => navigate(`/contracts/quotations/${q.id}`)}
                                    >
                                        <td className="px-6 py-4 font-bold text-blue-600">{q.soCode}</td>
                                        <td className="px-6 py-4 font-bold text-slate-900">{q.customerName}</td>
                                        <td className="px-6 py-4 text-slate-600 text-sm">{q.product}</td>
                                        <td className="px-6 py-4 font-bold text-slate-900">{q.finalAmount.toLocaleString('vi-VN')} đ</td>
                                        <td className="px-6 py-4 text-slate-500 text-sm font-medium">
                                            {new Date(q.createdAt).toLocaleDateString('vi-VN')}
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(q.status)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                                {/* Actions per status logic */}
                                                {q.status === QuotationStatus.SENT && (
                                                    <button
                                                        title="Confirm Sale"
                                                        className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                                                        onClick={() => navigate(`/contracts/quotations/${q.id}?action=confirm`)}
                                                    >
                                                        <CheckCircle2 size={18} />
                                                    </button>
                                                )}
                                                {q.status === QuotationStatus.SALE_ORDER && (
                                                    <button
                                                        title="Lock Data (Accountant)"
                                                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                                                        onClick={() => navigate(`/contracts/quotations/${q.id}?action=lock`)}
                                                    >
                                                        <Lock size={18} />
                                                    </button>
                                                )}
                                                {q.status === QuotationStatus.LOCKED && (
                                                    <button
                                                        title="In Hợp đồng"
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                                        onClick={() => window.alert('Đang in hợp đồng...')}
                                                    >
                                                        <Printer size={18} />
                                                    </button>
                                                )}

                                                <button
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-full transition-colors"
                                                    onClick={() => navigate(`/contracts/quotations/${q.id}`)}
                                                >
                                                    <Eye size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="text-center py-12 text-slate-400 italic">
                                        Không tìm thấy báo giá nào phù hợp.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

            </div>
        </div>
    );
};

export default Quotations;
