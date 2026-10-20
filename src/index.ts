import { Client, GatewayIntentBits, Collection, Partials } from 'discord.js';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { CONFIG } from './config';
import { startKeepAlive } from './keepalive';

// Load environment variables
config();

// Extend Client to hold commands and giveaways
declare module 'discord.js' {
    export interface Client {
        commands: Collection<string, any>;
        giveaways: Collection<string, any>;
    }
}

// Initialize Client function
let client: Client | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY = 5000; // 5 seconds

function startDiscordBot() {
    if (client) return; // Already running

    client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.GuildPresences
        ],
        partials: [Partials.User, Partials.GuildMember, Partials.Message]
    });

    client.commands = new Collection();
    client.giveaways = new Collection();

    // Load Commands
    const commandsPath = path.join(__dirname, 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        delete require.cache[require.resolve(filePath)]; // Clear cache for hot-reload
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.warn(`[UYARI] ${file} geçerli bir data veya execute barındırmıyor!`);
        }
    }
    console.log(`[BOT] Toplam ${client.commands.size} komut başarıyla yüklendi.`);

    // Load Events
    const eventsPath = path.join(__dirname, 'events');
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));

    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        delete require.cache[require.resolve(filePath)]; // Clear cache
        const event = require(filePath);
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args, client));
        } else {
            client.on(event.name, (...args) => event.execute(...args, client));
        }
    }

    // Auto-reconnect on disconnect
    client.on('shardDisconnect', (event) => {
        console.warn(`[WARN] Shard disconnected. Code: ${event.code}. Reason: ${event.reason}`);
        scheduleReconnect();
    });

    client.on('shardError', (error) => {
        console.error('[ERROR] Shard error:', error);
    });

    client.on('shardReconnecting', (shardId) => {
        console.log(`[INFO] Shard ${shardId} reconnecting...`);
    });

    // Debug & rate limit monitoring
    client.on('debug', (info) => {
        if (!info.includes('Heartbeat') && !info.includes('latency')) {
            console.log(`[DISCORD DEBUG] ${info}`);
        }
    });

    client.on('error', (error) => {
        console.error(`[DISCORD CLIENT ERROR]`, error);
    });

    client.rest.on('rateLimited', (rateLimitInfo) => {
        console.warn(`[DISCORD RATE-LIMIT]`, rateLimitInfo);
    });

    // Clean token (strip potential quotes or "Bot " prefix from environment)
    const rawToken = process.env.TOKEN ? process.env.TOKEN.trim().replace(/^["']|["']$/g, '').replace(/^Bot\s+/i, '') : '';

    console.log(`[BOT] startDiscordBot() başlatıldı.`);
    console.log(`[BOT] Token durumu: ${rawToken ? `MEVCUT (Uzunluk: ${rawToken.length})` : 'TANIMSIZ / BOŞ!'}`);

    // Validate token before login
    if (!rawToken) {
        console.error("================================================================");
        console.error("[FATAL ERROR] Discord TOKEN tanımlı değil!");
        console.error("Eğer Render kullanıyorsanız:");
        console.error("1. Render Dashboard'a gidin -> Servisinizi seçin.");
        console.error("2. Sol menüden 'Environment' sekmesine tıklayın.");
        console.error("3. 'Add Environment Variable' diyerek:");
        console.error("   Key: TOKEN");
        console.error("   Value: [Discord Bot Token'ınız]");
        console.error("   yazıp kaydedin ve Deploy edin.");
        console.error("================================================================");
        return;
    }

    // Login with timeout alert
    console.log(`[BOT] Discord API'ye giriş yapılıyor (client.login)...`);
    const loginTimeout = setTimeout(() => {
        console.warn(`[UYARI] Discord'a 15 saniyedir bağlanılamadı!`);
        console.warn(`[UYARI] Eğer burada takılı kalıyorsa Discord, Render'ın IP adresini geçici olarak engellemiş (Cloudflare 429) veya bağlantıyı bekletiyor olabilir.`);
    }, 15000);

    client.login(rawToken).then(() => {
        clearTimeout(loginTimeout);
        reconnectAttempts = 0; // Reset on successful login
        console.log(`[INFO] Bot Discord API'ye başarıyla bağlandı!`);
    }).catch(error => {
        clearTimeout(loginTimeout);
        console.error("[ERROR] Discord'a giriş yapılamadı!", error);
        if (error?.message?.includes('An invalid token was provided')) {
            console.error("[HATA] Girilen TOKEN geçersiz! Lütfen Discord Developer Portal'dan yeni bir token alıp Render Environment ayarlarına ekleyin.");
        } else if (error?.message?.includes('Privileged intent') || error?.message?.includes('disallowed intents')) {
            console.error("[HATA] Privileged Gateway Intents (Presence, Server Members, Message Content) Discord Developer Portal'da açık değil!");
        } else if (error?.status === 429 || error?.message?.includes('429')) {
            console.error("[HATA] Cloudflare / Discord 429 Rate Limit! Render sunucusunun IP adresi Discord tarafından geçici olarak engellenmiş olabilir.");
        }
        scheduleReconnect();
    });
}

function scheduleReconnect() {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.error(`[FATAL] Max reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Giving up.`);
        return;
    }

    if (client) {
        client.destroy();
        client = null;
    }

    const delay = BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts);
    reconnectAttempts++;
    console.log(`[RECONNECT] Attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${delay / 1000}s...`);

    setTimeout(() => {
        startDiscordBot();
    }, delay);
}

function stopDiscordBot() {
    if (client) {
        client.destroy();
        client = null;
        reconnectAttempts = 0;
        console.log("[INFO] Bot kapatıldı (Dashboard üzerinden).");
    }
}

function getBotStats() {
    if (!client) return { ping: 0, uptime: 0, servers: 0, users: 0 };
    return {
        ping: client.ws.ping,
        uptime: client.uptime,
        servers: client.guilds.cache.size,
        users: client.users.cache.size
    };
}

// Prevent process from crashing on unhandled errors
process.on('unhandledRejection', (reason, promise) => {
    console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
    console.error('[FATAL] Bot ayakta tutuluyor...');
});

process.on('uncaughtException', (error) => {
    console.error('[FATAL] Uncaught Exception:', error);
    console.error('[FATAL] Bot ayakta tutuluyor...');
    // If the client is dead, try to reconnect
    if (!client || !client.isReady()) {
        scheduleReconnect();
    }
});

process.on('SIGTERM', () => {
    console.log('[INFO] SIGTERM received. Shutting down gracefully...');
    if (client) {
        client.destroy();
    }
    process.exit(0);
});

// Start everything
import { startDashboard, setBotFunctions } from './dashboard';

setBotFunctions(startDiscordBot, stopDiscordBot, getBotStats);
startDiscordBot();
startDashboard(startDiscordBot, stopDiscordBot);
startKeepAlive();
