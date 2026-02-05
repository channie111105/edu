import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
    ArrowLeft,
    Save,
    Send,
    CheckCircle2,
    Lock,
    Printer,
    FileText,
    DollarSign,
    MoreHorizontal,
    Paperclip,
    MessageSquare,
    Clock,
    User,
    Calendar,
    ChevronRight,
    Users
} from 'lucide-react';
import { IQuotation, QuotationStatus } from '../types';
import { getQuotations, addQuotation, updateQuotation, getDealById, getLeadById, createStudentFromQuotation } from '../utils/storage';
import { useAuth } from '../contexts/AuthContext';

// Mock Services
const SERVICES = [
    { id: 'study_abroad', name: 'Du học' },
    { id: 'training', name: 'Đào tạo' },
    { id: 'combo', name: 'Combo Du học + Đào tạo' },
];

const PRODUCTS = [
    { id: 'p1', name: 'Tiếng Đức A1-B1', price: 15000000, type: 'training' },
    { id: 'p2', name: 'Du học nghề Đức', price: 180000000, type: 'study_abroad' },
    { id: 'p3', name: 'Combo Đức A1-B1 + Hồ sơ', price: 200000000, type: 'combo' },
];

const STATUS_STEPS = [
    { id: QuotationStatus.DRAFT, label: 'Mới' },
    { id: QuotationStatus.SENT, label: 'Đã gửi' },
    { id: QuotationStatus.SALE_ORDER, label: 'Sale Order' },
    { id: QuotationStatus.LOCKED, label: 'Đã khóa' },
];

