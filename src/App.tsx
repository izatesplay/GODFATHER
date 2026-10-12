import React, { useState, useEffect, useRef } from 'react';
import { Chat, Message, Story, User, MiniApp, Contact, ChatFolder, ChatMember } from './types/telegram';
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
  saveStoryToRemote 
} from './utils/apiSync';
import { translateText } from './utils/translator';
import { Sidebar } from './components/Sidebar';
import { ChatHeader } from './components/ChatHeader';
import { ChatSearchBar } from './components/ChatSearchBar';
import { MessageItem } from './components/MessageItem';
import { MessageInput } from './components/MessageInput';
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
import { ShieldCheck, Sparkles, Crown } from 'lucide-react';

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
  // Default to Super Admin (09921758505) with persistence
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const saved = getInitialState<User | null>('user', ADMIN_USER);
    return (saved && typeof saved === 'object' && saved.id) ? saved : ADMIN_USER;
  });
  const [usersList, setUsersList] = useState<User[]>(() => {
    const saved = getInitialState<User[]>('users_list', INITIAL_SYSTEM_USERS);
    return (Array.isArray(saved) && saved.length > 0) ? saved : INITIAL_SYSTEM_USERS;
  });
  const [chats, setChats] = useState<Chat[]>(() => {
    const saved = getInitialState<Chat[]>('chats', INITIAL_CHATS);
    return (Array.isArray(saved) && saved.length > 0) ? saved : INITIAL_CHATS;
  });
  const [activeChatId, setActiveChatId] = useState<string>(() => {
    const savedChats = getInitialState<Chat[]>('chats', INITIAL_CHATS);
    return (Array.isArray(savedChats) && savedChats[0]?.id) || INITIAL_CHATS[0].id;
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
  const [userStars, setUserStars] = useState<number>(() => currentUser?.starsBalance || 50000);

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
  const [settingsInitialSection, setSettingsInitialSection] = useState<'main' | 'edit_profile'>('main');
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
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

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeChat: Chat =
    (chats && chats.length > 0 ? (chats.find((c) => c.id === activeChatId) || chats[0]) : null) ||
    INITIAL_CHATS[0];
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
  const currentChatMessages = (activeChat?.id && messages && messages[activeChat.id]) ? messages[activeChat.id] : [];

  // Filter messages by topic if in a supergroup forum
  const displayedMessages = activeChat?.activeTopicId
    ? currentChatMessages.filter((m) => !m.topicId || m.topicId === activeChat.activeTopicId)
    : currentChatMessages;

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

  // Auto-save local changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('cp_user', JSON.stringify(currentUser));
      localStorage.setItem('cp_users_list', JSON.stringify(usersList));
      localStorage.setItem('cp_chats', JSON.stringify(chats));
      localStorage.setItem('cp_messages', JSON.stringify(messages));
      localStorage.setItem('cp_stories', JSON.stringify(stories));
      localStorage.setItem('cp_contacts', JSON.stringify(contacts));
      localStorage.setItem('cp_folders', JSON.stringify(folders));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  }, [currentUser, usersList, chats, messages, stories, contacts, folders]);

  // Initial bidirectional sync with api.php
  useEffect(() => {
    let isMounted = true;
    const initSync = async () => {
      const health = await checkApiHealth();
      if (health.success) {
        const remote = await fetchRemoteData();
        if (remote.success && remote.data && isMounted) {
          if (remote.data.users?.length) setUsersList(remote.data.users);
          if (remote.data.chats?.length) {
            setChats((prev) => {
              const remoteMap = new Map(remote.data!.chats.map(rc => [rc.id, rc]));
              const updated = prev.map((local) => {
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
              for (const rc of remote.data!.chats) {
                if (!prev.some(p => p.id === rc.id)) {
                  updated.push(rc);
                }
              }
              return updated;
            });
          }
          if (remote.data.messages && Object.keys(remote.data.messages).length) setMessages(remote.data.messages);
          if (remote.data.contacts?.length) setContacts(remote.data.contacts);
          if (remote.data.stories?.length) setStories(remote.data.stories);
          if (remote.data.folders?.length) setFolders(remote.data.folders);
        }
      }
    };
    initSync();
    return () => { isMounted = false; };
  }, []);

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
    type: 'text' | 'photo' | 'video' | 'voice' | 'round_video' | 'document' = 'text',
    options?: {
      isSpoiler?: boolean;
      isSilent?: boolean;
      scheduledFor?: string;
      fileName?: string;
      fileSize?: string;
      mediaUrl?: string;
      voiceDuration?: number;
      voiceWaveform?: number[];
    }
  ) => {
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
      voiceDuration: type === 'voice' ? (options?.voiceDuration || 5) : undefined,
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
      reply = `خوش آمدید! دستیار هوشمند تلگرام در خدمت شماست.\n• /premium : بررسی امکانات پریمیوم\n• /stars : دریافت ستاره‌های آزمایشی\n• /help : راهنما`;
    } else if (userText.includes('/premium')) {
      reply = `✨ وضعیت اکانت: ${currentUser.isPremium ? 'پریمیوم فعال' : 'استاندارد رایگان'}\nسقف آپلود: ${currentUser.isPremium ? '۴ گیگابایت' : '۲ گیگابایت'}\nمبدل ویس: فعال`;
    } else if (userText.includes('/stars')) {
      setUserStars((prev) => prev + 50);
      reply = `⭐ ۵۰ ستاره تلگرام به کیف‌پول شما افزوده شد! موجودی فعلی: ${userStars + 50} Stars`;
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
        body: JSON.stringify({ audioDescription: 'پیام صوتی فنی درباره معماری تلگرام' })
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

  // Delete message for everyone
  const handleDeleteMessage = (messageId: string) => {
    setMessages((prev) => ({
      ...prev,
      [activeChatId]: (prev[activeChatId] || []).filter((m) => m.id !== messageId)
    }));
  };

  // Start Audio/Video Call (Group, Channel or 1-on-1)
  const handleStartCall = (type: 'audio' | 'video') => {
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

  // Publish Story
  const handlePublishStory = (newStoryData: Partial<Story>) => {
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
    setCurrentUser((prev) => ({ ...prev, ...updated }));
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
          if (currentUser.id === userId) {
            setCurrentUser((curr) => ({ ...curr, isPremium: newPremium }));
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
          if (currentUser.id === userId) {
            setCurrentUser((curr) => ({ ...curr, role: newRole }));
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
          if (currentUser.id === userId) {
            setUserStars(newBalance);
            setCurrentUser((curr) => ({ ...curr, starsBalance: newBalance }));
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
      bio: 'عضو افزوده شده به گفتگو'
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
      senderName: 'سیستم تلگرام',
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
      senderName: 'سیستم تلگرام',
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
        senderName: `${currentUser.name} (09921758505)`,
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

  // Handle Login success
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    if (user.starsBalance) {
      setUserStars(user.starsBalance);
    }
  };

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
              bio: currentUser.bio || 'سازنده و مدیر گروه'
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

        {/* Messages Stream Container */}
        <div className="flex-1 overflow-y-auto px-2 sm:px-4 md:px-6 py-3 sm:py-4 space-y-1 relative">
          {/* Subtle Telegram Wallpaper Grid */}
          <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />

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
              onTranscribe={handleTranscribeMessage}
              isTranslatingChat={isTranslatingChat}
              isHighlighted={highlightedMessageId === msg.id}
            />
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* Message Input Bar */}
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

      {/* 10. Settings & Telegram Premium Hub */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentUser={currentUser}
        usersList={usersList}
        chats={chats}
        onUpdateUser={handleUpdateUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
        initialSection={settingsInitialSection}
        onSyncDatabase={handleSyncDatabase}
        onOpenPwaInstall={() => setIsPwaInstallOpen(true)}
      />

      {/* 11. PWA & Web2App Install Modal (without APK) */}
      <PwaInstallModal
        isOpen={isPwaInstallOpen}
        onClose={() => setIsPwaInstallOpen(false)}
        deferredPrompt={deferredInstallPrompt}
        isInstalled={isAppInstalled}
      />
    </div>
  );
}
