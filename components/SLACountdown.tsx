import React, { useState, useEffect } from 'react';
import { SLA_CONFIG } from '../constants';
import { Clock, AlertTriangle } from 'lucide-react';

interface Props {
  createdAt: string;
  variant?: 'cards' | 'text' | 'compact';
}

const SLACountdown: React.FC<Props> = ({ createdAt, variant = 'cards' }) => {
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);
  const [isEscalated, setIsEscalated] = useState(false);

  useEffect(() => {
    const calculateTime = () => {
      const createdTime = new Date(createdAt).getTime();
      const targetTime = createdTime + (SLA_CONFIG.DANGER_THRESHOLD_MINUTES * 60 * 1000); // 30 mins limit
      const now = new Date().getTime();
      const difference = targetTime - now;

      if (difference <= 0) {
        setIsEscalated(true);
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
      } else {
        setIsEscalated(false);
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        const seconds = Math.floor((difference / 1000) % 60);
        setTimeLeft({ hours, minutes, seconds });
      }
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [createdAt]);

  if (!timeLeft) return null;

  // Variant: TEXT (Simple text for sidebars)
  if (variant === 'text') {
    return (
      <div className={`flex items-center gap-2 text-sm font-bold ${isEscalated ? 'text-red-600' : 'text-slate-700'}`}>
        <Clock size={16} />
        <span>
          {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
        </span>
        {isEscalated && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Overdue</span>}
      </div>
    );
  }
  
  // Variant: COMPACT (Small badges)
  if (variant === 'compact') {
     return (
        <div className={`flex gap-1 ${isEscalated ? 'text-red-600' : 'text-slate-600'}`}>
            <span className="bg-slate-100 px-2 py-1 rounded text-xs font-mono font-bold">{timeLeft.hours.toString().padStart(2, '0')}</span>:
            <span className="bg-slate-100 px-2 py-1 rounded text-xs font-mono font-bold">{timeLeft.minutes.toString().padStart(2, '0')}</span>:
            <span className="bg-slate-100 px-2 py-1 rounded text-xs font-mono font-bold">{timeLeft.seconds.toString().padStart(2, '0')}</span>
        </div>
     )
  }

  // Variant: CARDS (Big boxes from Stitch Design)
  const boxClass = isEscalated 
    ? "flex h-14 grow items-center justify-center rounded-lg px-3 bg-red-50 border border-red-100" 
    : "flex h-14 grow items-center justify-center rounded-lg px-3 bg-[#f0f2f4]";
  
  const textClass = isEscalated
    ? "text-red-600 text-lg font-bold leading-tight tracking-[-0.015em]"
    : "text-[#111418] text-lg font-bold leading-tight tracking-[-0.015em]";

  return (
    <div className="flex gap-4 py-4 px-0 w-full">
      <div className="flex grow basis-0 flex-col items-stretch gap-2">
        <div className={boxClass}>
          <p className={textClass}>{timeLeft.hours.toString().padStart(2, '0')}</p>
        </div>
        <div className="flex items-center justify-center">
            <p className="text-[#111418] text-sm font-normal leading-normal">Giờ</p>
        </div>
      </div>
      <div className="flex grow basis-0 flex-col items-stretch gap-2">
        <div className={boxClass}>
          <p className={textClass}>{timeLeft.minutes.toString().padStart(2, '0')}</p>
        </div>
        <div className="flex items-center justify-center">
            <p className="text-[#111418] text-sm font-normal leading-normal">Phút</p>
        </div>
      </div>
      <div className="flex grow basis-0 flex-col items-stretch gap-2">
        <div className={boxClass}>
          <p className={textClass}>{timeLeft.seconds.toString().padStart(2, '0')}</p>
        </div>
        <div className="flex items-center justify-center">
            <p className="text-[#111418] text-sm font-normal leading-normal">Giây</p>
        </div>
      </div>
    </div>
  );
};

export default SLACountdown;