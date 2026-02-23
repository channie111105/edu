import React, { useState, useEffect } from 'react';
import { X, User, Phone, Mail, MapPin, Tag, Globe, Users, Save, ListPlus } from 'lucide-react';
import { IContact } from '../types';
import { getTags, getContacts } from '../utils/storage';
import { AlertTriangle } from 'lucide-react';

interface CreateContactModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (contact: Partial<IContact>, createNew: boolean) => void;
}

const CreateContactModal: React.FC<CreateContactModalProps> = ({ isOpen, onClose, onSave }) => {
    const [formData, setFormData] = useState<Partial<IContact>>({
        name: '',
        phone: '',
        email: '',
        address: '',
        source: 'Khác',
        ownerId: 'u2', // Default to current salesperson (demo)
        notes: '',
        marketingData: {
            tags: []
        },
        targetCountry: 'Đức' // Default
    });

    const [availableTags, setAvailableTags] = useState<string[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [phoneError, setPhoneError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setAvailableTags(getTags());
            // Reset form when opening
            setFormData({
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
            setSelectedTags([]);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handlePhoneChange = (val: string) => {
        const cleanVal = val.replace(/\D/g, '');
        setFormData({ ...formData, phone: cleanVal });

        if (cleanVal.length >= 10) {
            const allContacts = getContacts();
            const existing = allContacts.find(c => (c.phone || '').replace(/\D/g, '') === cleanVal);
            if (existing) {
                setPhoneError(`SĐT này đã tồn tại (Liên hệ: ${existing.name})`);
            } else {
                setPhoneError(null);
            }
        } else {
            setPhoneError(null);
        }
    };

    const handleTagToggle = (tag: string) => {
        setSelectedTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    const handleSubmit = (createNew: boolean) => {
        if (!formData.name || !formData.phone) {
            alert('Vui lòng nhập Họ tên và Số điện thoại');
            return;
        }

        if (phoneError) {
            alert('Số điện thoại đã tồn tại trong hệ thống. Vui lòng kiểm tra lại.');
            return;
        }

        const finalData = {
            ...formData,
            marketingData: {
                ...formData.marketingData,
                tags: selectedTags
            }
        };

        onSave(finalData, createNew);
        if (createNew) {
            // Reset for new creation
            setFormData({
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
            setSelectedTags([]);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Tạo Contact mới</h2>
                        <p className="text-sm text-slate-500 mt-1">Vui lòng điền thông tin chi tiết của khách hàng</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Nhóm thông tin cơ bản */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-1 h-4 bg-blue-600 rounded-full" />
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Thông tin cơ bản</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 ml-1">Họ và tên <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="VD: Nguyễn Văn A"
                                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-300 outline-none transition-all"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 ml-1">Số điện thoại <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="tel"
                                        placeholder="0123... (Bắt buộc)"
                                        className={`w-full pl-10 pr-4 py-2 bg-slate-50 border rounded-lg text-sm focus:ring-2 outline-none transition-all ${phoneError ? 'border-red-500 focus:ring-red-100' : 'border-slate-200 focus:ring-blue-100 focus:border-blue-300'
                                            }`}
                                        value={formData.phone}
                                        onChange={(e) => handlePhoneChange(e.target.value)}
                                        required
                                    />
                                    {phoneError && (
                                        <div className="flex items-center gap-1.5 mt-1 text-red-500">
                                            <AlertTriangle size={12} />
                                            <p className="text-[10px] font-bold italic">{phoneError}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 ml-1">Email</label>
                                <div className="relative">
                                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="email"
                                        placeholder="example@mail.com"
                                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-300 outline-none transition-all"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 ml-1">Địa chỉ</label>
                                <div className="relative">
                                    <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Số nhà, Tên đường..."
                                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-300 outline-none transition-all"
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Nhóm thông tin phân loại */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-1 h-4 bg-blue-600 rounded-full" />
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Phân loại & Nguồn</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 ml-1">Nguồn khách hàng</label>
                                <div className="relative">
                                    <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <select
                                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-300 outline-none appearance-none transition-all"
                                        value={formData.source}
                                        onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                                    >
                                        <option value="Facebook">Facebook</option>
                                        <option value="Zalo">Zalo</option>
                                        <option value="Website">Website</option>
                                        <option value="Hotline">Hotline</option>
                                        <option value="Giới thiệu">Giới thiệu</option>
                                        <option value="Khác">Khác</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 ml-1">Người phụ trách</label>
                                <div className="relative">
                                    <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <select
                                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-300 outline-none appearance-none transition-all"
                                        value={formData.ownerId}
                                        onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
                                    >
                                        <option value="u1">Trần Văn Quản Trị</option>
                                        <option value="u2">Sarah Miller</option>
                                        <option value="u3">Nguyễn Văn Sales</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 ml-1 flex items-center gap-1">
                                <Tag size={12} /> Tags phân loại
                            </label>
                            <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-100 rounded-xl min-h-[60px]">
                                {availableTags.map(tag => (
                                    <button
                                        key={tag}
                                        onClick={() => handleTagToggle(tag)}
                                        className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all border ${selectedTags.includes(tag)
                                            ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                                            : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600'
                                            }`}
                                    >
                                        {tag}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Nhóm ghi chú */}
                    <section className="space-y-4 pb-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-1 h-4 bg-blue-600 rounded-full" />
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Ghi chú ban đầu</h3>
                        </div>
                        <div className="space-y-1">
                            <textarea
                                placeholder="Nhập ghi chú quan trọng về khách hàng này..."
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm min-h-[100px] focus:ring-2 focus:ring-blue-100 focus:border-blue-300 outline-none transition-all resize-none"
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>
                    </section>
                </div>

                {/* Footer Buttons */}
                <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-end gap-3 rounded-b-2xl">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:bg-white hover:text-slate-700 rounded-lg transition-all border border-transparent hover:border-slate-200"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={() => handleSubmit(true)}
                        className="px-6 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2"
                    >
                        <ListPlus size={18} /> Lưu & Tạo mới
                    </button>
                    <button
                        onClick={() => handleSubmit(false)}
                        className="px-8 py-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-black shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2"
                    >
                        <Save size={18} /> Lưu Contact
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateContactModal;
