import React, { useState, useRef } from 'react';
import { User } from '../types/telegram';
import { 
  X, 
  ShieldAlert, 
  Sparkles, 
  Users, 
  Send, 
  Activity, 
  Check, 
  Crown, 
  Ban, 
  CheckCircle2, 
  Radio, 
  Database, 
  Cpu, 
  Zap, 
  Search,
  Sliders,
  RefreshCw,
  Plus,
  Camera,
  Star,
  UserCheck,
  UserX,
  Volume2,
  Megaphone,
  LogIn
} from 'lucide-react';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  usersList: User[];
  onToggleUserPremium: (userId: string) => void;
  onChangeUserRole: (userId: string, newRole: 'superadmin' | 'admin' | 'moderator' | 'member') => void;
  onAddStarsToUser: (userId: string, amount: number) => void;
  onToggleBanUser: (userId: string) => void;
  onBroadcastMessage: (title: string, content: string, pinToChannels: boolean) => void;
  onAddNewUser?: (newUser: User) => void;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  usersList,
  onToggleUserPremium,
  onChangeUserRole,
  onAddStarsToUser,
  onToggleBanUser,
  onBroadcastMessage,
  onAddNewUser
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'broadcast' | 'create_user' | 'system_features' | 'audit'>('users');
  const [searchUser, setSearchUser] = useState('');
  
  // Broadcast state
  const [broadcastTitle, setBroadcastTitle] = useState('اطلاعیه مهم مدیریت کل');
  const [broadcastBody, setBroadcastBody] = useState('تمامی امکانات تلگرام پریمیوم به صورت نامحدود در اختیار کاربران قرار گرفت.');
  const [pinBroadcast, setPinBroadcast] = useState(true);
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);

  // New User creation state
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<'member' | 'moderator' | 'admin'>('member');
  const [newIsPremium, setNewIsPremium] = useState(false);
  const [newUserAvatar, setNewUserAvatar] = useState('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80');
  const newUserFileInputRef = useRef<HTMLInputElement>(null);
  
  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<{ id: string; time: string; text: string }[]>([
    { id: '1', time: '۱۲:۲۰', text: 'ورود مدیر کل با شماره 09921758505 ثبت شد.' },
    { id: '2', time: '۱۲:۲۲', text: 'ارتقای دسترسی کاربر @reza_db به Moderator' },
    { id: '3', time: '۱۲:۲۵', text: 'اعطای ۵۰۰ ستاره تلگرام به صندوق عمومی' }
  ]);

  // System feature toggles
  const [globalFeatures, setGlobalFeatures] = useState({
    free4GbLimit: false,
    freeVoiceSTT: true,
    realtimeTranslation: true,
    secretChatsE2EE: true
  });

  if (!isOpen) return null;

  const filteredUsers = usersList.filter(
    (u) =>
      u.name.toLowerCase().includes(searchUser.toLowerCase()) ||
      u.username.toLowerCase().includes(searchUser.toLowerCase()) ||
      u.phone.includes(searchUser)
  );

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastBody.trim()) return;
    onBroadcastMessage(broadcastTitle, broadcastBody, pinBroadcast);
    setBroadcastSuccess(true);
    setAuditLogs((prev) => [
      {
        id: Date.now().toString(),
        time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
        text: `ارسال پیام همگانی به تمام کانال‌ها توسط مدیر (09921758505): "${broadcastTitle}"`
      },
      ...prev
    ]);
    setTimeout(() => {
      setBroadcastSuccess(false);
      setBroadcastBody('');
    }, 2500);
  };

  const handlePremiumToggle = (u: User) => {
    onToggleUserPremium(u.id);
    const action = !u.isPremium ? 'اعطای اشتراک پریمیوم' : 'لغو اشتراک پریمیوم';
    setAuditLogs((prev) => [
      {
        id: Date.now().toString(),
        time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
        text: `${action} برای کاربر @${u.username} (${u.name}) توسط مدیر کل (09921758505)`
      },
      ...prev
    ]);
  };

  const handleAddStars = (u: User, amount: number) => {
    onAddStarsToUser(u.id, amount);
    setAuditLogs((prev) => [
      {
        id: Date.now().toString(),
        time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
        text: `اهدای ${amount.toLocaleString()} ستاره تلگرام به کاربر @${u.username}`
      },
      ...prev
    ]);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newUsername.trim() || !newPhone.trim()) return;

    const userObj: User = {
      id: `usr_${Date.now()}`,
      name: newName.trim(),
      username: newUsername.trim().replace('@', ''),
      phone: newPhone.trim(),
      avatar: newUserAvatar,
      bio: 'کاربر ایجاد شده توسط پنل مدیریت ارشد',
      isPremium: newIsPremium,
      emojiStatus: newIsPremium ? '⭐' : undefined,
      customColor: 'blue',
      lastSeen: 'چند لحظه پیش',
      isOnline: true,
      role: newRole,
      starsBalance: newIsPremium ? 1000 : 100
    };

    onAddNewUser?.(userObj);
    setAuditLogs((prev) => [
      {
        id: Date.now().toString(),
        time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
        text: `ایجاد کاربر جدید @${userObj.username} (${userObj.phone}) توسط مدیر کل`
      },
      ...prev
    ]);

    setNewName('');
    setNewUsername('');
    setNewPhone('');
    setActiveTab('users');
  };

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setNewUserAvatar(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-200">
      <input
        type="file"
        ref={newUserFileInputRef}
        accept="image/*"
        onChange={handleAvatarFile}
        className="hidden"
      />

      <div className="bg-[#17212b] border-0 sm:border border-amber-500/40 rounded-none sm:rounded-3xl w-full sm:max-w-3xl md:max-w-4xl h-full sm:h-auto sm:max-h-[92vh] shadow-2xl overflow-hidden flex flex-col">
        {/* Header with 09921758505 Admin SuperBadge */}
        <div className="px-4 sm:px-6 py-4 border-b border-amber-500/30 bg-gradient-to-r from-amber-950/60 via-slate-900 to-amber-950/40 flex items-center justify-between sticky top-0 z-10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-600 flex items-center justify-center text-black font-extrabold shadow-lg shadow-amber-500/20 flex-shrink-0">
              <Crown className="w-6 h-6 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-white text-base sm:text-lg">پنل مدیریت ارشد تلگرام</h2>
                <span className="text-[10px] bg-amber-400 text-black font-bold px-2 py-0.5 rounded-full font-mono">
                  09921758505
                </span>
              </div>
              <p className="text-xs text-amber-200/80">
                مدیریت کاربران، اعطای اشتراک پریمیوم، اهدای ستاره و ارسال پیام همگانی
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation - Horizontal scrollable on mobile */}
        <div className="flex bg-[#101822] border-b border-slate-800 px-3 sm:px-6 gap-2 overflow-x-auto scrollbar-none flex-shrink-0">
          {[
            { id: 'users', label: 'مدیریت کاربران و پریمیوم', icon: Users, count: usersList.length },
            { id: 'create_user', label: 'افزودن کاربر جدید', icon: Plus },
            { id: 'broadcast', label: 'پیام همگانی (Broadcast)', icon: Megaphone },
            { id: 'system_features', label: 'تنظیمات سراسری سیستم', icon: Sliders },
            { id: 'audit', label: 'گزارش‌های امنیتی (Audit Logs)', icon: Activity }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-3 sm:px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Scrollable Tab Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* ============================================================
              TAB 1: USERS & PREMIUM MANAGEMENT
             ============================================================ */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              {/* Search & Stats Bar */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchUser}
                    onChange={(e) => setSearchUser(e.target.value)}
                    placeholder="جستجوی کاربر بر اساس نام، نام کاربری یا شماره..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pr-10 pl-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-400"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('create_user')}
                    className="px-3.5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20"
                  >
                    <Plus className="w-4 h-4" />
                    <span>افزودن کاربر</span>
                  </button>
                </div>
              </div>

              {/* Users Cards / List */}
              <div className="space-y-2.5">
                {filteredUsers.map((u) => {
                  const isCurrentAdmin = u.phone === '09921758505';
                  return (
                    <div
                      key={u.id}
                      className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                        u.isPremium
                          ? 'bg-gradient-to-r from-purple-950/20 via-slate-900/60 to-amber-950/20 border-amber-500/30'
                          : 'bg-slate-900/60 border-slate-800'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* User Identity */}
                        <div className="flex items-center gap-3">
                          <div className="relative flex-shrink-0">
                            <img
                              src={u.avatar}
                              alt={u.name}
                              className="w-12 h-12 rounded-full object-cover border-2 border-slate-700"
                            />
                            {u.isPremium && (
                              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-400 text-black flex items-center justify-center text-[10px] font-bold shadow">
                                ★
                              </div>
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-extrabold text-white text-sm">{u.name}</span>
                              {u.isPremium && (
                                <span className="text-[10px] px-2 py-0.2 bg-amber-400/20 text-amber-300 font-bold rounded-full border border-amber-400/30 flex items-center gap-0.5">
                                  <Sparkles className="w-2.5 h-2.5" />
                                  <span>Premium</span>
                                </span>
                              )}
                              {isCurrentAdmin && (
                                <span className="text-[10px] px-2 py-0.2 bg-purple-500 text-white font-bold rounded-full">
                                  👑 مدیر ارشد
                                </span>
                              )}
                              {u.isBanned && (
                                <span className="text-[10px] px-2 py-0.2 bg-rose-500/20 text-rose-300 font-bold rounded-full border border-rose-500/30">
                                  مسدود (Banned)
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap font-mono">
                              <span className="text-cyan-400">@{u.username}</span>
                              <span>•</span>
                              <span>{u.phone}</span>
                              <span>•</span>
                              <span className="text-amber-300 font-bold flex items-center gap-0.5">
                                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                <span>{(u.starsBalance || 0).toLocaleString()} ستاره</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons for this user */}
                        <div className="flex items-center gap-2 flex-wrap justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                          {/* 1-Click Toggle Premium */}
                          <button
                            onClick={() => handlePremiumToggle(u)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
                              u.isPremium
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40'
                                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white'
                            }`}
                            title={u.isPremium ? 'لغو اشتراک پریمیوم' : 'اعطای اشتراک پریمیوم'}
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{u.isPremium ? 'پریمیوم (فعال)' : 'ارتقا به پریمیوم'}</span>
                          </button>

                          {/* Gift Stars */}
                          <button
                            onClick={() => handleAddStars(u, 500)}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                            title="اهدای ۵۰۰ ستاره به کاربر"
                          >
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            <span>+۵۰۰ ستاره</span>
                          </button>

                          {/* Role Selector */}
                          <select
                            value={u.role || 'member'}
                            onChange={(e) => onChangeUserRole(u.id, e.target.value as any)}
                            disabled={isCurrentAdmin}
                            className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-400 cursor-pointer disabled:opacity-50"
                          >
                            <option value="member">کاربر عادی</option>
                            <option value="moderator">ناظم (Moderator)</option>
                            <option value="admin">مدیر (Admin)</option>
                            <option value="superadmin">مدیر کل (SuperAdmin)</option>
                          </select>

                          {/* Ban / Unban */}
                          {!isCurrentAdmin && (
                            <button
                              onClick={() => onToggleBanUser(u.id)}
                              className={`p-1.5 rounded-xl text-xs transition-colors cursor-pointer ${
                                u.isBanned
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                  : 'bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-700'
                              }`}
                              title={u.isBanned ? 'رفع مسدودی کاربر' : 'مسدود کردن کاربر'}
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ============================================================
              TAB 2: ADD NEW USER
             ============================================================ */}
          {activeTab === 'create_user' && (
            <form onSubmit={handleCreateUser} className="max-w-lg mx-auto bg-slate-900/60 border border-slate-800 p-5 rounded-3xl space-y-4">
              <h3 className="font-extrabold text-white text-sm sm:text-base flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-400" />
                <span>تعریف و ایجاد کاربر جدید توسط مدیر کل</span>
              </h3>

              {/* Avatar picker from phone */}
              <div className="flex flex-col items-center gap-2 pb-2">
                <div
                  onClick={() => newUserFileInputRef.current?.click()}
                  className="relative group cursor-pointer"
                  title="انتخاب عکس از گالری گوشی"
                >
                  <img
                    src={newUserAvatar}
                    alt="New user avatar"
                    className="w-20 h-20 rounded-full object-cover border-2 border-amber-400 shadow-md"
                  />
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => newUserFileInputRef.current?.click()}
                  className="text-xs text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>انتخاب عکس از حافظه گوشی</span>
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-300">نام نمایشی:</label>
                <input
                  type="text"
                  placeholder="مثال: کوروش بزرگ..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-300">نام کاربری (@username):</label>
                <input
                  type="text"
                  placeholder="cyrus_the_great"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  dir="ltr"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono text-left outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-300">شماره موبایل:</label>
                <input
                  type="text"
                  placeholder="+98 912 000 0000"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  dir="ltr"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono text-left outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-300">سطح دسترسی:</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-400"
                  >
                    <option value="member">کاربر عادی</option>
                    <option value="moderator">ناظم</option>
                    <option value="admin">مدیر</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-300">اشتراک اولیه:</label>
                  <label className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newIsPremium}
                      onChange={(e) => setNewIsPremium(e.target.checked)}
                      className="w-4 h-4 accent-amber-500"
                    />
                    <span>فعال‌سازی پریمیوم</span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                <Plus className="w-4 h-4" />
                <span>ثبت کاربر در پایگاه داده ScyllaDB</span>
              </button>
            </form>
          )}

          {/* ============================================================
              TAB 3: BROADCAST ANNOUNCEMENT
             ============================================================ */}
          {activeTab === 'broadcast' && (
            <form onSubmit={handleBroadcast} className="max-w-xl mx-auto space-y-4 bg-slate-900/60 p-5 rounded-3xl border border-slate-800">
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-white text-sm">ارسال پیام و بیانیه رسمی به تمام کانال‌ها و گروه‌ها</h3>
              </div>

              {broadcastSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-700/60 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>پیام همگانی با موفقیت برای تمامی کاربران و کانال‌ها ارسال و پین شد!</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs text-slate-300">عنوان اطلاعیه:</label>
                <input
                  type="text"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-300">متن اطلاعیه (پشتیبانی از فرمت‌بندی):</label>
                <textarea
                  rows={4}
                  value={broadcastBody}
                  onChange={(e) => setBroadcastBody(e.target.value)}
                  placeholder="متن پیام..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-400 resize-none leading-relaxed"
                  required
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-300">سنجاق کردن پیام (Pin Message) در بالای چت‌ها</span>
                <input
                  type="checkbox"
                  checked={pinBroadcast}
                  onChange={(e) => setPinBroadcast(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 cursor-pointer"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>انتشار پیام همگانی با امضای مدیر کل (09921758505)</span>
              </button>
            </form>
          )}

          {/* ============================================================
              TAB 4: SYSTEM FEATURE TOGGLES
             ============================================================ */}
          {activeTab === 'system_features' && (
            <div className="max-w-xl mx-auto space-y-3">
              {[
                {
                  key: 'free4GbLimit',
                  title: 'آپلود ۴ گیگابایت رایگان برای تمام کاربران',
                  desc: 'حذف محدودیت ۲ گیگابایتی پروتکل TUS حتی برای کاربران عادی'
                },
                {
                  key: 'freeVoiceSTT',
                  title: 'رونویسی صوتی هوش مصنوعی همگانی (Voice to Text)',
                  desc: 'فعال‌سازی سرویس Whisper برای تمام پیام‌های صوتی بدون نیاز به پریمیوم'
                },
                {
                  key: 'realtimeTranslation',
                  title: 'نوار ترجمه فوری پیام‌ها (Live Translation Bar)',
                  desc: 'ارائه هوشمند دکمه ترجمه در هدر همه چت‌ها'
                },
                {
                  key: 'secretChatsE2EE',
                  title: 'رمزنگاری سرتاسری پیشرفته (E2EE Double Ratchet)',
                  desc: 'تولید خودکار ۴ اموجی اصالت‌سنجی برای تماس‌ها و چت‌های محرمانه'
                }
              ].map((feat) => {
                const isEnabled = (globalFeatures as any)[feat.key];
                return (
                  <div key={feat.key} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">{feat.title}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{feat.desc}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={(e) =>
                        setGlobalFeatures((prev) => ({ ...prev, [feat.key]: e.target.checked }))
                      }
                      className="w-5 h-5 accent-amber-500 cursor-pointer flex-shrink-0"
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* ============================================================
              TAB 5: AUDIT LOGS
             ============================================================ */}
          {activeTab === 'audit' && (
            <div className="space-y-2">
              <div className="text-xs text-slate-400 mb-2">ثبت وقایع مدیریتی و تغییرات امنیتی سیستم در حافظه رویدادها:</div>
              {auditLogs.map((log) => (
                <div key={log.id} className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    <span className="text-slate-200">{log.text}</span>
                  </div>
                  <span className="text-slate-500 font-mono text-[11px] flex-shrink-0">{log.time}</span>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-[#101822] flex items-center justify-between text-xs flex-shrink-0">
          <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>ScyllaDB Node 1/3 Online • Redis Cluster Active</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl transition-colors cursor-pointer"
          >
            بستن پنل
          </button>
        </div>
      </div>
    </div>
  );
};
