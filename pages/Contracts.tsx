
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FileSignature, Plus, Search, X, CheckCircle2, ArrowRight } from 'lucide-react';

// Mock Deals that are WON but don't have a contract yet
const PENDING_DEALS = [
  { id: 'D-102', customer: 'Nguyễn Thùy Linh', product: 'Combo Đức A1-B1', value: '45.000.000', date: '20/10/2023', owner: 'Sarah Miller' },
  { id: 'D-105', customer: 'Phạm Văn Hùng', product: 'Du học nghề Điều dưỡng', value: '180.000.000', date: '22/10/2023', owner: 'David Clark' },
  { id: 'D-108', customer: 'Trần Thị Mai', product: 'Tiếng Trung HSK 4', value: '12.000.000', date: '23/10/2023', owner: 'Sarah Miller' },
];

const Contracts: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Effect: Tự động mở Modal nếu đường dẫn là /contracts/new
  useEffect(() => {
    if (location.pathname.endsWith('/new')) {
      setShowCreateModal(true);
    }
  }, [location]);

  // Handle closing modal (and navigating back if needed)
  const handleCloseModal = () => {
    setShowCreateModal(false);
    if (location.pathname.endsWith('/new')) {
      navigate('/contracts'); // Reset URL về danh sách để tránh F5 lại mở modal
    }
  };

  return (
    <div className="relative flex h-full w-full flex-col bg-white group/design-root overflow-x-hidden font-sans text-[#111418]">
      <div className="layout-container flex h-full grow flex-col">
        <div className="px-4 md:px-8 flex flex-1 justify-center py-5">
          <div className="layout-content-container flex flex-col max-w-[1200px] flex-1">

            {/* Header Title & Action */}
            <div className="flex flex-wrap justify-end gap-3 p-4">
              <div className="flex gap-3">
                <button
                  onClick={() => navigate('/contracts/approvals')}
                  className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-orange-50 text-orange-700 text-sm font-bold leading-normal hover:bg-orange-100 transition-colors border border-orange-200"
                >
                  <FileSignature size={16} className="mr-2" />
                  <span className="truncate">Hàng chờ Duyệt</span>
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-[#1380ec] text-white text-sm font-bold leading-normal hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <Plus size={18} className="mr-2" />
                  <span className="truncate">Tạo Ghi danh</span>
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-3 p-3 flex-wrap pr-4">
              <div className="flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-[#f0f2f4] pl-4 pr-4 cursor-pointer hover:bg-slate-200">
                <p className="text-[#111418] text-sm font-medium leading-normal">Tất cả loại hình</p>
              </div>
              <div className="flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-[#f0f2f4] pl-4 pr-4 cursor-pointer hover:bg-slate-200">
                <p className="text-[#111418] text-sm font-medium leading-normal">Tất cả trạng thái</p>
              </div>
              <div className="flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-[#f0f2f4] pl-4 pr-4 cursor-pointer hover:bg-slate-200">
                <p className="text-[#111418] text-sm font-medium leading-normal">Ngày ký gần nhất</p>
              </div>
            </div>

            {/* Table Area (Stitch Design) */}
            <div className="px-4 py-3">
              <div className="flex overflow-hidden rounded-lg border border-[#dbe0e6] bg-white shadow-sm">
                <table className="flex-1">
                  <thead>
                    <tr className="bg-slate-50 border-b border-[#dbe0e6]">
                      <th className="px-4 py-3 text-left text-[#111418] w-[150px] text-sm font-bold leading-normal">Mã Ghi danh</th>
                      <th className="px-4 py-3 text-left text-[#111418] w-[250px] text-sm font-bold leading-normal">Học viên</th>
                      <th className="px-4 py-3 text-left text-[#111418] w-[200px] text-sm font-bold leading-normal">Loại HĐ</th>
                      <th className="px-4 py-3 text-left text-[#111418] w-[150px] text-sm font-bold leading-normal">Ngày tạo</th>
                      <th className="px-4 py-3 text-left text-[#111418] w-[150px] text-sm font-bold leading-normal">Trạng thái</th>
                      <th className="px-4 py-3 text-left text-[#111418] text-[#617589] text-sm font-bold leading-normal">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400 italic">
                        <div className="flex flex-col items-center gap-2">
                          <span className="p-3 bg-slate-50 rounded-full"><FileSignature size={24} className="text-slate-300" /></span>
                          <span>Hiện chưa có hồ sơ ghi danh nào.</span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: Select Deal to Create Contract */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleCloseModal}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Tạo Ghi danh Mới</h3>
                <p className="text-sm text-slate-500">Vui lòng chọn Deal đã chốt (Won) để khởi tạo hồ sơ ghi danh.</p>
              </div>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <div className="p-4 border-b border-slate-100 bg-white sticky top-0 z-10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Tìm kiếm theo tên khách hàng hoặc mã Deal..."
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="overflow-y-auto p-2 bg-slate-50 min-h-[300px] flex items-center justify-center text-slate-400 italic">
              Chưa có dữ liệu.
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Contracts;
