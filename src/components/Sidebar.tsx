import React, { useState, useRef } from 'react';
import { Chat, Story, User, ChatFolder, Contact } from '../types/telegram';
import { 
  Search, 
  Plus, 
  Lock, 
  VolumeX, 
  Pin, 
  CheckCheck, 
  Check,
  Sparkles, 
  ShieldCheck, 
  Database, 
  Settings, 
  Bookmark, 
  Grid,
  Crown,
  LogIn,
  MoreVertical,
  MessageCircle,
  Users,
  User as UserIcon,
  Camera,
  Edit3,
  Heart,
  Phone,
  ArrowRight,
  UserPlus,
  UserX,
  Share2,
  Smartphone,
  Megaphone,
  X,
  MessageSquare,
  Trash2,
  LogOut
} from 'lucide-react';
import { INITIAL_CONTACTS } from '../data/mock-chats';
import { checkPhoneInDatabase, normalizePhoneNumber, saveContactToRemote } from '../utils/apiSync';
import { CreateChatModal } from './CreateChatModal';
import { getAppInviteLink, getDisplayDomain } from '../utils/linkHelper';

interface SidebarProps {
  chats: Chat[];
  activeChatId: string;
  onSelectChat: (chatId: string) => void;
  stories: Story[];
  onOpenStory: (index: number) => void;
  onOpenCreateStory: () => void;
  currentUser: User;
  onOpenSettings: (section?: 'main' | 'edit_profile') => void;
  onOpenArchitecture: () => void;
  onOpenMiniApps: () => void;
  onOpenAdminPanel?: () => void;
  onOpenAuth?: () => void;
  onLogout?: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeFolder: string;
  onSelectFolder: (folderId: string) => void;
  contacts?: Contact[];
  onAddContact?: (contact: Contact) => void;
  onAddNewChat?: (chat: Chat) => void;
  usersList?: User[];
  onOpenPwaInstall?: () => void;
  onDeleteChat?: (chatId: string) => void;
  onClearHistory?: (chatId: string) => void;
  onTogglePinChat?: (chatId: string) => void;
  onToggleMuteChat?: (chatId: string) => void;
  onToggleBlockUser?: (userIdOrChatId: string, userName?: string) => void;
}

