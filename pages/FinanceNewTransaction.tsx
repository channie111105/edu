
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar, 
  UploadCloud, 
  CheckCircle2, 
  CreditCard, 
  DollarSign, 
  FileText,
  ChevronDown
} from 'lucide-react';

const FinanceNewTransaction: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const studentName = searchParams.get('student') || 'Nguyễn Thùy Linh';
  const installmentId = searchParams.get('installmentId');

  // Form State
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [method, setMethod] = useState('transfer');
  const [installment, setInstallment] = useState(installmentId || '');
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = () => {
    // Logic gọi API lưu giao dịch ở đây
    alert(`Đã ghi nhận thanh toán thành công!\nSố tiền: ${parseInt(amount).toLocaleString()} đ\nHình thức: ${method}`);
    navigate(-1); // Quay lại trang trước
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] font-sans text-[#111418] overflow-y-auto">
      <div className="flex flex-1 justify-center py-5">
        <div className="layout-content-container flex flex-col w-[600px] max-w-[960px] flex-1 px-4 md:px-0">
          
          {/* Header */}
          <div className="flex items-center gap-2 mb-6">
             <button 
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
             >
                <ArrowLeft size={24} className="text-slate-600" />
             </button>
             <h1 className="text-[#111418] text-[28px] font-bold leading-tight tracking-[-0.015em]">Ghi nhận Giao dịch Mới</h1>
          </div>

          <div className="bg-white rounded-xl border border-[#dbe0e6] shadow-sm p-6 space-y-6">
            
            {/* Student Info Banner */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-bold">
                    {studentName.charAt(0)}
                </div>
                <div>
                    <p className="text-xs text-slate-500 uppercase font-bold">Học viên</p>
                    <p className="text-sm font-bold text-[#111418]">{studentName}</p>
                </div>
            </div>

            {/* Amount */}
            <div className="flex flex-col gap-2">
              <label className="text-[#111418] text-sm font-bold leading-normal">Số tiền thực thu (VNĐ) <span className="text-red-500">*</span></label>
              <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="number"
                    placeholder="Ví dụ: 10,000,000"
                    className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#111418] focus:outline-0 focus:ring-2 focus:ring-blue-100 border border-[#dbe0e6] bg-white focus:border-blue-500 h-14 placeholder:text-[#617589] pl-10 pr-4 text-lg font-bold leading-normal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
              </div>
            </div>

            {/* Date */}
            <div className="flex flex-col gap-2">
              <label className="text-[#111418] text-sm font-bold leading-normal">Ngày thanh toán</label>
              <div className="relative">
                  <input
                    type="date"
                    className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#111418] focus:outline-0 focus:ring-2 focus:ring-blue-100 border border-[#dbe0e6] bg-white focus:border-blue-500 h-14 px-4 text-base font-normal leading-normal"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                  <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
              </div>
            </div>

            {/* Method */}
            <div className="flex flex-col gap-2">
              <label className="text-[#111418] text-sm font-bold leading-normal">Phương thức thanh toán</label>
              <div className="relative">
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#111418] focus:outline-0 focus:ring-2 focus:ring-blue-100 border border-[#dbe0e6] bg-white focus:border-blue-500 h-14 px-4 appearance-none text-base font-normal leading-normal"
                >
                  <option value="transfer">Chuyển khoản Ngân hàng</option>
                  <option value="cash">Tiền mặt</option>
                  <option value="pos">Quẹt thẻ (POS)</option>
                  <option value="gateway">Cổng thanh toán Online</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
              </div>
            </div>

            {/* Linked Installment */}
            <div className="flex flex-col gap-2">
              <label className="text-[#111418] text-sm font-bold leading-normal">Liên kết Đợt thanh toán</label>
              <div className="relative">
                <select
                  value={installment}
                  onChange={(e) => setInstallment(e.target.value)}
                  className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#111418] focus:outline-0 focus:ring-2 focus:ring-blue-100 border border-[#dbe0e6] bg-white focus:border-blue-500 h-14 pl-10 pr-4 appearance-none text-base font-normal leading-normal"
                >
                  <option value="">-- Chọn đợt nợ --</option>
                  <option value="ins-1">Đợt 1 (Đặt cọc) - 10.000.000 đ</option>
                  <option value="ins-2">Đợt 2 (Giữa khóa) - 10.000.000 đ</option>
                  <option value="ins-3">Đợt 3 (Cuối khóa) - 10.000.000 đ (Quá hạn)</option>
                  <option value="other">Thu khác (Phí thi, giáo trình...)</option>
                </select>
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
              </div>
            </div>

            {/* Proof Upload */}
            <div className="flex flex-col gap-2">
                <label className="text-[#111418] text-sm font-bold leading-normal">Minh chứng (UNC / Biên lai)</label>
                <label className="flex flex-col items-center gap-4 rounded-lg border-2 border-dashed border-[#dbe0e6] px-6 py-10 hover:bg-slate-50 transition-colors cursor-pointer bg-slate-50/50">
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                            <UploadCloud size={24} />
                        </div>
                        <p className="text-[#111418] text-lg font-bold leading-tight tracking-[-0.015em] text-center">
                            {file ? file.name : 'Tải lên minh chứng'}
                        </p>
                        <p className="text-[#64748B] text-sm font-normal leading-normal text-center">
                            Kéo thả hoặc bấm để chọn ảnh/PDF
                        </p>
                    </div>
                    <input type="file" className="hidden" onChange={handleFileChange} />
                </label>
            </div>

            {/* Actions */}
            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                onClick={handleSubmit}
                className="flex min-w-[140px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-6 bg-[#1380ec] text-white text-base font-bold leading-normal tracking-[0.015em] hover:bg-blue-700 transition-colors shadow-md gap-2"
              >
                <CheckCircle2 size={20} />
                <span className="truncate">Xác nhận Thu tiền</span>
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceNewTransaction;
