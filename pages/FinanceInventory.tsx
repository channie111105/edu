
import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Search, 
  ShoppingBag, 
  Plus, 
  ShoppingCart, 
  Package, 
  History 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const FinanceInventory: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'inventory' | 'pos'>('inventory');

  // Mock Data
  const ITEMS = [
    { id: 'BK-001', name: 'Giáo trình A1 Netzwerk', price: 250000, stock: 45, category: 'Sách' },
    { id: 'BK-002', name: 'Giáo trình A2 Netzwerk', price: 280000, stock: 30, category: 'Sách' },
    { id: 'UN-001', name: 'Áo đồng phục ULA (Size M)', price: 150000, stock: 12, category: 'Đồng phục' },
    { id: 'UN-002', name: 'Áo đồng phục ULA (Size L)', price: 150000, stock: 5, category: 'Đồng phục' }, // Low stock
  ];

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#111418] font-sans overflow-hidden">
        <div className="flex flex-col flex-1 overflow-y-auto p-6 lg:p-8">
            
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => navigate('/finance')} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                    <ArrowLeft size={24} className="text-slate-600" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Quản lý Kho & Bán lẻ (POS)</h1>
                    <p className="text-sm text-slate-500">Quản lý tồn kho giáo trình, đồng phục và tạo đơn bán lẻ.</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b border-slate-200">
                <button 
                    onClick={() => setActiveTab('inventory')}
                    className={`pb-3 px-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'inventory' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <Package size={18} /> Tồn kho (Inventory)
                </button>
                <button 
                    onClick={() => setActiveTab('pos')}
                    className={`pb-3 px-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'pos' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <ShoppingCart size={18} /> Bán hàng (POS)
                </button>
            </div>

            {activeTab === 'inventory' ? (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input type="text" placeholder="Tìm tên sách, mã..." className="pl-9 pr-4 py-2 w-full border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                        </div>
                        <div className="flex gap-2">
                            <button className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                                <History size={16} /> Lịch sử Nhập/Xuất
                            </button>
                            <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm">
                                <Plus size={18} /> Nhập kho
                            </button>
                        </div>
                    </div>
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold">
                            <tr>
                                <th className="px-6 py-4">Mã SP</th>
                                <th className="px-6 py-4">Tên Sản phẩm</th>
                                <th className="px-6 py-4">Danh mục</th>
                                <th className="px-6 py-4">Đơn giá bán</th>
                                <th className="px-6 py-4">Tồn kho</th>
                                <th className="px-6 py-4 text-right"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {ITEMS.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{item.id}</td>
                                    <td className="px-6 py-4 text-sm font-bold text-slate-900">{item.name}</td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">{item.category}</span>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-slate-900">{item.price.toLocaleString()} đ</td>
                                    <td className="px-6 py-4">
                                        <span className={`text-sm font-bold ${item.stock < 10 ? 'text-red-600' : 'text-emerald-600'}`}>
                                            {item.stock} {item.stock < 10 && '(Sắp hết)'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-blue-600 hover:underline text-xs font-bold">Sửa</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="flex h-full gap-6">
                    {/* Product Grid */}
                    <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm p-4 overflow-y-auto">
                        <div className="grid grid-cols-3 gap-4">
                            {ITEMS.map(item => (
                                <div key={item.id} className="border border-slate-200 rounded-lg p-4 cursor-pointer hover:border-purple-500 hover:shadow-md transition-all flex flex-col items-center text-center">
                                    <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mb-2">
                                        <ShoppingBag size={20} />
                                    </div>
                                    <p className="text-sm font-bold text-slate-900 line-clamp-2">{item.name}</p>
                                    <p className="text-xs text-slate-500 mt-1">{item.price.toLocaleString()} đ</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Cart */}
                    <div className="w-80 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
                        <div className="p-4 border-b border-slate-200 bg-slate-50">
                            <h3 className="font-bold text-slate-900">Giỏ hàng</h3>
                        </div>
                        <div className="flex-1 p-4 flex flex-col items-center justify-center text-slate-400">
                            <ShoppingCart size={40} className="mb-2 opacity-50" />
                            <p className="text-sm">Chưa có sản phẩm nào</p>
                        </div>
                        <div className="p-4 border-t border-slate-200">
                            <div className="flex justify-between mb-4">
                                <span className="font-bold text-slate-700">Tổng tiền:</span>
                                <span className="font-bold text-xl text-purple-600">0 đ</span>
                            </div>
                            <button className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold shadow-sm">
                                Thanh toán
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    </div>
  );
};

export default FinanceInventory;
