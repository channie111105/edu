import React from 'react';
import {
    Search,
    Filter,
    Download,
    MoreHorizontal,
    GraduationCap,
    MapPin,
    CalendarClock,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const STUDENTS = [
    {
        id: 'DH001',
        name: 'Nguyễn Thùy Linh',
        program: 'Đại học (Kỹ thuật)',
        country: 'Đức',
        stage: 'Nộp hồ sơ trường',
        status: 'Processing',
        intake: '10/2026',
        progress: 40
    },
    {
        id: 'DH002',
        name: 'Trần Văn Minh',
        program: 'Hệ tiếng (A1-B1)',
        country: 'Đức',
        stage: 'Phỏng vấn Visa',
        status: 'Urgent',
        intake: '04/2026',
        progress: 80
    },
    {
        id: 'DH003',
        name: 'Lê Hoàng Anh',
        program: 'Thạc sĩ (Kinh tế)',
        country: 'Úc',
        stage: 'Chờ thư mời (Offer)',
        status: 'Processing',
        intake: '07/2026',
        progress: 30
    },
    {
        id: 'DH004',
        name: 'Phạm Thị Mai',
        program: 'Du nghề (Điều dưỡng)',
        country: 'Đức',
        stage: 'Đã có Visa',
        status: 'Completed',
        intake: '09/2025',
        progress: 100
    },
];

const StudyAbroadStudentList: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] text-[#111418] font-sans overflow-hidden">
            <div className="flex flex-col flex-1 overflow-y-auto p-6 lg:p-8 max-w-[1400px] mx-auto w-full">

                {/* Header */}
                <div className="flex flex-wrap justify-between items-end gap-3 mb-6">
                    <div className="flex min-w-72 flex-col gap-1">
                        <h1 className="text-[#111418] text-[32px] font-bold leading-tight tracking-[-0.015em] flex items-center gap-2">
                            <GraduationCap size={32} className="text-blue-600" /> Hồ sơ Du học sinh
                        </h1>
                        <p className="text-[#4c739a] text-sm font-normal leading-normal">Quản lý danh sách và tiến độ hồ sơ du học.</p>
                    </div>
                    <div className="flex gap-2">
                        <button className="flex items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-blue-600 text-white text-sm font-bold leading-normal hover:bg-blue-700 transition-colors shadow-sm">
                            + Thêm hồ sơ
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="px-4 py-3 mb-4 bg-white border border-[#cfdbe7] rounded-xl shadow-sm flex flex-wrap gap-4 items-center">
                    <label className="flex flex-col min-w-40 h-10 flex-1">
                        <div className="flex w-full flex-1 items-stretch rounded-lg h-full">
                            <div className="text-[#4c739a] flex border-none bg-[#e7edf3] items-center justify-center pl-4 rounded-l-lg border-r-0">
                                <Search size={20} />
                            </div>
                            <input
                                placeholder="Tìm kiếm học viên, mã hồ sơ..."
                                className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#111418] focus:outline-0 focus:ring-0 border-none bg-[#e7edf3] focus:border-none h-full placeholder:text-[#4c739a] px-4 rounded-l-none border-l-0 pl-2 text-sm font-normal leading-normal"
                            />
                        </div>
                    </label>
                    <div className="flex gap-2">
                        <select className="h-10 px-4 rounded-lg bg-[#e7edf3] text-[#111418] text-sm font-medium border-none focus:ring-0 cursor-pointer outline-none">
                            <option>Quốc gia: Tất cả</option>
                            <option>Đức</option>
                            <option>Úc</option>
                            <option>Trung Quốc</option>
                            <option>Canada</option>
                        </select>
                        <select className="h-10 px-4 rounded-lg bg-[#e7edf3] text-[#111418] text-sm font-medium border-none focus:ring-0 cursor-pointer outline-none">
                            <option>Trạng thái: Tất cả</option>
                            <option>Đang xử lý</option>
                            <option>Đã có Visa</option>
                            <option>Sắp bay</option>
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="flex overflow-hidden rounded-xl border border-[#cfdbe7] bg-white shadow-sm">
                    <table className="flex-1 w-full text-left border-collapse">
                        <thead className="bg-[#f8fafc] border-b border-[#cfdbe7]">
                            <tr>
                                <th className="px-6 py-4 text-[#111418] text-sm font-bold leading-normal">Học viên</th>
                                <th className="px-6 py-4 text-[#111418] text-sm font-bold leading-normal">Chương trình</th>
                                <th className="px-6 py-4 text-[#111418] text-sm font-bold leading-normal">Kỳ nhập học</th>
                                <th className="px-6 py-4 text-[#111418] text-sm font-bold leading-normal">Giai đoạn</th>
                                <th className="px-6 py-4 text-[#111418] w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#cfdbe7]">
                            {STUDENTS.map((stu) => (
                                <tr key={stu.id} className="hover:bg-[#f8fafc] transition-colors cursor-pointer" onClick={() => navigate(`/study-abroad/cases/${stu.id}`)}>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <p className="text-[#111418] text-sm font-bold leading-normal">{stu.name}</p>
                                            <p className="text-[#4c739a] text-xs font-mono">{stu.id}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <p className="text-[#111418] text-sm font-medium">{stu.program}</p>
                                            <div className="flex items-center gap-1 text-xs text-[#4c739a] mt-0.5">
                                                <MapPin size={10} /> {stu.country}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-sm text-[#111418]">
                                            <CalendarClock size={16} className="text-[#4c739a]" /> {stu.intake}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {stu.status === 'Completed' ? (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-bold border border-green-100">
                                                <CheckCircle2 size={12} /> {stu.stage}
                                            </span>
                                        ) : stu.status === 'Urgent' ? (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs font-bold border border-red-100 animate-pulse">
                                                <AlertCircle size={12} /> {stu.stage}
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> {stu.stage}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button className="text-[#4c739a] hover:text-[#111418]">
                                            <MoreHorizontal size={20} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

            </div>
        </div>
    );
};

export default StudyAbroadStudentList;
