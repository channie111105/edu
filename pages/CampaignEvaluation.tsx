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
} from 'lucide-react';

const DATA_EVALUATIONS = [
  {
    id: 'd1',
    name: 'Data_THPT_NguyenDu_K12',
    source: 'Hợp tác Trường THPT',
    code: '#D-2410-01',
    date: '24/10/2023',
    importer: 'Admin',
    total: 500,
    match: '96.0%',
    valid: 480,
    interested: '30.0%',
    interestedCount: 150,
    enrolled: '30.0%',
    enrolledCount: 45,
    eval: 'good',
    evalText: 'ƯU TIÊN NHẬP',
    note: 'Tỷ lệ nhập học cao',
  },
  {
    id: 'd2',
    name: 'Mua_Data_Ngoai_T10',
    source: 'Mua ngoài (Agency A)',
    code: '#D-2010-02',
    date: '20/10/2023',
    importer: 'Marketing Lead',
    total: 1000,
    match: '35.0%',
    valid: 350,
    interested: '2.0%',
    interestedCount: 20,
    enrolled: '10.0%',
    enrolledCount: 2,
    eval: 'bad',
    evalText: 'DỪNG HỢP TÁC',
    note: 'SĐT ảo quá nhiều',
  },
  {
    id: 'd3',
    name: 'Hoi_Thao_Du_Hoc_Duc_HaNoi',
    source: 'Sự kiện Offline',
    code: '#D-1510-01',
    date: '15/10/2023',
    importer: 'Sales Leader',
    total: 200,
    match: '99.0%',
    valid: 198,
    interested: '60.0%',
    interestedCount: 120,
    enrolled: '50.0%',
    enrolledCount: 60,
    eval: 'good',
    evalText: 'ƯU TIÊN NHẬP',
    note: 'Tỷ lệ nhập học cao',
  },
  {
    id: 'd4',
    name: 'Import_Excel_Cu_2022',
    source: 'Hệ thống cũ',
    code: '#D-0110-03',
    date: '01/10/2023',
    importer: 'Admin',
    total: 1500,
    match: '93.3%',
    valid: 1400,
    interested: '3.3%',
    interestedCount: 50,
    enrolled: '10.0%',
    enrolledCount: 5,
    eval: 'warning',
    evalText: 'CÂN NHẮC LẠI',
    note: 'Ít nhu cầu học',
  },
] as const;

const CampaignEvaluation: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

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
          <h1 className="text-2xl font-bold text-slate-900">Đánh giá chiến dịch: {id || 'camp_01'}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Theo dõi chất lượng từng đợt tuyển sinh để tối ưu chi phí Marketing.
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
            <p className="text-2xl font-bold text-slate-900">3.200</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-600">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-slate-500">SĐT liên lạc được</p>
            <p className="text-2xl font-bold text-slate-900">81%</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <GraduationCap size={24} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-slate-500">Tỷ lệ quan tâm học</p>
            <p className="text-2xl font-bold text-slate-900">24%</p>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase text-slate-500">
            <tr>
              <th className="p-4 pl-6">Tên đợt / Nguồn data</th>
              <th className="p-4">Ngày nhập</th>
              <th className="p-4">Tổng SĐT</th>
              <th className="p-4">Chất lượng SĐT</th>
              <th className="p-4">Kết quả tuyển sinh</th>
              <th className="p-4">Đánh giá nguồn</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {DATA_EVALUATIONS.map((item) => (
              <tr key={item.id} className="transition-colors hover:bg-slate-50">
                <td className="p-4 pl-6">
                  <p className="font-bold text-slate-900">{item.name}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {item.source}
                    </span>
                    <span className="text-xs text-slate-400">{item.code}</span>
                  </div>
                </td>
                <td className="p-4 text-slate-600">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} />
                    {item.date}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">Bởi: {item.importer}</p>
                </td>
                <td className="p-4 font-bold text-slate-900">
                  {item.total}
                  <span className="block text-xs font-normal text-slate-500">records</span>
                </td>
                <td className="p-4">
                  <p
                    className={`font-bold ${
                      parseFloat(item.match) > 90
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
                      className={`h-full ${parseFloat(item.match) > 90 ? 'bg-green-500' : 'bg-amber-500'}`}
                    ></div>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{item.valid} SĐT đúng</p>
                </td>
                <td className="space-y-1 p-4">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Quan tâm ({item.interestedCount})</span>
                    <span className="font-bold">{item.interested}</span>
                  </div>
                  <div className="flex justify-between text-xs text-green-700">
                    <span>Nhập học ({item.enrolledCount})</span>
                    <span className="font-bold">{item.enrolled}</span>
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
