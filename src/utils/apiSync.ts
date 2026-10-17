import { User, Chat, Message, Story, Contact, ChatFolder } from '../types/telegram';

const STORAGE_API_URL_KEY = 'cloudpulse_api_url';
export const DEFAULT_API_URL = '/api.php';

export function getApiBaseUrl(): string {
  return localStorage.getItem(STORAGE_API_URL_KEY) || DEFAULT_API_URL;
}

export function setApiBaseUrl(url: string): void {
  localStorage.setItem(STORAGE_API_URL_KEY, url.trim() || DEFAULT_API_URL);
}

export interface ApiStatusResponse {
  api_name: string;
  version: string;
  server_time: string;
  database: {
    name: string;
    host: string;
    charset: string;
    connected: boolean;
    tables: Record<string, number>;
  };
  admin_phone: string;
  storage_engine: string;
  cors_enabled: boolean;
}

export interface SyncPayload {
  users?: User[];
  chats?: Chat[];
  messages?: Record<string, Message[]> | Message[];
  contacts?: Contact[];
  stories?: Story[];
  folders?: ChatFolder[];
}

/**
 * بررسی وضعیت اتصال به api.php در cPanel
 */
export async function checkApiHealth(customUrl?: string): Promise<{ success: boolean; data?: ApiStatusResponse; error?: string }> {
  const url = (customUrl || getApiBaseUrl()).replace(/\/$/, '');
  try {
    const res = await fetch(`${url}?action=status`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      return { success: false, error: `خطای سرور HTTP ${res.status}` };
    }

    const json = await res.json();
    if (json.status === 'success') {
      return { success: true, data: json.data };
    } else {
      return { success: false, error: json.message || 'خطا در برقراری ارتباط' };
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'عدم دسترسی به سرور API' };
  }
}

/**
 * دریافت کلیه اطلاعات از دیتابیس MySQL هاست
 */
export async function fetchRemoteData(): Promise<{
  success: boolean;
  data?: {
    users: User[];
    chats: Chat[];
    messages: Record<string, Message[]>;
    contacts: Contact[];
    stories: Story[];
    folders: ChatFolder[];
  };
  error?: string;
}> {
  const url = getApiBaseUrl().replace(/\/$/, '');
  try {
    const res = await fetch(`${url}?action=get_all`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      return { success: false, error: `خطای سرور HTTP ${res.status}` };
    }

    const json = await res.json();
    if (json.status === 'success' && json.data) {
      return { success: true, data: json.data };
    }
    return { success: false, error: json.message || 'خطا در بارگذاری اطلاعات' };
  } catch (err: any) {
    return { success: false, error: err.message || 'عدم دسترسی به سرور API' };
  }
}

/**
 * همگام‌سازی تراکنشی کل اطلاعات محلی با دیتابیس MySQL (sync_all)
 */
export async function syncAllToRemote(payload: SyncPayload): Promise<{ success: boolean; message?: string; error?: string }> {
  const url = getApiBaseUrl().replace(/\/$/, '');
  try {
    const res = await fetch(`${url}?action=sync_all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      return { success: false, error: `خطای سرور HTTP ${res.status}` };
    }

    const json = await res.json();
    if (json.status === 'success') {
      return { success: true, message: json.message };
    }
    return { success: false, error: json.message || 'خطا در همگام‌سازی' };
  } catch (err: any) {
    return { success: false, error: err.message || 'عدم دسترسی به سرور API' };
  }
}

/**
 * ارسال و ذخیره یک پیام در دیتابیس MySQL
 */
export async function saveMessageToRemote(msg: Message): Promise<boolean> {
  const url = getApiBaseUrl().replace(/\/$/, '');
  try {
    const res = await fetch(`${url}?action=save_message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(msg),
    });
    const json = await res.json();
    return json.status === 'success';
  } catch {
    return false;
  }
}

/**
 * ذخیره یک گفتگو جدید
 */
