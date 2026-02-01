
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ChevronRight,
  Star,
  Download,
  Smile,
  Users,
  MessageSquare,
  ArrowLeft,
  Filter
} from 'lucide-react';

const TrainingFeedback: React.FC = () => {
  const navigate = useNavigate();
  const [selectedTeacherId, setSelectedTeacherId] = useState('t2');

  const TEACHERS = [
    { id: 't1', name: 'Cô Nguyễn Thị Lan', subject: 'Tiếng Đức A1', rating: 4.8, avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026024d' },
    { id: 't2', name: 'Thầy Trần Văn Minh', subject: 'Tiếng Trung HSK1', rating: 4.9, avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704d' },
    { id: 't3', name: 'Cô Phạm Hương', subject: 'Tiếng Pháp A1', rating: 4.5, avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026024e' },
  ];

  const REVIEWS = [
    { id: 1, student: 'Lê Văn Cường', avatar: 'LC', color: 'bg-blue-100 text-blue-600', rating: 5, comment: 'Thầy Minh rất kiên nhẫn với người mới bắt đầu. Cách giải thích chữ Hán rất dễ hiểu và logic.', date: '12/10/2023' },
    { id: 2, student: 'Trần Thị Bích', avatar: 'TB', color: 'bg-purple-100 text-purple-600', rating: 4, comment: 'Lớp học tuyệt vời! Đôi khi tốc độ hơi nhanh trong phần luyện nói, nhưng nhìn chung rất hiệu quả.', date: '11/10/2023' },
    { id: 3, student: 'Nguyễn Văn Nam', avatar: 'NN', color: 'bg-green-100 text-green-600', rating: 5, comment: 'Tôi thực sự thích các slide tương tác và những câu chuyện văn hóa thầy chia sẻ. Học tiếng Trung thú vị hơn nhiều.', date: '10/10/2023' },
    { id: 4, student: 'Hoàng Văn Em', avatar: 'HE', color: 'bg-orange-100 text-orange-600', rating: 5, comment: 'Giáo viên xuất sắc. Thầy đảm bảo mọi học viên đều tham gia trong các buổi học trực tuyến. Rất khuyến khích học lớp này.', date: '08/10/2023' },
  ];

  const WORD_CLOUD = [
    { text: 'Kiên nhẫn', size: 'text-4xl', color: 'text-green-600' },
    { text: 'Lôi cuốn', size: 'text-2xl', color: 'text-green-500' },
    { text: 'Rõ ràng', size: 'text-3xl', color: 'text-green-700' },
    { text: 'Tốc độ nhanh', size: 'text-lg', color: 'text-slate-500' },
    { text: 'Uyên bác', size: 'text-4xl', color: 'text-green-600' },
    { text: 'Tương tác', size: 'text-xl', color: 'text-green-500' },
    { text: 'Bài tập nhiều', size: 'text-2xl', color: 'text-slate-400' },
    { text: 'Hữu ích', size: 'text-3xl', color: 'text-green-600' },
    { text: 'Có tổ chức', size: 'text-lg', color: 'text-green-500' },
    { text: 'Khích lệ', size: 'text-2xl', color: 'text-green-600' },
  ];

  const selectedTeacher = TEACHERS.find(t => t.id === selectedTeacherId) || TEACHERS[0];

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#0d141b] font-sans overflow-hidden">
      
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 bg-white border-b border-[#e7edf3] shrink-0">
        <button 
          onClick={() => navigate('/training/classes')}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ArrowLeft size={24} className="text-slate-600" />
        </button>
        <div>
           <h1 className="text-xl font-bold text-[#0d141b]">Đánh giá & Phản hồi Giảng viên</h1>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        
        {/* LEFT SIDEBAR: TEACHERS LIST */}
        <div className="w-80 flex flex-col border-r border-[#e7edf3] bg-white overflow-hidden shrink-0">
            <div className="p-4 border-b border-[#e7edf3]">
                <h2 className="text-lg font-bold mb-3">Danh sách Giảng viên</h2>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={18} className="text-[#4c739a]" />
                    </div>
                    <input 
                        type="text" 
                        placeholder="Tìm kiếm giảng viên..."
                        className="w-full pl-9 pr-4 py-2 bg-[#f0f4f8] border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {TEACHERS.map((teacher) => (
                    <div 
                        key={teacher.id}
                        onClick={() => setSelectedTeacherId(teacher.id)}
                        className={`flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-colors ${selectedTeacherId === teacher.id ? 'bg-blue-50 border border-blue-100' : 'hover:bg-slate-50 border border-transparent'}`}
                    >
                        <img src={teacher.avatar} alt={teacher.name} className="w-10 h-10 rounded-full object-cover" />
                        <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold truncate ${selectedTeacherId === teacher.id ? 'text-blue-700' : 'text-[#0d141b]'}`}>{teacher.name}</p>
                            <p className="text-xs text-[#4c739a] truncate">{teacher.subject} · {teacher.rating} ⭐</p>
                        </div>
                        <ChevronRight size={18} className={`text-[#4c739a] ${selectedTeacherId === teacher.id ? 'text-blue-600' : ''}`} />
                    </div>
                ))}
            </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
            <div className="max-w-[1000px] mx-auto w-full">
                
                {/* Breadcrumb & Title */}
                <div className="mb-6">
                    <div className="flex items-center gap-2 text-sm text-[#4c739a] mb-2">
                        <span>Đánh giá</span>
                        <ChevronRight size={14} />
                        <span>Hồ sơ Giảng viên</span>
                    </div>
                    <div className="flex flex-wrap justify-between items-end gap-4">
                        <div>
                            <h1 className="text-3xl font-black text-[#0d141b] leading-tight mb-1">{selectedTeacher.name}</h1>
                            <p className="text-[#4c739a] text-base">Kết quả đánh giá · <span className="font-bold">Quý 3/2023</span></p>
                        </div>
                        <button className="flex items-center gap-2 bg-[#0d141b] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors shadow-sm">
                            <Download size={16} /> Xuất Báo cáo
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white p-6 rounded-xl border border-[#e7edf3] shadow-sm flex flex-col gap-2">
                        <p className="text-[#4c739a] text-sm font-medium">Hiệu suất Tổng thể</p>
                        <div className="flex items-center gap-2">
                            <p className="text-[#0d141b] text-4xl font-black">{selectedTeacher.rating}</p>
                            <div className="flex text-yellow-400">
                                {[1,2,3,4,5].map(i => <Star key={i} size={20} fill={i <= Math.floor(selectedTeacher.rating) ? "currentColor" : "none"} className={i <= Math.floor(selectedTeacher.rating) ? "text-yellow-400" : "text-gray-300"} />)}
                            </div>
                        </div>
                        <p className="text-[#4c739a] text-xs">Dựa trên 142 phản hồi</p>
                    </div>
                    
                    <div className="bg-white p-6 rounded-xl border border-[#e7edf3] shadow-sm flex flex-col gap-2">
                        <p className="text-[#4c739a] text-sm font-medium">Chỉ số Cảm xúc (Sentiment)</p>
                        <div className="flex items-center gap-2">
                            <p className="text-green-600 text-4xl font-black">94%</p>
                            <Smile size={32} className="text-green-600" />
                        </div>
                        <p className="text-[#4c739a] text-xs">Phản hồi tích cực mạnh mẽ</p>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-[#e7edf3] shadow-sm flex flex-col gap-2">
                        <p className="text-[#4c739a] text-sm font-medium">Tỷ lệ Phản hồi</p>
                        <div className="flex items-center gap-2">
                            <p className="text-[#0d141b] text-4xl font-black">88%</p>
                            <Users size={32} className="text-[#4c739a]" />
                        </div>
                        <p className="text-[#4c739a] text-xs">142/161 học viên tham gia</p>
                    </div>
                </div>

                {/* Sentiment Analysis */}
                <div className="bg-white p-6 rounded-xl border border-[#e7edf3] shadow-sm mb-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-[#0d141b]">Phân tích Cảm xúc Phản hồi</h3>
                        <div className="flex gap-2">
                            <span className="px-2 py-1 bg-green-50 text-green-700 text-xs font-bold rounded">Tích cực</span>
                            <span className="px-2 py-1 bg-slate-100 text-slate-500 text-xs font-bold rounded">Trung tính</span>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4 py-8 bg-[#f8fafc] rounded-lg px-4">
                        {WORD_CLOUD.map((word, idx) => (
                            <span key={idx} className={`${word.size} ${word.color} font-black cursor-default hover:scale-110 transition-transform duration-200`}>
                                {word.text}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Feedback Table */}
                <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center px-1">
                        <h3 className="text-xl font-bold text-[#0d141b]">Chi tiết Phản hồi từ Học viên</h3>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-[#4c739a]">Sắp xếp:</span>
                            <select className="h-9 pl-3 pr-8 text-sm bg-white border border-[#e7edf3] rounded-lg focus:ring-0 outline-none text-[#0d141b] font-medium cursor-pointer">
                                <option>Mới nhất</option>
                                <option>Đánh giá: Cao đến Thấp</option>
                                <option>Đánh giá: Thấp đến Cao</option>
                            </select>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-[#e7edf3] shadow-sm overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-[#f8fafc] border-b border-[#e7edf3]">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-[#4c739a] uppercase tracking-wider w-[25%]">Học viên</th>
                                    <th className="px-6 py-4 text-xs font-bold text-[#4c739a] uppercase tracking-wider w-[15%]">Đánh giá</th>
                                    <th className="px-6 py-4 text-xs font-bold text-[#4c739a] uppercase tracking-wider">Nhận xét</th>
                                    <th className="px-6 py-4 text-xs font-bold text-[#4c739a] uppercase tracking-wider w-[15%]">Ngày</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#e7edf3]">
                                {REVIEWS.map((review) => (
                                    <tr key={review.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${review.color}`}>
                                                    {review.avatar}
                                                </div>
                                                <span className="text-sm font-semibold text-[#0d141b]">{review.student}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex text-yellow-400">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star key={i} size={16} fill={i < review.rating ? "currentColor" : "none"} className={i < review.rating ? "text-yellow-400" : "text-gray-300"} />
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-[#0d141b] line-clamp-2 leading-relaxed">{review.comment}</p>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-[#4c739a] whitespace-nowrap">
                                            {review.date}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        
                        <div className="bg-[#f8fafc] px-6 py-3 border-t border-[#e7edf3] flex items-center justify-between">
                            <span className="text-xs text-[#4c739a] font-medium">Hiển thị 4 trên 142 phản hồi</span>
                            <div className="flex gap-2">
                                <button className="px-3 py-1 bg-white border border-[#e7edf3] rounded text-xs font-bold text-[#0d141b] hover:bg-slate-50 disabled:opacity-50" disabled>Trước</button>
                                <button className="px-3 py-1 bg-white border border-[#e7edf3] rounded text-xs font-bold text-[#0d141b] hover:bg-slate-50">Sau</button>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>

      </div>
    </div>
  );
};

export default TrainingFeedback;
