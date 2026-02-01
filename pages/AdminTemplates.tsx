
import React, { useState } from 'react';
import { 
  Mail, 
  MessageSquare, 
  Smartphone, 
  Plus, 
  Save, 
  Trash2, 
  Copy,
  Info
} from 'lucide-react';

interface ITemplate {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'zalo';
  subject?: string;
  content: string;
}

const INITIAL_TEMPLATES: ITemplate[] = [
  { id: '1', name: 'Email Chào mừng (Lead mới)', type: 'email', subject: 'Chào mừng đến với ULA Edu!', content: 'Chào {{name}},\n\nCảm ơn bạn đã quan tâm đến khóa học tại ULA...' },
  { id: '2', name: 'Nhắc lịch phỏng vấn Visa', type: 'zalo', content: 'Chào {{name}}, nhắc bạn có lịch phỏng vấn Visa vào ngày {{date}} tại {{location}}.' },
  { id: '3', name: 'Thông báo Công nợ (SMS)', type: 'sms', content: 'ULA Edu thong bao: Hoc phi dot 2 cua ban da den han. Vui long thanh toan truoc {{duedate}}.' },
];

const AdminTemplates: React.FC = () => {
  const [templates, setTemplates] = useState(INITIAL_TEMPLATES);
  const [selectedId, setSelectedId] = useState<string | null>(INITIAL_TEMPLATES[0].id);
  const [activeTab, setActiveTab] = useState<'email' | 'zalo' | 'sms'>('email');

  const activeTemplate = templates.find(t => t.id === selectedId);

  const handleUpdate = (field: keyof ITemplate, value: string) => {
    if (!selectedId) return;
    setTemplates(prev => prev.map(t => t.id === selectedId ? { ...t, [field]: value } : t));
  };

  const handleCreate = () => {
    const newTemplate: ITemplate = {
      id: Date.now().toString(),
      name: 'Mẫu mới (Chưa đặt tên)',
      type: activeTab,
      subject: activeTab === 'email' ? 'Tiêu đề...' : undefined,
      content: ''
    };
    setTemplates([...templates, newTemplate]);
    setSelectedId(newTemplate.id);
  };

  const handleDelete = () => {
    if (!selectedId) return;
    if (window.confirm('Bạn có chắc chắn muốn xóa mẫu này?')) {
      setTemplates(prev => prev.filter(t => t.id !== selectedId));
      setSelectedId(null);
    }
  };

  const filteredTemplates = templates.filter(t => t.type === activeTab);

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#111418] font-sans">
      <div className="flex flex-1 overflow-hidden p-6 gap-6">
        
        {/* SIDEBAR LIST */}
        <div className="w-80 flex flex-col bg-white border border-[#cfdbe7] rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[#cfdbe7]">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Quản lý Mẫu tin</h2>
            <div className="flex bg-[#f0f2f4] p-1 rounded-lg">
              <button 
                onClick={() => setActiveTab('email')} 
                className={`flex-1 py-1.5 text-xs font-bold rounded-md flex items-center justify-center gap-1 transition-all ${activeTab === 'email' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
              >
                <Mail size={14} /> Email
              </button>
              <button 
                onClick={() => setActiveTab('zalo')} 
                className={`flex-1 py-1.5 text-xs font-bold rounded-md flex items-center justify-center gap-1 transition-all ${activeTab === 'zalo' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
              >
                <MessageSquare size={14} /> Zalo
              </button>
              <button 
                onClick={() => setActiveTab('sms')} 
                className={`flex-1 py-1.5 text-xs font-bold rounded-md flex items-center justify-center gap-1 transition-all ${activeTab === 'sms' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
              >
                <Smartphone size={14} /> SMS
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredTemplates.map(t => (
              <button 
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${selectedId === t.id ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'text-slate-700 hover:bg-slate-50 border border-transparent'}`}
              >
                {t.name}
              </button>
            ))}
            {filteredTemplates.length === 0 && (
              <p className="text-center text-xs text-slate-400 py-4 italic">Chưa có mẫu nào.</p>
            )}
          </div>

          <div className="p-4 border-t border-[#cfdbe7]">
            <button 
              onClick={handleCreate}
              className="w-full py-2 bg-[#1380ec] hover:bg-blue-700 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2"
            >
              <Plus size={16} /> Thêm Mẫu mới
            </button>
          </div>
        </div>

        {/* EDITOR AREA */}
        <div className="flex-1 bg-white border border-[#cfdbe7] rounded-xl shadow-sm flex flex-col overflow-hidden">
          {activeTemplate ? (
            <>
              <div className="p-6 border-b border-[#cfdbe7] flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-2">
                   <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                      {activeTab === 'email' ? <Mail size={20} /> : activeTab === 'zalo' ? <MessageSquare size={20} /> : <Smartphone size={20} />}
                   </div>
                   <div>
                      <h3 className="font-bold text-slate-900">Chi tiết Mẫu</h3>
                      <p className="text-xs text-slate-500">ID: {activeTemplate.id}</p>
                   </div>
                </div>
                <div className="flex gap-2">
                   <button onClick={handleDelete} className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors">
                      <Trash2 size={16} /> Xóa
                   </button>
                   <button onClick={() => alert('Đã lưu mẫu thành công!')} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm flex items-center gap-2 transition-colors shadow-sm">
                      <Save size={16} /> Lưu lại
                   </button>
                </div>
              </div>

              <div className="p-8 overflow-y-auto max-w-4xl mx-auto w-full">
                 <div className="space-y-6">
                    <div>
                       <label className="block text-sm font-bold text-slate-700 mb-2">Tên mẫu (Nội bộ)</label>
                       <input 
                          type="text" 
                          value={activeTemplate.name}
                          onChange={(e) => handleUpdate('name', e.target.value)}
                          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                       />
                    </div>

                    {activeTemplate.type === 'email' && (
                       <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Tiêu đề Email</label>
                          <input 
                             type="text" 
                             value={activeTemplate.subject || ''}
                             onChange={(e) => handleUpdate('subject', e.target.value)}
                             className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                          />
                       </div>
                    )}

                    <div className="flex gap-6">
                       <div className="flex-1">
                          <label className="block text-sm font-bold text-slate-700 mb-2">Nội dung tin nhắn</label>
                          <textarea 
                             rows={15}
                             value={activeTemplate.content}
                             onChange={(e) => handleUpdate('content', e.target.value)}
                             className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono leading-relaxed"
                          ></textarea>
                          <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                             <Info size={12} /> Hỗ trợ Markdown cơ bản (cho Email) và Plain Text (cho SMS/Zalo).
                          </p>
                       </div>

                       {/* Variables Guide */}
                       <div className="w-64 shrink-0">
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sticky top-0">
                             <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Biến số có sẵn</h4>
                             <div className="space-y-2">
                                {['{{name}}', '{{email}}', '{{phone}}', '{{date}}', '{{course}}', '{{fee}}', '{{duedate}}'].map(v => (
                                   <div key={v} className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded text-xs font-mono text-slate-700 cursor-pointer hover:border-blue-300 hover:text-blue-600 group" onClick={() => navigator.clipboard.writeText(v)}>
                                      {v}
                                      <Copy size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                   </div>
                                ))}
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
               Vui lòng chọn một mẫu để chỉnh sửa.
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default AdminTemplates;
