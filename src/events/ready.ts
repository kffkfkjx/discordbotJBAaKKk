import { Events, Client, REST, Routes } from 'discord.js';

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client: Client) {
        console.log(`[READY] Logged in as ${client.user?.tag}`);
        console.log(`[READY] Bot is ready and running.`);

        // Komutları otomatik deploy et
        try {
            if (client.commands && client.commands.size > 0) {
                const commands = client.commands.map((cmd: any) => cmd.data.toJSON());
                const commandNames = commands.map((c: any) => c.name);
                console.log(`[DEPLOY] Toplam ${commands.length} komut Discord'a otomatik aktarılıyor: ${commandNames.join(', ')}`);

                const token = process.env.TOKEN?.trim().replace(/^["']|["']$/g, '').replace(/^Bot\s+/i, '');
                if (!token) return;

                const rest = new REST({ version: '10' }).setToken(token);
                const clientId = process.env.CLIENT_ID || client.user?.id;
                const guildId = process.env.GUILD_ID;

                if (clientId && guildId) {
                    await rest.put(
                        Routes.applicationGuildCommands(clientId, guildId),
                        { body: commands }
                    );
                    console.log(`[DEPLOY] ${commands.length} komut sunucuya başarıyla kaydedildi!`);
                } else if (clientId) {
                    await rest.put(
                        Routes.applicationCommands(clientId),
                        { body: commands }
                    );
                    console.log(`[DEPLOY] ${commands.length} komut globale başarıyla kaydedildi!`);
                }
            }
        } catch (error) {
            console.error('[DEPLOY ERROR] Komutlar otomatik aktarılırken hata:', error);
        }
    },
};
