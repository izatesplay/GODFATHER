import React, { useState, useRef } from 'react';
import { Chat, ChatMember, User } from '../types/telegram';
import {
  X,
  Users,
  Share2,
  Bell,
  BellOff,
  Copy,
  Check,
  Phone,
  Video,
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  Crown,
  Search,
  MessageSquare,
  Edit3,
  Save,
  Radio,
  Shield,
  Camera,
  ChevronRight,
  ChevronLeft,
  Trash2,
  Plus,
  Lock,
  UserX,
  AlertTriangle,
  Image as ImageIcon
} from 'lucide-react';
import { ProfilePhotoViewerModal } from './ProfilePhotoViewerModal';
import { getChatShareLink, getDisplayDomain } from '../utils/linkHelper';

interface GroupProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  chat: Chat;
  currentUser: User;
  onStartCall: (type: 'audio' | 'video') => void;
  onAddMember: (name: string) => void;
  onUpdateBio?: (newBio: string) => void;
  onOpenDirectChat?: (member: ChatMember) => void;
  onToggleAdmin?: (memberId: string, grantAdmin: boolean) => void;
  onUpdateChatPhotos?: (chatId: string, photos: string[], mainAvatar: string) => void;
  onToggleBlockChat?: (chatId: string, title?: string) => void;
  isBlocked?: boolean;
  onClearHistory?: (chatId: string) => void;
  onDeleteChat?: (chatId: string) => void;
}

