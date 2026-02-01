
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Upload,
  Folder,
  MoreVertical,
  FileText,
  Video,
  Link as LinkIcon,
  Presentation,
  Music,
  FileSpreadsheet,
  PlusCircle,
  FileUp,
  Edit,
  ChevronRight
} from 'lucide-react';

const TrainingResources: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#0d141b] font-sans overflow-y-auto">
      
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-5 bg-white border-b border-[#e7edf3]">
        <button
          onClick={() => navigate('/training/classes')}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ArrowLeft size={24} className="text-slate-600" />
        </button>
        <div>
           <h1 className="text-2xl font-bold text-[#0d141b]">Tài liệu & Học liệu Khóa học</h1>
           <div className="flex items-center gap-2 text-sm text-[#4c739a] mt-1">
               <span>Lớp Tiếng Đức A1</span>
               <ChevronRight size={14} />
               <span className="font-mono">{id || 'DE-A1-K24'}</span>
            </div>
        </div>
      </div>

      <div className="flex flex-col flex-1 p-6 lg:p-10 max-w-[1600px] mx-auto w-full gap-6">
        {/* Actions Bar */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
             {/* Optional extra breadcrumb or description if needed */}
          </div>
          <div className="flex gap-3">
            <button className="flex items-center justify-center gap-2 rounded-xl h-10 px-4 bg-[#e7edf3] text-[#0d141b] text-sm font-bold hover:bg-slate-200 transition-colors">
              <Download size={18} />
              <span>Tải tất cả</span>
            </button>
            <button className="flex items-center justify-center gap-2 rounded-xl h-10 px-4 bg-[#1380ec] text-white text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm">
              <Upload size={18} />
              <span>Tải lên mới</span>
            </button>
          </div>
        </div>

        {/* Resources Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            
            {/* Folder Card */}
            <div className="flex flex-col gap-3 rounded-xl border border-[#e7edf3] bg-white p-4 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#e7edf3] text-[#4c739a]">
                        <Folder size={24} />
                    </div>
                    <button className="text-[#4c739a] hover:text-[#0d141b]"><MoreVertical size={20} /></button>
                </div>
                <div>
                    <h3 className="text-[#0d141b] text-base font-bold leading-tight">Bài tập & Tài liệu phát tay</h3>
                    <p className="text-[#4c739a] text-sm font-normal">12 tệp · 45 MB</p>
                </div>
            </div>

            {/* PDF Card */}
            <div className="flex flex-col gap-3 rounded-xl border border-[#e7edf3] bg-white p-4 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-50 text-red-600">
                        <FileText size={24} />
                    </div>
                    <button className="text-[#4c739a] hover:text-[#0d141b]"><MoreVertical size={20} /></button>
                </div>
                <div>
                    <h3 className="text-[#0d141b] text-base font-bold leading-tight">Bài 1: Giới thiệu.pdf</h3>
                    <p className="text-[#4c739a] text-sm font-normal">PDF · 2.4 MB · 24/08</p>
                </div>
            </div>

            {/* Video Card */}
            <div className="flex flex-col gap-3 rounded-xl border border-[#e7edf3] bg-white p-4 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <Video size={24} />
                    </div>
                    <button className="text-[#4c739a] hover:text-[#0d141b]"><MoreVertical size={20} /></button>
                </div>
                <div>
                    <h3 className="text-[#0d141b] text-base font-bold leading-tight">Video Bài tập Ngữ pháp</h3>
                    <p className="text-[#4c739a] text-sm font-normal">MP4 · 128 MB · 22/08</p>
                </div>
            </div>

            {/* Link Card */}
            <div className="flex flex-col gap-3 rounded-xl border border-[#e7edf3] bg-white p-4 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-50 text-green-600">
                        <LinkIcon size={24} />
                    </div>
                    <button className="text-[#4c739a] hover:text-[#0d141b]"><MoreVertical size={20} /></button>
                </div>
                <div>
                    <h3 className="text-[#0d141b] text-base font-bold leading-tight">Link Bài tập về nhà</h3>
                    <p className="text-[#4c739a] text-sm font-normal">Liên kết ngoài · forms.gle</p>
                </div>
            </div>

            {/* PPT Card */}
            <div className="flex flex-col gap-3 rounded-xl border border-[#e7edf3] bg-white p-4 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                        <Presentation size={24} />
                    </div>
                    <button className="text-[#4c739a] hover:text-[#0d141b]"><MoreVertical size={20} /></button>
                </div>
                <div>
                    <h3 className="text-[#0d141b] text-base font-bold leading-tight">Slide Tuần 1.pptx</h3>
                    <p className="text-[#4c739a] text-sm font-normal">PPTX · 12.1 MB · 20/08</p>
                </div>
            </div>

            {/* Audio Card */}
            <div className="flex flex-col gap-3 rounded-xl border border-[#e7edf3] bg-white p-4 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                        <Music size={24} />
                    </div>
                    <button className="text-[#4c739a] hover:text-[#0d141b]"><MoreVertical size={20} /></button>
                </div>
                <div>
                    <h3 className="text-[#0d141b] text-base font-bold leading-tight">Luyện nghe.mp3</h3>
                    <p className="text-[#4c739a] text-sm font-normal">MP3 · 5.8 MB · 18/08</p>
                </div>
            </div>

            {/* Excel Card */}
            <div className="flex flex-col gap-3 rounded-xl border border-[#e7edf3] bg-white p-4 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                        <FileSpreadsheet size={24} />
                    </div>
                    <button className="text-[#4c739a] hover:text-[#0d141b]"><MoreVertical size={20} /></button>
                </div>
                <div>
                    <h3 className="text-[#0d141b] text-base font-bold leading-tight">Danh sách Từ vựng.xlsx</h3>
                    <p className="text-[#4c739a] text-sm font-normal">XLSX · 1.2 MB · 15/08</p>
                </div>
            </div>

            {/* Add New File Card */}
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#cfdbe7] bg-slate-50 p-4 hover:bg-[#e7edf3] transition-colors cursor-pointer group min-h-[140px]">
                <PlusCircle size={32} className="text-[#4c739a] group-hover:scale-110 transition-transform" />
                <p className="text-[#4c739a] text-sm font-medium">Thêm tệp mới</p>
            </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-4 flex flex-col gap-4">
            <h2 className="text-[#0d141b] text-xl font-bold leading-tight tracking-[-0.015em]">Hoạt động gần đây</h2>
            <div className="flex flex-col divide-y divide-[#e7edf3] rounded-xl border border-[#e7edf3] bg-white overflow-hidden shadow-sm">
                <div className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                            <FileUp size={20} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-[#0d141b]">Cô Lan đã tải lên "Giáo trình A1 - Chương 2.pdf"</p>
                            <p className="text-xs text-[#4c739a]">2 giờ trước</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 text-orange-600">
                            <Edit size={20} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-[#0d141b]">Đã cập nhật quyền truy cập thư mục "Bài tập & Tài liệu"</p>
                            <p className="text-xs text-[#4c739a]">Hôm qua</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default TrainingResources;
