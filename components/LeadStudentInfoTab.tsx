import React from 'react';
import {
  LeadCreateFormData,
  STUDENT_EDUCATION_LEVEL_OPTIONS,
} from '../utils/leadCreateForm';

interface LeadStudentInfoTabProps {
  data: LeadCreateFormData;
  onPatch: (patch: Partial<LeadCreateFormData>) => void;
}

const inputClassName =
  'flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none text-slate-700 placeholder:text-slate-400';

const LeadStudentInfoTab: React.FC<LeadStudentInfoTabProps> = ({ data, onPatch }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 animate-in fade-in duration-200">
      <div className="flex items-center gap-4">
        <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Họ tên</label>
        <input
          className={inputClassName}
          placeholder="Tên học sinh"
          value={data.studentName}
          onChange={(event) => onPatch({ studentName: event.target.value })}
        />
      </div>

      <div className="flex items-center gap-4">
        <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Ngày sinh</label>
        <input
          type="date"
          className={inputClassName}
          value={data.studentDob}
          onChange={(event) => onPatch({ studentDob: event.target.value })}
        />
      </div>

      <div className="flex items-center gap-4">
        <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">CCCD</label>
        <input
          className={inputClassName}
          placeholder="Số CCCD học sinh"
          value={data.studentIdentityCard}
          onChange={(event) => onPatch({ studentIdentityCard: event.target.value })}
        />
      </div>

      <div className="flex items-center gap-4">
        <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">SĐT học viên</label>
        <input
          className={inputClassName}
          placeholder="Số điện thoại học sinh"
          value={data.studentPhone}
          onChange={(event) => onPatch({ studentPhone: event.target.value })}
        />
      </div>

      <div className="flex items-center gap-4">
        <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Tên trường</label>
        <input
          className={inputClassName}
          placeholder="Tên trường học"
          value={data.studentSchool}
          onChange={(event) => onPatch({ studentSchool: event.target.value })}
        />
      </div>

      <div className="flex items-center gap-4">
        <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Trình độ</label>
        <select
          className={`${inputClassName} bg-white`}
          value={data.studentEducationLevel}
          onChange={(event) => onPatch({ studentEducationLevel: event.target.value })}
        >
          <option value="">-- Chọn trình độ học vấn --</option>
          {STUDENT_EDUCATION_LEVEL_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default LeadStudentInfoTab;