const QuotationDetails: React.FC = () => {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    // Mode
    const isNew = id === 'new';
    const dealId = searchParams.get('dealId');
    const initialAction = searchParams.get('action');

    // UI State
    const [activeTab, setActiveTab] = useState<'order_lines' | 'other_info' | 'payment'>('order_lines');

    // Form State
    const [formData, setFormData] = useState<Partial<IQuotation>>({
        status: QuotationStatus.DRAFT,
        amount: 0,
        discount: 0,
        finalAmount: 0,
        createdAt: new Date().toISOString()
    });

    // Modals
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'CK' | 'CASH'>('CK');
    const [paymentProof, setPaymentProof] = useState('');

    useEffect(() => {
        if (isNew) {
            // Initialize new form
            if (dealId) {
                const deal = getDealById(dealId);
                if (deal) {
                    setFormData(prev => ({
                        ...prev,
                        dealId: deal.id,
                        leadId: deal.leadId,
                        customerName: 'Loading...',
                        product: deal.title,
                        amount: deal.value,
                        finalAmount: deal.value
                    }));
                    const lead = getLeadById(deal.leadId);
                    if (lead) {
                        setFormData(prev => ({ ...prev, customerName: lead.name, customerId: lead.id }));
                    }
                }
            }
            const soCode = `SO${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
            setFormData(prev => ({ ...prev, soCode }));
        } else if (id) {
            const list = getQuotations();
            const found = list.find(q => q.id === id);
            if (found) {
                setFormData(found);
                // Pre-fill payment proof state if exists
                if (found.paymentProof) setPaymentProof(found.paymentProof);
                if (found.paymentMethod) setPaymentMethod(found.paymentMethod as any);

                if (initialAction === 'confirm' && found.status === QuotationStatus.SENT) {
                    setShowConfirmModal(true);
                }
            } else {
                navigate('/contracts/quotations');
            }
        }
    }, [id, dealId, isNew]);

    const handleSave = () => {
        if (!formData.customerName || !formData.finalAmount) {
            // Optional validation
        }
        const dataToSave = {
            ...formData,
            updatedAt: new Date().toISOString(),
            id: formData.id || `Q-${Date.now()}`
        } as IQuotation;

        if (isNew) {
            addQuotation(dataToSave);
        } else {
            updateQuotation(dataToSave);
        }
        navigate('/contracts/quotations');
    };

    const handleSend = () => {
        const updated = { ...formData, status: QuotationStatus.SENT } as IQuotation;
        setFormData(updated);
        updateQuotation(updated);
        alert('Đã gửi báo giá cho khách hàng (Mô phỏng)');
    };

    const handleConfirmSale = () => {
        if (!paymentProof) {
            alert('Vui lòng nhập chứng từ thanh toán (mã hoặc ảnh)');
            return;
        }
        const updated = {
            ...formData,
            status: QuotationStatus.SALE_ORDER,
            paymentMethod,
            paymentProof
        } as IQuotation;

        setFormData(updated);
        updateQuotation(updated);
        setShowConfirmModal(false);
    };

    const handleLock = () => {
        // 1. Update Quotation Status
        const updatedQuery = { ...formData, status: QuotationStatus.LOCKED } as IQuotation;

        // 2. Auto-Create Student Profile
        const newStudent = createStudentFromQuotation(updatedQuery);
        const updatedWithStudent = { ...updatedQuery, studentId: newStudent.id };

        setFormData(updatedWithStudent);
        updateQuotation(updatedWithStudent);
        alert(`Đã khóa đơn hàng và tự động tạo hồ sơ học viên: ${newStudent.code}`);
    };

    const isLocked = formData.status === QuotationStatus.LOCKED;
    const isSaleOrder = formData.status === QuotationStatus.SALE_ORDER;

    // Helper to check if step is passed
    const isStepActive = (stepId: string) => {
        const steps = [QuotationStatus.DRAFT, QuotationStatus.SENT, QuotationStatus.SALE_ORDER, QuotationStatus.LOCKED];
        const currentIndex = steps.indexOf(formData.status as QuotationStatus);
        const stepIndex = steps.indexOf(stepId as QuotationStatus);
        return stepIndex <= currentIndex;
    };

    return (
        <div className="min-h-screen bg-[#f1f5f9] p-2 md:p-6 font-sans text-sm text-slate-800 flex flex-col h-screen overflow-hidden">
            {/* Top Navigation Bar */}
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <div className="flex items-center gap-2 text-slate-500">
                    <button onClick={() => navigate('/contracts/quotations')} className="hover:text-blue-600 transition-colors">Báo giá</button>
                    <ChevronRight size={14} />
                    <span className="font-semibold text-slate-900">{isNew ? 'Mới' : formData.soCode}</span>
                </div>
                {!isLocked && (
                    <button onClick={handleSave} className="bg-slate-800 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-black transition-colors flex items-center gap-2">
                        <Save size={16} /> Lưu
                    </button>
                )}
            </div>

            {/* STATUS & ACTION BAR (Odoo Style) */}
            <div className="bg-white border border-slate-300 rounded shadow-sm flex flex-col md:flex-row justify-between items-center p-1 gap-2 mb-4 flex-shrink-0 sticky top-0 z-20">
                {/* Left Actions */}
                <div className="flex items-center gap-2 px-2 py-1 w-full md:w-auto overflow-x-auto">
                    {formData.status === QuotationStatus.DRAFT && (
                        <button onClick={handleSend} className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded font-medium text-xs shadow-sm transition-colors whitespace-nowrap uppercase tracking-wide">
                            Gửi Email
                        </button>
                    )}

                    {(formData.status === QuotationStatus.SENT || formData.status === QuotationStatus.DRAFT) && (
                        <button onClick={() => setShowConfirmModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded font-medium text-xs shadow-sm transition-colors whitespace-nowrap uppercase tracking-wide">
                            Xác nhận
                        </button>
                    )}

                    {formData.status === QuotationStatus.SALE_ORDER && (
                        <button onClick={handleLock} className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-3 py-1.5 rounded font-medium text-xs shadow-sm transition-colors whitespace-nowrap uppercase tracking-wide">
                            Khóa đơn
                        </button>
                    )}

                    {(formData.status === QuotationStatus.LOCKED) && (
                        <button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded font-medium text-xs shadow-sm transition-colors whitespace-nowrap uppercase tracking-wide flex items-center gap-1">
                            <Printer size={14} /> In Hợp đồng
                        </button>
                    )}
                </div>

                {/* Right Pipeline Status */}
                <div className="flex items-center border border-slate-300 rounded-sm overflow-hidden bg-slate-50">
                    {STATUS_STEPS.map((step, index) => {
                        const active = formData.status === step.id;
                        const passed = isStepActive(step.id);
                        return (
                            <div
                                key={step.id}
                                className={`
                                    relative px-3 py-1.5 font-bold text-[11px] uppercase select-none cursor-default
                                    flex items-center h-full
                                    ${active ? 'bg-blue-700 text-white' : (
                                        passed ? 'bg-white text-blue-700 border-l border-white' : 'bg-slate-100 text-slate-500 border-l border-slate-200'
                                    )}
                                `}
                            >
                                {step.label}
                                {active && <div className="absolute right-0 top-0 bottom-0 w-3 -mr-1.5 bg-blue-700 transform rotate-45 z-10 hidden sm:block shadow-sm"></div>}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="flex flex-1 gap-6 overflow-hidden items-start">

                {/* LEFT: SHEET FORM */}
                <div className="flex-1 bg-white border border-slate-300 rounded shadow-sm h-full flex flex-col overflow-y-auto w-full max-w-5xl mx-auto">
                    {/* Sheet Header Info */}
                    <div className="p-8 pb-4 border-b border-transparent">
                        <div className="flex justify-between items-start mb-6">
                            <h1 className="text-3xl font-bold text-slate-900">{isNew ? 'Báo giá Mới' : formData.soCode}</h1>
                            <div className="text-right">
                                <span className="block font-bold text-slate-500 text-xs uppercase mb-1">Ngày tạo</span>
                                <span className="font-medium text-slate-900">{new Date(formData.createdAt || '').toLocaleDateString('vi-VN')}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 mb-4">
                            <div className="form-group border-b border-slate-200 pb-1 focus-within:border-blue-500 transition-colors">
                                <label className="block text-xs font-bold text-blue-800 uppercase mb-1">Khách hàng</label>
                                <input
                                    type="text"
                                    value={formData.customerName || ''}
                                    onChange={(e) => !isLocked && setFormData(p => ({ ...p, customerName: e.target.value }))}
                                    placeholder="Chọn khách hàng..."
                                    className="w-full text-base font-medium outline-none bg-transparent placeholder:text-slate-300"
                                    disabled={isLocked}
                                />
                            </div>
                            <div className="form-group border-b border-slate-200 pb-1 focus-within:border-blue-500 transition-colors">
                                <label className="block text-xs font-bold text-blue-800 uppercase mb-1">Hạn báo giá</label>
                                <input
                                    type="date"
                                    className="w-full text-base font-medium outline-none bg-transparent text-slate-700"
                                    disabled={isLocked}
                                />
                            </div>

                            {/* Service Type moved here */}
                            <div className="form-group border-b border-slate-200 pb-1 focus-within:border-blue-500 transition-colors">
                                <label className="block text-xs font-bold text-blue-800 uppercase mb-1">Loại dịch vụ</label>
                                <select
                                    value={formData.serviceType || 'training'}
                                    onChange={(e) => !isLocked && setFormData(prev => ({ ...prev, serviceType: e.target.value as any }))}
                                    disabled={isLocked}
                                    className="w-full text-base font-medium outline-none bg-transparent"
                                >
                                    {SERVICES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* TABS HEADER */}
                    <div className="flex items-center px-6 border-b border-slate-200 gap-8 mt-4">
                        <button
                            className={`py-3 text-sm font-bold border-b-[3px] transition-colors uppercase tracking-wide ${activeTab === 'order_lines' ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            onClick={() => setActiveTab('order_lines')}
                        >
                            Chi tiết đơn hàng
                        </button>
                        <button
                            className={`py-3 text-sm font-bold border-b-[3px] transition-colors uppercase tracking-wide ${activeTab === 'other_info' ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            onClick={() => setActiveTab('other_info')}
                        >
                            Thông tin khác
                        </button>
                        <button
                            className={`py-3 text-sm font-bold border-b-[3px] transition-colors uppercase tracking-wide flex items-center gap-2 ${activeTab === 'payment' ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            onClick={() => setActiveTab('payment')}
                        >
                            Thanh toán
                            {(isSaleOrder || isLocked) && <CheckCircle2 size={14} className="text-green-600" />}
                        </button>
                    </div>

                    {/* TAB CONTENT BODY */}
                    <div className="p-6 flex-1 bg-white">
                        {/* TAB 1: ORDER LINES */}
                        {activeTab === 'order_lines' && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <table className="w-full text-left text-sm mb-6 border-collapse">
                                    <thead>
                                        <tr className="border-b-2 border-slate-800 text-slate-800 font-bold uppercase text-[11px]">
                                            <th className="py-2 pr-4 w-1/3">Sản phẩm</th>
                                            <th className="py-2 px-4 text-center">Số lượng</th>
                                            <th className="py-2 px-4 text-right">Đơn giá</th>
                                            <th className="py-2 px-4 text-right">Thuế</th>
                                            <th className="py-2 px-4 text-right">Thành tiền</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        <tr className="group hover:bg-slate-50 transition-colors">
                                            <td className="py-3 pr-4 align-top">
                                                <select
                                                    value={formData.product || ''}
                                                    onChange={(e) => {
                                                        if (isLocked) return;
                                                        const prod = PRODUCTS.find(p => p.name === e.target.value);
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            product: e.target.value,
                                                            amount: prod ? prod.price : 0,
                                                            finalAmount: prod ? prod.price - (prev.discount || 0) : 0
                                                        }));
                                                    }}
                                                    disabled={isLocked}
                                                    className="w-full p-2 border border-slate-300 rounded outline-none text-slate-900 font-bold bg-transparent focus:ring-1 focus:ring-blue-500"
                                                >
                                                    <option value="">-- Chọn sản phẩm --</option>
                                                    {PRODUCTS.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                                </select>
                                                <div className="mt-1 ml-1 text-xs text-slate-500">Mô tả: {formData.serviceType || 'Chưa chọn loại'}</div>
                                            </td>
                                            <td className="py-3 px-4 text-center align-top pt-5">1</td>
                                            <td className="py-3 px-4 text-right font-medium align-top pt-4">
                                                <input
                                                    type="number"
                                                    value={formData.amount || 0}
                                                    onChange={(e) => !isLocked && setFormData(p => {
                                                        const val = Number(e.target.value);
                                                        return { ...p, amount: val, finalAmount: val - (p.discount || 0) };
                                                    })}
                                                    disabled={isLocked}
                                                    className="text-right w-32 border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none bg-transparent font-medium"
                                                />
                                            </td>
                                            <td className="py-3 px-4 text-right text-slate-400 align-top pt-5 text-xs">0%</td>
                                            <td className="py-3 px-4 text-right font-bold align-top pt-5 text-slate-900">{(formData.amount || 0).toLocaleString()}</td>
                                        </tr>
                                    </tbody>
                                </table>

                                {/* Totals Section */}
                                <div className="flex justify-end mt-8">
                                    <div className="w-72 space-y-3 bg-slate-50 p-4 rounded border border-slate-200">
                                        <div className="flex justify-between text-slate-600 text-sm">
                                            <span>Tổng giá trị:</span>
                                            <span className="font-medium">{(formData.amount || 0).toLocaleString()} <span className="text-[10px] text-slate-400">VND</span></span>
                                        </div>
                                        <div className="flex justify-between items-center text-slate-600 text-sm">
                                            <span>Chiết khấu:</span>
                                            <div className="flex items-center gap-1">
                                                <span>-</span>
                                                <input
                                                    type="number"
                                                    value={formData.discount || 0}
                                                    onChange={(e) => !isLocked && setFormData(p => ({ ...p, discount: Number(e.target.value), finalAmount: (p.amount || 0) - Number(e.target.value) }))}
                                                    disabled={isLocked}
                                                    className="w-24 text-right border border-slate-300 rounded px-2 py-0.5 focus:border-blue-600 outline-none text-sm bg-white"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex justify-between text-lg font-bold text-blue-700 border-t border-slate-300 pt-3 mt-2">
                                            <span>Tổng tiền:</span>
                                            <span>{(formData.finalAmount || 0).toLocaleString()} đ</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: OTHER INFO */}
                        {activeTab === 'other_info' && (
                            <div className="grid grid-cols-2 gap-12 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="space-y-6">
                                    <h3 className="font-bold border-b border-slate-200 pb-2 mb-4 text-slate-800 text-sm uppercase tracking-wider">Thông tin Sales</h3>
                                    <div className="grid grid-cols-[120px_1fr] gap-4 items-center">
                                        <label className="text-sm font-bold text-slate-600">Người phụ trách</label>
                                        <div className="flex items-center gap-2 p-1 border border-transparent hover:border-slate-200 rounded">
                                            <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700">SM</div>
                                            <span className="text-blue-700 font-medium">{user?.name || 'Sales Rep'}</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-[120px_1fr] gap-4 items-center">
                                        <label className="text-sm font-bold text-slate-600">Đội nhóm</label>
                                        <span className="text-slate-900">Sales Team 1</span>
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <h3 className="font-bold border-b border-slate-200 pb-2 mb-4 text-slate-800 text-sm uppercase tracking-wider">Thông tin Bổ sung</h3>
                                    <div className="grid grid-cols-[120px_1fr] gap-4 items-center">
                                        <label className="text-sm font-bold text-slate-600">Mã lớp dự kiến</label>
                                        <input
                                            value={formData.classCode || ''}
                                            onChange={(e) => !isLocked && setFormData(p => ({ ...p, classCode: e.target.value }))}
                                            disabled={isLocked}
                                            className="w-full border border-slate-300 p-1.5 rounded text-sm focus:border-blue-600 outline-none"
                                            placeholder="VD: GER-A1-K35"
                                        />
                                    </div>
                                    <div className="grid grid-cols-[120px_1fr] gap-4 items-center">
                                        <label className="text-sm font-bold text-slate-600">Lịch học</label>
                                        <input
                                            value={formData.schedule || ''}
                                            onChange={(e) => !isLocked && setFormData(p => ({ ...p, schedule: e.target.value }))}
                                            disabled={isLocked}
                                            className="w-full border border-slate-300 p-1.5 rounded text-sm focus:border-blue-600 outline-none"
                                            placeholder="2-4-6 hoặc 3-5-7"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 3: PAYMENT */}
                        {activeTab === 'payment' && (
                            <div className="max-w-3xl animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="bg-blue-50/50 p-6 rounded-lg border border-blue-100 mb-6">
                                    <div className="grid grid-cols-2 gap-8 mb-6">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Hình thức thanh toán</label>
                                            <div className="font-bold text-lg text-slate-900 flex items-center gap-2">
                                                {formData.paymentMethod === 'CK' ? <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-sm">Chuyển khoản</span> :
                                                    formData.paymentMethod === 'CASH' ? <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-sm">Tiền mặt</span> :
                                                        <span className="text-slate-400 text-sm italic">Chưa xác nhận</span>}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Trạng thái giao dịch</label>
                                            <div>{isSaleOrder || isLocked ?
                                                <span className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm inline-flex items-center gap-1"><CheckCircle2 size={12} /> Đã thanh toán</span> :
                                                <span className="bg-slate-200 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">Chờ xác nhận</span>}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border-t border-blue-200 pt-6">
                                        <label className="block text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                                            <Paperclip size={16} /> Minh chứng (Bill/Phiếu thu)
                                        </label>
                                        <div className="flex gap-6 items-start">
                                            {/* Preview box */}
                                            <div className="w-48 h-48 bg-white border-2 border-dashed border-slate-300 flex items-center justify-center rounded-lg overflow-hidden relative group hover:border-blue-400 transition-colors">
                                                {formData.paymentProof ? (
                                                    <div className="text-center p-4 w-full h-full flex flex-col items-center justify-center bg-slate-50">
                                                        <FileText className="mx-auto text-blue-500 mb-2" size={32} />
                                                        <span className="text-xs font-medium text-slate-700 w-full truncate px-2 block">{formData.paymentProof}</span>
                                                        <span className="text-[10px] text-slate-400 mt-1">Click to change</span>
                                                    </div>
                                                ) : (
                                                    <div className="text-center text-slate-400">
                                                        <p className="text-xs">Chưa có ảnh</p>
                                                    </div>
                                                )}

                                                {/* Upload Overlay */}
                                                {!isLocked && (
                                                    <label className="absolute inset-0 bg-white/0 hover:bg-black/5 flex items-center justify-center cursor-pointer transition-colors">
                                                        <input type="file" className="hidden" onChange={(e) => {
                                                            if (e.target.files?.[0]) setFormData(p => ({ ...p, paymentProof: e.target.files![0].name }));
                                                        }} />
                                                    </label>
                                                )}
                                            </div>

                                            <div className="flex-1">
                                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Ghi chú giao dịch</label>
                                                <textarea
                                                    value={formData.paymentProof || ''}
                                                    onChange={(e) => !isLocked && setFormData(p => ({ ...p, paymentProof: e.target.value }))}
                                                    disabled={isLocked}
                                                    placeholder="Nhập mã giao dịch, nội dung chuyển khoản hoặc ghi chú thêm..."
                                                    className="w-full h-48 border border-slate-300 rounded-lg p-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none font-mono"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: CHATTER / AUDIT LOG */}
                <div className="w-80 bg-white border border-slate-300 rounded shadow-sm h-full flex flex-col hidden xl:flex">
                    <div className="p-3 border-b border-slate-200 font-bold text-slate-700 text-sm flex justify-between items-center bg-slate-50 rounded-t">
                        <span>Lịch sử hoạt động</span>
                        <Clock size={14} className="text-slate-400" />
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        {/* Timeline */}
                        <div className="relative pl-6 border-l-2 border-slate-200 space-y-6">
                            {/* New Item */}
                            {isNew && (
                                <div className="relative group">
                                    <div className="absolute -left-[31px] w-4 h-4 rounded-full bg-slate-200 border-2 border-white group-hover:bg-blue-400 transition-colors"></div>
                                    <div className="text-[10px] text-slate-400 mb-0.5 uppercase tracking-wide">Vừa xong</div>
                                    <div className="text-xs text-slate-700">Đang tạo báo giá mới...</div>
                                </div>
                            )}

                            {/* Sale Order Item */}
                            {isSaleOrder && (
                                <div className="relative group">
                                    <div className="absolute -left-[31px] w-4 h-4 rounded-full bg-green-500 border-2 border-white group-hover:scale-110 transition-transform"></div>
                                    <div className="text-[10px] text-slate-400 mb-0.5 uppercase tracking-wide">Hôm nay</div>
                                    <div className="text-xs font-bold text-slate-800">Đã chốt đơn hàng (Confirmed)</div>
                                    <div className="text-xs text-slate-500 mt-1">Trạng thái đổi từ <b>Quotation Sent</b> sang <b>Sale Order</b></div>
                                </div>
                            )}

                            {/* Payment Item */}
                            {formData.paymentProof && (
                                <div className="relative group">
                                    <div className="absolute -left-[31px] w-4 h-4 rounded-full bg-purple-500 border-2 border-white group-hover:scale-110 transition-transform"></div>
                                    <div className="text-[10px] text-slate-400 mb-0.5 uppercase tracking-wide">Thanh toán</div>
                                    <div className="text-xs font-medium text-slate-800">Đã tải lên chứng từ</div>
                                    <div className="p-2 bg-slate-50 rounded mt-1 text-xs border border-slate-200 break-words font-mono text-slate-600">{formData.paymentProof}</div>
                                </div>
                            )}

                            <div className="relative group">
                                <div className="absolute -left-[31px] w-4 h-4 rounded-full bg-blue-500 border-2 border-white"></div>
                                <div className="text-[10px] text-slate-400 mb-0.5 uppercase tracking-wide">{new Date(formData.createdAt || '').toLocaleDateString()}</div>
                                <div className="text-xs text-slate-700">Báo giá được tạo bởi <b className="text-blue-700">{formData.createdBy || 'System'}</b></div>
                            </div>
                        </div>
                    </div>

                    <div className="p-3 border-t border-slate-200 bg-slate-50 rounded-b">
                        <div className="flex gap-2">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 flex-shrink-0 border border-blue-200">SM</div>
                            <div className="flex-1">
                                <input className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none bg-white" placeholder="Gửi tin nhắn hoặc ghi chú..." />
                                <div className="flex justify-between mt-2 items-center">
                                    <button className="text-slate-400 hover:text-slate-600 p-1"><Paperclip size={14} /></button>
                                    <button className="bg-slate-800 text-white px-3 py-1 rounded text-xs font-bold hover:bg-black transition-colors">Gửi</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Confirm Sale Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full animate-in zoom-in-95">
                        <h3 className="text-xl font-bold text-slate-900 mb-4">Xác nhận Đơn hàng (Sale Order)</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Hình thức thanh toán</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-2 rounded border border-slate-200 flex-1 hover:border-blue-500 transition-colors">
                                        <input type="radio" value="CK" checked={paymentMethod === 'CK'} onChange={() => setPaymentMethod('CK')} />
                                        <span className="font-medium">Chuyển khoản</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-2 rounded border border-slate-200 flex-1 hover:border-blue-500 transition-colors">
                                        <input type="radio" value="CASH" checked={paymentMethod === 'CASH'} onChange={() => setPaymentMethod('CASH')} />
                                        <span className="font-medium">Tiền mặt</span>
                                    </label>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Mã chứng từ / Bill <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={paymentProof}
                                    onChange={(e) => setPaymentProof(e.target.value)}
                                    placeholder={paymentMethod === 'CK' ? "Nhập mã bill..." : "Số phiếu thu..."}
                                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Upload Ảnh minh chứng</label>
                                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                                    <div className="flex flex-col items-center justify-center pt-2 pb-2">
                                        <p className="text-xs text-slate-500">Click để upload ảnh</p>
                                    </div>
                                    <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && setPaymentProof(prev => prev || e.target.files![0].name)} />
                                </label>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button onClick={() => setShowConfirmModal(false)} className="px-4 py-2 hover:bg-slate-100 rounded text-slate-600 font-bold">Hủy</button>
                                <button onClick={handleConfirmSale} className="px-4 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 disabled:opacity-50" disabled={!paymentProof}>Xác nhận</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* PRINT TEMPLATE */}
            <div className="hidden print:block fixed inset-0 bg-white z-[100] p-12 overflow-y-auto">
                <div className="max-w-4xl mx-auto text-black font-serif">
                    <div className="text-center mb-12">
                        <h1 className="text-3xl font-bold uppercase mb-2">HỢP ĐỒNG ĐĂNG KÝ DỊCH VỤ</h1>
                        <p className="text-sm italic">Số: {formData.soCode}/HĐ-EDU - Ngày: {new Date().toLocaleDateString('vi-VN')}</p>
                    </div>
                    <div className="mb-8">
                        <h2 className="text-lg font-bold border-b-2 border-black mb-4 pb-1 uppercase">I. Bên sử dụng dịch vụ (Bên A)</h2>
                        <table className="w-full text-sm">
                            <tbody>
                                <tr><td className="w-32 py-1 font-bold">Ông/Bà:</td><td>{formData.customerName}</td></tr>
                                <tr><td className="w-32 py-1 font-bold">Điện thoại:</td><td>09xxxxxxx</td></tr>
                                <tr><td className="w-32 py-1 font-bold">Email:</td><td>email@example.com</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <div className="mb-8">
                        <h2 className="text-lg font-bold border-b-2 border-black mb-4 pb-1 uppercase">II. Nội dung dịch vụ (Bên B)</h2>
                        <table className="w-full text-sm border border-black collapse">
                            <thead>
                                <tr className="bg-gray-200">
                                    <th className="border border-black p-2 text-left">Sản phẩm</th>
                                    <th className="border border-black p-2 text-center w-24">SL</th>
                                    <th className="border border-black p-2 text-right w-40">Đơn giá</th>
                                    <th className="border border-black p-2 text-right w-40">Thành tiền</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="border border-black p-2">{formData.product}</td>
                                    <td className="border border-black p-2 text-center">1</td>
                                    <td className="border border-black p-2 text-right">{(formData.amount || 0).toLocaleString()}</td>
                                    <td className="border border-black p-2 text-right">{(formData.amount || 0).toLocaleString()}</td>
                                </tr>
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan={3} className="border border-black p-2 text-right font-bold">Tổng cộng</td>
                                    <td className="border border-black p-2 text-right font-bold">{(formData.amount || 0).toLocaleString()}</td>
                                </tr>
                                <tr>
                                    <td colSpan={3} className="border border-black p-2 text-right font-bold">Chiết khấu</td>
                                    <td className="border border-black p-2 text-right">{(formData.discount || 0).toLocaleString()}</td>
                                </tr>
                                <tr>
                                    <td colSpan={3} className="border border-black p-2 text-right font-bold text-lg">THANH TOÁN</td>
                                    <td className="border border-black p-2 text-right font-bold text-lg">{(formData.finalAmount || 0).toLocaleString()} VNĐ</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    <div className="grid grid-cols-2 mt-16 text-center">
                        <div><p className="font-bold mb-20">ĐẠI DIỆN BÊN A</p><p>{formData.customerName}</p></div>
                        <div><p className="font-bold mb-20">ĐẠI DIỆN BÊN B</p><p>Giám đốc Trung tâm</p></div>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default QuotationDetails;
