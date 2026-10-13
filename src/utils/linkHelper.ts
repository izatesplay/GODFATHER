import { Chat, User } from '../types/telegram';

/**
 * Returns the current application base URL dynamically from the active browser window/domain.
 * Works universally on localhost, custom domains, subdomains, or preview cloud environments.
 */
export function getAppBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location) {
    const origin = window.location.origin;
    if (origin && origin !== 'null') {
      return origin;
    }
    const protocol = window.location.protocol || 'https:';
    const host = window.location.host;
    if (host) {
      return `${protocol}//${host}`;
    }
  }
  return 'https://telegram.cloudpulse.org';
}

/**
 * Returns the plain domain name for display (e.g. "mytelegram.com" or "app.example.com")
 */
export function getDisplayDomain(): string {
  if (typeof window !== 'undefined' && window.location && window.location.host) {
    return window.location.host;
  }
  return 'telegram.cloudpulse.org';
}

/**
 * Generates an active, working invite or share link for a chat, group, or channel
 * on whichever domain the application is currently running.
 */
export function getChatShareLink(chat: { id: string; username?: string; type?: string }): string {
  const baseUrl = getAppBaseUrl();
  const cleanUsername = chat.username ? chat.username.trim().replace(/^@+/, '') : '';
  
  if (cleanUsername) {
    return `${baseUrl}/?c=${encodeURIComponent(cleanUsername)}`;
  }
  
  return `${baseUrl}/?join=${encodeURIComponent(chat.id)}`;
}

/**
 * Generates an active profile link for a user based on the active domain.
 */
export function getUserProfileLink(usernameOrId: string): string {
  const baseUrl = getAppBaseUrl();
  const clean = usernameOrId.trim().replace(/^@+/, '');
  return `${baseUrl}/?u=${encodeURIComponent(clean)}`;
}

/**
 * Generates the general app invite link
 */
export function getAppInviteLink(): string {
  return getAppBaseUrl();
}

/**
 * Parses deep link parameters from the current URL
 */
export function parseDeepLinkParams(): {
  chatId?: string;
  channelUsername?: string;
  username?: string;
} {
  if (typeof window === 'undefined' || !window.location) {
    return {};
  }

  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#\/?/, ''));

  const joinId = searchParams.get('join') || hashParams.get('join');
  const chatParam = searchParams.get('chat') || searchParams.get('c') || hashParams.get('chat') || hashParams.get('c');
  const userParam = searchParams.get('u') || searchParams.get('user') || hashParams.get('u') || hashParams.get('user');

  return {
    chatId: joinId || (chatParam && chatParam.startsWith('group_') || chatParam?.startsWith('channel_') ? chatParam : undefined),
    channelUsername: chatParam && !chatParam.startsWith('group_') && !chatParam.startsWith('channel_') ? chatParam : undefined,
    username: userParam || undefined
  };
}
