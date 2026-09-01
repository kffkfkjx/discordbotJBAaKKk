"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
module.exports = {
    name: discord_js_1.Events.ClientReady,
    once: true,
    execute(client) {
        console.log(`[READY] Logged in as ${client.user?.tag}`);
        console.log(`[READY] Bot is ready and running.`);
    },
};
