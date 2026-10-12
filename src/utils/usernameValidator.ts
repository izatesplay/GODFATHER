import { User, Chat } from '../types/telegram';

/**
 * پاک‌سازی و استانداردسازی نام کاربری
 */
export function cleanUsername(raw: string): string {
  return (raw || '').trim().replace(/^@+/, '').toLowerCase();
}

/**
 * بررسی صحت فرمت نام کاربری (استاندارد تلگرام: ۳ تا ۳۲ نویسه، حروف انگلیسی، اعداد و خط زیر)
 */
export function validateUsernameFormat(raw: string): { isValid: boolean; error?: string } {
  const clean = cleanUsername(raw);

  if (!clean) {
    return { isValid: false, error: 'نام کاربری نمی‌تواند خالی باشد.' };
  }

  if (clean.length < 3) {
    return { isValid: false, error: 'شناسه یا نام کاربری باید حداقل ۳ حرف باشد.' };
  }

  if (clean.length > 32) {
    return { isValid: false, error: 'نام کاربری نمی‌تواند بیش از ۳۲ حرف باشد.' };
  }

  // مجاز: حروف کوچک و بزرگ انگلیسی، اعداد و آندرلاین
  const validRegex = /^[a-zA-Z0-9_]+$/;
  if (!validRegex.test(clean)) {
    return { isValid: false, error: 'فقط حروف انگلیسی، اعداد و خط زیر (_) مجاز هستند.' };
  }

  return { isValid: true };
}

export interface UniquenessCheckOptions {
  users?: User[];
  chats?: Chat[];
  excludeUserId?: string;
  excludeChatId?: string;
}

/**
 * بررسی یکتا بودن نام کاربری در بین کاربران و کانال‌ها در کلاینت
 */
export function isUsernameTakenLocally(
  raw: string,
  options: UniquenessCheckOptions
): { isTaken: boolean; reason?: string } {
  const clean = cleanUsername(raw);
  if (!clean) return { isTaken: false };

  // ۱. بررسی در میان کاربران
  if (options.users && options.users.length > 0) {
    const duplicateUser = options.users.find(
      (u) =>
        u.id !== options.excludeUserId &&
        cleanUsername(u.username || '') === clean
    );

    if (duplicateUser) {
      return {
        isTaken: true,
        reason: `نام کاربری «@${clean}» قبلاً توسط کاربر دیگری ثبت شده است.`
      };
    }
  }

  // ۲. بررسی در میان کانال‌ها و گروه‌ها
  if (options.chats && options.chats.length > 0) {
    const duplicateChat = options.chats.find(
      (c) =>
        c.id !== options.excludeChatId &&
        cleanUsername(c.username || '') === clean
    );

    if (duplicateChat) {
      return {
        isTaken: true,
        reason: `شناسه «@${clean}» قبلاً برای یک ${duplicateChat.type === 'channel' ? 'کانال' : 'گروه'} ثبت شده است.`
      };
    }
  }

  return { isTaken: false };
}

/**
 * استعلام آنلاین یکتایی نام کاربری از سرور دیتابیس (Node.js و cPanel MySQL)
 */
export async function checkUsernameAvailabilityRemote(
  raw: string,
  excludeId?: string
): Promise<{ available: boolean; message?: string }> {
  const clean = cleanUsername(raw);
  if (!clean || clean.length < 3) {
    return { available: false, message: 'شناسه باید حداقل ۳ حرف باشد.' };
  }

  try {
    const res = await fetch(`/api/check-username?username=${encodeURIComponent(clean)}&excludeId=${encodeURIComponent(excludeId || '')}`);
    if (res.ok) {
      const data = await res.json();
      return {
        available: Boolean(data.available),
        message: data.error || data.message
      };
    }
  } catch {
    // در صورت قطعی شبکه به اعتبارسنجی کلاینت تکیه می‌شود
  }

  try {
    const resPhp = await fetch(`/api.php?action=check_username&username=${encodeURIComponent(clean)}&excludeId=${encodeURIComponent(excludeId || '')}`);
    if (resPhp.ok) {
      const data = await resPhp.json();
      if (data.status === 'success' && data.data) {
        return {
          available: Boolean(data.data.available),
          message: data.message
        };
      }
    }
  } catch {
    // ignore
  }

  return { available: true };
}
