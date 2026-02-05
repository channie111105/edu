import React, { useState, useEffect } from 'react';
import {
    X, Phone, Mail, MapPin, Building2, User, FileText,
    Calendar, DollarSign, Wallet, GraduationCap, Paperclip,
    Briefcase, MessageSquare, Plus, ExternalLink, Calculator
} from 'lucide-react';
import { IContact, IDeal, DealStage, IContract, ContractStatus } from '../types';
import { getDeals, getContracts } from '../utils/storage';

interface ContactDrawerProps {
    contact: IContact | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdate?: (updatedContact: IContact) => void;
}

const ContactDrawer: React.FC<ContactDrawerProps> = ({ contact, isOpen, onClose, onUpdate }) => {
    const [activeTab, setActiveTab] = useState<'sales' | 'care' | 'profile'>('sales');
    const [relatedDeals, setRelatedDeals] = useState<IDeal[]>([]);
    const [relatedContracts, setRelatedContracts] = useState<IContract[]>([]);

    // Stats
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [totalDebt, setTotalDebt] = useState(0);

    // Internal Note State
    const [internalNote, setInternalNote] = useState(contact?.notes || '');

    useEffect(() => {
        if (contact && isOpen) {
            // Load related data
            const allDeals = getDeals().filter(d => d.leadId === contact.id);
            const allContracts = getContracts(); // Assuming contracts will link via Deal or Contact ID in future. For now, filter mock.
            // Mock Linking Contracts: Filter contracts that belong to this contact's deals or name
            const myContracts = allContracts.filter(c =>
                (c.customerName === contact.name) ||
                allDeals.some(d => d.id === c.dealId)
            );

            setRelatedDeals(allDeals);
            setRelatedContracts(myContracts);
            setInternalNote(contact.notes || '');

            // Calculate Stats
            const revenue = myContracts.reduce((sum, c) => sum + (c.paidValue || 0), 0);
            const debt = myContracts.reduce((sum, c) => sum + (c.totalValue - c.paidValue), 0);
            setTotalRevenue(revenue);
            setTotalDebt(debt);
        }
    }, [contact, isOpen]);

    if (!isOpen || !contact) return null;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const getInitials = (name: string) => {
        const names = name.split(' ');
        if (names.length >= 2) return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center font-inter p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

            {/* Drawer Content (Modal Mode) */}
            <div className="relative w-[95%] h-[90%] bg-slate-50 flex flex-col animate-in zoom-in-95 duration-200 shadow-2xl rounded-xl overflow-hidden border border-slate-200">

                {/* HEADER */}
                <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-10 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                            {getInitials(contact.name)}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">{contact.name}</h2>
                            <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                                {contact.targetCountry && <span className="bg-slate-100 px-1.5 rounded">{contact.targetCountry}</span>}
                                <span className="text-slate-300">|</span>
                                <span className="uppercase">{contact.source || 'N/A'}</span>
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Student Link Button */}
                        <button className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors border border-indigo-200">
                            <GraduationCap size={16} />
                            HỒ SƠ HỌC SINH
                            <ExternalLink size={12} />
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-red-500 transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* BODY BODY */}
                <div className="flex-1 flex overflow-hidden">

                    {/* LEFT SIDEBAR (STATIC INFO) - 30% */}
                    <div className="w-[320px] bg-white border-r border-slate-200 flex flex-col overflow-y-auto">
                        {/* 1. Quick Info */}
                        <div className="p-6 border-b border-slate-100">
                            <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-wider">Thông tin liên hệ</h3>
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <Phone size={16} className="text-slate-400 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-bold text-slate-700">{contact.phone}</p>
                                        <p className="text-xs text-slate-400">Di động</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Mail size={16} className="text-slate-400 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-bold text-slate-700">{contact.email || 'Chưa có email'}</p>
                                        <p className="text-xs text-slate-400">Email cá nhân</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <MapPin size={16} className="text-slate-400 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-bold text-slate-700">{contact.address || contact.city || 'Chưa cập nhật'}</p>
                                        <p className="text-xs text-slate-400">Địa chỉ thường trú</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Briefcase size={16} className="text-slate-400 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-bold text-slate-700">{contact.job || 'Tự do'}</p>
                                        <p className="text-xs text-slate-400">Nghề nghiệp / Chức vụ</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Stats Summary */}
                        <div className="p-6 bg-slate-50">
                            <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-wider">Chỉ số tài chính</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold text-center">Deal (Opp)</p>
                                    <p className="text-xl font-bold text-blue-600 text-center mt-1">{relatedDeals.length}</p>
                                </div>
                                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold text-center">Meeting</p>
                                    <p className="text-xl font-bold text-purple-600 text-center mt-1">
                                        {(contact.activities || []).filter((a: any) => a.type === 'meeting').length}
                                    </p>
                                </div>
                                <div className="col-span-2 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold mb-1 flex items-center gap-1">
                                        <Wallet size={12} /> Tiền đã thu
                                    </p>
                                    <p className="text-lg font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
                                </div>
                                <div className="col-span-2 bg-white p-3 rounded-lg border border-red-100 shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-1 bg-red-100 rounded-bl-lg">
                                        <Calculator size={12} className="text-red-500" />
                                    </div>
                                    <p className="text-[10px] text-slate-400 uppercase font-bold mb-1 flex items-center gap-1">
                                        <DollarSign size={12} /> Công nợ
                                    </p>
                                    <p className="text-lg font-bold text-red-600">
                                        {formatCurrency(totalDebt)}
                                    </p>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* RIGHT CONTENT (TABS) - 70% */}
                    <div className="flex-1 flex flex-col bg-slate-50">
                        {/* Tab Navigation */}
                        <div className="flex border-b border-slate-200 bg-white px-6">
                            <button
                                onClick={() => setActiveTab('sales')}
                                className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'sales' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                <DollarSign size={16} /> Giao dịch & Hợp đồng
                            </button>
                            <button
                                onClick={() => setActiveTab('care')}
                                className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'care' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                <MessageSquare size={16} /> Chăm sóc & Notes
                            </button>
                            <button
                                onClick={() => setActiveTab('profile')}
                                className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'profile' ? 'border-amber-600 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                <FileText size={16} /> Hồ sơ & File
                            </button>
                        </div>

                        {/* Tab Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {activeTab === 'sales' && (
                                <div className="space-y-6">
                                    {/* Deals List */}
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="text-sm font-bold text-slate-700 uppercase">Cơ hội (Deals/Opps)</h3>
                                            <button className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-200 hover:bg-blue-100">+ Tạo Deal</button>
                                        </div>
                                        <div className="space-y-2">
                                            {relatedDeals.length > 0 ? relatedDeals.map(deal => (
                                                <div key={deal.id} className="bg-white p-3 rounded border border-slate-200 shadow-sm flex justify-between items-center group hover:border-blue-300">
                                                    <div>
                                                        <p className="text-sm font-bold text-blue-700">{deal.title}</p>
                                                        <p className="text-xs text-slate-500">{deal.stage} • {new Date(deal.createdAt || '').toLocaleDateString('vi-VN')}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-bold text-slate-700">{formatCurrency(deal.value)}</p>
                                                    </div>
                                                </div>
                                            )) : (
                                                <p className="text-xs text-slate-400 italic text-center py-4 bg-slate-100 rounded border border-dashed">Chưa có cơ hội nào.</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Contracts List */}
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="text-sm font-bold text-slate-700 uppercase">Hợp đồng & Đơn hàng</h3>
                                            <button className="text-[10px] font-bold bg-green-50 text-green-600 px-2 py-1 rounded border border-green-200 hover:bg-green-100">+ Tạo Hợp đồng</button>
                                        </div>
                                        <div className="space-y-2">
                                            {relatedContracts.length > 0 ? relatedContracts.map(contract => (
                                                <div key={contract.id} className="bg-white p-3 rounded border border-slate-200 shadow-sm">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-800">{contract.code}</p>
                                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${(contract.status as any) === 'Signed' || contract.status === ContractStatus.SIGNED ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{contract.status}</span>
                                                        </div>
                                                        <p className="text-sm font-bold text-green-600">{formatCurrency(contract.totalValue)}</p>
                                                    </div>
                                                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                                        <div className="bg-green-500 h-full" style={{ width: `${(contract.paidValue / contract.totalValue) * 100}%` }}></div>
                                                    </div>
                                                    <div className="flex justify-between mt-1 text-[10px] text-slate-500">
                                                        <span>Đã thu: {formatCurrency(contract.paidValue)}</span>
                                                        <span className="text-red-500 font-bold">Còn thiếu: {formatCurrency(contract.totalValue - contract.paidValue)}</span>
                                                    </div>
                                                </div>
                                            )) : (
                                                <p className="text-xs text-slate-400 italic text-center py-4 bg-slate-100 rounded border border-dashed">Chưa có hợp đồng nào.</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Products Purchased (Derived) */}
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-700 uppercase mb-3">Sản phẩm đã mua</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {relatedDeals.flatMap(d => d.products || []).length > 0 ?
                                                Array.from(new Set(relatedDeals.flatMap(d => d.products || []))).map((p, idx) => (
                                                    <span key={idx} className="px-2 py-1 bg-white border border-slate-200 text-xs font-medium rounded shadow-sm text-slate-700">{p}</span>
                                                )) : <span className="text-xs text-slate-400">Chưa có sản phẩm.</span>}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'care' && (
                                <div className="space-y-6">
                                    {/* Internal Notes */}
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-700 uppercase mb-3 flex items-center gap-2">
                                            Internal Notes (Ghi chú nội bộ)
                                        </h3>
                                        <textarea
                                            className="w-full h-32 p-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none resize-none bg-yellow-50"
                                            placeholder="Ghi chú về tính cách, sở thích, những điều cần lưu ý..."
                                            value={internalNote}
                                            onChange={(e) => setInternalNote(e.target.value)}
                                        ></textarea>
                                        <div className="mt-2 text-right">
                                            <button className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700">Lưu Ghi chú</button>
                                        </div>
                                    </div>

                                    {/* Activity Timeline (Mock) */}
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-700 uppercase mb-3">Lịch sử chăm sóc</h3>
                                        <div className="relative pl-4 border-l-2 border-slate-200 space-y-4">
                                            {(contact.activities || []).map((act: any, idx: number) => (
                                                <div key={idx} className="relative">
                                                    <div className="absolute -left-[21px] top-0 w-3 h-3 rounded-full bg-slate-300 ring-4 ring-white"></div>
                                                    <p className="text-xs font-bold text-slate-700">{act.title || 'Hoạt động'}</p>
                                                    <p className="text-[10px] text-slate-400">{new Date(act.timestamp).toLocaleString('vi-VN')}</p>
                                                    <p className="text-xs text-slate-600 mt-1 bg-white p-2 rounded border border-slate-100 shadow-sm">{act.description}</p>
                                                </div>
                                            ))}
                                            <div className="relative">
                                                <div className="absolute -left-[21px] top-0 w-3 h-3 rounded-full bg-blue-500 ring-4 ring-white"></div>
                                                <p className="text-xs font-bold text-blue-600">Khách hàng được tạo</p>
                                                <p className="text-[10px] text-slate-400">{new Date(contact.createdAt).toLocaleString('vi-VN')}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'profile' && (
                                <div className="space-y-6">
                                    <h3 className="text-sm font-bold text-slate-700 uppercase mb-3">Tài liệu & Hồ sơ</h3>

                                    {/* Mock Files Areas */}
                                    <div className="grid grid-cols-2 gap-3">
                                        {['CCCD/Passport', 'Bằng cấp cao nhất', 'Chứng chỉ ngoại ngữ', 'Ảnh thẻ 4x6'].map((label, idx) => (
                                            <div key={idx} className="border-2 border-dashed border-slate-200 rounded-lg p-4 flex flex-col items-center justify-center text-center hover:bg-slate-50 cursor-pointer transition-colors group">
                                                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mb-2 group-hover:bg-blue-100 transition-colors">
                                                    <Paperclip size={18} className="text-slate-400 group-hover:text-blue-600" />
                                                </div>
                                                <span className="text-xs font-bold text-slate-500 group-hover:text-slate-700">{label}</span>
                                                <span className="text-[10px] text-slate-400 mt-1">(Chưa có file)</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-6 flex items-center justify-center">
                                        <button className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-800">
                                            <Plus size={14} /> Tải lên tài liệu mới
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContactDrawer;
