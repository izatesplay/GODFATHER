import React, { useState, useRef, useEffect } from 'react';
import { 
  Smile, 
  Paperclip, 
  Mic, 
  Send, 
  Video, 
  Clock, 
  VolumeX, 
  X, 
  Sparkles, 
  UploadCloud, 
  FileText, 
  Image as ImageIcon,
  Check,
  Trash2,
  AlertCircle,
  CornerUpLeft,
  Music
} from 'lucide-react';
import { Message } from '../types/telegram';
import { RoundVideoRecorderModal } from './RoundVideoRecorderModal';

interface MessageInputProps {
  onSendMessage: (
    text: string, 
    type?: 'text' | 'photo' | 'video' | 'voice' | 'round_video' | 'document' | 'audio',
    options?: {
      isSpoiler?: boolean;
      isSilent?: boolean;
      scheduledFor?: string;
      fileName?: string;
      fileSize?: string;
      mediaUrl?: string;
      audioTitle?: string;
      audioPerformer?: string;
      voiceDuration?: number;
      voiceWaveform?: number[];
    }
  ) => void;
  replyingTo: Message | null;
  onCancelReply: () => void;
  onOpenChunkUploader: () => void;
  isPremium: boolean;
  draftText?: string;
  onDraftChange?: (text: string) => void;
}

const EMOJI_TABS = {
  standard: ['😀', '😂', '😍', '🔥', '👍', '🎉', '❤️', '🚀', '✨', '👏', '🥳', '😎'],
  premium: ['💎', '⚡', '👑', '🦄', '🌟', '🛡️', '🛸', '🪐', '🔮', '🏆', '💫', '🥇']
};

