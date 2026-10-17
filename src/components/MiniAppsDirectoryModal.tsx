import React from 'react';
import { MiniApp } from '../types/telegram';
import { X, Sparkles, ArrowRight, Grid, Zap, Shield } from 'lucide-react';

interface MiniAppsDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  apps: MiniApp[];
  onLaunchApp: (app: MiniApp) => void;
}

export const MiniAppsDirectoryModal: React.FC<MiniAppsDirectoryModalProps> = ({
  isOpen,
  onClose,
  apps,
  onLaunchApp
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-[#1e293b] border border-slate-700/80 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/60 bg-[#0f172a]/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <Grid className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">اکوسیستم GODFATHER Mini Apps (GMA)</h3>
              <p className="text-xs text-slate-400">وب‌اپلیکیشن‌های ساندباکس‌شده با پرداخت Stars و Haptic</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Apps List */}
        <div className="p-6 space-y-3.5 max-h-[480px] overflow-y-auto">
          {apps.map((app) => (
            <div
              key={app.id}
              onClick={() => {
                onLaunchApp(app);
                onClose();
              }}
              className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/60 border border-slate-700/70 hover:border-cyan-500/50 hover:bg-slate-800 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-800 border border-slate-700 flex items-center justify-center text-3xl shadow-inner group-hover:scale-105 transition-transform">
                  {app.icon}
                </div>
                <div>
                  <div className="font-bold text-white text-sm flex items-center gap-2">
                    <span>{app.title}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-mono">
                      {app.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-1">{app.description}</p>
                  <div className="text-[11px] text-slate-500 mt-0.5">توسعه‌دهنده: {app.author}</div>
                </div>
              </div>

              <button className="px-4 py-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-bold text-xs group-hover:bg-cyan-500 group-hover:text-white transition-all flex items-center gap-1">
                <span>اجرا</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-700/60 bg-[#0f172a]/60 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>پروتکل امن postMessage با مجوزهای دسترسی محدود Iframe Sandbox</span>
          </span>
          <button onClick={onClose} className="hover:text-white transition-colors">
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
