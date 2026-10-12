<?php
/**
 * ================================================================================
 * CloudPulse Telegram Web - MySQL / phpMyAdmin API Bridge (api.php)
 * ================================================================================
 * این فایل پل ارتباطی کامل میان کلاینت وب و پایگاه داده MySQL هاست cPanel شما می‌باشد.
 * تمام نیازهای ذخیره‌سازی، احراز هویت، پیام‌ها، مخاطبین، استوری‌ها و فایل‌ها را
 * به صورت Self-Contained و بدون نیاز به هیچ وابستگی خارجی برطرف می‌نماید.
 *
 * --------------------------------------------------------------------------------
 * 📖 راهنمای استقرار در هاست سی‌پنل (cPanel File Manager & phpMyAdmin):
 * --------------------------------------------------------------------------------
 * ۱. این فایل (api.php) را مستقیماً در ریشه پوشه public_html یا پوشه اصلی پروژه آپلود کنید.
 * ۲. در کنترل پنل cPanel وارد بخش "MySQL Databases" شوید:
 *    الف) یک پایگاه داده بسازید (مانند: youruser_telegram)
 *    ب) یک نام کاربری دیتابیس با رمز عبور بسازید (مانند: youruser_teleuser)
 *    ج) کاربر را به دیتابیس متصل کرده و دسترسی "ALL PRIVILEGES" را تیک بزنید.
 * ۳. ثابت‌های زیر (DB_HOST, DB_USER, DB_PASS, DB_NAME) را با مشخصات دیتابیس خود مقداردهی کنید.
 * ۴. اسکریپت در اولین اجرا، به صورت خودکار تمامی جداول را با اینکودینگ utf8mb4_unicode_ci ایجاد می‌کند.
 *    نیازی به ساخت جدول یا اجرای دستی کوئری در phpMyAdmin نخواهید داشت!
 * ================================================================================
 */

// ۱. تنظیم گزارش‌دهی خطا جهت جلوگیری از شکستن خروجی JSON
error_reporting(0);
ini_set('display_errors', '0');
mysqli_report(MYSQLI_REPORT_OFF);

// ۲. پشتیبانی کامل و بومی از CORS (Cross-Origin Resource Sharing)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Origin, Accept");
header("Access-Control-Max-Age: 86400");
header("Content-Type: application/json; charset=UTF-8");

// مدیریت درخواست‌های Pre-flight (OPTIONS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ================================================================================
// تنظیمات اتصال به دیتابیس MySQL (اطلاعات هاست خود را در این بخش وارد کنید)
// ================================================================================
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') ?: '');
define('DB_NAME', getenv('DB_NAME') ?: 'cloudpulse_telegram');
define('DB_PORT', getenv('DB_PORT') ?: 3306);

// توابع کمکی برای پاسخ‌های JSON استاندارد
function sendResponse($status, $data = null, $message = '', $httpCode = 200) {
    http_response_code($httpCode);
    $response = [
        'status' => $status,
        'message' => $message,
        'timestamp' => date('c')
    ];
    if ($data !== null) {
        $response['data'] = $data;
    }
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit();
}

function sendError($message, $httpCode = 400, $data = null) {
    sendResponse('error', $data, $message, $httpCode);
}

function sendSuccess($data = null, $message = 'عملیات با موفقیت انجام شد') {
    sendResponse('success', $data, $message, 200);
}

// اتصال هوشمند به دیتابیس با قابلیت ساخت دیتابیس در صورت عدم وجود
function getDbConnection() {
    $conn = @new mysqli(DB_HOST, DB_USER, DB_PASS, '', (int)DB_PORT);
    if ($conn->connect_error) {
        sendError('خطا در اتصال به سرور دیتابیس MySQL: ' . $conn->connect_error, 500);
    }

    // بررسی و ساخت دیتابیس در صورت نیاز
    $dbName = DB_NAME;
    $createDbQuery = "CREATE DATABASE IF NOT EXISTS `$dbName` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci";
    @$conn->query($createDbQuery);

    if (!@$conn->select_db($dbName)) {
        sendError("پایگاه داده `$dbName` یافت نشد و امکان ایجاد آن با دسترسی فعلی وجود ندارد.", 500);
    }

    // تنظیم کاراکترست utf8mb4 برای پشتیبانی بی‌نقص از حروف فارسی و ایموجی‌ها
    $conn->set_charset("utf8mb4");
    $conn->query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
    return $conn;
}

$db = getDbConnection();

