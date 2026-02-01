import React from 'react';
import { CheckCircle2, XCircle, AlertCircle, Info } from 'lucide-react';

interface ToastProps {
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
    React.useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const styles = {
        success: 'bg-green-50 border-green-500 text-green-900',
        error: 'bg-red-50 border-red-500 text-red-900',
        warning: 'bg-amber-50 border-amber-500 text-amber-900',
        info: 'bg-blue-50 border-blue-500 text-blue-900'
    };

    const icons = {
        success: <CheckCircle2 size={20} className="text-green-600" />,
        error: <XCircle size={20} className="text-red-600" />,
        warning: <AlertCircle size={20} className="text-amber-600" />,
        info: <Info size={20} className="text-blue-600" />
    };

    return (
        <>
            <style>{`
            @keyframes slideIn {
               from {
                  transform: translateX(100%);
                  opacity: 0;
               }
               to {
                  transform: translateX(0);
                  opacity: 1;
               }
            }
            .animate-slide-in {
               animation: slideIn 0.3s ease-out;
            }
         `}</style>

            <div className={`fixed top-4 right-4 z-50 min-w-[300px] max-w-md p-4 rounded-lg border-l-4 shadow-lg ${styles[type]} animate-slide-in`}>
                <div className="flex items-start gap-3">
                    {icons[type]}
                    <div className="flex-1">
                        <p className="text-sm font-medium whitespace-pre-line">{message}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <XCircle size={16} />
                    </button>
                </div>
            </div>
        </>
    );
};

export default Toast;
