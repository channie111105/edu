
import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Plus, 
  Filter, 
  Search, 
  Wallet, 
  Briefcase, 
  Download, 
  FileText, 
  CheckCircle2, 
  Clock,
  MoreVertical
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const FinanceMoneyOut: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'petty_cash' | 'accounts_payable'>('petty_cash');

  // Mock Data: Petty Cash (Sổ quỹ)
  const PETTY_CASH = [
    { id: 'PC-001', desc: 'Mua văn phòng phẩm tháng 10', amount: 500000, category: 'Hành chính', spender: 'Lễ tân - Lan', date: '24/10/2023', status: 'approved' },
    { id: 'PC-002', desc: 'Sửa điều hòa phòng học 2', amount: 1200000, category: 'Cơ sở vật chất', spender: 'Bảo vệ - Hùng', date: '23/10/2023', status: 'pending' },
    { id: 'PC-003', desc: 'Tiếp khách đối tác du học', amount: 2000000, category: 'Tiếp khách', spender: 'Giám đốc - Sarah', date: '22/10/2023', status: 'approved' },
  ];

  // Mock Data: Accounts Payable (Công nợ phải trả)
  const PAYABLES = [
    { id: 'AP-001', partner: 'Đại học Goethe (Đức)', desc: 'Phí xử lý hồ sơ đợt 1', amount: 50000000, dueDate: '30/10/2023', status: 'due_soon' },
    { id: 'AP-002', partner: 'Nhà xuất bản Giáo dục', desc: 'Nhập sách giáo trình A1', amount: 15000000, dueDate: '01/11/2023', status: 'pending' },
    { id: 'AP-003', partner: 'Công ty Visa Fast', desc: 'Phí dịch vụ Visa nhóm 5', amount: 8000000, dueDate: '20/10/2023', status: 'overdue' },
  ];

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#111418] font-sans overflow-hidden">
        <div className="flex flex-col flex-1 overflow-y-auto p-6 lg:p-8">
            
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => navigate('/finance')} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                    <ArrowLeft size={24} className="text-slate-600" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Quản lý Chi tiêu (Money Out)</h1>
                    <p className="text-sm text-slate-500">Kiểm soát sổ quỹ tiền mặt và công nợ phải trả đối tác.</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b border-slate-200">
                <button 
                    onClick={() => setActiveTab('petty_cash')}
                    className={`pb-3 px-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'petty_cash' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <Wallet size={18} /> Sổ quỹ (Petty Cash)
                </button>
                <button 
                    onClick={() => setActiveTab('accounts_payable')}
                    className={`pb-3 px-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'accounts_payable' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <Briefcase size={18} /> Công nợ Đối tác (AP)
                </button>
            </div>

            {/* Content Based on Tab */}
            {activeTab === 'petty_cash' ? (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                        <div className="flex gap-2">
                            <button className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50">
                                <Filter size={16} /> Lọc
                            </button>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input type="text" placeholder="Tìm phiếu chi..." className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                        </div>
                        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm">
                            <Plus size={18} /> Lập Phiếu Chi
                        </button>
                    </div>
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold">
                            <tr>
                                <th className="px-6 py-4">Mã Phiếu</th>
                                <th className="px-6 py-4">Nội dung chi</th>
                                <th className="px-6 py-4">Số tiền</th>
                                <th className="px-6 py-4">Người chi</th>
                                <th className="px-6 py-4">Trạng thái</th>
                                <th className="px-6 py-4 text-right"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {PETTY_CASH.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-mono text-xs font-bold text-blue-600">{item.id}</td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-bold text-slate-900">{item.desc}</p>
                                        <p className="text-xs text-slate-500">{item.category} • {item.date}</p>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-slate-900">{formatCurrency(item.amount)}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{item.spender}</td>
                                    <td className="px-6 py-4">
                                        {item.status === 'approved' ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">
                                                <CheckCircle2 size={12} /> Đã duyệt
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                                                <Clock size={12} /> Chờ duyệt
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-slate-400 hover:text-slate-600"><MoreVertical size={18} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                        <div className="flex gap-2">
                            <button className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50">
                                <Filter size={16} /> Lọc Đối tác
                            </button>
                        </div>
                        <button className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm">
                            <Plus size={18} /> Ghi nhận Công nợ
                        </button>
                    </div>
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold">
                            <tr>
                                <th className="px-6 py-4">Đối tác</th>
                                <th className="px-6 py-4">Nội dung</th>
                                <th className="px-6 py-4">Số tiền phải trả</th>
                                <th className="px-6 py-4">Hạn thanh toán</th>
                                <th className="px-6 py-4">Trạng thái</th>
                                <th className="px-6 py-4 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {PAYABLES.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 text-sm font-bold text-slate-900">{item.partner}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{item.desc}</td>
                                    <td className="px-6 py-4 text-sm font-bold text-red-600">{formatCurrency(item.amount)}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{item.dueDate}</td>
                                    <td className="px-6 py-4">
                                        {item.status === 'overdue' && <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded">Quá hạn</span>}
                                        {item.status === 'due_soon' && <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded">Sắp đến hạn</span>}
                                        {item.status === 'pending' && <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded">Chưa thanh toán</span>}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-blue-600 hover:underline text-xs font-bold">Thanh toán ngay</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

        </div>
    </div>
  );
};

export default FinanceMoneyOut;
