import React, { useState, useRef } from 'react';
import { Message, User, CallMusicTrack } from '../types/telegram';
import { FormattedText } from '../utils/text-formatter';
import { 
  Play, 
  Pause, 
  FileText, 
  Download, 
  Check, 
  CheckCheck, 
  Sparkles, 
  Smile, 
  CornerUpLeft, 
  Pin, 
  Trash2, 
  Edit3, 
  Share2, 
  Lock,
  Languages,
  Eye,
  Music,
  Disc3,
  Radio
} from 'lucide-react';
import { SeenByModal } from './SeenByModal';
import { getSenderFriendlyName } from '../utils/senderHelper';

interface MessageItemProps {
  message: Message;
  currentUser: User;
  onReact: (messageId: string, emoji: string, isPremiumEmoji?: boolean) => void;
  onReply: (message: Message) => void;
  onEdit?: (message: Message) => void;
  onDelete: (messageId: string) => void;
  onRequestDelete?: (message: Message) => void;
  onTranscribe: (messageId: string) => void;
  onTranslateMessage?: (messageId: string) => void;
  onTogglePin?: (messageId: string) => void;
  canPin?: boolean;
  isGroupChat?: boolean;
  isTranslatingChat?: boolean;
  isHighlighted?: boolean;
  onForward?: (message: Message) => void;
  onJumpToMessage?: (messageId: string) => void;
  // Selection mode props
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (messageId: string) => void;
  onStartSelection?: (messageId: string) => void;
  // Group Call Music DJ props
  isCallActive?: boolean;
  isAdmin?: boolean;
  onAddSongToCall?: (track: CallMusicTrack, autoPlayIfAdmin?: boolean) => void;
}

