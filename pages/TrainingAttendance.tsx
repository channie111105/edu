import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Circle, Clock, Calendar, Lock, Unlock, ClipboardCheck, History, Save, Edit3 } from 'lucide-react';

const TrainingAttendance: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'today' | 'history'>('today');

  // Today's Attendance Mock Data
  const [todayAttendance, setTodayAttendance] = useState([
    { id: 'S1', name: 'Nguyễn Văn Nam', status: 'present', note: '' },
    { id: 'S2', name: 'Trần Thị Bích', status: 'present', note: '' },
    { id: 'S3', name: 'Lê Văn Cường', status: 'absent', note: 'Xin nghỉ sốt' },
    { id: 'S4', name: 'Phạm Hương', status: 'present', note: '' },
    { id: 'S5', name: 'Hoàng Văn Em', status: 'late', note: 'Tắc đường 15p' },
  ]);

  // History Mock Data
  const HISTORY_STUDENTS = [
    { name: 'Nguyễn Văn Nam', status: ['Present', 'Absent', 'Present', 'Late', 'Present'] },
    { name: 'Trần Thị Bích', status: ['Present', 'Present', 'Present', 'Present', 'Present'] },
    { name: 'Lê Văn Cường', status: ['Absent', 'Absent', 'Absent', 'Absent', 'Absent'] },
    { name: 'Phạm Hương', status: ['Present', 'Present', 'Present', 'Present', 'Present'] },
    { name: 'Hoàng Văn Em', status: ['Present', 'Present', 'Present', 'Present', 'Present'] },
  ];
  const DATES = ['01/09', '08/09', '15/09', '22/09', '29/09'];

  const SYLLABUS = [
    { title: 'Chương 1: Giới thiệu & Bảng chữ cái', status: 'Completed', isLocked: false },
    { title: 'Chương 2: Ngữ pháp cơ bản (A1)', status: 'Completed', isLocked: false },
    { title: 'Chương 3: Cấu trúc câu đơn', status: 'In Progress', isLocked: false },
    { title: 'Chương 4: Viết đoạn văn ngắn', status: 'Upcoming', isLocked: true },
    { title: 'Chương 5: Luyện nghe & Nói', status: 'Upcoming', isLocked: true },
  ];

  const handleNoteChange = (id: string, note: string) => {
    setTodayAttendance(prev => prev.map(s => s.id === id ? { ...s, note } : s));
  };

  const handleStatusChange = (id: string, status: string) => {
    setTodayAttendance(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Present': return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-md text-xs font-bold">Có mặt</span>;
      case 'Absent': return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-md text-xs font-bold">Vắng</span>;
      case 'Late': return <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-md text-xs font-bold">Muộn</span>;
      default: return null;
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

          {/* LEFT: MAIN CONTENT */}
          <div className="flex flex-col flex-1 min-w-0">

            {/* TABS */}
            <div className="flex gap-4 border-b border-slate-200 mb-6">
              <button
                onClick={() => setViewMode('today')}
                className={`pb-3 px-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${viewMode === 'today' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                <Edit3 size={16} /> Điểm danh Hôm nay
              </button>
              <button
                onClick={() => setViewMode('history')}
                className={`pb-3 px-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${viewMode === 'history' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                <History size={16} /> Lịch sử Điểm danh
              </button>
            </div>

            {viewMode === 'today' ? (
              // TODAY VIEW
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div>
                    <h3 className="font-bold text-lg">Buổi học: 03/02/2026</h3>
                    <p className="text-sm text-slate-500">Giảng viên: Cô Nguyễn Thị Lan</p>
                  </div>
                  <button className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-md transition-all">
                    <Save size={18} /> Lưu Điểm danh
                  </button>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-bold text-slate-700 w-[250px]">Học viên</th>
                        <th className="px-6 py-4 text-center text-sm font-bold text-slate-700 w-[300px]">Trạng thái</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">Ghi chú (Lý do vắng/muộn)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {todayAttendance.map((stu) => (
                        <tr key={stu.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-800">{stu.name}</td>
                          <td className="px-6 py-4">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => handleStatusChange(stu.id, 'present')}
                                className={`px-3 py-1.5 rounded text-sm font-bold transition-all border ${stu.status === 'present' ? 'bg-green-100 border-green-200 text-green-700 ring-2 ring-green-500 ring-offset-1' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                              >
                                Có mặt
                              </button>
                              <button
                                onClick={() => handleStatusChange(stu.id, 'late')}
                                className={`px-3 py-1.5 rounded text-sm font-bold transition-all border ${stu.status === 'late' ? 'bg-amber-100 border-amber-200 text-amber-700 ring-2 ring-amber-500 ring-offset-1' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                              >
                                Muộn
                              </button>
                              <button
                                onClick={() => handleStatusChange(stu.id, 'absent')}
                                className={`px-3 py-1.5 rounded text-sm font-bold transition-all border ${stu.status === 'absent' ? 'bg-red-100 border-red-200 text-red-700 ring-2 ring-red-500 ring-offset-1' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                              >
                                Vắng
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <input
                              type="text"
                              placeholder="Nhập ghi chú..."
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                              value={stu.note}
                              onChange={(e) => handleNoteChange(stu.id, e.target.value)}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              // HISTORY VIEW (Original Grid)
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center p-4">
                  <h3 className="text-lg font-bold text-slate-700">Lịch sử điểm danh (Tháng 9)</h3>
                  <button className="flex items-center gap-2 px-4 py-2 bg-white border border-[#cfdbe7] rounded-lg text-sm font-bold text-[#0d141b] hover:bg-slate-50">
                    <Calendar size={16} /> Chọn tháng
                  </button>
                </div>
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
                      {HISTORY_STUDENTS.map((student, idx) => (
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
            )}

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
