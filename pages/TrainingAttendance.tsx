import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, ClipboardCheck, History, Save, Edit3 } from 'lucide-react';

interface AttendanceItem {
  id: string;
  name: string;
  status: 'present' | 'absent' | 'late';
  note: string;
}

interface HistoryRow {
  name: string;
  status: string[];
}

interface SyllabusItem {
  title: string;
  status: 'Completed' | 'In Progress' | 'Upcoming';
  isLocked: boolean;
}

const TrainingAttendance: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'today' | 'history'>('today');

  // Dữ liệu thực sẽ được nạp từ storage/service. Khi chưa có sẽ hiển thị trống.
  const [todayAttendance, setTodayAttendance] = useState<AttendanceItem[]>([]);
  const HISTORY_STUDENTS: HistoryRow[] = [];
  const DATES: string[] = [];
  const SYLLABUS: SyllabusItem[] = [];

  const handleNoteChange = (sid: string, note: string) => {
    setTodayAttendance((prev) => prev.map((s) => (s.id === sid ? { ...s, note } : s)));
  };

  const handleStatusChange = (sid: string, status: AttendanceItem['status']) => {
    setTodayAttendance((prev) => prev.map((s) => (s.id === sid ? { ...s, status } : s)));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Present':
        return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-md text-xs font-bold">Có mặt</span>;
      case 'Absent':
        return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-md text-xs font-bold">Vắng</span>;
      case 'Late':
        return <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-md text-xs font-bold">Muộn</span>;
      default:
        return <span className="text-slate-300 text-xs">-</span>;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#0d141b] font-sans overflow-y-auto">
      <div className="flex items-center gap-4 px-6 py-5 bg-white border-b border-[#e7edf3]">
        <button
          onClick={() => navigate('/training/classes')}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ArrowLeft size={24} className="text-slate-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-[#0d141b]">Theo dõi Điểm danh & Tiến độ</h1>
          <p className="text-sm text-[#4c739a]">Lớp học: {id || 'Chưa chọn lớp'}</p>
        </div>
      </div>

      <div className="flex justify-center py-5 px-6">
        <div className="flex flex-col lg:flex-row gap-6 max-w-[1400px] w-full">
          <div className="flex flex-col flex-1 min-w-0">
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
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div>
                    <h3 className="font-bold text-lg">Điểm danh hôm nay</h3>
                    <p className="text-sm text-slate-500">Chưa có dữ liệu giảng viên/buổi học.</p>
                  </div>
                  <button
                    type="button"
                    disabled
                    className="flex items-center gap-2 px-6 py-2 bg-blue-300 text-white rounded-lg font-bold shadow-md cursor-not-allowed"
                  >
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
                      {todayAttendance.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-6 py-12 text-center text-slate-400 text-sm">
                            Chưa có học viên nào trong lớp này.
                          </td>
                        </tr>
                      ) : (
                        todayAttendance.map((stu) => (
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
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center p-4">
                  <h3 className="text-lg font-bold text-slate-700">Lịch sử điểm danh</h3>
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
                      {HISTORY_STUDENTS.length === 0 ? (
                        <tr>
                          <td colSpan={DATES.length + 1} className="px-6 py-12 text-center text-slate-400 text-sm">
                            Chưa có lịch sử điểm danh.
                          </td>
                        </tr>
                      ) : (
                        HISTORY_STUDENTS.map((student, idx) => (
                          <tr key={idx} className="border-t border-t-[#cfdbe7] hover:bg-slate-50 transition-colors">
                            <td className="h-[72px] px-4 py-2 text-[#0d141b] text-sm font-bold leading-normal sticky left-0 bg-white z-10 border-r border-[#cfdbe7]">
                              {student.name}
                            </td>
                            {student.status.map((status, sIdx) => (
                              <td key={sIdx} className="h-[72px] px-4 py-2 w-32 text-center">
                                {getStatusBadge(status)}
                              </td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col w-full lg:w-[360px] shrink-0">
            <h2 className="text-[#0d141b] text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5 lg:pt-4 flex items-center gap-2">
              <ClipboardCheck size={22} className="text-blue-600" /> Nội dung Bài học
            </h2>
            <div className="bg-white rounded-xl border border-[#cfdbe7] p-4 shadow-sm">
              {SYLLABUS.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">Chưa có giáo án.</p>
              ) : (
                SYLLABUS.map((item, index) => (
                  <div key={index} className="py-2 border-b border-slate-100 last:border-b-0">
                    <p className="text-sm font-medium text-slate-700">{item.title}</p>
                    <p className="text-xs text-slate-400">{item.status}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainingAttendance;
