import React, { useState, useRef } from 'react';
import { Message, User } from '../types/telegram';
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
  Languages
} from 'lucide-react';

interface MessageItemProps {
  message: Message;
  currentUser: User;
  onReact: (messageId: string, emoji: string, isPremiumEmoji?: boolean) => void;
  onReply: (message: Message) => void;
  onEdit?: (message: Message) => void;
  onDelete: (messageId: string) => void;
  onTranscribe: (messageId: string) => void;
  onTranslateMessage?: (messageId: string) => void;
  isTranslatingChat?: boolean;
  isHighlighted?: boolean;
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
  onTranscribe,
  onTranslateMessage,
  isTranslatingChat,
  isHighlighted
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [currentAudioTime, setCurrentAudioTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const roundVideoRef = useRef<HTMLVideoElement | null>(null);
  const [isRoundVideoMuted, setIsRoundVideoMuted] = useState(true);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);

  const isOutgoing = message.isOutgoing;

  return (
    <div
      id={`msg-${message.id}`}
      className={`group relative flex flex-col my-1 px-4 transition-all duration-300 ${
        isOutgoing ? 'items-end' : 'items-start'
      }`}
      onMouseLeave={() => {
        setShowReactionPicker(false);
        setShowContextMenu(false);
      }}
    >
      {/* Sender name for incoming group messages */}
      {!isOutgoing && message.type !== 'system' && (
        <span className="text-[11px] font-bold text-cyan-400 mb-0.5 px-2">
          {message.senderName}
        </span>
      )}

      {/* Main Message Bubble */}
      <div
        className={`relative max-w-[85%] md:max-w-[70%] rounded-2xl px-3.5 py-2 shadow-sm text-sm transition-all duration-300 ${
          isHighlighted
            ? 'ring-2 ring-cyan-400 shadow-xl shadow-cyan-500/30 scale-[1.01] bg-cyan-950/70 border-cyan-400'
            : message.type === 'system'
            ? 'bg-slate-800/80 text-slate-300 text-xs text-center mx-auto my-2 border border-slate-700/50 max-w-md'
            : isOutgoing
            ? 'bg-gradient-to-r from-[#2b5278] to-[#1e3c5a] text-white rounded-br-xs border border-blue-600/30'
            : 'bg-[#212d3b] text-slate-100 rounded-bl-xs border border-slate-700/40'
        }`}
      >
        {/* Reply Preview */}
        {message.replyTo && (
          <div className="mb-2 p-1.5 rounded-lg bg-black/20 border-r-2 border-cyan-400 text-xs">
            <span className="font-bold text-cyan-300 block">{message.replyTo.senderName}</span>
            <span className="text-slate-300 line-clamp-1">{message.replyTo.text}</span>
          </div>
        )}

        {/* Forward Header */}
        {message.forwardFrom && (
          <div className="mb-1 text-[11px] text-cyan-300 flex items-center gap-1 font-medium">
            <Share2 className="w-3 h-3" />
            <span>نقل قول از {message.forwardFrom.originalSender}</span>
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

        {/* Bottom Metadata: Timestamp, Status */}
        <div className="flex items-center justify-end gap-1.5 mt-1 text-[10px] text-slate-400 select-none">
          {message.isEdited && <span>(ویرایش شده)</span>}
          <span>{message.timestamp}</span>
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

      {/* Floating Hover Context Actions */}
      <div className="absolute top-0 right-2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-slate-900/90 border border-slate-700/80 rounded-full px-2 py-1 shadow-lg z-10 backdrop-blur-sm">
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

        {/* Delete */}
        <button
          onClick={() => onDelete(message.id)}
          className="p-1 hover:text-rose-400 text-slate-400 transition-colors cursor-pointer"
          title="حذف برای دو طرف"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
