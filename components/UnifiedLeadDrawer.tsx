
import React, { useState, useEffect, useMemo } from 'react';
import { ILead, LeadStatus, UserRole, Activity, DealStage, IContract, ContractStatus, IMeeting, MeetingStatus, MeetingType } from '../types';
import { addContract, addMeeting } from '../utils/storage';
import { useAuth } from '../contexts/AuthContext';
import {
    X, User, Phone, Mail, MapPin, Globe, Calendar,
    Clock, CheckCircle2, AlertTriangle, Send, Paperclip,
    History, ArrowRight, ChevronDown, Building, FileText,
    DollarSign, CreditCard, MessageSquare, Bell, Star,
    MoreHorizontal, CalendarDays, Flag, CheckSquare, Plus, Trash2, Trophy,
    ShieldCheck, FileSignature, Wallet, Lock, Activity as ActivityIcon, Ban, ArrowUpRight, Users
} from 'lucide-react';

interface UnifiedLeadDrawerProps {
    lead: ILead;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: (updatedLead: ILead) => void;
    onConvert?: (lead: ILead) => void;
}

// Product Catalog Mock
const PRODUCT_CATALOG = [
    { name: 'Khóa tiếng Đức A1-A2', price: 15000000 },
    { name: 'Khóa tiếng Đức B1-B2', price: 25000000 },
    { name: 'Combo Du học nghề Đức (Trọn gói)', price: 210000000 },
    { name: 'Combo Du học nghề Úc', price: 250000000 },
    { name: 'Phí xử lý hồ sơ', price: 10000000 },
];

const ACTIVITY_TYPES = [
    { id: 'call', label: 'Gọi điện', icon: Phone, defaultDelayHours: 2 },
    { id: 'meeting', label: 'Họp trực tiếp', icon: User, defaultDelayHours: 24 },
    { id: 'email', label: 'Gửi Email', icon: Mail, defaultDelayHours: 0 },
    { id: 'todo', label: 'Việc cần làm', icon: CheckSquare, defaultDelayHours: 0 },
];

const MOCK_USERS = [
    { id: 'u1', name: 'Sarah Miller', avatar: 'SM', role: 'Sales Rep' },
    { id: 'u2', name: 'Minh Khôi', avatar: 'MK', role: 'Contract Manager' },
    { id: 'u3', name: 'Hải Yến', avatar: 'HY', role: 'Sales Manager' },
    { id: 'u4', name: 'Admin', avatar: 'AD', role: 'Admin' },
];

const PIPELINE_STAGE_OPTIONS: DealStage[] = [
    DealStage.NEW_OPP,
    DealStage.DEEP_CONSULTING,
    DealStage.PROPOSAL,
    DealStage.NEGOTIATION,
    DealStage.WON,
    DealStage.LOST,
    DealStage.AFTER_SALE
];

const STAGE_LABELS: Record<string, string> = {
    [DealStage.NEW_OPP]: 'New Opp',
    [DealStage.DEEP_CONSULTING]: 'Tư vấn/Hẹn meeting',
    [DealStage.PROPOSAL]: 'Tư vấn sâu (Gửi báo giá, lộ trình)',
    [DealStage.NEGOTIATION]: 'Đàm phán (Theo dõi chốt)',
    [DealStage.WON]: 'Won',
    [DealStage.LOST]: 'Lost',
    [DealStage.AFTER_SALE]: 'After sale'
};

