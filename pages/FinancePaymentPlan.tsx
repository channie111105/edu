
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Undo2, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Calendar, 
  DollarSign,
  History,
  FileText,
  AlertTriangle,
  CreditCard,
  MoreHorizontal
} from 'lucide-react';

const FinancePaymentPlan: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [showRefundModal, setShowRefundModal] = useState(false);

  // Mock Data
  const PLAN_SUMMARY = {
    totalValue: 30000000,
    paid: 15000000,
    remaining: 15000000
  };

  const INSTALLMENTS = [
    {
      id: 'ins-1',
      phase: 'Đợt 1 (Đặt cọc)',
      totalAmount: 10000000,
      paidAmount: 10000000,
      dueDate: '15/08/2024',
      condition: 'Trước khi xếp lớp A1',
      status: 'Paid',
      transactions: 1
    },
    {
      id: 'ins-2',
      phase: 'Đợt 2 (Giữa khóa)',
      totalAmount: 10000000,
      paidAmount: 5000000, // Partial payment
      dueDate: '15/09/2024',
      condition: 'Sau 1 tháng học A1',
      status: 'Partial',
      transactions: 2 // Đã đóng 2 lần lắt nhắt
    },
    {
      id: 'ins-3',
      phase: 'Đợt 3 (Cuối khóa)',
      totalAmount: 10000000,
      paidAmount: 0,
      dueDate: '15/10/2024',
      condition: 'Trước kỳ thi cuối khóa',
      status: 'Overdue',
      transactions: 0
    }
  ];

  const HISTORY = [
    { title: 'Kế hoạch thanh toán được tạo', date: '01/07/2024', icon: Calendar, color: 'text-[#111418]' },
    { title: 'Thanh toán Đợt 1 thành công (10tr)', date: '15/08/2024', icon: DollarSign, color: 'text-[#111418]' },
    { title: 'Thanh toán một phần Đợt 2 (3tr)', date: '14/09/2024', icon: DollarSign, color: 'text-[#111418]' },
    { title: 'Thanh toán một phần Đợt 2 (2tr)', date: '20/09/2024', icon: DollarSign, color: 'text-[#111418]' },
    { title: 'Quá hạn thanh toán Đợt 3', date: '16/10/2024', icon: AlertTriangle, color: 'text-red-500' },
  ];

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  const handleCollectMoney = (installmentId?: string) => {
      const url = `/finance/transaction/new?student=Nguyễn Thùy Linh${installmentId ? `&installmentId=${installmentId}` : ''}`;
      navigate(url);
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] font-sans text-[#111418] overflow-y-auto">
      
      {/* Header Container */}
      <div className="flex flex-col flex-1 max-w-[1200px] mx-auto w-full p-6">
        
        {/* Top Navigation */}
        <div className="flex items-center mb-6">
            <button 
            onClick={() => navigate('/finance')}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors mr-2"
            title="Quay lại Tổng quan"
            >
            <ArrowLeft size={24} className="text-slate-600" />
            </button>
            <div>
                <h1 className="text-2xl font-bold text-[#111418]">Chi tiết Kế hoạch Thanh toán</h1>
                <p className="text-sm text-[#64748B]">Học viên: <span className="font-semibold text-slate-900">Nguyễn Thùy Linh</span> | Khóa học: Tiếng Đức A1-B1</p>
            </div>
        </div>

        {/* Action Header */}
        <div className="flex flex-wrap items-end justify-between gap-3 p-4 bg-white rounded-xl border border-[#dbe0e6] shadow-sm mb-6">
            <div className="flex min-w-72 flex-col gap-1">
                <p className="text-[#111418] text-lg font-bold leading-tight">Mã hồ sơ: {id || 'STU-2024-001'}</p>
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700">
                        Nợ quá hạn
                    </span>
                    <span className="text-sm text-[#64748B]">Cập nhật lần cuối: Hôm nay</span>
                </div>
            </div>
            <div className="flex gap-3">
                <button 
                    onClick={() => setShowRefundModal(true)}
                    className="flex items-center gap-2 rounded-lg bg-white border border-red-200 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors shadow-sm"
                >
                    <Undo2 size={18} />
                    Yêu cầu Hoàn tiền
                </button>
                <button 
                    onClick={() => handleCollectMoney()}
                    className="flex items-center gap-2 rounded-lg bg-[#0066FF] px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition-colors shadow-md"
                >
                    <DollarSign size={18} />
                    Thu tiền
                </button>
            </div>
        </div>

        {/* Financial Summary Cards */}
        <h2 className="text-[#111418] text-[22px] font-bold leading-tight tracking-[-0.015em] pb-3">Tổng quan Tài chính</h2>
        <div className="flex flex-wrap gap-4 mb-8">
            <div className="flex min-w-[158px] flex-1 flex-col gap-2 rounded-xl p-6 border border-[#dbe0e6] bg-white shadow-sm">
                <p className="text-[#64748B] text-sm font-bold uppercase tracking-wider">Tổng giá trị Hợp đồng</p>
                <p className="text-[#111418] text-2xl font-black">{formatCurrency(PLAN_SUMMARY.totalValue)}</p>
            </div>
            <div className="flex min-w-[158px] flex-1 flex-col gap-2 rounded-xl p-6 border border-blue-100 bg-blue-50 shadow-sm">
                <p className="text-blue-700 text-sm font-bold uppercase tracking-wider">Đã thanh toán</p>
                <p className="text-blue-700 text-2xl font-black">{formatCurrency(PLAN_SUMMARY.paid)}</p>
                <div className="w-full bg-blue-200 h-1.5 rounded-full mt-1">
                    <div className="bg-blue-600 h-1.5 rounded-full" style={{width: '50%'}}></div>
                </div>
            </div>
            <div className="flex min-w-[158px] flex-1 flex-col gap-2 rounded-xl p-6 border border-[#dbe0e6] bg-white shadow-sm">
                <p className="text-[#64748B] text-sm font-bold uppercase tracking-wider">Dư nợ còn lại</p>
                <p className="text-[#111418] text-2xl font-black">{formatCurrency(PLAN_SUMMARY.remaining)}</p>
            </div>
        </div>

        {/* Installments Table (Updated for Partial Payments) */}
        <h2 className="text-[#111418] text-[22px] font-bold leading-tight tracking-[-0.015em] pb-3">Lộ trình đóng phí & Tiến độ</h2>
        <div className="mb-8 overflow-hidden rounded-xl border border-[#dbe0e6] bg-white shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-[#dbe0e6]">
                            <th className="px-6 py-4 text-left text-[#111418] text-sm font-bold leading-normal w-[200px]">Đợt thanh toán</th>
                            <th className="px-6 py-4 text-left text-[#111418] text-sm font-bold leading-normal">Tiến độ đóng</th>
                            <th className="px-6 py-4 text-left text-[#111418] text-sm font-bold leading-normal">Hạn nộp</th>
                            <th className="px-6 py-4 text-left text-[#111418] text-sm font-bold leading-normal">Điều kiện mở khóa</th>
                            <th className="px-6 py-4 text-left text-[#111418] text-sm font-bold leading-normal">Trạng thái</th>
                            <th className="px-6 py-4 text-right text-[#617589] text-sm font-bold leading-normal">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#dbe0e6]">
                        {INSTALLMENTS.map((item, idx) => {
                            const percentage = Math.min((item.paidAmount / item.totalAmount) * 100, 100);
                            return (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                    <p className="text-[#111418] text-sm font-bold">{item.phase}</p>
                                    <p className="text-[#64748B] text-xs">Tổng: {formatCurrency(item.totalAmount)}</p>
                                </td>
                                <td className="px-6 py-4 align-middle">
                                    <div className="flex flex-col gap-1 w-[180px]">
                                        <div className="flex justify-between text-xs">
                                            <span className="font-bold text-blue-700">{formatCurrency(item.paidAmount)}</span>
                                            <span className="text-[#64748B]">{percentage.toFixed(0)}%</span>
                                        </div>
                                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full transition-all duration-500 ${percentage >= 100 ? 'bg-green-500' : 'bg-blue-600'}`} 
                                                style={{ width: `${percentage}%` }}
                                            ></div>
                                        </div>
                                        {item.transactions > 0 && item.status !== 'Paid' && (
                                            <span className="text-[10px] text-slate-500 italic">Đã đóng {item.transactions} lần (Partial)</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-[#617589] text-sm">{item.dueDate}</td>
                                <td className="px-6 py-4 text-[#617589] text-sm">{item.condition}</td>
                                <td className="px-6 py-4">
                                    {item.status === 'Paid' && (
                                        <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-bold text-green-700 ring-1 ring-inset ring-green-600/20">
                                            <CheckCircle2 size={12} className="mr-1" /> Đã thu đủ
                                        </span>
                                    )}
                                    {item.status === 'Overdue' && (
                                        <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-700 ring-1 ring-inset ring-red-600/20">
                                            <AlertCircle size={12} className="mr-1" /> Quá hạn
                                        </span>
                                    )}
                                    {item.status === 'Partial' && (
                                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                                            <Clock size={12} className="mr-1" /> Còn thiếu
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {item.status !== 'Paid' ? (
                                        <button 
                                            onClick={() => handleCollectMoney(item.id)}
                                            className="text-[#0066FF] text-sm font-bold hover:underline"
                                        >
                                            Thu tiếp
                                        </button>
                                    ) : (
                                        <button className="text-[#617589] text-sm font-bold hover:text-[#111418] flex items-center justify-end gap-1 ml-auto">
                                            <FileText size={14} /> Xem Invoice
                                        </button>
                                    )}
                                </td>
                            </tr>
                        )})}
                    </tbody>
                </table>
            </div>
        </div>

        {/* History Timeline */}
        <h2 className="text-[#111418] text-[22px] font-bold leading-tight tracking-[-0.015em] pb-3">Lịch sử Giao dịch chi tiết</h2>
        <div className="grid grid-cols-[40px_1fr] gap-x-2 px-4">
            {HISTORY.map((event, index) => {
                const isLast = index === HISTORY.length - 1;
                return (
                    <React.Fragment key={index}>
                        <div className="flex flex-col items-center gap-1 pt-1">
                            <div className={event.color}><event.icon size={20} /></div>
                            {!isLast && <div className="w-[1.5px] bg-[#dbe0e6] h-full my-1"></div>}
                        </div>
                        <div className="flex flex-1 flex-col py-1 pb-6">
                            <p className="text-[#111418] text-base font-medium leading-normal">{event.title}</p>
                            <p className="text-[#617589] text-sm font-normal leading-normal">{event.date}</p>
                        </div>
                    </React.Fragment>
                );
            })}
        </div>

      </div>

      {/* REFUND MODAL */}
      {showRefundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowRefundModal(false)}></div>
           <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-[500px] overflow-hidden animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-200 p-5 bg-slate-50">
                 <h3 className="text-xl font-bold text-[#111418]">Yêu cầu Hoàn tiền (Refund)</h3>
                 <button onClick={() => setShowRefundModal(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={24} />
                 </button>
              </div>
              
              <div className="p-6 flex flex-col gap-4">
                 <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-[#111418]">Số tiền đề xuất hoàn lại (VNĐ)</label>
                    <input 
                        type="number" 
                        className="rounded-lg border border-[#dbe0e6] px-4 py-2.5 focus:border-[#0066FF] focus:ring-2 focus:ring-blue-100 outline-none w-full font-bold"
                        placeholder="0" 
                    />
                 </div>
                 <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-[#111418]">Lý do hoàn tiền</label>
                    <textarea 
                        rows={4}
                        className="rounded-lg border border-[#dbe0e6] px-4 py-2.5 focus:border-[#0066FF] focus:ring-2 focus:ring-blue-100 outline-none w-full resize-none"
                        placeholder="Vui lòng nhập lý do chi tiết để kế toán trưởng phê duyệt..." 
                    ></textarea>
                 </div>
              </div>

              <div className="p-5 border-t border-slate-200 bg-slate-50 flex gap-3">
                 <button 
                    onClick={() => setShowRefundModal(false)}
                    className="flex-1 rounded-lg border border-[#dbe0e6] py-2.5 text-center text-sm font-bold text-[#111418] hover:bg-slate-200 transition-colors"
                 >
                    Hủy bỏ
                 </button>
                 <button 
                    onClick={() => { alert("Đã gửi yêu cầu hoàn tiền!"); setShowRefundModal(false); }}
                    className="flex-1 rounded-lg bg-[#0066FF] py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition-colors shadow-sm"
                 >
                    Gửi yêu cầu
                 </button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default FinancePaymentPlan;
