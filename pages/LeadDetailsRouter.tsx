import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import LeadDetails from './LeadDetails';
import MarketingLeadDetails from './MarketingLeadDetails';
import SalesLeadQuickProcess from './SalesLeadQuickProcess';

/**
 * Smart Router for Lead Details
 * Routes to different Lead Detail views based on user role
 */
const LeadDetailsRouter: React.FC = () => {
    const { user } = useAuth();

    // Marketing users get their specialized view
    if (user?.role === UserRole.MARKETING) {
        return <MarketingLeadDetails />;
    }

    // Sales users (Rep & Leader) get Quick Process view
    if (user?.role === UserRole.SALES_REP || user?.role === UserRole.SALES_LEADER) {
        return <SalesLeadQuickProcess />;
    }

    // All other roles (Admin, Founder, etc.) use the default view
    return <LeadDetails />;
};

export default LeadDetailsRouter;
