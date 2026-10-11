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
 * استعلام وضعیت ثبت‌نام شماره در پایگاه‌داده تلگرام (MySQL / server)
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


