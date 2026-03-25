import React, { useEffect, useState } from 'react';
import { AlertTriangle, ListPlus, Mail, MapPin, Phone, Save, Tag, User, Users, X } from 'lucide-react';
import { IContact } from '../types';
import { getContacts } from '../utils/storage';

interface CreateContactModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (contact: Partial<IContact>, createNew: boolean) => void;
}

const defaultFormData = (): Partial<IContact> => ({
    name: '',
    phone: '',
    email: '',
    address: '',
    source: 'Khác',
    ownerId: 'u2',
    notes: '',
    marketingData: {
        tags: []
    },
    targetCountry: 'Đức'
});

const inputClassName =
    'w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-300 outline-none transition-all';

const CreateContactModal: React.FC<CreateContactModalProps> = ({ isOpen, onClose, onSave }) => {
    const [formData, setFormData] = useState<Partial<IContact>>(defaultFormData);
    const [phoneError, setPhoneError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        setFormData(defaultFormData());
        setPhoneError(null);
    }, [isOpen]);

    if (!isOpen) return null;

    const handlePhoneChange = (value: string) => {
        const cleanValue = value.replace(/\D/g, '');
        setFormData((prev) => ({ ...prev, phone: cleanValue }));

        if (cleanValue.length >= 10) {
            const existing = getContacts().find((contact) => (contact.phone || '').replace(/\D/g, '') === cleanValue);
            setPhoneError(existing ? `SĐT này đã tồn tại (Liên hệ: ${existing.name})` : null);
            return;
        }

        setPhoneError(null);
    };

    const tagValue = Array.isArray(formData.marketingData?.tags)
        ? formData.marketingData.tags.join(', ')
        : '';

    const handleTagChange = (value: string) => {
        const tags = value
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);

        setFormData((prev) => ({
            ...prev,
            marketingData: {
                ...prev.marketingData,
                tags
            }
        }));
    };

    const resetForm = () => {
        setFormData(defaultFormData());
        setPhoneError(null);
    };

    const handleSubmit = (createNew: boolean) => {
        if (!formData.name || !formData.phone) {
            alert('Vui lòng nhập Họ và tên và Số điện thoại');
            return;
        }

        if (phoneError) {
            alert('Số điện thoại đã tồn tại trong hệ thống. Vui lòng kiểm tra lại.');
            return;
        }

        onSave(formData, createNew);

        if (createNew) {
            resetForm();
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

            <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between border-b border-slate-100 p-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Tạo Contact mới</h2>
                        <p className="mt-1 text-sm text-slate-500">Vui lòng điền thông tin chi tiết của khách hàng</p>
                    </div>
                    <button onClick={onClose} className="rounded-full p-2 transition-colors hover:bg-slate-100">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                <div className="flex-1 space-y-8 overflow-y-auto p-6">
                    <section className="space-y-4">
                        <div className="mb-2 flex items-center gap-2">
                            <div className="h-4 w-1 rounded-full bg-blue-600" />
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Thông tin cơ bản</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-1">
                                <label className="ml-1 text-xs font-bold text-slate-500">
                                    Họ và tên <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="VD: Nguyễn Văn A"
                                        className={inputClassName}
                                        value={formData.name || ''}
                                        onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="ml-1 text-xs font-bold text-slate-500">
                                    Số điện thoại <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="tel"
                                        placeholder="0123... (Bắt buộc)"
                                        className={`${inputClassName} ${phoneError ? 'border-red-500 focus:ring-red-100' : ''}`}
                                        value={formData.phone || ''}
                                        onChange={(event) => handlePhoneChange(event.target.value)}
                                    />
                                </div>
                                {phoneError && (
                                    <div className="mt-1 flex items-center gap-1.5 text-red-500">
                                        <AlertTriangle size={12} />
                                        <p className="text-[10px] font-bold italic">{phoneError}</p>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1">
                                <label className="ml-1 text-xs font-bold text-slate-500">Email</label>
                                <div className="relative">
                                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="email"
                                        placeholder="example@mail.com"
                                        className={inputClassName}
                                        value={formData.email || ''}
                                        onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="ml-1 text-xs font-bold text-slate-500">Địa chỉ</label>
                                <div className="relative">
                                    <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Số nhà, Tên đường..."
                                        className={inputClassName}
                                        value={formData.address || ''}
                                        onChange={(event) => setFormData((prev) => ({ ...prev, address: event.target.value }))}
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <div className="mb-2 flex items-center gap-2">
                            <div className="h-4 w-1 rounded-full bg-blue-600" />
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Người phụ trách & Tag</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-1">
                                <label className="ml-1 text-xs font-bold text-slate-500">Người phụ trách</label>
                                <div className="relative">
                                    <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <select
                                        className={inputClassName}
                                        value={formData.ownerId || 'u2'}
                                        onChange={(event) => setFormData((prev) => ({ ...prev, ownerId: event.target.value }))}
                                    >
                                        <option value="u1">Trần Văn Quản Trị</option>
                                        <option value="u2">Sarah Miller</option>
                                        <option value="u3">Nguyễn Văn Sales</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="ml-1 text-xs font-bold text-slate-500">Tag</label>
                                <div className="relative">
                                    <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Nhập tag, cách nhau bằng dấu phẩy"
                                        className={inputClassName}
                                        value={tagValue}
                                        onChange={(event) => handleTagChange(event.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-4 pb-4">
                        <div className="mb-2 flex items-center gap-2">
                            <div className="h-4 w-1 rounded-full bg-blue-600" />
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Ghi chú ban đầu</h3>
                        </div>
                        <div className="space-y-1">
                            <textarea
                                placeholder="Nhập ghi chú quan trọng về khách hàng này..."
                                className="min-h-[100px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none transition-all focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                                value={formData.notes || ''}
                                onChange={(event) => setFormData((prev) => ({ ...prev, notes: event.target.value }))}
                            />
                        </div>
                    </section>
                </div>

                <div className="flex flex-col justify-end gap-3 rounded-b-2xl border-t border-slate-100 bg-slate-50/50 p-6 sm:flex-row">
                    <button
                        onClick={onClose}
                        className="rounded-lg border border-transparent px-6 py-2.5 text-sm font-bold text-slate-500 transition-all hover:border-slate-200 hover:bg-white hover:text-slate-700"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={() => handleSubmit(true)}
                        className="flex items-center justify-center gap-2 rounded-lg bg-slate-100 px-6 py-2.5 text-sm font-bold text-slate-700 transition-all hover:bg-slate-200"
                    >
                        <ListPlus size={18} /> Lưu & Tạo mới
                    </button>
                    <button
                        onClick={() => handleSubmit(false)}
                        className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-8 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-100 transition-all hover:bg-blue-700"
                    >
                        <Save size={18} /> Lưu Contact
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateContactModal;
