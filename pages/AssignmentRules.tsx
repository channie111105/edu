
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import { 
  ArrowLeft, 
  Plus, 
  Save, 
  Trash2, 
  MoreVertical, 
  Shuffle, 
  Scale, 
  Users, 
  Zap,
  Check,
  AlertCircle,
  Clock,
  Globe,
  Filter
} from 'lucide-react';

// --- Types Local ---
interface ICriteria {
  field: 'program' | 'source' | 'campaign';
  operator: 'equals' | 'contains';
  value: string;
}

interface IRule {
  id: string;
  name: string;
  isActive: boolean;
  priority: number;
  criteria: ICriteria[];
  assignToTeam: string[]; // Team IDs or Names
  distributionMethod: 'round-robin' | 'weighted';
  skipOffline: boolean; // SLA Feature
}

// --- Mock Data ---
const MOCK_RULES: IRule[] = [
  {
    id: 'r1',
    name: 'Phân bổ Team Đức (Ưu tiên cao)',
    isActive: true,
    priority: 1,
    criteria: [
      { field: 'program', operator: 'contains', value: 'Đức' }
    ],
    assignToTeam: ['Nguyễn Sale', 'Phạm Sale'],
    distributionMethod: 'round-robin',
    skipOffline: true,
  },
  {
    id: 'r2',
    name: 'Phân bổ Team Trung',
    isActive: true,
    priority: 2,
    criteria: [
      { field: 'program', operator: 'contains', value: 'Trung' }
    ],
    assignToTeam: ['Trần Sale'],
    distributionMethod: 'weighted',
    skipOffline: false,
  },
  {
    id: 'r3',
    name: 'Lead từ Landing Page (Nguồn lạnh)',
    isActive: false,
    priority: 3,
    criteria: [
      { field: 'source', operator: 'equals', value: 'Landing Page' }
    ],
    assignToTeam: ['Lê Leader'],
    distributionMethod: 'round-robin',
    skipOffline: true,
  }
];

