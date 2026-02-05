import React from 'react';
import { AlertCircle, Clock, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ILead } from '../types';

interface SLAWarning {
    type: 'new_lead' | 'overdue_appointment' | 'manual_sla' | 'not_acknowledged' | 'slow_interaction';
    lead: ILead;
    message: string;
    severity: 'danger' | 'warning' | 'info';
    timeLeft?: string;
    minutesOverdue?: number;
}

interface SLAWarningBannerProps {
    warnings: SLAWarning[];
    onClickLead: (lead: ILead) => void;
}

const SLAWarningBanner: React.FC<SLAWarningBannerProps> = ({ warnings, onClickLead }) => {
    const navigate = useNavigate();

    if (warnings.length === 0) return null;

    // Group by severity
    const dangerWarnings = warnings.filter(w => w.severity === 'danger');
    const warningWarnings = warnings.filter(w => w.severity === 'warning');

    const getSeverityColor = (severity: string) => {
        if (severity === 'danger') return 'bg-red-50 border-red-200 text-red-800';
        if (severity === 'warning') return 'bg-yellow-50 border-yellow-200 text-yellow-800';
        return 'bg-blue-50 border-blue-200 text-blue-800';
    };

    const getSeverityIcon = (severity: string) => {
        if (severity === 'danger') return <AlertCircle size={18} className="text-red-600" />;
        if (severity === 'warning') return <Clock size={18} className="text-yellow-600" />;
        return <UserPlus size={18} className="text-blue-600" />;
    };

    return (
        <div className="space-y-2 mb-4">
            {/* Danger Warnings */}
            {dangerWarnings.length > 0 && (
                <div className={`border-l-4 p-3 rounded-r-lg ${getSeverityColor('danger')} animate-pulse`}>
                    <div className="flex items-start gap-3">
                        {getSeverityIcon('danger')}
                        <div className="flex-1">
                            <div className="font-bold text-sm mb-1">
                                ⚠️ CẦN XỬ LÝ NGAY ({dangerWarnings.length})
                            </div>
                            <div className="space-y-1">
                                {dangerWarnings.slice(0, 3).map((warning, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => onClickLead(warning.lead)}
                                        className="block text-left w-full hover:bg-red-100 rounded px-2 py-1 text-xs transition-colors"
                                    >
                                        <span className="font-semibold">{warning.lead.name}</span>
                                        <span className="mx-2">•</span>
                                        <span className="text-red-700">{warning.message}</span>
                                        {warning.timeLeft && (
                                            <span className="ml-2 font-bold">({warning.timeLeft})</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                            {dangerWarnings.length > 3 && (
                                <button
                                    onClick={() => navigate('/sla/leads')}
                                    className="text-xs underline mt-2 font-semibold hover:text-red-900"
                                >
                                    Xem thêm {dangerWarnings.length - 3} cảnh báo...
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Warning Warnings */}
            {warningWarnings.length > 0 && (
                <div className={`border-l-4 p-3 rounded-r-lg ${getSeverityColor('warning')}`}>
                    <div className="flex items-start gap-3">
                        {getSeverityIcon('warning')}
                        <div className="flex-1">
                            <div className="font-bold text-sm mb-1">
                                ⏰ SẮP QUÁ HẠN ({warningWarnings.length})
                            </div>
                            <div className="space-y-1">
                                {warningWarnings.slice(0, 2).map((warning, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => onClickLead(warning.lead)}
                                        className="block text-left w-full hover:bg-yellow-100 rounded px-2 py-1 text-xs transition-colors"
                                    >
                                        <span className="font-semibold">{warning.lead.name}</span>
                                        <span className="mx-2">•</span>
                                        <span>{warning.message}</span>
                                        {warning.timeLeft && (
                                            <span className="ml-2 font-bold">({warning.timeLeft})</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                            {warningWarnings.length > 2 && (
                                <button
                                    onClick={() => navigate('/sla/leads')}
                                    className="text-xs underline mt-2 font-semibold hover:text-yellow-900"
                                >
                                    Xem thêm {warningWarnings.length - 2} cảnh báo...
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SLAWarningBanner;
export type { SLAWarning };
