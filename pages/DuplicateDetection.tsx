import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import { 
  ArrowLeft, 
  Merge, 
  AlertTriangle, 
  CheckCircle2, 
  AlertOctagon, 
  Phone, 
  Mail,
  HelpCircle,
  Split,
  Check,
  ArrowRight,
  User,
  Calendar,
  Database
} from 'lucide-react';

interface IDuplicateLeadSummary {
  id: string;
  name: string;
  source: string;
  createdDate: string;
  matchScore: number;
}

// Chi tiết đầy đủ để so sánh
interface ILeadDetail {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  program: string;
  owner: string;
  notes: string;
}

const MOCK_SUMMARY_DATA: IDuplicateLeadSummary[] = [
  { id: '1', name: 'Nguyễn Văn Lâm', source: 'Web Form', createdDate: '24/10/2023', matchScore: 95 },
  { id: '2', name: 'Nguyễn V. Lâm', source: 'Referral', createdDate: '22/10/2023', matchScore: 90 },
  { id: '3', name: 'Lâm Nguyễn', source: 'Import', createdDate: '10/10/2023', matchScore: 85 },
  { id: '4', name: 'Nguyễn Văn Nam', source: 'Facebook Ads', createdDate: '05/10/2023', matchScore: 80 },
];

// Giả lập dữ liệu chi tiết khi người dùng chọn 2 bản ghi để merge
const MOCK_DETAILS: Record<string, ILeadDetail> = {
  '1': {
    id: '1',
    name: 'Nguyễn Văn Lâm',
    email: 'lam.nguyen.van@gmail.com',
    phone: '0912 345 678',
    source: 'Web Form',
    program: 'Tiếng Đức - A1',
    owner: 'Sarah Miller',
    notes: 'Khách hàng quan tâm du học nghề, đã có bằng tốt nghiệp THPT.'
  },
  '2': {
    id: '2',
    name: 'Nguyễn V. Lâm',
    email: 'lamnv@company.com.vn', // Email khác
    phone: '0912 345 678', // Trùng SĐT
    source: 'Referral (Giới thiệu)',
    program: 'Du học Đức',
    owner: 'David Clark',
    notes: 'Được giới thiệu bởi học viên cũ (Hùng).'
  }
};

type MergeField = keyof Omit<ILeadDetail, 'id'>;

