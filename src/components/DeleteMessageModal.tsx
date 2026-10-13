import React from 'react';
import { X, Trash2, Users, User, AlertTriangle } from 'lucide-react';
import { Message } from '../types/telegram';

interface DeleteMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
  onDeleteForEveryone: () => void;
  onDeleteForMeOnly: () => void;
  chatTitle?: string;
  isGroupChat?: boolean;
}

export const DeleteMessageModal: React.FC<DeleteMessageModalProps> = ({
  isOpen,
  onClose,
  messages,
  onDeleteForEveryone,
  onDeleteForMeOnly,
  chatTitle = 'طرف مقابل',
  isGroupChat = false
}) => {
  if (!isOpen || messages.length === 0) return null;

  const count = messages.length;
  const isMultiple = count > 1;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in select-none"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-[#17212b] border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-700/60 bg-[#1e2c3a] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center shadow-inner">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                {isMultiple ? `حذف ${count} پیام انتخاب شده` : 'حذف پیام'}
              </h3>
              <p className="text-[11px] text-slate-400">
                نحوه پاک‌سازی پیام را از بین گزینه‌های زیر انتخاب کنید
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content & Options */}
        <div className="p-4 sm:p-5 space-y-3.5">
          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 leading-relaxed">
            {isMultiple ? (
              <span>شما در حال حذف <strong>{count}</strong> پیام هستید. مایلید این پیام‌ها چگونه حذف شوند؟</span>
            ) : (
              <span>
                متن پیام: "
                <span className="text-slate-100 font-medium">
                  {messages[0].text ? (messages[0].text.length > 60 ? `${messages[0].text.substring(0, 60)}...` : messages[0].text) : 'رسانه / فایل'}
                </span>
                "
              </span>
            )}
          </div>

          {/* Option 1: Delete for Everyone / Both sides (دو طرفه) */}
          <button
            type="button"
            onClick={() => {
              onDeleteForEveryone();
              onClose();
            }}
            className="w-full text-right p-3.5 rounded-2xl bg-gradient-to-r from-rose-950/30 to-slate-900/80 hover:from-rose-900/40 hover:to-slate-800/90 border border-rose-700/40 hover:border-rose-500/60 transition-all flex items-start gap-3.5 cursor-pointer group shadow-sm hover:shadow-md hover:shadow-rose-950/40"
          >
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:scale-105 group-hover:bg-rose-500 group-hover:text-white transition-all">
              <Users className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-rose-300 group-hover:text-rose-200 flex items-center gap-1.5">
                <span>پاک کردن دو طرفه (برای همه)</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {isGroupChat ? 'تمام اعضا' : 'دو طرف'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                پیام هم برای شما و هم برای {isGroupChat ? 'تمام اعضای گروه' : `«${chatTitle}»`} به طور کامل پاک می‌شود.
              </p>
            </div>
          </button>

          {/* Option 2: Delete for Me Only (یک طرفه) */}
          <button
            type="button"
            onClick={() => {
              onDeleteForMeOnly();
              onClose();
            }}
            className="w-full text-right p-3.5 rounded-2xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-700/60 hover:border-cyan-500/50 transition-all flex items-start gap-3.5 cursor-pointer group shadow-sm hover:shadow-md"
          >
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:scale-105 group-hover:bg-cyan-500 group-hover:text-white transition-all">
              <User className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-slate-200 group-hover:text-cyan-300 flex items-center gap-1.5">
                <span>پاک کردن فقط برای خودم</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  یک طرفه
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                پیام فقط از تاریخچه گفتگوی شما حذف شده و برای {isGroupChat ? 'سایر اعضا' : 'طرف مقابل'} همچنان باقی می‌ماند.
              </p>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#131c26] border-t border-slate-800/80 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            انصراف
          </button>
        </div>
      </div>
    </div>
  );
};
