import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  Database,
  GraduationCap,
  ThumbsDown,
  ThumbsUp,
  Megaphone
} from 'lucide-react';
import { getLeads } from '../utils/storage';
import { LeadStatus } from '../types';
import { getCampaignCatalog } from '../utils/campaignCatalog';

const CampaignEvaluation: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isAll = id === 'all';
  const navigate = useNavigate();

  const catalog = getCampaignCatalog();
  const campaign = catalog.find(c => c.id === id);
  const campaignName = campaign?.name || (isAll ? 'Tất cả chiến dịch' : id);

  const allLeads = getLeads();
  // Filter leads
  const campaignLeads = allLeads.filter(l => {
    const leadCamp = (l as any).campaign || l.marketingData?.campaign;
    if (isAll) return !!leadCamp;
    return leadCamp === campaignName || leadCamp === id;
  });

  // Group by: If "All", group by Campaign Name. If specific campaign, group by Batch.
  const batchMap = new Map<string, any>();
  campaignLeads.forEach(lead => {
    const key = isAll 
      ? ((lead as any).campaign || lead.marketingData?.campaign || 'Không xác định')
      : (lead.marketingData?.batch || 'Nguồn vãng lai');
      
    if (!batchMap.has(key)) {
      batchMap.set(key, {
        name: key,
        source: isAll ? 'Chiến dịch' : (lead.source || 'Marketing'),
        date: lead.createdAt.split('T')[0],
        total: 0,
        valid: 0,
        interested: 0,
        enrolled: 0
      });
    }
    const stats = batchMap.get(key);
    stats.total++;
    const status = String(lead.status);
    const isAssigned = lead.ownerId && lead.ownerId !== 'system';
    
    // Definition of "Khả dụng" (Usable) per user request: 
    // Must be assigned to sales and successfully contacted/converted.
    const isUsable = isAssigned && [
      LeadStatus.CONTACTED, 
      LeadStatus.QUALIFIED, 
      LeadStatus.CONVERTED, 
      LeadStatus.LOST,
      'Đã liên hệ',
      'Đạt chuẩn',
      'Chốt',
      'Hủy'
    ].includes(status as any);

    if (isUsable) stats.valid++;
    
    if ([LeadStatus.CONTACTED, LeadStatus.QUALIFIED, LeadStatus.CONVERTED, LeadStatus.PICKED, 'Đã liên hệ', 'Đạt chuẩn', 'Chốt'].includes(status as any)) {
      stats.interested++;
    }
    if (status === LeadStatus.CONVERTED || status === 'Chốt') {
      stats.enrolled++;
    }
  });

  const evaluations = Array.from(batchMap.values()).map((item, idx) => {
    const validRate = item.total > 0 ? (item.valid / item.total * 100) : 0;
    const interestedRate = item.total > 0 ? (item.interested / item.total * 100) : 0;
    const enrolledRate = item.total > 0 ? (item.enrolled / item.total * 100) : 0;

    let evalStatus: 'good' | 'warning' | 'bad' = 'warning';
    let evalText = 'CÂN NHẮC LẠI';
    let note = 'Cần theo dõi thêm';

    if (enrolledRate >= 5 || (interestedRate >= 20 && validRate >= 80)) {
      evalStatus = 'good';
      evalText = 'ƯU TIÊN NHẬP';
      note = 'Tỷ lệ chuyển đổi tốt';
    } else if (validRate < 50 || interestedRate < 5) {
      evalStatus = 'bad';
      evalText = 'DỪNG HỢP TÁC';
      note = 'Chất lượng data thấp';
    }

    return {
      id: `eval_${idx}`,
      ...item,
      match: validRate.toFixed(1) + '%',
      interestedRate: interestedRate.toFixed(1) + '%',
      enrolledRate: enrolledRate.toFixed(1) + '%',
      eval: evalStatus,
      evalText,
      note
    };
  });

  const totalData = campaignLeads.length;
  const totalValid = campaignLeads.filter(l => l.phone && l.phone.length >= 10).length;
  const totalInterested = campaignLeads.filter(l => [LeadStatus.CONTACTED, LeadStatus.QUALIFIED, LeadStatus.CONVERTED, LeadStatus.PICKED].includes(String(l.status) as any)).length;

  const validRateTotal = totalData > 0 ? Math.round((totalValid / totalData) * 100) : 0;
  const interestedRateTotal = totalData > 0 ? Math.round((totalInterested / totalData) * 100) : 0;

  if (totalData === 0) {
    return (
      <div className="mx-auto min-h-screen max-w-[1600px] bg-slate-50 p-6 font-inter text-slate-900">
        <button onClick={() => navigate('/campaigns')} className="flex items-center gap-2 font-semibold text-slate-500 hover:text-slate-800 mb-6">
          <ArrowLeft size={20} /> Quay lại
        </button>
        <div className="flex flex-col items-center justify-center py-32 bg-white rounded-2xl border border-dashed border-slate-300">
           <Megaphone size={64} className="text-slate-200 mb-4" />
           <h2 className="text-xl font-bold text-slate-400">Chưa có dữ liệu đánh giá</h2>
           <p className="text-slate-400 mt-2 text-center max-w-md">
             {isAll 
               ? 'Hệ thống hiện chưa có Lead nào được gán vào bất kỳ chiến dịch nào để phân tích.'
               : 'Chiến dịch này hiện chưa có Lead nào được gán vào để phân tích và đánh giá chất lượng.'
             }
           </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-[1600px] animate-in bg-slate-50 p-6 font-inter text-slate-900 fade-in slide-in-from-right-4 duration-300">
      <div className="mb-6">
        <div>
          <button
            onClick={() => navigate('/campaigns')}
            className="group mb-1 flex items-center gap-2 font-semibold text-slate-500 transition-colors hover:text-slate-800"
          >
            <ArrowLeft size={20} className="transition-transform group-hover:-translate-x-1" />
            Quay lại
          </button>
          <h1 className="text-2xl font-bold text-slate-900">
            {isAll ? 'Đánh giá tổng thể chiến dịch' : `Đánh giá chiến dịch: ${campaignName}`}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Dữ liệu đánh giá dựa trên {totalData} Lead {isAll ? 'từ tất cả chiến dịch' : 'thực tế'} trong hệ thống.
          </p>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <Database size={24} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-slate-500">Tổng data đã nhập</p>
            <p className="text-2xl font-bold text-slate-900">{totalData.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-600">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-slate-500">SĐT Khả dụng (Thực tế)</p>
            <p className="text-2xl font-bold text-slate-900">{validRateTotal}%</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <GraduationCap size={24} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-slate-500">Tỷ lệ quan tâm học</p>
            <p className="text-2xl font-bold text-slate-900">{interestedRateTotal}%</p>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase text-slate-500">
            <tr>
              <th className="p-4 pl-6">{isAll ? 'Tên chiến dịch' : 'Tên đợt / Nguồn data'}</th>
              <th className="p-4">{isAll ? 'Ngày bắt đầu' : 'Ngày nhập'}</th>
              <th className="p-4">Tổng SĐT</th>
              <th className="p-4">Chất lượng SĐT</th>
              <th className="p-4">Kết quả tuyển sinh</th>
              <th className="p-4">Đánh giá {isAll ? 'hiệu quả' : 'nguồn'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {evaluations.map((item) => (
              <tr key={item.id} className="transition-colors hover:bg-slate-50">
                <td className="p-4 pl-6">
                  <p className="font-bold text-slate-900">{item.name}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {item.source}
                    </span>
                  </div>
                </td>
                <td className="p-4 text-slate-600">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} />
                    {item.date}
                  </div>
                </td>
                <td className="p-4 font-bold text-slate-900">
                  {item.total}
                  <span className="block text-xs font-normal text-slate-500">records</span>
                </td>
                <td className="p-4">
                  <p
                    className={`font-bold ${
                      parseFloat(item.match) > 80
                        ? 'text-green-600'
                        : parseFloat(item.match) < 50
                          ? 'text-red-500'
                          : 'text-slate-700'
                    }`}
                  >
                    {item.match} <span className="font-normal text-slate-500">Khả dụng</span>
                  </p>
                  <div className="mt-1 h-1 w-24 overflow-hidden rounded-full bg-slate-100">
                    <div
                      style={{ width: item.match }}
                      className={`h-full ${parseFloat(item.match) > 80 ? 'bg-green-500' : 'bg-amber-500'}`}
                    ></div>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{item.valid} SĐT có tương tác</p>
                </td>
                <td className="space-y-1 p-4">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Quan tâm ({item.interested})</span>
                    <span className="font-bold">{item.interestedRate}</span>
                  </div>
                  <div className="flex justify-between text-xs text-green-700">
                    <span>Nhập học ({item.enrolled})</span>
                    <span className="font-bold">{item.enrolledRate}</span>
                  </div>
                </td>
                <td className="p-4">
                  {item.eval === 'good' ? (
                    <span className="inline-flex items-center gap-1 rounded border border-green-200 bg-green-50 px-2 py-1 text-xs font-bold text-green-700">
                      <ThumbsUp size={12} />
                      {item.evalText}
                    </span>
                  ) : null}
                  {item.eval === 'bad' ? (
                    <span className="inline-flex items-center gap-1 rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-bold text-red-700">
                      <ThumbsDown size={12} />
                      {item.evalText}
                    </span>
                  ) : null}
                  {item.eval === 'warning' ? (
                    <span className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">
                      <AlertTriangle size={12} />
                      {item.evalText}
                    </span>
                  ) : null}
                  <p className="mt-1 text-xs italic text-slate-400">{item.note}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default CampaignEvaluation;
