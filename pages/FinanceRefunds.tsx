import React, { useEffect, useMemo, useState } from 'react';
import {
    Search,
    ChevronLeft,
    ChevronRight,
    Plus,
    AlertCircle,
    CheckCircle2,
    Undo2,
    Clock,
    MessageSquare,
    X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { IRefundLog, IRefundRequest, RefundStatus } from '../types';
import { addRefund, addRefundLog, getRefundLogs, getRefunds, saveRefunds } from '../utils/storage';

const INITIAL_REFUNDS: IRefundRequest[] = [
    {
        id: 'REF-92817',
        createdAt: '2023-10-24T09:00:00.000Z',
        studentName: 'Phạm Văn Hùng',
        contractCode: 'HD-2024-001',
        program: 'Du học Đức',
        paidAmount: 45000000,
        requestedAmount: 12000000,
        approvedAmount: null,
        reason: 'Rút hồ sơ (Withdrawal)',
        status: 'CHO_KE_TOAN_DUYET'
    },
    {
        id: 'REF-92815',
        createdAt: '2023-10-22T14:00:00.000Z',
        studentName: 'Nguyễn Thị Lan',
        contractCode: 'HD-2024-042',
        program: 'Tiếng Đức A1',
        paidAmount: 8000000,
        requestedAmount: 2000000,
        approvedAmount: 2000000,
        reason: 'Điều chỉnh Học bổng',
        status: 'DA_HOAN_TIEN'
    },
    {
        id: 'REF-92818',
        createdAt: '2023-10-20T11:00:00.000Z',
        studentName: 'Trần Minh Tuấn',
        contractCode: 'HD-2023-891',
        program: 'Du học nghề Úc',
        paidAmount: 4000000,
        requestedAmount: 4000000,
        approvedAmount: 0,
        reason: 'Trùng giao dịch',
        status: 'DA_TU_CHOI'
    },
    {
        id: 'REF-92821',
        createdAt: '2023-10-24T15:00:00.000Z',
        studentName: 'Lê Hoàng',
        contractCode: 'HD-2024-112',
        program: 'Workshop Kỹ năng',
        paidAmount: 25000000,
        requestedAmount: 5000000,
        approvedAmount: null,
        reason: 'Chuyển đổi khóa học',
        status: 'CHO_SALE_DUYET'
    }
];

const INITIAL_REFUND_LOGS: IRefundLog[] = [
    {
        id: 'RLOG-REF-92817-1',
        refundId: 'REF-92817',
        action: 'Tạo yêu cầu',
        createdAt: '2023-10-24T09:00:00.000Z',
        createdBy: 'Sale Admin'
    },
    {
        id: 'RLOG-REF-92817-2',
        refundId: 'REF-92817',
        action: 'Đã duyệt sơ bộ',
        createdAt: '2023-10-24T10:30:00.000Z',
        createdBy: 'Sale Leader'
    },
    {
        id: 'RLOG-REF-92815-1',
        refundId: 'REF-92815',
        action: 'Tạo yêu cầu',
        createdAt: '2023-10-22T14:00:00.000Z',
        createdBy: 'Sale Admin'
    },
    {
        id: 'RLOG-REF-92815-2',
        refundId: 'REF-92815',
        action: 'Đã duyệt chi',
        createdAt: '2023-10-23T09:15:00.000Z',
        createdBy: 'Kế toán trưởng'
    },
    {
        id: 'RLOG-REF-92818-1',
        refundId: 'REF-92818',
        action: 'Auto-detect Duplicate',
        createdAt: '2023-10-20T11:00:00.000Z',
        createdBy: 'System'
    },
    {
        id: 'RLOG-REF-92818-2',
        refundId: 'REF-92818',
        action: 'Từ chối: Đã xử lý ở giao dịch khác',
        createdAt: '2023-10-20T11:05:00.000Z',
        createdBy: 'Kế toán'
    },
    {
        id: 'RLOG-REF-92821-1',
        refundId: 'REF-92821',
        action: 'Tạo yêu cầu',
        createdAt: '2023-10-24T15:00:00.000Z',
        createdBy: 'Sale Rep'
    }
];

const formatCurrency = (val: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');
const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString('vi-VN', { hour12: false });

type RefundFilter = 'ALL' | RefundStatus;

type FormErrors = {
    studentName?: string;
    contractCode?: string;
    paidAmount?: string;
    requestedAmount?: string;
    reason?: string;
};

const STATUS_META: Record<RefundStatus, { label: string; badge: string }> = {
    CHO_SALE_DUYET: { label: 'Chờ Sale duyệt', badge: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    CHO_KE_TOAN_DUYET: {
        label: 'Chờ Kế toán duyệt',
        badge: 'bg-orange-100 text-orange-700 border-orange-200'
    },
    DA_HOAN_TIEN: { label: 'Đã hoàn tiền', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    DA_TU_CHOI: { label: 'Đã từ chối', badge: 'bg-red-100 text-red-700 border-red-200' }
};

const FinanceRefunds: React.FC = () => {
    const { user } = useAuth();
    const [refunds, setRefunds] = useState<IRefundRequest[]>([]);
    const [logs, setLogs] = useState<IRefundLog[]>([]);
    const [statusFilter, setStatusFilter] = useState<RefundFilter>('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [showLogModal, setShowLogModal] = useState<IRefundRequest | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        studentName: '',
        contractCode: '',
        paidAmount: '',
        requestedAmount: '',
        reason: ''
    });
    const [isPaidAmountAuto, setIsPaidAmountAuto] = useState(true);
    const [errors, setErrors] = useState<FormErrors>({});

    const loadData = () => {
        setRefunds(getRefunds());
        setLogs(getRefundLogs());
    };

    useEffect(() => {
        const currentRefunds = getRefunds();
        if (!currentRefunds.length) {
            saveRefunds(INITIAL_REFUNDS);
        }

        const currentLogs = getRefundLogs();
        if (!currentLogs.length) {
            INITIAL_REFUND_LOGS.forEach((item) => addRefundLog(item));
        }

        loadData();

        window.addEventListener('educrm:refunds-changed', loadData as EventListener);
        window.addEventListener('educrm:refund-logs-changed', loadData as EventListener);
        return () => {
            window.removeEventListener('educrm:refunds-changed', loadData as EventListener);
            window.removeEventListener('educrm:refund-logs-changed', loadData as EventListener);
        };
    }, []);

    useEffect(() => {
        if (!toastMessage) return;
        const timer = window.setTimeout(() => setToastMessage(null), 2500);
        return () => window.clearTimeout(timer);
    }, [toastMessage]);

    const contractDirectory = useMemo(() => {
        const map = new Map<
            string,
            { contractCode: string; studentName: string; paidAmount: number; program?: string }
        >();
        refunds.forEach((item) => {
            if (!map.has(item.contractCode)) {
                map.set(item.contractCode, {
                    contractCode: item.contractCode,
                    studentName: item.studentName,
                    paidAmount: item.paidAmount,
                    program: item.program
                });
            }
        });
        return Array.from(map.values());
    }, [refunds]);

    const studentOptions = useMemo(
        () => Array.from(new Set(refunds.map((item) => item.studentName))).sort((a, b) => a.localeCompare(b)),
        [refunds]
    );

    const logMap = useMemo(() => {
        return logs.reduce<Record<string, IRefundLog[]>>((acc, item) => {
            if (!acc[item.refundId]) acc[item.refundId] = [];
            acc[item.refundId].push(item);
            return acc;
        }, {});
    }, [logs]);

    const filteredData = useMemo(() => {
        return refunds
            .filter((item) => {
                if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
                const query = searchTerm.trim().toLowerCase();
                if (!query) return true;
                return [item.id, item.studentName, item.contractCode, item.reason]
                    .join(' ')
                    .toLowerCase()
                    .includes(query);
            })
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [refunds, statusFilter, searchTerm]);

    const selectedLogs = useMemo(() => {
        if (!showLogModal) return [];
        return (logMap[showLogModal.id] || []).sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
    }, [showLogModal, logMap]);

    const getApprovedAmountCell = (item: IRefundRequest) => {
        if (item.status === 'DA_HOAN_TIEN') {
            const approved = typeof item.approvedAmount === 'number' ? item.approvedAmount : item.requestedAmount;
            return <span className="inline-block whitespace-nowrap text-sm font-bold text-emerald-600">{formatCurrency(approved)}</span>;
        }
        if (item.status === 'DA_TU_CHOI') {
            if (item.approvedAmount === 0) {
                return <span className="inline-block whitespace-nowrap text-sm font-bold text-slate-600">{formatCurrency(0)}</span>;
            }
            return <span className="inline-block whitespace-nowrap text-sm text-slate-400">—</span>;
        }
        return <span className="inline-block whitespace-nowrap text-sm text-slate-400 italic">Chưa duyệt</span>;
    };

    const openCreateModal = () => {
        setFormData({
            studentName: '',
            contractCode: '',
            paidAmount: '',
            requestedAmount: '',
            reason: ''
        });
        setIsPaidAmountAuto(true);
        setErrors({});
        setShowCreateModal(true);
    };

    const handleStudentChange = (value: string) => {
        setFormData((prev) => ({ ...prev, studentName: value }));
        setErrors((prev) => ({ ...prev, studentName: undefined }));

        if (!formData.contractCode.trim()) return;
        const matched = contractDirectory.find(
            (item) =>
                item.contractCode.toLowerCase() === formData.contractCode.trim().toLowerCase() &&
                item.studentName.toLowerCase() === value.trim().toLowerCase()
        );
        if (matched) {
            setFormData((prev) => ({ ...prev, paidAmount: String(matched.paidAmount) }));
            setIsPaidAmountAuto(true);
        }
    };

    const handleContractChange = (value: string) => {
        setFormData((prev) => ({ ...prev, contractCode: value }));
        setErrors((prev) => ({ ...prev, contractCode: undefined }));

        const matched = contractDirectory.find((item) => item.contractCode.toLowerCase() === value.trim().toLowerCase());
        if (matched) {
            setFormData((prev) => ({
                ...prev,
                contractCode: value,
                paidAmount: String(matched.paidAmount),
                studentName: prev.studentName || matched.studentName
            }));
            setIsPaidAmountAuto(true);
        } else {
            setIsPaidAmountAuto(false);
        }
    };

    const validateForm = (): boolean => {
        const nextErrors: FormErrors = {};
        const paidAmount = Number(formData.paidAmount);
        const requestedAmount = Number(formData.requestedAmount);

        if (!formData.studentName.trim()) nextErrors.studentName = 'Học viên là bắt buộc.';
        if (!formData.contractCode.trim()) nextErrors.contractCode = 'Mã hợp đồng là bắt buộc.';
        if (!formData.reason.trim()) nextErrors.reason = 'Lý do là bắt buộc.';

        if (!paidAmount || paidAmount <= 0) {
            nextErrors.paidAmount = 'Số tiền đã đóng phải lớn hơn 0.';
        }

        if (!requestedAmount || requestedAmount <= 0) {
            nextErrors.requestedAmount = 'Yêu cầu hoàn phải lớn hơn 0.';
        } else if (paidAmount > 0 && requestedAmount > paidAmount) {
            nextErrors.requestedAmount = 'Yêu cầu hoàn không được lớn hơn số tiền đã đóng.';
        }

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleCreateRefund = () => {
        if (!validateForm()) return;

        const now = new Date().toISOString();
        const newId = `REF-${Math.floor(10000 + Math.random() * 90000)}`;

        const matchedContract = contractDirectory.find(
            (item) => item.contractCode.toLowerCase() === formData.contractCode.trim().toLowerCase()
        );

        const newRecord: IRefundRequest = {
            id: newId,
            createdAt: now,
            studentName: formData.studentName.trim(),
            contractCode: formData.contractCode.trim(),
            program: matchedContract?.program || 'Chưa phân loại',
            paidAmount: Number(formData.paidAmount),
            requestedAmount: Number(formData.requestedAmount),
            approvedAmount: null,
            reason: formData.reason.trim(),
            status: 'CHO_SALE_DUYET'
        };

        addRefund(newRecord);

        addRefundLog({
            id: `RLOG-${Date.now()}`,
            refundId: newRecord.id,
            action: 'Tạo yêu cầu',
            createdAt: now,
            createdBy: user?.name || user?.role || 'Kế toán'
        });

        setShowCreateModal(false);
        setToastMessage('Đã tạo yêu cầu hoàn tiền');
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto bg-[#F8FAFC] min-h-screen font-sans text-slate-900">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Quản lý Yêu cầu Hoàn tiền</h1>
                    <p className="text-slate-500">Xử lý và phê duyệt các yêu cầu hoàn tiền, rút phí từ học viên.</p>
                </div>
                <div>
                    <button
                        onClick={openCreateModal}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-bold shadow-sm transition-all"
                    >
                        <Plus size={18} /> Tạo Yêu cầu mới
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex flex-wrap gap-4 justify-between items-center bg-slate-50/50">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setStatusFilter('ALL')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                                statusFilter === 'ALL'
                                    ? 'bg-slate-800 text-white shadow'
                                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            Tất cả
                        </button>
                        <button
                            onClick={() => setStatusFilter('CHO_SALE_DUYET')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                                statusFilter === 'CHO_SALE_DUYET'
                                    ? 'bg-yellow-500 text-white shadow'
                                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-yellow-50 hover:text-yellow-700'
                            }`}
                        >
                            <Clock size={14} /> Chờ Sale duyệt
                        </button>
                        <button
                            onClick={() => setStatusFilter('CHO_KE_TOAN_DUYET')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                                statusFilter === 'CHO_KE_TOAN_DUYET'
                                    ? 'bg-orange-500 text-white shadow'
                                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-orange-50 hover:text-orange-700'
                            }`}
                        >
                            <AlertCircle size={14} /> Chờ Kế toán duyệt
                        </button>
                        <button
                            onClick={() => setStatusFilter('DA_HOAN_TIEN')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                                statusFilter === 'DA_HOAN_TIEN'
                                    ? 'bg-emerald-600 text-white shadow'
                                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700'
                            }`}
                        >
                            <CheckCircle2 size={14} /> Đã hoàn tiền
                        </button>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Tìm theo tên hoặc mã yêu cầu..."
                            className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1460px] text-left border-collapse">
                        <thead className="bg-[#F8FAFC] border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Mã Yêu cầu</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Học viên</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Mã hợp đồng</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right whitespace-nowrap">Số tiền đã đóng</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right whitespace-nowrap">Yêu cầu hoàn</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right whitespace-nowrap">Số tiền duyệt</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Lý do</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center whitespace-nowrap">Trạng thái</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Log/Ghi chú</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right whitespace-nowrap">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredData.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4 align-middle whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-sm font-bold text-blue-600">{item.id}</span>
                                            <span className="text-xs text-slate-400">{formatDate(item.createdAt)}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 align-middle whitespace-nowrap">
                                        <div className="flex items-center gap-2 max-w-[260px]">
                                            <span className="text-sm font-bold text-slate-900 truncate" title={item.studentName}>
                                                {item.studentName}
                                            </span>
                                            <span className="text-xs text-slate-500 truncate" title={item.program || ''}>
                                                {item.program ? `• ${item.program}` : ''}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 align-middle text-sm font-medium text-slate-600 whitespace-nowrap">{item.contractCode}</td>
                                    <td className="px-6 py-4 align-middle text-right text-sm text-slate-500 whitespace-nowrap">{formatCurrency(item.paidAmount)}</td>
                                    <td className="px-6 py-4 align-middle text-right whitespace-nowrap">
                                        <div className="text-sm font-bold text-orange-600 whitespace-nowrap">{formatCurrency(item.requestedAmount)}</div>
                                    </td>
                                    <td className="px-6 py-4 align-middle text-right whitespace-nowrap">{getApprovedAmountCell(item)}</td>
                                    <td className="px-6 py-4 align-middle whitespace-nowrap">
                                        <span
                                            className="inline-block max-w-[240px] truncate px-2 py-1 rounded bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200"
                                            title={item.reason}
                                        >
                                            {item.reason}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 align-middle text-center whitespace-nowrap">
                                        <span className={`inline-block whitespace-nowrap px-2.5 py-1 rounded text-xs font-bold border ${STATUS_META[item.status].badge}`}>
                                            {STATUS_META[item.status].label}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 align-middle text-center whitespace-nowrap">
                                        <button
                                            onClick={() => setShowLogModal(item)}
                                            className="p-1.5 rounded hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
                                            title="Xem lịch sử xử lý"
                                        >
                                            <MessageSquare size={18} />
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 align-middle text-right whitespace-nowrap">
                                        <div className="flex justify-end items-center gap-2 opacity-100">
                                            {item.status === 'CHO_KE_TOAN_DUYET' && (
                                                <button className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded shadow-sm flex items-center gap-1 whitespace-nowrap">
                                                    <Undo2 size={14} /> Duyệt hoàn tiền
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredData.length === 0 && (
                                <tr>
                                    <td colSpan={10} className="py-12 text-center text-slate-400 italic">
                                        Không tìm thấy yêu cầu hoàn tiền nào trong bộ lọc này.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
                    <span className="text-xs text-slate-500 font-bold">Tổng số: {filteredData.length} bản ghi</span>
                    <div className="flex gap-1">
                        <button className="p-1 rounded hover:bg-slate-200 text-slate-400"><ChevronLeft size={18} /></button>
                        <button className="p-1 rounded hover:bg-slate-200 text-slate-400"><ChevronRight size={18} /></button>
                    </div>
                </div>
            </div>

            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800">Tạo yêu cầu hoàn tiền</h3>
                            <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-semibold text-slate-700">Học viên</label>
                                <input
                                    list="refund-students"
                                    value={formData.studentName}
                                    onChange={(e) => handleStudentChange(e.target.value)}
                                    placeholder="Tìm/chọn học viên"
                                    className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                                />
                                <datalist id="refund-students">
                                    {studentOptions.map((name) => (
                                        <option key={name} value={name} />
                                    ))}
                                </datalist>
                                {errors.studentName && <p className="mt-1 text-xs text-red-600">{errors.studentName}</p>}
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-slate-700">Mã hợp đồng</label>
                                <input
                                    list="refund-contracts"
                                    value={formData.contractCode}
                                    onChange={(e) => handleContractChange(e.target.value)}
                                    placeholder="Nhập/chọn mã hợp đồng"
                                    className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                                />
                                <datalist id="refund-contracts">
                                    {contractDirectory.map((item) => (
                                        <option key={item.contractCode} value={item.contractCode} />
                                    ))}
                                </datalist>
                                {errors.contractCode && <p className="mt-1 text-xs text-red-600">{errors.contractCode}</p>}
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-slate-700">Số tiền đã đóng</label>
                                <input
                                    type="number"
                                    value={formData.paidAmount}
                                    onChange={(e) => {
                                        setFormData((prev) => ({ ...prev, paidAmount: e.target.value }));
                                        setErrors((prev) => ({ ...prev, paidAmount: undefined }));
                                    }}
                                    readOnly={isPaidAmountAuto}
                                    placeholder={isPaidAmountAuto ? 'Tự động theo hợp đồng' : 'Nhập số tiền đã đóng'}
                                    className={`mt-1 w-full border rounded-lg px-3 py-2 text-sm ${
                                        isPaidAmountAuto
                                            ? 'bg-slate-50 border-slate-200 text-slate-500'
                                            : 'border-slate-200'
                                    }`}
                                />
                                {errors.paidAmount && <p className="mt-1 text-xs text-red-600">{errors.paidAmount}</p>}
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-slate-700">Yêu cầu hoàn</label>
                                <input
                                    type="number"
                                    value={formData.requestedAmount}
                                    onChange={(e) => {
                                        setFormData((prev) => ({ ...prev, requestedAmount: e.target.value }));
                                        setErrors((prev) => ({ ...prev, requestedAmount: undefined }));
                                    }}
                                    placeholder="Nhập số tiền yêu cầu hoàn"
                                    className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                                />
                                {errors.requestedAmount && (
                                    <p className="mt-1 text-xs text-red-600">{errors.requestedAmount}</p>
                                )}
                            </div>

                            <div className="md:col-span-2">
                                <label className="text-sm font-semibold text-slate-700">Lý do</label>
                                <textarea
                                    value={formData.reason}
                                    onChange={(e) => {
                                        setFormData((prev) => ({ ...prev, reason: e.target.value }));
                                        setErrors((prev) => ({ ...prev, reason: undefined }));
                                    }}
                                    placeholder="Nhập lý do hoàn tiền"
                                    className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm min-h-[92px]"
                                />
                                {errors.reason && <p className="mt-1 text-xs text-red-600">{errors.reason}</p>}
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-slate-700">Trạng thái</label>
                                <input
                                    value="Chờ Sale duyệt"
                                    readOnly
                                    className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-500"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-slate-700">Số tiền duyệt</label>
                                <input
                                    value="—"
                                    readOnly
                                    className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-500"
                                />
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-4 py-2 bg-white border border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-100 text-sm"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleCreateRefund}
                                className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 text-sm"
                            >
                                Tạo yêu cầu
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showLogModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <Clock size={16} className="text-blue-500" /> Lịch sử xử lý: {showLogModal.id}
                            </h3>
                            <button onClick={() => setShowLogModal(null)} className="text-slate-400 hover:text-slate-600">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-0">
                            <div className="relative">
                                <div className="absolute left-8 top-4 bottom-4 w-0.5 bg-slate-100"></div>

                                <ul className="py-4 space-y-0">
                                    {selectedLogs.map((log, idx) => (
                                        <li key={`${log.id}-${idx}`} className="relative pl-16 pr-6 py-3 hover:bg-slate-50 transition-colors">
                                            <div className="absolute left-6 top-4 w-4 h-4 rounded-full border-2 border-white bg-blue-500 shadow-sm z-10"></div>
                                            <div className="flex justify-between items-start gap-4">
                                                <div>
                                                    <p className="font-bold text-sm text-slate-800">{log.action}</p>
                                                    <p className="text-xs text-slate-500">
                                                        Bởi: <span className="font-semibold text-slate-700">{log.createdBy}</span>
                                                    </p>
                                                </div>
                                                <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded whitespace-nowrap">
                                                    {formatDateTime(log.createdAt)}
                                                </span>
                                            </div>
                                        </li>
                                    ))}
                                    {selectedLogs.length === 0 && (
                                        <li className="px-6 py-6 text-sm text-slate-400 italic">Chưa có log note cho yêu cầu này.</li>
                                    )}
                                </ul>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 text-right">
                            <button onClick={() => setShowLogModal(null)} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-100 text-sm">
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toastMessage && (
                <div className="fixed top-6 right-6 z-[70] bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-semibold">
                    {toastMessage}
                </div>
            )}
        </div>
    );
};

export default FinanceRefunds;