const AssignmentRules: React.FC = () => {
  const { hasPermission } = useAuth();
  const [rules, setRules] = useState<IRule[]>(MOCK_RULES);
  const [isEditing, setIsEditing] = useState(false);
  const [currentRule, setCurrentRule] = useState<IRule | null>(null);

  // Permission Check - REMOVED ADMIN
  if (!hasPermission([UserRole.FOUNDER, UserRole.SALES_LEADER])) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 bg-white p-8 rounded-xl">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-gray-900">Quyền truy cập bị từ chối</h2>
        <p>Bạn không có quyền truy cập trang cấu hình này.</p>
      </div>
    );
  }

  const handleEdit = (rule: IRule) => {
    setCurrentRule({ ...rule });
    setIsEditing(true);
  };

  const handleCreate = () => {
    setCurrentRule({
      id: `new-${Date.now()}`,
      name: '',
      isActive: true,
      priority: rules.length + 1,
      criteria: [{ field: 'program', operator: 'equals', value: 'Tiếng Đức' }],
      assignToTeam: [],
      distributionMethod: 'round-robin',
      skipOffline: true,
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!currentRule) return;
    
    // Update or Add
    const exists = rules.find(r => r.id === currentRule.id);
    if (exists) {
      setRules(rules.map(r => r.id === currentRule.id ? currentRule : r));
    } else {
      setRules([...rules, currentRule]);
    }
    
    setIsEditing(false);
    setCurrentRule(null);
  };

  const toggleRuleStatus = (id: string) => {
    setRules(rules.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r));
  };

  return (
    <div className="flex flex-col h-full font-sans text-[#111418]">
      
      {/* --- Breadcrumb & Header --- */}
      <div className="mb-6">
        <div className="flex items-center text-xs text-gray-500 mb-2 gap-2">
           <Link to="/" className="hover:text-[#0056b3]">Tổng quan</Link>
           <span>/</span>
           <span className="text-gray-500">Cấu hình hệ thống</span>
           <span>/</span>
           <span className="font-semibold text-gray-700">Quy tắc phân bổ</span>
        </div>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Quy tắc phân bổ cơ hội</h1>
            <p className="text-sm text-gray-500 mt-1">
              Thiết lập logic tự động chia Lead cho nhân viên dựa trên nguồn, sản phẩm và trạng thái Online.
            </p>
          </div>
          {!isEditing && (
            <button 
              onClick={handleCreate}
              className="flex items-center justify-center h-10 px-4 rounded-lg bg-[#0056b3] text-white text-sm font-bold hover:bg-blue-800 transition-colors shadow-sm"
            >
              <Plus size={18} className="mr-2" />
              Thêm quy tắc mới
            </button>
          )}
        </div>
      </div>

      {isEditing && currentRule ? (
        // --- EDITOR FORM ---
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden animate-in slide-in-from-right-4 duration-300">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
             <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
               {currentRule.id.startsWith('new') ? <Plus size={20} /> : <Filter size={20} />}
               {currentRule.id.startsWith('new') ? 'Tạo quy tắc mới' : 'Chỉnh sửa quy tắc'}
             </h2>
             <div className="flex gap-2">
                <button 
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Hủy bỏ
                </button>
                <button 
                  onClick={handleSave}
                  className="px-4 py-2 text-sm font-bold text-white bg-[#0056b3] hover:bg-blue-800 rounded-lg shadow-sm flex items-center gap-2 transition-colors"
                >
                  <Save size={16} /> Lưu quy tắc
                </button>
             </div>
          </div>

          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left: General Info & Criteria */}
            <div className="space-y-6">
               <div>
                 <label className="block text-sm font-bold text-gray-700 mb-2">Tên quy tắc</label>
                 <input 
                    type="text" 
                    value={currentRule.name}
                    onChange={(e) => setCurrentRule({...currentRule, name: e.target.value})}
                    placeholder="Ví dụ: Phân bổ Lead Đức cho Team A"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0056b3] outline-none text-sm"
                 />
               </div>

               <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <h3 className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-2">
                    <Filter size={16} /> Điều kiện lọc (Criteria)
                  </h3>
                  {currentRule.criteria.map((crt, idx) => (
                    <div key={idx} className="flex gap-3 mb-2 items-center">
                        <select 
                          className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm outline-none"
                          value={crt.field}
                          onChange={(e) => {
                             const newCriteria = [...currentRule.criteria];
                             newCriteria[idx].field = e.target.value as any;
                             setCurrentRule({...currentRule, criteria: newCriteria});
                          }}
                        >
                          <option value="program">Sản phẩm / Chương trình</option>
                          <option value="source">Nguồn (Source)</option>
                          <option value="campaign">Chiến dịch</option>
                        </select>
                        <select 
                          className="w-24 px-2 py-2 bg-white border border-gray-300 rounded-md text-sm outline-none"
                          value={crt.operator}
                          disabled
                        >
                          <option value="equals">Là</option>
                          <option value="contains">Chứa</option>
                        </select>
                        <input 
                           type="text" 
                           className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm outline-none"
                           value={crt.value}
                           onChange={(e) => {
                              const newCriteria = [...currentRule.criteria];
                              newCriteria[idx].value = e.target.value;
                              setCurrentRule({...currentRule, criteria: newCriteria});
                           }}
                        />
                        <button className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                    </div>
                  ))}
                  <button className="text-xs font-bold text-[#0056b3] hover:underline mt-2 flex items-center gap-1">
                    <Plus size={12} /> Thêm điều kiện
                  </button>
               </div>
            </div>

            {/* Right: Action & SLA */}
            <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Phân bổ cho (Assign To)</label>
                  <div className="border border-gray-300 rounded-lg p-3 max-h-32 overflow-y-auto bg-gray-50">
                     {['Nguyễn Sale (Team Đức)', 'Phạm Sale (Team Đức)', 'Trần Sale (Team Trung)', 'Lê Leader'].map((staff) => (
                       <label key={staff} className="flex items-center gap-2 mb-2 last:mb-0 cursor-pointer">
                         <input 
                            type="checkbox" 
                            checked={currentRule.assignToTeam.some(s => staff.includes(s))}
                            onChange={(e) => {
                               const name = staff.split(' (')[0]; // Simple parse
                               if (e.target.checked) {
                                  setCurrentRule({...currentRule, assignToTeam: [...currentRule.assignToTeam, name]});
                               } else {
                                  setCurrentRule({...currentRule, assignToTeam: currentRule.assignToTeam.filter(s => s !== name)});
                               }
                            }}
                            className="rounded text-[#0056b3] focus:ring-[#0056b3]" 
                          />
                         <span className="text-sm text-gray-700">{staff}</span>
                       </label>
                     ))}
                  </div>
                </div>

                <div>
                   <label className="block text-sm font-bold text-gray-700 mb-2">Phương thức phân phối</label>
                   <div className="grid grid-cols-2 gap-4">
                      <div 
                        onClick={() => setCurrentRule({...currentRule, distributionMethod: 'round-robin'})}
                        className={`cursor-pointer border rounded-lg p-3 flex flex-col items-center text-center transition-all ${currentRule.distributionMethod === 'round-robin' ? 'border-[#0056b3] bg-blue-50 ring-1 ring-[#0056b3]' : 'border-gray-200 hover:border-gray-300'}`}
                      >
                         <Shuffle size={24} className={`mb-2 ${currentRule.distributionMethod === 'round-robin' ? 'text-[#0056b3]' : 'text-gray-400'}`} />
                         <span className={`text-sm font-bold ${currentRule.distributionMethod === 'round-robin' ? 'text-[#0056b3]' : 'text-gray-600'}`}>Tự động xoay vòng</span>
                         <span className="text-xs text-gray-500 mt-1">Chia đều lần lượt (Round Robin)</span>
                      </div>
                      <div 
                        onClick={() => setCurrentRule({...currentRule, distributionMethod: 'weighted'})}
                        className={`cursor-pointer border rounded-lg p-3 flex flex-col items-center text-center transition-all ${currentRule.distributionMethod === 'weighted' ? 'border-[#0056b3] bg-blue-50 ring-1 ring-[#0056b3]' : 'border-gray-200 hover:border-gray-300'}`}
                      >
                         <Scale size={24} className={`mb-2 ${currentRule.distributionMethod === 'weighted' ? 'text-[#0056b3]' : 'text-gray-400'}`} />
                         <span className={`text-sm font-bold ${currentRule.distributionMethod === 'weighted' ? 'text-[#0056b3]' : 'text-gray-600'}`}>Theo trọng số</span>
                         <span className="text-xs text-gray-500 mt-1">Dựa trên năng suất/KPI</span>
                      </div>
                   </div>
                </div>

                <div className="border-t border-gray-100 pt-4">
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className="p-2 bg-amber-100 text-amber-600 rounded-full">
                            <Zap size={18} />
                         </div>
                         <div>
                            <span className="block text-sm font-bold text-gray-900">Kiểm tra SLA (Skip Offline)</span>
                            <span className="block text-xs text-gray-500">Tự động bỏ qua nhân viên không online trong 5 phút.</span>
                         </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={currentRule.skipOffline} 
                          onChange={(e) => setCurrentRule({...currentRule, skipOffline: e.target.checked})}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0056b3]"></div>
                      </label>
                   </div>
                </div>

            </div>
          </div>
        </div>
      ) : (
        // --- RULE LIST ---
        <div className="grid grid-cols-1 gap-4">
          {rules.map((rule) => (
            <div 
              key={rule.id} 
              className={`bg-white rounded-xl p-5 border transition-all duration-200 hover:shadow-md ${rule.isActive ? 'border-gray-200' : 'border-gray-100 bg-gray-50 opacity-80'}`}
            >
              <div className="flex justify-between items-start">
                 <div className="flex items-start gap-4">
                    <div className="mt-1">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={rule.isActive} 
                          onChange={() => toggleRuleStatus(rule.id)}
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                      </label>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className={`text-base font-bold ${rule.isActive ? 'text-gray-900' : 'text-gray-500'}`}>{rule.name}</h3>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold uppercase rounded border border-gray-200">
                          Priority {rule.priority}
                        </span>
                      </div>
                      
                      <div className="mt-2 flex flex-wrap gap-2 text-sm text-gray-600">
                         {/* Criteria Chips */}
                         {rule.criteria.map((c, i) => (
                           <span key={i} className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">
                              {c.field === 'program' ? 'Sản phẩm' : c.field === 'source' ? 'Nguồn' : c.field} 
                              {' '}{c.operator === 'equals' ? '=' : 'chứa'}{' '}
                              <span className="font-bold ml-1">"{c.value}"</span>
                           </span>
                         ))}
                         <span className="text-gray-300 mx-1">|</span>
                         <span className="flex items-center gap-1 text-xs">
                            {rule.distributionMethod === 'round-robin' ? <Shuffle size={12} /> : <Scale size={12} />}
                            {rule.distributionMethod === 'round-robin' ? 'Xoay vòng' : 'Trọng số'}
                         </span>
                         {rule.skipOffline && (
                           <span className="flex items-center gap-1 text-xs text-amber-600 font-medium ml-2">
                             <Zap size={12} /> SLA Active
                           </span>
                         )}
                      </div>
                    </div>
                 </div>

                 <div className="flex items-center gap-4">
                    <div className="flex -space-x-2">
                       {rule.assignToTeam.slice(0,3).map((u, i) => (
                          <div key={i} className="w-8 h-8 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-xs font-bold text-indigo-700" title={u}>
                             {u.charAt(0)}
                          </div>
                       ))}
                       {rule.assignToTeam.length > 3 && (
                         <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs font-bold text-gray-500">
                           +{rule.assignToTeam.length - 3}
                         </div>
                       )}
                    </div>
                    <div className="h-8 w-px bg-gray-200 mx-2"></div>
                    <button 
                      onClick={() => handleEdit(rule)}
                      className="text-blue-600 font-medium text-sm hover:underline"
                    >
                      Cấu hình
                    </button>
                 </div>
              </div>
            </div>
          ))}
          
          {/* Help Banner */}
          <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-dashed border-gray-300 flex items-start gap-3">
             <div className="p-2 bg-blue-100 text-[#0056b3] rounded-full">
                <Globe size={20} />
             </div>
             <div>
                <h4 className="text-sm font-bold text-gray-900">Logic phân bổ Sản phẩm</h4>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                   Hệ thống sẽ chạy quy tắc từ trên xuống dưới (Theo độ ưu tiên). 
                   Nếu Lead khớp với điều kiện "Sản phẩm chứa Tiếng Đức", nó sẽ được giao cho Team Đức và dừng quy trình phân bổ (nếu quy tắc đó được thiết lập là 'Exclusive'). 
                   <br/>Hãy đảm bảo bật "Skip Offline" để tránh giao Lead cho nhân viên đã tan ca (Vi phạm SLA 5 phút).
                </p>
             </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default AssignmentRules;
