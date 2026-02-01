
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  RefreshCw, 
  Mail, 
  MapPin, 
  GraduationCap, 
  Phone, 
  AtSign, 
  User, 
  FileText, 
  Eye, 
  CheckCircle, 
  Upload, 
  PlusSquare, 
  History, 
  Send,
  MoreHorizontal,
  Users,
  Briefcase,
  FileClock,
  X,
  CloudUpload,
  Download,
  Wand2, // New icon for Magic Fill
  CheckCircle2,
  Database,
  ArrowRight,
  Loader2
} from 'lucide-react';

interface DocumentVersion {
  name: string;
  date: string;
  user: string;
  url: string;
}

interface DocumentItem {
  id: number;
  name: string;
  sub: string;
  status: 'verified' | 'submitted' | 'in_progress' | 'not_started';
  date: string;
  versions: DocumentVersion[];
}

const StudyAbroadCaseDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  
  // State for Document Modal
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // State for Auto-Fill Simulation
  const [showAutoFillModal, setShowAutoFillModal] = useState(false);
  const [autoFillStep, setAutoFillStep] = useState<'mapping' | 'filling' | 'done'>('mapping');
  const [mappedFields, setMappedFields] = useState<string[]>([]);

  // Mock Data
  const STUDENT = {
    name: 'Nguyễn Thùy Linh',
    id: id || 'GER-2024-0815',
    type: 'Đại học (Bachelor)',
    targetCountry: 'Đức',
    targetUni: 'Technical University of Munich (TUM)',
    email: 'linh.nguyen@example.com',
    phone: '098 765 4321',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCCNtGL2AlNRmu-2tJyBSehB1OrASL0W30wMpSg8zskvj94PUPZSC008P9GuenCk_uQqKFjR5IqUKcrMeRRO1lDNEw_eReDja_DM8_iJCq9qWPmAaXhgtq28cI_-2B-BlJYyvfTFDSzUz90bS3NmBNx2AIfs0fq6RCF7JRmXZyAOfDI-AVM-qpPtEnJtRm-HuIYRYyoJJN3VcDPYHvJWdT2vGx3aKbFOwd8Z1PCaedD0AX5AwQ5ZtFgQk_1RyrYUZz4y-DGxjsIuug',
    created: '12/05/2024',
    dob: '15/01/2004',
    passport: 'B1234567',
    address: 'Hà Nội, Việt Nam',
    parent: {
      name: 'Nguyễn Văn Hùng',
      relation: 'Bố',
      phone: '091 234 5678',
      email: 'hung.nguyen@gmail.com',
      job: 'Kinh doanh tự do'
    }
  };

  const DOCUMENTS: DocumentItem[] = [
    { 
      id: 1, name: 'Chứng chỉ APS', sub: 'Thẩm tra học vấn ĐSQ', status: 'verified', date: '15/05/2024',
      versions: [
        { name: 'APS_Certificate_Final.pdf', date: '15/05/2024', user: 'Sarah Miller', url: '#' },
        { name: 'APS_Scan_Ban_Goc.pdf', date: '10/05/2024', user: 'Admin', url: '#' }
      ]
    },
    { 
      id: 2, name: 'Kết quả TestAS', sub: 'Core & Chuyên ngành', status: 'submitted', date: '20/05/2024',
      versions: [
        { name: 'TestAS_Result_2024.pdf', date: '20/05/2024', user: 'Sarah Miller', url: '#' }
      ]
    },
    { 
      id: 3, name: 'Bảo hiểm Y tế (TK/AOK)', sub: 'Minh chứng BHYT công', status: 'in_progress', date: '28/05/2024',
      versions: [] 
    },
    { 
      id: 4, name: 'Xác nhận Phong tỏa', sub: 'Fintiba / Expatrio', status: 'not_started', date: '-',
      versions: [] 
    },
    { 
      id: 5, name: 'Chứng chỉ Ngoại ngữ', sub: 'Bằng C1 Tiếng Đức', status: 'verified', date: '30/04/2024',
      versions: [
        { name: 'Goethe_C1_Zertifikat.jpg', date: '30/04/2024', user: 'Sarah Miller', url: '#' }
      ] 
    },
  ];

  const TIMELINE = [
    { date: 'Hôm nay', title: 'Hoàn thiện hồ sơ Visa', desc: 'Đã kiểm tra và xác nhận đầy đủ giấy tờ gốc cho buổi phỏng vấn.', user: 'System', iconColor: 'bg-blue-600' },
    { date: 'Hôm qua', title: 'Đăng ký Bảo hiểm', desc: 'Đã gửi đơn đăng ký sang AOK Germany.', user: 'Sarah', iconColor: 'bg-slate-200' },
    { date: '20/05', title: 'Nhận Thư mời nhập học', desc: 'Technical University of Munich', user: 'System', iconColor: 'bg-emerald-500' },
    { date: '12/05', title: 'Mở Hồ sơ (Case Opened)', desc: 'Hoàn tất thủ tục đăng ký dịch vụ.', user: 'Admin', iconColor: 'bg-slate-200' },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <span className="bg-emerald-100 text-emerald-600 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">Đã xác minh</span>;
      case 'submitted':
        return <span className="bg-amber-100 text-amber-600 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">Đã nộp</span>;
      case 'in_progress':
        return <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">Đang xử lý</span>;
      default:
        return <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">Chưa bắt đầu</span>;
    }
  };

  const openDocModal = (doc: DocumentItem) => {
    setSelectedDoc(doc);
    setShowUploadModal(true);
  };

  // --- AUTO FILL LOGIC ---
  const startAutoFill = () => {
    setShowAutoFillModal(true);
    setAutoFillStep('mapping');
    setMappedFields([]);

    // Simulate Field Mapping Process
    const fieldsToMap = [
      'Họ tên: Nguyễn Thùy Linh',
      'Ngày sinh: 15/01/2004',
      'Số hộ chiếu: B1234567',
      'Email: linh.nguyen@example.com',
      'Địa chỉ: Hà Nội, Việt Nam',
      'Trường đích: TUM'
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < fieldsToMap.length) {
        setMappedFields(prev => [...prev, fieldsToMap[currentStep]]);
        currentStep++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setAutoFillStep('filling');
          setTimeout(() => setAutoFillStep('done'), 1500);
        }, 800);
      }
    }, 400);
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#0d141b] font-sans overflow-y-auto">
      <div className="flex flex-col flex-1 p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
        
        {/* Header Navigation */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/study-abroad/pipeline')}
              className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all text-slate-600"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 leading-tight">Hồ sơ: {STUDENT.name}</h1>
              <p className="text-slate-500 text-sm">Mã hồ sơ #{STUDENT.id} • Tạo ngày {STUDENT.created}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-lg font-semibold transition-all shadow-sm text-sm">
              <RefreshCw size={16} />
              Đồng bộ Tài chính
            </button>
            <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-semibold transition-all shadow-sm text-sm">
              <Mail size={16} />
              Yêu cầu bổ sung
            </button>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-12 gap-6">
          
          {/* LEFT SIDEBAR (3 Cols) */}
          <aside className="col-span-12 lg:col-span-3 flex flex-col gap-6">
            
            {/* Student Profile Card */}
            <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex flex-col items-center mb-6">
                <div className="size-24 rounded-2xl bg-slate-100 mb-4 overflow-hidden border-2 border-slate-50">
                  <img alt={STUDENT.name} className="w-full h-full object-cover" src={STUDENT.avatar} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 text-center">{STUDENT.name}</h3>
                <span className="bg-blue-50 text-blue-700 text-[11px] font-bold px-2 py-0.5 rounded-full mt-1 uppercase">
                  {STUDENT.type}
                </span>
              </div>
              
              <div className="space-y-4">
                <div className="border-t border-slate-50 pt-4">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Điểm đến</p>
                  <div className="flex items-center gap-2 mt-1">
                    <MapPin size={16} className="text-blue-600" />
                    <span className="text-sm font-semibold text-slate-900">{STUDENT.targetCountry}</span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Trường Đại học</p>
                  <div className="flex items-center gap-2 mt-1">
                    <GraduationCap size={16} className="text-blue-600" />
                    <span className="text-sm font-semibold text-slate-900 line-clamp-2">{STUDENT.targetUni}</span>
                  </div>
                </div>

                {/* Financial Status Box */}
                <div className="border-t border-slate-50 pt-4 bg-slate-50/50 -mx-5 px-5 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Tình trạng Tài chính</p>
                    <button className="text-[10px] font-bold text-blue-600 hover:underline">Chi tiết</button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">Phí Ghi danh</span>
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Đã đóng</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">Dịch vụ Visa</span>
                      <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Quá hạn</span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Dư nợ</span>
                      <span className="text-sm font-bold text-rose-600">12.500.000 đ</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-50 pt-4">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Liên hệ</p>
                  <div className="flex flex-col gap-2 mt-2">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <AtSign size={14} /> {STUDENT.email}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Phone size={14} /> {STUDENT.phone}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Parent Info Card - NEW */}
            <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <h4 className="font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wide text-slate-700 border-b border-slate-100 pb-2">
                    <Users size={16} className="text-[#0d47a1]" /> Thông tin Phụ huynh
                </h4>
                <div className="space-y-3">
                    <div>
                        <p className="text-xs text-slate-400">Họ tên ({STUDENT.parent.relation})</p>
                        <p className="text-sm font-bold text-slate-900">{STUDENT.parent.name}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <p className="text-xs text-slate-400">Điện thoại</p>
                            <p className="text-sm font-medium text-slate-900">{STUDENT.parent.phone}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400">Nghề nghiệp</p>
                            <p className="text-sm font-medium text-slate-900">{STUDENT.parent.job}</p>
                        </div>
                    </div>
                    <button className="w-full mt-2 py-1.5 text-xs font-bold text-[#0d47a1] bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center justify-center gap-1">
                        <Phone size={12} /> Gọi Phụ huynh
                    </button>
                </div>
            </section>

            {/* Case Owner Card */}
            <section className="bg-[#0d47a1] text-white p-5 rounded-xl shadow-md">
              <h4 className="font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wide">
                <User size={18} /> Người phụ trách
              </h4>
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-blue-700 flex items-center justify-center font-bold text-sm">SM</div>
                <div>
                  <p className="text-sm font-bold">Sarah Miller</p>
                  <p className="text-xs text-blue-200">Chuyên viên Tư vấn cấp cao</p>
                </div>
              </div>
            </section>
          </aside>

          {/* CENTER CONTENT (6 Cols) */}
          <div className="col-span-12 lg:col-span-6 flex flex-col gap-6">
            
            {/* Auto-Fill Forms (NEW FEATURE) */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 shadow-sm p-5 relative overflow-hidden">
               {/* Decorative Background */}
               <div className="absolute top-0 right-0 w-32 h-32 bg-purple-100 rounded-full -mr-10 -mt-10 opacity-50 blur-2xl"></div>
               
               <div className="flex justify-between items-center mb-4 relative z-10">
                  <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                     <Wand2 size={20} className="text-purple-600" /> Tự động điền đơn (Auto-fill)
                  </h3>
                  <span className="text-[10px] font-bold bg-white text-indigo-600 px-2 py-1 rounded border border-indigo-100 shadow-sm">AI Powered</span>
               </div>
               <div className="grid grid-cols-2 gap-3 relative z-10">
                  <button 
                    onClick={startAutoFill}
                    className="bg-white hover:bg-indigo-100 border border-indigo-200 text-indigo-700 px-3 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 justify-center shadow-sm"
                  >
                     <FileText size={16} /> Form Visa Đức (Videx)
                  </button>
                  <button className="bg-white hover:bg-indigo-100 border border-indigo-200 text-indigo-700 px-3 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 justify-center shadow-sm">
                     <FileText size={16} /> Đơn xin Nhập học
                  </button>
                  <button className="bg-white hover:bg-indigo-100 border border-indigo-200 text-indigo-700 px-3 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 justify-center shadow-sm">
                     <FileText size={16} /> CV Europass
                  </button>
                  <button className="bg-white hover:bg-indigo-100 border border-indigo-200 text-indigo-700 px-3 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 justify-center shadow-sm">
                     <FileText size={16} /> Thư động lực (Template)
                  </button>
               </div>
            </div>

            {/* Documents Section with Upload & Version Control */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="border-b border-slate-200 bg-slate-50/50 px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <FileText className="text-[#0d47a1]" size={20} />
                  <h3 className="font-bold text-slate-800">Danh mục Hồ sơ & Lưu trữ</h3>
                </div>
                <span className="text-xs font-medium bg-slate-200 text-slate-700 px-2 py-1 rounded">2/5 Đã nộp</span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    <tr>
                      <th className="px-6 py-3">Tên tài liệu</th>
                      <th className="px-6 py-3">Trạng thái</th>
                      <th className="px-6 py-3">File mới nhất</th>
                      <th className="px-6 py-3 text-right">Quản lý</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {DOCUMENTS.map((doc) => (
                      <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-sm text-slate-900">{doc.name}</span>
                            <span className="text-[11px] text-slate-400">{doc.sub}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(doc.status)}
                        </td>
                        <td className="px-6 py-4">
                            {doc.versions.length > 0 ? (
                                <div className="flex items-center gap-2 text-xs text-blue-600 font-medium cursor-pointer hover:underline">
                                    <FileClock size={14} />
                                    {doc.versions[0].name.substring(0, 15)}...
                                </div>
                            ) : (
                                <span className="text-xs text-slate-400 italic">Chưa có file</span>
                            )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => openDocModal(doc)}
                            className="bg-slate-100 hover:bg-[#0d47a1] hover:text-white text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ml-auto"
                          >
                            <CloudUpload size={14} />
                            Upload / Xem
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-200 text-center">
                <button className="text-[#0d47a1] text-sm font-bold hover:underline">Xem tất cả tài liệu</button>
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR (3 Cols) */}
          <aside className="col-span-12 lg:col-span-3 flex flex-col gap-6">
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full max-h-[600px]">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
                <History className="text-[#0d47a1]" size={20} />
                <h3 className="font-bold text-slate-800">Dòng thời gian (Timeline)</h3>
              </div>
              
              <div className="p-5 flex-1 overflow-y-auto custom-scrollbar">
                <div className="relative space-y-8 before:absolute before:inset-0 before:ml-4 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-blue-500 before:via-slate-200 before:to-transparent">
                  {TIMELINE.map((item, idx) => (
                    <div key={idx} className="relative flex items-start ml-8">
                      <div className={`absolute -left-8 flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-white ${item.iconColor}`}></div>
                      <div>
                        <time className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.date}</time>
                        <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                        <p className="text-xs text-slate-500 mt-1 italic">"{item.desc}"</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 bg-slate-50">
                <div className="flex gap-2">
                  <input 
                    className="flex-1 text-sm border-slate-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 px-3 py-2 outline-none" 
                    placeholder="Thêm ghi chú..." 
                    type="text"
                  />
                  <button className="bg-slate-200 text-slate-600 p-2 rounded-lg hover:bg-slate-300 transition-all">
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </section>
          </aside>

        </div>
      </div>

      {/* AUTO-FILL SIMULATION MODAL */}
      {showAutoFillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"></div>
           <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95">
              
              {/* Header */}
              <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-purple-50">
                 <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
                    <Wand2 size={20} className="text-purple-600" />
                    Tự động điền đơn: Videx (Đức)
                 </h3>
                 <p className="text-xs text-slate-500 mt-1">Hệ thống đang trích xuất dữ liệu từ CRM để điền vào biểu mẫu.</p>
              </div>

              {/* Body Content */}
              <div className="p-6 min-h-[300px] flex flex-col">
                 
                 {/* Step 1: Mapping */}
                 {autoFillStep === 'mapping' && (
                    <div className="flex flex-col gap-3">
                       <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold text-slate-700">Đang khớp dữ liệu (Mapping)...</span>
                          <Loader2 size={16} className="animate-spin text-indigo-600" />
                       </div>
                       <div className="space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
                          {mappedFields.map((field, idx) => (
                             <div key={idx} className="flex items-center gap-3 p-2 bg-slate-50 rounded border border-slate-100 animate-in slide-in-from-left-2">
                                <Database size={14} className="text-slate-400" />
                                <span className="text-xs text-slate-600 flex-1">{field}</span>
                                <ArrowRight size={14} className="text-slate-300" />
                                <FileText size={14} className="text-indigo-600" />
                                <CheckCircle2 size={16} className="text-green-500" />
                             </div>
                          ))}
                       </div>
                    </div>
                 )}

                 {/* Step 2: Generating PDF */}
                 {autoFillStep === 'filling' && (
                    <div className="flex flex-col items-center justify-center flex-1 py-10">
                       <div className="relative w-16 h-16 mb-4">
                          <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                          <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                          <FileText className="absolute inset-0 m-auto text-indigo-600" size={24} />
                       </div>
                       <h4 className="text-lg font-bold text-slate-800">Đang tạo file PDF...</h4>
                       <p className="text-sm text-slate-500">Vui lòng đợi trong giây lát.</p>
                    </div>
                 )}

                 {/* Step 3: Done */}
                 {autoFillStep === 'done' && (
                    <div className="flex flex-col items-center justify-center flex-1 py-6 text-center">
                       <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 animate-bounce">
                          <CheckCircle2 size={32} className="text-green-600" />
                       </div>
                       <h4 className="text-xl font-bold text-green-700">Hoàn tất!</h4>
                       <p className="text-sm text-slate-600 mt-2 mb-6">Biểu mẫu đã được điền đầy đủ thông tin. Bạn có thể tải về ngay.</p>
                       
                       <div className="w-full bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center gap-4 mb-6 text-left">
                          <div className="bg-red-50 p-2 rounded text-red-600">
                             <FileText size={24} />
                          </div>
                          <div className="flex-1">
                             <p className="text-sm font-bold text-slate-900">Videx_Form_NguyenThuyLinh.pdf</p>
                             <p className="text-xs text-slate-500">1.2 MB • Vừa xong</p>
                          </div>
                          <button className="text-indigo-600 font-bold text-xs hover:underline">Xem trước</button>
                       </div>

                       <div className="flex gap-3 w-full">
                          <button 
                             onClick={() => setShowAutoFillModal(false)}
                             className="flex-1 py-2.5 border border-slate-300 text-slate-600 font-bold rounded-lg hover:bg-slate-50"
                          >
                             Đóng
                          </button>
                          <button className="flex-1 py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-sm flex items-center justify-center gap-2">
                             <Download size={18} /> Tải xuống
                          </button>
                       </div>
                    </div>
                 )}

              </div>
           </div>
        </div>
      )}

      {/* DOCUMENT MANAGEMENT MODAL (Existing) */}
      {showUploadModal && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowUploadModal(false)}></div>
           <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
              <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                 <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <FileText className="text-[#0d47a1]" /> {selectedDoc.name}
                    </h3>
                    <p className="text-sm text-slate-500">{selectedDoc.sub}</p>
                 </div>
                 <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={24} />
                 </button>
              </div>
              
              <div className="p-6">
                 {/* Upload Area */}
                 <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 hover:border-[#0d47a1] transition-all cursor-pointer group mb-6">
                    <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-[#0d47a1] mb-3 group-hover:scale-110 transition-transform">
                        <CloudUpload size={24} />
                    </div>
                    <p className="text-sm font-bold text-slate-700">Kéo thả file hoặc bấm để tải lên</p>
                    <p className="text-xs text-slate-400 mt-1">Hỗ trợ PDF, JPG, PNG (Max 10MB)</p>
                 </div>

                 {/* Version History */}
                 <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Lịch sử Phiên bản (Version History)</h4>
                 <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                    {selectedDoc.versions.length > 0 ? selectedDoc.versions.map((ver, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="bg-red-50 text-red-600 p-2 rounded-lg">
                                    <FileText size={16} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-900">{ver.name}</p>
                                    <p className="text-[10px] text-slate-500">{ver.date} • by {ver.user}</p>
                                </div>
                            </div>
                            <button className="text-slate-400 hover:text-[#0d47a1]">
                                <Download size={16} />
                            </button>
                        </div>
                    )) : (
                        <p className="text-sm text-slate-400 italic text-center py-4">Chưa có file nào được tải lên.</p>
                    )}
                 </div>
              </div>

              <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
                 <button onClick={() => setShowUploadModal(false)} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-lg text-sm">Đóng</button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default StudyAbroadCaseDetail;
