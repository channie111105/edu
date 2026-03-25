import { ILead } from '../types';
import { getPickedLeadFirstActionDeadline, getPickedLeadFirstActionMessage } from './leadSla';

export interface SLAWarning {
    type: 'new_lead' | 'overdue_appointment' | 'manual_sla' | 'not_acknowledged' | 'slow_interaction' | 'neglected_interaction';
    lead: ILead;
    message: string;
    severity: 'danger' | 'warning' | 'info';
    timeLeft?: string;
    minutesOverdue?: number;
}

export interface SLAConfig {
    ackTimeMinutes: number;
    firstActionTimeMinutes: number;
    maxNeglectTimeHours: number;
}

export function calculateSLAWarnings(
    leads: ILead[],
    currentUserId?: string,
    config: SLAConfig = { ackTimeMinutes: 15, firstActionTimeMinutes: 120, maxNeglectTimeHours: 72 }
): SLAWarning[] {
    const warnings: SLAWarning[] = [];
    const now = new Date();

    leads.forEach((lead) => {
        if (!lead) return;

        if (currentUserId && lead.ownerId !== currentUserId) {
            return;
        }

        if ((lead as any).slaStatus && (lead as any).slaStatus !== 'normal') {
            const slaStatus = (lead as any).slaStatus;
            const slaReason = (lead as any).slaReason || 'Cần xử lý';
            const detailedTime = calculateDetailedTimeLeft(lead);

            let minutesOverdue = 999999;
            if (lead.createdAt) {
                const created = new Date(lead.createdAt);
                if (!Number.isNaN(created.getTime())) {
                    minutesOverdue = Math.floor((now.getTime() - created.getTime()) / (1000 * 60));
                }
            }

            warnings.push({
                type: 'manual_sla',
                lead,
                message: slaReason,
                severity: slaStatus === 'danger' ? 'danger' : slaStatus === 'warning' ? 'warning' : 'info',
                timeLeft: detailedTime,
                minutesOverdue
            });
            return;
        }

        if (!lead.createdAt) return;
        const createdAt = new Date(lead.createdAt);
        if (Number.isNaN(createdAt.getTime())) return;

        const totalMinutes = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60));
        const userActivities = (Array.isArray(lead.activities) ? lead.activities : []).filter((activity: any) => activity.type !== 'system');
        const hasInteractions = userActivities.length > 0;
        const isNew = lead.status === 'NEW' || lead.status === 'new' || lead.status === 'Mới';

        if (isNew) {
            if (totalMinutes > config.ackTimeMinutes) {
                warnings.push({
                    type: 'not_acknowledged',
                    lead,
                    message: `Quá hạn ${totalMinutes} phút - Chưa nhận lead`,
                    severity: 'danger',
                    timeLeft: formatOverdueTime(totalMinutes),
                    minutesOverdue: totalMinutes
                });
            }
        } else if (!hasInteractions) {
            const deadline = lead.pickUpDate
                ? getPickedLeadFirstActionDeadline(lead.pickUpDate, config.firstActionTimeMinutes)
                : new Date(createdAt.getTime() + config.firstActionTimeMinutes * 60 * 1000);

            if (deadline && now > deadline) {
                const minutesOverdue = Math.floor((now.getTime() - deadline.getTime()) / (1000 * 60));
                warnings.push({
                    type: 'slow_interaction',
                    lead,
                    message: lead.pickUpDate
                        ? getPickedLeadFirstActionMessage(lead.pickUpDate, config.firstActionTimeMinutes)
                        : `Quá hạn tương tác đầu tiên sau ${config.firstActionTimeMinutes} phút kể từ lúc tạo lead.`,
                    severity: 'warning',
                    timeLeft: formatOverdueTime(minutesOverdue),
                    minutesOverdue
                });
            }
        } else {
            const lastInteractionDate = lead.lastInteraction ? new Date(lead.lastInteraction) : createdAt;
            const minutesSinceLast = Math.floor((now.getTime() - lastInteractionDate.getTime()) / (1000 * 60));

            if (minutesSinceLast > config.maxNeglectTimeHours * 60) {
                const hoursSince = Math.floor(minutesSinceLast / 60);
                const daysSince = Math.floor(hoursSince / 24);
                warnings.push({
                    type: 'neglected_interaction',
                    lead,
                    message: `Đã bỏ quên ${daysSince} ngày - Cần chăm sóc lại`,
                    severity: 'warning',
                    timeLeft: `${daysSince} ngày`,
                    minutesOverdue: minutesSinceLast
                });
            }
        }

        if (lead.activities && lead.activities.length > 0) {
            const scheduledActivities = lead.activities.filter(
                (activity: any) => activity.type === 'activity' && activity.datetime && (!activity.status || activity.status === 'scheduled')
            );

            scheduledActivities.forEach((activity: any) => {
                const activityDate = new Date(activity.datetime);
                if (!(activityDate < now)) return;

                const minutesLate = Math.floor((now.getTime() - activityDate.getTime()) / (1000 * 60));
                const hoursLate = Math.floor(minutesLate / 60);

                warnings.push({
                    type: 'overdue_appointment',
                    lead,
                    message: `Quá hạn lịch hẹn ${hoursLate > 0 ? `${hoursLate} giờ` : `${minutesLate} phút`} - ${activity.description || activity.title || 'Chưa gọi lại'}`,
                    severity: minutesLate > 60 ? 'danger' : 'warning',
                    timeLeft: hoursLate > 0 ? `${hoursLate}h ${minutesLate % 60}p` : `${minutesLate}p`,
                    minutesOverdue: minutesLate
                });
            });
        }
    });

    return warnings.sort((a, b) => (b.minutesOverdue || 0) - (a.minutesOverdue || 0));
}

function formatOverdueTime(totalMinutes: number): string {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
        return minutes > 0 ? `${hours}h ${minutes}p` : `${hours}h`;
    }
    return `${minutes}p`;
}

function calculateDetailedTimeLeft(lead: ILead): string {
    if (!lead.createdAt) return '-';
    const now = new Date();
    const created = new Date(lead.createdAt);
    const totalMinutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60));
    return formatOverdueTime(totalMinutes);
}

export function getUrgentWarningCount(warnings: SLAWarning[]): number {
    return warnings.filter((warning) => warning.severity === 'danger').length;
}

export function formatSLATime(createdAt: string): { text: string; color: string } {
    const now = new Date();
    const created = new Date(createdAt);
    const hoursAgo = (now.getTime() - created.getTime()) / (1000 * 60 * 60);

    if (hoursAgo > 24) {
        return {
            text: `${Math.floor(hoursAgo)}h trễ`,
            color: 'text-red-600 bg-red-50'
        };
    }

    if (hoursAgo > 4) {
        return {
            text: `${Math.floor(hoursAgo)}h`,
            color: 'text-yellow-600 bg-yellow-50'
        };
    }

    const minutes = Math.floor(hoursAgo * 60);
    return {
        text: `${minutes}p`,
        color: 'text-green-600 bg-green-50'
    };
}
