
import React from 'react';
import {
   Search,
   Filter,
   MoreHorizontal,
   AlertTriangle,
   CheckCircle2,
   BookOpen,
   User,
   Download,
   Smartphone
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const STUDENTS = [
   { id: 'HV001', name: 'Nguyễn Văn Nam', class: 'DE-A1-K24', attendance: 95, midTerm: 8.5, status: 'Active', avatar: 'N', format: 'Offline' },
   { id: 'HV002', name: 'Trần Thị Bích', class: 'DE-A1-K24', attendance: 80, midTerm: 7.0, status: 'Active', avatar: 'T', format: 'Online' },
   { id: 'HV003', name: 'Lê Văn Cường', class: 'DE-A1-K24', attendance: 65, midTerm: 4.5, status: 'Risk', avatar: 'L', format: 'App' },
   { id: 'HV004', name: 'Phạm Hương', class: 'DE-A2-K10', attendance: 100, midTerm: 9.0, status: 'Active', avatar: 'P', format: 'Offline' },
   { id: 'HV005', name: 'Hoàng Văn Em', class: 'DE-A2-K10', attendance: 40, midTerm: null, status: 'Dropout', avatar: 'H', format: 'Online' },
];

const TrainingStudentList: React.FC = () => {
   const navigate = useNavigate();

   return (
      <div className="flex flex-col h-full bg-[#f8fafc] text-[#111418] font-sans overflow-hidden">
         <div className="flex flex-col flex-1 overflow-y-auto p-6 lg:p-8 max-w-[1200px] mx-auto w-full">

            {/* Header */}
            <div className="flex flex-wrap justify-between items-end gap-3 mb-6">
               <div className="flex min-w-72 flex-col gap-1">
                  <h1 className="text-[#111418] text-[32px] font-bold leading-tight tracking-[-0.015em]">Hồ sơ Học vụ</h1>
                  <p className="text-[#4c739a] text-sm font-normal leading-normal">Theo dõi điểm số, chuyên cần và tiến độ học tập chi tiết.</p>
               </div>
               <div className="flex gap-2">
                  <button className="flex items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-[#e7edf3] text-[#111418] text-sm font-bold leading-normal hover:bg-slate-200 transition-colors">
                     <Download size={16} className="mr-2" /> Xuất bảng điểm
                  </button>
               </div>
            </div>

            {/* Search & Filters */}
            <div className="px-4 py-3 mb-4 bg-white border border-[#cfdbe7] rounded-xl shadow-sm flex flex-wrap gap-4 items-center">
               <label className="flex flex-col min-w-40 h-10 flex-1">
                  <div className="flex w-full flex-1 items-stretch rounded-lg h-full">
                     <div className="text-[#4c739a] flex border-none bg-[#e7edf3] items-center justify-center pl-4 rounded-l-lg border-r-0">
                        <Search size={20} />
                     </div>
                     <input
                        placeholder="Tìm kiếm học viên..."
                        className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#111418] focus:outline-0 focus:ring-0 border-none bg-[#e7edf3] focus:border-none h-full placeholder:text-[#4c739a] px-4 rounded-l-none border-l-0 pl-2 text-sm font-normal leading-normal"
                     />
                  </div>
               </label>
               <div className="flex gap-2">
                  <select className="h-10 px-4 rounded-lg bg-[#e7edf3] text-[#111418] text-sm font-medium border-none focus:ring-0 cursor-pointer outline-none">
                     <option>Lớp: Tất cả</option>
                     <option>DE-A1-K24</option>
                     <option>DE-A2-K10</option>
                  </select>
                  <select className="h-10 px-4 rounded-lg bg-[#e7edf3] text-[#111418] text-sm font-medium border-none focus:ring-0 cursor-pointer outline-none">
                     <option>Trạng thái: Tất cả</option>
                     <option>Đang học</option>
                     <option>Cảnh báo</option>
                     <option>Bảo lưu</option>
                  </select>
               </div>
            </div>

            {/* Table */}
            <div className="flex overflow-hidden rounded-xl border border-[#cfdbe7] bg-white shadow-sm">
               <table className="flex-1 w-full text-left border-collapse">
                  <thead className="bg-[#f8fafc] border-b border-[#cfdbe7]">
                     <tr>
                        <th className="px-6 py-4 text-[#111418] text-sm font-bold leading-normal">Học viên</th>
                        <th className="px-6 py-4 text-[#111418] text-sm font-bold leading-normal">Lớp hiện tại</th>
                        <th className="px-6 py-4 text-[#111418] text-sm font-bold leading-normal text-center">Hình thức</th>
                        <th className="px-6 py-4 text-[#111418] text-sm font-bold leading-normal text-center">Chuyên cần</th>
                        <th className="px-6 py-4 text-[#111418] text-sm font-bold leading-normal text-center">Điểm Giữa kỳ</th>
                        <th className="px-6 py-4 text-[#111418] text-sm font-bold leading-normal">Trạng thái</th>
                        <th className="px-6 py-4 text-[#111418] w-20 text-center">Chi tiết</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-[#cfdbe7]">
                     {STUDENTS.map((stu) => (
                        <tr key={stu.id} className="hover:bg-[#f8fafc] transition-colors cursor-pointer" onClick={() => navigate(`/training/students/${stu.id}/app-progress`)}>
                           <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-full bg-[#e7edf3] text-[#111418] flex items-center justify-center font-bold text-sm">
                                    {stu.avatar}
                                 </div>
                                 <div>
                                    <p className="text-[#111418] text-sm font-bold leading-normal">{stu.name}</p>
                                    <p className="text-[#4c739a] text-xs font-mono">{stu.id}</p>
                                 </div>
                              </div>
                           </td>
                           <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                 <BookOpen size={16} className="text-[#4c739a]" />
                                 <span className="text-[#111418] text-sm font-medium">{stu.class}</span>
                              </div>
                           </td>
                           <td className="px-6 py-4 text-center">
                              <span className={`inline-flex px-2 py-1 rounded text-xs font-bold border ${stu.format === 'Offline' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                    stu.format === 'Online' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                       'bg-orange-50 text-orange-700 border-orange-100'
                                 }`}>
                                 {stu.format}
                              </span>
                           </td>
                           <td className="px-6 py-4 text-center">
                              <span className={`text-sm font-bold ${stu.attendance < 80 ? 'text-red-600' : 'text-green-600'}`}>
                                 {stu.attendance}%
                              </span>
                           </td>
                           <td className="px-6 py-4 text-center">
                              {stu.midTerm !== null ? (
                                 <span className="text-[#111418] text-sm font-bold">{stu.midTerm}</span>
                              ) : (
                                 <span className="text-[#4c739a] text-sm italic">--</span>
                              )}
                           </td>
                           <td className="px-6 py-4">
                              {stu.status === 'Active' && (
                                 <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-bold border border-green-100">
                                    <CheckCircle2 size={12} /> Đang học
                                 </span>
                              )}
                              {stu.status === 'Risk' && (
                                 <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-100">
                                    <AlertTriangle size={12} /> Cảnh báo
                                 </span>
                              )}
                              {stu.status === 'Dropout' && (
                                 <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs font-bold border border-red-100">
                                    <AlertTriangle size={12} /> Đã nghỉ
                                 </span>
                              )}
                           </td>
                           <td className="px-6 py-4 text-center">
                              <button
                                 className="text-[#4c739a] hover:text-blue-600 p-2 rounded-full hover:bg-slate-100"
                                 title="Xem tiến độ App"
                              >
                                 <Smartphone size={20} />
                              </button>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>

         </div>
      </div>
   );
};

export default TrainingStudentList;
