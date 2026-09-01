"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
module.exports = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('yavas-mod')
        .setDescription('Kanalın yavaş mod süresini ayarlar (Sadece Yöneticiler).')
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ManageChannels)
        .addIntegerOption(option => option.setName('saniye')
        .setDescription('İki mesaj arası bekleme süresi (Kapatmak için 0 yazın)')
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(21600) // Max 6 saat
    ),
    async execute(interaction) {
        const seconds = interaction.options.getInteger('saniye', true);
        const channel = interaction.channel;
        try {
            await channel.setRateLimitPerUser(seconds);
            if (seconds === 0) {
                await interaction.reply({ content: '✅ Yavaş mod (Slowmode) başarıyla kapatıldı.', ephemeral: true });
                await channel.send({ content: '🐇 **Bu kanaldaki yavaş mod kaldırıldı.**' });
            }
            else {
                await interaction.reply({ content: `✅ Yavaş mod başarıyla **${seconds} saniye** olarak ayarlandı.`, ephemeral: true });
                await channel.send({ content: `🐢 **Bu kanalda yavaş mod aktif.** (Üyeler ${seconds} saniyede bir mesaj atabilir)` });
            }
        }
        catch (error) {
            console.error('[ERROR] /yavas-mod command:', error);
            await interaction.reply({ content: 'Yavaş mod ayarlanırken bir hata oluştu.', ephemeral: true });
        }
    }
};
