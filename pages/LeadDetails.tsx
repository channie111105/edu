
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLeadById, saveLead, addDeal, addContact } from '../utils/storage';
import { useAuth } from '../contexts/AuthContext';
import {
   ArrowLeft, Phone, Mail, MessageCircle, Clock,
   User, CheckCircle2,
   ChevronDown, UserPlus, PhoneOutgoing,
   Send, FileText, Save, Layout
} from 'lucide-react';
import { LeadStatus, DealStage, ILead, IDeal, UserRole } from '../types';

interface IActivity {
   id: string;
   type: 'system' | 'note' | 'email' | 'call';
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
   const [activeTab, setActiveTab] = useState<'timeline' | 'notes' | 'email'>('timeline');
   const [activities, setActivities] = useState<IActivity[]>([]);

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
                  id: 'sys-1', type: 'system', content: 'Lead được phân bổ', subContent: `Nguồn: ${foundLead.source}`, timestamp: new Date(foundLead.createdAt).toLocaleString(), isSystem: true
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
         alert('Đã lưu thông tin Lead thành công!');
      }
   };

   const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (lead) {
         const newStatus = e.target.value as LeadStatus;
         const updatedLead = { ...lead, status: newStatus };
         saveLead(updatedLead);
         setLead(updatedLead);

         setActivities([{
            id: `st-${Date.now()}`,
            type: 'system',
            content: `Thay đổi trạng thái`,
            subContent: `Chuyển sang ${newStatus}`,
            timestamp: 'Vừa xong',
            isSystem: true
         }, ...activities]);
      }
   };

   const handleSendNote = () => {
      if (!noteContent.trim()) return;
      const newNote: IActivity = {
         id: `note-${Date.now()}`,
         type: 'note',
         content: 'Ghi chú cuộc gọi / Chăm sóc',
         subContent: noteContent,
         timestamp: 'Vừa xong',
         isSystem: false
      };
      setActivities([newNote, ...activities]);
      setNoteContent('');
   };

   // --- LOGIC CHUYỂN ĐỔI (CORE REQUIREMENT) ---
   const handleConvert = () => {
      if (!lead) return;

      // 1. Validate Core Info
      if (!studentInfo.targetCountry) {
         alert("Vui lòng chọn Quốc gia mục tiêu trước khi chuyển đổi.");
         return;
      }
      if (!formData.name || !formData.phone) {
         alert("Thiếu thông tin Họ tên hoặc SĐT.");
         return;
      }

      if (window.confirm(`Xác nhận chuyển đổi "${lead.name}" thành Contact chính thức và tạo Deal mới?`)) {

         // 2. Create/Update Contact (Unique by Phone)
         const contactData: ILead = {
            ...lead,
            ...formData,
            studentInfo: studentInfo,
            status: LeadStatus.CONVERTED,
            // ID will be handled by addContact to ensure it matches existing if phone exists
         };
         const savedContact = addContact(contactData); // Returns the updated contacts list, but we need the specific ID.
         // Note: In a real app, addContact should return the saved contact. 
         // For now, we assume the ID is consistent or handled by storage.

         // 3. Create Deal
         const dealId = `D-${Date.now()}`;
         const deal: IDeal = {
            id: dealId,
            leadId: contactData.id, // Link to contact
            title: `${lead.name} - ${lead.program}`,
            value: 0,
            stage: DealStage.NEEDS_DISCOVERY, // First column
            ownerId: lead.ownerId,
            expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            products: [lead.program],
            probability: 20,
            createdAt: new Date().toISOString()
         };
         addDeal(deal);

         // 4. Update Lead Status (if it's not deleted)
         saveLead({ ...lead, status: LeadStatus.CONVERTED });

         // 5. NAVIGATE TO PIPELINE (HIGHLIGHT NEW DEAL)
         navigate('/pipeline', { state: { highlightLeadId: dealId } });
      }
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
                  <PhoneOutgoing size={16} /> Gọi điện
               </button>
               <button
                  onClick={handleConvert}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1380ec] text-white text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm"
               >
                  <UserPlus size={16} /> Chuyển đổi (Convert)
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
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">THÔNG TIN LEAD</h3>
                  <button onClick={handleSaveInfo} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs font-bold">
                     <Save size={14} /> Lưu
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
                           <p className="text-[10px] text-slate-500 font-medium mb-0.5">Số điện thoại</p>
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
                           <p className="text-[10px] text-slate-500 font-medium mb-0.5">Email (Liên hệ)</p>
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
                           <p className="text-[10px] text-slate-500 font-medium mb-0.5">Số Zalo</p>
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

                  {/* Nguồn & Phân loại */}
                  <div>
                     <h4 className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wide">Nguồn & Phân loại</h4>
                     <div className="space-y-3">
                        <div>
                           <label className="text-[10px] text-slate-500 font-bold block mb-1.5">Nguồn</label>
                           <select
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 outline-none focus:border-blue-500"
                              value={formData.source}
                              onChange={(e) => handleInputChange('source', e.target.value)}
                           >
                              <option value="fb_lead_form">fb_lead_form</option>
                              <option value="hotline">Hotline</option>
                              <option value="sale_tu_kiem_ca_nhan">Sale tự kiếm</option>
                           </select>
                        </div>
                        <div>
                           <label className="text-[10px] text-slate-500 font-bold block mb-1.5">Chương trình</label>
                           <select
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-blue-600 outline-none focus:border-blue-500"
                              value={formData.program}
                              onChange={(e) => handleInputChange('program', e.target.value)}
                           >
                              <option value="Tiếng Đức">Tiếng Đức</option>
                              <option value="Tiếng Trung">Tiếng Trung</option>
                              <option value="Du học Đức">Du học Đức</option>
                              <option value="Du học Trung">Du học Trung</option>
                           </select>
                        </div>
                     </div>
                  </div>

                  {/* 2. CHUYÊN MÔN (QUAN TRỌNG) */}
                  <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                     <h4 className="text-xs font-bold text-blue-700 mb-3 flex items-center gap-1">
                        <CheckCircle2 size={14} /> 2. MỤC TIÊU & NHU CẦU
                     </h4>
                     <div className="space-y-3">
                        <div>
                           <label className="text-[10px] text-slate-500 font-bold block mb-1">Quốc gia mục tiêu <span className="text-red-500">*</span></label>
                           <select
                              className="w-full px-2 py-2 bg-white border border-slate-200 rounded text-sm text-slate-900 outline-none focus:border-blue-500"
                              value={studentInfo.targetCountry || ''}
                              onChange={(e) => handleStudentInfoChange('targetCountry', e.target.value)}
                           >
                              <option value="">-- Chọn quốc gia --</option>
                              <option value="Đức">🇩🇪 Đức</option>
                              <option value="Trung Quốc">🇨🇳 Trung Quốc</option>
                              <option value="Khác">🏳️ Khác</option>
                           </select>
                        </div>
                        <div>
                           <label className="text-[10px] text-slate-500 font-bold block mb-1">Sản phẩm quan tâm</label>
                           <select
                              className="w-full px-2 py-2 bg-white border border-slate-200 rounded text-sm font-bold text-slate-900 outline-none focus:border-blue-500"
                              value={formData.program}
                              onChange={(e) => handleInputChange('program', e.target.value)}
                           >
                              <option value="Tiếng Đức">Tiếng Đức</option>
                              <option value="Tiếng Trung">Tiếng Trung</option>
                              <option value="Du học Đức">Du học Đức</option>
                              <option value="Du học Trung">Du học Trung</option>
                           </select>
                        </div>
                     </div>
                  </div>

                  {/* 3. THÔNG TIN BỔ SUNG (CHO HỒ SƠ) */}
                  <div>
                     <h4 className="text-xs font-bold text-blue-600 mb-3 flex items-center gap-1">
                        <FileText size={14} /> 3. HỒ SƠ CÁ NHÂN
                     </h4>
                     <div className="space-y-3">
                        {/* Phụ huynh - Quan trọng */}
                        <div className="bg-slate-50 p-2 rounded border border-slate-200">
                           <label className="text-[10px] text-slate-500 font-bold block mb-1">Thông tin Phụ huynh</label>
                           <input
                              className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-sm mb-2 outline-none"
                              placeholder="Họ tên Bố/Mẹ"
                              value={studentInfo.parentName || ''}
                              onChange={(e) => handleStudentInfoChange('parentName', e.target.value)}
                           />
                           <input
                              className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-sm outline-none"
                              placeholder="SĐT Phụ huynh"
                              value={studentInfo.parentPhone || ''}
                              onChange={(e) => handleStudentInfoChange('parentPhone', e.target.value)}
                           />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                           <div>
                              <label className="text-[10px] text-slate-500 font-bold block mb-1">Ngày sinh</label>
                              <input
                                 type="date"
                                 className="w-full px-2 py-2 bg-white border border-slate-200 rounded text-sm text-slate-900 outline-none"
                                 value={studentInfo.dob || ''}
                                 onChange={(e) => handleStudentInfoChange('dob', e.target.value)}
                              />
                           </div>
                           <div>
                              <label className="text-[10px] text-slate-500 font-bold block mb-1">Giới tính</label>
                              <select
                                 className="w-full px-2 py-2 bg-white border border-slate-200 rounded text-sm text-slate-900 outline-none"
                                 value={studentInfo.gender || ''}
                                 onChange={(e) => handleStudentInfoChange('gender', e.target.value)}
                              >
                                 <option value="">-- Chọn --</option>
                                 <option value="Nam">Nam</option>
                                 <option value="Nữ">Nữ</option>
                              </select>
                           </div>
                        </div>

                        <input
                           className="w-full px-2 py-2 bg-white border border-slate-200 rounded text-sm text-slate-900 outline-none"
                           placeholder="Trình độ ngoại ngữ hiện tại"
                           value={studentInfo.languageLevel || ''}
                           onChange={(e) => handleStudentInfoChange('languageLevel', e.target.value)}
                        />
                     </div>
                  </div>

                  {/* 4. PHÂN LOẠI (MKT) */}
                  <div>
                     <h4 className="text-xs font-bold text-blue-600 mb-3 flex items-center gap-1">
                        <Layout size={14} /> 4. PHÂN LOẠI NGUỒN
                     </h4>
                     <div className="grid grid-cols-2 gap-3">
                        <div>
                           <label className="text-[10px] text-slate-500 font-bold block mb-1">Nguồn (Source)</label>
                           <select
                              className="w-full px-2 py-2 bg-white border border-slate-200 rounded text-sm text-slate-900 outline-none focus:border-blue-500"
                              value={formData.source}
                              onChange={(e) => handleInputChange('source', e.target.value)}
                           >
                              <option value="fb_lead_form">FB Lead Form</option>
                              <option value="hotline">Hotline</option>
                              <option value="sale_tu_kiem_ca_nhan">Sale tự kiếm</option>
                           </select>
                        </div>
                        <div>
                           <label className="text-[10px] text-slate-500 font-bold block mb-1">Chiến dịch</label>
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
                     Dòng thời gian
                  </button>
                  <button
                     onClick={() => setActiveTab('notes')}
                     className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'notes' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                  >
                     Ghi chú
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
                           Chưa có hoạt động nào. Hãy thêm ghi chú hoặc cuộc gọi đầu tiên.
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

               {/* Footer Note Input */}
               <div className="p-4 border-t border-slate-200 bg-white">
                  <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">GHI CHÚ CUỘC GỌI / KẾT QUẢ (BẮT BUỘC)</label>
                  <div className="flex gap-2">
                     <textarea
                        rows={2}
                        className="flex-1 border border-slate-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                        placeholder="Nhập nội dung trao đổi với khách hàng..."
                        value={noteContent}
                        onChange={(e) => setNoteContent(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendNote(); } }}
                     />
                     <button
                        onClick={handleSendNote}
                        className="bg-[#1380ec] text-white px-4 rounded-lg font-bold hover:bg-blue-700 shadow-sm flex flex-col items-center justify-center min-w-[80px]"
                     >
                        <Send size={18} className="mb-1" />
                        <span className="text-xs">Lưu Note</span>
                     </button>
                  </div>
               </div>
            </main>

            {/* COL 3: STATUS & OWNER (Right - Fixed) */}
            <aside className="w-[300px] bg-white flex flex-col shrink-0 h-full border-l border-slate-200">
               <div className="p-6 flex flex-col gap-6 h-full">

                  {/* Status Section */}
                  <div>
                     <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">TRẠNG THÁI HIỆN TẠI</label>
                     <div className="relative">
                        <select
                           value={lead.status}
                           onChange={handleStatusChange}
                           className={`w-full appearance-none font-bold text-sm py-3 pl-4 pr-10 rounded-lg border-2 cursor-pointer transition-all focus:outline-none
                                ${lead.status === LeadStatus.QUALIFIED ? 'bg-green-50 text-green-700 border-green-200' :
                                 lead.status === LeadStatus.NEW ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                    'bg-white text-slate-700 border-slate-200'}
                            `}
                        >
                           <option value={LeadStatus.NEW}>Mới (New)</option>
                           <option value={LeadStatus.CONTACTED}>Đang liên hệ</option>
                           <option value={LeadStatus.QUALIFIED}>Đạt chuẩn (Qualified)</option>
                           <option value={LeadStatus.DISQUALIFIED}>Không đạt (Lost)</option>
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" size={16} />
                     </div>

                     {/* Helper Text */}
                     <div className="mt-3 p-3 bg-slate-50 text-slate-500 text-xs italic rounded-lg border border-slate-100">
                        {lead.status === LeadStatus.QUALIFIED
                           ? "Khách tiềm năng. Hãy điền đủ thông tin chuyên môn và nhấn 'Chuyển đổi'."
                           : "Vui lòng cập nhật trạng thái sau mỗi cuộc gọi để hệ thống ghi nhận KPI."}
                     </div>
                  </div>

                  <div className="flex-1"></div>

                  {/* Owner Section (Bottom Right) */}
                  <div className="mt-auto border-t border-slate-100 pt-6">
                     <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">NGƯỜI PHỤ TRÁCH</label>
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
      </div>
   );
};

export default LeadDetails;