export async function saveChatToRemote(chat: Partial<Chat>): Promise<boolean> {
  const url = getApiBaseUrl().replace(/\/$/, '');
  try {
    const res = await fetch(`${url}?action=save_chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(chat),
    });
    const json = await res.json();
    return json.status === 'success';
  } catch {
    return false;
  }
}

/**
 * نرمال‌سازی شماره تلفن (حذف کاراکترهای اضافه و تبدیل فرمت به 09...)
 */
export function normalizePhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('98') && digits.length >= 12) {
    return '0' + digits.slice(2);
  }
  if (!digits.startsWith('0') && digits.length === 10) {
    return '0' + digits;
  }
  return digits;
}

/**
 * استعلام وضعیت ثبت‌نام شماره در پایگاه‌داده GODFATHER SQUAD (MySQL / server)
 */
export async function checkPhoneInDatabase(phone: string): Promise<{
  success: boolean;
  exists: boolean;
  user?: Partial<User>;
  message?: string;
}> {
  const url = getApiBaseUrl().replace(/\/$/, '');
  const clean = normalizePhoneNumber(phone);
  try {
    const res = await fetch(`${url}?action=check_phone&phone=${encodeURIComponent(clean)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) {
      return { success: false, exists: false, message: `خطای سرور HTTP ${res.status}` };
    }
    const json = await res.json();
    if (json.status === 'success') {
      return {
        success: true,
        exists: !!json.data?.exists,
        user: json.data?.user,
        message: json.message
      };
    }
    return { success: false, exists: false, message: json.message || 'خطا در استعلام' };
  } catch (err: any) {
    return { success: false, exists: false, message: err.message || 'عدم دسترسی به سرور دیتابیس' };
  }
}

/**
 * ذخیره مخاطب جدید در پایگاه داده
 */
export async function saveContactToRemote(contact: Contact): Promise<boolean> {
  const url = getApiBaseUrl().replace(/\/$/, '');
  try {
    const res = await fetch(`${url}?action=save_contact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(contact)
    });
    const json = await res.json();
    return json.status === 'success';
  } catch {
    return false;
  }
}

/**
 * ذخیره استوری جدید در پایگاه داده
 */
export async function saveStoryToRemote(story: Story): Promise<boolean> {
  const url = getApiBaseUrl().replace(/\/$/, '');
  try {
    const res = await fetch(`${url}?action=save_story`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(story)
    });
    const json = await res.json();
    return json.status === 'success';
  } catch {
    return false;
  }
}

/**
 * اعتبارسنجی فرمت و نویسه‌های نام کاربری یا شناسه کانال
 */
export function validateUsernameFormat(raw: string): { valid: boolean; clean: string; error?: string } {
  const clean = raw.trim().replace(/^@+/, '').toLowerCase();
  if (!clean) {
    return { valid: false, clean: '', error: 'نام کاربری نمی‌تواند خالی باشد.' };
  }
  if (clean.length < 3) {
    return { valid: false, clean, error: 'نام کاربری باید حداقل ۳ نویسه باشد.' };
  }
  if (clean.length > 32) {
    return { valid: false, clean, error: 'نام کاربری نمی‌تواند بیشتر از ۳۲ نویسه باشد.' };
  }
  if (!/^[a-z0-9_]+$/.test(clean)) {
    return { valid: false, clean, error: 'نام کاربری فقط می‌تواند شامل حروف انگلیسی کوچک (a-z)، اعداد (0-9) و زیرخط (_) باشد.' };
  }
  if (/^[0-9]/.test(clean)) {
    return { valid: false, clean, error: 'نام کاربری نمی‌تواند با عدد شروع شود.' };
  }
  return { valid: true, clean };
}

/**
 * بررسی بلادرنگ یکتایی نام کاربری در بین کاربران و کانال‌های موجود (کلاینت)
 */
export function checkLocalUsernameAvailable(
  raw: string,
  users: User[] = [],
  chats: Chat[] = [],
  excludeId?: string
): { available: boolean; clean: string; error?: string; message?: string } {
  const validation = validateUsernameFormat(raw);
  if (!validation.valid) {
    return { available: false, clean: validation.clean, error: validation.error };
  }

  const clean = validation.clean;

  // ۱. بررسی در میان تمام کاربران
  const duplicateUser = users.find(
    (u) => u.id !== excludeId && (u.username || '').trim().replace(/^@+/, '').toLowerCase() === clean
  );
  if (duplicateUser) {
    return {
      available: false,
      clean,
      error: `نام کاربری «@${clean}» قبلاً توسط کاربر دیگری ثبت شده و اختصاصی است.`
    };
  }

  // ۲. بررسی در میان تمام کانال‌ها و گروه‌ها
  const duplicateChat = chats.find(
    (c) => c.id !== excludeId && (c.username || '').trim().replace(/^@+/, '').toLowerCase() === clean
  );
  if (duplicateChat) {
    const label = duplicateChat.type === 'channel' ? 'کانال' : 'گروه';
    return {
      available: false,
      clean,
      error: `شناسه «@${clean}» قبلاً برای ${label} «${duplicateChat.title}» ثبت شده است.`
    };
  }

  return {
    available: true,
    clean,
    message: `شناسه @${clean} آزاد و قابل استفاده است.`
  };
}

/**
 * استعلام آنلاین یکتایی نام کاربری از سرور (MySQL / Express)
 */
export async function checkUsernameAvailability(
  raw: string,
  excludeId?: string
): Promise<{ available: boolean; clean: string; message: string; error?: string }> {
  const validation = validateUsernameFormat(raw);
  if (!validation.valid) {
    return { available: false, clean: validation.clean, message: validation.error || 'فرمت نامعتبر', error: validation.error };
  }

  const clean = validation.clean;
  const url = getApiBaseUrl().replace(/\/$/, '');

  try {
    const query = `${url}?action=check_username&username=${encodeURIComponent(clean)}&excludeId=${encodeURIComponent(excludeId || '')}`;
    const res = await fetch(query, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!res.ok) {
      return { available: true, clean, message: `شناسه @${clean} معتبر است.` };
    }

    const json = await res.json();
    if (json.status === 'success' && json.data) {
      return {
        available: !!json.data.available,
        clean,
        message: json.message || (json.data.available ? `شناسه @${clean} آزاد است.` : `شناسه @${clean} تکراری است.`),
        error: !json.data.available ? json.message : undefined
      };
    } else if (json.available !== undefined) {
      return {
        available: !!json.available,
        clean,
        message: json.message || json.error || '',
        error: !json.available ? (json.error || json.message) : undefined
      };
    }

    return { available: true, clean, message: `شناسه @${clean} در دسترس است.` };
  } catch {
    return { available: true, clean, message: `شناسه @${clean} تایید شد.` };
  }
}

/**
 * به‌روزرسانی مشخصات کاربر در پایگاه داده با حفظ یکتایی نام کاربری
 */
export async function updateUserOnRemote(
  user: Partial<User> & { id: string }
): Promise<{ success: boolean; message?: string; error?: string }> {
  const url = getApiBaseUrl().replace(/\/$/, '');
  try {
    const res = await fetch(`${url}?action=update_user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(user)
    });

    const json = await res.json();
    if (json.status === 'success') {
      return { success: true, message: json.message };
    }
    return { success: false, error: json.message || json.error || 'خطا در به‌روزرسانی اطلاعات کاربر' };
  } catch (err: any) {
    return { success: false, error: err.message || 'خطا در اتصال به سرور' };
  }
}

