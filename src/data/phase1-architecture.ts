/**
 * Phase 1: CloudPulse Architecture Specifications
 * Relational Schemas (PostgreSQL), Time-Series Distributed Message Store (ScyllaDB/Cassandra),
 * In-Memory Caching (Redis), and 2FA SRP-6a Handshake Specification.
 */

export interface SystemArchitectureSpec {
  postgresSchema: string;
  cassandraSchema: string;
  redisKeyspace: string;
  srpSequence: {
    step: number;
    title: string;
    sender: string;
    receiver: string;
    payload: string;
    mathFormula: string;
    description: string;
  }[];
  webrtcTopology: string;
}

export const PHASE1_SPEC: SystemArchitectureSpec = {
  postgresSchema: `-- ==========================================
-- PostgreSQL 16 Relational Schema (CloudPulse)
-- Handles users, auth, channels, memberships & RBAC
-- ==========================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(32) UNIQUE NOT NULL,
    username VARCHAR(64) UNIQUE,
    first_name VARCHAR(128) NOT NULL,
    last_name VARCHAR(128),
    avatar_url TEXT,
    bio VARCHAR(256),
    is_premium BOOLEAN DEFAULT FALSE,
    emoji_status VARCHAR(16) DEFAULT NULL,
    custom_accent_color VARCHAR(32) DEFAULT 'telegram_blue',
    privacy_last_seen VARCHAR(16) DEFAULT 'everyone' CHECK (privacy_last_seen IN ('everyone', 'contacts', 'nobody')),
    privacy_phone VARCHAR(16) DEFAULT 'contacts' CHECK (privacy_phone IN ('everyone', 'contacts', 'nobody')),
    privacy_p2p_calls VARCHAR(16) DEFAULT 'contacts' CHECK (privacy_p2p_calls IN ('everyone', 'contacts', 'nobody')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Two-Factor Authentication SRP-6a credentials
CREATE TABLE user_2fa_credentials (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    salt BYTEA NOT NULL,
    verifier BYTEA NOT NULL, -- v = g^x mod N
    argon2id_memory_kb INT DEFAULT 65536,
    argon2id_iterations INT DEFAULT 3,
    hint VARCHAR(128),
    recovery_email VARCHAR(255),
    is_enabled BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Active Sessions with Device Fingerprinting
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_model VARCHAR(128) NOT NULL,
    platform VARCHAR(64) NOT NULL,
    ip_address INET NOT NULL,
    refresh_token_hash VARCHAR(128) NOT NULL,
    last_active TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE
);

-- Chats (Private, Supergroup, Forum, Channel, Secret)
CREATE TABLE chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(32) NOT NULL CHECK (type IN ('private', 'group', 'supergroup', 'channel', 'secret')),
    title VARCHAR(256),
    description TEXT,
    username VARCHAR(64) UNIQUE,
    invite_link VARCHAR(128),
    avatar_url TEXT,
    is_forum BOOLEAN DEFAULT FALSE,
    boost_level INT DEFAULT 0,
    has_anti_spam BOOLEAN DEFAULT TRUE,
    linked_discussion_chat_id UUID REFERENCES chats(id),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat Topics (Forums)
CREATE TABLE chat_topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    title VARCHAR(128) NOT NULL,
    icon_emoji VARCHAR(16) DEFAULT '💬',
    icon_color VARCHAR(16) DEFAULT 'blue',
    is_closed BOOLEAN DEFAULT FALSE,
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat Participants & RBAC Roles
CREATE TABLE chat_members (
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(32) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'moderator', 'member', 'restricted', 'banned')),
    custom_title VARCHAR(64),
    can_change_info BOOLEAN DEFAULT FALSE,
    can_post_messages BOOLEAN DEFAULT TRUE,
    can_edit_messages BOOLEAN DEFAULT FALSE,
    can_delete_messages BOOLEAN DEFAULT FALSE,
    can_invite_users BOOLEAN DEFAULT TRUE,
    can_pin_messages BOOLEAN DEFAULT FALSE,
    can_manage_topics BOOLEAN DEFAULT FALSE,
    can_manage_voice_chats BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (chat_id, user_id)
);

CREATE INDEX idx_chat_members_user ON chat_members(user_id);
CREATE INDEX idx_chats_username ON chats(username);`,

  cassandraSchema: `-- ==========================================
-- ScyllaDB / Apache Cassandra 4.1 Schema
-- Optimized for high-throughput billion-scale chat timeline
-- Partitioned by chat_id and week bucket to prevent hotspotting
-- ==========================================

CREATE KEYSPACE cloudpulse_messages
WITH replication = {'class': 'NetworkTopologyStrategy', 'datacenter1': 3};

-- High volume messages table
CREATE TABLE cloudpulse_messages.messages_by_chat (
    chat_id uuid,
    bucket_epoch_week int, -- e.g. 202615 for week 15 of 2026
    message_id timeuuid,   -- Ordered monotonically
    topic_id uuid,
    sender_id uuid,
    message_type text,     -- 'text', 'photo', 'video', 'voice', 'round_video', 'doc', 'poll'
    body text,
    formatted_entities text, -- JSON: bold, italic, spoilers, code tags
    media_metadata text,     -- JSON: { s3_key, mime, size, checksum, duration, waveform }
    reply_to_message_id timeuuid,
    forward_header text,     -- JSON: original sender, original message id
    is_pinned boolean,
    is_silent boolean,
    is_edited boolean,
    edited_at timestamp,
    self_destruct_ttl int,   -- In seconds (for secret chats)
    PRIMARY KEY ((chat_id, bucket_epoch_week), message_id)
) WITH CLUSTERING ORDER BY (message_id DESC)
AND default_time_to_live = 0
AND compaction = {
    'class': 'TimeWindowCompactionStrategy',
    'compaction_window_unit': 'DAYS',
    'compaction_window_size': 7
};

-- Emoji Reactions table
CREATE TABLE cloudpulse_messages.message_reactions (
    chat_id uuid,
    message_id timeuuid,
    user_id uuid,
    emoji text,
    is_premium boolean,
    created_at timestamp,
    PRIMARY KEY ((chat_id, message_id), user_id, emoji)
);`,

  redisKeyspace: `// ==========================================
// Redis 7.2 Key Patterns & Data Structures
// ==========================================

// 1. Presence & Online Heartbeat (TTL 60s)
SET presence:user:{user_id} "online" EX 60
HSET user:last_seen {user_id} 1775836800

// 2. Typing Indicators (Key expires in 5s)
SET typing:chat:{chat_id}:user:{user_id} "typing_voice" EX 5
PUBLISH chat:events:{chat_id} '{"type":"typing","user_id":"...","action":"record_voice"}'

// 3. Cloud Drafts (Multi-device live sync)
HSET drafts:{user_id} {chat_id} '{"text":"سلام، مستندات بررسی شد...","topic_id":null,"reply_to":null}'

// 4. Rate Limiting for SMS OTP & Webhooks (Token Bucket)
INCR ratelimit:otp:{phone}
EXPIRE ratelimit:otp:{phone} 300

// 5. Distributed WebSockets Node Routing (Pub/Sub)
PUBLISH user:inbox:{user_id} '{"event":"new_message","data":{...}}'
`,

  srpSequence: [
    {
      step: 1,
      title: 'درخواست ورود با شماره تلفن',
      sender: 'Client',
      receiver: 'Auth Gateway',
      payload: '{ phone: "+989120000000" }',
      mathFormula: 'RateLimit(phone) < 3/5min',
      description: 'کلاینت شماره تلفن را ارسال کرده و کد ۵ رقمی یکبار مصرف (SMS/Telegram Code) صادر می‌شود.'
    },
    {
      step: 2,
      title: 'تأیید کد پیامکی و بررسی ۲FA',
      sender: 'Client',
      receiver: 'Auth Gateway',
      payload: '{ phone: "+98912...", code: "77788" }',
      mathFormula: 'Assert(HMAC(OTP) == StoredHash)',
      description: 'سرور کد پیامکی را بررسی کرده و در صورت فعال بودن رمز ابری (2FA)، چالش SRP را به همراه Salt آغاز می‌کند.'
    },
    {
      step: 3,
      title: 'ارسال چالش SRP-6a از سرور',
      sender: 'Auth Gateway',
      receiver: 'Client',
      payload: '{ s: "salt_9a8f27b9c0", B: "server_ephemeral_pubkey", g: 2, N: "prime..." }',
      mathFormula: 'B = (k·v + g^b) mod N',
      description: 'سرور متغیرهای عمومی استاندارد (g, N) را همراه Salt کاربر (s) و کلید عمومی یکبار مصرف سرور (B) به کلاینت می‌فرستد.'
    },
    {
      step: 4,
      title: 'محاسبه مشتق رمز در کلاینت (Zero-Knowledge)',
      sender: 'Client (Internal Engine)',
      receiver: 'Client (Local)',
      payload: 'x = Argon2id(Password, Salt)',
      mathFormula: 'a = random(); A = g^a mod N; u = H(A, B); S = (B - k·g^x)^(a + u·x) mod N',
      description: 'کلاینت رمز عبور کاربر را هش کرده و بدون اینکه پسورد را به سرور بفرستد، کلید اشتراکی جلسه (Session Key S) را محاسبه می‌کند.'
    },
    {
      step: 5,
      title: 'ارسال اثبات کلاینت (M1)',
      sender: 'Client',
      receiver: 'Auth Gateway',
      payload: '{ A: "client_pubkey", M1: "H(H(N) xor H(g), H(I), s, A, B, K)" }',
      mathFormula: 'M1 = H(A, B, K)',
      description: 'کلاینت اثبات M1 را ارسال می‌کند تا به سرور ثابت کند رمز عبور را در اختیار دارد.'
    },
    {
      step: 6,
      title: 'تأیید سرور و صدور اثبات متقابل (M2) و JWT',
      sender: 'Auth Gateway',
      receiver: 'Client',
      payload: '{ M2: "H(A, M1, K)", accessToken: "JWT...", refreshToken: "..." }',
      mathFormula: 'Assert(Server_M1 == Received_M1) => Issue Session',
      description: 'سرور درستی اثبات را ارزیابی کرده، اثبات متقابل M2 را می‌فرستد و نشست رمزنگاری شده را ثبت می‌کند.'
    }
  ],

  webrtcTopology: `// WebRTC SFU (Selective Forwarding Unit) Architecture:
// 1. Signaling via WebSocket PubSub (SDP Offer / Answer & ICE Candidates)
// 2. SFU (Mediasoup / LiveKit) routes high-bitrate video/audio layers (Simulcast / SVC)
// 3. End-to-End Safety: 4-Emoji Cryptographic Fingerprint computed from SHA-256 of DTLS-SRTP certificates:
//    Hash = SHA256(Cert_ClientA || Cert_ClientB)
//    EmojiFingerprint = MapBytesToEmojiTuple(Hash[0..3]) -> 🦊 🔒 💎 ⚡`
};
