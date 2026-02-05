import React, { useState, useEffect } from 'react';
import {
    Search, Plus, Filter, MoreHorizontal, GraduationCap,
    Calendar, MapPin, User, CheckCircle2, AlertCircle,
    ArrowRightLeft, FileBadge
} from 'lucide-react';
import { IStudent, StudentStatus, UserRole } from '../types';
import { getStudents, updateStudent } from '../utils/storage';
import { useAuth } from '../contexts/AuthContext';

const MOCK_CLASSES = ['GER-A1-K35', 'GER-A1-K36', 'GER-B1-K12', 'AUS-COOK-K01'];

const Students: React.FC = () => {
    const { user } = useAuth();
    const [students, setStudents] = useState<IStudent[]>([]);
    const [filterStatus, setFilterStatus] = useState<StudentStatus | 'ALL'>(StudentStatus.ADMISSION);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [selectedStudent, setSelectedStudent] = useState<IStudent | null>(null);
    const [showEnrollModal, setShowEnrollModal] = useState(false);

    // Enroll Form State
    const [enrollData, setEnrollData] = useState({
        classId: '',
        admissionDate: new Date().toISOString().slice(0, 10),
        campus: 'Hà Nội'
    });

    useEffect(() => {
        // Load data
        setStudents(getStudents());
    }, []);

    const filteredData = students.filter(s => {
        const matchesStatus = filterStatus === 'ALL' || s.status === filterStatus;
        const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.code.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const handleEnrollClick = (student: IStudent) => {
        setSelectedStudent(student);
        setEnrollData({
            classId: student.className || '', // Pre-fill if available
            admissionDate: new Date().toISOString().slice(0, 10),
            campus: student.campus || 'Hà Nội'
        });
        setShowEnrollModal(true);
    };

    const handleSaveEnrollment = () => {
        if (!selectedStudent) return;

        // Update Student
        const updated: IStudent = {
            ...selectedStudent,
            className: enrollData.classId,
            campus: enrollData.campus,
            admissionDate: enrollData.admissionDate,
            // If SALE updates, status remains ADMISSION? 
            // User Story: "Step 1 (Sale) ... Status is Admission ... Save"
            // "Step 2 (Training) ... Click Confirm -> Enrolled"
            // So if User is Training, we might confirm. If Sale, just save info.
            // For simplicity, let's assume this action prepares it. 
            // Let's Add a "Confirm" button for Training role separately?
            // User requested: Action is "Ghi danh" for new students.
        };

        updateStudent(updated);
        setStudents(getStudents()); // Reload
        setShowEnrollModal(false);
        alert('Đã cập nhật thông tin ghi danh!');
    };

    const handleConfirmEnrollment = (student: IStudent) => {
        // Only Training Manager?
        // if (user?.role !== UserRole.TRAINING) return alert("Chỉ quản lý đào tạo mới được duyệt!");

        const updated = { ...student, status: StudentStatus.ENROLLED };
        updateStudent(updated);
        setStudents(getStudents());
        alert(`Đã xác nhận học viên ${student.name} vào lớp chính thức!`);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto font-sans text-slate-800">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <GraduationCap className="text-indigo-600" /> Quản lý Học viên
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Quản lý hồ sơ, xếp lớp và trạng thái học tập của học viên.</p>
                </div>
                {/* <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-700">
                    <Plus size={18} /> Thêm thủ công
                </button> */}
            </div>

            {/* Quick Filters (Tabs) */}
            <div className="flex bg-slate-100 p-1 rounded-lg w-fit mb-6">
                <button
                    onClick={() => setFilterStatus(StudentStatus.ADMISSION)}
                    className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${filterStatus === StudentStatus.ADMISSION ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Chưa ghi danh (Admission)
                </button>
                <button
                    onClick={() => setFilterStatus(StudentStatus.ENROLLED)}
                    className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${filterStatus === StudentStatus.ENROLLED ? 'bg-white text-green-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Đã ghi danh (Enrolled)
                </button>
                <button
                    onClick={() => setFilterStatus('ALL')}
                    className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${filterStatus === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Tất cả
                </button>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Tìm kiếm theo tên, mã học viên..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <button className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600">
                    <Filter size={18} />
                </button>
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4">Mã HV</th>
                            <th className="px-6 py-4">Học viên</th>
                            <th className="px-6 py-4">Sản phẩm / Dịch vụ</th>
                            <th className="px-6 py-4">Cơ sở / Lớp</th>
                            <th className="px-6 py-4 text-center">Trạng thái</th>
                            <th className="px-6 py-4 text-right">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredData.length > 0 ? (
                            filteredData.map((student) => (
                                <tr key={student.id} className="hover:bg-indigo-50/30 transition-colors group">
                                    <td className="px-6 py-4 font-mono text-slate-600 font-bold">{student.code}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs">
                                                {student.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900">{student.name}</div>
                                                <div className="text-xs text-slate-500">{student.phone}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-800">{student.level || 'Chưa rõ'}</div>
                                        <div className="text-xs text-slate-500 truncate max-w-[150px]">{student.dealId ? 'Từ Deal' : 'Trực tiếp'}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1 text-slate-700 font-medium">
                                            <MapPin size={12} /> {student.campus}
                                        </div>
                                        <div className="text-indigo-600 font-bold text-xs mt-1">
                                            {student.className || 'Chưa xếp lớp'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`
                                            px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1
                                            ${student.status === StudentStatus.ADMISSION ? 'bg-orange-100 text-orange-700' : ''}
                                            ${student.status === StudentStatus.ENROLLED ? 'bg-green-100 text-green-700' : ''}
                                            ${student.status === StudentStatus.DROPPED ? 'bg-red-100 text-red-700' : ''}
                                        `}>
                                            {student.status === StudentStatus.ADMISSION && <AlertCircle size={12} />}
                                            {student.status === StudentStatus.ENROLLED && <CheckCircle2 size={12} />}
                                            {student.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {student.status === StudentStatus.ADMISSION ? (
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleEnrollClick(student)}
                                                    className="bg-indigo-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-indigo-700 shadow-sm"
                                                >
                                                    Ghi danh
                                                </button>
                                                {user?.role === UserRole.TRAINING && (
                                                    <button
                                                        onClick={() => handleConfirmEnrollment(student)}
                                                        className="bg-green-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-green-700 shadow-sm"
                                                        title="Quản lý đào tạo duyệt nhanh"
                                                    >
                                                        Duyệt
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex justify-end gap-2">
                                                <button className="border border-slate-300 text-slate-600 px-3 py-1.5 rounded text-xs font-bold hover:bg-slate-50 flex items-center gap-1">
                                                    <ArrowRightLeft size={12} /> Chuyển cơ sở
                                                </button>
                                                <button className="border border-slate-300 text-slate-600 px-3 py-1.5 rounded text-xs font-bold hover:bg-slate-50 flex items-center gap-1">
                                                    <FileBadge size={12} /> Hồ sơ
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} className="text-center py-12 text-slate-500">
                                    Chưa có học viên nào trong danh sách.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Enroll Modal */}
            {showEnrollModal && selectedStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl p-6 max-w-lg w-full animate-in zoom-in-95">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">Ghi danh Học viên</h3>
                                <p className="text-sm text-slate-500">Cập nhật thông tin xếp lớp cho <b>{selectedStudent.name}</b></p>
                            </div>
                            <button onClick={() => setShowEnrollModal(false)} className="text-slate-400 hover:text-slate-600">×</button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Cơ sở (Campus)</label>
                                <select
                                    className="w-full p-2 border border-slate-300 rounded font-medium"
                                    value={enrollData.campus}
                                    onChange={(e) => setEnrollData(p => ({ ...p, campus: e.target.value }))}
                                >
                                    <option value="Hà Nội">Hà Nội</option>
                                    <option value="Hồ Chí Minh">Hồ Chí Minh</option>
                                    <option value="Đà Nẵng">Đà Nẵng</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Lớp học Chính thức</label>
                                <select
                                    className="w-full p-2 border border-slate-300 rounded font-medium focus:ring-2 focus:ring-indigo-500"
                                    value={enrollData.classId}
                                    onChange={(e) => setEnrollData(p => ({ ...p, classId: e.target.value }))}
                                >
                                    <option value="">-- Chọn lớp học --</option>
                                    {MOCK_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <p className="text-xs text-orange-600 mt-1 italic">Lớp dự kiến: {selectedStudent.className || 'Không có'}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Ngày nhập học</label>
                                <input
                                    type="date"
                                    className="w-full p-2 border border-slate-300 rounded"
                                    value={enrollData.admissionDate}
                                    onChange={(e) => setEnrollData(p => ({ ...p, admissionDate: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8">
                            <button onClick={() => setShowEnrollModal(false)} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg">Hủy</button>
                            <button onClick={handleSaveEnrollment} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700">
                                Lưu thông tin
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Students;
