import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import { 
  ArrowLeft, 
  UploadCloud, 
  Check, 
  Download,
  AlertTriangle,
  FileSpreadsheet,
  ChevronRight,
  Tag,
  ChevronDown,
  Users,
  Play,
  Link as LinkIcon,
  Info
} from 'lucide-react';

// All columns mirroring the lead creation form fields exactly
const TEMPLATE_COLUMNS: { header: string; example: string; crm: string; required: boolean }[] = [
  // === Thông tin liên hệ ===
  { header: 'Danh xưng / quan hệ', example: 'Học sinh', crm: 'title', required: false },
  { header: 'Họ và tên', example: 'Nguyễn Văn An', crm: 'name', required: true },
  { header: 'Số điện thoại', example: '0912345678', crm: 'phone', required: true },
  { header: 'Nguồn data', example: 'Facebook', crm: 'source', required: false },
  { header: 'Email', example: 'nguyenvana@example.com', crm: 'email', required: false },
  
  // === Thông tin kinh doanh ===
  { header: 'Sản phẩm', example: 'Tiếng Đức', crm: 'product', required: false },
  { header: 'Cơ sở', example: 'HCM', crm: 'market', required: false },
  { header: 'Sale phụ trách', example: 'Trần Thị Hương', crm: 'salesperson', required: false },
  { header: 'Trạng thái', example: 'new', crm: 'status', required: false },
  { header: 'Chiến dịch', example: 'Summer 2026', crm: 'campaign', required: false },
  { header: 'Kênh', example: 'Facebook Ads', crm: 'channel', required: false },
  { header: 'Người giới thiệu', example: 'CTV Minh', crm: 'referredBy', required: false },

  // === Hồ sơ năng lực ===
  { header: 'Thị trường mục tiêu', example: 'Đức', crm: 'targetCountry', required: false },
  { header: 'Trình độ học vấn', example: 'THPT', crm: 'studentEducationLevel', required: true },
  { header: 'Ngày sinh', example: '2005-08-15', crm: 'studentDob', required: false },
  { header: 'GPA / Điểm ngoại ngữ', example: 'GPA 7.5 - IELTS 5.5', crm: 'studentLanguageLevel', required: false },

  // === Ghi chú nội bộ ===
  { header: 'Mức độ tiềm năng', example: 'Nóng', crm: 'potential', required: false },
  { header: 'Thời gian dự kiến tham gia', example: '06/2026', crm: 'expectedStart', required: false },
  { header: 'Tài chính', example: 'Đủ', crm: 'financial', required: false },
  { header: 'Ý kiến bố mẹ', example: 'Đồng ý', crm: 'parentOpinion', required: false },
  { header: 'Ghi chú khác', example: 'Đã liên hệ 2 lần', crm: 'notes', required: false },

  // === Thông tin pháp lý ===
  { header: 'Số CCCD / Hộ chiếu', example: '079205012345', crm: 'studentIdentityCard', required: true },
  { header: 'Ngày cấp', example: '2020-01-15', crm: 'identityDate', required: true },
  { header: 'Nơi cấp', example: 'Cục CS QLHC về TTXH - Bộ Công An', crm: 'identityPlace', required: true },
  { header: 'Địa chỉ thường trú (Full)', example: '123 Đường Lê Lợi, Phường Bến Nghé, Quận 1, TP.HCM', crm: 'street', required: true },

  // === Hệ thống ===
  { header: 'Tags (phân loại)', example: 'hot_lead,gọi lần 1', crm: 'tags', required: false },
];