const QUICK_REACTIONS = ['👍', '❤️', '🔥', '🎉'];
const PREMIUM_REACTIONS = ['💎', '⚡', '👑', '🦄'];

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  currentUser,
  onReact,
  onReply,
  onEdit,
  onDelete,
  onRequestDelete,
  onTranscribe,
  onTranslateMessage,
  onTogglePin,
  canPin = false,
  isGroupChat = false,
  isTranslatingChat,
  isHighlighted,
  onForward,
  onJumpToMessage,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelect,
  onStartSelection,
  isCallActive = false,
  isAdmin = false,
  onAddSongToCall
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [currentAudioTime, setCurrentAudioTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleQueueTrack = (autoPlay?: boolean) => {
    if (!message.mediaUrl || !onAddSongToCall) return;
    const track: CallMusicTrack = {
      id: `track_msg_${message.id}`,
      title: message.audioTitle || message.fileName || message.text || 'فایل صوتی',
      artist: message.audioPerformer || message.senderName,
      audioUrl: message.mediaUrl,
      duration: message.voiceDuration || 180,
      addedBy: {
        id: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar
      },
      addedAt: 'هم‌اکنون',
      sourceMessageId: message.id,
      fileSize: message.fileSize
    };
    onAddSongToCall(track, autoPlay);
  };
  const roundVideoRef = useRef<HTMLVideoElement | null>(null);
  const [isRoundVideoMuted, setIsRoundVideoMuted] = useState(true);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [showSeenByModal, setShowSeenByModal] = useState(false);

  // Long press timer ref for mobile & desktop hold-to-select
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressTriggeredRef = useRef(false);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const startLongPress = (clientX?: number, clientY?: number) => {
    isLongPressTriggeredRef.current = false;
    if (clientX !== undefined && clientY !== undefined) {
      touchStartPosRef.current = { x: clientX, y: clientY };
    }
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(40); } catch (_) {}
      }
      if (onStartSelection) {
        onStartSelection(message.id);
      } else if (onToggleSelect) {
        onToggleSelect(message.id);
      }
    }, 450); // 450ms threshold
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    touchStartPosRef.current = null;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    startLongPress(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartPosRef.current) {
      const touch = e.touches[0];
      const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
      const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
      if (dx > 10 || dy > 10) {
        cancelLongPress();
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isLongPressTriggeredRef.current) {
      e.preventDefault();
    }
    cancelLongPress();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Primary left click hold
      startLongPress(e.clientX, e.clientY);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (touchStartPosRef.current) {
      const dx = Math.abs(e.clientX - touchStartPosRef.current.x);
      const dy = Math.abs(e.clientY - touchStartPosRef.current.y);
      if (dx > 10 || dy > 10) {
        cancelLongPress();
      }
    }
  };

  const handleMouseUp = () => {
    cancelLongPress();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    // Right click on message: enter selection mode or select
    if (!isSelectionMode && onStartSelection) {
      e.preventDefault();
      onStartSelection(message.id);
    }
  };

  const handleMessageClick = (e: React.MouseEvent) => {
    if (isLongPressTriggeredRef.current) {
      isLongPressTriggeredRef.current = false;
      e.stopPropagation();
      return;
    }
    if (isSelectionMode) {
      e.stopPropagation();
      onToggleSelect?.(message.id);
    }
  };

  const isOutgoing = message.isOutgoing;

  return (
    <div
      id={`msg-${message.id}`}
      className={`group relative flex items-center my-1 px-2 sm:px-4 transition-all duration-200 select-none ${
        isOutgoing ? 'justify-end' : 'justify-start'
      } ${isSelected ? 'bg-cyan-500/10 rounded-2xl py-1' : ''}`}
      onMouseLeave={() => {
        setShowReactionPicker(false);
        setShowContextMenu(false);
        cancelLongPress();
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onContextMenu={handleContextMenu}
      onClick={handleMessageClick}
    >
      {/* Checkbox indicator for selection mode */}
      {isSelectionMode && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect?.(message.id);
          }}
          className={`flex-shrink-0 cursor-pointer p-1.5 transition-transform ${
            isOutgoing ? 'order-last mr-1' : 'order-first ml-1'
          }`}
          title={isSelected ? 'لغو انتخاب پیام' : 'انتخاب پیام'}
        >
          <div
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
              isSelected
                ? 'bg-cyan-500 border-cyan-400 text-white shadow-md shadow-cyan-500/40 scale-105'
                : 'border-slate-500/70 hover:border-cyan-400 bg-slate-900/80'
            }`}
          >
            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
          </div>
        </div>
      )}

      {/* Message Content Container */}
      <div className={`flex flex-col ${isOutgoing ? 'items-end' : 'items-start'} max-w-[85%] md:max-w-[70%]`}>
        {/* Sender name for incoming group messages */}
        {!isOutgoing && message.type !== 'system' && (
          <span className="text-[11px] font-bold text-cyan-400 mb-0.5 px-2">
            {message.senderName}
          </span>
        )}

        {/* Main Message Bubble */}
        <div
          className={`relative w-full rounded-2xl px-3.5 py-2 shadow-sm text-sm transition-all duration-300 ${
            isSelected
              ? 'ring-2 ring-cyan-400 shadow-lg shadow-cyan-500/20'
              : isHighlighted
              ? 'ring-2 ring-cyan-400 shadow-xl shadow-cyan-500/30 scale-[1.01] bg-cyan-950/70 border-cyan-400'
              : message.type === 'system'
              ? 'bg-slate-800/80 text-slate-300 text-xs text-center mx-auto my-2 border border-slate-700/50 max-w-md'
              : isOutgoing
              ? 'bg-gradient-to-r from-[#2b5278] to-[#1e3c5a] text-white rounded-br-xs border border-blue-600/30'
              : 'bg-[#212d3b] text-slate-100 rounded-bl-xs border border-slate-700/40'
          }`}
          onDoubleClick={() => !isSelectionMode && onReply(message)}
          title={isSelectionMode ? undefined : 'دوبار کلیک برای پاسخ (Double click to reply)'}
        >
        {/* Reply Preview with Smooth Jump */}
        {message.replyTo && (
          <div 
            onClick={(e) => {
              e.stopPropagation();
              if (message.replyTo?.id && onJumpToMessage) {
                onJumpToMessage(message.replyTo.id);
              }
            }}
            className="mb-2 p-2 rounded-xl bg-black/30 hover:bg-black/45 border-r-3 border-cyan-400 text-xs cursor-pointer transition-all flex items-center justify-between gap-2 group/reply select-none shadow-sm"
            title="پرش به پیام اصلی (Jump to quoted message)"
          >
            <div className="min-w-0 flex-1">
              <span className="font-extrabold text-cyan-400 block text-[11px] group-hover/reply:underline">
                {getSenderFriendlyName(message.replyTo.senderName, { currentUser })}
              </span>
              <span className="text-slate-300 text-[11px] line-clamp-1">
                {message.replyTo.text || 'رسانه ارسالی'}
              </span>
            </div>
            <CornerUpLeft className="w-3.5 h-3.5 text-cyan-400/80 group-hover/reply:text-cyan-400 flex-shrink-0" />
          </div>
        )}

        {/* Telegram Style Forward Header */}
        {message.forwardFrom && (
          <div className="mb-2 pb-1 border-b border-white/10 flex items-center gap-1.5 text-xs text-cyan-300 font-medium">
            <Share2 className="w-3.5 h-3.5 text-cyan-400 rotate-180 flex-shrink-0" />
            <span>هدایت شده از </span>
            <span className="font-extrabold text-white truncate">
              {getSenderFriendlyName(message.forwardFrom.originalSender, { currentUser })}
            </span>
          </div>
        )}

        {/* Media Types Rendering */}

        {/* 1. Photo / Image message */}
        {message.type === 'photo' && message.mediaUrl && (
          <div className="py-1">
            <div className="relative group/media overflow-hidden rounded-xl max-w-sm border border-slate-700/50 shadow-md bg-black/40">
              <img
                src={message.mediaUrl}
                alt={message.fileName || 'تصویر ارسالی'}
                className={`w-full max-h-80 object-cover rounded-xl transition-all duration-300 ${
                  message.isSpoiler ? 'blur-lg scale-105 cursor-pointer hover:blur-none' : ''
                }`}
                onClick={() => {
                  // Open full size in new tab or popup
                  if (message.mediaUrl) {
                    const w = window.open('');
                    w?.document.write(`<body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;height:100vh;"><img src="${message.mediaUrl}" style="max-width:100%;max-height:100%;object-fit:contain;"/></body>`);
                  }
                }}
              />
              {message.isSpoiler && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
                  <span className="text-[11px] px-2.5 py-1 rounded-full bg-black/70 text-amber-300 font-bold border border-amber-400/40">
                    اسپویلر (کلیک کنید)
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. Video message */}
        {message.type === 'video' && message.mediaUrl && (
          <div className="py-1">
            <div className="relative overflow-hidden rounded-xl max-w-sm border border-slate-700/50 shadow-md bg-black">
              <video
                src={message.mediaUrl}
                controls
                playsInline
                preload="metadata"
                className="w-full max-h-80 object-contain rounded-xl"
              />
            </div>
          </div>
        )}

        {/* Audio / Music Track Message (پخش موسیقی و آهنگ) */}
        {message.type === 'audio' && (
          <div className="space-y-2 py-1 min-w-[240px] sm:min-w-[280px]">
            {/* Native audio element */}
            {message.mediaUrl && (
              <audio
                ref={audioRef}
                src={message.mediaUrl}
                onEnded={() => {
                  setIsPlayingAudio(false);
                  setAudioProgress(0);
                }}
                onTimeUpdate={(e) => {
                  const el = e.currentTarget;
                  if (el.duration) {
                    setAudioProgress((el.currentTime / el.duration) * 100);
                    setCurrentAudioTime(Math.floor(el.currentTime));
                  }
                }}
                onError={() => {
                  setIsPlayingAudio(false);
                }}
              />
            )}

            <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-black/30 border border-cyan-500/30 shadow-inner">
              {/* Play/Pause Button */}
              <button
                type="button"
                onClick={() => {
                  if (audioRef.current) {
                    if (isPlayingAudio) {
                      audioRef.current.pause();
                      setIsPlayingAudio(false);
                    } else {
                      audioRef.current.play().then(() => {
                        setIsPlayingAudio(true);
                      }).catch(() => setIsPlayingAudio(false));
                    }
                  } else {
                    setIsPlayingAudio(!isPlayingAudio);
                  }
                }}
                className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white flex items-center justify-center transition-all shadow-md hover:scale-105 cursor-pointer flex-shrink-0"
              >
                {isPlayingAudio ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>

              {/* Title & Artist & Duration */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                    {message.audioTitle || message.fileName || message.text || 'موزیک'}
                  </h4>
                  <span className="text-[10px] font-mono text-cyan-300 flex-shrink-0">
                    {isPlayingAudio
                      ? `0:${currentAudioTime.toString().padStart(2, '0')}`
                      : `0:${message.voiceDuration?.toString().padStart(2, '0') || '00'}`}
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 truncate mt-0.5 flex items-center gap-1.5">
                  <span>{message.audioPerformer || 'موزیک ارسالی'}</span>
                  {message.fileSize && <span className="text-slate-500 text-[10px]">({message.fileSize})</span>}
                </div>
              </div>
            </div>

            {/* In-Call Action Bar for this song */}
            {isGroupChat && onAddSongToCall && message.mediaUrl && (
              <div className="flex items-center gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleQueueTrack(false)}
                  className="flex-1 py-1.5 px-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                  title="افزودن این آهنگ به صف پخش ویس‌کال گروه"
                >
                  <Music className="w-3 h-3" />
                  <span>افزودن به نوبت کال</span>
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleQueueTrack(true)}
                    className="py-1.5 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                    title="پخش فوری این آهنگ در گفتگوی صوتی توسط مدیر"
                  >
                    <Radio className="w-3 h-3" />
                    <span>پخش در کال</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* 3. Voice Note with Real HTMLAudioElement Playback */}
        {message.type === 'voice' && (
          <div className="space-y-2 py-1">
            <div className="flex items-center gap-3">
              {/* Hidden native audio element for real audio file playback */}
              {message.mediaUrl && (
                <audio
                  ref={audioRef}
                  src={message.mediaUrl}
                  onEnded={() => {
                    setIsPlayingAudio(false);
                    setAudioProgress(0);
                  }}
                  onTimeUpdate={(e) => {
                    const el = e.currentTarget;
                    if (el.duration) {
                      setAudioProgress((el.currentTime / el.duration) * 100);
                      setCurrentAudioTime(Math.floor(el.currentTime));
                    }
                  }}
                  onError={() => {
                    setIsPlayingAudio(false);
                  }}
                />
              )}

              <button
                onClick={() => {
                  if (audioRef.current) {
                    if (isPlayingAudio) {
                      audioRef.current.pause();
                      setIsPlayingAudio(false);
                    } else {
                      audioRef.current.play().then(() => {
                        setIsPlayingAudio(true);
                      }).catch(() => {
                        setIsPlayingAudio(false);
                      });
                    }
                  } else {
                    setIsPlayingAudio(!isPlayingAudio);
                  }
                }}
                className="w-10 h-10 rounded-full bg-cyan-500 hover:bg-cyan-400 text-white flex items-center justify-center transition-all shadow-md cursor-pointer flex-shrink-0"
              >
                {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>

              {/* Waveform Bars */}
              <div 
                className="flex-1 flex items-center gap-0.5 h-8 cursor-pointer py-1"
                onClick={(e) => {
                  if (audioRef.current && audioRef.current.duration) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const percent = Math.max(0, Math.min(1, clickX / rect.width));
                    audioRef.current.currentTime = percent * audioRef.current.duration;
                    setAudioProgress(percent * 100);
                  }
                }}
              >
                {(message.voiceWaveform || [25, 45, 80, 50, 75, 90, 60, 35, 65, 85, 45, 90]).map((h, i, arr) => {
                  const barPercent = (i / arr.length) * 100;
                  const isPassed = audioProgress >= barPercent;
                  return (
                    <div
                      key={i}
                      className={`w-1 rounded-full transition-all ${
                        isPassed
                          ? 'bg-cyan-400'
                          : isPlayingAudio
                          ? 'bg-slate-300'
                          : 'bg-slate-500/60'
                      }`}
                      style={{
                        height: `${Math.max(15, h)}%`
                      }}
                    />
                  );
                })}
              </div>

              <span className="text-xs font-mono text-slate-300 flex-shrink-0 min-w-8">
                {isPlayingAudio
                  ? `0:${currentAudioTime.toString().padStart(2, '0')}`
                  : `0:${message.voiceDuration?.toString().padStart(2, '0') || '09'}`}
              </span>

              {/* Telegram Premium Speech-to-Text Button (A->文) */}
              <button
                onClick={() => onTranscribe(message.id)}
                className={`p-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 flex-shrink-0 ${
                  message.transcript
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-black/30 hover:bg-black/50 text-slate-300 border-slate-600'
                }`}
                title="تبدیل ویس به متن (Speech-to-Text پریمیوم)"
              >
                <Languages className="w-3.5 h-3.5" />
                <span className="text-[10px]">A文</span>
                {currentUser.isPremium && <Sparkles className="w-2.5 h-2.5 text-amber-400" />}
              </button>
            </div>

            {/* Transcript display */}
            {message.transcript && (
              <div className="p-2 rounded-lg bg-black/30 border border-slate-700/60 text-xs text-amber-200/90 leading-relaxed animate-in fade-in">
                <span className="text-[10px] text-slate-400 block mb-0.5">رونویسی هوشمند (STT):</span>
                {message.transcript}
              </div>
            )}
          </div>
        )}

        {/* 4. Round Video Note (دایره‌ای) */}
        {message.type === 'round_video' && (
          <div className="space-y-2 py-1">
            <div 
              className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-full overflow-hidden border-4 border-cyan-400/90 shadow-2xl bg-black mx-auto cursor-pointer group"
              onClick={() => {
                if (roundVideoRef.current) {
                  roundVideoRef.current.muted = !roundVideoRef.current.muted;
                  setIsRoundVideoMuted(roundVideoRef.current.muted);
                }
              }}
            >
              <video
                ref={roundVideoRef}
                src={message.mediaUrl}
                autoPlay
                loop
                muted={isRoundVideoMuted}
                playsInline
                className="w-full h-full object-cover"
              />
              {/* Mute indicator overlay */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-black/70 text-[10px] text-slate-200 border border-slate-700/80 backdrop-blur-sm pointer-events-none flex items-center gap-1">
                <span>{isRoundVideoMuted ? 'بی‌صدا (ضربه برای صدا)' : 'با صدا'}</span>
              </div>
              <div className="absolute top-2 right-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTranscribe(message.id);
                  }}
                  className="px-2 py-0.5 rounded-full bg-black/60 text-amber-300 text-[10px] font-bold border border-amber-400/40 flex items-center gap-1 cursor-pointer"
                >
                  <span>A文</span>
                  <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                </button>
              </div>
            </div>

            {message.transcript && (
              <div className="p-2 rounded-lg bg-black/30 border border-slate-700/60 text-xs text-amber-200/90 leading-relaxed text-center">
                {message.transcript}
              </div>
            )}
          </div>
        )}

        {/* 5. Document */}
        {message.type === 'document' && (
          <div className="flex items-center gap-3 p-2 rounded-xl bg-black/20 border border-slate-700/50 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white truncate">{message.fileName}</div>
              <div className="text-[10px] text-slate-400 font-mono">{message.fileSize}</div>
            </div>
            {message.mediaUrl ? (
              <a 
                href={message.mediaUrl} 
                download={message.fileName || 'file'}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
              </a>
            ) : (
              <button className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors">
                <Download className="w-4 h-4" />
              </button>
            )}

            {/* If audio document in group, allow queuing into call */}
            {isGroupChat && onAddSongToCall && message.mediaUrl && message.fileName?.match(/\.(mp3|wav|m4a|ogg|aac|flac)$/i) && (
              <div className="flex items-center gap-1.5 mr-auto">
                <button
                  type="button"
                  onClick={() => handleQueueTrack(false)}
                  className="py-1 px-2 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1"
                  title="افزودن این آهنگ به صف پخش ویس‌کال"
                >
                  <Music className="w-3 h-3" />
                  <span>نوبت کال</span>
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleQueueTrack(true)}
                    className="py-1 px-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1"
                    title="پخش فوری در ویس‌کال توسط مدیر"
                  >
                    <Radio className="w-3 h-3" />
                    <span>پخش در کال</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Message Text with Spoilers & Markdown (Do not show if same as fileName for photos/videos) */}
        {message.text && (message.type !== 'photo' && message.type !== 'video' || message.text !== message.fileName) && (
          <div className="break-words mt-1">
            <FormattedText text={message.text} />
          </div>
        )}

        {/* Live Translated Text */}
        {message.translatedText ? (
          <div className="mt-1.5 pt-1.5 border-t border-white/10 text-xs text-cyan-200 italic flex items-start gap-1 animate-in fade-in">
            <span className="text-[10px] text-cyan-400 font-bold select-none flex-shrink-0">🌐 ترجمه:</span>
            <span className="break-words">{message.translatedText}</span>
          </div>
        ) : isTranslatingChat && message.text ? (
          <div className="mt-1 pt-1 border-t border-white/10 text-[11px] text-cyan-400/80 italic flex items-center gap-1.5 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            <span>در حال ترجمه هوشمند...</span>
          </div>
        ) : null}

        {/* Bottom Metadata: Timestamp, Status, Pinned Badge & Seen-By */}
        <div className="flex items-center justify-end gap-1.5 mt-1 text-[10px] text-slate-400 select-none">
          {message.isPinned && (
            <span 
              className="flex items-center gap-0.5 text-cyan-300 bg-cyan-950/70 border border-cyan-800/80 px-1.5 py-0.2 rounded-full font-medium" 
              title="پیام سنجاق شده"
            >
              <Pin className="w-2.5 h-2.5 rotate-45 text-cyan-400" />
              <span className="text-[9px]">سنجاق</span>
            </span>
          )}

          {message.isEdited && <span>(ویرایش شده)</span>}
          <span>{message.timestamp}</span>

          {/* Seen By status for group messages or when readers list exists */}
          {message.seenBy && message.seenBy.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowSeenByModal(true);
              }}
              className="flex items-center gap-1 text-slate-300 hover:text-cyan-300 bg-slate-900/70 hover:bg-slate-900 border border-slate-700/60 px-1.5 py-0.5 rounded-full transition-all cursor-pointer hover:border-cyan-500/50"
              title={`دیده شده توسط ${message.seenBy.length} نفر (کلیک کنید)`}
            >
              <Eye className="w-3 h-3 text-cyan-400" />
              <span className="font-mono text-[10px] font-bold text-cyan-300">{message.seenBy.length}</span>
            </button>
          )}

          {isOutgoing && (
            <span>
              {message.status === 'read' ? (
                <CheckCheck className="w-3.5 h-3.5 text-cyan-400" />
              ) : message.status === 'sent' ? (
                <Check className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <span className="w-2.5 h-2.5 rounded-full border border-slate-400 border-t-transparent animate-spin inline-block" />
              )}
            </span>
          )}
        </div>
      </div>

      {/* Emoji Reactions Pill Strip */}
      {message.reactions && message.reactions.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1 px-1">
          {message.reactions.map((r, i) => (
            <button
              key={i}
              onClick={() => onReact(message.id, r.emoji, r.isPremium)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono transition-transform hover:scale-105 ${
                r.userReacted
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50'
                  : 'bg-slate-800/80 text-slate-300 border border-slate-700/60'
              }`}
            >
              <span>{r.emoji}</span>
              <span className="text-[10px] font-bold">{r.count}</span>
              {r.isPremium && <Sparkles className="w-2.5 h-2.5 text-amber-400" />}
            </button>
          ))}
        </div>
      )}
      </div>

      {/* Floating Hover Context Actions (hidden when in multi-selection mode) */}
      <div className={`absolute top-0 right-2 -translate-y-1/2 opacity-0 ${isSelectionMode ? 'hidden' : 'group-hover:opacity-100'} transition-opacity flex items-center gap-1 bg-slate-900/90 border border-slate-700/80 rounded-full px-2 py-1 shadow-lg z-10 backdrop-blur-sm`}>
        {/* React button */}
        <div className="relative">
          <button
            onClick={() => setShowReactionPicker(!showReactionPicker)}
            className="p-1 hover:text-amber-400 text-slate-400 transition-colors cursor-pointer"
            title="افزودن ریاکشن"
          >
            <Smile className="w-3.5 h-3.5" />
          </button>

          {/* Quick Reaction Popover */}
          {showReactionPicker && (
            <div className="absolute bottom-8 right-0 bg-slate-900 border border-slate-700 rounded-2xl p-2 shadow-2xl flex flex-col gap-2 z-30">
              <div className="text-[10px] text-slate-400 px-1">ریاکشن استاندارد:</div>
              <div className="flex gap-1.5">
                {QUICK_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onReact(message.id, emoji, false);
                      setShowReactionPicker(false);
                    }}
                    className="text-lg hover:scale-125 transition-transform p-1 cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Premium Animated Reactions */}
              <div className="text-[10px] text-amber-400 px-1 flex items-center gap-1 border-t border-slate-800 pt-1">
                <Sparkles className="w-3 h-3" />
                <span>ریاکشن‌های پریمیوم:</span>
              </div>
              <div className="flex gap-1.5">
                {PREMIUM_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onReact(message.id, emoji, true);
                      setShowReactionPicker(false);
                    }}
                    className="text-lg hover:scale-125 transition-transform p-1 cursor-pointer bg-amber-500/10 rounded-lg border border-amber-500/20"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Pin / Unpin Action (for Admins or in private chats) */}
        {canPin && onTogglePin && (
          <button
            type="button"
            onClick={() => onTogglePin(message.id)}
            className={`p-1 transition-colors cursor-pointer ${
              message.isPinned 
                ? 'text-cyan-400 hover:text-rose-400 bg-cyan-500/10 rounded-md' 
                : 'text-slate-400 hover:text-cyan-400'
            }`}
            title={message.isPinned ? 'برداشتن سنجاق (Unpin)' : 'سنجاق کردن پیام در بالای گروه (Pin)'}
          >
            <Pin className="w-3.5 h-3.5 rotate-45" />
          </button>
        )}

        {/* Seen By Quick View (if group and has readers) */}
        {message.seenBy && message.seenBy.length > 0 && (
          <button
            type="button"
            onClick={() => setShowSeenByModal(true)}
            className="p-1 hover:text-cyan-400 text-slate-400 transition-colors cursor-pointer"
            title={`مشاهده خوانندگان پیام (${message.seenBy.length} نفر)`}
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Reply */}
        <button
          onClick={() => onReply(message)}
          className="p-1 hover:text-cyan-400 text-slate-400 transition-colors cursor-pointer"
          title="پاسخ (Reply)"
        >
          <CornerUpLeft className="w-3.5 h-3.5" />
        </button>

        {/* Edit (if outgoing) */}
        {isOutgoing && onEdit && (
          <button
            onClick={() => onEdit(message)}
            className="p-1 hover:text-cyan-400 text-slate-400 transition-colors cursor-pointer"
            title="ویرایش پیام"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Forward */}
        {onForward && (
          <button
            onClick={() => onForward(message)}
            className="p-1 hover:text-cyan-400 text-slate-400 transition-colors cursor-pointer"
            title="فوروارد پیام"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Delete with 2-options modal */}
        <button
          onClick={() => onRequestDelete ? onRequestDelete(message) : onDelete(message.id)}
          className="p-1 hover:text-rose-400 text-slate-400 transition-colors cursor-pointer"
          title="حذف پیام (دو طرفه یا یک طرفه)"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Seen By Details Modal */}
      {message.seenBy && message.seenBy.length > 0 && (
        <SeenByModal
          isOpen={showSeenByModal}
          onClose={() => setShowSeenByModal(false)}
          seenBy={message.seenBy}
          messageTextSnippet={message.text || message.fileName}
        />
      )}
    </div>
  );
};
