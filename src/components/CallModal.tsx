import React, { useState, useEffect, useRef } from 'react';
import { ChatType, User, ChatMember } from '../types/telegram';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Monitor, 
  PhoneOff, 
  Volume2, 
  Radio, 
  Users, 
  Hand, 
  Share2, 
  Check, 
  AlertTriangle, 
  Camera, 
  LogOut, 
  Maximize2, 
  Minimize2,
  Plus,
  UserPlus
} from 'lucide-react';

export interface CallParticipant {
  id: string;
  name: string;
  avatar: string;
  isSpeaking?: boolean;
  hasVideo?: boolean;
  isMuted?: boolean;
  role?: string;
  videoGradient?: string;
}

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  callerName: string;
  callerAvatar: string;
  fingerprintEmojis?: string[];
  chatType?: ChatType;
  membersCount?: number;
  isAdmin?: boolean;
  onLeaveCall?: () => void;
  onEndCallForEveryone?: () => void;
  activeParticipants?: CallParticipant[];
  initialCallType?: 'audio' | 'video';
  currentUser?: User;
  chatMembers?: ChatMember[];
}

// لیست شرکت‌کنندگان پیش‌فرض تلگرام برای سناریوی ۱۰ نفره زنده
const SAMPLE_GROUP_PARTICIPANTS: CallParticipant[] = [
  {
    id: 'usr_p1_reza',
    name: 'محمدرضا فتح‌آبادی',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    isSpeaking: true,
    hasVideo: true,
    isMuted: false,
    role: '👑 سازنده گروه',
    videoGradient: 'from-blue-900/60 via-slate-900 to-indigo-950'
  },
  {
    id: 'usr_p2_artin',
    name: 'آرتین رادمنش',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    isSpeaking: false,
    hasVideo: true,
    isMuted: false,
    role: '⚡ ادمین',
    videoGradient: 'from-emerald-950/60 via-slate-900 to-teal-950'
  },
  {
    id: 'usr_p3_sara',
    name: 'سارا محمدی',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
    isSpeaking: false,
    hasVideo: true,
    isMuted: false,
    role: 'عضو',
    videoGradient: 'from-purple-950/60 via-slate-900 to-pink-950'
  },
  {
    id: 'usr_p4_ali',
    name: 'علی تهرانی',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    isSpeaking: true,
    hasVideo: true,
    isMuted: false,
    role: 'عضو',
    videoGradient: 'from-amber-950/60 via-slate-900 to-orange-950'
  },
  {
    id: 'usr_p5_nima',
    name: 'نیما خسروی',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80',
    isSpeaking: false,
    hasVideo: true,
    isMuted: true,
    role: 'ناظم',
    videoGradient: 'from-cyan-950/60 via-slate-900 to-blue-950'
  },
  {
    id: 'usr_p6_maryam',
    name: 'مریم اسدی',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
    isSpeaking: false,
    hasVideo: true,
    isMuted: false,
    role: 'عضو',
    videoGradient: 'from-rose-950/60 via-slate-900 to-red-950'
  },
  {
    id: 'usr_p7_kian',
    name: 'کیانوش بهرامی',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80',
    isSpeaking: false,
    hasVideo: true,
    isMuted: true,
    role: 'عضو',
    videoGradient: 'from-violet-950/60 via-slate-900 to-indigo-950'
  },
  {
    id: 'usr_p8_parisa',
    name: 'پریسا احمدی',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
    isSpeaking: false,
    hasVideo: true,
    isMuted: false,
    role: 'عضو',
    videoGradient: 'from-teal-950/60 via-slate-900 to-emerald-950'
  },
  {
    id: 'usr_p9_farzad',
    name: 'فرزاد رستمی',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80',
    isSpeaking: false,
    hasVideo: true,
    isMuted: true,
    role: 'عضو',
    videoGradient: 'from-slate-900 via-gray-900 to-zinc-950'
  }
];

