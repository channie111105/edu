
import React, { useState } from 'react';
import { 
  Search, 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  Building2,
  Globe,
  Award
} from 'lucide-react';

// Mock Data
const PARTNERS = [
  {
    id: 1,
    name: 'Đại học Kỹ thuật Munich (TUM)',
    type: 'Đại học Nghiên cứu Công lập',
    country: 'Germany',
    flag: '🇩🇪',
    successRate: 85,
    applicants: 142,
    level: 'GOLD',
    details: {
      tuition: '€0 - €1,500 / kỳ (Phí hành chính)',
      requirements: ['GPA: 3.5+', 'IELTS: 6.5 / TestDaF 4', 'Yêu cầu Phỏng vấn'],
    }
  },
  {
    id: 2,
    name: 'Đại học Bắc Kinh',
    type: 'Đại học Trọng điểm Quốc gia',
    country: 'China',
    flag: '🇨🇳',
    successRate: 78,
    applicants: 118,
    level: 'GOLD',
    details: {
      tuition: '26,000 - 30,000 RMB / năm',
      requirements: ['HSK 5 (210+)', 'GPA: 3.2+', 'Thư giới thiệu'],
    }
  },
  {
    id: 3,
    name: 'Đại học Heidelberg',
    type: 'Đại học Xuất sắc',
    country: 'Germany',
    flag: '🇩🇪',
    successRate: 92,
    applicants: 78,
    level: 'SILVER',
    details: {
      tuition: '€1,500 / kỳ (Sinh viên quốc tế)',
      requirements: ['GPA: 3.0+', 'TestAS', 'DSH-2'],
    }
  },
  {
    id: 4,
    name: 'Đại học Phục Đán',
    type: 'Thành viên C9 League',
    country: 'China',
    flag: '🇨🇳',
    successRate: 65,
    applicants: 62,
    level: 'PREMIUM',
    details: {
      tuition: '23,000 - 75,000 RMB / năm',
      requirements: ['HSK 6', 'Phỏng vấn chuyên môn', 'Bài luận cá nhân'],
    }
  },
];

