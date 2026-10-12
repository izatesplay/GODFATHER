import { Message, Chat } from '../types/telegram';

export interface SearchResultItem {
  message: Message;
  chat: Chat;
  score: number;
  dateValue: number;
  snippet: string;
}

export type SearchSortBy = 'relevance' | 'date';

/**
 * نرمال‌سازی متن برای جستجوی دقیق در زبان‌های فارسی، انگلیسی و عربی
 */
export function normalizeSearchText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '') // حذف اعراب و تنوین
    .replace(/[يى]/g, 'ی')
    .replace(/[ك]/g, 'ک')
    .replace(/[\u200C\u200B]/g, ' ') // تبدیل نیم‌فاصله به فاصله جهت تطابق کلمات
    .replace(/[«»""'']/g, '')
    .trim();
}

/**
 * استخراج زمان تقریبی از فرمت‌های مختلف تایم‌استمپ پیام
 */
export function parseMessageDate(timestamp?: string): number {
  if (!timestamp) return 0;
  const t = timestamp.trim();

  // اگر زمان ISO یا میلی‌ثانیه عددی باشد
  const numeric = Date.parse(t);
  if (!isNaN(numeric)) return numeric;

  // اگر ساعت و دقیقه باشد (مثال: 14:30 یا ۱۴:۳۰)
  const timeMatch = t.match(/(\d{1,2})[:：](\d{1,2})/);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const now = new Date();
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
    return date.getTime();
  }

  // پیام‌های لحظه‌ای
  if (t.includes('هم‌اکنون') || t.includes('الان') || t.includes('just now')) {
    return Date.now();
  }
  if (t.includes('دیروز') || t.includes('yesterday')) {
    return Date.now() - 24 * 60 * 60 * 1000;
  }

  return 0;
}

/**
 * ایجاد خلاصه (Snippet) حاوی کلمات کلیدی جستجو شده به همراه متون قبل و بعد
 */
export function generateSearchSnippet(text: string, query: string, maxLength = 100): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;

  const normalizedText = normalizeSearchText(text);
  const normalizedQuery = normalizeSearchText(query);
  const index = normalizedText.indexOf(normalizedQuery);

  if (index === -1) {
    return text.slice(0, maxLength) + '...';
  }

  const start = Math.max(0, index - Math.floor(maxLength / 3));
  const end = Math.min(text.length, start + maxLength);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < text.length ? '...' : '';

  return prefix + text.slice(start, end) + suffix;
}

/**
 * محاسبه امتیاز ارتباط (Relevance Score) برای مرتب‌سازی هوشمند
 */
export function calculateRelevanceScore(message: Message, query: string): number {
  const normQuery = normalizeSearchText(query);
  if (!normQuery) return 0;

  const text = message.text || '';
  const normText = normalizeSearchText(text);
  const normSender = normalizeSearchText(message.senderName || '');
  const normFileName = normalizeSearchText(message.fileName || '');
  const normTranscript = normalizeSearchText(message.transcript || '');
  const normTranslation = normalizeSearchText(message.translatedText || '');

  let score = 0;

  // ۱. انطباق کامل عبارت
  if (normText === normQuery) {
    score += 120;
  } else if (normText.includes(normQuery)) {
    score += 80;
    // انطباق در ابتدای پیام
    if (normText.startsWith(normQuery)) {
      score += 20;
    }
  }

  // ۲. انطباق در نام فرستنده یا نام فایل پیوست یا ویس
  if (normSender.includes(normQuery)) score += 35;
  if (normFileName.includes(normQuery)) score += 40;
  if (normTranscript.includes(normQuery)) score += 50;
  if (normTranslation.includes(normQuery)) score += 30;

  // ۳. بررسی تک تک کلمات کوئری (چندکلمه‌ای)
  const queryWords = normQuery.split(/\s+/).filter(Boolean);
  if (queryWords.length > 1) {
    let matchedWordsCount = 0;
    for (const w of queryWords) {
      if (normText.includes(w) || normSender.includes(w) || normTranscript.includes(w)) {
        matchedWordsCount++;
      }
    }
    score += (matchedWordsCount / queryWords.length) * 50;
  }

  // ۴. تعداد تکرار کلمه در پیام
  if (normText && normQuery) {
    const occurrences = (normText.match(new RegExp(normQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    score += Math.min(occurrences * 10, 40);
  }

  // ۵. بونوس واکنش‌ها یا تعاملات (پیام‌های پین شده یا تعاملی مهم‌ترند)
  if (message.reactions && message.reactions.length > 0) {
    score += Math.min(message.reactions.length * 2, 10);
  }

  return Math.round(score);
}

/**
 * جستجوی جامع در تمام پیام‌ها با قابلیت مرتب‌سازی بر اساس ارتباط یا تاریخ
 */
export function searchMessages(
  query: string,
  messagesByChat: Record<string, Message[]>,
  chats: Chat[],
  options?: {
    chatId?: string;
    sortBy?: SearchSortBy;
    topicId?: string;
  }
): SearchResultItem[] {
  const normQuery = normalizeSearchText(query);
  if (!normQuery) return [];

  const sortBy = options?.sortBy || 'relevance';
  const targetChatId = options?.chatId;
  const targetTopicId = options?.topicId;

  const chatMap = new Map<string, Chat>();
  chats.forEach((c) => chatMap.set(c.id, c));

  const results: SearchResultItem[] = [];

  // کلیدهای چت برای جستجو
  const chatIds = targetChatId ? [targetChatId] : Object.keys(messagesByChat);

  for (const cId of chatIds) {
    const chatMessages = messagesByChat[cId] || [];
    const chat = chatMap.get(cId) || {
      id: cId,
      type: 'group',
      title: 'گفتگو',
      avatar: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150',
      unreadCount: 0,
      isPinned: false,
      isMuted: false
    };

    for (const msg of chatMessages) {
      // اگر جستجو محدود به یک تاپیک خاص باشد
      if (targetTopicId && msg.topicId && msg.topicId !== targetTopicId) {
        continue;
      }

      const normText = normalizeSearchText(msg.text || '');
      const normSender = normalizeSearchText(msg.senderName || '');
      const normFile = normalizeSearchText(msg.fileName || '');
      const normTranscript = normalizeSearchText(msg.transcript || '');
      const normTranslation = normalizeSearchText(msg.translatedText || '');

      const isMatch =
        normText.includes(normQuery) ||
        normSender.includes(normQuery) ||
        normFile.includes(normQuery) ||
        normTranscript.includes(normQuery) ||
        normTranslation.includes(normQuery);

      if (isMatch) {
        const score = calculateRelevanceScore(msg, normQuery);
        const dateValue = parseMessageDate(msg.timestamp);
        const snippetSource = msg.text || msg.transcript || msg.fileName || msg.translatedText || 'پیام چندرسانه‌ای';
        const snippet = generateSearchSnippet(snippetSource, normQuery);

        results.push({
          message: msg,
          chat,
          score,
          dateValue,
          snippet
        });
      }
    }
  }

  // مرتب‌سازی بر اساس انتخاب کاربر (ارتباط یا تاریخ)
  if (sortBy === 'date') {
    results.sort((a, b) => {
      if (b.dateValue !== a.dateValue) {
        return b.dateValue - a.dateValue; // جدیدترین اول
      }
      return b.score - a.score;
    });
  } else {
    // مرتب‌سازی بر اساس ارتباط (Relevance)
    results.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score; // بیشترین امتیاز اول
      }
      return b.dateValue - a.dateValue; // در صورت امتیاز یکسان، جدیدتر اول
    });
  }

  return results;
}
