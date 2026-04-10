import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { ILead } from '../types';
import { getSalesTeams } from '../utils/storage';
import {
  LeadBatchConversionPreview,
  getLeadBatchConversionPreview,
  getLeadConversionPreview,
  getLeadExistingOpportunityOptions,
  LeadConversionAction,
  LeadConversionCustomerAction,
} from '../utils/leadConversion';

export interface ConvertLeadModalSubmitData {
  ownerId: string;
  salesChannel: string;
  conversionAction: LeadConversionAction;
  customerAction: LeadConversionCustomerAction;
  targetDealId?: string;
}

interface ConvertLeadModalProps {
  isOpen: boolean;
  lead: ILead | null;
  leads?: ILead[];
  onClose: () => void;
  onConfirm: (payload: ConvertLeadModalSubmitData) => void;
}

type SalesRepOption = {
  value: string;
  label: string;
  teamName?: string;
};

const labelClassName = 'text-[12px] font-medium text-slate-700';
const inputClassName =
  'h-8 w-full rounded border border-slate-300 bg-white px-3 text-[12px] text-slate-800 outline-none transition focus:border-sky-400 focus:ring-1 focus:ring-sky-200';

const buildBatchExecutionPreview = (
  preview: LeadBatchConversionPreview,
  customerAction: LeadConversionCustomerAction
) => {
  const groups = preview.groups.map((group) => {
    const canGroupByPhone = group.normalizedPhone.length > 6;
    const usesExistingContact = customerAction === 'link_existing_customer' && Boolean(group.existingContact);

    if (usesExistingContact) {
      return {
        ...group,
        createCount: 0,
        mergeCount: group.leads.length,
        usesExistingContact,
        bypassedExistingContact: undefined,
      };
    }

    if (canGroupByPhone) {
      return {
        ...group,
        createCount: 1,
        mergeCount: Math.max(0, group.leads.length - 1),
        usesExistingContact,
        bypassedExistingContact: group.existingContact,
      };
    }

    return {
      ...group,
      createCount: group.leads.length,
      mergeCount: 0,
      usesExistingContact,
      bypassedExistingContact: group.existingContact,
    };
  });

  return {
    ...preview,
    createCount: groups.reduce((sum, group) => sum + group.createCount, 0),
    mergeCount: groups.reduce((sum, group) => sum + group.mergeCount, 0),
    existingContactMatchCount: groups.filter((group) => group.usesExistingContact).length,
    bypassedExistingContactMatchCount: groups.filter((group) => Boolean(group.bypassedExistingContact)).length,
    groups,
  };
};

const buildPhoneHandlingDescription = (
  group: LeadBatchConversionPreview['groups'][number] & {
    usesExistingContact?: boolean;
    bypassedExistingContact?: LeadBatchConversionPreview['groups'][number]['existingContact'];
  }
) => {
  if (group.usesExistingContact && group.existingContact) {
    return `${group.leads.length} lead trùng SĐT, nhập vào Contact ${group.existingContact.name} (${group.existingContact.id}).`;
  }

  if (group.leads.length > 1) {
    const baseText = `${group.leads.length} lead trùng SĐT, tạo ${group.createCount} Contact và gộp ${group.mergeCount} lead trong lô convert.`;
    if (group.bypassedExistingContact) {
      return `${baseText} Bỏ qua Contact ${group.bypassedExistingContact.name} (${group.bypassedExistingContact.id}) theo lựa chọn hiện tại.`;
    }
    return baseText;
  }

  if (group.bypassedExistingContact) {
    return `Lead này trùng SĐT với Contact ${group.bypassedExistingContact.name} (${group.bypassedExistingContact.id}), nhưng đang chọn tạo Contact mới.`;
  }

  return `${group.leads.length} lead, tạo ${group.createCount} Contact.`;
};

