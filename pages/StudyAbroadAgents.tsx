
import React from 'react';
import { 
  Network, 
  UserPlus, 
  Search, 
  Filter, 
  MapPin, 
  Users, 
  TrendingUp, 
  DollarSign 
} from 'lucide-react';

const AGENTS = [
  { id: 'AG-01', name: 'Trung tâm Tiếng Đức ABC', contact: 'Mr. Tuấn', phone: '0912xxx', location: 'Hải Phòng', students: 12, commission: '25%', status: 'Active' },
  { id: 'AG-02', name: 'Du học Á Âu', contact: 'Ms. Lan', phone: '0903xxx', location: 'Đà Nẵng', students: 5, commission: '20%', status: 'Active' },
  { id: 'AG-03', name: 'Cộng tác viên Cá nhân', contact: 'Nguyễn Văn A', phone: '0987xxx', location: 'Hà Nội', students: 2, commission: '15%', status: 'Inactive' },
];

const StudyAbroadAgents: React.FC = () => {
  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#0d141b] font-sans overflow-y-auto">
      <div className="flex flex-col flex-1 p-6 lg:p-10 max-w-[1600px] mx-auto w-full gap-8">
        
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
               <Network className="text-blue-600" /> Quản lý Cộng tác viên (B2B)
            </h1>
            <p className="text-slate-500 mt-1">Mạng lưới Sub-agent và đối tác tuyển sinh.</p>
          </div>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm hover:bg-blue-700 transition-colors flex items-center gap-2">
             <UserPlus size={18} /> Thêm Đại lý mới
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex gap-4">
           <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Tìm tên đại lý, người liên hệ..." />
           </div>
           <button className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 flex items-center gap-2 hover:bg-slate-100">
              <Filter size={16} /> Khu vực
           </button>
        </div>

        {/* Agents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {AGENTS.map(agent => (
              <div key={agent.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
                 <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                       <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold text-lg">
                          {agent.name.charAt(0)}
                       </div>
                       <div>
                          <h3 className="font-bold text-slate-900 text-base">{agent.name}</h3>
                          <p className="text-xs text-slate-500">{agent.contact} • {agent.phone}</p>
                       </div>
                    </div>
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${agent.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                       {agent.status}
                    </span>
                 </div>
                 
                 <div className="grid grid-cols-3 gap-2 py-4 border-t border-b border-slate-50 mb-4">
                    <div className="text-center border-r border-slate-50">
                       <p className="text-xs text-slate-400 uppercase font-bold mb-1">Khu vực</p>
                       <p className="text-sm font-bold text-slate-800 flex items-center justify-center gap-1"><MapPin size={12}/> {agent.location}</p>
                    </div>
                    <div className="text-center border-r border-slate-50">
                       <p className="text-xs text-slate-400 uppercase font-bold mb-1">Học sinh</p>
                       <p className="text-sm font-bold text-slate-800 flex items-center justify-center gap-1"><Users size={12}/> {agent.students}</p>
                    </div>
                    <div className="text-center">
                       <p className="text-xs text-slate-400 uppercase font-bold mb-1">Hoa hồng</p>
                       <p className="text-sm font-bold text-emerald-600 flex items-center justify-center gap-1"><DollarSign size={12}/> {agent.commission}</p>
                    </div>
                 </div>

                 <div className="flex gap-2">
                    <button className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 py-2 rounded-lg text-xs font-bold transition-colors">
                       Xem Hồ sơ
                    </button>
                    <button className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1">
                       <TrendingUp size={14} /> Referral
                    </button>
                 </div>
              </div>
           ))}
        </div>

      </div>
    </div>
  );
};

export default StudyAbroadAgents;
