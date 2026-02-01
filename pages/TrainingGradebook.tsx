
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Settings, 
  Download, 
  Filter, 
  ArrowUpDown, 
  MoreHorizontal, 
  ChevronRight,
  TrendingUp,
  Search
} from 'lucide-react';

const TrainingGradebook: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Mock Data
  const STUDENTS = [
    { id: 'HV001', name: 'Nguyễn Văn Nam', initials: 'NN', midTerm: 8.8, final: 9.2, avg: 9.0, grade: 'A', color: 'bg-green-100 text-green-800' },
    { id: 'HV002', name: 'Trần Thị Bích', initials: 'TB', midTerm: 7.5, final: 8.0, avg: 7.8, grade: 'B', color: 'bg-blue-100 text-blue-800' },
    { id: 'HV003', name: 'Lê Văn Cường', initials: 'LC', midTerm: 6.2, final: 6.8, avg: 6.5, grade: 'C', color: 'bg-yellow-100 text-yellow-800' },
    { id: 'HV004', name: 'Phạm Hương', initials: 'PH', midTerm: 9.5, final: 9.4, avg: 9.4, grade: 'A+', color: 'bg-emerald-100 text-emerald-800' },
    { id: 'HV005', name: 'Hoàng Văn Em', initials: 'HE', midTerm: 8.2, final: 8.5, avg: 8.3, grade: 'B+', color: 'bg-blue-100 text-blue-800' },
  ];

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#0d141b] font-sans overflow-y-auto">
      
      {/* Header */}
      <div className="px-6 py-5 bg-white border-b border-[#e7edf3] flex items-center gap-4">
         <button 
            onClick={() => navigate('/training/classes')}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
         >
            <ArrowLeft size={24} className="text-slate-600" />
         </button>
         <div>
            <h1 className="text-2xl font-bold text-[#0d141b]">Sổ điểm & Đánh giá</h1>
            <div className="flex items-center gap-2 text-sm text-[#4c739a] mt-1">
               <span>Lớp Tiếng Đức A1</span>
               <ChevronRight size={14} />
               <span className="font-mono">{id || 'DE-A1-K24'}</span>
            </div>
         </div>
      </div>

      <div className="flex flex-col p-6 lg:px-10 max-w-[1600px] mx-auto w-full">
        
        {/* Actions Bar */}
        <div className="flex flex-wrap items-end justify-between gap-4 pb-6">
          <div className="flex flex-col gap-2">
             <h2 className="text-[#0d141b] text-3xl font-bold leading-tight">Bảng điểm Tổng hợp</h2>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center justify-center gap-2 rounded-lg h-10 px-4 bg-white border border-[#e7edf3] text-[#0d141b] text-sm font-bold hover:bg-slate-50 transition-colors shadow-sm">
              <Settings size={18} />
              <span>Tỷ trọng điểm</span>
            </button>
            <button className="flex items-center justify-center gap-2 rounded-lg h-10 px-4 bg-[#2563eb] text-white text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm">
              <Download size={18} />
              <span>Xuất Excel</span>
            </button>
          </div>
        </div>

        {/* Filters & View Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6">
          <div className="flex items-center p-1 bg-[#e7edf3] rounded-lg">
            <button className="px-4 py-1.5 text-sm font-medium rounded-md bg-white text-[#0d141b] shadow-sm">Tổng quan Lớp</button>
            <button className="px-4 py-1.5 text-sm font-medium text-[#4c739a] hover:text-[#0d141b]">Xem Cá nhân</button>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-[#4c739a] cursor-pointer hover:text-[#0d141b]">
              <Filter size={18} />
              <span>Lọc: Tất cả</span>
            </div>
            <div className="h-4 w-[1px] bg-[#cfdbe7]"></div>
            <div className="flex items-center gap-2 text-sm text-[#4c739a] cursor-pointer hover:text-[#0d141b]">
              <ArrowUpDown size={18} />
              <span>Sắp xếp: Tên (A-Z)</span>
            </div>
          </div>
        </div>

        {/* Gradebook Table */}
        <div className="flex flex-col bg-white rounded-xl border border-[#cfdbe7] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-[#cfdbe7]">
                  <th className="px-6 py-4 text-sm font-bold text-[#0d141b] uppercase tracking-wider w-[30%]">Họ và Tên</th>
                  <th className="px-6 py-4 text-sm font-bold text-[#0d141b] uppercase tracking-wider">Giữa kỳ (40%)</th>
                  <th className="px-6 py-4 text-sm font-bold text-[#0d141b] uppercase tracking-wider">Cuối kỳ (60%)</th>
                  <th className="px-6 py-4 text-sm font-bold text-[#0d141b] uppercase tracking-wider">Trung bình</th>
                  <th className="px-6 py-4 text-sm font-bold text-[#0d141b] uppercase tracking-wider">Xếp loại</th>
                  <th className="px-6 py-4 text-sm font-bold text-[#0d141b] uppercase tracking-wider text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#cfdbe7]">
                {STUDENTS.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-[#e7edf3] flex items-center justify-center text-[#0d141b] font-bold text-xs">
                          {student.initials}
                        </div>
                        <div>
                           <p className="text-[#0d141b] font-medium">{student.name}</p>
                           <p className="text-[10px] text-[#4c739a] font-mono">{student.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[#4c739a]">{student.midTerm} / 10</td>
                    <td className="px-6 py-4 text-[#4c739a]">{student.final} / 10</td>
                    <td className="px-6 py-4 font-bold text-[#0d141b]">{student.avg}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${student.color}`}>
                        {student.grade}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-[#4c739a] hover:text-[#0d141b] p-1 rounded-full hover:bg-slate-200 transition-colors">
                        <MoreHorizontal size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="px-6 py-4 border-t border-[#cfdbe7] flex items-center justify-between bg-slate-50/50">
            <p className="text-sm text-[#4c739a]">Hiển thị 1-5 trên 12 học viên</p>
            <div className="flex gap-2">
              <button className="px-3 py-1 border border-[#cfdbe7] rounded text-sm text-[#4c739a] bg-white hover:bg-slate-50">Trước</button>
              <button className="px-3 py-1 border border-[#cfdbe7] rounded text-sm text-[#4c739a] bg-white hover:bg-slate-50">Sau</button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-white p-6 rounded-xl border border-[#cfdbe7] shadow-sm">
            <p className="text-sm text-[#4c739a] mb-1 font-medium">Điểm Trung bình Lớp</p>
            <p className="text-2xl font-bold text-[#0d141b]">8.2</p>
            <div className="mt-2 flex items-center gap-1 text-green-600 text-xs font-medium bg-green-50 w-fit px-2 py-1 rounded">
              <TrendingUp size={14} />
              <span>+0.5 so với giữa kỳ</span>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl border border-[#cfdbe7] shadow-sm">
            <p className="text-sm text-[#4c739a] mb-1 font-medium">Điểm Cao nhất</p>
            <p className="text-2xl font-bold text-[#0d141b]">9.4 (A+)</p>
            <p className="mt-2 text-xs text-[#4c739a]">3 Học viên đạt loại Giỏi (A range)</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl border border-[#cfdbe7] shadow-sm">
            <p className="text-sm text-[#4c739a] mb-1 font-medium">Tiến độ Chấm điểm</p>
            <p className="text-2xl font-bold text-[#0d141b]">2 / 3</p>
            <div className="mt-3 w-full bg-[#e7edf3] rounded-full h-1.5">
              <div className="bg-[#2563eb] h-1.5 rounded-full" style={{ width: '66%' }}></div>
            </div>
            <p className="mt-2 text-xs text-[#4c739a] text-right">66% hoàn thành</p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TrainingGradebook;
