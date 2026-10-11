import React, { useState } from 'react';
import { MiniApp } from '../types/telegram';
import { X, Sparkles, Zap, RefreshCw, Send, CheckCircle2, ArrowUpRight } from 'lucide-react';

interface MiniAppModalProps {
  app: MiniApp | null;
  isOpen: boolean;
  onClose: () => void;
  userStarsBalance: number;
  onAddStars: (amount: number) => void;
}

export const MiniAppModal: React.FC<MiniAppModalProps> = ({
  app,
  isOpen,
  onClose,
  userStarsBalance,
  onAddStars
}) => {
  // Clicker game state
  const [clickerPoints, setClickerPoints] = useState(1240);
  const [energy, setEnergy] = useState(100);
  const [floatingTaps, setFloatingTaps] = useState<{ id: number; x: number; y: number }[]>([]);

  // Wallet transfer state
  const [recipient, setRecipient] = useState('');
  const [transferAmount, setTransferAmount] = useState('50');
  const [transferSuccess, setTransferSuccess] = useState(false);

  if (!isOpen || !app) return null;

  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (energy <= 0) return;
    setEnergy((prev) => Math.max(0, prev - 1));
    setClickerPoints((prev) => prev + 1);

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newTap = { id: Date.now() + Math.random(), x, y };
    setFloatingTaps((prev) => [...prev, newTap]);
    setTimeout(() => {
      setFloatingTaps((prev) => prev.filter((t) => t.id !== newTap.id));
    }, 800);

    // Give a star every 25 taps
    if ((clickerPoints + 1) % 25 === 0) {
      onAddStars(5);
    }
  };

  const handleSendStars = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseInt(transferAmount);
    if (amt > 0 && userStarsBalance >= amt) {
      onAddStars(-amt);
      setTransferSuccess(true);
      setTimeout(() => {
        setTransferSuccess(false);
        setRecipient('');
      }, 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-[#18222d] border border-slate-700/80 rounded-3xl w-full max-w-lg h-[640px] shadow-2xl flex flex-col overflow-hidden">
        {/* Telegram Mini App Top Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-700/60 bg-[#101822]">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{app.icon}</span>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>{app.title}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                  TMA v8.0
                </span>
              </div>
              <div className="text-[11px] text-slate-400">توسعه‌دهنده: {app.author}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold font-mono">
              ⭐ {userStarsBalance} Stars
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mini App Body */}
        <div className="flex-1 overflow-y-auto p-5 bg-gradient-to-b from-[#18222d] to-[#0f172a] relative">
          {app.type === 'clicker' && (
            <div className="flex flex-col items-center justify-between h-full py-4 text-center">
              <div>
                <h4 className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-1">
                  موجودی توکن کلیکر
                </h4>
                <div className="text-4xl font-extrabold text-white flex items-center justify-center gap-2 font-mono">
                  <span className="text-amber-400">⚡</span>
                  <span>{clickerPoints.toLocaleString()}</span>
                </div>
                <p className="text-xs text-amber-300/80 mt-1">هر ۲۵ تپ = ۵ ستاره تلگرام پاداش!</p>
              </div>

              {/* Tap coin button */}
              <div
                onClick={handleTap}
                className="relative w-52 h-52 rounded-full bg-gradient-to-tr from-amber-600 via-amber-400 to-yellow-300 shadow-2xl shadow-amber-500/40 p-2 cursor-pointer active:scale-95 transition-transform flex items-center justify-center select-none"
              >
                <div className="w-full h-full rounded-full bg-gradient-to-b from-amber-500 to-amber-700 flex flex-col items-center justify-center border-4 border-amber-300/60 shadow-inner">
                  <span className="text-6xl drop-shadow-md">🪙</span>
                  <span className="text-white text-xs font-bold mt-1 tracking-wider uppercase">
                    Tap to Earn
                  </span>
                </div>

                {/* Floating tap damage numbers */}
                {floatingTaps.map((t) => (
                  <span
                    key={t.id}
                    className="absolute text-xl font-extrabold text-white pointer-events-none animate-float-fade font-mono"
                    style={{ left: t.x, top: t.y }}
                  >
                    +1
                  </span>
                ))}
              </div>

              {/* Energy bar */}
              <div className="w-full space-y-1.5 px-4">
                <div className="flex justify-between text-xs text-slate-300 font-mono">
                  <span className="flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>انرژی روزانه:</span>
                  </span>
                  <span>{energy} / 100</span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-200"
                    style={{ width: `${energy}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {app.type === 'wallet' && (
            <div className="space-y-5">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-900/60 to-purple-900/60 border border-purple-500/30 text-white space-y-3">
                <div className="flex justify-between items-center text-xs text-purple-200">
                  <span>موجودی کیف‌پول استارز (Stars)</span>
                  <span className="font-mono text-[10px] bg-purple-500/30 px-2 py-0.5 rounded-full">
                    Mainnet TON / TMA
                  </span>
                </div>
                <div className="text-3xl font-extrabold flex items-center gap-2 font-mono">
                  <span>⭐ {userStarsBalance}</span>
                  <span className="text-xs font-normal text-slate-300">
                    ≈ ${(userStarsBalance * 0.02).toFixed(2)} USD
                  </span>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => onAddStars(100)}
                    className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>شارژ ۱۰۰ ستاره</span>
                  </button>
                </div>
              </div>

              {/* Send Stars form */}
              <form
                onSubmit={handleSendStars}
                className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-4"
              >
                <div className="text-sm font-bold text-white flex items-center gap-1.5">
                  <ArrowUpRight className="w-4 h-4 text-cyan-400" />
                  <span>انتقال مستقیم Stars به کاربر یا کانال</span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-300">شناسه مقصد یا یوزرنیم:</label>
                  <input
                    type="text"
                    placeholder="@username یا آدرس کیف‌پول"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-300">تعداد ستاره:</label>
                  <input
                    type="number"
                    min="1"
                    max={userStarsBalance}
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white outline-none focus:border-cyan-400 font-mono"
                  />
                </div>

                {transferSuccess && (
                  <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-800/40">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>تراکنش با موفقیت در بلاکچین ثبت شد!</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={userStarsBalance < parseInt(transferAmount)}
                  className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white font-medium text-sm rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>تایید و ارسال تراکنش</span>
                </button>
              </form>
            </div>
          )}

          {app.type === 'notes' && (
            <div className="space-y-4">
              <div className="text-sm font-bold text-white">مدیریت تسک‌های تیم فنی CloudPulse</div>
              <div className="space-y-2">
                {[
                  { title: 'پیاده‌سازی ماژول E2EE با Double Ratchet', done: true, tag: 'Security' },
                  { title: 'شاردینگ تایم‌لاین ScyllaDB در کلاستر ۳ گره', done: true, tag: 'Database' },
                  { title: 'اتصال موتور رونویسی Whisper به پیام‌های صوتی', done: true, tag: 'AI/STT' },
                  { title: 'بهینه‌سازی وب‌سوکت با کلاستر Redis PubSub', done: true, tag: 'Network' },
                  { title: 'تست آپلود فایل ۴ گیگابایتی برای اعضای پریمیوم', done: false, tag: 'Premium' }
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-800/70 border border-slate-700/60"
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={item.done}
                        readOnly
                        className="w-4 h-4 accent-cyan-500 rounded"
                      />
                      <span className={`text-xs ${item.done ? 'line-through text-slate-400' : 'text-slate-200'}`}>
                        {item.title}
                      </span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-700 text-slate-300 font-mono">
                      {item.tag}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Telegram WebApp Standard MainButton */}
        <div className="p-4 bg-[#101822] border-t border-slate-700/60">
          <button
            onClick={onClose}
            className="w-full py-3 bg-[#2481cc] hover:bg-[#2072b4] text-white font-bold text-sm rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>بستن مینی‌اپ و بازگشت به چت</span>
          </button>
        </div>
      </div>
    </div>
  );
};
