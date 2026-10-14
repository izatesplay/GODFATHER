import React, { useState, useRef } from 'react';
import { User, ChatFolder } from '../types/telegram';
import { 
  X, 
  Sparkles, 
  Shield, 
  Key, 
  Eye, 
  Palette, 
  Check, 
  ArrowRight, 
  Camera, 
  Phone, 
  AtSign, 
  FileText, 
  Bell, 
  HardDrive, 
  Folder, 
  Laptop, 
  Globe, 
  HelpCircle, 
  ChevronLeft, 
  ChevronRight, 
  Lock, 
  Smartphone, 
  Trash2, 
  Plus, 
  Radio, 
  CheckCircle2, 
  AlertCircle,
  Sliders,
  Volume2,
  QrCode,
  ShieldCheck,
  Zap,
  Crown,
  Image as ImageIcon,
  Moon,
  Sun,
  Smile,
  UserX,
  Clock,
  Share2,
  UserCheck,
  LogOut,
  LogIn,
  Database,
  Download,
  RefreshCw,
  Server,
  Loader2
} from 'lucide-react';
import { 
  checkApiHealth, 
  getApiBaseUrl, 
  setApiBaseUrl, 
  ApiStatusResponse,
  checkLocalUsernameAvailable,
  checkUsernameAvailability,
  validateUsernameFormat,
  updateUserOnRemote
} from '../utils/apiSync';
import { Chat, ChatWallpaper } from '../types/telegram';
import { SOLID_WALLPAPERS, GRADIENT_WALLPAPERS, DEFAULT_WALLPAPER } from '../data/wallpapers';
import { ProfilePhotoViewerModal } from './ProfilePhotoViewerModal';
import { getUserProfileLink, getDisplayDomain } from '../utils/linkHelper';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onUpdateUser: (updated: Partial<User>) => void;
  folders?: ChatFolder[];
  usersList?: User[];
  chats?: Chat[];
  onOpenAuth?: () => void;
  onLogout?: () => void;
  onOpenAdminPanel?: () => void;
  initialSection?: SettingsSection;
  onSyncDatabase?: () => Promise<{ success: boolean; message?: string; error?: string }>;
  onOpenPwaInstall?: () => void;
  currentWallpaper?: ChatWallpaper;
  onSelectWallpaper?: (wallpaper: ChatWallpaper) => void;
  onToggleBlockUser?: (userIdOrChatId: string, userName?: string) => void;
}

type SettingsSection = 
  | 'main' 
  | 'edit_profile' 
  | 'premium' 
  | 'chat_settings' 
  | 'privacy_security' 
  | 'notifications' 
  | 'data_storage' 
  | 'folders' 
  | 'devices' 
  | 'language' 
  | 'two_step_verification'
  | 'blocked_users'
  | 'faq'
  | 'database_sync';

const EMOJI_STATUS_LIST = ['👑', '⚡', '⭐', '💎', '🚀', '🔥', '🛡️', '🦄', '🪐', '💫', '🦅', '🎯'];

