import React, { useMemo, useState } from 'react';
import {
   ChevronLeft,
   ChevronRight,
   Calendar,
   AlertTriangle,
   Filter,
   MapPin,
   Globe,
   BookOpen,
   User,
   Info
} from 'lucide-react';

// Interfaces for Schedule
interface ScheduleItem {
   id: string;
   day: number; // 0 = Mon, 6 = Sun
   slot: number; // 0 = Morning 1, etc.
   classCode: string; // e.g., HSK1-K35
   room: string;
   teacher: string;
   currentStudents: number;
   maxStudents: number;
   type: 'expected' | 'actual'; // Dự kiến vs Thực tế
   branch: 'Hanoi' | 'HCM' | 'Danang';
   language: 'German' | 'Chinese' | 'English' | 'Korean';
   level: 'A1' | 'A2' | 'B1' | 'HSK1' | 'HSK2' | 'IELTS';
   color?: string;
}

const TrainingSchedule: React.FC = () => {
   // --- CONSTANTS ---
   const DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
   const SLOTS = [
      { time: '08:00 - 10:00', label: 'Ca 1 (Sáng)' },
      { time: '10:00 - 12:00', label: 'Ca 2 (Sáng)' },
      { time: '13:30 - 15:30', label: 'Ca 3 (Chiều)' },
      { time: '15:30 - 17:30', label: 'Ca 4 (Chiều)' },
      { time: '18:30 - 20:30', label: 'Ca 5 (Tối)' },
   ];

   // --- STATE ---
   const [viewMode, setViewMode] = useState<'actual' | 'expected'>('actual');
   const [currentWeek, setCurrentWeek] = useState('Tuần 43 (23/10 - 29/10)');
   const [filters, setFilters] = useState({
      branch: 'ALL',
      language: 'ALL',
      level: 'ALL',
      teacher: 'ALL',
   });

   // --- MOCK DATA ---
   const INITIAL_SCHEDULE: ScheduleItem[] = [
      // ACTUAL SCHEDULE (Lịch đang chạy)
      { id: '1', day: 0, slot: 0, classCode: 'GER-A1-K24', room: 'P.101', teacher: 'Cô Lan', currentStudents: 12, maxStudents: 15, type: 'actual', branch: 'Hanoi', language: 'German', level: 'A1', color: 'bg-blue-50 border-blue-200 text-blue-800' },
      { id: '2', day: 0, slot: 2, classCode: 'GER-B1-K08', room: 'P.201', teacher: 'Thầy Hans', currentStudents: 8, maxStudents: 10, type: 'actual', branch: 'Hanoi', language: 'German', level: 'B1', color: 'bg-indigo-50 border-indigo-200 text-indigo-800' },
      // Conflict demo: Same room P.101 at same time
      { id: '3', day: 0, slot: 0, classCode: 'CHN-HSK1-01', room: 'P.101', teacher: 'Cô Mai', currentStudents: 15, maxStudents: 20, type: 'actual', branch: 'Hanoi', language: 'Chinese', level: 'HSK1', color: 'bg-red-50 border-red-200 text-red-800' },

      { id: '4', day: 2, slot: 4, classCode: 'ENG-IELTS-05', room: 'P.302', teacher: 'Mr. David', currentStudents: 10, maxStudents: 12, type: 'actual', branch: 'HCM', language: 'English', level: 'IELTS', color: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
      { id: '5', day: 4, slot: 4, classCode: 'ENG-IELTS-05', room: 'P.302', teacher: 'Mr. David', currentStudents: 10, maxStudents: 12, type: 'actual', branch: 'HCM', language: 'English', level: 'IELTS', color: 'bg-emerald-50 border-emerald-200 text-emerald-800' },

      // EXPECTED SCHEDULE (Lịch dự kiến khai giảng)
      { id: 'e1', day: 1, slot: 4, classCode: 'GER-A1-NEW', room: 'P.102', teacher: 'Dự kiến', currentStudents: 0, maxStudents: 15, type: 'expected', branch: 'Hanoi', language: 'German', level: 'A1', color: 'bg-amber-50 border-amber-200 text-amber-800 border-dashed' },
      { id: 'e2', day: 3, slot: 4, classCode: 'GER-A1-NEW', room: 'P.102', teacher: 'Dự kiến', currentStudents: 0, maxStudents: 15, type: 'expected', branch: 'Hanoi', language: 'German', level: 'A1', color: 'bg-amber-50 border-amber-200 text-amber-800 border-dashed' },
      { id: 'e3', day: 5, slot: 4, classCode: 'GER-A1-NEW', room: 'P.102', teacher: 'Dự kiến', currentStudents: 0, maxStudents: 15, type: 'expected', branch: 'Hanoi', language: 'German', level: 'A1', color: 'bg-amber-50 border-amber-200 text-amber-800 border-dashed' },
   ];

   // --- LOGIC ---

   // 1. Filter Data
   const filteredItems = useMemo(() => {
      return INITIAL_SCHEDULE.filter(item => {
         if (item.type !== viewMode) return false;
         if (filters.branch !== 'ALL' && item.branch !== filters.branch) return false;
         if (filters.language !== 'ALL' && item.language !== filters.language) return false;
         if (filters.level !== 'ALL' && item.level !== filters.level) return false;
         if (filters.teacher !== 'ALL' && item.teacher !== filters.teacher) return false;
         return true;
      });
   }, [viewMode, filters]);

   // 2. Conflict Detection (Only for Actual Schedule)
   const conflicts = useMemo(() => {
      const conflictMap: Record<string, boolean> = {};
      if (viewMode === 'expected') return conflictMap;

      filteredItems.forEach((item, index) => {
         const hasOverlap = filteredItems.some((other, otherIdx) =>
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
   }, [filteredItems, viewMode]);

   const hasAnyConflict = Object.keys(conflicts).length > 0;

   return (
      <div className="flex flex-col h-full bg-[#f8fafc] text-[#111418] font-sans overflow-hidden">
         <div className="flex flex-col flex-1 overflow-y-auto p-6 lg:p-8 max-w-[1600px] mx-auto w-full">

            {/* --- HEADER SECTION --- */}
            <div className="flex flex-col gap-6 mb-6">

               {/* Top Bar: Title & View Mode Switch */}
               <div className="flex justify-between items-start">
                  <div className="space-y-1">
                     <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Lịch Biểu Đào Tạo</h1>
                     <p className="text-slate-500 font-medium">Quản lý lịch dạy thực tế và kế hoạch khai giảng.</p>
                  </div>

                  {/* View Mode Toggle */}
                  <div className="bg-white p-1 rounded-lg border border-slate-200 shadow-sm flex items-center gap-1">
                     <button
                        onClick={() => setViewMode('actual')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'actual' ? 'bg-[#1380ec] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
                     >
                        Lịch Dạy (Actual)
                     </button>
                     <button
                        onClick={() => setViewMode('expected')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'expected' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
                     >
                        Dự Kiến (Expected)
                     </button>
                  </div>
               </div>

               {/* --- FILTER BAR --- */}
               <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center">
                  <div className="flex items-center gap-2 text-slate-500 font-bold text-sm mr-2">
                     <Filter size={18} /> Bộ lọc:
                  </div>

                  {/* Branch Filter */}
                  <div className="relative group">
                     <MapPin className="absolute left-3 top-2.5 text-slate-400" size={16} />
                     <select
                        className="pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 hover:border-slate-300"
                        value={filters.branch}
                        onChange={(e) => setFilters({ ...filters, branch: e.target.value })}
                     >
                        <option value="ALL">Tất cả Cơ sở</option>
                        <option value="Hanoi">Hà Nội</option>
                        <option value="HCM">Hồ Chí Minh</option>
                        <option value="Danang">Đà Nẵng</option>
                     </select>
                  </div>

                  {/* Language Filter */}
                  <div className="relative">
                     <Globe className="absolute left-3 top-2.5 text-slate-400" size={16} />
                     <select
                        className="pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 hover:border-slate-300"
                        value={filters.language}
                        onChange={(e) => setFilters({ ...filters, language: e.target.value })}
                     >
                        <option value="ALL">Tất cả Ngôn ngữ</option>
                        <option value="German">Tiếng Đức</option>
                        <option value="Chinese">Tiếng Trung</option>
                        <option value="English">Tiếng Anh</option>
                        <option value="Korean">Tiếng Hàn</option>
                     </select>
                  </div>

                  {/* Level Filter */}
                  <div className="relative">
                     <BookOpen className="absolute left-3 top-2.5 text-slate-400" size={16} />
                     <select
                        className="pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 hover:border-slate-300"
                        value={filters.level}
                        onChange={(e) => setFilters({ ...filters, level: e.target.value })}
                     >
                        <option value="ALL">Tất cả Trình độ</option>
                        <option value="A1">A1</option>
                        <option value="A2">A2</option>
                        <option value="B1">B1</option>
                        <option value="HSK1">HSK 1</option>
                        <option value="IELTS">IELTS</option>
                     </select>
                  </div>

                  {/* Teacher Filter */}
                  <div className="relative">
                     <User className="absolute left-3 top-2.5 text-slate-400" size={16} />
                     <select
                        className="pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 hover:border-slate-300"
                        value={filters.teacher}
                        onChange={(e) => setFilters({ ...filters, teacher: e.target.value })}
                     >
                        <option value="ALL">Tất cả Giáo viên</option>
                        <option value="Cô Lan">Cô Lan</option>
                        <option value="Thầy Hans">Thầy Hans</option>
                        <option value="Cô Mai">Cô Mai</option>
                        <option value="Mr. David">Mr. David</option>
                     </select>
                  </div>

                  {/* Navigation Controls */}
                  <div className="ml-auto flex items-center gap-3 border-l border-slate-200 pl-4">
                     <button className="p-1.5 hover:bg-slate-100 rounded-md text-slate-500 transition-colors"><ChevronLeft size={20} /></button>
                     <span className="font-bold text-slate-700 text-sm whitespace-nowrap min-w-[150px] text-center">{currentWeek}</span>
                     <button className="p-1.5 hover:bg-slate-100 rounded-md text-slate-500 transition-colors"><ChevronRight size={20} /></button>
                     <button className="bg-slate-800 text-white px-3 py-1.5 rounded-md text-xs font-bold hover:bg-slate-700 transition-colors">Hôm nay</button>
                  </div>
               </div>
            </div>

            {/* --- CONFLICT WARNING --- */}
            {hasAnyConflict && (
               <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-4 animate-in slide-in-from-top-2">
                  <div className="p-2 bg-rose-100 text-rose-600 rounded-full">
                     <AlertTriangle size={20} />
                  </div>
                  <div>
                     <h3 className="text-rose-800 font-bold text-sm mb-1">Cảnh báo: Xung đột lịch học</h3>
                     <p className="text-rose-700 text-sm">Hệ thống phát hiện trùng Lớp/Phòng/Giáo viên tại các ô được đánh dấu đỏ. Vui lòng kiểm tra và điều chỉnh.</p>
                  </div>
               </div>
            )}

            {/* --- SCHEDULE GRID (MATRIX) --- */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1 min-h-[600px]">
               <div className="overflow-x-auto h-full">
                  <div className="min-w-[1200px] h-full flex flex-col">

                     {/* Header Row (Days) */}
                     <div className="grid grid-cols-[100px_repeat(7,1fr)] border-b border-slate-200 bg-slate-50 sticky top-0 z-10">
                        <div className="p-4 font-bold text-xs uppercase text-slate-500 text-center border-r border-slate-200 flex items-center justify-center">
                           Ca / Ngày
                        </div>
                        {DAYS.map((day, idx) => (
                           <div key={idx} className="p-3 text-center border-r border-slate-200 last:border-none">
                              <div className="font-extrabold text-slate-800 text-sm uppercase">{day}</div>
                              {/* Mock Date for demo */}
                              <div className="text-xs text-slate-400 font-medium mt-1">
                                 {23 + idx}/10
                              </div>
                           </div>
                        ))}
                     </div>

                     {/* Slots Rows */}
                     {SLOTS.map((slot, slotIdx) => (
                        <div key={slotIdx} className="grid grid-cols-[100px_repeat(7,1fr)] border-b border-slate-200 last:border-none flex-1 min-h-[140px]">
                           {/* Time Column (Axis Y) */}
                           <div className="p-4 border-r border-slate-200 bg-slate-50 flex flex-col justify-center items-center text-center">
                              <span className="font-bold text-slate-800 text-xs mb-1">{slot.label}</span>
                              <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-mono">{slot.time}</span>
                           </div>

                           {/* Day Columns (Cells) */}
                           {DAYS.map((_, dayIdx) => {
                              const items = filteredItems.filter(i => i.day === dayIdx && i.slot === slotIdx);
                              return (
                                 <div key={dayIdx} className="border-r border-slate-200 last:border-none p-2 relative group hover:bg-slate-50/80 transition-colors flex flex-col gap-2">
                                    {items.map(item => (
                                       <div
                                          key={item.id}
                                          className={`
                                        w-full rounded-lg border p-2.5 flex flex-col justify-between shadow-sm cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all
                                        ${conflicts[item.id] ? 'bg-rose-50 border-rose-300 ring-1 ring-rose-300' : item.color}
                                      `}
                                       >
                                          <div className="flex justify-between items-start mb-1">
                                             <span className={`font-bold text-xs px-1.5 rounded ${conflicts[item.id] ? 'bg-rose-200 text-rose-800' : 'bg-white/50'}`}>
                                                {item.classCode}
                                             </span>
                                             {item.type === 'expected' && <Info size={14} className="text-amber-600" />}
                                             {conflicts[item.id] && <AlertTriangle size={14} className="text-rose-600 animate-pulse" />}
                                          </div>

                                          <div className="space-y-1 mt-1">
                                             <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                                                <MapPin size={12} className={conflicts[item.id] ? 'text-rose-500' : 'text-slate-400'} />
                                                {item.room}
                                             </div>
                                             <div className="flex items-center gap-1.5 text-xs text-slate-700">
                                                <User size={12} className={conflicts[item.id] ? 'text-rose-500' : 'text-slate-400'} />
                                                {item.teacher}
                                             </div>
                                          </div>

                                          {/* Footer: Students */}
                                          {item.type === 'actual' && (
                                             <div className="mt-2 pt-2 border-t border-black/5 flex justify-between items-center text-[10px]">
                                                <span className="text-slate-500 font-medium">Sĩ số:</span>
                                                <span className="font-bold">
                                                   {item.currentStudents}/{item.maxStudents}
                                                </span>
                                             </div>
                                          )}
                                          {item.type === 'expected' && (
                                             <div className="mt-2 pt-2 border-t border-black/5 flex justify-center text-[10px] text-amber-700 italic font-medium">
                                                Dự kiến khai giảng
                                             </div>
                                          )}
                                       </div>
                                    ))}

                                    {/* Add Button Placeholder (Hidden by default, shown on hover) */}
                                    <button className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto">
                                       <div className="bg-blue-600 text-white p-1.5 rounded-full shadow-lg hover:scale-110 transition-transform">
                                          <div className="w-4 h-4 flex items-center justify-center font-bold text-sm">+</div>
                                       </div>
                                    </button>
                                 </div>
                              );
                           })}
                        </div>
                     ))}
                  </div>
               </div>
            </div>

         </div>
      </div>
   );
};

export default TrainingSchedule;
