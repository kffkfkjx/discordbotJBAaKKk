import { Client, GatewayIntentBits, Collection, Partials } from 'discord.js';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { CONFIG } from './config';
import { startKeepAlive } from './keepalive';

// Load environment variables
config();

// Stray src/db.json varsa sil (ts-node'da require('../db') çakışmasını önler)
try {
    const strayDbJson = path.join(__dirname, 'db.json');
    if (fs.existsSync(strayDbJson)) {
        fs.unlinkSync(strayDbJson);
        console.log('[CLEANUP] Çakışan src/db.json dosyası temizlendi.');
    }
} catch {}

// Extend Client to hold commands and giveaways
declare module 'discord.js' {
    export interface Client {
        commands: Collection<string, any>;
        giveaways: Collection<string, any>;
    }
}

// Initialize Client function
let client: Client | null = null;
let isBotStartingOrRunning = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY = 5000; // 5 seconds

function startDiscordBot() {
    if (client || isBotStartingOrRunning) {
        console.warn('[WARN] startDiscordBot() zaten çalışıyor, mükerrer başlatma engellendi.');
        return;
    }
    isBotStartingOrRunning = true;

    console.log(`[BOOT] Bot başlatılıyor... (PID: ${process.pid})`);

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

    // Load Commands (Aynı isimli hem .ts hem .js varsa tek birini al)
    const commandsPath = path.join(__dirname, 'commands');
    const rawCommandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));
    const loadedCmdBases = new Set<string>();
    const commandFiles = rawCommandFiles.filter(file => {
        const base = path.basename(file, path.extname(file));
        if (loadedCmdBases.has(base)) return false;
        loadedCmdBases.add(base);
        return true;
    });

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        delete require.cache[require.resolve(filePath)]; // Clear cache for hot-reload
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        }
    }

    // Load Events (Aynı isimli hem .ts hem .js varsa SADECE BİRİNİ bağla - çift dinleyici engeli!)
    const eventsPath = path.join(__dirname, 'events');
    const rawEventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));
    const loadedEventBases = new Set<string>();
    const eventFiles = rawEventFiles.filter(file => {
        const base = path.basename(file, path.extname(file));
        if (loadedEventBases.has(base)) return false;
        loadedEventBases.add(base);
        return true;
    });

    const botClient = client;
    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        delete require.cache[require.resolve(filePath)]; // Clear cache
        const event = require(filePath);
        if (!event?.name || typeof event.execute !== 'function') {
            console.warn(`[WARN] Geçersiz event dosyası atlandı: ${file}`);
            continue;
        }

        // Her event'i güvenli sarmalayıcıya al: bir event'te oluşan hata
        // (senkron veya async) botu etkilemez, sadece loglanır.
        const safeHandler = async (...args: any[]) => {
            try {
                await event.execute(...args, botClient);
            } catch (error) {
                console.error(`[EVENT ERROR] ${event.name} (${file}):`, error);
            }
        };

        if (event.once) {
            client.once(event.name, safeHandler);
        } else {
            client.on(event.name, safeHandler);
        }
    }

    // Shard events (Discord.js shardı otomatik olarak yeniden bağlar)
    client.on('shardDisconnect', (event) => {
        console.warn(`[WARN] Shard disconnected. Code: ${event.code}. Reason: ${event.reason}`);
    });

    client.on('shardError', (error) => {
        console.error('[ERROR] Shard error:', error);
    });

    client.on('shardReconnecting', (shardId) => {
        console.log(`[INFO] Shard ${shardId} reconnecting...`);
    });

    // Login
    client.login(process.env.TOKEN).then(() => {
        reconnectAttempts = 0; // Reset on successful login
    }).catch(error => {
        console.error("[ERROR] Failed to login.", error);
        scheduleReconnect();
    });
}

function scheduleReconnect() {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.error(`[FATAL] Max reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Giving up.`);
        return;
    }

    if (client) {
        try {
            client.destroy();
        } catch {}
        client = null;
    }
    isBotStartingOrRunning = false;

    const delay = BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts);
    reconnectAttempts++;
    console.log(`[RECONNECT] Attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${delay / 1000}s...`);

    setTimeout(() => {
        startDiscordBot();
    }, delay);
}

function stopDiscordBot() {
    if (client) {
        try {
            client.destroy();
        } catch {}
        client = null;
        isBotStartingOrRunning = false;
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