const ConvertLeadModal: React.FC<ConvertLeadModalProps> = ({ isOpen, lead, leads = [], onClose, onConfirm }) => {
  const activeLeads = useMemo(() => {
    if (Array.isArray(leads) && leads.length > 0) return leads;
    return lead ? [lead] : [];
  }, [lead, leads]);

  const primaryLead = activeLeads[0] || null;
  const isBatchMode = activeLeads.length > 1;
  const salesTeams = useMemo(() => getSalesTeams(), []);

  const salesData = useMemo(() => {
    const reps = new Map<string, SalesRepOption>();
    const ownerToTeam = new Map<string, string>();

    salesTeams.forEach((team) => {
      team.members.forEach((member) => {
        ownerToTeam.set(member.userId, team.name);
        if (!reps.has(member.userId)) {
          reps.set(member.userId, {
            value: member.userId,
            label: member.name,
            teamName: team.name,
          });
        }
      });
    });

    if (primaryLead?.ownerId && !reps.has(primaryLead.ownerId)) {
      reps.set(primaryLead.ownerId, {
        value: primaryLead.ownerId,
        label: primaryLead.ownerId,
        teamName: ownerToTeam.get(primaryLead.ownerId),
      });
    }

    return {
      reps: Array.from(reps.values()),
      teams: salesTeams.map((team) => team.name),
      ownerToTeam,
    };
  }, [primaryLead?.ownerId, salesTeams]);

  const preview = useMemo(() => getLeadConversionPreview(primaryLead?.phone), [primaryLead?.phone]);
  const batchPreview = useMemo(() => getLeadBatchConversionPreview(activeLeads), [activeLeads]);
  const existingOpportunityOptions = useMemo(() => getLeadExistingOpportunityOptions(activeLeads), [activeLeads]);

  const [ownerId, setOwnerId] = useState('');
  const [salesChannel, setSalesChannel] = useState('');
  const [conversionAction, setConversionAction] = useState<LeadConversionAction>('create_opportunity');
  const [customerAction, setCustomerAction] = useState<LeadConversionCustomerAction>('create_new_customer');
  const [targetDealId, setTargetDealId] = useState('');

  const singleBatchGroup = isBatchMode && batchPreview.groups.length === 1 ? batchPreview.groups[0] : null;
  const existingContact = isBatchMode ? singleBatchGroup?.existingContact : preview.existingContact;
  const hasExistingContactMatch = isBatchMode
    ? batchPreview.groups.some((group) => Boolean(group.existingContact))
    : Boolean(existingContact);
  const hasMultiplePhoneGroups = isBatchMode && batchPreview.groups.length > 1;
  const canMergeExistingOpportunity = existingOpportunityOptions.length > 0;
  const isMergeActionSelected = conversionAction === 'merge_existing_opportunity' && canMergeExistingOpportunity;
  const selectedExistingOpportunity = existingOpportunityOptions.find((item) => item.id === targetDealId) || existingOpportunityOptions[0];
  const canLinkExistingCustomer = hasExistingContactMatch;
  const canCreateNewCustomer = !isMergeActionSelected;
  const effectiveCustomerAction: LeadConversionCustomerAction = isMergeActionSelected
    ? 'link_existing_customer'
    : customerAction === 'link_existing_customer' && !canLinkExistingCustomer
      ? 'create_new_customer'
      : customerAction;
  const batchExecutionPreview = useMemo(
    () => buildBatchExecutionPreview(batchPreview, effectiveCustomerAction),
    [batchPreview, effectiveCustomerAction]
  );
  const phoneHandlingGroups = useMemo(
    () => batchExecutionPreview.groups.filter((group) => group.leads.length > 1 || Boolean(group.existingContact)),
    [batchExecutionPreview.groups]
  );
  const shouldShowPhoneHandlingTable = phoneHandlingGroups.length > 0;
  const hasPhoneConflict = shouldShowPhoneHandlingTable || hasExistingContactMatch;
  const shouldShowConversionActionSection = true;
  const shouldShowCustomerSection = hasPhoneConflict;
  const shouldShowCustomerOptions = hasExistingContactMatch;
  const shouldShowSummary = hasPhoneConflict || isMergeActionSelected;
  const phoneHandlingTableTitle = isBatchMode ? 'Nhóm SĐT được xử lý' : 'SĐT được xử lý';

  useEffect(() => {
    if (!isOpen || !primaryLead) return;

    const initialOwnerId = primaryLead.ownerId || salesData.reps[0]?.value || '';
    const initialTeamName =
      salesData.ownerToTeam.get(initialOwnerId) ||
      salesData.reps.find((rep) => rep.value === initialOwnerId)?.teamName ||
      salesData.teams[0] ||
      '';

    setOwnerId(initialOwnerId);
    setSalesChannel(initialTeamName);
    setConversionAction('create_opportunity');
    setCustomerAction(hasExistingContactMatch ? 'link_existing_customer' : 'create_new_customer');
    setTargetDealId(existingOpportunityOptions[0]?.id || '');
  }, [
    existingOpportunityOptions,
    hasExistingContactMatch,
    isOpen,
    primaryLead,
    salesData.ownerToTeam,
    salesData.reps,
    salesData.teams,
  ]);

  useEffect(() => {
    if (!isOpen) return;

    if (!canMergeExistingOpportunity && conversionAction === 'merge_existing_opportunity') {
      setConversionAction('create_opportunity');
      return;
    }

    if (existingOpportunityOptions.length > 0 && !existingOpportunityOptions.some((item) => item.id === targetDealId)) {
      setTargetDealId(existingOpportunityOptions[0].id);
    }
  }, [canMergeExistingOpportunity, conversionAction, existingOpportunityOptions, isOpen, targetDealId]);

  useEffect(() => {
    if (!isOpen || isMergeActionSelected) return;
    if (customerAction === 'link_existing_customer' && !canLinkExistingCustomer) {
      setCustomerAction('create_new_customer');
    }
  }, [canLinkExistingCustomer, customerAction, isMergeActionSelected, isOpen]);

  if (!isOpen || !primaryLead) return null;

  const submitLabel = isMergeActionSelected
    ? 'Gộp vào cơ hội'
    : isBatchMode
      ? `Tạo ${batchPreview.totalLeads} cơ hội`
      : 'Tạo cơ hội';

  const handleOwnerChange = (nextOwnerId: string) => {
    setOwnerId(nextOwnerId);

    const mappedTeamName =
      salesData.ownerToTeam.get(nextOwnerId) ||
      salesData.reps.find((rep) => rep.value === nextOwnerId)?.teamName;

    if (mappedTeamName) {
      setSalesChannel(mappedTeamName);
    }
  };

  const handleConfirm = () => {
    const nextConversionAction: LeadConversionAction = isMergeActionSelected ? 'merge_existing_opportunity' : 'create_opportunity';

    onConfirm({
      ownerId,
      salesChannel,
      conversionAction: nextConversionAction,
      customerAction: nextConversionAction === 'merge_existing_opportunity' ? 'link_existing_customer' : effectiveCustomerAction,
      targetDealId: nextConversionAction === 'merge_existing_opportunity' ? selectedExistingOpportunity?.id : undefined,
    });
  };

  const summaryContent = isMergeActionSelected && selectedExistingOpportunity ? (
    <>
      {isBatchMode ? (
        <>
          Đã chọn <strong>{batchPreview.totalLeads}</strong> lead.
        </>
      ) : (
        <>Lead này </>
      )}{' '}
      sẽ nhập vào cơ hội <strong>{selectedExistingOpportunity.title}</strong> (<strong>{selectedExistingOpportunity.id}</strong>).
      Hệ thống giữ nguyên Deal ID, gộp Activity từ lead vào deal này và tiếp tục dùng Contact{' '}
      <strong>{selectedExistingOpportunity.contactId}</strong>.
    </>
  ) : isBatchMode ? (
    <>
      Đã chọn <strong>{batchExecutionPreview.totalLeads}</strong> lead, hệ thống sẽ tạo <strong>{batchExecutionPreview.createCount}</strong>{' '}
      Contact và gộp <strong>{batchExecutionPreview.mergeCount}</strong> lead theo nhóm SĐT trùng.
      {batchExecutionPreview.existingContactMatchCount > 0 ? (
        <> Có <strong>{batchExecutionPreview.existingContactMatchCount}</strong> nhóm sẽ nhập vào Contact đã tồn tại.</>
      ) : null}
      {effectiveCustomerAction === 'create_new_customer' && batchExecutionPreview.bypassedExistingContactMatchCount > 0 ? (
        <> Bỏ qua <strong>{batchExecutionPreview.bypassedExistingContactMatchCount}</strong> Contact trùng hiện có theo lựa chọn tạo mới.</>
      ) : null}
    </>
  ) : effectiveCustomerAction === 'link_existing_customer' && existingContact ? (
    <>
      Hệ thống đã tìm thấy Contact trùng SĐT và sẽ giữ nguyên ID <strong>{existingContact.id}</strong>, đồng thời gộp Deal
      và Activity vào Contact cũ.
    </>
  ) : existingContact ? (
    <>
      Đã tìm thấy Contact trùng SĐT <strong>{existingContact.id}</strong>, nhưng hệ thống sẽ tạo Contact mới theo lựa chọn hiện tại.
    </>
  ) : (
    <>Hệ thống sẽ tạo Contact mới từ Lead này rồi tạo Deal mới trong Pipeline.</>
  );

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/35" onClick={onClose} />

      <div className="relative flex max-h-[88vh] w-full max-w-[940px] flex-col overflow-hidden rounded bg-white shadow-[0_18px_48px_rgba(15,23,42,0.25)]">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-[18px] font-semibold text-slate-800">Chuyển đổi thành cơ hội</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 text-[12px]">
          <div className="space-y-3.5">
            {shouldShowConversionActionSection ? (
            <>
            <section>
              <div className="grid grid-cols-[170px_minmax(0,1fr)] items-start gap-2">
                <div className="pt-1 font-semibold text-slate-700">Hành động chuyển đổi</div>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                    <label className="flex items-center gap-2 text-[12px] text-slate-800">
                      <input
                        type="radio"
                        name="conversion-action"
                        checked={conversionAction === 'create_opportunity'}
                        onChange={() => setConversionAction('create_opportunity')}
                        className="h-4 w-4 accent-sky-600"
                      />
                      <span>Chuyển thành cơ hội</span>
                    </label>

                    <label className={`flex items-center gap-2 text-[12px] ${canMergeExistingOpportunity ? 'text-slate-800' : 'text-slate-400'}`}>
                      <input
                        type="radio"
                        name="conversion-action"
                        checked={isMergeActionSelected}
                        onChange={() => setConversionAction('merge_existing_opportunity')}
                        disabled={!canMergeExistingOpportunity}
                        className="h-4 w-4 accent-sky-600"
                      />
                      <span>Gộp vào cơ hội hiện có</span>
                    </label>
                  </div>

                  {isMergeActionSelected && selectedExistingOpportunity ? (
                    <div className="grid grid-cols-[120px_minmax(0,1fr)] items-center gap-3">
                      <label className={labelClassName}>Cơ hội đích</label>
                      <select
                        value={selectedExistingOpportunity.id}
                        onChange={(event) => setTargetDealId(event.target.value)}
                        className={inputClassName}
                      >
                        {existingOpportunityOptions.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.title} | {item.stage} | {item.id}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}

                  {!canMergeExistingOpportunity ? (
                    <div className="text-[11px] text-slate-500">
                      Chỉ gộp được khi nhóm lead này đã có Contact cũ và đang có cơ hội mở để nhập vào.
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            <div className="border-t border-slate-200" />
            </>
            ) : null}

            <section>
              <h3 className="mb-3 text-[15px] font-semibold text-sky-700">Phân công cơ hội cho</h3>
              <div className="space-y-2.5">
                <div className="grid grid-cols-[140px_minmax(0,1fr)] items-center gap-3">
                  <label className={labelClassName}>Salesperson</label>
                  <select value={ownerId} onChange={(event) => handleOwnerChange(event.target.value)} className={inputClassName}>
                    {salesData.reps.map((rep) => (
                      <option key={rep.value} value={rep.value}>
                        {rep.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-[140px_minmax(0,1fr)] items-center gap-3">
                  <label className={labelClassName}>Sales Channel</label>
                  <select value={salesChannel} onChange={(event) => setSalesChannel(event.target.value)} className={inputClassName}>
                    {salesData.teams.map((teamName) => (
                      <option key={teamName} value={teamName}>
                        {teamName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {shouldShowCustomerSection ? (
            <>
            <div className="border-t border-slate-200" />

            <section>
              <h3 className="mb-3 text-[15px] font-semibold text-sky-700">Khách hàng</h3>
              {shouldShowCustomerOptions ? (
              <div className="space-y-1.5">
                <label className={`flex items-center gap-2 text-[12px] ${canLinkExistingCustomer ? 'text-slate-800' : 'text-slate-400'}`}>
                  <input
                    type="radio"
                    name="customer-action"
                    checked={effectiveCustomerAction === 'link_existing_customer'}
                    onChange={() => setCustomerAction('link_existing_customer')}
                    disabled={!canLinkExistingCustomer || isMergeActionSelected}
                    className="h-4 w-4 accent-sky-600"
                  />
                  <span>Liên kết với khách hàng hiện có</span>
                </label>

                <label className={`flex items-center gap-2 text-[12px] ${canCreateNewCustomer ? 'text-slate-800' : 'text-slate-400'}`}>
                  <input
                    type="radio"
                    name="customer-action"
                    checked={effectiveCustomerAction === 'create_new_customer'}
                    onChange={() => setCustomerAction('create_new_customer')}
                    disabled={!canCreateNewCustomer}
                    className="h-4 w-4 accent-sky-600"
                  />
                  <span>Tạo khách hàng mới</span>
                </label>

                <label className="flex items-center gap-2 text-[12px] text-slate-400">
                  <input type="radio" disabled className="h-4 w-4" />
                  <span>Không liên kết khách hàng</span>
                </label>
              </div>
              ) : null}

              {hasMultiplePhoneGroups ? (
                <div className="mt-2 text-[11px] text-slate-500">
                  Đang chọn nhiều nhóm SĐT. Lựa chọn khách hàng sẽ được áp dụng đồng loạt theo từng nhóm số điện thoại.
                </div>
              ) : null}

              {shouldShowSummary ? (
                <div className="mt-3 rounded border border-sky-100 bg-sky-50 px-3 py-2 text-[11px] leading-4 text-slate-600">
                  {summaryContent}
                </div>
              ) : null}

              {shouldShowPhoneHandlingTable ? (
                <div className="mt-3 rounded border border-slate-200 bg-white">
                  <div className="border-b border-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-700">
                    {phoneHandlingTableTitle}
                  </div>
                  <div className="max-h-24 overflow-y-auto">
                    {phoneHandlingGroups.map((group) => (
                      <div key={group.key} className="border-b border-slate-100 px-3 py-1.5 text-[11px] last:border-b-0">
                        <div className="font-medium text-slate-800">{group.normalizedPhone || group.label}</div>
                        <div className="text-slate-500">
                          {buildPhoneHandlingDescription(group)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
            </>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-slate-200 bg-slate-50 px-5 py-2.5">
          <button
            onClick={handleConfirm}
            disabled={isMergeActionSelected && !selectedExistingOpportunity}
            className="rounded border border-sky-700 bg-sky-700 px-4 py-1.5 text-[12px] font-medium text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300"
          >
            {submitLabel}
          </button>
          <button
            onClick={onClose}
            className="rounded border border-slate-300 bg-white px-4 py-1.5 text-[12px] font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConvertLeadModal;
