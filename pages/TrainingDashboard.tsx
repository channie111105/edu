
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  BookOpen, 
  CalendarDays, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  TrendingUp,
  MapPin,
  MoreHorizontal,
  Star,
  Award
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

const ATTENDANCE_DATA = [
  { name: 'T2', value: 92 },
  { name: 'T3', value: 95 },
  { name: 'T4', value: 88 },
  { name: 'T5', value: 90 },
  { name: 'T6', value: 94 },
  { name: 'T7', value: 85 },
  { name: 'CN', value: 90 },
];

const TODAY_CLASSES = [
  { id: 'C1', name: 'Tiếng Đức A1 - K24', room: 'P.101', time: '08:30 - 10:30', teacher: 'Cô Lan', attendance: '18/20' },
  { id: 'C2', name: 'Luyện thi B1 - K10', room: 'P.102', time: '08:30 - 10:30', teacher: 'Thầy Đức', attendance: '12/15' },
  { id: 'C3', name: 'Tiếng Trung HSK 3', room: 'P.201', time: '14:00 - 16:00', teacher: 'Cô Mai', attendance: 'Chưa điểm danh' },
  { id: 'C4', name: 'Giao tiếp A2', room: 'P.101', time: '18:30 - 20:30', teacher: 'Thầy John', attendance: 'Chờ lớp' },
];

