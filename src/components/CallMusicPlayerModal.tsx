import React, { useState, useRef } from 'react';
import { 
  X, 
  Music, 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Volume2, 
  VolumeX, 
  ListMusic, 
  Plus, 
  Upload, 
  Trash2, 
  Sparkles, 
  Radio, 
  Check, 
  FileAudio,
  ShieldCheck,
  Disc3,
  Repeat
} from 'lucide-react';
import { CallMusicTrack, User, Message } from '../types/telegram';
import { SAMPLE_CALL_TRACKS } from '../data/callMusicSamples';

interface CallMusicPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  currentUser: User;
  currentTrack: CallMusicTrack | null;
  queue: CallMusicTrack[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isLooping?: boolean;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onSkipNext: () => void;
  onSkipPrev: () => void;
  onSetVolume: (vol: number) => void;
  onToggleLoop: () => void;
  onPlayTrack: (track: CallMusicTrack) => void;
  onRemoveTrack: (trackId: string) => void;
  onAddTrack: (track: CallMusicTrack, autoPlayIfAdmin?: boolean) => void;
  groupMessages?: Message[];
}

export const CallMusicPlayerModal: React.FC<CallMusicPlayerModalProps> = ({
  isOpen,
  onClose,
  isAdmin,
  currentUser,
  currentTrack,
  queue,
  isPlaying,
  currentTime,
  duration,
  volume,
  isLooping = false,
  onTogglePlay,
  onSeek,
  onSkipNext,
  onSkipPrev,
  onSetVolume,
  onToggleLoop,
  onPlayTrack,
  onRemoveTrack,
  onAddTrack,
  groupMessages = []
}) => {
  const [activeTab, setActiveTab] = useState<'player' | 'queue' | 'add'>('player');
  const [customTitle, setCustomTitle] = useState('');
  const [customArtist, setCustomArtist] = useState('');
  const [addedToast, setAddedToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const formatSecs = (secs: number) => {
    if (!secs || isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const trackName = customTitle.trim() || file.name.replace(/\.[^/.]+$/, '');
    const artistName = customArtist.trim() || currentUser.name;
    const url = URL.createObjectURL(file);

    const newTrack: CallMusicTrack = {
      id: `track_upload_${Date.now()}`,
      title: trackName,
      artist: artistName,
      audioUrl: url,
      duration: 180,
      addedBy: {
        id: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar
      },
      addedAt: 'هم‌اکنون',
      fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} مگابایت`
    };

    onAddTrack(newTrack, isAdmin && !currentTrack);
    setCustomTitle('');
    setCustomArtist('');
    setAddedToast(`آهنگ «${trackName}» به صف پخش کال اضافه شد!`);
    setTimeout(() => setAddedToast(null), 3500);
    setActiveTab('queue');
    e.target.value = '';
  };

  const handleAddSampleTrack = (sample: CallMusicTrack) => {
    const trackToAdd: CallMusicTrack = {
      ...sample,
      id: `track_sample_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      addedBy: {
        id: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar
      },
      addedAt: 'هم‌اکنون'
    };
    onAddTrack(trackToAdd, isAdmin && !currentTrack);
    setAddedToast(`آهنگ «${sample.title}» به صف پخش اضافه شد!`);
    setTimeout(() => setAddedToast(null), 3500);
    setActiveTab('queue');
  };

  const audioMessages = groupMessages.filter(
    (m) => m.type === 'audio' || (m.type === 'document' && m.fileName?.match(/\.(mp3|wav|m4a|ogg|aac|flac)$/i)) || (m.type === 'voice' && m.mediaUrl)
  );

  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in select-none"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-[#111923] border border-cyan-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-3.5 sm:p-4 bg-gradient-to-r from-cyan-950/80 via-slate-900 to-indigo-950/80 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 flex items-center justify-center shadow-inner">
              <Disc3 className={`w-5 h-5 ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-white">پخش‌کننده موسیقی در کال</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono">
                  DJ BOT
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                {isAdmin ? 'مدیریت و کنترل پخش موسیقی برای تمام اعضای گفتگو' : 'شنیدن زنده موسیقی و پیشنهاد آهنگ'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-slate-800 bg-[#0d141e] px-3 pt-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('player')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'player'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>پخش زنده</span>
            {isPlaying && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping mr-1" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('queue')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'queue'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListMusic className="w-3.5 h-3.5" />
            <span>صف پخش</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-cyan-400 font-mono">
              {queue.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('add')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer mr-auto ${
              activeTab === 'add'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ارسال و افزودن آهنگ</span>
          </button>
        </div>

        {/* Toast Notification */}
        {addedToast && (
          <div className="bg-emerald-500/20 border-b border-emerald-500/40 text-emerald-300 text-xs px-4 py-2 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{addedToast}</span>
            </div>
            <button onClick={() => setAddedToast(null)} className="text-emerald-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {/* TAB 1: PLAYER / NOW PLAYING */}
          {activeTab === 'player' && (
            <div className="space-y-5">
              {currentTrack ? (
                <>
                  {/* Rotating Vinyl / Artwork Card */}
                  <div className="relative p-6 rounded-3xl bg-gradient-to-b from-slate-900 via-[#131d2a] to-slate-900 border border-slate-800/80 shadow-inner flex flex-col items-center text-center overflow-hidden">
                    {/* Glowing background aura */}
                    <div className={`absolute w-44 h-44 rounded-full bg-cyan-500/10 blur-3xl transition-opacity pointer-events-none ${isPlaying ? 'opacity-100 scale-125' : 'opacity-20'}`} />

                    {/* Vinyl Record */}
                    <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-black border-4 border-slate-700/80 shadow-2xl flex items-center justify-center p-2 mb-4 group">
                      {/* Grooves */}
                      <div className="absolute inset-2 rounded-full border border-white/5" />
                      <div className="absolute inset-5 rounded-full border border-white/5" />
                      <div className="absolute inset-8 rounded-full border border-white/5" />

                      {/* Center album image */}
                      <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-cyan-400 shadow-lg ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }}>
                        <img 
                          src={currentTrack.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&auto=format&fit=crop&q=80'} 
                          alt={currentTrack.title} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      
                      {/* Center spindle hole */}
                      <div className="absolute w-4 h-4 rounded-full bg-slate-900 border-2 border-white/40" />
                    </div>

                    {/* Title and Artist */}
                    <h4 className="text-base sm:text-lg font-black text-white px-2 line-clamp-1">
                      {currentTrack.title}
                    </h4>
                    <p className="text-xs text-cyan-300 font-medium mt-0.5">
                      {currentTrack.artist || 'هنرمند ناشناس'}
                    </p>

                    {/* Requester Badge */}
                    <div className="mt-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-[11px] text-slate-300">
                      <span>ارسال شده توسط:</span>
                      <span className="font-extrabold text-cyan-400">{currentTrack.addedBy.name}</span>
                      {currentTrack.addedBy.avatar && (
                        <img 
                          src={currentTrack.addedBy.avatar} 
                          alt={currentTrack.addedBy.name} 
                          className="w-4 h-4 rounded-full object-cover mr-1"
                        />
                      )}
                    </div>

                    {/* Animated Equalizer Wave */}
                    {isPlaying && (
                      <div className="flex items-center gap-1 mt-4 h-6">
                        {[40, 75, 95, 60, 85, 100, 70, 50, 90, 65, 80, 45, 90, 60].map((h, i) => (
                          <span 
                            key={i} 
                            className="w-1 bg-gradient-to-t from-cyan-500 to-emerald-400 rounded-full animate-pulse"
                            style={{ 
                              height: `${h}%`,
                              animationDuration: `${0.4 + (i % 5) * 0.15}s`
                            }} 
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Progress Bar & Time */}
                  <div className="space-y-1.5 px-1">
                    <div 
                      className="relative w-full h-2 rounded-full bg-slate-800 cursor-pointer overflow-hidden group"
                      onClick={(e) => {
                        if (!isAdmin && !duration) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                        onSeek(percent * duration);
                      }}
                    >
                      <div 
                        className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-100"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] font-mono text-slate-400">
                      <span>{formatSecs(currentTime)}</span>
                      <span>{formatSecs(duration)}</span>
                    </div>
                  </div>

                  {/* Playback Controls */}
                  <div className="flex flex-col items-center gap-3 pt-1">
                    {/* Main Buttons */}
                    <div className="flex items-center gap-4">
                      {/* Loop */}
                      <button
                        type="button"
                        onClick={onToggleLoop}
                        className={`p-2.5 rounded-full transition-all cursor-pointer ${
                          isLooping 
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' 
                            : 'text-slate-400 hover:text-white'
                        }`}
                        title={isLooping ? 'تکرار فعال' : 'تکرار مجدد آهنگ'}
                        disabled={!isAdmin}
                      >
                        <Repeat className="w-4 h-4" />
                      </button>

                      {/* Previous Track */}
                      <button
                        type="button"
                        onClick={onSkipPrev}
                        disabled={!isAdmin}
                        className={`p-3 rounded-2xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-all ${
                          !isAdmin ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:scale-105'
                        }`}
                        title="آهنگ قبلی"
                      >
                        <SkipBack className="w-5 h-5" />
                      </button>

                      {/* Play / Pause Toggle */}
                      <button
                        type="button"
                        onClick={onTogglePlay}
                        disabled={!isAdmin}
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-xl ${
                          !isAdmin
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : 'bg-gradient-to-tr from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-white shadow-cyan-500/30 cursor-pointer hover:scale-105'
                        }`}
                        title={!isAdmin ? 'تنها مدیران می‌توانند آهنگ را کنترل کنند' : isPlaying ? 'توقف پخش' : 'پخش آهنگ'}
                      >
                        {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-0.5" />}
                      </button>

                      {/* Next Track */}
                      <button
                        type="button"
                        onClick={onSkipNext}
                        disabled={!isAdmin || queue.length === 0}
                        className={`p-3 rounded-2xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-all ${
                          !isAdmin || queue.length === 0 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:scale-105'
                        }`}
                        title="آهنگ بعدی در صف"
                      >
                        <SkipForward className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Admin notice or Member notification */}
                    {!isAdmin ? (
                      <div className="w-full p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] text-center flex items-center justify-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                        <span>شما در حال شنیدن آهنگ هستید. کنترل توقف و تعویض آهنگ در اختیار مدیران است.</span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>شما به عنوان مدیر، کنترل کامل پخش موسیقی در این کال را دارید.</span>
                      </div>
                    )}

                    {/* Volume Slider */}
                    <div className="w-full max-w-xs flex items-center gap-3 px-2 pt-2">
                      <button 
                        type="button"
                        onClick={() => onSetVolume(volume === 0 ? 0.8 : 0)}
                        className="text-slate-400 hover:text-white cursor-pointer"
                      >
                        {volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
                      </button>
                      <input 
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={volume}
                        onChange={(e) => onSetVolume(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                      />
                      <span className="text-[10px] font-mono text-slate-400 w-8 text-left">
                        {Math.round(volume * 100)}%
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                /* Empty state: No song currently playing */
                <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-4">
                  <div className="w-16 h-16 rounded-3xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 mx-auto flex items-center justify-center">
                    <Music className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">آهنگی در حال پخش نیست</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                      اعضای گروه می‌توانند با دکمه زیر آهنگ دلخواهشان را بفرستند تا مدیر آن را در کال پخش کند.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('add')}
                    className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                  >
                    ارسال و انتخاب آهنگ برای پخش
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: QUEUE */}
          {activeTab === 'queue' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
                <span>تعداد کل آهنگ‌های در صف: <strong>{queue.length}</strong></span>
                <button
                  type="button"
                  onClick={() => setActiveTab('add')}
                  className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>افزودن آهنگ دیگر</span>
                </button>
              </div>

              {queue.length === 0 ? (
                <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
                  <ListMusic className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400">صف پخش در حال حاضر خالی است.</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('add')}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold cursor-pointer"
                  >
                    افزودن اولین آهنگ به صف
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {queue.map((track, idx) => (
                    <div 
                      key={track.id}
                      className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="text-xs font-mono font-bold text-slate-500 w-4 text-center">
                          {idx + 1}
                        </span>
                        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center flex-shrink-0">
                          <FileAudio className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h5 className="text-xs sm:text-sm font-bold text-white truncate">
                            {track.title}
                          </h5>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5 truncate">
                            <span>{track.artist || 'ناشناس'}</span>
                            <span>•</span>
                            <span className="text-cyan-300">ارسال از {track.addedBy.name}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => onPlayTrack(track)}
                            className="px-2.5 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                            title="پخش فوری این آهنگ در کال"
                          >
                            <Play className="w-3 h-3 ml-0.5" />
                            <span>پخش</span>
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => onRemoveTrack(track.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer"
                            title="حذف از صف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ADD SONG (Send song to call) */}
          {activeTab === 'add' && (
            <div className="space-y-5">
              {/* Option 1: Direct File Upload */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-cyan-500/30 space-y-3">
                <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold">
                  <Upload className="w-4 h-4" />
                  <span>آپلود فایل موسیقی از حافظه گوشی / کامپیوتر</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  فایل صوتی با فرمت MP3، M4A، WAV یا OGG را انتخاب کنید تا برای پخش در کال آماده شود.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="عنوان آهنگ (اختیاری)"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="w-full bg-[#17212b] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400"
                  />
                  <input
                    type="text"
                    placeholder="نام خواننده / هنرمند (اختیاری)"
                    value={customArtist}
                    onChange={(e) => setCustomArtist(e.target.value)}
                    className="w-full bg-[#17212b] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400"
                  />
                </div>

                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac" 
                  className="hidden" 
                  onChange={handleFileUpload}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>انتخاب فایل آهنگ و افزودن به کال</span>
                </button>
              </div>

              {/* Option 2: Choose from songs already in the chat */}
              {audioMessages.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-white text-xs font-bold">
                    <FileAudio className="w-4 h-4 text-emerald-400" />
                    <span>آهنگ‌های فرستاده شده در گفتگوی گروه</span>
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {audioMessages.map((m) => (
                      <div 
                        key={m.id}
                        className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-200 truncate">
                            {m.audioTitle || m.fileName || m.text || 'فایل صوتی گروه'}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            فرستنده: {m.senderName}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (!m.mediaUrl) return;
                            const newTrack: CallMusicTrack = {
                              id: `track_msg_${m.id}`,
                              title: m.audioTitle || m.fileName || m.text || 'آهنگ ارسالی گروه',
                              artist: m.audioPerformer || m.senderName,
                              audioUrl: m.mediaUrl,
                              duration: m.voiceDuration || 180,
                              addedBy: {
                                id: currentUser.id,
                                name: currentUser.name,
                                avatar: currentUser.avatar
                              },
                              addedAt: 'هم‌اکنون',
                              sourceMessageId: m.id
                            };
                            onAddTrack(newTrack, isAdmin && !currentTrack);
                            setAddedToast(`آهنگ «${newTrack.title}» به صف پخش اضافه شد!`);
                            setTimeout(() => setAddedToast(null), 3500);
                            setActiveTab('queue');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>افزودن به کال</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Option 3: Presets & Popular Songs */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-white text-xs font-bold">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>آهنگ‌های آماده برای تست سریع کال (بدون نیاز به فایل)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SAMPLE_CALL_TRACKS.map((sample) => (
                    <div 
                      key={sample.id}
                      className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 transition-all flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-200 text-xs truncate">{sample.title}</div>
                        <div className="text-[10px] text-cyan-300 truncate">{sample.artist}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddSampleTrack(sample)}
                        className="p-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 cursor-pointer flex-shrink-0"
                        title="افزودن این آهنگ"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#0d141e] border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span>وضعیت پلیر: <strong>{isPlaying ? 'در حال پخش آنلاین' : 'متوقف'}</strong></span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors cursor-pointer"
          >
            بستن پنل
          </button>
        </div>
      </div>
    </div>
  );
};
