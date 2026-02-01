
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  BookOpen, 
  MapPin, 
  Calendar,
  MoreHorizontal,
  Plus,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  GraduationCap,
  ClipboardList,
  BarChart2,
  FolderOpen
} from 'lucide-react';

// --- MOCK DATA ---
const CLASSES = [
  { 
    id: 'C-001', 
    code: 'DE-A1-K24', 
    name: 'Tiếng Đức A1 - K24', 
    teacher: 'Cô Nguyễn Thị Lan', 
    teacherAvatar: 'https://i.pravatar.cc/150?u=a042581f4e29026024d',
    room: 'Phòng 101 - Offline', 
    schedule: [
        { day: 'Thứ 2', time: '18:30 - 20:30' },
        { day: 'Thứ 4', time: '18:30 - 20:30' },
        { day: 'Thứ 6', time: '18:30 - 20:30' },
    ],
    students: [
        { id: 'S1', name: 'Nguyễn Văn Nam', status: 'Paid', note: 'Đã đóng đủ' },
        { id: 'S2', name: 'Trần Thị Bích', status: 'Partial', note: 'Thiếu 2tr' },
        { id: 'S3', name: 'Lê Hoàng', status: 'Overdue', note: 'Quá hạn 5 ngày' },
        { id: 'S4', name: 'Phạm Hương', status: 'Paid', note: 'Đã đóng đủ' },
    ],
    price: '8.000.000 đ'
  },
  { 
    id: 'C-002', 
    code: 'CN-HSK3-K05', 
    name: 'Luyện thi HSK 3 - K05', 
    teacher: 'Cô Trần Mai', 
    teacherAvatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704d',
    room: 'Online (Zoom)', 
    schedule: [
        { day: 'Thứ 7', time: '14:00 - 16:00' },
        { day: 'Chủ Nhật', time: '14:00 - 16:00' },
    ],
    students: [
        { id: 'S5', name: 'Vũ Minh Hiếu', status: 'Paid', note: 'Đã đóng đủ' },
        { id: 'S6', name: 'Đặng Thu Thảo', status: 'Paid', note: 'Đã đóng đủ' },
    ],
    price: '4.500.000 đ'
  },
  { 
    id: 'C-003', 
    code: 'DE-A2-K10', 
    name: 'Tiếng Đức A2 - K10', 
    teacher: 'Thầy Michael Đức', 
    teacherAvatar: 'https://i.pravatar.cc/150?u=a042581f4e29026024e',
    room: 'Phòng 102 - Offline', 
    schedule: [
        { day: 'Thứ 3', time: '08:30 - 10:30' },
        { day: 'Thứ 5', time: '08:30 - 10:30' },
    ],
    students: [
        { id: 'S7', name: 'Ngô Bá Khá', status: 'Overdue', note: 'Chưa đóng tiền' },
    ],
    price: '9.000.000 đ'
  },
];

