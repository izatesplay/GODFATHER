import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Smartphone, 
  Apple, 
  Check, 
  Share2, 
  PlusSquare, 
  X, 
  Sparkles,
  Zap,
  ShieldCheck
} from 'lucide-react';

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
  isInstalled: boolean;
}

export const PwaInstallModal: React.FC<PwaInstallModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  isInstalled
}) => {
  const [isIOS, setIsIOS] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  useEffect(() => {
    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(isIosDevice);
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setInstallSuccess(true);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="bg-[#1e293b] border border-cyan-500/40 rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-20 -right-20 w-44 h-44 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-44 h-44 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/60 relative">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#2AABEE] to-[#229ED9] flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <Smartphone className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <span>نصب وب‌اپلیکیشن (Web2App)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                  PWA
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                بدون نیاز به فایل APK • نصب آنی روی اندروید و آیفون
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Installed State */}
        {isInstalled || installSuccess ? (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Check className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-white">برنامه روی گوشی شما نصب شده است!</h4>
            <p className="text-xs text-emerald-200/80">
              می‌توانید GODFATHER SQUAD را مستقیماً مانند یک اپلیکیشن بومی از صفحه اصلی گوشی خود اجرا کنید.
            </p>
          </div>
        ) : (
          <>
            {/* Features Highlight */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-2 text-slate-300">
                <Zap className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>سرعت فوق‌العاده و بدون لگ</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-2 text-slate-300">
                <ShieldCheck className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <span>بدون نیاز به دانلود فایل APK</span>
              </div>
            </div>

            {/* Platform Instructions */}
            {isIOS ? (
              /* iOS / iPhone instructions */
              <div className="space-y-3 p-4 rounded-2xl bg-slate-900/80 border border-slate-700/60">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                  <Apple className="w-4 h-4" />
                  <span>راهنمای نصب در آیفون (iOS Safari):</span>
                </div>
                <div className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-cyan-400 font-bold flex items-center justify-center flex-shrink-0 text-[11px] mt-0.5">
                      ۱
                    </span>
                    <p className="flex-1">
                      در پایین مرورگر سافاری روی دکمه <strong className="text-white">اشتراک‌گذاری (Share)</strong> <Share2 className="w-3.5 h-3.5 inline mx-1 text-cyan-400" /> ضربه بزنید.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-cyan-400 font-bold flex items-center justify-center flex-shrink-0 text-[11px] mt-0.5">
                      ۲
                    </span>
                    <p className="flex-1">
                      به سمت پایین اسکرول کرده و گزینه <strong className="text-white">«Add to Home Screen»</strong> (افزودن به صفحه اصلی) <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-cyan-400" /> را انتخاب کنید.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-cyan-400 font-bold flex items-center justify-center flex-shrink-0 text-[11px] mt-0.5">
                      ۳
                    </span>
                    <p className="flex-1">
                      در بالا سمت راست روی <strong className="text-cyan-400">Add</strong> ضربه بزنید. آیکون برنامه در صفحه گوشی اضافه خواهد شد.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* Android / Chromium / Desktop instructions */
              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-700/60 space-y-2">
                  <h4 className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4" />
                    <span>نصب در گوشی اندروید یا کامپیوتر:</span>
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    با کلیک روی دکمه زیر، برنامه مستقیماً در قالب Web2App روی صفحه اصلی گوشی شما نصب می‌شود و مستقل از مرورگر در تمام صفحه اجرا خواهد شد.
                  </p>
                </div>

                <button
                  onClick={handleInstallClick}
                  disabled={!deferredPrompt}
                  className={`w-full py-3.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer ${
                    deferredPrompt
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/25'
                      : 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
                  }`}
                >
                  <Download className="w-4 h-4" />
                  <span>
                    {deferredPrompt
                      ? 'نصب مستقیم روی گوشی (افزودن به صفحه اصلی)'
                      : 'برای نصب، از منوی سه نقطه مرورگر گزینه Add to Home screen را بزنید'}
                  </span>
                </button>
              </div>
            )}
          </>
        )}

        <div className="pt-2 text-center">
          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            بستن پنجره
          </button>
        </div>
      </div>
    </div>
  );
};
