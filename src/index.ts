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
        }
    }

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
