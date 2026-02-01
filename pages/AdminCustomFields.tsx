
import React, { useState } from 'react';
import { 
  PenTool, 
  Plus, 
  Trash2, 
  Edit2, 
  Eye, 
  Type, 
  Calendar, 
  Hash, 
  CheckSquare,
  List
} from 'lucide-react';

interface ICustomField {
  id: string;
  label: string;
  key: string;
  type: 'text' | 'number' | 'date' | 'select' | 'checkbox';
  module: 'Lead' | 'Contact' | 'Deal';
  required: boolean;
  options?: string[]; // For select type
}

const INITIAL_FIELDS: ICustomField[] = [
  { id: '1', label: 'Trình độ tiếng Anh (Bố/Mẹ)', key: 'parent_english_level', type: 'select', module: 'Lead', required: false, options: ['Không biết', 'Cơ bản', 'Giao tiếp tốt'] },
  { id: '2', label: 'Ngày dự kiến bay', key: 'expected_fly_date', type: 'date', module: 'Deal', required: true },
  { id: '3', label: 'Điểm tổng kết GPA lớp 12', key: 'gpa_12', type: 'number', module: 'Contact', required: false },
  { id: '4', label: 'Có người thân tại Đức?', key: 'has_relative_germany', type: 'checkbox', module: 'Lead', required: false },
];

