import React, { useState } from 'react';
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
  Shield
} from 'lucide-react';

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
  onToggleAdmin
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [editedBio, setEditedBio] = useState(chat.description || '');
  const [newMemberName, setNewMemberName] = useState('');
  const [showAddMemberInput, setShowAddMemberInput] = useState(false);
  const [isMuted, setIsMuted] = useState(chat.isMuted || false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const isGroup = chat.type === 'group' || chat.type === 'supergroup';
  const isChannel = chat.type === 'channel';

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
    (chat.isUserAdmin === true && chat.id !== 'chat_saved_messages');

  // Group Admins include the owner and any member granted admin by the owner
  const isGroupAdmin =
    isGroupOwner ||
    chat.isUserAdmin === true ||
    Boolean(chat.members?.some(
      (m) => (m.id === currentUser.id || m.username === currentUser.username || m.phone === currentUser.phone) && (m.role === 'admin' || m.role === 'owner')
    ));

  // Base members list, guaranteeing the current user (especially if creator) is included
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
        ...(existingMembers.length > 0
          ? existingMembers
          : [
              {
                id: 'usr_owner_reza',
                name: 'محمدرضا فتح‌آبادی',
                username: 'mfathabadi',
                avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
                role: 'owner' as const,
                roleTitle: '👑 سازنده و توسعه‌دهنده سامانه',
                isOnline: true,
                bio: 'توسعه‌دهنده اصلی GODFATHER SQUAD'
              },
              {
                id: 'usr_admin_izatesplay',
                name: 'مدیر ارشد سامانه (izatesplay)',
                username: 'izatesplay',
                avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
                role: 'admin' as const,
                roleTitle: '🛡️ مدیرکل سامانه',
                isOnline: true,
                bio: 'مدیر کل و ناظر سیستم'
              },
              {
                id: 'usr_mod_artin',
                name: 'آرتین رادمنش',
                username: 'artin_rad',
                avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
                role: 'admin' as const,
                roleTitle: '⚡ ادمین گروه',
                isOnline: true,
                bio: 'پشتیبان سیستم و ویس چت'
              },
              {
                id: 'usr_member_sara',
                name: 'سارا محمدی',
                username: 'sara_mhd',
                avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
                role: 'member' as const,
                roleTitle: 'عضو عادی',
                isOnline: false,
                bio: 'طراح رابط کاربری گرافیکی'
              },
              {
                id: 'usr_member_ali',
                name: 'علی تهرانی',
                username: 'ali_teh',
                avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
                role: 'member' as const,
                roleTitle: 'عضو عادی',
                isOnline: true,
                bio: 'برنامه‌نویس و عاشق تکنولوژی'
              }
            ])
      ];

  const currentMembersList = defaultMembers;

  const filteredMembers = currentMembersList.filter(
    (m) =>
      m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
      (m.username && m.username.toLowerCase().includes(memberSearch.toLowerCase())) ||
      (m.bio && m.bio.toLowerCase().includes(memberSearch.toLowerCase()))
  );

  const handleSaveBio = () => {
    setIsEditingBio(false);
    if (onUpdateBio) {
      onUpdateBio(editedBio);
    }
    showToast('بیو و توضیحات گروه ذخیره شد');
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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const copyInviteLink = () => {
    const link = `https://t.me/+godfather_${chat.id}`;
    navigator.clipboard?.writeText?.(link);
    setCopiedLink(true);
    showToast('لینک اختصاصی دعوت کپی شد!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg max-h-[90vh] bg-[#17212b] border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        
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
          
          {/* Hero Section: Avatar, Title, Members Count */}
          <div className="flex flex-col items-center text-center">
            <div className="relative group">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 border-cyan-500/40 shadow-xl shadow-cyan-500/10">
                <img src={chat.avatar} alt={chat.title} className="w-full h-full object-cover" />
              </div>
              {chat.activeCall?.isActive && (
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-[#17212b] shadow animate-pulse flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  <span>کال فعال</span>
                </div>
              )}
            </div>

            <h3 className="text-lg sm:text-xl font-extrabold text-white mt-3 flex items-center gap-1.5">
              <span>{chat.title}</span>
            </h3>

            {/* User role badge in this group */}
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

            <div className="text-xs text-slate-400 mt-1.5 flex items-center gap-2">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                <span>{chat.membersCount || currentMembersList.length} عضو</span>
              </span>
              <span>•</span>
              <span className="text-emerald-400">
                {currentMembersList.filter((m) => m.isOnline).length} نفر آنلاین
              </span>
            </div>

            {/* Quick Action Buttons (Call, Video, Mute, Share) */}
            <div className="flex items-center justify-center gap-3 mt-4 w-full max-w-sm">
              {/* Voice Call */}
              <button
                onClick={() => {
                  onClose();
                  onStartCall('audio');
                }}
                className="flex-1 py-2 px-3 rounded-2xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer shadow-sm hover:scale-102"
              >
                <Phone className="w-4 h-4 text-emerald-400" />
                <span>ویس کال</span>
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
                <span>ویدیو کال</span>
              </button>

              {/* Mute Toggle */}
              <button
                onClick={() => {
                  setIsMuted(!isMuted);
                  showToast(!isMuted ? 'اعلان‌های گروه بی‌صدا شد' : 'اعلان‌های گروه فعال شد');
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

              {/* Share Invite Link */}
              <button
                onClick={copyInviteLink}
                className="flex-1 py-2 px-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer shadow-sm hover:scale-102"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4 text-cyan-400" />}
                <span>{copiedLink ? 'کپی شد' : 'اشتراک'}</span>
              </button>
            </div>
          </div>

          {/* Group Bio & Description (بیو و مشخصات گروه) */}
          <div className="bg-[#1e2a38] border border-slate-700/60 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-cyan-300 flex items-center gap-1.5">
                <span>بیو و توضیحات گروه (Group Bio)</span>
              </span>
              {isGroupAdmin && !isEditingBio && (
                <button
                  onClick={() => setIsEditingBio(true)}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>ویرایش بیو</span>
                </button>
              )}
            </div>

            {isEditingBio ? (
              <div className="space-y-2">
                <textarea
                  value={editedBio}
                  onChange={(e) => setEditedBio(e.target.value)}
                  className="w-full bg-[#131c26] border border-cyan-500/50 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400 leading-relaxed min-h-[75px]"
                  placeholder="توضیحات و بیوگرافی گروه را بنویسید..."
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
              <p className="text-xs text-slate-200 leading-relaxed font-sans">
                {chat.description || 'گروه گفتگوی اعضای GODFATHER SQUAD - مجهز به گفتگوی صوتی و تصویری زنده گروهی'}
              </p>
            )}

            {/* Invite Link */}
            <div className="pt-2 border-t border-slate-700/50 flex items-center justify-between text-xs">
              <div className="text-slate-400 text-[11px]">لینک اختصاصی دعوت:</div>
              <button
                onClick={copyInviteLink}
                className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 font-mono text-[11px] bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-700/60 transition-colors cursor-pointer"
                dir="ltr"
              >
                <span>t.me/+godfather_{chat.id}</span>
                {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {/* Group Members Section (اعضای گروه و مدیریت ادمین‌ها) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs font-extrabold text-white">
                  {isGroup ? 'اعضای گروه' : 'مشترکین و مدیران'} ({filteredMembers.length} نفر)
                </h4>
              </div>

              {/* Add Member button */}
              <button
                onClick={() => setShowAddMemberInput(!showAddMemberInput)}
                className="px-2.5 py-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-[11px] font-bold rounded-xl flex items-center gap-1 shadow cursor-pointer transition-all"
              >
                <UserPlus className="w-3 h-3" />
                <span>+ افزودن عضو</span>
              </button>
            </div>

            {/* Manager Notice / Explanatory Header */}
            {isGroupOwner && (
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] text-amber-200 flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>
                  شما به عنوان <strong>مدیر و سازنده این گروه</strong>، می‌توانید هر یک از اعضا را به عنوان ادمین منصوب کنید یا دسترسی ادمینی آن‌ها را لغو نمایید.
                </span>
              </div>
            )}

            {/* Quick Add Member Input */}
            {showAddMemberInput && (
              <form onSubmit={handleAddNewMember} className="flex items-center gap-2 p-2 bg-[#1e2a38] rounded-xl border border-cyan-500/40">
                <input
                  type="text"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="نام کاربر جدید را بنویسید..."
                  className="flex-1 bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none px-2"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                  افزودن
                </button>
              </form>
            )}

            {/* Search inside members */}
            <div className="relative">
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="جستجو در بین اعضای گروه..."
                className="w-full bg-[#1e2a38] border border-slate-700/60 rounded-xl px-9 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500/70"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Members List */}
            <div className="bg-[#1e2a38] border border-slate-700/60 rounded-2xl divide-y divide-slate-800 overflow-hidden">
              {filteredMembers.map((member) => {
                const isMemberOwner = member.role === 'owner' || member.id === chat.creatorId;
                const isMemberAdmin = member.role === 'admin';

                return (
                  <div
                    key={member.id}
                    className="p-3 flex items-center justify-between hover:bg-slate-800/60 transition-colors group gap-2"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Avatar with Online Dot */}
                      <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-600">
                          <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                        </div>
                        {member.isOnline ? (
                          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#1e2a38]" />
                        ) : (
                          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-slate-500 border-2 border-[#1e2a38]" />
                        )}
                      </div>

                      {/* Member Details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-extrabold text-white truncate">{member.name}</span>
                          
                          {/* Role Badges */}
                          {isMemberOwner ? (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-0.5">
                              <Crown className="w-2.5 h-2.5 text-amber-400" />
                              <span>سازنده / مدیر گروه</span>
                            </span>
                          ) : isMemberAdmin ? (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold flex items-center gap-0.5">
                              <ShieldCheck className="w-2.5 h-2.5 text-cyan-400" />
                              <span>ادمین گروه</span>
                            </span>
                          ) : member.role === 'moderator' ? (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold">
                              ناظم
                            </span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                              عضو عادی
                            </span>
                          )}
                        </div>

                        {/* Bio snippet or username */}
                        <div className="text-[11px] text-slate-400 truncate mt-0.5 flex items-center gap-1.5">
                          {member.username && (
                            <span className="text-cyan-400 font-mono" dir="ltr">@{member.username}</span>
                          )}
                          {member.bio && (
                            <>
                              <span className="text-slate-600">•</span>
                              <span className="truncate">{member.bio}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions: Grant/Revoke Admin & Direct Message */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {/* Group Creator / Owner can promote/demote members to Admin */}
                      {isGroupOwner && member.id !== currentUser.id && !isMemberOwner && (
                        <>
                          {isMemberAdmin ? (
                            <button
                              onClick={() => handleToggleAdminRole(member.id, member.name, false)}
                              className="px-2 py-1 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 text-[10px] font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                              title="حذف دسترسی ادمین از این عضو"
                            >
                              <ShieldAlert className="w-3 h-3 text-rose-400" />
                              <span className="hidden sm:inline">خلع ادمینی</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleToggleAdminRole(member.id, member.name, true)}
                              className="px-2 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
                              title="اعطای دسترسی ادمین گروه به این عضو"
                            >
                              <ShieldCheck className="w-3 h-3 text-cyan-400" />
                              <span className="hidden sm:inline">+ ادمین کردن</span>
                            </button>
                          )}
                        </>
                      )}

                      {/* Direct Message button */}
                      {onOpenDirectChat && member.id !== currentUser.id && (
                        <button
                          onClick={() => {
                            onClose();
                            onOpenDirectChat(member);
                          }}
                          className="p-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                          title="ارسال پیام خصوصی"
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
  );
};
