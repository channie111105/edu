import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getContacts, getStudents, getContracts } from '../utils/storage';
import {
    Search,
    Phone,
    Mail,
    MapPin,
    Plus,
    Building2,
    User,
    GraduationCap,
    DollarSign,
    FileCheck,
    Users,
    ChevronRight
} from 'lucide-react';
import ContactDrawer from '../components/ContactDrawer';
import CreateContactModal from '../components/CreateContactModal';
import Toast from '../components/Toast';
import { IContact, ContractStatus } from '../types';
import { addContact } from '../utils/storage';

const MyContacts: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [contacts, setContacts] = useState<IContact[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'debt' | 'student' | 'signed'>('all');
    const [selectedContact, setSelectedContact] = useState<IContact | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [students, setStudents] = useState<any[]>([]);
    const [contracts, setContracts] = useState<any[]>([]);

    useEffect(() => {
        // Lấy dữ liệu từ bảng CONTACTS
        const allContacts = getContacts();
        setContacts(allContacts);

        // Lấy dữ liệu phụ để tính toán stats
        setStudents(getStudents());
        setContracts(getContracts());
    }, []);

    const filteredContacts = contacts.filter(c => {
        const matchesSearch = (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.phone || '').includes(searchTerm);

        if (!matchesSearch) return false;

        if (filterType === 'all') return true;
        if (filterType === 'student') return students.some(s => s.phone === c.phone);
        if (filterType === 'signed') return contracts.some(con => con.customerName === c.name && con.status === ContractStatus.SIGNED);
        if (filterType === 'debt') return contracts.some(con => con.customerName === c.name && con.paidValue < con.totalValue);

        return true;
    });

    // Stats calculation
    const stats = {
        total: contacts.length,
        students: students.length,
        signed: contracts.filter(con => con.status === ContractStatus.SIGNED).length,
        debt: contracts.filter(con => con.paidValue < con.totalValue).length
    };

    const refreshData = () => {
        setContacts(getContacts());
        setStudents(getStudents());
        setContracts(getContracts());
    };

    const handleSaveContact = (contactData: Partial<IContact>, createNew: boolean) => {
        try {
            addContact(contactData as IContact);
            setToast({ message: `Đã lưu contact: ${contactData.name}`, type: 'success' });
            refreshData();
            if (!createNew) {
                setIsCreateModalOpen(false);
            }
        } catch (error) {
            setToast({ message: 'Có lỗi xảy ra khi lưu contact', type: 'error' });
        }
    };

    const getInitials = (name: string) => {
        const names = name.split(' ');
        if (names.length >= 2) {
            return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] font-sans text-slate-900 p-6 overflow-hidden">

            {/* Header & Search */}
            <div className="flex flex-col gap-6 mb-8">
                <h1 className="text-2xl font-bold text-slate-800">Danh bạ (Contacts)</h1>
                <div className="relative w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Tìm kiếm theo tên hoặc số điện thoại..."
                        className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-blue-50 focus:border-blue-300 outline-none transition-all shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Infographic Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div
                    onClick={() => setFilterType('all')}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${filterType === 'all' ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-100' : 'bg-white border-slate-100 hover:border-blue-300 shadow-sm'}`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${filterType === 'all' ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-600'}`}>
                            <Users size={20} />
                        </div>
                        <div>
                            <p className={`text-[10px] font-bold uppercase tracking-wider ${filterType === 'all' ? 'text-blue-100' : 'text-slate-400'}`}>Tổng số khách</p>
                            <h3 className={`text-xl font-black ${filterType === 'all' ? 'text-white' : 'text-slate-800'}`}>{stats.total}</h3>
                        </div>
                    </div>
                </div>

                <div
                    onClick={() => setFilterType('student')}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${filterType === 'student' ? 'bg-emerald-600 border-emerald-600 shadow-lg shadow-emerald-100' : 'bg-white border-slate-100 hover:border-emerald-300 shadow-sm'}`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${filterType === 'student' ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-600'}`}>
                            <GraduationCap size={20} />
                        </div>
                        <div>
                            <p className={`text-[10px] font-bold uppercase tracking-wider ${filterType === 'student' ? 'text-emerald-100' : 'text-slate-400'}`}>Học sinh</p>
                            <h3 className={`text-xl font-black ${filterType === 'student' ? 'text-white' : 'text-slate-800'}`}>{stats.students}</h3>
                        </div>
                    </div>
                </div>

                <div
                    onClick={() => setFilterType('signed')}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${filterType === 'signed' ? 'bg-purple-600 border-purple-600 shadow-lg shadow-purple-100' : 'bg-white border-slate-100 hover:border-purple-300 shadow-sm'}`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${filterType === 'signed' ? 'bg-purple-500 text-white' : 'bg-purple-50 text-purple-600'}`}>
                            <FileCheck size={20} />
                        </div>
                        <div>
                            <p className={`text-[10px] font-bold uppercase tracking-wider ${filterType === 'signed' ? 'text-purple-100' : 'text-slate-400'}`}>Đã ký hợp đồng</p>
                            <h3 className={`text-xl font-black ${filterType === 'signed' ? 'text-white' : 'text-slate-800'}`}>{stats.signed}</h3>
                        </div>
                    </div>
                </div>

                <div
                    onClick={() => setFilterType('debt')}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${filterType === 'debt' ? 'bg-amber-600 border-amber-600 shadow-lg shadow-amber-100' : 'bg-white border-slate-100 hover:border-amber-300 shadow-sm'}`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${filterType === 'debt' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-600'}`}>
                            <DollarSign size={20} />
                        </div>
                        <div>
                            <p className={`text-[10px] font-bold uppercase tracking-wider ${filterType === 'debt' ? 'text-amber-100' : 'text-slate-400'}`}>Khách có công nợ</p>
                            <h3 className={`text-xl font-black ${filterType === 'debt' ? 'text-white' : 'text-slate-800'}`}>{stats.debt}</h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-y-auto pb-10">

                {/* 1. New Contact Card */}
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex flex-col items-center justify-center h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl hover:bg-white hover:border-blue-300 hover:shadow-sm transition-all group cursor-pointer"
                >
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center mb-1 group-hover:bg-blue-100 transition-colors">
                        <Plus size={20} className="text-slate-400 group-hover:text-blue-600" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 group-hover:text-blue-600 uppercase tracking-wide">New Contact</span>
                </button>

                {/* 2. Contact Cards */}
                {filteredContacts.map(contact => {
                    const student = students.find(s => s.phone === contact.phone);
                    const isSigned = contracts.some(con => con.customerName === contact.name && con.status === ContractStatus.SIGNED);
                    const hasDebt = contracts.some(con => con.customerName === contact.name && con.paidValue < con.totalValue);

                    return (
                        <div
                            key={contact.id}
                            className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col h-32 group cursor-pointer relative"
                            onClick={() => { setSelectedContact(contact); setIsDrawerOpen(true); }}
                        >
                            <div className="flex gap-3 items-start">
                                {/* Avatar */}
                                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-base shrink-0 uppercase">
                                    {getInitials(contact.name || 'Unknown')}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold text-slate-800 text-sm truncate group-hover:text-blue-600 transition-colors mr-2" title={contact.name}>
                                            {contact.name}
                                        </h3>
                                        <div className="flex gap-1 shrink-0">
                                            {isSigned && (
                                                <div title="Đã ký hợp đồng" className="text-purple-500">
                                                    <FileCheck size={14} />
                                                </div>
                                            )}
                                            {hasDebt && (
                                                <div title="Có công nợ" className="text-amber-500">
                                                    <DollarSign size={14} />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 mt-0.5">
                                        <p className="text-[9px] uppercase font-bold text-slate-400 flex items-center gap-1">
                                            {(contact as any).company ? <Building2 size={8} /> : <User size={8} />}
                                            {(contact as any).company ? 'Company' : 'Individual'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Contact Details - Compact */}
                            <div className="mt-2 space-y-0.5">
                                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                    <Mail size={10} className="text-slate-300 shrink-0" />
                                    <span className="truncate">{contact.email || 'No email'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                    <Phone size={10} className="text-slate-300 shrink-0" />
                                    <span>{contact.phone}</span>
                                </div>
                            </div>

                            {/* Student Status Badge - Floating or Bottom Right */}
                            {student && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/edu/students/${student.id}`);
                                    }}
                                    className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-md hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100 shadow-sm"
                                >
                                    <GraduationCap size={12} />
                                    <span className="text-[9px] font-black uppercase tracking-tight">Học sinh</span>
                                </button>
                            )}

                            {!student && (
                                <div className="absolute bottom-3 right-3 text-slate-200 group-hover:text-blue-400 transition-colors">
                                    <ChevronRight size={16} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <ContactDrawer
                contact={selectedContact}
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                onUpdate={(updated) => {
                    setContacts(prev => prev.map(c => c.id === updated.id ? updated : c));
                    setSelectedContact(updated);
                }}
            />
            <CreateContactModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSave={handleSaveContact}
            />

            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
};

export default MyContacts;
