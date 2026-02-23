import React, { useState, useEffect, useMemo } from 'react';
import { IContact, IDeal, IContract, DealStage, ContractStatus } from '../types';
import {
    X, User, Phone, Mail, MapPin, Building, Calendar,
    MessageSquare, Save, Clock, Briefcase, FileText,
    CreditCard, ExternalLink, Plus, DollarSign, Receipt
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getDeals, getContracts, getContactById } from '../utils/storage';
import CreateMeetingModal from './CreateMeetingModal';
import { MeetingCustomerOption } from '../utils/meetingHelpers';

interface ContactDrawerProps {
    contact: IContact | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: (updatedContact: IContact) => void;
}

const ContactDrawer: React.FC<ContactDrawerProps> = ({ contact: initialContact, isOpen, onClose, onUpdate }) => {
    const { user } = useAuth();
    const [contact, setContact] = useState<IContact | null>(null);
    const [activeTab, setActiveTab] = useState<'transactions' | 'notes' | 'files'>('transactions');
    const [deals, setDeals] = useState<IDeal[]>([]);
    const [contracts, setContracts] = useState<IContract[]>([]);
    const [isCreateMeetingModalOpen, setIsCreateMeetingModalOpen] = useState(false);

    // Notes State
    const [noteContent, setNoteContent] = useState('');

    useEffect(() => {
        if (initialContact) {
            setContact(initialContact);
            loadRelatedData(initialContact.id);
        }
    }, [initialContact]);

    const loadRelatedData = (contactId: string) => {
        // 1. Get Deals linked to this contact
        // Assuming contact.id matches deal.leadId (unified ID system) or we check contact.dealIds
        const allDeals = getDeals();
        const relatedDeals = allDeals.filter(d => d.leadId === contactId || (initialContact?.dealIds || []).includes(d.id));
        setDeals(relatedDeals);

        // 2. Get Contracts linked to these deals
        const allContracts = getContracts();
        const relatedDealIds = relatedDeals.map(d => d.id);
        const relatedContracts = allContracts.filter(c => relatedDealIds.includes(c.dealId));
        setContracts(relatedContracts);
    };

    const financialStats = useMemo(() => {
        const totalDealValue = deals.reduce((sum, d) => sum + (d.value || 0), 0);
        const totalContractValue = contracts.reduce((sum, c) => sum + (c.totalValue || 0), 0);

        const totalPaid = contracts.reduce((sum, c) => sum + (c.paidValue || 0), 0);
        const totalDebt = totalContractValue - totalPaid;

        return {
            totalDealValue,
            contractCount: contracts.length,
            dealCount: deals.length,
            meetingCount: (contact?.activities || []).filter((a: any) => a.type === 'meeting').length, // Mock logic
            totalPaid,
            totalDebt
        };
    }, [deals, contracts, contact]);

    if (!isOpen || !contact) return null;

    const lockedMeetingCustomer: MeetingCustomerOption = {
        key: `contact:${contact.id}`,
        id: contact.id,
        source: 'contact',
        name: contact.name,
        phone: contact.phone,
        campus: contact.company || contact.city || 'Hanoi',
        address: contact.address || 'N/A',
        contactId: contact.id
    };

    const handleChange = (field: keyof IContact, value: any) => {
        const updated = { ...contact, [field]: value };
        setContact(updated);
    };

    const handleSave = () => {
        if (contact) {
            onUpdate(contact);
            onClose();
        }
    };

    const handleAddNote = () => {
        if (!noteContent.trim()) return;

        const newNote = {
            id: `note-${Date.now()}`,
            type: 'note',
            user: user?.name || 'Admin',
            timestamp: new Date().toISOString(),
            description: noteContent,
            title: 'Ghi chú'
        };

        const updatedActivities = [newNote, ...(contact.activities || [])];
        const updatedContact = { ...contact, activities: updatedActivities };

        setContact(updatedContact);
        onUpdate(updatedContact);
        setNoteContent('');
    };

    // Helper to get initials
    const getInitials = (name: string) => {
        const names = name.split(' ');
        if (names.length >= 2) return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    // Helper for formatting currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center font-sans">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Panel - Centered & Large */}
            <div className="relative w-[95%] h-[92%] bg-white rounded-xl shadow-2xl flex overflow-hidden animate-in zoom-in-95 duration-200">

                {/* LEFT COLUMN - Sidebar Info */}
                <div className="w-[320px] bg-slate-50 border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto custom-scrollbar">

                    {/* Header Profile */}
                    <div className="p-6 border-b border-slate-100 bg-white">
                        <div className="flex gap-4 items-center mb-4">
                            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl shrink-0">
                                {getInitials(contact.name)}
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-lg font-bold text-slate-800 truncate" title={contact.name}>{contact.name}</h2>
                                <p className="text-xs text-slate-500 font-medium truncate uppercase">
                                    {contact.targetCountry || 'Khách hàng'} {contact.source && `| ${contact.source}`}
                                </p>
                                <button className="text-xs text-blue-600 hover:text-blue-700 font-medium mt-1">
                                    Contact Details
                                </button>
                            </div>
                        </div>

                        <button className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-100 transition-colors border border-blue-200 uppercase">
                            <ExternalLink size={14} /> Hồ sơ học sinh
                        </button>
                    </div>

                    {/* Contact Info Form */}
                    <div className="p-6 space-y-6">
                        {/* Section: Contact Info */}
                        <section>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <User size={14} /> Thông tin chung
                            </h3>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-slate-400">Họ và tên</label>
                                        <input
                                            type="text"
                                            value={contact.name}
                                            onChange={(e) => handleChange('name', e.target.value)}
                                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-sm focus:border-blue-500 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-slate-400">Chức vụ / Job</label>
                                        <input
                                            type="text"
                                            value={contact.job || ''}
                                            onChange={(e) => handleChange('job', e.target.value)}
                                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-sm focus:border-blue-500 outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-slate-400">Số điện thoại</label>
                                    <div className="relative">
                                        <Phone size={14} className="absolute left-2.5 top-2 text-slate-400" />
                                        <input
                                            type="text"
                                            value={contact.phone}
                                            onChange={(e) => handleChange('phone', e.target.value)}
                                            className="w-full pl-8 pr-2 py-1.5 bg-white border border-slate-200 rounded text-sm focus:border-blue-500 outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-slate-400">Email</label>
                                    <div className="relative">
                                        <Mail size={14} className="absolute left-2.5 top-2 text-slate-400" />
                                        <input
                                            type="text"
                                            value={contact.email || ''}
                                            onChange={(e) => handleChange('email', e.target.value)}
                                            className="w-full pl-8 pr-2 py-1.5 bg-white border border-slate-200 rounded text-sm focus:border-blue-500 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Section: Address */}
                        <section>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <MapPin size={14} /> Địa chỉ & Công ty
                            </h3>
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-slate-400">Công ty / Tổ chức</label>
                                    <input
                                        type="text"
                                        value={contact.company || ''}
                                        onChange={(e) => handleChange('company', e.target.value)}
                                        placeholder="Nhập tên công ty..."
                                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-sm focus:border-blue-500 outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-slate-400">Địa chỉ</label>
                                    <input
                                        type="text"
                                        value={contact.address || ''}
                                        onChange={(e) => handleChange('address', e.target.value)}
                                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-sm focus:border-blue-500 outline-none"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-slate-400">Thành phố</label>
                                        <input
                                            type="text"
                                            value={contact.city || ''}
                                            onChange={(e) => handleChange('city', e.target.value)}
                                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-sm focus:border-blue-500 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-slate-400">Quốc gia mục tiêu</label>
                                        <input
                                            type="text"
                                            value={contact.targetCountry || ''}
                                            onChange={(e) => handleChange('targetCountry', e.target.value)}
                                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-sm focus:border-blue-500 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Section: Financial Stats */}
                        <section>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <DollarSign size={14} /> Chỉ số tài chính
                            </h3>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <div className="bg-white border rounded p-3 text-center">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase">DEAL (OPP)</div>
                                    <div className="text-xl font-bold text-blue-600">{financialStats.dealCount}</div>
                                </div>
                                <div className="bg-white border rounded p-3 text-center">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase">MEETING</div>
                                    <div className="text-xl font-bold text-purple-600">{financialStats.meetingCount}</div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="bg-green-50 border border-green-100 rounded p-3">
                                    <div className="flex justify-between items-center mb-1">
                                        <div className="flex items-center gap-2">
                                            <Receipt size={14} className="text-green-600" />
                                            <span className="text-xs font-bold text-green-700 uppercase">Tiền đã thu</span>
                                        </div>
                                    </div>
                                    <div className="text-lg font-bold text-green-700">{formatCurrency(financialStats.totalPaid)}</div>
                                </div>

                                <div className="bg-red-50 border border-red-100 rounded p-3 relative">
                                    {financialStats.totalDebt > 0 && (
                                        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                    )}
                                    <div className="flex justify-between items-center mb-1">
                                        <div className="flex items-center gap-2">
                                            <CreditCard size={14} className="text-red-600" />
                                            <span className="text-xs font-bold text-red-700 uppercase">Công nợ</span>
                                        </div>
                                    </div>
                                    <div className="text-lg font-bold text-red-700">{formatCurrency(financialStats.totalDebt)}</div>
                                </div>
                            </div>
                        </section>
                    </div>
                    <div className="p-4 border-t border-slate-200 bg-slate-50 sticky bottom-0">
                        <button
                            onClick={handleSave}
                            className="w-full py-2.5 bg-blue-600 text-white text-sm font-bold rounded shadow-sm hover:bg-blue-700 hover:shadow-md transition-all flex items-center justify-center gap-2"
                        >
                            <Save size={16} /> Lưu thay đổi
                        </button>
                    </div>

                </div>

                {/* RIGHT COLUMN - Main Content */}
                <div className="flex-1 flex flex-col bg-white">
                    {/* Header Controls */}
                    <div className="h-14 border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
                        {/* Tabs */}
                        <div className="flex h-full">
                            <button
                                onClick={() => setActiveTab('transactions')}
                                className={`px-4 text-sm font-medium h-full border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'transactions' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                <DollarSign size={16} /> Giao dịch & Hợp đồng
                            </button>
                            <button
                                onClick={() => setActiveTab('notes')}
                                className={`px-4 text-sm font-medium h-full border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'notes' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                <MessageSquare size={16} /> Chăm sóc & Notes
                            </button>
                            <button
                                onClick={() => setActiveTab('files')}
                                className={`px-4 text-sm font-medium h-full border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'files' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                <FileText size={16} /> Hồ sơ & File
                            </button>
                        </div>

                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto bg-slate-50/30 p-8 custom-scrollbar">

                        {/* TAB 1: TRANSACTIONS (DEALS & CONTRACTS) */}
                        {activeTab === 'transactions' && (
                            <div className="space-y-8 max-w-4xl mx-auto">

                                {/* 1. DEALS Section */}
                                <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Cơ hội (Deals/Opps)</h3>
                                        <button className="text-xs flex items-center gap-1 bg-white border border-blue-200 text-blue-600 px-3 py-1.5 rounded font-medium hover:bg-blue-50 transition-colors">
                                            <Plus size={14} /> Tạo Deal
                                        </button>
                                    </div>
                                    <div className="divide-y divide-slate-100">
                                        {deals.length === 0 ? (
                                            <div className="p-8 text-center text-slate-400 text-sm">Chưa có cơ hội nào.</div>
                                        ) : (
                                            deals.map(deal => (
                                                <div key={deal.id} className="px-6 py-4 flex justify-between items-center hover:bg-slate-50 transition-colors cursor-pointer group">
                                                    <div>
                                                        <h4 className="font-bold text-slate-800 text-sm group-hover:text-blue-600">{deal.title}</h4>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-xs text-slate-500">{deal.stage}</span>
                                                            <span className="text-xs text-slate-300">•</span>
                                                            <span className="text-xs text-slate-500">{new Date(deal.createdAt || '').toLocaleDateString('vi-VN')}</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-bold text-slate-900">{formatCurrency(deal.value)}</div>
                                                        <div className="text-xs text-slate-400 mt-1">Doanh thu dự kiến</div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* 2. CONTRACTS Section */}
                                <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Hợp đồng & Đơn hàng</h3>
                                        <button className="text-xs flex items-center gap-1 bg-white border border-green-200 text-green-600 px-3 py-1.5 rounded font-medium hover:bg-green-50 transition-colors">
                                            <Plus size={14} /> Tạo Hợp đồng
                                        </button>
                                    </div>
                                    <div className="divide-y divide-slate-100">
                                        {contracts.length === 0 ? (
                                            <div className="p-8 text-center border-dashed border-2 border-slate-100 m-4 rounded bg-slate-50/50">
                                                <p className="text-slate-400 text-sm italic">Chưa có hợp đồng nào.</p>
                                            </div>
                                        ) : (
                                            contracts.map(contract => (
                                                <div key={contract.id} className="px-6 py-4 flex justify-between items-center hover:bg-slate-50 transition-colors cursor-pointer group">
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-2 bg-green-50 text-green-600 rounded">
                                                            <FileText size={18} />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-slate-800 text-sm group-hover:text-green-600 flex items-center gap-2">
                                                                {contract.code}
                                                                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${contract.status === ContractStatus.ACTIVE
                                                                        ? 'bg-green-100 text-green-700 border-green-200'
                                                                        : 'bg-slate-100 text-slate-500 border-slate-200'
                                                                    }`}>
                                                                    {contract.status}
                                                                </span>
                                                            </h4>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="text-xs text-slate-500">Khách hàng: {contract.customerName}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-bold text-slate-900">{formatCurrency(contract.totalValue)}</div>
                                                        <div className="text-xs text-green-600 mt-1">Đã thu: {formatCurrency(contract.paidValue)}</div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* 3. PRODUCTS Section (Mock for now, or derived) */}
                                <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden opacity-50 pointer-events-none">
                                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Sản phẩm đã mua</h3>
                                    </div>
                                    <div className="p-6 text-center text-slate-400 text-sm">
                                        Chưa có sản phẩm.
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: NOTES & ACTIVITIES */}
                        {activeTab === 'notes' && (
                            <div className="max-w-3xl mx-auto">
                                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <MessageSquare className="text-blue-600" /> Ghi chú & Lịch sử chăm sóc
                                </h3>

                                {/* Input Note */}
                                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm mb-6">
                                    <button
                                        onClick={() => setIsCreateMeetingModalOpen(true)}
                                        className="mb-3 px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded hover:bg-emerald-700 transition-colors flex items-center gap-2"
                                    >
                                        <Calendar size={14} /> Tạo lịch hẹn
                                    </button>
                                    <textarea
                                        value={noteContent}
                                        onChange={e => setNoteContent(e.target.value)}
                                        placeholder="Nhập ghi chú chi tiết về khách hàng này..."
                                        className="w-full text-sm border-none focus:ring-0 outline-none resize-none min-h-[80px] text-slate-700 placeholder:text-slate-400"
                                    />
                                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100">
                                        <div className="flex gap-2">
                                            {/* Toolbar placeholders */}
                                            <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded">
                                                <Calendar size={16} />
                                            </button>
                                        </div>
                                        <button
                                            onClick={handleAddNote}
                                            disabled={!noteContent.trim()}
                                            className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                                        >
                                            <Save size={14} /> Lưu ghi chú
                                        </button>
                                    </div>
                                </div>

                                {/* Timeline List */}
                                <div className="space-y-6 relative before:absolute before:left-[19px] before:top-0 before:bottom-0 before:w-0.5 before:bg-slate-200">
                                    {(contact.activities || []).length === 0 && (
                                        <p className="text-center text-slate-400 text-sm py-8 ml-8">Chưa có lịch sử hoạt động.</p>
                                    )}
                                    {(contact.activities || []).map((act: any) => (
                                        <div key={act.id} className="relative pl-12 group">
                                            {/* Timeline dot */}
                                            <div className="absolute left-0 top-1 w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center z-10 shadow-sm group-hover:border-blue-400 transition-colors">
                                                <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" />
                                            </div>

                                            {/* Content Card */}
                                            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{act.user}</span>
                                                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                                        <Clock size={10} />
                                                        {new Date(act.timestamp).toLocaleString('vi-VN')}
                                                    </span>
                                                </div>
                                                <h4 className="font-bold text-slate-800 text-sm mb-1">{act.title || 'Ghi chú'}</h4>
                                                <p className="text-sm text-slate-600 whitespace-pre-wrap">{act.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* TAB 3: FILES (Placeholder) */}
                        {activeTab === 'files' && (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                <FileText size={48} className="mb-4 text-slate-200" />
                                <h3 className="font-bold text-slate-500">Hồ sơ & Tài liệu</h3>
                                <p className="text-sm mb-6">Chức năng quản lý file đang được phát triển.</p>
                                <button className="px-4 py-2 bg-slate-100 text-slate-600 rounded text-sm hover:bg-slate-200 font-medium">
                                    Upload tài liệu
                                </button>
                            </div>
                        )}

                    </div>
                </div>
            </div>

            <CreateMeetingModal
                isOpen={isCreateMeetingModalOpen}
                onClose={() => setIsCreateMeetingModalOpen(false)}
                salesPersonId={user?.id || 'u2'}
                salesPersonName={user?.name || 'Sales Rep'}
                lockedCustomer={lockedMeetingCustomer}
                onCreated={() => {
                    const refreshed = getContactById(contact.id);
                    if (refreshed) {
                        setContact(refreshed);
                        onUpdate(refreshed);
                    }
                }}
            />
        </div>
    );
};

export default ContactDrawer;
