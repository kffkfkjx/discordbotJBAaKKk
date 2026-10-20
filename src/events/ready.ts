import { Events, Client } from 'discord.js';

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client: Client) {
        console.log(`[READY] Logged in as ${client.user?.tag}`);
        console.log(`[READY] Bot is ready and running.`);
    },
};
