
import React from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  MessageSquare, 
  Mail, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Calendar,
  MoreHorizontal
} from 'lucide-react';

const StudyAbroadInterviews: React.FC = () => {
  // Mock Data for Calendar Grid
  const CALENDAR_DAYS = [
    { day: 28, currentMonth: false }, { day: 29, currentMonth: false }, { day: 30, currentMonth: false },
    { day: 1, currentMonth: true }, { day: 2, currentMonth: true }, 
    { 
      day: 3, 
      currentMonth: true, 
      events: [{ type: 'visa', title: 'Visa: Nguyễn Thùy Linh', sub: 'Đại sứ quán Đức' }] 
    },
    { day: 4, currentMonth: true },
    { day: 5, currentMonth: true }, { day: 6, currentMonth: true },
    { 
      day: 7, 
      currentMonth: true, 
      events: [{ type: 'exam', title: 'Thi: Trần Văn Minh', sub: 'TestAS Online' }] 
    },
    { day: 8, currentMonth: true }, { day: 9, currentMonth: true },
    { 
      day: 10, 
      currentMonth: true, 
      isToday: true,
      events: [{ type: 'visa', title: 'Visa: Lê Hoàng', sub: 'Lãnh sự quán (HCM)' }] 
    },
    { day: 11, currentMonth: true }, { day: 12, currentMonth: true }, { day: 13, currentMonth: true }, { day: 14, currentMonth: true },
    { day: 15, currentMonth: true }, { day: 16, currentMonth: true }, { day: 17, currentMonth: true }, { day: 18, currentMonth: true },
    { day: 19, currentMonth: true }, { day: 20, currentMonth: true }, { day: 21, currentMonth: true }, { day: 22, currentMonth: true },
    { day: 23, currentMonth: true }, { day: 24, currentMonth: true }, { day: 25, currentMonth: true }, { day: 26, currentMonth: true },
    { day: 27, currentMonth: true }, { day: 28, currentMonth: true }, { day: 29, currentMonth: true }, { day: 30, currentMonth: true },
    { day: 1, currentMonth: false }, { day: 2, currentMonth: false }
  ];

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#0d141b] font-sans overflow-hidden">
      
      {/* Header */}
      <div className="px-8 py-6 flex justify-between items-end shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-[#0d141b]">Lịch Phỏng vấn & Nhắc nhở</h1>
          <p className="text-[#4c739a] text-sm mt-1">Tự động lên lịch và gửi thông báo nhắc nhở phỏng vấn Visa, thi đầu vào.</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-[#0d47a1] px-5 py-2.5 text-white font-bold text-sm hover:bg-[#0a3d8b] transition-all shadow-sm">
          <Plus size={20} />
          Lên lịch Phỏng vấn
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden px-8 pb-8 gap-6">
        
        {/* LEFT COLUMN: CALENDAR */}
        <div className="flex-1 bg-white rounded-xl border border-[#e7edf3] shadow-sm flex flex-col overflow-hidden">
          
          {/* Calendar Toolbar */}
          <div className="flex items-center justify-between p-4 border-b border-[#e7edf3]">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-bold text-[#0d141b]">Tháng 9, 2024</h3>
              <div className="flex border border-[#e7edf3] rounded-md overflow-hidden">
                <button className="px-3 py-1 bg-white hover:bg-slate-50 transition-colors border-r border-[#e7edf3]">
                  <ChevronLeft size={16} />
                </button>
                <button className="px-3 py-1 bg-white hover:bg-slate-50 transition-colors">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-100">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span> Phỏng vấn Visa
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-100">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span> Thi Đầu vào
              </span>
            </div>
          </div>

          {/* Calendar Grid Header */}
          <div className="grid grid-cols-7 border-b border-[#e7edf3] bg-slate-50">
            {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((day) => (
              <div key={day} className="text-center text-xs font-bold text-[#4c739a] uppercase tracking-wider py-3">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid Body */}
          <div className="grid grid-cols-7 flex-1 auto-rows-fr bg-white">
            {CALENDAR_DAYS.map((date, index) => (
              <div 
                key={index} 
                className={`border-b border-r border-[#e7edf3] p-2 min-h-[100px] flex flex-col relative transition-colors hover:bg-[#f8fafc]
                  ${!date.currentMonth ? 'bg-slate-50/50' : ''} 
                  ${date.isToday ? 'bg-blue-50/30' : ''}
                  ${(index + 1) % 7 === 0 ? 'border-r-0' : ''}
                `}
              >
                <span className={`text-sm font-medium mb-1 ${!date.currentMonth ? 'text-slate-400' : date.isToday ? 'text-blue-600 font-bold' : 'text-[#0d141b]'}`}>
                  {date.day}
                </span>
                
                {date.events?.map((ev, idx) => (
                  <div 
                    key={idx} 
                    className={`mb-1 p-1.5 rounded border-l-4 text-[10px] font-medium leading-tight cursor-pointer shadow-sm hover:shadow-md transition-all
                      ${ev.type === 'visa' 
                        ? 'bg-blue-100 border-blue-600 text-blue-800' 
                        : 'bg-amber-100 border-amber-500 text-amber-800'}
                    `}
                  >
                    <div className="font-bold">{ev.title}</div>
                    <div className="opacity-80">{ev.sub}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: SIDEBAR */}
        <aside className="w-[380px] bg-white border border-[#e7edf3] rounded-xl shadow-sm flex flex-col overflow-hidden shrink-0">
          
          <div className="p-5 border-b border-[#e7edf3]">
            <h3 className="text-lg font-bold text-[#0d141b]">Trạng thái Thông báo</h3>
            <p className="text-xs text-[#4c739a]">Hệ thống nhắc nhở tự động (Zalo/Email)</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            
            {/* Notification Item 1 */}
            <div className="p-4 rounded-xl border border-[#e7edf3] hover:bg-slate-50 transition-colors bg-white shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-bold text-[#0d141b]">Nguyễn Thùy Linh</span>
                <span className="px-2 py-0.5 rounded bg-green-100 text-green-700 text-[10px] font-bold uppercase border border-green-200">Đã gửi</span>
              </div>
              <p className="text-xs text-[#4c739a] mb-3 font-medium">Visa Interview (Đức) - Nhắc trước 3 ngày</p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-[11px] text-slate-500">
                  <MessageSquare size={14} className="text-blue-500" /> Zalo
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-500">
                  <Mail size={14} className="text-orange-500" /> Email
                </div>
                <div className="ml-auto text-[11px] text-slate-400 flex items-center gap-1">
                  <Clock size={12} /> 2 giờ trước
                </div>
              </div>
            </div>

            {/* Notification Item 2 */}
            <div className="p-4 rounded-xl border border-[#e7edf3] hover:bg-slate-50 transition-colors bg-white shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-bold text-[#0d141b]">Trần Văn Minh</span>
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold uppercase border border-blue-200">Đã lên lịch</span>
              </div>
              <p className="text-xs text-[#4c739a] mb-3 font-medium">Thi Đầu vào (Trung Quốc) - Nhắc trước 1 ngày</p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-[11px] text-slate-500">
                  <MessageSquare size={14} className="text-blue-500" /> Zalo
                </div>
                <div className="ml-auto text-[11px] text-slate-400 italic">09:00 Sáng mai</div>
              </div>
            </div>

            {/* Notification Item 3 (Failed) */}
            <div className="p-4 rounded-xl border border-red-100 bg-red-50/40">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-bold text-[#0d141b]">Lê Hoàng</span>
                <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-bold uppercase border border-red-200">Gửi lỗi</span>
              </div>
              <p className="text-xs text-[#4c739a] mb-3 font-medium">Visa Interview (Đức) - Nhắc trước 7 ngày</p>
              <div className="flex items-center gap-2 text-[10px] text-red-600 font-bold mb-2">
                <AlertCircle size={14} /> Sai số điện thoại Zalo
              </div>
              <button className="w-full py-1.5 bg-white border border-red-200 text-red-600 rounded text-xs font-bold hover:bg-red-50 transition-colors">
                Thử lại qua Email
              </button>
            </div>

            {/* Notification Item 4 (Completed) */}
            <div className="p-4 rounded-xl border border-[#e7edf3] hover:bg-slate-50 transition-colors opacity-70">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-bold text-[#0d141b]">Phạm Hương</span>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold uppercase">Hoàn thành</span>
              </div>
              <p className="text-xs text-[#4c739a] mb-2">Visa Interview (Đức) - Xác nhận cuối</p>
              <div className="text-[11px] text-slate-400 italic">01/09/2024</div>
            </div>

          </div>

          {/* Quick Schedule Form */}
          <div className="p-5 bg-slate-50 border-t border-[#e7edf3]">
            <h4 className="text-xs font-bold text-[#4c739a] uppercase mb-4 tracking-widest flex items-center gap-2">
              <Clock size={14} /> Lên lịch nhanh (Auto-fill)
            </h4>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Học viên</label>
                <select className="w-full text-xs rounded-lg border border-[#e7edf3] bg-white py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-[#0d141b]">
                  <option>Chọn từ Pipeline...</option>
                  <option>Nguyễn Thùy Linh (+84 987...)</option>
                  <option>Trần Văn Minh (+84 912...)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Ngày</label>
                  <input className="w-full text-xs rounded-lg border border-[#e7edf3] py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500" type="date" />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Giờ</label>
                  <input className="w-full text-xs rounded-lg border border-[#e7edf3] py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500" type="time" defaultValue="09:00"/>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Địa điểm</label>
                <input className="w-full text-xs rounded-lg border border-[#e7edf3] py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Đại sứ quán / Link Online" type="text"/>
              </div>
              <button className="w-full bg-white border border-[#0d47a1] text-[#0d47a1] text-xs font-bold py-2.5 rounded-lg mt-2 hover:bg-blue-50 transition-colors shadow-sm">
                Soạn Thông báo
              </button>
            </div>
          </div>

        </aside>
      </div>
    </div>
  );
};

export default StudyAbroadInterviews;
