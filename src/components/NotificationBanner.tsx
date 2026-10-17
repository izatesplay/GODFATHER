import React, { useEffect, useState } from 'react';
import { Volume2, X, MessageSquare, Sparkles } from 'lucide-react';

export interface InAppNotification {
  id: string;
  chatId: string;
  senderName: string;
  senderAvatar?: string;
  text: string;
  type?: string;
  timestamp?: string;
  isBroadcast?: boolean;
}

interface NotificationBannerProps {
  notification: InAppNotification | null;
  onClose: () => void;
  onOpenChat: (chatId: string) => void;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({
  notification,
  onClose,
  onOpenChat
}) => {
  const [progress, setProgress] = useState(100);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!notification) return;
    setProgress(100);

    const DURATION = 4500;
    const INTERVAL = 50;
    const step = (INTERVAL / DURATION) * 100;

    const timer = setInterval(() => {
      if (isHovered) return;
      setProgress((prev) => {
        if (prev <= step) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - step;
      });
    }, INTERVAL);

    return () => clearInterval(timer);
  }, [notification, isHovered, onClose]);

  if (!notification) return null;

  return (
    <div
      role="alert"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => {
        onOpenChat(notification.chatId);
        onClose();
      }}
      className="fixed top-3 left-1/2 -translate-x-1/2 z-[99999] w-[95%] max-w-md cursor-pointer select-none transition-all duration-300 animate-in fade-in slide-in-from-top-6 duration-300 drop-shadow-2xl"
    >
      <div className="relative overflow-hidden rounded-2xl bg-[#0f172a]/95 backdrop-blur-2xl border border-cyan-500/50 shadow-2xl shadow-cyan-500/25 text-white p-3.5 hover:border-cyan-400 hover:shadow-cyan-500/40 transition-all group">
        {/* Subtle glowing ambient background */}
        <div className="absolute -top-10 -right-10 w-28 h-28 bg-cyan-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-cyan-400/80 shadow-md bg-slate-800">
              <img
                src={notification.senderAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
                alt={notification.senderName}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#1b2735] shadow-[0_0_6px_rgba(52,211,153,0.9)] animate-pulse" />
          </div>

          {/* Details */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold uppercase tracking-wider flex items-center gap-0.5 flex-shrink-0">
                  <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
                  <span>GODFATHER SQUAD</span>
                </span>
                {notification.isBroadcast && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                    اطلاعیه ویژه
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                {notification.timestamp || 'هم‌اکنون'}
              </span>
            </div>

            <div className="mt-1 flex items-center justify-between gap-2">
              <h4 className="font-extrabold text-sm text-white truncate group-hover:text-cyan-300 transition-colors">
                {notification.senderName}
              </h4>
              <div className="flex items-center gap-1 text-slate-400 text-xs">
                <Volume2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              </div>
            </div>

            <p className="text-xs text-slate-300 mt-0.5 line-clamp-2 leading-relaxed">
              {notification.text}
            </p>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors cursor-pointer flex-shrink-0"
            title="بستن اعلان"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress bar line */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-800">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-400 transition-all duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