const LeadImport: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  
  // State
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fileName, setFileName] = useState<string | null>(null);
  const [batchName, setBatchName] = useState('');
  
  // Permission Check
  if (!hasPermission([UserRole.ADMIN, UserRole.FOUNDER, UserRole.MARKETING])) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 bg-white dark:bg-slate-900 rounded-lg shadow p-8">
        <AlertTriangle className="text-red-500 mr-2" />
        Bạn không có quyền truy cập trang này.
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileName(e.target.files[0].name);
      // Auto fill batch name suggestion
      const dateStr = new Date().toISOString().slice(0,10).replace(/-/g, '');
      setBatchName(`IMPORT_${dateStr}_${e.target.files[0].name.split('.')[0].toUpperCase()}`);
      
      // Simulate processing time
      setTimeout(() => setStep(2), 800);
    }
  };

  const handleImport = () => {
    // Simulate import process
    setTimeout(() => {
        navigate('/leads');
    }, 1000);
  };

  /** Generate and download an XLSX template with all lead form fields */
  const handleDownloadTemplate = () => {
    try {
      const headers = TEMPLATE_COLUMNS.map((col) => col.header);
      const notes = TEMPLATE_COLUMNS.map((col) =>
        col.required ? '(Bắt buộc)' : '(Tùy chọn)'
      );
      const examples = TEMPLATE_COLUMNS.map((col) => col.example);

      const wsData = [headers, notes, examples];
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Auto-fit column widths
      ws['!cols'] = headers.map((_h: string, i: number) => {
        const maxLen = Math.max(
          headers[i].length,
          examples[i].length,
          notes[i].length
        );
        return { wch: Math.min(Math.max(maxLen + 4, 14), 50) };
      });

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Template_Leads');
      XLSX.writeFile(wb, 'Template_Leads.xlsx');
    } catch (err) {
      console.error('XLSX export failed, falling back to CSV:', err);
      // Fallback: tab-separated CSV (Excel always opens TSV correctly)
      const BOM = '\uFEFF';
      const rows = [
        TEMPLATE_COLUMNS.map((c) => c.header).join('\t'),
        TEMPLATE_COLUMNS.map((c) =>
          c.required ? '(Bắt buộc)' : '(Tùy chọn)'
        ).join('\t'),
        TEMPLATE_COLUMNS.map((c) => c.example).join('\t'),
      ];
      const blob = new Blob([BOM + rows.join('\r\n')], {
        type: 'text/tab-separated-values;charset=utf-8;',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Template_Leads.tsv';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // --- PROGRESS BAR COMPONENT ---
  const renderProgressBar = () => (
    <div className="mb-10">
      <div className="flex items-center justify-between max-w-3xl mx-auto relative">
          {/* Lines Background */}
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 dark:bg-slate-700 -translate-y-1/2 z-0"></div>
          
          {/* Active Line Progress */}
          <div 
            className="absolute top-1/2 left-0 h-0.5 bg-blue-600 -translate-y-1/2 z-0 transition-all duration-500"
            style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}
          ></div>
          
          {/* Step 1 */}
          <div className="relative z-10 flex flex-col items-center gap-2 cursor-pointer" onClick={() => step > 1 && setStep(1)}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg ring-4 ring-white dark:ring-slate-900 transition-colors ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                  {step > 1 ? <Check size={16} /> : <span className="text-sm font-bold">1</span>}
              </div>
              <span className={`text-xs font-semibold ${step >= 1 ? 'text-blue-600' : 'text-slate-500'}`}>1. Tải lên</span>
          </div>

          {/* Step 2 */}
          <div className="relative z-10 flex flex-col items-center gap-2 cursor-pointer" onClick={() => step > 2 && setStep(2)}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg ring-4 ring-white dark:ring-slate-900 transition-colors ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                  {step > 2 ? <span className="text-sm font-bold">2</span> : <span className="text-sm font-bold">2</span>}
              </div>
              <span className={`text-xs font-semibold ${step >= 2 ? 'text-blue-600' : 'text-slate-500 dark:text-slate-400'}`}>2. Ghép & Phân bổ</span>
          </div>

          {/* Step 3 */}
          <div className="relative z-10 flex flex-col items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg ring-4 ring-white dark:ring-slate-900 transition-colors ${step === 3 ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                  <span className="text-sm font-bold">3</span>
              </div>
              <span className={`text-xs font-semibold ${step === 3 ? 'text-blue-600' : 'text-slate-500 dark:text-slate-400'}`}>3. Hoàn tất</span>
          </div>
      </div>
    </div>
  );

  // --- STEP 1: UPLOAD ---
  const renderStep1 = () => (
    <div className="animate-in fade-in zoom-in duration-300">
       {renderProgressBar()}
       
       <div className="max-w-3xl mx-auto">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-12 text-center">
          <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <UploadCloud size={40} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Tải lên tệp CSV hoặc Excel</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm">
            Kéo thả tệp vào đây hoặc chọn từ máy tính để bắt đầu nhập liệu.<br/>
            Hệ thống hỗ trợ định dạng .csv, .xlsx (Tối đa 5MB)
          </p>
          
          <label className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none cursor-pointer transition-colors gap-2">
            <FileSpreadsheet size={18} />
            <span>Chọn tệp tin</span>
            <input type="file" className="hidden" accept=".csv, .xlsx" onChange={handleFileChange} />
          </label>

          <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={handleDownloadTemplate}
              className="text-sm text-blue-600 hover:underline flex items-center justify-center gap-1 mx-auto font-medium"
            >
              <Download size={14} /> Tải tệp mẫu chuẩn (Template_Leads.xlsx) — {TEMPLATE_COLUMNS.length} cột
            </button>
            <p className="text-xs text-slate-400 mt-2 text-center">Chứa đầy đủ các cột tương ứng với form tạo lead. Cột có (*) là bắt buộc khi Qualified.</p>
          </div>
        </div>
      </div>
    </div>
  );

  // --- STEP 2: MAPPING & DISTRIBUTION (Recovered User Layout) ---
  const renderStep2 = () => (
    <div className="animate-in slide-in-from-right-4 duration-300">
        {renderProgressBar()}

        <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* LEFT COLUMN: MAPPING TABLE (2/3 Width) */}
                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Ghép dữ liệu Lead</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Khớp các cột trong tệp tải lên với trường dữ liệu trên CRM.</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">Cột trong file CSV</th>
                                        <th className="px-4 py-3 font-medium">Dữ liệu mẫu</th>
                                        <th className="px-4 py-3 font-medium">Trường đích trên CRM</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm text-slate-700 dark:text-slate-300">
                                    {/* === Thông tin liên hệ === */}
                                    <tr className="bg-slate-50 dark:bg-slate-800/40">
                                        <td colSpan={3} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-400">📋 Thông tin liên hệ</td>
                                    </tr>
                                    {TEMPLATE_COLUMNS.slice(0, 5).map(({ header, example, crm, required }) => (
                                      <tr key={crm}>
                                        <td className="px-4 py-3 font-medium whitespace-nowrap">
                                          {header} {required && <span className="text-red-500">*</span>}
                                        </td>
                                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 italic">{example}</td>
                                        <td className="px-4 py-3"><span className="font-mono text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">{crm}</span></td>
                                      </tr>
                                    ))}

                                    {/* === Thông tin kinh doanh === */}
                                    <tr className="bg-slate-50 dark:bg-slate-800/40">
                                        <td colSpan={3} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-400">💼 Thông tin kinh doanh</td>
                                    </tr>
                                    {TEMPLATE_COLUMNS.slice(5, 12).map(({ header, example, crm, required }) => (
                                      <tr key={crm}>
                                        <td className="px-4 py-3 font-medium whitespace-nowrap">
                                          {header} {required && <span className="text-red-500">*</span>}
                                        </td>
                                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 italic">{example}</td>
                                        <td className="px-4 py-3"><span className="font-mono text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">{crm}</span></td>
                                      </tr>
                                    ))}

                                    {/* === Hồ sơ năng lực === */}
                                    <tr className="bg-slate-50 dark:bg-slate-800/40">
                                        <td colSpan={3} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-400">🎓 Hồ sơ năng lực</td>
                                    </tr>
                                    {TEMPLATE_COLUMNS.slice(12, 16).map(({ header, example, crm, required }) => (
                                      <tr key={crm}>
                                        <td className="px-4 py-3 font-medium whitespace-nowrap">
                                          {header} {required && <span className="text-red-500">*</span>}
                                        </td>
                                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 italic">{example}</td>
                                        <td className="px-4 py-3"><span className="font-mono text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">{crm}</span></td>
                                      </tr>
                                    ))}

                                    {/* === Ghi chú nội bộ === */}
                                    <tr className="bg-slate-50 dark:bg-slate-800/40">
                                        <td colSpan={3} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-400">📝 Ghi chú nội bộ</td>
                                    </tr>
                                    {TEMPLATE_COLUMNS.slice(16, 21).map(({ header, example, crm, required }) => (
                                      <tr key={crm}>
                                        <td className="px-4 py-3 font-medium whitespace-nowrap">
                                          {header} {required && <span className="text-red-500">*</span>}
                                        </td>
                                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 italic">{example}</td>
                                        <td className="px-4 py-3"><span className="font-mono text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">{crm}</span></td>
                                      </tr>
                                    ))}

                                    {/* === Thông tin pháp lý === */}
                                    <tr className="bg-slate-50 dark:bg-slate-800/40">
                                        <td colSpan={3} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-red-400">🛡️ Thông tin pháp lý (bắt buộc khi Qualified)</td>
                                    </tr>
                                    {TEMPLATE_COLUMNS.slice(21, 25).map(({ header, example, crm, required }) => (
                                      <tr key={crm}>
                                        <td className="px-4 py-3 font-medium whitespace-nowrap text-red-700 dark:text-red-400">
                                          {header} {required && <span className="text-red-500">*</span>}
                                        </td>
                                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 italic">{example}</td>
                                        <td className="px-4 py-3"><span className="font-mono text-xs bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-2 py-0.5 rounded">{crm}</span></td>
                                      </tr>
                                    ))}

                                    {/* === Tags === */}
                                    <tr className="bg-slate-50 dark:bg-slate-800/40">
                                        <td colSpan={3} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-400">🏷️ Tags</td>
                                    </tr>
                                    {TEMPLATE_COLUMNS.slice(25).map(({ header, example, crm, required }) => (
                                      <tr key={crm}>
                                        <td className="px-4 py-3 font-medium whitespace-nowrap">
                                          {header} {required && <span className="text-red-500">*</span>}
                                        </td>
                                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 italic">{example}</td>
                                        <td className="px-4 py-3"><span className="font-mono text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">{crm}</span></td>
                                      </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: DISTRIBUTION SETTINGS (1/3 Width) */}
                <div className="lg:col-span-1">
                    <div className="space-y-6">
                        {/* Distribution Card */}
                        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                            <h3 className="font-semibold mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
                                <Users className="text-blue-600" size={20} />
                                Cấu hình phân bổ
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium block mb-2 text-slate-700 dark:text-slate-300">Chiến lược phân công</label>
                                    <div className="grid grid-cols-1 gap-2">
                                        <label className="relative flex items-center p-3 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                            <input defaultChecked className="h-4 w-4 text-blue-600 focus:ring-blue-600 border-slate-300" name="dist" type="radio" value="round-robin"/>
                                            <div className="ml-3">
                                                <span className="block text-sm font-medium text-slate-900 dark:text-white">Xoay vòng (Round-robin)</span>
                                                <span className="block text-xs text-slate-500">Chia đều tự động cho nhân viên đang hoạt động</span>
                                            </div>
                                        </label>
                                        <label className="relative flex items-center p-3 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                            <input className="h-4 w-4 text-blue-600 focus:ring-blue-600 border-slate-300" name="dist" type="radio" value="manual"/>
                                            <div className="ml-3">
                                                <span className="block text-sm font-medium text-slate-900 dark:text-white">Phân bổ thủ công</span>
                                                <span className="block text-xs text-slate-500">Gán tất cả cho một người quản lý xử lý sau</span>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                                <div id="staff-selector">
                                    <label className="text-sm font-medium block mb-2 text-slate-700 dark:text-slate-300">Chọn nhân viên nhận Lead</label>
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                        <div className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800">
                                            <div className="flex items-center gap-2">
                                                <input defaultChecked className="rounded border-slate-300 text-blue-600 focus:ring-blue-600" type="checkbox"/>
                                                <span className="text-sm text-slate-700 dark:text-slate-300">Nguyễn Văn Nam (Team Đức)</span>
                                            </div>
                                            <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">Active</span>
                                        </div>
                                        <div className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800">
                                            <div className="flex items-center gap-2">
                                                <input defaultChecked className="rounded border-slate-300 text-blue-600 focus:ring-blue-600" type="checkbox"/>
                                                <span className="text-sm text-slate-700 dark:text-slate-300">Trần Thị Hương (Team Trung)</span>
                                            </div>
                                            <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">Active</span>
                                        </div>
                                        <div className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800">
                                            <div className="flex items-center gap-2">
                                                <input className="rounded border-slate-300 text-blue-600 focus:ring-blue-600" type="checkbox"/>
                                                <span className="text-sm text-slate-700 dark:text-slate-300">Lê Hoàng (Leader)</span>
                                            </div>
                                            <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">Away</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Import Summary Card */}
                        <div className="bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30 p-6">
                            <h3 className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-4">Tổng quan Import</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600 dark:text-slate-400">Số Data tìm thấy</span>
                                    <span className="font-bold text-slate-900 dark:text-white">128</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600 dark:text-slate-400">Trường đã khớp</span>
                                    <span className="font-bold text-slate-900 dark:text-white">5 / 5</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600 dark:text-slate-400">Trùng lặp</span>
                                    <span className="text-amber-600 font-bold">3 (Bỏ qua)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="mt-8 flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-8">
                <button 
                    onClick={() => setStep(1)}
                    className="px-6 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 text-slate-700 dark:text-slate-300"
                >
                    <ArrowLeft size={16} />
                    Quay lại
                </button>
                <div className="flex items-center gap-3">
                    <button className="px-6 py-2 rounded-lg text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        Lưu nháp
                    </button>
                    <button 
                        onClick={() => setStep(3)}
                        className="bg-blue-600 text-white px-8 py-2.5 rounded-lg font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center gap-2"
                    >
                        Tiếp tục & Review
                        <Play size={16} />
                    </button>
                </div>
            </div>
        </div>
    </div>
  );

  // --- STEP 3: FINALIZE & TAGGING ---
  const renderStep3 = () => (
    <div className="animate-in slide-in-from-right-4 duration-300">
        {renderProgressBar()}

        <div className="flex justify-center">
            <div className="flex flex-col w-full max-w-[960px]">
                {/* Breadcrumbs */}
                <div className="flex flex-wrap gap-2 px-4 mb-2">
                    <span className="text-[#617589] text-base font-medium leading-normal">Leads</span>
                    <span className="text-[#617589] text-base font-medium leading-normal">/</span>
                    <span className="text-[#617589] text-base font-medium leading-normal">Import</span>
                    <span className="text-[#617589] text-base font-medium leading-normal">/</span>
                    <span className="text-[#111418] text-base font-medium leading-normal">Hoàn thiện & Gắn thẻ</span>
                </div>

                <div className="flex flex-wrap justify-between gap-3 px-4 mb-6">
                    <p className="text-[#111418] tracking-light text-[32px] font-bold leading-tight min-w-72">Xác nhận nhập liệu</p>
                </div>

                {/* Batch Name Input */}
                <div className="flex flex-col gap-4 px-4 py-3 max-w-[600px]">
                    <label className="flex flex-col min-w-40 flex-1">
                        <p className="text-[#111418] text-base font-medium leading-normal pb-2">Tên đợt nhập liệu (Import Batch Name)</p>
                        <input
                            placeholder="Ví dụ: THPT_Market_Data_Q4"
                            className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#111418] focus:outline-0 focus:ring-2 focus:ring-blue-100 border border-[#dbe0e6] bg-white focus:border-blue-500 h-14 placeholder:text-[#617589] p-[15px] text-base font-normal leading-normal transition-all"
                            value={batchName}
                            onChange={(e) => setBatchName(e.target.value)}
                        />
                        <p className="text-xs text-slate-500 mt-2">
                            * Đây sẽ là tên hiển thị chính trong phần Báo cáo Hiệu quả Nguồn.
                        </p>
                    </label>
                </div>

                {/* Logic Explanation Box */}
                <div className="px-4 py-2 mt-2">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
                       <h4 className="font-bold text-amber-800 flex items-center gap-2 mb-2">
                          <LinkIcon size={18} /> Nguyên tắc định danh & Liên kết dữ liệu
                       </h4>
                       <p className="text-sm text-amber-900 leading-relaxed">
                          Toàn bộ <strong>128</strong> dòng dữ liệu (học viên) trong file này sẽ được hệ thống tự động gắn mã đợt nhập: <strong className="font-mono bg-amber-100 px-1 rounded">{batchName || '...'}</strong>.
                       </p>
                       <ul className="list-disc list-inside text-sm text-amber-800 mt-2 ml-1 space-y-1">
                          <li>Mã này là <strong>duy nhất</strong> và không thể thay đổi sau khi nhập.</li>
                          <li>Hệ thống sử dụng mã này để gom nhóm và tính tỷ lệ chuyển đổi (Conversion Rate) cho riêng đợt data này.</li>
                       </ul>
                    </div>
                </div>

                {/* Tags Select */}
                <div className="flex flex-col gap-4 px-4 py-3 max-w-[600px] mt-2">
                    <label className="flex flex-col min-w-40 flex-1">
                        <p className="text-[#111418] text-base font-medium leading-normal pb-2">Thẻ phân loại bổ sung (Optional)</p>
                        <div className="relative">
                            <select
                                className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#111418] focus:outline-0 focus:ring-2 focus:ring-blue-100 border border-[#dbe0e6] bg-white focus:border-blue-500 h-14 placeholder:text-[#617589] px-[15px] appearance-none text-base font-normal leading-normal transition-all"
                            >
                                <option value="">Chọn thẻ...</option>
                                <option value="hot_lead">Hot Lead</option>
                                <option value="summer_camp">Summer Camp 2024</option>
                                <option value="workshop">Workshop Tháng 10</option>
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                <Tag size={20} className="text-gray-400" />
                            </div>
                        </div>
                    </label>
                </div>

                {/* Confirmation Box */}
                <div className="px-4 py-6 mt-2">
                   <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3 items-start">
                      <div className="text-blue-600 mt-1"><Check size={20} /></div>
                      <div>
                         <h4 className="font-bold text-blue-900">Sẵn sàng nhập 128 Leads</h4>
                         <p className="text-sm text-blue-800 mt-1">Dữ liệu sẽ được phân bổ theo chiến lược <span className="font-bold">Round-robin</span> cho 2 nhân viên đã chọn ở bước trước.</p>
                      </div>
                   </div>
                </div>

                {/* Actions */}
                <div className="flex justify-stretch mt-8 border-t border-slate-100 pt-6">
                    <div className="flex flex-1 gap-3 flex-wrap px-4 py-3 justify-end">
                        <button
                            onClick={() => setStep(2)}
                            className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-[#f0f2f4] text-[#111418] text-sm font-bold leading-normal tracking-[0.015em] hover:bg-slate-200 transition-colors"
                        >
                            <span className="truncate">Quay lại</span>
                        </button>
                        <button
                            onClick={handleImport}
                            className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-[#1380ec] text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-blue-700 transition-colors shadow-md"
                        >
                            <span className="truncate">Xác nhận Nhập (Import)</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );

  return (
    <div className="min-h-full bg-white dark:bg-[#0f172a] p-4 sm:p-8 font-sans text-slate-900 dark:text-white transition-colors duration-200">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
    </div>
  );
};

export default LeadImport;