export const CallModal: React.FC<CallModalProps> = ({
  isOpen,
  onClose,
  callerName,
  callerAvatar,
  chatType = 'private',
  membersCount = 1,
  isAdmin = false,
  onLeaveCall,
  onEndCallForEveryone,
  activeParticipants = [],
  initialCallType = 'audio',
  currentUser
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(initialCallType === 'audio');
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [handRaised, setHandRaised] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cameraError, setCameraError] = useState(false);

  // تعداد اعضای شبیه‌سازی‌شده (از ۱ تا ۱۰ نفر) برای تست و ریسپانسیو کامل
  const [participantLimit, setParticipantLimit] = useState(10);
  const [allCamerasOn, setAllCamerasOn] = useState(true);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  const isGroupVoiceChat = chatType === 'group' || chatType === 'supergroup' || chatType === 'channel';

  // مدت زمان تماس و مقداردهی اولیه
  useEffect(() => {
    if (!isOpen) {
      setCallDuration(0);
      setShowEndConfirm(false);
      setIsFullscreen(false);
      return;
    }

    if (initialCallType === 'video') {
      setIsVideoOff(false);
    } else {
      setIsVideoOff(true);
    }

    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, initialCallType]);

  // دسترسی به دوربین فیزیکی کاربر
  useEffect(() => {
    let localStream: MediaStream | null = null;
    if (isOpen && !isVideoOff) {
      setCameraError(false);
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true, audio: !isMuted })
          .then((stream) => {
            localStream = stream;
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = stream;
            }
          })
          .catch((err) => {
            console.warn('دسترسی به دوربین توسط مرورگر رد شد یا در دسترس نیست:', err);
            setCameraError(true);
          });
      } else {
        setCameraError(true);
      }
    } else {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
    }

    return () => {
      localStream?.getTracks().forEach((track) => track.stop());
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [isOpen, isVideoOff, isMuted]);

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
      setIsScreenSharing(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = stream;
        setIsScreenSharing(true);
        stream.getVideoTracks()[0].onended = () => setIsScreenSharing(false);
      } catch (err) {
        console.warn('اشتراک صفحه لغو شد:', err);
      }
    }
  };

  const handleLeave = () => {
    if (onLeaveCall) {
      onLeaveCall();
    } else {
      onClose();
    }
  };

  const handleEndEveryone = () => {
    if (onEndCallForEveryone) {
      onEndCallForEveryone();
    } else {
      onClose();
    }
    setShowEndConfirm(false);
  };

  if (!isOpen) return null;

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // تهیه لیست کامل شرکت‌کنندگان با پشتیبانی تضمینی از ۱۰ نفر
  const currentUserName = currentUser?.name || 'شما';
  const currentUserAvatar = currentUser?.avatar || callerAvatar;
  const currentUserId = currentUser?.id || 'usr_local_me';

  const localParticipant: CallParticipant = {
    id: currentUserId,
    name: `${currentUserName} (شما)`,
    avatar: currentUserAvatar,
    isSpeaking: !isMuted,
    hasVideo: !isVideoOff,
    isMuted: isMuted,
    role: isAdmin ? '👑 سازنده' : 'شما'
  };

  // ترکیب شرکت‌کنندگان ورودی و شرکت‌کنندگان نمونه تا سقف انتخاب‌شده (مثلاً ۱۰ نفر)
  let participantsList: CallParticipant[] = [];

  if (!isGroupVoiceChat) {
    // تماس دونفره (P2P 1-on-1)
    participantsList = [
      localParticipant,
      {
        id: 'usr_peer_remote',
        name: callerName,
        avatar: callerAvatar,
        isSpeaking: true,
        hasVideo: !isVideoOff || allCamerasOn,
        isMuted: false,
        role: 'مخاطب',
        videoGradient: 'from-blue-950 via-slate-900 to-indigo-950'
      }
    ];
  } else {
    // گفتگوی گروهی (Group Voice / Video Call):
    // اگر از قبل اکتیو پارتیسیپنت داشتیم، آن را ادغام می‌کنیم؛ در غیر اینصورت لیست کامل ۱۰ نفره را فراهم می‌کنیم
    const externalPeers = activeParticipants.filter((p) => p.id !== currentUserId);
    const basePeers = externalPeers.length > 0 ? externalPeers : SAMPLE_GROUP_PARTICIPANTS;

    const slicedPeers = basePeers.slice(0, participantLimit - 1).map((p) => ({
      ...p,
      hasVideo: allCamerasOn ? true : Boolean(p.hasVideo)
    }));

    participantsList = [localParticipant, ...slicedPeers];
  }

  const totalCount = participantsList.length;

  // کلاس‌های شبکه (Grid Layout) الهام‌گرفته از ساختار باز تلگرام وب
  const getGridClasses = (count: number) => {
    if (count <= 1) return 'grid-cols-1 auto-rows-fr';
    if (count === 2) return 'grid-cols-1 sm:grid-cols-2 auto-rows-fr';
    if (count <= 4) return 'grid-cols-2 auto-rows-fr';
    if (count <= 6) return 'grid-cols-2 md:grid-cols-3 auto-rows-fr';
    if (count <= 8) return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 auto-rows-fr';
    return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 auto-rows-fr';
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-2xl select-none animate-in fade-in duration-200 ${
        isFullscreen ? 'p-0' : 'p-2 sm:p-4'
      }`}
    >
      <div
        className={`relative bg-[#0d141e] border border-slate-800 shadow-2xl flex flex-col justify-between overflow-hidden transition-all duration-200 ${
          isFullscreen 
            ? 'w-screen h-screen rounded-none' 
            : 'w-full max-w-6xl h-[92vh] max-h-[880px] rounded-2xl sm:rounded-3xl'
        }`}
      >
        
        {/* ==============================================================
            TOP FLOATING HEADER (Telegram Style - Minimalist)
           ============================================================== */}
        <div className="relative z-20 px-3 sm:px-5 py-2.5 sm:py-3 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent flex-shrink-0">
          {/* Left: Chat info & live timer */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 border-emerald-400/80 shadow-md flex-shrink-0">
              <img src={callerAvatar} alt={callerName} className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-xs sm:text-sm truncate">{callerName}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex-shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>{!isVideoOff ? 'ویدیو کال زنده' : 'ویس کال زنده'}</span>
                </span>
              </div>
              <div className="text-[11px] text-emerald-400 flex items-center gap-2 mt-0.5 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{formatDuration(callDuration)}</span>
                <span className="text-slate-400 font-sans">•</span>
                <span className="text-cyan-300 font-sans flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>{totalCount} نفر حاضر</span>
                </span>
              </div>
            </div>
          </div>

          {/* Right: Mode toggles and actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Camera switch for all peers */}
            {isGroupVoiceChat && (
              <button
                onClick={() => setAllCamerasOn(!allCamerasOn)}
                className={`px-2 sm:px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
                  allCamerasOn 
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30' 
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                }`}
                title="تغییر وضعیت وب‌کم سایر اعضا"
              >
                <Camera className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{allCamerasOn ? 'دوربین همه روشن' : 'دوربین اعضا'}</span>
              </button>
            )}

            {/* Invite Button */}
            <button
              onClick={() => {
                navigator.clipboard?.writeText?.(window.location.href);
                setInviteCopied(true);
                setTimeout(() => setInviteCopied(false), 2000);
              }}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer text-xs flex items-center gap-1"
              title="کپی لینک تماس"
            >
              {inviteCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
              <span className="hidden md:inline">{inviteCopied ? 'کپی شد' : 'دعوت'}</span>
            </button>

            {/* Fullscreen toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 sm:p-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
              title={isFullscreen ? 'خروج از تمام‌صفحه' : 'حالت تمام‌صفحه (Fullscreen)'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* ==============================================================
            CENTER VIDEO GRID (Telegram Web K & A Call Architecture)
            - 100% CLEAN CAMERA STREAM (Zero center text or blocking overlays)
            - Fully responsive up to 10+ participants simultaneously
           ============================================================== */}
        <div className="flex-1 p-2 sm:p-3 overflow-hidden min-h-0 min-w-0 flex items-center justify-center">
          <div className={`w-full h-full grid gap-1.5 sm:gap-2.5 ${getGridClasses(totalCount)}`}>
            {participantsList.map((participant) => {
              const isLocalUser = participant.id === currentUserId;
              const hasActiveCamera = isLocalUser ? (!isVideoOff && !cameraError) : Boolean(participant.hasVideo);

              return (
                <div
                  key={participant.id}
                  className={`relative w-full h-full min-h-0 min-w-0 rounded-xl sm:rounded-2xl overflow-hidden bg-[#151f2b] border transition-all duration-150 flex items-center justify-center group ${
                    participant.isSpeaking
                      ? 'border-emerald-400/80 ring-2 ring-emerald-400/40 shadow-lg shadow-emerald-500/20'
                      : 'border-slate-800/90'
                  }`}
                >
                  {/* 1. CAMERA VIDEO FEED (When camera is on) - 100% UNBLOCKING VIEW */}
                  {hasActiveCamera ? (
                    <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
                      {isLocalUser ? (
                        <video
                          ref={localVideoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover transform -scale-x-100"
                        />
                      ) : (
                        /* Realistic live camera stream for participant */
                        <div className={`w-full h-full bg-gradient-to-tr ${participant.videoGradient || 'from-slate-900 to-indigo-950'} flex items-center justify-center relative overflow-hidden`}>
                          <img
                            src={participant.avatar}
                            alt={participant.name}
                            className="w-full h-full object-cover opacity-90 scale-105 filter contrast-105"
                          />
                          {/* Subtle WebRTC scanline overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                        </div>
                      )}
                    </div>
                  ) : (
                    /* 2. VOICE CHAT TILE (When camera is off) - PURE TELEGRAM AUDIO AVATAR */
                    <div className="relative w-full h-full flex items-center justify-center bg-[#151f2b]">
                      {/* Pulse rings when speaking */}
                      {participant.isSpeaking && (
                        <>
                          <div className="absolute w-24 h-24 sm:w-32 sm:h-32 rounded-full border border-emerald-400/20 animate-ping pointer-events-none" />
                          <div className="absolute w-20 h-20 sm:w-28 sm:h-28 rounded-full border border-teal-400/30 animate-pulse pointer-events-none" />
                        </>
                      )}

                      <div
                        className={`w-14 h-14 sm:w-18 sm:h-18 md:w-20 md:h-20 rounded-full overflow-hidden border-2 transition-transform duration-200 shadow-xl ${
                          participant.isSpeaking
                            ? 'border-emerald-400 scale-105 shadow-emerald-500/30'
                            : 'border-slate-700'
                        }`}
                      >
                        <img
                          src={participant.avatar}
                          alt={participant.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )}

                  {/* 3. MINIMAL TELEGRAM CORNER PILL (Bottom-Left) - NEVER BLOCKS VIEW */}
                  <div className="absolute bottom-1.5 left-1.5 z-10 flex items-center gap-1 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/10 text-white text-[10px] sm:text-[11px] font-semibold shadow-md max-w-[85%] pointer-events-none">
                    {/* Mic indicator */}
                    {participant.isMuted ? (
                      <MicOff className="w-3 h-3 text-rose-400 flex-shrink-0" />
                    ) : participant.isSpeaking ? (
                      <span className="flex items-center gap-0.5 flex-shrink-0">
                        <span className="w-0.5 h-2 bg-emerald-400 rounded-full animate-pulse" />
                        <span className="w-0.5 h-3 bg-emerald-400 rounded-full animate-pulse delay-75" />
                        <span className="w-0.5 h-1.5 bg-emerald-400 rounded-full animate-pulse delay-150" />
                      </span>
                    ) : (
                      <Mic className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                    )}

                    {/* Camera icon */}
                    {hasActiveCamera && (
                      <Video className="w-2.5 h-2.5 text-cyan-400 flex-shrink-0" />
                    )}

                    {/* Participant Name */}
                    <span className="truncate">{participant.name}</span>

                    {/* Role badge */}
                    {participant.role && participant.role !== 'عضو' && participant.role !== 'شما' && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-white/15 text-slate-200 flex-shrink-0 font-normal">
                        {participant.role}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ==============================================================
            BOTTOM FLOATING ACTION DOCK (Telegram Circular Controls)
           ============================================================== */}
        <div className="relative z-20 p-3 sm:p-5 flex items-center justify-center gap-2.5 sm:gap-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex-shrink-0 flex-wrap">
          {/* 1. Mute / Unmute Microphone */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`px-3.5 sm:px-4 py-2.5 rounded-2xl flex items-center gap-2 transition-all cursor-pointer shadow-xl ${
              isMuted
                ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/25'
                : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/25 ring-2 ring-emerald-300/40'
            }`}
            title={isMuted ? 'وصل میکروفون' : 'قطع میکروفون'}
          >
            {isMuted ? <MicOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Mic className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />}
            <span className="text-xs font-bold hidden sm:inline">
              {isMuted ? 'میکروفون بسته' : 'میکروفون باز'}
            </span>
          </button>

          {/* 2. Camera Toggle (Turn On / Turn Off Video) */}
          <button
            onClick={() => setIsVideoOff(!isVideoOff)}
            className={`px-3.5 sm:px-4 py-2.5 rounded-2xl flex items-center gap-2 transition-all cursor-pointer shadow-lg ${
              !isVideoOff
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-cyan-500/30 ring-2 ring-cyan-300/50'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-cyan-300 border border-slate-700'
            }`}
            title={!isVideoOff ? 'خاموش کردن دوربین' : 'روشن کردن دوربین'}
          >
            {!isVideoOff ? <Video className="w-4 h-4 sm:w-5 sm:h-5 text-white" /> : <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />}
            <span className="text-xs font-bold">
              {!isVideoOff ? 'دوربین روشن' : 'روشن کردن دوربین'}
            </span>
          </button>

          {/* 3. Screen Share */}
          <button
            onClick={toggleScreenShare}
            className={`p-2.5 sm:px-3 sm:py-2.5 rounded-2xl flex items-center gap-1.5 transition-all cursor-pointer ${
              isScreenSharing
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
            }`}
            title="اشتراک صفحه نمایش"
          >
            <Monitor className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-xs font-bold hidden md:inline">اشتراک صفحه</span>
          </button>

          {/* 4. Raise Hand (For speaking turns) */}
          {isGroupVoiceChat && (
            <button
              onClick={() => setHandRaised(!handRaised)}
              className={`p-2.5 sm:px-3 sm:py-2.5 rounded-2xl flex items-center gap-1.5 transition-all cursor-pointer ${
                handRaised
                  ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
              }`}
              title="درخواست نوبت صحبت (بالا بردن دست)"
            >
              <Hand className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-xs font-bold hidden sm:inline">دست</span>
            </button>
          )}

          {/* 5. Leave Call (Without closing for others) */}
          <button
            onClick={handleLeave}
            className="px-3 sm:px-4 py-2.5 rounded-2xl bg-slate-700 hover:bg-slate-600 text-white flex items-center gap-1.5 shadow-lg transition-all cursor-pointer border border-slate-600"
            title="ترک گفتگو (تماس برای بقیه باز می‌ماند)"
          >
            <LogOut className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" />
            <span className="text-xs font-bold">ترک تماس</span>
          </button>

          {/* 6. Admin End Call For Everyone */}
          {isGroupVoiceChat ? (
            isAdmin ? (
              <button
                onClick={() => setShowEndConfirm(true)}
                className="px-3 sm:px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 shadow-lg shadow-rose-600/40 transition-all cursor-pointer hover:scale-102"
                title="پایان دادن به تماس برای همه اعضای گروه (مخصوص مدیر)"
              >
                <PhoneOff className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-xs font-bold hidden sm:inline">پایان برای همه</span>
              </button>
            ) : null
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 shadow-lg shadow-rose-600/40 transition-all cursor-pointer hover:scale-102"
              title="قطع تماس"
            >
              <PhoneOff className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-xs font-bold">قطع تماس</span>
            </button>
          )}
        </div>

        {/* ==============================================================
            CONFIRMATION MODAL: End Call For Everyone (Admin Only)
           ============================================================== */}
        {showEndConfirm && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 mx-auto flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-white text-base">پایان گفتگوی گروهی؟</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                آیا می‌خواهید تماس برای تمام اعضا به اتمام برسد یا مایلید فقط خودتان خارج شوید؟
              </p>
              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={handleEndEveryone}
                  className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-md"
                >
                  پایان دادن به تماس برای همه
                </button>
                <button
                  onClick={() => {
                    setShowEndConfirm(false);
                    handleLeave();
                  }}
                  className="w-full py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium transition-colors cursor-pointer"
                >
                  فقط خودم خارج شوم (تماس باز بماند)
                </button>
                <button
                  onClick={() => setShowEndConfirm(false)}
                  className="w-full py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  انصراف
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
