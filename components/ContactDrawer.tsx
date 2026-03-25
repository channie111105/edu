import React, { useEffect, useMemo, useState } from 'react';
import { IContact, IContract, IDeal, ContractStatus } from '../types';
import { Building2, Calendar, CheckCircle2, Clock, CreditCard, DollarSign, ExternalLink, Globe, Plus, Receipt, Save, ShieldCheck, Tag, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getContracts, getContactById, getDeals } from '../utils/storage';
import CreateMeetingModal from './CreateMeetingModal';
import { MeetingCustomerOption } from '../utils/meetingHelpers';

interface ContactDrawerProps {
    contact: IContact | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: (updatedContact: IContact) => void;
}

type ContactTab = 'details' | 'notes' | 'sales' | 'invoicing';

const inputClassName = 'h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-100';
const panelClassName = 'rounded-lg border border-slate-300 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]';

const FieldBlock: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({ label, children, className }) => (
    <div className={['space-y-1.5', className || ''].join(' ').trim()}>
        <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600">
            {label}
        </label>
        <div className="min-w-0">{children}</div>
    </div>
);

const MetricCard: React.FC<{ icon: React.ElementType; label: string; value: string; hint?: string }> = ({ icon: Icon, label, value, hint }) => (
    <div className="flex min-w-0 items-center justify-between gap-2 rounded-md border border-slate-300 bg-white px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                <Icon size={14} />
            </div>
            <div className="min-w-0">
                <div className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">{label}</div>
                {hint ? <div className="truncate text-[11px] font-medium text-slate-500">{hint}</div> : null}
            </div>
        </div>
        <div className="shrink-0 text-[17px] font-medium leading-none text-slate-800">{value}</div>
    </div>
);

