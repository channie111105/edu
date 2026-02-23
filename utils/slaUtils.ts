
import { ILead } from '../types';

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
    maxNeglectTimeHours: number; // New config for follow-up gap
}

/**
 * Calculate SLA warnings for leads
 * Updated to support configurable thresholds and improved sorting.
 */
export function calculateSLAWarnings(
    leads: ILead[],
    currentUserId?: string,
    config: SLAConfig = { ackTimeMinutes: 15, firstActionTimeMinutes: 60, maxNeglectTimeHours: 72 }
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
            // Continue checking other conditions? Usually manual overrides everything.
            // But let's check strict time-based ones too if we want comprehensive tabs.
            // For now, return to mimic previous behavior.
            return;
        }

        // PRIORITY 2: Automatic SLA calculation
        if (!lead.createdAt) return;
        const createdAt = new Date(lead.createdAt);
        if (isNaN(createdAt.getTime())) return;

        const totalMinutes = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60));

        // Check for interactions
        const userActivities = (Array.isArray(lead.activities) ? lead.activities : []).filter((a: any) => a.type !== 'system');
        const hasInteractions = userActivities.length > 0;
        const isNew = lead.status === 'NEW' || lead.status === 'new' || lead.status === 'Mới';

        // CRITERIA 1: Not Acknowledged (Quá hạn nhận)
        // Applies to NEW leads
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
        // Case A: No interactions at all (and not New/or passed New phase but ignored)
        else if (!hasInteractions) {
            const timerStart = lead.pickUpDate ? new Date(lead.pickUpDate) : createdAt;
            const minsSinceStart = Math.floor((now.getTime() - timerStart.getTime()) / (1000 * 60));

            if (minsSinceStart > config.firstActionTimeMinutes) {
                const hoursWait = Math.floor(minsSinceStart / 60);
                warnings.push({
                    type: 'slow_interaction',
                    lead,
                    message: `Quá hạn ${hoursWait} giờ - Chưa có tương tác đầu tiên kể từ lúc nhận`,
                    severity: 'warning',
                    timeLeft: formatOverdueTime(minsSinceStart),
                    minutesOverdue: minsSinceStart
                });
            }
        }
        // Case B: Has interactions, but neglected recently (Chăm sóc gián đoạn)
        else if (hasInteractions) {
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

