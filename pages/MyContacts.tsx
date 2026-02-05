import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getContacts } from '../utils/storage';
import {
   Search,
   Phone,
   Mail,
   MapPin,
   Plus,
   Building2,
   User
} from 'lucide-react';
import ContactDrawer from '../components/ContactDrawer';
import { IContact } from '../types';

const MyContacts: React.FC = () => {
   const { user } = useAuth();
   const navigate = useNavigate();
   const [contacts, setContacts] = useState<IContact[]>([]);
   const [searchTerm, setSearchTerm] = useState('');
   const [selectedContact, setSelectedContact] = useState<IContact | null>(null);
   const [isDrawerOpen, setIsDrawerOpen] = useState(false);

   useEffect(() => {
      // Lấy dữ liệu từ bảng CONTACTS
      const allContacts = getContacts();
      setContacts(allContacts);
   }, []);

   const filteredContacts = contacts.filter(c =>
      (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone || '').includes(searchTerm)
   );

   const getInitials = (name: string) => {
      const names = name.split(' ');
      if (names.length >= 2) {
         return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
   };

   return (
      <div className="flex flex-col h-full bg-[#f8fafc] font-sans text-slate-900 p-6 overflow-hidden">

         {/* Header & Search */}
         <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <h1 className="text-2xl font-bold text-slate-800">Danh bạ (Contacts)</h1>
            <div className="relative w-full md:w-96">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
               <input
                  type="text"
                  placeholder="Tìm kiếm..."
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-300 outline-none transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
               />
            </div>
         </div>

         {/* Content Grid */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-y-auto pb-10">

            {/* 1. New Contact Card */}
            <button className="flex flex-col items-center justify-center h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg hover:bg-white hover:border-blue-300 hover:shadow-sm transition-all group cursor-pointer">
               <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center mb-2 group-hover:bg-blue-100 transition-colors">
                  <Plus size={24} className="text-slate-400 group-hover:text-blue-600" />
               </div>
               <span className="text-xs font-bold text-slate-400 group-hover:text-blue-600 uppercase tracking-wide">New Contact</span>
            </button>

            {/* 2. Contact Cards */}
            {filteredContacts.map(contact => (
               <div key={contact.id} className="bg-white p-4 rounded-lg border border-slate-100 shadow-sm hover:shadow-md transition-all flex gap-4 items-start group cursor-pointer" onClick={() => { setSelectedContact(contact); setIsDrawerOpen(true); }}>
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-lg shrink-0 uppercase">
                     {getInitials(contact.name || 'Unknown')}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                     <div className="flex justify-between items-start">
                        <div>
                           <h3 className="font-bold text-slate-800 text-sm truncate group-hover:text-blue-600 transition-colors" title={contact.name}>
                              {contact.name}
                           </h3>
                           <p className="text-[10px] uppercase font-bold text-slate-400 mt-0.5 flex items-center gap-1">
                              {(contact as any).company ? <Building2 size={10} /> : <User size={10} />}
                              {(contact as any).company ? 'Company' : 'Individual'}
                           </p>
                        </div>
                     </div>

                     <div className="mt-3 space-y-1.5">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                           <MapPin size={12} className="text-slate-300" />
                           <span className="truncate">{contact.city || contact.address || 'Chưa cập nhật'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                           <Mail size={12} className="text-slate-300" />
                           <span className="truncate">{contact.email || 'No email'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                           <Phone size={12} className="text-slate-300" />
                           <span className="truncate">{contact.phone}</span>
                        </div>
                     </div>
                  </div>
               </div>
            ))}
         </div>

         <ContactDrawer
            contact={selectedContact}
            isOpen={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
            onUpdate={(updated) => {
               setContacts(prev => prev.map(c => c.id === updated.id ? updated : c));
               setSelectedContact(updated);
            }}
         />
      </div>
   );
};

export default MyContacts;
