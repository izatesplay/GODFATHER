export type ChatType = 'private' | 'group' | 'supergroup' | 'channel' | 'bot' | 'secret';

export interface User {
  id: string;
  name: string;
  username: string;
  phone: string;
  avatar: string;
  avatars?: string[]; // Multiple profile photos carousel
  bio?: string;
  isPremium: boolean;
  emojiStatus?: string;
  customColor: 'blue' | 'purple' | 'emerald' | 'amber' | 'rose' | 'cyan';
  lastSeen: string;
  isOnline: boolean;
  role?: 'superadmin' | 'admin' | 'moderator' | 'member';
  starsBalance?: number;
  isBanned?: boolean;
  blockedUserIds?: string[]; // List of user IDs blocked by this user
}

export interface Topic {
  id: string;
  title: string;
  iconEmoji: string;
  unreadCount?: number;
  messageCount: number;
  isClosed?: boolean;
}

export interface Reaction {
  emoji: string;
  count: number;
  userReacted?: boolean;
  isPremium?: boolean;
}

export interface MessageSeenBy {
  id: string;
  name: string;
  avatar: string;
  seenAt: string;
  username?: string;
  role?: 'owner' | 'admin' | 'moderator' | 'member';
}

export interface ChatWallpaper {
  id: string;
  name: string;
  type: 'solid' | 'gradient' | 'image';
  value: string;
  hasPattern?: boolean;
}

export interface Message {
  id: string;
  chatId: string;
  topicId?: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  isOutgoing: boolean;
  text: string;
  type: 'text' | 'photo' | 'video' | 'voice' | 'round_video' | 'document' | 'poll' | 'system' | 'audio';
  mediaUrl?: string;
  fileName?: string;
  fileSize?: string;
  audioTitle?: string;
  audioPerformer?: string;
  voiceDuration?: number; // in seconds
  voiceWaveform?: number[];
  transcript?: string;
  isTranscribing?: boolean;
  translatedText?: string;
  isSpoiler?: boolean;
  isSilent?: boolean;
  isEdited?: boolean;
  isPinned?: boolean;
  pinnedAt?: string;
  seenBy?: MessageSeenBy[];
  replyTo?: {
    id: string;
    senderName: string;
    text: string;
  };
  forwardFrom?: {
    originalSender: string;
  };
  reactions: Reaction[];
  status: 'sending' | 'sent' | 'read';
  timestamp: string;
  selfDestructIn?: number; // seconds remaining in secret chat
  deletedForUserIds?: string[]; // IDs of users who deleted this message for themselves only
}

export interface CallMusicTrack {
  id: string;
  title: string;
  artist?: string;
  audioUrl: string;
  duration?: number; // seconds
  addedBy: {
    id: string;
    name: string;
    avatar?: string;
  };
  addedAt: string;
  fileSize?: string;
  coverUrl?: string;
  sourceMessageId?: string;
}

export interface CallMusicPlayerState {
  isPlaying: boolean;
  currentTrack?: CallMusicTrack | null;
  queue: CallMusicTrack[];
  volume?: number;
  currentTime?: number;
  isLooping?: boolean;
}

export interface Chat {
  id: string;
  type: ChatType;
  title: string;
  username?: string;
  avatar: string;
  avatars?: string[]; // Multiple photos carousel for group/channel/profile
  unreadCount: number;
  isPinned: boolean;
  pinnedMessageIds?: string[];
  isMuted: boolean;
  isBlocked?: boolean; // Block status for private chats
  draft?: string;
  draftText?: string;
  isVerified?: boolean;
  description?: string;
  membersCount?: number;
  boostLevel?: number;
  topics?: Topic[];
  activeTopicId?: string;
  isSecret?: boolean;
  secretChatTimer?: number; // in seconds
  verificationFingerprint?: string[]; // 4 emojis for E2EE / WebRTC
  lastMessage?: {
    text: string;
    timestamp: string;
    senderName?: string;
    isOutgoing?: boolean;
    status?: 'sending' | 'sent' | 'read';
  };
  reactionPreview?: string;
  creatorId?: string;
  isUserAdmin?: boolean;
  activeCall?: {
    isActive: boolean;
    startedBy: string;
    startedByName: string;
    startedAt: string;
    participantsCount: number;
    participants: {
      id: string;
      name: string;
      avatar: string;
      isSpeaking?: boolean;
      hasVideo?: boolean;
      isMuted?: boolean;
      role?: string;
    }[];
    musicPlayer?: CallMusicPlayerState;
  };
  members?: ChatMember[];
}

export interface ChatMember {
  id: string;
  name: string;
  avatar: string;
  avatars?: string[];
  role: 'owner' | 'admin' | 'moderator' | 'member';
  roleTitle?: string;
  isOnline?: boolean;
  username?: string;
  bio?: string;
  phone?: string;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  avatar: string;
  avatars?: string[];
  status: string;
  isOnline: boolean;
  username?: string;
  bio?: string;
}

export interface Story {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
  expiryHours: number;
  timestamp: string;
  viewsCount?: number;
  isSeen?: boolean;
  isStealth?: boolean;
}

export interface MiniApp {
  id: string;
  title: string;
  icon: string;
  description: string;
  category: string;
  author: string;
  starsPrice?: number;
  type: 'clicker' | 'wallet' | 'notes';
}

export interface ChatFolder {
  id: string;
  name: string;
  iconName: string;
  type: 'all' | 'personal' | 'groups' | 'channels' | 'bots' | 'unread' | 'saved';
  badgeCount?: number;
}

