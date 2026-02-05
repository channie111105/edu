import React, { useState, useEffect } from 'react';
import {
    Search, Plus, Filter, MoreHorizontal, ArrowUpCircle, ArrowDownCircle,
    FileText, CheckCircle2, AlertCircle, Eye, X, Upload
} from 'lucide-react';
import { IActualTransaction, TransactionType, TransactionStatus } from '../types';
import { getActualTransactions, addActualTransaction, updateActualTransaction } from '../utils/storage';

const MOCK_CATEGORIES = ['Học phí', 'Lương', 'Mặt bằng', 'Marketing', 'Văn phòng phẩm', 'Điện nước', 'Khác'];
const DEPARTMENTS = ['Sale', 'Marketing', 'Đào tạo', 'Vận hành (OPS)', 'Ban Giám Đốc'];

const FinanceTransactions: React.FC = () => {
    const [transactions, setTransactions] = useState<IActualTransaction[]>([]);
    const [filterType, setFilterType] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
    const [showModal, setShowModal] = useState(false);

    // Form State
    const [formData, setFormData] = useState<Partial<IActualTransaction>>({
        type: 'IN',
        date: new Date().toISOString().slice(0, 10),
        status: 'RECEIVED', // Default for IN
        department: 'Sale'
    });

    useEffect(() => {
        setTransactions(getActualTransactions());
    }, []);

    const filteredData = transactions.filter(t => {
        if (filterType !== 'ALL' && t.type !== filterType) return false;
        return true;
    });

    const handleCreate = () => {
        const newItem: IActualTransaction = {
            id: `TRX-${Date.now()}`,
            type: formData.type as TransactionType,
            category: formData.category || 'Khác',
            title: formData.title || 'Khoản thu/chi không tên',
            amount: Number(formData.amount) || 0,
            department: formData.department || 'Sale',
            date: formData.date || new Date().toISOString(),
            status: formData.status as TransactionStatus,
            proof: formData.proof,
            createdBy: 'Admin',
            createdAt: new Date().toISOString()
        };

        addActualTransaction(newItem);
        setTransactions(getActualTransactions());
        setShowModal(false);
        setFormData({ type: 'IN', date: new Date().toISOString().slice(0, 10), status: 'RECEIVED', department: 'Sale' });
    };

    const getStatusColor = (status: TransactionStatus) => {
        switch (status) {
            case 'RECEIVED': return 'bg-green-100 text-green-700'; // Đã thu
            case 'PLANNED': return 'bg-blue-50 text-blue-600 border border-blue-200'; // Dự thu
            case 'PAID': return 'bg-slate-800 text-white'; // Đã chi
            case 'APPROVED': return 'bg-purple-100 text-purple-700'; // Đã duyệt
            case 'PROPOSED': return 'bg-orange-100 text-orange-700'; // Đề xuất
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    const getStatusLabel = (status: TransactionStatus) => {
        switch (status) {
            case 'RECEIVED': return 'Đã thu';
            case 'PLANNED': return 'Dự thu';
            case 'PAID': return 'Đã chi';
            case 'APPROVED': return 'Đã duyệt';
            case 'PROPOSED': return 'Đề xuất';
            default: return status;
        }
    };

    return (
        <div className="p-6 max-w-[1600px] mx-auto font-sans text-slate-800 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Quản lý Thu Chi</h1>
                    <p className="text-slate-500 text-sm mt-1">Theo dõi dòng tiền thực tế và phê duyệt các khoản chi.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-sm"
                >
                    <Plus size={18} /> Tạo khoản
                </button>
            </div>

            {/* Toolbar */}
            <div className="flex justify-between items-center mb-6 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilterType('ALL')}
                        className={`px-4 py-2 rounded-md text-sm font-bold ${filterType === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                    >
                        Tất cả
                    </button>
                    <button
                        onClick={() => setFilterType('IN')}
                        className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 ${filterType === 'IN' ? 'bg-green-100 text-green-700' : 'text-slate-500 hover:bg-green-50'}`}
                    >
                        <ArrowDownCircle size={16} /> Thu (In)
                    </button>
                    <button
                        onClick={() => setFilterType('OUT')}
                        className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 ${filterType === 'OUT' ? 'bg-red-100 text-red-700' : 'text-slate-500 hover:bg-red-50'}`}
                    >
                        <ArrowUpCircle size={16} /> Chi (Out)
                    </button>
                </div>

                <div className="flex gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            placeholder="Tìm kiếm..."
                            className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-500 w-64"
                        />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex-1">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 w-24">Loại</th>
                            <th className="px-6 py-4">Tên khoản / Mô tả</th>
                            <th className="px-6 py-4">Số tiền</th>
                            <th className="px-6 py-4">Bộ phận</th>
                            <th className="px-6 py-4">Ngày tạo</th>
                            <th className="px-6 py-4 text-center">Trạng thái</th>
                            <th className="px-6 py-4 text-right">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredData.length > 0 ? (
                            filteredData.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4">
                                        {item.type === 'IN' ?
                                            <span className="text-green-600 font-bold flex items-center gap-1"><ArrowDownCircle size={14} /> Thu</span> :
                                            <span className="text-red-600 font-bold flex items-center gap-1"><ArrowUpCircle size={14} /> Chi</span>
                                        }
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-900">{item.title}</div>
                                        <div className="text-xs text-slate-500">{item.category}</div>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-slate-900">
                                        {item.amount.toLocaleString()} đ
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">{item.department}</td>
                                    <td className="px-6 py-4 text-slate-600">{new Date(item.date).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${getStatusColor(item.status)}`}>
                                            {item.status === 'PROPOSED' && <AlertCircle size={12} />}
                                            {item.status === 'RECEIVED' && <CheckCircle2 size={12} />}
                                            {getStatusLabel(item.status)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {item.proof && (
                                                <button title="Xem chứng từ" className="p-1.5 text-blue-600 hover:bg-blue-50 rounded">
                                                    <FileText size={16} />
                                                </button>
                                            )}
                                            {item.status === 'PROPOSED' && item.type === 'OUT' ? (
                                                <div className="flex gap-1">
                                                    <button className="bg-purple-600 text-white px-2 py-1 rounded text-xs font-bold hover:bg-purple-700">Duyệt</button>
                                                    <button className="bg-red-50 text-red-600 px-2 py-1 rounded text-xs font-bold hover:bg-red-100">Từ chối</button>
                                                </div>
                                            ) : (
                                                <button className="p-1.5 text-slate-400 hover:text-slate-600">
                                                    <Eye size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={7} className="text-center py-12 text-slate-500">
                                    Chưa có giao dịch nào.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-900">Tạo khoản Thu / Chi</h3>
                            <button onClick={() => setShowModal(false)}><X className="text-slate-400 hover:text-slate-600" /></button>
                        </div>

                        <div className="space-y-4">
                            {/* Type Selection */}
                            <div className="grid grid-cols-2 gap-4">
                                <label className={`border rounded-lg p-3 flex items-center justify-center gap-2 cursor-pointer font-bold transition-all ${formData.type === 'IN' ? 'bg-green-50 border-green-500 text-green-700' : 'hover:bg-slate-50'}`}>
                                    <input type="radio" name="type" className="hidden" onClick={() => setFormData(p => ({ ...p, type: 'IN', status: 'RECEIVED' }))} />
                                    <ArrowDownCircle size={18} /> Thu (In)
                                </label>
                                <label className={`border rounded-lg p-3 flex items-center justify-center gap-2 cursor-pointer font-bold transition-all ${formData.type === 'OUT' ? 'bg-red-50 border-red-500 text-red-700' : 'hover:bg-slate-50'}`}>
                                    <input type="radio" name="type" className="hidden" onClick={() => setFormData(p => ({ ...p, type: 'OUT', status: 'PROPOSED' }))} />
                                    <ArrowUpCircle size={18} /> Chi (Out)
                                </label>
                            </div>

                            {/* Category & Department */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Loại khoản</label>
                                    <select
                                        className="w-full p-2 border border-slate-300 rounded font-medium"
                                        value={formData.category}
                                        onChange={(e) => setFormData(p => ({ ...p, category: e.target.value }))}
                                    >
                                        <option value="">-- Chọn --</option>
                                        {MOCK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Bộ phận</label>
                                    <select
                                        className="w-full p-2 border border-slate-300 rounded font-medium"
                                        value={formData.department}
                                        onChange={(e) => setFormData(p => ({ ...p, department: e.target.value }))}
                                    >
                                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Tên khoản / Nội dung</label>
                                <input
                                    className="w-full p-2 border border-slate-300 rounded font-medium"
                                    placeholder="Ví dụ: Tiền điện tháng 2..."
                                    value={formData.title || ''}
                                    onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Số tiền</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        className="w-full p-2 pl-4 border border-slate-300 rounded font-bold text-lg text-slate-900"
                                        placeholder="0"
                                        value={formData.amount || ''}
                                        onChange={(e) => setFormData(p => ({ ...p, amount: Number(e.target.value) }))}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">VND</span>
                                </div>
                            </div>

                            {/* Proof Upload Mock */}
                            <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center cursor-pointer hover:bg-slate-50 transition-colors">
                                <Upload className="mx-auto text-slate-400 mb-2" size={24} />
                                <p className="text-xs text-slate-500">Tải lên chứng từ (Ảnh/PDF)</p>
                            </div>

                            {/* Dynamic Status Preview */}
                            <div className="bg-slate-50 p-3 rounded text-xs text-slate-500 flex justify-between items-center">
                                <span>Trạng thái khởi tạo:</span>
                                <span className="font-bold uppercase">
                                    {formData.type === 'IN' ? 'Đã thu (Received)' : 'Đề xuất (Proposed)'}
                                </span>
                            </div>

                            <button
                                onClick={handleCreate}
                                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 shadow-md mt-4"
                            >
                                Lưu dữ liệu
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FinanceTransactions;