const UnifiedLeadDrawer: React.FC<UnifiedLeadDrawerProps> = ({ lead: initialLead, isOpen, onClose, onUpdate, onConvert }) => {
    const { user } = useAuth();
    const [lead, setLead] = useState<ILead>(initialLead || {} as ILead);

    // UI States
    const [chatterTab, setChatterTab] = useState<'message' | 'note' | 'activity' | 'meeting'>('note');
    const [noteContent, setNoteContent] = useState('');
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

    // Meeting State
    const [meetingDate, setMeetingDate] = useState('');
    const [meetingType, setMeetingType] = useState<MeetingType>(MeetingType.OFFLINE);

    // Followers State
    const [showFollowersModal, setShowFollowersModal] = useState(false);
    const [followers, setFollowers] = useState<any[]>((initialLead && initialLead.followers) || []);

    // Ensure Owner is a follower
    useEffect(() => {
        if (!initialLead) return;
        if (followers.length === 0 && initialLead.ownerId) {
            const owner = MOCK_USERS.find(u => u.name === initialLead.ownerId) || { id: 'u1', name: initialLead.ownerId || 'Sarah Miller', avatar: 'SM', isOwner: true };
            setFollowers([{ ...owner, addedAt: new Date().toISOString() }]);
        }
    }, [initialLead?.ownerId]);

    // Loss Modal State
    const [showLossModal, setShowLossModal] = useState(false);
    const [lossReason, setLossReason] = useState('');

    // Activity Schedule State
    const [activityType, setActivityType] = useState('call');
    const [activityDate, setActivityDate] = useState('');
    const [activitySummary, setActivitySummary] = useState('');
    const [showNextActivityModal, setShowNextActivityModal] = useState(false);
    const [nextActivityType, setNextActivityType] = useState('call');
    const [nextActivityDate, setNextActivityDate] = useState('');
    const [nextActivitySummary, setNextActivitySummary] = useState('');
    const [pendingConvertLead, setPendingConvertLead] = useState<ILead | null>(null);
    const [completingActivityId, setCompletingActivityId] = useState<string | null>(null);
    const [completionNote, setCompletionNote] = useState('');
    const [scheduleNext, setScheduleNext] = useState(false); // New state for auto-schedule checkbox

    // Local State for Quotation Editing
    const [productItems, setProductItems] = useState((initialLead && initialLead.productItems) || []);
    const [discount, setDiscount] = useState((initialLead && initialLead.discount) || 0);

    // Toast Notification State
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; visible: boolean } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToast({ message, type, visible: true });
        setTimeout(() => setToast(null), 3000);
    };

    // --- STAGE HELPERS ---
    const isLeadStage = !lead.status || lead.status === LeadStatus.NEW || lead.status === LeadStatus.CONTACTED;
    const isQualified = lead.status === LeadStatus.QUALIFIED || Object.values(DealStage).includes(lead.status as any);
    const isPipeline = Object.values(DealStage).includes(lead.status as any);
    const isWon = lead.status === DealStage.WON;
    const isContract = lead.status === DealStage.CONTRACT;
    // @ts-ignore
    const isLost = lead.status === 'LOST' || lead.status === 'lost';

    useEffect(() => {
        if (!initialLead) return;
        setLead(initialLead);
        setProductItems(initialLead.productItems || []);
        setDiscount(initialLead.discount || 0);
    }, [initialLead]);

    const getDefaultActivityDate = (typeId: string) => {
        const typeConfig = ACTIVITY_TYPES.find(t => t.id === typeId);
        const delay = typeConfig?.defaultDelayHours || 0;
        const now = new Date();
        now.setHours(now.getHours() + delay);
        return new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    };

    // Set default time when activity type changes
    useEffect(() => {
        const typeConfig = ACTIVITY_TYPES.find(t => t.id === activityType);
        if (typeConfig) {
            const localIsoString = getDefaultActivityDate(activityType);
            setActivityDate(localIsoString);
            setActivitySummary(typeConfig.id === 'call' ? 'Gọi lại tư vấn' : '');
        }
    }, [activityType]);

    useEffect(() => {
        if (!showNextActivityModal) return;
        setNextActivityDate(getDefaultActivityDate(nextActivityType));
    }, [nextActivityType, showNextActivityModal]);

    // --- LOGIC: AUTO CALCULATE TOTAL VALUE ---
    const calculatedTotal = useMemo(() => {
        const subtotal = productItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        return Math.max(0, subtotal - discount);
    }, [productItems, discount]);

    // Sync calculated total to Lead Value
    useEffect(() => {
        if (calculatedTotal !== lead.value) {
            setLead(prev => ({ ...prev, value: calculatedTotal }));
        }
    }, [calculatedTotal]);


    if (!isOpen) return null;

    // --- ACTIONS ---

    const handleSendLog = () => {
        if (!noteContent.trim() && chatterTab === 'note') return;

        if (chatterTab === 'meeting') {
            if (!meetingDate) {
                showToast('Vui lòng chọn thời gian lịch hẹn', 'error');
                return;
            }

            // 1. Logic Create Meeting
            const newMeeting: IMeeting = {
                id: `M-${Date.now()}`,
                title: `Lịch hẹn: ${lead.name}`,
                leadId: lead.id,
                leadName: lead.name,
                leadPhone: lead.phone,
                salesPersonId: lead.ownerId,
                salesPersonName: user?.name || 'Sales Rep',
                campus: (lead as any).company || 'Hanoi',
                address: (lead as any).address || 'N/A',
                datetime: meetingDate,
                type: meetingType,
                status: MeetingStatus.DRAFT,
                notes: noteContent,
                createdAt: new Date().toISOString()
            };
            addMeeting(newMeeting);

            addLog('system', `Đã tạo lịch hẹn: ${meetingType} vào lúc ${new Date(meetingDate).toLocaleString('vi-VN')}. Note: ${noteContent}`, {
                title: 'Đặt lịch hẹn',
                activityType: 'meeting'
            });

            showToast('Đã tạo lịch hẹn thành công!', 'success');
            setMeetingDate('');
            setNoteContent('');
            setChatterTab('note'); // Reset
        } else {
            // Normal Note
            addLog('note', noteContent);
            setNoteContent('');
        }
    };

    const addLog = (type: 'note' | 'message' | 'system' | 'activity', content: string, extra?: any) => {
        const newActivity: any = {
            id: `act-${Date.now()}`,
            type,
            timestamp: new Date().toISOString(),
            title: extra?.title || '',
            description: content,
            user: user?.name || 'Admin',
            status: extra?.status,
            datetime: extra?.datetime,
            activityType: extra?.activityType
        };

        const currentActivities = lead.activities || [];
        const updatedActivities = [newActivity, ...currentActivities];

        const updatedLead = { ...lead, activities: updatedActivities };
        setLead(updatedLead);
        onUpdate(updatedLead);
    };

    // Removed handleSendNote as it is replaced by handleSendLog

    const addScheduledActivity = (typeId: string, summary: string, dateStr: string) => {
        const typeConfig = ACTIVITY_TYPES.find(t => t.id === typeId);
        const scheduledAt = dateStr || new Date().toISOString();
        addLog('activity', summary, {
            title: typeConfig?.label || 'Lịch',
            status: 'scheduled',
            datetime: scheduledAt,
            activityType: typeId
        });
    };

    const openNextActivityModal = (presetSummary?: string) => {
        const defaultType = 'call';
        setNextActivityType(defaultType);
        setNextActivityDate(getDefaultActivityDate(defaultType));
        setNextActivitySummary(presetSummary || '');
        setShowNextActivityModal(true);
    };

    const finalizePendingConvert = () => {
        if (pendingConvertLead && typeof onConvert === 'function') {
            onConvert(pendingConvertLead);
        }
        setPendingConvertLead(null);
    };

    const completeActivity = () => {
        if (!lead || !completingActivityId || !completionNote.trim()) return;
        const updatedActivities = (lead.activities || []).map((a: any) =>
            a.id === completingActivityId ? { ...a, status: 'completed', completedAt: new Date().toISOString() } : a
        );
        const resultLog: any = {
            id: `act-${Date.now()}`,
            type: 'note',
            timestamp: new Date().toISOString(),
            description: completionNote,
            user: user?.name || 'Admin',
            title: 'Kết quả hoạt động'
        };
        const updatedLead = {
            ...lead,
            activities: [resultLog, ...updatedActivities]
        };
        setLead(updatedLead);
        onUpdate(updatedLead);
        setCompletionNote('');
        setCompletingActivityId(null);

        // Auto-prompt for Next Activity
        openNextActivityModal('Tạo lịch tiếp theo sau khi hoàn thành công việc');
    };

    const handleFieldBlur = (field: keyof ILead, currentValue: any) => {
        if (JSON.stringify(lead[field]) !== JSON.stringify(currentValue)) {
            addLog('system', `Cập nhật ${field}: ${currentValue}`);
            const updatedLead = { ...lead, [field]: currentValue };
            setLead(updatedLead);
            onUpdate(updatedLead);

            // Sync Owner to Followers
            if (field === 'ownerId') {
                const newOwner = MOCK_USERS.find(u => u.name === currentValue) || { id: 'u-ex', name: currentValue, avatar: 'EX', role: 'Sales Rep' };
                if (!followers.find(f => f.name === currentValue)) {
                    // Add new owner to followers
                    handleAddFollower(newOwner, true);
                }
            }
        }
    };

    const handleInternalNoteBlur = (field: keyof NonNullable<ILead['internalNotes']>, value: string) => {
        const updatedInternalNotes = {
            ...(lead.internalNotes || {}),
            [field]: value
        };
        const updatedLead = { ...lead, internalNotes: updatedInternalNotes };
        setLead(updatedLead);
        onUpdate(updatedLead);
    };

    const handleAddFollower = (newFollower: any, isSystem = false) => {
        if (followers.some(f => f.id === newFollower.id)) return;

        const updatedList = [...followers, { ...newFollower, addedAt: new Date().toISOString() }];
        setFollowers(updatedList);

        // Log
        const logMsg = isSystem
            ? `Hệ thống đã thêm [${newFollower.name}] vào danh sách theo dõi.`
            : `${user?.name || 'Admin'} đã thêm [${newFollower.name}] vào danh sách theo dõi.`;

        addLog('system', logMsg); // This updates Lead state too
        // Note: addLog updates lead.activities, but we also need to update lead.followers
        // So we should do:
        const updatedLead = { ...lead, followers: updatedList };
        // We will defer update until addLog is called? 
        // Actually addLog calls setLead.
        // We should manually update lead with both.

        // Better implementation:
        const logEntry: any = {
            id: `act-${Date.now()}`,
            type: 'system',
            timestamp: new Date().toISOString(),
            description: logMsg,
            user: isSystem ? 'System' : (user?.name || 'Admin'),
            title: 'Follower'
        };
        const finalLead = {
            ...lead,
            followers: updatedList,
            activities: [logEntry, ...(lead.activities || [])]
        };
        setLead(finalLead);
        onUpdate(finalLead);
        setShowFollowersModal(false);
    };

    const handleStatusChange = (newStatus: string) => {
        // --- GATEKEEPER LOGIC ---

        // 1. GATE: Lead -> Qualified
        if (newStatus === LeadStatus.QUALIFIED) {
            if (!lead.dob || !lead.educationLevel) {
                showToast("Vui lòng điền 'Ngày sinh' và 'Trình độ học vấn' ở Mục B trước.", 'error');
                setShowStatusDropdown(false);
                return;
            }
            const hasInteraction = (lead.activities || []).some(a => a.type === 'note' || a.type === 'activity');
            if (!hasInteraction) {
                showToast("Vui lòng cập nhật ít nhất 1 nhật ký tư vấn.", 'error');
                setShowStatusDropdown(false);
                return;
            }
        }

        // 2. GATE: Into Negotiation & Advanced Stages
        // Logic: Cannot enter Negotiation or later steps without filling Quotation (Sec 3)
        const advancedStages: string[] = [DealStage.NEGOTIATION, DealStage.CONTRACT, DealStage.DOCUMENT_COLLECTION, DealStage.WON];
        if (advancedStages.includes(newStatus)) {
            // Check Quotation Section (3)
            if (productItems.length === 0 || calculatedTotal < 0) { // Allow 0 if free, but usually > 0
                showToast("Vui lòng tạo Bảng báo giá (Sản phẩm) ở Mục 3 trước khi sang giai đoạn này.", 'error');
                setShowStatusDropdown(false);
                return;
            }
            // Check Target Country (Only required for Study Abroad or Combos)
            const isStudyAbroad = productItems.some(p => p.name.toLowerCase().includes('du học'));

            if (isStudyAbroad && !lead.targetCountry) {
                showToast("Vui lòng chọn 'Thị trường mục tiêu' (Bắt buộc với Du học/Combo) ở Mục 2 trước.", 'error');
                setShowStatusDropdown(false);
                return;
            }
        }

        // 3. GATE: Contract / Won checks
        // Must satisfy Negotiation section (Sec 4)
        if ((newStatus === DealStage.CONTRACT || newStatus === DealStage.WON) && discount > 0 && !lead.discountReason) {
            showToast("Vui lòng nhập 'Lý do giảm giá' ở Mục 4.", 'error');
            setShowStatusDropdown(false);
            return;
        }

        // 4. GATE: Final WON
        if (newStatus === DealStage.WON) {
            handleWonAction();
            return;
        }

        // Add log
        const statusLog: any = {
            id: `act-${Date.now()}`,
            type: 'system',
            timestamp: new Date().toISOString(),
            description: `Trạng thái: ${lead.status || 'Mới'} → ${newStatus}`,
            user: user?.name || 'Admin',
            title: ''
        };

        const updatedLead = {
            ...lead,
            status: newStatus as any,
            activities: [statusLog, ...(lead.activities || [])],
            productItems: productItems, // Sync current products
            discount: discount, // Sync current discount
            paymentRoadmap: lead.paymentRoadmap
        };

        setLead(updatedLead);
        onUpdate(updatedLead);
        setShowStatusDropdown(false);
    };

    const handleLossAction = () => {
        if (!lossReason) {
            showToast("Vui lòng nhập lý do thất bại!", 'error');
            return;
        }
        const statusLog: any = {
            id: `act-${Date.now()}`,
            type: 'system',
            timestamp: new Date().toISOString(),
            description: `Trạng thái: ${lead.status} → LOST. Lý do: ${lossReason}`,
            user: user?.name || 'Admin',
            title: 'Thất bại'
        };

        // @ts-ignore
        const updatedLead = { ...lead, status: 'LOST', lostReason: lossReason, activities: [statusLog, ...(lead.activities || [])] };
        setLead(updatedLead);
        onUpdate(updatedLead);
        setShowLossModal(false);
    }

    const handleWonAction = () => {
        // 1. Basic Check for Won
        if (productItems.length === 0 || calculatedTotal <= 0) {
            showToast("Giá trị Hợp đồng phải > 0. Vui lòng kiểm tra Bảng báo giá (Mục 3).", 'error');
            return;
        }

        // 2. Update Status to WON
        const wonLog: any = {
            id: `act-${Date.now()}`,
            type: 'system',
            timestamp: new Date().toISOString(),
            description: `Trạng thái: ${lead.status || 'Mới'} → WON (Chốt thành công)`,
            user: user?.name || 'Admin',
            title: 'Chốt thành công'
        };

        const updatedLead = {
            ...lead,
            status: DealStage.WON as any,
            activities: [wonLog, ...(lead.activities || [])],
        };

        setLead(updatedLead);
        onUpdate(updatedLead);
        setShowConfetti(true);
        showToast("Chốt WON thành công! Nút 'Tạo Hợp đồng' đã sẵn sàng.", 'success');
    };

    const handleCreateContract = () => {
        // 1. STRICT VALIDATION for Contract Handover
        if (!lead.identityCard || !lead.identityDate || !lead.identityPlace || !lead.address) {
            showToast("Thiếu thông tin ĐỊNH DANH (CCCD, Ngày/Nơi cấp, Địa chỉ). Vui lòng bổ sung Mục 5.", 'error');
            // Highlight section?
            return;
        }
        if (!lead.paymentRoadmap) {
            showToast("Vui lòng nhập 'Lộ trình đóng phí' (Mục 3) để bộ phận Hợp đồng nắm thông tin.", 'error');
            return;
        }
        // Validate Image (Mock)
        // if (!hasImage) { showToast("Chưa upload ảnh CCCD!", 'error'); return; }

        // 2. DATA MAPPING & CREATION
        const contractCode = `HD-2026-${Math.floor(1000 + Math.random() * 9000)}`;
        const newContract: IContract = {
            id: `CT-${Date.now()}`,
            code: contractCode,
            dealId: lead.id,
            customerName: lead.name,
            totalValue: lead.value || 0,
            paidValue: 0,
            status: ContractStatus.DRAFT,
            createdBy: user?.name || 'Admin',
            // Mapped Fields
            cccdNumber: lead.identityCard,
            identityDate: lead.identityDate,
            identityPlace: lead.identityPlace,
            address: lead.address,
        };

        addContract(newContract);

        // 3. LOGGING & HANDOVER
        // Add Contract Manager as Follower
        const contractManager = MOCK_USERS.find(u => u.role === 'Contract Manager');
        let updatedFollowers = [...followers];
        let logs: any[] = [];

        if (contractManager && !updatedFollowers.find(f => f.id === contractManager.id)) {
            updatedFollowers.push({ ...contractManager, addedAt: new Date().toISOString() });
            logs.push({
                id: `act-${Date.now()}`, type: 'system', timestamp: new Date().toISOString(),
                description: `Hệ thống đã thêm [${contractManager.name}] (Bộ phận Hợp đồng) vào danh sách theo dõi hồ sơ.`,
                user: 'System'
            });
        }

        // Main Handover Log
        logs.push({
            id: `act-${Date.now() + 1}`, type: 'system', timestamp: new Date().toISOString(),
            description: `[${user?.name || 'Sales'}] đã khởi tạo hợp đồng [${contractCode}] từ cơ hội này. Trạng thái: Chờ soạn thảo.`,
            user: 'System',
            title: 'Bàn giao Hợp đồng'
        });

        // Notification Log
        logs.push({
            id: `act-${Date.now() + 2}`, type: 'message', timestamp: new Date().toISOString(),
            description: `Notification: Cơ hội [${lead.name}] đã chốt. Vui lòng kiểm tra dữ liệu để xuất hợp đồng.`,
            user: 'System',
            title: 'Notification'
        });

        const updatedLead = {
            ...lead,
            contractCode: contractCode,
            followers: updatedFollowers,
            activities: [...logs, ...(lead.activities || [])]
        };

        setLead(updatedLead);
        onUpdate(updatedLead);
        showToast(`Đã chuyển thông tin sang bộ phận Hợp đồng (Mã: ${contractCode})`, 'success');
    };


    const handleConvertAction = () => {
        if (typeof onConvert === 'function') {
            setPendingConvertLead(lead);
            openNextActivityModal('Tạo hoạt động tiếp theo sau Convert');
        } else {
            console.error("onConvert param is not a function", onConvert);
        }
    }

    const handleScheduleActivity = () => {
        if (!activitySummary) return;
        addScheduledActivity(activityType, activitySummary, activityDate);
        setActivitySummary('');
        showToast("Đã lên lịch thành công!", 'success');
        setChatterTab('note');
    };

    const handleSendQuote = () => {
        if (productItems.length === 0 || calculatedTotal <= 0) {
            showToast("Cần có báo giá hợp lệ trước khi gửi.", 'error');
            return;
        }

        const statusLog: any = {
            id: `act-${Date.now()}`,
            type: 'system',
            timestamp: new Date().toISOString(),
            description: `Trạng thái: ${lead.status || 'Mới'} → ${DealStage.NEGOTIATION}`,
            user: user?.name || 'Admin',
            title: 'Gửi báo giá'
        };

        const updatedLead = {
            ...lead,
            status: DealStage.NEGOTIATION as any,
            activities: [statusLog, ...(lead.activities || [])],
            productItems: productItems,
            discount: discount
        };

        setLead(updatedLead);
        onUpdate(updatedLead);
        showToast("Đã gửi báo giá, chuyển sang Đàm phán.", 'success');
        openNextActivityModal('Theo dõi phản hồi báo giá');
    };

    // --- QUOTATION HELPERS ---
    const addProductItem = () => {
        setProductItems([...productItems, { id: `item-${Date.now()}`, name: '', price: 0, quantity: 1 }]);
    };
    const updateProductItem = (id: string, field: string, val: any) => {
        setProductItems(items => items.map(item => item.id === id ? { ...item, [field]: val } : item));
    };
    const removeProductItem = (id: string) => {
        setProductItems(items => items.filter(item => item.id !== id));
    };
    const handleProductSelect = (id: string, productName: string) => {
        const product = PRODUCT_CATALOG.find(p => p.name === productName);
        if (product) {
            setProductItems(items => items.map(item => item.id === id ? { ...item, name: productName, price: product.price } : item));
        } else {
            setProductItems(items => items.map(item => item.id === id ? { ...item, name: productName } : item));
        }
    };

    // Log Grouping Logic
    const groupedLogs = useMemo(() => {
        const groups: Record<string, any[]> = {};
        const logs = lead.activities || [];
        const sortedLogs = [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        sortedLogs.forEach(log => {
            const dateStr = new Date(log.timestamp).toLocaleDateString('vi-VN');
            if (!groups[dateStr]) groups[dateStr] = [];
            groups[dateStr].push(log);
        });
        return groups;
    }, [lead.activities]);


    return (
        <div className="fixed inset-0 z-50 flex justify-end font-inter">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="relative w-full h-full bg-slate-100 flex flex-col animate-in slide-in-from-right duration-300 shadow-2xl">

                {/* TOAST NOTIFICATION */}
                {toast && toast.visible && (
                    <div className={`absolute top-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl animate-in slide-in-from-top-5 fade-in duration-300 ${toast.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
                        toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
                            'bg-slate-800 text-white'
                        }`}>
                        {toast.type === 'error' && <AlertTriangle size={18} />}
                        {toast.type === 'success' && <CheckCircle2 size={18} />}
                        <span className="text-sm font-bold">{toast.message}</span>
                    </div>
                )}

                {/* HEADER TOOLBAR */}
                <div className="h-14 bg-white border-b border-slate-300 flex items-center justify-between px-6 shadow-sm z-20">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <span className="font-semibold cursor-pointer">Leads</span>
                        <span className="text-slate-300">/</span>
                        <span className="text-slate-800 font-bold">{lead.name}</span>
                        {isWon && <span className="ml-2 bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded border border-green-200 uppercase">Đã chốt hợp đồng</span>}
                        {isLost && <span className="ml-2 bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded border border-red-200 uppercase">Đã thất bại</span>}
                    </div>

                    <div className="flex items-center gap-3">

                        {/* STATUS FLOW */}
                        {/* 1. LOSS BUTTON */}
                        {!isContract && !isLost && (
                            <button onClick={() => setShowLossModal(true)} className="px-3 py-1.5 text-xs font-bold text-red-600 border border-red-200 rounded hover:bg-red-50 flex items-center gap-1">
                                <Ban size={14} /> THẤT BẠI
                            </button>
                        )}

                        {/* 2. WON BUTTON */}
                        {!isWon && !isContract && !isLost && (
                            <button onClick={handleWonAction} className="px-3 py-1.5 text-xs font-bold text-green-600 border border-green-200 rounded hover:bg-green-50 flex items-center gap-1">
                                <Trophy size={14} /> CHỐT WON
                            </button>
                        )}

                        {/* 3. CONVERT BUTTON (Gateway to Pipeline) */}
                        {isQualified && !isPipeline && !isWon && !isContract && !isLost && (
                            <button onClick={handleConvertAction} className="px-3 py-1.5 text-xs font-bold text-blue-600 border border-blue-200 rounded hover:bg-blue-50 flex items-center gap-1">
                                <ArrowUpRight size={14} /> CONVERT LEAD
                            </button>
                        )}

                        <div className="h-6 w-px bg-slate-200"></div>

                        <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200">
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide px-2">Quy trình</span>
                            <div className="relative">
                                <button
                                    disabled={isContract || isLost}
                                    onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                                    className={`flex items-center gap-2 px-3 py-1 text-xs font-bold rounded transition-all border shadow-sm ${lead.status === DealStage.WON ? 'bg-green-600 text-white border-green-700' :
                                        isPipeline ? 'bg-blue-600 text-white border-blue-700' :
                                            'bg-white text-slate-700 border-slate-300 hover:border-blue-400'
                                        }`}
                                >
                                    {lead.status === DealStage.WON && <Trophy size={14} className="text-white" />}
                                    {lead.status || 'Mới'} {!isWon && !isLost && <ChevronDown size={12} />}
                                </button>

                                {showStatusDropdown && !isContract && !isLost && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setShowStatusDropdown(false)}></div>
                                        <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded shadow-xl z-50 p-1 animate-in zoom-in-95">
                                            <div className="px-3 py-2 text-[10px] font-bold text-slate-400 bg-slate-50 uppercase border-b">1. Lead (Sàng lọc)</div>
                                            {Object.values(LeadStatus).map(s => (
                                                <button key={s} onClick={() => handleStatusChange(s)} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 flex justify-between items-center text-slate-700">
                                                    {s} {lead.status === s && <CheckCircle2 size={12} className="text-blue-600" />}
                                                </button>
                                            ))}
                                            <div className="px-3 py-2 text-[10px] font-bold text-blue-400 bg-blue-50 uppercase border-t border-b mt-1">2. Pipeline (Cơ hội)</div>
                                            {PIPELINE_STAGE_OPTIONS.map(s => (
                                                <button key={s} onClick={() => handleStatusChange(s)} className="w-full text-left px-3 py-2 text-xs hover:bg-blue-100 text-blue-700 font-bold flex justify-between items-center">
                                                    {STAGE_LABELS[s] || s} {lead.status === s && <CheckCircle2 size={12} className="text-blue-600" />}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="h-6 w-px bg-slate-200"></div>
                        <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors"><X size={20} /></button>
                    </div>
                </div>

                {/* WORKSPACE */}
                <div className="flex-1 flex overflow-hidden">

                    {/* --- LEFT: MASTER FORM (2/3) --- */}
                    <div className="w-[66%] h-full overflow-y-auto bg-white border-r border-slate-200 p-8 shadow-[inset_-10px_0_15px_-10px_rgba(0,0,0,0.05)] custom-scrollbar relative">

                        {(isWon || isLost) && <div className="absolute top-0 left-0 w-full h-full bg-slate-50/50 z-20 pointer-events-none" />}

                        {/* VISUAL GUIDE FOR STAGES */}
                        <style>{`
                    .field-label { font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 4px; display: block; letter-spacing: 0.02em; }
                    .field-input { width: 100%; padding: 8px 10px; font-size: 13px; color: #1e293b; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; outline: none; transition: all 0.2s; }
                    .field-input:focus { background-color: #fff; border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1); }
                    .field-input:disabled { background-color: #e2e8f0; color: #94a3b8; cursor: not-allowed; }
                    .field-input.locked { background-color: #f0fdf4; border-color: #bbf7d0; color: #166534; pointer-events: none; }
                    .section-title { font-size: 14px; font-weight: 800; color: #1e40af; border-bottom: 2px solid #e0e7ff; padding-bottom: 8px; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
                    .badge-section { background: #dbeafe; color: #1e40af; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; }
                    .dimmed-section { opacity: 0.5; pointer-events: none; filter: grayscale(100%); transition: all 0.3s; }
                    .active-section { opacity: 1; pointer-events: auto; filter: none; }
                `}</style>

                        {/* SECTION 1: LEAD INFO (MARKETING) - Locked after Qualified */}
                        <div className="mb-10">
                            <h3 className="section-title"><span className="badge-section">1</span> THÔNG TIN LEAD (MKT) {isQualified && <Lock size={12} className="text-green-600 ml-2" />}</h3>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                                <div>
                                    <label className="field-label">Họ và tên <span className="text-red-500">*</span></label>
                                    <input className={`field-input font-bold ${isQualified ? 'locked' : ''}`} defaultValue={lead.name} onBlur={e => handleFieldBlur('name', e.target.value)} disabled={isQualified || isContract || isLost} />
                                </div>
                                <div>
                                    <label className="field-label">Số điện thoại <span className="text-red-500">*</span></label>
                                    <input className={`field-input font-bold ${isQualified ? 'locked' : ''}`} defaultValue={lead.phone} onBlur={e => handleFieldBlur('phone', e.target.value)} disabled={isQualified || isContract || isLost} />
                                </div>
                                <div><label className="field-label">Email</label><input className={`field-input ${isQualified ? 'locked' : ''}`} defaultValue={lead.email} onBlur={e => handleFieldBlur('email', e.target.value)} disabled={isQualified || isContract || isLost} /></div>
                                <div>
                                    <label className="field-label">Nguồn Data</label>
                                    <select className={`field-input ${isQualified ? 'locked' : ''}`} defaultValue={lead.source} onChange={e => handleFieldBlur('source', e.target.value)} disabled={isQualified || isContract || isLost}>
                                        <option value="Facebook">Facebook</option><option value="TikTok">TikTok</option><option value="Google">Google Search</option><option value="Hotline">Hotline</option><option value="Referral">Giới thiệu</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Internal Notes */}
                        <div className="mb-10 p-4 border rounded-lg bg-slate-50 border-slate-200">
                            <h3 className="section-title"><span className="badge-section">1.1</span> GHI CHÚ NỘI BỘ (INTERNAL NOTES)</h3>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                                <div>
                                    <label className="field-label">Thời gian dự kiến tham gia</label>
                                    <input className="field-input" placeholder="VD: 06/2026" defaultValue={lead.internalNotes?.expectedStart || ''} onBlur={e => handleInternalNoteBlur('expectedStart', e.target.value)} disabled={isQualified || isContract || isLost} />
                                </div>
                                <div>
                                    <label className="field-label">Ý kiến bố mẹ</label>
                                    <input className="field-input" placeholder="Đồng ý / Cần cân nhắc..." defaultValue={lead.internalNotes?.parentOpinion || ''} onBlur={e => handleInternalNoteBlur('parentOpinion', e.target.value)} disabled={isQualified || isContract || isLost} />
                                </div>
                                <div>
                                    <label className="field-label">Tài chính</label>
                                    <input className="field-input" placeholder="Đủ / Thiếu / Cần hỗ trợ" defaultValue={lead.internalNotes?.financial || ''} onBlur={e => handleInternalNoteBlur('financial', e.target.value)} disabled={isQualified || isContract || isLost} />
                                </div>
                                <div>
                                    <label className="field-label">Mức độ tiềm năng</label>
                                    <select className="field-input" defaultValue={lead.internalNotes?.potential || ''} onChange={e => handleInternalNoteBlur('potential', e.target.value as any)} disabled={isQualified || isContract || isLost}>
                                        <option value="">-- Chọn --</option>
                                        <option value="Nóng">Nóng</option>
                                        <option value="Tiềm năng">Tiềm năng</option>
                                        <option value="Tham khảo">Tham khảo</option>
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="field-label">Ghi chú khác</label>
                                    <textarea className={`field-input h-20 resize-none ${isQualified ? 'locked' : ''}`} defaultValue={lead.notes || ''} onBlur={e => handleFieldBlur('notes', e.target.value)} disabled={isQualified || isContract || isLost} />
                                </div>
                            </div>
                        </div>

                        {/* SECTION 2: PROFILING (QUALIFIED) */}
                        <div className={`mb-10 p-4 border rounded-lg ${!isLeadStage ? 'bg-white border-blue-100 active-section' : 'bg-slate-50 border-slate-200'}`}>
                            <h3 className="section-title"><span className="badge-section">2</span> HỒ SƠ NĂNG LỰC (PROFILING) {!isLeadStage && <CheckCircle2 size={14} className="text-green-500 ml-auto" />}</h3>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                                <div>
                                    <label className="field-label">Ngày sinh <span className="text-red-500">* (Bắt buộc Qualified)</span></label>
                                    <input type="date" className="field-input" defaultValue={lead.dob} onBlur={e => handleFieldBlur('dob', e.target.value)} disabled={isContract || isLost} />
                                </div>
                                <div>
                                    <label className="field-label">Trình độ học vấn <span className="text-red-500">*</span></label>
                                    <select className="field-input" defaultValue={lead.educationLevel} onChange={e => handleFieldBlur('educationLevel', e.target.value)} disabled={isContract || isLost} >
                                        <option value="">-- Chọn --</option><option value="THPT">Tốt nghiệp THPT</option><option value="Cao đẳng">Cao đẳng</option><option value="Đại học">Đại học</option><option value="Thạc sĩ">Thạc sĩ</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="field-label">Thị trường mục tiêu</label>
                                    <select className="field-input" defaultValue={lead.targetCountry} onChange={e => handleFieldBlur('targetCountry', e.target.value)} disabled={isContract || isLost}>
                                        <option value="">-- Chọn --</option><option value="Đức">Đức</option><option value="Úc">Úc</option><option value="Nhật Bản">Nhật Bản</option><option value="Hàn Quốc">Hàn Quốc</option>
                                    </select>
                                </div>
                                <div><label className="field-label">GPA / Điểm ngoại ngữ</label><input className="field-input" placeholder="VD: GPA 7.5 - IELTS 6.0" defaultValue={lead.studentInfo?.languageLevel} onBlur={e => handleFieldBlur('studentInfo', { ...lead.studentInfo, languageLevel: e.target.value })} disabled={isContract || isLost} /></div>
                            </div>
                        </div>

                        {/* SECTION 3: QUOTATION (PROPOSAL) */}
                        <div className={`mb-10 ${isPipeline || isContract ? 'active-section' : 'dimmed-section'}`}>
                            <h3 className="section-title"><span className="badge-section">3</span> BÁO GIÁ & LỘ TRÌNH (QUOTATION)</h3>
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                {/* Product Table */}
                                <table className="w-full text-left text-xs mb-4">
                                    <thead>
                                        <tr className="text-slate-500 border-b border-slate-200">
                                            <th className="pb-2 font-bold w-[40%]">Sản phẩm / Dịch vụ</th>
                                            <th className="pb-2 font-bold w-[25%]">Đơn giá (₫)</th>
                                            <th className="pb-2 font-bold w-[15%]">SL</th>
                                            <th className="pb-2 font-bold w-[20%] text-right">Thành tiền</th>
                                            <th className="w-6"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {productItems.map((item) => (
                                            <tr key={item.id} className="group">
                                                <td className="py-2">
                                                    <input
                                                        list="products"
                                                        className="bg-transparent w-full outline-none font-medium placeholder:text-slate-300"
                                                        placeholder="Chọn hoặc nhập tên..."
                                                        value={item.name}
                                                        onChange={e => handleProductSelect(item.id, e.target.value)}
                                                        disabled={isContract || isLost}
                                                    />
                                                    <datalist id="products">
                                                        {PRODUCT_CATALOG.map(p => <option key={p.name} value={p.name} />)}
                                                    </datalist>
                                                </td>
                                                <td className="py-2"><input type="number" className="bg-transparent w-full outline-none" placeholder="0" value={item.price} onChange={e => updateProductItem(item.id, 'price', Number(e.target.value))} disabled={isContract || isLost} /></td>
                                                <td className="py-2"><input type="number" className="bg-transparent w-full outline-none" value={item.quantity} onChange={e => updateProductItem(item.id, 'quantity', Number(e.target.value))} disabled={isContract || isLost} /></td>
                                                <td className="py-2 text-right font-bold text-slate-700">{(item.price * item.quantity).toLocaleString()}</td>
                                                <td className="py-2 text-center">
                                                    {!isContract && !isLost && <button onClick={() => removeProductItem(item.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={12} /></button>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {!isContract && !isLost && <button onClick={addProductItem} className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded flex items-center gap-1"><Plus size={12} /> Thêm dòng</button>}

                                <div className="border-t border-slate-200 mt-4 pt-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-bold text-slate-500">Tổng giá trị niêm yết:</span>
                                        <span className="text-slate-700 font-bold">
                                            {productItems.reduce((sum, item) => sum + (item.price * item.quantity), 0).toLocaleString()} ₫
                                        </span>
                                    </div>

                                    <label className="field-label mt-4">Lộ trình đóng phí dự kiến (Payment Schedule)</label>
                                    <textarea
                                        className="field-input h-20 resize-none"
                                        placeholder="- Đợt 1: Đặt cọc 10tr&#10;- Đợt 2: Khi có Visa đóng nốt..."
                                        defaultValue={lead.paymentRoadmap}
                                        onBlur={e => handleFieldBlur('paymentRoadmap', e.target.value)}
                                        disabled={isWon || isLost}
                                    />
                                    {!isWon && !isLost && (
                                        <div className="mt-3 flex justify-end">
                                            <button
                                                onClick={handleSendQuote}
                                                className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700"
                                            >
                                                Gửi báo giá → Đàm phán
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* SECTION 4: NEGOTIATION (THƯƠNG THẢO) */}
                        <div className={`mb-10 ${(isPipeline && lead.status !== DealStage.PROPOSAL && lead.status !== DealStage.DEEP_CONSULTING) || isWon ? 'active-section' : 'dimmed-section'}`}>
                            <h3 className="section-title"><span className="badge-section">4</span> THƯƠNG THẢO & CAM KẾT (NEGOTIATION)</h3>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-4 border border-blue-100 rounded-lg p-4 bg-white">

                                {/* Discount & Final Price */}
                                <div className="col-span-2 flex justify-between items-start border-b border-blue-50 pb-4 mb-2">
                                    <div className="flex-1 mr-8">
                                        <div className="flex items-center gap-4 text-sm mb-2">
                                            <span className="text-slate-500 font-bold whitespace-nowrap">Giảm giá / Voucher (₫):</span>
                                            <input
                                                type="number"
                                                className={`w-32 text-right border-b border-red-200 text-red-600 font-bold focus:border-red-500 outline-none p-1 bg-transparent ${(discount > ((lead.value || 0) + discount) * 0.1) ? 'border-red-500 bg-red-50' : ''}`}
                                                value={discount}
                                                onChange={e => setDiscount(Number(e.target.value))}
                                                disabled={isWon || isLost}
                                                placeholder="0"
                                            />
                                            {/* Approval Warning */}
                                            {productItems.length > 0 && discount > (productItems.reduce((sum, item) => sum + (item.price * item.quantity), 0) * 0.1) && (
                                                <button onClick={() => showToast("Đã gửi yêu cầu phê duyệt giảm giá > 10% tới Manager!", 'success')} className="text-[10px] bg-red-100 text-red-700 px-2 py-1 rounded font-bold animate-pulse hover:bg-red-200">
                                                    YÊU CẦU DUYỆT
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4 text-sm">
                                            <span className="text-slate-500 font-bold whitespace-nowrap">Lý do giảm giá <span className="text-red-500">*</span>:</span>
                                            <input
                                                className="flex-1 field-input py-1"
                                                placeholder="VD: Học bổng, Voucher sự kiện, Người quen..."
                                                defaultValue={lead.discountReason}
                                                onBlur={e => handleFieldBlur('discountReason', e.target.value)}
                                                disabled={isWon || isLost}
                                            />
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-xs text-slate-400 mb-1">TỔNG GIÁ TRỊ DEAL (SAU GIẢM)</span>
                                        <span className="text-2xl font-extrabold text-blue-700 block">{calculatedTotal.toLocaleString()} ₫</span>
                                    </div>
                                </div>

                                {/* Probability Slider */}
                                <div>
                                    <label className="field-label flex justify-between">
                                        Xác suất thành công (%)
                                        <span className="text-blue-600 font-bold">{lead.probability || 20}%</span>
                                    </label>
                                    <input
                                        type="range" min="0" max="100" step="10"
                                        className="w-full accent-blue-600 cursor-pointer"
                                        defaultValue={lead.probability || 20}
                                        onChange={e => handleFieldBlur('probability', Number(e.target.value))} // Live update better? Maybe on mouse up
                                        onMouseUp={e => handleFieldBlur('probability', Number(e.currentTarget.value))}
                                        disabled={isContract || isLost}
                                    />
                                </div>

                                {/* Expected Close Date */}
                                <div>
                                    <label className="field-label">Ngày dự kiến chốt <span className="text-red-500">*</span></label>
                                    <input
                                        type="date"
                                        className="field-input font-bold text-blue-800"
                                        defaultValue={lead.expectedClosingDate?.split('T')[0]} // Format YYYY-MM-DD
                                        onBlur={e => handleFieldBlur('expectedClosingDate', e.target.value)}
                                        disabled={isContract || isLost}
                                    />
                                </div>

                            </div>
                        </div>

                        {/* SECTION 5: LEGAL (PRE-WON) */}
                        <div className={`mb-20 ${isPipeline || isContract ? 'active-section' : 'dimmed-section'}`}>
                            <h3 className="section-title text-red-700 border-red-100 bg-red-50 pl-2 py-1 rounded-sm"><ShieldCheck size={16} /> 5. THÔNG TIN PHÁP LÝ (BẮT BUỘC ĐỂ WON)</h3>

                            <div className="grid grid-cols-3 gap-x-4 gap-y-4 border border-red-100 rounded p-4 bg-white relative">
                                <div className="col-span-1">
                                    <label className="field-label text-red-800">Số CCCD / Hộ chiếu <span className="text-red-500">*</span></label>
                                    <input className="field-input font-bold border-red-200" placeholder="Số giấy tờ" defaultValue={lead.identityCard} onBlur={e => handleFieldBlur('identityCard', e.target.value)} disabled={isWon || isContract || isLost} />
                                </div>
                                <div className="col-span-1">
                                    <label className="field-label text-red-800">Ngày cấp <span className="text-red-500">*</span></label>
                                    <input type="date" className="field-input border-red-200" defaultValue={lead.identityDate} onBlur={e => handleFieldBlur('identityDate', e.target.value)} disabled={isWon || isContract || isLost} />
                                </div>
                                <div className="col-span-1">
                                    <label className="field-label text-red-800">Nơi cấp <span className="text-red-500">*</span></label>
                                    <input className="field-input border-red-200" placeholder="Cục CS QLHC..." defaultValue={lead.identityPlace} onBlur={e => handleFieldBlur('identityPlace', e.target.value)} disabled={isWon || isContract || isLost} />
                                </div>
                                <div className="col-span-3">
                                    <label className="field-label text-red-800">Địa chỉ thường trú (Full) <span className="text-red-500">*</span></label>
                                    <input className="field-input border-red-200" placeholder="Số nhà, Đường, Phường/Xã, Quận/Huyện, Tỉnh/TP" defaultValue={lead.address} onBlur={e => handleFieldBlur('address', e.target.value)} disabled={isWon || isContract || isLost} />
                                </div>
                                <div className="col-span-3">
                                    <label className="field-label text-red-800">Người ký Hợp đồng</label>
                                    <div className="flex gap-4 mt-1">
                                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                                            <input type="radio" name="signer" value="student" defaultChecked={lead.contractSigner === 'student' || !lead.contractSigner} onChange={() => handleFieldBlur('contractSigner', 'student')} disabled={isWon || isContract || isLost} />
                                            <span className="font-medium text-slate-700">Học viên</span>
                                        </label>
                                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                                            <input type="radio" name="signer" value="guardian" defaultChecked={lead.contractSigner === 'guardian'} onChange={() => handleFieldBlur('contractSigner', 'guardian')} disabled={isWon || isContract || isLost} />
                                            <span className="font-medium text-slate-700">Phụ huynh</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ACTION BUTTON */}
                        <div className="sticky bottom-0 bg-white pt-4 pb-2 border-t border-slate-100 flex justify-between gap-3 shadow-[0_-5px_15px_rgba(0,0,0,0.05)] z-20">
                            {isContract ? (
                                <div className="w-full flex justify-between items-center bg-green-50 px-4 py-2 rounded-lg border border-green-200">
                                    <span className="text-green-800 text-sm font-bold flex items-center gap-2"><Lock size={18} /> Hợp đồng đã ký (Closed).</span>
                                    <button
                                        onClick={() => showToast("Hợp đồng PDF đã được lưu trữ.", 'info')}
                                        className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold shadow-md hover:bg-green-700 active:scale-95 transition-all text-sm flex items-center gap-2"
                                    >
                                        <FileSignature size={16} /> XEM HỢP ĐỒNG
                                    </button>
                                </div>
                            ) : isLost ? (
                                <div className="w-full flex justify-center items-center bg-red-50 px-4 py-2 rounded-lg border border-red-200 text-red-700 font-bold">
                                    <Ban size={16} className="mr-2" /> Lead đã thất bại.
                                </div>
                            ) : (
                                <>
                                    <span className="text-xs text-slate-400 italic flex items-center">Điền thông tin theo từng giai đoạn.</span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => { addLog('system', 'Lưu thủ công'); showToast('Đã lưu dữ liệu!', 'success'); }}
                                            className="flex items-center gap-2 bg-slate-800 text-white px-6 py-2 rounded-lg font-bold shadow-md hover:bg-slate-900 active:scale-95 transition-all text-sm"
                                        >
                                            <CheckCircle2 size={16} /> LƯU THÔNG TIN
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                    </div>

                    {/* --- RIGHT: CHATTER (1/3) --- */}
                    <div className="w-[34%] bg-[#F9FAFB] flex flex-col h-full border-l border-slate-200">
                        {/* TABS */}
                        <div className="px-4 py-3 border-b border-slate-200 bg-white flex sticky top-0 z-10 gap-2">
                            <button onClick={() => setChatterTab('note')} className={`flex-1 py-1.5 text-xs font-bold rounded border ${chatterTab === 'note' ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-white border-slate-300 text-slate-600'}`}>Log Note</button>
                            <button onClick={() => setChatterTab('meeting')} className={`flex-1 py-1.5 text-xs font-bold rounded border ${chatterTab === 'meeting' ? 'bg-blue-600 text-white border-blue-700' : 'bg-white border-slate-300 text-slate-600'}`}>Lịch hẹn / Test</button>
                            <button onClick={() => setChatterTab('message')} className={`flex-1 py-1.5 text-xs font-bold rounded border ${chatterTab === 'message' ? 'bg-blue-100 text-blue-900 border-blue-300' : 'bg-white border-slate-300 text-slate-600'}`}>Gửi Tin</button>
                            <button onClick={() => setChatterTab('activity')} className={`flex-1 py-1.5 text-xs font-bold rounded border ${chatterTab === 'activity' ? 'bg-purple-100 text-purple-900 border-purple-300' : 'bg-white border-slate-300 text-slate-600'}`}>Lên Lịch</button>
                        </div>

                        {/* FOLLOWERS BAR */}
                        <div className="px-4 py-2 border-b border-slate-100 bg-white flex justify-between items-center shadow-sm z-0">
                            <div className="flex items-center gap-2 text-slate-500">
                                <Users size={14} />
                                <span className="text-xs font-bold">{followers.length} Followers</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="flex -space-x-2 mr-2">
                                    {followers.map((f, idx) => (
                                        <div key={idx} className="w-6 h-6 rounded-full bg-blue-100 border border-white flex items-center justify-center text-[10px] font-bold text-blue-800" title={f.name}>
                                            {f.avatar || f.name?.charAt(0)}
                                        </div>
                                    ))}
                                </div>
                                <button onClick={() => setShowFollowersModal(true)} className="text-xs text-blue-600 font-bold hover:bg-blue-50 px-2 py-1 rounded flex items-center gap-1">
                                    <Plus size={12} /> Add
                                </button>
                            </div>
                        </div>

                        {/* INPUT AREA */}
                        <div className="p-4 border-b border-slate-200 bg-white">
                            {chatterTab === 'activity' ? (
                                <div className="space-y-3">
                                    <div className="flex gap-2 mb-2">
                                        {ACTIVITY_TYPES.map(t => (
                                            <button key={t.id} onClick={() => setActivityType(t.id)} className={`p-2 rounded border text-[10px] font-bold uppercase flex flex-col items-center gap-1 w-1/4 ${activityType === t.id ? 'bg-purple-50 border-purple-400 text-purple-700' : 'border-slate-200 text-slate-500'}`}>
                                                <t.icon size={14} /> {t.label}
                                            </button>
                                        ))}
                                    </div>
                                    <input type="datetime-local" className="w-full text-xs p-2 border rounded font-bold" value={activityDate} onChange={e => setActivityDate(e.target.value)} />
                                    <input className="w-full text-xs p-2 border rounded" placeholder="Tiêu đề công việc..." value={activitySummary} onChange={e => setActivitySummary(e.target.value)} />
                                    <button onClick={handleScheduleActivity} className="w-full bg-purple-600 text-white py-1.5 rounded text-xs font-bold">Lưu Công Việc</button>
                                </div>
                            ) : chatterTab === 'meeting' ? (
                                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <label className="text-[10px] font-bold text-slate-500 mb-1 block">Thời gian</label>
                                            <input
                                                type="datetime-local"
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-blue-500 outline-none font-bold"
                                                value={meetingDate}
                                                onChange={(e) => setMeetingDate(e.target.value)}
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-[10px] font-bold text-slate-500 mb-1 block">Loại hình</label>
                                            <select
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-blue-500 outline-none"
                                                value={meetingType}
                                                onChange={(e) => setMeetingType(e.target.value as MeetingType)}
                                            >
                                                <option value={MeetingType.OFFLINE}>Test Offline (Tại trung tâm)</option>
                                                <option value={MeetingType.ONLINE}>Phỏng vấn Online</option>
                                                <option value={MeetingType.CONSULTING}>Tư vấn trực tiếp</option>
                                            </select>
                                        </div>
                                    </div>
                                    <textarea
                                        className="w-full h-20 p-2 text-xs border border-blue-300 bg-blue-50 rounded resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Ghi chú cho lịch hẹn (VD: Học sinh cần test kỹ ngữ pháp...)"
                                        value={noteContent}
                                        onChange={e => setNoteContent(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendLog(); } }}
                                    ></textarea>
                                    <button
                                        onClick={handleSendLog}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-xs font-bold shadow-md transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Calendar size={14} /> ĐẶT LỊCH HẸN
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <textarea
                                        className={`w-full h-20 p-2 text-xs border rounded resize-none mb-2 ${chatterTab === 'note' ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}`}
                                        placeholder={chatterTab === 'note' ? "Ghi chú nhanh cho team..." : "Soạn tin nhắn gửi khách..."}
                                        value={noteContent}
                                        onChange={e => setNoteContent(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendLog(); } }}
                                    ></textarea>
                                    <div className="flex justify-between items-center">
                                        {chatterTab === 'note' && (
                                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                                                    checked={scheduleNext}
                                                    onChange={e => setScheduleNext(e.target.checked)}
                                                />
                                                <span className="text-xs font-bold text-slate-600">Lên lịch tiếp theo? (Arrange time)</span>
                                            </label>
                                        )}
                                        <div className="ml-auto">
                                            <button
                                                onClick={handleSendLog}
                                                className={`px-4 py-1.5 rounded text-xs font-bold shadow-md transition-colors ${chatterTab === 'note' ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                                            >
                                                Gửi / Lưu
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* TIMELINE */}
                        <div className="flex-1 overflow-auto p-4 custom-scrollbar space-y-6">
                            {Object.entries(groupedLogs).map(([date, logs]) => (
                                <div key={date}>
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="h-px bg-slate-200 flex-1"></div>
                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-full border border-slate-200 whitespace-nowrap">{date}</span>
                                        <div className="h-px bg-slate-200 flex-1"></div>
                                    </div>

                                    <div className="space-y-4">
                                        {logs.map((log: any) => (
                                            <div key={log.id} className="relative pl-6 pb-2 border-l border-slate-200 last:border-0 ml-2 group">
                                                <div className={`absolute -left-[17px] top-0 w-8 h-8 rounded-full border-2 flex items-center justify-center bg-white text-[10px] font-bold z-10 ${log.type === 'system' ? 'border-slate-200 text-slate-400' : 'border-blue-200 text-blue-600'}`}>
                                                    {log.user === 'Hệ thống' || log.user === 'Admin' ? 'SYS' : (log.user || 'U').charAt(0)}
                                                </div>

                                                <div className="flex justify-between items-start">
                                                    <span className="font-bold text-xs text-slate-800">{log.user || 'System'}</span>
                                                    <span className="text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>

                                                <div className={`mt-1 text-sm p-3 rounded-lg border text-xs shadow-sm ${log.type === 'system' ? 'bg-slate-50 border-transparent text-slate-500 italic p-1 pl-2 shadow-none' :
                                                    log.type === 'note' ? 'bg-[#fffbeb] border-amber-100 text-slate-800' :
                                                        log.type === 'activity' ? 'bg-purple-50 border-purple-100 text-purple-900' :
                                                            'bg-white border-blue-100 text-slate-800'
                                                    }`}>
                                                    {log.type === 'note' && <span className="text-[9px] font-extrabold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded mr-2 uppercase tracking-wide">Log Note</span>}
                                                    {log.type === 'activity' && <span className="text-[9px] font-extrabold text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded mr-2 uppercase tracking-wide">Lịch</span>}
                                                    {log.type === 'message' && <span className="text-[9px] font-extrabold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded mr-2 uppercase tracking-wide">Tin Nhắn</span>}

                                                    {log.description}
                                                    {log.type === 'activity' && log.status === 'scheduled' && (
                                                        <div className="mt-2">
                                                            <button
                                                                onClick={() => {
                                                                    setCompletingActivityId(log.id);
                                                                    setCompletionNote('');
                                                                }}
                                                                className="text-[10px] font-bold text-purple-700 bg-white border border-purple-200 px-2 py-1 rounded hover:bg-purple-50"
                                                            >
                                                                Hoàn thành
                                                            </button>
                                                        </div>
                                                    )}
                                                    {log.type === 'activity' && log.status === 'completed' && (
                                                        <div className="mt-2 text-[10px] font-bold text-green-700">Đã hoàn thành</div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                    </div>
                </div>

                {/* NEXT ACTIVITY MODAL */}
                {showNextActivityModal && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
                        <div className="bg-white p-6 rounded-lg shadow-2xl w-[420px] animate-in zoom-in-95">
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Tạo hoạt động tiếp theo</h3>
                            <p className="text-sm text-slate-600 mb-4">Hãy tạo hoạt động tiếp theo để tiếp tục chăm sóc.</p>

                            <div className="flex gap-2 mb-3">
                                {ACTIVITY_TYPES.map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => setNextActivityType(t.id)}
                                        className={`flex-1 p-2 rounded border text-[10px] font-bold uppercase ${nextActivityType === t.id ? 'bg-purple-50 border-purple-400 text-purple-700' : 'border-slate-200 text-slate-500'}`}
                                    >
                                        <t.icon size={12} /> {t.label}
                                    </button>
                                ))}
                            </div>

                            <input type="datetime-local" className="w-full text-xs p-2 border rounded font-bold mb-2" value={nextActivityDate} onChange={e => setNextActivityDate(e.target.value)} />
                            <input className="w-full text-xs p-2 border rounded mb-4" placeholder="Tiêu đề công việc..." value={nextActivitySummary} onChange={e => setNextActivitySummary(e.target.value)} />

                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => { setShowNextActivityModal(false); finalizePendingConvert(); }}
                                    className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded"
                                >
                                    Bỏ qua
                                </button>
                                <button
                                    onClick={() => {
                                        if (!nextActivitySummary) return;
                                        addScheduledActivity(nextActivityType, nextActivitySummary, nextActivityDate);
                                        setNextActivitySummary('');
                                        setShowNextActivityModal(false);
                                        finalizePendingConvert();
                                    }}
                                    className="px-4 py-2 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded"
                                >
                                    Tạo hoạt động
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* COMPLETE ACTIVITY MODAL */}
                {completingActivityId && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
                        <div className="bg-white p-6 rounded-lg shadow-2xl w-[420px] animate-in zoom-in-95">
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Cập nhật kết quả</h3>
                            <p className="text-sm text-slate-600 mb-4">Nhập nội dung thực tế để lưu vào Log Note.</p>

                            <textarea
                                className="w-full p-2 border border-slate-300 rounded text-sm mb-4 h-24"
                                placeholder="VD: Đã gọi, khách hẹn gặp lại..."
                                value={completionNote}
                                onChange={e => setCompletionNote(e.target.value)}
                            ></textarea>

                            <div className="flex justify-end gap-2">
                                <button onClick={() => setCompletingActivityId(null)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded">Hủy</button>
                                <button onClick={completeActivity} className="px-4 py-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded">Lưu</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* LOSS MODAL */}
                {showLossModal && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
                        <div className="bg-white p-6 rounded-lg shadow-2xl w-96 animate-in zoom-in-95">
                            <h3 className="text-lg font-bold text-red-600 mb-4 flex items-center gap-2"><Ban /> Xác nhận thất bại Lead?</h3>
                            <p className="text-sm text-slate-600 mb-4">Vui lòng cho biết lý do để hệ thống ghi nhận:</p>
                            <textarea
                                className="w-full p-2 border border-slate-300 rounded text-sm mb-4 h-24"
                                placeholder="VD: Khách thấy đắt, đã chốt bên khác..."
                                value={lossReason}
                                onChange={e => setLossReason(e.target.value)}
                            ></textarea>
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setShowLossModal(false)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded">Hủy</button>
                                <button onClick={handleLossAction} className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded">Xác nhận LOST</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* FOLLOWERS MODAL */}
                {isOpen && showFollowersModal && (
                    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center animate-in fade-in">
                        <div className="bg-white p-6 rounded-lg w-80 shadow-2xl scale-in-95">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-md font-bold flex items-center gap-2"><Users size={16} /> Thêm người theo dõi</h3>
                                <button onClick={() => setShowFollowersModal(false)}><X size={16} className="text-slate-400 hover:text-black" /></button>
                            </div>
                            <div className="space-y-2">
                                {MOCK_USERS.map(u => {
                                    const isFollowing = followers.some(f => f.id === u.id);
                                    return (
                                        <div key={u.id} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded border border-transparent hover:border-slate-100">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-600">
                                                    {u.avatar}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-slate-700">{u.name}</div>
                                                    <div className="text-xs text-slate-500">{u.role}</div>
                                                </div>
                                            </div>
                                            {isFollowing ? (
                                                <span className="text-xs text-green-600 font-bold flex items-center"><CheckCircle2 size={12} className="mr-1" /> Following</span>
                                            ) : (
                                                <button onClick={() => handleAddFollower(u)} className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">Add</button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {showConfetti && (
                    <div className="fixed inset-0 pointer-events-none z-[100] flex items-center justify-center">
                        <div className="animate-in zoom-in spin-in duration-1000">
                            <span className="text-6xl">🎉</span>
                        </div>
                    </div>
                )}

            </div>
        </div >
    );
};

export default UnifiedLeadDrawer;
