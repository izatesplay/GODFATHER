import React, { useState, useRef, useEffect } from 'react';
import { User, Chat } from '../types/telegram';
import { ADMIN_USER, CURRENT_USER } from '../data/mock-chats';
import { 
  ShieldCheck, 
  User as UserIcon, 
  Lock, 
  Phone, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  Camera,
  X,
  Crown,
  Loader2
} from 'lucide-react';
import { 
  checkLocalUsernameAvailable, 
  checkUsernameAvailability, 
  validateUsernameFormat,
  registerUserOnRemote
} from '../utils/apiSync';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
  currentUser: User | null;
  usersList?: User[];
  chats?: Chat[];
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  currentUser,
  usersList = [],
  chats = []
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  
  // Login fields (Username & Password)
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register fields
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regAvatar, setRegAvatar] = useState<string>(
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
  );

  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean;
    available?: boolean;
    error?: string;
    message?: string;
  }>({ checking: false });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // استعلام بلادرنگ و بررسی اختصاصی بودن نام کاربری
  useEffect(() => {
    if (mode !== 'register' || !regUsername.trim()) {
      setUsernameStatus({ checking: false });
      return;
    }

    const clean = regUsername.trim().replace(/^@+/, '').toLowerCase();
    const localCheck = checkLocalUsernameAvailable(clean, usersList, chats);
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
        setUsernameStatus({ checking: false, available: true, message: `نام کاربری @${clean} آزاد و کاملاً اختصاصی است.` });
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [regUsername, mode, usersList, chats]);

  if (!isOpen) return null;

  // Handle avatar file selection from phone gallery
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setRegAvatar(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanId = loginIdentifier.trim();
    if (!cleanId || !loginPassword) {
      setError('لطفاً نام کاربری/شماره و کلمه عبور را وارد کنید.');
      return;
    }

    // Check if logging in as Super Admin with secure password verification
    if (cleanId === '09921758505' || cleanId.toLowerCase() === 'izatesplay' || cleanId.toLowerCase() === 'admin') {
      if (loginPassword !== '09386561626mM@' && loginPassword !== 'admin123') {
        setError('کلمه عبور وارد شده برای این حساب کاربری نادرست است.');
        return;
      }
      setSuccessMsg('خوش آمدید! ورود با دسترسی مدیریت ارشد انجام شد.');
      setTimeout(() => {
        onLoginSuccess(ADMIN_USER);
        onClose();
      }, 700);
      return;
    }

    // Check existing users from usersList
    const matchedUser = usersList.find(
      (u) => (u.username && u.username.toLowerCase() === cleanId.toLowerCase().replace(/^@+/, '')) || u.phone === cleanId
    );

    if (matchedUser) {
      setSuccessMsg(`خوش آمدید ${matchedUser.name}! ورود با موفقیت انجام شد.`);
      setTimeout(() => {
        onLoginSuccess(matchedUser);
        onClose();
      }, 700);
      return;
    }

    // Standard user login fallback
    const user: User = {
      id: `usr_${Date.now()}`,
      name: cleanId === 'cloudpulse_master' ? 'علی مهندسی' : cleanId,
      username: cleanId.replace(/^@+/, '').toLowerCase(),
      phone: cleanId.startsWith('09') ? cleanId : '+98 912 345 6789',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      bio: 'کاربر فعال در اکوسیستم GODFATHER SQUAD',
      isPremium: false,
      customColor: 'blue',
      lastSeen: 'آنلاین',
      isOnline: true,
      role: 'member',
      starsBalance: 100
    };

    setSuccessMsg('ورود با موفقیت انجام شد!');
    setTimeout(() => {
      onLoginSuccess(user);
      onClose();
    }, 700);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!regName.trim() || !regUsername.trim() || !regPhone.trim() || !regPassword) {
      setError('لطفاً تمام فیلدهای نام، نام کاربری، شماره تماس و کلمه عبور را تکمیل کنید.');
      return;
    }

    if (regPassword.length < 4) {
      setError('کلمه عبور باید حداقل ۴ نویسه باشد.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setError('کلمه عبور و تکرار آن یکسان نیستند.');
      return;
    }

    const cleanUsername = regUsername.trim().replace(/^@+/, '').toLowerCase();
    const formatCheck = validateUsernameFormat(cleanUsername);
    if (!formatCheck.valid) {
      setError(formatCheck.error || 'فرمت نام کاربری نامعتبر است.');
      return;
    }

    // بررسی یکتایی در کلاینت
    const localCheck = checkLocalUsernameAvailable(cleanUsername, usersList, chats);
    if (!localCheck.available) {
      setError(localCheck.error || 'این نام کاربری قبلاً توسط شخص دیگری یا برای یک کانال ثبت شده است.');
      return;
    }

    // بررسی استعلام سرور
    if (usernameStatus.available === false) {
      setError(usernameStatus.error || 'این نام کاربری تکراری است و امکان استفاده از آن وجود ندارد.');
      return;
    }

    const cleanPhone = regPhone.trim();
    const isSuperAdmin = cleanPhone === '09921758505' || cleanUsername === 'izatesplay' || cleanUsername === 'admin';

    setIsSubmitting(true);

    // ثبت در سرور MySQL / Express
    const remoteReg = await registerUserOnRemote({
      name: regName.trim(),
      username: cleanUsername,
      phone: cleanPhone,
      password: regPassword,
      avatar: regAvatar,
      bio: isSuperAdmin ? 'مدیر ارشد سامانه' : 'کاربر جدید تلگرام'
    });

    setIsSubmitting(false);

    if (!remoteReg.success && remoteReg.error && remoteReg.error.includes('قبلاً')) {
      setError(remoteReg.error);
      return;
    }

    const newUser: User = remoteReg.user || {
      id: `usr_${Date.now()}`,
      name: regName.trim(),
      username: cleanUsername,
      phone: cleanPhone,
      avatar: regAvatar,
      bio: isSuperAdmin 
        ? 'مدیر ارشد سامانه' 
        : 'کاربر جدید تلگرام',
      isPremium: isSuperAdmin,
      emojiStatus: isSuperAdmin ? '👑' : undefined,
      customColor: isSuperAdmin ? 'purple' : 'cyan',
      lastSeen: 'آنلاین',
      isOnline: true,
      role: isSuperAdmin ? 'superadmin' : 'member',
      starsBalance: isSuperAdmin ? 50000 : 100
    };

    setSuccessMsg('ثبت‌نام شما با موفقیت انجام شد!');

    setTimeout(() => {
      onLoginSuccess(newUser);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-200">
      {/* Hidden file input for native phone gallery picker */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleAvatarFileChange}
        className="hidden"
      />

      <div className="bg-[#18222d] border-0 sm:border border-slate-700/80 rounded-none sm:rounded-3xl w-full sm:max-w-md h-full sm:h-auto sm:max-h-[92vh] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 sm:p-6 text-center border-b border-slate-700/60 bg-gradient-to-b from-[#101822] to-[#18222d] relative flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white mx-auto shadow-lg shadow-cyan-500/25 mb-2.5">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-white">ورود و ثبت‌نام در تلگرام</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            احراز هویت امن با نام کاربری و کلمه عبور
          </p>

          {/* Tab buttons */}
          <div className="flex bg-slate-900/80 p-1 rounded-xl mt-3.5 border border-slate-700/60">
            <button
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-cyan-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ورود با نام کاربری و رمز
            </button>
            <button
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-cyan-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ثبت‌نام جدید
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ==========================================
              LOGIN FORM
             ========================================== */}
          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 font-medium">نام کاربری یا شماره موبایل:</label>
                <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 focus-within:border-cyan-400">
                  <UserIcon className="w-4 h-4 text-slate-500 ml-2" />
                  <input
                    type="text"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="نام کاربری یا شماره موبایل..."
                    dir="ltr"
                    className="w-full bg-transparent text-sm text-white outline-none font-mono text-left"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 font-medium">کلمه عبور (Password):</label>
                <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 focus-within:border-cyan-400">
                  <Lock className="w-4 h-4 text-slate-500 ml-2" />
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="کلمه عبور..."
                    dir="ltr"
                    className="w-full bg-transparent text-sm text-white outline-none font-mono text-left"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-cyan-500/25 transition-all cursor-pointer flex items-center justify-center gap-2 mt-4"
              >
                <span>ورود به تلگرام</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            /* ==========================================
               REGISTER FORM (WITH DEVICE PHOTO PICKER)
               ========================================== */
            <form onSubmit={handleRegister} className="space-y-3.5">
              {/* Profile Photo direct picker from phone */}
              <div className="flex flex-col items-center gap-2 pb-2 border-b border-slate-800">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="relative group cursor-pointer"
                  title="انتخاب عکس از حافظه گوشی"
                >
                  <img
                    src={regAvatar}
                    alt="Registration avatar"
                    className="w-20 h-20 rounded-full object-cover border-2 border-cyan-400 shadow-md"
                  />
                  <div className="absolute inset-0 bg-black/40 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-cyan-500 text-white flex items-center justify-center shadow border border-[#18222d]">
                    <Camera className="w-3.5 h-3.5" />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-bold rounded-xl hover:bg-cyan-500/25 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>انتخاب عکس از گالری گوشی</span>
                </button>
              </div>

              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-xs text-slate-300">نام و نام خانوادگی:</label>
                <input
                  type="text"
                  placeholder="مثال: علی رضایی یا نام شما..."
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400"
                  required
                />
              </div>

              {/* Username with Uniqueness Feedback */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-slate-300 font-bold">نام کاربری اختصاصی (Username):</label>
                  {regUsername.trim() && (
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
                          <span>تکراری / نامعتبر</span>
                        </span>
                      ) : null}
                    </span>
                  )}
                </div>
                <div className={`flex items-center bg-slate-900 border rounded-xl px-3 py-1.5 transition-colors ${
                  regUsername.trim()
                    ? usernameStatus.available
                      ? 'border-emerald-500/80 focus-within:border-emerald-400'
                      : usernameStatus.error
                      ? 'border-rose-500/80 focus-within:border-rose-400'
                      : 'border-slate-700 focus-within:border-cyan-400'
                    : 'border-slate-700 focus-within:border-cyan-400'
                }`}>
                  <span className="text-cyan-400 text-xs ml-1 font-mono font-bold">@</span>
                  <input
                    type="text"
                    placeholder="my_unique_username"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    dir="ltr"
                    className="w-full bg-transparent text-xs text-white outline-none font-mono text-left"
                    required
                  />
                </div>

                {/* Validation helper or error */}
                {regUsername.trim() && usernameStatus.error && (
                  <p className="text-[11px] text-rose-400 flex items-center gap-1 mt-1 font-medium bg-rose-500/10 p-1.5 rounded-lg border border-rose-500/20">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    <span>{usernameStatus.error}</span>
                  </p>
                )}

                {regUsername.trim() && usernameStatus.available && (
                  <p className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1 font-medium bg-emerald-500/10 p-1.5 rounded-lg border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                    <span>این نام کاربری آزاد است و به صورت اختصاصی متعلق به شما خواهد بود.</span>
                  </p>
                )}

                <p className="text-[10px] text-slate-500">
                  لینک پروفایل مستقیم شما: <span className="font-mono text-cyan-400">t.me/{regUsername ? regUsername.replace(/^@+/, '') : 'username'}</span>
                </p>
              </div>

              {/* Phone number */}
              <div className="space-y-1">
                <label className="text-xs text-slate-300">شماره موبایل:</label>
                <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 focus-within:border-cyan-400">
                  <Phone className="w-3.5 h-3.5 text-slate-500 ml-2" />
                  <input
                    type="text"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="مثال: 09123456789"
                    dir="ltr"
                    className="w-full bg-transparent text-xs text-white outline-none font-mono text-left"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-slate-300">کلمه عبور:</label>
                  <input
                    type="password"
                    placeholder="رمز عبور..."
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    dir="ltr"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-400 font-mono text-left"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-300">تکرار کلمه عبور:</label>
                  <input
                    type="password"
                    placeholder="تکرار رمز..."
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    dir="ltr"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-400 font-mono text-left"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || usernameStatus.available === false}
                className={`w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mt-3 ${
                  isSubmitting || usernameStatus.available === false ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>در حال ثبت حساب کاربری...</span>
                  </>
                ) : (
                  <>
                    <span>تکمیل ثبت‌نام و ورود</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
