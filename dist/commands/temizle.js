"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
module.exports = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('temizle')
        .setDescription('Belirtilen miktarda mesajı kanaldan siler (Sadece Yöneticiler).')
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ManageMessages)
        .addIntegerOption(option => option.setName('miktar')
        .setDescription('Silinecek mesaj sayısı (1-100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)),
    async execute(interaction) {
        const amount = interaction.options.getInteger('miktar', true);
        const channel = interaction.channel;
        try {
            const deleted = await channel.bulkDelete(amount, true);
            await interaction.reply({
                content: `✅ Başarıyla **${deleted.size}** adet mesaj silindi. *(14 günden eski mesajlar Discord kuralları gereği silinemez)*`,
                ephemeral: true
            });
        }
        catch (error) {
            console.error('[ERROR] /temizle command:', error);
            await interaction.reply({ content: 'Mesajlar silinirken bir hata oluştu.', ephemeral: true });
        }
    }
};
