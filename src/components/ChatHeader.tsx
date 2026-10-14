import React, { useState } from 'react';
import { Chat, User } from '../types/telegram';
import { 
  Phone, 
  Video, 
  Search, 
  MoreVertical, 
  Globe, 
  Shield, 
  Sparkles, 
  ChevronDown, 
  Rocket, 
  Layers, 
  Lock, 
  ArrowRight,
  Volume2,
  Radio,
  UserPlus,
  Users,
  Share2,
  Check,
  X,
  CheckCircle2,
  Info,
  Palette,
  UserX,
  Trash2,
  Music,
  Disc3
} from 'lucide-react';
import { GroupProfileModal } from './GroupProfileModal';
import { getChatShareLink } from '../utils/linkHelper';

interface ChatHeaderProps {
  chat: Chat;
  currentUser: User;
  onStartCall: (type: 'audio' | 'video') => void;
  onOpenMiniApp?: () => void;
  isTranslating: boolean;
  onToggleTranslate: () => void;
  onSelectTopic?: (topicId: string) => void;
  onBackMobile?: () => void;
  usersList?: User[];
  onAddMemberToChat?: (memberName: string) => void;
  onUpdateBio?: (newBio: string) => void;
  onToggleChatAdmin?: (chatId: string, memberId: string, grantAdmin: boolean) => void;
  onToggleSearch?: () => void;
  isSearchOpen?: boolean;
  onOpenWallpaperSettings?: () => void;
  onClearHistory?: (chatId: string) => void;
  onDeleteChat?: (chatId: string) => void;
  onToggleBlockUser?: (userId: string, userName?: string) => void;
  isBlocked?: boolean;
  onUpdateChatPhotos?: (chatId: string, photos: string[], mainAvatar: string) => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  chat,
  currentUser,
  onStartCall,
  onOpenMiniApp,
  isTranslating,
  onToggleTranslate,
  onSelectTopic,
  onBackMobile,
  usersList = [],
  onAddMemberToChat,
  onUpdateBio,
  onToggleChatAdmin,
  onToggleSearch,
  isSearchOpen,
  onOpenWallpaperSettings,
  onClearHistory,
  onDeleteChat,
  onToggleBlockUser,
  isBlocked = false,
  onUpdateChatPhotos
}) => {
  const [showTopicMenu, setShowTopicMenu] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showGroupProfile, setShowGroupProfile] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<'clear' | 'delete' | null>(null);

  const isGroup = chat?.type === 'group' || chat?.type === 'supergroup';
  const isChannel = chat?.type === 'channel';

  const isSuperAdmin = currentUser?.phone === '09921758505' || currentUser?.role === 'superadmin' || currentUser?.username === 'izatesplay';

  // The creator of the group is ALWAYS the Owner and Manager
  const isChatOwner =
    isSuperAdmin ||
    Boolean(chat?.creatorId && (
      chat.creatorId === currentUser?.id ||
      chat.creatorId === currentUser?.phone ||
      chat.creatorId === currentUser?.username ||
      chat.creatorId === currentUser?.name
    )) ||
    Boolean(chat?.members?.some(m =>
      (m.id === currentUser?.id || m.username === currentUser?.username || m.phone === currentUser?.phone || m.name === currentUser?.name) &&
      m.role === 'owner'
    )) ||
    chat?.isUserAdmin === true ||
    Boolean(!chat?.creatorId && (chat?.id?.startsWith('group_') || chat?.id?.startsWith('channel_')));

  const isAssignedAdmin = Boolean(chat?.members?.some(m =>
    (m.id === currentUser?.id || m.username === currentUser?.username || m.phone === currentUser?.phone || m.name === currentUser?.name) &&
    (m.role === 'admin' || m.role === 'owner')
  ));

  const isChatAdmin = isSuperAdmin || isChatOwner || isAssignedAdmin || chat?.isUserAdmin === true;
  const isCallActive = !!chat?.activeCall?.isActive;

  const handleVoiceCallClick = (type: 'audio' | 'video' = 'audio') => {
    if (isGroup || isChannel) {
      if (!isCallActive && !isChatAdmin) {
        setToastMsg('فقط مدیران و سازنده گروه می‌توانند گفتگوی صوتی یا تصویری را آغاز کنند.');
        setTimeout(() => setToastMsg(null), 4000);
        return;
      }
    }
    onStartCall(type);
  };

  const activeTopic = chat.topics?.find((t) => t.id === chat.activeTopicId);

  return (
    <div className="relative border-b border-slate-800 bg-[#1e293b]/95 backdrop-blur-md px-2.5 sm:px-4 py-2 sm:py-3 z-20 flex flex-col flex-shrink-0">
      <div className="flex items-center justify-between gap-1.5 sm:gap-2">
        {/* Left: Chat info with mobile back button */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {onBackMobile && (
            <button
              onClick={onBackMobile}
              className="md:hidden p-1.5 -mr-1 text-slate-300 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer flex-shrink-0"
              title="بازگشت به چت‌ها"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          )}

          {/* Group / Channel / Contact Profile trigger: Clicking on photo or title shows members and bio */}
          {(() => {
            const isSavedChat = chat.id === 'chat_saved';
            const isChannelChat = chat.type === 'channel';
            const isPrivateChat = chat.type === 'private' && !isSavedChat;
            const partnerUser = isPrivateChat
              ? (usersList || []).find(
                  (u) =>
                    u.id === chat.id ||
                    u.phone === chat.id ||
                    (chat.username && u.username && u.username.toLowerCase() === chat.username.toLowerCase()) ||
                    (chat.members && chat.members.some((m) => m.id === u.id && u.id !== currentUser?.id))
                )
              : null;
            const isOnlineNow = partnerUser ? Boolean(partnerUser.isOnline) : false;
            const statusString = isOnlineNow ? 'آنلاین' : (partnerUser?.lastSeen || 'آخرین بازدید اخیراً');

            return (
              <button
                onClick={() => setShowGroupProfile(true)}
                className="flex items-center gap-2 sm:gap-3 min-w-0 text-right cursor-pointer group hover:opacity-90 transition-all text-inherit"
                title="برای مشاهده بیو و اعضای گفتگو کلیک کنید"
              >
                <div className="relative flex-shrink-0">
                  <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full overflow-hidden border border-slate-700 group-hover:ring-2 group-hover:ring-cyan-400 group-hover:scale-105 transition-all shadow-md bg-slate-800 flex items-center justify-center">
                    {isBlocked ? (
                      <Lock className="w-5 h-5 text-slate-500" />
                    ) : (
                      <img src={chat.avatar} alt={chat.title} className="w-full h-full object-cover" />
                    )}
                  </div>
                  {chat.type === 'secret' && !isBlocked && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] shadow">
                      <Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    </div>
                  )}
                  {isPrivateChat && !isBlocked && (
                    <div
                      className={`absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border-2 border-[#1e293b] transition-all duration-300 ${
                        isOnlineNow
                          ? 'bg-emerald-400 shadow-sm shadow-emerald-400/80 ring-1 ring-emerald-500/50'
                          : 'bg-slate-600 opacity-60'
                      }`}
                      title={isOnlineNow ? 'آنلاین' : 'آفلاین (خاموش)'}
                    />
                  )}
                  {isCallActive && !isBlocked && (
                    <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#1e293b] animate-ping" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h2 className="font-extrabold text-white text-xs sm:text-sm truncate group-hover:text-cyan-300 transition-colors">
                      {chat.title}
                    </h2>
                    {isBlocked && (
                      <span className="text-[10px] px-1.5 py-0.2 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-full font-bold">
                        مسدود شده
                      </span>
                    )}
                    {chat.boostLevel && chat.boostLevel > 0 && !isBlocked && (
                      <span className="text-[10px] px-1.5 py-0.2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-full font-mono flex items-center gap-0.5 flex-shrink-0">
                        <Rocket className="w-2.5 h-2.5" />
                        <span>Lvl {chat.boostLevel}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[11px] sm:text-xs text-slate-400 truncate">
                    {(() => {
                      if (isBlocked) {
                        return <span className="text-slate-500">آخرین بازدید خیلی وقت پیش</span>;
                      }
                      if (chat.type === 'secret') {
                        return (
                          <span className="text-emerald-400 flex items-center gap-1 truncate">
                            <Shield className="w-3 h-3 flex-shrink-0" />
                            <span>E2EE • حذف: {chat.secretChatTimer || 10}ثانیه</span>
                          </span>
                        );
                      }
                      if (isSavedChat) {
                        return <span className="text-slate-400">فضای ابری اختصاصی شما</span>;
                      }
                      if (isChannelChat) {
                        return <span className="text-slate-400">{chat.membersCount ? `${chat.membersCount.toLocaleString()} مشترک` : 'کانال رسمی'}</span>;
                      }
                      if (chat.membersCount && chat.type !== 'private') {
                        return (
                          <span className="group-hover:text-cyan-300 transition-colors flex items-center gap-1">
                            <span>{chat.membersCount.toLocaleString()} عضو</span>
                            <span className="text-slate-500 hidden sm:inline">•</span>
                            <span className="text-slate-400 hidden sm:inline">برای بیو و اعضا کلیک کنید</span>
                          </span>
                        );
                      }
                      if (isOnlineNow) {
                        return (
                          <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] ring-2 ring-emerald-500/40 animate-pulse inline-block" title="آنلاین" />
                            <span>آنلاین</span>
                          </span>
                        );
                      }
                      return (
                        <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                          <span className="w-2.5 h-2.5 rounded-full bg-slate-700 border border-slate-600/60 inline-block opacity-40 shadow-inner" title="خاموش (آفلاین)" />
                          <span>{statusString}</span>
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </button>
            );
          })()}

          {/* Supergroup Topic indicator button */}
          {chat.topics && (
            <div className="relative mr-2">
              <button
                onClick={() => setShowTopicMenu(!showTopicMenu)}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] font-medium transition-colors cursor-pointer"
              >
                <Layers className="w-2.5 h-2.5" />
                <span>{activeTopic?.iconEmoji} {activeTopic?.title || 'تاپیک‌ها'}</span>
                <ChevronDown className="w-2.5 h-2.5" />
              </button>

              {/* Topic dropdown */}
              {showTopicMenu && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowTopicMenu(false)} />
                  <div className="absolute top-7 right-0 w-48 rounded-xl bg-slate-900 border border-slate-700 shadow-xl py-1 z-30">
                    {chat.topics.map((topic) => (
                      <button
                        key={topic.id}
                        onClick={() => {
                          onSelectTopic?.(topic.id);
                          setShowTopicMenu(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-1.5 text-xs text-right hover:bg-slate-800 transition-colors ${
                          chat.activeTopicId === topic.id ? 'text-cyan-400 font-bold bg-slate-800/60' : 'text-slate-300'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span>{topic.iconEmoji}</span>
                          <span>{topic.title}</span>
                        </span>
                        {topic.isClosed && <Lock className="w-3 h-3 text-rose-400" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Right Action Icons & Controls */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {/* Live Translation Toggle Button */}
          <button
            onClick={onToggleTranslate}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              isTranslating
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title={isTranslating ? 'ترجمه زنده پیام‌ها فعال است' : 'فعال‌سازی ترجمه هوشمند دوطرفه'}
          >
            <Globe className="w-4 h-4" />
          </button>

          {/* Mini App launcher (for Bots) */}
          {chat.type === 'bot' && onOpenMiniApp && (
            <button
              onClick={onOpenMiniApp}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs font-bold shadow-md hover:from-blue-500 hover:to-cyan-500 transition-all cursor-pointer"
            >
              <span>Mini App</span>
            </button>
          )}

          {/* Group Voice Call & Video Call Buttons */}
          {isGroup && (
            <>
              {isCallActive ? (
                <>
                  <button
                    onClick={() => handleVoiceCallClick('audio')}
                    className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-xs font-bold shadow-lg shadow-emerald-500/30 animate-pulse cursor-pointer transition-all"
                    title="پیوستن به گفتگوی صوتی در جریان"
                  >
                    <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>پیوستن به ویس</span>
                  </button>
                  <button
                    onClick={() => handleVoiceCallClick('video')}
                    className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-cyan-600/30 cursor-pointer transition-all"
                    title="پیوستن به ویدیو کال گروهی با دوربین"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">ویدیو کال</span>
                  </button>
                </>
              ) : isChatAdmin ? (
                <>
                  <button
                    onClick={() => handleVoiceCallClick('audio')}
                    className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-600/25 cursor-pointer transition-all"
                    title="شروع گفتگوی صوتی گروهی (مخصوص مدیر)"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">ویس کال</span>
                  </button>
                  <button
                    onClick={() => handleVoiceCallClick('video')}
                    className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-cyan-600/25 cursor-pointer transition-all"
                    title="شروع ویدیو کال گروهی با دوربین (مخصوص مدیر)"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">ویدیو کال</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleVoiceCallClick('audio')}
                  className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium border border-slate-700/80 cursor-pointer transition-all"
                  title="فقط مدیران و سازنده گروه می‌توانند گفتگوی صوتی و تصویری را آغاز کنند"
                >
                  <Lock className="w-3 h-3 text-amber-400" />
                  <span className="hidden sm:inline">کال (منتظر مدیر)</span>
                </button>
              )}

              {/* View Group Info & Members Button */}
              <button
                onClick={() => setShowGroupProfile(true)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold border border-slate-700 cursor-pointer transition-all"
                title="مشاهده بیو و اعضای گروه"
              >
                <Users className="w-3.5 h-3.5" />
                <span className="hidden md:inline">اعضا و بیو</span>
              </button>
            </>
          )}

          {/* Channel Voice Stream Button */}
          {isChannel && (
            <>
              {isCallActive ? (
                <button
                  onClick={() => handleVoiceCallClick('audio')}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white text-xs font-bold shadow-lg shadow-amber-500/30 animate-pulse cursor-pointer transition-all"
                  title="پیوستن به پخش زنده کانال"
                >
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  <Radio className="w-3.5 h-3.5" />
                  <span>پیوستن به پخش زنده</span>
                </button>
              ) : isChatAdmin ? (
                <button
                  onClick={() => handleVoiceCallClick('audio')}
                  className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white text-xs font-bold shadow-md shadow-amber-600/25 cursor-pointer transition-all"
                  title="آغاز پخش زنده کانال (مخصوص مدیر)"
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">شروع پخش زنده</span>
                </button>
              ) : (
                <button
                  onClick={() => handleVoiceCallClick('audio')}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium border border-slate-700/80 cursor-pointer transition-all"
                  title="فقط مدیران می‌توانند پخش زنده را آغاز کنند"
                >
                  <Lock className="w-3 h-3 text-amber-400" />
                  <span className="hidden sm:inline">پخش زنده (منتظر مدیر)</span>
                </button>
              )}

              <button
                onClick={() => setShowGroupProfile(true)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-slate-700 cursor-pointer transition-all"
                title="مشاهده اطلاعات کانال"
              >
                <Info className="w-3.5 h-3.5" />
                <span className="hidden md:inline">اطلاعات</span>
              </button>
            </>
          )}

          {/* 1-on-1 Audio/Video Call Buttons */}
          {!isGroup && !isChannel && (
            <>
              <button
                onClick={() => onStartCall('audio')}
                className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                title="تماس صوتی رمزنگاری شده (Voice Call)"
              >
                <Phone className="w-4 h-4" />
              </button>
              <button
                onClick={() => onStartCall('video')}
                className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                title="تماس تصویری با وب‌کم (Video Call)"
              >
                <Video className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Search messages */}
          <button
            onClick={onToggleSearch}
            className={`p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
              isSearchOpen
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="جستجو در گفتگو (Ctrl+F)"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Header 3-Dots Menu */}
          <div className="relative">
            <button
              onClick={() => setShowOptionsMenu(!showOptionsMenu)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="گزینه‌ها"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showOptionsMenu && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowOptionsMenu(false)} />
                <div className="absolute top-9 left-0 w-48 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl py-1 z-30 text-xs">
                  <button
                    onClick={() => {
                      setShowOptionsMenu(false);
                      onToggleSearch?.();
                    }}
                    className="w-full text-right px-4 py-2 text-slate-200 hover:bg-slate-800 flex items-center justify-between"
                  >
                    <span>جستجو در پیام‌ها</span>
                    <Search className="w-3.5 h-3.5 text-cyan-400" />
                  </button>
                  <button
                    onClick={() => {
                      setShowOptionsMenu(false);
                      setShowGroupProfile(true);
                    }}
                    className="w-full text-right px-4 py-2 text-slate-200 hover:bg-slate-800 flex items-center justify-between"
                  >
                    <span>مشاهده بیو و اعضا</span>
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                  <button
                    onClick={() => {
                      setShowOptionsMenu(false);
                      handleVoiceCallClick('audio');
                    }}
                    className="w-full text-right px-4 py-2 text-slate-200 hover:bg-slate-800 flex items-center justify-between"
                  >
                    <span>گفتگوی صوتی (ویس کال)</span>
                    <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  </button>
                  <button
                    onClick={() => {
                      setShowOptionsMenu(false);
                      handleVoiceCallClick('video');
                    }}
                    className="w-full text-right px-4 py-2 text-slate-200 hover:bg-slate-800 flex items-center justify-between"
                  >
                    <span>گفتگوی تصویری (ویدیو کال)</span>
                    <Video className="w-3.5 h-3.5 text-cyan-400" />
                  </button>
                  {/* Wallpaper Setting */}
                  {onOpenWallpaperSettings && (
                    <button
                      onClick={() => {
                        setShowOptionsMenu(false);
                        onOpenWallpaperSettings();
                      }}
                      className="w-full text-right px-4 py-2.5 text-slate-200 hover:bg-slate-800 flex items-center justify-between"
                    >
                      <span>تغییر پس‌زمینه چت (Wallpaper)</span>
                      <Palette className="w-3.5 h-3.5 text-purple-400" />
                    </button>
                  )}

                  {/* Block / Unblock User (Private Chat) */}
                  {!isGroup && !isChannel && chat.id !== 'chat_saved' && onToggleBlockUser && (
                    <button
                      onClick={() => {
                        setShowOptionsMenu(false);
                        onToggleBlockUser(chat.id, chat.title);
                        setToastMsg(isBlocked ? 'کاربر از لیست مسدودشده‌ها خارج شد' : 'کاربر مسدود شد');
                        setTimeout(() => setToastMsg(null), 2500);
                      }}
                      className={`w-full text-right px-4 py-2.5 hover:bg-slate-800 flex items-center justify-between ${
                        isBlocked ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      <span>{isBlocked ? 'رفع مسدودی کاربر (Unblock)' : 'مسدود کردن کاربر (Block)'}</span>
                      <UserX className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Clear History */}
                  {onClearHistory && (
                    <button
                      onClick={() => {
                        setShowOptionsMenu(false);
                        setConfirmAction('clear');
                      }}
                      className="w-full text-right px-4 py-2.5 text-slate-200 hover:bg-slate-800 flex items-center justify-between"
                    >
                      <span>پاکسازی تاریخچه گفتگو</span>
                      <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  )}

                  {/* Delete Chat */}
                  {onDeleteChat && (
                    <button
                      onClick={() => {
                        setShowOptionsMenu(false);
                        setConfirmAction('delete');
                      }}
                      className="w-full text-right px-4 py-2.5 text-rose-400 hover:bg-rose-500/10 flex items-center justify-between"
                    >
                      <span>حذف کامل گفتگو</span>
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setShowOptionsMenu(false);
                      setToastMsg('لینک اختصاصی گفتگو کپی شد!');
                      navigator.clipboard?.writeText?.(getChatShareLink(chat));
                      setTimeout(() => setToastMsg(null), 2500);
                    }}
                    className="w-full text-right px-4 py-2 text-slate-200 hover:bg-slate-800 flex items-center justify-between"
                  >
                    <span>اشتراک‌گذاری و لینک</span>
                    <Share2 className="w-3.5 h-3.5 text-blue-400" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Live Translation Banner (when active) */}
      {isTranslating && (
        <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-xs bg-cyan-950/30 px-3 py-1.5 rounded-lg border border-cyan-800/40 text-cyan-200">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>ترجمه همزمان فعال: فارسی ⇆ انگلیسی</span>
          </div>
          <span className="text-[10px] text-cyan-400 font-mono">Neural Model Active</span>
        </div>
      )}

      {/* TELEGRAM LIVE VOICE & VIDEO CHAT TOP BANNER (Visible to all members when call is active) */}
      {isCallActive && (
        <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-950/70 via-teal-950/60 to-slate-900/80 px-3 py-2 rounded-2xl border border-emerald-500/40 shadow-lg animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Pulsing Audio/Video Ring */}
            <div className="relative w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400 flex-shrink-0">
              <span className="absolute inset-0 rounded-full border border-emerald-400 animate-ping opacity-60" />
              {chat.activeCall?.musicPlayer?.isPlaying ? (
                <Disc3 className="w-4 h-4 relative z-10 text-cyan-300 animate-spin" style={{ animationDuration: '4s' }} />
              ) : (
                <Volume2 className="w-4 h-4 relative z-10" />
              )}
            </div>

            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-extrabold text-emerald-300 flex items-center gap-1.5">
                <span>{isChannel ? 'پخش زنده صوتی کانال در جریان است' : 'گفتگوی صوتی و تصویری گروه در جریان است'}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                  LIVE
                </span>
                {chat.activeCall?.musicPlayer?.isPlaying && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
                    <Music className="w-2.5 h-2.5" />
                    <span className="hidden sm:inline">موسیقی فعال</span>
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-300 flex items-center gap-2 mt-0.5 truncate">
                {chat.activeCall?.musicPlayer?.currentTrack && chat.activeCall.musicPlayer.isPlaying ? (
                  <span className="text-cyan-300 font-medium truncate flex items-center gap-1">
                    <span>🎵 در حال پخش:</span>
                    <strong className="text-white">{chat.activeCall.musicPlayer.currentTrack.title}</strong>
                    <span className="text-slate-400 text-[10px] hidden sm:inline">({chat.activeCall.musicPlayer.currentTrack.addedBy.name})</span>
                  </span>
                ) : (
                  <>
                    <span>{chat.activeCall?.participantsCount || 1} حاضر در تماس</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-cyan-300">شروع شده توسط {chat.activeCall?.startedByName || 'مدیر'}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 mr-2">
            <button
              onClick={() => handleVoiceCallClick('audio')}
              className="px-2.5 sm:px-3 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/30 hover:scale-105 transition-all cursor-pointer"
              title="پیوستن با صدا"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>پیوستن صوتی</span>
            </button>
            <button
              onClick={() => handleVoiceCallClick('video')}
              className="px-2.5 sm:px-3 py-1.5 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-600/30 hover:scale-105 transition-all cursor-pointer"
              title="پیوستن با دوربین و ویدیو"
            >
              <Video className="w-3.5 h-3.5" />
              <span>پیوستن با دوربین</span>
            </button>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 p-2.5 px-4 bg-emerald-600 text-white text-xs font-bold rounded-2xl shadow-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Group Profile Modal (Bio & Members List) */}
      <GroupProfileModal
        isOpen={showGroupProfile}
        onClose={() => setShowGroupProfile(false)}
        chat={chat}
        currentUser={currentUser}
        onStartCall={handleVoiceCallClick}
        onAddMember={(name) => {
          onAddMemberToChat?.(name);
          setToastMsg(`${name} به گفتگو افزوده شد!`);
          setTimeout(() => setToastMsg(null), 2500);
        }}
        onUpdateBio={onUpdateBio}
        onToggleAdmin={(memberId, grantAdmin) => onToggleChatAdmin?.(chat.id, memberId, grantAdmin)}
        onUpdateChatPhotos={onUpdateChatPhotos}
        onToggleBlockChat={onToggleBlockUser}
        isBlocked={isBlocked}
        onClearHistory={onClearHistory}
        onDeleteChat={onDeleteChat}
        usersList={usersList}
      />

      {/* Add Members / Channel Join Modal */}
      {showMembersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#18222d] border border-slate-700 rounded-3xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white ${
                  isChannel ? 'bg-amber-500/20 text-amber-400' : 'bg-cyan-500/20 text-cyan-400'
                }`}>
                  {isChannel ? <Radio className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">
                    {isChannel ? 'عضویت و لینک کانال' : 'افزودن اعضا به گروه'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {chat.title} • {chat.membersCount || 1} عضو
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMembersModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Direct Join Action Button */}
            <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-300 font-bold">
                  {isChannel ? 'پیوستن به کانال:' : 'پیوستن به این گروه:'}
                </span>
                <button
                  onClick={() => {
                    onAddMemberToChat?.(currentUser.name);
                    setToastMsg(isChannel ? 'شما با موفقیت به کانال پیوستید!' : 'عضویت در گروه با موفقیت انجام شد!');
                    setTimeout(() => setToastMsg(null), 2500);
                  }}
                  className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow cursor-pointer transition-all flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>عضویت مستقیم</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-400">
                هر کاربری می‌تواند به این {isChannel ? 'کانال' : 'گروه'} بپیوندد و عضویت خود را ثبت کند.
              </p>
            </div>

            {/* Invite Link */}
            <div className="space-y-1">
              <label className="text-xs text-slate-300 font-bold">لینک اختصاصی دعوت:</label>
              <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white">
                <span className="text-cyan-400 font-mono text-[11px] flex-1 truncate select-all" dir="ltr">
                  {getChatShareLink(chat)}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText?.(getChatShareLink(chat));
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="mr-2 text-cyan-400 hover:text-cyan-300 text-xs font-bold flex items-center gap-1 cursor-pointer flex-shrink-0"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'کپی شد!' : 'کپی لینک'}</span>
                </button>
              </div>
            </div>

            {/* User List to Add */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-bold">
                {isChannel ? 'دعوت کاربران به کانال:' : 'افزودن از میان کاربران:'}
              </label>
              <div className="max-h-36 overflow-y-auto space-y-1 p-1 bg-slate-900/50 rounded-xl border border-slate-800">
                {usersList.filter((u) => u.id !== currentUser.id).length === 0 ? (
                  <div className="p-3 text-center text-[11px] text-slate-500">
                    کاربری دیگری در سیستم یافت نشد. با ارسال لینک دعوت به دوستانتان، آن‌ها می‌توانند ملحق شوند.
                  </div>
                ) : (
                  usersList
                    .filter((u) => u.id !== currentUser.id)
                    .map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/60 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <img src={u.avatar} alt={u.name} className="w-7 h-7 rounded-full object-cover" />
                          <div className="text-xs font-bold text-white">{u.name}</div>
                        </div>
                        <button
                          onClick={() => {
                            onAddMemberToChat?.(u.name);
                            setToastMsg(`${u.name} به ${isChannel ? 'کانال' : 'گروه'} اضافه شد!`);
                            setTimeout(() => setToastMsg(null), 2500);
                          }}
                          className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                        >
                          + افزودن
                        </button>
                      </div>
                    ))
                )}
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowMembersModal(false)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Clear History / Delete Chat */}
      {confirmAction && (
        <div 
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in select-none"
          onClick={() => setConfirmAction(null)}
        >
          <div 
            className="w-full max-w-sm bg-[#17212b] border border-slate-700/80 rounded-3xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 text-right"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-white text-sm">
                  {confirmAction === 'clear' ? 'پاکسازی تاریخچه گفتگو' : 'حذف کامل گفتگو'}
                </h4>
                <p className="text-[11px] text-slate-400 truncate max-w-[200px]">
                  {chat.title}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {confirmAction === 'clear'
                ? `آیا از پاکسازی تمام پیام‌های گفتگوی «${chat.title}» اطمینان دارید؟ تمام پیام‌ها برای شما حذف خواهند شد.`
                : `آیا از حذف کامل گفتگوی «${chat.title}» اطمینان دارید؟ این گفتگو و تمام پیام‌های آن برای همیشه حذف خواهند شد.`
              }
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-bold transition-all cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmAction === 'clear') {
                    onClearHistory?.(chat.id);
                  } else {
                    onDeleteChat?.(chat.id);
                  }
                  setConfirmAction(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all cursor-pointer shadow-lg shadow-rose-600/30"
              >
                {confirmAction === 'clear' ? 'پاکسازی پیام‌ها' : 'حذف گفتگو'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
