
import React, { useState } from 'react';
import { 
  GitGraph, 
  Plus, 
  Play, 
  Settings, 
  MoreHorizontal, 
  Zap, 
  Clock, 
  Mail, 
  MessageSquare, 
  CheckCircle2, 
  XCircle, 
  ArrowDown, 
  UserPlus, 
  Trash2, 
  Save, 
  X,
  Split,
  CornerDownRight
} from 'lucide-react';

interface INode {
  id: string;
  type: 'trigger' | 'action' | 'condition' | 'delay';
  title: string;
  subtitle?: string;
  icon: any;
  color: string;
  branch?: 'true' | 'false'; // Xác định node thuộc nhánh nào
  configData?: any; 
}

// --- MOCK DATA: Kịch bản rẽ nhánh ---
const MOCK_NODES: INode[] = [
  { 
    id: '1', 
    type: 'trigger', 
    title: 'Khi Lead điền Form Website', 
    subtitle: 'Nguồn: Landing Page Du học Đức', 
    icon: Zap, 
    color: 'bg-yellow-500',
  },
  { 
    id: '2', 
    type: 'condition', 
    title: 'Kiểm tra Tài chính', 
    subtitle: 'Ngân sách > 200 Triệu?', 
    icon: GitGraph, 
    color: 'bg-purple-500',
  },
  // --- TRUE BRANCH (Ngân sách cao -> Chăm sóc VIP) ---
  { 
    id: '3_true', 
    type: 'action', 
    title: 'Gán: Senior Sales', 
    subtitle: 'Ưu tiên: Cao', 
    icon: UserPlus, 
    color: 'bg-blue-500',
    branch: 'true'
  },
  { 
    id: '4_true', 
    type: 'action', 
    title: 'SMS: VIP Welcome', 
    subtitle: 'Mẫu: VIP_DE_01', 
    icon: MessageSquare, 
    color: 'bg-indigo-500',
    branch: 'true'
  },
  // --- FALSE BRANCH (Ngân sách thấp -> Chăm sóc tự động) ---
  { 
    id: '3_false', 
    type: 'delay', 
    title: 'Chờ: 1 Giờ', 
    subtitle: '', 
    icon: Clock, 
    color: 'bg-orange-500',
    branch: 'false'
  },
  { 
    id: '4_false', 
    type: 'action', 
    title: 'Email: Giới thiệu chung', 
    subtitle: 'Mẫu: Gen_Intro_DE', 
    icon: Mail, 
    color: 'bg-slate-500',
    branch: 'false'
  },
];

