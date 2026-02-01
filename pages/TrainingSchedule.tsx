
import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar, AlertTriangle } from 'lucide-react';

const TrainingSchedule: React.FC = () => {
  const DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
  const SLOTS = [
    { time: '08:00 - 10:00', label: 'Sáng 1' },
    { time: '10:00 - 12:00', label: 'Sáng 2' },
    { time: '13:30 - 15:30', label: 'Chiều 1' },
    { time: '15:30 - 17:30', label: 'Chiều 2' },
    { time: '18:30 - 20:30', label: 'Tối 1' },
  ];

  // Mock Schedule Items with CONFLICT
  const SCHEDULE_ITEMS = [
    { id: '1', day: 0, slot: 0, class: 'A1-K24', room: 'P.101', teacher: 'Cô Lan', color: 'bg-blue-50 border-blue-200 text-blue-800' },
    { id: '2', day: 0, slot: 2, class: 'B1-K08', room: 'P.201', teacher: 'Thầy Hans', color: 'bg-green-50 border-green-200 text-green-800' },
    // Conflict created here: Monday, Slot 0, same room P.101
    { id: '3', day: 0, slot: 0, class: 'CN-HSK1', room: 'P.101', teacher: 'Cô Mai', color: 'bg-red-50 border-red-200 text-red-800' }, 
    
    { id: '4', day: 2, slot: 0, class: 'A1-K24', room: 'P.101', teacher: 'Cô Lan', color: 'bg-blue-50 border-blue-200 text-blue-800' },
    { id: '5', day: 2, slot: 2, class: 'B1-K08', room: 'P.201', teacher: 'Thầy Hans', color: 'bg-green-50 border-green-200 text-green-800' },
    { id: '6', day: 4, slot: 0, class: 'A1-K24', room: 'P.101', teacher: 'Cô Lan', color: 'bg-blue-50 border-blue-200 text-blue-800' },
    { id: '7', day: 4, slot: 2, class: 'B1-K08', room: 'P.201', teacher: 'Thầy Hans', color: 'bg-green-50 border-green-200 text-green-800' },
    
    { id: '8', day: 1, slot: 1, class: 'A2-K10', room: 'P.102', teacher: 'Thầy Đức', color: 'bg-purple-50 border-purple-200 text-purple-800' },
    { id: '9', day: 3, slot: 1, class: 'A2-K10', room: 'P.102', teacher: 'Thầy Đức', color: 'bg-purple-50 border-purple-200 text-purple-800' },
    { id: '10', day: 5, slot: 1, class: 'A2-K10', room: 'P.102', teacher: 'Thầy Đức', color: 'bg-purple-50 border-purple-200 text-purple-800' },
  ];

  // Logic: Check if multiple items exist in the same cell
  const conflicts = useMemo(() => {
      const conflictMap: Record<string, boolean> = {};
      SCHEDULE_ITEMS.forEach((item, index) => {
          // Check overlap with other items
          const hasOverlap = SCHEDULE_ITEMS.some((other, otherIdx) => 
              index !== otherIdx && 
              item.day === other.day && 
              item.slot === other.slot &&
              (item.room === other.room || item.teacher === other.teacher)
          );
          if (hasOverlap) {
              conflictMap[item.id] = true;
          }
      });
      return conflictMap;
  }, []);

  const hasAnyConflict = Object.keys(conflicts).length > 0;

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#111418] font-sans overflow-hidden">
      <div className="flex flex-col flex-1 overflow-y-auto p-6 lg:p-8 max-w-[1400px] mx-auto w-full">
        
        {/* Header */}
        <div className="flex flex-wrap justify-between items-end gap-3 mb-6">
           <div className="flex flex-col gap-1">
              <h1 className="text-[#111418] text-[32px] font-bold leading-tight tracking-[-0.015em]">Thời khóa biểu Tổng hợp</h1>
              <p className="text-[#4c739a] text-sm font-normal leading-normal">Quản lý lịch học và phòng học toàn trung tâm.</p>
           </div>
           <div className="flex items-center gap-4">
              <div className="flex items-center bg-[#e7edf3] rounded-lg p-1">
                 <button className="p-1 hover:bg-white rounded shadow-sm transition-all text-[#4c739a] hover:text-[#111418]"><ChevronLeft size={20} /></button>
                 <span className="px-4 text-sm font-bold text-[#111418]">Tuần 43 (23/10 - 29/10)</span>
                 <button className="p-1 hover:bg-white rounded shadow-sm transition-all text-[#4c739a] hover:text-[#111418]"><ChevronRight size={20} /></button>
              </div>
              <button className="bg-[#1380ec] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm hover:bg-blue-700 transition-colors">
                 <Calendar size={16} /> Hôm nay
              </button>
           </div>
        </div>

        {/* Conflict Warning Banner */}
        {hasAnyConflict && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 animate-pulse">
                <AlertTriangle className="text-red-600" size={24} />
                <div>
                    <h3 className="text-red-800 font-bold text-sm">Phát hiện xung đột lịch học!</h3>
                    <p className="text-red-700 text-xs">Có 2 lớp học đang được xếp cùng phòng hoặc cùng giáo viên trong cùng khung giờ. Vui lòng kiểm tra các ô được đánh dấu đỏ.</p>
                </div>
            </div>
        )}

        {/* Schedule Grid */}
        <div className="bg-white rounded-xl border border-[#cfdbe7] shadow-sm overflow-auto">
           <div className="min-w-[1000px]">
              {/* Header Row */}
              <div className="grid grid-cols-8 border-b border-[#cfdbe7] bg-[#f8fafc]">
                 <div className="p-4 font-bold text-xs uppercase text-[#4c739a] text-center border-r border-[#cfdbe7]">Ca / Ngày</div>
                 {DAYS.map((day, idx) => (
                    <div key={idx} className="p-4 font-bold text-sm text-[#111418] text-center border-r border-[#cfdbe7] last:border-none">
                       {day}
                    </div>
                 ))}
              </div>

              {/* Rows */}
              {SLOTS.map((slot, slotIdx) => (
                 <div key={slotIdx} className="grid grid-cols-8 border-b border-[#cfdbe7] last:border-none min-h-[128px]">
                    {/* Time Column */}
                    <div className="p-4 border-r border-[#cfdbe7] bg-[#f8fafc] flex flex-col justify-center items-center">
                       <span className="font-bold text-[#111418] text-sm">{slot.label}</span>
                       <span className="text-xs text-[#4c739a] mt-1">{slot.time}</span>
                    </div>

                    {/* Day Columns */}
                    {DAYS.map((_, dayIdx) => {
                       const items = SCHEDULE_ITEMS.filter(i => i.day === dayIdx && i.slot === slotIdx);
                       return (
                          <div key={dayIdx} className="border-r border-[#cfdbe7] last:border-none p-2 relative group hover:bg-[#f8fafc] transition-colors flex flex-col gap-2">
                             {items.map(item => (
                                <div 
                                    key={item.id}
                                    className={`w-full rounded-lg border p-2 flex flex-col justify-between shadow-sm cursor-pointer hover:shadow-md transition-all 
                                        ${conflicts[item.id] ? 'bg-red-100 border-red-400 ring-2 ring-red-400' : item.color}
                                    `}
                                >
                                   <div className="flex justify-between items-start">
                                       <div className="font-bold text-sm">{item.class}</div>
                                       {conflicts[item.id] && <AlertTriangle size={14} className="text-red-600" />}
                                   </div>
                                   <div className="text-xs opacity-90 space-y-0.5">
                                      <p className={conflicts[item.id] ? 'font-bold text-red-700' : ''}>{item.room}</p>
                                      <p>{item.teacher}</p>
                                   </div>
                                </div>
                             ))}
                             
                             {items.length === 0 && (
                                <button className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 text-[#4c739a] font-bold text-xs bg-slate-50/50 transition-opacity">
                                   + Xếp lịch
                                </button>
                             )}
                          </div>
                       );
                    })}
                 </div>
              ))}
           </div>
        </div>

      </div>
    </div>
  );
};

export default TrainingSchedule;
