import React, { useState, useEffect } from 'react';
import { Story } from '../types/telegram';
import { X, Eye, EyeOff, Heart, Send, Sparkles, ChevronRight, ChevronLeft } from 'lucide-react';

interface StoryViewerProps {
  stories: Story[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  isPremiumUser: boolean;
  onOpenCreateStory?: () => void;
}

export const StoryViewer: React.FC<StoryViewerProps> = ({
  stories,
  initialIndex = 0,
  isOpen,
  onClose,
  isPremiumUser,
  onOpenCreateStory
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isStealth, setIsStealth] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [reactionSent, setReactionSent] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && stories.length > 0) {
      setCurrentIndex(Math.min(Math.max(0, initialIndex), Math.max(0, stories.length - 1)));
      setProgress(0);
    }
  }, [initialIndex, isOpen, stories.length]);

  // Story progression timer (5 seconds per story: 2% every 100ms)
  useEffect(() => {
    if (!isOpen || isPaused || stories.length === 0) return;

    const interval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 2, 100));
    }, 100);

    return () => clearInterval(interval);
  }, [isOpen, isPaused, stories.length]);

  // Handle progression when progress reaches 100%
  useEffect(() => {
    if (progress >= 100 && isOpen && stories.length > 0) {
      if (currentIndex < stories.length - 1) {
        setCurrentIndex((curr) => curr + 1);
        setProgress(0);
      } else {
        onClose();
      }
    }
  }, [progress, currentIndex, stories.length, isOpen, onClose]);

  if (!isOpen) return null;

  if (stories.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in select-none">
        <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl relative">
          <button
            onClick={onClose}
            className="absolute top-4 left-4 w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 text-cyan-400 mx-auto flex items-center justify-center text-3xl shadow-inner">
            📷
          </div>
          <h3 className="font-extrabold text-white text-base">استوری‌ای موجود نیست</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            هنوز استوری فعالی در این بخش ثبت نشده است. می‌توانید با زدن روی دکمه زیر استوری جدید منتشر کنید.
          </p>
          {onOpenCreateStory && (
            <button
              onClick={() => {
                onClose();
                onOpenCreateStory();
              }}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              افزودن استوری جدید
            </button>
          )}
        </div>
      </div>
    );
  }

  const currentStory = stories[currentIndex] || stories[0];
  if (!currentStory) return null;

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
    }
  };

  const handleSendReaction = (emoji: string) => {
    setReactionSent(emoji);
    setTimeout(() => setReactionSent(null), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-200 select-none">
      <div
        className="relative w-full max-w-md h-[85vh] max-h-[780px] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between"
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Story Background Image */}
        <div className="absolute inset-0">
          <img
            src={currentStory.mediaUrl}
            alt="Story content"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/80 pointer-events-none" />
        </div>

        {/* Top: Progress Bars & User Profile */}
        <div className="relative z-10 p-4 space-y-3">
          {/* Progress Segments */}
          <div className="flex gap-1.5 items-center">
            {stories.map((_, idx) => (
              <div key={idx} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-100 ease-linear"
                  style={{
                    width:
                      idx === currentIndex
                        ? `${progress}%`
                        : idx < currentIndex
                        ? '100%'
                        : '0%'
                  }}
                />
              </div>
            ))}
          </div>

          {/* Profile Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full border-2 border-cyan-400 overflow-hidden">
                <img
                  src={currentStory.userAvatar}
                  alt={currentStory.userName}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <div className="text-white font-semibold text-sm flex items-center gap-1.5">
                  <span>{currentStory.userName}</span>
                  {isPremiumUser && (
                    <span className="text-[10px] px-1.5 py-0.2 bg-gradient-to-r from-amber-400 to-amber-600 text-black font-bold rounded-full">
                      ★
                    </span>
                  )}
                </div>
                <div className="text-xs text-white/70">{currentStory.timestamp}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Premium Stealth Mode Button */}
              {isPremiumUser && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsStealth(!isStealth);
                  }}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    isStealth
                      ? 'bg-purple-600/90 text-white border-purple-400'
                      : 'bg-black/50 text-slate-300 border-white/20 hover:text-white'
                  }`}
                  title="حالت روح (Stealth Mode) پریمیوم: پنهان کردن بازدید از صاحب استوری"
                >
                  {isStealth ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{isStealth ? 'روح فعال' : 'حالت روح'}</span>
                </button>
              )}

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Center Tap Navigation Zones */}
        <div className="relative z-10 flex-1 flex">
          <div
            className="w-1/3 h-full cursor-pointer flex items-center justify-start p-2 opacity-0 hover:opacity-100 transition-opacity"
            onClick={handlePrev}
          >
            <ChevronRight className="w-8 h-8 text-white/50" />
          </div>
          <div className="w-1/3 h-full" />
          <div
            className="w-1/3 h-full cursor-pointer flex items-center justify-end p-2 opacity-0 hover:opacity-100 transition-opacity"
            onClick={handleNext}
          >
            <ChevronLeft className="w-8 h-8 text-white/50" />
          </div>
        </div>

        {/* Animated reaction pop */}
        {reactionSent && (
          <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none animate-bounce">
            <span className="text-7xl drop-shadow-2xl">{reactionSent}</span>
          </div>
        )}

        {/* Bottom: Caption & Reply / Reactions */}
        <div className="relative z-10 p-4 space-y-3">
          {currentStory.caption && (
            <div className="p-3 rounded-2xl bg-black/60 backdrop-blur-md text-white text-sm leading-relaxed border border-white/10">
              {currentStory.caption}
            </div>
          )}

          {/* Quick reactions strip */}
          <div className="flex items-center justify-center gap-3 py-1">
            {['❤️', '🔥', '🎉', '💎', '🚀', '😍'].map((emoji) => (
              <button
                key={emoji}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSendReaction(emoji);
                }}
                className="text-2xl hover:scale-130 transition-transform active:scale-95 cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Reply input */}
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="ارسال پیام به استوری..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="w-full bg-white/20 backdrop-blur-md text-white placeholder-white/60 text-sm px-4 py-2.5 rounded-full outline-none border border-white/20 focus:border-cyan-400"
              />
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (replyText.trim()) {
                  handleSendReaction('💬');
                  setReplyText('');
                }
              }}
              className="w-10 h-10 rounded-full bg-cyan-500 hover:bg-cyan-400 text-white flex items-center justify-center transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
