
import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Printer, 
  Edit, 
  PenTool, 
  Plus, 
  DollarSign, 
  Calendar, 
  Clock, 
  GraduationCap, 
  FileText, 
  History, 
  Files, 
  Download, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle,
  ZoomIn,
  Share2,
  Package,
  CreditCard,
  ArrowLeft,
  CalendarDays,
  AlertCircle,
  Lock,
  Unlock,
  Circle,
  Briefcase,
  Layers,
  Plane,
  Fingerprint,
  Eye,
  FileWarning,
  PauseCircle,
  ArrowRightLeft,
  XCircle,
  Send,
  Gavel,
  X
} from 'lucide-react';

const ContractDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeDocTab, setActiveDocTab] = useState<'terms' | 'versions' | 'addenda'>('terms');
  
  // Print Modal State
  const [showPrintModal, setShowPrintModal] = useState(false);

  // --- STATE FOR LOGIC DEMO ---
  const [contractStatus, setContractStatus] = useState<'DRAFT' | 'SENT' | 'SIGNED_PENDING_PAYMENT' | 'ACTIVE' | 'BREACHED'>('SIGNED_PENDING_PAYMENT');
  const [installment1Paid, setInstallment1Paid] = useState(false);

  // --- MOCK DATA: AUDIT TRAIL (Nhật ký Pháp lý) ---
  const auditLog = [
      { action: 'Đã gửi Email cho khách', time: '12/10/2023 09:00', ip: 'System', user: 'Sarah Miller' },
      { action: 'Khách hàng đã xem', time: '12/10/2023 09:15', ip: '113.160.x.x (iPhone 14)', user: 'Guest' },
      { action: 'Khách hàng đã ký số (OTP)', time: '12/10/2023 10:30', ip: '113.160.x.x (iPhone 14)', user: 'Guest' },
      { action: 'Hệ thống khóa file PDF', time: '12/10/2023 10:31', ip: 'System', user: 'Auto' },
  ];

  // --- MOCK DATA: ADDENDA REQUESTS (Yêu cầu thay đổi) ---
  const [changeRequests, setChangeRequests] = useState([
      { id: 'req1', type: 'RESERVATION', title: 'Phụ lục 01: Bảo lưu khóa học', status: 'DRAFT', created: 'Hôm nay', reason: 'Đi nghĩa vụ quân sự' }
  ]);

  // --- MOCK DATA: COMBO BREAKDOWN ---
  const contractBreakdown = {
      type: 'COMBO',
      packageName: 'Combo Du học Đức (A1-B1 + Visa)',
      items: [
          { id: 'i1', category: 'EDUCATION', name: 'Khóa học Tiếng Đức A1 (Offline)', price: 15000000, status: 'Completed', refundable: true },
          { id: 'i2', category: 'EDUCATION', name: 'Khóa học Tiếng Đức A2 (Offline)', price: 15000000, status: 'Scheduled', refundable: true },
          { id: 'i3', category: 'SERVICE', name: 'Phí dịch vụ Hồ sơ & Visa', price: 95000000, status: 'In Progress', refundable: false },
      ]
  };
  
  const totalContractValue = 125000000;

  const handleActivate = () => {
      if (installment1Paid) {
          setContractStatus('ACTIVE');
          alert("Hợp đồng đã được kích hoạt thành công! Các dịch vụ đào tạo đã được mở khóa.");
      }
  };

  const handleCreateRequest = (type: string) => {
      alert(`Đang khởi tạo quy trình: ${type}. Hệ thống sẽ sinh ra Phụ lục dự thảo tương ứng.`);
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#101922] font-sans text-slate-900 dark:text-slate-100 overflow-y-auto">
      
      {/* Container Chính */}
      <div className="flex flex-col px-4 md:px-8 lg:px-12 py-6 gap-6 max-w-[1600px] mx-auto w-full">
        
        {/* Breadcrumbs & Alerts */}
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
                <Link to="/" className="text-slate-500 hover:text-blue-600 transition-colors">Trang chủ</Link>
                <span className="text-slate-300">/</span>
                <Link to="/contracts" className="text-slate-500 hover:text-blue-600 transition-colors">Quản lý Hợp đồng</Link>
                <span className="text-slate-300">/</span>
                <span className="text-slate-900 font-medium">HĐ-2023-0892</span>
            </div>

            {/* ALERT: Chưa đóng tiền */}
            {contractStatus === 'SIGNED_PENDING_PAYMENT' && !installment1Paid && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 animate-in slide-in-from-top-2">
                    <AlertTriangle className="shrink-0" size={20} />
                    <div className="flex-1">
                        <p className="font-bold text-sm">Hợp đồng chưa đủ điều kiện kích hoạt</p>
                        <p className="text-xs mt-0.5">Học viên chưa hoàn thành nghĩa vụ tài chính Đợt 1. Vui lòng không xếp lớp cho đến khi thanh toán.</p>
                    </div>
                    <button 
                        onClick={() => alert("Đã gửi thông báo nhắc nhở thanh toán qua Zalo/Email!")}
                        className="px-4 py-2 bg-white border border-red-200 text-red-700 text-xs font-bold rounded hover:bg-red-50"
                    >
                        Gửi nhắc nhở
                    </button>
                </div>
            )}
        </div>

        {/* Header: Tiêu đề & Hành động */}
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
               <button onClick={() => navigate('/contracts')} className="md:hidden mr-1 text-slate-500"><ArrowLeft size={24}/></button>
               <h1 className="text-slate-900 text-3xl font-black leading-tight tracking-tighter">
                  HĐ-2023-0892: Nguyễn Văn Nam
               </h1>
               
               {/* STATUS BADGE */}
               {contractStatus === 'SIGNED_PENDING_PAYMENT' && (
                   <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 px-3 py-1 text-xs font-bold uppercase tracking-wider border border-amber-200">
                      <Clock size={12} className="mr-1"/> Đã ký - Chờ đóng tiền
                   </span>
               )}
               {contractStatus === 'ACTIVE' && (
                   <span className="inline-flex items-center rounded-full bg-green-100 text-green-700 px-3 py-1 text-xs font-bold uppercase tracking-wider border border-green-200">
                      <CheckCircle2 size={12} className="mr-1"/> Đang hiệu lực
                   </span>
               )}
            </div>
            <div className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                    <Layers size={12} /> {contractBreakdown.packageName}
                </span>
                <span className="text-sm text-slate-500">• Tạo ngày 12/10/2023</span>
            </div>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            {contractStatus === 'SIGNED_PENDING_PAYMENT' ? (
                <button 
                    onClick={handleActivate}
                    disabled={!installment1Paid}
                    className={`flex items-center gap-2 px-4 py-2 text-white text-sm font-bold rounded-lg shadow-sm transition-all
                        ${installment1Paid 
                            ? 'bg-green-600 hover:bg-green-700 shadow-green-500/30 cursor-pointer transform active:scale-95' 
                            : 'bg-slate-300 text-slate-500 cursor-not-allowed'}
                    `}
                >
                   {installment1Paid ? <Unlock size={18} /> : <Lock size={18} />}
                   Kích hoạt Hợp đồng
                </button>
            ) : (
                <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-emerald-600 text-sm font-bold rounded-lg cursor-default border border-slate-200">
                   <CheckCircle2 size={18} /> Đã kích hoạt
                </button>
            )}

            <button 
                onClick={() => setShowPrintModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
            >
               <Printer size={18} /> In ấn
            </button>
          </div>
        </div>

        {/* LAYOUT LƯỚI CHÍNH (3 Cột) */}
        <div className="grid grid-cols-12 gap-6 items-start">
          
          {/* CỘT TRÁI (3 cols) - Metadata & Thao tác nhanh */}
          <div className="col-span-12 xl:col-span-3 flex flex-col gap-6 order-2 xl:order-1">
             
             {/* Thẻ Metadata */}
             <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-200 bg-slate-50/50">
                   <h3 className="font-bold text-sm text-slate-900">Tổng quan Tài chính</h3>
                </div>
                <div className="p-0">
                   <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-100">
                      <DollarSign className="text-slate-400" size={20} />
                      <div>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tổng giá trị HĐ</p>
                         <p className="text-sm font-bold text-blue-600">{totalContractValue.toLocaleString()} đ</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-100">
                      <Calendar className="text-slate-400" size={20} />
                      <div>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ngày ký kết</p>
                         <p className="text-sm font-bold text-slate-900">12/10/2023</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-3 px-4 py-4">
                      <Clock className="text-slate-400" size={20} />
                      <div>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hiệu lực đến</p>
                         <p className="text-sm font-bold text-slate-900">12/10/2024</p>
                      </div>
                   </div>
                </div>
             </div>

             {/* Items & Services Summary (New) */}
             <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-200 bg-slate-50/50">
                   <h3 className="font-bold text-sm text-slate-900">Vật phẩm & Dịch vụ</h3>
                </div>
                <div className="p-4">
                   <ul className="space-y-3">
                      {contractBreakdown.items.map((item, idx) => (
                         <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0"></span>
                            <span>{item.name}</span>
                         </li>
                      ))}
                   </ul>
                </div>
             </div>

             {/* Danh sách Thao tác nhanh */}
             <div className="flex flex-col gap-2">
                <button 
                    onClick={() => setActiveDocTab('terms')}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all border ${activeDocTab === 'terms' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-transparent text-slate-600 hover:bg-slate-50'}`}
                >
                   <FileText size={18} />
                   <p className="text-sm font-bold">Nội dung Hợp đồng</p>
                </button>
                <button 
                    onClick={() => setActiveDocTab('versions')}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all border ${activeDocTab === 'versions' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-transparent text-slate-600 hover:bg-slate-50'}`}
                >
                   <History size={18} />
                   <p className="text-sm font-medium">Lịch sử phiên bản (4)</p>
                </button>
                <button 
                    onClick={() => setActiveDocTab('addenda')}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all border ${activeDocTab === 'addenda' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-transparent text-slate-600 hover:bg-slate-50'}`}
                >
                   <Files size={18} />
                   <p className="text-sm font-medium">Phụ lục & Thay đổi</p>
                </button>
             </div>
          </div>

          {/* CỘT GIỮA (6 cols) - Chi tiết Gói & Tài liệu */}
          <div className="col-span-12 xl:col-span-6 order-1 xl:order-2 flex flex-col gap-6">
             
             {/* CẤU TRÚC GÓI DỊCH VỤ (COMBO BREAKDOWN) */}
             <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                   <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <Package size={18} className="text-blue-600" />
                      Cấu trúc Gói dịch vụ
                   </h3>
                   <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider bg-slate-200 px-2 py-0.5 rounded">
                      Phân bổ doanh thu
                   </span>
                </div>
                
                <div className="divide-y divide-slate-100">
                   {/* Nhóm Đào tạo */}
                   <div className="p-0">
                      <div className="px-4 py-2 bg-blue-50/30 flex items-center gap-2">
                         <GraduationCap size={14} className="text-slate-500" />
                         <span className="text-xs font-bold text-slate-600 uppercase">Hạng mục Đào tạo</span>
                      </div>
                      {contractBreakdown.items.filter(i => i.category === 'EDUCATION').map(item => (
                         <div key={item.id} className="px-4 py-3 flex justify-between items-center hover:bg-slate-50 transition-colors">
                            <div>
                               <p className="text-sm font-medium text-slate-900">{item.name}</p>
                               <div className="flex items-center gap-2 mt-0.5">
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                                     item.status === 'Completed' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-50 border-slate-200 text-slate-500'
                                  }`}>
                                     {item.status === 'Completed' ? 'Đã hoàn thành' : 'Chờ xếp lớp'}
                                  </span>
                               </div>
                            </div>
                            <span className="text-sm font-bold text-slate-700">{item.price.toLocaleString()} đ</span>
                         </div>
                      ))}
                   </div>

                   {/* Nhóm Dịch vụ */}
                   <div className="p-0 border-t border-slate-100">
                      <div className="px-4 py-2 bg-amber-50/30 flex items-center gap-2">
                         <Plane size={14} className="text-slate-500" />
                         <span className="text-xs font-bold text-slate-600 uppercase">Hạng mục Dịch vụ & Hồ sơ</span>
                      </div>
                      {contractBreakdown.items.filter(i => i.category === 'SERVICE').map(item => (
                         <div key={item.id} className="px-4 py-3 flex justify-between items-center hover:bg-slate-50 transition-colors">
                            <div>
                               <p className="text-sm font-medium text-slate-900">{item.name}</p>
                               <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] px-1.5 py-0.5 rounded border bg-blue-50 border-blue-200 text-blue-700">
                                     Đang xử lý
                                  </span>
                                  {!item.refundable && <span className="text-[10px] text-red-400 italic flex items-center"><Lock size={10} className="mr-0.5"/> Không hoàn tiền</span>}
                               </div>
                            </div>
                            <span className="text-sm font-bold text-slate-700">{item.price.toLocaleString()} đ</span>
                         </div>
                      ))}
                   </div>
                </div>
             </div>

             {/* TÀI LIỆU & CHANGE REQUESTS */}
             <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col h-[600px]">
                <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50/50">
                   <div className="flex items-center gap-2">
                      <FileText size={18} className="text-blue-600" />
                      <span className="text-sm font-bold text-slate-800">
                         {activeDocTab === 'terms' ? 'Văn bản Hợp đồng (Preview)' : activeDocTab === 'versions' ? 'Lịch sử Phiên bản' : 'Yêu cầu Thay đổi (Addenda)'}
                      </span>
                   </div>
                   <div className="flex gap-2">
                      <button className="p-2 hover:bg-slate-200 rounded text-slate-500" title="Phóng to"><ZoomIn size={18}/></button>
                      <button className="p-2 hover:bg-slate-200 rounded text-slate-500" title="Tải xuống"><Download size={18}/></button>
                   </div>
                </div>

                <div className="p-8 overflow-y-auto bg-slate-100 custom-scrollbar flex-1 relative">
                   {/* TAB: TERMS */}
                   {activeDocTab === 'terms' && (
                      <div className="max-w-[210mm] mx-auto bg-white shadow-md p-[20mm] min-h-[297mm]">
                            <div className="text-center mb-8 pb-6 border-b border-slate-100">
                               <h2 className="text-xl font-bold text-slate-900 uppercase tracking-wide mb-2">HỢP ĐỒNG DỊCH VỤ ĐÀO TẠO & DU HỌC</h2>
                               <p className="text-sm text-slate-500 font-mono">Số hiệu: CTR-2023-0892</p>
                            </div>
                            {/* ... Content truncated for brevity, same as previous ... */}
                            <div className="mb-6">
                               <p className="text-sm leading-relaxed text-slate-700 text-justify italic mb-4">
                                  Hợp đồng này được lập ngày 12 tháng 10 năm 2023, giữa Trung tâm Đào tạo ULA EduCRM và học viên Nguyễn Văn Nam.
                               </p>
                            </div>
                            <h4 className="text-slate-900 font-bold mb-3 text-sm uppercase tracking-wide">Điều 1: Nội dung gói Combo</h4>
                            <ul className="list-disc pl-5 mb-6 text-sm text-slate-700 space-y-1">
                               {contractBreakdown.items.map((p, i) => (
                                  <li key={i}>{p.name}</li>
                               ))}
                            </ul>
                            <div className="mt-16 flex justify-between gap-12 pt-8">
                               <div className="flex-1 text-center">
                                  <div className="h-20 border-b border-slate-300 mb-2 flex items-end justify-center">
                                     <span className="font-serif text-2xl text-blue-800 italic opacity-80 -rotate-3 mb-2">Nguyen Van Nam</span>
                                  </div>
                                  <p className="text-xs font-bold text-slate-500 uppercase">Chữ ký Học viên</p>
                               </div>
                               <div className="flex-1 text-center">
                                  <div className="h-20 border-b border-slate-300 mb-2 flex items-end justify-center">
                                     <span className="font-serif text-2xl text-red-800 italic opacity-60 rotate-2 mb-2">EduCRM Director</span>
                                  </div>
                                  <p className="text-xs font-bold text-slate-500 uppercase">Đại diện Trung tâm</p>
                               </div>
                            </div>
                      </div>
                   )}

                   {/* TAB: ADDENDA (CHANGE REQUESTS) */}
                   {activeDocTab === 'addenda' && (
                      <div className="max-w-2xl mx-auto">
                         <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                               <FileWarning className="text-amber-500" size={20} />
                               Quy trình Thay đổi (Change Requests)
                            </h3>
                            <div className="grid grid-cols-3 gap-3 mb-6">
                               <button onClick={() => handleCreateRequest('Bảo lưu')} className="p-3 bg-slate-50 border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all flex flex-col items-center gap-2 text-sm font-medium">
                                  <PauseCircle size={20} /> Bảo lưu
                               </button>
                               <button onClick={() => handleCreateRequest('Chuyển nhượng')} className="p-3 bg-slate-50 border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all flex flex-col items-center gap-2 text-sm font-medium">
                                  <ArrowRightLeft size={20} /> Chuyển nhượng
                               </button>
                               <button onClick={() => handleCreateRequest('Thanh lý')} className="p-3 bg-slate-50 border border-slate-200 rounded-lg hover:bg-red-50 hover:border-red-200 hover:text-red-700 transition-all flex flex-col items-center gap-2 text-sm font-medium text-slate-600">
                                  <XCircle size={20} /> Thanh lý / Rút
                               </button>
                            </div>

                            <div className="space-y-4">
                               <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Lịch sử yêu cầu</h4>
                               {changeRequests.map(req => (
                                  <div key={req.id} className="border border-slate-200 rounded-lg p-4 flex justify-between items-center hover:shadow-md transition-shadow bg-white">
                                     <div>
                                        <div className="flex items-center gap-2">
                                           <span className="font-bold text-slate-900 text-sm">{req.title}</span>
                                           <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full font-bold">{req.status}</span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">Lý do: {req.reason} • Tạo: {req.created}</p>
                                     </div>
                                     <button className="text-blue-600 text-xs font-bold hover:underline">Xem chi tiết</button>
                                  </div>
                               ))}
                            </div>
                         </div>
                      </div>
                   )}
                </div>
             </div>
          </div>

          {/* CỘT PHẢI (3 cols) - Phụ lục, Trạng thái, Audit Log */}
          <div className="col-span-12 xl:col-span-3 flex flex-col gap-6 order-3">
             
             {/* Phụ lục: Lộ trình đóng phí & Tuân thủ */}
             <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="bg-blue-50/50 p-4 border-b border-slate-200 flex justify-between items-center">
                   <h3 className="text-slate-900 font-bold text-sm flex items-center gap-2">
                      <CreditCard className="text-blue-600" size={18} /> 
                      Tiến độ & Tuân thủ
                   </h3>
                </div>
                
                <div className="p-4 space-y-0">
                   {/* Đợt 1 */}
                   <div className="relative pb-6 pl-6 border-l-2 border-slate-200 last:border-0 last:pb-0">
                      <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 shadow-sm transition-colors ${installment1Paid ? 'bg-green-500 border-white' : 'bg-white border-amber-500'}`}></div>
                      
                      <div className="flex justify-between items-start mb-1">
                         <span className="text-xs font-bold text-slate-700 uppercase">Đợt 1 (Đặt cọc)</span>
                         <span className="text-xs font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">30%</span>
                      </div>
                      <p className="text-sm font-bold text-blue-700 mb-1">37.500.000 đ</p>
                      
                      <div 
                        onClick={() => { if(contractStatus !== 'ACTIVE') setInstallment1Paid(!installment1Paid); }}
                        className={`flex items-center justify-between gap-1.5 text-xs font-medium px-2 py-1.5 rounded transition-colors border select-none ${installment1Paid ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 cursor-pointer'}`}
                      >
                         <span className="flex items-center gap-1.5">
                            {installment1Paid ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                            {installment1Paid ? 'Đã thanh toán' : 'Chờ thanh toán'}
                         </span>
                      </div>
                      
                      {/* COMPLIANCE WARNING */}
                      {!installment1Paid && (
                          <div className="mt-2 pt-2 border-t border-dashed border-red-200">
                              <p className="text-[10px] font-bold text-red-600 flex items-center gap-1">
                                  <Gavel size={10} /> Vi phạm cam kết: Quá hạn 2 ngày
                              </p>
                              <button className="mt-1 w-full text-[10px] bg-red-50 text-red-700 border border-red-200 rounded py-1 hover:bg-red-100 transition-colors font-medium">
                                  Gửi Thông báo Tạm dừng
                              </button>
                          </div>
                      )}
                   </div>
                   
                   {/* ... Other installments hidden for brevity ... */}
                </div>
             </div>

             {/* LEGAL AUDIT TRAIL (NEW) */}
             <div className="bg-white border border-slate-200 rounded-xl p-0 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="text-slate-900 font-bold text-sm flex items-center gap-2">
                        <Fingerprint className="text-purple-600" size={18} /> Nhật ký Ký kết
                    </h3>
                </div>
                <div className="p-4">
                    <div className="relative border-l border-slate-200 ml-2 space-y-6">
                        {auditLog.map((log, idx) => (
                            <div key={idx} className="relative pl-6">
                                <div className={`absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm ${idx === auditLog.length - 1 ? 'bg-purple-600' : 'bg-slate-300'}`}></div>
                                <p className="text-xs font-bold text-slate-800">{log.action}</p>
                                <div className="text-[10px] text-slate-500 flex flex-col mt-0.5">
                                    <span>{log.time}</span>
                                    <span className="font-mono text-slate-400">IP: {log.ip}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 text-center">
                        <button className="text-xs text-blue-600 font-bold hover:underline flex items-center justify-center gap-1">
                            <Eye size={12} /> Xem log chi tiết
                        </button>
                    </div>
                </div>
             </div>

             {/* Các bên liên quan */}
             <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <h3 className="text-slate-900 font-bold text-sm mb-4">Các bên liên quan</h3>
                <div className="space-y-4">
                   <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 border border-white shadow-sm">NN</div>
                      <div>
                         <p className="text-sm font-bold text-slate-900">Nguyễn Văn Nam</p>
                         <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wide">Học viên (Bên A)</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 border border-white shadow-sm">SM</div>
                      <div>
                         <p className="text-sm font-bold text-slate-900">Sarah Miller</p>
                         <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wide">Đại diện ULA (Bên B)</p>
                      </div>
                   </div>
                </div>
             </div>

          </div>

        </div>
      </div>

      {/* PRINT SIMULATION MODAL */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setShowPrintModal(false)}></div>
           <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col animate-in zoom-in-95">
              
              {/* Header */}
              <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50">
                 <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <Printer size={20} className="text-blue-600" />
                    Xem trước bản in (PDF Preview)
                 </h3>
                 <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-sm" onClick={() => {alert("Đang tải xuống..."); setShowPrintModal(false)}}>
                        <Download size={18} /> Tải PDF
                    </button>
                    <button onClick={() => setShowPrintModal(false)} className="text-slate-400 hover:text-slate-600">
                       <X size={24} />
                    </button>
                 </div>
              </div>

              {/* PDF Viewer Simulation (Scrollable A4) */}
              <div className="flex-1 overflow-y-auto bg-slate-200 p-8 flex justify-center custom-scrollbar">
                 <div className="bg-white w-[210mm] min-h-[297mm] shadow-2xl p-[20mm] text-sm leading-relaxed text-slate-900 relative">
                    {/* Simulated Watermark if Draft */}
                    {contractStatus === 'DRAFT' && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
                            <p className="text-9xl font-black text-slate-500 -rotate-45">DRAFT</p>
                        </div>
                    )}

                    {/* Content */}
                    <div className="flex justify-between items-start mb-8">
                       <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs">ULA</div>
                       <div className="text-right">
                          <h1 className="font-bold text-xl uppercase">Hợp đồng Đào tạo</h1>
                          <p className="text-xs text-slate-500">Mã: HĐ-2023-0892</p>
                       </div>
                    </div>

                    <p className="text-center font-bold italic mb-8">Cộng hòa Xã hội Chủ nghĩa Việt Nam <br/> Độc lập - Tự do - Hạnh phúc</p>

                    <div className="space-y-4 text-justify">
                       <p>Hợp đồng này được lập vào ngày 12 tháng 10 năm 2023, giữa:</p>
                       
                       <div className="pl-4 border-l-2 border-slate-200">
                          <p><strong>BÊN A (Trung tâm): CÔNG TY CỔ PHẦN GIÁO DỤC ULA</strong></p>
                          <p>Đại diện: Bà Sarah Miller - Chức vụ: Giám đốc Kinh doanh</p>
                          <p>Địa chỉ: Tầng 5, Tòa nhà ABC, Hà Nội</p>
                       </div>

                       <div className="pl-4 border-l-2 border-slate-200">
                          <p><strong>BÊN B (Học viên): ÔNG NGUYỄN VĂN NAM</strong></p>
                          <p>Ngày sinh: 01/01/2000 - CCCD: 00123456789</p>
                          <p>Địa chỉ: Cầu Giấy, Hà Nội</p>
                       </div>

                       <p className="mt-4">Hai bên thống nhất ký kết hợp đồng dịch vụ với các điều khoản sau:</p>

                       <h4 className="font-bold uppercase mt-4">Điều 1: Nội dung dịch vụ</h4>
                       <p>Bên A cung cấp cho Bên B gói dịch vụ "Combo Du học Đức (A1-B1 + Visa)" bao gồm:</p>
                       <ul className="list-disc pl-8">
                          <li>Khóa học Tiếng Đức A1 (Offline)</li>
                          <li>Khóa học Tiếng Đức A2 (Offline)</li>
                          <li>Phí dịch vụ Hồ sơ & Visa</li>
                       </ul>

                       <h4 className="font-bold uppercase mt-4">Điều 2: Giá trị hợp đồng & Thanh toán</h4>
                       <p>Tổng giá trị hợp đồng: <strong>125.000.000 VNĐ</strong> (Bằng chữ: Một trăm hai mươi lăm triệu đồng chẵn).</p>
                       <p>Lộ trình thanh toán:</p>
                       <ul className="list-disc pl-8">
                          <li>Đợt 1: 30% ngay khi ký hợp đồng.</li>
                          <li>Đợt 2: 40% trước khi bắt đầu học A2.</li>
                          <li>Đợt 3: 30% còn lại khi có Visa.</li>
                       </ul>
                    </div>

                    <div className="mt-16 flex justify-between gap-12">
                       <div className="flex-1 text-center">
                          <p className="font-bold uppercase mb-16">Đại diện Bên A</p>
                          <p className="font-bold">Sarah Miller</p>
                       </div>
                       <div className="flex-1 text-center">
                          <p className="font-bold uppercase mb-16">Đại diện Bên B</p>
                          <p className="font-bold font-script text-2xl text-blue-800 -rotate-6">Nguyen Van Nam</p>
                          <p className="font-bold">Nguyễn Văn Nam</p>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default ContractDetails;
