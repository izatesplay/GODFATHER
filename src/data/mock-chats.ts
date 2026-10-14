import { Chat, Message, Story, MiniApp, User, Contact, ChatFolder } from '../types/telegram';

// کاربر پیش‌فرض سیستم با دسترسی مدیریت ارشد کل (مطابق شماره درخواستی 09921758505)
export const ADMIN_USER: User = {
  id: 'usr_admin_09921758505',
  name: 'مدیر ارشد سامانه (Super Admin)',
  username: 'izatesplay',
  phone: '09921758505',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  bio: '',
  isPremium: true,
  emojiStatus: '👑',
  customColor: 'purple',
  lastSeen: 'آخرین بازدید اخیراً',
  isOnline: false,
  role: 'superadmin',
  starsBalance: 50000,
  password: '09386561626mM@'
};

export const CURRENT_USER: User = ADMIN_USER;

// لیست اولیه کاربران سیستم (شامل مدیر ارشد برای مدیریت)
export const INITIAL_SYSTEM_USERS: User[] = [
  ADMIN_USER
];

// لیست اولیه مخاطبین (خالی در حالت نهایی تا کاربر مخاطبین واقعی خود را بیفزاید)
export const INITIAL_CONTACTS: Contact[] = [];

// گفتگوهای واقعی سامانه (بدون گروه یا داده‌های فیک)
export const INITIAL_CHATS: Chat[] = [
  {
    id: 'chat_saved',
    type: 'private',
    title: 'پیام‌های ذخیره شده (Saved Messages)',
    avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
    unreadCount: 0,
    isPinned: false,
    isMuted: false,
    description: 'فضای ابری نامحدود شما در تلگرام برای نگهداری یادداشت‌ها، عکس‌ها و فایل‌ها',
    lastMessage: {
      text: 'به فضای ابری شخصی تلگرام خوش آمدید. پیام‌ها و فایل‌های خود را اینجا ذخیره کنید.',
      timestamp: 'هم‌اکنون',
      isOutgoing: true,
      status: 'read'
    }
  },
  {
    id: 'chat_official_support',
    type: 'channel',
    title: 'اطلاعیه‌ها و پشتیبانی سیستم',
    avatar: 'https://images.unsplash.com/photo-1577563908411-5077b6dc7624?w=150&auto=format&fit=crop&q=80',
    unreadCount: 0,
    isPinned: false,
    isMuted: false,
    isVerified: true,
    description: 'کانال رسمی اعلانات، وضعیت اتصال به سرور cPanel و دیتابیس MySQL',
    membersCount: 1,
    creatorId: 'usr_admin_09921758505',
    isUserAdmin: true,
    lastMessage: {
      text: 'سامانه در حالت نهایی قرار دارد و پل ارتباطی api.php آماده اتصال به دیتابیس MySQL هاست شماست.',
      timestamp: 'هم‌اکنون',
      isOutgoing: false,
      status: 'read'
    }
  }
];

// پیام‌های اولیه مربوط به چت‌های تمیز
export const INITIAL_MESSAGES: Record<string, Message[]> = {
  chat_saved: [
    {
      id: 'msg_saved_welcome',
      chatId: 'chat_saved',
      senderId: ADMIN_USER.id,
      senderName: ADMIN_USER.name,
      senderAvatar: ADMIN_USER.avatar,
      isOutgoing: true,
      text: 'به فضای ابری شخصی تلگرام خوش آمدید.\nشما می‌توانید هر متن، عکس، ویدیو یا سندی را از حافظه دستگاه خود در اینجا آپلود و نگهداری کنید.',
      type: 'text',
      reactions: [{ emoji: '☁️', count: 1 }],
      status: 'read',
      timestamp: 'هم‌اکنون'
    }
  ],
  chat_official_support: [
    {
      id: 'msg_support_welcome',
      chatId: 'chat_official_support',
      senderId: 'usr_system',
      senderName: 'سیستم تلگرام GODFATHER SQUAD',
      senderAvatar: 'https://images.unsplash.com/photo-1577563908411-5077b6dc7624?w=150&auto=format&fit=crop&q=80',
      isOutgoing: false,
      text: 'سامانه در حالت نهایی قرار دارد و پل ارتباطی با دیتابیس فعال است.',
      type: 'text',
      reactions: [{ emoji: '🚀', count: 1 }],
      status: 'read',
      timestamp: 'هم‌اکنون'
    }
  ]
};

// استوری‌های اولیه استاندارد تلگرام
export const INITIAL_STORIES: Story[] = [
  {
    id: 'story_godfather_1',
    userId: 'usr_admin_09921758505',
    userName: 'GODFATHER SQUAD',
    userAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    mediaUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80',
    mediaType: 'image',
    caption: 'به نسخه جدید GODFATHER SQUAD خوش آمدید! قابلیت گفتگوی صوتی و تصویری گروهی هم‌اکنون فعال است 🔥📹',
    expiryHours: 24,
    timestamp: 'هم‌اکنون',
    viewsCount: 154,
    isSeen: false
  },
  {
    id: 'story_godfather_2',
    userId: 'usr_system',
    userName: 'اطلاعیه رسمی سیستم',
    userAvatar: 'https://images.unsplash.com/photo-1577563908411-5077b6dc7624?w=150&auto=format&fit=crop&q=80',
    mediaUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80',
    mediaType: 'image',
    caption: 'امکان برقراری تماس ویدیویی و وب‌کم در گفتگوهای صوتی گروهی تلگرام فعال گردید 📹✨',
    expiryHours: 24,
    timestamp: '۱ ساعت پیش',
    viewsCount: 98,
    isSeen: false
  }
];

// مینی‌اپلیکیشن‌های استاندارد تلگرام
export const INITIAL_MINI_APPS: MiniApp[] = [
  {
    id: 'app_clicker',
    title: 'Pulse Tap & Stars (بازی کلیکر)',
    icon: '⚡',
    description: 'کسب امتیاز و ستاره‌های تلگرام با ضربه زدن، قابلیت انتقال و جوایز پریمیوم',
    category: 'Games & Stars',
    author: 'Telegram Apps',
    starsPrice: 0,
    type: 'clicker'
  },
  {
    id: 'app_wallet',
    title: 'Pulse Web3 Wallet (کیف‌پول استارز)',
    icon: '💎',
    description: 'مدیریت دارایی‌های تلگرام استارز، توکن‌های بومی و تراکنش‌های امن',
    category: 'Finance & Crypto',
    author: 'Telegram Foundation',
    starsPrice: 50,
    type: 'wallet'
  },
  {
    id: 'app_notes',
    title: 'Cloud Kanban & Tasks (مدیریت کارها)',
    icon: '📋',
    description: 'برنامه‌ریزی تسک‌ها و مدیریت پروژه‌های شخصی داخل تلگرام',
    category: 'Productivity',
    author: 'CloudPulse Team',
    type: 'notes'
  }
];

export const DEFAULT_FOLDERS: ChatFolder[] = [
  { id: 'f_all', name: 'همه گفتگوها', iconName: 'MessageSquare', type: 'all' },
  { id: 'f_personal', name: 'شخصی (PV)', iconName: 'User', type: 'personal' },
  { id: 'f_groups', name: 'گروه‌ها', iconName: 'Users', type: 'groups' },
  { id: 'f_channels', name: 'کانال‌ها', iconName: 'Megaphone', type: 'channels' },
  { id: 'f_bots', name: 'ربات‌ها', iconName: 'Bot', type: 'bots' },
];
