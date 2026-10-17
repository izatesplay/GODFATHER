import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chat, Message, Story, User, MiniApp, Contact, ChatFolder, ChatMember, CallMusicTrack } from './types/telegram';
import { 
  ADMIN_USER,
  INITIAL_CHATS, 
  INITIAL_MESSAGES, 
  INITIAL_STORIES, 
  INITIAL_MINI_APPS,
  INITIAL_SYSTEM_USERS,
  INITIAL_CONTACTS,
  DEFAULT_FOLDERS
} from './data/mock-chats';
import { 
  checkApiHealth, 
  fetchRemoteData, 
  syncAllToRemote, 
  saveMessageToRemote, 
  saveChatToRemote, 
  saveStoryToRemote,
  updateUserPresenceOnRemote,
  deleteChatOnRemote
} from './utils/apiSync';
import { translateText } from './utils/translator';
import { Sidebar } from './components/Sidebar';
import { ChatHeader } from './components/ChatHeader';
import { ChatSearchBar } from './components/ChatSearchBar';
import { PinnedMessageBar } from './components/PinnedMessageBar';
import { MessageItem } from './components/MessageItem';
import { MessageInput } from './components/MessageInput';
import { ChatWallpaper } from './types/telegram';
import { DEFAULT_WALLPAPER } from './data/wallpapers';
import { CallModal } from './components/CallModal';
import { StoryViewer } from './components/StoryViewer';
import { StoryCreatorModal } from './components/StoryCreatorModal';
import { ChunkUploadModal } from './components/ChunkUploadModal';
import { MiniAppModal } from './components/MiniAppModal';
import { MiniAppsDirectoryModal } from './components/MiniAppsDirectoryModal';
import { SettingsModal } from './components/SettingsModal';
import { ArchitectureModal } from './components/ArchitectureModal';
import { AdminPanelModal } from './components/AdminPanelModal';
import { AuthModal } from './components/AuthModal';
import { PwaInstallModal } from './components/PwaInstallModal';
import { ForwardMessageModal } from './components/ForwardMessageModal';
import { DeleteMessageModal } from './components/DeleteMessageModal';
import { NotificationBanner, InAppNotification } from './components/NotificationBanner';
import { notificationService } from './utils/notificationSound';
import { parseDeepLinkParams } from './utils/linkHelper';
import { getSenderFriendlyName } from './utils/senderHelper';
import { ShieldCheck, Sparkles, Crown, ShieldAlert, UserX, X, Share2, Trash2 } from 'lucide-react';

const getInitialState = <T,>(key: string, defaultValue: T): T => {
  try {
    const saved = localStorage.getItem(`cp_${key}`);
    if (!saved || saved === 'null' || saved === 'undefined') return defaultValue;
    const parsed = JSON.parse(saved);
    if (parsed === null || parsed === undefined) return defaultValue;
    if (Array.isArray(defaultValue) && (!Array.isArray(parsed) || parsed.length === 0)) {
      return defaultValue;
    }
    return parsed;
  } catch {
    return defaultValue;
  }
};