const TabButton: React.FC<{ active: boolean; label: string; onClick: () => void }> = ({ active, label, onClick }) => (
    <button onClick={onClick} className={['w-full whitespace-nowrap rounded-md border px-3 py-2 text-[13px] font-semibold transition-colors', active ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-transparent bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800'].join(' ')}>{label}</button>
);

const SummaryRow: React.FC<{ icon: React.ElementType; label: string; value: string; hint?: string }> = ({ icon: Icon, label, value, hint }) => (
    <div className="flex items-center justify-between gap-3 rounded-md border border-slate-300 bg-white px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                <Icon size={13} />
            </div>
            <div className="min-w-0">
                <div className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">{label}</div>
                {hint ? <div className="truncate text-[11px] font-medium text-slate-500">{hint}</div> : null}
            </div>
        </div>
        <div className="shrink-0 text-[14px] font-medium text-slate-800">{value}</div>
    </div>
);

const ContactDrawer: React.FC<ContactDrawerProps> = ({ contact: initialContact, isOpen, onClose, onUpdate }) => {
    const { user } = useAuth();
    const [contact, setContact] = useState<IContact | null>(null);
    const [activeTab, setActiveTab] = useState<ContactTab>('details');
    const [deals, setDeals] = useState<IDeal[]>([]);
    const [contracts, setContracts] = useState<IContract[]>([]);
    const [noteContent, setNoteContent] = useState('');
    const [isCreateMeetingModalOpen, setIsCreateMeetingModalOpen] = useState(false);

    useEffect(() => {
        if (!initialContact) return;
        setContact(initialContact);
        setActiveTab('details');
        setNoteContent('');
        const relatedDeals = getDeals().filter((deal) => deal.leadId === initialContact.id || (initialContact.dealIds || []).includes(deal.id));
        setDeals(relatedDeals);
        setContracts(getContracts().filter((contract) => relatedDeals.some((deal) => deal.id === contract.dealId)));
    }, [initialContact]);

    const financialStats = useMemo(() => {
        const totalDealValue = deals.reduce((sum, deal) => sum + Number(deal.value || 0), 0);
        const totalContractValue = contracts.reduce((sum, contract) => sum + Number(contract.totalValue || 0), 0);
        const totalPaid = contracts.reduce((sum, contract) => sum + Number(contract.paidValue || 0), 0);
        const totalDebt = Math.max(totalContractValue - totalPaid, 0);
        const activeContracts = contracts.filter((contract) => contract.status === ContractStatus.ACTIVE || contract.status === ContractStatus.SIGNED).length;
        const meetingCount = (contact?.activities || []).filter((activity: any) => activity.type === 'meeting').length;
        return { activeContracts, dealCount: deals.length, meetingCount, totalContractValue, totalDealValue, totalDebt, totalPaid };
    }, [contact, contracts, deals]);

    if (!isOpen || !contact) return null;

    const money = (amount: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
    const compactMoney = (amount: number) => {
        const abs = Math.abs(amount || 0);
        if (abs >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}B`;
        if (abs >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
        return new Intl.NumberFormat('vi-VN').format(amount || 0);
    };
    const dateTime = (value?: string) => {
        if (!value) return '-';
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('vi-VN');
    };
    const initials = (name: string) => {
        const parts = String(name || '').trim().split(' ').filter(Boolean);
        if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
        return String(name || 'NA').slice(0, 2).toUpperCase();
    };
    const change = <K extends keyof IContact>(field: K, value: IContact[K]) => setContact((prev) => (prev ? { ...prev, [field]: value } : prev));
    const changeTags = (value: string) => setContact((prev) => prev ? { ...prev, marketingData: { ...prev.marketingData, tags: value.split(',').map((tag) => tag.trim()).filter(Boolean) } } : prev);
    const changeWebsite = (value: string) => setContact((prev) => prev ? { ...prev, website: value, socialLink: value } : prev);
    const addNote = () => {
        if (!noteContent.trim()) return;
        const updated = { ...contact, activities: [{ id: `note-${Date.now()}`, type: 'note', user: user?.name || 'Admin', timestamp: new Date().toISOString(), description: noteContent, title: 'Ghi chú nội bộ' }, ...(contact.activities || [])] };
        setContact(updated);
        onUpdate(updated);
        setNoteContent('');
    };
    const save = () => {
        onUpdate(contact);
        onClose();
    };
    const currentType = contact.contactType || (contact.company ? 'company' : 'individual');
    const tagValue = (contact.marketingData?.tags || []).join(', ');
    const websiteValue = contact.website || contact.socialLink || '';
    const activityList = [...(contact.activities || [])].sort((a: any, b: any) => new Date(b?.timestamp || b?.datetime || 0).getTime() - new Date(a?.timestamp || a?.datetime || 0).getTime());
    const lockedMeetingCustomer: MeetingCustomerOption = { key: `contact:${contact.id}`, id: contact.id, source: 'contact', name: contact.name, phone: contact.phone, campus: contact.company || contact.city || 'Hà Nội', address: contact.address || 'Chưa có địa chỉ', contactId: contact.id };
    const headerPrimaryValue = currentType === 'company' ? (contact.company || '') : contact.name;
    const headerSecondaryValue = currentType === 'company' ? contact.name : (contact.company || '');
    const headerPrimaryPlaceholder = currentType === 'company' ? 'Tên công ty' : 'Tên khách hàng';
    const headerSecondaryPlaceholder = currentType === 'company' ? 'Người phụ trách' : 'Công ty / Cơ sở';
    const headerTitle = currentType === 'company' ? (contact.company || contact.name) : contact.name;

    const renderDetailTab = () => (
        <div className={`${panelClassName} p-4`}>
            <div className="grid gap-x-5 gap-y-3 xl:grid-cols-2">
                <FieldBlock label="MST/CCCD">
                    <input type="text" value={contact.identityCard || ''} onChange={(event) => change('identityCard', event.target.value)} placeholder="VD: 07920400xxxx" className={inputClassName} />
                </FieldBlock>
                <FieldBlock label="Chức danh">
                    <input type="text" value={contact.job || ''} onChange={(event) => change('job', event.target.value)} placeholder="VD: Trưởng phòng kinh doanh" className={inputClassName} />
                </FieldBlock>
                <FieldBlock label="Điện thoại">
                    <input type="text" value={contact.phone || ''} onChange={(event) => change('phone', event.target.value)} placeholder="0912341885" className={inputClassName} />
                </FieldBlock>
                <FieldBlock label="Di động">
                    <input type="text" value={contact.mobile || ''} onChange={(event) => change('mobile', event.target.value)} placeholder="0912341885" className={inputClassName} />
                </FieldBlock>
                <FieldBlock label="Email">
                    <input type="email" value={contact.email || ''} onChange={(event) => change('email', event.target.value)} placeholder="vd: customer@example.com" className={inputClassName} />
                </FieldBlock>
                <FieldBlock label="Danh xưng">
                    <select value={contact.title || ''} onChange={(event) => change('title', event.target.value)} className={inputClassName}>
                        <option value="">Chọn danh xưng</option>
                        <option value="Mr.">Anh</option>
                        <option value="Ms.">Chị</option>
                        <option value="Parent">Phụ huynh</option>
                        <option value="Student">Học viên</option>
                    </select>
                </FieldBlock>
                <FieldBlock label="Thẻ">
                    <input type="text" value={tagValue} onChange={(event) => changeTags(event.target.value)} placeholder="tag-1, tag-2, vip" className={inputClassName} />
                </FieldBlock>
                <FieldBlock label="Cơ sở">
                    <input type="text" value={contact.venue || ''} onChange={(event) => change('venue', event.target.value)} placeholder="Cơ sở / Campus" className={inputClassName} />
                </FieldBlock>
                <FieldBlock label="Trang web">
                    <input type="text" value={websiteValue} onChange={(event) => changeWebsite(event.target.value)} placeholder="VD: https://example.com" className={inputClassName} />
                </FieldBlock>
                <FieldBlock label="Ngôn ngữ">
                    <input type="text" value={contact.languageLevel || ''} onChange={(event) => change('languageLevel', event.target.value)} placeholder="Tiếng Việt / Tiếng Anh" className={inputClassName} />
                </FieldBlock>
                <FieldBlock label="Điểm email">
                    <div className="relative">
                        <input type="number" min={0} max={100} value={contact.emailScore ?? 0} onChange={(event) => change('emailScore', Number(event.target.value) || 0)} className={`${inputClassName} pr-9`} />
                        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-semibold text-slate-500">%</span>
                    </div>
                </FieldBlock>
                <FieldBlock label="Email lỗi">
                    <label className="flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-slate-50 px-3 shadow-sm">
                        <input type="checkbox" checked={Boolean(contact.emailBounced)} onChange={(event) => change('emailBounced', event.target.checked)} className="h-4 w-4 rounded border-slate-400 text-blue-600 focus:ring-blue-500" />
                        <span className="truncate text-sm font-medium text-slate-700">Đánh dấu email không hợp lệ</span>
                    </label>
                </FieldBlock>
                <FieldBlock label="Địa chỉ" className="xl:col-span-2">
                    <div className="grid gap-2 xl:grid-cols-[1.5fr_repeat(3,minmax(0,1fr))]">
                        <input type="text" value={contact.address || ''} onChange={(event) => change('address', event.target.value)} placeholder="Số nhà, tên đường..." className={inputClassName} />
                        <input type="text" value={contact.city || ''} onChange={(event) => change('city', event.target.value)} placeholder="Tỉnh / Thành phố" className={inputClassName} />
                        <input type="text" value={contact.district || ''} onChange={(event) => change('district', event.target.value)} placeholder="Quận / Huyện" className={inputClassName} />
                        <input type="text" value={contact.ward || ''} onChange={(event) => change('ward', event.target.value)} placeholder="Phường / Xã" className={inputClassName} />
                    </div>
                </FieldBlock>
            </div>
            <div className="mt-3 grid gap-2 border-t border-slate-200 pt-3 md:grid-cols-3">
                <div className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2"><div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">Nguồn</div><div className="mt-1 truncate text-sm font-semibold text-slate-800">{contact.source || '-'}</div></div>
                <div className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2"><div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">Thị trường</div><div className="mt-1 truncate text-sm font-semibold text-slate-800">{contact.targetCountry || '-'}</div></div>
                <div className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2"><div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">Cập nhật</div><div className="mt-1 truncate text-sm font-semibold text-slate-800">{dateTime(contact.updatedAt || contact.createdAt)}</div></div>
            </div>
        </div>
    );

    const renderCompanyDetailTab = () => (
        <div className={`${panelClassName} p-4`}>
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_320px]">
                <div className="space-y-4">
                    <div className="grid gap-x-5 gap-y-3 xl:grid-cols-2">
                        <FieldBlock label="Tên công ty">
                            <input type="text" value={contact.company || ''} onChange={(event) => change('company', event.target.value)} placeholder="VD: Công ty ABC Education" className={inputClassName} />
                        </FieldBlock>
                        <FieldBlock label="Người phụ trách">
                            <input type="text" value={contact.name} onChange={(event) => change('name', event.target.value)} placeholder="VD: Phạm Minh Anh" className={inputClassName} />
                        </FieldBlock>
                        <FieldBlock label="Số điện thoại công ty">
                            <input type="text" value={contact.phone || ''} onChange={(event) => change('phone', event.target.value)} placeholder="028xxxxxxx" className={inputClassName} />
                        </FieldBlock>
                        <FieldBlock label="Di động / Hotline">
                            <input type="text" value={contact.mobile || ''} onChange={(event) => change('mobile', event.target.value)} placeholder="09xxxxxxxx" className={inputClassName} />
                        </FieldBlock>
                        <FieldBlock label="Email">
                            <input type="email" value={contact.email || ''} onChange={(event) => change('email', event.target.value)} placeholder="contact@company.vn" className={inputClassName} />
                        </FieldBlock>
                        <FieldBlock label="Website">
                            <input type="text" value={websiteValue} onChange={(event) => changeWebsite(event.target.value)} placeholder="https://company.vn" className={inputClassName} />
                        </FieldBlock>
                        <FieldBlock label="Mã số thuế">
                            <input type="text" value={contact.identityCard || ''} onChange={(event) => change('identityCard', event.target.value)} placeholder="MST doanh nghiệp" className={inputClassName} />
                        </FieldBlock>
                        <FieldBlock label="Chức vụ người phụ trách">
                            <input type="text" value={contact.job || ''} onChange={(event) => change('job', event.target.value)} placeholder="Giám đốc / Trưởng phòng" className={inputClassName} />
                        </FieldBlock>
                        <FieldBlock label="Cơ sở / Chi nhánh">
                            <input type="text" value={contact.venue || ''} onChange={(event) => change('venue', event.target.value)} placeholder="Chi nhánh Hà Nội / HCM" className={inputClassName} />
                        </FieldBlock>
                        <FieldBlock label="Thẻ">
                            <input type="text" value={tagValue} onChange={(event) => changeTags(event.target.value)} placeholder="B2B, VIP, Trường đối tác" className={inputClassName} />
                        </FieldBlock>
                        <FieldBlock label="Thị trường quan tâm">
                            <input type="text" value={contact.targetCountry || ''} onChange={(event) => change('targetCountry', event.target.value)} placeholder="Đức, Úc, Trung Quốc..." className={inputClassName} />
                        </FieldBlock>
                        <FieldBlock label="Nguồn">
                            <input type="text" value={contact.source || ''} onChange={(event) => change('source', event.target.value)} placeholder="Referral / Website / Sales tự khai thác" className={inputClassName} />
                        </FieldBlock>
                        <FieldBlock label="Địa chỉ công ty" className="xl:col-span-2">
                            <div className="grid gap-2 xl:grid-cols-[1.5fr_repeat(3,minmax(0,1fr))]">
                                <input type="text" value={contact.address || ''} onChange={(event) => change('address', event.target.value)} placeholder="Số nhà, tên đường..." className={inputClassName} />
                                <input type="text" value={contact.city || ''} onChange={(event) => change('city', event.target.value)} placeholder="Tỉnh / Thành phố" className={inputClassName} />
                                <input type="text" value={contact.district || ''} onChange={(event) => change('district', event.target.value)} placeholder="Quận / Huyện" className={inputClassName} />
                                <input type="text" value={contact.ward || ''} onChange={(event) => change('ward', event.target.value)} placeholder="Phường / Xã" className={inputClassName} />
                            </div>
                        </FieldBlock>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="rounded-lg border border-slate-300 bg-slate-50 p-4">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">Hồ sơ công ty</div>
                        <div className="mt-3 space-y-2">
                            <SummaryRow icon={Building2} label="Doanh nghiệp" value={contact.company || 'Chưa có tên công ty'} hint={contact.venue || 'Chưa có chi nhánh'} />
                            <SummaryRow icon={Globe} label="Website" value={websiteValue ? websiteValue.replace(/^https?:\/\//, '') : '-'} hint="Trang web chính thức" />
                            <SummaryRow icon={Receipt} label="Mã số thuế" value={contact.identityCard || '-'} hint="Thông tin pháp lý" />
                            <SummaryRow icon={Calendar} label="Cập nhật" value={dateTime(contact.updatedAt || contact.createdAt)} hint="Thời điểm gần nhất" />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <div className="rounded-md border border-slate-300 bg-white px-3 py-2">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">Người phụ trách</div>
                            <div className="mt-1 text-sm font-semibold text-slate-800">{contact.name || '-'}</div>
                            <div className="mt-1 text-xs font-medium text-slate-500">{contact.job || 'Chưa cập nhật chức vụ'}</div>
                        </div>
                        <div className="rounded-md border border-slate-300 bg-white px-3 py-2">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">Liên hệ chính</div>
                            <div className="mt-1 text-sm font-semibold text-slate-800">{contact.phone || '-'}</div>
                            <div className="mt-1 text-xs font-medium text-slate-500">{contact.email || 'Chưa có email'}</div>
                        </div>
                        <div className="rounded-md border border-slate-300 bg-white px-3 py-2">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">Phân loại</div>
                            <div className="mt-1 text-sm font-semibold text-slate-800">{contact.source || 'Chưa có nguồn'}</div>
                            <div className="mt-1 text-xs font-medium text-slate-500">{contact.targetCountry || 'Chưa có thị trường'}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderNotesTab = () => (
        <div className="grid items-start gap-4 xl:grid-cols-[330px_minmax(0,1fr)]">
            <div className={`${panelClassName} p-4`}>
                <div className="flex items-center justify-between border-b border-slate-200 pb-3"><div><div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">Ghi chú nội bộ</div><div className="mt-0.5 text-[15px] font-semibold text-slate-900">Thêm ghi chú hoặc lịch hẹn</div></div><button onClick={() => setIsCreateMeetingModalOpen(true)} className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"><Calendar size={13} />Tạo lịch hẹn</button></div>
                <textarea value={noteContent} onChange={(event) => setNoteContent(event.target.value)} placeholder="Nhập ghi chú nội bộ cho contact..." className="mt-3 min-h-[168px] w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-100" />
                <div className="mt-3 flex items-center justify-between gap-3"><div className="text-[11px] font-medium text-slate-500">Ghi chú sẽ lưu vào lịch sử hoạt động.</div><button onClick={addNote} disabled={!noteContent.trim()} className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"><Save size={13} />Lưu ghi chú</button></div>
            </div>
            <div className={`${panelClassName} p-4`}>
                <div className="border-b border-slate-200 pb-3"><div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">Dòng thời gian</div><div className="mt-0.5 text-[15px] font-semibold text-slate-900">Hoạt động gần đây</div></div>
                <div className="mt-3 space-y-3">
                    {activityList.length === 0 ? <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm font-medium text-slate-500">Chưa có hoạt động nào được ghi nhận cho contact này.</div> : activityList.map((activity: any) => (
                        <div key={activity.id} className="rounded-md border border-slate-300 bg-white p-3 shadow-sm"><div className="flex items-start justify-between gap-3"><div><div className="text-sm font-semibold text-slate-900">{activity.title || 'Ghi chú nội bộ'}</div><div className="mt-0.5 text-xs font-semibold text-blue-700">{activity.user || 'Hệ thống'}</div></div><div className="inline-flex items-center gap-1 text-xs font-medium text-slate-500"><Clock size={12} />{dateTime(activity.timestamp || activity.datetime)}</div></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{activity.description || activity.note || 'Không có nội dung'}</p></div>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderSalesTab = () => (
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className={`${panelClassName} overflow-hidden self-start`}>
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><div><div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">Kinh doanh</div><div className="mt-0.5 text-[15px] font-semibold text-slate-900">Cơ hội bán hàng</div></div><button className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"><Plus size={13} />Tạo cơ hội</button></div>
                <div className="divide-y divide-slate-200">{deals.length === 0 ? <div className="px-4 py-8 text-center text-sm font-medium text-slate-500">Contact này chưa có cơ hội bán hàng nào được liên kết.</div> : deals.map((deal) => <div key={deal.id} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-blue-50/40"><div className="min-w-0"><div className="truncate text-sm font-semibold text-slate-900">{deal.title}</div><div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500"><span>{deal.stage}</span><span className="text-slate-300">•</span><span>{dateTime(deal.createdAt)}</span></div></div><div className="text-right"><div className="text-sm font-semibold text-slate-900">{money(deal.value || 0)}</div><div className="text-[11px] font-medium text-slate-500">Doanh thu dự kiến</div></div></div>)}</div>
            </div>
            <div className="space-y-4 self-start">
                <div className={`${panelClassName} p-4`}><div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">Tổng quan</div><div className="mt-3 space-y-2"><SummaryRow icon={DollarSign} label="Giá trị cơ hội" value={compactMoney(financialStats.totalDealValue)} hint="Tổng giá trị" /><SummaryRow icon={Receipt} label="Đã ký" value={String(contracts.length)} hint="Hợp đồng đã tạo" /><SummaryRow icon={ShieldCheck} label="SO" value={String(financialStats.activeContracts)} hint="Hợp đồng đang chạy" /></div></div>
                <div className={`${panelClassName} overflow-hidden`}><div className="border-b border-slate-200 px-4 py-3"><div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">Hợp đồng</div><div className="mt-0.5 text-[15px] font-semibold text-slate-900">Chứng từ liên quan</div></div><div className="divide-y divide-slate-200">{contracts.length === 0 ? <div className="px-4 py-6 text-center text-sm font-medium text-slate-500">Chưa có hợp đồng liên kết.</div> : contracts.map((contract) => <div key={contract.id} className="px-4 py-3"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><div className="flex items-center gap-2"><div className="truncate text-sm font-semibold text-slate-900">{contract.code}</div><span className={['rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide', contract.status === ContractStatus.ACTIVE || contract.status === ContractStatus.SIGNED ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-300 bg-slate-100 text-slate-600'].join(' ')}>{contract.status}</span></div><div className="mt-0.5 text-xs font-medium text-slate-500">Ngày ký: {contract.signedDate ? dateTime(contract.signedDate) : '-'}</div></div><div className="text-right text-sm font-semibold text-slate-900">{money(contract.totalValue)}</div></div></div>)}</div></div>
            </div>
        </div>
    );

    const renderInvoicingTab = () => (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3"><MetricCard icon={Receipt} label="Đã xuất" value={compactMoney(financialStats.totalContractValue)} hint={money(financialStats.totalContractValue)} /><MetricCard icon={CheckCircle2} label="Đã thu" value={compactMoney(financialStats.totalPaid)} hint={money(financialStats.totalPaid)} /><MetricCard icon={CreditCard} label="Còn lại" value={compactMoney(financialStats.totalDebt)} hint={money(financialStats.totalDebt)} /></div>
            <div className={`${panelClassName} overflow-hidden`}><div className="border-b border-slate-200 px-5 py-4"><div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Công nợ / hóa đơn</div><div className="mt-1 text-base font-semibold text-slate-900">Tiến độ thanh toán theo hợp đồng</div></div><div className="divide-y divide-slate-200">{contracts.length === 0 ? <div className="px-5 py-10 text-center text-sm font-medium text-slate-500">Chưa có dữ liệu thanh toán cho contact này.</div> : contracts.map((contract) => { const paymentPercent = contract.totalValue > 0 ? Math.min(100, Math.round((contract.paidValue / contract.totalValue) * 100)) : 0; return <div key={contract.id} className="px-5 py-4"><div className="flex items-center justify-between gap-4"><div className="min-w-0"><div className="truncate text-sm font-semibold text-slate-900">{contract.code}</div><div className="mt-1 text-xs font-medium text-slate-500">Khách hàng: {contract.customerName || contact.name}</div></div><div className="text-right"><div className="text-sm font-semibold text-slate-900">{money(contract.paidValue)} / {money(contract.totalValue)}</div><div className="mt-1 text-xs font-medium text-slate-500">Đã thu {paymentPercent}%</div></div></div><div className="mt-3 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-blue-500" style={{ width: `${paymentPercent}%` }} /></div></div>; })}</div></div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 font-sans">
            <div className="absolute inset-0 bg-slate-900/35 backdrop-blur-sm" onClick={onClose} />
            <div className="relative flex h-[86vh] w-full max-w-[1100px] flex-col overflow-hidden rounded-[16px] border border-slate-300 bg-white shadow-2xl">
                <div className="border-b border-slate-300 bg-[linear-gradient(180deg,#eef5ff_0%,#f8fbff_100%)] px-4 py-3">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 flex-1 items-start gap-4">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-100 text-[26px] font-bold uppercase text-blue-700">{initials(headerTitle)}</div>
                            <div className="min-w-0 flex-1">
                                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-700">Khách hàng</div>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <button onClick={() => change('contactType', 'individual')} className={['rounded-full border px-3 py-1 text-xs font-semibold transition-colors', currentType === 'individual' ? 'border-blue-300 bg-blue-600 text-white' : 'border-slate-300 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700'].join(' ')}>Cá nhân</button>
                                    <button onClick={() => change('contactType', 'company')} className={['rounded-full border px-3 py-1 text-xs font-semibold transition-colors', currentType === 'company' ? 'border-blue-300 bg-blue-600 text-white' : 'border-slate-300 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700'].join(' ')}>Công ty</button>
                                </div>
                                <div className="mt-2 grid gap-2 xl:grid-cols-[minmax(0,1fr)_230px]"><input type="text" value={headerPrimaryValue} onChange={(event) => currentType === 'company' ? change('company', event.target.value) : change('name', event.target.value)} placeholder={headerPrimaryPlaceholder} className="h-10 rounded-md border border-blue-300 bg-blue-100 px-4 text-[18px] font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-100" /><input type="text" value={headerSecondaryValue} onChange={(event) => currentType === 'company' ? change('name', event.target.value) : change('company', event.target.value)} placeholder={headerSecondaryPlaceholder} className={inputClassName} /></div>
                                <div className="mt-2 flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700"><Tag size={11} className="text-blue-600" />{contact.source || 'Chưa có nguồn'}</span><span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700"><Globe size={11} className="text-blue-600" />{contact.targetCountry || 'Chưa có thị trường'}</span><span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700"><Building2 size={11} className="text-blue-600" />{contact.company || contact.city || 'Chưa có đơn vị'}</span></div>
                            </div>
                        </div>
                        <div className="grid w-full max-w-[360px] grid-cols-2 gap-2"><MetricCard icon={ExternalLink} label="Cơ hội" value={String(financialStats.dealCount)} hint="Đã liên kết" /><MetricCard icon={Calendar} label="Lịch hẹn" value={String(financialStats.meetingCount)} hint="Đã tạo" /><MetricCard icon={DollarSign} label="Doanh số" value={compactMoney(financialStats.totalContractValue)} hint="Tổng giá trị" /><MetricCard icon={ShieldCheck} label="SO" value={String(financialStats.activeContracts)} hint="Đang chạy" /></div>
                        <button onClick={onClose} className="rounded-md p-2 text-slate-500 transition hover:bg-white hover:text-slate-800"><X size={18} /></button>
                    </div>
                </div>
                <div className="custom-scrollbar flex-1 min-h-0 overflow-y-auto bg-[#f7f9fc] px-4 py-3">{activeTab === 'details' && (currentType === 'company' ? renderCompanyDetailTab() : renderDetailTab())}{activeTab === 'notes' && renderNotesTab()}{activeTab === 'sales' && renderSalesTab()}{activeTab === 'invoicing' && renderInvoicingTab()}</div>
                <div className="border-t border-slate-300 bg-white px-4 py-2.5"><div className="grid grid-cols-4 gap-2"><TabButton active={activeTab === 'details'} label={currentType === 'company' ? 'Thông tin công ty' : 'Liên hệ & địa chỉ'} onClick={() => setActiveTab('details')} /><TabButton active={activeTab === 'notes'} label="Ghi chú nội bộ" onClick={() => setActiveTab('notes')} /><TabButton active={activeTab === 'sales'} label="Kinh doanh" onClick={() => setActiveTab('sales')} /><TabButton active={activeTab === 'invoicing'} label="Công nợ / hóa đơn" onClick={() => setActiveTab('invoicing')} /></div></div>
                <div className="flex items-center justify-between border-t border-slate-300 bg-slate-50 px-4 py-3"><div className="text-xs font-medium text-slate-500">Cập nhật lần cuối: <span className="font-semibold text-slate-800">{dateTime(contact.updatedAt || contact.createdAt)}</span></div><div className="flex items-center gap-2.5"><button onClick={onClose} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Hủy</button><button onClick={save} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"><Save size={15} />Lưu</button></div></div>
            </div>
            <CreateMeetingModal isOpen={isCreateMeetingModalOpen} onClose={() => setIsCreateMeetingModalOpen(false)} salesPersonId={user?.id || 'u2'} salesPersonName={user?.name || 'Sales Rep'} lockedCustomer={lockedMeetingCustomer} onCreated={() => { const refreshed = getContactById(contact.id); if (refreshed) { setContact(refreshed); onUpdate(refreshed); } }} />
        </div>
    );
};

export default ContactDrawer;