const AdminCustomFields: React.FC = () => {
  const [fields, setFields] = useState<ICustomField[]>(INITIAL_FIELDS);
  const [activeModule, setActiveModule] = useState<'Lead' | 'Contact' | 'Deal'>('Lead');
  const [showModal, setShowModal] = useState(false);
  
  // New Field State
  const [newField, setNewField] = useState<Partial<ICustomField>>({
    type: 'text',
    module: 'Lead',
    required: false
  });

  const handleCreate = () => {
    if (!newField.label || !newField.key) return;
    const field: ICustomField = {
      id: Date.now().toString(),
      label: newField.label,
      key: newField.key,
      type: newField.type as any,
      module: newField.module as any,
      required: newField.required || false,
      options: newField.options
    };
    setFields([...fields, field]);
    setShowModal(false);
    setNewField({ type: 'text', module: activeModule, required: false });
  };

  const deleteField = (id: string) => {
    if(window.confirm('Bạn có chắc chắn muốn xóa trường này? Dữ liệu liên quan có thể bị mất.')) {
        setFields(fields.filter(f => f.id !== id));
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'text': return <Type size={16} className="text-blue-500" />;
      case 'number': return <Hash size={16} className="text-green-500" />;
      case 'date': return <Calendar size={16} className="text-orange-500" />;
      case 'select': return <List size={16} className="text-purple-500" />;
      case 'checkbox': return <CheckSquare size={16} className="text-slate-500" />;
      default: return <Type size={16} />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#111418] font-sans overflow-y-auto">
      <div className="flex flex-1 justify-center py-8">
        <div className="flex flex-col max-w-[1000px] flex-1 px-6 gap-8">
          
          <div className="flex justify-between items-end">
             <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                   <PenTool className="text-blue-600" /> Quản lý Trường Tùy chỉnh (Custom Fields)
                </h1>
                <p className="text-slate-500">Thêm các trường dữ liệu mới vào hệ thống mà không cần can thiệp code.</p>
             </div>
             <button 
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 bg-[#1380ec] text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 shadow-sm transition-colors"
             >
                <Plus size={18} /> Thêm Trường mới
             </button>
          </div>

          {/* Module Tabs */}
          <div className="flex gap-4 border-b border-slate-200">
             {['Lead', 'Contact', 'Deal'].map(m => (
                <button 
                    key={m}
                    onClick={() => setActiveModule(m as any)}
                    className={`pb-3 px-6 font-bold text-sm transition-colors border-b-2 ${activeModule === m ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                    {m === 'Lead' ? 'Khách hàng tiềm năng (Lead)' : m === 'Contact' ? 'Hồ sơ (Contact)' : 'Cơ hội (Deal)'}
                </button>
             ))}
          </div>

          {/* Fields Table */}
          <div className="bg-white rounded-xl border border-[#cfdbe7] shadow-sm overflow-hidden">
             <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                   <tr>
                      <th className="px-6 py-4">Tên hiển thị (Label)</th>
                      <th className="px-6 py-4">Mã trường (Key)</th>
                      <th className="px-6 py-4">Loại dữ liệu</th>
                      <th className="px-6 py-4 text-center">Bắt buộc</th>
                      <th className="px-6 py-4 text-right">Thao tác</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                   {fields.filter(f => f.module === activeModule).map((field) => (
                      <tr key={field.id} className="hover:bg-slate-50 transition-colors">
                         <td className="px-6 py-4 font-bold text-slate-900">{field.label}</td>
                         <td className="px-6 py-4 font-mono text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded w-fit">{field.key}</td>
                         <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                               {getIcon(field.type)}
                               <span className="capitalize">{field.type}</span>
                            </div>
                         </td>
                         <td className="px-6 py-4 text-center">
                            {field.required ? (
                               <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded">Required</span>
                            ) : (
                               <span className="text-slate-400 text-xs">Optional</span>
                            )}
                         </td>
                         <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                               <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"><Edit2 size={16} /></button>
                               <button onClick={() => deleteField(field.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={16} /></button>
                            </div>
                         </td>
                      </tr>
                   ))}
                   {fields.filter(f => f.module === activeModule).length === 0 && (
                      <tr>
                         <td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">Chưa có trường tùy chỉnh nào cho phân hệ này.</td>
                      </tr>
                   )}
                </tbody>
             </table>
          </div>

        </div>
      </div>

      {/* CREATE MODAL */}
      {showModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95">
               <div className="p-5 border-b border-slate-200 bg-slate-50">
                  <h3 className="font-bold text-lg text-slate-900">Thêm Trường mới</h3>
               </div>
               <div className="p-6 space-y-4">
                  <div>
                     <label className="block text-sm font-bold text-slate-700 mb-1">Tên hiển thị (Label)</label>
                     <input 
                        type="text" 
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="VD: Điểm GPA"
                        value={newField.label || ''}
                        onChange={e => setNewField({...newField, label: e.target.value})}
                     />
                  </div>
                  <div>
                     <label className="block text-sm font-bold text-slate-700 mb-1">Mã trường (Key - Unique)</label>
                     <input 
                        type="text" 
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                        placeholder="VD: gpa_score"
                        value={newField.key || ''}
                        onChange={e => setNewField({...newField, key: e.target.value})}
                     />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Loại dữ liệu</label>
                        <select 
                           className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                           value={newField.type}
                           onChange={e => setNewField({...newField, type: e.target.value as any})}
                        >
                           <option value="text">Văn bản (Text)</option>
                           <option value="number">Số (Number)</option>
                           <option value="date">Ngày tháng (Date)</option>
                           <option value="select">Danh sách (Select)</option>
                           <option value="checkbox">Hộp kiểm (Checkbox)</option>
                        </select>
                     </div>
                     <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Phân hệ</label>
                        <select 
                           className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                           value={newField.module}
                           onChange={e => setNewField({...newField, module: e.target.value as any})}
                        >
                           <option value="Lead">Lead</option>
                           <option value="Contact">Contact</option>
                           <option value="Deal">Deal</option>
                        </select>
                     </div>
                  </div>
                  
                  {newField.type === 'select' && (
                      <div>
                         <label className="block text-sm font-bold text-slate-700 mb-1">Các lựa chọn (phân cách bằng dấu phẩy)</label>
                         <textarea 
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="VD: Option A, Option B, Option C"
                            onChange={e => setNewField({...newField, options: e.target.value.split(',').map(s => s.trim())})}
                         />
                      </div>
                  )}

                  <div className="flex items-center gap-2">
                     <input 
                        type="checkbox" 
                        id="required"
                        checked={newField.required}
                        onChange={e => setNewField({...newField, required: e.target.checked})}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                     />
                     <label htmlFor="required" className="text-sm font-medium text-slate-700">Bắt buộc nhập</label>
                  </div>
               </div>
               <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
                  <button onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-lg">Hủy</button>
                  <button onClick={handleCreate} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-sm">Lưu</button>
               </div>
            </div>
         </div>
      )}

    </div>
  );
};

export default AdminCustomFields;
