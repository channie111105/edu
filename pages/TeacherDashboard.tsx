
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  CalendarDays, 
  CheckCircle2, 
  Clock, 
  Users, 
  MapPin,
  ClipboardList,
  Bell,
  Star
} from 'lucide-react';

const TeacherDashboard: React.FC = () => {
  const navigate = useNavigate();

  // Mock đã loại bỏ — sẽ load lớp & nhắc việc thật từ storage khi có teacher service.
  const MY_CLASSES: Array<{ id: string; name: string; room: string; time: string; students: number; nextSession: string }> = [];
  const PENDING_TASKS: Array<{ id: number; title: string; due: string; type: 'attendance' | 'grade' }> = [];

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#111418] font-sans overflow-y-auto">
      <div className="flex flex-col flex-1 p-6 lg:p-10 max-w-[1200px] mx-auto w-full gap-8">
        
        {/* Welcome Header */}
        <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
           <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">Xin chào, Cô Lan 👋</h1>
              <p className="text-slate-500">Chúc cô một ngày giảng dạy hiệu quả!</p>
           </div>
           <div className="flex gap-4">
              <div className="text-center px-4 border-r border-slate-100">
                 <p className="text-xs text-slate-400 font-bold uppercase">Giờ dạy tháng này</p>
                 <p className="text-xl font-black text-blue-600">42h</p>
              </div>
              <div className="text-center px-4">
                 <p className="text-xs text-slate-400 font-bold uppercase">Đánh giá TB</p>
                 <p className="text-xl font-black text-yellow-500 flex items-center gap-1">4.8 <Star size={16} fill="currentColor"/></p>
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           
           {/* Left: Classes */}
           <div className="lg:col-span-2 flex flex-col gap-6">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                 <BookOpen className="text-blue-600" /> Lớp đang phụ trách
              </h2>
              <div className="grid gap-4">
                 {MY_CLASSES.map(cls => (
                    <div key={cls.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex justify-between items-center group">
                       <div className="flex gap-4 items-center">
                          <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
                             {cls.name.substring(0, 2)}
                          </div>
                          <div>
                             <h3 className="font-bold text-slate-900 text-lg group-hover:text-blue-600 transition-colors">{cls.name}</h3>
                             <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                                <span className="flex items-center gap-1"><Clock size={14}/> {cls.time}</span>
                                <span className="flex items-center gap-1"><MapPin size={14}/> {cls.room}</span>
                                <span className="flex items-center gap-1"><Users size={14}/> {cls.students} HV</span>
                             </div>
                          </div>
                       </div>
                       <div className="flex flex-col gap-2">
                          <button 
                             onClick={() => navigate(`/training/classes/C-001/attendance`)} // Hardcoded for demo
                             className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm shadow-sm transition-colors flex items-center gap-2"
                          >
                             <ClipboardList size={16} /> Điểm danh
                          </button>
                          <button 
                             onClick={() => navigate(`/training/classes/C-001/grades`)}
                             className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-bold text-sm transition-colors"
                          >
                             Nhập điểm
                          </button>
                       </div>
                    </div>
                 ))}
              </div>
           </div>

           {/* Right: Notifications & Tasks */}
           <div className="flex flex-col gap-6">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                 <Bell className="text-amber-500" /> Nhắc nhở
              </h2>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                 <div className="divide-y divide-slate-100">
                    {PENDING_TASKS.map(task => (
                       <div key={task.id} className="p-4 hover:bg-slate-50 transition-colors cursor-pointer">
                          <div className="flex justify-between items-start mb-1">
                             <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${task.type === 'attendance' ? 'bg-red-100 text-red-700' : 'bg-purple-100 text-purple-700'}`}>
                                {task.type === 'attendance' ? 'Điểm danh' : 'Học vụ'}
                             </span>
                             <span className="text-xs text-slate-400">Ngay bây giờ</span>
                          </div>
                          <p className="font-bold text-slate-800 text-sm mb-1">{task.title}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                             <Clock size={12} /> Hạn: {task.due}
                          </p>
                       </div>
                    ))}
                    <div className="p-4 bg-green-50">
                       <div className="flex gap-3">
                          <CheckCircle2 className="text-green-600 mt-0.5" size={20} />
                          <div>
                             <p className="text-sm font-bold text-green-800">Lương tháng 10 đã chốt</p>
                             <p className="text-xs text-green-700 mt-1">Tổng giờ dạy: 42h. Vui lòng kiểm tra lại bảng lương trước ngày 28.</p>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
           </div>

        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
