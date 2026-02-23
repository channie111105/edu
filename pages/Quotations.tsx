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
    Receipt,
    MoreHorizontal,
    Send
} from 'lucide-react';
import { IQuotation, QuotationStatus, UserRole } from '../types';
import { getQuotations } from '../utils/storage';
import { useAuth } from '../contexts/AuthContext';

const PRODUCT_FIX_MAP: Record<string, string> = {
    'Du h?c Ð?c - Combo A1-B1': 'Du học Đức - Combo A1-B1',
    'Khóa ti?ng Ð?c B1-B2': 'Khóa tiếng Đức B1-B2',
    'Combo Du h?c ngh? Úc': 'Combo Du học nghề Úc',
    'Du h?c Ð?c - Tr?n gói': 'Du học Đức - Trọn gói',
    'Ti?ng Ð?c A1-B1': 'Tiếng Đức A1-B1',
    'Khóa ti?ng Ð?c A2': 'Khóa tiếng Đức A2',
    'Combo Du h?c Ð?c': 'Combo Du học Đức'
};

const PRODUCT_TOKEN_FIXES: Array<[RegExp, string]> = [
    [/\bDu h\?c\b/gi, 'Du học'],
    [/\bti\?ng\b/gi, 'tiếng'],
    [/\bngh\?\b/gi, 'nghề'],
    [/\bTr\?n\b/g, 'Trọn'],
    [/\bÐ\?c\b/g, 'Đức']
];

const tryDecodeMojibake = (value: string) => {
    let current = value;
    for (let i = 0; i < 2; i += 1) {
        try {
            const decoded = decodeURIComponent(escape(current));
            if (!decoded || decoded === current) break;
            current = decoded;
        } catch {
            break;
        }
    }
    return current;
};

const normalizeBrokenProductText = (value?: string) => {
    let normalized = (value || '').trim();
    if (!normalized) return '';
    normalized = tryDecodeMojibake(normalized);
    Object.entries(PRODUCT_FIX_MAP).forEach(([bad, good]) => {
        if (normalized.includes(bad)) {
            normalized = normalized.split(bad).join(good);
        }
    });
    PRODUCT_TOKEN_FIXES.forEach(([pattern, replacement]) => {
        normalized = normalized.replace(pattern, replacement);
    });
    return normalized.replace(/\s+/g, ' ').trim();
};

