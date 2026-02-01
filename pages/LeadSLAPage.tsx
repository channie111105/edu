
import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import SLACountdown from '../components/SLACountdown';
import { 
  Bell, 
  ChevronRight, 
  Circle, 
  User, 
  Loader2,
  ChevronDown,
  Save,
  ShieldAlert,
  RefreshCw,
  ThumbsDown,
  ThumbsUp,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  GitMerge,
  TrendingUp,
  ArrowRight
} from 'lucide-react';
import { LeadStatus } from '../types';

const LeadSLAPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState(LeadStatus.NEW);
  const [auditStatus, setAuditStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');

  // Mock createdAt for SLA (35 mins ago -> Overdue)
  const createdAt = new Date(Date.now() - 1000 * 60 * 35).toISOString();

  // Mock Sales Rep Info
  const salesRep = {
    name: 'Sarah Miller',
    team: 'Team Đức 01',
    slaBreaches: 3 // Số lần vi phạm trong tháng
  };

  const handleRecycle = () => {
    if(window.confirm('Bạn có chắc chắn muốn thu hồi Lead này từ Sarah Miller và đưa về bể chung (Pool) không?')) {
        alert('Đã thu hồi Lead thành công! Lead đang ở trạng thái Chờ phân bổ.');
        navigate('/leads');
    }
  };

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-white overflow-x-hidden font-sans text-[#111418]">
      
      {/* Header */}
      <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#f0f2f4] px-10 py-3 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-4 text-[#111418]">
            <Link to={`/leads/${id}`} className="flex items-center gap-2 hover:text-blue-600 transition-colors">
               <ChevronRight className="rotate-180" size={20} />
               <span className="text-sm font-medium">Quay lại chi tiết Lead</span>
            </Link>
          </div>
          <div className="flex flex-1 justify-end gap-3 items-center">
             <span className="text-sm text-slate-500">Đang xem dưới quyền: </span>
             <span className="text-sm font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded border border-blue-200">Marketing Audit</span>
          </div>
      </header>

      <div className="gap-6 px-6 flex flex-1 justify-center py-5 flex-wrap lg:flex-nowrap">
          
          {/* LEFT COLUMN: Lead Processing Info */}
          <div className="flex flex-col w-full lg:max-w-[800px] flex-1">
            <div className="flex flex-col gap-1 p-4">
              <p className="text-[#111418] tracking-light text-[32px] font-bold leading-tight">Đối soát & Chất lượng (Audit)</p>
              <p className="text-[#617589] text-sm font-normal leading-normal">Kiểm tra tuân thủ quy trình xử lý Lead của nhân viên Sales.</p>
            </div>

            {/* SLA Alert Banner (Marketing View) */}
            <div className="mx-4 mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
               <div className="bg-red-100 p-2 rounded-full text-red-600">
                  <ShieldAlert size={24} />
               </div>
               <div className="flex-1">
                  <h3 className="text-red-800 font-bold text-sm">Phát hiện Vi phạm SLA (Cấp độ 2)</h3>
                  <p className="text-red-700 text-sm mt-1">
                     Lead này đã quá hạn xử lý <strong>5 phút</strong>. Nhân viên <strong>{salesRep.name}</strong> chưa thực hiện cuộc gọi đầu tiên.
                  </p>
                  <p className="text-xs text-red-600 mt-2 italic">
                     *Đây là lần vi phạm thứ {salesRep.slaBreaches} trong tháng của nhân viên này.
                  </p>
               </div>
               <button 
                  onClick={handleRecycle}
                  className="bg-white border border-red-200 text-red-700 hover:bg-red-100 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-colors"
               >
                  <RefreshCw size={14} /> Thu hồi ngay
               </button>
            </div>

            {/* Read-Only View of Sales Input (Audit Mode) */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl mx-4 p-6 relative">
               <div className="absolute top-4 right-4 bg-slate-200 text-slate-600 px-2 py-1 rounded text-xs font-bold">
                  Dữ liệu từ Sales
               </div>
               
               <h3 className="font-bold text-slate-800 mb-4">Thông tin xử lý hiện tại</h3>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase">Trạng thái Sales cập nhật</label>
                     <div className="mt-1 font-medium text-slate-900 bg-white border border-slate-200 px-3 py-2 rounded-lg">
                        Đạt chuẩn (Qualified)
                     </div>
                  </div>
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase">Lý do từ chối (Nếu có)</label>
                     <div className="mt-1 font-medium text-slate-400 italic bg-white border border-slate-200 px-3 py-2 rounded-lg">
                        (Chưa có dữ liệu)
                     </div>
                  </div>

                  {/* NEW: Lifecycle Stage Section */}
                  <div className="col-span-1 md:col-span-2">
                     <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 mb-1">
                        <GitMerge size={14} /> Trạng thái Vòng đời & Pipeline
                     </label>
                     <div className="bg-white border border-slate-200 rounded-lg p-3">
                        <div className="flex justify-between items-center mb-2">
                           <div className="flex items-center gap-2">
                              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold uppercase">Deal Created</span>
                              <ArrowRight size={14} className="text-slate-400" />
                              <span className="font-bold text-slate-900 text-sm">Thương lượng (Negotiation)</span>
                           </div>
                           <span className="text-emerald-600 text-xs font-bold flex items-center gap-1">
                              <TrendingUp size={14} /> 80% Win Rate
                           </span>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="w-full bg-slate-100 rounded-full h-2 mb-1">
                           <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: '80%' }}></div>
                        </div>
                        <p className="text-[10px] text-slate-500 text-right">Dự kiến chốt: 15/11/2023</p>
                     </div>
                  </div>

                  <div className="col-span-1 md:col-span-2">
                     <label className="text-xs font-bold text-slate-500 uppercase">Ghi chú của Sales</label>
                     <div className="mt-1 text-sm text-slate-900 bg-white border border-slate-200 px-3 py-3 rounded-lg min-h-[80px]">
                        Khách hàng rất quan tâm đến chương trình du học nghề. Đã gửi báo giá và đang chờ phản hồi về tài chính gia đình.
                     </div>
                  </div>
               </div>
            </div>

            {/* QA Feedback Section */}
            <div className="mx-4 mt-6">
               <h2 className="text-[#111418] text-lg font-bold mb-3">Đánh giá Chất lượng Xử lý (QA Feedback)</h2>
               <div className="bg-white border border-[#dbe0e6] rounded-xl p-6 shadow-sm">
                  <p className="text-sm text-slate-600 mb-4">Bạn đánh giá thế nào về cách {salesRep.name} xử lý Lead này?</p>
                  
                  <div className="flex gap-4 mb-4">
                     <button 
                        onClick={() => setAuditStatus('approved')}
                        className={`flex-1 py-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${auditStatus === 'approved' ? 'bg-green-50 border-green-500 text-green-700 ring-1 ring-green-500' : 'border-slate-200 hover:bg-slate-50'}`}
                     >
                        <ThumbsUp size={18} /> Đúng quy trình
                     </button>
                     <button 
                        onClick={() => setAuditStatus('rejected')}
                        className={`flex-1 py-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${auditStatus === 'rejected' ? 'bg-red-50 border-red-500 text-red-700 ring-1 ring-red-500' : 'border-slate-200 hover:bg-slate-50'}`}
                     >
                        <ThumbsDown size={18} /> Làm ẩu / Sai
                     </button>
                  </div>

                  {auditStatus === 'rejected' && (
                     <div className="animate-in slide-in-from-top-2">
                        <label className="text-sm font-bold text-slate-700 mb-1 block">Lỗi vi phạm là gì?</label>
                        <select className="w-full mb-3 px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-red-500">
                           <option>Gọi điện hời hợt / Không tư vấn kỹ</option>
                           <option>Gác máy trước khách hàng</option>
                           <option>Không cập nhật ghi chú hệ thống</option>
                           <option>Loại bỏ Lead tiềm năng sai lý do</option>
                        </select>
                        <textarea 
                           className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:border-red-500 outline-none" 
                           placeholder="Nhập ghi chú nhắc nhở cho Sales..."
                           rows={3}
                        ></textarea>
                     </div>
                  )}

                  <div className="flex justify-end mt-4">
                     <button className="bg-[#1380ec] text-white px-6 py-2 rounded-lg font-bold text-sm shadow-md hover:bg-blue-700 transition-colors flex items-center gap-2">
                        <Save size={16} /> Lưu đánh giá
                     </button>
                  </div>
               </div>
            </div>

            {/* Timeline */}
            <h2 className="text-[#111418] text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">Dòng thời gian (System Logs)</h2>
            <div className="grid grid-cols-[40px_1fr] gap-x-2 px-4">
              {/* Event 1 */}
              <div className="flex flex-col items-center gap-1 pt-3">
                <div className="text-blue-600"><CheckCircle2 size={24} /></div>
                <div className="w-[1.5px] bg-[#dbe0e6] h-2 grow"></div>
              </div>
              <div className="flex flex-1 flex-col py-3">
                <p className="text-[#111418] text-base font-bold leading-normal">Lead được tạo & Phân bổ</p>
                <p className="text-[#617589] text-sm font-normal leading-normal">Hôm nay, 09:00 AM • Gán cho: {salesRep.name}</p>
              </div>

              {/* Event 2 */}
              <div className="flex flex-col items-center gap-1">
                <div className="w-[1.5px] bg-[#dbe0e6] h-2"></div>
                <div className="text-amber-500"><Bell size={24} /></div>
                <div className="w-[1.5px] bg-[#dbe0e6] h-2 grow"></div>
              </div>
              <div className="flex flex-1 flex-col py-3">
                <p className="text-[#111418] text-base font-bold leading-normal">Cảnh báo SLA (Warning)</p>
                <p className="text-[#617589] text-sm font-normal leading-normal">Hôm nay, 09:05 AM • System Auto</p>
              </div>

              {/* Event 3 */}
              <div className="flex flex-col items-center gap-1">
                <div className="w-[1.5px] bg-[#dbe0e6] h-2"></div>
                <div className="text-red-500"><AlertTriangle size={24} /></div>
                <div className="w-[1.5px] bg-[#dbe0e6] h-2 grow"></div>
              </div>
              <div className="flex flex-1 flex-col py-3">
                <p className="text-red-700 text-base font-bold leading-normal">Vi phạm SLA (Breach)</p>
                <p className="text-red-600 text-sm font-normal leading-normal">Hôm nay, 09:30 AM • Quá 30 phút chưa xử lý</p>
              </div>

              {/* NEW EVENT: Converted to Deal */}
              <div className="flex flex-col items-center gap-1 pb-3">
                <div className="w-[1.5px] bg-[#dbe0e6] h-2"></div>
                <div className="text-green-600"><GitMerge size={24} /></div>
              </div>
              <div className="flex flex-1 flex-col py-3">
                <p className="text-[#111418] text-base font-bold leading-normal">Chuyển đổi sang Deal</p>
                <p className="text-[#617589] text-sm font-normal leading-normal">Hôm nay, 10:15 AM • Giai đoạn: Thương lượng</p>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Static Info & Countdown */}
          <div className="flex flex-col w-full lg:w-[360px] shrink-0 gap-6">
            
            {/* SLA Timer */}
            <div className="bg-white border border-[#cfdbe7] rounded-xl p-4 shadow-sm">
               <h3 className="font-bold text-slate-900 mb-3">Thời gian chờ xử lý</h3>
               <SLACountdown createdAt={createdAt} variant="cards" />
               <p className="text-center text-xs text-red-500 font-bold mt-3 uppercase tracking-wide">Đã vi phạm cam kết</p>
            </div>

            {/* Sales Rep Profile */}
            <div className="bg-white border border-[#cfdbe7] rounded-xl p-0 overflow-hidden shadow-sm">
               <div className="bg-slate-50 p-4 border-b border-slate-200">
                  <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wide">Người phụ trách</h3>
               </div>
               <div className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg">
                     SM
                  </div>
                  <div>
                     <p className="font-bold text-slate-900">{salesRep.name}</p>
                     <p className="text-sm text-slate-500">{salesRep.team}</p>
                  </div>
               </div>
               <div className="px-4 pb-4">
                  <button className="w-full py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2">
                     <MessageSquare size={16} /> Chat với Sale
                  </button>
               </div>
            </div>

            {/* Lead Info Summary */}
            <div className="bg-white border border-[#cfdbe7] rounded-xl p-0 overflow-hidden shadow-sm">
                <div className="bg-slate-50 p-4 border-b border-slate-200">
                  <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wide">Thông tin Lead</h3>
               </div>
               <div className="p-4 space-y-4">
                  <div className="flex justify-between">
                     <span className="text-sm text-slate-500">Họ tên</span>
                     <span className="text-sm font-bold text-slate-900">Sophia Clark</span>
                  </div>
                  <div className="flex justify-between">
                     <span className="text-sm text-slate-500">Nguồn</span>
                     <span className="text-sm font-bold text-blue-600">Facebook Ads</span>
                  </div>
                  <div className="flex justify-between">
                     <span className="text-sm text-slate-500">Sản phẩm</span>
                     <span className="text-sm font-bold text-slate-900">Tiếng Đức A1</span>
                  </div>
                  <div className="flex justify-between">
                     <span className="text-sm text-slate-500">Số điện thoại</span>
                     <span className="text-sm font-bold text-slate-900">(555) 123-4567</span>
                  </div>
               </div>
            </div>

          </div>
      </div>
    </div>
  );
};

export default LeadSLAPage;
