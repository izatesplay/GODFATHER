export type ChatType = 'private' | 'group' | 'supergroup' | 'channel' | 'bot' | 'secret';

export interface User {
  id: string;
  name: string;
  username: string;
  phone: string;
  avatar: string;
  bio?: string;
  isPremium: boolean;
  emojiStatus?: string;
  customColor: 'blue' | 'purple' | 'emerald' | 'amber' | 'rose' | 'cyan';
  lastSeen: string;
  isOnline: boolean;
  role?: 'superadmin' | 'admin' | 'moderator' | 'member';
  starsBalance?: number;
  isBanned?: boolean;
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

export interface Message {
  id: string;
  chatId: string;
  topicId?: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  isOutgoing: boolean;
  text: string;
  type: 'text' | 'photo' | 'video' | 'voice' | 'round_video' | 'document' | 'poll' | 'system';
  mediaUrl?: string;
  fileName?: string;
  fileSize?: string;
  voiceDuration?: number; // in seconds
  voiceWaveform?: number[];
  transcript?: string;
  isTranscribing?: boolean;
  translatedText?: string;
  isSpoiler?: boolean;
  isSilent?: boolean;
  isEdited?: boolean;
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
}

export interface Chat {
  id: string;
  type: ChatType;
  title: string;
  username?: string;
  avatar: string;
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
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
  };
  members?: ChatMember[];
}

export interface ChatMember {
  id: string;
  name: string;
  avatar: string;
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

