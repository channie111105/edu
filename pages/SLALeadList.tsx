
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Phone, 
  Clock, 
  AlertOctagon, 
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ListTodo
} from 'lucide-react';

interface ISLALead {
  id: string;
  name: string;
  phone: string;
  source: string;
  timeWaiting: string;
  minutesWaiting: number;
  status: 'Danger' | 'Warning' | 'Normal';
}

// Mock Data (Expanded from Dashboard)
const SLA_LEADS_DATA: ISLALead[] = [
  { id: 'L-991', name: 'Trần Văn Hùng', phone: '0912 345 ***', timeWaiting: '45 phút', minutesWaiting: 45, status: 'Danger', source: 'Facebook Ads' },
  { id: 'L-992', name: 'Lê Thị Mai', phone: '0909 123 ***', timeWaiting: '32 phút', minutesWaiting: 32, status: 'Danger', source: 'Hotline' },
  { id: 'L-993', name: 'Nguyễn Quốc Bảo', phone: '0988 777 ***', timeWaiting: '12 phút', minutesWaiting: 12, status: 'Warning', source: 'Web Form' },
  { id: 'L-994', name: 'Phạm Thị Hương', phone: '0977 111 ***', timeWaiting: '8 phút', minutesWaiting: 8, status: 'Warning', source: 'Zalo' },
  { id: 'L-995', name: 'Hoàng Văn Nam', phone: '0912 999 ***', timeWaiting: '2 phút', minutesWaiting: 2, status: 'Normal', source: 'Referral' },
  { id: 'L-996', name: 'Vũ Minh Tuấn', phone: '0933 888 ***', timeWaiting: '1 phút', minutesWaiting: 1, status: 'Normal', source: 'Website' },
];

const SLALeadList: React.FC = () => {
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState<'All' | 'Danger' | 'Warning' | 'Normal'>('All');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLeads = useMemo(() => {
    return SLA_LEADS_DATA.filter(lead => {
      const matchesStatus = filterStatus === 'All' || lead.status === filterStatus;
      const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            lead.phone.includes(searchTerm);
      return matchesStatus && matchesSearch;
    });
  }, [filterStatus, searchTerm]);

  const handleCall = (leadId: string) => {
    // Navigate to Pipeline and pass the lead ID to highlight
    navigate('/pipeline', { state: { highlightLeadId: leadId } });
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#0d141b] font-sans overflow-hidden">
      <div className="flex flex-col flex-1 p-6 lg:p-8 max-w-[1200px] mx-auto w-full gap-6 overflow-y-auto">
        
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
               <ListTodo className="text-blue-600" /> Danh sách Lead cần xử lý (SLA)
            </h1>
            <p className="text-slate-500 text-sm">Quản lý các lead đang chờ theo mức độ ưu tiên và thời gian chờ.</p>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center">
           <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                 type="text" 
                 placeholder="Tìm tên, số điện thoại..." 
                 className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>
           
           <div className="flex gap-2">
              <button 
                onClick={() => setFilterStatus('All')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${filterStatus === 'All' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                Tất cả
              </button>
              <button 
                onClick={() => setFilterStatus('Danger')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-1 ${filterStatus === 'Danger' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
              >
                <AlertOctagon size={14} /> Nguy hiểm ({SLA_LEADS_DATA.filter(l => l.status === 'Danger').length})
              </button>
              <button 
                onClick={() => setFilterStatus('Warning')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-1 ${filterStatus === 'Warning' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'}`}
              >
                <AlertTriangle size={14} /> Cảnh báo ({SLA_LEADS_DATA.filter(l => l.status === 'Warning').length})
              </button>
              <button 
                onClick={() => setFilterStatus('Normal')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-1 ${filterStatus === 'Normal' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
              >
                <CheckCircle2 size={14} /> Bình thường
              </button>
           </div>
        </div>

        {/* Lead List Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
           <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                 <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-[30%]">Họ tên & Nguồn</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái SLA</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Thời gian chờ</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Hành động</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                 {filteredLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                       <td className="px-6 py-4">
                          <div className="flex flex-col">
                             <span className="text-sm font-bold text-slate-900">{lead.name}</span>
                             <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">{lead.source}</span>
                                <span className="text-xs text-slate-400">{lead.phone}</span>
                             </div>
                          </div>
                       </td>
                       <td className="px-6 py-4">
                          {lead.status === 'Danger' && (
                             <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 animate-pulse">
                                <AlertOctagon size={12} /> Cần xử lý ngay
                             </span>
                          )}
                          {lead.status === 'Warning' && (
                             <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                                <AlertTriangle size={12} /> Sắp quá hạn
                             </span>
                          )}
                          {lead.status === 'Normal' && (
                             <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                                <CheckCircle2 size={12} /> Trong hạn
                             </span>
                          )}
                       </td>
                       <td className="px-6 py-4">
                          <span className={`text-sm font-bold flex items-center gap-1 ${
                             lead.status === 'Danger' ? 'text-red-600' : 
                             lead.status === 'Warning' ? 'text-amber-600' : 'text-slate-600'
                          }`}>
                             <Clock size={16} /> {lead.timeWaiting}
                          </span>
                       </td>
                       <td className="px-6 py-4 text-right">
                          <button 
                             onClick={() => handleCall(lead.id)}
                             className="inline-flex items-center gap-2 bg-[#1380ec] hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all transform active:scale-95"
                          >
                             <Phone size={16} /> Gọi ngay
                          </button>
                       </td>
                    </tr>
                 ))}
                 
                 {filteredLeads.length === 0 && (
                    <tr>
                       <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                          Không tìm thấy lead nào phù hợp.
                       </td>
                    </tr>
                 )}
              </tbody>
           </table>
        </div>

      </div>
    </div>
  );
};

export default SLALeadList;