export const GroupProfileModal: React.FC<GroupProfileModalProps> = ({
  isOpen,
  onClose,
  chat,
  currentUser,
  onStartCall,
  onAddMember,
  onUpdateBio,
  onOpenDirectChat,
  onToggleAdmin,
  onUpdateChatPhotos,
  onToggleBlockChat,
  isBlocked = false,
  onClearHistory,
  onDeleteChat
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [editedBio, setEditedBio] = useState(chat.description || '');
  const [newMemberName, setNewMemberName] = useState('');
  const [showAddMemberInput, setShowAddMemberInput] = useState(false);
  const [isMuted, setIsMuted] = useState(chat.isMuted || false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Multiple photos carousel state
  const [photoIndex, setPhotoIndex] = useState(0);
  const [isPhotoViewerOpen, setIsPhotoViewerOpen] = useState(false);
  const photoFileInputRef = useRef<HTMLInputElement>(null);

  // Confirm delete or clear modals
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);
  const [confirmDeleteChat, setConfirmDeleteChat] = useState(false);

  if (!isOpen) return null;

  const isGroup = chat.type === 'group' || chat.type === 'supergroup';
  const isChannel = chat.type === 'channel';
  const isPrivate = chat.type === 'private';

  const isSuperAdmin =
    currentUser.phone === '09921758505' ||
    currentUser.role === 'superadmin' ||
    currentUser.username === 'izatesplay';

  // The creator of the group is the Owner / Manager of that group
  const isGroupOwner =
    isSuperAdmin ||
    Boolean(chat.creatorId && (chat.creatorId === currentUser.id || chat.creatorId === currentUser.phone || chat.creatorId === currentUser.username)) ||
    Boolean(chat.members?.some((m) => (m.id === currentUser.id || m.username === currentUser.username || m.phone === currentUser.phone) && m.role === 'owner')) ||
    Boolean(!chat.creatorId && (chat.id.startsWith('group_') || chat.id.startsWith('channel_'))) ||
    (chat.isUserAdmin === true && chat.id !== 'chat_saved');

  // Group Admins include the owner and any member granted admin by the owner
  const isGroupAdmin =
    isGroupOwner ||
    chat.isUserAdmin === true ||
    Boolean(chat.members?.some(
      (m) => (m.id === currentUser.id || m.username === currentUser.username || m.phone === currentUser.phone) && (m.role === 'admin' || m.role === 'owner')
    ));

  // Chat avatars album (unlimited photos for group/channel/user)
  const chatPhotos = (chat.avatars && chat.avatars.length > 0)
    ? chat.avatars
    : [chat.avatar];
  const safePhotoIndex = Math.min(photoIndex, chatPhotos.length - 1);
  const currentAvatar = chatPhotos[safePhotoIndex] || chat.avatar;

  // Base members list
  const existingMembers = chat.members && chat.members.length > 0 ? chat.members : [];
  const isCurrentUserInList = existingMembers.some(
    (m) => m.id === currentUser.id || (m.username && m.username === currentUser.username)
  );

  const defaultMembers: ChatMember[] = isCurrentUserInList
    ? existingMembers
    : [
        {
          id: currentUser.id,
          name: currentUser.name,
          username: currentUser.username,
          phone: currentUser.phone,
          avatar: currentUser.avatar,
          role: isGroupOwner ? 'owner' : isGroupAdmin ? 'admin' : 'member',
          roleTitle: isGroupOwner ? '👑 مدیر و سازنده گروه (Owner)' : isGroupAdmin ? '🛡️ ادمین گروه' : '👤 عضو عادی',
          isOnline: true,
          bio: currentUser.bio || 'سازنده و مدیر گروه'
        },
        ...existingMembers
      ];

  const currentMembersList = defaultMembers;

  const filteredMembers = currentMembersList.filter(
    (m) =>
      m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
      (m.username && m.username.toLowerCase().includes(memberSearch.toLowerCase())) ||
      (m.bio && m.bio.toLowerCase().includes(memberSearch.toLowerCase()))
  );

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleSaveBio = () => {
    setIsEditingBio(false);
    if (onUpdateBio) {
      onUpdateBio(editedBio);
    }
    showToast('بیو و توضیحات ذخیره شد');
  };

  const handleAddNewMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    onAddMember(newMemberName.trim());
    setNewMemberName('');
    setShowAddMemberInput(false);
    showToast(`کاربر «${newMemberName.trim()}» به گروه اضافه شد`);
  };

  const handleToggleAdminRole = (memberId: string, memberName: string, grantAdmin: boolean) => {
    if (onToggleAdmin) {
      onToggleAdmin(memberId, grantAdmin);
    }
    showToast(
      grantAdmin
        ? `🛡️ دسترسی ادمینی به «${memberName}» اعطا شد`
        : `دسترسی ادمینی از «${memberName}» سلب شد`
    );
  };

  const copyInviteLink = () => {
    const link = getChatShareLink(chat);
    navigator.clipboard?.writeText?.(link);
    setCopiedLink(true);
    showToast('لینک اختصاصی گفتگو کپی شد!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Multiple photos upload from gallery
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUpdateChatPhotos) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const updatedPhotos = [reader.result, ...chatPhotos];
          onUpdateChatPhotos(chat.id, updatedPhotos, reader.result);
          setPhotoIndex(0);
          showToast('عکس جدید به آلبوم اضافه شد');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoIndex((prev) => (prev + 1) % chatPhotos.length);
  };

  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoIndex((prev) => (prev - 1 + chatPhotos.length) % chatPhotos.length);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
        <div className="relative w-full max-w-lg max-h-[92vh] bg-[#17212b] border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
          
          {/* Toast Alert */}
          {toastMessage && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-xl flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Top Header Bar */}
          <div className="p-4 sm:p-5 flex items-center justify-between border-b border-slate-800 bg-[#1e2c3a]/70">
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-white">
                {isGroup ? 'اطلاعات و اعضای گروه' : isChannel ? 'اطلاعات کانال' : 'پروفایل گفتگو'}
              </span>
              {chat.isVerified && (
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded-full font-bold">
                  تایید شده
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="بستن"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto space-y-5 p-4 sm:p-6 scrollbar-thin scrollbar-thumb-slate-700">
            
            {/* Hero Section: Avatar Carousel with Infinite Photos support */}
            <div className="flex flex-col items-center text-center">
              <div className="relative group">
                {/* Avatar with click to open full album */}
                <div 
                  onClick={() => setIsPhotoViewerOpen(true)}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 border-cyan-500/40 shadow-xl shadow-cyan-500/10 cursor-pointer relative group-hover:scale-102 transition-transform"
                  title="کلیک برای مشاهده آلبوم عکس‌های پروفایل در اندازه بزرگ"
                >
                  {isBlocked ? (
                    <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-500">
                      <Lock className="w-10 h-10" />
                    </div>
                  ) : (
                    <img src={currentAvatar} alt={chat.title} className="w-full h-full object-cover" />
                  )}

                  {/* Album indicator badge */}
                  {chatPhotos.length > 1 && !isBlocked && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-black/70 text-cyan-300 text-[10px] font-mono px-2 py-0.5 rounded-full border border-white/20">
                      {safePhotoIndex + 1} / {chatPhotos.length}
                    </div>
                  )}
                </div>

                {/* Left/Right controls if multiple photos */}
                {chatPhotos.length > 1 && !isBlocked && (
                  <>
                    <button
                      type="button"
                      onClick={handlePrevPhoto}
                      className="absolute -right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center text-xs shadow-md border border-white/20 cursor-pointer"
                      title="عکس قبلی"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextPhoto}
                      className="absolute -left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center text-xs shadow-md border border-white/20 cursor-pointer"
                      title="عکس بعدی"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </>
                )}

                {/* Add new photo button for Admins or Private chat */}
                {(isGroupAdmin || isPrivate) && !isBlocked && (
                  <>
                    <input 
                      type="file" 
                      ref={photoFileInputRef} 
                      onChange={handlePhotoUpload} 
                      accept="image/*" 
                      className="hidden" 
                    />
                    <button
                      type="button"
                      onClick={() => photoFileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-cyan-500 hover:bg-cyan-400 text-white flex items-center justify-center shadow-lg border-2 border-[#17212b] cursor-pointer transition-transform hover:scale-110"
                      title="افزودن عکس جدید به پروفایل / آلبوم"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                  </>
                )}

                {chat.activeCall?.isActive && (
                  <div className="absolute -bottom-1 -left-1 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-[#17212b] shadow animate-pulse flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    <span>کال فعال</span>
                  </div>
                )}
              </div>

              {/* Photo album counter & Add photo hint */}
              {!isBlocked && (
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={() => setIsPhotoViewerOpen(true)}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>آلبوم عکس‌ها ({chatPhotos.length} تصویر)</span>
                  </button>

                  {(isGroupAdmin || isPrivate) && (
                    <button
                      onClick={() => photoFileInputRef.current?.click()}
                      className="text-[11px] text-slate-400 hover:text-white flex items-center gap-0.5 cursor-pointer bg-slate-800/80 px-2 py-0.5 rounded-lg border border-slate-700"
                    >
                      <Plus className="w-3 h-3 text-cyan-400" />
                      <span>افزودن عکس نامحدود</span>
                    </button>
                  )}
                </div>
              )}

              <h3 className="text-lg sm:text-xl font-extrabold text-white mt-2 flex items-center gap-1.5">
                <span>{chat.title}</span>
              </h3>

              {/* Blocked state badge */}
              {isBlocked && (
                <span className="mt-1 px-3 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 inline-flex items-center gap-1">
                  <UserX className="w-3.5 h-3.5 text-rose-400" />
                  <span>این کاربر در لیست مسدودشده‌ها قرار دارد</span>
                </span>
              )}

              {/* User role badge in this group */}
              {!isBlocked && (
                <>
                  {chat.creatorId === currentUser.id ? (
                    <span className="mt-1 px-3 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 inline-flex items-center gap-1">
                      <Crown className="w-3.5 h-3.5 text-amber-400" />
                      <span>شما سازنده و مدیر این گروه هستید (Owner)</span>
                    </span>
                  ) : isGroupAdmin ? (
                    <span className="mt-1 px-3 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 inline-flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                      <span>شما ادمین این گروه هستید (Admin)</span>
                    </span>
                  ) : null}
                </>
              )}

              <div className="text-xs text-slate-400 mt-1.5 flex items-center gap-2">
                {isGroup || isChannel ? (
                  <>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{chat.membersCount || currentMembersList.length} عضو</span>
                    </span>
                    <span>•</span>
                    <span className="text-emerald-400">
                      {currentMembersList.filter((m) => m.isOnline).length} نفر آنلاین
                    </span>
                  </>
                ) : (
                  <span className={isBlocked ? 'text-slate-500' : 'text-emerald-400'}>
                    {isBlocked ? 'آخرین بازدید خیلی وقت پیش' : 'هم‌اکنون آنلاین'}
                  </span>
                )}
              </div>

              {/* Quick Action Buttons (Call, Video, Mute, Share) */}
              <div className="flex items-center justify-center gap-2.5 mt-4 w-full max-w-sm">
                {!isBlocked && (
                  <>
                    {/* Voice Call */}
                    <button
                      onClick={() => {
                        onClose();
                        onStartCall('audio');
                      }}
                      className="flex-1 py-2 px-3 rounded-2xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer shadow-sm hover:scale-102"
                    >
                      <Phone className="w-4 h-4 text-emerald-400" />
                      <span>تماس صوتی</span>
                    </button>

                    {/* Video Call */}
                    <button
                      onClick={() => {
                        onClose();
                        onStartCall('video');
                      }}
                      className="flex-1 py-2 px-3 rounded-2xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer shadow-sm hover:scale-102"
                    >
                      <Video className="w-4 h-4 text-cyan-400" />
                      <span>تصویری</span>
                    </button>
                  </>
                )}

                {/* Mute Toggle */}
                <button
                  onClick={() => {
                    setIsMuted(!isMuted);
                    showToast(!isMuted ? 'اعلان‌ها بی‌صدا شد' : 'اعلان‌ها فعال شد');
                  }}
                  className={`flex-1 py-2 px-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer shadow-sm hover:scale-102 ${
                    isMuted
                      ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 hover:bg-rose-500/30'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {isMuted ? <BellOff className="w-4 h-4 text-rose-400" /> : <Bell className="w-4 h-4 text-slate-400" />}
                  <span>{isMuted ? 'بی‌صدا' : 'صدا'}</span>
                </button>

                {/* Share Link */}
                <button
                  onClick={copyInviteLink}
                  className="flex-1 py-2 px-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer shadow-sm hover:scale-102"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4 text-cyan-400" />}
                  <span>{copiedLink ? 'کپی شد' : 'اشتراک'}</span>
                </button>
              </div>
            </div>

            {/* Bio & Description */}
            <div className="bg-[#1e2a38] border border-slate-700/60 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-cyan-300 flex items-center gap-1.5">
                  <span>{isPrivate ? 'بیوگرافی کاربر' : 'بیو و مشخصات گفتگو'}</span>
                </span>
                {(isGroupAdmin || isPrivate) && !isEditingBio && !isBlocked && (
                  <button
                    onClick={() => setIsEditingBio(true)}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>ویرایش بیو</span>
                  </button>
                )}
              </div>

              {isBlocked ? (
                <p className="text-xs text-slate-500 italic">
                  اطلاعات بیوگرافی و پروفایل به دلیل مسدودیت در دسترس نیست.
                </p>
              ) : isEditingBio ? (
                <div className="space-y-2">
                  <textarea
                    value={editedBio}
                    onChange={(e) => setEditedBio(e.target.value)}
                    className="w-full bg-[#131c26] border border-cyan-500/50 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400 leading-relaxed min-h-[75px]"
                    placeholder="توضیحات و بیوگرافی را بنویسید..."
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setIsEditingBio(false)}
                      className="px-3 py-1 text-xs text-slate-400 hover:text-white rounded-lg"
                    >
                      انصراف
                    </button>
                    <button
                      onClick={handleSaveBio}
                      className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow cursor-pointer"
                    >
                      <Save className="w-3 h-3" />
                      <span>ذخیره بیو</span>
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {chat.description || 'توضیحاتی برای این گفتگو ثبت نشده است.'}
                </p>
              )}
            </div>

            {/* Dynamic Real Domain Invite / Share Link Box */}
            {!isBlocked && chat.id !== 'chat_saved' && (
              <div className="bg-[#1e2a38] border border-slate-700/60 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span className="flex items-center gap-1.5 text-cyan-300">
                    <Share2 className="w-4 h-4 text-cyan-400" />
                    <span>لینک اختصاصی گفتگو ({getDisplayDomain()}):</span>
                  </span>
                  <button
                    type="button"
                    onClick={copyInviteLink}
                    className="text-cyan-400 hover:text-cyan-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'کپی شد!' : 'کپی لینک'}</span>
                  </button>
                </div>
                <div 
                  onClick={copyInviteLink}
                  className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-cyan-400 font-mono text-xs truncate cursor-pointer hover:border-cyan-400 transition-colors select-all"
                  dir="ltr"
                  title="کلیک برای کپی پیوند"
                >
                  {getChatShareLink(chat)}
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  هر کاربری که این پیوند را روی هر مرورگر یا دستگاهی باز کند، مستقیماً به این گفتگو متصل می‌شود.
                </p>
              </div>
            )}

            {/* Block / Security Section for Private Chats */}
            {isPrivate && chat.id !== 'chat_saved' && onToggleBlockChat && (
              <div className="bg-[#1e2a38] border border-slate-700/60 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-rose-400" />
                      <span>مسدودسازی کاربر (Block User)</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      کاربر مسدود شده امکان پیام دادن به شما و مشاهده پروفایل را نخواهد داشت.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      onToggleBlockChat(chat.id, chat.title);
                      showToast(isBlocked ? 'کاربر از لیست مسدودشده‌ها خارج شد' : 'کاربر مسدود شد');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isBlocked
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                        : 'bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/40'
                    }`}
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span>{isBlocked ? 'رفع مسدودی (Unblock)' : 'مسدود کردن کاربر'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Members List (For Groups and Channels) */}
            {(isGroup || isChannel) && !isBlocked && (
              <div className="bg-[#1e2a38] border border-slate-700/60 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-cyan-300 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-cyan-400" />
                    <span>اعضای گفتگو ({currentMembersList.length})</span>
                  </span>

                  {isGroupAdmin && (
                    <button
                      onClick={() => setShowAddMemberInput(!showAddMemberInput)}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer bg-cyan-950/40 border border-cyan-800/60 px-2.5 py-1 rounded-xl"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>+ افزودن عضو جدید</span>
                    </button>
                  )}
                </div>

                {/* Add member form */}
                {showAddMemberInput && (
                  <form onSubmit={handleAddNewMember} className="flex gap-2 pt-1 animate-in fade-in">
                    <input
                      type="text"
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      placeholder="نام عضو جدید را بنویسید..."
                      className="flex-1 bg-[#131c26] border border-cyan-500/50 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl cursor-pointer"
                    >
                      ثبت
                    </button>
                  </form>
                )}

                {/* Members Search */}
                {currentMembersList.length > 3 && (
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder="جستجو در میان اعضا..."
                      className="w-full bg-[#131c26] border border-slate-700 rounded-xl pr-8 pl-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                    />
                  </div>
                )}

                {/* Members list */}
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {filteredMembers.map((member) => {
                    const isMemberOwner = member.role === 'owner';
                    const isMemberAdmin = member.role === 'admin' || isMemberOwner;

                    return (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-900/40 hover:bg-slate-900/80 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-700 flex-shrink-0">
                            <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-white truncate">{member.name}</span>
                              {isMemberOwner ? (
                                <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 px-1.5 py-0.2 rounded-full">
                                  مالک
                                </span>
                              ) : isMemberAdmin ? (
                                <span className="text-[10px] font-bold text-cyan-300 bg-cyan-500/20 px-1.5 py-0.2 rounded-full">
                                  ادمین
                                </span>
                              ) : null}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {member.username ? `@${member.username}` : member.roleTitle || 'عضو عادی'}
                            </div>
                          </div>
                        </div>

                        {/* Admin Promotion / Action */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {isGroupOwner && member.id !== currentUser.id && !isMemberOwner && (
                            <button
                              onClick={() => handleToggleAdminRole(member.id, member.name, !isMemberAdmin)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                isMemberAdmin
                                  ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
                                  : 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30'
                              }`}
                            >
                              {isMemberAdmin ? 'خلع ادمینی' : '+ ادمین کردن'}
                            </button>
                          )}

                          {onOpenDirectChat && member.id !== currentUser.id && (
                            <button
                              onClick={() => {
                                onClose();
                                onOpenDirectChat(member);
                              }}
                              className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
                              title="پیام خصوصی"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Permanent Storage Notice & Chat Deletion Controls */}
            <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Shield className="w-4 h-4 text-cyan-400" />
                <span>حفظ و ماندگاری دائمی چت‌ها</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                پیام‌ها و رسانه‌های این گفتگو برای همیشه و به صورت ابری و پایدار نگهداری می‌شوند و حتی با خروج از حساب پاک نمی‌شوند، مگر این‌که شخصاً توسط شما حذف شوند.
              </p>

              <div className="flex items-center gap-2 pt-1">
                {onClearHistory && (
                  <button
                    onClick={() => setConfirmClearHistory(true)}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-rose-300 text-xs font-bold transition-all cursor-pointer border border-slate-700 flex items-center justify-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>پاکسازی تاریخچه پیام‌ها</span>
                  </button>
                )}

                {onDeleteChat && (
                  <button
                    onClick={() => setConfirmDeleteChat(true)}
                    className="flex-1 py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف کامل گفتگو</span>
                  </button>
                )}
              </div>
            </div>

          </div>

          {/* Modal Bottom Close */}
          <div className="p-4 border-t border-slate-800 bg-[#1e2c3a]/70 flex items-center justify-between">
            <div className="text-[11px] text-slate-400">
              سامانه GODFATHER SQUAD • ساخته شده توسط محمدرضا فتح‌آبادی
            </div>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              بستن
            </button>
          </div>

        </div>
      </div>

      {/* Confirmation Modal: Clear History */}
      {confirmClearHistory && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-[#17212b] border border-slate-700 rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 text-rose-400">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <h4 className="text-sm font-bold text-white">پاکسازی تاریخچه پیام‌ها</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              آیا از پاک کردن تمامی پیام‌های این گفتگو اطمینان دارید؟ این عمل غیرقابل بازگشت است.
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setConfirmClearHistory(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
              >
                انصراف
              </button>
              <button
                onClick={() => {
                  setConfirmClearHistory(false);
                  onClearHistory?.(chat.id);
                  showToast('تاریخچه پیام‌های این گفتگو پاکسازی شد');
                }}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow cursor-pointer"
              >
                بله، پاکسازی شود
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete Chat */}
      {confirmDeleteChat && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-[#17212b] border border-slate-700 rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 text-rose-400">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <h4 className="text-sm font-bold text-white">حذف کامل گفتگو</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              آیا از حذف این گفتگو به همراه تمامی پیام‌های آن اطمینان دارید؟
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setConfirmDeleteChat(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
              >
                انصراف
              </button>
              <button
                onClick={() => {
                  setConfirmDeleteChat(false);
                  onClose();
                  onDeleteChat?.(chat.id);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow cursor-pointer"
              >
                بله، حذف گفتگو
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Profile Photo Viewer */}
      <ProfilePhotoViewerModal
        isOpen={isPhotoViewerOpen}
        onClose={() => setIsPhotoViewerOpen(false)}
        title={chat.title}
        subtitle={isGroup ? 'عکس‌های پروفایل گروه' : isChannel ? 'عکس‌های کانال' : 'عکس‌های پروفایل کاربر'}
        photos={chatPhotos}
        canEdit={isGroupAdmin || isPrivate}
        onAddPhoto={(newUrl) => {
          if (onUpdateChatPhotos) {
            const updated = [newUrl, ...chatPhotos];
            onUpdateChatPhotos(chat.id, updated, newUrl);
          }
        }}
        onDeletePhoto={(idx) => {
          if (onUpdateChatPhotos && chatPhotos.length > 1) {
            const updated = chatPhotos.filter((_, i) => i !== idx);
            onUpdateChatPhotos(chat.id, updated, updated[0]);
          }
        }}
        onSetMainPhoto={(idx) => {
          if (onUpdateChatPhotos && chatPhotos[idx]) {
            const target = chatPhotos[idx];
            const updated = [target, ...chatPhotos.filter((_, i) => i !== idx)];
            onUpdateChatPhotos(chat.id, updated, target);
          }
        }}
      />
    </>
  );
};
