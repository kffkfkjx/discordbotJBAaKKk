"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const dotenv_1 = require("dotenv");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const keepalive_1 = require("./keepalive");
// Load environment variables
(0, dotenv_1.config)();
// Initialize Client function
let client = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY = 5000; // 5 seconds
function startDiscordBot() {
    if (client)
        return; // Already running
    client = new discord_js_1.Client({
        intents: [
            discord_js_1.GatewayIntentBits.Guilds,
            discord_js_1.GatewayIntentBits.GuildMessages,
            discord_js_1.GatewayIntentBits.MessageContent,
            discord_js_1.GatewayIntentBits.GuildMembers,
            discord_js_1.GatewayIntentBits.GuildPresences
        ],
        partials: [discord_js_1.Partials.User, discord_js_1.Partials.GuildMember, discord_js_1.Partials.Message]
    });
    client.commands = new discord_js_1.Collection();
    client.giveaways = new discord_js_1.Collection();
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
        }
        else {
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
    if (!client)
        return { ping: 0, uptime: 0, servers: 0, users: 0 };
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
const dashboard_1 = require("./dashboard");
(0, dashboard_1.setBotFunctions)(startDiscordBot, stopDiscordBot, getBotStats);
startDiscordBot();
(0, dashboard_1.startDashboard)(startDiscordBot, stopDiscordBot);
(0, keepalive_1.startKeepAlive)();
