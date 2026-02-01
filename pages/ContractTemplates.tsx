
import React, { useState } from 'react';
import { 
  Search, 
  FolderOpen, 
  History, 
  Star, 
  Plus, 
  Upload, 
  ChevronRight, 
  MoreHorizontal, 
  Calendar, 
  Eye, 
  Edit, 
  Copy, 
  Info,
  GraduationCap, 
  Globe, 
  Layers, 
  FileText,
  CheckCircle2,
  FileCheck,
  Download,
  Zap,
  ArrowRight
} from 'lucide-react';

const ContractTemplates: React.FC = () => {
  const [activeTab, setActiveTab] = useState('All Templates');
  const [showSmartRules, setShowSmartRules] = useState(false);

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-slate-900 font-sans overflow-hidden">
      
      <div className="flex flex-1 overflow-hidden">
        
        {/* LEFT SIDEBAR: Categories & Filters */}
        <aside className="w-72 bg-white border-r border-slate-200 hidden xl:flex flex-col z-10">
          <div className="p-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Thư viện của tôi</h3>
            <div className="space-y-1">
              <button className="flex items-center gap-3 px-4 py-3 w-full bg-blue-50 text-blue-700 rounded-xl font-bold transition-all shadow-sm">
                <FolderOpen size={18} />
                <span>Tất cả mẫu</span>
              </button>
              <button className="flex items-center gap-3 px-4 py-3 w-full text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl font-medium transition-colors">
                <History size={18} />
                <span>Gần đây</span>
              </button>
              <button className="flex items-center gap-3 px-4 py-3 w-full text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl font-medium transition-colors">
                <Star size={18} />
                <span>Yêu thích</span>
              </button>
            </div>

            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-8 mb-4">Phân loại</h3>
            <div className="space-y-1">
              <button className="flex items-center gap-3 px-4 py-3 w-full text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl font-medium transition-colors">
                <GraduationCap size={18} className="text-emerald-500" />
                <span>Đào tạo</span>
              </button>
              <button className="flex items-center gap-3 px-4 py-3 w-full text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl font-medium transition-colors">
                <Globe size={18} className="text-blue-500" />
                <span>Du học</span>
              </button>
              <button className="flex items-center gap-3 px-4 py-3 w-full text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl font-medium transition-colors">
                <Layers size={18} className="text-amber-500" />
                <span>Gói Combo</span>
              </button>
            </div>
          </div>
          
          <div className="mt-auto p-6 border-t border-slate-100">
             <div 
                className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-4 border border-transparent shadow-md text-white cursor-pointer hover:shadow-lg transition-all"
                onClick={() => setShowSmartRules(!showSmartRules)}
             >
                <h4 className="font-bold text-sm mb-1 flex items-center gap-2">
                    <Zap size={16} className="text-yellow-300 fill-current" /> Smart Mapping
                </h4>
                <p className="text-xs text-indigo-100 leading-relaxed mb-0 opacity-90">
                    Cấu hình luật tự động chọn mẫu hợp đồng thông minh.
                </p>
             </div>
          </div>
        </aside>

        {/* MAIN CONTENT: Airy Grid */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-10 relative">
          
          {/* Top Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                <span className="hover:text-blue-600 cursor-pointer transition-colors">Hợp đồng</span>
                <ChevronRight size={14} />
                <span className="font-medium text-slate-900">Thư viện Mẫu</span>
              </div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Thư viện Mẫu Hợp đồng</h1>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative hidden md:block">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                 <input 
                   type="text" 
                   placeholder="Tìm kiếm mẫu..." 
                   className="pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none w-64 transition-all"
                 />
              </div>
              <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
                <Upload size={18} />
                <span>Import</span>
              </button>
              <button className="flex items-center gap-2 px-5 py-2.5 bg-[#1380ec] text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-600 hover:shadow-blue-500/40 transition-all transform active:scale-95">
                <Plus size={18} />
                <span>Tạo mới</span>
              </button>
            </div>
          </div>

          {/* SMART RULES PANEL (Conditional) */}
          {showSmartRules && (
              <div className="mb-8 bg-indigo-50 border border-indigo-100 rounded-2xl p-6 animate-in slide-in-from-top-4">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                          <Zap size={20} className="text-indigo-600" /> Luật Điền từ & Chọn mẫu Tự động (Automation Rules)
                      </h3>
                      <button onClick={() => setShowSmartRules(false)} className="text-indigo-400 hover:text-indigo-600">Đóng</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm flex items-center gap-4">
                          <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600 font-bold text-xs">IF</div>
                          <div className="text-sm flex-1">
                              <p className="font-bold text-slate-700">Deal Products</p>
                              <p className="text-xs text-slate-500">contains "Combo Đức"</p>
                          </div>
                          <ArrowRight size={16} className="text-slate-300" />
                          <div className="bg-green-100 p-2 rounded-lg text-green-600 font-bold text-xs">THEN</div>
                          <div className="text-sm flex-1">
                              <p className="font-bold text-slate-700">Select Template</p>
                              <p className="text-xs text-slate-500">"HĐ Du học Đức v2.4"</p>
                          </div>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm flex items-center gap-4">
                          <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600 font-bold text-xs">IF</div>
                          <div className="text-sm flex-1">
                              <p className="font-bold text-slate-700">Total Value</p>
                              <p className="text-xs text-slate-500">&gt; 100,000,000 VND</p>
                          </div>
                          <ArrowRight size={16} className="text-slate-300" />
                          <div className="bg-green-100 p-2 rounded-lg text-green-600 font-bold text-xs">THEN</div>
                          <div className="text-sm flex-1">
                              <p className="font-bold text-slate-700">Attach Addendum</p>
                              <p className="text-xs text-slate-500">"Bảo lãnh tài chính"</p>
                          </div>
                      </div>
                  </div>
                  <button className="mt-4 text-sm font-bold text-indigo-600 hover:underline flex items-center gap-1">
                      <Plus size={16} /> Thêm luật mới
                  </button>
              </div>
          )}

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-2 scrollbar-hide">
            {['All Templates', 'Training', 'Du học Đức', 'Du học Trung Quốc', 'Combo'].map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                  activeTab === tab 
                    ? 'bg-slate-900 text-white shadow-md' 
                    : 'bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Content Layout: Grid + Sticky Preview */}
          <div className="grid grid-cols-12 gap-8 items-start">
            
            {/* Grid Cards */}
            <div className="col-span-12 xl:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Card 1 */}
              <div className="bg-white rounded-2xl p-6 border-2 border-blue-500 shadow-md cursor-pointer transition-all hover:-translate-y-1 group relative ring-4 ring-blue-500/10">
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600"><MoreHorizontal size={20} /></button>
                </div>
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                  <FileText size={24} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">Hợp đồng Du học Đức (Chuẩn)</h3>
                <p className="text-sm text-slate-500 mb-6">Study Abroad Germany • Version 2.4</p>
                
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                     <Calendar size={14} /> 24/10/2023
                  </div>
                  <span className="flex items-center gap-1 text-xs font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md">
                     <Download size={12} /> Used 1,240x
                  </span>
                </div>
              </div>

              {/* Card 2 */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm cursor-pointer transition-all hover:-translate-y-1 hover:shadow-md hover:border-blue-300 group relative">
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600"><MoreHorizontal size={20} /></button>
                </div>
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
                  <GraduationCap size={24} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-emerald-600 transition-colors">Cam kết Đào tạo Ngôn ngữ</h3>
                <p className="text-sm text-slate-500 mb-6">Training Department • Version 1.1</p>
                
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                     <Calendar size={14} /> 12/09/2023
                  </div>
                  <span className="flex items-center gap-1 text-xs font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md">
                     <Download size={12} /> Used 850x
                  </span>
                </div>
              </div>

              {/* Card 3 */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm cursor-pointer transition-all hover:-translate-y-1 hover:shadow-md hover:border-blue-300 group relative">
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600"><MoreHorizontal size={20} /></button>
                </div>
                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-4">
                  <Layers size={24} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-amber-600 transition-colors">Combo Visa + Đại học</h3>
                <p className="text-sm text-slate-500 mb-6">Combo Packages • Version 3.0</p>
                
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                     <Calendar size={14} /> 05/11/2023
                  </div>
                  <span className="flex items-center gap-1 text-xs font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md">
                     <Download size={12} /> Used 412x
                  </span>
                </div>
              </div>

              {/* Card 4 */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm cursor-pointer transition-all hover:-translate-y-1 hover:shadow-md hover:border-blue-300 group relative">
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600"><MoreHorizontal size={20} /></button>
                </div>
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                  <Globe size={24} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">Dự bị Đại học Trung Quốc</h3>
                <p className="text-sm text-slate-500 mb-6">Study Abroad China • Version 1.0</p>
                
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                     <Calendar size={14} /> 30/08/2023
                  </div>
                  <span className="flex items-center gap-1 text-xs font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md">
                     <Download size={12} /> Used 295x
                  </span>
                </div>
              </div>

            </div>

            {/* Sticky Preview Panel */}
            <div className="col-span-12 xl:col-span-4 relative">
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden sticky top-0">
                
                {/* Preview Header */}
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 backdrop-blur-sm">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2">
                    <Eye size={18} className="text-blue-600" />
                    Xem trước (Preview)
                  </h4>
                  <div className="flex gap-2">
                     <button className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-500 transition-all" title="Chỉnh sửa"><Edit size={16} /></button>
                     <button className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-500 transition-all" title="Sao chép"><Copy size={16} /></button>
                  </div>
                </div>

                {/* Document Paper Look */}
                <div className="p-8 h-[500px] overflow-y-auto bg-slate-100 custom-scrollbar">
                   <div className="bg-white shadow-sm min-h-full p-8 text-sm leading-relaxed text-slate-700 font-serif border border-slate-200 mx-auto max-w-sm">
                      <div className="text-center mb-8 pb-4 border-b-2 border-slate-800">
                        <h2 className="font-bold text-lg text-slate-900 uppercase font-sans tracking-wide">HỢP ĐỒNG DỊCH VỤ</h2>
                        <p className="text-[10px] text-slate-400 mt-1 font-sans font-medium">Số: {'{{contract_code}}'}</p>
                      </div>
                      
                      <p className="mb-4 text-justify">
                        Hợp đồng này được lập ngày hôm nay giữa <strong>EduCRM International</strong> và học viên, 
                        <span className="bg-blue-50 text-blue-700 px-1 rounded mx-1 font-medium font-sans text-xs border border-blue-100">{'{{student_full_name}}'}</span>.
                      </p>
                      
                      <div className="mb-4">
                        <h5 className="font-bold text-slate-900 mb-1 font-sans text-xs uppercase">1. NỘI DUNG ĐÀO TẠO</h5>
                        <p className="text-justify">
                          Học viên đăng ký tham gia chương trình: <span className="bg-blue-50 text-blue-700 px-1 rounded mx-1 font-medium font-sans text-xs border border-blue-100">{'{{course_title}}'}</span>, 
                          bắt đầu vào ngày <span className="bg-blue-50 text-blue-700 px-1 rounded mx-1 font-medium font-sans text-xs border border-blue-100">{'{{start_date}}'}</span>.
                        </p>
                      </div>
                      
                      <div className="mb-6">
                        <h5 className="font-bold text-slate-900 mb-1 font-sans text-xs uppercase">2. HỌC PHÍ & THANH TOÁN</h5>
                        <p className="text-justify">
                          Tổng học phí: <span className="bg-blue-50 text-blue-700 px-1 rounded mx-1 font-medium font-sans text-xs border border-blue-100">{'{{total_tuition_fee}}'}</span>.
                          <br/>
                          Đợt 1 (Đặt cọc): <span className="bg-blue-50 text-blue-700 px-1 rounded mx-1 font-medium font-sans text-xs border border-blue-100">{'{{deposit_amount}}'}</span>.
                        </p>
                      </div>

                      <div className="mt-12 flex justify-between items-end">
                         <div className="text-center w-24">
                            <p className="text-[8px] font-bold font-sans uppercase text-slate-400 mb-8">Đại diện EduCRM</p>
                            <div className="h-px bg-slate-300 w-full"></div>
                         </div>
                         <div className="text-center w-24">
                            <p className="text-[8px] font-bold font-sans uppercase text-slate-400 mb-8">Học viên</p>
                            <div className="h-px bg-slate-300 w-full"></div>
                         </div>
                      </div>
                   </div>
                </div>

                {/* Footer Info */}
                <div className="p-4 bg-slate-50 border-t border-slate-200">
                   <div className="flex items-center gap-2 mb-3 text-xs font-bold text-slate-600 uppercase tracking-wide">
                      <Info size={14} className="text-blue-600" /> Tags tự động
                   </div>
                   <div className="flex flex-wrap gap-2">
                      {['student_name', 'course_fee', 'start_date', 'contract_code'].map(tag => (
                        <span key={tag} className="text-[10px] bg-white border border-slate-200 text-slate-500 px-2 py-1 rounded-md font-mono shadow-sm">
                           {tag}
                        </span>
                      ))}
                      <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-1 rounded-md font-bold font-mono cursor-pointer hover:bg-blue-200">+ 8 more</span>
                   </div>
                </div>

              </div>
            </div>

          </div>

        </main>
      </div>
    </div>
  );
};

export default ContractTemplates;
