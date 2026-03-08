import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getContacts, getStudents, getContracts, addContact, saveContact } from '../utils/storage';
import {
    Search,
    Phone,
    Mail,
    Plus,
    Building2,
    User,
    GraduationCap,
    DollarSign,
    FileCheck,
    ChevronRight,
    LayoutList,
    LayoutGrid,
    SlidersHorizontal,
    Filter
} from 'lucide-react';
import ContactDrawer from '../components/ContactDrawer';
import CreateContactModal from '../components/CreateContactModal';
import Toast from '../components/Toast';
import { IContact, ContractStatus } from '../types';

type ContactFilter = 'all' | 'debt' | 'student' | 'signed';
type ViewMode = 'list' | 'card';

const ALL_COLUMNS: Array<{ id: string; label: string }> = [
    { id: 'name', label: 'Liên hệ' },
    { id: 'phone', label: 'SĐT' },
    { id: 'email', label: 'Email' },
    { id: 'company', label: 'Cơ sở/Công ty' },
    { id: 'city', label: 'Thành phố' },
    { id: 'source', label: 'Nguồn' },
    { id: 'student', label: 'Học sinh' },
    { id: 'signed', label: 'Đã ký HĐ' },
    { id: 'debt', label: 'Công nợ' },
    { id: 'createdAt', label: 'Ngày tạo' }
];

const DEFAULT_VISIBLE_COLUMNS = [
    'name',
    'phone',
    'email',
    'company',
    'city',
    'source',
    'student',
    'signed',
    'debt',
    'createdAt'
];

