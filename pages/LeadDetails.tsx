
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLeadById, saveLead, addMeeting } from '../utils/storage';
import { useAuth } from '../contexts/AuthContext';
import { getLeadStatusLabel, isLeadStatusOneOf, LEAD_STATUS_KEYS, LEAD_STATUS_OPTIONS, normalizeLeadStatusKey, toLeadStatusValue } from '../utils/leadStatus';
import ConvertLeadModal, { ConvertLeadModalSubmitData } from '../components/ConvertLeadModal';
import { convertLeadToOpportunity } from '../utils/leadConversion';
import {
   ArrowLeft, Phone, Mail, MessageCircle, Clock,
   User, CheckCircle2,
   ChevronDown, UserPlus, PhoneOutgoing,
   Send, FileText, Save, Layout, Calendar
} from 'lucide-react';
import { LeadStatus, ILead, UserRole, IMeeting, MeetingStatus, MeetingType } from '../types';

interface IActivity {
   id: string;
   type: 'system' | 'note' | 'email' | 'call' | 'meeting';
   content: string;
   subContent?: string;
   timestamp: string;
   isSystem?: boolean;
}

const LeadDetails: React.FC = () => {
   const { id } = useParams();
   const navigate = useNavigate();
   const { user } = useAuth();

   const [lead, setLead] = useState<ILead | null>(null);

   // Sales Form State
   const [formData, setFormData] = useState<Partial<ILead>>({});
   const [studentInfo, setStudentInfo] = useState<any>({});

   const [noteContent, setNoteContent] = useState('');
   const [activityType, setActivityType] = useState<'note' | 'meeting'>('note');
   const [meetingDate, setMeetingDate] = useState('');
   const [meetingType, setMeetingType] = useState<MeetingType | ''>('');

   const [activeTab, setActiveTab] = useState<'timeline' | 'notes' | 'email'>('timeline');
   const [activities, setActivities] = useState<IActivity[]>([]);
   const [showConvertModal, setShowConvertModal] = useState(false);

   // Check Permissions
   const isSalesRole = user && [UserRole.SALES_REP, UserRole.SALES_LEADER, UserRole.ADMIN].includes(user.role);

   // Load Lead
   useEffect(() => {
      if (id) {
         const foundLead = getLeadById(id);
         if (foundLead) {
            setLead(foundLead);
            setFormData(foundLead);
            setStudentInfo(foundLead.studentInfo || {});

            // CLEANUP: Removed mock interaction history as requested. Only show system init log.
            setActivities([
               {
                  id: 'sys-1', type: 'system', content: 'Lead Ä‘Æ°á»£c phÃ¢n bá»•', subContent: `Nguá»“n: ${foundLead.source}`, timestamp: new Date(foundLead.createdAt).toLocaleString(), isSystem: true
               }
            ]);
         }
      }
   }, [id]);

   const handleInputChange = (field: keyof ILead, value: any) => {
      setFormData(prev => ({ ...prev, [field]: value }));
   };

   const handleStudentInfoChange = (field: string, value: any) => {
      setStudentInfo((prev: any) => ({ ...prev, [field]: value }));
   };

   const handleSaveInfo = () => {
      if (lead) {
         const updatedLead = { ...lead, ...formData, studentInfo };
         saveLead(updatedLead);
         setLead(updatedLead);
         alert('ÄÃ£ lÆ°u thÃ´ng tin Lead thÃ nh cÃ´ng!');
      }
   };

   const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (lead) {
         const newStatus = toLeadStatusValue(e.target.value) as LeadStatus;
         const updatedLead = { ...lead, status: newStatus };
         saveLead(updatedLead);
         setLead(updatedLead);

         setActivities([{
            id: `st-${Date.now()}`,
            type: 'system',
            content: `Thay Ä‘á»•i tráº¡ng thÃ¡i`,
            subContent: `Chuyá»ƒn sang ${newStatus}`,
            timestamp: 'Vá»«a xong',
            isSystem: true
         }, ...activities]);
      }
   };

   const handleSendActivity = () => {
      if (!noteContent.trim() && activityType === 'note') return;
      if (activityType === 'meeting' && !meetingDate) {
         alert('Vui lÃ²ng chá»n thá»i gian lá»‹ch háº¹n');
         return;
      }
      if (activityType === 'meeting' && !meetingType) {
         alert('Vui lÃ²ng chá»n hÃ¬nh thá»©c háº¹n (Online/Offline)');
         return;
      }

      // 1. Logic Create Meeting
      if (activityType === 'meeting' && lead) {
         const shouldMarkCared = isLeadStatusOneOf(String(lead.status || ''), [LEAD_STATUS_KEYS.NEW, LEAD_STATUS_KEYS.ASSIGNED, LEAD_STATUS_KEYS.PICKED]);
         const updatedLead = shouldMarkCared ? { ...lead, status: LeadStatus.CONTACTED } : lead;
         if (shouldMarkCared) {
            saveLead(updatedLead);
            setLead(updatedLead);
         }
         const newMeeting: IMeeting = {
            id: `M-${Date.now()}`,
            title: `Lá»‹ch háº¹n: ${lead.name}`,
            leadId: lead.id,
            leadName: lead.name,
            leadPhone: lead.phone,
            salesPersonId: lead.ownerId,
            salesPersonName: user?.name || 'Sales Rep', // Simplified, in real app get from users list
            campus: formData.company || 'Hanoi',
            address: lead.address || formData.address,
            datetime: meetingDate,
            type: meetingType as MeetingType,
            status: MeetingStatus.DRAFT,
            notes: noteContent,
            createdAt: new Date().toISOString()
         };
         addMeeting(newMeeting);

         const meetingActivity: IActivity = {
            id: `mt-${Date.now()}`,
            type: 'meeting',
            content: `ÄÃ£ táº¡o lá»‹ch háº¹n: ${meetingType}`,
            subContent: `Thá»i gian: ${new Date(meetingDate).toLocaleString('vi-VN')} - Note: ${noteContent}`,
            timestamp: 'Vá»«a xong',
            isSystem: false
         };
         setActivities([meetingActivity, ...activities]);
         setNoteContent('');
         setMeetingDate('');
         setActivityType('note'); // Reset
         alert('ÄÃ£ táº¡o lá»‹ch háº¹n thÃ nh cÃ´ng!');
      } else {
         if (lead) {
            const shouldMarkCared = isLeadStatusOneOf(String(lead.status || ''), [LEAD_STATUS_KEYS.NEW, LEAD_STATUS_KEYS.ASSIGNED, LEAD_STATUS_KEYS.PICKED]);
            if (shouldMarkCared) {
               const updatedLead = { ...lead, status: LeadStatus.CONTACTED };
               saveLead(updatedLead);
               setLead(updatedLead);
            }
         }
         // 2. Logic Normal Note
         const newNote: IActivity = {
            id: `note-${Date.now()}`,
            type: 'note',
            content: 'Ghi chÃº cuá»™c gá»i / ChÄƒm sÃ³c',
            subContent: noteContent,
            timestamp: 'Vá»«a xong',
            isSystem: false
         };
         setActivities([newNote, ...activities]);
         setNoteContent('');
      }
   };

   // --- LOGIC CHUYỂN ĐỔI ---
   const handleConvert = () => {
      if (!lead) return;

      if (!studentInfo.targetCountry) {
         alert('Vui lòng chọn Quốc gia mục tiêu trước khi chuyển đổi.');
         return;
      }

      if (!formData.name || !formData.phone) {
         alert('Thiếu thông tin Họ tên hoặc SĐT.');
         return;
      }

      setShowConvertModal(true);
   };

   const handleConfirmConvert = ({ ownerId, salesChannel, conversionAction, customerAction, targetDealId }: ConvertLeadModalSubmitData) => {
      if (!lead) return;

      const resolvedOwnerId = ownerId || lead.ownerId || user?.id || 'admin';

      const leadToConvert: ILead = {
         ...lead,
         ...formData,
         ownerId: resolvedOwnerId,
         studentInfo: {
            ...(lead.studentInfo || {}),
            ...studentInfo
         },
         status: LeadStatus.CONVERTED,
         targetCountry: studentInfo.targetCountry || lead.targetCountry || 'Đức',
      } as ILead;

      const { deal } = convertLeadToOpportunity(leadToConvert, {
         ownerId: resolvedOwnerId,
         salesChannel,
         conversionAction,
         customerAction,
         targetDealId,
      });
      const updatedLead: ILead = {
         ...leadToConvert,
         status: LeadStatus.CONVERTED,
         updatedAt: new Date().toISOString()
      };

      saveLead(updatedLead);
      setLead(updatedLead);
      setShowConvertModal(false);
      navigate('/pipeline', { state: { highlightLeadId: deal.id } });
   };

   if (!lead) return <div className="p-10 text-center">Loading Lead...</div>;

   // --- SALES REP VIEW (Process Now - 3 Columns) ---
   return (
      <div className="flex flex-col h-screen bg-slate-50 text-[#111418] font-sans overflow-hidden">

         {/* HEADER */}
         <header className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-white shrink-0 z-20 shadow-sm">
            <div className="flex items-center gap-4">
               <button onClick={() => navigate(-1)} className="text-slate-500 hover:text-slate-800 transition-colors">
                  <ArrowLeft size={20} />
               </button>
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                     {lead.name.charAt(0)}
                  </div>
                  <div>
                     <h1 className="text-base font-bold leading-none text-slate-900">{lead.name}</h1>
                     <p className="text-xs text-slate-500 mt-1">ID: {lead.id}</p>
                  </div>
               </div>
            </div>
            <div className="flex items-center gap-3">
               <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-green-200 text-green-700 bg-green-50 text-sm font-bold hover:bg-green-100 transition-colors">
                  <PhoneOutgoing size={16} /> Gá»i Ä‘iá»‡n
               </button>
                <button
                   onClick={handleConvert}
                   className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1380ec] text-white text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm"
                >
                   <UserPlus size={16} /> Chuyển đổi
                </button>
               <button
                  onClick={() => navigate(`/leads/${id}/sla`)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-amber-200 text-amber-700 bg-amber-50 text-sm font-bold hover:bg-amber-100 transition-colors"
               >
                  <Clock size={16} /> Check SLA
               </button>
            </div>
         </header>

         {/* MAIN LAYOUT (3 COLUMNS) */}
         <div className="flex flex-1 overflow-hidden">
            {/* COL 1: LEAD INFO FORM (Scrollable) */}
            <aside className="w-[380px] bg-white border-r border-slate-200 flex flex-col shrink-0 h-full overflow-hidden">
               <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">THÃ”NG TIN LEAD</h3>
                  <button onClick={handleSaveInfo} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs font-bold">
                     <Save size={14} /> LÆ°u
                  </button>
               </div>

               <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">

                  {/* Contact Info with Icons */}
                  <div className="space-y-3">
                     {/* Phone */}
                     <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                           <Phone size={16} className="text-blue-600" />
                        </div>
                        <div className="flex-1">
                           <p className="text-[10px] text-slate-500 font-medium mb-0.5">Sá»‘ Ä‘iá»‡n thoáº¡i</p>
                           <input
                              className="w-full bg-transparent text-sm font-bold text-slate-900 focus:outline-none"
                              placeholder="0901 234 567"
                              value={formData.phone || ''}
                              onChange={(e) => handleInputChange('phone', e.target.value)}
                           />
                        </div>
                     </div>

                     {/* Email */}
                     <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                           <Mail size={16} className="text-purple-600" />
                        </div>
                        <div className="flex-1">
                           <p className="text-[10px] text-slate-500 font-medium mb-0.5">Email (LiÃªn há»‡)</p>
                           <input
                              className="w-full bg-transparent text-sm text-slate-700 focus:outline-none"
                              placeholder="nam.nguyen@example.com"
                              value={formData.email || ''}
                              onChange={(e) => handleInputChange('email', e.target.value)}
                           />
                        </div>
                     </div>

                     {/* Zalo */}
                     <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                           <MessageCircle size={16} className="text-green-600" />
                        </div>
                        <div className="flex-1">
                           <p className="text-[10px] text-slate-500 font-medium mb-0.5">Sá»‘ Zalo</p>
                           <div className="flex items-center gap-2">
                              <input
                                 className="flex-1 bg-transparent text-sm text-blue-600 focus:outline-none"
                                 placeholder="zalo.me/0901234567"
                                 value={studentInfo.socialLink || ''}
                                 onChange={(e) => handleStudentInfoChange('socialLink', e.target.value)}
                              />
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* Nguá»“n & PhÃ¢n loáº¡i */}
                  <div>
                     <h4 className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wide">Nguá»“n & PhÃ¢n loáº¡i</h4>
                     <div className="space-y-3">
                        <div>
                           <label className="text-[10px] text-slate-500 font-bold block mb-1.5">Nguá»“n</label>
                           <select
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 outline-none focus:border-blue-500"
                              value={formData.source}
                              onChange={(e) => handleInputChange('source', e.target.value)}
                           >
                              <option value="fb_lead_form">fb_lead_form</option>
                              <option value="hotline">Hotline</option>
                              <option value="sale_tu_kiem_ca_nhan">Sale tá»± kiáº¿m</option>
                           </select>
                        </div>
                        <div>
                           <label className="text-[10px] text-slate-500 font-bold block mb-1.5">ChÆ°Æ¡ng trÃ¬nh</label>
                           <select
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-blue-600 outline-none focus:border-blue-500"
                              value={formData.program}
                              onChange={(e) => handleInputChange('program', e.target.value)}
                           >
                              <option value="Tiáº¿ng Äá»©c">Tiáº¿ng Äá»©c</option>
                              <option value="Tiáº¿ng Trung">Tiáº¿ng Trung</option>
                              <option value="Du há»c Äá»©c">Du há»c Äá»©c</option>
                              <option value="Du há»c Trung">Du há»c Trung</option>
                           </select>
                        </div>
                     </div>
                  </div>

                  {/* 2. CHUYÃŠN MÃ”N (QUAN TRá»ŒNG) */}
                  <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                     <h4 className="text-xs font-bold text-blue-700 mb-3 flex items-center gap-1">
                        <CheckCircle2 size={14} /> 2. Má»¤C TIÃŠU & NHU Cáº¦U
                     </h4>
                     <div className="space-y-3">
                        <div>
                           <label className="text-[10px] text-slate-500 font-bold block mb-1">Quá»‘c gia má»¥c tiÃªu <span className="text-red-500">*</span></label>
                           <select
                              className="w-full px-2 py-2 bg-white border border-slate-200 rounded text-sm text-slate-900 outline-none focus:border-blue-500"
                              value={studentInfo.targetCountry || ''}
                              onChange={(e) => handleStudentInfoChange('targetCountry', e.target.value)}
                           >
                              <option value="">-- Chá»n quá»‘c gia --</option>
                              <option value="Äá»©c">ðŸ‡©ðŸ‡ª Äá»©c</option>
                              <option value="Trung Quá»‘c">ðŸ‡¨ðŸ‡³ Trung Quá»‘c</option>
                              <option value="KhÃ¡c">ðŸ³ï¸ KhÃ¡c</option>
                           </select>
                        </div>
                        <div>
                           <label className="text-[10px] text-slate-500 font-bold block mb-1">Sáº£n pháº©m quan tÃ¢m</label>
                           <select
                              className="w-full px-2 py-2 bg-white border border-slate-200 rounded text-sm font-bold text-slate-900 outline-none focus:border-blue-500"
                              value={formData.program}
                              onChange={(e) => handleInputChange('program', e.target.value)}
                           >
                              <option value="Tiáº¿ng Äá»©c">Tiáº¿ng Äá»©c</option>
                              <option value="Tiáº¿ng Trung">Tiáº¿ng Trung</option>
                              <option value="Du há»c Äá»©c">Du há»c Äá»©c</option>
                              <option value="Du há»c Trung">Du há»c Trung</option>
                           </select>
                        </div>
                     </div>
                  </div>

                  {/* 3. THÃ”NG TIN Bá»” SUNG (CHO Há»’ SÆ ) */}
                  <div>
                     <h4 className="text-xs font-bold text-blue-600 mb-3 flex items-center gap-1">
                        <FileText size={14} /> 3. Há»’ SÆ  CÃ NHÃ‚N
                     </h4>
                     <div className="space-y-3">
                        {/* Phá»¥ huynh - Quan trá»ng */}
                        <div className="bg-slate-50 p-2 rounded border border-slate-200">
                           <label className="text-[10px] text-slate-500 font-bold block mb-1">ThÃ´ng tin Phá»¥ huynh</label>
                           <input
                              className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-sm mb-2 outline-none"
                              placeholder="Há» tÃªn Bá»‘/Máº¹"
                              value={studentInfo.parentName || ''}
                              onChange={(e) => handleStudentInfoChange('parentName', e.target.value)}
                           />
                           <input
                              className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-sm outline-none"
                              placeholder="SÄT Phá»¥ huynh"
                              value={studentInfo.parentPhone || ''}
                              onChange={(e) => handleStudentInfoChange('parentPhone', e.target.value)}
                           />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                           <div>
                              <label className="text-[10px] text-slate-500 font-bold block mb-1">NgÃ y sinh</label>
                              <input
                                 type="date"
                                 className="w-full px-2 py-2 bg-white border border-slate-200 rounded text-sm text-slate-900 outline-none"
                                 value={studentInfo.dob || ''}
                                 onChange={(e) => handleStudentInfoChange('dob', e.target.value)}
                              />
                           </div>
                           <div>
                              <label className="text-[10px] text-slate-500 font-bold block mb-1">Giá»›i tÃ­nh</label>
                              <select
                                 className="w-full px-2 py-2 bg-white border border-slate-200 rounded text-sm text-slate-900 outline-none"
                                 value={studentInfo.gender || ''}
                                 onChange={(e) => handleStudentInfoChange('gender', e.target.value)}
                              >
                                 <option value="">-- Chá»n --</option>
                                 <option value="Nam">Nam</option>
                                 <option value="Ná»¯">Ná»¯</option>
                              </select>
                           </div>
                        </div>

                        <input
                           className="w-full px-2 py-2 bg-white border border-slate-200 rounded text-sm text-slate-900 outline-none"
                           placeholder="TrÃ¬nh Ä‘á»™ ngoáº¡i ngá»¯ hiá»‡n táº¡i"
                           value={studentInfo.languageLevel || ''}
                           onChange={(e) => handleStudentInfoChange('languageLevel', e.target.value)}
                        />
                     </div>
                  </div>

                  {/* 4. PHÃ‚N LOáº I (MKT) */}
                  <div>
                     <h4 className="text-xs font-bold text-blue-600 mb-3 flex items-center gap-1">
                        <Layout size={14} /> 4. PHÃ‚N LOáº I NGUá»’N
                     </h4>
                     <div className="grid grid-cols-2 gap-3">
                        <div>
                           <label className="text-[10px] text-slate-500 font-bold block mb-1">Nguá»“n (Source)</label>
                           <select
                              className="w-full px-2 py-2 bg-white border border-slate-200 rounded text-sm text-slate-900 outline-none focus:border-blue-500"
                              value={formData.source}
                              onChange={(e) => handleInputChange('source', e.target.value)}
                           >
                              <option value="fb_lead_form">FB Lead Form</option>
                              <option value="hotline">Hotline</option>
                              <option value="sale_tu_kiem_ca_nhan">Sale tá»± kiáº¿m</option>
                           </select>
                        </div>
                        <div>
                           <label className="text-[10px] text-slate-500 font-bold block mb-1">Chiáº¿n dá»‹ch</label>
                           <select
                              className="w-full px-2 py-2 bg-white border border-slate-200 rounded text-sm text-slate-900 outline-none focus:border-blue-500"
                              value={formData.campaign || ''}
                              onChange={(e) => handleInputChange('campaign', e.target.value)}
                           >
                              <option value="">(None)</option>
                              <option value="Referral">Referral</option>
                              <option value="Summer Camp">Summer Camp</option>
                           </select>
                        </div>
                     </div>
                  </div>

               </div>
            </aside>

            {/* COL 2: TIMELINE & NOTE (Center) */}
            <main className="flex-1 flex flex-col min-w-0 bg-white border-r border-slate-200">

               {/* Tabs Header */}
               <div className="flex border-b border-slate-200 px-6 pt-2">
                  <button
                     onClick={() => setActiveTab('timeline')}
                     className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'timeline' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                  >
                     DÃ²ng thá»i gian
                  </button>
                  <button
                     onClick={() => setActiveTab('notes')}
                     className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'notes' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                  >
                     Ghi chÃº
                  </button>
                  <button
                     onClick={() => setActiveTab('email')}
                     className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'email' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                  >
                     Email
                  </button>
               </div>

               {/* Timeline Content */}
               <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 custom-scrollbar">
                  <div className="max-w-3xl space-y-6">
                     {activities.length === 0 ? (
                        <div className="text-center text-slate-400 py-10">
                           ChÆ°a cÃ³ hoáº¡t Ä‘á»™ng nÃ o. HÃ£y thÃªm ghi chÃº hoáº·c cuá»™c gá»i Ä‘áº§u tiÃªn.
                        </div>
                     ) : activities.map((act) => (
                        <div key={act.id} className="flex gap-4 group">
                           <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 border-white shadow-sm 
                          ${act.type === 'call' ? 'bg-green-100 text-green-600' :
                                 act.type === 'note' ? 'bg-amber-100 text-amber-600' :
                                    act.isSystem ? 'bg-slate-200 text-slate-500' : 'bg-blue-100 text-blue-600'}
                       `}>
                              {act.type === 'call' ? <Phone size={14} /> :
                                 act.type === 'note' ? <FileText size={14} /> :
                                    act.isSystem ? <Layout size={14} /> : <MessageCircle size={14} />}
                           </div>
                           <div className="flex-1 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                              <div className="flex justify-between mb-1">
                                 <p className="text-sm font-bold text-slate-900">{act.content} <span className="text-xs font-normal text-slate-400 ml-1">{act.timestamp}</span></p>
                              </div>
                              {act.subContent && (
                                 <div className={`text-sm mt-1 p-2 rounded-lg ${act.type === 'system' ? 'bg-white text-slate-600' : 'bg-slate-50 text-slate-800 border border-slate-100'}`}>
                                    {act.subContent}
                                 </div>
                              )}
                           </div>
                        </div>
                     ))}
                  </div>
               </div>

               {/* Footer Activity Input */}
               <div className="p-4 border-t border-slate-200 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
                  <div className="flex items-center justify-between mb-3">
                     <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                        <FileText size={14} /> Ghi nháº­n hoáº¡t Ä‘á»™ng
                     </label>

                     {/* Activity Type Selector */}
                     <div className="flex bg-slate-100 p-0.5 rounded-lg">
                        <button
                           onClick={() => setActivityType('note')}
                           className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${activityType === 'note' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                           Ghi chÃº
                        </button>
                        <button
                           onClick={() => setActivityType('meeting')}
                           className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${activityType === 'meeting' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                           Lá»‹ch háº¹n / Test
                        </button>
                     </div>
                  </div>

                  {/* Meeting Extra Fields */}
                  {activityType === 'meeting' && (
                     <div className="flex gap-3 mb-3 animate-in slide-in-from-bottom-2">
                        <div className="flex-1">
                           <input
                              type="datetime-local"
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-blue-500 outline-none"
                              value={meetingDate}
                              onChange={(e) => setMeetingDate(e.target.value)}
                           />
                        </div>
                        <div className="flex-1">
                           <select
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-blue-500 outline-none"
                              value={meetingType}
                              onChange={(e) => setMeetingType(e.target.value as MeetingType)}
                           >
                              <option value="">-- Chá»n hÃ¬nh thá»©c --</option>
                              <option value={MeetingType.OFFLINE}>Offline</option>
                              <option value={MeetingType.ONLINE}>Online</option>
                           </select>
                        </div>
                     </div>
                  )}

                  <div className="flex gap-2">
                     <textarea
                        rows={2}
                        className="flex-1 border border-slate-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                        placeholder={activityType === 'meeting' ? "Ghi chÃº cho lá»‹ch háº¹n (VD: Há»c sinh cáº§n test ká»¹ ngá»¯ phÃ¡p...)" : "Nháº­p ná»™i dung trao Ä‘á»•i vá»›i khÃ¡ch hÃ ng..."}
                        value={noteContent}
                        onChange={(e) => setNoteContent(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendActivity(); } }}
                     />
                     <button
                        onClick={handleSendActivity}
                        className={`px-4 rounded-lg font-bold shadow-sm flex flex-col items-center justify-center min-w-[80px] transition-colors ${activityType === 'meeting' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-slate-800 hover:bg-slate-900 text-white'}`}
                     >
                        <Send size={18} className="mb-1" />
                        <span className="text-xs">{activityType === 'meeting' ? 'Äáº·t lá»‹ch' : 'LÆ°u'}</span>
                     </button>
                  </div>
               </div>
            </main>

            {/* COL 3: STATUS & OWNER (Right - Fixed) */}
            <aside className="w-[300px] bg-white flex flex-col shrink-0 h-full border-l border-slate-200">
               <div className="p-6 flex flex-col gap-6 h-full">

                  {/* Status Section */}
                  <div>
                     <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">TRáº NG THÃI HIá»†N Táº I</label>
                     <div className="relative">
                        <select
                           value={normalizeLeadStatusKey(String(lead.status || ''))}
                           onChange={handleStatusChange}
                           className={`w-full appearance-none font-bold text-sm py-3 pl-4 pr-10 rounded-lg border-2 cursor-pointer transition-all focus:outline-none
                                ${normalizeLeadStatusKey(String(lead.status || '')) === LEAD_STATUS_KEYS.CONVERTED ? 'bg-green-50 text-green-700 border-green-200' :
                                 normalizeLeadStatusKey(String(lead.status || '')) === LEAD_STATUS_KEYS.NEW ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                    'bg-white text-slate-700 border-slate-200'}
                            `}
                        >
                           {LEAD_STATUS_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                           ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" size={16} />
                     </div>

                     {/* Helper Text */}
                     <div className="mt-3 p-3 bg-slate-50 text-slate-500 text-xs italic rounded-lg border border-slate-100">
                        {normalizeLeadStatusKey(String(lead.status || '')) === LEAD_STATUS_KEYS.CONVERTED
                           ? "Lead đã converted. Tiếp tục xử lý ở pipeline/deal nếu cần."
                           : `Trạng thái hiện tại: ${getLeadStatusLabel(lead.status as string)}.`}
                     </div>
                  </div>

                  <div className="flex-1"></div>

                  {/* Owner Section (Bottom Right) */}
                  <div className="mt-auto border-t border-slate-100 pt-6">
                     <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">NGÆ¯á»œI PHá»¤ TRÃCH</label>
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm">
                           {lead.ownerId === 'u2' ? 'SM' : 'AD'}
                        </div>
                        <div>
                           <p className="text-sm font-bold text-slate-900">{lead.ownerId === 'u2' ? 'Sarah Miller' : 'Admin User'}</p>
                           <p className="text-xs text-slate-500">Sales Rep</p>
                        </div>
                     </div>
                  </div>

               </div>
            </aside>

         </div>

         <ConvertLeadModal
            isOpen={showConvertModal}
            lead={lead ? ({
               ...lead,
               ...formData,
               ownerId: String(formData.ownerId || lead.ownerId || ''),
               studentInfo: {
                  ...(lead.studentInfo || {}),
                  ...studentInfo
               }
            } as ILead) : null}
            onClose={() => setShowConvertModal(false)}
            onConfirm={handleConfirmConvert}
         />
      </div>
   );
};

export default LeadDetails;