interface FolderTabItem {
  id: string;
  name: string;
  count: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  chats,
  activeChatId,
  onSelectChat,
  stories,
  onOpenStory,
  onOpenCreateStory,
  currentUser,
  onOpenSettings,
  onOpenArchitecture,
  onOpenMiniApps,
  onOpenAdminPanel,
  onOpenAuth,
  onLogout,
  searchQuery,
  onSearchChange,
  activeFolder,
  onSelectFolder,
  contacts: contactsProp,
  onAddContact,
  onAddNewChat,
  usersList,
  onOpenPwaInstall,
  onDeleteChat,
  onClearHistory,
  onTogglePinChat,
  onToggleMuteChat,
  onToggleBlockUser
}) => {
  // Navigation tabs at the bottom: 'chats' | 'contacts' | 'settings' | 'profile'
  const [activeBottomNav, setActiveBottomNav] = useState<'chats' | 'contacts' | 'settings' | 'profile'>('chats');
  const [showTopMenu, setShowTopMenu] = useState(false);
  const [contactsSearch, setContactsSearch] = useState('');
  const [internalContactsList, setInternalContactsList] = useState<Contact[]>(INITIAL_CONTACTS);
  const contactsList = contactsProp !== undefined ? contactsProp : internalContactsList;

  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactAvatar, setNewContactAvatar] = useState('');
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const [phoneNotFoundModal, setPhoneNotFoundModal] = useState<{ open: boolean; phone: string }>({ open: false, phone: '' });
  const [contactSuccessToast, setContactSuccessToast] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [showCreateChatModal, setShowCreateChatModal] = useState(false);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [chatMenuId, setChatMenuId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    type: 'clear' | 'delete';
    chatId: string;
    chatTitle: string;
  } | null>(null);

  const contactFileInputRef = useRef<HTMLInputElement>(null);

  const isSuperAdmin = currentUser?.phone === '09921758505' || currentUser?.role === 'superadmin' || currentUser?.username === 'izatesplay' || currentUser?.username === 'admin';

  const safeChats = chats || [];

  // Dynamic folder tabs based on actual real chats
  const folderTabs: FolderTabItem[] = [
    { id: 'all', name: 'All', count: safeChats.length },
    { id: 'channels', name: 'channel', count: safeChats.filter((c) => c?.type === 'channel').length },
    { id: 'personal', name: 'pv', count: safeChats.filter((c) => c?.type === 'private' || c?.type === 'secret').length },
    { id: 'groups', name: 'group', count: safeChats.filter((c) => c?.type === 'group' || c?.type === 'supergroup').length },
    { id: 'bots', name: 'bots', count: safeChats.filter((c) => c?.type === 'bot').length }
  ];

  // Filter chats by folder and search query
  const filteredChats = safeChats.filter((chat) => {
    if (!chat) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (chat.title || '').toLowerCase().includes(q);
      const matchMsg = (chat.lastMessage?.text || '').toLowerCase().includes(q);
      if (!matchTitle && !matchMsg) return false;
    }

    if (activeFolder === 'all') return true;
    if (activeFolder === 'personal' || activeFolder === 'pv') return chat.type === 'private' || chat.type === 'secret';
    if (activeFolder === 'groups' || activeFolder === 'group') return chat.type === 'group' || chat.type === 'supergroup';
    if (activeFolder === 'channels' || activeFolder === 'channel') return chat.type === 'channel';
    if (activeFolder === 'bots') return chat.type === 'bot';
    return true;
  });

  // Filter contacts by search
  const safeContactsList = contactsList || [];
  const filteredContacts = safeContactsList.filter((c) => {
    if (!c) return false;
    const nameMatch = (c.name || '').toLowerCase().includes(contactsSearch.toLowerCase());
    const phoneMatch = (c.phone || '').includes(contactsSearch);
    const usernameMatch = Boolean(c.username && c.username.toLowerCase().includes(contactsSearch.toLowerCase()));
    return nameMatch || phoneMatch || usernameMatch;
  });

  const handleContactAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setNewContactAvatar(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddNewContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim() || !newContactPhone.trim()) return;

    setIsCheckingPhone(true);
    const cleanPhone = normalizePhoneNumber(newContactPhone.trim());

    // ۱. بررسی تطابق شماره در لیست کاربران فعلی سیستم
    let matchedUser = usersList?.find((u) => {
      const uNorm = normalizePhoneNumber(u.phone);
      return uNorm === cleanPhone || u.phone === newContactPhone.trim();
    });

    // ۲. بررسی استعلام شماره از دیتابیس MySQL / API Bridge
    if (!matchedUser) {
      try {
        const remoteCheck = await checkPhoneInDatabase(newContactPhone.trim());
        if (remoteCheck.success && remoteCheck.exists && remoteCheck.user) {
          matchedUser = remoteCheck.user as User;
        }
      } catch (err) {
        console.warn('Check phone database error:', err);
      }
    }

    setIsCheckingPhone(false);

    if (matchedUser) {
      // کاربر در پایگاه‌داده وجود دارد -> ایجاد مخاطب واقعی متصل به GODFATHER SQUAD
      const newC: Contact = {
        id: matchedUser.id || `cnt_${Date.now()}`,
        name: newContactName.trim() || matchedUser.name || 'مخاطب GODFATHER SQUAD',
        phone: matchedUser.phone || newContactPhone.trim(),
        avatar: matchedUser.avatar || newContactAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        status: matchedUser.isOnline ? 'آنلاین' : 'آخرین بازدید به تازگی',
        isOnline: !!matchedUser.isOnline,
        username: matchedUser.username,
        bio: matchedUser.bio
      };

      if (onAddContact) {
        onAddContact(newC);
      } else {
        setInternalContactsList((prev) => [newC, ...prev]);
      }
      saveContactToRemote(newC);

      // شروع آنی گفتگو با مخاطب
      handleStartChatWithContact(newC);

      setContactSuccessToast(`مخاطب «${newC.name}» با موفقیت به GODFATHER SQUAD متصل شد.`);
      setTimeout(() => setContactSuccessToast(null), 3500);

      setNewContactName('');
      setNewContactPhone('');
      setNewContactAvatar('');
      setShowAddContactModal(false);
    } else {
      // شماره در دیتابیس وجود ندارد -> نمایش پنجره دعوت GODFATHER SQUAD
      setPhoneNotFoundModal({
        open: true,
        phone: newContactPhone.trim()
      });
    }
  };

  const handleStartChatWithContact = (contact: Contact) => {
    // Check if chat already exists
    const existing = chats.find((c) => c.title.toLowerCase() === contact.name.toLowerCase() || c.id === `chat_${contact.id}`);
    if (existing) {
      onSelectChat(existing.id);
    } else {
      const newChat: Chat = {
        id: `chat_${contact.id}`,
        type: 'private',
        title: contact.name,
        avatar: contact.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        unreadCount: 0,
        isPinned: false,
        isMuted: false,
        lastMessage: {
          text: 'شروع گفتگو',
          timestamp: 'هم‌اکنون',
          isOutgoing: true,
          status: 'read'
        }
      };
      if (onAddNewChat) {
        onAddNewChat(newChat);
      }
      onSelectChat(newChat.id);
    }
    setActiveBottomNav('chats');
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#1c242f] text-white select-none relative overflow-hidden border-l border-slate-800">
      
      {/* ============================================================
          TOP HEADER (Matching Telegram Android Screenshot)
         ============================================================ */}
      <div className="p-3 sm:p-3.5 bg-[#1c242f] border-b border-slate-800/60 flex-shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          {/* Left: User Avatar with Gradient Story Ring */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onOpenStory(0)}
              className="relative p-0.5 rounded-full bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-500 cursor-pointer transition-transform hover:scale-105"
              title="مشاهده استوری یا پروفایل"
            >
              <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-[#1c242f]">
                <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
              </div>
            </button>

            <div className="flex items-center gap-1.5">
              <h1 className="font-extrabold text-white text-base sm:text-lg tracking-tight">GODFATHER SQUAD</h1>
              {currentUser.isPremium && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 text-black font-extrabold">
                  ★
                </span>
              )}
            </div>
          </div>

          {/* Right: Actions & Three-Dots Menu */}
          <div className="flex items-center gap-1.5 text-slate-300">
            {/* Direct Create Group / Channel Action Button */}
            <button
              onClick={() => setShowCreateChatModal(true)}
              className="px-2 sm:px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-cyan-600/25"
              title="ایجاد گروه یا کانال جدید"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">گروه / کانال</span>
            </button>

            {onOpenPwaInstall && (
              <button
                onClick={onOpenPwaInstall}
                className="p-1.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25 transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                title="نصب وب‌اپلیکیشن روی گوشی (PWA / Web2App)"
              >
                <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[11px] font-bold">نصب PWA</span>
              </button>
            )}

            {isSuperAdmin && (
              <button
                onClick={onOpenAdminPanel}
                className="px-2 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-extrabold hover:bg-amber-500/30 transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                title="پنل مدیریت ارشد"
              >
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">مدیریت</span>
              </button>
            )}

            <div className="relative">
              <button
                onClick={() => setShowTopMenu(!showTopMenu)}
                className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="گزینه‌ها"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {/* Three-dots Dropdown Menu with Backdrop */}
              {showTopMenu && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowTopMenu(false)} />
                  <div className="absolute left-0 sm:right-0 top-10 w-56 bg-[#212d3b] border border-slate-700/80 rounded-2xl shadow-2xl py-1.5 z-40 text-xs text-slate-200 animate-in fade-in zoom-in-95 duration-150">
                    {/* Create Group & Channel in Menu */}
                    <button
                      onClick={() => {
                        setShowTopMenu(false);
                        setShowCreateChatModal(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-cyan-500/15 text-cyan-300 font-bold text-right cursor-pointer"
                    >
                      <Users className="w-4 h-4 text-cyan-400" />
                      <span>ایجاد گروه جدید</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowTopMenu(false);
                        setShowCreateChatModal(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-amber-500/15 text-amber-300 font-bold text-right cursor-pointer border-b border-slate-700/40"
                    >
                      <Megaphone className="w-4 h-4 text-amber-400" />
                      <span>ایجاد کانال جدید</span>
                    </button>

                    {onOpenPwaInstall && (
                      <button
                        onClick={() => {
                          setShowTopMenu(false);
                          onOpenPwaInstall();
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-cyan-500/15 text-cyan-300 font-bold text-right cursor-pointer border-b border-slate-700/40"
                      >
                        <Smartphone className="w-4 h-4 text-cyan-400" />
                        <span>نصب روی گوشی (Web2App / PWA)</span>
                      </button>
                    )}
                    {isSuperAdmin && (
                      <button
                        onClick={() => {
                          setShowTopMenu(false);
                          onOpenAdminPanel?.();
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-amber-500/15 text-amber-300 font-bold text-right cursor-pointer"
                      >
                        <Crown className="w-4 h-4 text-amber-400" />
                        <span>پنل مدیریت ارشد</span>
                      </button>
                    )}
                    {isSuperAdmin && (
                      <button
                        onClick={() => {
                          setShowTopMenu(false);
                          onOpenArchitecture();
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-700/50 text-cyan-300 font-medium text-right cursor-pointer"
                      >
                        <Database className="w-4 h-4 text-cyan-400" />
                        <span>مستندات معماری فاز ۱</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowTopMenu(false);
                        onOpenMiniApps();
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-700/50 text-purple-300 font-medium text-right cursor-pointer"
                    >
                      <Grid className="w-4 h-4 text-purple-400" />
                      <span>Mini Apps (TMA)</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowTopMenu(false);
                        onSelectChat('chat_saved');
                        setActiveBottomNav('chats');
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-700/50 text-right cursor-pointer"
                    >
                      <Bookmark className="w-4 h-4 text-blue-400" />
                      <span>Saved Messages</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowTopMenu(false);
                        onOpenSettings('main');
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-700/50 text-right cursor-pointer border-t border-slate-700/50"
                    >
                      <Settings className="w-4 h-4 text-slate-400" />
                      <span>تنظیمات</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowTopMenu(false);
                        onOpenAuth?.();
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-cyan-500/10 text-cyan-300 font-medium text-right cursor-pointer border-t border-slate-700/50"
                    >
                      <LogIn className="w-4 h-4 text-cyan-400" />
                      <span>ورود با حساب دیگر / ثبت‌نام</span>
                    </button>
                    {onLogout && (
                      <button
                        onClick={() => {
                          setShowTopMenu(false);
                          onLogout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-rose-500/15 text-rose-400 font-bold text-right cursor-pointer border-t border-slate-700/50"
                      >
                        <LogOut className="w-4 h-4 text-rose-400" />
                        <span>خروج از حساب کاربری</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Search Input (Pill Shaped container matching screenshot) */}
        <div className="relative flex items-center bg-[#253243] rounded-full px-3.5 py-2 border border-slate-700/50 focus-within:border-cyan-400 transition-all">
          <Search className="w-4 h-4 text-slate-400 ml-2 flex-shrink-0" />
          <input
            type="text"
            placeholder={activeBottomNav === 'contacts' ? 'Search Contacts...' : 'Search Chats'}
            value={activeBottomNav === 'contacts' ? contactsSearch : searchQuery}
            onChange={(e) => {
              if (activeBottomNav === 'contacts') {
                setContactsSearch(e.target.value);
              } else {
                onSearchChange(e.target.value);
              }
            }}
            className="w-full bg-transparent text-xs text-white placeholder-slate-400 outline-none"
          />
          {((activeBottomNav === 'contacts' && contactsSearch) || (activeBottomNav !== 'contacts' && searchQuery)) && (
            <button
              onClick={() => {
                if (activeBottomNav === 'contacts') {
                  setContactsSearch('');
                } else {
                  onSearchChange('');
                }
              }}
              className="p-0.5 text-slate-400 hover:text-white rounded-full transition-colors cursor-pointer mr-1"
              title="پاک کردن جستجو"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Folder Pills with Badge Counts (Only shown on Chats tab) */}
        {activeBottomNav === 'chats' && (
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-0.5">
            {folderTabs.map((folder) => {
              const isActive = activeFolder === folder.id;
              return (
                <button
                  key={folder.id}
                  onClick={() => onSelectFolder(folder.id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#335677] text-white shadow-sm'
                      : 'bg-[#212d3b] text-slate-400 hover:text-white hover:bg-[#283749]'
                  }`}
                >
                  <span>{folder.name}</span>
                  {folder.count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                        isActive ? 'bg-[#1e3448] text-white' : 'bg-[#18222d] text-slate-400'
                      }`}
                    >
                      {folder.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Telegram Stories Horizontal Tray */}
        {activeBottomNav === 'chats' && (
          <div className="flex items-center gap-3 overflow-x-auto scrollbar-none py-2 px-1 border-t border-slate-800/50 mt-1">
            {/* My Story (+ to add or view) */}
            <div
              className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer group"
              onClick={onOpenCreateStory}
              title="ایجاد یا مشاهده استوری شما"
            >
              <div className="relative w-11 h-11 rounded-full p-0.5 bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-500 group-hover:scale-105 transition-transform">
                <img src={currentUser.avatar} alt="My Story" className="w-full h-full rounded-full object-cover border-2 border-[#1c242f]" />
                <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-cyan-400 text-black font-extrabold flex items-center justify-center text-xs shadow border border-[#1c242f]">
                  +
                </div>
              </div>
              <span className="text-[10px] text-slate-300 font-medium truncate max-w-[54px]">استوری شما</span>
            </div>

            {/* Stories List */}
            {stories.map((story, idx) => (
              <div
                key={story.id || idx}
                onClick={() => onOpenStory(idx)}
                className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer group"
                title={`مشاهده استوری ${story.userName}`}
              >
                <div className="relative w-11 h-11 rounded-full p-0.5 bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-400 group-hover:scale-105 transition-transform shadow-sm">
                  <img src={story.userAvatar} alt={story.userName} className="w-full h-full rounded-full object-cover border-2 border-[#1c242f]" />
                </div>
                <span className="text-[10px] text-slate-300 font-medium truncate max-w-[56px] text-center">
                  {story.userName}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ============================================================
          MAIN BODY: SWITCH BETWEEN CHATS OR CONTACTS VIEW
         ============================================================ */}
      <div className="flex-1 overflow-y-auto relative divide-y divide-slate-800/40">

        {/* VIEW 1: CHATS LIST (Matching Screenshot Exactly) */}
        {activeBottomNav === 'chats' && (
          <div>
            {filteredChats.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3 min-h-[300px]">
                <div className="w-16 h-16 rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-cyan-400 shadow-inner">
                  <MessageCircle className="w-8 h-8" />
                </div>
                <div className="text-sm font-extrabold text-white">هیچ گفتگویی یافت نشد</div>
                <p className="text-xs text-slate-400 max-w-[240px] leading-relaxed">
                  سامانه در حالت تولیدی و واقعی قرار دارد. از بخش مخاطبین در پایین یک مخاطب انتخاب کنید یا مخاطب جدید بیفزایید.
                </p>
                <button
                  onClick={() => setActiveBottomNav('contacts')}
                  className="mt-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg"
                >
                  مشاهده مخاطبین
                </button>
              </div>
            ) : (
              filteredChats.map((chat) => {
                const isActive = chat.id === activeChatId;
                const isChatBlocked = Boolean(
                  chat.isBlocked ||
                  (currentUser?.blockedUserIds && currentUser.blockedUserIds.includes(chat.id))
                );
                const isPrivateChat = chat.type === 'private' && chat.id !== 'chat_saved';
                const partnerUser = isPrivateChat
                  ? (usersList || []).find(
                      (u) =>
                        u.id === chat.id ||
                        u.phone === chat.id ||
                        (chat.username && u.username && u.username.toLowerCase() === chat.username.toLowerCase()) ||
                        (chat.members && chat.members.some((m) => m.id === u.id && u.id !== currentUser?.id))
                    )
                  : null;
                const isPartnerOnline = partnerUser ? Boolean(partnerUser.isOnline) : false;

              return (
                <div
                  key={chat.id}
                  onClick={() => onSelectChat(chat.id)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 transition-colors cursor-pointer select-none ${
                    isActive
                      ? 'bg-[#24374b] text-white'
                      : 'hover:bg-[#202d3c] text-slate-200'
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="w-13 h-13 rounded-full overflow-hidden border border-slate-700/60 bg-slate-800 flex items-center justify-center">
                      {isChatBlocked ? (
                        <Lock className="w-5 h-5 text-slate-500" />
                      ) : (
                        <img src={chat.avatar} alt={chat.title} className="w-full h-full object-cover" />
                      )}
                    </div>
                    {chat.type === 'secret' && !isChatBlocked && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px]">
                        <Lock className="w-2.5 h-2.5" />
                      </div>
                    )}
                    {isPrivateChat && !isChatBlocked && (
                      <div
                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#1c242f] transition-all duration-300 ${
                          isPartnerOnline
                            ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)] ring-1 ring-emerald-500/50'
                            : 'bg-slate-700 border border-slate-600/60 opacity-40 shadow-inner'
                        }`}
                        title={isPartnerOnline ? 'آنلاین' : 'خاموش (آفلاین)'}
                      />
                    )}
                  </div>

                  {/* Chat Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-extrabold text-sm text-white truncate">
                          {chat.title}
                        </span>
                        {isPrivateChat && (
                          <span
                            className={`w-2 h-2 rounded-full flex-shrink-0 transition-all duration-300 ${
                              isPartnerOnline
                                ? 'bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.9)]'
                                : 'bg-slate-700 opacity-40 border border-slate-600/50'
                            }`}
                            title={isPartnerOnline ? 'آنلاین' : 'خاموش (آفلاین)'}
                          />
                        )}
                        {isChatBlocked && (
                          <span className="text-[10px] px-1.5 py-0.2 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-full font-bold">
                            مسدود
                          </span>
                        )}
                        {chat.isVerified && !isChatBlocked && (
                          <span className="text-cyan-400 text-xs">✓</span>
                        )}
                      </div>

                      {/* Timestamp & Read Tick */}
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono flex-shrink-0">
                        {chat.lastMessage?.isOutgoing && (
                          <CheckCheck className="w-3.5 h-3.5 text-cyan-400 inline" />
                        )}
                        <span>{chat.lastMessage?.timestamp || '12:00'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-1 mt-0.5">
                      <div className="text-xs text-slate-400 truncate max-w-[220px] sm:max-w-[240px]">
                        {isChatBlocked ? (
                          <span className="text-rose-400/90 font-medium">کاربر مسدود شده است</span>
                        ) : chat.draftText ? (
                          <span className="text-rose-400 font-medium">پیش‌نویس: {chat.draftText}</span>
                        ) : (
                          <span>{chat.lastMessage?.text || 'گفتگوی خالی'}</span>
                        )}
                      </div>

                      {/* Badges, Reaction, Pin, Mute & Options */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {chat.reactionPreview === '❤️' && (
                          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                        )}
                        {chat.isPinned && (
                          <Pin className="w-3 h-3 text-cyan-400 rotate-45" />
                        )}
                        {chat.isMuted && (
                          <VolumeX className="w-3 h-3 text-slate-500" />
                        )}
                        {chat.unreadCount > 0 && (
                          <span className="min-w-5 h-5 px-1 rounded-full bg-[#2481cc] text-white font-bold text-[10px] flex items-center justify-center shadow-sm font-mono">
                            {chat.unreadCount}
                          </span>
                        )}

                        {/* Options button on hover */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setChatMenuId(chatMenuId === chat.id ? null : chat.id);
                            }}
                            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            title="گزینه‌ها"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>

                          {/* Chat Context Dropdown Menu */}
                          {chatMenuId === chat.id && (
                            <>
                              <div 
                                className="fixed inset-0 z-30" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setChatMenuId(null);
                                }} 
                              />
                              <div 
                                className="absolute left-0 top-6 w-48 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl py-1 z-40 text-xs"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {onTogglePinChat && (
                                  <button
                                    onClick={() => {
                                      setChatMenuId(null);
                                      onTogglePinChat(chat.id);
                                    }}
                                    className="w-full text-right px-3 py-2 text-slate-200 hover:bg-slate-800 flex items-center justify-between"
                                  >
                                    <span>{chat.isPinned ? 'برداشتن سنجاق' : 'سنجاق کردن چت'}</span>
                                    <Pin className="w-3.5 h-3.5 text-cyan-400" />
                                  </button>
                                )}

                                {onToggleMuteChat && (
                                  <button
                                    onClick={() => {
                                      setChatMenuId(null);
                                      onToggleMuteChat(chat.id);
                                    }}
                                    className="w-full text-right px-3 py-2 text-slate-200 hover:bg-slate-800 flex items-center justify-between"
                                  >
                                    <span>{chat.isMuted ? 'فعال‌سازی صدا' : 'بی‌صدا کردن'}</span>
                                    <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                                  </button>
                                )}

                                {onToggleBlockUser && chat.type === 'private' && chat.id !== 'chat_saved' && (
                                  <button
                                    onClick={() => {
                                      setChatMenuId(null);
                                      onToggleBlockUser(chat.id, chat.title);
                                    }}
                                    className={`w-full text-right px-3 py-2 flex items-center justify-between ${
                                      isChatBlocked ? 'text-emerald-400 hover:bg-slate-800' : 'text-rose-400 hover:bg-slate-800'
                                    }`}
                                  >
                                    <span>{isChatBlocked ? 'رفع مسدودی کاربر' : 'مسدود کردن مخاطب'}</span>
                                    <UserX className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {onClearHistory && (
                                  <button
                                    onClick={() => {
                                      setChatMenuId(null);
                                      setConfirmModal({ type: 'clear', chatId: chat.id, chatTitle: chat.title });
                                    }}
                                    className="w-full text-right px-3 py-2 text-slate-200 hover:bg-slate-800 flex items-center justify-between"
                                  >
                                    <span>پاکسازی تاریخچه</span>
                                    <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                                  </button>
                                )}

                                {onDeleteChat && (
                                  <button
                                    onClick={() => {
                                      setChatMenuId(null);
                                      setConfirmModal({ type: 'delete', chatId: chat.id, chatTitle: chat.title });
                                    }}
                                    className="w-full text-right px-3 py-2 text-rose-400 hover:bg-rose-500/10 flex items-center justify-between"
                                  >
                                    <span>حذف گفتگو</span>
                                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }))}
          </div>
        )}

        {/* VIEW 2: CONTACTS LIST */}
        {activeBottomNav === 'contacts' && (
          <div className="p-3 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-300">
                مخاطبین من ({filteredContacts.length})
              </span>
              <button
                onClick={() => setShowAddContactModal(true)}
                className="flex items-center gap-1 px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>مخاطب جدید</span>
              </button>
            </div>

            {filteredContacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3 min-h-[250px]">
                <div className="w-14 h-14 rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-cyan-400 shadow-inner">
                  <Users className="w-7 h-7" />
                </div>
                <div className="text-sm font-extrabold text-white">هنوز مخاطبی اضافه نشده</div>
                <p className="text-xs text-slate-400 max-w-[220px] leading-relaxed">
                  شماره موبایل دوستان یا همکاران خود را ذخیره کنید تا گفتگوی خصوصی را آغاز نمایید.
                </p>
                <button
                  onClick={() => setShowAddContactModal(true)}
                  className="mt-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
                >
                  افزودن مخاطب جدید
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredContacts.map((contact) => {
                  const liveUser = usersList?.find(
                    (u) =>
                      u.phone === contact.phone ||
                      u.id === contact.id ||
                      (contact.username && u.username && u.username.toLowerCase() === contact.username.toLowerCase())
                  );
                  const isContactOnline = liveUser ? Boolean(liveUser.isOnline) : Boolean(contact.isOnline);
                  const displayStatus = isContactOnline ? 'آنلاین' : (liveUser?.lastSeen || contact.status || 'آخرین بازدید اخیراً');

                  return (
                    <div
                      key={contact.id}
                      onClick={() => handleStartChatWithContact(contact)}
                      className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-[#24374b] transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img
                            src={contact.avatar}
                            alt={contact.name}
                            className="w-11 h-11 rounded-full object-cover border border-slate-700"
                          />
                          <div
                            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#1c242f] transition-all duration-300 ${
                              isContactOnline
                                ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)] ring-1 ring-emerald-500/50'
                                : 'bg-slate-700 border border-slate-600/60 opacity-40 shadow-inner'
                            }`}
                            title={isContactOnline ? 'آنلاین' : 'خاموش (آفلاین)'}
                          />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white flex items-center gap-1.5">
                            <span>{contact.name}</span>
                            <span
                              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                                isContactOnline
                                  ? 'bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.9)]'
                                  : 'bg-slate-700 opacity-40 border border-slate-600/50'
                              }`}
                              title={isContactOnline ? 'آنلاین' : 'خاموش (آفلاین)'}
                            />
                          </div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-1.5">
                            <span
                              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                isContactOnline
                                  ? 'bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.9)]'
                                  : 'bg-slate-700 border border-slate-600/60 opacity-40'
                              }`}
                              title={isContactOnline ? 'آنلاین' : 'خاموش (آفلاین)'}
                            />
                            <span>{contact.phone}</span>
                          </div>
                        </div>
                      </div>

                      <span className={`text-[11px] font-medium flex items-center gap-1.5 ${isContactOnline ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
                        <span
                          className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                            isContactOnline
                              ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]'
                              : 'bg-slate-700 border border-slate-600/50 opacity-40'
                          }`}
                        />
                        <span>{displayStatus}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============================================================
          FLOATING ACTION BUTTONS (FAB) - Matching Screenshot
         ============================================================ */}
      <div className="absolute bottom-20 left-4 z-20 flex flex-col items-center gap-2.5 pointer-events-auto">
        {/* Camera FAB (Story creator / photo) */}
        <button
          onClick={onOpenCreateStory}
          className="w-10 h-10 rounded-full bg-[#243447] hover:bg-[#2d4057] text-white flex items-center justify-center shadow-lg border border-slate-700/80 transition-all hover:scale-105 cursor-pointer"
          title="دوربین / انتشار استوری"
        >
          <Camera className="w-4.5 h-4.5 text-slate-200" />
        </button>

        {/* Primary Blue FAB with Quick Action Menu */}
        <div className="relative">
          {showFabMenu && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setShowFabMenu(false)} />
              <div className="absolute bottom-16 left-0 w-48 bg-[#212d3b] border border-slate-700 rounded-2xl shadow-2xl py-1.5 z-30 text-xs text-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-0.5">
                <button
                  onClick={() => {
                    setShowFabMenu(false);
                    setShowCreateChatModal(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-cyan-500/15 text-cyan-300 font-bold text-right cursor-pointer"
                >
                  <Users className="w-4 h-4 text-cyan-400" />
                  <span>ایجاد گروه جدید</span>
                </button>
                <button
                  onClick={() => {
                    setShowFabMenu(false);
                    setShowCreateChatModal(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-amber-500/15 text-amber-300 font-bold text-right cursor-pointer"
                >
                  <Megaphone className="w-4 h-4 text-amber-400" />
                  <span>ایجاد کانال جدید</span>
                </button>
                <button
                  onClick={() => {
                    setShowFabMenu(false);
                    setActiveBottomNav('contacts');
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-700/50 text-slate-300 font-medium text-right cursor-pointer border-t border-slate-700/50"
                >
                  <UserPlus className="w-4 h-4 text-slate-400" />
                  <span>پیام به مخاطب جدید</span>
                </button>
              </div>
            </>
          )}

          <button
            onClick={() => setShowFabMenu(!showFabMenu)}
            className="w-13 h-13 rounded-full bg-[#2481cc] hover:bg-[#1f72b5] text-white flex items-center justify-center shadow-xl transition-all hover:scale-105 cursor-pointer"
            title="پیام جدید / ایجاد گروه یا کانال"
          >
            <Edit3 className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* ============================================================
          BOTTOM NAVIGATION BAR (The exact 4 items requested!)
          1. Chats (with blue badge and pill container)
          2. Contacts
          3. Settings
          4. Profile
         ============================================================ */}
      <div className="border-t border-slate-800 bg-[#16212b]/95 backdrop-blur-md px-3 py-1.5 flex items-center justify-around z-20 flex-shrink-0">
        
        {/* 1. Chats Tab */}
        <button
          onClick={() => setActiveBottomNav('chats')}
          className="flex flex-col items-center gap-1 cursor-pointer transition-all relative py-1 px-3 group"
        >
          <div
            className={`flex items-center justify-center px-4 py-1 rounded-full transition-all relative ${
              activeBottomNav === 'chats'
                ? 'bg-[#284968] text-cyan-300 shadow-sm'
                : 'text-slate-400 group-hover:text-white'
            }`}
          >
            <MessageCircle className="w-5 h-5" />
            {/* Pill count badge like 600 in screenshot */}
            <span className="absolute -top-1 -right-1 text-[9px] px-1.5 py-0.2 bg-[#2481cc] text-white rounded-full font-mono font-bold shadow">
              600
            </span>
          </div>
          <span
            className={`text-[11px] font-bold ${
              activeBottomNav === 'chats' ? 'text-cyan-300' : 'text-slate-400'
            }`}
          >
            Chats
          </span>
        </button>

        {/* 2. Contacts Tab */}
        <button
          onClick={() => setActiveBottomNav('contacts')}
          className="flex flex-col items-center gap-1 cursor-pointer transition-all relative py-1 px-3 group"
        >
          <div
            className={`flex items-center justify-center px-4 py-1 rounded-full transition-all ${
              activeBottomNav === 'contacts'
                ? 'bg-[#284968] text-cyan-300 shadow-sm'
                : 'text-slate-400 group-hover:text-white'
            }`}
          >
            <Users className="w-5 h-5" />
          </div>
          <span
            className={`text-[11px] font-bold ${
              activeBottomNav === 'contacts' ? 'text-cyan-300' : 'text-slate-400'
            }`}
          >
            Contacts
          </span>
        </button>

        {/* 3. Settings Tab */}
        <button
          onClick={() => {
            onOpenSettings('main');
          }}
          className="flex flex-col items-center gap-1 cursor-pointer transition-all relative py-1 px-3 group"
        >
          <div
            className={`flex items-center justify-center px-4 py-1 rounded-full transition-all ${
              activeBottomNav === 'settings'
                ? 'bg-[#284968] text-cyan-300 shadow-sm'
                : 'text-slate-400 group-hover:text-white'
            }`}
          >
            <Settings className="w-5 h-5" />
          </div>
          <span
            className={`text-[11px] font-bold ${
              activeBottomNav === 'settings' ? 'text-cyan-300' : 'text-slate-400'
            }`}
          >
            Settings
          </span>
        </button>

        {/* 4. Profile Tab (User thumbnail picture like screenshot!) */}
        <button
          onClick={() => {
            onOpenSettings('edit_profile');
          }}
          className="flex flex-col items-center gap-1 cursor-pointer transition-all relative py-1 px-3 group"
        >
          <div
            className={`flex items-center justify-center px-4 py-1 rounded-full transition-all ${
              activeBottomNav === 'profile'
                ? 'bg-[#284968] shadow-sm'
                : 'group-hover:opacity-90'
            }`}
          >
            <div className="w-6 h-6 rounded-full overflow-hidden border border-cyan-400 shadow-sm">
              <img src={currentUser.avatar} alt="Profile" className="w-full h-full object-cover" />
            </div>
          </div>
          <span
            className={`text-[11px] font-bold ${
              activeBottomNav === 'profile' ? 'text-cyan-300' : 'text-slate-400'
            }`}
          >
            Profile
          </span>
        </button>

      </div>

      {/* Add Contact Modal */}
      {showAddContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#1e293b] border border-slate-700 rounded-3xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-cyan-400" />
              <span>افزودن مخاطب جدید</span>
            </h3>

            {/* Hidden native file input for contact photo */}
            <input
              type="file"
              ref={contactFileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleContactAvatarUpload}
            />

            <form onSubmit={handleAddNewContact} className="space-y-3">
              {/* Photo picker from phone */}
              <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-800 border border-slate-700 flex-shrink-0 flex items-center justify-center">
                  {newContactAvatar ? (
                    <img src={newContactAvatar} alt="Contact preview" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-6 h-6 text-slate-500" />
                  )}
                </div>
                <div className="flex-1">
                  <button
                    type="button"
                    onClick={() => contactFileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold rounded-xl border border-slate-700 cursor-pointer transition-all shadow-sm"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{newContactAvatar ? 'تغییر عکس از گوشی' : 'انتخاب عکس از حافظه گوشی'}</span>
                  </button>
                  <p className="text-[10px] text-slate-500 mt-1">
                    تصویر مستقیماً از گالری دستگاه انتخاب می‌شود
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300">نام مخاطب:</label>
                <input
                  type="text"
                  placeholder="مثال: سارا رضایی"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400 mt-1"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-300">شماره موبایل:</label>
                <input
                  type="text"
                  placeholder="+98 912 000 0000"
                  value={newContactPhone}
                  onChange={(e) => setNewContactPhone(e.target.value)}
                  dir="ltr"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400 font-mono text-left mt-1"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddContactModal(false)}
                  className="flex-1 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl cursor-pointer hover:bg-slate-700 transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isCheckingPhone}
                  className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                >
                  {isCheckingPhone && <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />}
                  <span>{isCheckingPhone ? 'استعلام از دیتابیس...' : 'بررسی و ذخیره مخاطب'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {contactSuccessToast && (
        <div className="fixed bottom-16 right-4 z-50 p-3 bg-emerald-600 text-white text-xs font-bold rounded-2xl shadow-xl flex items-center gap-2 animate-in slide-in-from-bottom-2">
          <Check className="w-4 h-4 flex-shrink-0" />
          <span>{contactSuccessToast}</span>
        </div>
      )}

      {/* Telegram User Not Found Modal (Exactly like Telegram!) */}
      {phoneNotFoundModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-[#1e293b] border border-amber-500/40 rounded-3xl w-full max-w-sm p-5 space-y-4 shadow-2xl text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <UserX className="w-7 h-7" />
            </div>
            
            <div className="space-y-1.5">
              <h3 className="text-sm font-extrabold text-white">این شماره در GODFATHER SQUAD عضو نیست!</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                شماره <span className="font-mono text-cyan-300 font-bold" dir="ltr">{phoneNotFoundModal.phone}</span> در پایگاه‌داده کاربران GODFATHER SQUAD یافت نشد.
              </p>
              <p className="text-[11px] text-slate-400">
                در GODFATHER SQUAD فقط شماره‌هایی که در دیتابیس حساب کاربری دارند می‌توانند به عنوان مخاطب فعال اضافه شوند. شما می‌توانید لینک دعوت اختصاصی GODFATHER SQUAD را برای ایشان ارسال کنید.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <div 
                onClick={() => {
                  navigator.clipboard.writeText(getAppInviteLink());
                  setInviteCopied(true);
                  setTimeout(() => setInviteCopied(false), 3000);
                }}
                className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-cyan-400 font-mono text-xs truncate cursor-pointer hover:border-cyan-400 select-all"
                dir="ltr"
                title="کلیک برای کپی"
              >
                {getAppInviteLink()}
              </div>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(getAppInviteLink());
                  setInviteCopied(true);
                  setTimeout(() => setInviteCopied(false), 3000);
                }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 cursor-pointer transition-all"
              >
                {inviteCopied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                <span>{inviteCopied ? 'لینک دعوت GODFATHER SQUAD کپی شد!' : 'کپی لینک دعوت'}</span>
              </button>

              <button
                type="button"
                onClick={() => setPhoneNotFoundModal({ open: false, phone: '' })}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                متوجه شدم (بستن)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Group / Channel Modal */}
      <CreateChatModal
        isOpen={showCreateChatModal}
        onClose={() => setShowCreateChatModal(false)}
        onCreateChat={(newChat) => {
          onAddNewChat?.(newChat);
          onSelectChat(newChat.id);
          setActiveBottomNav('chats');
        }}
        contactsList={contactsList}
        usersList={usersList || []}
        existingChats={chats}
        currentUser={currentUser}
      />

      {/* Confirmation Dialog for Clear History / Delete Chat */}
      {confirmModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in select-none"
          onClick={() => setConfirmModal(null)}
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
                  {confirmModal.type === 'clear' ? 'پاکسازی تاریخچه گفتگو' : 'حذف کامل گفتگو'}
                </h4>
                <p className="text-[11px] text-slate-400 truncate max-w-[200px]">
                  {confirmModal.chatTitle}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {confirmModal.type === 'clear' 
                ? `آیا از پاکسازی تمام پیام‌های گفتگوی «${confirmModal.chatTitle}» اطمینان دارید؟ تمام پیام‌های این گفتگو پاک خواهند شد.`
                : `آیا از حذف کامل گفتگوی «${confirmModal.chatTitle}» اطمینان دارید؟ این گفتگو و تمام پیام‌های آن برای همیشه حذف خواهند شد.`
              }
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-bold transition-all cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmModal.type === 'clear') {
                    onClearHistory?.(confirmModal.chatId);
                  } else {
                    onDeleteChat?.(confirmModal.chatId);
                  }
                  setConfirmModal(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all cursor-pointer shadow-lg shadow-rose-600/30"
              >
                {confirmModal.type === 'clear' ? 'پاکسازی پیام‌ها' : 'حذف کامل گفتگو'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