const MyContacts: React.FC = () => {
    const navigate = useNavigate();
    const [contacts, setContacts] = useState<IContact[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [contracts, setContracts] = useState<any[]>([]);

    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<ContactFilter>('all');
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_VISIBLE_COLUMNS);
    const [showColumnPicker, setShowColumnPicker] = useState(false);

    const [selectedContact, setSelectedContact] = useState<IContact | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const refreshData = () => {
        setContacts(getContacts());
        setStudents(getStudents());
        setContracts(getContracts());
    };

    useEffect(() => {
        refreshData();

        const syncAll = () => refreshData();
        window.addEventListener('educrm:contacts-changed', syncAll as EventListener);
        window.addEventListener('educrm:students-changed', syncAll as EventListener);
        window.addEventListener('educrm:contracts-changed', syncAll as EventListener);

        return () => {
            window.removeEventListener('educrm:contacts-changed', syncAll as EventListener);
            window.removeEventListener('educrm:students-changed', syncAll as EventListener);
            window.removeEventListener('educrm:contracts-changed', syncAll as EventListener);
        };
    }, []);

    const studentByPhone = useMemo(() => {
        const map = new Map<string, any>();
        students.forEach((student) => {
            if (student?.phone && !map.has(student.phone)) {
                map.set(student.phone, student);
            }
        });
        return map;
    }, [students]);

    const signedCountByName = useMemo(() => {
        const map = new Map<string, number>();
        contracts.forEach((contract) => {
            const customerName = String(contract?.customerName || '').trim();
            if (!customerName) return;
            if (contract?.status === ContractStatus.SIGNED) {
                map.set(customerName, (map.get(customerName) || 0) + 1);
            }
        });
        return map;
    }, [contracts]);

    const debtByName = useMemo(() => {
        const set = new Set<string>();
        contracts.forEach((contract) => {
            const customerName = String(contract?.customerName || '').trim();
            if (!customerName) return;
            const paidValue = Number(contract?.paidValue || 0);
            const totalValue = Number(contract?.totalValue || 0);
            if (paidValue < totalValue) {
                set.add(customerName);
            }
        });
        return set;
    }, [contracts]);

    const filteredContacts = useMemo(() => {
        const keyword = searchTerm.trim().toLowerCase();

        return contacts
            .filter((contact) => {
                const name = String(contact.name || '');
                const phone = String(contact.phone || '');
                const email = String(contact.email || '');
                const company = String((contact as any).company || '');

                const matchesSearch =
                    !keyword ||
                    name.toLowerCase().includes(keyword) ||
                    phone.includes(keyword) ||
                    email.toLowerCase().includes(keyword) ||
                    company.toLowerCase().includes(keyword);

                if (!matchesSearch) return false;

                const student = studentByPhone.get(contact.phone);
                const signedCount = signedCountByName.get(name.trim()) || 0;
                const hasDebt = debtByName.has(name.trim());

                if (filterType === 'student') return !!student;
                if (filterType === 'signed') return signedCount > 0;
                if (filterType === 'debt') return hasDebt;
                return true;
            })
            .sort((a, b) => {
                const aTime = new Date(a.createdAt || 0).getTime();
                const bTime = new Date(b.createdAt || 0).getTime();
                return bTime - aTime;
            });
    }, [contacts, searchTerm, filterType, studentByPhone, signedCountByName, debtByName]);

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
        const safeName = String(name || '').trim();
        if (!safeName) return 'NA';
        const names = safeName.split(' ');
        if (names.length >= 2) {
            return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
        }
        return safeName.substring(0, 2).toUpperCase();
    };

    const toggleColumn = (columnId: string) => {
        setVisibleColumns((prev) => {
            if (prev.includes(columnId)) {
                return prev.length > 1 ? prev.filter((c) => c !== columnId) : prev;
            }
            return [...prev, columnId];
        });
    };

    const renderListView = () => {
        return (
            <div className="flex-1 overflow-auto bg-white border border-slate-200 rounded-xl shadow-sm">
                <table className="w-full text-left border-collapse text-sm table-fixed">
                    <thead className="bg-slate-50 sticky top-0 z-10 text-xs font-bold text-slate-500 uppercase">
                        <tr>
                            {visibleColumns.includes('name') && <th className="px-3 py-3 border-b border-slate-200">Liên hệ</th>}
                            {visibleColumns.includes('phone') && <th className="px-3 py-3 border-b border-slate-200">SĐT</th>}
                            {visibleColumns.includes('email') && <th className="px-3 py-3 border-b border-slate-200">Email</th>}
                            {visibleColumns.includes('company') && <th className="px-3 py-3 border-b border-slate-200">Cơ sở/Công ty</th>}
                            {visibleColumns.includes('city') && <th className="px-3 py-3 border-b border-slate-200">Thành phố</th>}
                            {visibleColumns.includes('source') && <th className="px-3 py-3 border-b border-slate-200">Nguồn</th>}
                            {visibleColumns.includes('student') && <th className="px-3 py-3 border-b border-slate-200">Học sinh</th>}
                            {visibleColumns.includes('signed') && <th className="px-3 py-3 border-b border-slate-200">Đã ký HĐ</th>}
                            {visibleColumns.includes('debt') && <th className="px-3 py-3 border-b border-slate-200">Công nợ</th>}
                            {visibleColumns.includes('createdAt') && <th className="px-3 py-3 border-b border-slate-200">Ngày tạo</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredContacts.length === 0 ? (
                            <tr>
                                <td className="px-4 py-10 text-center text-slate-500" colSpan={visibleColumns.length}>
                                    Chưa có contact phù hợp bộ lọc hiện tại.
                                </td>
                            </tr>
                        ) : (
                            filteredContacts.map((contact) => {
                                const student = studentByPhone.get(contact.phone);
                                const signedCount = signedCountByName.get(String(contact.name || '').trim()) || 0;
                                const hasDebt = debtByName.has(String(contact.name || '').trim());

                                return (
                                    <tr
                                        key={contact.id}
                                        className="hover:bg-blue-50/40 cursor-pointer border-b border-slate-100"
                                        onClick={() => {
                                            setSelectedContact(contact);
                                            setIsDrawerOpen(true);
                                        }}
                                    >
                                        {visibleColumns.includes('name') && (
                                            <td className="px-3 py-3">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className="w-8 h-8 rounded-md bg-blue-50 text-blue-600 font-bold flex items-center justify-center shrink-0">
                                                        {getInitials(contact.name || 'Unknown')}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-slate-800 truncate">{contact.name}</p>
                                                        <p className="text-[11px] text-slate-500 truncate">
                                                            {(contact as any).company ? 'Company' : 'Individual'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                        )}
                                        {visibleColumns.includes('phone') && (
                                            <td className="px-3 py-3 text-slate-700">{contact.phone || '-'}</td>
                                        )}
                                        {visibleColumns.includes('email') && (
                                            <td className="px-3 py-3 text-slate-700 truncate">{contact.email || '-'}</td>
                                        )}
                                        {visibleColumns.includes('company') && (
                                            <td className="px-3 py-3 text-slate-700">{(contact as any).company || '-'}</td>
                                        )}
                                        {visibleColumns.includes('city') && (
                                            <td className="px-3 py-3 text-slate-700">{contact.city || '-'}</td>
                                        )}
                                        {visibleColumns.includes('source') && (
                                            <td className="px-3 py-3 text-slate-700">{contact.source || '-'}</td>
                                        )}
                                        {visibleColumns.includes('student') && (
                                            <td className="px-3 py-3">
                                                {student ? (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(`/edu/students/${student.id}`);
                                                        }}
                                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-semibold hover:bg-emerald-100"
                                                    >
                                                        <GraduationCap size={12} />
                                                        Học sinh
                                                    </button>
                                                ) : (
                                                    <span className="text-slate-400">-</span>
                                                )}
                                            </td>
                                        )}
                                        {visibleColumns.includes('signed') && (
                                            <td className="px-3 py-3">
                                                {signedCount > 0 ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-purple-50 text-purple-700 border border-purple-100 text-xs font-semibold">
                                                        <FileCheck size={12} />
                                                        {signedCount}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400">0</span>
                                                )}
                                            </td>
                                        )}
                                        {visibleColumns.includes('debt') && (
                                            <td className="px-3 py-3">
                                                {hasDebt ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-100 text-xs font-semibold">
                                                        <DollarSign size={12} />
                                                        Có nợ
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400">-</span>
                                                )}
                                            </td>
                                        )}
                                        {visibleColumns.includes('createdAt') && (
                                            <td className="px-3 py-3 text-slate-700">
                                                {contact.createdAt ? new Date(contact.createdAt).toLocaleDateString('vi-VN') : '-'}
                                            </td>
                                        )}
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        );
    };

    const renderCardView = () => {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-y-auto pb-10">
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex flex-col items-center justify-center h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl hover:bg-white hover:border-blue-300 hover:shadow-sm transition-all group cursor-pointer"
                >
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center mb-1 group-hover:bg-blue-100 transition-colors">
                        <Plus size={20} className="text-slate-400 group-hover:text-blue-600" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 group-hover:text-blue-600 uppercase tracking-wide">New Contact</span>
                </button>

                {filteredContacts.map((contact) => {
                    const student = studentByPhone.get(contact.phone);
                    const signedCount = signedCountByName.get(String(contact.name || '').trim()) || 0;
                    const hasDebt = debtByName.has(String(contact.name || '').trim());

                    return (
                        <div
                            key={contact.id}
                            className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col h-32 group cursor-pointer relative"
                            onClick={() => {
                                setSelectedContact(contact);
                                setIsDrawerOpen(true);
                            }}
                        >
                            <div className="flex gap-3 items-start">
                                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-base shrink-0 uppercase">
                                    {getInitials(contact.name || 'Unknown')}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold text-slate-800 text-sm truncate group-hover:text-blue-600 transition-colors mr-2" title={contact.name}>
                                            {contact.name}
                                        </h3>
                                        <div className="flex gap-1 shrink-0">
                                            {signedCount > 0 && (
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

                            {student ? (
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
                            ) : (
                                <div className="absolute bottom-3 right-3 text-slate-200 group-hover:text-blue-400 transition-colors">
                                    <ChevronRight size={16} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] font-sans text-slate-900 p-6 overflow-hidden">
            <div className="flex items-center justify-between gap-3 mb-4">
                <h1 className="text-2xl font-bold text-slate-800">Danh bạ (Contacts)</h1>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm"
                >
                    <Plus size={16} />
                    New Contact
                </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3 mb-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[280px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm theo tên, số điện thoại, email..."
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-50 focus:border-blue-300 outline-none transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="inline-flex items-center gap-2 px-2 py-2 border border-slate-200 rounded-lg bg-slate-50 text-xs font-semibold text-slate-600">
                        <Filter size={14} />
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value as ContactFilter)}
                            className="bg-transparent outline-none text-sm text-slate-700"
                        >
                            <option value="all">Tất cả</option>
                            <option value="student">Học sinh</option>
                            <option value="signed">Đã ký hợp đồng</option>
                            <option value="debt">Có công nợ</option>
                        </select>
                    </div>

                    {viewMode === 'list' && (
                        <div className="relative">
                            <button
                                onClick={() => setShowColumnPicker((prev) => !prev)}
                                className="inline-flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                <SlidersHorizontal size={14} />
                                Cột
                            </button>
                            {showColumnPicker && (
                                <>
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setShowColumnPicker(false)}
                                    />
                                    <div className="absolute right-0 top-11 z-20 w-64 bg-white border border-slate-200 rounded-lg shadow-xl p-2">
                                        <p className="px-2 py-1 text-xs font-bold uppercase text-slate-500">Tùy chỉnh cột</p>
                                        <div className="max-h-60 overflow-y-auto space-y-1 mt-1">
                                            {ALL_COLUMNS.map((column) => (
                                                <label
                                                    key={column.id}
                                                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50 cursor-pointer text-sm text-slate-700"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={visibleColumns.includes(column.id)}
                                                        onChange={() => toggleColumn(column.id)}
                                                    />
                                                    {column.label}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    <div className="ml-auto inline-flex items-center p-1 border border-slate-200 rounded-lg bg-white">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}
                            title="Dạng danh sách"
                        >
                            <LayoutList size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode('card')}
                            className={`p-2 rounded ${viewMode === 'card' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}
                            title="Dạng card"
                        >
                            <LayoutGrid size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {viewMode === 'list' ? renderListView() : renderCardView()}

            <ContactDrawer
                contact={selectedContact}
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                onUpdate={(updated) => {
                    const persisted = saveContact(updated);
                    setContacts((prev) => prev.map((contact) => (contact.id === persisted.id ? persisted : contact)));
                    setSelectedContact(persisted);
                    setToast({ message: `Đã cập nhật contact: ${persisted.name}`, type: 'success' });
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