const TrainingDashboard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#111418] font-sans overflow-y-auto">
      <div className="flex flex-1 flex-col py-8 px-10 max-w-[1600px] mx-auto w-full gap-8">
        
        {/* Header */}
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Tổng quan Đào tạo & Học vụ</h1>
            <p className="text-slate-500 mt-1">Theo dõi lịch giảng dạy, chuyên cần và chất lượng lớp học.</p>
          </div>
          <button 
            onClick={() => navigate('/training/schedule')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-bold shadow-sm flex items-center gap-2 transition-colors"
          >
            <CalendarDays size={20} /> Xem Thời khóa biểu
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2">
            <div className="flex justify-between items-start">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lớp đang Active</p>
              <BookOpen className="text-blue-600" size={24} />
            </div>
            <p className="text-3xl font-black text-slate-900">12</p>
            <div className="flex items-center gap-1 text-green-600 text-xs font-bold">
              <CheckCircle2 size={14} /> Tất cả đều có GV
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2">
            <div className="flex justify-between items-start">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Học viên Active</p>
              <Users className="text-emerald-600" size={24} />
            </div>
            <p className="text-3xl font-black text-slate-900">145</p>
            <div className="flex items-center gap-1 text-slate-400 text-xs font-bold">
              +5 học viên mới tuần này
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2">
            <div className="flex justify-between items-start">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tỷ lệ Chuyên cần</p>
              <CheckCircle2 className="text-purple-600" size={24} />
            </div>
            <p className="text-3xl font-black text-slate-900">92%</p>
            <div className="flex items-center gap-1 text-green-600 text-xs font-bold">
              <TrendingUp size={14} /> Ổn định
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2">
            <div className="flex justify-between items-start">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cảnh báo Học vụ</p>
              <AlertTriangle className="text-red-500" size={24} />
            </div>
            <p className="text-3xl font-black text-red-600">8</p>
            <div className="flex items-center gap-1 text-red-500 text-xs font-bold">
              Nghỉ quá 20% số buổi
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left: Today's Schedule */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Clock size={20} className="text-blue-600" /> Lịch học Hôm nay (24/10)
                </h3>
                <button className="text-sm text-blue-600 font-bold hover:underline">Xem tất cả</button>
              </div>
              <div className="divide-y divide-slate-100">
                {TODAY_CLASSES.map((cls) => (
                  <div key={cls.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex gap-4 items-center">
                      <div className="flex flex-col items-center justify-center w-14 h-14 bg-blue-50 rounded-lg border border-blue-100 text-blue-700">
                        <span className="text-xs font-bold uppercase">{cls.time.split(' - ')[0]}</span>
                        <span className="text-[10px] text-blue-400">AM</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{cls.name}</h4>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-slate-500 flex items-center gap-1"><MapPin size={12}/> {cls.room}</span>
                          <span className="text-xs text-slate-500 flex items-center gap-1"><Users size={12}/> GV: {cls.teacher}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {cls.attendance.includes('Chưa') || cls.attendance.includes('Chờ') ? (
                        <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded shadow-sm transition-colors">
                          Điểm danh ngay
                        </button>
                      ) : (
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-bold text-slate-900">{cls.attendance}</span>
                          <span className="text-xs text-green-600 font-medium">Đã điểm danh</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Attendance Chart */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-900">Biểu đồ Chuyên cần (Tuần này)</h3>
                <div className="flex gap-2">
                  <span className="flex items-center gap-1 text-xs font-bold text-slate-500"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Đi học</span>
                </div>
              </div>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={ATTENDANCE_DATA}>
                    <defs>
                      <linearGradient id="colorAtt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                      formatter={(val) => [`${val}%`, 'Chuyên cần']}
                    />
                    <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorAtt)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Right: Quick Actions & Alerts */}
          <div className="flex flex-col gap-6">
            
            {/* Quick Actions */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl p-6 text-white shadow-lg">
              <h3 className="font-bold text-lg mb-4">Thao tác nhanh</h3>
              <div className="grid grid-cols-2 gap-3">
                <button className="bg-white/10 hover:bg-white/20 border border-white/20 p-3 rounded-lg flex flex-col items-center gap-2 transition-colors">
                  <BookOpen size={24} />
                  <span className="text-xs font-bold">Mở lớp mới</span>
                </button>
                <button className="bg-white/10 hover:bg-white/20 border border-white/20 p-3 rounded-lg flex flex-col items-center gap-2 transition-colors">
                  <CalendarDays size={24} />
                  <span className="text-xs font-bold">Xếp lịch thi</span>
                </button>
                <button className="bg-white/10 hover:bg-white/20 border border-white/20 p-3 rounded-lg flex flex-col items-center gap-2 transition-colors">
                  <Users size={24} />
                  <span className="text-xs font-bold">Nhập điểm</span>
                </button>
                <button 
                  onClick={() => navigate('/training/feedback')}
                  className="bg-white/10 hover:bg-white/20 border border-white/20 p-3 rounded-lg flex flex-col items-center gap-2 transition-colors"
                >
                  <Star size={24} />
                  <span className="text-xs font-bold">Đánh giá GV</span>
                </button>
                <button 
                  onClick={() => navigate('/training/certificates')}
                  className="bg-white/10 hover:bg-white/20 border border-white/20 p-3 rounded-lg flex flex-col items-center gap-2 transition-colors col-span-2"
                >
                  <Award size={24} />
                  <span className="text-xs font-bold">Quản lý & Cấp Chứng chỉ</span>
                </button>
              </div>
            </div>

            {/* Academic Alerts */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1">
              <div className="p-4 border-b border-slate-200 bg-red-50 flex items-center gap-2">
                <AlertTriangle className="text-red-600" size={20} />
                <h3 className="font-bold text-red-800 text-sm">Cảnh báo Học vụ (Risk)</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {[
                  { name: 'Nguyễn Văn Nam', class: 'A1-K24', issue: 'Nghỉ 3 buổi liên tiếp', risk: 'High' },
                  { name: 'Trần Thị Bích', class: 'B1-K10', issue: 'Điểm giữa kỳ < 5.0', risk: 'Medium' },
                  { name: 'Lê Hoàng', class: 'A2-K12', issue: 'Chưa nộp bài tập lớn', risk: 'Low' },
                ].map((alert, idx) => (
                  <div key={idx} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-slate-900 text-sm">{alert.name}</h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${alert.risk === 'High' ? 'bg-red-100 text-red-700' : alert.risk === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                        {alert.risk}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{alert.class} • {alert.issue}</p>
                    <button className="text-xs font-bold text-blue-600 mt-2 hover:underline">Xem chi tiết</button>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};

export default TrainingDashboard;