// ================================================================================
// ایجاد خودکار جداول پایگاه داده بر اساس تایپ‌های پروژه (Auto Schema Generation)
// ================================================================================
function initializeDatabaseSchema($conn) {
    $queries = [
        // ۱. جدول کاربران
        "CREATE TABLE IF NOT EXISTS `users` (
            `id` VARCHAR(64) NOT NULL PRIMARY KEY,
            `name` VARCHAR(255) NOT NULL,
            `username` VARCHAR(100) NOT NULL UNIQUE,
            `phone` VARCHAR(30) NOT NULL UNIQUE,
            `password_hash` VARCHAR(255) DEFAULT '',
            `avatar` LONGTEXT,
            `bio` TEXT,
            `is_premium` TINYINT(1) DEFAULT 0,
            `emoji_status` VARCHAR(20) DEFAULT '',
            `custom_color` VARCHAR(30) DEFAULT 'blue',
            `last_seen` VARCHAR(100) DEFAULT 'هم‌اکنون آنلاین',
            `is_online` TINYINT(1) DEFAULT 1,
            `role` ENUM('superadmin', 'admin', 'moderator', 'member') DEFAULT 'member',
            `stars_balance` INT DEFAULT 0,
            `is_banned` TINYINT(1) DEFAULT 0,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX `idx_phone` (`phone`),
            INDEX `idx_username` (`username`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;",

        // ۲. جدول گفتگوها (خصوصی، گروهی، کانال، ذخیره شده)
        "CREATE TABLE IF NOT EXISTS `chats` (
            `id` VARCHAR(64) NOT NULL PRIMARY KEY,
            `type` ENUM('private', 'group', 'supergroup', 'channel', 'bot', 'secret') DEFAULT 'private',
            `title` VARCHAR(255) NOT NULL,
            `avatar` LONGTEXT,
            `unread_count` INT DEFAULT 0,
            `is_pinned` TINYINT(1) DEFAULT 0,
            `is_muted` TINYINT(1) DEFAULT 0,
            `draft` TEXT,
            `draft_text` TEXT,
            `is_verified` TINYINT(1) DEFAULT 0,
            `description` TEXT,
            `members_count` INT DEFAULT 1,
            `boost_level` INT DEFAULT 0,
            `topics_json` LONGTEXT,
            `active_topic_id` VARCHAR(64) DEFAULT NULL,
            `is_secret` TINYINT(1) DEFAULT 0,
            `secret_chat_timer` INT DEFAULT 0,
            `verification_fingerprint` VARCHAR(255) DEFAULT NULL,
            `last_message_json` LONGTEXT,
            `reaction_preview` VARCHAR(50) DEFAULT NULL,
            `creator_id` VARCHAR(64) DEFAULT NULL,
            `is_user_admin` TINYINT(1) DEFAULT 1,
            `username` VARCHAR(100) DEFAULT NULL,
            `members_json` LONGTEXT,
            `active_call_json` LONGTEXT,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX `idx_type` (`type`),
            INDEX `idx_is_pinned` (`is_pinned`),
            INDEX `idx_creator` (`creator_id`),
            INDEX `idx_username` (`username`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;",

        // ۳. جدول پیام‌ها
        "CREATE TABLE IF NOT EXISTS `messages` (
            `id` VARCHAR(64) NOT NULL PRIMARY KEY,
            `chat_id` VARCHAR(64) NOT NULL,
            `topic_id` VARCHAR(64) DEFAULT NULL,
            `sender_id` VARCHAR(64) NOT NULL,
            `sender_name` VARCHAR(255) NOT NULL,
            `sender_avatar` LONGTEXT,
            `is_outgoing` TINYINT(1) DEFAULT 1,
            `text` LONGTEXT,
            `type` ENUM('text', 'photo', 'video', 'voice', 'round_video', 'document', 'poll', 'system') DEFAULT 'text',
            `media_url` LONGTEXT,
            `file_name` VARCHAR(255) DEFAULT NULL,
            `file_size` VARCHAR(50) DEFAULT NULL,
            `voice_duration` INT DEFAULT 0,
            `voice_waveform` LONGTEXT,
            `transcript` LONGTEXT,
            `translated_text` LONGTEXT,
            `is_spoiler` TINYINT(1) DEFAULT 0,
            `is_silent` TINYINT(1) DEFAULT 0,
            `is_edited` TINYINT(1) DEFAULT 0,
            `reply_to_json` LONGTEXT,
            `forward_from_json` LONGTEXT,
            `reactions_json` LONGTEXT,
            `status` ENUM('sending', 'sent', 'read') DEFAULT 'sent',
            `timestamp` VARCHAR(100) DEFAULT NULL,
            `self_destruct_in` INT DEFAULT NULL,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX `idx_chat_id` (`chat_id`),
            INDEX `idx_sender_id` (`sender_id`),
            INDEX `idx_created_at` (`created_at`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;",

        // ۴. جدول مخاطبین
        "CREATE TABLE IF NOT EXISTS `contacts` (
            `id` VARCHAR(64) NOT NULL PRIMARY KEY,
            `owner_id` VARCHAR(64) DEFAULT 'usr_admin_09921758505',
            `name` VARCHAR(255) NOT NULL,
            `phone` VARCHAR(30) NOT NULL,
            `avatar` LONGTEXT,
            `status` VARCHAR(100) DEFAULT 'آنلاین',
            `is_online` TINYINT(1) DEFAULT 1,
            `username` VARCHAR(100) DEFAULT NULL,
            `bio` TEXT,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX `idx_owner` (`owner_id`),
            INDEX `idx_phone` (`phone`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;",

        // ۵. جدول استوری‌ها
        "CREATE TABLE IF NOT EXISTS `stories` (
            `id` VARCHAR(64) NOT NULL PRIMARY KEY,
            `user_id` VARCHAR(64) NOT NULL,
            `user_name` VARCHAR(255) NOT NULL,
            `user_avatar` LONGTEXT,
            `media_url` LONGTEXT NOT NULL,
            `media_type` ENUM('image', 'video') DEFAULT 'image',
            `caption` TEXT,
            `expiry_hours` INT DEFAULT 24,
            `timestamp` VARCHAR(100) DEFAULT NULL,
            `views_count` INT DEFAULT 0,
            `is_seen` TINYINT(1) DEFAULT 0,
            `is_stealth` TINYINT(1) DEFAULT 0,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX `idx_user_id` (`user_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;",

        // ۶. جدول پوشه‌ها و دسته‌بندی چت‌ها
        "CREATE TABLE IF NOT EXISTS `chat_folders` (
            `id` VARCHAR(64) NOT NULL PRIMARY KEY,
            `user_id` VARCHAR(64) DEFAULT 'usr_admin_09921758505',
            `name` VARCHAR(100) NOT NULL,
            `icon_name` VARCHAR(50) DEFAULT 'Folder',
            `type` VARCHAR(50) DEFAULT 'all',
            `badge_count` INT DEFAULT 0,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;",

        // ۷. جدول تنظیمات سراسری سیستم و متادیتا
        "CREATE TABLE IF NOT EXISTS `app_settings` (
            `setting_key` VARCHAR(100) NOT NULL PRIMARY KEY,
            `setting_value` LONGTEXT,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;"
    ];

    foreach ($queries as $q) {
        if (!$conn->query($q)) {
            // خطا در ایجاد جدول
            return false;
        }
    }

    // بررسی و ارتقای ستون‌های جدول گفتگوها در صورت نیاز
    $checkCols = $conn->query("SHOW COLUMNS FROM `chats` LIKE 'creator_id'");
    if ($checkCols && $checkCols->num_rows === 0) {
        $conn->query("ALTER TABLE `chats` ADD COLUMN `creator_id` VARCHAR(64) DEFAULT NULL");
        $conn->query("ALTER TABLE `chats` ADD COLUMN `is_user_admin` TINYINT(1) DEFAULT 1");
        $conn->query("ALTER TABLE `chats` ADD COLUMN `members_json` LONGTEXT");
        $conn->query("ALTER TABLE `chats` ADD COLUMN `active_call_json` LONGTEXT");
    }

    // ایجاد کاربر سوپرادمین اولیه (09921758505) در صورتی که دیتابیس خالی باشد
    $checkAdmin = $conn->query("SELECT id FROM users WHERE phone = '09921758505' LIMIT 1");
    if ($checkAdmin && $checkAdmin->num_rows === 0) {
        $adminStmt = $conn->prepare("INSERT INTO users (id, name, username, phone, password_hash, avatar, bio, is_premium, emoji_status, custom_color, role, stars_balance) VALUES (?, ?, ?, ?, ?, ?, ?, 1, '👑', 'purple', 'superadmin', 50000)");
        $id = 'usr_admin_09921758505';
        $name = 'مدیر ارشد سامانه (Super Admin)';
        $username = 'admin';
        $phone = '09921758505';
        $passHash = password_hash('admin123', PASSWORD_DEFAULT);
        $avatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';
        $bio = 'مدیر کل سامانه CloudPulse (شماره: 09921758505) • دسترسی ویژه به پنل مدیریت کل';
        $adminStmt->bind_param('sssssss', $id, $name, $username, $phone, $passHash, $avatar, $bio);
        $adminStmt->execute();
    }

    // ایجاد چت پیش‌فرض پیام‌های ذخیره شده در صورت خالی بودن
    $checkSaved = $conn->query("SELECT id FROM chats WHERE id = 'chat_saved_messages' LIMIT 1");
    if ($checkSaved && $checkSaved->num_rows === 0) {
        $savedChatStmt = $conn->prepare("INSERT INTO chats (id, type, title, avatar, description) VALUES (?, 'private', ?, ?, ?)");
        $cId = 'chat_saved_messages';
        $cTitle = 'پیام‌های ذخیره شده (Saved Messages)';
        $cAvatar = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80';
        $cDesc = 'فضای ابری شخصی شما برای نگهداری فایل‌ها و یادداشت‌ها';
        $savedChatStmt->bind_param('ssss', $cId, $cTitle, $cAvatar, $cDesc);
        $savedChatStmt->execute();
    }

    // ستون‌های جدید جدول chats برای سازنده گروه، نقش ادمین، اعضا و تماس
    $alterQueries = [
        "ALTER TABLE `chats` ADD COLUMN `creator_id` VARCHAR(64) DEFAULT NULL",
        "ALTER TABLE `chats` ADD COLUMN `is_user_admin` TINYINT(1) DEFAULT 1",
        "ALTER TABLE `chats` ADD COLUMN `members_json` LONGTEXT DEFAULT NULL",
        "ALTER TABLE `chats` ADD COLUMN `active_call_json` LONGTEXT DEFAULT NULL"
    ];
    foreach ($alterQueries as $altQ) {
        @$conn->query($altQ);
    }

    // به‌روزرسانی گروه‌های ایجاد شده قبلی تا دسترسی سازنده حفظ شود
    @$conn->query("UPDATE `chats` SET `is_user_admin` = 1 WHERE `type` IN ('group', 'supergroup', 'channel') AND `is_user_admin` IS NULL");

    return true;
}

// اجرای ساخت خودکار ساختار جداول
initializeDatabaseSchema($db);

// دریافت محتوای ورودی JSON
$rawInput = file_get_contents('php://input');
$inputData = json_decode($rawInput, true) ?: [];
$action = isset($_GET['action']) ? trim($_GET['action']) : (isset($inputData['action']) ? trim($inputData['action']) : 'status');

// ================================================================================
// پردازش اکشن‌ها و مسیرهای API (Endpoints)
// ================================================================================
switch ($action) {

    // ----------------------------------------------------------------------------
    // ۱. بررسی وضعیت سلامت و اتصال API (Health Check)
    // ----------------------------------------------------------------------------
    case 'status':
        $tableCounts = [];
        $tables = ['users', 'chats', 'messages', 'contacts', 'stories', 'chat_folders'];
        foreach ($tables as $t) {
            $res = $db->query("SELECT COUNT(*) as cnt FROM `$t`");
            $row = $res ? $res->fetch_assoc() : ['cnt' => 0];
            $tableCounts[$t] = (int)$row['cnt'];
        }

        sendSuccess([
            'api_name' => 'CloudPulse Telegram MySQL API Bridge',
            'version' => '2.0.0-production',
            'server_time' => date('Y-m-d H:i:s'),
            'database' => [
                'name' => DB_NAME,
                'host' => DB_HOST,
                'charset' => 'utf8mb4',
                'connected' => true,
                'tables' => $tableCounts
            ],
            'storage_engine' => 'MySQL / InnoDB with ACID Transactions',
            'cors_enabled' => true
        ], 'اتصال با پایگاه داده MySQL با موفقیت برقرار است.');
        break;

    // ----------------------------------------------------------------------------
    // ۲. دریافت تمام منابع جهت بارگذاری کلاینت (get_all)
    // ----------------------------------------------------------------------------
    case 'get_all':
        // الف) دریافت کاربران
        $users = [];
        $resUsers = $db->query("SELECT id, name, username, phone, avatar, bio, is_premium, emoji_status, custom_color, last_seen, is_online, role, stars_balance, is_banned FROM users ORDER BY created_at ASC");
        while ($row = $resUsers->fetch_assoc()) {
            $row['is_premium'] = (bool)$row['is_premium'];
            $row['is_online'] = (bool)$row['is_online'];
            $row['is_banned'] = (bool)$row['is_banned'];
            $row['stars_balance'] = (int)$row['stars_balance'];
            $users[] = $row;
        }

        // ب) دریافت گفتگوها
        $chats = [];
        $resChats = $db->query("SELECT * FROM chats ORDER BY is_pinned DESC, updated_at DESC");
        while ($row = $resChats->fetch_assoc()) {
            $membersDecoded = !empty($row['members_json']) ? json_decode($row['members_json'], true) : [];
            $activeCallDecoded = !empty($row['active_call_json']) ? json_decode($row['active_call_json'], true) : null;
            $creatorIdVal = !empty($row['creator_id']) ? $row['creator_id'] : null;
            $isUserAdminVal = isset($row['is_user_admin']) ? (bool)$row['is_user_admin'] : true;

            $chatItem = [
                'id' => $row['id'],
                'type' => $row['type'],
                'title' => $row['title'],
                'avatar' => $row['avatar'],
                'unreadCount' => (int)$row['unread_count'],
                'isPinned' => (bool)$row['is_pinned'],
                'isMuted' => (bool)$row['is_muted'],
                'draft' => $row['draft'],
                'draftText' => $row['draft_text'],
                'isVerified' => (bool)$row['is_verified'],
                'description' => $row['description'],
                'membersCount' => (int)$row['members_count'],
                'boostLevel' => (int)$row['boost_level'],
                'topics' => $row['topics_json'] ? json_decode($row['topics_json'], true) : [],
                'activeTopicId' => $row['active_topic_id'],
                'isSecret' => (bool)$row['is_secret'],
                'secretChatTimer' => (int)$row['secret_chat_timer'],
                'verificationFingerprint' => $row['verification_fingerprint'] ? explode(',', $row['verification_fingerprint']) : null,
                'lastMessage' => $row['last_message_json'] ? json_decode($row['last_message_json'], true) : null,
                'reactionPreview' => $row['reaction_preview'],
                'creatorId' => $creatorIdVal,
                'isUserAdmin' => $isUserAdminVal,
                'members' => $membersDecoded ?: [],
                'activeCall' => $activeCallDecoded
            ];
            $chats[] = $chatItem;
        }

        // ج) دریافت پیام‌ها به تفکیک گفتگو
        $messagesMap = [];
        $resMsgs = $db->query("SELECT * FROM messages ORDER BY created_at ASC");
        while ($row = $resMsgs->fetch_assoc()) {
            $cId = $row['chat_id'];
            if (!isset($messagesMap[$cId])) {
                $messagesMap[$cId] = [];
            }
            $messagesMap[$cId][] = [
                'id' => $row['id'],
                'chatId' => $row['chat_id'],
                'topicId' => $row['topic_id'],
                'senderId' => $row['sender_id'],
                'senderName' => $row['sender_name'],
                'senderAvatar' => $row['sender_avatar'],
                'isOutgoing' => (bool)$row['is_outgoing'],
                'text' => $row['text'],
                'type' => $row['type'],
                'mediaUrl' => $row['media_url'],
                'fileName' => $row['file_name'],
                'fileSize' => $row['file_size'],
                'voiceDuration' => $row['voice_duration'] ? (int)$row['voice_duration'] : null,
                'voiceWaveform' => $row['voice_waveform'] ? json_decode($row['voice_waveform'], true) : null,
                'transcript' => $row['transcript'],
                'translatedText' => $row['translated_text'],
                'isSpoiler' => (bool)$row['is_spoiler'],
                'isSilent' => (bool)$row['is_silent'],
                'isEdited' => (bool)$row['is_edited'],
                'replyTo' => $row['reply_to_json'] ? json_decode($row['reply_to_json'], true) : null,
                'forwardFrom' => $row['forward_from_json'] ? json_decode($row['forward_from_json'], true) : null,
                'reactions' => $row['reactions_json'] ? json_decode($row['reactions_json'], true) : [],
                'status' => $row['status'],
                'timestamp' => $row['timestamp'],
                'selfDestructIn' => $row['self_destruct_in'] ? (int)$row['self_destruct_in'] : null
            ];
        }

        // د) مخاطبین
        $contacts = [];
        $resContacts = $db->query("SELECT * FROM contacts ORDER BY name ASC");
        while ($row = $resContacts->fetch_assoc()) {
            $contacts[] = [
                'id' => $row['id'],
                'name' => $row['name'],
                'phone' => $row['phone'],
                'avatar' => $row['avatar'],
                'status' => $row['status'],
                'isOnline' => (bool)$row['is_online'],
                'username' => $row['username'],
                'bio' => $row['bio']
            ];
        }

        // هـ) استوری‌ها
        $stories = [];
        $resStories = $db->query("SELECT * FROM stories ORDER BY created_at DESC");
        while ($row = $resStories->fetch_assoc()) {
            $stories[] = [
                'id' => $row['id'],
                'userId' => $row['user_id'],
                'userName' => $row['user_name'],
                'userAvatar' => $row['user_avatar'],
                'mediaUrl' => $row['media_url'],
                'mediaType' => $row['media_type'],
                'caption' => $row['caption'],
                'expiryHours' => (int)$row['expiry_hours'],
                'timestamp' => $row['timestamp'],
                'viewsCount' => (int)$row['views_count'],
                'isSeen' => (bool)$row['is_seen'],
                'isStealth' => (bool)$row['is_stealth']
            ];
        }

        // و) پوشه‌ها
        $folders = [];
        $resFolders = $db->query("SELECT * FROM chat_folders ORDER BY id ASC");
        while ($row = $resFolders->fetch_assoc()) {
            $folders[] = [
                'id' => $row['id'],
                'name' => $row['name'],
                'iconName' => $row['icon_name'],
                'type' => $row['type'],
                'badgeCount' => (int)$row['badge_count']
            ];
        }

        sendSuccess([
            'users' => $users,
            'chats' => $chats,
            'messages' => $messagesMap,
            'contacts' => $contacts,
            'stories' => $stories,
            'folders' => $folders
        ], 'تمام اطلاعات با موفقیت از پایگاه‌داده MySQL استخراج شد.');
        break;

    // ----------------------------------------------------------------------------
    // ۳. همگام‌سازی تراکنشی کل داده‌ها (sync_all - Transactional Bulk Storage)
    // ----------------------------------------------------------------------------
    case 'sync_all':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            sendError('متد ارسالی باید POST باشد', 405);
        }

        $payload = $inputData['payload'] ?? $inputData;
        if (empty($payload)) {
            sendError('داده‌ای برای همگام‌سازی ارسال نشده است.');
        }

        // شروع تراکنش امن MySQL (ACID Transaction)
        $db->begin_transaction();

        try {
            // ۱. بروزرسانی یا درج کاربران
            if (!empty($payload['users']) && is_array($payload['users'])) {
                $userStmt = $db->prepare("INSERT INTO users (id, name, username, phone, avatar, bio, is_premium, emoji_status, custom_color, last_seen, is_online, role, stars_balance, is_banned) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                    name=VALUES(name), username=VALUES(username), phone=VALUES(phone), avatar=VALUES(avatar), bio=VALUES(bio), 
                    is_premium=VALUES(is_premium), emoji_status=VALUES(emoji_status), custom_color=VALUES(custom_color), 
                    last_seen=VALUES(last_seen), is_online=VALUES(is_online), role=VALUES(role), stars_balance=VALUES(stars_balance), is_banned=VALUES(is_banned)");
                
                foreach ($payload['users'] as $u) {
                    $uId = $u['id'];
                    $uName = $u['name'];
                    $uUser = $u['username'] ?? '';
                    $uPhone = $u['phone'] ?? '';
                    $uAvatar = $u['avatar'] ?? '';
                    $uBio = $u['bio'] ?? '';
                    $uPrem = !empty($u['isPremium']) ? 1 : 0;
                    $uEmoji = $u['emojiStatus'] ?? '';
                    $uColor = $u['customColor'] ?? 'blue';
                    $uLast = $u['lastSeen'] ?? 'هم‌اکنون آنلاین';
                    $uOnline = !empty($u['isOnline']) ? 1 : 0;
                    $uRole = $u['role'] ?? 'member';
                    $uStars = isset($u['starsBalance']) ? (int)$u['starsBalance'] : 0;
                    $uBanned = !empty($u['isBanned']) ? 1 : 0;

                    $userStmt->bind_param('ssssssissssiis', $uId, $uName, $uUser, $uPhone, $uAvatar, $uBio, $uPrem, $uEmoji, $uColor, $uLast, $uOnline, $uRole, $uStars, $uBanned);
                    $userStmt->execute();
                }
            }

            // ۲. گفتگوها
            if (!empty($payload['chats']) && is_array($payload['chats'])) {
                $chatStmt = $db->prepare("INSERT INTO chats (id, type, title, avatar, unread_count, is_pinned, is_muted, draft, draft_text, is_verified, description, members_count, boost_level, topics_json, active_topic_id, is_secret, secret_chat_timer, verification_fingerprint, last_message_json, reaction_preview)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                    type=VALUES(type), title=VALUES(title), avatar=VALUES(avatar), unread_count=VALUES(unread_count), 
                    is_pinned=VALUES(is_pinned), is_muted=VALUES(is_muted), draft=VALUES(draft), draft_text=VALUES(draft_text), 
                    is_verified=VALUES(is_verified), description=VALUES(description), members_count=VALUES(members_count), 
                    boost_level=VALUES(boost_level), topics_json=VALUES(topics_json), active_topic_id=VALUES(active_topic_id), 
                    is_secret=VALUES(is_secret), secret_chat_timer=VALUES(secret_chat_timer), verification_fingerprint=VALUES(verification_fingerprint), 
                    last_message_json=VALUES(last_message_json), reaction_preview=VALUES(reaction_preview)");

                foreach ($payload['chats'] as $c) {
                    $cId = $c['id'];
                    $cType = $c['type'] ?? 'private';
                    $cTitle = $c['title'] ?? '';
                    $cAvatar = $c['avatar'] ?? '';
                    $cUnread = isset($c['unreadCount']) ? (int)$c['unreadCount'] : 0;
                    $cPinned = !empty($c['isPinned']) ? 1 : 0;
                    $cMuted = !empty($c['isMuted']) ? 1 : 0;
                    $cDraft = $c['draft'] ?? '';
                    $cDraftText = $c['draftText'] ?? '';
                    $cVerified = !empty($c['isVerified']) ? 1 : 0;
                    $cDesc = $c['description'] ?? '';
                    $cMembers = isset($c['membersCount']) ? (int)$c['membersCount'] : 1;
                    $cBoost = isset($c['boostLevel']) ? (int)$c['boostLevel'] : 0;
                    $cTopics = !empty($c['topics']) ? json_encode($c['topics'], JSON_UNESCAPED_UNICODE) : null;
                    $cTopicId = $c['activeTopicId'] ?? null;
                    $cSecret = !empty($c['isSecret']) ? 1 : 0;
                    $cTimer = isset($c['secretChatTimer']) ? (int)$c['secretChatTimer'] : 0;
                    $cFingerprint = !empty($c['verificationFingerprint']) ? implode(',', $c['verificationFingerprint']) : null;
                    $cLastMsg = !empty($c['lastMessage']) ? json_encode($c['lastMessage'], JSON_UNESCAPED_UNICODE) : null;
                    $cReact = $c['reactionPreview'] ?? null;

                    $chatStmt->bind_param('ssssiiissisissiiisss', 
                        $cId, $cType, $cTitle, $cAvatar, $cUnread, $cPinned, $cMuted, $cDraft, $cDraftText, $cVerified,
                        $cDesc, $cMembers, $cBoost, $cTopics, $cTopicId, $cSecret, $cTimer, $cFingerprint, $cLastMsg, $cReact
                    );
                    $chatStmt->execute();
                }
            }

            // ۳. پیام‌ها
            if (!empty($payload['messages']) && is_array($payload['messages'])) {
                $msgStmt = $db->prepare("INSERT INTO messages (id, chat_id, topic_id, sender_id, sender_name, sender_avatar, is_outgoing, text, type, media_url, file_name, file_size, voice_duration, voice_waveform, transcript, translated_text, is_spoiler, is_silent, is_edited, reply_to_json, forward_from_json, reactions_json, status, timestamp, self_destruct_in)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                    text=VALUES(text), status=VALUES(status), reactions_json=VALUES(reactions_json), is_edited=VALUES(is_edited), translated_text=VALUES(translated_text)");

                // پشتیبانی از ساختار آبجکت { chatId: [Message] } یا آرایه مسطح
                $allMessages = [];
                if (isset($payload['messages'][0])) {
                    $allMessages = $payload['messages'];
                } else {
                    foreach ($payload['messages'] as $cId => $msgs) {
                        if (is_array($msgs)) {
                            foreach ($msgs as $m) $allMessages[] = $m;
                        }
                    }
                }

                foreach ($allMessages as $m) {
                    $mId = $m['id'];
                    $mChatId = $m['chatId'];
                    $mTopicId = $m['topicId'] ?? null;
                    $mSenderId = $m['senderId'] ?? 'usr_admin';
                    $mSenderName = $m['senderName'] ?? '';
                    $mSenderAvatar = $m['senderAvatar'] ?? '';
                    $mOutgoing = !empty($m['isOutgoing']) ? 1 : 0;
                    $mText = $m['text'] ?? '';
                    $mType = $m['type'] ?? 'text';
                    $mMedia = $m['mediaUrl'] ?? null;
                    $mFileName = $m['fileName'] ?? null;
                    $mFileSize = $m['fileSize'] ?? null;
                    $mVoiceDur = isset($m['voiceDuration']) ? (int)$m['voiceDuration'] : 0;
                    $mVoiceWave = !empty($m['voiceWaveform']) ? json_encode($m['voiceWaveform']) : null;
                    $mTranscript = $m['transcript'] ?? null;
                    $mTranslated = $m['translatedText'] ?? null;
                    $mSpoiler = !empty($m['isSpoiler']) ? 1 : 0;
                    $mSilent = !empty($m['isSilent']) ? 1 : 0;
                    $mEdited = !empty($m['isEdited']) ? 1 : 0;
                    $mReply = !empty($m['replyTo']) ? json_encode($m['replyTo'], JSON_UNESCAPED_UNICODE) : null;
                    $mFwd = !empty($m['forwardFrom']) ? json_encode($m['forwardFrom'], JSON_UNESCAPED_UNICODE) : null;
                    $mReactions = !empty($m['reactions']) ? json_encode($m['reactions'], JSON_UNESCAPED_UNICODE) : '[]';
                    $mStatus = $m['status'] ?? 'sent';
                    $mTime = $m['timestamp'] ?? date('H:i');
                    $mDestruct = isset($m['selfDestructIn']) ? (int)$m['selfDestructIn'] : null;

                    $msgStmt->bind_param('ssssssisssssisssiiisssssi', 
                        $mId, $mChatId, $mTopicId, $mSenderId, $mSenderName, $mSenderAvatar, $mOutgoing, $mText, $mType, $mMedia,
                        $mFileName, $mFileSize, $mVoiceDur, $mVoiceWave, $mTranscript, $mTranslated, $mSpoiler, $mSilent, $mEdited,
                        $mReply, $mFwd, $mReactions, $mStatus, $mTime, $mDestruct
                    );
                    $msgStmt->execute();
                }
            }

            // ۴. مخاطبین
            if (!empty($payload['contacts']) && is_array($payload['contacts'])) {
                $contactStmt = $db->prepare("INSERT INTO contacts (id, name, phone, avatar, status, is_online, username, bio)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                    name=VALUES(name), phone=VALUES(phone), avatar=VALUES(avatar), status=VALUES(status), is_online=VALUES(is_online), username=VALUES(username), bio=VALUES(bio)");

                foreach ($payload['contacts'] as $con) {
                    $cId = $con['id'];
                    $cName = $con['name'];
                    $cPhone = $con['phone'];
                    $cAvatar = $con['avatar'] ?? '';
                    $cStatus = $con['status'] ?? 'آنلاین';
                    $cOnline = !empty($con['isOnline']) ? 1 : 0;
                    $cUser = $con['username'] ?? '';
                    $cBio = $con['bio'] ?? '';

                    $contactStmt->bind_param('sssssiss', $cId, $cName, $cPhone, $cAvatar, $cStatus, $cOnline, $cUser, $cBio);
                    $contactStmt->execute();
                }
            }

            // ۵. استوری‌ها
            if (!empty($payload['stories']) && is_array($payload['stories'])) {
                $storyStmt = $db->prepare("INSERT INTO stories (id, user_id, user_name, user_avatar, media_url, media_type, caption, expiry_hours, timestamp, views_count, is_seen, is_stealth)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                    views_count=VALUES(views_count), is_seen=VALUES(is_seen)");

                foreach ($payload['stories'] as $st) {
                    $sId = $st['id'];
                    $sUid = $st['userId'];
                    $sUname = $st['userName'];
                    $sUavatar = $st['userAvatar'] ?? '';
                    $sMedia = $st['mediaUrl'];
                    $sType = $st['mediaType'] ?? 'image';
                    $sCap = $st['caption'] ?? '';
                    $sExp = isset($st['expiryHours']) ? (int)$st['expiryHours'] : 24;
                    $sTime = $st['timestamp'] ?? date('H:i');
                    $sViews = isset($st['viewsCount']) ? (int)$st['viewsCount'] : 0;
                    $sSeen = !empty($st['isSeen']) ? 1 : 0;
                    $sStealth = !empty($st['isStealth']) ? 1 : 0;

                    $storyStmt->bind_param('sssssssisiis', $sId, $sUid, $sUname, $sUavatar, $sMedia, $sType, $sCap, $sExp, $sTime, $sViews, $sSeen, $sStealth);
                    $storyStmt->execute();
                }
            }

            // تایید و نهایی‌سازی تراکنش
            $db->commit();
            sendSuccess(['synced_at' => date('Y-m-d H:i:s')], 'همگام‌سازی داده‌ها با پایگاه داده با موفقیت در قالب تراکنش امن انجام شد.');

        } catch (Exception $e) {
            $db->rollback();
            sendError('خطا در همگام‌سازی تراکنش دیتابیس: ' . $e->getMessage(), 500);
        }
        break;

    // ----------------------------------------------------------------------------
    // ۴. ثبت پیام تک‌گانه (save_message)
    // ----------------------------------------------------------------------------
    case 'save_message':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') sendError('متد POST نیاز است', 405);
        $m = $inputData;
        if (empty($m['id']) || empty($m['chatId'])) {
            sendError('شناسه پیام و شناسه چت الزامی است');
        }

        $stmt = $db->prepare("INSERT INTO messages (id, chat_id, topic_id, sender_id, sender_name, sender_avatar, is_outgoing, text, type, media_url, file_name, file_size, voice_duration, transcript, translated_text, is_spoiler, is_silent, reactions_json, status, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        
        $mId = $m['id'];
        $mChatId = $m['chatId'];
        $mTopicId = $m['topicId'] ?? null;
        $mSenderId = $m['senderId'] ?? 'usr_admin';
        $mSenderName = $m['senderName'] ?? '';
        $mSenderAvatar = $m['senderAvatar'] ?? '';
        $mOutgoing = !empty($m['isOutgoing']) ? 1 : 0;
        $mText = $m['text'] ?? '';
        $mType = $m['type'] ?? 'text';
        $mMedia = $m['mediaUrl'] ?? null;
        $mFileName = $m['fileName'] ?? null;
        $mFileSize = $m['fileSize'] ?? null;
        $mVoiceDur = isset($m['voiceDuration']) ? (int)$m['voiceDuration'] : 0;
        $mTranscript = $m['transcript'] ?? null;
        $mTranslated = $m['translatedText'] ?? null;
        $mSpoiler = !empty($m['isSpoiler']) ? 1 : 0;
        $mSilent = !empty($m['isSilent']) ? 1 : 0;
        $mReactions = !empty($m['reactions']) ? json_encode($m['reactions'], JSON_UNESCAPED_UNICODE) : '[]';
        $mStatus = $m['status'] ?? 'sent';
        $mTime = $m['timestamp'] ?? date('H:i');

        $stmt->bind_param('ssssssisssssisssisss',
            $mId, $mChatId, $mTopicId, $mSenderId, $mSenderName, $mSenderAvatar, $mOutgoing, $mText, $mType, $mMedia,
            $mFileName, $mFileSize, $mVoiceDur, $mTranscript, $mTranslated, $mSpoiler, $mSilent, $mReactions, $mStatus, $mTime
        );

        if ($stmt->execute()) {
            // بروزرسانی آخرین پیام در چت
            $lastMsgJson = json_encode([
                'text' => $mText ?: ($mType === 'photo' ? '📷 عکس' : '📎 فایل'),
                'timestamp' => $mTime,
                'senderName' => $mSenderName,
                'isOutgoing' => (bool)$mOutgoing,
                'status' => $mStatus
            ], JSON_UNESCAPED_UNICODE);
            $updChat = $db->prepare("UPDATE chats SET last_message_json = ?, updated_at = NOW() WHERE id = ?");
            $updChat->bind_param('ss', $lastMsgJson, $mChatId);
            $updChat->execute();

            sendSuccess(['id' => $mId], 'پیام با موفقیت در دیتابیس ثبت شد');
        } else {
            sendError('خطا در ذخیره پیام: ' . $db->error);
        }
        break;

    // ----------------------------------------------------------------------------
    // ۵. احراز هویت با نام کاربری و پسورد (login)
    // ----------------------------------------------------------------------------
    case 'login':
        $identifier = trim($inputData['identifier'] ?? '');
        $password = trim($inputData['password'] ?? '');

        if (!$identifier || !$password) {
            sendError('نام کاربری یا شماره موبایل و رمز عبور الزامی است.');
        }

        // بررسی کاربر سوپر ادمین 09921758505 یا نام کاربری izatesplay
        $isSuperAdmin = ($identifier === '09921758505' || strtolower($identifier) === 'izatesplay' || strtolower($identifier) === 'admin');

        $stmt = $db->prepare("SELECT * FROM users WHERE phone = ? OR username = ? LIMIT 1");
        $stmt->bind_param('ss', $identifier, $identifier);
        $stmt->execute();
        $user = $stmt->get_result()->fetch_assoc();

        if (!$user && $isSuperAdmin) {
            // ساخت سوپرادمین اتوماتیک
            $ins = $db->prepare("INSERT INTO users (id, name, username, phone, avatar, bio, is_premium, role, stars_balance) VALUES ('usr_admin_09921758505', 'مدیر ارشد سامانه (Super Admin)', 'izatesplay', '09921758505', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80', 'مدیر کل سامانه GODFATHER SQUAD (@izatesplay)', 1, 'superadmin', 50000)");
            $ins->execute();
            $user = [
                'id' => 'usr_admin_09921758505',
                'name' => 'مدیر ارشد سامانه (Super Admin)',
                'username' => 'izatesplay',
                'phone' => '09921758505',
                'avatar' => 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
                'is_premium' => 1,
                'role' => 'superadmin',
                'stars_balance' => 50000
            ];
        }

        if (!$user) {
            sendError('کاربری با این مشخصات یافت نشد.', 404);
        }

        if ($isSuperAdmin) {
            if ($password !== '09386561626mM@' && $password !== 'admin123') {
                sendError('کلمه عبور وارد شده نادرست است.', 401);
            }
        } else if (!empty($user['password_hash'])) {
            if (!password_verify($password, $user['password_hash'])) {
                sendError('کلمه عبور وارد شده نادرست است.', 401);
            }
        }

        if (!empty($user['is_banned'])) {
            sendError('حساب کاربری شما توسط مدیر مسدود شده است.', 403);
        }

        $token = 'cp_jwt_' . time() . '_' . bin2hex(random_bytes(16));
        sendSuccess([
            'token' => $token,
            'user' => [
                'id' => $user['id'],
                'name' => $user['name'],
                'username' => $user['username'],
                'phone' => $user['phone'],
                'avatar' => $user['avatar'],
                'bio' => $user['bio'],
                'isPremium' => (bool)$user['is_premium'],
                'role' => $user['role'],
                'starsBalance' => (int)$user['stars_balance'],
                'customColor' => $user['custom_color'] ?? 'blue'
            ]
        ], 'ورود با موفقیت انجام شد.');
        break;

    // ----------------------------------------------------------------------------
    // ۶. ثبت نام کاربر جدید (register)
    // ----------------------------------------------------------------------------
    case 'register':
        $name = trim($inputData['name'] ?? '');
        $username = trim($inputData['username'] ?? '');
        $phone = trim($inputData['phone'] ?? '');
        $password = trim($inputData['password'] ?? '');
        $avatar = $inputData['avatar'] ?? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
        $bio = trim($inputData['bio'] ?? '');

        if (!$name || !$username || !$phone || !$password) {
            sendError('تمام فیلدهای ثبت نام الزامی است.');
        }

        // بررسی تکراری نبودن شماره یا یوزرنیم
        $cleanUsername = strtolower(ltrim(trim($username), '@'));
        $chkPhone = $db->prepare("SELECT id FROM users WHERE phone = ? LIMIT 1");
        $chkPhone->bind_param('s', $phone);
        $chkPhone->execute();
        if ($chkPhone->get_result()->num_rows > 0) {
            sendError('این شماره موبایل قبلاً در سامانه ثبت شده است. لطفاً وارد شوید.');
        }

        $chkUser = $db->prepare("SELECT id FROM users WHERE LOWER(username) = ? LIMIT 1");
        $chkUser->bind_param('s', $cleanUsername);
        $chkUser->execute();
        if ($chkUser->get_result()->num_rows > 0) {
            sendError("نام کاربری «@$cleanUsername» قبلاً توسط کاربر دیگری ثبت شده و اختصاصی است.");
        }

        $chkChat = $db->prepare("SELECT id FROM chats WHERE LOWER(username) = ? LIMIT 1");
        $chkChat->bind_param('s', $cleanUsername);
        $chkChat->execute();
        if ($chkChat->get_result()->num_rows > 0) {
            sendError("شناسه «@$cleanUsername» قبلاً برای یک کانال یا گروه ثبت شده است.");
        }

        $isSuperAdmin = ($phone === '09921758505' || $cleanUsername === 'admin' || $cleanUsername === 'izatesplay');
        $role = $isSuperAdmin ? 'superadmin' : 'member';
        $isPremium = $isSuperAdmin ? 1 : 0;
        $stars = $isSuperAdmin ? 50000 : 100;
        $id = 'usr_' . time() . '_' . rand(100, 999);
        $passHash = password_hash($password, PASSWORD_DEFAULT);

        $stmt = $db->prepare("INSERT INTO users (id, name, username, phone, password_hash, avatar, bio, is_premium, role, stars_balance) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param('ssssssisss', $id, $name, $cleanUsername, $phone, $passHash, $avatar, $bio, $isPremium, $role, $stars);
        
        if ($stmt->execute()) {
            sendSuccess([
                'user' => [
                    'id' => $id,
                    'name' => $name,
                    'username' => $cleanUsername,
                    'phone' => $phone,
                    'avatar' => $avatar,
                    'bio' => $bio,
                    'isPremium' => (bool)$isPremium,
                    'role' => $role,
                    'starsBalance' => $stars,
                    'customColor' => 'blue'
                ]
            ], 'ثبت‌نام با موفقیت انجام شد.');
        } else {
            sendError('خطا در ثبت نام: ' . $db->error);
        }
        break;

    // ----------------------------------------------------------------------------
    // ۷. ساخت یا ویرایش گفتگو (save_chat)
    // ----------------------------------------------------------------------------
    case 'save_chat':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') sendError('متد POST نیاز است', 405);
        $c = $inputData;
        if (empty($c['id']) || empty($c['title'])) {
            sendError('شناسه و عنوان گفتگو الزامی است.');
        }

        $cId = $c['id'];
        $cType = $c['type'] ?? 'private';
        $cTitle = $c['title'];
        $cAvatar = $c['avatar'] ?? '';
        $cDesc = $c['description'] ?? '';
        $cCreatorId = $c['creatorId'] ?? null;
        $cIsUserAdmin = isset($c['isUserAdmin']) ? ($c['isUserAdmin'] ? 1 : 0) : 1;
        $cUsername = !empty($c['username']) ? strtolower(ltrim(trim($c['username']), '@')) : null;
        $cMembersJson = !empty($c['members']) ? json_encode($c['members'], JSON_UNESCAPED_UNICODE) : null;
        $cActiveCallJson = !empty($c['activeCall']) ? json_encode($c['activeCall'], JSON_UNESCAPED_UNICODE) : null;

        // بررسی یکتایی و اختصاصی بودن آیدی کانال یا گروه
        if ($cUsername) {
            $chkChatDup = $db->prepare("SELECT id FROM chats WHERE LOWER(username) = ? AND id != ? LIMIT 1");
            $chkChatDup->bind_param('ss', $cUsername, $cId);
            $chkChatDup->execute();
            if ($chkChatDup->get_result()->num_rows > 0) {
                sendError("شناسه «@$cUsername» قبلاً برای یک کانال یا گروه دیگر ثبت شده است و تکراری است.");
            }

            $chkUserDup = $db->prepare("SELECT id FROM users WHERE LOWER(username) = ? LIMIT 1");
            $chkUserDup->bind_param('s', $cUsername);
            $chkUserDup->execute();
            if ($chkUserDup->get_result()->num_rows > 0) {
                sendError("شناسه «@$cUsername» قبلاً توسط یک کاربر ثبت شده است و امکان استفاده برای کانال وجود ندارد.");
            }
        }

        $stmt = $db->prepare("INSERT INTO chats (id, type, title, avatar, description, creator_id, is_user_admin, username, members_json, active_call_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE title=VALUES(title), avatar=VALUES(avatar), description=VALUES(description), creator_id=COALESCE(VALUES(creator_id), creator_id), is_user_admin=VALUES(is_user_admin), username=VALUES(username), members_json=COALESCE(VALUES(members_json), members_json), active_call_json=VALUES(active_call_json)");
        $stmt->bind_param('ssssssisss', $cId, $cType, $cTitle, $cAvatar, $cDesc, $cCreatorId, $cIsUserAdmin, $cUsername, $cMembersJson, $cActiveCallJson);
        if ($stmt->execute()) {
            sendSuccess(['id' => $cId, 'username' => $cUsername], 'گفتگو با موفقیت ذخیره شد.');
        } else {
            sendError('خطا در ذخیره گفتگو: ' . $db->error);
        }
        break;

    // ----------------------------------------------------------------------------
    // ۸. ذخیره استوری جدید (save_story)
    // ----------------------------------------------------------------------------
    case 'save_story':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') sendError('متد POST نیاز است', 405);
        $st = $inputData;
        if (empty($st['mediaUrl']) || empty($st['userId'])) {
            sendError('فایل رسانه و شناسه کاربر الزامی است.');
        }

        $sId = $st['id'] ?? ('story_' . time());
        $sUid = $st['userId'];
        $sUname = $st['userName'] ?? 'کاربر';
        $sUavatar = $st['userAvatar'] ?? '';
        $sMedia = $st['mediaUrl'];
        $sType = $st['mediaType'] ?? 'image';
        $sCap = $st['caption'] ?? '';
        $sExp = isset($st['expiryHours']) ? (int)$st['expiryHours'] : 24;
        $sTime = $st['timestamp'] ?? date('H:i');

        $stmt = $db->prepare("INSERT INTO stories (id, user_id, user_name, user_avatar, media_url, media_type, caption, expiry_hours, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param('sssssssis', $sId, $sUid, $sUname, $sUavatar, $sMedia, $sType, $sCap, $sExp, $sTime);
        if ($stmt->execute()) {
            sendSuccess(['id' => $sId], 'استوری با موفقیت منتشر و در دیتابیس ثبت شد.');
        } else {
            sendError('خطا در ثبت استوری: ' . $db->error);
        }
        break;

    // ----------------------------------------------------------------------------
    // ۹. حذف گفتگو یا پاک‌سازی داده‌ها (delete_chat / reset)
    // ----------------------------------------------------------------------------
    case 'delete_chat':
        $chatId = $inputData['chatId'] ?? $_GET['chatId'] ?? '';
        if (!$chatId) sendError('شناسه چت الزامی است.');

        $stmt = $db->prepare("DELETE FROM chats WHERE id = ?");
        $stmt->bind_param('s', $chatId);
        $stmt->execute();
        $db->query("DELETE FROM messages WHERE chat_id = '$chatId'");
        sendSuccess(['chatId' => $chatId], 'گفتگو و تمام پیام‌های آن حذف شدند.');
        break;

    // ۱۰. بررسی وجود شماره تلفن در کاربران تلگرام (check_phone)
    case 'check_phone':
        $phone = trim($_GET['phone'] ?? $inputData['phone'] ?? '');
        if (!$phone) sendError('شماره تلفن ارسال نشده است.');

        // نرمال‌سازی شماره (حذف فاصله‌ها و تبدیل 98 به 0)
        $cleanPhone = preg_replace('/[^0-9]/', '', $phone);
        if (strpos($cleanPhone, '98') === 0) {
            $cleanPhone = '0' . substr($cleanPhone, 2);
        }

        $stmt = $db->prepare("SELECT id, name, username, phone, avatar, bio, is_premium, last_seen, is_online FROM users WHERE phone = ? OR REPLACE(REPLACE(phone, ' ', ''), '+98', '0') = ? LIMIT 1");
        $stmt->bind_param('ss', $phone, $cleanPhone);
        $stmt->execute();
        $userRow = $stmt->get_result()->fetch_assoc();

        if ($userRow) {
            sendSuccess([
                'exists' => true,
                'user' => [
                    'id' => $userRow['id'],
                    'name' => $userRow['name'],
                    'username' => $userRow['username'],
                    'phone' => $userRow['phone'],
                    'avatar' => $userRow['avatar'],
                    'bio' => $userRow['bio'],
                    'isPremium' => (bool)$userRow['is_premium'],
                    'lastSeen' => $userRow['last_seen'],
                    'isOnline' => (bool)$userRow['is_online']
                ]
            ], 'کاربر در سامانه تلگرام یافت شد.');
        } else {
            sendSuccess([
                'exists' => false,
                'message' => 'این شماره تلفن هنوز در تلگرام ثبت‌نام نکرده است.'
            ], 'کاربر یافت نشد.');
        }
        break;

    // ۱۱. ذخیره مخاطب جدید در دیتابیس (save_contact)
    case 'save_contact':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') sendError('متد POST نیاز است', 405);
        $cnt = $inputData;
        if (empty($cnt['id']) || empty($cnt['name']) || empty($cnt['phone'])) {
            sendError('اطلاعات مخاطب ناقص است.');
        }

        $cntId = $cnt['id'];
        $cntName = $cnt['name'];
        $cntPhone = $cnt['phone'];
        $cntAvatar = $cnt['avatar'] ?? '';
        $cntStatus = $cnt['status'] ?? 'آنلاین';
        $cntOnline = !empty($cnt['isOnline']) ? 1 : 0;
        $cntUser = $cnt['username'] ?? '';
        $cntBio = $cnt['bio'] ?? '';

        $stmt = $db->prepare("INSERT INTO contacts (id, name, phone, avatar, status, is_online, username, bio) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE name=VALUES(name), avatar=VALUES(avatar), status=VALUES(status), is_online=VALUES(is_online)");
        $stmt->bind_param('sssssiss', $cntId, $cntName, $cntPhone, $cntAvatar, $cntStatus, $cntOnline, $cntUser, $cntBio);
        if ($stmt->execute()) {
            sendSuccess($cnt, 'مخاطب در دیتابیس ذخیره شد.');
        } else {
            sendError('خطا در ذخیره مخاطب: ' . $db->error);
        }
        break;

    // ۱۲. ترجمه آنلاین پیام‌ها (translate)
    case 'translate':
        $req = $inputData;
        $txt = isset($req['text']) ? trim($req['text']) : '';
        $tl = isset($req['targetLang']) ? trim($req['targetLang']) : 'en';

        if (empty($txt)) {
            sendSuccess(['translatedText' => '', 'sourceLang' => 'auto', 'targetLang' => $tl]);
        }

        $url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=' . urlencode($tl) . '&dt=t&q=' . urlencode($txt);
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 6);
        curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
        $resp = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 200 && $resp) {
            $data = json_decode($resp, true);
            if (is_array($data) && isset($data[0]) && is_array($data[0])) {
                $translated = '';
                foreach ($data[0] as $seg) {
                    if (is_array($seg) && isset($seg[0])) {
                        $translated .= $seg[0];
                    }
                }
                if (!empty($translated)) {
                    $sourceLang = isset($data[2]) ? $data[2] : 'auto';
                    sendSuccess([
                        'translatedText' => trim($translated),
                        'sourceLang' => $sourceLang,
                        'targetLang' => $tl
                    ], 'ترجمه با موفقیت انجام شد.');
                }
            }
        }

        // اگر ارتباط با سرور گوگل برقرار نشد
        sendSuccess([
            'translatedText' => $txt,
            'sourceLang' => 'auto',
            'targetLang' => $tl
        ], 'ترجمه انجام نشد');
        break;

    // ۱۳. بررسی یکتایی و در دسترس بودن نام کاربری / شناسه کانال (check_username)
    case 'check_username':
        $rawUsername = trim($_GET['username'] ?? $inputData['username'] ?? '');
        $excludeId = trim($_GET['excludeId'] ?? $inputData['excludeId'] ?? '');
        $username = strtolower(ltrim($rawUsername, '@'));

        if (empty($username) || strlen($username) < 3) {
            sendSuccess(['available' => false, 'message' => 'شناسه یا نام کاربری باید حداقل ۳ نویسه باشد.'], 'شناسه نامعتبر است.');
        }

        if (!preg_match('/^[a-z0-9_]{3,32}$/', $username)) {
            sendSuccess(['available' => false, 'message' => 'نام کاربری فقط می‌تواند شامل حروف انگلیسی (a-z)، اعداد و زیرخط (_) باشد.'], 'فرمت نامعتبر است.');
        }

        // ۱. بررسی در میان کاربران
        $chkUser = $db->prepare("SELECT id FROM users WHERE LOWER(username) = ? AND id != ? LIMIT 1");
        $chkUser->bind_param('ss', $username, $excludeId);
        $chkUser->execute();
        if ($chkUser->get_result()->num_rows > 0) {
            sendSuccess(['available' => false, 'message' => "نام کاربری «@$username» قبلاً توسط کاربر دیگری ثبت شده و اختصاصی است."], 'نام کاربری تکراری است.');
        }

        // ۲. بررسی در میان کانال‌ها و گروه‌ها
        $chkChat = $db->prepare("SELECT id, type, title FROM chats WHERE LOWER(username) = ? AND id != ? LIMIT 1");
        $chkChat->bind_param('ss', $username, $excludeId);
        $chkChat->execute();
        $chatRow = $chkChat->get_result()->fetch_assoc();
        if ($chatRow) {
            $chatTypeLabel = ($chatRow['type'] === 'channel') ? 'کانال' : 'گروه';
            sendSuccess(['available' => false, 'message' => "شناسه «@$username» قبلاً برای $chatTypeLabel «{$chatRow['title']}» ثبت شده است."], 'شناسه تکراری است.');
        }

        sendSuccess(['available' => true, 'message' => "شناسه @$username آزاد، اختصاصی و قابل ثبت است."], 'شناسه در دسترس است.');
        break;

    // ۱۴. بروزرسانی پروفایل کاربر (update_user) با اعتبارسنجی نام کاربری
    case 'update_user':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') sendError('متد POST نیاز است', 405);
        $uData = $inputData;
        $uId = trim($uData['id'] ?? '');
        if (!$uId) sendError('شناسه کاربر الزامی است.');

        $uName = trim($uData['name'] ?? '');
        $rawUName = trim($uData['username'] ?? '');
        $uBio = trim($uData['bio'] ?? '');
        $uAvatar = $uData['avatar'] ?? null;

        if (!empty($rawUName)) {
            $cleanUName = strtolower(ltrim($rawUName, '@'));
            if (strlen($cleanUName) < 3) {
                sendError('نام کاربری باید حداقل ۳ نویسه باشد.');
            }
            if (!preg_match('/^[a-z0-9_]{3,32}$/', $cleanUName)) {
                sendError('نام کاربری فقط می‌تواند شامل حروف انگلیسی، اعداد و زیرخط باشد.');
            }

            // بررسی تکراری نبودن در بین دیگر کاربران
            $chkUser = $db->prepare("SELECT id FROM users WHERE LOWER(username) = ? AND id != ? LIMIT 1");
            $chkUser->bind_param('ss', $cleanUName, $uId);
            $chkUser->execute();
            if ($chkUser->get_result()->num_rows > 0) {
                sendError("نام کاربری «@$cleanUName» قبلاً توسط کاربر دیگری رزرو شده است.");
            }

            // بررسی تکراری نبودن با کانال‌ها
            $chkChat = $db->prepare("SELECT id FROM chats WHERE LOWER(username) = ? LIMIT 1");
            $chkChat->bind_param('s', $cleanUName);
            $chkChat->execute();
            if ($chkChat->get_result()->num_rows > 0) {
                sendError("شناسه «@$cleanUName» برای یک کانال یا گروه ثبت شده است.");
            }
        } else {
            $cleanUName = null;
        }

        $stmt = $db->prepare("UPDATE users SET name = COALESCE(NULLIF(?, ''), name), username = COALESCE(?, username), bio = COALESCE(?, bio), avatar = COALESCE(?, avatar) WHERE id = ?");
        $stmt->bind_param('sssss', $uName, $cleanUName, $uBio, $uAvatar, $uId);
        if ($stmt->execute()) {
            sendSuccess(['id' => $uId, 'username' => $cleanUName], 'پروفایل کاربر با موفقیت به‌روزرسانی شد.');
        } else {
            sendError('خطا در بروزرسانی پروفایل: ' . $db->error);
        }
        break;

    default:
        sendError("اکشن درخواستی نامعتبر است: '$action'", 404);
        break;
}
?>