const DuplicateDetection: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  
  // State
  const [viewMode, setViewMode] = useState<'list' | 'merge'>('list');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // State lưu lựa chọn merge: Key là tên trường, Value là ID của bản ghi được chọn
  const [mergeSelection, setMergeSelection] = useState<Record<string, string>>({});

  // Toggle selection in List View
  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      if (selectedIds.length >= 2) {
        // Nếu đã chọn 2, bỏ cái cũ nhất chọn cái mới (hoặc chặn - ở đây chọn chặn cho đơn giản UX)
        alert("Chỉ được chọn tối đa 2 hồ sơ để gộp.");
        return;
      }
      setSelectedIds([...selectedIds, id]);
    }
  };

  const startMergeProcess = () => {
    if (selectedIds.length !== 2) return;
    
    // Khởi tạo lựa chọn mặc định là bản ghi đầu tiên (selectedIds[0])
    const defaultSelection: Record<string, string> = {};
    const fields: MergeField[] = ['name', 'email', 'phone', 'source', 'program', 'owner', 'notes'];
    
    fields.forEach(field => {
      defaultSelection[field] = selectedIds[0];
    });

    setMergeSelection(defaultSelection);
    setViewMode('merge');
  };

  const handleFinalMerge = () => {
    // Logic gọi API gộp thật ở đây
    alert(`Đã gộp thành công! Hồ sơ giữ lại gồm:\n- Tên: ${MOCK_DETAILS[mergeSelection['name']].name}\n- Email: ${MOCK_DETAILS[mergeSelection['email']].email}`);
    navigate('/leads');
  };

  // --- RENDER LIST VIEW ---
  if (viewMode === 'list') {
    return (
      <div className="flex flex-col h-full bg-white font-sans text-[#111418]">
        <div className="flex flex-1 justify-center py-5 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col w-full max-w-[960px] flex-1">
            
            {/* Header */}
            <div className="flex flex-wrap justify-between gap-3 p-4">
              <div className="flex min-w-72 flex-col gap-3">
                <div className="flex items-center gap-2">
                   <button 
                      onClick={() => navigate('/leads')}
                      className="p-1 hover:bg-slate-100 rounded-full transition-colors mr-1"
                   >
                      <ArrowLeft size={24} className="text-[#111418]" />
                   </button>
                   <p className="text-[#111418] tracking-light text-[32px] font-bold leading-tight">Phát hiện trùng lặp</p>
                </div>
                <p className="text-[#617589] text-sm font-normal leading-normal">
                  Hệ thống phát hiện các hồ sơ có khả năng trùng lặp dựa trên SĐT, Email và Tên.
                </p>
              </div>
            </div>

            {/* Table */}
            <div className="px-4 py-3">
              <div className="flex overflow-hidden rounded-lg border border-[#dbe0e6] bg-white">
                <table className="flex-1 w-full">
                  <thead className="bg-white border-b border-[#dbe0e6]">
                    <tr>
                      <th className="px-4 py-3 text-left text-[#111418] text-sm font-medium leading-normal w-[40%]">Tên Lead</th>
                      <th className="px-4 py-3 text-left text-[#111418] text-sm font-medium leading-normal hidden sm:table-cell">Nguồn</th>
                      <th className="px-4 py-3 text-left text-[#111418] text-sm font-medium leading-normal hidden md:table-cell">Ngày tạo</th>
                      <th className="px-4 py-3 text-left text-[#111418] text-sm font-medium leading-normal">Độ trùng khớp</th>
                      <th className="px-4 py-3 w-[60px] text-center">Chọn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_SUMMARY_DATA.map((item) => (
                      <tr key={item.id} className={`border-t border-[#dbe0e6] hover:bg-slate-50 transition-colors ${selectedIds.includes(item.id) ? 'bg-blue-50/50' : ''}`}>
                        <td className="h-[72px] px-4 py-2 text-[#111418] text-sm font-normal leading-normal">
                          <div className="font-bold">{item.name}</div>
                          <div className="text-xs text-[#617589] sm:hidden">{item.source}</div>
                        </td>
                        <td className="h-[72px] px-4 py-2 text-[#617589] text-sm font-normal leading-normal hidden sm:table-cell">
                          {item.source}
                        </td>
                        <td className="h-[72px] px-4 py-2 text-[#617589] text-sm font-normal leading-normal hidden md:table-cell">
                          {item.createdDate}
                        </td>
                        <td className="h-[72px] px-4 py-2 text-[#617589] text-sm font-normal leading-normal">
                           <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                              item.matchScore >= 90 ? 'bg-green-100 text-green-700' :
                              item.matchScore >= 80 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                          }`}>
                              {item.matchScore}%
                          </span>
                        </td>
                        <td className="h-[72px] px-4 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(item.id)}
                            onChange={() => toggleSelect(item.id)}
                            className="h-5 w-5 rounded border-[#dbe0e6] text-[#1380ec] focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex px-4 py-3 justify-end gap-3">
              <span className="self-center text-sm text-gray-500">
                 Đã chọn: <span className="font-bold text-gray-900">{selectedIds.length}</span>/2
              </span>
              <button
                onClick={startMergeProcess}
                disabled={selectedIds.length !== 2}
                className={`flex items-center justify-center rounded-lg h-10 px-6 text-white text-sm font-bold transition-all gap-2
                  ${selectedIds.length !== 2 ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#1380ec] hover:bg-blue-700 shadow-md'}
                `}
              >
                <Merge size={18} />
                <span>So sánh & Gộp</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER MERGE VIEW ---
  const recordA = MOCK_DETAILS[selectedIds[0]] || MOCK_DETAILS['1']; // Fallback for types
  const recordB = MOCK_DETAILS[selectedIds[1]] || MOCK_DETAILS['2'];

  const fields: { key: MergeField, label: string, icon: any }[] = [
    { key: 'name', label: 'Họ và tên', icon: User },
    { key: 'phone', label: 'Số điện thoại', icon: Phone },
    { key: 'email', label: 'Email', icon: Mail },
    { key: 'source', label: 'Nguồn Lead', icon: Database },
    { key: 'program', label: 'Chương trình', icon: CheckCircle2 },
    { key: 'owner', label: 'Người phụ trách', icon: User },
    { key: 'notes', label: 'Ghi chú', icon: HelpCircle },
  ];

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] font-sans text-[#111418] overflow-y-auto">
      <div className="max-w-[1200px] mx-auto w-full p-6">
        
        {/* Header Merge View */}
        <div className="mb-8">
           <button 
              onClick={() => setViewMode('list')}
              className="flex items-center gap-1 text-slate-500 hover:text-blue-600 mb-4 transition-colors font-medium text-sm"
           >
              <ArrowLeft size={16} /> Quay lại danh sách
           </button>
           <h1 className="text-3xl font-bold text-slate-900 mb-2">Hợp nhất Hồ sơ (Merge)</h1>
           <p className="text-slate-500">Chọn thông tin chính xác nhất từ 2 hồ sơ bên dưới để tạo ra bản ghi hoàn chỉnh.</p>
        </div>

        {/* Comparison Grid */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
           {/* Grid Header */}
           <div className="grid grid-cols-12 bg-slate-50 border-b border-slate-200 divide-x divide-slate-200">
              <div className="col-span-3 p-4 flex items-center">
                 <span className="font-bold text-slate-400 text-xs uppercase tracking-wider">Trường thông tin</span>
              </div>
              
              {/* Record A Header */}
              <div className="col-span-4 p-4 bg-blue-50/30">
                 <div className="flex justify-between items-start mb-2">
                    <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded">Hồ sơ A (Gốc)</span>
                    <span className="text-xs text-slate-400">ID: {recordA.id}</span>
                 </div>
                 <h3 className="font-bold text-slate-900">{recordA.name}</h3>
              </div>
              
              {/* Record B Header */}
              <div className="col-span-4 p-4">
                 <div className="flex justify-between items-start mb-2">
                    <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded">Hồ sơ B (Trùng)</span>
                    <span className="text-xs text-slate-400">ID: {recordB.id}</span>
                 </div>
                 <h3 className="font-bold text-slate-900">{recordB.name}</h3>
              </div>

              <div className="col-span-1 p-4 flex items-center justify-center bg-slate-50">
                 <AlertOctagon className="text-slate-300" size={20} />
              </div>
           </div>

           {/* Grid Rows */}
           <div className="divide-y divide-slate-100">
              {fields.map((f) => {
                 const isDiff = recordA[f.key] !== recordB[f.key];
                 
                 return (
                    <div key={f.key} className={`grid grid-cols-12 divide-x divide-slate-100 group hover:bg-slate-50 transition-colors ${isDiff ? 'bg-white' : 'bg-slate-50/30'}`}>
                       {/* Field Name */}
                       <div className="col-span-3 p-4 flex items-center gap-3 text-slate-600">
                          <f.icon size={16} className="text-slate-400" />
                          <span className="text-sm font-medium">{f.label}</span>
                       </div>

                       {/* Option A */}
                       <div 
                          className={`col-span-4 p-4 cursor-pointer relative transition-all ${mergeSelection[f.key] === recordA.id ? 'bg-blue-50 ring-inset ring-2 ring-blue-500/20' : ''}`}
                          onClick={() => setMergeSelection({ ...mergeSelection, [f.key]: recordA.id })}
                       >
                          <label className="flex items-start gap-3 cursor-pointer w-full h-full">
                             <input 
                                type="radio" 
                                name={f.key} 
                                checked={mergeSelection[f.key] === recordA.id}
                                onChange={() => {}} // Handle click on parent div
                                className="mt-0.5 w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                             />
                             <span className={`text-sm leading-relaxed ${mergeSelection[f.key] === recordA.id ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
                                {recordA[f.key]}
                             </span>
                          </label>
                       </div>

                       {/* Option B */}
                       <div 
                          className={`col-span-4 p-4 cursor-pointer relative transition-all ${mergeSelection[f.key] === recordB.id ? 'bg-blue-50 ring-inset ring-2 ring-blue-500/20' : ''}`}
                          onClick={() => setMergeSelection({ ...mergeSelection, [f.key]: recordB.id })}
                       >
                          <label className="flex items-start gap-3 cursor-pointer w-full h-full">
                             <input 
                                type="radio" 
                                name={f.key} 
                                checked={mergeSelection[f.key] === recordB.id}
                                onChange={() => {}} // Handle click on parent div
                                className="mt-0.5 w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                             />
                             <span className={`text-sm leading-relaxed ${mergeSelection[f.key] === recordB.id ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
                                {recordB[f.key]}
                             </span>
                          </label>
                       </div>

                       {/* Diff Indicator */}
                       <div className="col-span-1 flex items-center justify-center">
                          {isDiff && <span className="w-2 h-2 rounded-full bg-amber-400" title="Dữ liệu khác nhau"></span>}
                       </div>
                    </div>
                 );
              })}
           </div>
        </div>

        {/* Merge Actions */}
        <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-6">
           <div className="flex flex-col">
              <p className="text-sm font-bold text-slate-900">Bản ghi sau khi gộp</p>
              <p className="text-xs text-slate-500">
                 Hồ sơ <span className="font-mono text-slate-700">ID {recordB.id}</span> sẽ bị xóa và gộp vào <span className="font-mono text-slate-700">ID {recordA.id}</span>.
              </p>
           </div>
           <div className="flex gap-4">
              <button 
                 onClick={() => setViewMode('list')}
                 className="px-6 py-2.5 rounded-lg border border-slate-300 font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                 Hủy bỏ
              </button>
              <button 
                 onClick={handleFinalMerge}
                 className="px-8 py-2.5 rounded-lg bg-[#1380ec] text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/30 flex items-center gap-2 transition-all"
              >
                 <Merge size={18} />
                 Xác nhận Gộp (Confirm)
              </button>
           </div>
        </div>

      </div>
    </div>
  );
};

export default DuplicateDetection;