const AdminWorkflowBuilder: React.FC = () => {
  const [nodes, setNodes] = useState<INode[]>(MOCK_NODES);
  const [selectedNode, setSelectedNode] = useState<INode | null>(null);

  const handleNodeClick = (node: INode) => {
    setSelectedNode(node);
  };

  // --- LOGIC: ADD NODE ---
  const handleAddNode = (templateKey: string, branch?: 'true' | 'false') => {
    let newNode: INode = {
        id: `n-${Date.now()}`,
        type: 'action',
        title: 'Hành động mới',
        icon: Zap,
        color: 'bg-slate-500',
        subtitle: 'Chưa cấu hình',
        branch: branch // Gán nhánh nếu có
    };

    switch(templateKey) {
        case 'email': newNode = { ...newNode, type: 'action', title: 'Gửi Email', icon: Mail, color: 'bg-blue-500' }; break;
        case 'sms': newNode = { ...newNode, type: 'action', title: 'Gửi SMS / Zalo', icon: MessageSquare, color: 'bg-indigo-500' }; break;
        case 'assign': newNode = { ...newNode, type: 'action', title: 'Gán Nhân viên', icon: UserPlus, color: 'bg-green-600' }; break;
        case 'condition': newNode = { ...newNode, type: 'condition', title: 'Rẽ nhánh', icon: GitGraph, color: 'bg-purple-500' }; break;
        case 'delay': newNode = { ...newNode, type: 'delay', title: 'Chờ (Delay)', icon: Clock, color: 'bg-orange-500' }; break;
    }

    setNodes(prev => [...prev, newNode]);
  };

  const handleDeleteNode = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (window.confirm('Xóa bước này?')) {
          setNodes(prev => prev.filter(n => n.id !== id));
          if (selectedNode?.id === id) setSelectedNode(null);
      }
  };

  const onDragStart = (e: React.DragEvent, templateKey: string) => {
      e.dataTransfer.setData('templateKey', templateKey);
  };

  const onDrop = (e: React.DragEvent, branch?: 'true' | 'false') => {
      e.preventDefault();
      const templateKey = e.dataTransfer.getData('templateKey');
      if (templateKey) handleAddNode(templateKey, branch);
  };

  const onDragOver = (e: React.DragEvent) => e.preventDefault();

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#111418] font-sans overflow-hidden">
      
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shrink-0">
         <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><GitGraph size={20} /></div>
            <div>
               <h1 className="text-xl font-bold text-slate-900">Quy trình: Phân loại Lead theo Ngân sách</h1>
               <p className="text-xs text-slate-500">Trạng thái: <span className="text-green-600 font-bold">Đang chạy</span></p>
            </div>
         </div>
         <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg font-bold text-sm hover:bg-slate-50 transition-colors">
               <Settings size={16} /> Cài đặt
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-[#1380ec] text-white rounded-lg font-bold text-sm hover:bg-blue-700 shadow-sm transition-colors">
               <Play size={16} /> Kích hoạt
            </button>
         </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
         
         {/* CANVAS AREA */}
         <div className="flex-1 bg-slate-50 overflow-y-auto p-10 relative custom-scrollbar" onClick={() => setSelectedNode(null)}>
            
            <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" 
                 style={{ backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
            </div>

            <div className="flex flex-col items-center z-10 w-full pb-40">
               
               {/* START LABEL */}
               <div className="mb-4">
                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-green-200 shadow-sm">Start</span>
               </div>

               {/* MAIN FLOW (Central Nodes) */}
               {nodes.filter(n => !n.branch).map((node, idx) => (
                  <React.Fragment key={node.id}>
                     {idx > 0 && <div className="h-8 w-0.5 bg-slate-300"></div>}
                     {idx > 0 && <ArrowDown size={16} className="text-slate-300 -mt-1 mb-1" />}
                     
                     <div 
                        onClick={(e) => { e.stopPropagation(); handleNodeClick(node); }}
                        className={`w-[280px] bg-white rounded-xl shadow-sm border p-4 flex items-center gap-4 cursor-pointer relative z-10 hover:scale-105 transition-transform
                            ${selectedNode?.id === node.id ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200'}
                        `}
                     >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm ${node.color}`}>
                           <node.icon size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                           <p className="text-[10px] font-bold text-slate-400 uppercase">{node.type}</p>
                           <h4 className="font-bold text-slate-900 text-sm truncate">{node.title}</h4>
                           {node.subtitle && <p className="text-xs text-slate-500 truncate">{node.subtitle}</p>}
                        </div>
                        {/* Conditional Split Visualization */}
                        {node.type === 'condition' && (
                           <div className="absolute top-full left-1/2 -translate-x-1/2 w-[400px] h-12 border-t-2 border-x-2 border-slate-300 rounded-t-2xl mt-4 -z-10"></div>
                        )}
                     </div>
                  </React.Fragment>
               ))}

               {/* BRANCHES CONTAINER */}
               <div className="flex justify-center gap-16 mt-4 w-full max-w-4xl">
                  
                  {/* --- TRUE BRANCH (LEFT) --- */}
                  <div 
                     className="flex flex-col items-center flex-1 min-w-[250px] p-4 rounded-xl border-2 border-dashed border-green-100 bg-green-50/30"
                     onDragOver={onDragOver}
                     onDrop={(e) => onDrop(e, 'true')}
                  >
                     <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold mb-4 shadow-sm border border-green-200">
                        TRUE (Đúng)
                     </span>
                     
                     {nodes.filter(n => n.branch === 'true').map((node, idx) => (
                        <React.Fragment key={node.id}>
                           {idx > 0 && <div className="h-6 w-0.5 bg-green-300"></div>}
                           {idx > 0 && <ArrowDown size={14} className="text-green-300 -mt-1 mb-1" />}
                           
                           <div 
                              onClick={(e) => { e.stopPropagation(); handleNodeClick(node); }}
                              className={`w-full bg-white rounded-lg p-3 flex items-center gap-3 cursor-pointer shadow-sm border hover:shadow-md transition-all relative group
                                 ${selectedNode?.id === node.id ? 'border-green-500 ring-1 ring-green-200' : 'border-slate-200'}
                              `}
                           >
                              <div className={`w-8 h-8 rounded flex items-center justify-center text-white ${node.color}`}><node.icon size={16}/></div>
                              <div className="flex-1 min-w-0">
                                 <p className="font-bold text-slate-800 text-sm truncate">{node.title}</p>
                                 <p className="text-[10px] text-slate-500 truncate">{node.subtitle || node.type}</p>
                              </div>
                              <button onClick={(e) => handleDeleteNode(e, node.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500"><Trash2 size={14}/></button>
                           </div>
                        </React.Fragment>
                     ))}
                     
                     <div className="mt-4">
                        <button className="text-xs text-green-600 font-bold flex items-center gap-1 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors">
                           <Plus size={14} /> Thêm bước
                        </button>
                     </div>
                  </div>

                  {/* --- FALSE BRANCH (RIGHT) --- */}
                  <div 
                     className="flex flex-col items-center flex-1 min-w-[250px] p-4 rounded-xl border-2 border-dashed border-red-100 bg-red-50/30"
                     onDragOver={onDragOver}
                     onDrop={(e) => onDrop(e, 'false')}
                  >
                     <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold mb-4 shadow-sm border border-red-200">
                        FALSE (Sai)
                     </span>

                     {nodes.filter(n => n.branch === 'false').map((node, idx) => (
                        <React.Fragment key={node.id}>
                           {idx > 0 && <div className="h-6 w-0.5 bg-red-300"></div>}
                           {idx > 0 && <ArrowDown size={14} className="text-red-300 -mt-1 mb-1" />}
                           
                           <div 
                              onClick={(e) => { e.stopPropagation(); handleNodeClick(node); }}
                              className={`w-full bg-white rounded-lg p-3 flex items-center gap-3 cursor-pointer shadow-sm border hover:shadow-md transition-all relative group
                                 ${selectedNode?.id === node.id ? 'border-red-500 ring-1 ring-red-200' : 'border-slate-200'}
                              `}
                           >
                              <div className={`w-8 h-8 rounded flex items-center justify-center text-white ${node.color}`}><node.icon size={16}/></div>
                              <div className="flex-1 min-w-0">
                                 <p className="font-bold text-slate-800 text-sm truncate">{node.title}</p>
                                 <p className="text-[10px] text-slate-500 truncate">{node.subtitle || node.type}</p>
                              </div>
                              <button onClick={(e) => handleDeleteNode(e, node.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500"><Trash2 size={14}/></button>
                           </div>
                        </React.Fragment>
                     ))}

                     <div className="mt-4">
                        <button className="text-xs text-red-600 font-bold flex items-center gap-1 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors">
                           <Plus size={14} /> Thêm bước
                        </button>
                     </div>
                  </div>

               </div>

            </div>
         </div>

         {/* RIGHT SIDEBAR: PALETTE */}
         <div className="w-72 bg-white border-l border-slate-200 flex flex-col shadow-xl z-20">
            {selectedNode ? (
               <div className="flex flex-col h-full animate-in slide-in-from-right-10">
                  <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                     <h3 className="font-bold text-slate-800 text-sm">Cấu hình</h3>
                     <button onClick={() => setSelectedNode(null)}><X size={18} className="text-slate-400"/></button>
                  </div>
                  <div className="p-4 space-y-4">
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Tên bước</label>
                        <input className="w-full mt-1 border rounded p-2 text-sm" defaultValue={selectedNode.title} />
                     </div>
                     {selectedNode.type === 'condition' && (
                        <div className="bg-purple-50 p-3 rounded border border-purple-100 text-sm">
                           <p className="font-bold text-purple-800 mb-1">Logic Rẽ nhánh:</p>
                           <p className="text-purple-700">Nếu điều kiện thỏa mãn (True), quy trình sẽ đi sang nhánh trái. Ngược lại (False) sẽ đi nhánh phải.</p>
                        </div>
                     )}
                  </div>
               </div>
            ) : (
               <div className="flex flex-col h-full">
                  <div className="p-4 border-b border-slate-200">
                     <h3 className="font-bold text-slate-900 text-sm uppercase">Công cụ</h3>
                     <p className="text-xs text-slate-500">Kéo thả vào vùng True/False</p>
                  </div>
                  <div className="p-4 space-y-3">
                     {[
                        { id: 'email', label: 'Gửi Email', icon: Mail, color: 'text-blue-600 bg-blue-100' },
                        { id: 'sms', label: 'Gửi SMS', icon: MessageSquare, color: 'text-indigo-600 bg-indigo-100' },
                        { id: 'assign', label: 'Gán Sale', icon: UserPlus, color: 'text-green-600 bg-green-100' },
                        { id: 'delay', label: 'Chờ (Delay)', icon: Clock, color: 'text-orange-600 bg-orange-100' },
                     ].map(tool => (
                        <div 
                           key={tool.id}
                           draggable 
                           onDragStart={(e) => onDragStart(e, tool.id)}
                           className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-grab hover:shadow-md hover:border-blue-300 transition-all bg-white"
                        >
                           <div className={`p-1.5 rounded ${tool.color}`}><tool.icon size={16}/></div>
                           <span className="text-sm font-medium text-slate-700">{tool.label}</span>
                        </div>
                     ))}
                  </div>
               </div>
            )}
         </div>

      </div>
    </div>
  );
};

export default AdminWorkflowBuilder;