/**
 * ثبت نام کاربر جدید در پایگاه داده سرور
 */
export async function registerUserOnRemote(userData: {
  name: string;
  username: string;
  phone: string;
  password?: string;
  avatar?: string;
  bio?: string;
}): Promise<{ success: boolean; user?: User; error?: string }> {
  const url = getApiBaseUrl().replace(/\/$/, '');
  try {
    const res = await fetch(`${url}?action=register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        ...userData,
        password: userData.password || 'user1234'
      })
    });

    const json = await res.json();
    if (json.status === 'success' && json.data?.user) {
      return { success: true, user: json.data.user };
    }
    return { success: false, error: json.message || json.error || 'خطا در ثبت نام' };
  } catch (err: any) {
    return { success: false, error: err.message || 'خطا در اتصال به سرور' };
  }
}

/**
 * ورود کاربر از طریق پایگاه داده سرور (MySQL / Express)
 */
export async function loginUserOnRemote(
  identifier: string,
  password: string
): Promise<{ success: boolean; user?: User; token?: string; error?: string }> {
  const url = getApiBaseUrl().replace(/\/$/, '');
  try {
    const res = await fetch(`${url}?action=login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ identifier, password })
    });

    const json = await res.json();
    if (json.status === 'success' && json.data?.user) {
      return { success: true, user: json.data.user, token: json.data.token };
    }
    return { success: false, error: json.message || json.error || 'اطلاعات کاربری یا کلمه عبور نادرست است.' };
  } catch (err: any) {
    return { success: false, error: err.message || 'عدم دسترسی به سرور دیتابیس' };
  }
}

/**
 * به‌روزرسانی بلادرنگ وضعیت حضور (آنلاین / آفلاین) در پایگاه‌داده
 */
export async function updateUserPresenceOnRemote(
  userId: string,
  isOnline: boolean,
  lastSeen?: string
): Promise<boolean> {
  const url = getApiBaseUrl().replace(/\/$/, '');
  const payloadStr = JSON.stringify({ userId, isOnline, lastSeen });

  // Use sendBeacon on page unload/hide for guaranteed delivery
  if (typeof navigator !== 'undefined' && navigator.sendBeacon && !isOnline) {
    try {
      const blob = new Blob([payloadStr], { type: 'application/json' });
      navigator.sendBeacon(`${url}?action=update_presence`, blob);
      return true;
    } catch {}
  }

  try {
    const res = await fetch(`${url}?action=update_presence`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      keepalive: true,
      body: payloadStr
    });
    const json = await res.json();
    return json.status === 'success';
  } catch {
    return false;
  }
}

/**
 * حذف گفتگو از دیتابیس سرور
 */
export async function deleteChatOnRemote(chatId: string): Promise<boolean> {
  const url = getApiBaseUrl().replace(/\/$/, '');
  try {
    const res = await fetch(`${url}?action=delete_chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ chatId })
    });
    const json = await res.json();
    return json.status === 'success';
  } catch {
    return false;
  }
}



