
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  DollarSign, 
  Clock, 
  User,
  ShieldAlert
} from 'lucide-react';

const StudentProfile: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth(); // Import auth context
  const [activeTab, setActiveTab] = useState<'history' | 'deals' | 'contracts' | 'payments' | 'academic'>('history');

  // RBAC Checks
  const isTeacher = user?.role === UserRole.TEACHER;
  const isSales = user?.role === UserRole.SALES_REP || user?.role === UserRole.SALES_LEADER;

  // Mock Data
  const STUDENT = {
    id: id || '123456',
    name: 'Nguyễn Thùy Linh',
    studentId: 'HV-2024-089',
    status: 'Đang học',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCxvAVrLNZCCnc9vzMYShxScjmVtsZijBzmThM7l1E9MXVrQIqYYMOYK0hR10BLeqAYdJHeJpDN3gbRGb_hGWTPcOz2bnYwuVUo5-5ZL6-RVMZFGzWY_aZWufXHajBjAvipD_KiyLhpzeY0XFeS8FfElkwMTiOrQewvjCB4LtkPoeZJCYsvxU1T25PBGmwWjFfZGkgcwAM-Jso_pTPmOMRWoVjk4bUA6iRCNys7_BB1Ai8uL5Rgsi4X7Hs8neV_ZoiSmDHt5yyDiUY',
    email: 'linh.nguyen@email.com',
    phone: '098 765 4321',
    address: 'Số 18, Ngõ 5, Nguyễn Chí Thanh, Hà Nội',
    dob: '15/01/2004',
    parent: {
      name: 'Nguyễn Văn Hùng',
      phone: '091 234 5678',
      relation: 'Bố'
    }
  };

  const TIMELINE = [
    {
      icon: FileText,
      title: 'Nộp hồ sơ ghi danh',
      date: '01/07/2024',
      status: 'completed'
    },
    {
      icon: Calendar,
      title: 'Phỏng vấn đầu vào',
      date: '15/07/2024',
      status: 'completed'
    },
    {
      icon: CheckCircle2,
      title: 'Chấp nhận Thư mời (Offer)',
      date: '01/08/2024',
      status: 'completed'
    },
    {
      icon: CheckCircle2,
      title: 'Xác nhận Nhập học',
      date: '15/08/2024',
      status: 'completed'
    },
    {
      icon: DollarSign,
      title: 'Hoàn thành đóng phí đợt 1',
      date: '01/09/2024',
      status: 'completed'
    },
    {
      icon: Clock,
      title: 'Dự kiến thi B1',
      date: '15/12/2024',
      status: 'pending'
    }
  ];

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] font-sans text-[#0d141b] overflow-y-auto">
      
      {/* Header Container */}
      <div className="flex flex-col flex-1 max-w-[1200px] mx-auto w-full p-6">
        
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-6">
           <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <ArrowLeft size={24} className="text-slate-600" />
              </button>
              <div>
                 <h1 className="text-2xl font-bold text-[#0d141b]">Hồ sơ Học viên (Student 360)</h1>
                 <p className="text-sm text-[#4c739a]">Quản lý thông tin cá nhân và lịch sử học tập</p>
              </div>
           </div>
           <div className="flex gap-3">
              <button className="px-4 py-2 bg-white border border-[#cfdbe7] rounded-lg text-sm font-bold text-[#0d141b] hover:bg-slate-50">
                 Xuất hồ sơ
              </button>
              {!isTeacher && (
                  <button className="px-4 py-2 bg-[#1380ec] text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm">
                     Cập nhật
                  </button>
              )}
           </div>
        </div>

        {/* Content Grid */}
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* LEFT COLUMN: Sidebar Info */}
          <div className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-6">
            
            {/* Profile Card */}
            <div className="bg-white rounded-xl shadow-sm border border-[#cfdbe7] p-6 flex flex-col items-center">
               <div 
                 className="w-32 h-32 rounded-full bg-cover bg-center mb-4 border-4 border-slate-50 shadow-inner"
                 style={{ backgroundImage: `url(${STUDENT.avatar})` }}
               ></div>
               <h2 className="text-[22px] font-bold text-[#0d141b] text-center">{STUDENT.name}</h2>
               <p className="text-4c739a text-sm text-center">Mã HV: {STUDENT.studentId}</p>
               <span className="mt-2 px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full uppercase">
                 {STUDENT.status}
               </span>
            </div>

            {/* Personal Info */}
            <div className="bg-white rounded-xl shadow-sm border border-[#cfdbe7] overflow-hidden">
               <h3 className="text-lg font-bold text-[#0d141b] px-6 pt-5 pb-2">Thông tin cá nhân</h3>
               <div className="p-6 pt-2 grid grid-cols-[30%_1fr] gap-y-5 gap-x-4">
                  {/* Email */}
                  <div className="col-span-2 flex justify-between border-t border-[#cfdbe7] pt-4">
                     <span className="text-[#4c739a] text-sm">Email</span>
                     <span className="text-[#0d141b] text-sm font-medium">{STUDENT.email}</span>
                  </div>
                  {/* Phone */}
                  <div className="col-span-2 flex justify-between border-t border-[#cfdbe7] pt-4">
                     <span className="text-[#4c739a] text-sm">Điện thoại</span>
                     <span className="text-[#0d141b] text-sm font-medium">{STUDENT.phone}</span>
                  </div>
                  {/* Address (Hidden for Teacher if strict) - Currently visible */}
                  <div className="col-span-2 flex justify-between border-t border-[#cfdbe7] pt-4">
                     <span className="text-[#4c739a] text-sm">Địa chỉ</span>
                     <span className="text-[#0d141b] text-sm font-medium text-right max-w-[150px]">{STUDENT.address}</span>
                  </div>
                  {/* DOB */}
                  <div className="col-span-2 flex justify-between border-t border-[#cfdbe7] pt-4">
                     <span className="text-[#4c739a] text-sm">Ngày sinh</span>
                     <span className="text-[#0d141b] text-sm font-medium">{STUDENT.dob}</span>
                  </div>
               </div>
            </div>

            {/* Parent Info */}
            <div className="bg-white rounded-xl shadow-sm border border-[#cfdbe7] overflow-hidden">
               <h3 className="text-lg font-bold text-[#0d141b] px-6 pt-5 pb-2">Phụ huynh / Bảo hộ</h3>
               <div className="p-6 pt-2 grid grid-cols-1 gap-y-4">
                  <div className="border-t border-[#cfdbe7] pt-4 flex justify-between">
                     <span className="text-[#4c739a] text-sm">Họ tên</span>
                     <span className="text-[#0d141b] text-sm font-medium">{STUDENT.parent.name}</span>
                  </div>
                  <div className="border-t border-[#cfdbe7] pt-4 flex justify-between">
                     <span className="text-[#4c739a] text-sm">Điện thoại</span>
                     <span className="text-[#0d141b] text-sm font-medium">{STUDENT.parent.phone}</span>
                  </div>
                  <div className="border-t border-[#cfdbe7] pt-4 flex justify-between">
                     <span className="text-[#4c739a] text-sm">Quan hệ</span>
                     <span className="text-[#0d141b] text-sm font-medium">{STUDENT.parent.relation}</span>
                  </div>
               </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Main Content */}
          <div className="flex-1 flex flex-col gap-6">
             
             {/* Tabs & Title */}
             <div className="bg-white rounded-xl shadow-sm border border-[#cfdbe7] p-0 overflow-hidden">
                <div className="p-6 pb-0 border-b border-[#cfdbe7]">
                   <h2 className="text-[22px] font-bold text-[#0d141b] mb-4">Hồ sơ chi tiết</h2>
                   <div className="flex gap-8 overflow-x-auto">
                      <button 
                         onClick={() => setActiveTab('history')}
                         className={`pb-4 text-sm font-bold border-b-[3px] transition-colors whitespace-nowrap ${activeTab === 'history' ? 'border-[#1380ec] text-[#0d141b]' : 'border-transparent text-[#4c739a] hover:text-[#0d141b]'}`}
                      >
                         Lịch sử (History)
                      </button>
                      
                      {/* Academic Tab - Visible to All (Teachers & Sales) */}
                      <button 
                         onClick={() => setActiveTab('academic')}
                         className={`pb-4 text-sm font-bold border-b-[3px] transition-colors whitespace-nowrap ${activeTab === 'academic' ? 'border-[#1380ec] text-[#0d141b]' : 'border-transparent text-[#4c739a] hover:text-[#0d141b]'}`}
                      >
                         Học vụ (Điểm/Lớp)
                      </button>

                      {/* Deals Tab - Sales & Admin Only */}
                      {!isTeacher && (
                          <button 
                             onClick={() => setActiveTab('deals')}
                             className={`pb-4 text-sm font-bold border-b-[3px] transition-colors whitespace-nowrap ${activeTab === 'deals' ? 'border-[#1380ec] text-[#0d141b]' : 'border-transparent text-[#4c739a] hover:text-[#0d141b]'}`}
                          >
                             Deals (Cơ hội)
                          </button>
                      )}

                      {/* Contracts & Finance - Hidden for Teacher */}
                      {!isTeacher && (
                          <>
                            <button 
                                onClick={() => setActiveTab('contracts')}
                                className={`pb-4 text-sm font-bold border-b-[3px] transition-colors whitespace-nowrap ${activeTab === 'contracts' ? 'border-[#1380ec] text-[#0d141b]' : 'border-transparent text-[#4c739a] hover:text-[#0d141b]'}`}
                            >
                                Hợp đồng
                            </button>
                            <button 
                                onClick={() => setActiveTab('payments')}
                                className={`pb-4 text-sm font-bold border-b-[3px] transition-colors whitespace-nowrap ${activeTab === 'payments' ? 'border-[#1380ec] text-[#0d141b]' : 'border-transparent text-[#4c739a] hover:text-[#0d141b]'}`}
                            >
                                Tài chính
                            </button>
                          </>
                      )}
                   </div>
                </div>

                {/* Tab Content: HISTORY */}
                {activeTab === 'history' && (
                   <div className="p-6">
                      <div className="grid grid-cols-[40px_1fr] gap-x-2">
                         {TIMELINE.map((event, index) => {
                            const isLast = index === TIMELINE.length - 1;
                            const isPending = event.status === 'pending';
                            
                            return (
                               <React.Fragment key={index}>
                                  {/* Icon Column */}
                                  <div className="flex flex-col items-center gap-1">
                                     {index > 0 && <div className={`w-[1.5px] h-3 ${isPending ? 'bg-slate-200' : 'bg-[#cfdbe7]'}`}></div>}
                                     <div className={`text-[#0d141b] ${isPending ? 'opacity-40' : ''}`}>
                                        <event.icon size={24} />
                                     </div>
                                     {!isLast && <div className={`w-[1.5px] grow ${isPending ? 'bg-slate-200' : 'bg-[#cfdbe7]'}`}></div>}
                                  </div>
                                  
                                  {/* Text Column */}
                                  <div className={`flex flex-col py-3 ${isPending ? 'opacity-50' : ''}`}>
                                     <p className="text-[#0d141b] text-base font-medium leading-normal">{event.title}</p>
                                     <p className="text-[#4c739a] text-base font-normal leading-normal">{event.date}</p>
                                  </div>
                               </React.Fragment>
                            );
                         })}
                      </div>
                   </div>
                )}

                {/* Tab Content: ACADEMIC (Visible to Teacher & Sales) */}
                {activeTab === 'academic' && (
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-slate-900">Tiến độ học tập</h3>
                            {isSales && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Dữ liệu dùng để tư vấn Upsell</span>}
                        </div>
                        <div className="space-y-4">
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <div className="flex justify-between items-center mb-2">
                                    <p className="font-bold text-slate-800">Lớp Tiếng Đức A1</p>
                                    <span className="text-xs font-bold text-green-600">Đang học</span>
                                </div>
                                <div className="flex gap-6 text-sm text-slate-600">
                                    <p>Chuyên cần: <strong>95%</strong></p>
                                    <p>Điểm GK: <strong>8.5</strong></p>
                                    <p>Điểm CK: <strong>--</strong></p>
                                </div>
                            </div>
                            <button className="text-blue-600 text-sm font-bold hover:underline">Xem chi tiết bảng điểm</button>
                        </div>
                    </div>
                )}

                {/* Placeholders for other tabs */}
                {(activeTab === 'deals' || activeTab === 'contracts' || activeTab === 'payments') && (
                   <div className="p-12 text-center text-[#4c739a]">
                      <ShieldAlert className="mx-auto mb-2 text-slate-300" size={48} />
                      <p>Dữ liệu {activeTab} được bảo mật và chỉ hiển thị cho bộ phận liên quan.</p>
                   </div>
                )}
             </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default StudentProfile;