function formatBytes(bytes: number, decimals = 1) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  replyingTo,
  onCancelReply,
  onOpenChunkUploader,
  isPremium,
  draftText = '',
  onDraftChange
}) => {
  const [text, setText] = useState(draftText);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeEmojiTab, setActiveEmojiTab] = useState<'standard' | 'premium'>('standard');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showSendOptions, setShowSendOptions] = useState(false);
  const [isSilentNext, setIsSilentNext] = useState(false);

  // Voice recording state
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [liveWaveform, setLiveWaveform] = useState<number[]>([25, 40, 60, 30, 70, 50, 90, 60, 40, 80, 50, 30]);
  const [micError, setMicError] = useState<string | null>(null);

  // Round video recorder state
  const [isRoundVideoOpen, setIsRoundVideoOpen] = useState(false);
  const [inputActionType, setInputActionType] = useState<'mic' | 'video'>('mic');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaFileInputRef = useRef<HTMLInputElement>(null);
  const documentFileInputRef = useRef<HTMLInputElement>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);

  // MediaRecorder refs
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioTimerRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const handleMediaFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      const isVideo = file.type.startsWith('video');
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          onSendMessage(file.name, isVideo ? 'video' : 'photo', {
            mediaUrl: reader.result,
            fileName: file.name,
            fileSize: formatBytes(file.size)
          });
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
    setShowAttachMenu(false);
  };

  const handleDocumentFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        onSendMessage(file.name, 'document', {
          fileName: file.name,
          fileSize: formatBytes(file.size),
          mediaUrl: typeof reader.result === 'string' ? reader.result : undefined
        });
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
    setShowAttachMenu(false);
  };

  const handleAudioFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const cleanTitle = file.name.replace(/\.[^/.]+$/, '');
        onSendMessage(cleanTitle, 'audio', {
          fileName: file.name,
          audioTitle: cleanTitle,
          audioPerformer: 'موزیک ارسالی',
          fileSize: formatBytes(file.size),
          mediaUrl: typeof reader.result === 'string' ? reader.result : undefined,
          voiceDuration: 180
        });
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
    setShowAttachMenu(false);
  };

  // Sync draft
  useEffect(() => {
    setText(draftText);
  }, [draftText]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioTimerRef.current) clearInterval(audioTimerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    onDraftChange?.(e.target.value);
  };

  const handleSend = () => {
    if (!text.trim()) return;
    onSendMessage(text, 'text', { isSilent: isSilentNext });
    setText('');
    onDraftChange?.('');
    setIsSilentNext(false);
    setShowSendOptions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const insertSpoiler = () => {
    setText((prev) => `${prev}||متن مخفی اینجا||`);
    textareaRef.current?.focus();
  };

  // --- Real Microphone Recording Engine ---
  const startRealVoiceRecording = async () => {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      audioChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
        ? 'audio/ogg;codecs=opus'
        : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      audioRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      // Live waveform sampling with Web Audio API
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        try {
          const audioCtx = new AudioCtx();
          audioContextRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateWaveform = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);
            const bars: number[] = [];
            const step = Math.max(1, Math.floor(dataArray.length / 12));
            for (let i = 0; i < 12; i++) {
              const val = dataArray[i * step] || 20;
              bars.push(Math.max(15, Math.min(100, Math.round((val / 255) * 100))));
            }
            setLiveWaveform(bars);
            animFrameRef.current = requestAnimationFrame(updateWaveform);
          };
          updateWaveform();
        } catch (e) {
          console.warn('AudioContext init non-fatal warning:', e);
        }
      }

      recorder.start(200);
      setIsRecordingVoice(true);
      setRecordSeconds(0);

      audioTimerRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch (err: any) {
      console.warn('Microphone permission error:', err);
      setMicError('دسترسی به میکروفون تایید نشد. لطفاً در مرورگر اجازه ضبط صدا را صادر فرمایید.');
      setTimeout(() => setMicError(null), 4000);
    }
  };

  const stopAndSendRealVoice = () => {
    if (audioTimerRef.current) clearInterval(audioTimerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }

    const rec = audioRecorderRef.current;
    const duration = recordSeconds || 1;

    if (rec && rec.state !== 'inactive') {
      rec.onstop = () => {
        const mime = rec.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mime });
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            onSendMessage('پیام صوتی', 'voice', {
              mediaUrl: reader.result,
              voiceDuration: duration,
              voiceWaveform: [...liveWaveform],
              isSilent: isSilentNext
            });
          }
        };
        reader.readAsDataURL(blob);

        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach((t) => t.stop());
          audioStreamRef.current = null;
        }
      };
      rec.stop();
    }
    setIsRecordingVoice(false);
  };

  const cancelVoiceRecording = () => {
    if (audioTimerRef.current) clearInterval(audioTimerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }
    if (audioRecorderRef.current && audioRecorderRef.current.state !== 'inactive') {
      try {
        audioRecorderRef.current.stop();
      } catch {}
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((t) => t.stop());
      audioStreamRef.current = null;
    }
    audioChunksRef.current = [];
    setIsRecordingVoice(false);
    setRecordSeconds(0);
  };

  return (
    <div className="relative border-t border-slate-800 bg-[#1e293b]/95 backdrop-blur-md px-2 sm:px-4 py-2 sm:py-2.5 z-20">
      {/* Microphone error toast banner */}
      {micError && (
        <div className="mb-2 p-2 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{micError}</span>
        </div>
      )}

      {/* Reply Banner */}
      {replyingTo && (
        <div className="mb-2 p-2 rounded-xl bg-slate-800/80 border-r-2 border-cyan-400 flex items-center justify-between text-xs animate-in slide-in-from-bottom-2">
          <div className="min-w-0 pr-2">
            <span className="font-bold text-cyan-300 block">{replyingTo.senderName}</span>
            <span className="text-slate-300 truncate block">{replyingTo.text || 'رسانه'}</span>
          </div>
          <button
            onClick={onCancelReply}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Hidden native file pickers for phone/device */}
      <input
        type="file"
        ref={mediaFileInputRef}
        accept="image/*,video/*"
        multiple
        onChange={handleMediaFilesSelected}
        className="hidden"
      />
      <input
        type="file"
        ref={documentFileInputRef}
        accept="*/*"
        multiple
        onChange={handleDocumentFilesSelected}
        className="hidden"
      />
      <input
        type="file"
        ref={audioFileInputRef}
        accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac"
        multiple
        onChange={handleAudioFilesSelected}
        className="hidden"
      />

      {/* Telegram Native Reply Preview Bar */}
      {replyingTo && (
        <div className="flex items-center justify-between bg-[#1e293b]/95 border border-cyan-500/40 rounded-2xl px-3 py-2 mb-2 shadow-lg backdrop-blur-sm animate-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-1 h-7 bg-cyan-400 rounded-full flex-shrink-0" />
            <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center flex-shrink-0">
              <CornerUpLeft className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1 text-right">
              <div className="text-xs font-bold text-cyan-400 truncate flex items-center gap-1.5">
                <span>پاسخ به {replyingTo.senderName}</span>
              </div>
              <div className="text-[11px] text-slate-300 truncate">
                {replyingTo.text || (replyingTo.type === 'photo' ? '📷 عکس' : replyingTo.type === 'voice' ? '🎤 پیام صوتی' : replyingTo.type === 'video' ? '🎬 ویدیو' : replyingTo.type === 'round_video' ? '🎥 پیام ویدیویی گرد' : '📎 فایل')}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer flex-shrink-0 mr-1"
            title="لغو پاسخ (Escape)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Input Row */}
      <div className="flex items-end gap-1.5 sm:gap-2">
        {/* Attachment menu trigger */}
        <div className="relative">
          <button
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            className="p-2 sm:p-2.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="پیوست فایل"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Attachment options dropdown */}
          {showAttachMenu && (
            <div className="absolute bottom-12 right-0 w-72 max-w-[calc(100vw-32px)] bg-slate-900 border border-slate-700 rounded-2xl p-2 shadow-2xl space-y-1 z-30">
              {/* Option 1: Native Phone Gallery Photos & Videos */}
              <button
                onClick={() => {
                  setShowAttachMenu(false);
                  mediaFileInputRef.current?.click();
                }}
                className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-800 text-xs text-white transition-colors text-right cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold">عکس یا ویدیو از گالری گوشی</div>
                  <div className="text-[10px] text-slate-400">انتخاب مستقیم از گالری و دوربین با پیش‌نمایش</div>
                </div>
              </button>

              {/* Option 2: Native Device Documents / Files */}
              <button
                onClick={() => {
                  setShowAttachMenu(false);
                  documentFileInputRef.current?.click();
                }}
                className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-800 text-xs text-white transition-colors text-right cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold">فایل یا سند از حافظه دستگاه</div>
                  <div className="text-[10px] text-slate-400">PDF، Zip، APK و هر نوع سند دیگر</div>
                </div>
              </button>

              {/* Option 3: Chunked Resumable Uploader (TUS protocol for 2GB/4GB) */}
              <button
                onClick={() => {
                  setShowAttachMenu(false);
                  onOpenChunkUploader();
                }}
                className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-800 text-xs text-white transition-colors text-right cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <UploadCloud className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold flex items-center gap-1">
                    <span>آپلود فایل فوق‌حجیم (Chunked)</span>
                    <span className="text-[9px] bg-purple-500/30 text-purple-300 px-1.5 py-0.2 rounded font-mono">
                      {isPremium ? '۴GB' : '۲GB'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">پروتکل TUS با قابلیت مکث و ادامه</div>
                </div>
              </button>

              {/* Option: Music & Audio File for Group Chat & Call */}
              <button
                onClick={() => {
                  setShowAttachMenu(false);
                  audioFileInputRef.current?.click();
                }}
                className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-800 text-xs text-white transition-colors text-right cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Music className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold flex items-center gap-1.5">
                    <span>ارسال فایل آهنگ و موسیقی</span>
                    <span className="text-[9px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.2 rounded font-mono">
                      پخش در کال
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">MP3، WAV، M4A با قابلیت پخش مستقیم در ویس‌کال گروه</div>
                </div>
              </button>

              {/* Option 4: Round Video Note */}
              <button
                onClick={() => {
                  setShowAttachMenu(false);
                  setIsRoundVideoOpen(true);
                }}
                className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-800 text-xs text-emerald-300 transition-colors text-right cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Video className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold">ضبط پیام ویدیویی گرد (Video Note)</div>
                  <div className="text-[10px] text-slate-400">ضبط و ارسال ویدیو دایره‌ای با دوربین سلفی</div>
                </div>
              </button>

              {/* Option 5: Spoiler Tag */}
              <button
                onClick={() => {
                  setShowAttachMenu(false);
                  insertSpoiler();
                }}
                className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-800 text-xs text-amber-300 transition-colors text-right cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold">درج اسپویلر (Spoiler)</div>
                  <div className="text-[10px] text-slate-400">متن مخفی با جلوه درخشان ||متن||</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Real Voice Recording Live State or Textarea */}
        {isRecordingVoice ? (
          <div className="flex-1 flex items-center justify-between bg-slate-900 border border-red-500/40 rounded-2xl px-3 py-2 animate-in fade-in">
            {/* Live Timer & Waveform */}
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-ping flex-shrink-0" />
              <span className="text-xs font-bold text-white font-mono">
                0:{recordSeconds.toString().padStart(2, '0')}
              </span>
              {/* Dynamic waveform responding to live mic levels */}
              <div className="flex items-center gap-0.5 h-6 px-1">
                {liveWaveform.map((h, i) => (
                  <div
                    key={i}
                    className="w-1 bg-red-500 rounded-full transition-all duration-75"
                    style={{ height: `${Math.max(20, h)}%` }}
                  />
                ))}
              </div>
            </div>

            {/* Cancel & Send Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={cancelVoiceRecording}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="لغو و حذف ویس"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
              <button
                onClick={stopAndSendRealVoice}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-md shadow-red-500/30 transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>ارسال</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 relative flex items-center bg-[#0f172a] border border-slate-700/80 rounded-2xl px-3 py-1 focus-within:border-cyan-500/80 transition-colors">
            {/* Textarea */}
            <textarea
              ref={textareaRef}
              rows={1}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder="پیام خود را بنویسید... (پشتیبانی از Markdown)"
              className="w-full bg-transparent text-sm text-white placeholder-slate-500 outline-none resize-none max-h-32 py-2 leading-relaxed"
            />

            {/* Emoji & Sticker button */}
            <div className="relative">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-1.5 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
                title="اموجی و استیکرهای پریمیوم"
              >
                <Smile className="w-5 h-5" />
              </button>

              {/* Emoji Drawer */}
              {showEmojiPicker && (
                <div className="absolute bottom-12 left-0 w-64 max-w-[calc(100vw-32px)] bg-slate-900 border border-slate-700 rounded-2xl p-3 shadow-2xl z-30">
                  <div className="flex border-b border-slate-800 pb-2 mb-2 gap-2 text-xs">
                    <button
                      onClick={() => setActiveEmojiTab('standard')}
                      className={`pb-1 font-bold cursor-pointer ${
                        activeEmojiTab === 'standard' ? 'text-cyan-400 border-b border-cyan-400' : 'text-slate-400'
                      }`}
                    >
                      اموجی عادی
                    </button>
                    <button
                      onClick={() => setActiveEmojiTab('premium')}
                      className={`pb-1 font-bold flex items-center gap-1 cursor-pointer ${
                        activeEmojiTab === 'premium' ? 'text-amber-400 border-b border-amber-400' : 'text-slate-400'
                      }`}
                    >
                      <span>پریمیوم</span>
                      <Sparkles className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-2xl text-center">
                    {EMOJI_TABS[activeEmojiTab].map((em) => (
                      <button
                        key={em}
                        onClick={() => {
                          setText((prev) => prev + em);
                          setShowEmojiPicker(false);
                          textareaRef.current?.focus();
                        }}
                        className="hover:scale-130 transition-transform p-1 cursor-pointer"
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Send / Mic / Round Video Action Button */}
        {text.trim() ? (
          <div className="relative">
            <button
              onClick={handleSend}
              onContextMenu={(e) => {
                e.preventDefault();
                setShowSendOptions(!showSendOptions);
              }}
              className="p-2.5 rounded-full bg-cyan-500 hover:bg-cyan-400 text-white transition-all shadow-md shadow-cyan-500/25 cursor-pointer"
              title="ارسال پیام (برای ارسال زمان‌بندی شده یا بی‌صدا راست کلیک کنید)"
            >
              <Send className="w-5 h-5" />
            </button>

            {/* Silent & Scheduled Message Options */}
            {showSendOptions && (
              <div className="absolute bottom-12 left-0 w-48 bg-slate-900 border border-slate-700 rounded-xl p-1.5 shadow-2xl text-xs text-slate-300 space-y-1 z-30">
                <button
                  onClick={() => {
                    setIsSilentNext(true);
                    handleSend();
                  }}
                  className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-slate-800 transition-colors text-right cursor-pointer"
                >
                  <VolumeX className="w-4 h-4 text-amber-400" />
                  <span>ارسال بی‌صدا (Silent)</span>
                </button>
                <button
                  onClick={() => {
                    alert('پیام با موفقیت در صف ارسال زمان‌بندی‌شده ابری قرار گرفت!');
                    setShowSendOptions(false);
                  }}
                  className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-slate-800 transition-colors text-right cursor-pointer"
                >
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <span>ارسال زمان‌بندی شده</span>
                </button>
              </div>
            )}
          </div>
        ) : !isRecordingVoice ? (
          /* Mic / Video Note Toggle Button like Telegram Mobile */
          <div className="flex items-center">
            {inputActionType === 'mic' ? (
              <button
                onClick={startRealVoiceRecording}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setInputActionType('video');
                }}
                className="p-2.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer group relative"
                title="کلیک برای ضبط ویس واقعی (کلیک راست یا ضربه برای جابجایی به ویدیو گرد)"
              >
                <Mic className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ) : (
              <button
                onClick={() => setIsRoundVideoOpen(true)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setInputActionType('mic');
                }}
                className="p-2.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer group relative"
                title="کلیک برای ضبط پیام ویدیویی گرد (کلیک راست برای جابجایی به ویس)"
              >
                <Video className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )}
          </div>
        ) : null}
      </div>

      {/* Round Video Recorder Modal */}
      <RoundVideoRecorderModal
        isOpen={isRoundVideoOpen}
        onClose={() => setIsRoundVideoOpen(false)}
        onSendVideoNote={(videoDataUrl) => {
          onSendMessage('پیام ویدیویی گرد', 'round_video', {
            mediaUrl: videoDataUrl
          });
        }}
      />
    </div>
  );
};
