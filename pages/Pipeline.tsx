import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { DealStage, IDeal, ILead, LeadStatus, IContact, Activity, ActivityType } from '../types';
import { getDeals, saveDeals, getContacts, addContact, updateDeal } from '../utils/storage';
import { useAuth } from '../contexts/AuthContext';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import UnifiedLeadDrawer from '../components/UnifiedLeadDrawer';
import DealPivotTable from '../components/DealPivotTable';
import AdvancedDateFilter, { DateRange } from '../components/AdvancedDateFilter';
import {
  Phone, Mail, MessageCircle, Calendar, DollarSign, User,
  FileText, CheckCircle, XCircle, AlertCircle, Clock, Plus,
  TrendingUp, Package, Sparkles, LayoutGrid, Kanban, List as ListIcon, Columns, Check
} from 'lucide-react';

// Pipeline Stages với hoạt động cụ thể
const PIPELINE_STAGES = [
  {
    id: DealStage.NEW_OPP,
    title: 'New Opp',
    color: 'blue',
    activities: ['Tiếp nhận Lead', 'Xác nhận thông tin', 'Phân công Sales']
  },
  {
    id: DealStage.DEEP_CONSULTING,
    title: 'Tư vấn/Hẹn meeting',
    color: 'blue',
    activities: ['Gọi tư vấn', 'Đặt lịch hẹn', 'Xác nhận nhu cầu']
  },
  {
    id: DealStage.PROPOSAL,
    title: 'Tư vấn sâu (Gửi báo giá, lộ trình)',
    color: 'purple',
    activities: ['Xây dựng lộ trình', 'Gửi báo giá', 'Chốt phương án']
  },
  {
    id: DealStage.NEGOTIATION,
    title: 'Đàm phán (Theo dõi chốt)',
    color: 'amber',
    activities: ['Giải đáp thắc mắc', 'Theo dõi phản hồi', 'Chốt điều kiện']
  },
  {
    id: DealStage.WON,
    title: 'Won',
    color: 'green',
    activities: ['Chốt Deal', 'Bàn giao', 'Xác nhận kết quả']
  },
  {
    id: DealStage.LOST,
    title: 'Lost',
    color: 'red',
    activities: ['Ghi nhận lý do', 'Phân tích nguyên nhân', 'Lên kế hoạch tái liên hệ']
  },
  {
    id: DealStage.AFTER_SALE,
    title: 'After sale',
    color: 'cyan',
    activities: ['Bàn giao hồ sơ', 'Chăm sóc sau bán', 'Theo dõi tái mua']
  }
];

const NEXT_ACTIVITY_TYPES: { id: ActivityType; label: string }[] = [
  { id: 'call', label: 'Gọi điện' },
  { id: 'meeting', label: 'Hẹn gặp' },
  { id: 'email', label: 'Email' }
];

