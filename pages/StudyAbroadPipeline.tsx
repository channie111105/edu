
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  ChevronDown, 
  Flag, 
  MoreHorizontal,
  Filter,
  Search,
  X,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

interface Case {
  id: string;
  studentName: string;
  country: 'Germany' | 'China' | 'USA' | 'UK';
  university: string;
  deadline: string;
  status: 'active' | 'overdue';
  owner: string;
}

interface Column {
  id: string;
  title: string;
  cases: Case[];
}

// Mock Data: Won Deals waiting to be converted to Cases
const PENDING_WON_DEALS = [
  { id: 'D-105', customer: 'Phạm Văn Hùng', product: 'Du học nghề Điều dưỡng (Đức)', value: '180.000.000', date: '22/10/2023', owner: 'David Clark' },
  { id: 'D-109', customer: 'Lê Thị Mai', product: 'Du học Đại học (Trung Quốc)', value: '45.000.000', date: '23/10/2023', owner: 'Alex Rivera' },
  { id: 'D-112', customer: 'Nguyễn Quốc Bảo', product: 'Thạc sĩ (Đức)', value: '60.000.000', date: '24/10/2023', owner: 'Sarah Miller' },
];

const INITIAL_COLUMNS: Column[] = [
    {
      id: 'doc_prep',
      title: 'Chuẩn bị Hồ sơ',
      cases: [
        { id: 'c1', studentName: 'Nguyễn Thùy Linh', country: 'Germany', university: 'TU Berlin', deadline: '15/08/2024', status: 'active', owner: 'Sarah' },
        { id: 'c2', studentName: 'Trần Văn Minh', country: 'Germany', university: 'ĐH Heidelberg', deadline: '10/09/2024', status: 'active', owner: 'Sarah' },
        { id: 'c3', studentName: 'Lê Thị Lan', country: 'Germany', university: 'ĐH Köln', deadline: '15/04/2024', status: 'overdue', owner: 'David' },
      ]
    },
    {
      id: 'school_app',
      title: 'Nộp Hồ sơ Trường',
      cases: [
        { id: 'c4', studentName: 'Phạm Văn Hùng', country: 'China', university: 'ĐH Bắc Kinh', deadline: '20/07/2024', status: 'active', owner: 'Alex' },
        { id: 'c5', studentName: 'Hoàng Văn Nam', country: 'China', university: 'ĐH Thanh Hoa', deadline: '05/08/2024', status: 'active', owner: 'Alex' },
        { id: 'c6', studentName: 'Ngô Bá Khá', country: 'China', university: 'ĐH Tôn Trung Sơn', deadline: '20/03/2024', status: 'overdue', owner: 'David' },
      ]
    },
    {
      id: 'visa_interview',
      title: 'Phỏng vấn Visa',
      cases: [
        { id: 'c7', studentName: 'Đặng Thu Thảo', country: 'Germany', university: 'TU Munich', deadline: '25/06/2024', status: 'active', owner: 'Sarah' },
        { id: 'c8', studentName: 'Vũ Thị Phương', country: 'Germany', university: 'RWTH Aachen', deadline: '15/07/2024', status: 'active', owner: 'Sarah' },
        { id: 'c9', studentName: 'Nguyễn Bích Ngọc', country: 'Germany', university: 'ĐH Bonn', deadline: '25/02/2024', status: 'overdue', owner: 'Sarah' },
      ]
    },
    {
      id: 'visa_granted',
      title: 'Đậu Visa',
      cases: [
        { id: 'c10', studentName: 'Trần Văn Minh', country: 'China', university: 'Giao thông Thượng Hải', deadline: '30/05/2024', status: 'active', owner: 'Alex' },
        { id: 'c11', studentName: 'Lê Hoàng', country: 'China', university: 'ĐH Phục Đán', deadline: '10/06/2024', status: 'active', owner: 'Alex' },
        { id: 'c12', studentName: 'Phạm Hương', country: 'China', university: 'ĐH Hạ Môn', deadline: '30/01/2024', status: 'overdue', owner: 'David' },
      ]
    }
];

