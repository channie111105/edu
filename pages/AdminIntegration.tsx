
import React from 'react';
import { 
  Copy, 
  RefreshCw, 
  Facebook, 
  Video, 
  Chrome, 
  Mail, 
  Settings,
  Link,
  CheckCircle2
} from 'lucide-react';

const AdminIntegration: React.FC = () => {
  const [webhookUrl, setWebhookUrl] = React.useState('https://api.ulacrm.com/v1/webhooks/catch/8f92-120a-4b21');
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = () => {
    const newId = Math.random().toString(36).substring(7);
    setWebhookUrl(`https://api.ulacrm.com/v1/webhooks/catch/${newId}`);
  };

  const INTEGRATIONS = [
    {
      id: 'fb_lead',
      name: 'Facebook Lead Form',
      desc: 'Tự động đồng bộ Lead từ Form quảng cáo Facebook về CRM.',
      icon: Facebook,
      iconColor: 'text-blue-600',
      connected: true
    },
    {
      id: 'fb_inbox',
      name: 'Facebook Inbox',
      desc: 'Quản lý tin nhắn từ Fanpage tập trung tại hệ thống.',
      icon: Facebook,
      iconColor: 'text-blue-600',
      connected: false
    },
    {
      id: 'tiktok',
      name: 'TikTok Ads',
      desc: 'Theo dõi và tối ưu hóa chuyển đổi từ chiến dịch TikTok.',
      icon: Video,
      iconColor: 'text-black',
      connected: false
    },
    {
      id: 'google',
      name: 'Google Ads',
      desc: 'Đồng bộ dữ liệu chuyển đổi và từ khóa Google Ads.',
      icon: Chrome,
      iconColor: 'text-red-500',
      connected: true
    },
    {
      id: 'smtp',
      name: 'Email SMTP',
      desc: 'Cấu hình máy chủ gửi Email Marketing và Thông báo hệ thống.',
      icon: Mail,
      iconColor: 'text-slate-600',
      connected: true
    },
    {
      id: 'zalo',
      name: 'Zalo OA',
      desc: 'Kết nối Zalo Official Account để gửi tin nhắn CSKH.',
      icon: MessageSquareIcon, // Placeholder for Zalo
      iconColor: 'text-blue-500',
      connected: false
    }
  ];

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#0d141b] font-sans overflow-y-auto">
      <div className="flex flex-1 justify-center py-5">
        <div className="flex flex-col max-w-[960px] flex-1 px-4 md:px-8">
          
          {/* Header */}
          <div className="flex flex-wrap justify-between gap-3 p-4">
            <div className="flex min-w-72 flex-col gap-3">
              <p className="text-[#0d141b] tracking-[-0.015em] text-[32px] font-bold leading-tight">Cấu hình Tích hợp & Webhook</p>
              <p className="text-[#4c739a] text-sm font-normal leading-normal">Kết nối các kênh tiếp thị và truyền thông của bạn vào hệ thống tập trung.</p>
            </div>
          </div>

          {/* Webhook Section */}
          <div className="p-4">
            <div className="flex flex-col md:flex-row items-stretch justify-between gap-6 rounded-lg">
              <div className="flex flex-[2_2_0px] flex-col gap-4 justify-center">
                <div className="flex flex-col gap-1">
                  <p className="text-[#0d141b] text-base font-bold leading-tight">Trình tạo Webhook URL</p>
                  <p className="text-[#4c739a] text-sm font-normal leading-normal">Sử dụng URL này để tích hợp với Landing Page (Ladipage, WordPress) và các hệ thống bên ngoài.</p>
                </div>
                <button
                  onClick={handleRegenerate}
                  className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 px-4 bg-[#e7edf3] text-[#0d141b] text-sm font-medium leading-normal w-fit hover:bg-slate-200 transition-colors gap-2"
                >
                  <RefreshCw size={16} />
                  <span className="truncate">Tạo lại URL</span>
                </button>
              </div>
              <div
                className="w-full md:w-1/3 bg-center bg-no-repeat bg-cover rounded-lg min-h-[160px] border border-slate-200 shadow-sm"
                style={{ backgroundImage: 'url("https://cdn.dribbble.com/users/1162077/screenshots/3848914/media/7473062b9a7db2bd88746c2d433b9247.png?resize=800x600&vertical=center")' }}
              ></div>
            </div>
          </div>

          {/* Webhook Input */}
          <div className="flex max-w-[600px] flex-wrap items-end gap-4 px-4 py-3">
            <label className="flex flex-col min-w-40 flex-1">
              <div className="flex w-full flex-1 items-stretch rounded-lg shadow-sm">
                <input
                  readOnly
                  className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-l-lg text-[#0d141b] focus:outline-0 focus:ring-2 focus:ring-blue-100 border border-[#cfdbe7] bg-white h-14 placeholder:text-[#4c739a] px-4 text-sm font-mono leading-normal"
                  value={webhookUrl}
                />
                <button
                  onClick={handleCopy}
                  className="flex items-center justify-center px-4 bg-[#e7edf3] border border-l-0 border-[#cfdbe7] rounded-r-lg hover:bg-slate-200 transition-colors text-[#4c739a] hover:text-[#0d141b]"
                  title="Sao chép"
                >
                  {copied ? <CheckCircle2 size={24} className="text-green-600" /> : <Copy size={24} />}
                </button>
              </div>
            </label>
          </div>

          {/* Integration Grid */}
          <h2 className="text-[#0d141b] text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-8">Kênh tích hợp (Channels)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {INTEGRATIONS.map((item) => (
              <div key={item.id} className="flex flex-col gap-4 rounded-xl border border-[#cfdbe7] bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                   <div className={`${item.iconColor}`}>
                      <item.icon size={32} />
                   </div>
                   {item.connected ? (
                      <span className="bg-green-50 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase border border-green-100">Đã kết nối</span>
                   ) : (
                      <span className="bg-slate-50 text-slate-500 text-[10px] font-bold px-2 py-1 rounded-full uppercase border border-slate-100">Chưa kết nối</span>
                   )}
                </div>
                <div className="flex flex-col gap-1 min-h-[60px]">
                  <h2 className="text-[#0d141b] text-base font-bold leading-tight">{item.name}</h2>
                  <p className="text-[#4c739a] text-xs font-normal leading-normal line-clamp-2">{item.desc}</p>
                </div>
                <button className={`mt-auto w-full py-2.5 rounded-lg text-sm font-bold tracking-[0.015em] transition-colors border ${item.connected ? 'bg-white border-[#cfdbe7] text-[#0d141b] hover:bg-slate-50' : 'bg-[#1380ec] border-transparent text-white hover:bg-blue-700'}`}>
                  {item.connected ? 'Cấu hình' : 'Kết nối ngay'}
                </button>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
};

// Custom Zalo Icon since Lucide doesn't have it
const MessageSquareIcon = ({ size, className }: { size: number, className?: string }) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
);

export default AdminIntegration;
