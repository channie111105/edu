
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
            <div className="flex flex-wrap justify-between gap-3 p-4">
              <div className="flex min-w-72 flex-col gap-3">
                <p className="text-[#111418] tracking-light text-[32px] font-bold leading-tight">Quản lý Hợp đồng</p>
                <p className="text-[#617589] text-sm font-normal leading-normal">
                  Quản lý hồ sơ, trạng thái ký kết và lưu trữ văn bản pháp lý.
                </p>
              </div>
              <div className="flex gap-3">
                 <button
                    onClick={() => navigate('/contracts/approvals')}
                    className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-orange-50 text-orange-700 text-sm font-bold leading-normal hover:bg-orange-100 transition-colors border border-orange-200"
                  >
                    <FileSignature size={16} className="mr-2" />
                    <span className="truncate">Hàng chờ Duyệt</span>
                  </button>
                 <button
                    onClick={() => navigate('/contracts/templates')}
                    className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-[#f0f2f4] text-[#111418] text-sm font-medium leading-normal hover:bg-slate-200 transition-colors"
                  >
                    <span className="truncate">Thư viện Mẫu</span>
                  </button>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-[#1380ec] text-white text-sm font-bold leading-normal hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    <Plus size={18} className="mr-2" />
                    <span className="truncate">Tạo Hợp đồng</span>
                  </button>
              </div>
            </div>

            {/* KPI Cards (Operational Only - No Finance) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
                <div className="flex flex-col gap-2 rounded-lg p-4 border border-[#dbe0e6] bg-white shadow-sm">
                    <p className="text-[#617589] text-sm font-medium uppercase">Tổng Hợp đồng (T10)</p>
                    <p className="text-[#111418] text-2xl font-bold">24</p>
                </div>
                <div className="flex flex-col gap-2 rounded-lg p-4 border border-[#dbe0e6] bg-white shadow-sm">
                    <p className="text-[#617589] text-sm font-medium uppercase">Đang soạn thảo (Draft)</p>
                    <p className="text-[#111418] text-2xl font-bold text-slate-500">5</p>
                </div>
                <div className="flex flex-col gap-2 rounded-lg p-4 border border-[#dbe0e6] bg-white shadow-sm">
                    <p className="text-[#617589] text-sm font-medium uppercase">Chờ khách ký</p>
                    <p className="text-[#111418] text-2xl font-bold text-blue-600">8</p>
                </div>
                <div className="flex flex-col gap-2 rounded-lg p-4 border border-[#dbe0e6] bg-white shadow-sm">
                    <p className="text-[#617589] text-sm font-medium uppercase">Hoàn tất (Signed)</p>
                    <p className="text-[#111418] text-2xl font-bold text-emerald-600">11</p>
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
                      <th className="px-4 py-3 text-left text-[#111418] w-[150px] text-sm font-bold leading-normal">Mã Hợp đồng</th>
                      <th className="px-4 py-3 text-left text-[#111418] w-[250px] text-sm font-bold leading-normal">Học viên</th>
                      <th className="px-4 py-3 text-left text-[#111418] w-[200px] text-sm font-bold leading-normal">Loại HĐ</th>
                      <th className="px-4 py-3 text-left text-[#111418] w-[150px] text-sm font-bold leading-normal">Ngày tạo</th>
                      <th className="px-4 py-3 text-left text-[#111418] w-[150px] text-sm font-bold leading-normal">Trạng thái</th>
                      <th className="px-4 py-3 text-left text-[#111418] text-[#617589] text-sm font-bold leading-normal">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#dbe0e6] hover:bg-slate-50 transition-colors" onClick={() => navigate('/contracts/c1')}>
                      <td className="h-[72px] px-4 py-2 text-[#111418] text-sm font-normal leading-normal">#HĐ-2023-089</td>
                      <td className="h-[72px] px-4 py-2 text-[#111418] text-sm font-bold leading-normal">
                        Nguyễn Thùy Linh
                        <div className="text-xs text-slate-500 font-normal">098 765 4321</div>
                      </td>
                      <td className="h-[72px] px-4 py-2 text-sm font-normal leading-normal">
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                           Combo Đức A1-B1
                        </span>
                      </td>
                      <td className="h-[72px] px-4 py-2 text-[#617589] text-sm font-normal leading-normal">20/10/2023</td>
                      <td className="h-[72px] px-4 py-2 text-sm font-normal leading-normal">
                        <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                           Đang hiệu lực
                        </span>
                      </td>
                      <td className="h-[72px] px-4 py-2 text-blue-600 text-sm font-bold leading-normal tracking-[0.015em] cursor-pointer hover:underline">
                        Xem chi tiết
                      </td>
                    </tr>

                    <tr className="border-b border-[#dbe0e6] hover:bg-slate-50 transition-colors">
                      <td className="h-[72px] px-4 py-2 text-[#111418] text-sm font-normal leading-normal">#HĐ-2023-092</td>
                      <td className="h-[72px] px-4 py-2 text-[#111418] text-sm font-bold leading-normal">
                        Trần Văn Minh
                        <div className="text-xs text-slate-500 font-normal">091 234 5678</div>
                      </td>
                      <td className="h-[72px] px-4 py-2 text-sm font-normal leading-normal">
                        <span className="inline-flex items-center rounded-full bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10">
                           Du học nghề
                        </span>
                      </td>
                      <td className="h-[72px] px-4 py-2 text-[#617589] text-sm font-normal leading-normal">22/10/2023</td>
                      <td className="h-[72px] px-4 py-2 text-sm font-normal leading-normal">
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                           Đã gửi khách
                        </span>
                      </td>
                      <td className="h-[72px] px-4 py-2 text-blue-600 text-sm font-bold leading-normal tracking-[0.015em] cursor-pointer hover:underline">
                        Xem chi tiết
                      </td>
                    </tr>

                    <tr className="border-b border-[#dbe0e6] hover:bg-slate-50 transition-colors">
                      <td className="h-[72px] px-4 py-2 text-[#111418] text-sm font-normal leading-normal">#HĐ-2023-095</td>
                      <td className="h-[72px] px-4 py-2 text-[#111418] text-sm font-bold leading-normal">
                        Lê Hoàng
                      </td>
                      <td className="h-[72px] px-4 py-2 text-sm font-normal leading-normal">
                        <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                           Tiếng Trung HSK 4
                        </span>
                      </td>
                      <td className="h-[72px] px-4 py-2 text-[#617589] text-sm font-normal leading-normal">24/10/2023</td>
                      <td className="h-[72px] px-4 py-2 text-sm font-normal leading-normal">
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10">
                           Nháp
                        </span>
                      </td>
                      <td className="h-[72px] px-4 py-2 text-blue-600 text-sm font-bold leading-normal tracking-[0.015em] cursor-pointer hover:underline">
                        Tiếp tục soạn
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
                    <h3 className="text-lg font-bold text-slate-900">Tạo Hợp đồng Mới</h3>
                    <p className="text-sm text-slate-500">Vui lòng chọn Deal đã chốt (Won) để khởi tạo hợp đồng.</p>
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

              <div className="overflow-y-auto p-2 bg-slate-50 min-h-[300px]">
                 <p className="text-xs font-bold text-slate-500 uppercase tracking-wider px-4 py-2">Deals chờ làm hợp đồng</p>
                 <div className="space-y-2 px-2">
                    {PENDING_DEALS.map((deal) => (
                       <div key={deal.id} className="bg-white p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group flex justify-between items-center">
                          <div className="flex items-start gap-3">
                             <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold shrink-0">
                                {deal.customer.charAt(0)}
                             </div>
                             <div>
                                <h4 className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors">{deal.customer}</h4>
                                <p className="text-sm text-slate-600">{deal.product}</p>
                                <div className="flex items-center gap-2 mt-1">
                                   <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">{deal.id}</span>
                                   <span className="text-xs text-slate-400">• Won: {deal.date}</span>
                                </div>
                             </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                             <span className="font-bold text-[#1380ec]">{deal.value} đ</span>
                             <button 
                                onClick={() => navigate(`/contracts/new?dealId=${deal.id}`)}
                                className="px-4 py-2 bg-[#1380ec] text-white text-xs font-bold rounded-lg hover:bg-blue-700 flex items-center gap-1 shadow-sm"
                             >
                                Tạo ngay <ArrowRight size={12} />
                             </button>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default Contracts;