const StudyAbroadPipeline: React.FC = () => {
  const navigate = useNavigate();
  const [filterCountry, setFilterCountry] = useState('All');
  const [filterOwner, setFilterOwner] = useState('All');
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Convert columns to state to allow updates
  const [columns, setColumns] = useState<Column[]>(INITIAL_COLUMNS);

  const getCountryLabel = (country: string) => {
    switch (country) {
      case 'Germany': return 'Đức';
      case 'China': return 'Trung Quốc';
      case 'USA': return 'Mỹ';
      case 'UK': return 'Anh';
      default: return country;
    }
  };

  const handleCreateCase = (dealId: string) => {
    // 1. Find deal info
    const deal = PENDING_WON_DEALS.find(d => d.id === dealId);
    if (!deal) return;

    // 2. Create new Case object
    const newCase: Case = {
        id: `c-${Date.now()}`,
        studentName: deal.customer,
        country: deal.product.includes('Đức') ? 'Germany' : 'China',
        university: 'Đang cập nhật...',
        deadline: '30/12/2024', // Default deadline
        status: 'active',
        owner: deal.owner.split(' ')[0] // Simple owner mapping
    };

    // 3. Update State: Add to first column ('doc_prep')
    setColumns(prevColumns => prevColumns.map(col => {
        if (col.id === 'doc_prep') {
            return { ...col, cases: [newCase, ...col.cases] };
        }
        return col;
    }));

    // 4. Close Modal (No navigation)
    setShowCreateModal(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#0d141b] font-sans overflow-hidden">
      <div className="flex flex-col flex-1 overflow-y-auto p-6 lg:p-10 max-w-[1600px] mx-auto w-full">
        
        {/* Header Section */}
        <div className="flex flex-col gap-2 mb-8">
          <h1 className="text-[#0d141b] text-3xl font-bold tracking-tight">Quy trình Hồ sơ (Case Pipeline)</h1>
          <p className="text-[#4c739a] text-base">Quản lý và theo dõi tiến độ hồ sơ học sinh qua từng giai đoạn (Kanban).</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-8">
          <div className="relative">
            <select 
              className="appearance-none h-10 min-w-44 rounded-lg border border-[#cfdbe7] bg-white px-4 pr-10 text-sm font-medium text-[#0d141b] focus:border-[#0d47a1] focus:ring-1 focus:ring-[#0d47a1] outline-none cursor-pointer"
              value={filterCountry}
              onChange={(e) => setFilterCountry(e.target.value)}
            >
              <option value="All">Tất cả Quốc gia</option>
              <option value="Germany">Đức</option>
              <option value="China">Trung Quốc</option>
              <option value="USA">Mỹ</option>
              <option value="UK">Anh</option>
            </select>
            <ChevronDown className="absolute right-3 top-2.5 pointer-events-none text-slate-400" size={20} />
          </div>

          <div className="relative">
            <select 
              className="appearance-none h-10 min-w-44 rounded-lg border border-[#cfdbe7] bg-white px-4 pr-10 text-sm font-medium text-[#0d141b] focus:border-[#0d47a1] focus:ring-1 focus:ring-[#0d47a1] outline-none cursor-pointer"
              value={filterOwner}
              onChange={(e) => setFilterOwner(e.target.value)}
            >
              <option value="All">Tất cả Người phụ trách</option>
              <option value="Sarah">Sarah Miller</option>
              <option value="Alex">Alex Rivera</option>
              <option value="David">David Clark</option>
            </select>
            <ChevronDown className="absolute right-3 top-2.5 pointer-events-none text-slate-400" size={20} />
          </div>

          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex h-10 items-center gap-2 rounded-lg bg-[#0d47a1] px-4 text-sm font-bold text-white hover:bg-[#1565c0] transition-colors shadow-sm ml-auto"
          >
            <Plus size={20} />
            Tiếp nhận Hồ sơ (Từ Deal)
          </button>
        </div>

        {/* Kanban Board */}
        <div className="flex gap-6 overflow-x-auto pb-4 items-start h-full">
          {columns.map((col) => (
            <div key={col.id} className="flex flex-col gap-4 min-w-[300px] max-w-[320px] h-full flex-shrink-0">
              
              {/* Column Header */}
              <div className="flex items-center justify-between px-2">
                <h3 className="font-bold text-[#0d141b] uppercase text-xs tracking-wider">{col.title}</h3>
                <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {col.cases.length}
                </span>
              </div>

              {/* Cards Container */}
              <div className="flex flex-col gap-4 flex-1 rounded-xl bg-slate-100/50 p-3 border border-dashed border-slate-200 overflow-y-auto custom-scrollbar">
                {col.cases
                  .filter(c => filterCountry === 'All' || c.country === filterCountry)
                  .filter(c => filterOwner === 'All' || c.owner === filterOwner)
                  .map((item) => (
                  <div 
                    key={item.id} 
                    onClick={() => navigate(`/study-abroad/cases/${item.id}`)}
                    className={`bg-white rounded-lg p-4 shadow-sm border hover:shadow-md transition-all cursor-pointer group relative ${item.status === 'overdue' ? 'border-red-200' : 'border-slate-200'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-[#0d141b] text-base group-hover:text-[#0d47a1] transition-colors">
                        {item.studentName}
                      </span>
                      <span className="text-xs font-medium text-slate-500 flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded">
                        <Flag size={12} className={item.country === 'Germany' ? 'text-black' : 'text-red-500'} /> 
                        {getCountryLabel(item.country)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-[#4c739a] mb-3 flex items-center gap-1">
                        {item.university}
                    </p>
                    
                    <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-1">
                      {item.status === 'overdue' ? (
                        <span className="bg-red-100 text-[#dc2626] text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide">
                          Quá hạn
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-tighter">
                          Hạn chót
                        </span>
                      )}
                      <span className={`text-xs font-bold ${item.status === 'overdue' ? 'text-[#dc2626]' : 'text-[#0d141b]'}`}>
                        {item.deadline}
                      </span>
                    </div>
                  </div>
                ))}
                
                {/* Empty State for filtered results */}
                {col.cases.filter(c => filterCountry === 'All' || c.country === filterCountry).length === 0 && (
                    <div className="text-center py-8 text-slate-400 text-sm italic">
                        Không có hồ sơ nào
                    </div>
                )}
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* MODAL: Select Won Deal to Create Case */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowCreateModal(false)}></div>
           <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
              <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                 <div>
                    <h3 className="text-lg font-bold text-slate-900">Tiếp nhận Hồ sơ (Từ Sales)</h3>
                    <p className="text-sm text-slate-500">Danh sách các Deal đã chốt (Won) cần mở hồ sơ xử lý.</p>
                 </div>
                 <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={24} />
                 </button>
              </div>
              
              <div className="p-4 border-b border-slate-100 bg-white sticky top-0 z-10">
                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                       type="text" 
                       placeholder="Tìm kiếm theo tên học viên..." 
                       className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                 </div>
              </div>

              <div className="overflow-y-auto p-4 bg-slate-50 min-h-[300px]">
                 <div className="space-y-3">
                    {PENDING_WON_DEALS.map((deal) => (
                       <div key={deal.id} className="bg-white p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all flex justify-between items-center group">
                          <div className="flex items-start gap-3">
                             <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold shrink-0">
                                {deal.customer.charAt(0)}
                             </div>
                             <div>
                                <h4 className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors">{deal.customer}</h4>
                                <div className="flex items-center gap-2 text-sm text-slate-600 mt-0.5">
                                   <span className="font-medium">{deal.product}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                   <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">{deal.id}</span>
                                   <span className="text-xs text-slate-400">• Won: {deal.date}</span>
                                   <span className="text-xs text-slate-400">• Sale: {deal.owner}</span>
                                </div>
                             </div>
                          </div>
                          <button 
                             onClick={() => handleCreateCase(deal.id)}
                             className="px-4 py-2 bg-[#0d47a1] text-white text-xs font-bold rounded-lg hover:bg-blue-800 flex items-center gap-1 shadow-sm whitespace-nowrap"
                          >
                             Tạo Hồ sơ <ArrowRight size={12} />
                          </button>
                       </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default StudyAbroadPipeline;
