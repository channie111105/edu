
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Smartphone, Trophy, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';

const PROGRESS_DATA = [
  { name: 'Tuần 1', score: 85, progress: 100 },
  { name: 'Tuần 2', score: 78, progress: 100 },
  { name: 'Tuần 3', score: 92, progress: 90 },
  { name: 'Tuần 4', score: 65, progress: 40 },
];

const SKILL_DATA = [
  { name: 'Từ vựng', value: 80, color: '#3b82f6' },
  { name: 'Ngữ pháp', value: 70, color: '#10b981' },
  { name: 'Nghe', value: 60, color: '#f59e0b' },
  { name: 'Đọc', value: 85, color: '#8b5cf6' },
];

const TrainingAppProgress: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#111418] font-sans overflow-y-auto">
      
      {/* Header */}
      <div className="px-6 py-5 bg-white border-b border-[#e7edf3] flex items-center gap-4">
         <button 
            onClick={() => navigate('/training/students')}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
         >
            <ArrowLeft size={24} className="text-slate-600" />
         </button>
         <div>
            <h1 className="text-2xl font-bold text-[#0d141b]">Tiến độ học tập trên App</h1>
            <p className="text-sm text-[#4c739a]">Dữ liệu đồng bộ từ ứng dụng E-learning</p>
         </div>
      </div>

      <div className="p-6 lg:p-8 max-w-[1200px] mx-auto w-full">
         
         {/* Top Stats */}
         <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                    <Smartphone size={24} />
                </div>
                <div>
                    <p className="text-xs text-slate-500 font-bold uppercase">Tổng giờ học App</p>
                    <p className="text-xl font-black text-slate-900">42h 15p</p>
                </div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center">
                    <Trophy size={24} />
                </div>
                <div>
                    <p className="text-xs text-slate-500 font-bold uppercase">Điểm trung bình</p>
                    <p className="text-xl font-black text-slate-900">8.2/10</p>
                </div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                    <CheckCircle2 size={24} />
                </div>
                <div>
                    <p className="text-xs text-slate-500 font-bold uppercase">Bài tập đã làm</p>
                    <p className="text-xl font-black text-slate-900">128/150</p>
                </div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                    <AlertCircle size={24} />
                </div>
                <div>
                    <p className="text-xs text-slate-500 font-bold uppercase">Bài tập trễ hạn</p>
                    <p className="text-xl font-black text-slate-900">3</p>
                </div>
            </div>
         </div>

         {/* Charts Row */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            
            {/* Weekly Progress */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-lg mb-6 text-slate-900">Kết quả Quiz theo Tuần</h3>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={PROGRESS_DATA}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="score" fill="#3b82f6" name="Điểm số" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Skill Breakdown */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-lg mb-6 text-slate-900">Kỹ năng ngôn ngữ</h3>
                <div className="h-[300px] w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={SKILL_DATA}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {SKILL_DATA.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 mt-4">
                    {SKILL_DATA.map((skill, idx) => (
                        <div key={idx} className="flex items-center gap-1 text-xs font-bold text-slate-600">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: skill.color }}></div>
                            {skill.name}
                        </div>
                    ))}
                </div>
            </div>
         </div>

         {/* Recent Activity Log */}
         <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
                <h3 className="font-bold text-slate-900">Hoạt động gần đây trên App</h3>
            </div>
            <div className="divide-y divide-slate-100">
                {[
                    { activity: 'Hoàn thành Quiz: Từ vựng Chủ đề 3', time: '2 giờ trước', score: '95/100', status: 'pass' },
                    { activity: 'Xem video: Ngữ pháp Bài 4', time: '5 giờ trước', score: '-', status: 'view' },
                    { activity: 'Làm bài kiểm tra nghe', time: 'Hôm qua', score: '60/100', status: 'fail' },
                ].map((log, idx) => (
                    <div key={idx} className="p-4 flex justify-between items-center hover:bg-slate-50">
                        <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${log.status === 'pass' ? 'bg-green-500' : log.status === 'fail' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                            <div>
                                <p className="text-sm font-bold text-slate-900">{log.activity}</p>
                                <p className="text-xs text-slate-500">{log.time}</p>
                            </div>
                        </div>
                        <span className="text-sm font-mono font-bold text-slate-700">{log.score}</span>
                    </div>
                ))}
            </div>
         </div>

      </div>
    </div>
  );
};

export default TrainingAppProgress;
