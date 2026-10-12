import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  X, 
  ChevronUp, 
  ChevronDown, 
  Calendar, 
  Sparkles, 
  ListFilter, 
  Clock, 
  Check, 
  MessageSquare
} from 'lucide-react';
import { Message, Chat } from '../types/telegram';
import { searchMessages, SearchSortBy, SearchResultItem } from '../utils/chatSearch';

interface ChatSearchBarProps {
  isOpen: boolean;
  onClose: () => void;
  chat: Chat;
  messages: Message[];
  onSelectMessage: (messageId: string) => void;
  activeTopicId?: string;
}

export const ChatSearchBar: React.FC<ChatSearchBarProps> = ({
  isOpen,
  onClose,
  chat,
  messages,
  onSelectMessage,
  activeTopicId
}) => {
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<SearchSortBy>('relevance');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showResultsList, setShowResultsList] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input automatically when search opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setShowResultsList(false);
      setCurrentIndex(0);
    }
  }, [isOpen]);

  // Execute search for current chat messages
  const searchResults: SearchResultItem[] = React.useMemo(() => {
    if (!query.trim() || !chat || !chat.id) return [];
    return searchMessages(query, { [chat.id]: messages || [] }, [chat], {
      chatId: chat.id,
      sortBy,
      topicId: activeTopicId
    });
  }, [query, messages, chat, sortBy, activeTopicId]);

  // Keep index within bounds when results change
  useEffect(() => {
    if (searchResults.length > 0) {
      if (currentIndex >= searchResults.length) {
        setCurrentIndex(0);
      }
    } else {
      setCurrentIndex(0);
    }
  }, [searchResults.length]);

  // Jump to active result
  const jumpToResult = (index: number) => {
    if (searchResults.length === 0) return;
    const clampedIndex = (index + searchResults.length) % searchResults.length;
    setCurrentIndex(clampedIndex);
    const targetItem = searchResults[clampedIndex];
    if (targetItem) {
      onSelectMessage(targetItem.message.id);
    }
  };

  const handleNext = () => {
    jumpToResult(currentIndex + 1);
  };

  const handlePrev = () => {
    jumpToResult(currentIndex - 1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        handlePrev();
      } else {
        handleNext();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="relative z-30 bg-[#17212b] border-b border-slate-800 shadow-md animate-in slide-in-from-top-2 duration-150">
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-2 flex flex-wrap items-center gap-2">
        {/* Search Input Box */}
        <div className="flex-1 min-w-[200px] flex items-center bg-[#0e1621] rounded-xl px-3 py-1.5 border border-slate-700/80 focus-within:border-cyan-400 transition-colors">
          <Search className="w-4 h-4 text-slate-400 ml-2 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`جستجو در پیام‌های ${chat.title}...`}
            className="w-full bg-transparent text-xs text-white placeholder-slate-400 outline-none"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="p-0.5 text-slate-400 hover:text-white rounded-md transition-colors cursor-pointer"
              title="پاک کردن"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Sort Controls (Relevance vs Date) */}
        <div className="flex items-center bg-[#0e1621] rounded-xl p-0.5 border border-slate-700/80">
          <button
            onClick={() => setSortBy('relevance')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
              sortBy === 'relevance'
                ? 'bg-cyan-500/20 text-cyan-300 font-bold shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="مرتب‌سازی بر اساس میزان شباهت و ارتباط کلمات"
          >
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>مرتبط‌ترین</span>
          </button>
          <button
            onClick={() => setSortBy('date')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
              sortBy === 'date'
                ? 'bg-cyan-500/20 text-cyan-300 font-bold shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="مرتب‌سازی بر اساس جدیدترین زمان ارسال پیام"
          >
            <Clock className="w-3 h-3 text-amber-400" />
            <span>جدیدترین</span>
          </button>
        </div>

        {/* Results Counter & Navigation Buttons */}
        {query.trim() && (
          <div className="flex items-center gap-1 text-xs">
            <span className="text-[11px] text-slate-400 px-1 font-mono">
              {searchResults.length > 0 ? (
                <>
                  <span className="text-cyan-300 font-bold">{currentIndex + 1}</span>
                  <span className="text-slate-500 mx-1">/</span>
                  <span className="text-slate-300">{searchResults.length}</span>
                </>
              ) : (
                <span className="text-rose-400">یافت نشد</span>
              )}
            </span>

            {/* Prev / Next Buttons */}
            <div className="flex items-center gap-0.5">
              <button
                disabled={searchResults.length === 0}
                onClick={handlePrev}
                className="p-1 rounded-lg text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
                title="پیام قبلی (Shift + Enter)"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                disabled={searchResults.length === 0}
                onClick={handleNext}
                className="p-1 rounded-lg text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
                title="پیام بعدی (Enter)"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* Toggle Full Results Dropdown List */}
            {searchResults.length > 0 && (
              <button
                onClick={() => setShowResultsList(!showResultsList)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer ${
                  showResultsList
                    ? 'bg-slate-800 border-cyan-500/50 text-cyan-300'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
                title="مشاهده تمام پیام‌های منطبق به صورت لیست"
              >
                <ListFilter className="w-3 h-3" />
                <span className="hidden sm:inline">لیست نتایج</span>
              </button>
            )}
          </div>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer mr-auto"
          title="بستن جستجو (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Expanded Results List Panel */}
      {showResultsList && searchResults.length > 0 && (
        <div className="border-t border-slate-800/80 bg-[#141d27] max-h-64 overflow-y-auto divide-y divide-slate-800/60 shadow-inner">
          <div className="px-4 py-1.5 bg-[#0e1621] text-[11px] text-slate-400 flex items-center justify-between font-sans">
            <span>
              {searchResults.length} پیام منطبق با «{query}» ({sortBy === 'date' ? 'بر اساس تاریخ' : 'بر اساس ارتباط'}):
            </span>
            <span className="text-slate-500">برای پرش مستقیم کلیک کنید</span>
          </div>

          {searchResults.map((item, idx) => {
            const isSelected = idx === currentIndex;
            return (
              <div
                key={item.message.id}
                onClick={() => {
                  setCurrentIndex(idx);
                  onSelectMessage(item.message.id);
                  setShowResultsList(false);
                }}
                className={`px-4 py-2 flex items-start gap-3 transition-colors cursor-pointer ${
                  isSelected ? 'bg-cyan-950/40 border-r-4 border-cyan-400' : 'hover:bg-slate-800/50'
                }`}
              >
                <img
                  src={item.message.senderAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                  alt={item.message.senderName}
                  className="w-7 h-7 rounded-full object-cover mt-0.5 border border-slate-700 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-white truncate">
                      {item.message.senderName}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">
                      {item.message.timestamp}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5 line-clamp-2 leading-relaxed">
                    {item.snippet}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