export default function App() {
  // Authenticated User Session - ONLY loads if user previously logged in
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('cp_user');
      if (saved && saved !== 'null' && saved !== 'undefined') {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && parsed.id) {
          return {
            ...parsed,
            isOnline: true,
            lastSeen: 'هم‌اکنون آنلاین'
          };
        }
      }
    } catch (e) {
      console.warn('Error parsing cp_user:', e);
    }
    return null;
  });
  const [usersList, setUsersList] = useState<User[]>(() => {
    const saved = getInitialState<User[]>('users_list', INITIAL_SYSTEM_USERS);
    return (Array.isArray(saved) && saved.length > 0) ? saved : INITIAL_SYSTEM_USERS;
  });
  const [chats, setChats] = useState<Chat[]>(() => {
    const saved = getInitialState<Chat[]>('chats', INITIAL_CHATS);
    const valid = (Array.isArray(saved) && saved.length > 0) ? saved : INITIAL_CHATS;
    const clean = valid.filter((c) => c.id !== 'chat_godfather_group');
    return clean.length > 0 ? clean : INITIAL_CHATS;
  });
  const [activeChatId, setActiveChatId] = useState<string>(() => {
    const savedChats = getInitialState<Chat[]>('chats', INITIAL_CHATS);
    const valid = (Array.isArray(savedChats) && savedChats.length > 0 ? savedChats : INITIAL_CHATS)
      .filter((c) => c.id !== 'chat_godfather_group');
    return valid[0]?.id || 'chat_saved';
  });
  const [messages, setMessages] = useState<Record<string, Message[]>>(() => {
    const saved = getInitialState<Record<string, Message[]>>('messages', INITIAL_MESSAGES);
    return (saved && typeof saved === 'object' && !Array.isArray(saved)) ? saved : INITIAL_MESSAGES;
  });
  const [stories, setStories] = useState<Story[]>(() => {
    const saved = getInitialState<Story[]>('stories', INITIAL_STORIES);
    return (Array.isArray(saved) && saved.length > 0) ? saved : INITIAL_STORIES;
  });
  const [contacts, setContacts] = useState<Contact[]>(() => {
    const saved = getInitialState<Contact[]>('contacts', INITIAL_CONTACTS);
    return Array.isArray(saved) ? saved : INITIAL_CONTACTS;
  });
  const [folders, setFolders] = useState<ChatFolder[]>(() => {
    const saved = getInitialState<ChatFolder[]>('folders', DEFAULT_FOLDERS);
    return (Array.isArray(saved) && saved.length > 0) ? saved : DEFAULT_FOLDERS;
  });
  const [miniApps] = useState<MiniApp[]>(INITIAL_MINI_APPS);
  const [userStars, setUserStars] = useState<number>(() => currentUser?.starsBalance || 100);
  const [chatWallpaper, setChatWallpaper] = useState<ChatWallpaper>(() => {
    const saved = getInitialState<ChatWallpaper>('chat_wallpaper', DEFAULT_WALLPAPER);
    return (saved && saved.value) ? saved : DEFAULT_WALLPAPER;
  });

  // PWA / Web2App install state
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [isPwaInstallOpen, setIsPwaInstallOpen] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
    };
    const handleInstalled = () => {
      setIsAppInstalled(true);
      setDeferredInstallPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);

    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsAppInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFolder, setActiveFolder] = useState('all');

  // Interactive Modals
  const [isArchitectureOpen, setIsArchitectureOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsInitialSection, setSettingsInitialSection] = useState<any>('main');
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(!currentUser);
  const [isCallOpen, setIsCallOpen] = useState(false);
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [isStoryViewerOpen, setIsStoryViewerOpen] = useState(false);
  const [storyViewerIndex, setStoryViewerIndex] = useState(0);
  const [isStoryCreatorOpen, setIsStoryCreatorOpen] = useState(false);
  const [isChunkUploaderOpen, setIsChunkUploaderOpen] = useState(false);
  const [isMiniAppOpen, setIsMiniAppOpen] = useState(false);
  const [selectedMiniApp, setSelectedMiniApp] = useState<MiniApp | null>(null);
  const [isMiniAppsDirectoryOpen, setIsMiniAppsDirectoryOpen] = useState(false);

  // Chat conversation state
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [isTranslatingChat, setIsTranslatingChat] = useState(false);
  const [mobileView, setMobileView] = useState<'sidebar' | 'chat'>('sidebar');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [forwardingMessages, setForwardingMessages] = useState<Message[] | null>(null);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [deleteModalMessages, setDeleteModalMessages] = useState<Message[] | null>(null);

  // In-App Heads-Up Notification State
  const [inAppNotification, setInAppNotification] = useState<InAppNotification | null>(null);

  const triggerInAppNotification = useCallback(
    (
      message: Partial<Message> & { senderName?: string; senderAvatar?: string; text?: string },
      chatId: string,
      isBroadcast: boolean = false
    ) => {
      const chat = chats.find((c) => c.id === chatId);
      const senderTitle = message.senderName || chat?.title || 'پیام جدید';
      const senderAvatar = message.senderAvatar || chat?.avatar;
      const textPreview =
        message.text ||
        (message.type === 'photo'
          ? '📷 یک تصویر ارسال کرد'
          : message.type === 'voice'
          ? '🎤 یک پیام صوتی ارسال کرد'
          : message.type === 'video'
          ? '🎬 یک ویدیو ارسال کرد'
          : 'یک فایل ارسال کرد');

      // 1. Play sound chime & mobile haptics & background push
      notificationService.notifyIncomingMessage({
        senderName: senderTitle,
        text: textPreview,
        avatar: senderAvatar,
        chatId,
        isCurrentChatActive: activeChatId === chatId,
        isTabFocused: typeof document !== 'undefined' && document.visibilityState === 'visible' && document.hasFocus(),
        onOpenChat: () => {
          setActiveChatId(chatId);
          setMobileView('chat');
        }
      });

      // 2. Display in-app heads-up banner at top of screen
      if (notificationService.isBannerEnabled()) {
        setInAppNotification({
          id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          chatId,
          senderName: senderTitle,
          senderAvatar,
          text: textPreview,
          timestamp: message.timestamp || 'هم‌اکنون',
          isBroadcast
        });
      }
    },
    [activeChatId, chats]
  );

  // Clear message selection whenever active chat switches
  useEffect(() => {
    setSelectedMessageIds([]);
  }, [activeChatId]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeChat: Chat =
    (chats && chats.length > 0 ? (chats.find((c) => c.id === activeChatId) || chats[0]) : null) ||
    INITIAL_CHATS[0];

  const isCurrentChatBlocked = Boolean(
    activeChat?.isBlocked ||
    (currentUser?.blockedUserIds && currentUser.blockedUserIds.includes(activeChat?.id))
  );

  const isSuperAdmin = currentUser?.phone === '09921758505' || currentUser?.role === 'superadmin' || currentUser?.username === 'izatesplay';

  // The creator of the group is ALWAYS the Owner & Manager
  const isChatOwner =
    isSuperAdmin ||
    Boolean(activeChat?.creatorId && (
      activeChat.creatorId === currentUser?.id ||
      activeChat.creatorId === currentUser?.phone ||
      activeChat.creatorId === currentUser?.username ||
      activeChat.creatorId === currentUser?.name
    )) ||
    Boolean(activeChat?.members?.some((m) =>
      (m.id === currentUser?.id || m.username === currentUser?.username || m.phone === currentUser?.phone || m.name === currentUser?.name) &&
      m.role === 'owner'
    )) ||
    activeChat?.isUserAdmin === true ||
    Boolean(!activeChat?.creatorId && (activeChat?.id?.startsWith('group_') || activeChat?.id?.startsWith('channel_')));

  const isAssignedAdmin = Boolean(activeChat?.members?.some(
    (m) => (m.id === currentUser?.id || m.username === currentUser?.username || m.phone === currentUser?.phone || m.name === currentUser?.name) &&
    (m.role === 'admin' || m.role === 'owner')
  ));

  const isChatAdmin = isSuperAdmin || isChatOwner || isAssignedAdmin || activeChat?.isUserAdmin === true;

  // Filter out messages that the user deleted for themselves only
  const deletedForMeIds: string[] = (() => {
    try {
      return JSON.parse(localStorage.getItem('cp_deleted_for_me_message_ids') || '[]');
    } catch {
      return [];
    }
  })();

  const rawChatMessages = (activeChat?.id && messages && messages[activeChat.id]) ? messages[activeChat.id] : [];
  const currentChatMessages = rawChatMessages.filter(
    (m) =>
      (!currentUser || !m.deletedForUserIds?.includes(currentUser.id)) &&
      !deletedForMeIds.includes(m.id)
  );

  // Pinned messages for the active chat
  const pinnedMessages = currentChatMessages.filter((m) => m.isPinned);

  // Filter messages by topic if in a supergroup forum
  const displayedMessages = activeChat?.activeTopicId
    ? currentChatMessages.filter((m) => !m.topicId || m.topicId === activeChat.activeTopicId)
    : currentChatMessages;

  // Pin & Unpin message handler for admins and private chats
  const handleTogglePinMessage = (messageId: string) => {
    setMessages((prev) => {
      const chatMsgs = prev[activeChatId] || [];
      const updated = chatMsgs.map((m) => {
        if (m.id === messageId) {
          const newPinned = !m.isPinned;
          return {
            ...m,
            isPinned: newPinned,
            pinnedAt: newPinned ? new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }) : undefined
          };
        }
        return m;
      });
      return { ...prev, [activeChatId]: updated };
    });

    setChats((prev) =>
      prev.map((c) => {
        if (c.id === activeChatId) {
          const existingPins = c.pinnedMessageIds || [];
          const isNowPinned = !existingPins.includes(messageId);
          const newPins = isNowPinned
            ? [messageId, ...existingPins]
            : existingPins.filter((id) => id !== messageId);
          return { ...c, pinnedMessageIds: newPins };
        }
        return c;
      })
    );
  };

  const handleUnpinMessage = (messageId: string) => {
    handleTogglePinMessage(messageId);
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    if (!highlightedMessageId) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [displayedMessages.length, activeChatId]);

  // Jump to specific message and highlight it smoothly
  const handleSelectSearchedMessage = (messageId: string) => {
    setHighlightedMessageId(messageId);
    setTimeout(() => {
      const el = document.getElementById(`msg-${messageId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 60);

    // Fade out highlight after 3 seconds
    setTimeout(() => {
      setHighlightedMessageId((prev) => (prev === messageId ? null : prev));
    }, 3200);
  };

  // Keyboard shortcut for search (Ctrl+F / Cmd+F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Deep linking: Automatically handle incoming links from any domain (?join=, ?c=, ?u=)
  useEffect(() => {
    const { chatId, channelUsername, username } = parseDeepLinkParams();
    if (!chatId && !channelUsername && !username) return;

    if (chatId) {
      const match = chats.find((c) => c.id === chatId);
      if (match) {
        setActiveChatId(match.id);
        setMobileView('chat');
      } else {
        const defaultMatch = INITIAL_CHATS.find((c) => c.id === chatId);
        if (defaultMatch) {
          setChats((prev) => [defaultMatch, ...prev.filter((c) => c.id !== defaultMatch.id)]);
          setActiveChatId(defaultMatch.id);
          setMobileView('chat');
        }
      }
    } else if (channelUsername) {
      const clean = channelUsername.toLowerCase().replace(/^@+/, '');
      const match = chats.find((c) => c.username?.toLowerCase().replace(/^@+/, '') === clean);
      if (match) {
        setActiveChatId(match.id);
        setMobileView('chat');
      }
    } else if (username) {
      const clean = username.toLowerCase().replace(/^@+/, '');
      const matchedUser = usersList.find(
        (u) => u.username?.toLowerCase().replace(/^@+/, '') === clean || u.phone === clean
      );
      if (matchedUser) {
        const existingChat = chats.find(
          (c) => c.title.toLowerCase() === matchedUser.name.toLowerCase() || c.id === `chat_${matchedUser.id}`
        );
        if (existingChat) {
          setActiveChatId(existingChat.id);
          setMobileView('chat');
        } else {
          const newChat: Chat = {
            id: `chat_${matchedUser.id}`,
            type: 'private',
            title: matchedUser.name,
            avatar: matchedUser.avatar,
            username: matchedUser.username,
            unreadCount: 0,
            isPinned: false,
            isMuted: false,
            lastMessage: {
              text: 'شروع گفتگو',
              timestamp: 'هم‌اکنون',
              isOutgoing: true,
              status: 'read'
            }
          };
          setChats((prev) => [newChat, ...prev]);
          setActiveChatId(newChat.id);
          setMobileView('chat');
        }
      }
    }
  }, [chats.length, usersList.length]);

  // Auto-save local changes to localStorage
  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem('cp_user', JSON.stringify(currentUser));
      } else {
        localStorage.removeItem('cp_user');
      }
      localStorage.setItem('cp_users_list', JSON.stringify(usersList));
      localStorage.setItem('cp_chats', JSON.stringify(chats.filter((c) => c.id !== 'chat_godfather_group')));
      localStorage.setItem('cp_messages', JSON.stringify(messages));
      localStorage.setItem('cp_stories', JSON.stringify(stories));
      localStorage.setItem('cp_contacts', JSON.stringify(contacts));
      localStorage.setItem('cp_folders', JSON.stringify(folders));
      localStorage.setItem('cp_chat_wallpaper', JSON.stringify(chatWallpaper));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  }, [currentUser, usersList, chats, messages, stories, contacts, folders, chatWallpaper]);

  // Reusable cross-device database synchronizer
  const syncFromRemote = useCallback(async () => {
    try {
      const health = await checkApiHealth();
      if (!health.success) return;
      const remote = await fetchRemoteData();
      if (remote.success && remote.data) {
        if (remote.data.users?.length) {
          setUsersList((prev) => {
            const map = new Map(prev.map((u) => [u.id, u]));
            for (const ru of remote.data!.users) {
              if (currentUser && ru.id === currentUser.id) {
                map.set(ru.id, { ...ru, isOnline: true, lastSeen: 'هم‌اکنون آنلاین' });
              } else {
                map.set(ru.id, ru);
              }
            }
            return Array.from(map.values());
          });
        }
        if (remote.data.chats?.length) {
          setChats((prev) => {
            const cleanRemoteChats = remote.data!.chats.filter((rc) => rc.id !== 'chat_godfather_group');
            const remoteMap = new Map(cleanRemoteChats.map((rc) => [rc.id, rc]));
            const updated = prev.filter((c) => c.id !== 'chat_godfather_group').map((local) => {
              const rem = remoteMap.get(local.id);
              if (!rem) return local;
              return {
                ...local,
                ...rem,
                creatorId: rem.creatorId || local.creatorId,
                isUserAdmin: rem.isUserAdmin !== undefined ? rem.isUserAdmin : (local.isUserAdmin ?? true),
                members: (rem.members && rem.members.length > 0) ? rem.members : local.members,
                activeCall: rem.activeCall || local.activeCall
              };
            });
            const deletedIds: string[] = JSON.parse(localStorage.getItem('cp_deleted_chat_ids') || '[]');
            for (const rc of cleanRemoteChats) {
              if (!prev.some((p) => p.id === rc.id) && !deletedIds.includes(rc.id)) {
                updated.push(rc);
              }
            }
            return updated;
          });
        }
        if (remote.data.messages && Object.keys(remote.data.messages).length) {
          setMessages((prev) => {
            const merged = { ...prev };
            for (const [cId, remoteList] of Object.entries(remote.data!.messages)) {
              if (!merged[cId] || merged[cId].length === 0) {
                merged[cId] = remoteList;
              } else {
                const localSet = new Set(merged[cId].map((m) => m.id));
                const nonDuplicates = remoteList.filter((m) => !localSet.has(m.id));
                if (nonDuplicates.length > 0) {
                  merged[cId] = [...merged[cId], ...nonDuplicates];
                  // Notify user of new incoming messages from other devices/users
                  const incomingList = nonDuplicates.filter(
                    (m) => !m.isOutgoing && (!currentUser || m.senderId !== currentUser.id)
                  );
                  if (incomingList.length > 0) {
                    const latest = incomingList[incomingList.length - 1];
                    triggerInAppNotification(latest, cId);
                  }
                }
              }
            }
            return merged;
          });
        }
        if (remote.data.contacts?.length) {
          setContacts((prev) => {
            const map = new Map(prev.map((c) => [c.id, c]));
            for (const cnt of remote.data!.contacts) {
              map.set(cnt.id, cnt);
            }
            return Array.from(map.values());
          });
        }
        if (remote.data.stories?.length) setStories(remote.data.stories);
        if (remote.data.folders?.length) setFolders(remote.data.folders);
      }
    } catch (e) {
      console.warn('Sync from remote error:', e);
    }
  }, [currentUser?.id]);

  // Live Presence Tracking: online only when active on site, offline on leave / blur / unload
  useEffect(() => {
    if (!currentUser) return;

    const markUserOnline = () => {
      if (currentUser?.id) {
        updateUserPresenceOnRemote(currentUser.id, true, 'هم‌اکنون آنلاین');
      }
      setCurrentUser((prev) => {
        if (!prev) return null;
        const updated = { ...prev, isOnline: true, lastSeen: 'هم‌اکنون آنلاین' };
        try {
          localStorage.setItem('cp_user', JSON.stringify(updated));
        } catch {}
        return updated;
      });
      setUsersList((prev) =>
        prev.map((u) => (u.id === currentUser.id ? { ...u, isOnline: true, lastSeen: 'هم‌اکنون آنلاین' } : u))
      );
    };

    const markUserOffline = () => {
      if (currentUser?.id) {
        updateUserPresenceOnRemote(currentUser.id, false, 'آخرین بازدید اخیراً');
      }
      setCurrentUser((prev) => {
        if (!prev) return null;
        const updated = { ...prev, isOnline: false, lastSeen: 'آخرین بازدید اخیراً' };
        try {
          localStorage.setItem('cp_user', JSON.stringify(updated));
        } catch {}
        return updated;
      });
      setUsersList((prev) => {
        const next = prev.map((u) => (u.id === currentUser.id ? { ...u, isOnline: false, lastSeen: 'آخرین بازدید اخیراً' } : u));
        try {
          localStorage.setItem('cp_users_list', JSON.stringify(next));
        } catch {}
        return next;
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        markUserOffline();
      } else if (document.visibilityState === 'visible') {
        markUserOnline();
      }
    };

    const handlePageUnload = () => {
      markUserOffline();
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageUnload);
    window.addEventListener('beforeunload', handlePageUnload);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageUnload);
      window.removeEventListener('beforeunload', handlePageUnload);
    };
  }, [currentUser?.id]);

  // Initial and periodic bidirectional sync with database
  useEffect(() => {
    syncFromRemote();
  }, [syncFromRemote]);

  // Periodic polling every 4s to keep all browsers & devices in sync + live heartbeat
  useEffect(() => {
    if (!currentUser) return;
    // Send immediate heartbeat on login / mount
    updateUserPresenceOnRemote(currentUser.id, true, 'هم‌اکنون آنلاین');

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        // Send heartbeat ping to keep user online
        updateUserPresenceOnRemote(currentUser.id, true, 'هم‌اکنون آنلاین');
        // Poll latest updates from remote database
        syncFromRemote();
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [currentUser?.id, syncFromRemote]);

  // Debounced auto-save to remote database whenever chats or messages are updated
  useEffect(() => {
    if (!currentUser) return;
    const timer = setTimeout(() => {
      const cleanChats = chats.filter((c) => c.id !== 'chat_godfather_group');
      syncAllToRemote({
        users: usersList,
        chats: cleanChats,
        messages,
        contacts,
        stories,
        folders
      }).catch((e) => console.warn('Debounced sync to remote error:', e));
    }, 1500);

    return () => clearTimeout(timer);
  }, [chats, messages, currentUser?.id]);

  const handleSyncDatabase = async () => {
    const payload = {
      users: usersList,
      chats,
      messages,
      contacts,
      stories,
      folders
    };
    return await syncAllToRemote(payload);
  };

  // Secret chat self-destruct timer countdown
  useEffect(() => {
    if (activeChat.type !== 'secret') return;

    const interval = setInterval(() => {
      setMessages((prev) => {
        const chatMsgs = prev[activeChat.id];
        if (!chatMsgs) return prev;

        const updated = chatMsgs
          .map((m) => {
            if (m.type === 'system') return m;
            if (m.selfDestructIn !== undefined) {
              if (m.selfDestructIn <= 1) return null; // remove expired message
              return { ...m, selfDestructIn: m.selfDestructIn - 1 };
            }
            return m;
          })
          .filter(Boolean) as Message[];

        return { ...prev, [activeChat.id]: updated };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeChat.id, activeChat.type]);

  // Handle Send Message
  const handleSendMessage = async (
    text: string,
    type: 'text' | 'photo' | 'video' | 'voice' | 'round_video' | 'document' | 'audio' = 'text',
    options?: {
      isSpoiler?: boolean;
      isSilent?: boolean;
      scheduledFor?: string;
      fileName?: string;
      fileSize?: string;
      mediaUrl?: string;
      audioTitle?: string;
      audioPerformer?: string;
      voiceDuration?: number;
      voiceWaveform?: number[];
    }
  ) => {
    if (!currentUser || isCurrentChatBlocked) {
      return;
    }
    const newMessageId = `msg_${Date.now()}`;
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const newMsg: Message = {
      id: newMessageId,
      chatId: activeChatId,
      topicId: activeChat.activeTopicId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      isOutgoing: true,
      text,
      type,
      fileName: options?.fileName,
      fileSize: options?.fileSize,
      mediaUrl: options?.mediaUrl,
      audioTitle: options?.audioTitle,
      audioPerformer: options?.audioPerformer,
      voiceDuration: (type === 'voice' || type === 'audio') ? (options?.voiceDuration || (type === 'audio' ? 180 : 5)) : undefined,
      voiceWaveform: type === 'voice' ? (options?.voiceWaveform || [25, 45, 80, 60, 90, 70, 30, 60, 85, 40]) : undefined,
      isSpoiler: options?.isSpoiler,
      isSilent: options?.isSilent,
      replyTo: replyingTo
        ? {
            id: replyingTo.id,
            senderName: replyingTo.senderName,
            text: replyingTo.text
          }
        : undefined,
      reactions: [],
      status: 'read',
      timestamp: timeStr,
      selfDestructIn: activeChat.type === 'secret' ? activeChat.secretChatTimer || 10 : undefined
    };

    setMessages((prev) => ({
      ...prev,
      [activeChatId]: [...(prev[activeChatId] || []), newMsg]
    }));

    // Group chats: Simulate real group members reading the message (Seen-by status)
    if (activeChat.type === 'group' || activeChat.type === 'supergroup') {
      const otherMembers = (activeChat.members || []).filter(
        (m) => m.id !== currentUser.id && m.phone !== currentUser.phone && m.username !== currentUser.username
      );
      if (otherMembers.length > 0) {
        setTimeout(() => {
          const readersCount = Math.min(otherMembers.length, 3);
          const readers = otherMembers.slice(0, readersCount).map((m) => ({
            id: m.id,
            name: m.name,
            avatar: m.avatar,
            username: m.username,
            role: m.role,
            seenAt: timeStr
          }));

          setMessages((prev) => {
            const msgs = prev[activeChatId] || [];
            return {
              ...prev,
              [activeChatId]: msgs.map((m) =>
                m.id === newMessageId ? { ...m, seenBy: readers } : m
              )
            };
          });
        }, 1800);
      }
    }

    // Live Real-Time Translation if active
    if (isTranslatingChat && text) {
      translateText(text).then((res) => {
        if (res.success && res.translatedText && res.translatedText !== text) {
          setMessages((prev) => {
            const ms = prev[activeChatId] || [];
            return {
              ...prev,
              [activeChatId]: ms.map((item) =>
                item.id === newMsg.id ? { ...item, translatedText: res.translatedText } : item
              )
            };
          });
        }
      }).catch((e) => console.warn('Auto translate error:', e));
    }

    // Asynchronously persist message to MySQL API bridge
    saveMessageToRemote(newMsg);

    // Clear active chat draft & reply
    setReplyingTo(null);
    setChats((prev) =>
      prev.map((c) =>
        c.id === activeChatId
          ? {
              ...c,
              draft: undefined,
              lastMessage: {
                text:
                  type === 'voice'
                    ? '🎤 پیام صوتی'
                    : type === 'round_video'
                    ? '🎥 پیام ویدیویی گرد'
                    : type === 'photo'
                    ? '📷 عکس'
                    : type === 'video'
                    ? '🎬 ویدیو'
                    : type === 'document'
                    ? `📎 ${options?.fileName || 'فایل'}`
                    : text,
                timestamp: timeStr,
                isOutgoing: true,
                status: 'read'
              }
            }
          : c
      )
    );

    // Bot automatic response simulation
    if (activeChat.type === 'bot') {
      setTimeout(() => {
        handleBotResponse(activeChat.id, text);
      }, 700);
    }
  };

  // Bot intelligence handler
  const handleBotResponse = (botId: string, userText: string) => {
    let reply = 'دستور شما دریافت شد. برای دیدن راهنما /help را تایپ کنید.';
    if (userText.includes('/start')) {
      reply = `خوش آمدید! دستیار هوشمند GODFATHER SQUAD در خدمت شماست.\n• /premium : بررسی امکانات پریمیوم\n• /stars : دریافت ستاره‌های آزمایشی\n• /help : راهنما`;
    } else if (userText.includes('/premium')) {
      reply = `✨ وضعیت اکانت: ${currentUser?.isPremium ? 'پریمیوم فعال' : 'استاندارد رایگان'}\nسقف آپلود: ${currentUser?.isPremium ? '۴ گیگابایت' : '۲ گیگابایت'}\nمبدل ویس: فعال`;
    } else if (userText.includes('/stars')) {
      setUserStars((prev) => prev + 50);
      reply = `⭐ ۵۰ ستاره GODFATHER SQUAD به کیف‌پول شما افزوده شد! موجودی فعلی: ${userStars + 50} Stars`;
    } else if (botId === 'chat_bot_crypto') {
      reply = `📊 استعلام زنده قیمت:\nTON: $6.84\nBTC: $94,200\nETH: $3,450\nتراکنش‌ها روی بلاکچین سریع‌تر از ۰.۸ ثانیه تایید می‌شوند.`;
    }

    const botMsg: Message = {
      id: `bot_msg_${Date.now()}`,
      chatId: botId,
      senderId: botId,
      senderName: activeChat.title,
      senderAvatar: activeChat.avatar,
      isOutgoing: false,
      text: reply,
      type: 'text',
      reactions: [],
      status: 'read',
      timestamp: 'هم‌اکنون'
    };

    setMessages((prev) => ({
      ...prev,
      [botId]: [...(prev[botId] || []), botMsg]
    }));

    triggerInAppNotification(botMsg, botId);
  };

  // Transcribe voice message with backend API or AI
  const handleTranscribeMessage = async (messageId: string) => {
    setMessages((prev) => {
      const chatMsgs = prev[activeChatId] || [];
      return {
        ...prev,
        [activeChatId]: chatMsgs.map((m) =>
          m.id === messageId ? { ...m, transcript: 'در حال رونویسی توسط موتور هوش مصنوعی Whisper...' } : m
        )
      };
    });

    try {
      const res = await fetch('/api/ai/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioDescription: 'پیام صوتی فنی درباره معماری GODFATHER SQUAD' })
      });
      const data = await res.json();
      if (data.transcript) {
        setMessages((prev) => {
          const chatMsgs = prev[activeChatId] || [];
          return {
            ...prev,
            [activeChatId]: chatMsgs.map((m) =>
              m.id === messageId ? { ...m, transcript: data.transcript } : m
            )
          };
        });
      }
    } catch {
      setMessages((prev) => {
        const chatMsgs = prev[activeChatId] || [];
        return {
          ...prev,
          [activeChatId]: chatMsgs.map((m) =>
            m.id === messageId
              ? { ...m, transcript: 'سلام! جلسه بازبینی معماری پایگاه‌داده ساعت ۵ بعدازظهر برگزار می‌شود.' }
              : m
          )
        };
      });
    }
  };

  // Toggle Live Chat Translation
  const handleToggleTranslate = async () => {
    const nextState = !isTranslatingChat;
    setIsTranslatingChat(nextState);

    if (nextState) {
      const msgsToTranslate = currentChatMessages.filter((m) => m.text && !m.translatedText);
      for (const m of msgsToTranslate) {
        try {
          const res = await translateText(m.text);
          if (res.success && res.translatedText && res.translatedText !== m.text) {
            setMessages((prev) => {
              const ms = prev[activeChatId] || [];
              return {
                ...prev,
                [activeChatId]: ms.map((item) =>
                  item.id === m.id ? { ...item, translatedText: res.translatedText } : item
                )
              };
            });
          }
        } catch (err) {
          console.warn('Translation error:', err);
        }
      }
    }
  };

  // React to message
  const handleReact = (messageId: string, emoji: string, isPremiumEmoji?: boolean) => {
    setMessages((prev) => {
      const chatMsgs = prev[activeChatId] || [];
      const updated = chatMsgs.map((m) => {
        if (m.id !== messageId) return m;

        const existingReactionIndex = m.reactions.findIndex((r) => r.emoji === emoji);
        let newReactions = [...m.reactions];

        if (existingReactionIndex > -1) {
          const curr = newReactions[existingReactionIndex];
          if (curr.userReacted) {
            if (curr.count <= 1) {
              newReactions.splice(existingReactionIndex, 1);
            } else {
              newReactions[existingReactionIndex] = {
                ...curr,
                count: curr.count - 1,
                userReacted: false
              };
            }
          } else {
            newReactions[existingReactionIndex] = {
              ...curr,
              count: curr.count + 1,
              userReacted: true
            };
          }
        } else {
          newReactions.push({
            emoji,
            count: 1,
            userReacted: true,
            isPremium: isPremiumEmoji
          });
        }

        return { ...m, reactions: newReactions };
      });

      return { ...prev, [activeChatId]: updated };
    });
  };

  // Open delete modal for a specific message
  const handleDeleteMessage = (messageId: string) => {
    const target = (messages[activeChatId] || []).find((m) => m.id === messageId);
    if (target) {
      setDeleteModalMessages([target]);
    }
  };

  // 1. Delete messages for everyone / both sides (دو طرفه)
  const handleConfirmDeleteForEveryone = () => {
    if (!deleteModalMessages || deleteModalMessages.length === 0) return;
    const idsToDelete = new Set(deleteModalMessages.map((m) => m.id));

    setMessages((prev) => ({
      ...prev,
      [activeChatId]: (prev[activeChatId] || []).filter((m) => !idsToDelete.has(m.id))
    }));

    // Update active chat's last message if deleted message was the last one
    setChats((prev) =>
      prev.map((c) => {
        if (c.id === activeChatId) {
          const remaining = (messages[activeChatId] || []).filter((m) => !idsToDelete.has(m.id));
          const lastRemaining = remaining[remaining.length - 1];
          return {
            ...c,
            lastMessage: lastRemaining
              ? {
                  text: lastRemaining.text || (lastRemaining.type === 'photo' ? '📷 عکس' : '📎 فایل'),
                  timestamp: lastRemaining.timestamp,
                  isOutgoing: lastRemaining.isOutgoing,
                  status: lastRemaining.status
                }
              : undefined
          };
        }
        return c;
      })
    );

    setSelectedMessageIds((prev) => prev.filter((id) => !idsToDelete.has(id)));
    setDeleteModalMessages(null);
  };

  // 2. Delete messages only for me (یک طرفه)
  const handleConfirmDeleteForMeOnly = () => {
    if (!currentUser || !deleteModalMessages || deleteModalMessages.length === 0) return;
    const idsToDelete = new Set(deleteModalMessages.map((m) => m.id));

    try {
      const stored: string[] = JSON.parse(localStorage.getItem('cp_deleted_for_me_message_ids') || '[]');
      const updated = Array.from(new Set([...stored, ...Array.from(idsToDelete)]));
      localStorage.setItem('cp_deleted_for_me_message_ids', JSON.stringify(updated));
    } catch (_) {}

    setMessages((prev) => ({
      ...prev,
      [activeChatId]: (prev[activeChatId] || []).map((m) => {
        if (idsToDelete.has(m.id)) {
          return {
            ...m,
            deletedForUserIds: [...(m.deletedForUserIds || []), currentUser.id]
          };
        }
        return m;
      })
    }));

    setSelectedMessageIds((prev) => prev.filter((id) => !idsToDelete.has(id)));
    setDeleteModalMessages(null);
  };

  // Start Audio/Video Call (Group, Channel or 1-on-1)
  const handleStartCall = (type: 'audio' | 'video') => {
    if (!currentUser) return;
    setCallType(type);
    const isGroupOrChannel = activeChat.type === 'group' || activeChat.type === 'supergroup' || activeChat.type === 'channel';

    if (isGroupOrChannel) {
      if (!activeChat.activeCall?.isActive) {
        // Only admin/creator can initiate the call
        if (!isChatAdmin) {
          return;
        }

        const newCallInfo = {
          isActive: true,
          startedBy: currentUser.id,
          startedByName: currentUser.name,
          startedAt: 'هم‌اکنون',
          participantsCount: 1,
          participants: [
            {
              id: currentUser.id,
              name: currentUser.name,
              avatar: currentUser.avatar,
              isSpeaking: false,
              hasVideo: type === 'video',
              role: 'مدیر گروه'
            }
          ]
        };

        setChats((prev) =>
          prev.map((c) => (c.id === activeChatId ? { ...c, activeCall: newCallInfo } : c))
        );
      } else {
        // Call is already active -> User is joining
        setChats((prev) =>
          prev.map((c) => {
            if (c.id === activeChatId && c.activeCall) {
              const alreadyIn = c.activeCall.participants?.some((p) => p.id === currentUser.id);
              if (!alreadyIn) {
                const updatedList = [
                  ...(c.activeCall.participants || []),
                  {
                    id: currentUser.id,
                    name: currentUser.name,
                    avatar: currentUser.avatar,
                    isSpeaking: false,
                    hasVideo: type === 'video',
                    role: isChatAdmin ? 'مدیر' : 'عضو'
                  }
                ];
                return {
                  ...c,
                  activeCall: {
                    ...c.activeCall,
                    participantsCount: updatedList.length,
                    participants: updatedList
                  }
                };
              } else {
                // If user is already in call, update video status
                const updatedList = (c.activeCall.participants || []).map((p) =>
                  p.id === currentUser.id ? { ...p, hasVideo: type === 'video' } : p
                );
                return {
                  ...c,
                  activeCall: {
                    ...c.activeCall,
                    participants: updatedList
                  }
                };
              }
            }
            return c;
          })
        );
      }
    }

    setIsCallOpen(true);
  };

  // Leave Call without ending for others
  const handleLeaveCall = () => {
    setIsCallOpen(false);
    if (!currentUser) return;
    const isGroupOrChannel = activeChat.type === 'group' || activeChat.type === 'supergroup' || activeChat.type === 'channel';
    if (isGroupOrChannel && activeChat.activeCall?.isActive) {
      setChats((prev) =>
        prev.map((c) => {
          if (c.id === activeChatId && c.activeCall) {
            const updatedParticipants = (c.activeCall.participants || []).filter((p) => p.id !== currentUser.id);
            return {
              ...c,
              activeCall: {
                ...c.activeCall,
                participantsCount: Math.max(1, updatedParticipants.length),
                participants: updatedParticipants
              }
            };
          }
          return c;
        })
      );
    }
  };

  // Admin ends call for everyone
  const handleEndCallForEveryone = () => {
    setIsCallOpen(false);
    setChats((prev) =>
      prev.map((c) => (c.id === activeChatId ? { ...c, activeCall: undefined } : c))
    );
  };

  // ==============================================================
  // GROUP & CHANNEL CALL MUSIC (DJ BOT) HANDLERS
  // ==============================================================

  // 1. Add song to call queue (Any member can suggest/add a track)
  const handleAddSongToCallQueue = (track: CallMusicTrack, autoPlayIfAdmin = false) => {
    if (!currentUser) return;
    setChats((prev) =>
      prev.map((c) => {
        if (c.id === activeChatId) {
          const currentCall = c.activeCall || {
            isActive: true,
            startedBy: currentUser.id,
            startedByName: currentUser.name,
            startedAt: 'هم‌اکنون',
            participantsCount: 1,
            participants: [
              {
                id: currentUser.id,
                name: currentUser.name,
                avatar: currentUser.avatar,
                isSpeaking: false,
                role: 'مدیر گروه'
              }
            ]
          };

          const currentMusic = currentCall.musicPlayer || {
            isPlaying: false,
            currentTrack: null,
            queue: [],
            volume: 0.8
          };

          const queue = [...currentMusic.queue];
          const exists = queue.some((t) => t.id === track.id || (t.audioUrl && t.audioUrl === track.audioUrl));
          if (!exists) {
            queue.push(track);
          }

          const shouldAutoPlay = (autoPlayIfAdmin && isChatAdmin) || (!currentMusic.currentTrack && isChatAdmin);

          return {
            ...c,
            activeCall: {
              ...currentCall,
              musicPlayer: {
                ...currentMusic,
                queue,
                currentTrack: shouldAutoPlay ? track : (currentMusic.currentTrack || track),
                isPlaying: shouldAutoPlay ? true : currentMusic.isPlaying
              }
            }
          };
        }
        return c;
      })
    );
  };

  // 2. Play specific track in call (Admin only)
  const handlePlayCallTrack = (track: CallMusicTrack) => {
    if (!isChatAdmin) return;
    setChats((prev) =>
      prev.map((c) => {
        if (c.id === activeChatId && c.activeCall) {
          return {
            ...c,
            activeCall: {
              ...c.activeCall,
              musicPlayer: {
                ...(c.activeCall.musicPlayer || { queue: [], volume: 0.8 }),
                currentTrack: track,
                isPlaying: true
              }
            }
          };
        }
        return c;
      })
    );
  };

  // 3. Toggle Play / Pause in call (Admin only)
  const handleToggleCallMusicPlay = () => {
    if (!isChatAdmin) return;
    setChats((prev) =>
      prev.map((c) => {
        if (c.id === activeChatId && c.activeCall?.musicPlayer) {
          const player = c.activeCall.musicPlayer;
          return {
            ...c,
            activeCall: {
              ...c.activeCall,
              musicPlayer: {
                ...player,
                isPlaying: !player.isPlaying
              }
            }
          };
        }
        return c;
      })
    );
  };

  // 4. Remove song from queue (Admin only)
  const handleRemoveCallTrack = (trackId: string) => {
    if (!isChatAdmin) return;
    setChats((prev) =>
      prev.map((c) => {
        if (c.id === activeChatId && c.activeCall?.musicPlayer) {
          const player = c.activeCall.musicPlayer;
          const updatedQueue = player.queue.filter((t) => t.id !== trackId);
          const isCurrent = player.currentTrack?.id === trackId;
          const nextTrack = isCurrent ? (updatedQueue[0] || null) : player.currentTrack;
          return {
            ...c,
            activeCall: {
              ...c.activeCall,
              musicPlayer: {
                ...player,
                queue: updatedQueue,
                currentTrack: nextTrack,
                isPlaying: isCurrent ? Boolean(nextTrack) : player.isPlaying
              }
            }
          };
        }
        return c;
      })
    );
  };

  // 5. Skip to next track in queue (Admin only)
  const handleSkipNextCallMusic = () => {
    if (!isChatAdmin) return;
    setChats((prev) =>
      prev.map((c) => {
        if (c.id === activeChatId && c.activeCall?.musicPlayer) {
          const player = c.activeCall.musicPlayer;
          if (player.queue.length === 0) return c;
          const currentIndex = player.queue.findIndex((t) => t.id === player.currentTrack?.id);
          const nextIndex = currentIndex >= 0 && currentIndex + 1 < player.queue.length ? currentIndex + 1 : 0;
          const nextTrack = player.queue[nextIndex] || player.currentTrack;
          return {
            ...c,
            activeCall: {
              ...c.activeCall,
              musicPlayer: {
                ...player,
                currentTrack: nextTrack,
                isPlaying: true
              }
            }
          };
        }
        return c;
      })
    );
  };

  // 6. Skip to previous track in queue (Admin only)
  const handleSkipPrevCallMusic = () => {
    if (!isChatAdmin) return;
    setChats((prev) =>
      prev.map((c) => {
        if (c.id === activeChatId && c.activeCall?.musicPlayer) {
          const player = c.activeCall.musicPlayer;
          if (player.queue.length === 0) return c;
          const currentIndex = player.queue.findIndex((t) => t.id === player.currentTrack?.id);
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : player.queue.length - 1;
          const prevTrack = player.queue[prevIndex] || player.currentTrack;
          return {
            ...c,
            activeCall: {
              ...c.activeCall,
              musicPlayer: {
                ...player,
                currentTrack: prevTrack,
                isPlaying: true
              }
            }
          };
        }
        return c;
      })
    );
  };

  // 7. Set music volume
  const handleSetCallMusicVolume = (volume: number) => {
    setChats((prev) =>
      prev.map((c) => {
        if (c.id === activeChatId && c.activeCall?.musicPlayer) {
          return {
            ...c,
            activeCall: {
              ...c.activeCall,
              musicPlayer: {
                ...c.activeCall.musicPlayer,
                volume
              }
            }
          };
        }
        return c;
      })
    );
  };

  // 8. Toggle loop
  const handleToggleCallMusicLoop = () => {
    if (!isChatAdmin) return;
    setChats((prev) =>
      prev.map((c) => {
        if (c.id === activeChatId && c.activeCall?.musicPlayer) {
          return {
            ...c,
            activeCall: {
              ...c.activeCall,
              musicPlayer: {
                ...c.activeCall.musicPlayer,
                isLooping: !c.activeCall.musicPlayer.isLooping
              }
            }
          };
        }
        return c;
      })
    );
  };

  // Publish Story
  const handlePublishStory = (newStoryData: Partial<Story>) => {
    if (!currentUser) return;
    const newStory: Story = {
      id: `story_${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      mediaUrl: newStoryData.mediaUrl || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80',
      mediaType: 'image',
      caption: newStoryData.caption,
      expiryHours: newStoryData.expiryHours || 24,
      timestamp: 'هم‌اکنون',
      viewsCount: 0,
      isSeen: false,
      isStealth: newStoryData.isStealth
    };

    setStories([newStory, ...stories]);
    saveStoryToRemote(newStory);
  };

  // Update user profile
  const handleUpdateUser = (updated: Partial<User>) => {
    if (!currentUser) return;
    setCurrentUser((prev) => (prev ? { ...prev, ...updated } : null));
    setUsersList((prev) =>
      prev.map((u) => (u.id === currentUser.id ? { ...u, ...updated } : u))
    );
  };

  // Admin Management Handlers
  const handleToggleUserPremium = (userId: string) => {
    setUsersList((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const newPremium = !u.isPremium;
          if (currentUser?.id === userId) {
            setCurrentUser((curr) => (curr ? { ...curr, isPremium: newPremium } : null));
          }
          return { ...u, isPremium: newPremium };
        }
        return u;
      })
    );
  };

  const handleChangeUserRole = (userId: string, newRole: 'superadmin' | 'admin' | 'moderator' | 'member') => {
    setUsersList((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          if (currentUser?.id === userId) {
            setCurrentUser((curr) => (curr ? { ...curr, role: newRole } : null));
          }
          return { ...u, role: newRole };
        }
        return u;
      })
    );
  };

  const handleAddStarsToUser = (userId: string, amount: number) => {
    setUsersList((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const newBalance = (u.starsBalance || 0) + amount;
          if (currentUser?.id === userId) {
            setUserStars(newBalance);
            setCurrentUser((curr) => (curr ? { ...curr, starsBalance: newBalance } : null));
          }
          return { ...u, starsBalance: newBalance };
        }
        return u;
      })
    );
  };

  const handleToggleBanUser = (userId: string) => {
    setUsersList((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, isBanned: !u.isBanned } : u))
    );
  };

  const handleAddMemberToChat = (chatId: string, memberName: string) => {
    const newMemberId = `m_${Date.now()}`;
    const newMember: ChatMember = {
      id: newMemberId,
      name: memberName,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      role: 'member',
      roleTitle: 'عضو عادی',
      isOnline: true,
      bio: ''
    };

    setChats((prev) =>
      prev.map((c) => {
        if (c.id === chatId) {
          const currentMembers = c.members || [];
          return {
            ...c,
            membersCount: Math.max(1, (c.membersCount || currentMembers.length) + 1),
            members: [...currentMembers, newMember]
          };
        }
        return c;
      })
    );
    const systemMsg: Message = {
      id: `msg_sys_${Date.now()}`,
      chatId,
      senderId: 'system',
      senderName: 'سیستم GODFATHER SQUAD',
      senderAvatar: '',
      timestamp: 'هم‌اکنون',
      type: 'text',
      text: `${memberName} به گفتگو پیوست.`,
      isOutgoing: false,
      reactions: [],
      status: 'read'
    };
    setMessages((prev) => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), systemMsg]
    }));
    saveMessageToRemote(systemMsg);
  };

  const handleToggleChatAdmin = (chatId: string, memberId: string, grantAdmin: boolean) => {
    let affectedMemberName = 'کاربر';
    setChats((prev) =>
      prev.map((c) => {
        if (c.id === chatId) {
          const currentMembers = c.members || [];
          const updatedMembers = currentMembers.map((m) => {
            if (m.id === memberId) {
              affectedMemberName = m.name;
              return {
                ...m,
                role: (grantAdmin ? 'admin' : 'member') as ('admin' | 'member'),
                roleTitle: grantAdmin ? '🛡️ ادمین گروه' : 'عضو عادی'
              };
            }
            return m;
          });
          return {
            ...c,
            members: updatedMembers
          };
        }
        return c;
      })
    );

    const systemMsg: Message = {
      id: `msg_sys_admin_${Date.now()}`,
      chatId,
      senderId: 'system',
      senderName: 'سیستم GODFATHER SQUAD',
      senderAvatar: '',
      timestamp: 'هم‌اکنون',
      type: 'text',
      text: grantAdmin
        ? `👑 مدیر گروه دسترسی ادمینی را به «${affectedMemberName}» اعطا کرد.`
        : `دسترسی ادمینی از «${affectedMemberName}» توسط مدیر گروه سلب شد.`,
      isOutgoing: false,
      reactions: [],
      status: 'read'
    };
    setMessages((prev) => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), systemMsg]
    }));
  };

  const handleBroadcastMessage = (title: string, content: string, pinToChannels: boolean) => {
    if (!currentUser) return;
    const broadcastText = `📢 [اطلاعیه مدیریت ارشد]: ${title}\n\n${content}`;
    // Broadcast to supergroup forum and official channel
    const targets = ['chat_supergroup_forum', 'chat_channel_official'];
    targets.forEach((targetId) => {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const msg: Message = {
        id: `broadcast_${Date.now()}_${targetId}`,
        chatId: targetId,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatar: currentUser.avatar,
        isOutgoing: false,
        text: broadcastText,
        type: 'text',
        reactions: [{ emoji: '👑', count: 12, isPremium: true }, { emoji: '🔥', count: 25 }],
        status: 'read',
        timestamp: timeStr
      };
      setMessages((prev) => ({
        ...prev,
        [targetId]: [...(prev[targetId] || []), msg]
      }));
    });
  };

  // Switch Forum topic
  const handleSelectTopic = (topicId: string) => {
    setChats((prev) =>
      prev.map((c) => (c.id === activeChatId ? { ...c, activeTopicId: topicId } : c))
    );
  };

  // Handle Login / Registration success: immediately loads account data from database across any browser/device
  const handleLoginSuccess = async (user: User) => {
    const liveUser: User = {
      ...user,
      isOnline: true,
      lastSeen: 'هم‌اکنون آنلاین'
    };
    setCurrentUser(liveUser);
    try {
      localStorage.setItem('cp_user', JSON.stringify(liveUser));
    } catch {}

    // Immediately mark user as online on remote server
    updateUserPresenceOnRemote(liveUser.id, true, 'هم‌اکنون آنلاین');

    // Add or update user in usersList so they immediately appear in Admin Panel user list!
    setUsersList((prev) => {
      const existsIndex = prev.findIndex(
        (u) =>
          u.id === user.id ||
          u.phone === user.phone ||
          (u.username && user.username && u.username.toLowerCase() === user.username.toLowerCase())
      );
      let nextList: User[];
      if (existsIndex >= 0) {
        nextList = [...prev];
        nextList[existsIndex] = { ...nextList[existsIndex], ...liveUser };
      } else {
        nextList = [liveUser, ...prev];
      }
      try {
        localStorage.setItem('cp_users_list', JSON.stringify(nextList));
      } catch {}
      return nextList;
    });

    if (user.starsBalance) {
      setUserStars(user.starsBalance);
    }

    // Immediately load all database chats, messages, and content for this account!
    try {
      const remote = await fetchRemoteData();
      if (remote.success && remote.data) {
        if (remote.data.users?.length) {
          setUsersList(remote.data.users.map((u) => u.id === liveUser.id ? { ...u, isOnline: true, lastSeen: 'هم‌اکنون آنلاین' } : u));
        }
        if (remote.data.chats?.length) {
          const cleanChats = remote.data.chats.filter((c) => c.id !== 'chat_godfather_group');
          if (cleanChats.length > 0) {
            setChats(cleanChats);
            setActiveChatId(cleanChats[0].id);
          }
        }
        if (remote.data.messages && Object.keys(remote.data.messages).length > 0) {
          setMessages(remote.data.messages);
        }
        if (remote.data.contacts?.length) {
          setContacts(remote.data.contacts);
        }
        if (remote.data.stories?.length) {
          setStories(remote.data.stories);
        }
        if (remote.data.folders?.length) {
          setFolders(remote.data.folders);
        }
      }
    } catch (e) {
      console.warn('Initial remote load error after login:', e);
    }

    setIsAuthOpen(false);
  };

  // Secure Logout: marks user offline, clears session, closes modals, blocks access until login
  const handleLogout = () => {
    if (currentUser) {
      // Mark user offline on server immediately
      updateUserPresenceOnRemote(currentUser.id, false, 'آخرین بازدید اخیراً');

      setUsersList((prev) => {
        const next = prev.map((u) =>
          u.id === currentUser.id ? { ...u, isOnline: false, lastSeen: 'آخرین بازدید اخیراً' } : u
        );
        try {
          localStorage.setItem('cp_users_list', JSON.stringify(next));
        } catch {}
        return next;
      });
    }
    try {
      localStorage.removeItem('cp_user');
      localStorage.removeItem('cp_chats');
      localStorage.removeItem('cp_messages');
    } catch {}
    setCurrentUser(null);
    setChats(INITIAL_CHATS);
    setActiveChatId('chat_saved');
    setMessages(INITIAL_MESSAGES);
    setIsAdminPanelOpen(false);
    setIsSettingsOpen(false);
    setIsCallOpen(false);
    setIsStoryViewerOpen(false);
    setIsStoryCreatorOpen(false);
    setIsChunkUploaderOpen(false);
    setIsMiniAppOpen(false);
    setIsMiniAppsDirectoryOpen(false);
    setIsArchitectureOpen(false);
    setIsAuthOpen(true);
  };

  // Delete chat permanently (ensuring chats remain persistent until explicitly deleted)
  const handleDeleteChat = (chatId: string) => {
    deleteChatOnRemote(chatId);
    try {
      const deletedIds: string[] = JSON.parse(localStorage.getItem('cp_deleted_chat_ids') || '[]');
      if (!deletedIds.includes(chatId)) {
        deletedIds.push(chatId);
        localStorage.setItem('cp_deleted_chat_ids', JSON.stringify(deletedIds));
      }
    } catch (e) {
      console.warn('Error saving deleted chat id', e);
    }

    setChats((prev) => {
      const remaining = prev.filter((c) => c.id !== chatId);
      return remaining.length > 0 ? remaining : [INITIAL_CHATS[0]];
    });
    setMessages((prev) => {
      const copy = { ...prev };
      delete copy[chatId];
      return copy;
    });
    if (activeChatId === chatId) {
      const nextChat = chats.find((c) => c.id !== chatId) || INITIAL_CHATS[0];
      setActiveChatId(nextChat.id);
    }
  };

  // Clear chat history
  const handleClearChatHistory = (chatId: string) => {
    setMessages((prev) => ({
      ...prev,
      [chatId]: []
    }));
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, lastMessage: undefined, draft: undefined } : c))
    );
  };

  // Pin/Unpin chat in sidebar list
  const handleTogglePinChat = (chatId: string) => {
    setChats((prev) => {
      const updated = prev.map((c) => (c.id === chatId ? { ...c, isPinned: !c.isPinned } : c));
      return [...updated].sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
    });
  };

  // Mute/Unmute chat
  const handleToggleMuteChat = (chatId: string) => {
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, isMuted: !c.isMuted } : c))
    );
  };

  // Block/Unblock user
  const handleToggleBlockUser = (userIdOrChatId: string, userName?: string) => {
    if (!currentUser) return;
    const currentBlocked = currentUser.blockedUserIds || [];
    const isCurrentlyBlocked = currentBlocked.includes(userIdOrChatId);
    const updatedBlocked = isCurrentlyBlocked
      ? currentBlocked.filter((id) => id !== userIdOrChatId)
      : [...currentBlocked, userIdOrChatId];

    handleUpdateUser({ blockedUserIds: updatedBlocked });

    setChats((prev) =>
      prev.map((c) => {
        if (c.id === userIdOrChatId) {
          return { ...c, isBlocked: !isCurrentlyBlocked };
        }
        return c;
      })
    );
  };

  // Forward messages to any chat (supports single or multi-message forward)
  const handleForwardMessages = (targetChatId: string, msgsToForward: Message[]) => {
    if (!currentUser || !msgsToForward || msgsToForward.length === 0) return;
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const newFwdMessages: Message[] = msgsToForward.map((msg, index) => ({
      id: `fwd_${Date.now()}_${index}`,
      chatId: targetChatId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      isOutgoing: true,
      text: msg.text,
      type: msg.type,
      mediaUrl: msg.mediaUrl,
      fileName: msg.fileName,
      fileSize: msg.fileSize,
      voiceDuration: msg.voiceDuration,
      voiceWaveform: msg.voiceWaveform,
      isSpoiler: msg.isSpoiler,
      forwardFrom: {
        originalSender: getSenderFriendlyName(
          msg.forwardFrom?.originalSender || msg.senderName,
          {
            senderId: msg.senderId,
            usersList,
            contacts,
            currentUser: currentUser || undefined,
            chats,
            chatId: msg.chatId
          }
        )
      },
      reactions: [],
      status: 'sent',
      timestamp: timeStr
    }));

    setMessages((prev) => ({
      ...prev,
      [targetChatId]: [...(prev[targetChatId] || []), ...newFwdMessages]
    }));

    newFwdMessages.forEach((fwd) => saveMessageToRemote(fwd));

    const lastMsg = msgsToForward[msgsToForward.length - 1];
    setChats((prev) =>
      prev.map((c) =>
        c.id === targetChatId
          ? {
              ...c,
              lastMessage: {
                text: msgsToForward.length > 1
                  ? `فوروارد ${msgsToForward.length} پیام`
                  : `فوروارد: ${lastMsg.text || 'رسانه'}`,
                timestamp: timeStr,
                isOutgoing: true,
                status: 'sent'
              }
            }
          : c
      )
    );

    setSelectedMessageIds([]);
    setForwardingMessages(null);

    // Switch to target chat so user can see forwarded messages
    setActiveChatId(targetChatId);
    setMobileView('chat');
  };

  // Multiple Profile Photos update for Group/Channel
  const handleUpdateChatPhotos = (chatId: string, photos: string[], mainAvatar: string) => {
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, avatars: photos, avatar: mainAvatar } : c))
    );
  };

  // Mandatory Authentication Gateway:
  // If user is not logged in (first visit, session cleared, or after logout),
  // they MUST authenticate via Login or Register first! No access to main app or super admin panel without logging in!
  if (!currentUser) {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center bg-[#0e1621] text-white overflow-hidden p-0 sm:p-4">
        <AuthModal
          isOpen={true}
          onClose={() => {}}
          onLoginSuccess={handleLoginSuccess}
          currentUser={null}
          usersList={usersList}
          chats={chats}
          isMandatory={true}
        />
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-[#0e1621] text-white">
      {/* Sidebar (Chat list, folders, stories) */}
      <div
        className={`${
          mobileView === 'chat' ? 'hidden md:flex' : 'flex'
        } h-full w-full md:w-80 lg:w-96 flex-shrink-0 transition-all duration-200`}
      >
        <Sidebar
          chats={chats}
          activeChatId={activeChatId}
          onSelectChat={(id) => {
            setActiveChatId(id);
            setMobileView('chat');
          }}
          stories={stories}
          onOpenStory={(index) => {
            setStoryViewerIndex(index);
            setIsStoryViewerOpen(true);
          }}
          onOpenCreateStory={() => setIsStoryCreatorOpen(true)}
          currentUser={currentUser}
          onOpenSettings={(sec) => {
            setSettingsInitialSection(sec || 'main');
            setIsSettingsOpen(true);
          }}
          onOpenArchitecture={() => {
            if (isSuperAdmin) {
              setIsArchitectureOpen(true);
            }
          }}
          onOpenMiniApps={() => setIsMiniAppsDirectoryOpen(true)}
          onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
          onOpenAuth={() => setIsAuthOpen(true)}
          onLogout={handleLogout}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activeFolder={activeFolder}
          onSelectFolder={setActiveFolder}
          contacts={contacts}
          onAddContact={(newC) => {
            setContacts((prev) => [newC, ...prev]);
          }}
          onAddNewChat={(newChat) => {
            const creatorMember: ChatMember = {
              id: currentUser.id,
              name: currentUser.name,
              username: currentUser.username,
              phone: currentUser.phone,
              avatar: currentUser.avatar,
              role: 'owner',
              roleTitle: '👑 مدیر و سازنده گروه (Owner)',
              isOnline: true,
              bio: currentUser.bio || ''
            };
            const chatWithOwner: Chat = {
              ...newChat,
              creatorId: currentUser.id,
              isUserAdmin: true,
              members: newChat.members && newChat.members.length > 0 ? newChat.members : [creatorMember]
            };
            setChats((prev) => [chatWithOwner, ...prev.filter((c) => c.id !== chatWithOwner.id)]);
            setActiveChatId(chatWithOwner.id);
            setMobileView('chat');
            saveChatToRemote(chatWithOwner);
          }}
          usersList={usersList}
          onOpenPwaInstall={() => setIsPwaInstallOpen(true)}
          onDeleteChat={handleDeleteChat}
          onClearHistory={handleClearChatHistory}
          onTogglePinChat={handleTogglePinChat}
          onToggleMuteChat={handleToggleMuteChat}
          onToggleBlockUser={handleToggleBlockUser}
        />
      </div>

      {/* Main Chat Conversation View */}
      <div
        className={`${
          mobileView === 'sidebar' ? 'hidden md:flex' : 'flex'
        } flex-1 h-full flex flex-col bg-[#0e1621] relative overflow-hidden transition-all duration-200`}
      >
        {/* Chat Header with responsive Mobile Back Arrow */}
        <ChatHeader
          chat={activeChat}
          currentUser={currentUser}
          onStartCall={handleStartCall}
          onOpenMiniApp={() => {
            setSelectedMiniApp(miniApps[0]);
            setIsMiniAppOpen(true);
          }}
          isTranslating={isTranslatingChat}
          onToggleTranslate={handleToggleTranslate}
          onSelectTopic={handleSelectTopic}
          onBackMobile={() => setMobileView('sidebar')}
          usersList={usersList}
          onAddMemberToChat={(memberName) => handleAddMemberToChat(activeChatId, memberName)}
          onUpdateBio={(newBio) => {
            setChats((prev) =>
              prev.map((c) => (c.id === activeChatId ? { ...c, description: newBio } : c))
            );
          }}
          onToggleChatAdmin={handleToggleChatAdmin}
          onToggleSearch={() => setIsSearchOpen((prev) => !prev)}
          isSearchOpen={isSearchOpen}
          onOpenWallpaperSettings={() => {
            setSettingsInitialSection('chat_settings');
            setIsSettingsOpen(true);
          }}
          onClearHistory={handleClearChatHistory}
          onDeleteChat={handleDeleteChat}
          onToggleBlockUser={handleToggleBlockUser}
          isBlocked={isCurrentChatBlocked}
          onUpdateChatPhotos={handleUpdateChatPhotos}
        />

        {/* In-Chat Interactive Message Search Bar */}
        <ChatSearchBar
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          chat={activeChat}
          messages={currentChatMessages}
          onSelectMessage={handleSelectSearchedMessage}
          activeTopicId={activeChat.activeTopicId}
        />

        {/* Pinned Messages Dedicated UI Bar */}
        {pinnedMessages.length > 0 && (
          <PinnedMessageBar
            pinnedMessages={pinnedMessages}
            onJumpToMessage={handleSelectSearchedMessage}
            onUnpinMessage={handleUnpinMessage}
            isAdmin={isChatAdmin || activeChat.type === 'private'}
          />
        )}

        {/* Telegram Style Selection Action Bar */}
        {selectedMessageIds.length > 0 && (
          <div className="bg-[#17212b] border-b border-cyan-500/30 px-3 sm:px-4 py-2 flex items-center justify-between text-white shadow-lg animate-in slide-in-from-top-2 duration-200 z-20 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedMessageIds([])}
                className="p-1.5 hover:bg-slate-700/60 rounded-xl text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="لغو انتخاب"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xs sm:text-sm text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-lg border border-cyan-500/20">
                  {selectedMessageIds.length}
                </span>
                <span className="text-xs text-slate-200 font-medium">پیام انتخاب شده</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Forward Selected Messages */}
              <button
                type="button"
                onClick={() => {
                  const selectedMsgs = rawChatMessages.filter((m) => selectedMessageIds.includes(m.id));
                  if (selectedMsgs.length > 0) {
                    setForwardingMessages(selectedMsgs);
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-all shadow-sm cursor-pointer"
                title="فوروارد پیام‌های انتخاب شده"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>فوروارد</span>
              </button>

              {/* Delete Selected Messages */}
              <button
                type="button"
                onClick={() => {
                  const selectedMsgs = rawChatMessages.filter((m) => selectedMessageIds.includes(m.id));
                  if (selectedMsgs.length > 0) {
                    setDeleteModalMessages(selectedMsgs);
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all shadow-sm cursor-pointer"
                title="حذف پیام‌های انتخاب شده"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>حذف</span>
              </button>
            </div>
          </div>
        )}

        {/* Messages Stream Container with Dynamic Wallpaper Background */}
        <div 
          className="flex-1 overflow-y-auto px-2 sm:px-4 md:px-6 py-3 sm:py-4 space-y-1 relative transition-all duration-300"
          style={{ background: chatWallpaper.value }}
        >
          {/* Subtle Telegram Wallpaper Grid if enabled */}
          {chatWallpaper.hasPattern !== false && (
            <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#38bdf8_1.5px,transparent_1.5px)] [background-size:16px_16px]" />
          )}

          {/* Secret Chat Notice */}
          {activeChat.type === 'secret' && (
            <div className="max-w-md mx-auto my-3 p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-700/50 text-emerald-200 text-xs text-center space-y-1">
              <div className="font-bold flex items-center justify-center gap-1.5 text-emerald-300">
                <ShieldCheck className="w-4 h-4" />
                <span>شما وارد یک چت محرمانه سرتاسر رمزنگاری شده (E2EE) شدید</span>
              </div>
              <p className="text-[11px] text-emerald-300/80">
                کلیدهای تبادل شده: {activeChat.verificationFingerprint?.join(' ')} • پیام‌ها پس از {activeChat.secretChatTimer} ثانیه از حافظه مرورگر پاک می‌شوند.
              </p>
            </div>
          )}

          {/* Render Messages */}
          {displayedMessages.map((msg) => (
            <MessageItem
              key={msg.id}
              message={msg}
              currentUser={currentUser}
              onReact={handleReact}
              onReply={(m) => setReplyingTo(m)}
              onEdit={(m) => setEditingMessage(m)}
              onDelete={handleDeleteMessage}
              onRequestDelete={(m) => setDeleteModalMessages([m])}
              onTranscribe={handleTranscribeMessage}
              isTranslatingChat={isTranslatingChat}
              isHighlighted={highlightedMessageId === msg.id}
              canPin={isChatAdmin || activeChat.type === 'private'}
              onTogglePin={handleTogglePinMessage}
              isGroupChat={activeChat.type === 'group' || activeChat.type === 'supergroup'}
              onForward={(m) => setForwardingMessages([m])}
              onJumpToMessage={handleSelectSearchedMessage}
              isSelectionMode={selectedMessageIds.length > 0}
              isSelected={selectedMessageIds.includes(msg.id)}
              onToggleSelect={(id) => {
                setSelectedMessageIds((prev) =>
                  prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
                );
              }}
              onStartSelection={(id) => {
                setSelectedMessageIds((prev) =>
                  prev.includes(id) ? prev : [...prev, id]
                );
              }}
              isCallActive={Boolean(activeChat.activeCall?.isActive)}
              isAdmin={isChatAdmin}
              onAddSongToCall={handleAddSongToCallQueue}
            />
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* Message Input Bar or Blocked Alert */}
        {isCurrentChatBlocked ? (
          <div className="p-3 sm:p-4 bg-slate-900/95 border-t border-slate-800 text-center flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg flex-shrink-0">
            <div className="flex items-center gap-2 text-rose-300 text-xs sm:text-sm font-bold">
              <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>این کاربر در لیست مسدودشده‌ها قرار دارد و امکان ارسال پیام وجود ندارد.</span>
            </div>
            <button
              onClick={() => handleToggleBlockUser(activeChat.id, activeChat.title)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
            >
              رفع مسدودی (Unblock)
            </button>
          </div>
        ) : (
          <MessageInput
            onSendMessage={handleSendMessage}
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
            onOpenChunkUploader={() => setIsChunkUploaderOpen(true)}
            isPremium={currentUser.isPremium}
            draftText={activeChat.draft}
            onDraftChange={(val) => {
              setChats((prev) =>
                prev.map((c) => (c.id === activeChatId ? { ...c, draft: val || undefined } : c))
              );
            }}
          />
        )}
      </div>

      {/* Interactive Modals */}

      {/* 1. Super Admin Panel (For 09921758505) */}
      {/* 1. Super Admin Panel (For 09921758505) */}
      <AdminPanelModal
        isOpen={isAdminPanelOpen}
        onClose={() => setIsAdminPanelOpen(false)}
        currentUser={currentUser}
        usersList={usersList}
        chats={chats}
        onToggleUserPremium={handleToggleUserPremium}
        onChangeUserRole={handleChangeUserRole}
        onAddStarsToUser={handleAddStarsToUser}
        onToggleBanUser={handleToggleBanUser}
        onBroadcastMessage={handleBroadcastMessage}
        onAddNewUser={(newUser) => setUsersList((prev) => [newUser, ...prev])}
      />

      {/* 2. Username & Password Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        currentUser={currentUser}
        usersList={usersList}
        chats={chats}
      />

      {/* 3. Architecture Blueprint Modal (Phase 1 Specifications) */}
      <ArchitectureModal
        isOpen={isArchitectureOpen}
        onClose={() => setIsArchitectureOpen(false)}
        isSuperAdmin={isSuperAdmin}
      />

      {/* 4. WebRTC Call Modal */}
      <CallModal
        isOpen={isCallOpen}
        onClose={handleLeaveCall}
        callerName={activeChat.title}
        callerAvatar={activeChat.avatar}
        fingerprintEmojis={activeChat.verificationFingerprint || ['🦊', '🔒', '💎', '⚡']}
        chatType={activeChat.type}
        membersCount={activeChat.activeCall?.participantsCount || activeChat.membersCount}
        isAdmin={isChatAdmin}
        onLeaveCall={handleLeaveCall}
        onEndCallForEveryone={handleEndCallForEveryone}
        activeParticipants={activeChat.activeCall?.participants}
        initialCallType={callType}
        currentUser={currentUser}
        chatMembers={activeChat.members}
        musicState={activeChat.activeCall?.musicPlayer}
        onToggleMusicPlay={handleToggleCallMusicPlay}
        onPlayMusicTrack={handlePlayCallTrack}
        onRemoveMusicTrack={handleRemoveCallTrack}
        onAddMusicTrack={handleAddSongToCallQueue}
        onSkipNextMusic={handleSkipNextCallMusic}
        onSkipPrevMusic={handleSkipPrevCallMusic}
        onSetMusicVolume={handleSetCallMusicVolume}
        onToggleMusicLoop={handleToggleCallMusicLoop}
        groupMessages={currentChatMessages}
      />

      {/* 5. Telegram Story Viewer */}
      <StoryViewer
        stories={stories}
        initialIndex={storyViewerIndex}
        isOpen={isStoryViewerOpen}
        onClose={() => setIsStoryViewerOpen(false)}
        isPremiumUser={currentUser.isPremium}
        onOpenCreateStory={() => {
          setIsStoryViewerOpen(false);
          setIsStoryCreatorOpen(true);
        }}
      />

      {/* 6. Story Creator Modal */}
      <StoryCreatorModal
        isOpen={isStoryCreatorOpen}
        onClose={() => setIsStoryCreatorOpen(false)}
        onPublish={handlePublishStory}
        isPremium={currentUser.isPremium}
      />

      {/* 7. Chunked Resumable Upload Modal (2GB vs 4GB TUS protocol) */}
      <ChunkUploadModal
        isOpen={isChunkUploaderOpen}
        onClose={() => setIsChunkUploaderOpen(false)}
        isPremium={currentUser.isPremium}
        onUploadSuccess={(filename, size) => {
          handleSendMessage(`فایل حجیم با موفقیت در فضای ابری بارگذاری شد: ${filename}`, 'document', {
            fileName: filename,
            fileSize: size
          });
        }}
      />

      {/* 8. Telegram Mini App Runner */}
      <MiniAppModal
        app={selectedMiniApp}
        isOpen={isMiniAppOpen}
        onClose={() => setIsMiniAppOpen(false)}
        userStarsBalance={userStars}
        onAddStars={(amt) => setUserStars((prev) => Math.max(0, prev + amt))}
      />

      {/* 9. Mini Apps Directory */}
      <MiniAppsDirectoryModal
        isOpen={isMiniAppsDirectoryOpen}
        onClose={() => setIsMiniAppsDirectoryOpen(false)}
        apps={miniApps}
        onLaunchApp={(app) => {
          setSelectedMiniApp(app);
          setIsMiniAppOpen(true);
        }}
      />

      {/* In-App Heads-up Notification Banner (Top of Screen) */}
      <NotificationBanner
        notification={inAppNotification}
        onClose={() => setInAppNotification(null)}
        onOpenChat={(chatId) => {
          setActiveChatId(chatId);
          setMobileView('chat');
          setInAppNotification(null);
        }}
      />

      {/* 10. Settings & GODFATHER Premium Hub */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentUser={currentUser}
        usersList={usersList}
        chats={chats}
        onUpdateUser={handleUpdateUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
        initialSection={settingsInitialSection}
        onSyncDatabase={handleSyncDatabase}
        onOpenPwaInstall={() => setIsPwaInstallOpen(true)}
        currentWallpaper={chatWallpaper}
        onSelectWallpaper={setChatWallpaper}
        onToggleBlockUser={handleToggleBlockUser}
        onTestNotification={() =>
          triggerInAppNotification(
            {
              senderName: 'پشتیبانی GODFATHER SQUAD',
              senderAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
              text: '🔔 سیستم اعلان دقیق و صدای بوق پیام‌رسان GODFATHER SQUAD روی دستگاه شما فعال است!',
              timestamp: 'هم‌اکنون'
            },
            activeChatId || 'chat_saved'
          )
        }
      />

      {/* 11. PWA & Web2App Install Modal (without APK) */}
      <PwaInstallModal
        isOpen={isPwaInstallOpen}
        onClose={() => setIsPwaInstallOpen(false)}
        deferredPrompt={deferredInstallPrompt}
        isInstalled={isAppInstalled}
      />

      {/* 12. Forward Message Modal (GODFATHER SQUAD Style) */}
      <ForwardMessageModal
        isOpen={Boolean(forwardingMessages && forwardingMessages.length > 0)}
        onClose={() => setForwardingMessages(null)}
        messagesToForward={forwardingMessages || []}
        chats={chats}
        onForward={handleForwardMessages}
      />

      {/* 13. Two-choice Delete Confirmation Modal (GODFATHER SQUAD Style) */}
      <DeleteMessageModal
        isOpen={Boolean(deleteModalMessages && deleteModalMessages.length > 0)}
        onClose={() => setDeleteModalMessages(null)}
        messages={deleteModalMessages || []}
        onDeleteForEveryone={handleConfirmDeleteForEveryone}
        onDeleteForMeOnly={handleConfirmDeleteForMeOnly}
        chatTitle={activeChat.title}
        isGroupChat={activeChat.type === 'group' || activeChat.type === 'supergroup'}
      />
    </div>
  );
}
