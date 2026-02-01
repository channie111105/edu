
import React, { useState } from 'react';
import { 
  Search, 
  Plus, 
  Library, 
  MoreHorizontal, 
  Clock, 
  BookOpen, 
  DollarSign,
  Tag
} from 'lucide-react';

// Mock Course Data
const COURSES = [
  { id: 'C01', code: 'DE-A1', name: 'Tiếng Đức Trình độ A1', type: 'Offline', duration: '40 Buổi (3 tháng)', price: 8000000, activeClasses: 3 },
  { id: 'C02', code: 'DE-A2', name: 'Tiếng Đức Trình độ A2', type: 'Offline', duration: '40 Buổi (3 tháng)', price: 9000000, activeClasses: 2 },
  { id: 'C03', code: 'CN-HSK1', name: 'Tiếng Trung HSK1', type: 'Online', duration: '24 Buổi (2 tháng)', price: 4000000, activeClasses: 1 },
  { id: 'C04', code: 'DE-B1-INTENSIVE', name: 'Luyện thi B1 Cấp tốc', type: 'Hybrid', duration: '60 Buổi (4 tháng)', price: 15000000, activeClasses: 1 },
];

const TrainingCourses: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#111418] font-sans overflow-y-auto">
      <div className="flex flex-col flex-1 p-6 lg:p-10 max-w-[1600px] mx-auto w-full">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
               <Library className="text-blue-600" /> Danh mục Khóa học (Catalog)
            </h1>
            <p className="text-slate-500 mt-1">Quản lý các sản phẩm đào tạo gốc, giá niêm yết và chương trình khung.</p>
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-colors">
            <Plus size={20} /> Tạo Khóa học mới
          </button>
        </div>

        {/* Search & Filter */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex gap-4">
           <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                 type="text" 
                 placeholder="Tìm kiếm khóa học..." 
                 className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>
           <select className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium bg-slate-50 outline-none cursor-pointer">
              <option>Tất cả hình thức</option>
              <option>Offline</option>
              <option>Online</option>
              <option>Hybrid</option>
           </select>
        </div>

        {/* Course Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
           {COURSES.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())).map((course) => (
              <div key={course.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
                 <div className="p-6 flex-1">
                    <div className="flex justify-between items-start mb-4">
                       <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-1 rounded border border-blue-100">{course.code}</span>
                       <button className="text-slate-400 hover:text-slate-600"><MoreHorizontal size={20} /></button>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{course.name}</h3>
                    <div className="space-y-2 mt-4">
                       <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Clock size={16} className="text-slate-400" />
                          <span>Thời lượng: {course.duration}</span>
                       </div>
                       <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Tag size={16} className="text-slate-400" />
                          <span>Hình thức: {course.type}</span>
                       </div>
                       <div className="flex items-center gap-2 text-sm text-slate-600">
                          <DollarSign size={16} className="text-slate-400" />
                          <span>Học phí: <strong>{course.price.toLocaleString()} đ</strong></span>
                       </div>
                    </div>
                 </div>
                 <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-between items-center">
                    <div className="flex items-center gap-1 text-xs font-bold text-slate-600">
                       <BookOpen size={14} /> {course.activeClasses} Lớp đang mở
                    </div>
                    <button className="text-blue-600 text-sm font-bold hover:underline">Chi tiết</button>
                 </div>
              </div>
           ))}
        </div>

      </div>
    </div>
  );
};

export default TrainingCourses;
