import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { DealStage, IDeal, ILead, LeadStatus } from '../types';
import { getDeals, saveDeals, getContacts, addContact, updateDeal } from '../utils/storage';
import { useAuth } from '../contexts/AuthContext';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import UnifiedLeadDrawer from '../components/UnifiedLeadDrawer';
import DealPivotTable from '../components/DealPivotTable';
import {
  Phone, Mail, MessageCircle, Calendar, DollarSign, User,
  FileText, CheckCircle, XCircle, AlertCircle, Clock, Plus,
  TrendingUp, Package, Sparkles, LayoutGrid, Kanban, List as ListIcon
} from 'lucide-react';

// Pipeline Stages với hoạt động cụ thể
const PIPELINE_STAGES = [
  {
    id: DealStage.DEEP_CONSULTING,
    title: 'Tư vấn chuyên sâu',
    color: 'blue',
    activities: ['Phân tích hồ sơ', 'Xây dựng lộ trình', 'Đặt lịch hẹn']
  },
  {
    id: DealStage.PROPOSAL,
    title: 'Gửi lộ trình & Báo giá',
    color: 'purple',
    activities: ['Lập bảng tài chính', 'Gửi Timeline', 'Gửi mẫu HĐ']
  },
  {
    id: DealStage.NEGOTIATION,
    title: 'Thương thảo',
    color: 'amber',
    activities: ['Giải đáp thắc mắc', 'Áp dụng ưu đãi', 'Xử lý từ chối']
  },
  {
    id: DealStage.DOCUMENT_COLLECTION,
    title: 'Thu thập hồ sơ',
    color: 'cyan',
    activities: ['Checklist hồ sơ', 'Scan & Upload', 'Xác nhận đầy đủ']
  },
  {
    id: DealStage.WON,
    title: 'Chốt thành công',
    color: 'green',
    activities: ['Chốt Deal', 'Bàn giao', 'Chuyển xử lý hồ sơ']
  },
  {
    id: DealStage.CONTRACT,
    title: 'Đặt cọc & Ký HĐ',
    color: 'orange',
    activities: ['Khởi tạo HĐ', 'Xác nhận thanh toán', 'Ký kết']
  }
];