const Pipeline: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [deals, setDeals] = useState<IDeal[]>([]);
  const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'pivot'>('kanban');
  const [highlightDealId, setHighlightDealId] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<DateRange>({ startDate: null, endDate: null, label: 'Tất cả' });
  const [contacts, setContacts] = useState<IContact[]>([]);
  const [showNextActivityModal, setShowNextActivityModal] = useState(false);
  const [nextActivityDealId, setNextActivityDealId] = useState<string | null>(null);
  const [nextActivityType, setNextActivityType] = useState<ActivityType>('call');
  const [nextActivityDate, setNextActivityDate] = useState('');
  const [nextActivitySummary, setNextActivitySummary] = useState('');

  // Drawer & Selection
  const [selectedDeal, setSelectedDeal] = useState<IDeal | null>(null);
  const [drawerLead, setDrawerLead] = useState<ILead | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Column Management
  const ALL_COLUMNS = [
    { id: 'opportunity', label: 'Cơ hội' },
    { id: 'contact', label: 'Họ tên & SĐT' },
    { id: 'email', label: 'Email' },
    { id: 'city', label: 'Địa chỉ (TP)' },
    { id: 'company', label: 'Cơ sở' },
    { id: 'source', label: 'Nguồn' },
    { id: 'salesperson', label: 'Sale' },
    { id: 'tags', label: 'Tags' },
    { id: 'status', label: 'Trạng thái' },
  ];

  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    ALL_COLUMNS.map(c => c.id)
  );

  const [showColumnsDropdown, setShowColumnsDropdown] = useState(false);

  // Load deals and handle highlight
  useEffect(() => {
    const loadedDeals = getDeals();
    setDeals(loadedDeals);
    setContacts(getContacts());

    // Check for newDeal param
    const params = new URLSearchParams(location.search);
    const newDealId = params.get('newDeal');
    if (newDealId) {
      setHighlightDealId(newDealId);
      setNextActivityDealId(newDealId);
      setNextActivityType('call');
      setNextActivityDate(getDefaultActivityDate('call'));
      setNextActivitySummary('');
      setShowNextActivityModal(true);
      // Remove highlight after 3 seconds
      setTimeout(() => setHighlightDealId(null), 3000);
    }
  }, [location]);

  useEffect(() => {
    if (!showNextActivityModal) return;
    setNextActivityDate(getDefaultActivityDate(nextActivityType));
  }, [nextActivityType, showNextActivityModal]);

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

  const handleSaveNextActivity = () => {
    if (!nextActivityDealId || !nextActivitySummary) return;
    const newActivity: Activity = {
      id: `a-${Date.now()}`,
      type: nextActivityType,
      timestamp: new Date(nextActivityDate || Date.now()).toISOString(),
      title: 'Hoạt động tiếp theo',
      description: nextActivitySummary,
      status: 'scheduled'
    };

    const updatedDeals = deals.map(d => {
      if (d.id !== nextActivityDealId) return d;
      return {
        ...d,
        activities: [newActivity, ...(d.activities || [])]
      };
    });

    setDeals(updatedDeals);
    saveDeals(updatedDeals);
    setShowNextActivityModal(false);
    setNextActivityDealId(null);
    setNextActivitySummary('');
  };

  const contactsById = contacts.reduce((acc, contact) => {
    acc[contact.id] = contact;
    return acc;
  }, {} as Record<string, IContact>);

  const getPipelineBucket = (stage: DealStage) => {
    if (stage === DealStage.CONTRACT || stage === DealStage.DOCUMENT_COLLECTION) return DealStage.AFTER_SALE;
    return stage;
  };

  const getStageLabel = (stage: DealStage) => {
    switch (stage) {
      case DealStage.NEW_OPP: return 'New Opp';
      case DealStage.DEEP_CONSULTING: return 'Tư vấn/Hẹn meeting';
      case DealStage.PROPOSAL: return 'Tư vấn sâu (Gửi báo giá, lộ trình)';
      case DealStage.NEGOTIATION: return 'Đàm phán (Theo dõi chốt)';
      case DealStage.WON: return 'Won';
      case DealStage.LOST: return 'Lost';
      case DealStage.AFTER_SALE:
      case DealStage.CONTRACT:
      case DealStage.DOCUMENT_COLLECTION:
        return 'After sale';
      default:
        return stage;
    }
  };

  const getExpectedValue = (deal: IDeal) => {
    if (deal.value > 0) return deal.value;
    if (deal.productItems && deal.productItems.length > 0) {
      return deal.productItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }
    return 0;
  };

  const getNextActivityDate = (deal: IDeal, contact?: IContact) => {
    const allActivities = [
      ...(deal.activities || []),
      ...((contact?.activities as any[]) || [])
    ];
    const scheduled = allActivities
      .filter(a => a && (a.status === 'scheduled' || a.type === 'activity'))
      .map(a => a.datetime || a.timestamp || a.date)
      .filter(Boolean)
      .map((d: string) => new Date(d))
      .filter(d => !Number.isNaN(d.getTime()));

    if (scheduled.length === 0) return '';
    scheduled.sort((a, b) => a.getTime() - b.getTime());
    return scheduled[0].toISOString();
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const parsed = new Date(dateStr);
    if (Number.isNaN(parsed.getTime())) return '-';
    return parsed.toLocaleDateString('vi-VN');
  };

  const getPotentialTag = (probability: number) => {
    if (probability >= 70) return { label: 'Nóng', className: 'bg-red-50 text-red-700 border-red-200' };
    if (probability >= 40) return { label: 'Tiềm năng', className: 'bg-amber-50 text-amber-700 border-amber-200' };
    return { label: 'Lạnh', className: 'bg-slate-100 text-slate-600 border-slate-200' };
  };

  const filteredDeals = deals.filter(deal => {
    // Nếu chưa chọn filter (initial) -> hiện hết hoặc theo default logic
    if (!dateFilter.startDate && !dateFilter.endDate) return true;

    // Lấy Next Activity Date
    const contact = contactsById[deal.leadId];
    const nextActivityDateStr = getNextActivityDate(deal, contact);

    // Nếu filter theo thời gian mà Deal không có lịch hẹn -> Ẩn
    if (!nextActivityDateStr) {
      return false;
    }

    const nextDate = new Date(nextActivityDateStr);

    // Normalize dates for comparison (ignore time components if needed, but for precision keeping them is ok)
    // AdvancedDateFilter returns start at 00:00 and end at 23:59

    if (dateFilter.startDate && nextDate < dateFilter.startDate) return false;
    if (dateFilter.endDate && nextDate > dateFilter.endDate) return false;

    return true;
  });

  // Group deals by stage bucket
  const getDealsByStage = (stage: DealStage) => {
    return filteredDeals.filter(deal => getPipelineBucket(deal.stage) === stage);
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  function getDefaultActivityDate(typeId: ActivityType) {
    const now = new Date();
    const delayHours = typeId === 'meeting' ? 24 : 2;
    now.setHours(now.getHours() + delayHours);
    return new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
  }

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
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <AdvancedDateFilter onChange={setDateFilter} label="Sắp xếp thời gian" />
          </div>

          <div className="relative">
            <button
              onClick={() => setShowColumnsDropdown(!showColumnsDropdown)}
              className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-blue-600 hover:border-blue-200 shadow-sm transition-all flex items-center gap-2"
              title="Cài đặt cột"
            >
              <Columns size={18} />
              <span className="text-xs font-bold font-inter">Cột</span>
            </button>

            {showColumnsDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowColumnsDropdown(false)}></div>
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 animate-in zoom-in-95">
                  <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 mb-1">Hiển thị cột</div>
                  {ALL_COLUMNS.map(col => (
                    <button
                      key={col.id}
                      onClick={() => {
                        if (visibleColumns.includes(col.id)) {
                          if (visibleColumns.length > 1) setVisibleColumns(visibleColumns.filter(id => id !== col.id));
                        } else {
                          // Keep order matching ALL_COLUMNS
                          const nextCols = ALL_COLUMNS.filter(c => c.id === col.id || visibleColumns.includes(c.id)).map(c => c.id);
                          setVisibleColumns(nextCols);
                        }
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-slate-50 rounded-lg transition-colors group"
                    >
                      <span className={`${visibleColumns.includes(col.id) ? 'text-slate-900 font-semibold' : 'text-slate-500'}`}>{col.label}</span>
                      {visibleColumns.includes(col.id) && <Check size={14} className="text-blue-600" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 transition-all">
            <button onClick={() => setViewMode('kanban')} className={`p-2 rounded ${viewMode === 'kanban' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`} title="Kanban"><Kanban size={18} /></button>
            <button onClick={() => setViewMode('list')} className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`} title="Danh sách"><ListIcon size={18} /></button>
            <button onClick={() => setViewMode('pivot')} className={`p-2 rounded ${viewMode === 'pivot' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`} title="Báo cáo Pivot"><LayoutGrid size={18} /></button>
          </div>
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
                            {stageDeals.map((deal, index) => {
                              const contact = contactsById[deal.leadId];
                              const nextDate = getNextActivityDate(deal, contact) || deal.expectedCloseDate;
                              const expectedValue = getExpectedValue(deal);
                              const potential = getPotentialTag(deal.probability || 0);

                              return (
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
                                            {formatCurrency(expectedValue)}
                                          </span>
                                        </div>

                                        {/* Phone */}
                                        {contact?.phone && (
                                          <div className="flex items-center gap-2">
                                            <Phone size={14} className="text-slate-500" />
                                            <span className="text-xs text-slate-600">{contact.phone}</span>
                                          </div>
                                        )}

                                        {/* Owner */}
                                        <div className="flex items-center gap-2">
                                          <User size={14} className="text-slate-500" />
                                          <span className="text-xs text-slate-600">{deal.ownerId}</span>
                                        </div>

                                        {/* Expected Close Date */}
                                        <div className="flex items-center gap-2">
                                          <Calendar size={14} className="text-blue-500" />
                                          <span className="text-xs text-slate-600">
                                            {formatDate(nextDate)}
                                          </span>
                                        </div>

                                        {/* Next Activity Indicator */}
                                        {(() => {
                                          const nextActivity = (deal.activities || []).find(a => a.status === 'scheduled');
                                          if (!nextActivity) return null;

                                          const activityDate = new Date(nextActivity.timestamp);
                                          const now = new Date();
                                          const isOverdue = activityDate < now;

                                          return (
                                            <div className={`flex items-center gap-2 px-2 py-1 rounded-md border ${isOverdue
                                              ? 'bg-red-50 border-red-200'
                                              : 'bg-green-50 border-green-200'
                                              }`}>
                                              <Calendar size={12} className={isOverdue ? 'text-red-600' : 'text-green-600'} />
                                              <span className={`text-[10px] font-bold ${isOverdue ? 'text-red-700' : 'text-green-700'
                                                }`}>
                                                {isOverdue ? '⚠️ Quá hạn' : '✓ Đã lên lịch'}
                                              </span>
                                              <span className="text-[9px] text-slate-500">
                                                {activityDate.toLocaleDateString('vi-VN')}
                                              </span>
                                            </div>
                                          );
                                        })()}

                                        {/* Potential Tag */}
                                        <div className="flex items-center gap-2">
                                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${potential.className}`}>
                                            {potential.label}
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
                              )
                            })}
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
          <div className="flex flex-col h-full overflow-hidden">
            {selectedIds.length > 0 && (
              <div className="bg-blue-50 border-b border-blue-100 px-4 py-2 flex items-center animate-in fade-in slide-in-from-top-1">
                <span className="text-sm font-medium text-blue-700">
                  Đã chọn <span className="font-bold">{selectedIds.length}</span> Deal
                </span>
                <button
                  onClick={() => setSelectedIds([])}
                  className="ml-4 text-xs font-bold text-blue-600 hover:text-blue-800"
                >
                  Bỏ chọn
                </button>
              </div>
            )}
            <div className="flex-1 overflow-auto bg-white rounded-lg shadow border border-slate-200 m-4">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50 sticky top-0 z-10 font-bold text-slate-500 text-[10px] uppercase border-b border-slate-200">
                  <tr>
                    <th className="p-3 text-center border-r border-slate-200 w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.length > 0 && selectedIds.length === filteredDeals.length}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedIds(filteredDeals.map(d => d.id));
                          else setSelectedIds([]);
                        }}
                      />
                    </th>
                    {visibleColumns.includes('opportunity') && <th className="p-3 border-r border-slate-200 min-w-[200px]">Cơ hội</th>}
                    {visibleColumns.includes('contact') && <th className="p-3 border-r border-slate-200 w-40">Liên hệ</th>}
                    {visibleColumns.includes('email') && <th className="p-3 border-r border-slate-200 w-40">Email</th>}
                    {visibleColumns.includes('city') && <th className="p-3 border-r border-slate-200 w-32">Địa chỉ</th>}
                    {visibleColumns.includes('company') && <th className="p-3 border-r border-slate-200 w-32">Cơ sở</th>}
                    {visibleColumns.includes('source') && <th className="p-3 border-r border-slate-200 w-28">Nguồn</th>}
                    {visibleColumns.includes('salesperson') && <th className="p-3 border-r border-slate-200 w-28">Sale</th>}
                    {visibleColumns.includes('tags') && <th className="p-3 border-r border-slate-200 w-32">Tags</th>}
                    {visibleColumns.includes('status') && <th className="p-3 text-center w-32">Trạng thái</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDeals.map(d => {
                    const contact = contactsById[d.leadId];
                    const opportunityName = d.title.split(' - ')[0] || d.title;
                    const programName = d.title.split(' - ')[1] || '';
                    const tags = contact?.marketingData?.tags || [];

                    return (
                      <tr key={d.id} className="hover:bg-blue-50/50 group transition-colors cursor-pointer border-b border-slate-100 last:border-0" onClick={() => handleDealClick(d)}>
                        <td className="p-3 text-center border-r border-slate-50" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(d.id)}
                            onChange={() => {
                              setSelectedIds(prev => prev.includes(d.id) ? prev.filter(id => id !== d.id) : [...prev, d.id]);
                            }}
                          />
                        </td>
                        {visibleColumns.includes('opportunity') && (
                          <td className="p-2 border-r border-slate-50">
                            <div className="flex flex-col gap-0.5">
                              <div className="font-bold text-slate-900 group-hover:text-blue-600">{opportunityName}</div>
                              {programName && (
                                <span className="text-[10px] text-blue-600 font-medium">{programName}</span>
                              )}
                            </div>
                          </td>
                        )}

                        {visibleColumns.includes('contact') && (
                          <td className="p-2 border-r border-slate-50 text-slate-700">
                            <div className="flex flex-col">
                              <span className="font-semibold text-xs">{contact?.name || '-'}</span>
                              <span className="text-[10px] text-slate-500">{contact?.phone || '-'}</span>
                            </div>
                          </td>
                        )}

                        {visibleColumns.includes('email') && (
                          <td className="p-2 border-r border-slate-50 text-slate-600 text-[10px] truncate max-w-[120px]" title={contact?.email}>
                            {contact?.email || '-'}
                          </td>
                        )}

                        {visibleColumns.includes('city') && (
                          <td className="p-2 border-r border-slate-50 text-slate-600 text-[10px]">
                            {contact?.city || '-'}
                          </td>
                        )}

                        {visibleColumns.includes('company') && (
                          <td className="p-2 border-r border-slate-50 text-slate-600 text-[10px]">
                            {contact?.company || 'CS Chính'}
                          </td>
                        )}

                        {visibleColumns.includes('source') && (
                          <td className="p-2 border-r border-slate-50 text-slate-600 text-[10px] truncate max-w-[100px]" title={contact?.source}>
                            {contact?.source || '-'}
                          </td>
                        )}

                        {visibleColumns.includes('salesperson') && (
                          <td className="p-2 border-r border-slate-50 text-slate-600 text-[10px] font-semibold text-blue-700">
                            {d.ownerId || 'Tôi'}
                          </td>
                        )}

                        {visibleColumns.includes('tags') && (
                          <td className="p-2 border-r border-slate-50">
                            <div className="flex flex-wrap gap-1">
                              {tags.length > 0 ? (
                                tags.map((t: string, i: number) => (
                                  <span key={i} className="text-[9px] px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-600 font-bold whitespace-nowrap">{t}</span>
                                ))
                              ) : '-'}
                            </div>
                          </td>
                        )}

                        {visibleColumns.includes('status') && (
                          <td className="p-2 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold 
                                           ${d.stage === DealStage.WON ? 'bg-green-100 text-green-700 border border-green-200' :
                                d.stage === DealStage.LOST ? 'bg-red-100 text-red-700 border border-red-200' :
                                  'bg-blue-50 text-blue-700 border border-blue-100'}`}>
                              {getStageLabel(d.stage)}
                            </span>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showNextActivityModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-lg p-6 w-[420px] shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Tạo hành động tiếp theo</h3>
            <p className="text-sm text-slate-600 mb-4">Hãy tạo hoạt động tiếp theo để theo dõi Deal mới.</p>

            <div className="flex gap-2 mb-3">
              {NEXT_ACTIVITY_TYPES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setNextActivityType(t.id)}
                  className={`flex-1 p-2 rounded border text-[10px] font-bold uppercase ${nextActivityType === t.id ? 'bg-purple-50 border-purple-400 text-purple-700' : 'border-slate-200 text-slate-500'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <input type="datetime-local" className="w-full text-xs p-2 border rounded font-bold mb-2" value={nextActivityDate} onChange={e => setNextActivityDate(e.target.value)} />
            <input className="w-full text-xs p-2 border rounded mb-4" placeholder="Nội dung dự kiến..." value={nextActivitySummary} onChange={e => setNextActivitySummary(e.target.value)} />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowNextActivityModal(false); setNextActivityDealId(null); }}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded"
              >
                Bỏ qua
              </button>
              <button
                onClick={handleSaveNextActivity}
                className="px-4 py-2 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded"
              >
                Lưu hoạt động
              </button>
            </div>
          </div>
        </div>
      )}

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
