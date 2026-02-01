import React, { useEffect, useState } from 'react';
import { SLALevel } from '../types';
import { SLA_CONFIG } from '../constants';
import { Clock, AlertTriangle, AlertOctagon, Activity } from 'lucide-react';

interface SLABadgeProps {
  createdAt: string;
}

const SLABadge: React.FC<SLABadgeProps> = ({ createdAt }) => {
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [slaLevel, setSlaLevel] = useState<SLALevel>(SLALevel.NORMAL);

  useEffect(() => {
    const calculateSLA = () => {
      const created = new Date(createdAt).getTime();
      const now = new Date().getTime();
      const diffMs = now - created;
      const diffMins = Math.floor(diffMs / 60000);

      setElapsedMinutes(diffMins);

      if (diffMins > SLA_CONFIG.DANGER_THRESHOLD_MINUTES) { // > 30 mins
        setSlaLevel(SLALevel.DANGER);
      } else if (diffMins >= SLA_CONFIG.WARNING_THRESHOLD_MINUTES) { // >= 5 mins
        setSlaLevel(SLALevel.WARNING);
      } else {
        setSlaLevel(SLALevel.NORMAL); // < 5 mins
      }
    };

    calculateSLA();
    const interval = setInterval(calculateSLA, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, [createdAt]);

  if (slaLevel === SLALevel.DANGER) {
    return (
      <div className="inline-flex items-center px-3 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-100 text-xs font-bold animate-pulse shadow-sm">
        <AlertOctagon size={14} className="mr-1.5" />
        {elapsedMinutes}p - Chậm trễ
      </div>
    );
  }

  if (slaLevel === SLALevel.WARNING) {
    return (
      <div className="inline-flex items-center px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-100 text-xs font-bold">
        <AlertTriangle size={14} className="mr-1.5" />
        {elapsedMinutes}p - Cảnh báo
      </div>
    );
  }

  // < 5 Phút: Xanh dương (Active) theo yêu cầu mới
  return (
    <div className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-50 text-[#0056b3] border border-blue-100 text-xs font-bold">
      <Activity size={14} className="mr-1.5" />
      {elapsedMinutes}p - Active
    </div>
  );
};

export default SLABadge;