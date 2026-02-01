
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Award, 
  Download, 
  Settings, 
  CheckCircle2, 
  Info,
  Printer,
  TrendingUp
} from 'lucide-react';

const TrainingCertificates: React.FC = () => {
  const navigate = useNavigate();
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Mock Data: Eligible Students
  const [eligibleStudents, setEligibleStudents] = useState([
    { id: 1, name: 'Nguyễn Văn Nam', course: 'Tiếng Đức A1', completedDate: '12/01/2024', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026024d', salesRep: 'Sarah Miller' },
    { id: 2, name: 'Trần Thị Hương', course: 'Tiếng Trung HSK1', completedDate: '10/01/2024', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704d', salesRep: 'David Clark' },
    { id: 3, name: 'Lê Hoàng', course: 'Giao tiếp B1', completedDate: '14/01/2024', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026024e', salesRep: 'Sarah Miller' },
  ]);

  // Mock Data: History
  const HISTORY = [
    { id: 1, name: 'Phạm Bích Ngọc', course: 'Tiếng Đức Cơ bản', date: '05/01/2024' },
    { id: 2, name: 'Vũ Minh Hiếu', course: 'Tiếng Pháp A1', date: '22/12/2023' },
    { id: 3, name: 'Đặng Thu Thảo', course: 'Luyện thi HSK 3', date: '20/12/2023' },
  ];

  const handleIssueCertificate = (studentId: number) => {
      const student = eligibleStudents.find(s => s.id === studentId);
      if (!student) return;

      // Simulate sending notifications
      setToastMessage(`Đã cấp chứng chỉ cho ${student.name}. Hệ thống đã gửi thông báo Upsell khóa tiếp theo cho Sales Rep ${student.salesRep}.`);
      setShowToast(true);
      
      // Remove from list to simulate processing
      setEligibleStudents(prev => prev.filter(s => s.id !== studentId));

      setTimeout(() => setShowToast(false), 5000);
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#0d141b] font-sans overflow-y-auto relative">
      
      {/* Toast Notification */}
      {showToast && (
          <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 border border-slate-700 animate-in slide-in-from-right-10 fade-in duration-300 max-w-md">
            <div className="bg-green-500 rounded-full p-1">
                <TrendingUp size={20} className="text-white" />
            </div>
            <div className="flex flex-col">
               <p className="text-sm font-bold">Upsell Triggered!</p>
               <p className="text-xs opacity-90 leading-relaxed">{toastMessage}</p>
            </div>
         </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-5 bg-white border-b border-[#e7edf3] shrink-0">
        <button 
          onClick={() => navigate('/training/classes')}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ArrowLeft size={24} className="text-slate-600" />
        </button>
        <div>
           <h1 className="text-2xl font-bold text-[#0d141b]">Quản lý Cấp Chứng chỉ</h1>
           <p className="text-sm text-[#4c739a]">Xác nhận hoàn thành khóa học và cấp phát văn bằng.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
        
        {/* LEFT COLUMN */}
        <div className="flex flex-col flex-1 gap-6 min-w-0">
            
            {/* Eligible List */}
            <div className="bg-white rounded-xl border border-[#e7edf3] overflow-hidden shadow-sm">
                <div className="p-6 border-b border-[#e7edf3] flex justify-between items-center bg-slate-50">
                    <div>
                        <h3 className="text-[#0d141b] text-lg font-bold">Đủ điều kiện cấp chứng chỉ</h3>
                        <p className="text-[#4c739a] text-sm">Học viên đã hoàn thành 100% tiến độ và đạt điểm thi.</p>
                    </div>
                    <div className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                        <CheckCircle2 size={12} /> {eligibleStudents.length} Chờ xử lý
                    </div>
                </div>
                <div className="divide-y divide-[#e7edf3]">
                    {eligibleStudents.length > 0 ? eligibleStudents.map((student) => (
                        <div key={student.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-3">
                                <img src={student.avatar} alt={student.name} className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                                <div>
                                    <p className="text-[#0d141b] font-bold text-sm">{student.name}</p>
                                    <p className="text-[#4c739a] text-xs">{student.course} · Hoàn thành {student.completedDate}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => handleIssueCertificate(student.id)}
                                className="bg-[#0d47a1] text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#1565c0] transition-colors flex items-center gap-2 shadow-sm"
                            >
                                <Award size={16} />
                                Cấp chứng chỉ & Báo Sale
                            </button>
                        </div>
                    )) : (
                        <div className="p-8 text-center text-slate-400 italic">Đã xử lý hết danh sách chờ.</div>
                    )}
                </div>
            </div>

            {/* History Table */}
            <div className="bg-white rounded-xl border border-[#e7edf3] overflow-hidden shadow-sm">
                <div className="p-6 border-b border-[#e7edf3]">
                    <h3 className="text-[#0d141b] text-lg font-bold">Lịch sử Cấp phát</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-[#e7edf3]">
                            <tr>
                                <th className="px-6 py-3 text-[#4c739a] font-bold uppercase text-[10px] tracking-wider">Học viên</th>
                                <th className="px-6 py-3 text-[#4c739a] font-bold uppercase text-[10px] tracking-wider">Khóa học</th>
                                <th className="px-6 py-3 text-[#4c739a] font-bold uppercase text-[10px] tracking-wider">Ngày cấp</th>
                                <th className="px-6 py-3 text-[#4c739a] font-bold uppercase text-[10px] tracking-wider text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e7edf3]">
                            {HISTORY.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-[#0d141b]">{item.name}</td>
                                    <td className="px-6 py-4 text-[#4c739a]">{item.course}</td>
                                    <td className="px-6 py-4 text-[#4c739a]">{item.date}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-[#0d47a1] hover:text-[#1565c0] hover:underline flex items-center gap-1 justify-end ml-auto font-medium">
                                            <Download size={16} /> PDF
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="flex flex-col w-full lg:w-[500px] gap-6 shrink-0">
            <div className="bg-white rounded-xl border border-[#e7edf3] p-6 flex flex-col h-full shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-[#0d141b] text-lg font-bold">Xem trước Mẫu (Preview)</h3>
                    <button className="text-[#0d47a1] text-sm font-bold flex items-center gap-1 hover:bg-blue-50 px-2 py-1 rounded transition-colors">
                        <Settings size={16} />
                        Chỉnh sửa Mẫu
                    </button>
                </div>
                
                {/* Certificate Visual */}
                <div className="aspect-[1.414/1] bg-white border-[12px] border-double border-[#0d47a1] shadow-2xl relative flex flex-col items-center justify-center p-8 text-center overflow-hidden">
                    {/* Corner Decorations */}
                    <div className="absolute top-0 left-0 w-24 h-24 border-t-[20px] border-l-[20px] border-[#0d47a1]/10"></div>
                    <div className="absolute bottom-0 right-0 w-24 h-24 border-b-[20px] border-r-[20px] border-[#0d47a1]/10"></div>
                    
                    {/* Watermark */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                        <Award size={200} className="text-[#0d47a1]" />
                    </div>

                    <div className="relative z-10 w-full">
                        <Award size={48} className="text-[#0d47a1] mb-4 mx-auto" />
                        <h1 className="text-2xl font-serif text-[#0d141b] uppercase tracking-widest mb-1 font-bold">Giấy Chứng Nhận</h1>
                        <p className="text-xs italic text-[#4c739a] mb-6 font-serif">Certificate of Completion</p>
                        
                        <p className="text-xs text-[#4c739a] mb-2">Chứng nhận học viên:</p>
                        <div className="w-full border-b border-[#0d47a1]/30 mb-4 pb-1 max-w-xs mx-auto">
                            <span className="text-xl font-bold text-[#0d141b] font-serif uppercase block">Nguyễn Văn Nam</span>
                        </div>
                        
                        <p className="text-xs text--[#4c739a] mb-4">Đã hoàn thành xuất sắc khóa học:</p>
                        <h2 className="text-lg font-bold text-[#0d47a1] mb-8 font-serif">TIẾNG ĐỨC TRÌNH ĐỘ A1</h2>
                        
                        <div className="flex justify-between w-full mt-4 px-4">
                            <div className="flex flex-col items-center">
                                <span className="text-[8px] uppercase text-[#4c739a] font-bold mb-8">Ngày cấp</span>
                                <span className="text-[10px] text-[#0d141b] font-bold border-t border-slate-400 pt-1 px-2">12/01/2024</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-[8px] uppercase text-[#4c739a] font-bold mb-8">Giám đốc Đào tạo</span>
                                <span className="text-[10px] text-[#0d141b] font-bold border-t border-slate-400 pt-1 px-2">EduCRM Center</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Info Box */}
                <div className="mt-6 bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3">
                    <Info size={20} className="text-[#0d47a1] shrink-0 mt-0.5" />
                    <div className="text-xs text-[#4c739a] leading-relaxed">
                        <p className="font-bold text-[#0d47a1] mb-1">Cơ chế Upsell Tự động</p>
                        Ngay khi bấm "Cấp chứng chỉ", hệ thống sẽ tạo một Task mới cho Sales Rep phụ trách học viên này để tư vấn khóa tiếp theo.
                    </div>
                </div>

                <div className="mt-4 flex gap-2">
                    <button className="flex-1 py-2.5 border border-[#cfdbe7] rounded-lg text-sm font-bold text-[#0d141b] hover:bg-slate-50 flex items-center justify-center gap-2">
                        <Printer size={16} /> In thử
                    </button>
                    <button className="flex-1 py-2.5 bg-[#0d141b] text-white rounded-lg text-sm font-bold hover:bg-slate-800 flex items-center justify-center gap-2 shadow-sm">
                        <Download size={16} /> Tải mẫu PDF
                    </button>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default TrainingCertificates;
