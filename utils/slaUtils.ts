
import { ILead } from '../types';
import { SLAWarning } from '../components/SLAWarningBanner';

export interface SLAConfig {
    ackTimeMinutes: number;
    firstActionTimeMinutes: number;
}

/**
 * Calculate SLA warnings for leads
 * Updated to support configurable thresholds and improved sorting.
 */
export function calculateSLAWarnings(
    leads: ILead[],
    currentUserId?: string,
    config: SLAConfig = { ackTimeMinutes: 15, firstActionTimeMinutes: 60 }
): SLAWarning[] {
    const warnings: SLAWarning[] = [];
    const now = new Date();

    leads.forEach(lead => {
        if (!lead) return;

        // Only check leads assigned to current user (unless viewing all)
        if (currentUserId && lead.ownerId !== currentUserId) {
            return;
        }

        // PRIORITY 1: Check for manual SLA status (from mock data or admin override)
        if ((lead as any).slaStatus && (lead as any).slaStatus !== 'normal') {
            const slaStatus = (lead as any).slaStatus;
            const slaReason = (lead as any).slaReason || 'Cần xử lý';
            const detailedTime = calculateDetailedTimeLeft(lead);

            // For manual SLA, we use a high 'minutesOverdue' to keep them top if they are critical,
            // OR we can try to parse 'detailedTime' if possible. 
            // Better to rely on severity or just push to top.
            // But User wants "Waiting Time" sorting.
            // If Manual SLA doesn't have a calculated waiting time, it breaks sorting.
            // Let's assume Manual SLA implies very high urgency or we calculate actual wait time if createdAt exists.

            let minutesOverdue = 999999;
            if (lead.createdAt) {
                const created = new Date(lead.createdAt);
                if (!isNaN(created.getTime())) {
                    minutesOverdue = Math.floor((now.getTime() - created.getTime()) / (1000 * 60));
                }
            }

            warnings.push({
                type: 'manual_sla',
                lead,
                message: slaReason,
                severity: slaStatus === 'danger' ? 'danger' : slaStatus === 'warning' ? 'warning' : 'info',
                timeLeft: detailedTime,
                minutesOverdue: minutesOverdue
            });
            return;
        }

        // PRIORITY 2: Automatic SLA calculation
        if (!lead.createdAt) return;
        const createdAt = new Date(lead.createdAt);
        if (isNaN(createdAt.getTime())) return;

        const totalMinutes = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60));

        // Check for interactions
        const userActivities = (lead.activities || []).filter((a: any) => a.type !== 'system');
        const hasInteractions = userActivities.length > 0;
        const isNew = lead.status === 'NEW' || lead.status === 'new';

        // CRITERIA 1: Not Acknowledged (Quá hạn nhận)
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
        }
        // CRITERIA 2: Slow Interaction (Chậm chăm sóc)
        else if (!hasInteractions) {
            if (totalMinutes > config.firstActionTimeMinutes) {
                const hoursWait = Math.floor(totalMinutes / 60);
                warnings.push({
                    type: 'slow_interaction',
                    lead,
                    message: `Quá hạn ${hoursWait} giờ - Chưa có tương tác đầu tiên`,
                    severity: 'warning',
                    timeLeft: formatOverdueTime(totalMinutes),
                    minutesOverdue: totalMinutes
                });
            }
        }

        // Check for overdue appointments
        if (lead.activities && lead.activities.length > 0) {
            const scheduledActivities = lead.activities.filter((a: any) =>
                a.type === 'activity' &&
                a.datetime &&
                (!a.status || a.status === 'scheduled')
            );

            scheduledActivities.forEach((activity: any) => {
                const activityDate = new Date(activity.datetime);
                const isOverdue = activityDate < now;

                if (isOverdue) {
                    const minutesLate = Math.floor((now.getTime() - activityDate.getTime()) / (1000 * 60));
                    const hoursLate = Math.floor(minutesLate / 60);

                    // Add warning (potentially multiple per lead, but normally one critical)
                    warnings.push({
                        type: 'overdue_appointment',
                        lead,
                        message: `Quá hạn lịch hẹn ${hoursLate > 0 ? hoursLate + ' giờ' : minutesLate + ' phút'} - ${activity.description || activity.title || 'Chưa gọi lại'}`,
                        severity: minutesLate > 60 ? 'danger' : 'warning',
                        timeLeft: hoursLate > 0 ? `${hoursLate}h ${minutesLate % 60}p` : `${minutesLate}p`,
                        minutesOverdue: minutesLate
                    });
                }
            });
        }
    });

    // Sort by minutesOverdue DESC (longest delay first)
    // User explicitly requested to prioritize Waiting Time over Severity groupings.
    return warnings.sort((a, b) => {
        return (b.minutesOverdue || 0) - (a.minutesOverdue || 0);
    });
}

// Helper function to format overdue time
function formatOverdueTime(totalMinutes: number): string {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
        return minutes > 0 ? `${hours}h ${minutes}p` : `${hours}h`;
    }
    return `${minutes}p`;
}

// Helper to calculate detailed time left from lead creation
function calculateDetailedTimeLeft(lead: ILead): string {
    if (!lead.createdAt) return '-';
    const now = new Date();
    const created = new Date(lead.createdAt);
    const totalMinutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60));
    return formatOverdueTime(totalMinutes);
}

/**
 * Get count of urgent warnings (danger severity)
 */
export function getUrgentWarningCount(warnings: SLAWarning[]): number {
    return warnings.filter(w => w.severity === 'danger').length;
}

/**
 * Format time remaining for SLA
 */
export function formatSLATime(createdAt: string): { text: string; color: string } {
    const now = new Date();
    const created = new Date(createdAt);
    const hoursAgo = (now.getTime() - created.getTime()) / (1000 * 60 * 60);

    if (hoursAgo > 24) {
        return {
            text: `${Math.floor(hoursAgo)}h trễ`,
            color: 'text-red-600 bg-red-50'
        };
    } else if (hoursAgo > 4) {
        return {
            text: `${Math.floor(hoursAgo)}h`,
            color: 'text-yellow-600 bg-yellow-50'
        };
    } else {
        const minutes = Math.floor(hoursAgo * 60);
        return {
            text: `${minutes}p`,
            color: 'text-green-600 bg-green-50'
        };
    }
}

export type { SLAWarning };