const Quotations: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [quotations, setQuotations] = useState<IQuotation[]>([]);
    const [filterStatus, setFilterStatus] = useState<string>('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const userRole = user?.role as UserRole | undefined;
    const canConfirmSale = [UserRole.SALES_REP, UserRole.SALES_LEADER, UserRole.ADMIN, UserRole.FOUNDER].includes(userRole || UserRole.SALES_REP);
    const canLockOrder = userRole === UserRole.ACCOUNTANT;

    useEffect(() => {
        const loadData = () => {
            const data = getQuotations();
            console.log('Quotations loaded:', data);
            setQuotations(data || []);
        };
        loadData();
        window.addEventListener('educrm:quotations-changed', loadData as EventListener);
        return () => window.removeEventListener('educrm:quotations-changed', loadData as EventListener);
    }, []);

    const getStatusBadge = (status: QuotationStatus) => {
        switch (status) {
            case QuotationStatus.DRAFT:
                return <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">New Quotation</span>;
            case QuotationStatus.SENT:
                return <span className="bg-purple-50 text-purple-600 px-2 py-1 rounded text-xs font-bold">Sent</span>;
            case QuotationStatus.SALE_ORDER:
                return <span className="bg-green-50 text-green-600 px-2 py-1 rounded text-xs font-bold">Sale Order</span>;
            case QuotationStatus.SALE_CONFIRMED:
                return <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded text-xs font-bold">Sale Confirmed</span>;
            case QuotationStatus.LOCKED:
                return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-bold flex items-center gap-1"><Lock size={10} /> Locked</span>;
            default:
                return <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs">{status}</span>;
        }
    };

    const getContractStatusBadge = (status?: string) => {
        if (status === 'sale_confirmed') return <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded text-xs font-bold">Sale Confirmed</span>;
        if (status === 'signed_contract') return <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold">Da ky hop dong</span>;
        if (status === 'enrolled') return <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-bold">Enrolled</span>;
        if (status === 'active') return <span className="bg-green-50 text-green-700 px-2 py-1 rounded text-xs font-bold">Active</span>;
        return <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">Quotation</span>;
    };

    const getTransactionStatusBadge = (status?: IQuotation['transactionStatus']) => {
        if (status === 'CHO_DUYET') return <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded text-xs font-bold">GD: Chờ duyệt</span>;
        if (status === 'DA_DUYET') return <span className="bg-green-50 text-green-700 px-2 py-1 rounded text-xs font-bold">GD: Đã duyệt</span>;
        if (status === 'TU_CHOI') return <span className="bg-rose-50 text-rose-700 px-2 py-1 rounded text-xs font-bold">GD: Từ chối</span>;
        return <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">GD: NONE</span>;
    };

    const getPaymentDocSummary = (q: IQuotation) => {
        if (q.paymentDocuments?.method === 'CK') {
            const tx = q.paymentDocuments.bankTransactionCode || 'N/A';
            const confirm = q.paymentDocuments.bankConfirmationCode || 'N/A';
            return `CK | GD:${tx} | XN:${confirm}`;
        }
        if (q.paymentDocuments?.method === 'CASH') {
            const receipt = q.paymentDocuments.cashReceiptCode || 'N/A';
            const image = q.paymentDocuments.cashReceiptImage ? ` | Ảnh:${q.paymentDocuments.cashReceiptImage}` : '';
            return `TM | PT:${receipt}${image}`;
        }
        return q.paymentProof || 'Chưa có chứng từ';
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

    const shortenProductName = (value?: string, maxLen = 26) => {
        const text = (value || '').trim();
        if (!text) return '-';
        if (text.length <= maxLen) return text;
        return `${text.slice(0, maxLen)}...`;
    };

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
                            onClick={() => setFilterStatus(QuotationStatus.SALE_CONFIRMED)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filterStatus === QuotationStatus.SALE_CONFIRMED ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            Sale Confirmed
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
                                        <td className="px-6 py-4 font-bold text-slate-900">
                                            <div className="max-w-[190px] truncate whitespace-nowrap" title={q.customerName}>
                                                {q.customerName}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 text-sm">
                                            <div className="max-w-[260px] truncate whitespace-nowrap" title={normalizeBrokenProductText(q.product)}>
                                                {shortenProductName(normalizeBrokenProductText(q.product))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-900 whitespace-nowrap">{q.finalAmount.toLocaleString('vi-VN')} đ</td>
                                        <td className="px-6 py-4 text-slate-500 text-sm font-medium">
                                            {new Date(q.createdAt).toLocaleDateString('vi-VN')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {getStatusBadge(q.status)}
                                                {getTransactionStatusBadge(q.transactionStatus)}
                                                {getContractStatusBadge(q.contractStatus)}
                                                {q.needInvoice && (
                                                    <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded text-xs font-bold">Can in hoa don VAT</span>
                                                )}
                                            </div>
                                            <div className="text-[11px] text-slate-500 mt-1 truncate" title={getPaymentDocSummary(q)}>
                                                {getPaymentDocSummary(q)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                                {/* Actions per status logic */}
                                                {q.status === QuotationStatus.SENT && (
                                                    <button
                                                        title="Confirm Sale"
                                                        disabled={!canConfirmSale}
                                                        className="p-2 text-green-600 hover:bg-green-50 disabled:text-slate-300 disabled:hover:bg-transparent rounded-full transition-colors"
                                                        onClick={() => navigate(`/contracts/quotations/${q.id}?action=confirm`)}
                                                    >
                                                        <CheckCircle2 size={18} />
                                                    </button>
                                                )}
                                                {(q.status === QuotationStatus.SALE_ORDER || q.status === QuotationStatus.SALE_CONFIRMED) && (
                                                    <>
                                                        <button
                                                            title="In phiếu thu (SO)"
                                                            className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                                                            onClick={() => navigate(`/contracts/quotations/${q.id}?action=print_receipt`)}
                                                        >
                                                            <Receipt size={18} />
                                                        </button>
                                                        <button
                                                            title="Lock Data (Accountant)"
                                                            disabled={!canLockOrder || q.transactionStatus !== 'DA_DUYET'}
                                                            className="p-2 text-gray-600 hover:bg-gray-100 disabled:text-slate-300 disabled:hover:bg-transparent rounded-full transition-colors"
                                                            onClick={() => navigate(`/contracts/quotations/${q.id}?action=lock`)}
                                                        >
                                                            <Lock size={18} />
                                                        </button>
                                                    </>
                                                )}
                                                <button
                                                    title={q.status === QuotationStatus.LOCKED ? 'In hợp đồng' : 'Cần khóa SO trước khi in hợp đồng'}
                                                    disabled={q.status !== QuotationStatus.LOCKED}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 disabled:text-slate-300 disabled:hover:bg-transparent rounded-full transition-colors"
                                                    onClick={() => navigate(`/contracts/quotations/${q.id}/contract`)}
                                                >
                                                    <Printer size={18} />
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

