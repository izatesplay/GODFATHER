/**
 * GODFATHER SQUAD - Audio Synthesizer & Web Notification Manager
 * Provides instant zero-latency notification sounds, mobile haptics, and system push notifications.
 * Works seamlessly across iOS Safari, Android Chrome, and Desktop browsers.
 */

class NotificationService {
  private audioCtx: AudioContext | null = null;
  private soundEnabled: boolean = true;
  private vibrationEnabled: boolean = true;
  private inAppBannerEnabled: boolean = true;

  constructor() {
    try {
      const savedSound = localStorage.getItem('cp_notif_sound');
      if (savedSound !== null) this.soundEnabled = savedSound === 'true';

      const savedVibrate = localStorage.getItem('cp_notif_vibrate');
      if (savedVibrate !== null) this.vibrationEnabled = savedVibrate === 'true';

      const savedBanner = localStorage.getItem('cp_notif_banner');
      if (savedBanner !== null) this.inAppBannerEnabled = savedBanner === 'true';
    } catch {}
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    try {
      localStorage.setItem('cp_notif_sound', String(enabled));
    } catch {}
  }

  public isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  public setVibrationEnabled(enabled: boolean) {
    this.vibrationEnabled = enabled;
    try {
      localStorage.setItem('cp_notif_vibrate', String(enabled));
    } catch {}
  }

  public isVibrationEnabled(): boolean {
    return this.vibrationEnabled;
  }

  public setBannerEnabled(enabled: boolean) {
    this.inAppBannerEnabled = enabled;
    try {
      localStorage.setItem('cp_notif_banner', String(enabled));
    } catch {}
  }

  public isBannerEnabled(): boolean {
    return this.inAppBannerEnabled;
  }

  /**
   * Unlocks AudioContext on user gesture (required by iOS Safari and modern browsers)
   */
  public unlockAudio(): void {
    try {
      const ctx = this.getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    } catch {}
  }

  /**
   * Initializes or resumes the AudioContext
   */
  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!this.audioCtx) {
      try {
        this.audioCtx = new AudioContextClass();
      } catch {
        return null;
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  /**
   * Plays a high-fidelity, twin-tone chime inspired by modern premium messaging apps
   */
  public playChime() {
    if (!this.soundEnabled) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      if (ctx.state === 'suspended') {
        ctx.resume().then(() => this.executeChime(ctx)).catch(() => {});
      } else {
        this.executeChime(ctx);
      }
    } catch (e) {
      console.warn('Audio chime playback error:', e);
    }
  }

  private executeChime(ctx: AudioContext) {
    try {
      const now = ctx.currentTime;

      // Master gain node
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.5, now);
      masterGain.connect(ctx.destination);

      // Primary crystal tone: 880Hz (A5) ascending to 1175Hz (D6)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.exponentialRampToValueAtTime(1174.66, now + 0.08);

      gain1.gain.setValueAtTime(0.4, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.connect(gain1);
      gain1.connect(masterGain);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Secondary bell shimmer: 1760Hz (A6) with warm resonance
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1760, now + 0.07);

      gain2.gain.setValueAtTime(0.25, now + 0.07);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc2.connect(gain2);
      gain2.connect(masterGain);
      osc2.start(now + 0.07);
      osc2.stop(now + 0.45);
    } catch (err) {
      console.warn('Chime execution failed:', err);
    }
  }

  /**
   * Plays a distinct alert sound for announcements
   */
  public playBroadcastAlert() {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.5, now);
      masterGain.connect(ctx.destination);

      // Triple chime for announcements
      [587.33, 880, 1174.66].forEach((freq, idx) => {
        const start = now + idx * 0.1;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.3, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(start);
        osc.stop(start + 0.3);
      });
    } catch {}
  }

  /**
   * Triggers mobile haptic vibration
   */
  public vibrate(pattern: number[] = [120, 60, 120]) {
    if (!this.vibrationEnabled) return;
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch {}
    }
  }

  /**
   * Requests OS permission for system notifications
   */
  public async requestSystemPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch {
      return 'denied';
    }
  }

  /**
   * Checks current permission status
   */
  public getPermissionStatus(): NotificationPermission | 'unsupported' {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  }

  /**
   * Fires a native OS notification (desktop / Android / PWA)
   */
  public showSystemNotification(
    title: string,
    options?: {
      body?: string;
      icon?: string;
      tag?: string;
      onClick?: () => void;
    }
  ) {
    if (typeof window === 'undefined' || !('Notification' in window)) return null;
    if (Notification.permission !== 'granted') return null;

    try {
      const notif = new Notification(title, {
        body: options?.body || 'پیام جدید در GODFATHER SQUAD',
        icon: options?.icon || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
        badge: '/favicon.svg',
        tag: options?.tag || 'godfather_squad_msg',
        dir: 'rtl',
        lang: 'fa'
      });

      if (options?.onClick) {
        notif.onclick = () => {
          window.focus();
          options.onClick?.();
          notif.close();
        };
      }
      return notif;
    } catch (e) {
      console.warn('Failed to show system notification:', e);
      return null;
    }
  }

  /**
   * Comprehensive notification dispatcher: triggers audio, haptics, and system notification
   */
  public notifyIncomingMessage(params: {
    senderName: string;
    text: string;
    avatar?: string;
    chatId: string;
    isCurrentChatActive: boolean;
    isTabFocused: boolean;
    onOpenChat?: () => void;
  }) {
    // 1. Play sound chime
    this.playChime();

    // 2. Mobile haptic vibration
    this.vibrate([100, 50, 100]);

    // 3. If window is not focused or user is not inside this specific chat, display OS Notification
    if (!params.isTabFocused || !params.isCurrentChatActive) {
      this.showSystemNotification(params.senderName, {
        body: params.text,
        icon: params.avatar,
        tag: params.chatId,
        onClick: params.onOpenChat
      });
    }
  }
}

export const notificationService = new NotificationService();

// Global listener to unlock Web Audio on first user interaction (touch or click)
if (typeof window !== 'undefined') {
  const handleFirstInteraction = () => {
    notificationService.unlockAudio();
    window.removeEventListener('click', handleFirstInteraction);
    window.removeEventListener('touchstart', handleFirstInteraction);
    window.removeEventListener('pointerdown', handleFirstInteraction);
    window.removeEventListener('keydown', handleFirstInteraction);
  };
  window.addEventListener('click', handleFirstInteraction, { passive: true });
  window.addEventListener('touchstart', handleFirstInteraction, { passive: true });
  window.addEventListener('pointerdown', handleFirstInteraction, { passive: true });
  window.addEventListener('keydown', handleFirstInteraction, { passive: true });
}
