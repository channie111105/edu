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
   Info,
   Home
} from 'lucide-react';
import { getTeachers, getTrainingClasses } from '../utils/storage';
import { useOrgBranches, useSystemCatalogOptions, useSystemConfigVersion } from '../hooks/useSystemCatalog';

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
   useSystemConfigVersion();
   const branches = useOrgBranches();
   const classroomCatalog = useSystemCatalogOptions('classrooms');
   const targetCountryOptions = useSystemCatalogOptions('targetCountries');
   const levelOptions = useSystemCatalogOptions('levels');
   // Lay danh sach phong / giao vien tu storage thuc.
   const allClasses = useMemo(() => getTrainingClasses(), []);
   const teacherOptions = useMemo(
      () => getTeachers().map((t) => t.fullName).filter(Boolean),
      [],
   );
   const roomOptionsFromData = useMemo(
      () => Array.from(new Set(allClasses.map((c) => c.room).filter(Boolean))),
      [allClasses],
   );
   const roomOptions = useMemo(() => {
      const fromAdmin = classroomCatalog.map((opt) => opt.label);
      return Array.from(new Set([...fromAdmin, ...roomOptionsFromData]));
   }, [classroomCatalog, roomOptionsFromData]);

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
      room: 'ALL',
      language: 'ALL',
      level: 'ALL',
      teacher: 'ALL',
   });

   // Mock đã loại bỏ — lịch học sẽ load từ storage khi có.
   const INITIAL_SCHEDULE: ScheduleItem[] = [];

   // --- LOGIC ---

   // 1. Filter Data
   const filteredItems = useMemo(() => {
      return INITIAL_SCHEDULE.filter(item => {
         if (item.type !== viewMode) return false;
         if (filters.branch !== 'ALL' && item.branch !== filters.branch) return false;
         if (filters.room !== 'ALL' && item.room !== filters.room) return false;
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
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 flex-nowrap">

                  {/* Branch Filter */}
                  <div className="relative group shrink-0">
                     <MapPin className="absolute left-3 top-2.5 text-slate-400" size={16} />
                     <select
                        className="pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 hover:border-slate-300"
                        value={filters.branch}
                        onChange={(e) => setFilters({ ...filters, branch: e.target.value })}
                     >
                        <option value="ALL">Tất cả Cơ sở</option>
                        {branches.map((b) => (
                           <option key={b.id} value={b.name}>{b.name}</option>
                        ))}
                     </select>
                  </div>

                  {/* Room Filter */}
                  <div className="relative group flex-1">
                     <Home className="absolute left-3 top-2.5 text-slate-400" size={16} />
                     <select
                        className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 hover:border-slate-300"
                        value={filters.room}
                        onChange={(e) => setFilters({ ...filters, room: e.target.value })}
                     >
                        <option value="ALL">Tất cả Phòng học</option>
                        {roomOptions.map((room) => (
                           <option key={room} value={room}>{room}</option>
                        ))}
                     </select>
                  </div>

                  {/* Language Filter */}
                  <div className="relative group flex-1">
                     <Globe className="absolute left-3 top-2.5 text-slate-400" size={16} />
                     <select
                        className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 hover:border-slate-300"
                        value={filters.language}
                        onChange={(e) => setFilters({ ...filters, language: e.target.value })}
                     >
                        <option value="ALL">Tất cả Ngôn ngữ</option>
                        {targetCountryOptions.map((opt) => (
                           <option key={opt.value} value={opt.label}>{opt.label}</option>
                        ))}
                     </select>
                  </div>

                  {/* Level Filter */}
                  <div className="relative group flex-1">
                     <BookOpen className="absolute left-3 top-2.5 text-slate-400" size={16} />
                     <select
                        className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 hover:border-slate-300"
                        value={filters.level}
                        onChange={(e) => setFilters({ ...filters, level: e.target.value })}
                     >
                        <option value="ALL">Tất cả Trình độ</option>
                        {levelOptions.map((opt) => (
                           <option key={opt.value} value={opt.label}>{opt.label}</option>
                        ))}
                     </select>
                  </div>

                  {/* Teacher Filter */}
                  <div className="relative group flex-1">
                     <User className="absolute left-3 top-2.5 text-slate-400" size={16} />
                     <select
                        className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 hover:border-slate-300"
                        value={filters.teacher}
                        onChange={(e) => setFilters({ ...filters, teacher: e.target.value })}
                     >
                        <option value="ALL">Tất cả Giáo viên</option>
                        {teacherOptions.map((name) => (
                           <option key={name} value={name}>{name}</option>
                        ))}
                     </select>
                  </div>

                  {/* Navigation Controls */}
                  <div className="flex items-center gap-2 border-l border-slate-200 pl-3 shrink-0">
                     <button className="p-1.5 hover:bg-slate-100 rounded-md text-slate-500 transition-colors"><ChevronLeft size={18} /></button>
                     <span className="font-bold text-slate-700 text-[13px] whitespace-nowrap min-w-[140px] text-center">{currentWeek}</span>
                     <button className="p-1.5 hover:bg-slate-100 rounded-md text-slate-500 transition-colors"><ChevronRight size={18} /></button>
                     <button className="bg-slate-800 text-white px-2.5 py-1.5 rounded-lg text-[11px] font-bold hover:bg-slate-700 transition-colors">Hôm nay</button>
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
