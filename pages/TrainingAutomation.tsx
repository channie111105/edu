
import React, { useState } from 'react';
import { 
  Zap, 
  MessageSquare, 
  Mail, 
  Bell, 
  Clock, 
  Check, 
  Plus, 
  Trash2,
  Play,
  Loader2,
  Terminal
} from 'lucide-react';

const TrainingAutomation: React.FC = () => {
  const [rules, setRules] = useState([
    { id: 1, type: 'attendance', condition: 'Vắng không phép > 2 buổi', action: 'Gửi Zalo cho Phụ huynh', active: true },
    { id: 2, type: 'grade', condition: 'Điểm giữa kỳ < 5.0', action: 'Tạo Task cho Giáo vụ gọi tư vấn', active: true },
    { id: 3, type: 'schedule', condition: 'Trước giờ học 2 tiếng', action: 'Gửi App Notification nhắc lịch', active: true },
    { id: 4, type: 'birthday', condition: 'Sinh nhật học viên', action: 'Gửi Email chúc mừng & Voucher', active: false },
  ]);

  // State quản lý Logs
  const [logs, setLogs] = useState([
      { id: 1, time: '10:05', trigger: 'Attendance Check', desc: 'Detected Absence (Nguyễn Văn Nam - A1-K24)', action: 'Sent Zalo message to 0912xxx456' },
      { id: 2, time: '09:30', trigger: 'Schedule Reminder', desc: 'Class B1-K10 starting soon', action: 'Sent 15 App Notifications' }
  ]);

  const [isSimulating, setIsSimulating] = useState(false);

  const toggleRule = (id: number) => {
    setRules(rules.map(r => r.id === id ? { ...r, active: !r.active } : r));
  };

  const handleSimulate = () => {
      if (isSimulating) return;
      setIsSimulating(true);

      // Giả lập độ trễ xử lý của server
      setTimeout(() => {
          const now = new Date();
          const timeStr = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
          
          // Tạo log giả lập ngẫu nhiên
          const newLog = {
              id: Date.now(),
              time: timeStr,
              trigger: 'Manual Simulation',
              desc: 'Quét toàn bộ dữ liệu điểm số & chuyên cần...',
              action: 'Phát hiện 1 trường hợp điểm thấp (Lê Cường). Đã tạo Task #T-992.'
          };

          setLogs(prev => [newLog, ...prev]);
          setIsSimulating(false);
      }, 1200);
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#111418] font-sans overflow-y-auto">
      <div className="flex flex-col flex-1 p-6 lg:p-10 max-w-[1200px] mx-auto w-full">
        
        <div className="flex justify-between items-end mb-8">
           <div>
              <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                 <Zap className="text-amber-500 fill-current" /> Tự động hóa Thông báo
              </h1>
              <p className="text-slate-500 mt-1">Cấu hình các quy tắc gửi tin nhắn và tạo việc tự động để tăng cường tương tác.</p>
           </div>
           <button 
              onClick={handleSimulate}
              disabled={isSimulating}
              className={`text-white px-5 py-2.5 rounded-lg font-bold shadow-sm flex items-center gap-2 transition-all ${isSimulating ? 'bg-slate-700 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800 hover:shadow-md'}`}
           >
              {isSimulating ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
              {isSimulating ? 'Đang chạy...' : 'Chạy thử (Simulate)'}
           </button>
        </div>

        <div className="grid gap-4">
           {rules.map((rule) => (
              <div key={rule.id} className={`bg-white p-6 rounded-xl border shadow-sm flex flex-col md:flex-row items-center gap-6 transition-all ${rule.active ? 'border-slate-200' : 'border-slate-100 opacity-60 bg-slate-50'}`}>
                 
                 {/* Icon Type */}
                 <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${
                    rule.type === 'attendance' ? 'bg-red-50 text-red-600' : 
                    rule.type === 'grade' ? 'bg-orange-50 text-orange-600' : 
                    rule.type === 'schedule' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'
                 }`}>
                    {rule.type === 'attendance' ? <Clock size={24} /> : 
                     rule.type === 'grade' ? <Check size={24} /> : 
                     rule.type === 'schedule' ? <Bell size={24} /> : <Mail size={24} />}
                 </div>

                 {/* Content */}
                 <div className="flex-1 w-full text-center md:text-left">
                    <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 mb-2">
                       <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Khi (Trigger)</span>
                       <span className="font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">{rule.condition}</span>
                    </div>
                    <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4">
                       <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Thì (Action)</span>
                       <span className={`font-bold px-3 py-1 rounded-lg border flex items-center gap-2 ${
                          rule.action.includes('Zalo') ? 'bg-blue-50 text-blue-700 border-blue-100' :
                          rule.action.includes('Task') ? 'bg-orange-50 text-orange-700 border-orange-100' :
                          'bg-green-50 text-green-700 border-green-100'
                       }`}>
                          {rule.action.includes('Zalo') ? <MessageSquare size={16} /> : rule.action.includes('Email') ? <Mail size={16} /> : <Check size={16} />}
                          {rule.action}
                       </span>
                    </div>
                 </div>

                 {/* Toggle */}
                 <div className="flex items-center gap-4">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={rule.active} onChange={() => toggleRule(rule.id)} className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                    </label>
                    <button className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={20} /></button>
                 </div>
              </div>
           ))}

           <button className="w-full py-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-bold flex items-center justify-center gap-2 hover:bg-slate-50 hover:border-blue-300 hover:text-blue-600 transition-all">
              <Plus size={20} /> Thêm Quy tắc mới
           </button>
        </div>

        {/* Logs */}
        <div className="mt-10">
           <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Terminal size={20} /> Nhật ký hoạt động (System Logs)
           </h3>
           <div className="bg-slate-900 text-slate-300 rounded-xl p-6 font-mono text-xs overflow-hidden shadow-inner">
              <div className="flex flex-col gap-3">
                 {logs.map(log => (
                    <div key={log.id} className="animate-in slide-in-from-left-2 fade-in duration-300 border-b border-slate-800 pb-2 last:border-0 last:pb-0">
                        <div className="flex gap-2 mb-1">
                           <span className="text-green-400 font-bold">[{log.time}]</span>
                           <span className="text-yellow-500 font-bold">{log.trigger}</span>
                        </div>
                        <div className="pl-4 border-l-2 border-slate-700 ml-1">
                           <p className="text-slate-400">Target: {log.desc}</p>
                           <p className="text-blue-400 font-bold">» Executed: {log.action}</p>
                        </div>
                    </div>
                 ))}
                 <div className="text-slate-600 italic text-[10px] mt-2">End of logs. System monitoring active...</div>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default TrainingAutomation;
