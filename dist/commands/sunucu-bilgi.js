"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
module.exports = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('sunucu-bilgi')
        .setDescription('Sunucu hakkında detaylı istatistikleri ve bilgileri gösterir.'),
    async execute(interaction) {
        const guild = interaction.guild;
        if (!guild)
            return;
        const owner = await guild.fetchOwner();
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle(`🏢 ${guild.name} | Sunucu Bilgileri`)
            .setThumbnail(guild.iconURL({ size: 1024 }))
            .setColor('#2b2d31')
            .addFields({ name: '👑 Sunucu Sahibi', value: `${owner.user.tag}`, inline: true }, { name: '👥 Üye Sayısı', value: `${guild.memberCount}`, inline: true }, { name: '🚀 Takviye (Boost) Seviyesi', value: `Seviye ${guild.premiumTier} (${guild.premiumSubscriptionCount} Boost)`, inline: true }, { name: '📅 Kuruluş Tarihi', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D> (<t:${Math.floor(guild.createdTimestamp / 1000)}:R>)`, inline: false }, { name: '📝 Kanal Sayısı', value: `Toplam: ${guild.channels.cache.size}`, inline: true }, { name: '🎭 Rol Sayısı', value: `${guild.roles.cache.size}`, inline: true })
            .setFooter({ text: `Sunucu ID: ${guild.id}` })
            .setTimestamp();
        await interaction.reply({ embeds: [embed] });
    }
};
