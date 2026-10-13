import React, { useState } from 'react';
import { Pin, X, ChevronRight, ChevronLeft, Image, Video, Mic, FileText, CornerDownLeft } from 'lucide-react';
import { Message } from '../types/telegram';

interface PinnedMessageBarProps {
  pinnedMessages: Message[];
  onJumpToMessage: (messageId: string) => void;
  onUnpinMessage: (messageId: string) => void;
  isAdmin: boolean;
}

export const PinnedMessageBar: React.FC<PinnedMessageBarProps> = ({
  pinnedMessages,
  onJumpToMessage,
  onUnpinMessage,
  isAdmin
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!pinnedMessages || pinnedMessages.length === 0) return null;

  // Ensure currentIndex stays within bounds
  const safeIndex = Math.min(currentIndex, pinnedMessages.length - 1);
  const activeMessage = pinnedMessages[safeIndex] || pinnedMessages[0];

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % pinnedMessages.length);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + pinnedMessages.length) % pinnedMessages.length);
  };

  const getMediaPreview = (msg: Message) => {
    if (msg.type === 'photo') return <span className="flex items-center gap-1 text-slate-300"><Image className="w-3 h-3 text-cyan-400" /> تصویر</span>;
    if (msg.type === 'video') return <span className="flex items-center gap-1 text-slate-300"><Video className="w-3 h-3 text-cyan-400" /> ویدیو</span>;
    if (msg.type === 'voice') return <span className="flex items-center gap-1 text-slate-300"><Mic className="w-3 h-3 text-cyan-400" /> پیام صوتی</span>;
    if (msg.type === 'document') return <span className="flex items-center gap-1 text-slate-300"><FileText className="w-3 h-3 text-cyan-400" /> {msg.fileName || 'سند'}</span>;
    return <span className="truncate">{msg.text || 'پیام'}</span>;
  };

  return (
    <div className="relative z-10 w-full bg-[#182330]/95 backdrop-blur-md border-b border-slate-700/60 shadow-md select-none transition-all duration-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 flex items-center justify-between gap-2">
        {/* Clickable jump region */}
        <div
          onClick={() => onJumpToMessage(activeMessage.id)}
          className="flex-1 flex items-center gap-2.5 min-w-0 cursor-pointer group py-0.5"
          title="پرش به پیام سنجاق شده در گفتگو"
        >
          {/* Vertical Telegram accent indicator bar */}
          <div className="w-1 h-8 rounded-full bg-cyan-400 group-hover:bg-cyan-300 transition-colors shadow-sm shadow-cyan-500/50 flex-shrink-0" />

          {/* Pin Icon */}
          <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-300 group-hover:scale-105 transition-transform flex-shrink-0">
            <Pin className="w-3.5 h-3.5 rotate-45" />
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-cyan-400 group-hover:text-cyan-300 transition-colors">
                پیام سنجاق شده
              </span>
              {pinnedMessages.length > 1 && (
                <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded-full bg-cyan-950/80 border border-cyan-800 text-cyan-300">
                  {safeIndex + 1} از {pinnedMessages.length}
                </span>
              )}
            </div>

            <div className="text-xs text-slate-300 flex items-center gap-1 truncate mt-0.5 group-hover:text-white transition-colors">
              <span className="font-semibold text-slate-200">{activeMessage.senderName}:</span>
              <span className="truncate text-slate-400 group-hover:text-slate-200 transition-colors">
                {getMediaPreview(activeMessage)}
              </span>
            </div>
          </div>

          <div className="hidden sm:flex items-center text-[10px] text-slate-400 group-hover:text-cyan-300 gap-1 ml-2 flex-shrink-0">
            <span>مشاهده</span>
            <CornerDownLeft className="w-3 h-3" />
          </div>
        </div>

        {/* Action Controls: Pagination & Unpin */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Next / Prev for multiple pins */}
          {pinnedMessages.length > 1 && (
            <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700/60 ml-1">
              <button
                type="button"
                onClick={handlePrev}
                className="p-1 hover:text-cyan-300 text-slate-400 hover:bg-slate-700/60 rounded transition-colors cursor-pointer"
                title="پیام سنجاق شده قبلی"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="p-1 hover:text-cyan-300 text-slate-400 hover:bg-slate-700/60 rounded transition-colors cursor-pointer"
                title="پیام سنجاق شده بعدی"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Unpin Button (Only for Admins or in private chats) */}
          {isAdmin && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUnpinMessage(activeMessage.id);
              }}
              className="p-1.5 text-slate-400 hover:text-rose-300 hover:bg-rose-500/15 rounded-lg transition-all cursor-pointer"
              title="برداشتن سنجاق این پیام"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
