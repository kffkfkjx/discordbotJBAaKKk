
import { Client, GatewayIntentBits, Collection, Partials } from 'discord.js';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { CONFIG } from './config';
import { startKeepAlive } from './keepalive';

// Load environment variables
config();

console.log('[BOOT] Bot başlatılıyor...');
console.log('[DEBUG] Environment kontrolü:', {
    tokenExists: !!process.env.TOKEN,
    tokenLength: process.env.TOKEN?.length ?? 0,
    nodeVersion: process.version,
    pid: process.pid
});

// Stray src/db.json varsa sil
try {
    const strayDbJson = path.join(__dirname, 'db.json');

    if (fs.existsSync(strayDbJson)) {
        fs.unlinkSync(strayDbJson);
        console.log('[CLEANUP] Çakışan src/db.json dosyası temizlendi.');
    }
} catch (error) {
    console.error('[CLEANUP ERROR]', error);
}

// Extend Client
declare module 'discord.js' {
    export interface Client {
        commands: Collection<string, any>;
        giveaways: Collection<string, any>;
    }
}

let client: Client | null = null;
let isBotStartingOrRunning = false;
let reconnectAttempts = 0;

const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY = 5000;

function startDiscordBot() {
    if (client || isBotStartingOrRunning) {
        console.warn('[WARN] startDiscordBot() zaten çalışıyor.');
        return;
    }

    isBotStartingOrRunning = true;

    console.log(`[BOOT] Discord bot hazırlanıyor... PID: ${process.pid}`);

    if (!process.env.TOKEN) {
        console.error('[ERROR] TOKEN environment değişkeni bulunamadı!');
        isBotStartingOrRunning = false;
        return;
    }

    client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.GuildPresences
        ],
        partials: [
            Partials.User,
            Partials.GuildMember,
            Partials.Message
        ]
    });

    client.commands = new Collection();
    client.giveaways = new Collection();

    // Load Commands
    const commandsPath = path.join(__dirname, 'commands');

    if (!fs.existsSync(commandsPath)) {
        throw new Error(`Commands klasörü bulunamadı: ${commandsPath}`);
    }

    const rawCommandFiles = fs.readdirSync(commandsPath)
        .filter(file => file.endsWith('.ts') || file.endsWith('.js'));

    const loadedCmdBases = new Set<string>();

    const commandFiles = rawCommandFiles.filter(file => {
        const base = path.basename(file, path.extname(file));

        if (loadedCmdBases.has(base)) return false;

        loadedCmdBases.add(base);
        return true;
    });

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);

        delete require.cache[require.resolve(filePath)];

        const command = require(filePath);

        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        }
    }

    console.log(`[COMMANDS] ${client.commands.size} komut yüklendi.`);

    // Load Events
    const eventsPath = path.join(__dirname, 'events');

    if (!fs.existsSync(eventsPath)) {
        throw new Error(`Events klasörü bulunamadı: ${eventsPath}`);
    }

    const rawEventFiles = fs.readdirSync(eventsPath)
        .filter(file => file.endsWith('.ts') || file.endsWith('.js'));

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

        delete require.cache[require.resolve(filePath)];

        const event = require(filePath);

        if (!event?.name || typeof event.execute !== 'function') {
            console.warn(`[WARN] Geçersiz event dosyası: ${file}`);
            continue;
        }

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

    console.log(`[EVENTS] ${eventFiles.length} event dosyası tarandı.`);

    // Discord bağlantı olayları
    client.on('shardDisconnect', (event, shardId) => {
        console.warn(
            `[GATEWAY] Shard ${shardId} bağlantısı kesildi.`,
            'Kod:', event.code,
            'Sebep:', event.reason
        );
    });

    client.on('shardError', error => {
        console.error('[GATEWAY ERROR]', error);
    });

    client.on('shardReconnecting', shardId => {
        console.log(`[GATEWAY] Shard ${shardId} yeniden bağlanıyor.`);
    });

    client.on('shardReady', shardId => {
        console.log(`[GATEWAY] Shard ${shardId} hazır.`);
    });

    client.on('error', error => {
        console.error('[DISCORD CLIENT ERROR]', error);
    });

    client.on('warn', warning => {
        console.warn('[DISCORD WARNING]', warning);
    });

    client.on('invalidated', () => {
        console.error('[GATEWAY] Discord oturumu geçersiz hale geldi!');
    });

    client.on('debug', info => {
        if (/ws|gateway|heartbeat|shard/i.test(info)) {
            console.log('[GATEWAY DEBUG]', info);
        }
    });

    // Ready kontrolü
    client.once('ready', () => {
        console.log('[GATEWAY] READY olayı başarıyla alındı.');
    });

    // Discord API erişim testi
    console.log('[NETWORK] Discord API bağlantısı test ediliyor...');

    fetch('https://discord.com/api/gateway')
        .then(async response => {
            console.log(`[NETWORK] Discord API HTTP: ${response.status}`);
            console.log('[NETWORK] Discord API yanıtı:', await response.text());
        })
        .catch(error => {
            console.error('[NETWORK ERROR] Discord API erişilemiyor:', error);
        });

    // Login timeout kontrolü
    const loginWatchdog = setTimeout(() => {
        console.error(
            '[LOGIN TIMEOUT] 30 saniye geçti ancak Discord login tamamlanmadı!'
        );

        console.error('[LOGIN TIMEOUT] Gateway bağlantısı kontrol edilmeli.');
    }, 30000);

    loginWatchdog.unref();

    // Discord Login
    console.log('[LOGIN] Discord giriş işlemi başlatılıyor...');

    client.login(process.env.TOKEN)
        .then(() => {
            clearTimeout(loginWatchdog);

            reconnectAttempts = 0;

            console.log('[LOGIN] Discord login işlemi başarılı.');
        })
        .catch(error => {
            clearTimeout(loginWatchdog);

            console.error('[LOGIN ERROR]', error);

            scheduleReconnect();
        });
}

// Reconnect
function scheduleReconnect() {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.error(
            `[FATAL] Maksimum yeniden bağlanma denemesi (${MAX_RECONNECT_ATTEMPTS}) aşıldı.`
        );
        return;
    }

    if (client) {
        try {
            client.destroy();
        } catch (error) {
            console.error('[DESTROY ERROR]', error);
        }

        client = null;
    }

    isBotStartingOrRunning = false;

    const delay = BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts);

    reconnectAttempts++;

    console.log(
        `[RECONNECT] Deneme ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}, ${delay / 1000} saniye sonra.`
    );

    setTimeout(() => {
        startDiscordBot();
    }, delay);
}

// Stop Bot
function stopDiscordBot() {
    if (client) {
        try {
            client.destroy();
        } catch (error) {
            console.error('[STOP ERROR]', error);
        }

        client = null;
        isBotStartingOrRunning = false;
        reconnectAttempts = 0;

        console.log('[INFO] Bot kapatıldı (Dashboard üzerinden).');
    }
}

// Bot Statistics
function getBotStats() {
    if (!client) {
        return {
            ping: 0,
            uptime: 0,
            servers: 0,
            users: 0
        };
    }

    return {
        ping: client.ws.ping,
        uptime: client.uptime,
        servers: client.guilds.cache.size,
        users: client.users.cache.size
    };
}

// Process Error Handling
process.on('unhandledRejection', (reason, promise) => {
    console.error('[FATAL] Unhandled Rejection:', promise, reason);
});

process.on('uncaughtException', error => {
    console.error('[FATAL] Uncaught Exception:', error);
    console.error('[FATAL] Bot ayakta tutuluyor...');
});

// Graceful Shutdown
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
