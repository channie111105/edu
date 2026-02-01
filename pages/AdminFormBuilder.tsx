
import React, { useState } from 'react';
import { 
  FormInput, 
  Plus, 
  Save, 
  Trash2, 
  Move, 
  Eye, 
  Code,
  Smartphone,
  Monitor
} from 'lucide-react';

interface IFormElement {
  id: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select';
  placeholder?: string;
  required: boolean;
  options?: string[];
}

const INITIAL_ELEMENTS: IFormElement[] = [
  { id: '1', label: 'Họ và tên', type: 'text', placeholder: 'Nhập họ tên của bạn', required: true },
  { id: '2', label: 'Số điện thoại', type: 'phone', placeholder: '09xxxxxxx', required: true },
  { id: '3', label: 'Email', type: 'email', placeholder: 'example@mail.com', required: false },
  { id: '4', label: 'Chương trình quan tâm', type: 'select', options: ['Tiếng Đức A1', 'Du học nghề', 'Du học Đại học'], required: true },
];

const AdminFormBuilder: React.FC = () => {
  const [elements, setElements] = useState<IFormElement[]>(INITIAL_ELEMENTS);
  const [formTitle, setFormTitle] = useState('Đăng ký Tư vấn 2024');
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');

  const addElement = (type: IFormElement['type']) => {
    const newEl: IFormElement = {
      id: Date.now().toString(),
      label: type === 'text' ? 'Trường văn bản' : type === 'select' ? 'Danh sách chọn' : type === 'textarea' ? 'Đoạn văn' : type.charAt(0).toUpperCase() + type.slice(1),
      type,
      required: false,
      placeholder: '',
      options: type === 'select' ? ['Option 1', 'Option 2'] : undefined
    };
    setElements([...elements, newEl]);
  };

  const removeElement = (id: string) => {
    setElements(elements.filter(e => e.id !== id));
  };

  const updateElement = (id: string, updates: Partial<IFormElement>) => {
    setElements(elements.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#111418] font-sans overflow-hidden">
      
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
         <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><FormInput size={20} /></div>
            <div>
               <h1 className="text-xl font-bold text-slate-900">Trình tạo Form (Form Builder)</h1>
               <p className="text-xs text-slate-500">Kéo thả để tạo form đăng ký cho Landing Page.</p>
            </div>
         </div>
         <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold text-sm hover:bg-slate-200">
               <Code size={16} /> Lấy mã nhúng
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-[#1380ec] text-white rounded-lg font-bold text-sm hover:bg-blue-700 shadow-sm" onClick={() => alert("Đã lưu Form!")}>
               <Save size={16} /> Lưu Form
            </button>
         </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
         
         {/* LEFT: TOOLBOX */}
         <div className="w-64 bg-white border-r border-slate-200 p-4 flex flex-col gap-4 overflow-y-auto">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Thành phần Form</h3>
            <div className="grid grid-cols-1 gap-2">
               <button onClick={() => addElement('text')} className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all text-sm font-medium text-slate-700">
                  <span className="font-mono bg-slate-100 px-1.5 rounded text-xs">Aa</span> Văn bản ngắn
               </button>
               <button onClick={() => addElement('textarea')} className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all text-sm font-medium text-slate-700">
                  <span className="font-mono bg-slate-100 px-1.5 rounded text-xs">¶</span> Đoạn văn
               </button>
               <button onClick={() => addElement('phone')} className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all text-sm font-medium text-slate-700">
                  <span className="font-mono bg-slate-100 px-1.5 rounded text-xs">#</span> Số điện thoại
               </button>
               <button onClick={() => addElement('email')} className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all text-sm font-medium text-slate-700">
                  <span className="font-mono bg-slate-100 px-1.5 rounded text-xs">@</span> Email
               </button>
               <button onClick={() => addElement('select')} className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all text-sm font-medium text-slate-700">
                  <span className="font-mono bg-slate-100 px-1.5 rounded text-xs">▼</span> Danh sách chọn
               </button>
            </div>
         </div>

         {/* MIDDLE: EDITOR CANVAS */}
         <div className="flex-1 bg-slate-100 p-8 overflow-y-auto flex flex-col items-center">
            
            {/* View Switcher */}
            <div className="flex bg-white rounded-lg p-1 border border-slate-200 mb-6 shadow-sm">
               <button onClick={() => setViewMode('desktop')} className={`p-2 rounded transition-colors ${viewMode === 'desktop' ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}><Monitor size={20} /></button>
               <button onClick={() => setViewMode('mobile')} className={`p-2 rounded transition-colors ${viewMode === 'mobile' ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}><Smartphone size={20} /></button>
            </div>

            {/* Form Preview */}
            <div className={`bg-white shadow-xl rounded-xl border border-slate-200 transition-all duration-300 flex flex-col ${viewMode === 'mobile' ? 'w-[375px]' : 'w-full max-w-2xl'}`}>
               <div className="p-8 border-b border-slate-100 bg-blue-600 rounded-t-xl text-white">
                  <input 
                     value={formTitle}
                     onChange={(e) => setFormTitle(e.target.value)}
                     className="bg-transparent text-2xl font-bold text-center w-full outline-none placeholder-blue-200"
                     placeholder="Tiêu đề Form"
                  />
               </div>
               
               <div className="p-8 space-y-6 min-h-[400px]">
                  {elements.length === 0 && (
                     <div className="text-center text-slate-400 py-10 border-2 border-dashed border-slate-200 rounded-xl">
                        Kéo thả hoặc nhấn nút bên trái để thêm trường
                     </div>
                  )}

                  {elements.map((el, idx) => (
                     <div key={el.id} className="group relative p-4 border border-transparent hover:border-blue-300 hover:bg-blue-50/30 rounded-lg transition-all">
                        {/* Edit Controls Overlay */}
                        <div className="absolute right-2 top-2 hidden group-hover:flex gap-1">
                           <button className="p-1 bg-white border border-slate-200 text-slate-500 rounded hover:text-blue-600 shadow-sm"><Move size={14} /></button>
                           <button onClick={() => removeElement(el.id)} className="p-1 bg-white border border-slate-200 text-slate-500 rounded hover:text-red-600 shadow-sm"><Trash2 size={14} /></button>
                        </div>

                        <div className="mb-2">
                           <input 
                              value={el.label} 
                              onChange={(e) => updateElement(el.id, { label: e.target.value })}
                              className="font-bold text-slate-700 bg-transparent outline-none w-full focus:border-b focus:border-blue-400"
                           />
                        </div>
                        
                        {el.type === 'textarea' ? (
                           <textarea className="w-full p-3 border border-slate-300 rounded-lg bg-white text-sm" placeholder={el.placeholder} disabled></textarea>
                        ) : el.type === 'select' ? (
                           <select className="w-full p-3 border border-slate-300 rounded-lg bg-white text-sm" disabled>
                              <option>Chọn giá trị...</option>
                              {el.options?.map(o => <option key={o}>{o}</option>)}
                           </select>
                        ) : (
                           <input type={el.type} className="w-full p-3 border border-slate-300 rounded-lg bg-white text-sm" placeholder={el.placeholder} disabled />
                        )}

                        <div className="mt-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           <label className="text-xs text-slate-500 flex items-center gap-1 cursor-pointer">
                              <input type="checkbox" checked={el.required} onChange={(e) => updateElement(el.id, { required: e.target.checked })} />
                              Bắt buộc
                           </label>
                           {el.type !== 'select' && (
                              <input 
                                 className="text-xs border-b border-slate-300 bg-transparent outline-none ml-2 w-32" 
                                 placeholder="Placeholder..."
                                 value={el.placeholder}
                                 onChange={(e) => updateElement(el.id, { placeholder: e.target.value })}
                              />
                           )}
                        </div>
                     </div>
                  ))}

                  <button className="w-full py-3 bg-[#1380ec] text-white rounded-lg font-bold shadow-md hover:bg-blue-700 transition-colors pointer-events-none">
                     Gửi Đăng ký
                  </button>
               </div>
            </div>

         </div>
      </div>
    </div>
  );
};

export default AdminFormBuilder;
