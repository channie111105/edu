
import React, { useState } from 'react';
import { 
  ListPlus, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  UserPlus, 
  ArrowRight,
  AlertCircle
} from 'lucide-react';

const WAITLIST = [
  { id: 'WL01', name: 'Nguyễn Thị Hương', course: 'Tiếng Đức A1', paidStatus: 'Paid', amount: '8.000.000', date: '24/10/2023', note: 'Muốn học tối 2-4-6' },
  { id: 'WL02', name: 'Trần Văn Hùng', course: 'Tiếng Đức A1', paidStatus: 'Partial', amount: '3.000.000', date: '23/10/2023', note: 'Đặt cọc, chờ xếp lớp tháng 11' },
  { id: 'WL03', name: 'Lê Thu Thảo', course: 'Tiếng Trung HSK1', paidStatus: 'Paid', amount: '4.500.000', date: '22/10/2023', note: 'Học online cuối tuần' },
  { id: 'WL04', name: 'Phạm Minh Đức', course: 'Tiếng Đức B1', paidStatus: 'Paid', amount: '15.000.000', date: '20/10/2023', note: 'Cần lớp cấp tốc' },
];

const AVAILABLE_CLASSES = [
  { id: 'C1', name: 'A1-K25 (Tối 2-4-6)', slots: 5, start: '01/11/2023' },
  { id: 'C2', name: 'A1-K26 (Sáng 3-5-7)', slots: 12, start: '15/11/2023' },
];

const TrainingEnrollment: React.FC = () => {
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const handleAssignClick = (id: string) => {
    setSelectedStudent(id);
    setShowAssignModal(true);
  };

  const handleConfirmAssign = () => {
    alert("Đã xếp học viên vào lớp thành công!");
    setShowAssignModal(false);
    setSelectedStudent(null);
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#111418] font-sans overflow-y-auto">
      <div className="flex flex-col flex-1 p-6 lg:p-10 max-w-[1600px] mx-auto w-full">
        
        {/* Header */}
        <div className="mb-8">
           <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <ListPlus className="text-blue-600" /> Xếp lớp & Ghi danh (Waitlist)
           </h1>
           <p className="text-slate-500 mt-1">Danh sách học viên đã đóng phí chờ xếp vào lớp học chính thức.</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
           <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                 <p className="text-xs text-slate-500 font-bold uppercase">Chờ xếp lớp</p>
                 <p className="text-2xl font-black text-slate-900">12</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-full text-blue-600"><Clock size={24} /></div>
           </div>
           <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                 <p className="text-xs text-slate-500 font-bold uppercase">Ưu tiên (Đã đóng đủ)</p>
                 <p className="text-2xl font-black text-green-600">8</p>
              </div>
              <div className="bg-green-50 p-3 rounded-full text-green-600"><CheckCircle2 size={24} /></div>
           </div>
           <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                 <p className="text-xs text-slate-500 font-bold uppercase">Lớp sắp khai giảng</p>
                 <p className="text-2xl font-black text-purple-600">3</p>
              </div>
              <div className="bg-purple-50 p-3 rounded-full text-purple-600"><UserPlus size={24} /></div>
           </div>
        </div>

        {/* Waitlist Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
           <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div className="flex gap-2">
                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Tìm tên, SĐT..." />
                 </div>
                 <button className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-100 flex items-center gap-2">
                    <Filter size={16} /> Lọc
                 </button>
              </div>
           </div>
           
           <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase">
                 <tr>
                    <th className="px-6 py-4">Học viên</th>
                    <th className="px-6 py-4">Nhu cầu học</th>
                    <th className="px-6 py-4">Trạng thái phí</th>
                    <th className="px-6 py-4">Ngày đăng ký</th>
                    <th className="px-6 py-4">Ghi chú nguyện vọng</th>
                    <th className="px-6 py-4 text-right">Hành động</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                 {WAITLIST.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                       <td className="px-6 py-4 font-bold text-slate-900">{student.name}</td>
                       <td className="px-6 py-4 text-blue-600 font-medium">{student.course}</td>
                       <td className="px-6 py-4">
                          {student.paidStatus === 'Paid' ? (
                             <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                                <CheckCircle2 size={12} /> Đã đóng đủ
                             </span>
                          ) : (
                             <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
                                <Clock size={12} /> Đặt cọc
                             </span>
                          )}
                          <div className="text-xs text-slate-400 mt-1 pl-1">
                             {student.amount}
                          </div>
                       </td>
                       <td className="px-6 py-4 text-slate-600">{student.date}</td>
                       <td className="px-6 py-4 text-slate-600 italic max-w-xs truncate">{student.note}</td>
                       <td className="px-6 py-4 text-right">
                          <button 
                             onClick={() => handleAssignClick(student.id)}
                             className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm inline-flex items-center gap-1"
                          >
                             Xếp lớp <ArrowRight size={12} />
                          </button>
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>

      </div>

      {/* Modal Xếp lớp */}
      {showAssignModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAssignModal(false)}></div>
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
               <div className="p-5 border-b border-slate-200 bg-slate-50">
                  <h3 className="font-bold text-lg text-slate-900">Xếp lớp cho học viên</h3>
                  <p className="text-sm text-slate-500">Chọn lớp phù hợp với trình độ và lịch học.</p>
               </div>
               <div className="p-5 space-y-3">
                  <div className="p-3 bg-blue-50 text-blue-800 rounded-lg text-sm border border-blue-100 flex items-start gap-2">
                     <AlertCircle size={16} className="mt-0.5 shrink-0" />
                     <p>Học viên <span className="font-bold">{WAITLIST.find(s => s.id === selectedStudent)?.name}</span> đang chờ xếp lớp <strong>Tiếng Đức A1</strong>.</p>
                  </div>
                  
                  <label className="block text-sm font-bold text-slate-700 mt-4 mb-2">Lớp đang mở đăng ký:</label>
                  <div className="space-y-2">
                     {AVAILABLE_CLASSES.map(cls => (
                        <div key={cls.id} className="border border-slate-200 rounded-lg p-3 hover:border-blue-500 hover:bg-blue-50 cursor-pointer flex justify-between items-center transition-all group">
                           <div>
                              <p className="font-bold text-slate-900 text-sm group-hover:text-blue-700">{cls.name}</p>
                              <p className="text-xs text-slate-500">Khai giảng: {cls.start}</p>
                           </div>
                           <div className="text-right">
                              <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded">Còn {cls.slots} chỗ</span>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
               <div className="p-4 border-t border-slate-200 flex justify-end gap-3 bg-slate-50">
                  <button onClick={() => setShowAssignModal(false)} className="px-4 py-2 text-slate-600 font-bold text-sm hover:bg-slate-200 rounded-lg">Hủy</button>
                  <button onClick={handleConfirmAssign} className="px-4 py-2 bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 rounded-lg shadow-sm">Xác nhận Xếp lớp</button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default TrainingEnrollment;
