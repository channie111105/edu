import React, { useState, useEffect } from 'react';
import { ILead } from '../types';
import {
    X,
    ArrowRight,
    User,
    Briefcase,
    Building2,
    Users
} from 'lucide-react';

interface ConvertLeadModalProps {
    isOpen: boolean;
    onClose: () => void;
    lead: ILead;
    onConfirm: (data: any) => void;
}

const ConvertLeadModal: React.FC<ConvertLeadModalProps> = ({ isOpen, onClose, lead, onConfirm }) => {
    const [conversionAction, setConversionAction] = useState<'create' | 'merge'>('create');
    const [customerAction, setCustomerAction] = useState<'create' | 'link' | 'none'>('create');
    const [salesperson, setSalesperson] = useState(lead.ownerId || 'Sarah Miller');
    const [salesChannel, setSalesChannel] = useState('B2C - Center 1 (Hà Nội)');

    // Mock Managers/Sales
    const SALES_REPS = [
        'Sarah Miller',
        'Nguyễn Văn Nam',
        'Trần Thị Hương',
        'Phạm Bích Ngọc'
    ];

    const SALES_CHANNELS = [
        'B2C - Center 1 (Hà Nội)',
        'B2C - Center 2 (TP.HCM)',
        'B2B - Đối tác',
        'Online Sales'
    ];

    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm({
            conversionAction,
            customerAction,
            salesperson,
            salesChannel
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center font-sans">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <h2 className="text-lg font-bold text-slate-800">Chuyển đổi thành Cơ hội</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1 text-sm bg-white">

                    {/* Section 1: Conversion Action */}
                    <div className="mb-6">
                        <label className="block text-slate-500 font-bold mb-3 uppercase text-xs tracking-wider">Hành động chuyển đổi</label>
                        <div className="space-y-3">
                            <div className="flex items-center">
                                <input
                                    type="radio"
                                    id="action_create"
                                    name="conversion_action"
                                    checked={conversionAction === 'create'}
                                    onChange={() => setConversionAction('create')}
                                    className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                                />
                                <label htmlFor="action_create" className="ml-3 text-slate-800 font-medium cursor-pointer">
                                    Tạo cơ hội mới (Opportunity)
                                </label>
                            </div>
                            <div className="flex items-center opacity-60 pointer-events-none">
                                <input
                                    type="radio"
                                    id="action_merge"
                                    name="conversion_action"
                                    checked={conversionAction === 'merge'}
                                    disabled
                                    className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-not-allowed"
                                />
                                <label htmlFor="action_merge" className="ml-3 text-slate-500 cursor-not-allowed flex items-center gap-2">
                                    Gộp vào cơ hội có sẵn <span className="text-[10px] bg-slate-100 px-1 border rounded">Coming Soon</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <hr className="border-slate-100 my-5" />

                    {/* Section 2: Assignment */}
                    <div className="mb-6">
                        <label className="block text-slate-800 font-bold mb-4 text-base flex items-center gap-2">
                            <Briefcase className="text-blue-600" size={18} /> Phân bổ Cơ hội
                        </label>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-4">
                            <div className="space-y-1">
                                <label className="text-slate-500 font-semibold text-xs">Nhân viên Phụ trách</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                    <select
                                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
                                        value={salesperson}
                                        onChange={(e) => setSalesperson(e.target.value)}
                                    >
                                        {SALES_REPS.map(rep => (
                                            <option key={rep} value={rep}>{rep}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-slate-500 font-semibold text-xs">Nhóm Kinh doanh (Sales Team)</label>
                                <div className="relative">
                                    <Building2 className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                    <select
                                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
                                        value={salesChannel}
                                        onChange={(e) => setSalesChannel(e.target.value)}
                                    >
                                        {SALES_CHANNELS.map(ch => (
                                            <option key={ch} value={ch}>{ch}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <hr className="border-slate-100 my-5" />

                    {/* Section 3: Customer */}
                    <div className="mb-2">
                        <label className="block text-slate-800 font-bold mb-3 text-base flex items-center gap-2">
                            <Users className="text-blue-600" size={18} /> Khách hàng
                        </label>

                        <div className="space-y-3 pl-4">
                            <div className="flex items-center opacity-60 pointer-events-none">
                                <input
                                    type="radio"
                                    id="cust_link"
                                    name="customer_action"
                                    checked={customerAction === 'link'}
                                    disabled
                                    className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                                />
                                <label htmlFor="cust_link" className="ml-3 text-slate-500 flex items-center gap-2">
                                    Liên kết khách hàng có sẵn <span className="text-[10px] bg-slate-100 px-1 border rounded">Automated</span>
                                </label>
                            </div>
                            <div className="flex items-center">
                                <input
                                    type="radio"
                                    id="cust_create"
                                    name="customer_action"
                                    checked={customerAction === 'create'}
                                    onChange={() => setCustomerAction('create')}
                                    className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                                />
                                <label htmlFor="cust_create" className="ml-3 text-slate-800 font-medium cursor-pointer">
                                    Tạo khách hàng mới (Create a new customer)
                                </label>
                            </div>
                            <div className="flex items-center">
                                <input
                                    type="radio"
                                    id="cust_none"
                                    name="customer_action"
                                    checked={customerAction === 'none'}
                                    onChange={() => setCustomerAction('none')}
                                    className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                                />
                                <label htmlFor="cust_none" className="ml-3 text-slate-800 font-medium cursor-pointer">
                                    Không liên kết khách hàng
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-start gap-3">
                    <button
                        onClick={handleConfirm}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded shadow-sm flex items-center gap-2 transition-colors uppercase text-xs"
                    >
                        Tạo Cơ hội
                    </button>
                    <button
                        onClick={onClose}
                        className="bg-white hover:bg-slate-100 text-slate-700 font-bold py-2 px-4 border border-slate-300 rounded shadow-sm transition-colors text-xs uppercase"
                    >
                        Hủy
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConvertLeadModal;
