/**
 * سرویس ترجمه هوشمند و زنده تلگرام (Google Translate Engine & Multi-Tier Fallback)
 * بدون نیاز به کلید API - قابلیت کارکرد ۱۰۰٪ مستقل روی هاست‌های اشتراکی cPanel، سرورهای ابری و کلاینت
 */

export interface TranslationResult {
  success: boolean;
  translatedText: string;
  sourceLang?: string;
  targetLang?: string;
  error?: string;
}

export const SUPPORTED_LANGUAGES = [
  { code: 'fa', name: 'فارسی (Persian)', flag: '🇮🇷' },
  { code: 'en', name: 'انگلیسی (English)', flag: '🇬🇧' },
  { code: 'ar', name: 'عربی (Arabic)', flag: '🇸🇦' },
  { code: 'tr', name: 'ترکی (Turkish)', flag: '🇹🇷' },
  { code: 'fr', name: 'فرانسوی (French)', flag: '🇫🇷' },
  { code: 'de', name: 'آلمانی (German)', flag: '🇩🇪' },
  { code: 'ru', name: 'روسی (Russian)', flag: '🇷🇺' },
  { code: 'es', name: 'اسپانیایی (Spanish)', flag: '🇪🇸' },
];

/**
 * تشخیص خودکار زبان متن (فارسی/عربی در برابر زبان‌های لاتین)
 */
export function isPersianOrArabic(text: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
}

/**
 * ترجمه متن با استفاده از چند لایه موتور ترجمه تضمینی
 */
export async function translateText(
  text: string,
  preferredTargetLang?: string
): Promise<TranslationResult> {
  const clean = text?.trim();
  if (!clean) {
    return { success: true, translatedText: '' };
  }

  // اگر زبان مقصد مشخص نشده باشد، به صورت خودکار انتخاب می‌شود:
  // اگر متن فارسی است -> به انگلیسی
  // اگر متن انگلیسی/خارجی است -> به فارسی
  const isFarsi = isPersianOrArabic(clean);
  const targetLang = preferredTargetLang || (isFarsi ? 'en' : 'fa');
  const sourceLang = 'auto';

  // -------------------------------------------------------------
  // لایه ۱: سرور اکسپرس محلی (/api/ai/translate) با هوش مصنوعی و پروکسی گوگل
  // -------------------------------------------------------------
  try {
    const res = await fetch('/api/ai/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: clean, targetLang })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.translatedText && data.translatedText.trim()) {
        return {
          success: true,
          translatedText: data.translatedText.trim(),
          sourceLang: isFarsi ? 'fa' : 'auto',
          targetLang
        };
      }
    }
  } catch {
    // continue to next tier
  }

  // -------------------------------------------------------------
  // لایه ۲: سرور واسط cPanel api.php (در صورت استقرار روی هاست اشتراکی)
  // -------------------------------------------------------------
  try {
    const apiPhpUrl = '/api.php?action=translate';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(apiPhpUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: clean, targetLang }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const json = await res.json();
      if (json.status === 'success' && json.data?.translatedText) {
        return {
          success: true,
          translatedText: json.data.translatedText.trim(),
          sourceLang: json.data.sourceLang || (isFarsi ? 'fa' : 'auto'),
          targetLang
        };
      }
    }
  } catch {
    // continue to next tier
  }

  // -------------------------------------------------------------
  // لایه ۳: Google Translate GTX Client API (مستقیم)
  // -------------------------------------------------------------
  try {
    const encoded = encodeURIComponent(clean);
    const googleUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encoded}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(googleUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && Array.isArray(data[0])) {
        const fullTranslation = data[0]
          .map((item: any) => (Array.isArray(item) ? item[0] : ''))
          .filter(Boolean)
          .join('');

        if (fullTranslation && fullTranslation.trim()) {
          const detectedLang = data[2] || (isFarsi ? 'fa' : 'en');
          return {
            success: true,
            translatedText: fullTranslation.trim(),
            sourceLang: detectedLang,
            targetLang
          };
        }
      }
    }
  } catch (err) {
    console.warn('Google GTX Translate direct attempt failed:', err);
  }

  // -------------------------------------------------------------
  // لایه ۴: MyMemory Translation API (پشتیبان آزاد)
  // -------------------------------------------------------------
  try {
    const pair = isFarsi ? `fa|${targetLang}` : `autodetect|${targetLang}`;
    const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(clean)}&langpair=${pair}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(myMemoryUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const json = await res.json();
      if (json.responseData?.translatedText) {
        return {
          success: true,
          translatedText: json.responseData.translatedText.trim(),
          sourceLang: isFarsi ? 'fa' : 'en',
          targetLang
        };
      }
    }
  } catch {
    // ignore
  }

  return {
    success: false,
    translatedText: clean,
    error: 'امکان ترجمه در این لحظه میسر نشد.'
  };
}