const StudyAbroadPartners: React.FC = () => {
  const [expandedId, setExpandedId] = useState<number | null>(1); // Default expand first one
  const [searchTerm, setSearchTerm] = useState('');

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'GOLD':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">ĐỐI TÁC VÀNG</span>;
      case 'SILVER':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">ĐỐI TÁC BẠC</span>;
      case 'PREMIUM':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">CAO CẤP</span>;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#0d141b] font-sans overflow-y-auto">
      <div className="flex flex-col flex-1 p-6 lg:p-10 max-w-[1600px] mx-auto w-full gap-6">
        
        {/* Header */}
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Cơ sở dữ liệu Đối tác</h1>
            <p className="text-slate-500 mt-1">Quản lý mạng lưới trường đại học liên kết tại Đức và Trung Quốc.</p>
          </div>
          <button className="flex items-center gap-2 bg-[#0d47a1] text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-[#0a3d8b] transition-all shadow-sm">
            <Plus size={18} /> Thêm Đối tác Mới
          </button>
        </div>

        {/* Chart Section */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-900 text-lg">Top Trường có lượng Hồ sơ cao nhất</h3>
            <div className="flex gap-4 text-xs font-medium text-slate-500">
              <div className="flex items-center gap-1"><span className="w-3 h-3 bg-[#0d47a1] rounded-sm"></span> Đức</div>
              <div className="flex items-center gap-1"><span className="w-3 h-3 bg-[#94a3b8] rounded-sm"></span> Trung Quốc</div>
            </div>
          </div>
          
          <div className="flex items-end gap-6 h-40 mt-4">
            {/* Chart Bars */}
            {[
              { name: 'TU Munich', val: 142, h: '90%', color: 'bg-[#0d47a1]' },
              { name: 'ĐH Bắc Kinh', val: 118, h: '75%', color: 'bg-[#94a3b8]' },
              { name: 'TU Berlin', val: 95, h: '60%', color: 'bg-[#0d47a1]' },
              { name: 'Thanh Hoa', val: 132, h: '85%', color: 'bg-[#94a3b8]' },
              { name: 'Heidelberg', val: 78, h: '50%', color: 'bg-[#0d47a1]' },
              { name: 'Phục Đán', val: 62, h: '40%', color: 'bg-[#94a3b8]' },
            ].map((item, idx) => (
              <div key={idx} className="flex-1 flex flex-col justify-end gap-2 group cursor-pointer h-full">
                <div className={`w-full ${item.color} rounded-t-sm relative transition-all group-hover:opacity-80`} style={{ height: item.h }}>
                  <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-600">{item.val}</span>
                </div>
                <p className="text-[10px] text-center text-slate-500 truncate font-medium">{item.name}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex-1 min-w-[300px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-[#0d47a1] focus:border-transparent outline-none" 
              placeholder="Tìm kiếm theo tên trường..." 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <select className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#0d47a1]">
              <option>Quốc gia: Tất cả</option>
              <option>Đức</option>
              <option>Trung Quốc</option>
            </select>
            <select className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#0d47a1]">
              <option>Cấp độ: Tất cả</option>
              <option>Vàng</option>
              <option>Bạc</option>
              <option>Cao cấp</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tên Trường</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Quốc gia</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tỷ lệ Đậu (%)</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Hồ sơ hiện tại</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cấp độ Đối tác</th>
                <th className="px-6 py-4 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {PARTNERS.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map((partner) => (
                <React.Fragment key={partner.id}>
                  <tr 
                    onClick={() => toggleExpand(partner.id)}
                    className={`cursor-pointer transition-colors group ${expandedId === partner.id ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-[#0d141b] text-sm">{partner.name}</span>
                        <span className="text-xs text-slate-400">{partner.type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{partner.flag}</span>
                        <span className="text-sm text-slate-700 font-medium">
                          {partner.country === 'Germany' ? 'Đức' : 'Trung Quốc'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-1.5 rounded-full ${partner.successRate >= 80 ? 'bg-green-500' : 'bg-yellow-500'}`} 
                            style={{ width: `${partner.successRate}%` }}
                          ></div>
                        </div>
                        <span className={`text-sm font-bold ${partner.successRate >= 80 ? 'text-green-600' : 'text-yellow-600'}`}>
                          {partner.successRate}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="bg-blue-50 text-[#0d47a1] px-3 py-1 rounded-full text-xs font-bold">
                        {partner.applicants}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {getLevelBadge(partner.level)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {expandedId === partner.id ? (
                        <ChevronUp size={20} className="text-slate-400 text-[#0d47a1]" />
                      ) : (
                        <ChevronDown size={20} className="text-slate-400 group-hover:text-[#0d47a1]" />
                      )}
                    </td>
                  </tr>
                  
                  {/* Expanded Detail View */}
                  {expandedId === partner.id && (
                    <tr className="bg-slate-50/50 animate-in slide-in-from-top-1">
                      <td colSpan={6} className="px-0 py-0 border-b border-slate-100">
                        <div className="p-6 border-l-4 border-[#0d47a1] grid grid-cols-1 md:grid-cols-3 gap-8 ml-6 my-2 bg-white rounded-r-lg shadow-inner">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                              <Building2 size={12} /> Học phí (Tham khảo)
                            </p>
                            <p className="text-sm font-bold text-slate-800">{partner.details.tuition}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                              <Award size={12} /> Yêu cầu đầu vào
                            </p>
                            <ul className="text-sm text-slate-700 list-disc pl-4 space-y-1">
                              {partner.details.requirements.map((req, i) => (
                                <li key={i}>{req}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="flex flex-col justify-center items-end">
                            <button className="text-xs font-bold text-[#0d47a1] border border-[#0d47a1] px-4 py-2.5 rounded-lg hover:bg-[#0d47a1] hover:text-white transition-all flex items-center gap-2">
                              <Globe size={14} />
                              Xem Chương trình Đào tạo
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          
          {/* Pagination */}
          <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between text-sm text-slate-500 font-medium">
            <p>Hiển thị 1 đến 4 trong số 48 đối tác</p>
            <div className="flex gap-2">
              <button className="px-3 py-1 border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50" disabled>Trước</button>
              <button className="px-3 py-1 border border-slate-200 bg-slate-100 text-slate-900 font-bold rounded-md">1</button>
              <button className="px-3 py-1 border border-slate-200 rounded-md hover:bg-slate-50">2</button>
              <button className="px-3 py-1 border border-slate-200 rounded-md hover:bg-slate-50">3</button>
              <button className="px-3 py-1 border border-slate-200 rounded-md hover:bg-slate-50">Sau</button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default StudyAbroadPartners;
