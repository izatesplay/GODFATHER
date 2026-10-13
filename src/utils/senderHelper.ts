import { User, Contact, Chat } from '../types/telegram';

interface SenderLookupOptions {
  senderId?: string;
  usersList?: User[];
  contacts?: Contact[];
  currentUser?: User;
  chats?: Chat[];
  chatId?: string;
}

/**
 * Checks if a string looks like a phone number
 */
export function isPhoneNumber(val?: string | null): boolean {
  if (!val) return false;
  const clean = val.replace(/[\s\-\(\)]/g, '');
  // Matches formats like +98912..., 0912..., 98912..., or any string with 7+ digits and optional leading +
  return /^(\+?\d{7,15})$/.test(clean);
}

/**
 * Normalizes phone number for comparisons (strips spaces, dashes, +)
 */
export function normalizePhone(val?: string | null): string {
  if (!val) return '';
  return val.replace(/[\s\-\(\)\+]/g, '').replace(/^00/, '');
}

/**
 * Resolves a sender identifier, phone number, or raw string into a friendly, real display name.
 * Prevents exposing phone numbers in "هدایت شده از" (Forwarded from) or Reply headers.
 */
export function getSenderFriendlyName(
  rawSenderOrName?: string | null,
  options?: SenderLookupOptions
): string {
  const { senderId, usersList, contacts, currentUser, chats, chatId } = options || {};

  // 1. Direct check: If rawSenderOrName is already provided and not a phone number, but let's also check if it's an ID
  const isPhone = isPhoneNumber(rawSenderOrName);

  // 2. Check current user
  if (currentUser) {
    if (
      senderId === currentUser.id ||
      (rawSenderOrName && (rawSenderOrName === currentUser.phone || normalizePhone(rawSenderOrName) === normalizePhone(currentUser.phone)))
    ) {
      return currentUser.name || 'شما';
    }
  }

  // Helper to load fallback lists from localStorage if not passed in options
  let allContacts = contacts;
  let allUsers = usersList;
  let allChats = chats;

  if (!allContacts || !allUsers) {
    try {
      if (!allContacts) {
        const savedContacts = localStorage.getItem('cp_contacts');
        if (savedContacts) allContacts = JSON.parse(savedContacts);
      }
      if (!allUsers) {
        const savedUsers = localStorage.getItem('cp_users_list');
        if (savedUsers) allUsers = JSON.parse(savedUsers);
      }
      if (!allChats) {
        const savedChats = localStorage.getItem('cp_chats');
        if (savedChats) allChats = JSON.parse(savedChats);
      }
    } catch {
      // ignore JSON parse errors
    }
  }

  // 3. Search in contacts by ID or Phone
  if (allContacts && allContacts.length > 0) {
    // By senderId
    if (senderId) {
      const match = allContacts.find((c) => c.id === senderId);
      if (match?.name) return match.name;
    }
    // By phone or name
    if (rawSenderOrName) {
      const normRaw = normalizePhone(rawSenderOrName);
      const match = allContacts.find(
        (c) =>
          c.id === rawSenderOrName ||
          c.phone === rawSenderOrName ||
          (normRaw && normalizePhone(c.phone) === normRaw) ||
          c.name === rawSenderOrName
      );
      if (match?.name) return match.name;
    }
  }

  // 4. Search in usersList by ID or Phone or username
  if (allUsers && allUsers.length > 0) {
    if (senderId) {
      const match = allUsers.find((u) => u.id === senderId);
      if (match?.name) return match.name;
    }
    if (rawSenderOrName) {
      const normRaw = normalizePhone(rawSenderOrName);
      const match = allUsers.find(
        (u) =>
          u.id === rawSenderOrName ||
          u.phone === rawSenderOrName ||
          (normRaw && normalizePhone(u.phone) === normRaw) ||
          u.username === rawSenderOrName ||
          u.name === rawSenderOrName
      );
      if (match?.name) return match.name;
    }
  }

  // 5. Search in chats (for channel, group, or private chat titles)
  if (allChats && allChats.length > 0) {
    if (chatId) {
      const chatMatch = allChats.find((c) => c.id === chatId);
      if (chatMatch?.title) return chatMatch.title;
    }
    if (senderId) {
      const chatMatch = allChats.find((c) => c.id === senderId);
      if (chatMatch?.title) return chatMatch.title;
    }
    if (rawSenderOrName) {
      const chatMatch = allChats.find((c) => c.id === rawSenderOrName || c.title === rawSenderOrName);
      if (chatMatch?.title) return chatMatch.title;
    }
  }

  // 6. If rawSenderOrName is NOT a phone number and is a non-empty string, return it!
  if (rawSenderOrName && !isPhone && rawSenderOrName.trim().length > 0) {
    return rawSenderOrName.trim();
  }

  // 7. If it IS a phone number and we couldn't resolve the name:
  // As explicitly required: "نباید شماره کاربر باشه باید اسم کاربر باشه"
  // Never display the raw phone number. Return a friendly user label.
  if (isPhone) {
    return 'کاربر تلگرام';
  }

  return rawSenderOrName || 'کاربر';
}
