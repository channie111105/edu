
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Circle, Clock, MoreHorizontal, Calendar, Lock, Unlock } from 'lucide-react';

const TrainingAttendance: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Mock Data mimicking the provided design
  const STUDENTS = [
    { name: 'Nguyễn Văn Nam', status: ['Present', 'Absent', 'Present', 'Late', 'Present'] },
    { name: 'Trần Thị Bích', status: ['Present', 'Present', 'Present', 'Present', 'Present'] },
    { name: 'Lê Văn Cường', status: ['Absent', 'Absent', 'Absent', 'Absent', 'Absent'] },
    { name: 'Phạm Hương', status: ['Present', 'Present', 'Present', 'Present', 'Present'] },
    { name: 'Hoàng Văn Em', status: ['Present', 'Present', 'Present', 'Present', 'Present'] },
  ];

  const DATES = ['01/09', '08/09', '15/09', '22/09', '29/09'];

  // Enhanced Syllabus with Lock Logic
  const SYLLABUS = [
    { title: 'Chương 1: Giới thiệu & Bảng chữ cái', status: 'Completed', isLocked: false },
    { title: 'Chương 2: Ngữ pháp cơ bản (A1)', status: 'Completed', isLocked: false },
    { title: 'Chương 3: Cấu trúc câu đơn', status: 'In Progress', isLocked: false },
    { title: 'Chương 4: Viết đoạn văn ngắn', status: 'Upcoming', isLocked: true }, // Locked
    { title: 'Chương 5: Luyện nghe & Nói', status: 'Upcoming', isLocked: true }, // Locked
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Present':
        return (
          <button className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-8 px-4 bg-[#e7edf3] text-[#0d141b] text-sm font-medium leading-normal w-full hover:bg-slate-200 transition-colors">
            <span className="truncate">Có mặt</span>
          </button>
        );
      case 'Absent':
        return (
          <button className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-8 px-4 bg-red-50 text-red-700 text-sm font-medium leading-normal w-full hover:bg-red-100 transition-colors">
            <span className="truncate">Vắng</span>
          </button>
        );
      case 'Late':
        return (
          <button className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-8 px-4 bg-amber-50 text-amber-700 text-sm font-medium leading-normal w-full hover:bg-amber-100 transition-colors">
            <span className="truncate">Muộn</span>
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#0d141b] font-sans overflow-y-auto">
      
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-5 bg-white border-b border-[#e7edf3]">
        <button 
          onClick={() => navigate('/training/classes')}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ArrowLeft size={24} className="text-slate-600" />
        </button>
        <div>
           <h1 className="text-2xl font-bold text-[#0d141b]">Theo dõi Điểm danh & Tiến độ</h1>
           <p className="text-sm text-[#4c739a]">Lớp học: {id || 'Tiếng Đức A1 - K24'}</p>
        </div>
      </div>

      <div className="flex justify-center py-5 px-6">
        <div className="flex flex-col lg:flex-row gap-6 max-w-[1400px] w-full">
          
          {/* LEFT: ATTENDANCE TABLE */}
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex flex-wrap justify-between gap-3 p-4">
              <div className="flex min-w-72 flex-col gap-1">
                <p className="text-[#0d141b] tracking-light text-[22px] font-bold leading-tight">Bảng Điểm danh</p>
                <p className="text-[#4c739a] text-sm font-normal leading-normal">
                  Theo dõi trạng thái tham gia lớp học của từng học viên.
                </p>
              </div>
              <div className="flex gap-2">
                 <button className="flex items-center gap-2 px-4 py-2 bg-white border border-[#cfdbe7] rounded-lg text-sm font-bold text-[#0d141b] hover:bg-slate-50">
                    <Calendar size={16} /> Chọn tháng
                 </button>
              </div>
            </div>
            
            <div className="px-4 py-3 w-full">
              <div className="flex overflow-x-auto rounded-lg border border-[#cfdbe7] bg-white shadow-sm">
                <table className="flex-1 w-full min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-[#cfdbe7]">
                      <th className="px-4 py-3 text-left text-[#0d141b] w-[200px] text-sm font-bold leading-normal sticky left-0 bg-slate-50 z-10">
                        Học viên
                      </th>
                      {DATES.map((date, idx) => (
                        <th key={idx} className="px-4 py-3 text-center text-[#0d141b] w-32 text-sm font-medium leading-normal">
                          {date}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {STUDENTS.map((student, idx) => (
                      <tr key={idx} className="border-t border-t-[#cfdbe7] hover:bg-slate-50 transition-colors">
                        <td className="h-[72px] px-4 py-2 text-[#0d141b] text-sm font-bold leading-normal sticky left-0 bg-white group-hover:bg-slate-50 z-10 border-r border-[#cfdbe7]">
                          {student.name}
                        </td>
                        {student.status.map((status, sIdx) => (
                          <td key={sIdx} className="h-[72px] px-4 py-2 w-32 text-center">
                            {getStatusBadge(status)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* RIGHT: LESSON PROGRESS & UNLOCK STATUS */}
          <div className="flex flex-col w-full lg:w-[360px] shrink-0">
            <h2 className="text-[#0d141b] text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5 lg:pt-4">
              Nội dung Bài học & Unlock
            </h2>
            <div className="bg-white rounded-xl border border-[#cfdbe7] p-4 shadow-sm">
              <div className="mb-4 text-xs font-medium text-slate-500 bg-slate-50 p-2 rounded border border-slate-200">
                 <span className="font-bold">Lưu ý:</span> Bài học tự động khóa nếu học viên chưa hoàn thành học phí Đợt tiếp theo.
              </div>
              <div className="grid grid-cols-[40px_1fr_30px] gap-x-2">
                {SYLLABUS.map((item, index) => {
                  const isLast = index === SYLLABUS.length - 1;
                  let icon = <Circle size={24} className="text-slate-300" />;
                  let lineColor = "bg-[#cfdbe7]";
                  let textColor = "text-[#4c739a]";
                  
                  if (item.status === 'Completed') {
                    icon = <Check size={24} className="text-green-600" />;
                    lineColor = "bg-green-200";
                    textColor = "text-[#0d141b]";
                  } else if (item.status === 'In Progress') {
                    icon = <Clock size={24} className="text-blue-600 animate-pulse" />;
                    lineColor = "bg-[#cfdbe7]";
                    textColor = "text-blue-700 font-bold";
                  }

                  return (
                    <React.Fragment key={index}>
                      {/* Timeline Line */}
                      <div className="flex flex-col items-center gap-1 pt-1">
                        <div className="text-[#0d141b]">{icon}</div>
                        {!isLast && <div className={`w-[1.5px] h-full min-h-[40px] ${lineColor}`}></div>}
                      </div>
                      
                      {/* Content */}
                      <div className={`flex flex-1 flex-col py-1 pb-6 ${item.isLocked ? 'opacity-50' : ''}`}>
                        <p className={`text-sm font-medium leading-normal ${textColor}`}>{item.title}</p>
                        <p className="text-[#4c739a] text-xs font-normal leading-normal">
                          {item.status === 'Completed' ? 'Đã hoàn thành' : item.status === 'In Progress' ? 'Đang giảng dạy' : 'Sắp tới'}
                        </p>
                      </div>

                      {/* Lock Status */}
                      <div className="pt-1" title={item.isLocked ? "Đã khóa do chưa đóng phí" : ""}>
                         {item.isLocked ? (
                            <Lock size={16} className="text-red-400" />
                         ) : (
                            <Unlock size={16} className="text-green-400 opacity-0" />
                         )}
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-4">
               <h3 className="text-sm font-bold text-blue-800 mb-2">Thống kê nhanh</h3>
               <div className="flex justify-between items-center border-b border-blue-200 pb-2 mb-2">
                  <span className="text-sm text-blue-700">Tổng số buổi</span>
                  <span className="font-bold text-blue-900">24</span>
               </div>
               <div className="flex justify-between items-center border-b border-blue-200 pb-2 mb-2">
                  <span className="text-sm text-blue-700">Đã học</span>
                  <span className="font-bold text-blue-900">10 (41%)</span>
               </div>
               <div className="flex justify-between items-center">
                  <span className="text-sm text-blue-700">Dự kiến kết thúc</span>
                  <span className="font-bold text-blue-900">15/11/2024</span>
               </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainingAttendance;
