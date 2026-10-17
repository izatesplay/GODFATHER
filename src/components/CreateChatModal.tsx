import React, { useState, useRef, useEffect } from 'react';
import { Chat, User, Contact, ChatMember } from '../types/telegram';
import { 
  Users, 
  Megaphone, 
  Camera, 
  X, 
  Check, 
  Plus, 
  Sparkles, 
  Layers, 
  Radio, 
  ShieldCheck,
  Search,
  UserPlus,
  Loader2,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { 
  checkLocalUsernameAvailable, 
  checkUsernameAvailability, 
  validateUsernameFormat 
} from '../utils/apiSync';
import { getChatShareLink, getDisplayDomain } from '../utils/linkHelper';

interface CreateChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateChat: (chat: Chat) => void;
  contactsList: Contact[];
  usersList: User[];
  existingChats?: Chat[];
  currentUser: User;
}

const DEFAULT_GROUP_AVATARS = [
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=150&auto=format&fit=crop&q=80'
];

const DEFAULT_CHANNEL_AVATARS = [
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=150&auto=format&fit=crop&q=80'
];

export const CreateChatModal: React.FC<CreateChatModalProps> = ({
  isOpen,
  onClose,
  onCreateChat,
  contactsList,
  usersList,
  existingChats = [],
  currentUser
}) => {
  const [chatType, setChatType] = useState<'group' | 'channel'>('group');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [channelUsername, setChannelUsername] = useState('');
  const [enableTopics, setEnableTopics] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(DEFAULT_GROUP_AVATARS[0]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean;
    available?: boolean;
    error?: string;
    message?: string;
  }>({ checking: false });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // استعلام و بررسی یکتایی آیدی کانال به صورت بلادرنگ
  useEffect(() => {
    if (chatType !== 'channel' || !channelUsername.trim()) {
      setUsernameStatus({ checking: false });
      return;
    }

    const clean = channelUsername.trim().replace(/^@+/, '').toLowerCase();
    const localCheck = checkLocalUsernameAvailable(clean, usersList, existingChats);
    if (!localCheck.available) {
      setUsernameStatus({ checking: false, available: false, error: localCheck.error });
      return;
    }

    setUsernameStatus({ checking: true });
    const timer = setTimeout(async () => {
      const remote = await checkUsernameAvailability(clean);
      if (!remote.available) {
        setUsernameStatus({ checking: false, available: false, error: remote.error || remote.message });
      } else {
        setUsernameStatus({ checking: false, available: true, message: `شناسه @${clean} اختصاصی و آزاد است.` });
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [channelUsername, chatType, usersList, existingChats]);

  if (!isOpen) return null;

  // Handle native photo selection from device
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setSelectedAvatar(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Toggle member selection
  const handleToggleMember = (id: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((mId) => mId !== id) : [...prev, id]
    );
  };

  // Switch type and set default avatar
  const handleSwitchType = (type: 'group' | 'channel') => {
    setChatType(type);
    setSelectedAvatar(type === 'group' ? DEFAULT_GROUP_AVATARS[0] : DEFAULT_CHANNEL_AVATARS[0]);
    setError(null);
    setUsernameStatus({ checking: false });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError(chatType === 'group' ? 'لطفاً نام گروه را وارد کنید.' : 'لطفاً نام کانال را وارد کنید.');
      return;
    }

    if (chatType === 'channel' && channelUsername.trim()) {
      const cleanUsername = channelUsername.trim().replace(/^@+/, '').toLowerCase();
      const formatCheck = validateUsernameFormat(cleanUsername);
      if (!formatCheck.valid) {
        setError(formatCheck.error || 'فرمت شناسه کانال نامعتبر است.');
        return;
      }

      const localCheck = checkLocalUsernameAvailable(cleanUsername, usersList, existingChats);
      if (!localCheck.available) {
        setError(localCheck.error || 'این شناسه کانال قبلاً ثبت شده و تکراری است.');
        return;
      }

      if (usernameStatus.available === false) {
        setError(usernameStatus.error || 'این شناسه کانال تکراری است و به کاربر یا کانال دیگری تعلق دارد.');
        return;
      }
    }

    const timestamp = 'هم‌اکنون';
    const isChannel = chatType === 'channel';
    const isSupergroup = !isChannel && enableTopics;

    const creatorMember: ChatMember = {
      id: currentUser.id,
      name: currentUser.name,
      username: currentUser.username,
      phone: currentUser.phone,
      avatar: currentUser.avatar,
      role: 'owner',
      roleTitle: '👑 مدیر و سازنده گروه (Owner)',
      isOnline: true,
      bio: currentUser.bio || ''
    };

    const initialMembersList: ChatMember[] = [
      creatorMember,
      ...selectedMemberIds.map((id) => {
        const u = availableMembers.find((m) => m.id === id);
        return {
          id,
          name: u?.name || 'عضو گروه',
          avatar: u?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
          role: 'member' as const,
          roleTitle: 'عضو عادی',
          isOnline: false
        };
      })
    ];

    const newChat: Chat = {
      id: `${chatType}_${Date.now()}`,
      type: isChannel ? 'channel' : isSupergroup ? 'supergroup' : 'group',
      title: cleanTitle,
      username: isChannel && channelUsername.trim() ? channelUsername.trim().replace('@', '') : undefined,
      description: description.trim() || (isChannel ? `کانال رسمی ${cleanTitle}` : `گروه گفتگوی ${cleanTitle}`),
      avatar: selectedAvatar,
      membersCount: initialMembersList.length,
      creatorId: currentUser.id,
      isUserAdmin: true,
      members: initialMembersList,
      isMuted: false,
      isPinned: false,
      unreadCount: 0,
      isVerified: currentUser.role === 'superadmin',
      topics: isSupergroup
        ? [
            { id: 'top_general', title: 'گفتگوی عمومی (General)', iconEmoji: '💬', messageCount: 1 },
            { id: 'top_news', title: 'اطلاعیه‌ها (Announcements)', iconEmoji: '📢', messageCount: 0 },
            { id: 'top_media', title: 'عکس و فیلم (Media)', iconEmoji: '📸', messageCount: 0 }
          ]
        : undefined,
      activeTopicId: isSupergroup ? 'top_general' : undefined,
      lastMessage: {
        text: isChannel
          ? `کانال «${cleanTitle}» ایجاد شد.`
          : `گروه «${cleanTitle}» با ${initialMembersList.length} عضو ایجاد شد.`,
        timestamp,
        isOutgoing: true,
        status: 'read'
      }
    };

    onCreateChat(newChat);
    onClose();
  };

  // Combine contacts & users for member selection list
  const availableMembers = [
    ...contactsList.map((c) => ({ id: `c_${c.phone}`, name: c.name, phone: c.phone, avatar: c.avatar })),
    ...usersList
      .filter((u) => u.id !== currentUser.id)
      .map((u) => ({ id: u.id, name: u.name, phone: u.phone, avatar: u.avatar }))
  ].filter((item, index, self) => index === self.findIndex((t) => t.phone === item.phone));

  const filteredMembers = availableMembers.filter(
    (m) =>
      m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.phone.includes(memberSearch)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200">
      {/* Hidden file input for native image picker */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handlePhotoUpload}
        className="hidden"
      />

      <div className="bg-[#18222d] border border-slate-700/80 rounded-3xl w-full max-w-lg max-h-[92vh] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-700/60 bg-[#121a24] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md ${
              chatType === 'group' 
                ? 'bg-gradient-to-tr from-cyan-500 to-blue-600' 
                : 'bg-gradient-to-tr from-amber-500 to-rose-600'
            }`}>
              {chatType === 'group' ? <Users className="w-5 h-5" /> : <Megaphone className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-white">
                {chatType === 'group' ? 'ایجاد گروه جدید' : 'ایجاد کانال جدید'}
              </h2>
              <p className="text-xs text-slate-400">
                {chatType === 'group' ? 'گفتگوی گروهی، تبادل فایل و ویس کال گروهی' : 'ارسال اطلاعیه، صوت و پیام برای مخاطبان'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Toggle: Group vs Channel */}
        <div className="p-3 bg-[#151e28] border-b border-slate-700/50 flex gap-2">
          <button
            type="button"
            onClick={() => handleSwitchType('group')}
            className={`flex-1 py-2.5 px-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              chatType === 'group'
                ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/25'
                : 'bg-slate-800/80 text-slate-300 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>گروه جدید (New Group)</span>
          </button>
          <button
            type="button"
            onClick={() => handleSwitchType('channel')}
            className={`flex-1 py-2.5 px-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              chatType === 'channel'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/25'
                : 'bg-slate-800/80 text-slate-300 hover:text-white'
            }`}
          >
            <Megaphone className="w-4 h-4" />
            <span>کانال جدید (New Channel)</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {/* Avatar Section */}
          <div className="flex items-center gap-4 p-3 bg-slate-900/60 border border-slate-800 rounded-2xl">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <img
                src={selectedAvatar}
                alt="Chat Avatar"
                className="w-16 h-16 rounded-2xl object-cover border-2 border-cyan-400 shadow-md"
              />
              <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-5 h-5 text-white" />
              </div>
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-300 font-bold">تصویر نمایه:</span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-bold cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>انتخاب از گالری گوشی</span>
                </button>
              </div>

              {/* Presets */}
              <div className="flex items-center gap-2">
                {(chatType === 'group' ? DEFAULT_GROUP_AVATARS : DEFAULT_CHANNEL_AVATARS).map((av, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedAvatar(av)}
                    className={`w-8 h-8 rounded-xl overflow-hidden border transition-all cursor-pointer ${
                      selectedAvatar === av ? 'border-cyan-400 scale-110 shadow-md' : 'border-slate-700 opacity-70'
                    }`}
                  >
                    <img src={av} alt="Preset" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Name & Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">
              {chatType === 'group' ? 'نام گروه:' : 'نام کانال:'}
            </label>
            <input
              type="text"
              placeholder={chatType === 'group' ? 'مثال: اعضای گادفادر، تیم فنی...' : 'مثال: کانال رسمی اخبار گادفادر...'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white outline-none focus:border-cyan-400"
              required
            />
          </div>

          {/* Channel Username (Only for Channel) */}
          {chatType === 'channel' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">
                  شناسه اختصاصی و عمومی کانال (Username / Link):
                </label>
                {channelUsername.trim() && (
                  <span className="text-[11px] flex items-center gap-1 font-sans">
                    {usernameStatus.checking ? (
                      <span className="text-amber-400 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>بررسی اختصاصی بودن...</span>
                      </span>
                    ) : usernameStatus.available ? (
                      <span className="text-emerald-400 flex items-center gap-1 font-bold">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>آزاد و اختصاصی</span>
                      </span>
                    ) : usernameStatus.error ? (
                      <span className="text-rose-400 flex items-center gap-1 font-bold">
                        <AlertCircle className="w-3 h-3" />
                        <span>تکراری / غیرمجاز</span>
                      </span>
                    ) : null}
                  </span>
                )}
              </div>
              <div className={`flex items-center bg-slate-900 border rounded-xl px-3.5 py-2 transition-colors ${
                channelUsername.trim()
                  ? usernameStatus.available
                    ? 'border-emerald-500/80 focus-within:border-emerald-400'
                    : usernameStatus.error
                    ? 'border-rose-500/80 focus-within:border-rose-400'
                    : 'border-slate-700 focus-within:border-amber-400'
                  : 'border-slate-700 focus-within:border-amber-400'
              }`}>
                <span className="text-amber-400 text-xs ml-1 font-mono font-bold">@</span>
                <input
                  type="text"
                  placeholder="godfather_channel"
                  value={channelUsername}
                  onChange={(e) => setChannelUsername(e.target.value)}
                  dir="ltr"
                  className="w-full bg-transparent text-xs text-white outline-none font-mono text-left"
                />
              </div>

              {/* Status message or error explanation */}
              {channelUsername.trim() && usernameStatus.error && (
                <p className="text-[11px] text-rose-400 flex items-center gap-1 mt-1 font-medium bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{usernameStatus.error}</span>
                </p>
              )}

              {channelUsername.trim() && usernameStatus.available && (
                <p className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1 font-medium bg-emerald-500/10 p-1.5 rounded-lg border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>این شناسه کاملاً اختصاصی است و هیچ کانال یا کاربری از آن استفاده نمی‌کند.</span>
                </p>
              )}

              <p className="text-[10px] text-slate-400">
                لینک عمومی کانال ({getDisplayDomain()}):{' '}
                <span className="font-mono text-cyan-400" dir="ltr">
                  {getChatShareLink({ id: 'channel', username: channelUsername || 'channel' })}
                </span>
              </p>
            </div>
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">
              توضیحات یا بیوگرافی (اختیاری):
            </label>
            <textarea
              placeholder={chatType === 'group' ? 'قوانین گروه، موضوع چت و...' : 'موضوع کانال، پیوندهای مهم و...'}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-cyan-400 resize-none"
            />
          </div>

          {/* Supergroup Topics switch (For Group) */}
          {chatType === 'group' && (
            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">فعال‌سازی تاپیک‌ها (Supergroup Topics)</div>
                  <div className="text-[10px] text-slate-400">تقسیم گفتگو به موضوعات و اتاق‌های مجزا در سوپرگروه</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={enableTopics}
                onChange={(e) => setEnableTopics(e.target.checked)}
                className="w-4 h-4 rounded text-cyan-500 cursor-pointer"
              />
            </div>
          )}

          {/* Add Members section (For Group) */}
          {chatType === 'group' && (
            <div className="space-y-2 pt-1 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5 text-cyan-400" />
                  <span>انتخاب اعضای اولیه گروه:</span>
                </label>
                <span className="text-[11px] text-cyan-400 font-bold">
                  {selectedMemberIds.length} عضو انتخاب شده
                </span>
              </div>

              {availableMembers.length > 0 && (
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute top-2.5 right-3" />
                  <input
                    type="text"
                    placeholder="جستجوی کاربر یا مخاطب..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pr-9 pl-3 py-1.5 text-xs text-white outline-none focus:border-cyan-400"
                  />
                </div>
              )}

              <div className="max-h-36 overflow-y-auto space-y-1.5 p-1 bg-slate-900/50 rounded-2xl border border-slate-800/80">
                {filteredMembers.length === 0 ? (
                  <div className="p-3 text-center text-[11px] text-slate-500">
                    کاربری در لیست مخاطبین موجود نیست (شما می‌توانید پس از ایجاد گروه با لینک دعوت دوستان خود را بیفزایید).
                  </div>
                ) : (
                  filteredMembers.map((m) => {
                    const isSelected = selectedMemberIds.includes(m.id);
                    return (
                      <div
                        key={m.id}
                        onClick={() => handleToggleMember(m.id)}
                        className={`flex items-center justify-between p-2 rounded-xl transition-colors cursor-pointer ${
                          isSelected ? 'bg-cyan-500/20 border border-cyan-500/40' : 'hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <img src={m.avatar} alt={m.name} className="w-8 h-8 rounded-full object-cover" />
                          <div>
                            <div className="text-xs font-bold text-white">{m.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{m.phone}</div>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all ${
                          isSelected ? 'bg-cyan-500 text-white' : 'border border-slate-600'
                        }`}>
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Footer Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              className={`w-full py-3 text-sm font-extrabold rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
                chatType === 'group'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/25'
                  : 'bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white shadow-amber-500/25'
              }`}
            >
              {chatType === 'group' ? (
                <>
                  <Users className="w-4 h-4" />
                  <span>تکمیل و ساخت گروه</span>
                </>
              ) : (
                <>
                  <Megaphone className="w-4 h-4" />
                  <span>تکمیل و ساخت کانال</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
