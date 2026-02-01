
import React, { useState } from 'react';
import { 
  Ticket, 
  CalendarDays, 
  MapPin, 
  Users, 
  QrCode, 
  Plus, 
  MoreHorizontal,
  CheckCircle2,
  ArrowLeft,
  Search,
  Scan
} from 'lucide-react';

interface Registrant {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'Registered' | 'Checked-in';
  checkInTime?: string;
}

const INITIAL_REGISTRANTS: Registrant[] = [
  { id: 'REG-001', name: 'Nguyễn Văn A', email: 'vana@gmail.com', phone: '0912xxx', status: 'Registered' },
  { id: 'REG-002', name: 'Trần Thị B', email: 'tranb@gmail.com', phone: '0903xxx', status: 'Checked-in', checkInTime: '08:45' },
  { id: 'REG-003', name: 'Lê Văn C', email: 'levanc@gmail.com', phone: '0987xxx', status: 'Registered' },
  { id: 'REG-004', name: 'Phạm Thị D', email: 'phamd@gmail.com', phone: '0933xxx', status: 'Registered' },
  { id: 'REG-005', name: 'Hoàng Văn E', email: 'hoange@gmail.com', phone: '0944xxx', status: 'Checked-in', checkInTime: '09:05' },
];

const EVENTS = [
  { 
    id: 1, title: 'Hội thảo Du học Đức 2024', date: '25/10/2024', time: '09:00 - 12:00', location: 'Khách sạn Melia, Hà Nội', 
    registered: 150, checkedIn: 2, status: 'Upcoming', image: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&q=80&w=300&h=200' 
  },
  { 
    id: 2, title: 'Workshop: Bí kíp học tiếng Đức', date: '15/10/2024', time: '14:00 - 16:00', location: 'Văn phòng ULA', 
    registered: 45, checkedIn: 40, status: 'Completed', image: 'https://images.unsplash.com/photo-1544531586-fde5298cdd40?auto=format&fit=crop&q=80&w=300&h=200' 
  },
];

