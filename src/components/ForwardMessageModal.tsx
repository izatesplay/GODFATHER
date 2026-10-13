import React, { useState } from 'react';
import { X, Search, Share2, Check, Bookmark, Layers } from 'lucide-react';
import { Chat, Message } from '../types/telegram';
import { getSenderFriendlyName } from '../utils/senderHelper';

interface ForwardMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  messageToForward?: Message | null;
  messagesToForward?: Message[];
  chats: Chat[];
  onForward: (targetChatId: string, messages: Message[]) => void;
}

export const ForwardMessageModal: React.FC<ForwardMessageModalProps> = ({
  isOpen,
  onClose,
  messageToForward,
  messagesToForward,
  chats,
  onForward
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [isSent, setIsSent] = useState(false);

  // Consolidate messages to forward
  const listToForward: Message[] = 
    messagesToForward && messagesToForward.length > 0 
      ? messagesToForward 
      : messageToForward 
      ? [messageToForward] 
      : [];

  if (!isOpen || listToForward.length === 0) return null;

  const isMultiple = listToForward.length > 1;

  const savedChatExists = chats.some((c) => c.id === 'chat_saved');
  const allChats = savedChatExists 
    ? chats 
    : [
        {
          id: 'chat_saved',
          type: 'private' as const,
          title: 'پیام‌های ذخیره شده (Saved Messages)',
          avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
          unreadCount: 0,
          isPinned: true,
          isMuted: false
        },
        ...chats
      ];

  const sortedChats = [...allChats].sort((a, b) => {
    if (a.id === 'chat_saved') return -1;
    if (b.id === 'chat_saved') return 1;
    return 0;
  });

  const filteredChats = sortedChats.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.username && c.username.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSendForward = (chatId: string) => {
    setSelectedChatId(chatId);
    onForward(chatId, listToForward);
    setIsSent(true);
    setTimeout(() => {
      setIsSent(false);
      setSelectedChatId(null);
      onClose();
    }, 600);
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in select-none"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-[#17212b] border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-700/60 bg-[#1e2c3a] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center shadow-inner">
              {isMultiple ? <Layers className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {isMultiple ? `فوروارد ${listToForward.length} پیام` : 'فوروارد پیام (Forward)'}
              </h3>
              <p className="text-[11px] text-slate-400">گفتگوی مقصد را برای ارسال پیام انتخاب کنید</p>
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

        {/* Message preview snippet */}
        <div className="p-3 bg-slate-900/70 border-b border-slate-800 text-xs text-slate-300">
          {isMultiple ? (
            <div className="flex items-center justify-between">
              <span className="font-bold text-cyan-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                {listToForward.length} پیام انتخاب شده برای ارسال
              </span>
              <span className="text-[11px] text-slate-400 truncate max-w-[180px]">
                از: {Array.from(new Set(listToForward.map((m) => getSenderFriendlyName(m.senderName)))).join(', ')}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-bold text-cyan-400 flex-shrink-0">
                نقل قول از {getSenderFriendlyName(listToForward[0].senderName)}:
              </span>
              <span className="truncate text-slate-300">
                {listToForward[0].text ||
                  (listToForward[0].type === 'photo'
                    ? '📷 عکس'
                    : listToForward[0].type === 'voice'
                    ? '🎤 پیام صوتی'
                    : '📎 فایل')}
              </span>
            </div>
          )}
        </div>

        {/* Search Input */}
        <div className="p-3 border-b border-slate-800">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجوی گفتگو یا کانال..."
              className="w-full bg-[#0e1621] border border-slate-700/70 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400"
            />
          </div>
        </div>

        {/* Chats List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredChats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => handleSendForward(chat.id)}
              disabled={isSent}
              className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-800/70 transition-colors text-right cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative w-10 h-10 rounded-full overflow-hidden border border-slate-700 flex-shrink-0">
                  <img src={chat.avatar} alt={chat.title} className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-xs sm:text-sm text-white truncate group-hover:text-cyan-300 transition-colors flex items-center gap-1.5">
                    {chat.id === 'chat_saved' && <Bookmark className="w-3.5 h-3.5 text-cyan-400 inline" />}
                    <span>{chat.title}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {chat.type === 'group' || chat.type === 'supergroup'
                      ? 'گروه'
                      : chat.type === 'channel'
                      ? 'کانال'
                      : chat.id === 'chat_saved'
                      ? 'فضای ابری ذخیره‌سازی'
                      : 'گفتگوی خصوصی'}
                  </div>
                </div>
              </div>

              {selectedChatId === chat.id && isSent ? (
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center animate-in zoom-in">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
              ) : (
                <div className="p-2 rounded-xl text-slate-400 group-hover:text-cyan-300 group-hover:bg-slate-700/50 transition-colors">
                  <Share2 className="w-4 h-4" />
                </div>
              )}
            </button>
          ))}

          {filteredChats.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-500">
              گفتگویی با این عنوان پیدا نشد.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