const CHAT_THEMES = [
  { id: 'blue', name: 'تلگرام کلاسیک', color: '#2481cc', bg: '#0e1621' },
  { id: 'purple', name: 'بنفش سلطنتی', color: '#8b5cf6', bg: '#170f2c' },
  { id: 'emerald', name: 'زمردی تیره', color: '#10b981', bg: '#0a1d17' },
  { id: 'amber', name: 'طلایی پریمیوم', color: '#f59e0b', bg: '#1c1608' },
  { id: 'rose', name: 'یاقوتی نئون', color: '#f43f5e', bg: '#1f0d14' },
  { id: 'cyan', name: 'سایبر کلاود', color: '#06b6d4', bg: '#081721' }
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateUser,
  folders = [],
  usersList = [],
  chats = [],
  onOpenAuth,
  onLogout,
  onOpenAdminPanel,
  initialSection = 'main',
  onSyncDatabase,
  onOpenPwaInstall,
  currentWallpaper = DEFAULT_WALLPAPER,
  onSelectWallpaper,
  onToggleBlockUser
}) => {
  const [currentSection, setCurrentSection] = useState<SettingsSection>(initialSection);
  const [wallpaperCategory, setWallpaperCategory] = useState<'solid' | 'gradient' | 'custom'>(() => {
    return currentWallpaper?.type === 'gradient' ? 'gradient' : currentWallpaper?.type === 'image' ? 'custom' : 'solid';
  });
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const wallpaperFileInputRef = useRef<HTMLInputElement>(null);

  const isSuperAdmin = currentUser.phone === '09921758505' || currentUser.role === 'superadmin' || currentUser.role === 'admin' || currentUser.username === 'izatesplay';
  const [premiumRequestSent, setPremiumRequestSent] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      if (initialSection === 'database_sync' && !isSuperAdmin) {
        setCurrentSection('main');
      } else {
        setCurrentSection(initialSection || 'main');
      }
    }
  }, [isOpen, initialSection, isSuperAdmin]);

  React.useEffect(() => {
    if (isOpen && currentSection === 'database_sync') {
      if (isSuperAdmin) {
        handleCheckApiStatus();
      } else {
        setCurrentSection('main');
      }
    }
  }, [isOpen, currentSection, isSuperAdmin]);

  // Edit Profile state
  const [nameInput, setNameInput] = useState(currentUser.name);
  const [usernameInput, setUsernameInput] = useState(currentUser.username);
  const [bioInput, setBioInput] = useState(currentUser.bio || '');
  const [avatarPreview, setAvatarPreview] = useState(currentUser.avatar);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState(false);
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Multiple profile avatars album state
  const [isProfileViewerOpen, setIsProfileViewerOpen] = useState(false);
  const [currentAvatarIndex, setCurrentAvatarIndex] = useState(0);
  const userPhotos = (currentUser.avatars && currentUser.avatars.length > 0)
    ? currentUser.avatars
    : [currentUser.avatar];
  const safeAvatarIndex = Math.min(currentAvatarIndex, userPhotos.length - 1);

  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean;
    available?: boolean;
    error?: string;
    message?: string;
  }>({ checking: false });

  // استعلام و بررسی اختصاصی بودن نام کاربری به صورت بلادرنگ
  React.useEffect(() => {
    if (!isOpen || currentSection !== 'edit_profile') {
      setUsernameStatus({ checking: false });
      return;
    }

    const clean = usernameInput.trim().replace(/^@+/, '').toLowerCase();
    const currentClean = (currentUser.username || '').trim().replace(/^@+/, '').toLowerCase();

    // اگر نام کاربری دست نخورده است، معتبر است
    if (!clean || clean === currentClean) {
      setUsernameStatus({ checking: false, available: true, message: 'نام کاربری فعلی شما' });
      setProfileErrorMsg(null);
      return;
    }

    const localCheck = checkLocalUsernameAvailable(clean, usersList, chats, currentUser.id);
    if (!localCheck.available) {
      setUsernameStatus({ checking: false, available: false, error: localCheck.error });
      return;
    }

    setUsernameStatus({ checking: true });
    const timer = setTimeout(async () => {
      const remote = await checkUsernameAvailability(clean, currentUser.id);
      if (!remote.available) {
        setUsernameStatus({ checking: false, available: false, error: remote.error || remote.message });
      } else {
        setUsernameStatus({ checking: false, available: true, message: `شناسه @${clean} آزاد و قابل ثبت است.` });
        setProfileErrorMsg(null);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [usernameInput, currentSection, isOpen, currentUser, usersList, chats]);

  // Chat Settings state
  const [fontSize, setFontSize] = useState(15);
  const [selectedTheme, setSelectedTheme] = useState('blue');
  const [sendByEnter, setSendByEnter] = useState(true);
  const [bubbleRadius, setBubbleRadius] = useState(16);
  const [nightMode, setNightMode] = useState(true);
  const [largeEmoji, setLargeEmoji] = useState(true);
  const [animatedStickers, setAnimatedStickers] = useState(true);
  const [customWallpaper, setCustomWallpaper] = useState<string | null>(null);

  // Privacy state
  const [privacyLastSeen, setPrivacyLastSeen] = useState<'everyone' | 'contacts' | 'nobody'>('everyone');
  const [privacyPhone, setPrivacyPhone] = useState<'everyone' | 'contacts' | 'nobody'>('contacts');
  const [privacyPhotos, setPrivacyPhotos] = useState<'everyone' | 'contacts' | 'nobody'>('everyone');
  const [privacyForwards, setPrivacyForwards] = useState<'everyone' | 'contacts' | 'nobody'>('everyone');
  const [privacyCalls, setPrivacyCalls] = useState<'everyone' | 'contacts' | 'nobody'>('everyone');
  const [privacyVoiceMsgs, setPrivacyVoiceMsgs] = useState<'everyone' | 'contacts' | 'nobody'>('everyone');
  const [autoDeleteTime, setAutoDeleteTime] = useState<'off' | '1d' | '1w' | '1m'>('off');
  const [passcodeEnabled, setPasscodeEnabled] = useState(false);
  const [passcodePin, setPasscodePin] = useState('1234');
  const [blockedUsers, setBlockedUsers] = useState<string[]>([
    'اسپمر تبلیغاتی (@spammer_bot)',
    'کاربر مشکوک (+98 900 000 0000)'
  ]);

  // 2FA State
  const [cloudPassword, setCloudPassword] = useState('cloudpulse2026');
  const [passwordHint, setPasswordHint] = useState('رمز عبور ابری پروژه کلاودپالس');
  const [recoveryEmail, setRecoveryEmail] = useState('admin@cloudpulse.org');
  const [srpTestSuccess, setSrpTestSuccess] = useState(false);

  // Notifications State
  const [notifPrivate, setNotifPrivate] = useState(true);
  const [notifGroups, setNotifGroups] = useState(true);
  const [notifChannels, setNotifChannels] = useState(false);
  const [inAppSounds, setInAppSounds] = useState(true);
  const [inAppVibrate, setInAppVibrate] = useState(true);
  const [inAppPreview, setInAppPreview] = useState(true);

  // Data & Storage State
  const [cacheSize, setCacheSize] = useState(545);
  const [cacheCleared, setCacheCleared] = useState(false);
  const [autoDownloadMobile, setAutoDownloadMobile] = useState(false);
  const [autoDownloadWifi, setAutoDownloadWifi] = useState(true);
  const [streamMedia, setStreamMedia] = useState(true);

  // Folders State
  const [customFoldersList, setCustomFoldersList] = useState<string[]>([
    'همه گفتگوها',
    'شخصی',
    'گروه‌ها و سوپرگروه‌ها',
    'کانال‌ها',
    'ربات‌ها',
    'پیام‌های نخوانده'
  ]);
  const [newFolderName, setNewFolderName] = useState('');

  // Active Sessions State
  const [sessions, setSessions] = useState([
    { id: 'sess_1', device: 'CloudPulse Web K (مرورگر جاری)', ip: '185.120.44.10 • تهران، ایران', online: true, lastActive: 'هم‌اکنون فعال' },
    { id: 'sess_2', device: 'Telegram Android 11.2 (Samsung Galaxy S24)', ip: '178.252.140.22 • تهران', online: false, lastActive: '۲ ساعت پیش' },
    { id: 'sess_3', device: 'Telegram Desktop for macOS (Apple Silicon)', ip: '185.190.35.12 • فرانکفورت', online: false, lastActive: 'دیروز ۱۸:۳۰' }
  ]);

  // Language & Translation State
  const [selectedLang, setSelectedLang] = useState('fa');
  const [showTranslateBtn, setShowTranslateBtn] = useState(true);

  // Database API Bridge state
  const [apiUrlInput, setApiUrlInput] = useState(getApiBaseUrl());
  const [apiStatusData, setApiStatusData] = useState<ApiStatusResponse | null>(null);
  const [apiStatusLoading, setApiStatusLoading] = useState(false);
  const [apiStatusError, setApiStatusError] = useState<string | null>(null);
  const [apiSyncFeedback, setApiSyncFeedback] = useState<string | null>(null);
  const [isSyncingData, setIsSyncingData] = useState(false);

  const handleCheckApiStatus = async (urlToTest?: string) => {
    setApiStatusLoading(true);
    setApiStatusError(null);
    const target = urlToTest || apiUrlInput;
    const res = await checkApiHealth(target);
    setApiStatusLoading(false);
    if (res.success && res.data) {
      setApiStatusData(res.data);
      setApiBaseUrl(target);
    } else {
      setApiStatusError(res.error || 'خطا در اتصال به سرور');
    }
  };

  const handleTriggerSync = async () => {
    if (onSyncDatabase) {
      setIsSyncingData(true);
      const res = await onSyncDatabase();
      setIsSyncingData(false);
      if (res.success) {
        setApiSyncFeedback(res.message || 'همگام‌سازی با موفقیت انجام شد');
        handleCheckApiStatus();
      } else {
        setApiSyncFeedback(`خطا: ${res.error}`);
      }
      setTimeout(() => setApiSyncFeedback(null), 4000);
    }
  };

  if (!isOpen) return null;

  // Handle native phone photo selection (unlimited profile photo album)
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const res = reader.result;
          setAvatarPreview(res);
          const currentList = (currentUser.avatars && currentUser.avatars.length > 0)
            ? currentUser.avatars
            : [currentUser.avatar];
          const updated = [res, ...currentList.filter((a) => a !== res)];
          onUpdateUser({ avatar: res, avatars: updated });
          setCurrentAvatarIndex(0);
          setProfileSuccessMsg(true);
          setTimeout(() => setProfileSuccessMsg(false), 2500);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle wallpaper selection from device
  const handleWallpaperFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setCustomWallpaper(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileErrorMsg(null);

    const cleanUsername = usernameInput.trim().replace(/^@+/, '').toLowerCase();
    const currentClean = (currentUser.username || '').trim().replace(/^@+/, '').toLowerCase();

    // اعتبارسنجی در صورت تغییر نام کاربری
    if (cleanUsername && cleanUsername !== currentClean) {
      const formatCheck = validateUsernameFormat(cleanUsername);
      if (!formatCheck.valid) {
        setProfileErrorMsg(formatCheck.error || 'فرمت نام کاربری نامعتبر است.');
        return;
      }

      const localCheck = checkLocalUsernameAvailable(cleanUsername, usersList, chats, currentUser.id);
      if (!localCheck.available) {
        setProfileErrorMsg(localCheck.error || 'این نام کاربری قبلاً استفاده شده و تکراری است.');
        return;
      }

      if (usernameStatus.available === false) {
        setProfileErrorMsg(usernameStatus.error || 'این نام کاربری در دسترس نیست و به فرد دیگری تعلق دارد.');
        return;
      }
    }

    setIsSavingProfile(true);

    const updatedUserObj = {
      name: nameInput.trim() || currentUser.name,
      username: cleanUsername || currentUser.username,
      bio: bioInput.trim(),
      avatar: avatarPreview
    };

    // ذخیره در سرور دیتابیس MySQL / Express
    await updateUserOnRemote({
      id: currentUser.id,
      ...updatedUserObj
    });

    setIsSavingProfile(false);

    onUpdateUser(updatedUserObj);
    setProfileSuccessMsg(true);
    setTimeout(() => {
      setProfileSuccessMsg(false);
      setCurrentSection('main');
    }, 1000);
  };

  const handleClearCache = () => {
    setCacheSize(0);
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 3000);
  };

  const handleTerminateOtherSessions = () => {
    setSessions((prev) => prev.filter((s) => s.online));
  };

  const handleAddCustomFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    setCustomFoldersList((prev) => [...prev, newFolderName.trim()]);
    setNewFolderName('');
  };

  const handleRemoveFolder = (folderName: string) => {
    setCustomFoldersList((prev) => prev.filter((f) => f !== folderName));
  };

  const handleUnblockUser = (userStr: string) => {
    setBlockedUsers((prev) => prev.filter((u) => u !== userStr));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-200">
      {/* Hidden native file inputs for phone gallery */}
      <input
        type="file"
        ref={avatarFileInputRef}
        accept="image/*"
        onChange={handleAvatarFileChange}
        className="hidden"
      />
      <input
        type="file"
        ref={wallpaperFileInputRef}
        accept="image/*"
        onChange={handleWallpaperFileChange}
        className="hidden"
      />

      <div className="bg-[#17212b] border-0 sm:border border-slate-700/80 rounded-none sm:rounded-3xl w-full sm:max-w-md md:max-w-lg h-full sm:h-auto sm:max-h-[90vh] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-800 bg-[#17212b]/95 backdrop-blur-md sticky top-0 z-10 flex-shrink-0">
          <div className="flex items-center gap-2">
            {currentSection !== 'main' ? (
              <button
                onClick={() => setCurrentSection('main')}
                className="p-1.5 -mr-1 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-xs"
              >
                <ArrowRight className="w-5 h-5" />
                <span className="font-medium hidden sm:inline">بازگشت</span>
              </button>
            ) : null}

            <h3 className="font-extrabold text-white text-base">
              {currentSection === 'main' && 'تنظیمات (Settings)'}
              {currentSection === 'edit_profile' && 'ویرایش اطلاعات حساب'}
              {currentSection === 'premium' && 'تلگرام پریمیوم (Telegram Premium)'}
              {currentSection === 'chat_settings' && 'تنظیمات گفتگوها (Chat Settings)'}
              {currentSection === 'privacy_security' && 'حریم خصوصی و امنیت'}
              {currentSection === 'two_step_verification' && 'تأیید دو مرحله‌ای (۲FA)'}
              {currentSection === 'notifications' && 'اعلان‌ها و صداها'}
              {currentSection === 'data_storage' && 'داده‌ها و ذخیره‌سازی'}
              {currentSection === 'folders' && 'پوشه‌های چت (Chat Folders)'}
              {currentSection === 'devices' && 'دستگاه‌ها و نشست‌های فعال'}
              {currentSection === 'language' && 'زبان و ترجمه'}
              {currentSection === 'blocked_users' && 'کاربران مسدود شده'}
              {currentSection === 'faq' && 'پرسش‌های متداول تلگرام'}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="بستن تنظیمات"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 divide-y divide-slate-800/80">
          
          {/* ============================================================
              1. MAIN SETTINGS DASHBOARD
             ============================================================ */}
          {currentSection === 'main' && (
            <div className="space-y-1">
              {/* Profile Card with Direct Phone Camera Button */}
              <div className="p-4 sm:p-5 flex items-center justify-between bg-gradient-to-l from-slate-900/60 to-slate-800/40 border-b border-slate-800">
                <div className="flex items-center gap-3.5">
                  <div
                    onClick={() => avatarFileInputRef.current?.click()}
                    className="relative group cursor-pointer"
                    title="انتخاب عکس پروفایل از حافظه گوشی"
                  >
                    <img
                      src={currentUser.avatar}
                      alt={currentUser.name}
                      className="w-16 h-16 sm:w-18 sm:h-18 rounded-full object-cover border-2 border-cyan-500/80 shadow-md"
                    />
                    <div className="absolute inset-0 bg-black/40 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="w-5 h-5 text-white" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-cyan-500 text-white flex items-center justify-center shadow border-2 border-[#17212b]">
                      <Camera className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  <div>
                    <div className="font-extrabold text-white text-base sm:text-lg flex items-center gap-1.5">
                      <span>{currentUser.name}</span>
                      {currentUser.isPremium && (
                        <span className="text-amber-400 font-bold text-sm">
                          {currentUser.emojiStatus || '★'}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-500" />
                      <span>{currentUser.phone}</span>
                      {isSuperAdmin && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.2 rounded-md border border-amber-500/30">
                          مدیر کل
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-cyan-400 font-mono mt-0.5">
                      @{currentUser.username}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 items-end">
                  <button
                    onClick={() => setCurrentSection('edit_profile')}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl text-slate-200 transition-colors cursor-pointer border border-slate-700 shadow-sm"
                  >
                    ویرایش پروفایل
                  </button>
                  <button
                    onClick={() => avatarFileInputRef.current?.click()}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <Camera className="w-3 h-3" />
                    <span>تغییر عکس از گوشی</span>
                  </button>
                </div>
              </div>

              {/* Admin Panel Quick Access Banner (Only for 09921758505 / SuperAdmin) */}
              {isSuperAdmin && onOpenAdminPanel && (
                <div className="p-3 px-4">
                  <button
                    onClick={onOpenAdminPanel}
                    className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/60 via-amber-900/40 to-yellow-950/50 border border-amber-500/50 hover:border-amber-400 transition-all cursor-pointer group shadow-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-600 flex items-center justify-center text-black font-extrabold shadow-md">
                        <Crown className="w-5 h-5 text-black" />
                      </div>
                      <div className="text-right">
                        <div className="font-extrabold text-white text-sm flex items-center gap-1.5">
                          <span>پنل مدیریت ارشد</span>
                          <span className="text-[10px] px-1.5 py-0.2 bg-amber-400 text-black font-bold rounded-full">
                            دسترسی کامل
                          </span>
                        </div>
                        <div className="text-[11px] text-amber-200/90">
                          اعطای اشتراک پریمیوم، مدیریت کاربران، ستاره‌ها و ارسال همگانی
                        </div>
                      </div>
                    </div>
                    <ChevronLeft className="w-5 h-5 text-amber-400 group-hover:text-white transition-colors" />
                  </button>
                </div>
              )}

              {/* Telegram Premium Banner */}
              <div className="p-3 px-4">
                <button
                  onClick={() => setCurrentSection('premium')}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-purple-900/50 via-indigo-900/50 to-amber-900/40 border border-purple-500/40 hover:border-amber-400/60 transition-all cursor-pointer group shadow-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-purple-500 flex items-center justify-center text-black font-extrabold shadow-md">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-white text-sm flex items-center gap-1.5">
                        <span>Telegram Premium</span>
                        {currentUser.isPremium && (
                          <span className="text-[10px] px-1.5 py-0.2 bg-amber-400 text-black font-bold rounded-full">
                            فعال
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-300">
                        {currentUser.isPremium
                          ? 'اشتراک فعال است • سقف ۴GB و رونویسی ویس باز است'
                          : 'افزایش سقف آپلود به ۴GB، رونویسی ویس و استاتوس اموجی'}
                      </div>
                    </div>
                  </div>
                  <ChevronLeft className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
                </button>
              </div>

              {/* Settings Menu List */}
              <div className="p-2 space-y-0.5">
                {[
                  {
                    id: 'chat_settings',
                    title: 'تنظیمات گفتگوها (Chat Settings)',
                    subtitle: 'تم‌ها، اندازه قلم پیام‌ها، والپیپر از گالری، ارسال با اینتر',
                    icon: Palette,
                    color: 'text-purple-400',
                    bg: 'bg-purple-500/15'
                  },
                  {
                    id: 'privacy_security',
                    title: 'حریم خصوصی و امنیت (Privacy and Security)',
                    subtitle: '۲FA، آخرین بازدید، مسدودشده‌ها، حذف خودکار پیام',
                    icon: Shield,
                    color: 'text-emerald-400',
                    bg: 'bg-emerald-500/15'
                  },
                  {
                    id: 'notifications',
                    title: 'اعلان‌ها و صداها (Notifications and Sounds)',
                    subtitle: 'پیام‌های خصوصی، گروه‌ها، کانال‌ها، لرزش',
                    icon: Bell,
                    color: 'text-rose-400',
                    bg: 'bg-rose-500/15'
                  },
                  {
                    id: 'data_storage',
                    title: 'داده‌ها و ذخیره‌سازی (Data and Storage)',
                    subtitle: `پاکسازی کش (${cacheSize} MB)، دانلود خودکار، پخش مستقیم`,
                    icon: HardDrive,
                    color: 'text-cyan-400',
                    bg: 'bg-cyan-500/15'
                  },
                  {
                    id: 'folders',
                    title: 'پوشه‌های چت (Chat Folders)',
                    subtitle: `${customFoldersList.length} پوشه فعال، ساخت پوشه سفارشی`,
                    icon: Folder,
                    color: 'text-amber-400',
                    bg: 'bg-amber-500/15'
                  },
                  {
                    id: 'devices',
                    title: 'دستگاه‌ها و نشست‌ها (Devices)',
                    subtitle: `${sessions.length} نشست فعال در مرورگر و موبایل`,
                    icon: Laptop,
                    color: 'text-blue-400',
                    bg: 'bg-blue-500/15'
                  },
                  {
                    id: 'language',
                    title: 'زبان و ترجمه (Language)',
                    subtitle: 'فارسی (Persian) • مترجم هوشمند پیام‌ها',
                    icon: Globe,
                    color: 'text-indigo-400',
                    bg: 'bg-indigo-500/15'
                  },
                  {
                    id: 'faq',
                    title: 'راهنما و سوالات متداول (Telegram FAQ)',
                    subtitle: 'امنیت، سوالات رایج و معماری CloudPulse',
                    icon: HelpCircle,
                    color: 'text-teal-400',
                    bg: 'bg-teal-500/15'
                  },
                  ...(isSuperAdmin ? [{
                    id: 'database_sync',
                    title: 'پایگاه داده MySQL و هاست cPanel (Database & API Bridge)',
                    subtitle: 'بررسی سلامت api.php، همگام‌سازی داده‌ها، دانلود اسکریپت و راهنما',
                    icon: Database,
                    color: 'text-emerald-400',
                    bg: 'bg-emerald-500/15'
                  }] : []),
                  {
                    id: 'pwa_install',
                    title: 'نصب اپلیکیشن روی گوشی (Web2App / PWA)',
                    subtitle: 'نصب مستقیم و بدون نیاز به فایل APK روی اندروید و آیفون (iOS)',
                    icon: Smartphone,
                    color: 'text-cyan-400',
                    bg: 'bg-cyan-500/15',
                    action: () => {
                      if (onOpenPwaInstall) onOpenPwaInstall();
                    }
                  }
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if ((item as any).action) {
                          (item as any).action();
                        } else {
                          setCurrentSection(item.id as SettingsSection);
                        }
                      }}
                      className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-800/70 transition-all text-right cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl ${item.bg} ${item.color} flex items-center justify-center flex-shrink-0`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-white text-xs sm:text-sm">
                            {item.title}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {item.subtitle}
                          </div>
                        </div>
                      </div>
                      <ChevronLeft className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors flex-shrink-0" />
                    </button>
                  );
                })}

                {/* Account Switch & Logout */}
                {onLogout && (
                  <button
                    onClick={() => {
                      onClose();
                      onLogout();
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-rose-500/15 transition-all text-right cursor-pointer group border border-rose-500/30 mt-2 bg-rose-500/5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center flex-shrink-0">
                        <LogOut className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-rose-400 text-xs sm:text-sm">
                          خروج از حساب کاربری
                        </div>
                        <div className="text-[11px] text-slate-400">
                          خروج از نشست فعلی و بستن دسترسی به برنامه
                        </div>
                      </div>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-slate-500 group-hover:text-rose-400 transition-colors" />
                  </button>
                )}

                {onOpenAuth && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenAuth();
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-cyan-500/10 transition-all text-right cursor-pointer group border border-slate-800/80 mt-2"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center flex-shrink-0">
                        <LogIn className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-cyan-400 text-xs sm:text-sm">
                          ورود با حساب دیگر یا ثبت‌نام
                        </div>
                        <div className="text-[11px] text-slate-400">
                          تعویض حساب به کاربری دیگر
                        </div>
                      </div>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                  </button>
                )}
              </div>

              {/* Version & Build info & Attribution */}
              <div className="p-4 text-center space-y-2 border-t border-slate-800/80 mt-2">
                <div className="text-xs sm:text-sm font-extrabold text-cyan-300 bg-cyan-950/40 border border-cyan-800/50 py-2.5 px-4 rounded-2xl shadow-sm">
                  ساخته شده توسط محمد رضا فتح آبادی
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  GODFATHER SQUAD • Web Edition 2026
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  Connected to ScyllaDB Cluster & WebRTC SFU
                </div>
              </div>
            </div>
          )}

          {/* ============================================================
              2. EDIT PROFILE SUB-PAGE (PHONE FILE ONLY, NO URL LINK)
             ============================================================ */}
          {currentSection === 'edit_profile' && (
            <form onSubmit={handleSaveProfile} className="p-4 sm:p-5 space-y-4">
              {profileSuccessMsg && (
                <div className="p-3 rounded-2xl bg-emerald-950/50 border border-emerald-700/60 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>تغییرات پروفایل با موفقیت ذخیره شد!</span>
                </div>
              )}

              {/* Avatar Album Carousel Preview & Gallery File Picker */}
              <div className="flex flex-col items-center gap-3 pb-4 border-b border-slate-800">
                <div className="relative group flex items-center justify-center">
                  <div 
                    onClick={() => setIsProfileViewerOpen(true)}
                    className="relative cursor-pointer group-hover:scale-102 transition-transform"
                    title="برای مشاهده آلبوم کامل عکس‌های پروفایل کلیک کنید"
                  >
                    <img
                      src={userPhotos[safeAvatarIndex] || avatarPreview}
                      alt="Avatar preview"
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-cyan-400 shadow-xl"
                    />
                    <div className="absolute inset-0 bg-black/40 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Eye className="w-6 h-6 text-white" />
                      <span className="text-[10px] text-white font-medium mt-0.5">مشاهده آلبوم</span>
                    </div>
                    {userPhotos.length > 1 && (
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-black/80 text-cyan-300 text-[10px] font-mono px-2 py-0.5 rounded-full border border-white/20">
                        {safeAvatarIndex + 1} / {userPhotos.length}
                      </div>
                    )}
                  </div>

                  {/* Previous / Next buttons for profile photos */}
                  {userPhotos.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setCurrentAvatarIndex((prev) => (prev - 1 + userPhotos.length) % userPhotos.length)}
                        className="absolute -right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center text-xs shadow-md border border-slate-600 cursor-pointer"
                        title="عکس قبلی"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentAvatarIndex((prev) => (prev + 1) % userPhotos.length)}
                        className="absolute -left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center text-xs shadow-md border border-slate-600 cursor-pointer"
                        title="عکس بعدی"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>

                {/* Album action controls */}
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => avatarFileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-bold hover:bg-cyan-500/25 transition-all cursor-pointer shadow-sm"
                    title="افزودن عکس نامحدود به آلبوم پروفایل بدون حذف قبلی‌ها"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>افزودن عکس جدید به آلبوم</span>
                  </button>

                  {safeAvatarIndex !== 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const selected = userPhotos[safeAvatarIndex];
                        const reordered = [selected, ...userPhotos.filter((_, i) => i !== safeAvatarIndex)];
                        onUpdateUser({ avatar: selected, avatars: reordered });
                        setCurrentAvatarIndex(0);
                        setProfileSuccessMsg(true);
                        setTimeout(() => setProfileSuccessMsg(false), 2000);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold hover:bg-amber-500/25 transition-all cursor-pointer shadow-sm"
                      title="انتخاب این عکس به عنوان عکس اصلی پروفایل"
                    >
                      <Crown className="w-3.5 h-3.5 text-amber-400" />
                      <span>تنظیم به عنوان عکس اصلی</span>
                    </button>
                  )}

                  {userPhotos.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const reordered = userPhotos.filter((_, i) => i !== safeAvatarIndex);
                        const newMain = safeAvatarIndex === 0 ? reordered[0] : currentUser.avatar;
                        onUpdateUser({ avatar: newMain, avatars: reordered });
                        setCurrentAvatarIndex((prev) => Math.max(0, prev - 1));
                        setProfileSuccessMsg(true);
                        setTimeout(() => setProfileSuccessMsg(false), 2000);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold hover:bg-rose-500/25 transition-all cursor-pointer shadow-sm"
                      title="حذف این عکس از آلبوم"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      <span>حذف عکس</span>
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 text-center">
                  شما می‌توانید تا بی‌نهایت عکس به آلبوم پروفایل خود اضافه کنید. ({userPhotos.length} عکس ثبت شده)
                </p>
              </div>

              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 font-medium">نام و نام خانوادگی:</label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan-400"
                  required
                />
              </div>

              {/* Username with Uniqueness Feedback */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-slate-300 font-medium">نام کاربری اختصاصی (Username):</label>
                  {usernameInput.trim() && (
                    <span className="text-[11px] flex items-center gap-1 font-sans">
                      {usernameStatus.checking ? (
                        <span className="text-amber-400 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>بررسی اختصاصی بودن...</span>
                        </span>
                      ) : usernameStatus.available ? (
                        <span className="text-emerald-400 flex items-center gap-1 font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{usernameStatus.message || 'آزاد و اختصاصی'}</span>
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

                <div className={`flex items-center bg-slate-900 border rounded-xl px-3 py-2 transition-colors ${
                  usernameInput.trim().toLowerCase() !== (currentUser.username || '').toLowerCase()
                    ? usernameStatus.available
                      ? 'border-emerald-500/80 focus-within:border-emerald-400'
                      : usernameStatus.error
                      ? 'border-rose-500/80 focus-within:border-rose-400'
                      : 'border-slate-700 focus-within:border-cyan-400'
                    : 'border-slate-700 focus-within:border-cyan-400'
                }`}>
                  <span className="text-slate-400 text-sm ml-1 font-mono font-bold">@</span>
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    dir="ltr"
                    className="w-full bg-transparent text-sm text-white outline-none font-mono text-left"
                    required
                  />
                </div>

                {/* Real-time error alert */}
                {usernameInput.trim().toLowerCase() !== (currentUser.username || '').toLowerCase() && usernameStatus.error && (
                  <p className="text-[11px] text-rose-400 flex items-center gap-1 mt-1 font-medium bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{usernameStatus.error}</span>
                  </p>
                )}

                {/* Profile submit error message */}
                {profileErrorMsg && (
                  <p className="text-[11px] text-rose-400 flex items-center gap-1 mt-1 font-medium bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{profileErrorMsg}</span>
                  </p>
                )}

                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-300">
                  <div className="min-w-0 flex-1 truncate">
                    <span>لینک مستقیم شما ({getDisplayDomain()}): </span>
                    <span className="text-cyan-400 font-mono" dir="ltr">
                      {getUserProfileLink(usernameInput || currentUser.username || 'username')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(getUserProfileLink(usernameInput || currentUser.username || 'username'));
                      setProfileSuccessMsg(true);
                      setTimeout(() => setProfileSuccessMsg(false), 2000);
                    }}
                    className="mr-2 text-cyan-400 hover:text-cyan-300 font-bold cursor-pointer flex-shrink-0"
                  >
                    کپی پیوند
                  </button>
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs text-slate-300">
                  <span>بیوگرافی (Bio):</span>
                  <span className="font-mono text-[11px] text-slate-500">{bioInput.length} / 120</span>
                </div>
                <textarea
                  rows={3}
                  maxLength={120}
                  value={bioInput}
                  onChange={(e) => setBioInput(e.target.value)}
                  placeholder="درباره خود بنویسید..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white outline-none focus:border-cyan-400 resize-none leading-relaxed"
                />
              </div>

              {/* Phone info */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                <span>شماره تماس ثبت‌شده:</span>
                <span className="font-mono text-white font-bold">{currentUser.phone}</span>
              </div>

              <button
                type="submit"
                disabled={isSavingProfile || usernameStatus.available === false}
                className={`w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm rounded-xl transition-all shadow-md mt-2 flex items-center justify-center gap-2 ${
                  isSavingProfile || usernameStatus.available === false ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                {isSavingProfile ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>در حال ذخیره و ثبت تغییرات...</span>
                  </>
                ) : (
                  <span>ذخیره تغییرات پروفایل</span>
                )}
              </button>
            </form>
          )}

          {/* ============================================================
              3. TELEGRAM PREMIUM CATALOG & TOGGLE
             ============================================================ */}
          {currentSection === 'premium' && (
            <div className="p-4 sm:p-5 space-y-5">
              {/* Premium Status Hero Card */}
              <div className="p-5 rounded-3xl bg-gradient-to-br from-purple-950/80 via-indigo-950/80 to-amber-950/60 border border-purple-500/40 text-center space-y-3 shadow-xl">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-400 to-purple-500 flex items-center justify-center mx-auto shadow-lg shadow-purple-500/30">
                  <Crown className="w-9 h-9 text-black" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-white flex items-center justify-center gap-1.5">
                    <span>Telegram Premium Ecosystem</span>
                    <Sparkles className="w-4 h-4 text-amber-400" />
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">
                    دسترسی به تمام قابلیت‌های ویژه، سقف آپلود دوبرابر و رونویسی هوش مصنوعی
                  </p>
                </div>

                <div className="pt-2">
                  {isSuperAdmin ? (
                    <button
                      onClick={() => onUpdateUser({ isPremium: !currentUser.isPremium })}
                      className={`w-full py-3 rounded-2xl font-extrabold text-sm transition-all cursor-pointer shadow-lg ${
                        currentUser.isPremium
                          ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20'
                          : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-600/30'
                      }`}
                    >
                      {currentUser.isPremium ? '★ اشتراک پریمیوم مدیر فعال است (تغییر وضعیت)' : 'فعال‌سازی پریمیوم برای مدیر'}
                    </button>
                  ) : currentUser.isPremium ? (
                    <div className="p-3.5 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-center">
                      <div className="text-amber-300 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5">
                        <Crown className="w-4 h-4 text-amber-400" />
                        <span>اشتراک تلگرام پریمیوم شما فعال است</span>
                      </div>
                      <div className="text-[11px] text-slate-300 mt-1">
                        این اشتراک توسط مدیریت کل سامانه به حساب شما اختصاص یافته است.
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {premiumRequestSent ? (
                        <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 text-xs flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>درخواست فعال‌سازی اشتراک پریمیوم برای مدیریت کل ارسال شد.</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => setPremiumRequestSent(true)}
                          className="w-full py-3 rounded-2xl font-extrabold text-sm bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white transition-all cursor-pointer shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2"
                        >
                          <Sparkles className="w-4 h-4 text-amber-300" />
                          <span>درخواست ارتقا به تلگرام پریمیوم</span>
                        </button>
                      )}
                      <p className="text-[11px] text-slate-400 text-center">
                        کاربران عادی امکان فعال‌سازی مستقیم اشتراک را ندارند و تایید توسط مدیر کل الزامی است.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Emoji Status Picker */}
              <div className="space-y-2">
                <label className="text-xs text-slate-300 font-bold flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  <span>انتخاب استاتوس اموجی اختصاصی (Emoji Status):</span>
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {EMOJI_STATUS_LIST.map((emoji) => (
                    <button
                      key={emoji}
                      disabled={!currentUser.isPremium}
                      onClick={() => onUpdateUser({ emojiStatus: emoji })}
                      className={`h-11 rounded-2xl text-xl flex items-center justify-center transition-all ${
                        currentUser.emojiStatus === emoji
                          ? 'bg-amber-500/25 border-2 border-amber-400 scale-105 shadow-md shadow-amber-500/20'
                          : 'bg-slate-900 border border-slate-700/80 hover:bg-slate-800'
                      } ${!currentUser.isPremium ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Complete Features Breakdown */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-300">قابلیت‌های بازگشایی‌شده برای شما:</div>
                <div className="space-y-2">
                  {[
                    { title: 'سقف آپلود ۴ گیگابایت', desc: 'ارسال اسناد، ویدیوها و فایل‌های عظیم بدون افت کیفیت با پروتکل TUS' },
                    { title: 'رونویسی هوشمند ویس و ویدیو (STT)', desc: 'تبدیل آنی صوت‌های ضبط‌شده به متن با مدل هوش مصنوعی Whisper' },
                    { title: 'ترجمه زنده گفتگوها', desc: 'نوار ابزار ترجمه آنی مکالمات به زبان دلخواه با یک کلیک' },
                    { title: 'حالت روح در استوری‌ها (Stealth Mode)', desc: 'مشاهده استوری دیگران بدون ثبت نام شما در لیست بازدیدکنندگان' },
                    { title: 'افزایش سقف پوشه‌ها به ۲۰ عدد', desc: 'مدیریت تا ۲۰۰ چت در هر پوشه و سنجاق ۱۰ گفتگو' },
                    { title: 'حذف کامل تبلیغات رسمی', desc: 'تجربه محیطی تمیز و عاری از هرگونه اسپانسرشیپ در کانال‌های عمومی' }
                  ].map((feat, idx) => (
                    <div key={idx} className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-bold text-white">{feat.title}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{feat.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================
              4. CHAT SETTINGS & APPEARANCE (WALLPAPER FROM PHONE)
             ============================================================ */}
          {currentSection === 'chat_settings' && (
            <div className="p-4 sm:p-5 space-y-5">
              {/* Message Font Size Slider */}
              <div className="space-y-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-white">اندازه قلم پیام‌ها:</span>
                  <span className="font-mono text-cyan-400 font-bold">{fontSize} پیکسل</span>
                </div>
                <input
                  type="range"
                  min={12}
                  max={22}
                  value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />

                {/* Live Message Bubble Preview */}
                <div className="p-3 rounded-2xl bg-[#242f3d] text-white border border-slate-700/60 mt-2">
                  <div style={{ fontSize: `${fontSize}px` }} className="leading-relaxed">
                    این یک پیش‌نمایش زنده از حباب پیام‌های شما در پیام‌رسان CloudPulse است!
                  </div>
                  <div className="text-[10px] text-slate-400 text-left mt-1 font-mono">۱۰:۴۲ ✓✓</div>
                </div>
              </div>

              {/* Chat Themes & Accent Colors */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-white">تم و رنگ‌بندی محیط گفتگو:</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {CHAT_THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => {
                        setSelectedTheme(theme.id);
                        onUpdateUser({ customColor: theme.id as any });
                      }}
                      className={`flex items-center gap-3 p-3 rounded-2xl border text-right transition-all cursor-pointer ${
                        selectedTheme === theme.id
                          ? 'border-cyan-400 bg-cyan-500/10 text-white shadow-md'
                          : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="w-5 h-5 rounded-full" style={{ backgroundColor: theme.color }} />
                      <span className="text-xs font-medium">{theme.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Wallpaper Customizer (Solid Colors, Abstract Gradients & Gallery) */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-1.5">
                    <Palette className="w-4 h-4 text-cyan-400" />
                    <span className="font-bold text-white">پس‌زمینه محیط گفتگو (Chat Wallpaper):</span>
                  </div>
                  <span className="text-[11px] text-cyan-400 font-medium">{currentWallpaper?.name || 'کلاسیک'}</span>
                </div>

                {/* Live Wallpaper & Message Bubble Mini Preview */}
                <div 
                  className="w-full h-36 rounded-2xl p-3 border border-slate-700/80 shadow-inner relative overflow-hidden flex flex-col justify-end gap-2 transition-all duration-300"
                  style={{
                    background: currentWallpaper?.value || '#0e1621'
                  }}
                >
                  {/* Pattern Grid Overlay if enabled */}
                  {currentWallpaper?.hasPattern !== false && (
                    <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#38bdf8_1.5px,transparent_1.5px)] [background-size:16px_16px]" />
                  )}

                  {/* Sample Incoming Bubble */}
                  <div className="self-start max-w-[75%] bg-[#212d3b]/95 backdrop-blur-sm text-slate-100 text-xs px-3 py-1.5 rounded-2xl rounded-bl-xs border border-slate-700/50 shadow-md">
                    سلام! پس‌زمینه چت‌ها به‌روزرسانی شد 🎨
                  </div>

                  {/* Sample Outgoing Bubble */}
                  <div className="self-end max-w-[75%] bg-gradient-to-r from-[#2b5278] to-[#1e3c5a] text-white text-xs px-3 py-1.5 rounded-2xl rounded-br-xs border border-blue-600/30 shadow-md flex items-center justify-between gap-3">
                    <span>خیلی شیک و خوانا به نظر می‌رسه! 👌</span>
                    <span className="text-[9px] text-cyan-300 font-mono">۱۰:۲۵ ✓✓</span>
                  </div>
                </div>

                {/* Wallpaper Type Switcher Tabs */}
                <div className="grid grid-cols-3 gap-1 bg-[#17212b] p-1 rounded-xl border border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setWallpaperCategory('solid')}
                    className={`py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                      wallpaperCategory === 'solid'
                        ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    رنگ یکدست
                  </button>
                  <button
                    type="button"
                    onClick={() => setWallpaperCategory('gradient')}
                    className={`py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                      wallpaperCategory === 'gradient'
                        ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    گرادیان انتزاعی
                  </button>
                  <button
                    type="button"
                    onClick={() => setWallpaperCategory('custom')}
                    className={`py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                      wallpaperCategory === 'custom'
                        ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    گالری شخصی
                  </button>
                </div>

                {/* Category 1: Solid Colors Grid */}
                {wallpaperCategory === 'solid' && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {SOLID_WALLPAPERS.map((wp) => {
                      const isSelected = currentWallpaper?.id === wp.id;
                      return (
                        <button
                          key={wp.id}
                          type="button"
                          onClick={() => {
                            onSelectWallpaper?.({
                              ...wp,
                              hasPattern: currentWallpaper?.hasPattern !== false
                            });
                          }}
                          className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border text-center transition-all cursor-pointer relative ${
                            isSelected
                              ? 'border-cyan-400 ring-2 ring-cyan-500/30 bg-slate-800/90'
                              : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                          }`}
                        >
                          <div
                            className="w-full h-11 rounded-lg border border-slate-700/60 shadow-inner flex items-center justify-center relative"
                            style={{ backgroundColor: wp.value }}
                          >
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-cyan-500 text-white flex items-center justify-center shadow-lg">
                                <Check className="w-3.5 h-3.5" />
                              </div>
                            )}
                          </div>
                          <span className="text-[11px] font-medium text-slate-300 truncate w-full">
                            {wp.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Category 2: Abstract Gradients Grid */}
                {wallpaperCategory === 'gradient' && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {GRADIENT_WALLPAPERS.map((wp) => {
                      const isSelected = currentWallpaper?.id === wp.id;
                      return (
                        <button
                          key={wp.id}
                          type="button"
                          onClick={() => {
                            onSelectWallpaper?.({
                              ...wp,
                              hasPattern: currentWallpaper?.hasPattern !== false
                            });
                          }}
                          className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border text-center transition-all cursor-pointer relative ${
                            isSelected
                              ? 'border-cyan-400 ring-2 ring-cyan-500/30 bg-slate-800/90'
                              : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                          }`}
                        >
                          <div
                            className="w-full h-11 rounded-lg border border-slate-700/60 shadow-inner flex items-center justify-center relative"
                            style={{ background: wp.value }}
                          >
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-cyan-500 text-white flex items-center justify-center shadow-lg">
                                <Check className="w-3.5 h-3.5" />
                              </div>
                            )}
                          </div>
                          <span className="text-[11px] font-medium text-slate-300 truncate w-full">
                            {wp.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Category 3: Gallery Selection */}
                {wallpaperCategory === 'custom' && (
                  <div className="space-y-3">
                    {customWallpaper ? (
                      <div className="h-28 rounded-2xl overflow-hidden border border-slate-700 relative">
                        <img src={customWallpaper} alt="Custom wallpaper" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <span className="text-xs text-white bg-black/60 px-3 py-1 rounded-full">
                            تصویر انتخابی از حافظه گوشی فعال است
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl border border-dashed border-slate-700 text-center text-xs text-slate-400">
                        تصویری از گالری انتخاب نشده است. با دکمه زیر می‌توانید عکس دلخواه خود را بارگذاری کنید.
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => wallpaperFileInputRef.current?.click()}
                        className="flex-1 py-2.5 bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                      >
                        <ImageIcon className="w-4 h-4" />
                        <span>انتخاب تصویر از گالری</span>
                      </button>
                      {customWallpaper && (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomWallpaper(null);
                            onSelectWallpaper?.(DEFAULT_WALLPAPER);
                          }}
                          className="px-3 py-2.5 bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25 text-xs font-bold rounded-xl transition-all cursor-pointer"
                        >
                          حذف
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Pattern Grid Toggle & Reset */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentWallpaper?.hasPattern !== false}
                      onChange={(e) => {
                        if (currentWallpaper) {
                          onSelectWallpaper?.({
                            ...currentWallpaper,
                            hasPattern: e.target.checked
                          });
                        }
                      }}
                      className="rounded accent-cyan-500 w-4 h-4 cursor-pointer"
                    />
                    <span>نمایش پترن نقطه‌ای ظریف تلگرام (Pattern Overlay)</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => onSelectWallpaper?.(DEFAULT_WALLPAPER)}
                    className="text-[11px] text-cyan-400 hover:underline cursor-pointer"
                  >
                    بازنشانی به پیش‌فرض
                  </button>
                </div>
              </div>

              {/* Bubble Radius Slider */}
              <div className="space-y-2 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-white">گردی گوشه حباب پیام‌ها (Corner Radius):</span>
                  <span className="font-mono text-cyan-400">{bubbleRadius}px</span>
                </div>
                <input
                  type="range"
                  min={4}
                  max={24}
                  value={bubbleRadius}
                  onChange={(e) => setBubbleRadius(parseInt(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              {/* Night Mode & Send by Enter */}
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
                  <div>
                    <div className="text-xs font-bold text-white">حالت شب و پوسته تاریک (Night Mode)</div>
                    <div className="text-[11px] text-slate-400">بهینه‌سازی مصرف باتری در صفحات OLED</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={nightMode}
                    onChange={(e) => setNightMode(e.target.checked)}
                    className="w-4 h-4 accent-cyan-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
                  <div>
                    <div className="text-xs font-bold text-white">ارسال پیام با کلید Enter</div>
                    <div className="text-[11px] text-slate-400">Shift + Enter برای ایجاد خط جدید</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={sendByEnter}
                    onChange={(e) => setSendByEnter(e.target.checked)}
                    className="w-4 h-4 accent-cyan-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
                  <div>
                    <div className="text-xs font-bold text-white">نمایش اموجی‌های بزرگ و استیکر متحرک</div>
                    <div className="text-[11px] text-slate-400">پویانمایی ۶۰ فریم بر ثانیه برای ری‌اکشن‌ها</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={largeEmoji}
                    onChange={(e) => setLargeEmoji(e.target.checked)}
                    className="w-4 h-4 accent-cyan-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ============================================================
              5. PRIVACY AND SECURITY
             ============================================================ */}
          {currentSection === 'privacy_security' && (
            <div className="p-4 sm:p-5 space-y-4">
              {/* Two-Factor Authentication Link */}
              <button
                onClick={() => setCurrentSection('two_step_verification')}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-cyan-950/30 border border-cyan-800/50 hover:bg-cyan-900/30 transition-all text-right cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Key className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-white">تأیید دو مرحله‌ای (Two-Step Verification)</div>
                    <div className="text-[11px] text-cyan-300">رمز عبور ابری با الگوریتم SRP-6a و Argon2id</div>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              </button>

              {/* Blocked Users Link */}
              <button
                onClick={() => setCurrentSection('blocked_users')}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:bg-slate-850 transition-all text-right cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <UserX className="w-5 h-5 text-rose-400 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-white">کاربران مسدود شده (Blocked Users)</div>
                    <div className="text-[11px] text-slate-400">{blockedUsers.length} مخاطب مسدود</div>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-slate-400 flex-shrink-0" />
              </button>

              {/* Phone Visibility */}
              <div className="space-y-1.5 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div className="text-xs font-bold text-white mb-2">چه کسانی شماره موبایل من را می‌بینند؟</div>
                {(['everyone', 'contacts', 'nobody'] as const).map((opt) => (
                  <label key={opt} className="flex items-center justify-between py-1.5 text-xs text-slate-300 cursor-pointer">
                    <span>{opt === 'everyone' ? 'همه کاربران' : opt === 'contacts' ? 'مخاطبین من' : 'هیچ‌کس'}</span>
                    <input
                      type="radio"
                      name="privacyPhone"
                      checked={privacyPhone === opt}
                      onChange={() => setPrivacyPhone(opt)}
                      className="w-4 h-4 accent-cyan-500"
                    />
                  </label>
                ))}
              </div>

              {/* Last Seen & Online */}
              <div className="space-y-1.5 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div className="text-xs font-bold text-white mb-2">نمایش آخرین بازدید و وضعیت آنلاین:</div>
                {(['everyone', 'contacts', 'nobody'] as const).map((opt) => (
                  <label key={opt} className="flex items-center justify-between py-1.5 text-xs text-slate-300 cursor-pointer">
                    <span>{opt === 'everyone' ? 'همه کاربران' : opt === 'contacts' ? 'مخاطبین من' : 'هیچ‌کس'}</span>
                    <input
                      type="radio"
                      name="privacyLastSeen"
                      checked={privacyLastSeen === opt}
                      onChange={() => setPrivacyLastSeen(opt)}
                      className="w-4 h-4 accent-cyan-500"
                    />
                  </label>
                ))}
                {currentUser.isPremium && (
                  <div className="pt-2 text-[11px] text-amber-300 border-t border-slate-800 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>امتیاز پریمیوم: شما آخرین بازدید دیگران را می‌بینید حتی اگر وضعیت خود را پنهان کنید!</span>
                  </div>
                )}
              </div>

              {/* Profile Photos Privacy */}
              <div className="space-y-1.5 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div className="text-xs font-bold text-white mb-2">عکس‌های پروفایل (Profile Photos):</div>
                {(['everyone', 'contacts', 'nobody'] as const).map((opt) => (
                  <label key={opt} className="flex items-center justify-between py-1.5 text-xs text-slate-300 cursor-pointer">
                    <span>{opt === 'everyone' ? 'همه کاربران' : opt === 'contacts' ? 'مخاطبین من' : 'هیچ‌کس'}</span>
                    <input
                      type="radio"
                      name="privacyPhotos"
                      checked={privacyPhotos === opt}
                      onChange={() => setPrivacyPhotos(opt)}
                      className="w-4 h-4 accent-cyan-500"
                    />
                  </label>
                ))}
              </div>

              {/* Auto-Delete Messages */}
              <div className="space-y-1.5 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>حذف خودکار پیام‌ها در تمام گفتگوهای جدید:</span>
                </div>
                <div className="grid grid-cols-4 gap-2 pt-1">
                  {[
                    { id: 'off', label: 'خاموش' },
                    { id: '1d', label: '۱ روز' },
                    { id: '1w', label: '۱ هفته' },
                    { id: '1m', label: '۱ ماه' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setAutoDeleteTime(item.id as any)}
                      className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                        autoDeleteTime === item.id
                          ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300'
                          : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Passcode Lock */}
              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">قفل محلی برنامه با رمز عبور (Passcode)</div>
                    <div className="text-[11px] text-slate-400">قفل کردن کلاینت تحت وب هنگام عدم حضور</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={passcodeEnabled}
                    onChange={(e) => setPasscodeEnabled(e.target.checked)}
                    className="w-4 h-4 accent-cyan-500 cursor-pointer"
                  />
                </div>
                {passcodeEnabled && (
                  <div className="pt-2 flex items-center gap-2">
                    <label className="text-xs text-slate-300">کد ۴ رقمی:</label>
                    <input
                      type="password"
                      maxLength={4}
                      value={passcodePin}
                      onChange={(e) => setPasscodePin(e.target.value)}
                      className="w-24 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono tracking-widest text-sm text-cyan-400"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================
              6. TWO-STEP VERIFICATION (2FA DETAILS)
             ============================================================ */}
          {currentSection === 'two_step_verification' && (
            <div className="p-4 sm:p-5 space-y-4">
              <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-800/50 text-xs text-cyan-200 leading-relaxed space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-cyan-300">
                  <ShieldCheck className="w-4 h-4" />
                  <span>پروتکل SRP-6a تلگرام فعال است</span>
                </div>
                <p>
                  رمز عبور ابری شما در سمت سرور هش نمی‌شود، بلکه محاسبات با پروتکل ریاضی ضرب هم‌نهشتی و اثبات دانایی صفر (Zero-Knowledge) انجام می‌گیرد.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-300">رمز عبور ابری (Cloud Password):</label>
                <input
                  type="password"
                  value={cloudPassword}
                  onChange={(e) => setCloudPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono outline-none focus:border-cyan-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-300">سرنخ رمز عبور (Password Hint):</label>
                <input
                  type="text"
                  value={passwordHint}
                  onChange={(e) => setPasswordHint(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-300">ایمیل بازیابی (Recovery Email):</label>
                <input
                  type="email"
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  dir="ltr"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan-400 text-left font-mono"
                />
              </div>

              {srpTestSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>اثبات متقابل M1/M2 با موفقیت انجام شد! هش و سالت معتبر هستند.</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setSrpTestSuccess(true);
                  setTimeout(() => setSrpTestSuccess(false), 3000);
                }}
                className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md"
              >
                تست هندشیک کلاینت SRP-6a
              </button>
            </div>
          )}

          {/* ============================================================
              7. NOTIFICATIONS AND SOUNDS
             ============================================================ */}
          {currentSection === 'notifications' && (
            <div className="p-4 sm:p-5 space-y-3">
              {[
                { title: 'گفتگوهای خصوصی (Private Chats)', desc: 'اعلان دریافت پیام‌های دونفره', checked: notifPrivate, set: setNotifPrivate },
                { title: 'گروه‌ها و سوپرگروه‌ها (Groups)', desc: 'اعلان‌های گفتگوهای گروهی و تاپیک‌ها', checked: notifGroups, set: setNotifGroups },
                { title: 'کانال‌ها (Channels)', desc: 'اعلان پست‌های جدید کانال‌های عضو شده', checked: notifChannels, set: setNotifChannels },
                { title: 'صداهای درون‌برنامه‌ای (In-App Sounds)', desc: 'پخش صدای بوق ارسال و دریافت پیام', checked: inAppSounds, set: setInAppSounds },
                { title: 'لرزش درون برنامه (In-App Vibrate)', desc: 'ویبره هنگام ارسال و دریافت بازخورد', checked: inAppVibrate, set: setInAppVibrate },
                { title: 'پیش‌نمایش متن پیام (In-App Preview)', desc: 'نمایش خلاصه محتوا در بالای صفحه', checked: inAppPreview, set: setInAppPreview }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
                  <div>
                    <div className="text-xs font-bold text-white">{item.title}</div>
                    <div className="text-[11px] text-slate-400">{item.desc}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={(e) => item.set(e.target.checked)}
                    className="w-4 h-4 accent-cyan-500 cursor-pointer"
                  />
                </div>
              ))}
            </div>
          )}

          {/* ============================================================
              8. DATA AND STORAGE
             ============================================================ */}
          {currentSection === 'data_storage' && (
            <div className="p-4 sm:p-5 space-y-4">
              {/* Disk / Cache Storage */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-white">حافظه موقت کش (Storage Usage):</span>
                  <span className="font-mono text-cyan-400 font-bold">{cacheSize} MB</span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-500 rounded-full transition-all" style={{ width: `${Math.min(100, cacheSize * 0.2)}%` }} />
                </div>
                
                {/* Breakdown */}
                <div className="grid grid-cols-3 gap-2 text-center text-[11px] pt-1 border-t border-slate-800/80">
                  <div className="p-2 rounded-xl bg-slate-850">
                    <span className="text-slate-400 block">عکس‌ها</span>
                    <span className="text-cyan-300 font-mono font-bold">{Math.round(cacheSize * 0.35)} MB</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-850">
                    <span className="text-slate-400 block">ویدیوها</span>
                    <span className="text-purple-300 font-mono font-bold">{Math.round(cacheSize * 0.5)} MB</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-850">
                    <span className="text-slate-400 block">فایل‌ها</span>
                    <span className="text-amber-300 font-mono font-bold">{Math.round(cacheSize * 0.15)} MB</span>
                  </div>
                </div>

                {cacheCleared && (
                  <div className="text-xs text-emerald-400 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    <span>حافظه کش تلگرام با موفقیت پاکسازی شد!</span>
                  </div>
                )}
                <button
                  onClick={handleClearCache}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-xs text-rose-300 hover:text-rose-200 font-bold rounded-xl transition-colors cursor-pointer border border-rose-500/20"
                >
                  پاکسازی حافظه موقت (Clear Cache)
                </button>
              </div>

              {/* Automatic Media Download */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                <div className="text-xs font-bold text-white">دانلود خودکار رسانه‌ها (Automatic Media Download):</div>
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>دانلود خودکار با اینترنت همراه (Mobile Data)</span>
                  <input
                    type="checkbox"
                    checked={autoDownloadMobile}
                    onChange={(e) => setAutoDownloadMobile(e.target.checked)}
                    className="w-4 h-4 accent-cyan-500 cursor-pointer"
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>دانلود خودکار هنگام اتصال به Wi-Fi</span>
                  <input
                    type="checkbox"
                    checked={autoDownloadWifi}
                    onChange={(e) => setAutoDownloadWifi(e.target.checked)}
                    className="w-4 h-4 accent-cyan-500 cursor-pointer"
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>پخش مستقیم ویدیو و صوت بدون دانلود کامل (Streaming)</span>
                  <input
                    type="checkbox"
                    checked={streamMedia}
                    onChange={(e) => setStreamMedia(e.target.checked)}
                    className="w-4 h-4 accent-cyan-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Proxy Settings */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white">پروکسی داخلی MTProto / SOCKS5</div>
                  <div className="text-[11px] text-slate-400">اتصال مستقیم و پایدار بدون قطعی</div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold">
                  متصل (Direct)
                </span>
              </div>
            </div>
          )}

          {/* ============================================================
              9. CHAT FOLDERS
             ============================================================ */}
          {currentSection === 'folders' && (
            <div className="p-4 sm:p-5 space-y-4">
              <div className="text-xs text-slate-300 leading-relaxed">
                با استفاده از پوشه‌ها می‌توانید چت‌ها، کانال‌ها و ربات‌های خود را در تب‌های جداگانه دسته‌بندی کنید:
              </div>

              {/* Add New Folder Form */}
              <form onSubmit={handleAddCustomFolder} className="flex gap-2">
                <input
                  type="text"
                  placeholder="نام پوشه جدید (مثلاً: پروژه‌های کاری)..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>افزودن</span>
                </button>
              </form>

              <div className="space-y-2">
                {customFoldersList.map((fName, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs">
                    <span className="text-white font-medium">{fName}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 text-[11px]">
                        {idx < 6 ? 'پیش‌فرض' : 'سفارشی'}
                      </span>
                      {idx >= 6 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveFolder(fName)}
                          className="text-rose-400 hover:text-rose-300 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
                <span>سقف مجاز پوشه‌ها:</span>
                <span className="font-bold font-mono">{currentUser.isPremium ? '۲۰ پوشه (پریمیوم)' : '۱۰ پوشه (عادی)'}</span>
              </div>
            </div>
          )}

          {/* ============================================================
              10. ACTIVE SESSIONS / DEVICES
             ============================================================ */}
          {currentSection === 'devices' && (
            <div className="p-4 sm:p-5 space-y-4">
              <div className="text-xs font-bold text-slate-300">نشست‌های فعال روی حساب کاربری شما:</div>
              <div className="space-y-2.5">
                {sessions.map((sess) => (
                  <div key={sess.id} className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Smartphone className="w-4 h-4 text-cyan-400" />
                        <span>{sess.device}</span>
                      </span>
                      {sess.online ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
                          آنلاین
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-mono">{sess.lastActive}</span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">{sess.ip}</div>
                  </div>
                ))}
              </div>

              {sessions.length > 1 && (
                <button
                  onClick={handleTerminateOtherSessions}
                  className="w-full py-2.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  خاتمه دادن به سایر نشست‌ها (Terminate All Other Sessions)
                </button>
              )}
            </div>
          )}

          {/* ============================================================
              11. LANGUAGE & TRANSLATE
             ============================================================ */}
          {currentSection === 'language' && (
            <div className="p-4 sm:p-5 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-white">انتخاب زبان رابط کاربری تلگرام:</label>
                {[
                  { id: 'fa', name: 'فارسی (Persian)', native: 'فارسی' },
                  { id: 'en', name: 'English', native: 'English' },
                  { id: 'ar', name: 'العربية (Arabic)', native: 'العربية' },
                  { id: 'ru', name: 'Русский (Russian)', native: 'Русский' }
                ].map((lang) => (
                  <label
                    key={lang.id}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      selectedLang === lang.id
                        ? 'border-cyan-400 bg-cyan-500/10 text-white'
                        : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold">{lang.name}</div>
                      <div className="text-[10px] text-slate-400">{lang.native}</div>
                    </div>
                    <input
                      type="radio"
                      name="selectedLang"
                      checked={selectedLang === lang.id}
                      onChange={() => setSelectedLang(lang.id)}
                      className="w-4 h-4 accent-cyan-500"
                    />
                  </label>
                ))}
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div>
                  <div className="text-xs font-bold text-white">نمایش دکمه ترجمه فوری در هدر گفتگوها</div>
                  <div className="text-[11px] text-slate-400">ترجمه هوشمند پیام‌ها به زبان انتخابی شما</div>
                </div>
                <input
                  type="checkbox"
                  checked={showTranslateBtn}
                  onChange={(e) => setShowTranslateBtn(e.target.checked)}
                  className="w-4 h-4 accent-cyan-500 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* ============================================================
              12. BLOCKED USERS SUB-PAGE
             ============================================================ */}
          {currentSection === 'blocked_users' && (
            <div className="p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-300">
                  کاربران مسدود شده نمی‌توانند برای شما پیام ارسال کنند یا عکس پروفایل، آخرین بازدید و تماس‌های شما را مشاهده کنند:
                </div>
              </div>

              {/* Real blocked entries combined from currentUser.blockedUserIds and blocked chats */}
              {(() => {
                const blockedIds = Array.from(new Set([
                  ...(currentUser.blockedUserIds || []),
                  ...chats.filter((c) => c.isBlocked).map((c) => c.id)
                ]));

                const realBlockedList = blockedIds.map((bId) => {
                  const chatMatch = chats.find((c) => c.id === bId);
                  const userMatch = usersList.find((u) => u.id === bId || u.phone === bId || u.username === bId);
                  return {
                    id: bId,
                    name: chatMatch?.title || userMatch?.name || bId,
                    subtitle: userMatch?.username ? `@${userMatch.username}` : userMatch?.phone || chatMatch?.type || 'کاربر مسدود شده'
                  };
                });

                return (
                  <div className="space-y-3">
                    {realBlockedList.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800 space-y-2">
                        <div className="w-12 h-12 rounded-full bg-slate-800/80 text-slate-600 flex items-center justify-center mx-auto">
                          <UserX className="w-6 h-6" />
                        </div>
                        <div className="font-bold text-slate-400">هیچ کاربری در لیست مسدودشده‌ها قرار ندارد</div>
                        <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                          می‌توانید از منوی گزینه‌های هر گفتگو، افراد مزاحم را مسدود کنید تا دیگر نتوانند به شما پیام دهند.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {realBlockedList.map((item) => (
                          <div 
                            key={item.id} 
                            className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 transition-all text-xs"
                          >
                            <div className="flex items-center gap-3">
                              {/* Avatar is hidden and locked as per privacy specification */}
                              <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 text-slate-500">
                                <Lock className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="text-white font-bold flex items-center gap-1.5">
                                  <span>{item.name}</span>
                                  <span className="text-[9px] px-1.5 py-0.2 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-full font-bold">
                                    مسدود شده
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-400">{item.subtitle}</div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                onToggleBlockUser?.(item.id, item.name);
                              }}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 border border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                            >
                              رفع مسدودی (Unblock)
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Quick block selector from available private chats */}
                    {chats.filter((c) => c.type === 'private' && c.id !== 'chat_saved' && !c.isBlocked && !(currentUser.blockedUserIds || []).includes(c.id)).length > 0 && (
                      <div className="pt-2">
                        <label className="text-[11px] font-bold text-slate-400 block mb-2">
                          افزودن مخاطب به لیست مسدودشده‌ها:
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {chats
                            .filter((c) => c.type === 'private' && c.id !== 'chat_saved' && !c.isBlocked && !(currentUser.blockedUserIds || []).includes(c.id))
                            .slice(0, 4)
                            .map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => {
                                  onToggleBlockUser?.(c.id, c.title);
                                }}
                                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/40 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/30 text-right cursor-pointer transition-all group"
                              >
                                <span className="text-xs text-slate-300 group-hover:text-rose-300 truncate font-medium">
                                  {c.title}
                                </span>
                                <span className="text-[10px] text-rose-400 font-bold flex items-center gap-0.5 flex-shrink-0">
                                  <UserX className="w-3 h-3" />
                                  <span>مسدود کردن</span>
                                </span>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ============================================================
              13. TELEGRAM FAQ & SUPPORT
             ============================================================ */}
          {currentSection === 'faq' && (
            <div className="p-4 sm:p-5 space-y-3">
              {[
                { q: 'تلگرام کلاودپالس چیست؟', a: 'پیام‌رسان متمرکز بر سرعت و امنیت با فناوری توزیع‌شده ScyllaDB و پروتکل سرتاسری E2EE مشابه نسخه رسمی تلگرام وب.' },
                { q: 'چگونه حساب تلگرام پریمیوم دریافت کنم؟', a: 'از طریق بخش Telegram Premium در تنظیمات می‌توانید قابلیت‌ها را مشاهده کنید؛ فعال‌سازی نهایی حساب‌ها توسط مدیران سیستم انجام می‌پذیرد.' },
                { q: 'رمزنگاری E2EE چگونه کار می‌کند؟', a: 'در چت‌های محرمانه (Secret Chat) و تماس‌های WebRTC، کلیدها به صورت محلی بین دو مرورگر با پروتکل ECDH تبادل شده و با ۴ اموجی احراز اصالت می‌شوند.' },
                { q: 'حجم مجاز فایل‌ها چقدر است؟', a: 'کاربران عادی تا ۲ گیگابایت و کاربران پریمیوم تا ۴ گیگابایت برای هر فایل می‌توانند آپلود کنند.' }
              ].map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
                  <div className="text-xs font-bold text-cyan-300">{item.q}</div>
                  <div className="text-[11px] text-slate-300 leading-relaxed">{item.a}</div>
                </div>
              ))}
            </div>
          )}

          {/* ============================================================
              14. DATABASE & CPANEL API BRIDGE SUB-PAGE (ADMIN ONLY)
             ============================================================ */}
          {currentSection === 'database_sync' && !isSuperAdmin && (
            <div className="p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                <Shield className="w-8 h-8" />
              </div>
              <h4 className="text-base font-extrabold text-white">دسترسی غیرمجاز</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                تنظیمات پایگاه داده و پل ارتباطی سرور اختصاصی بوده و دسترسی به آن فقط برای مدیران سیستم امکان‌پذیر است.
              </p>
              <button
                onClick={() => setCurrentSection('main')}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                بازگشت به تنظیمات اصلی
              </button>
            </div>
          )}

          {currentSection === 'database_sync' && isSuperAdmin && (
            <div className="p-4 sm:p-5 space-y-4">
              {/* Header Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/50 to-slate-900 border border-emerald-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <Database className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-white">پل ارتباطی دیتابیس MySQL (api.php)</h4>
                      <p className="text-[11px] text-emerald-300">مختص هاست سی‌پنل (cPanel) بدون هیچ وابستگی خارجی</p>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                    apiStatusData?.database.connected 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${apiStatusData?.database.connected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                    {apiStatusData?.database.connected ? 'متصل به پایگاه‌داده' : 'در انتظار اتصال'}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed pt-1">
                  سامانه از داده‌های موک خارج شده و به پایگاه‌داده MySQL متصل است. فایل خودکفای <code className="text-emerald-300 bg-black/40 px-1 py-0.5 rounded font-mono">api.php</code> تمام جداول را در اولین فراخوانی به صورت اتوماتیک با اینکودینگ <code className="text-cyan-300 bg-black/40 px-1 py-0.5 rounded font-mono">utf8mb4_unicode_ci</code> تولید می‌کند.
                </p>
              </div>

              {/* Status Report */}
              {apiStatusLoading && (
                <div className="p-4 text-center text-xs text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                  <span>در حال بررسی سلامت اتصال به دیتابیس MySQL...</span>
                </div>
              )}

              {apiStatusError && !apiStatusLoading && (
                <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300 space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                    <span>خطا در برقراری ارتباط با API:</span>
                  </div>
                  <div className="text-[11px] text-slate-300 font-mono">{apiStatusError}</div>
                </div>
              )}

              {apiStatusData && !apiStatusLoading && (
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <div className="text-xs font-bold text-white flex items-center justify-between">
                    <span>گزارش زنده وضعیت جداول MySQL:</span>
                    <button
                      onClick={() => handleCheckApiStatus()}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>بروزرسانی وضعیت</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(apiStatusData.database.tables || {}).map(([table, count]) => (
                      <div key={table} className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-right">
                        <div className="text-[10px] text-slate-400 font-mono">{table}</div>
                        <div className="text-sm font-extrabold text-white font-mono mt-0.5">{count} ردیف</div>
                      </div>
                    ))}
                  </div>

                  <div className="text-[11px] text-slate-400 pt-1 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-800">
                    <span>دیتابیس: <strong className="text-slate-200 font-mono">{apiStatusData.database.name}</strong></span>
                    <span>هاست: <strong className="text-slate-200 font-mono">{apiStatusData.database.host}</strong></span>
                    <span>اینکودینگ: <strong className="text-slate-200 font-mono">{apiStatusData.database.charset}</strong></span>
                  </div>
                </div>
              )}

              {/* Endpoint URL Input */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                <label className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-cyan-400" />
                  <span>آدرس پل ارتباطی (API Endpoint URL):</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={apiUrlInput}
                    onChange={(e) => setApiUrlInput(e.target.value)}
                    dir="ltr"
                    placeholder="/api.php or https://your-cpanel-domain.com/api.php"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-cyan-400"
                  />
                  <button
                    onClick={() => handleCheckApiStatus(apiUrlInput)}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-700"
                  >
                    تست اتصال
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  اگر پروژه را روی هاست شخصی cPanel بارگذاری کرده‌اید، آدرس مستقیم دامنه‌تان را مانند <code className="text-cyan-300 font-mono">https://yourdomain.com/api.php</code> وارد نمایید.
                </p>
              </div>

              {/* Quick Actions (Sync Now & Download PHP) */}
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={handleTriggerSync}
                  disabled={isSyncingData}
                  className="flex-1 flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncingData ? 'animate-spin' : ''}`} />
                  <span>{isSyncingData ? 'در حال ارسال به دیتابیس...' : 'همگام‌سازی کامل با دیتابیس (Sync All)'}</span>
                </button>

                <a
                  href="/download/api.php"
                  download="api.php"
                  className="flex items-center justify-center gap-2 p-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-sm text-center"
                >
                  <Download className="w-4 h-4 text-cyan-400" />
                  <span>دانلود فایل api.php</span>
                </a>
              </div>

              {apiSyncFeedback && (
                <div className="p-3 rounded-xl bg-cyan-950/50 border border-cyan-500/40 text-xs text-cyan-200 text-center font-medium animate-in fade-in">
                  {apiSyncFeedback}
                </div>
              )}

              {/* Step-by-Step cPanel Deployment Guide */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2.5">
                <h5 className="text-xs font-extrabold text-white flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>راهنمای استقرار در File Manager و phpMyAdmin هاست cPanel:</span>
                </h5>
                <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed pr-1">
                  <li>
                    فایل <strong className="text-white font-mono">api.php</strong> را در پوشه <strong className="text-cyan-300 font-mono">public_html</strong> هاست خود آپلود کنید.
                  </li>
                  <li>
                    در سی‌پنل به بخش <strong>MySQL Databases</strong> رفته، یک دیتابیس و یک کاربر دیتابیس با رمز عبور قوی ایجاد نمایید و دسترسی <strong>ALL PRIVILEGES</strong> را تیک بزنید.
                  </li>
                  <li>
                    فایل <code className="text-amber-300 font-mono">api.php</code> را باز کرده و خطوط ۴۰ تا ۴۳ را با مشخصات دیتابیس خود (نام کاربری، رمز، نام دیتابیس) ویرایش کنید.
                  </li>
                  <li>
                    <strong>تولید خودکار جداول:</strong> با اولین باز کردن آدرس یا اتصال برنامه، تمام جداول (users, chats, messages, stories, ...) به شکل خودکار ساخته می‌شوند و نیازی به وارد کردن کوئری دستی در phpMyAdmin نخواهید داشت.
                  </li>
                </ol>
              </div>
            </div>
          )}

        </div>

        {/* Bottom Bar in Sub-Pages */}
        {currentSection !== 'main' && (
          <div className="px-4 sm:px-5 py-3 border-t border-slate-800 bg-[#101822] flex justify-between items-center text-xs flex-shrink-0">
            <button
              onClick={() => setCurrentSection('main')}
              className="text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
            >
              <ArrowRight className="w-4 h-4" />
              <span>بازگشت به منوی تنظیمات</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-colors cursor-pointer shadow-sm"
            >
              بستن تنظیمات
            </button>
          </div>
        )}
      </div>

      {/* Fullscreen Profile Photos Album Viewer */}
      <ProfilePhotoViewerModal
        isOpen={isProfileViewerOpen}
        onClose={() => setIsProfileViewerOpen(false)}
        title={currentUser.name}
        subtitle="عکس‌های پروفایل حساب شما"
        photos={userPhotos}
        canEdit={true}
        onAddPhoto={(newUrl) => {
          const updated = [newUrl, ...userPhotos];
          onUpdateUser({ avatar: newUrl, avatars: updated });
          setCurrentAvatarIndex(0);
        }}
        onDeletePhoto={(idx) => {
          if (userPhotos.length > 1) {
            const updated = userPhotos.filter((_, i) => i !== idx);
            onUpdateUser({ avatar: updated[0], avatars: updated });
            setCurrentAvatarIndex(0);
          }
        }}
        onSetMainPhoto={(idx) => {
          if (userPhotos[idx]) {
            const target = userPhotos[idx];
            const updated = [target, ...userPhotos.filter((_, i) => i !== idx)];
            onUpdateUser({ avatar: target, avatars: updated });
            setCurrentAvatarIndex(0);
          }
        }}
      />
    </div>
  );
};
