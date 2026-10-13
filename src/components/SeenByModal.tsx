import React, { useState } from 'react';
import { Eye, X, CheckCheck, Crown, Shield, ShieldCheck, User, Search } from 'lucide-react';
import { MessageSeenBy } from '../types/telegram';

interface SeenByModalProps {
  isOpen: boolean;
  onClose: () => void;
  seenBy: MessageSeenBy[];
  messageTextSnippet?: string;
}

export const SeenByModal: React.FC<SeenByModalProps> = ({
  isOpen,
  onClose,
  seenBy,
  messageTextSnippet
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredList = (seenBy || []).filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (item.name || '').toLowerCase().includes(q) ||
      (item.username || '').toLowerCase().includes(q)
    );
  });

  const getRoleBadge = (role?: string) => {
    if (role === 'owner') {
      return (
        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
          <Crown className="w-2.5 h-2.5 text-amber-400" />
          <span>مالک گروه</span>
        </span>
      );
    }
    if (role === 'admin') {
      return (
        <span className="flex items-center gap-1 text-[10px] font-bold text-cyan-300 bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 rounded-full">
          <ShieldCheck className="w-2.5 h-2.5 text-cyan-400" />
          <span>مدیر</span>
        </span>
      );
    }
    if (role === 'moderator') {
      return (
        <span className="flex items-center gap-1 text-[10px] font-bold text-purple-300 bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 rounded-full">
          <Shield className="w-2.5 h-2.5 text-purple-400" />
          <span>ناظم</span>
        </span>
      );
    }
    return (
      <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
        عضو
      </span>
    );
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in select-none"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-sm bg-[#17212b] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-700/60 bg-[#1e2c3a] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>خوانده شده توسط</span>
                <span className="font-mono text-cyan-400">({seenBy.length} نفر)</span>
              </h3>
              {messageTextSnippet && (
                <p className="text-[11px] text-slate-400 truncate max-w-[200px]">
                  {messageTextSnippet}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search input if multiple readers */}
        {seenBy.length > 4 && (
          <div className="px-3 py-2 border-b border-slate-800 bg-slate-900/40">
            <div className="flex items-center gap-2 bg-[#24303f] px-3 py-1.5 rounded-xl border border-slate-700/60 focus-within:border-cyan-400">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="جستجو در خوانندگان پیام..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-xs text-white placeholder-slate-400 w-full outline-none"
              />
            </div>
          </div>
        )}

        {/* Readers List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-1">
          {filteredList.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              کاربری با این مشخصات یافت نشد
            </div>
          ) : (
            filteredList.map((viewer) => (
              <div 
                key={viewer.id} 
                className="flex items-center justify-between p-2.5 hover:bg-slate-800/40 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative">
                    <img
                      src={viewer.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                      alt={viewer.name}
                      className="w-10 h-10 rounded-full object-cover border border-slate-600/60"
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-cyan-500 border-2 border-[#17212b] flex items-center justify-center">
                      <CheckCheck className="w-2 h-2 text-white" />
                    </div>
                  </div>

                  <div className="min-w-0 flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white truncate max-w-[130px]">
                        {viewer.name}
                      </span>
                      {getRoleBadge(viewer.role)}
                    </div>
                    {viewer.username && (
                      <span className="text-[11px] text-cyan-400/90 font-mono truncate" dir="ltr">
                        @{viewer.username}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-left flex-shrink-0">
                  <span className="text-[11px] font-mono text-slate-400 bg-slate-800/70 px-2 py-0.5 rounded-md border border-slate-700/50">
                    {viewer.seenAt}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#1e2c3a] border-t border-slate-700/60 text-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