const MarketingEvents: React.FC = () => {
  const [viewMode, setViewMode] = useState<'list' | 'checkin'>('list');
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [registrants, setRegistrants] = useState<Registrant[]>(INITIAL_REGISTRANTS);
  const [searchTerm, setSearchTerm] = useState('');

  const handleOpenCheckIn = (eventId: number) => {
    setSelectedEventId(eventId);
    setViewMode('checkin');
  };

  const handleCheckIn = (id: string) => {
    setRegistrants(prev => prev.map(r => {
      if (r.id === id && r.status === 'Registered') {
        const now = new Date();
        const timeString = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
        return { ...r, status: 'Checked-in', checkInTime: timeString };
      }
      return r;
    }));
  };

  const filteredRegistrants = registrants.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.phone.includes(searchTerm) ||
    r.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const checkedInCount = registrants.filter(r => r.status === 'Checked-in').length;
  const totalCount = registrants.length;

  const selectedEvent = EVENTS.find(e => e.id === selectedEventId);

  // --- VIEW: EVENT LIST ---
  if (viewMode === 'list') {
    return (
      <div className="flex flex-col h-full bg-[#f8fafc] text-[#0d141b] font-sans overflow-y-auto">
        <div className="flex flex-col flex-1 p-6 lg:p-10 max-w-[1600px] mx-auto w-full gap-8">
          
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                 <Ticket className="text-purple-600" /> Quản lý Sự kiện & Hội thảo
              </h1>
              <p className="text-slate-500 mt-1">Tổ chức sự kiện, check-in khách mời và chuyển đổi Lead.</p>
            </div>
            <button className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm hover:bg-purple-700 transition-colors flex items-center gap-2">
               <Plus size={18} /> Tạo Sự kiện
            </button>
          </div>
  
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {EVENTS.map(event => (
                <div key={event.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
                   <div className="h-40 bg-slate-200 relative">
                      <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
                      <span className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold uppercase shadow-sm ${event.status === 'Upcoming' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-white'}`}>
                         {event.status}
                      </span>
                   </div>
                   <div className="p-5">
                      <h3 className="font-bold text-lg text-slate-900 mb-2 group-hover:text-purple-600 transition-colors">{event.title}</h3>
                      <div className="space-y-2 mb-4">
                         <div className="flex items-center gap-2 text-sm text-slate-600">
                            <CalendarDays size={16} className="text-slate-400" /> {event.date} • {event.time}
                         </div>
                         <div className="flex items-center gap-2 text-sm text-slate-600">
                            <MapPin size={16} className="text-slate-400" /> {event.location}
                         </div>
                         <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Users size={16} className="text-slate-400" /> {event.registered} Đăng ký
                            {event.status === 'Completed' && <span className="text-green-600 font-bold ml-1">({event.checkedIn} check-in)</span>}
                         </div>
                      </div>
                      
                      <div className="flex gap-2 pt-4 border-t border-slate-100">
                         {event.status === 'Upcoming' ? (
                            <button 
                              onClick={() => handleOpenCheckIn(event.id)}
                              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                            >
                               <QrCode size={16} /> Check-in Desk
                            </button>
                         ) : (
                            <button className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors">
                               <CheckCircle2 size={16} /> Xem Báo cáo
                            </button>
                         )}
                         <button className="px-3 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600">
                            <MoreHorizontal size={18} />
                         </button>
                      </div>
                   </div>
                </div>
             ))}
          </div>
  
        </div>
      </div>
    );
  }

  // --- VIEW: CHECK-IN DESK ---
  return (
    <div className="flex flex-col h-full bg-slate-100 text-[#0d141b] font-sans overflow-hidden">
       {/* Desk Header */}
       <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-4">
             <button onClick={() => setViewMode('list')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                <ArrowLeft size={24} />
             </button>
             <div>
                <h2 className="text-xl font-bold text-slate-900 leading-tight">{selectedEvent?.title}</h2>
                <p className="text-sm text-slate-500">Check-in Desk • {selectedEvent?.date}</p>
             </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="text-right hidden sm:block">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Đã Check-in</p>
                <p className="text-2xl font-black text-purple-600 leading-none">{checkedInCount} <span className="text-slate-400 text-lg">/ {totalCount}</span></p>
             </div>
             <button className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-slate-800">
                <Scan size={18} /> Quét QR
             </button>
          </div>
       </div>

       {/* Check-in List */}
       <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-4xl mx-auto w-full">
          
          <div className="relative mb-6">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
             <input 
                autoFocus
                type="text" 
                placeholder="Tìm tên, số điện thoại, mã vé..." 
                className="w-full pl-12 pr-4 py-3 rounded-xl border-none shadow-sm text-lg focus:ring-2 focus:ring-purple-500 outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
             />
          </div>

          <div className="space-y-3">
             {filteredRegistrants.map((reg) => (
                <div key={reg.id} className={`bg-white p-4 rounded-xl shadow-sm border transition-all flex items-center justify-between ${reg.status === 'Checked-in' ? 'border-green-200 bg-green-50/30' : 'border-slate-200'}`}>
                   <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${reg.status === 'Checked-in' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                         {reg.name.charAt(0)}
                      </div>
                      <div>
                         <h3 className="font-bold text-slate-900 text-lg">{reg.name}</h3>
                         <div className="flex items-center gap-3 text-sm text-slate-500">
                            <span>{reg.phone}</span>
                            <span>•</span>
                            <span className="font-mono text-xs bg-slate-100 px-1.5 rounded">{reg.id}</span>
                         </div>
                      </div>
                   </div>

                   <div>
                      {reg.status === 'Checked-in' ? (
                         <div className="text-right">
                            <span className="flex items-center gap-1 text-green-600 font-bold text-sm">
                               <CheckCircle2 size={18} /> Đã vào
                            </span>
                            <span className="text-xs text-slate-400">{reg.checkInTime}</span>
                         </div>
                      ) : (
                         <button 
                            onClick={() => handleCheckIn(reg.id)}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-lg font-bold shadow-md transition-transform active:scale-95"
                         >
                            Check-in
                         </button>
                      )}
                   </div>
                </div>
             ))}

             {filteredRegistrants.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                   <p>Không tìm thấy khách mời nào.</p>
                </div>
             )}
          </div>
       </div>
    </div>
  );
};

export default MarketingEvents;
