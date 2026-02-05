import React, { useState } from 'react';
import {
  Search,
  Plus,
  ChevronDown,
  ChevronUp,
  Building2,
  Globe,
  Award,
  MapPin,
  Users,
  Wallet,
  StickyNote
} from 'lucide-react';

// Mock Data
const PARTNERS = [
  {
    id: 1,
    name: 'Đại học Kỹ thuật Munich (TUM)',
    type: 'Đại học Nghiên cứu Công lập',
    country: 'Germany',
    flag: '🇩🇪',
    ranking: '#1 Đức',
    intake: 'Tháng 4, 10',
    applicants: 142,
    level: 'GOLD',
    details: {
      tuition: '€0 - €1,500 / kỳ (Phí hành chính)',
      requirements: ['GPA: 3.5+', 'IELTS: 6.5 / TestDaF 4', 'Yêu cầu Phỏng vấn'],
      address: 'Arcisstraße 21, 80333 München, Đức',
      quota: '50 sinh viên/năm',
      cmtc: 'Tài khoản phong tỏa 11.208 Euro',
      note: 'Ưu tiên hồ sơ nộp sớm trước 3 tháng. Trường yêu cầu phỏng vấn kỹ thuật online.'
    }
  },
  {
    id: 2,
    name: 'Đại học Bắc Kinh',
    type: 'Đại học Trọng điểm Quốc gia',
    country: 'China',
    flag: '🇨🇳',
    ranking: '#2 TQ',
    intake: 'Tháng 9',
    applicants: 118,
    level: 'GOLD',
    details: {
      tuition: '26,000 - 30,000 RMB / năm',
      requirements: ['HSK 5 (210+)', 'GPA: 3.2+', 'Thư giới thiệu'],
      address: 'Haidian District, Beijing, Trung Quốc',
      quota: '30 sinh viên/năm',
      cmtc: 'Sổ tiết kiệm tối thiểu 30.000 USD',
      note: 'Học bổng CSC thường đóng đơn vào tháng 1.'
    }
  },
  {
    id: 3,
    name: 'Đại học Heidelberg',
    type: 'Đại học Xuất sắc',
    country: 'Germany',
    flag: '🇩🇪',
    ranking: '#3 Đức',
    intake: 'Tháng 10',
    applicants: 78,
    level: 'SILVER',
    details: {
      tuition: '€1,500 / kỳ (Sinh viên quốc tế)',
      requirements: ['GPA: 3.0+', 'TestAS', 'DSH-2'],
      address: 'Grabengasse 1, 69117 Heidelberg, Đức',
      quota: '20 sinh viên/năm',
      cmtc: 'Tài khoản phong tỏa 11.208 Euro',
      note: 'Yêu cầu TestAS (Core + Subject Module)'
    }
  },
  {
    id: 4,
    name: 'Đại học Phục Đán',
    type: 'Thành viên C9 League',
    country: 'China',
    flag: '🇨🇳',
    ranking: '#5 TQ',
    intake: 'Tháng 9',
    applicants: 62,
    level: 'PREMIUM',
    details: {
      tuition: '23,000 - 75,000 RMB / năm',
      requirements: ['HSK 6', 'Phỏng vấn chuyên môn', 'Bài luận cá nhân'],
      address: '220 Handan Rd, Yangpu District, Shanghai, Trung Quốc',
      quota: '15 sinh viên/năm',
      cmtc: 'Chứng minh thu nhập người bảo lãnh',
      note: 'Chương trình MBBS (Y khoa) yêu cầu phỏng vấn trực tiếp.'
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

        {/* Filters - Chart Section Removed */}
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
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ranking</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Kỳ nhập học</th>
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
                      <span className="font-bold text-[#0d47a1] bg-blue-50 px-2 py-1 rounded text-xs">{partner.ranking}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-700 font-medium">{partner.intake}</span>
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
                      <td colSpan={7} className="px-0 py-0 border-b border-slate-100">
                        <div className="p-6 border-l-4 border-[#0d47a1] ml-6 my-2 bg-white rounded-r-lg shadow-inner">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
                            {/* Tuition & CMTC */}
                            <div className="space-y-4">
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                  <Building2 size={12} /> Học phí (Tham khảo)
                                </p>
                                <p className="text-sm font-bold text-slate-800">{partner.details.tuition}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                  <Wallet size={12} /> Chứng minh tài chính (CMTC)
                                </p>
                                <p className="text-sm font-bold text-slate-800">{partner.details.cmtc}</p>
                              </div>
                            </div>

                            {/* Address & Quota */}
                            <div className="space-y-4">
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                  <MapPin size={12} /> Địa chỉ
                                </p>
                                <p className="text-sm text-slate-700 font-medium">{partner.details.address}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                  <Users size={12} /> Chỉ tiêu tuyển sinh
                                </p>
                                <p className="text-sm font-bold text-slate-800">{partner.details.quota}</p>
                              </div>
                            </div>

                            {/* Requirements & Actions */}
                            <div className="space-y-4">
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                  <Award size={12} /> Yêu cầu đầu vào
                                </p>
                                <ul className="text-sm text-slate-700 list-disc pl-4 space-y-1">
                                  {partner.details.requirements.map((req, i) => (
                                    <li key={i}>{req}</li>
                                  ))}
                                </ul>
                              </div>
                              <div className="pt-2">
                                <button className="w-full text-xs font-bold text-[#0d47a1] border border-[#0d47a1] px-4 py-2.5 rounded-lg hover:bg-[#0d47a1] hover:text-white transition-all flex items-center justify-center gap-2">
                                  <Globe size={14} />
                                  Xem Chương trình Đào tạo
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Notes */}
                          <div className="pt-4 border-t border-slate-100 bg-amber-50/50 p-3 rounded-md -mx-2">
                            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1 flex items-center gap-1">
                              <StickyNote size={12} /> Ghi chú nội bộ
                            </p>
                            <p className="text-xs text-slate-700 italic">"{partner.details.note}"</p>
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
