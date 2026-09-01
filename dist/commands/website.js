"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
module.exports = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('website')
        .setDescription('Kullanıcıya tıklanabilir websitenizi gönderir (15 sn sonra silinir).'),
    async execute(interaction) {
        // Ephemeral = false because the prompt says "15 saniye sonra silsin", meaning it's public and then gets deleted.
        // Or if it's just for the user, ephemeral works, but ephemeral can't be strictly deleted after 15s in the same way (Discord UI handles it).
        // Let's send a public message, then delete it.
        await interaction.reply({
            content: '🌐 Web sitemize buradan ulaşabilirsiniz: https://www.nexogamest.com.tr'
        });
        // 15 saniye bekle ve sil
        setTimeout(async () => {
            try {
                await interaction.deleteReply();
            }
            catch (err) {
                // Ignore errors if the message was already deleted
            }
        }, 15000);
    }
};