const TrainingClassList: React.FC = () => {
  const navigate = useNavigate();
  const [selectedClassId, setSelectedClassId] = useState(CLASSES[0].id);
  const [searchTerm, setSearchTerm] = useState('');

  const selectedClass = CLASSES.find(c => c.id === selectedClassId) || CLASSES[0];

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#111418] font-sans overflow-hidden">
      <div className="flex flex-1 justify-center py-5 px-6 gap-1 h-full overflow-hidden">
        
        {/* LEFT SIDEBAR: LIST OF CLASSES */}
        <div className="flex flex-col w-80 shrink-0 h-full overflow-hidden">
            <div className="flex flex-wrap justify-between gap-3 p-4">
                <p className="text-[#111418] tracking-[-0.015em] text-[32px] font-bold leading-tight">Lớp học</p>
            </div>
            
            {/* Search */}
            <div className="px-4 py-3">
              <label className="flex flex-col min-w-40 h-12 w-full">
                <div className="flex w-full flex-1 items-stretch rounded-lg h-full">
                  <div className="text-[#4c739a] flex border-none bg-[#e7edf3] items-center justify-center pl-4 rounded-l-lg border-r-0">
                    <Search size={24} />
                  </div>
                  <input
                    placeholder="Tìm lớp học..."
                    className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#111418] focus:outline-0 focus:ring-0 border-none bg-[#e7edf3] focus:border-none h-full placeholder:text-[#4c739a] px-4 rounded-l-none border-l-0 pl-2 text-base font-normal leading-normal"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </label>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {CLASSES.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())).map((cls) => (
                    <div 
                        key={cls.id}
                        onClick={() => setSelectedClassId(cls.id)}
                        className={`flex items-center gap-4 px-4 min-h-[72px] py-2 cursor-pointer transition-colors ${selectedClassId === cls.id ? 'bg-blue-50' : 'bg-[#f8fafc] hover:bg-slate-100'}`}
                    >
                        <div className="text-[#111418] flex items-center justify-center rounded-lg bg-[#e7edf3] shrink-0 size-12">
                            <BookOpen size={24} />
                        </div>
                        <div className="flex flex-col justify-center">
                            <p className="text-[#111418] text-base font-medium leading-normal line-clamp-1">{cls.name}</p>
                            <p className="text-[#4c739a] text-sm font-normal leading-normal line-clamp-2">{cls.price} • {cls.room.split(' - ')[1] || 'Online'}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* RIGHT MAIN CONTENT: CLASS DETAILS */}
        <div className="flex flex-col flex-1 h-full overflow-y-auto bg-white rounded-xl shadow-sm border border-[#cfdbe7] ml-4">
            
            {/* Header */}
            <div className="flex flex-wrap justify-between gap-3 p-6 border-b border-[#cfdbe7]">
              <div className="flex min-w-72 flex-col gap-3">
                <p className="text-[#111418] tracking-[-0.015em] text-[32px] font-bold leading-tight">Chi tiết Lớp học</p>
                <p className="text-[#4c739a] text-sm font-normal leading-normal">{selectedClass.code} • {selectedClass.room}</p>
              </div>
              <div className="flex gap-3">
                 <button 
                    onClick={() => navigate(`/training/classes/${selectedClass.id}/attendance`)}
                    className="flex items-center gap-2 bg-white border border-[#cfdbe7] text-[#111418] px-3 py-2 rounded-lg font-bold hover:bg-slate-50 transition-colors"
                 >
                    <ClipboardList size={18} /> Điểm danh
                 </button>
                 <button 
                    onClick={() => navigate(`/training/classes/${selectedClass.id}/grades`)}
                    className="flex items-center gap-2 bg-white border border-[#cfdbe7] text-[#111418] px-3 py-2 rounded-lg font-bold hover:bg-slate-50 transition-colors"
                 >
                    <BarChart2 size={18} /> Sổ điểm
                 </button>
                 <button 
                    onClick={() => navigate(`/training/classes/${selectedClass.id}/resources`)}
                    className="flex items-center gap-2 bg-white border border-[#cfdbe7] text-[#111418] px-3 py-2 rounded-lg font-bold hover:bg-slate-50 transition-colors"
                 >
                    <FolderOpen size={18} /> Tài liệu
                 </button>
                 <button className="flex items-center gap-2 bg-[#1380ec] text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors">
                    <Plus size={18} /> Thêm học viên
                 </button>
              </div>
            </div>

            <div className="p-6">
                {/* Teacher Section */}
                <h3 className="text-[#111418] text-lg font-bold leading-tight tracking-[-0.015em] pb-2 pt-0">Giảng viên phụ trách</h3>
                <div className="flex items-center gap-4 bg-[#f8fafc] rounded-xl px-4 min-h-14 border border-[#cfdbe7] mb-6">
                    <div
                        className="bg-center bg-no-repeat aspect-square bg-cover rounded-full h-10 w-fit border border-[#cfdbe7]"
                        style={{ backgroundImage: `url("${selectedClass.teacherAvatar}")` }}
                    ></div>
                    <p className="text-[#111418] text-base font-normal leading-normal flex-1 truncate">{selectedClass.teacher}</p>
                </div>

                {/* Schedule Table */}
                <h3 className="text-[#111418] text-lg font-bold leading-tight tracking-[-0.015em] pb-2 pt-2">Lịch học trong tuần</h3>
                <div className="py-3 mb-6">
                    <div className="flex overflow-hidden rounded-lg border border-[#cfdbe7] bg-[#f8fafc]">
                        <table className="flex-1">
                            <thead>
                                <tr className="bg-[#f8fafc]">
                                    <th className="px-4 py-3 text-left text-[#111418] w-[200px] text-sm font-medium leading-normal border-r border-[#cfdbe7]">Ngày</th>
                                    <th className="px-4 py-3 text-left text-[#111418] text-sm font-medium leading-normal">Khung giờ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedClass.schedule.map((slot, idx) => (
                                    <tr key={idx} className="border-t border-t-[#cfdbe7]">
                                        <td className="px-4 py-2 w-[200px] text-[#111418] text-sm font-normal leading-normal border-r border-[#cfdbe7]">{slot.day}</td>
                                        <td className="px-4 py-2 text-[#4c739a] text-sm font-normal leading-normal">{slot.time}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Student Enrollment Table */}
                <h3 className="text-[#111418] text-lg font-bold leading-tight tracking-[-0.015em] pb-2 pt-2">Danh sách Học viên ({selectedClass.students.length})</h3>
                <div className="py-3">
                    <div className="flex overflow-hidden rounded-lg border border-[#cfdbe7] bg-[#f8fafc]">
                        <table className="flex-1">
                            <thead>
                                <tr className="bg-[#f8fafc]">
                                    <th className="px-4 py-3 text-left text-[#111418] w-[400px] text-sm font-medium leading-normal border-r border-[#cfdbe7]">Họ và tên</th>
                                    <th className="px-4 py-3 text-left text-[#111418] w-60 text-sm font-medium leading-normal">Trạng thái đóng phí</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedClass.students.map((stu) => (
                                    <tr key={stu.id} className="border-t border-t-[#cfdbe7] hover:bg-white transition-colors">
                                        <td className="h-[72px] px-4 py-2 w-[400px] text-[#111418] text-sm font-normal leading-normal border-r border-[#cfdbe7]">
                                            {stu.name}
                                        </td>
                                        <td className="h-[72px] px-4 py-2 w-60 text-sm font-normal leading-normal">
                                            {stu.status === 'Paid' && (
                                                <button className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-8 px-4 bg-[#e7edf3] text-[#111418] text-sm font-medium leading-normal w-full">
                                                    <span className="truncate">{stu.note}</span>
                                                </button>
                                            )}
                                            {stu.status === 'Partial' && (
                                                <button className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-8 px-4 bg-amber-100 text-amber-700 text-sm font-medium leading-normal w-full">
                                                    <span className="truncate">{stu.note}</span>
                                                </button>
                                            )}
                                            {stu.status === 'Overdue' && (
                                                <button className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-8 px-4 bg-red-100 text-red-700 text-sm font-medium leading-normal w-full">
                                                    <span className="truncate">{stu.note}</span>
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default TrainingClassList;