const Pipeline: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [deals, setDeals] = useState<IDeal[]>([]);
  const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'pivot'>('kanban');
  const [highlightDealId, setHighlightDealId] = useState<string | null>(null);

  // Drawer State
  const [selectedDeal, setSelectedDeal] = useState<IDeal | null>(null);
  const [drawerLead, setDrawerLead] = useState<ILead | null>(null);

  // Load deals and handle highlight
  useEffect(() => {
    const loadedDeals = getDeals();
    setDeals(loadedDeals);

    // Check for newDeal param
    const params = new URLSearchParams(location.search);
    const newDealId = params.get('newDeal');
    if (newDealId) {
      setHighlightDealId(newDealId);
      // Remove highlight after 3 seconds
      setTimeout(() => setHighlightDealId(null), 3000);
    }
  }, [location]);

  // Drag and Drop Handler
  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const newStage = destination.droppableId as DealStage;
    const updatedDeals = deals.map(deal =>
      deal.id === draggableId ? { ...deal, stage: newStage } : deal
    );

    setDeals(updatedDeals);
    saveDeals(updatedDeals);
  };

  // Group deals by stage
  const getDealsByStage = (stage: DealStage) => {
    return deals.filter(deal => deal.stage === stage);
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Handle Deal Click -> Open Drawer (Unified Form)
  const handleDealClick = (deal: IDeal) => {
    const contacts = getContacts();
    let contact = contacts.find(c => c.id === deal.leadId);

    // Fallback: Try to find by name if ID link is broken (for older conversions)
    if (!contact) {
      const potentialName = deal.title.split(' - ')[0].trim();
      contact = contacts.find(c => c.name.toLowerCase() === potentialName.toLowerCase());
    }

    if (contact) {
      // Construct ILead from Contact + Deal
      // This allows using the UnifiedLeadDrawer seamlessly
      const unifiedLead: ILead = {
        id: contact.id, // Use contact ID as lead ID to sync updates
        name: contact.name,
        phone: contact.phone,
        email: contact.email || '',
        program: (deal.title.split('-')[1] || '').trim() as any, // Try to parse program or default
        source: contact.source || 'Unknown',
        status: deal.stage as unknown as LeadStatus, // Map Deal Stage to Status
        ownerId: deal.ownerId,
        createdAt: deal.createdAt,
        value: deal.value,

        // Sync Extended Info
        studentInfo: {
          languageLevel: contact.languageLevel,
          financialStatus: contact.financialStatus,
          socialLink: contact.socialLink,
          targetCountry: contact.targetCountry,
        },
        address: contact.address,
        city: contact.city,
        dob: contact.dob,
        identityCard: contact.identityCard,
        identityDate: contact.identityDate,
        identityPlace: contact.identityPlace,
        gender: contact.gender,

        // Deal specific
        expectedClosingDate: deal.expectedCloseDate,
        productItems: deal.productItems || [], // Fetch detailed products
        discount: deal.discount || 0,
        paymentRoadmap: deal.paymentRoadmap || '',
        notes: contact.notes,
        activities: contact.activities || [], // Fetch activities from Contact
        lastInteraction: deal.createdAt,
      };

      setDrawerLead(unifiedLead);
      setSelectedDeal(deal);
    } else {
      alert("Không tìm thấy thông tin Contact gốc của Deal này.");
    }
  };

  const handleDrawerUpdate = (updatedLead: ILead) => {
    // 1. Update Contact
    if (drawerLead && selectedDeal) {
      const contactUpdate = {
        id: drawerLead.id,
        name: updatedLead.name,
        phone: updatedLead.phone,
        email: updatedLead.email,
        address: updatedLead.address,
        city: updatedLead.city,
        dob: updatedLead.dob,
        identityCard: updatedLead.identityCard,
        identityDate: updatedLead.identityDate,
        identityPlace: updatedLead.identityPlace,
        gender: updatedLead.gender,
        studentInfo: updatedLead.studentInfo,
        notes: updatedLead.notes,
        activities: updatedLead.activities // Pass activities back
      };
      // Update contact in storage
      addContact(contactUpdate as any); // addContact handles merge/update

      // 2. Update Deal status/stage if changed
      const newStage = updatedLead.status as unknown as DealStage;
      const updatedDeal = {
        ...selectedDeal,
        value: updatedLead.value || selectedDeal.value,
        stage: Object.values(DealStage).includes(newStage) ? newStage : selectedDeal.stage,
        expectedCloseDate: updatedLead.expectedClosingDate || selectedDeal.expectedCloseDate,
        productItems: updatedLead.productItems, // Save detailed products
        discount: updatedLead.discount,
        paymentRoadmap: updatedLead.paymentRoadmap
      };

      updateDeal(updatedDeal);

      // 3. Update UI State
      setDeals(prev => prev.map(d => d.id === updatedDeal.id ? updatedDeal : d));
      setDrawerLead(updatedLead);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pipeline - Quy trình chốt Deal</h1>
          <p className="text-sm text-slate-600 mt-1">
            Quản lý hành trình từ tư vấn đến chốt thành công
          </p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button onClick={() => setViewMode('kanban')} className={`p-2 rounded ${viewMode === 'kanban' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`} title="Kanban"><Kanban size={18} /></button>
          <button onClick={() => setViewMode('list')} className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`} title="Danh sách"><ListIcon size={18} /></button>
          <button onClick={() => setViewMode('pivot')} className={`p-2 rounded ${viewMode === 'pivot' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`} title="Báo cáo Pivot"><LayoutGrid size={18} /></button>
        </div>
      </header>

      {/* CONTENT AREA */}
      <div className="flex-1 overflow-hidden relative">
        {viewMode === 'kanban' ? (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="h-full overflow-x-auto p-6">
              <div className="flex gap-6 h-full min-w-max">
                {PIPELINE_STAGES.map(stage => {
                  const stageDeals = getDealsByStage(stage.id);

                  return (
                    <div key={stage.id} className="flex flex-col min-w-[300px] max-w-[320px] h-full flex-shrink-0">
                      {/* Stage Header - Enhanced Style */}
                      <div className="flex items-center justify-between px-4 py-3 mb-3 bg-blue-50 rounded-t-lg border-b-2 border-blue-200">
                        <h3 className="font-bold text-blue-900 text-sm tracking-wide">
                          {stage.title}
                        </h3>
                        <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full">
                          {stageDeals.length}
                        </span>
                      </div>
                      {/* Droppable Area */}
                      <Droppable droppableId={stage.id} isDropDisabled={false}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`flex-1 overflow-y-auto p-3 space-y-3 bg-white rounded-lg shadow-sm border-2 border-slate-200 border-t-4 border-t-blue-500 ${snapshot.isDraggingOver ? 'bg-blue-50 border-blue-400' : ''
                              }`}
                          >
                            {stageDeals.map((deal, index) => (
                              <Draggable key={deal.id} draggableId={deal.id} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`bg-white border-2 rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-pointer ${snapshot.isDragging ? 'shadow-lg rotate-2' : ''
                                      } ${highlightDealId === deal.id
                                        ? 'border-green-500 bg-green-50 animate-pulse'
                                        : 'border-slate-200'
                                      }`}
                                    onClick={() => handleDealClick(deal)}
                                  >
                                    {/* Deal Card Content */}
                                    <div className="space-y-2">
                                      {/* Title */}
                                      <h4 className="font-bold text-sm text-slate-900 line-clamp-2">
                                        {deal.title}
                                      </h4>

                                      {/* Value */}
                                      <div className="flex items-center gap-2">
                                        <DollarSign size={14} className="text-green-600" />
                                        <span className="text-sm font-bold text-green-600">
                                          {formatCurrency(deal.value)}
                                        </span>
                                      </div>

                                      {/* Owner */}
                                      <div className="flex items-center gap-2">
                                        <User size={14} className="text-slate-500" />
                                        <span className="text-xs text-slate-600">{deal.ownerId}</span>
                                      </div>

                                      {/* Expected Close Date */}
                                      <div className="flex items-center gap-2">
                                        <Calendar size={14} className="text-blue-500" />
                                        <span className="text-xs text-slate-600">
                                          {new Date(deal.expectedCloseDate).toLocaleDateString('vi-VN')}
                                        </span>
                                      </div>

                                      {/* Probability */}
                                      <div className="flex items-center gap-2">
                                        <TrendingUp size={14} className="text-purple-500" />
                                        <div className="flex-1 bg-slate-200 rounded-full h-2">
                                          <div
                                            className="bg-purple-500 h-2 rounded-full"
                                            style={{ width: `${deal.probability}%` }}
                                          />
                                        </div>
                                        <span className="text-xs font-semibold text-purple-600">
                                          {deal.probability}%
                                        </span>
                                      </div>

                                      {/* Products */}
                                      {deal.products && deal.products.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                          {deal.products.map((product, idx) => (
                                            <span
                                              key={idx}
                                              className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                                            >
                                              {product}
                                            </span>
                                          ))}
                                        </div>
                                      )}

                                      {/* New Badge */}
                                      {highlightDealId === deal.id && (
                                        <div className="flex items-center gap-1 mt-2">
                                          <Sparkles size={14} className="text-green-600" />
                                          <span className="text-xs font-bold text-green-600">
                                            Deal mới!
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}

                            {/* Empty State */}
                            {stageDeals.length === 0 && (
                              <div className="text-center py-8 text-slate-400">
                                <Package size={32} className="mx-auto mb-2 opacity-50" />
                                <p className="text-xs">Chưa có Deal</p>
                              </div>
                            )}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  );
                })}
              </div>
            </div>
          </DragDropContext>
        ) : viewMode === 'pivot' ? (
          <div className="p-6 h-full overflow-auto animation-fade-in">
            <DealPivotTable deals={deals} />
          </div>
        ) : (
          <div className="p-6 h-full overflow-auto m-4 bg-white rounded-lg shadow border border-slate-200">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50 font-bold text-slate-700 text-xs uppercase">
                <tr>
                  <th className="p-3 border-b">Deal Name</th>
                  <th className="p-3 border-b">Giá trị</th>
                  <th className="p-3 border-b">Giai đoạn</th>
                  <th className="p-3 border-b">Ngày dự kiến</th>
                  <th className="p-3 border-b">Người phụ trách</th>
                </tr>
              </thead>
              <tbody>
                {deals.map(d => (
                  <tr key={d.id} className="border-b hover:bg-blue-50 cursor-pointer transition-colors" onClick={() => handleDealClick(d)}>
                    <td className="p-3 font-bold text-blue-600">{d.title}</td>
                    <td className="p-3 font-semibold text-green-600">{formatCurrency(d.value)}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold 
                                       ${d.stage === DealStage.WON ? 'bg-green-100 text-green-700' :
                          d.stage === DealStage.LOST ? 'bg-red-100 text-red-700' :
                            'bg-blue-100 text-blue-700'}`}>
                        {d.stage}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">{new Date(d.expectedCloseDate).toLocaleDateString('vi-VN')}</td>
                    <td className="p-3 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold">{d.ownerId?.charAt(0)}</div>
                      {d.ownerId}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* UNIFIED DRAWER FOR DEALS */}
      {drawerLead && (
        <UnifiedLeadDrawer
          isOpen={!!drawerLead}
          lead={drawerLead}
          onClose={() => { setDrawerLead(null); setSelectedDeal(null); }}
          onUpdate={handleDrawerUpdate}
        />
      )}
    </div>
  );
};

export default Pipeline;
